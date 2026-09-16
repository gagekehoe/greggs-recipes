-- Private recipes: author-only visibility (default public for existing rows).
-- Safe to run on Neon after 0000/0001. Prefer `npm run db:push` when DATABASE_URL is set.

ALTER TABLE "recipe"
  ADD COLUMN IF NOT EXISTS "isPrivate" boolean DEFAULT false NOT NULL;
