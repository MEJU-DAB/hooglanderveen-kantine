import { NextRequest, NextResponse } from 'next/server';
import db, { initDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await initDb();
  const { id } = await params;
  const body = await req.json();
  const { title, content, category, active, image, sort_order } = body;

  const existing = await db.execute({ sql: 'SELECT * FROM berichten WHERE id = ?', args: [Number(id)] });
  if (!existing.rows.length) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 });
  const cur = existing.rows[0];

  await db.execute({
    sql: `UPDATE berichten SET
      title      = ?,
      content    = ?,
      category   = ?,
      active     = ?,
      image      = ?,
      sort_order = ?
    WHERE id = ?`,
    args: [
      title      !== undefined ? title      : cur.title,
      content    !== undefined ? content    : cur.content,
      category   !== undefined ? category   : cur.category,
      active     !== undefined ? (active ? 1 : 0) : cur.active,
      image      !== undefined ? image      : cur.image,
      sort_order !== undefined ? sort_order : cur.sort_order,
      Number(id),
    ],
  });

  const updated = (await db.execute({ sql: 'SELECT * FROM berichten WHERE id = ?', args: [Number(id)] })).rows[0];
  return NextResponse.json({
    id: Number(updated.id), title: String(updated.title), content: String(updated.content ?? ''),
    category: updated.category, active: updated.active === 1, image: updated.image ?? null,
    created_at: updated.created_at, sort_order: Number(updated.sort_order),
  });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await initDb();
  const { id } = await params;
  await db.execute({ sql: 'DELETE FROM berichten WHERE id = ?', args: [Number(id)] });
  return NextResponse.json({ ok: true });
}
