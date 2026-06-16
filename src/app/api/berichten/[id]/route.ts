import { NextRequest, NextResponse } from 'next/server';
import db, { initDb } from '@/lib/db';
import { Bericht } from '@/lib/types';

export const dynamic = 'force-dynamic';

const ALLOWED_CATEGORIES = ['nieuws', 'wedstrijd', 'selectie', 'jeugd', 'overig'] as const;
const MAX_IMAGE_BYTES = 700_000;

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

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDb();
    const { id } = await params;
    const body = await req.json();

    if (body.title !== undefined && body.title.length > 500) {
      return NextResponse.json({ error: 'Titel te lang (max 500 tekens)' }, { status: 400 });
    }
    if (body.content !== undefined && body.content.length > 100_000) {
      return NextResponse.json({ error: 'Inhoud te lang' }, { status: 400 });
    }
    if (body.image && typeof body.image === 'string' && body.image.length > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: 'Afbeelding te groot (max ~500KB)' }, { status: 400 });
    }

    const existing = await db.execute({ sql: 'SELECT * FROM berichten WHERE id = ?', args: [Number(id)] });
    if (!existing.rows.length) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 });
    const cur = existing.rows[0];

    const { title, content, active, ticker, image, sort_order, duration, font_size, title_size } = body;
    const category = body.category !== undefined ? sanitizeCategory(body.category) : cur.category;

    await db.execute({
      sql: `UPDATE berichten SET
        title      = ?,
        content    = ?,
        category   = ?,
        active     = ?,
        ticker     = ?,
        image      = ?,
        sort_order = ?,
        duration   = ?,
        font_size  = ?,
        title_size = ?
      WHERE id = ?`,
      args: [
        title      !== undefined ? title.trim()                    : cur.title,
        content    !== undefined ? content                         : cur.content,
        category,
        active     !== undefined ? (active ? 1 : 0)               : cur.active,
        ticker     !== undefined ? (ticker ? 1 : 0)               : cur.ticker,
        image      !== undefined ? image                           : cur.image,
        sort_order !== undefined ? sort_order                      : cur.sort_order,
        duration   !== undefined ? clampDuration(duration)         : Number(cur.duration ?? 10),
        font_size  !== undefined ? clampFontSize(font_size)        : Number(cur.font_size ?? 0),
        title_size !== undefined ? clampFontSize(title_size)       : Number(cur.title_size ?? 0),
        Number(id),
      ],
    });

    const u = (await db.execute({ sql: 'SELECT * FROM berichten WHERE id = ?', args: [Number(id)] })).rows[0] as Record<string, unknown>;
    return NextResponse.json({
      id: Number(u.id), title: String(u.title), content: String(u.content ?? ''),
      category: sanitizeCategory(u.category), active: Number(u.active) === 1,
      ticker: Number(u.ticker ?? 1) === 1, image: u.image ?? null,
      created_at: u.created_at, sort_order: Number(u.sort_order),
      duration: Number(u.duration ?? 10), font_size: Number(u.font_size ?? 0),
      title_size: Number(u.title_size ?? 0),
    });
  } catch (e) {
    console.error('[PUT /api/berichten/[id]]', e);
    return NextResponse.json({ error: 'Database onbereikbaar' }, { status: 503 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDb();
    const { id } = await params;
    await db.execute({ sql: 'DELETE FROM berichten WHERE id = ?', args: [Number(id)] });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[DELETE /api/berichten/[id]]', e);
    return NextResponse.json({ error: 'Database onbereikbaar' }, { status: 503 });
  }
}
