import { NextRequest, NextResponse } from 'next/server';
import db, { initDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

/** PUT /api/rss/[id] — titel/content bewerken (voor publicatie) */
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    await initDb();
    const { id } = await params;
    const body = await req.json();
    const { title, content } = body;

    await db.execute({
      sql: 'UPDATE rss_inbox SET title = ?, content = ? WHERE id = ?',
      args: [String(title ?? ''), String(content ?? ''), Number(id)],
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[PUT /api/rss/[id]]', e);
    return NextResponse.json({ error: 'Database onbereikbaar' }, { status: 503 });
  }
}

/** DELETE /api/rss/[id] — afwijzen */
export async function DELETE(_: NextRequest, { params }: Params) {
  try {
    await initDb();
    const { id } = await params;
    await db.execute({
      sql: "UPDATE rss_inbox SET status = 'rejected' WHERE id = ?",
      args: [Number(id)],
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[DELETE /api/rss/[id]]', e);
    return NextResponse.json({ error: 'Database onbereikbaar' }, { status: 503 });
  }
}

/** POST /api/rss/[id] — publiceren: maakt een bericht aan en markeert het item */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    await initDb();
    const { id } = await params;
    const body = await req.json();

    const existing = await db.execute({ sql: 'SELECT * FROM rss_inbox WHERE id = ?', args: [Number(id)] });
    if (!existing.rows.length) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 });
    const item = existing.rows[0] as Record<string, unknown>;

    const title     = String(body.title    ?? item.title    ?? '');
    const content   = String(body.content  ?? item.content  ?? '');
    const image     = body.image   ?? null;
    const ticker    = body.ticker  ?? true;
    const duration  = Math.max(1, Math.min(120, Number(body.duration ?? 10) || 10));
    const font_size = Math.max(0, Math.min(20, Number(body.font_size ?? 0) || 0));

    if (!title.trim()) return NextResponse.json({ error: 'Titel is verplicht' }, { status: 400 });

    const maxRes   = await db.execute('SELECT MAX(sort_order) as m FROM berichten');
    const maxOrder = Number(maxRes.rows[0]?.m ?? 0);

    const insertRes = await db.execute({
      sql: `INSERT INTO berichten
              (title, content, category, active, ticker, image, sort_order, duration, font_size)
            VALUES (?, ?, 'nieuws', 1, ?, ?, ?, ?, ?)`,
      args: [title, content, ticker ? 1 : 0, image, maxOrder + 1, duration, font_size],
    });
    const berichtId = Number(insertRes.lastInsertRowid);

    await db.execute({
      sql: "UPDATE rss_inbox SET status = 'published', bericht_id = ? WHERE id = ?",
      args: [berichtId, Number(id)],
    });

    return NextResponse.json({ ok: true, berichtId });
  } catch (e) {
    console.error('[POST /api/rss/[id]]', e);
    return NextResponse.json({ error: 'Database onbereikbaar' }, { status: 503 });
  }
}
