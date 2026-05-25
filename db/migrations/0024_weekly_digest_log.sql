-- Track which (user, week) digest emails have already been sent so the cron
-- can re-run safely without double-sending. `week_iso` is the ISO week
-- string ("2026-W21") so we don't depend on a timestamp range.

CREATE TABLE IF NOT EXISTS weekly_digest_sent (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_iso TEXT NOT NULL,
  sent_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE UNIQUE INDEX IF NOT EXISTS weekly_digest_sent_unique
  ON weekly_digest_sent (user_id, week_iso);
