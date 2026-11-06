import Database from "better-sqlite3";
import { drizzle, BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import path from "path";
import fs from "fs";
import * as schema from "./schema";

const BOOTSTRAP_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS caddy_instances (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  admin_url TEXT NOT NULL,
  auth_type TEXT NOT NULL DEFAULT 'none',
  encrypted_auth_secret TEXT,
  environment TEXT NOT NULL DEFAULT 'dev',
  last_status TEXT NOT NULL DEFAULT 'offline',
  last_checked_at INTEGER,
  last_known_config_hash TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS config_revisions (
  id TEXT PRIMARY KEY NOT NULL,
  instance_id TEXT NOT NULL REFERENCES caddy_instances(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  revision_number INTEGER NOT NULL,
  action_type TEXT NOT NULL,
  summary TEXT NOT NULL,
  previous_config_json TEXT NOT NULL,
  new_config_json TEXT NOT NULL,
  status TEXT NOT NULL,
  error_message TEXT,
  reverted_from_revision_id TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_config_revisions_instance_id ON config_revisions(instance_id, revision_number DESC);
`;

declare global {
  var __caddyManagerDb: BetterSQLite3Database<typeof schema> | undefined;
}

function createDbInstance(): BetterSQLite3Database<typeof schema> {
  const dbPath =
    process.env.DATABASE_URL ||
    path.join(process.cwd(), "data", "caddy-manager.db");

  if (dbPath !== ":memory:") {
    const dir = path.dirname(path.resolve(/*turbopackIgnore: true*/ dbPath));
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.exec(BOOTSTRAP_SQL);

  return drizzle(sqlite, { schema });
}

export function getDb(): BetterSQLite3Database<typeof schema> {
  if (!global.__caddyManagerDb) {
    global.__caddyManagerDb = createDbInstance();
  }
  return global.__caddyManagerDb;
}
