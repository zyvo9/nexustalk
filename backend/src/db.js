import { createClient as initTurso } from '@libsql/client';
import { DatabaseSync } from 'node:sqlite';
import { config } from './config.js';

/**
 * Async DB with a dual driver:
 *  - Cloud: Turso (libSQL) when TURSO_URL + TURSO_TOKEN are set
 *  - Local: node:sqlite (zero dependency) otherwise
 * Every method is awaited, so routes never care which one is active.
 */

const useTurso = !!(process.env.TURSO_URL && process.env.TURSO_TOKEN);

let client;
if (useTurso) {
  client = initTurso.createClient({
    url: process.env.TURSO_URL,
    authToken: process.env.TURSO_TOKEN,
  });
  console.log('db: Turso (cloud)');
} else {
  const sqlite = new DatabaseSync(process.env.DB_PATH || 'nexustalk.db');
  client = {
    async execute(sql, params = []) {
      return sqlite.prepare(sql).run(...params);
    },
    async batch(statements) {
      return statements.map((s) => sqlite.prepare(s.sql).run(...(s.params ?? [])));
    },
    async select(sql, params = []) {
      return { rows: sqlite.prepare(sql).all(...params) };
    },
  };
  console.log('db: local sqlite');
}

export const db = {
  /** Run a statement; returns { changes }. */
  async run(sql, params = []) {
    const r = await client.execute(sql, params);
    return { changes: r.changes ?? 0 };
  },

  /** Run several statements in sequence (local driver: sequential). */
  async batch(statements) {
    return client.batch(statements);
  },

  /** Select rows as an array of objects. */
  async all(sql, params = []) {
    const r = await client.select(sql, params);
    return r.rows;
  },

  /** Select one row or null. */
  async get(sql, params = []) {
    const rows = await this.all(sql, params);
    return rows[0] ?? null;
  },
};

export async function migrate() {
  const schema = [
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      name TEXT NOT NULL,
      username TEXT UNIQUE,
      avatar TEXT,
      google_id TEXT UNIQUE,
      onboarded INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_seen TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS chats (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK (type IN ('dm','group')),
      title TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS chat_members (
      chat_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      PRIMARY KEY (chat_id, user_id)
    )`,
    `CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      chat_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      body TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY,
      message_id TEXT,
      owner_id TEXT NOT NULL,
      name TEXT NOT NULL,
      mime TEXT NOT NULL,
      size INTEGER NOT NULL DEFAULT 0,
      data BLOB NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS calls (
      id TEXT PRIMARY KEY,
      chat_id TEXT,
      caller_id TEXT NOT NULL,
      callee_id TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL,
      duration INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages (chat_id, created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_calls_user ON calls (caller_id, callee_id, created_at)`,
  ];
  for (const sql of schema) {
    await db.run(sql);
  }
  console.log('db: schema ready');
}

export function genId(prefix = '') {
  return prefix + crypto.randomUUID();
}

export function genNexId() {
  // 9-digit user-facing ID (kept for future friend-add by ID)
  return String(100000000 + Math.floor(Math.random() * 899999999));
}

export function genTokenId() {
  return crypto.randomBytes(24).toString('base64url');
}
