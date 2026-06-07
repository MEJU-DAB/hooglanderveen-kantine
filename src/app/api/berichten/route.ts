import { NextRequest, NextResponse } from 'next/server';
import db, { initDb } from '@/lib/db';
import { Bericht } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  await initDb();
  const result = await db.execute('SELECT * FROM berichten ORDER BY sort_order ASC, id DESC');
  const berichten: Bericht[] = result.rows.map(r => ({
    id: Number(r.id),
    title: String(r.title),
    content: String(r.content ?? ''),
    category: String(r.category ?? 'nieuws') as Bericht['category'],
    active: Number(r.active) === 1,
    image: r.image ? String(r.image) : null,
    created_at: String(r.created_at),
    sort_order: Number(r.sort_order ?? 0),
  }));
  return NextResponse.json(berichten);
}

export async function POST(req: NextRequest) {
  await initDb();
  const body = await req.json();
  const { title, content = '', category = 'nieuws', active = true, image = null } = body;
  if (!title?.trim()) return NextResponse.json({ error: 'Titel is verplicht' }, { status: 400 });

  const maxResult = await db.execute('SELECT MAX(sort_order) as m FROM berichten');
  const maxOrder = Number(maxResult.rows[0]?.m ?? 0);

  const result = await db.execute({
    sql: 'INSERT INTO berichten (title, content, category, active, image, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
    args: [title.trim(), content, category, active ? 1 : 0, image, maxOrder + 1],
  });

  const row = await db.execute({ sql: 'SELECT * FROM berichten WHERE id = ?', args: [Number(result.lastInsertRowid)] });
  const r = row.rows[0];
  return NextResponse.json({
    id: Number(r.id), title: String(r.title), content: String(r.content ?? ''),
    category: r.category, active: r.active === 1, image: r.image ?? null,
    created_at: r.created_at, sort_order: Number(r.sort_order),
  }, { status: 201 });
}
