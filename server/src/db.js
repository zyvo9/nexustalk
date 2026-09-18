import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    username      TEXT,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    avatar        TEXT,
    google_id     TEXT,
    nex_id        TEXT,
    onboarded     INTEGER DEFAULT 0,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS chats (
    id         TEXT PRIMARY KEY,
    type       TEXT NOT NULL CHECK (type IN ('dm', 'group')),
    name       TEXT,
    dm_key     TEXT UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS chat_members (
    chat_id   TEXT NOT NULL REFERENCES chats(id),
    user_id   TEXT NOT NULL REFERENCES users(id),
    joined_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (chat_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id         TEXT PRIMARY KEY,
    chat_id    TEXT NOT NULL REFERENCES chats(id),
    sender_id  TEXT NOT NULL REFERENCES users(id),
    body       TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS files (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    mime        TEXT NOT NULL,
    size        INTEGER NOT NULL,
    data        BLOB NOT NULL,
    uploader_id TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages(chat_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_members_user ON chat_members(user_id);
  CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
`;

// ---------------------------------------------------------------------------
// Driver: local SQLite (dev) or Turso/libSQL (cloud deploy) — same API,
// every method async so call-sites work identically in both modes.
// ---------------------------------------------------------------------------

const useTurso = !!(process.env.TURSO_URL && process.env.TURSO_TOKEN);

let inner;

if (useTurso) {
  const { createClient } = await import('@libsql/client');
  const client = createClient({
    url: process.env.TURSO_URL,
    authToken: process.env.TURSO_TOKEN,
  });
  inner = {
    prepare(sql) {
      const stmt = client.prepare(sql);
      return {
        async get(...params) {
          const row = await stmt.get(...params);
          return row ?? undefined;
        },
        async all(...params) {
          const rows = await stmt.all(...params);
          if (Array.isArray(rows)) return rows;
          if (typeof rows.toArray === 'function') return rows.toArray();
          return rows.rows ?? [];
        },
        async run(...params) {
          return stmt.run(...params);
        },
      };
    },
    async exec(sql) {
      await client.executeMultiple(sql);
    },
  };
} else {
  const { DatabaseSync } = await import('node:sqlite');
  const db = new DatabaseSync(path.join(__dirname, '..', 'nexustalk.db'));
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  inner = {
    prepare(sql) {
      const stmt = db.prepare(sql);
      return {
        async get(...params) {
          return stmt.get(...params);
        },
        async all(...params) {
          return stmt.all(...params);
        },
        async run(...params) {
          return stmt.run(...params);
        },
      };
    },
    async exec(sql) {
      db.exec(sql);
    },
  };
}

const db = {
  prepare: (sql) => inner.prepare(sql),
  exec: (sql) => inner.exec(sql),
};

// Schema + migrations
await db.exec(SCHEMA);

const userColumns = (await db.prepare('PRAGMA table_info(users)').all()).map((c) => c.name);
const addColumn = (col, ddl) => {
  if (!userColumns.includes(col)) db.exec(`ALTER TABLE users ADD COLUMN ${ddl}`);
};
addColumn('google_id', 'google_id TEXT');
addColumn('nex_id', 'nex_id TEXT');
addColumn('username', 'username TEXT');
addColumn('onboarded', "onboarded INTEGER DEFAULT 0");

// messages.attachments: JSON array [{id, name, mime, size}]
{
  const msgColumns = (await db.prepare('PRAGMA table_info(messages)').all()).map((c) => c.name);
  if (!msgColumns.includes('attachments')) {
    await db.exec('ALTER TABLE messages ADD COLUMN attachments TEXT');
  }
}

export default db;

export const uuid = () => randomUUID();

export function dmKeyFor(a, b) {
  return [a, b].sort().join(':');
}

/** Unique 9-digit Nexus ID (used by the remote-control feature). */
export async function genNexId() {
  for (;;) {
    const n = String(Math.floor(100000000 + Math.random() * 900000000));
    const exists = await db.prepare('SELECT 1 FROM users WHERE nex_id = ?').get(n);
    if (!exists) return n;
  }
}

/** Backfill IDs for users created before these columns existed. */
{
  const missingIds = await db.prepare('SELECT id FROM users WHERE nex_id IS NULL').all();
  if (missingIds.length > 0) {
    for (const row of missingIds) {
      const n = await genNexId();
      await db.prepare('UPDATE users SET nex_id = ? WHERE id = ?').run(n, row.id);
    }
  }
}

/** Give every pre-username account a username based on their email. */
{
  const missing = await db.prepare('SELECT id, email FROM users WHERE username IS NULL').all();
  if (missing.length > 0) {
    const taken = new Set(
      (await db.prepare('SELECT username FROM users WHERE username IS NOT NULL').all())
        .map((r) => r.username)
    );
    for (const row of missing) {
      let base = (row.email.split('@')[0] || 'user').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20);
      if (base.length < 3) base = base.padEnd(3, '0');
      let candidate = base;
      let n = 1;
      while (taken.has(candidate)) candidate = `${base}${n++}`.slice(0, 20);
      taken.add(candidate);
      await db.prepare('UPDATE users SET username = ? WHERE id = ?').run(candidate, row.id);
    }
  }
}
