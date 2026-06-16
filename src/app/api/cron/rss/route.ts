import { NextRequest, NextResponse } from 'next/server';
import db, { initDb } from '@/lib/db';
import { parseRss, isTruncated, scrapeFullContent } from '@/lib/rss';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cron/rss
 * Vercel Cron Job — draait dagelijks om 07:00 UTC.
 * Vercel stuurt automatisch Authorization: Bearer <CRON_SECRET>.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await initDb();

  const rssUrl = process.env.RSS_FEED_URL;
  if (!rssUrl) {
    return NextResponse.json({ error: 'RSS_FEED_URL niet ingesteld' }, { status: 500 });
  }

  let xml: string;
  try {
    const res = await fetch(rssUrl, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    xml = await res.text();
  } catch (e) {
    return NextResponse.json({ error: `Kon feed niet ophalen: ${e}` }, { status: 502 });
  }

  const items = parseRss(xml);
  if (items.length === 0) {
    return NextResponse.json({ added: 0, total: 0, initialized: false });
  }

  const countRes = await db.execute('SELECT COUNT(*) as c FROM rss_inbox');
  const isFirstRun = Number(countRes.rows[0].c) === 0;

  // Fase 1: voeg nieuwe items in
  const newItems: { id: number; link: string; content: string }[] = [];
  for (const item of items) {
    const res = await db.execute({
      sql: `INSERT OR IGNORE INTO rss_inbox (guid, title, content, link, pub_date, status)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [
        item.guid,
        item.title,
        item.content,
        item.link,
        item.pubDate,
        isFirstRun ? 'seen' : 'pending',
      ],
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

  console.log(`[cron/rss] ${isFirstRun ? 'Geïnitialiseerd' : `${newItems.length} nieuw, ${scraped} gescraped`} (${items.length} totaal)`);
  return NextResponse.json({ added: newItems.length, scraped, total: items.length, initialized: isFirstRun });
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
