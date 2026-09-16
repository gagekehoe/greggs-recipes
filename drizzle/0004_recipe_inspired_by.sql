-- Optional Inspired by attribution (detail page only; empty for existing rows).
-- Safe to run on Neon after 0000–0003. Prefer `npm run db:push` when DATABASE_URL is set.

ALTER TABLE "recipe"
  ADD COLUMN IF NOT EXISTS "inspiredBy" text DEFAULT '' NOT NULL;

ALTER TABLE "recipe"
  ADD COLUMN IF NOT EXISTS "inspiredByUrl" text DEFAULT '' NOT NULL;
