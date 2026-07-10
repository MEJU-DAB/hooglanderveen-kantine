import db, { initDb } from './db';
import { Bericht } from './types';

const TTL = 60_000;

type Entry = { data: Bericht[]; pushedAt: number; ts: number };
let cache: Entry | null = null;

const ALLOWED_CATEGORIES = ['nieuws', 'wedstrijd', 'selectie', 'jeugd', 'overig'] as const;
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

export async function getCachedFeed(): Promise<{ berichten: Bericht[]; pushedAt: number }> {
  const now = Date.now();
  if (cache && now - cache.ts < TTL) return { berichten: cache.data, pushedAt: cache.pushedAt };

  await initDb();

  await db.execute(
    `UPDATE berichten
     SET archived_at = datetime('now','localtime')
     WHERE expires_at IS NOT NULL
       AND expires_at < datetime('now','localtime')
       AND archived_at IS NULL`
  );

  const [br, cfg] = await Promise.all([
    db.execute('SELECT * FROM berichten WHERE archived_at IS NULL ORDER BY sort_order ASC, id ASC'),
    db.execute("SELECT value FROM config WHERE key = 'last_pushed_at'"),
  ]);

  const data = br.rows.map(r => toRow(r as Record<string, unknown>));
  const pushedAt = Number(cfg.rows[0]?.value ?? 0);
  cache = { data, pushedAt, ts: now };
  return { berichten: data, pushedAt };
}

export function invalideerCache(): void {
  cache = null;
}
