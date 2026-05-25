-- Idempotency log for Stripe webhook deliveries. Stripe retries on any
-- non-2xx response (or timeout), so the same event id can land more than
-- once. We INSERT OR IGNORE on (event_id) — if the row already exists,
-- the webhook returns 200 without re-running the handler.
--
-- Keep this table small (cron prunes rows older than 60 days) — Stripe's
-- max retry window is 3 days, so 60d is overkill but cheap.

CREATE TABLE IF NOT EXISTS stripe_events_seen (
  event_id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  received_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS stripe_events_seen_received ON stripe_events_seen (received_at);
