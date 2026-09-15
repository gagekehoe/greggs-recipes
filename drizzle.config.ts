import { defineConfig } from "drizzle-kit";

/**
 * Neon / Postgres schema push.
 *
 *   export DATABASE_URL="postgresql://..."
 *   npm run db:push
 *
 * Schema source: src/lib/db/schema.pg.ts
 * Raw SQL mirror: drizzle/0000_neon_init.sql
 *
 * drizzle-kit loads `.env` / `.env.local` automatically when present.
 */
export default defineConfig({
  schema: "./src/lib/db/schema.pg.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "",
  },
});
