-- Password-based auth: store bcrypt hashes on user (nullable for legacy magic-link accounts).
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "passwordHash" text;
