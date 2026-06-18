import { NextRequest, NextResponse } from 'next/server';
import db, { initDb } from '@/lib/db';
import { Bericht } from '@/lib/types';
import { getCachedFeed, invalidateBerichtenCache } from '@/lib/berichtenCache';

/** Lichtgewicht hash voor ETag-berekening (geen crypto nodig). */
function makeETag(berichten: Bericht[], pushedAt: number): string {
  const str = `${pushedAt}|${berichten.map(b =>
    `${b.id}:${b.active ? 1 : 0}:${b.sort_order}:${b.duration}:${b.title.slice(0, 30)}`
  ).join(',')}`;
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = (Math.imul(h, 33) ^ str.charCodeAt(i)) >>> 0;
  return `"${h.toString(36)}"`;
}

export const dynamic = 'force-dynamic';

const ALLOWED_CATEGORIES = ['nieuws', 'wedstrijd', 'selectie', 'jeugd', 'overig'] as const;
const MAX_IMAGE_BYTES = 2_800_000; // ~2MB na base64-overhead

function clampDuration(v: unknown): number {
  return Math.max(1, Math.min(120, Number(v) || 10));
}
function clampFontSize(v: unknown): number {
  return Math.max(0, Math.min(20, Number(v) || 0));
}
function sanitizeCategory(v: unknown): Bericht['category'] {
  return ALLOWED_CATEGORIES.includes(v as Bericht['category'])
    ? (v as Bericht['category'])
    : 'nieuws';
}

function toRow(r: Record<string, unknown>): Bericht {
  return {
    id:          Number(r.id),
    title:       String(r.title),
    content:     String(r.content ?? ''),
    category:    sanitizeCategory(r.category),
    active:      Number(r.active) === 1,
    ticker:      Number(r.ticker ?? 1) === 1,
    image:       r.image ? String(r.image) : null,
    created_at:  String(r.created_at),
    sort_order:  Number(r.sort_order ?? 0),
    duration:    Number(r.duration ?? 10),
    font_size:   Number(r.font_size ?? 0),
    title_size:  Number(r.title_size ?? 0),
    expires_at:  r.expires_at  ? String(r.expires_at)  : null,
    archived_at: r.archived_at ? String(r.archived_at) : null,
  };
}

export async function GET(req: NextRequest) {
  try {
    const archived    = req.nextUrl.searchParams.get('archived') === 'true';
    // Images worden standaard meegestuurd (Cloudinary-URLs zijn kort, ~80 chars).
    // Gebruik ?images=false om ze weg te laten indien ooit nodig.
    const skipImages  = req.nextUrl.searchParams.get('images') === 'false';

    if (archived) {
      await initDb();
      const result = await db.execute(
        'SELECT * FROM berichten WHERE archived_at IS NOT NULL ORDER BY archived_at DESC'
      );
      const rows = result.rows.map(r => toRow(r as Record<string, unknown>));
      return NextResponse.json(rows, { headers: { 'Cache-Control': 'no-store' } });
    }

    // Publieke feed: in-memory cache met 60s TTL (inclusief autoArchive)
    const feed = await getCachedFeed();
    // ETag op lite-berichten (zonder image) zodat Cloudinary-URLs de hash
    // niet beïnvloeden — de ETag signaleert alleen inhoudelijke wijzigingen.
    const liteBerichten = feed.berichten.map(b => ({ ...b, image: null }));
    const etag = makeETag(liteBerichten, feed.pushedAt);

    // 304 Not Modified als de client al de actuele versie heeft
    if (req.headers.get('if-none-match') === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: { 'ETag': etag, 'Cache-Control': 's-maxage=0, must-revalidate' },
      });
    }

    // Stuur altijd images mee: Cloudinary-URLs zijn kort (~80 chars) en
    // veroorzaken geen bandbreedteprobleem meer. ?images=false voor beheer
    // dat de zware archiefquery doet.
    const berichten = skipImages ? liteBerichten : feed.berichten;
    return NextResponse.json(
      { berichten, pushedAt: feed.pushedAt },
      { headers: { 'Cache-Control': 's-maxage=0, must-revalidate', 'ETag': etag } },
    );
  } catch (e) {
    console.error('[GET /api/berichten]', e);
    return NextResponse.json({ error: 'Database onbereikbaar' }, { status: 503 });
  }
}

/** PATCH /api/berichten — bulk sort_order update [{id, sort_order}] */
export async function PATCH(req: NextRequest) {
  try {
    await initDb();
    const items: { id: number; sort_order: number }[] = await req.json();
    for (const { id, sort_order } of items) {
      await db.execute({ sql: 'UPDATE berichten SET sort_order = ? WHERE id = ?', args: [sort_order, id] });
    }
    invalidateBerichtenCache();
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[PATCH /api/berichten]', e);
    return NextResponse.json({ error: 'Database onbereikbaar' }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await initDb();
    const body = await req.json();
    const {
      title, content = '', active = true, ticker = true, image = null,
      duration, font_size, title_size, expires_at = null,
    } = body;

    if (!title?.trim()) return NextResponse.json({ error: 'Titel is verplicht' }, { status: 400 });
    if (title.length > 500) return NextResponse.json({ error: 'Titel te lang (max 500 tekens)' }, { status: 400 });
    if (content.length > 100_000) return NextResponse.json({ error: 'Inhoud te lang' }, { status: 400 });
    if (image && typeof image === 'string' && image.length > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: 'Afbeelding te groot (max ~2MB)' }, { status: 400 });
    }

    const category  = sanitizeCategory(body.category);
    const dur       = clampDuration(duration);
    const fontSize  = clampFontSize(font_size);
    const titleSize = clampFontSize(title_size);
    const expiresAt = expires_at && typeof expires_at === 'string' ? expires_at.trim() || null : null;

    const maxResult = await db.execute('SELECT MAX(sort_order) as m FROM berichten');
    const maxOrder  = Number(maxResult.rows[0]?.m ?? 0);

    const result = await db.execute({
      sql: `INSERT INTO berichten
              (title, content, category, active, ticker, image, sort_order, duration, font_size, title_size, expires_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [title.trim(), content, category, active ? 1 : 0, ticker ? 1 : 0, image, maxOrder + 1, dur, fontSize, titleSize, expiresAt],
    });

    const row = await db.execute({ sql: 'SELECT * FROM berichten WHERE id = ?', args: [Number(result.lastInsertRowid)] });
    invalidateBerichtenCache();
    return NextResponse.json(toRow(row.rows[0] as Record<string, unknown>), { status: 201 });
  } catch (e) {
    console.error('[POST /api/berichten]', e);
    return NextResponse.json({ error: 'Database onbereikbaar' }, { status: 503 });
  }
}
