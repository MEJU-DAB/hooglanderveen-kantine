import db, { initDb } from '@/lib/db';
import { Bericht } from '@/lib/types';
import Slideshow from '@/components/Slideshow';

export const revalidate = 60; // ISR: Vercel edge hergebruikt de HTML 60s

function toRow(r: Record<string, unknown>): Bericht {
  return {
    id:          Number(r.id),
    title:       String(r.title),
    content:     String(r.content ?? ''),
    category:    String(r.category ?? 'nieuws') as Bericht['category'],
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

export default async function Home() {
  let initialBerichten: Bericht[] = [];
  try {
    await initDb();
    const result = await db.execute('SELECT * FROM berichten WHERE archived_at IS NULL ORDER BY sort_order ASC, id ASC');
    initialBerichten = result.rows.map(r => toRow(r as Record<string, unknown>));
  } catch {}

  return <Slideshow initialBerichten={initialBerichten} />;
}
