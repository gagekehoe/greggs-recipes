-- Invalidate Auth.js JWT sessions after password reset: store when the password
-- last changed and reject JWTs stamped before that time (see password-session.ts).
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "passwordUpdatedAt" timestamptz;
