import { NextRequest, NextResponse } from 'next/server';
import db, { initDb } from '@/lib/db';
import { Bericht } from '@/lib/types';

export const dynamic = 'force-dynamic';

const ALLOWED_CATEGORIES = ['nieuws', 'wedstrijd', 'selectie', 'jeugd', 'overig'] as const;
const MAX_IMAGE_BYTES = 700_000; // ~500KB base64

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
    id:         Number(r.id),
    title:      String(r.title),
    content:    String(r.content ?? ''),
    category:   sanitizeCategory(r.category),
    active:     Number(r.active) === 1,
    ticker:     Number(r.ticker ?? 1) === 1,
    image:      r.image ? String(r.image) : null,
    created_at: String(r.created_at),
    sort_order: Number(r.sort_order ?? 0),
    duration:   Number(r.duration ?? 10),
    font_size:  Number(r.font_size ?? 0),
    title_size: Number(r.title_size ?? 0),
  };
}

export async function GET() {
  try {
    await initDb();
    const result = await db.execute('SELECT * FROM berichten ORDER BY sort_order ASC, id DESC');
    return NextResponse.json(result.rows.map(r => toRow(r as Record<string, unknown>)));
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
      duration, font_size, title_size,
    } = body;

    if (!title?.trim()) return NextResponse.json({ error: 'Titel is verplicht' }, { status: 400 });
    if (title.length > 500) return NextResponse.json({ error: 'Titel te lang (max 500 tekens)' }, { status: 400 });
    if (content.length > 100_000) return NextResponse.json({ error: 'Inhoud te lang' }, { status: 400 });
    if (image && typeof image === 'string' && image.length > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: 'Afbeelding te groot (max ~500KB)' }, { status: 400 });
    }

    const category  = sanitizeCategory(body.category);
    const dur       = clampDuration(duration);
    const fontSize  = clampFontSize(font_size);
    const titleSize = clampFontSize(title_size);

    const maxResult = await db.execute('SELECT MAX(sort_order) as m FROM berichten');
    const maxOrder  = Number(maxResult.rows[0]?.m ?? 0);

    const result = await db.execute({
      sql: 'INSERT INTO berichten (title, content, category, active, ticker, image, sort_order, duration, font_size, title_size) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      args: [title.trim(), content, category, active ? 1 : 0, ticker ? 1 : 0, image, maxOrder + 1, dur, fontSize, titleSize],
    });

    const row = await db.execute({ sql: 'SELECT * FROM berichten WHERE id = ?', args: [Number(result.lastInsertRowid)] });
    return NextResponse.json(toRow(row.rows[0] as Record<string, unknown>), { status: 201 });
  } catch (e) {
    console.error('[POST /api/berichten]', e);
    return NextResponse.json({ error: 'Database onbereikbaar' }, { status: 503 });
  }
}
