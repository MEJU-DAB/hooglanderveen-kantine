import db, { initDb } from '@/lib/db';
import { Bericht } from '@/lib/types';

const TTL_MS = 60_000; // 60 seconden

type CacheEntry = { data: Bericht[]; pushedAt: number; fetchedAt: number };
let cache: CacheEntry | null = null;

function sanitizeCategory(v: unknown): Bericht['category'] {
  const ALLOWED = ['nieuws', 'wedstrijd', 'selectie', 'jeugd', 'overig'] as const;
  return ALLOWED.includes(v as Bericht['category']) ? (v as Bericht['category']) : 'nieuws';
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

async function fetchFromDb(): Promise<{ data: Bericht[]; pushedAt: number }> {
  await initDb();

  // Auto-archiveer verlopen berichten
  await db.execute(
    `UPDATE berichten
     SET archived_at = datetime('now','localtime')
     WHERE expires_at IS NOT NULL
       AND expires_at < datetime('now','localtime')
       AND archived_at IS NULL`
  );

  const [berichtenResult, configResult] = await Promise.all([
    db.execute('SELECT * FROM berichten WHERE archived_at IS NULL ORDER BY sort_order ASC, id ASC'),
    db.execute("SELECT value FROM config WHERE key = 'last_pushed_at'"),
  ]);

  const data = berichtenResult.rows.map(r => toRow(r as Record<string, unknown>));
  const pushedAt = Number(configResult.rows[0]?.value ?? 0);
  return { data, pushedAt };
}

export async function getCachedFeed(): Promise<{ berichten: Bericht[]; pushedAt: number }> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < TTL_MS) {
    return { berichten: cache.data, pushedAt: cache.pushedAt };
  }
  const { data, pushedAt } = await fetchFromDb();
  cache = { data, pushedAt, fetchedAt: now };
  return { berichten: data, pushedAt };
}

export function invalidateBerichtenCache(): void {
  cache = null;
}
