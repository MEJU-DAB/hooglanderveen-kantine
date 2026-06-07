import { NextRequest, NextResponse } from 'next/server';
import db, { initDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await initDb();
  const { id } = await params;
  const body = await req.json();
  const { title, content, category, active, ticker, image, sort_order, duration, font_size } = body;

  const existing = await db.execute({ sql: 'SELECT * FROM berichten WHERE id = ?', args: [Number(id)] });
  if (!existing.rows.length) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 });
  const cur = existing.rows[0];

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
      font_size  = ?
    WHERE id = ?`,
    args: [
      title      !== undefined ? title              : cur.title,
      content    !== undefined ? content            : cur.content,
      category   !== undefined ? category           : cur.category,
      active     !== undefined ? (active ? 1:0)     : cur.active,
      ticker     !== undefined ? (ticker ? 1:0)     : cur.ticker,
      image      !== undefined ? image              : cur.image,
      sort_order !== undefined ? sort_order         : cur.sort_order,
      duration   !== undefined ? Number(duration)   : Number(cur.duration ?? 10),
      font_size  !== undefined ? Number(font_size)  : Number(cur.font_size ?? 0),
      Number(id),
    ],
  });

  const u = (await db.execute({ sql: 'SELECT * FROM berichten WHERE id = ?', args: [Number(id)] })).rows[0] as Record<string, unknown>;
  return NextResponse.json({
    id: Number(u.id), title: String(u.title), content: String(u.content ?? ''),
    category: u.category, active: Number(u.active) === 1, ticker: Number(u.ticker ?? 1) === 1,
    image: u.image ?? null, created_at: u.created_at, sort_order: Number(u.sort_order),
    duration: Number(u.duration ?? 10), font_size: Number(u.font_size ?? 0),
  });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await initDb();
  const { id } = await params;
  await db.execute({ sql: 'DELETE FROM berichten WHERE id = ?', args: [Number(id)] });
  return NextResponse.json({ ok: true });
}
