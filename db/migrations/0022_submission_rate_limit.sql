-- Tracks per-user submission attempts so the /api/venues/submit handler can
-- enforce a daily cap without spinning up an external store. One row per
-- attempt; the API counts rows in the last 24h for the user.
--
-- Why a table instead of a counter: keeping the raw attempts lets us audit
-- abuse patterns later (cluster by user + hour + outcome) without changing
-- the schema again.

CREATE TABLE IF NOT EXISTS submission_attempts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ip TEXT,
  outcome TEXT NOT NULL CHECK (outcome IN ('auto_publish', 'hold', 'reject', 'rate_limited', 'bad_input')),
  venue_id TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS submission_attempts_user_recent
  ON submission_attempts (user_id, created_at);
