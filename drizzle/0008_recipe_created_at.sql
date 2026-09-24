-- Browse “Newest” = when the recipe was added (createdAt), not last edited.
-- Backfill existing rows from updatedAt (best available proxy for insert time).
-- Safe to run on Neon after 0000–0007. Prefer `npm run db:push` when DATABASE_URL is set.

ALTER TABLE "recipe"
  ADD COLUMN IF NOT EXISTS "createdAt" timestamptz;

UPDATE "recipe"
SET "createdAt" = "updatedAt"
WHERE "createdAt" IS NULL;

ALTER TABLE "recipe"
  ALTER COLUMN "createdAt" SET DEFAULT now();

ALTER TABLE "recipe"
  ALTER COLUMN "createdAt" SET NOT NULL;
