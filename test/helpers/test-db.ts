import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@/lib/db/schema";

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS user (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT,
    email TEXT NOT NULL UNIQUE,
    emailVerified INTEGER,
    image TEXT,
    passwordHash TEXT,
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
  CREATE TABLE IF NOT EXISTS recipe_review (
    id TEXT PRIMARY KEY NOT NULL,
    recipeId TEXT NOT NULL,
    userId TEXT NOT NULL,
    rating INTEGER NOT NULL,
    body TEXT,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL,
    FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE
  );
  CREATE UNIQUE INDEX IF NOT EXISTS recipe_review_recipe_user_uidx
    ON recipe_review (recipeId, userId);
  CREATE TABLE IF NOT EXISTS recipe_review_image (
    id TEXT PRIMARY KEY NOT NULL,
    reviewId TEXT NOT NULL,
    url TEXT NOT NULL,
    sortOrder INTEGER NOT NULL DEFAULT 0,
    createdAt INTEGER NOT NULL,
    FOREIGN KEY (reviewId) REFERENCES recipe_review(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS recipe_comment (
    id TEXT PRIMARY KEY NOT NULL,
    recipeId TEXT NOT NULL,
    userId TEXT NOT NULL,
    body TEXT NOT NULL,
    createdAt INTEGER NOT NULL,
    FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS recipe_comment_recipe_idx
    ON recipe_comment (recipeId);
`;

export function createTestDb() {
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");
  sqlite.exec(SCHEMA_SQL);
  const db = drizzle(sqlite, { schema });
  return { sqlite, db, schema };
}

export type TestDb = ReturnType<typeof createTestDb>;
