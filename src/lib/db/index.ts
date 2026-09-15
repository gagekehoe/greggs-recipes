import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import fs from "fs";
import path from "path";
import * as schema from "./schema";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "auth.sqlite");

function openSqlite() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS user (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT,
      email TEXT NOT NULL UNIQUE,
      emailVerified INTEGER,
      image TEXT,
      role TEXT NOT NULL DEFAULT 'viewer'
    );
    CREATE TABLE IF NOT EXISTS account (
      userId TEXT NOT NULL,
      type TEXT NOT NULL,
      provider TEXT NOT NULL,
      providerAccountId TEXT NOT NULL,
      refresh_token TEXT,
      access_token TEXT,
      expires_at INTEGER,
      token_type TEXT,
      scope TEXT,
      id_token TEXT,
      session_state TEXT,
      PRIMARY KEY (provider, providerAccountId),
      FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS session (
      sessionToken TEXT PRIMARY KEY NOT NULL,
      userId TEXT NOT NULL,
      expires INTEGER NOT NULL,
      FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS verificationToken (
      identifier TEXT NOT NULL,
      token TEXT NOT NULL,
      expires INTEGER NOT NULL,
      PRIMARY KEY (identifier, token)
    );
  `);
  return sqlite;
}

const globalForDb = globalThis as unknown as {
  __greggsSqlite?: Database.Database;
};

const sqlite = globalForDb.__greggsSqlite ?? openSqlite();
if (process.env.NODE_ENV !== "production") {
  globalForDb.__greggsSqlite = sqlite;
}

export const db = drizzle(sqlite, { schema });
export { schema };
