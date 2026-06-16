import { createClient } from '@libsql/client';

if (!process.env.TURSO_URL) throw new Error('TURSO_URL is not set');
if (!process.env.TURSO_AUTH_TOKEN) throw new Error('TURSO_AUTH_TOKEN is not set');

const db = createClient({
  url: process.env.TURSO_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

let initialized = false;

export async function initDb() {
  if (initialized) return;
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS berichten (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      title       TEXT    NOT NULL,
      content     TEXT    NOT NULL DEFAULT '',
      category    TEXT    NOT NULL DEFAULT 'nieuws',
      active      INTEGER NOT NULL DEFAULT 1,
      ticker      INTEGER NOT NULL DEFAULT 1,
      image       TEXT,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
      sort_order  INTEGER NOT NULL DEFAULT 0
    );
  `);
  try { await db.execute("ALTER TABLE berichten ADD COLUMN ticker   INTEGER NOT NULL DEFAULT 1"); } catch {}
  try { await db.execute("ALTER TABLE berichten ADD COLUMN duration   INTEGER NOT NULL DEFAULT 10"); } catch {}
  try { await db.execute("ALTER TABLE berichten ADD COLUMN font_size  REAL    NOT NULL DEFAULT 0");  } catch {}
  try { await db.execute("ALTER TABLE berichten ADD COLUMN title_size REAL    NOT NULL DEFAULT 0");  } catch {}

  // RSS inbox
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS rss_inbox (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      guid       TEXT    NOT NULL UNIQUE,
      title      TEXT    NOT NULL DEFAULT '',
      content    TEXT    NOT NULL DEFAULT '',
      link       TEXT    NOT NULL DEFAULT '',
      pub_date   TEXT    NOT NULL DEFAULT '',
      fetched_at TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
      status     TEXT    NOT NULL DEFAULT 'pending',
      bericht_id INTEGER
    );
  `);
  // Migratie: cache-kolom voor webscraping van volledige tekst
  try { await db.execute("ALTER TABLE rss_inbox ADD COLUMN fulltext_fetched_at TEXT"); } catch {}
  // Migratie: vervaldatum + archiefstatus op berichten
  try { await db.execute("ALTER TABLE berichten ADD COLUMN expires_at  TEXT"); } catch {}
  try { await db.execute("ALTER TABLE berichten ADD COLUMN archived_at TEXT"); } catch {}
  initialized = true;
}

export default db;
