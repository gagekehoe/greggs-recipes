-- Promote legacy bootstrap admin (ADMIN_EMAIL) to the new `owner` role.
-- Other `admin` users stay `admin`. Safe to re-run.
-- App also migrates on sign-in / createUser via ensureOwnerRole.
--
-- If your ADMIN_EMAIL differs, change the email below or rely on app bootstrap.

UPDATE "user"
SET "role" = 'owner'
WHERE lower("email") = lower('gagekehoe17@gmail.com')
  AND "role" = 'admin';
