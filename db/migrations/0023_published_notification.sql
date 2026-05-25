-- Timestamp set when we send the "your venue is live" email to the owner so
-- the cron job never double-sends. NULL = unnotified; the cron picks those up,
-- emails, and stamps unixepoch().

ALTER TABLE venues ADD COLUMN published_notification_sent_at INTEGER;

CREATE INDEX IF NOT EXISTS venues_pending_notification
  ON venues (status, published_notification_sent_at)
  WHERE status = 'published';
