-- Password auth for citynight users. Stored as:
--   PBKDF2-SHA256, 100k iterations, 16-byte random salt
--   serialised as "pbkdf2$<iters>$<salt-base64>$<hash-base64>"
-- Verification is constant-time. Plaintext never leaves the browser
-- request body; we never log it.

ALTER TABLE users ADD COLUMN password_hash TEXT;
