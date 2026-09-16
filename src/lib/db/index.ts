import * as sqliteSchema from "./schema";
import * as pgSchema from "./schema.pg";

export type AppSchema = typeof sqliteSchema | typeof pgSchema;

/**
 * Dual-dialect Drizzle client. SQLite (local) and Neon HTTP (prod) share the same
 * query shapes we use; a precise union is not callable under TypeScript.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AppDb = any;

const DATABASE_URL = process.env.DATABASE_URL?.trim() || "";
const ON_VERCEL = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);

type DbBundle = {
  db: AppDb;
  schema: AppSchema;
  dialect: "sqlite" | "postgres";
};

const globalForDb = globalThis as unknown as {
  __greggsDbBundle?: DbBundle | null;
  __greggsDbResolved?: boolean;
};

function createPostgres(): DbBundle {
  // Lazy requires keep the Neon path free of better-sqlite3.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { neon } = require("@neondatabase/serverless") as typeof import("@neondatabase/serverless");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { drizzle } = require("drizzle-orm/neon-http") as typeof import("drizzle-orm/neon-http");
  const sql = neon(DATABASE_URL);
  return {
    db: drizzle(sql, { schema: pgSchema }),
    schema: pgSchema,
    dialect: "postgres",
  };
}

function createSqlite(): DbBundle {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Database = require("better-sqlite3") as typeof import("better-sqlite3");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { drizzle } = require("drizzle-orm/better-sqlite3") as typeof import("drizzle-orm/better-sqlite3");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require("fs") as typeof import("fs");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path = require("path") as typeof import("path");

  const DATA_DIR = path.join(process.cwd(), "data");
  const DB_PATH = path.join(DATA_DIR, "auth.sqlite");
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
    CREATE TABLE IF NOT EXISTS recipe (
      id TEXT PRIMARY KEY NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      summary TEXT NOT NULL DEFAULT '',
      ingredients TEXT NOT NULL DEFAULT '[]',
      steps TEXT NOT NULL DEFAULT '[]',
      tags TEXT NOT NULL DEFAULT '[]',
      prepMinutes INTEGER NOT NULL DEFAULT 0,
      cookMinutes INTEGER NOT NULL DEFAULT 0,
      servings INTEGER NOT NULL DEFAULT 1,
      imageUrl TEXT NOT NULL DEFAULT '',
      imageAlt TEXT NOT NULL DEFAULT '',
      authorId TEXT NOT NULL,
      authorName TEXT NOT NULL,
      isPrivate INTEGER NOT NULL DEFAULT 0,
      inspiredBy TEXT NOT NULL DEFAULT '',
      inspiredByUrl TEXT NOT NULL DEFAULT '',
      updatedAt INTEGER NOT NULL
    );
  `);

  try {
    sqlite.exec(
      `ALTER TABLE recipe ADD COLUMN isPrivate INTEGER NOT NULL DEFAULT 0`
    );
  } catch {
    // Column already present on existing local DBs.
  }

  try {
    sqlite.exec(
      `ALTER TABLE recipe ADD COLUMN inspiredBy TEXT NOT NULL DEFAULT ''`
    );
  } catch {
    // Column already present on existing local DBs.
  }

  try {
    sqlite.exec(
      `ALTER TABLE recipe ADD COLUMN inspiredByUrl TEXT NOT NULL DEFAULT ''`
    );
  } catch {
    // Column already present on existing local DBs.
  }

  // Legacy bootstrap: ADMIN_EMAIL was stored as admin → promote to owner.
  try {
    const bootstrapEmail = (
      process.env.ADMIN_EMAIL || "gagekehoe17@gmail.com"
    )
      .trim()
      .toLowerCase();
    sqlite
      .prepare(
        `UPDATE user SET role = 'owner' WHERE lower(email) = ? AND role = 'admin'`
      )
      .run(bootstrapEmail);
  } catch {
    // user table may be empty / unavailable during first probe.
  }

  return {
    db: drizzle(sqlite, { schema: sqliteSchema }),
    schema: sqliteSchema,
    dialect: "sqlite",
  };
}

function resolveBundle(): DbBundle | null {
  if (DATABASE_URL) {
    return createPostgres();
  }
  if (ON_VERCEL) {
    console.error(
      "[db] DATABASE_URL is not set on Vercel. Public recipe browsing stays up; auth, reviews, and comments are disabled until Neon is configured. See docs/hosting.md."
    );
    return null;
  }
  return createSqlite();
}

function getBundle(): DbBundle | null {
  if (globalForDb.__greggsDbResolved) {
    return globalForDb.__greggsDbBundle ?? null;
  }
  const bundle = resolveBundle();
  globalForDb.__greggsDbBundle = bundle;
  globalForDb.__greggsDbResolved = true;
  return bundle;
}

/** True when Auth.js / reviews can use a real database. */
export function isDatabaseConfigured(): boolean {
  return getBundle() !== null;
}

export function getDbDialect(): "sqlite" | "postgres" | "none" {
  return getBundle()?.dialect ?? "none";
}

/**
 * Active Drizzle client. Throws when running on Vercel without DATABASE_URL.
 * Prefer `isDatabaseConfigured()` for public read paths that should degrade.
 */
export function getDb(): AppDb {
  const bundle = getBundle();
  if (!bundle) {
    throw new Error(
      "Database is not configured. Set DATABASE_URL (Neon/Postgres) on Vercel. See docs/hosting.md."
    );
  }
  return bundle.db;
}

const bundle = getBundle();

/** Active Drizzle client, or a throwing proxy when DB is unavailable (Vercel without DATABASE_URL). */
export const db: AppDb = bundle
  ? bundle.db
  : (new Proxy({} as AppDb, {
      get(_target, prop) {
        if (prop === "then") return undefined;
        throw new Error(
          "Database is not configured. Set DATABASE_URL (Neon/Postgres) on Vercel. See docs/hosting.md."
        );
      },
    }) as AppDb);

const activeSchema = bundle?.schema ?? sqliteSchema;

export const users = activeSchema.users;
export const accounts = activeSchema.accounts;
export const sessions = activeSchema.sessions;
export const verificationTokens = activeSchema.verificationTokens;
export const recipeReviews = activeSchema.recipeReviews;
export const recipeReviewImages = activeSchema.recipeReviewImages;
export const recipeComments = activeSchema.recipeComments;
export const recipes = activeSchema.recipes;

/** SQLite schema module (tests / local helpers). Prefer named table exports above for app code. */
export const schema = sqliteSchema;

export { ROLES } from "./schema";
export type {
  Role,
  DbUser,
  DbRecipeReview,
  DbRecipeReviewImage,
  DbRecipeComment,
  DbRecipe,
} from "./schema";
