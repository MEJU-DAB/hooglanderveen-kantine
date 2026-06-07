import { NextRequest, NextResponse } from 'next/server';
import db, { initDb } from '@/lib/db';
import { Bericht } from '@/lib/types';

export const dynamic = 'force-dynamic';

function toRow(r: Record<string, unknown>): Bericht {
  return {
    id:         Number(r.id),
    title:      String(r.title),
    content:    String(r.content ?? ''),
    category:   String(r.category ?? 'nieuws') as Bericht['category'],
    active:     Number(r.active) === 1,
    ticker:     Number(r.ticker ?? 1) === 1,
    image:      r.image ? String(r.image) : null,
    created_at: String(r.created_at),
    sort_order: Number(r.sort_order ?? 0),
    duration:   Number(r.duration ?? 10),
    font_size:  Number(r.font_size ?? 0),
  };
}

export async function GET() {
  await initDb();
  const result = await db.execute('SELECT * FROM berichten ORDER BY sort_order ASC, id DESC');
  return NextResponse.json(result.rows.map(r => toRow(r as Record<string, unknown>)));
}

export async function POST(req: NextRequest) {
  await initDb();
  const body = await req.json();
  const { title, content = '', category = 'nieuws', active = true, ticker = true, image = null, duration = 10, font_size = 0 } = body;
  if (!title?.trim()) return NextResponse.json({ error: 'Titel is verplicht' }, { status: 400 });

  const maxResult = await db.execute('SELECT MAX(sort_order) as m FROM berichten');
  const maxOrder = Number(maxResult.rows[0]?.m ?? 0);

  const result = await db.execute({
    sql: 'INSERT INTO berichten (title, content, category, active, ticker, image, sort_order, duration, font_size) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    args: [title.trim(), content, category, active ? 1 : 0, ticker ? 1 : 0, image, maxOrder + 1, Number(duration), Number(font_size)],
  });

  const row = await db.execute({ sql: 'SELECT * FROM berichten WHERE id = ?', args: [Number(result.lastInsertRowid)] });
  return NextResponse.json(toRow(row.rows[0] as Record<string, unknown>), { status: 201 });
}
