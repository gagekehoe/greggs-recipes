-- Neon / Postgres init for Gregg's Recipes (Auth.js + reviews/comments)
-- Apply via: npm run db:push  (preferred)
-- Or paste into the Neon SQL editor.

CREATE TABLE IF NOT EXISTS "user" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text,
  "email" text NOT NULL UNIQUE,
  "emailVerified" timestamptz,
  "image" text,
  "role" text DEFAULT 'viewer' NOT NULL
);

CREATE TABLE IF NOT EXISTS "account" (
  "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "type" text NOT NULL,
  "provider" text NOT NULL,
  "providerAccountId" text NOT NULL,
  "refresh_token" text,
  "access_token" text,
  "expires_at" integer,
  "token_type" text,
  "scope" text,
  "id_token" text,
  "session_state" text,
  PRIMARY KEY ("provider", "providerAccountId")
);

CREATE TABLE IF NOT EXISTS "session" (
  "sessionToken" text PRIMARY KEY NOT NULL,
  "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "expires" timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS "verificationToken" (
  "identifier" text NOT NULL,
  "token" text NOT NULL,
  "expires" timestamptz NOT NULL,
  PRIMARY KEY ("identifier", "token")
);

CREATE TABLE IF NOT EXISTS "recipe_review" (
  "id" text PRIMARY KEY NOT NULL,
  "recipeId" text NOT NULL,
  "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "rating" integer NOT NULL,
  "body" text,
  "createdAt" timestamptz NOT NULL,
  "updatedAt" timestamptz NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "recipe_review_recipe_user_uidx"
  ON "recipe_review" ("recipeId", "userId");

CREATE TABLE IF NOT EXISTS "recipe_review_image" (
  "id" text PRIMARY KEY NOT NULL,
  "reviewId" text NOT NULL REFERENCES "recipe_review"("id") ON DELETE CASCADE,
  "url" text NOT NULL,
  "sortOrder" integer DEFAULT 0 NOT NULL,
  "createdAt" timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS "recipe_comment" (
  "id" text PRIMARY KEY NOT NULL,
  "recipeId" text NOT NULL,
  "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "body" text NOT NULL,
  "createdAt" timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS "recipe_comment_recipe_idx"
  ON "recipe_comment" ("recipeId");
