-- Selective sharing for private recipes: named users and/or roles (not everyone).
-- Safe to re-run on Neon after 0000–0005. Prefer `npm run db:push` when possible.

CREATE TABLE IF NOT EXISTS "recipe_share" (
  "id" text PRIMARY KEY NOT NULL,
  "recipeId" text NOT NULL,
  "userId" text,
  "role" text,
  "createdAt" timestamptz DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "recipe_share"
    ADD CONSTRAINT "recipe_share_recipeId_recipe_id_fk"
    FOREIGN KEY ("recipeId") REFERENCES "recipe"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "recipe_share"
    ADD CONSTRAINT "recipe_share_userId_user_id_fk"
    FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "recipe_share_recipe_user_uidx"
  ON "recipe_share" ("recipeId", "userId");
CREATE UNIQUE INDEX IF NOT EXISTS "recipe_share_recipe_role_uidx"
  ON "recipe_share" ("recipeId", "role");
