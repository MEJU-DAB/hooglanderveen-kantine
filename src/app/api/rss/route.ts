import { NextResponse } from 'next/server';
import db, { initDb } from '@/lib/db';
import { parseRss, isTruncated, scrapeFullContent } from '@/lib/rss';

export const dynamic = 'force-dynamic';

export interface RssInboxItem {
  id: number;
  guid: string;
  title: string;
  content: string;
  link: string;
  pub_date: string;
  fetched_at: string;
  status: string;
  bericht_id: number | null;
  fulltext_fetched_at: string | null;
}

function toRssItem(r: Record<string, unknown>): RssInboxItem {
  return {
    id:                  Number(r.id),
    guid:                String(r.guid),
    title:               String(r.title ?? ''),
    content:             String(r.content ?? ''),
    link:                String(r.link ?? ''),
    pub_date:            String(r.pub_date ?? ''),
    fetched_at:          String(r.fetched_at ?? ''),
    status:              String(r.status ?? 'pending'),
    bericht_id:          r.bericht_id ? Number(r.bericht_id) : null,
    fulltext_fetched_at: r.fulltext_fetched_at ? String(r.fulltext_fetched_at) : null,
  };
}

/** GET /api/rss — geeft alle pending inbox-items terug */
export async function GET() {
  try {
    await initDb();
    const result = await db.execute(
      "SELECT * FROM rss_inbox WHERE status = 'pending' ORDER BY id DESC"
    );
    return NextResponse.json(result.rows.map(r => toRssItem(r as Record<string, unknown>)));
  } catch (e) {
    console.error('[GET /api/rss]', e);
    return NextResponse.json({ error: 'Database onbereikbaar' }, { status: 503 });
  }
}

/** POST /api/rss — fetcht de feed en voegt nieuwe items toe aan de inbox */
export async function POST() {
  try {
    await initDb();

    const rssUrl = process.env.RSS_FEED_URL;
    if (!rssUrl) return NextResponse.json({ error: 'RSS_FEED_URL niet ingesteld' }, { status: 500 });

    let xml: string;
    try {
      const res = await fetch(rssUrl, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      xml = await res.text();
    } catch (e) {
      return NextResponse.json({ error: `Kon feed niet ophalen: ${e}` }, { status: 502 });
    }

    const items = parseRss(xml);
    if (items.length === 0) return NextResponse.json({ added: 0, total: 0, initialized: false });

    const countRes = await db.execute('SELECT COUNT(*) as c FROM rss_inbox');
    const isFirstRun = Number(countRes.rows[0].c) === 0;

    // Fase 1: voeg nieuwe items in
    const newItems: { id: number; link: string; content: string }[] = [];
    for (const item of items) {
      const res = await db.execute({
        sql: `INSERT OR IGNORE INTO rss_inbox (guid, title, content, link, pub_date, status)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [item.guid, item.title, item.content, item.link, item.pubDate, isFirstRun ? 'seen' : 'pending'],
      });
      if (Number(res.rowsAffected) > 0 && !isFirstRun) {
        newItems.push({ id: Number(res.lastInsertRowid), link: item.link, content: item.content });
      }
    }

    // Fase 2: scrape volledige tekst voor afgekapte items (300ms tussenpoos)
    let scraped = 0;
    for (const item of newItems) {
      if (!isTruncated(item.content) || !item.link) continue;
      await delay(300);
      const full = await scrapeFullContent(item.link, item.content);
      if (full) {
        await db.execute({
          sql: `UPDATE rss_inbox SET content = ?, fulltext_fetched_at = datetime('now','localtime') WHERE id = ?`,
          args: [full, item.id],
        });
        scraped++;
      }
    }

    return NextResponse.json({ added: newItems.length, scraped, total: items.length, initialized: isFirstRun });
  } catch (e) {
    console.error('[POST /api/rss]', e);
    return NextResponse.json({ error: 'Database onbereikbaar' }, { status: 503 });
  }
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
