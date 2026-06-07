import { createClient } from '@libsql/client';

if (!process.env.TURSO_URL) throw new Error('TURSO_URL is not set');
if (!process.env.TURSO_AUTH_TOKEN) throw new Error('TURSO_AUTH_TOKEN is not set');

const db = createClient({
  url: process.env.TURSO_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export async function initDb() {
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS berichten (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      title       TEXT    NOT NULL,
      content     TEXT    NOT NULL DEFAULT '',
      category    TEXT    NOT NULL DEFAULT 'nieuws',
      active      INTEGER NOT NULL DEFAULT 1,
      image       TEXT,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
      sort_order  INTEGER NOT NULL DEFAULT 0
    );
  `);
}

export default db;
