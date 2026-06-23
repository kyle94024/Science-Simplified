-- One-off data fix: set Kyle's (hazepski@gmail.com) profile photo on every
-- tenant DB. No-op on tenants where that email has no profile. Idempotent.
UPDATE profile
SET photo = 'https://res.cloudinary.com/nfsimplified-images/image/upload/v1782190750/profiles/file_vecbxb.jpg'
WHERE user_id IN (
  SELECT id FROM email_credentials WHERE LOWER(email) = 'hazepski@gmail.com'
);
