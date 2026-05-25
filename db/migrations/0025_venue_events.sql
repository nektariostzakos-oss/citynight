-- Featured-tier "post an event" feature. Owners with tier='featured' can
-- attach dated events to their venue (DJ nights, themed parties, gigs).
-- Public site renders upcoming events at the top of the venue page.
--
-- Naming: avoided `events` (already taken by analytics in §8). `venue_events`
-- keeps the concept clear at a glance and avoids the join confusion.

CREATE TABLE IF NOT EXISTS venue_events (
  id TEXT PRIMARY KEY,
  venue_id TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  starts_at INTEGER NOT NULL,
  ends_at INTEGER,
  url TEXT,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','canceled')),
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS venue_events_venue_starts
  ON venue_events (venue_id, starts_at);

-- Partial index for the public-site query: upcoming published events only.
CREATE INDEX IF NOT EXISTS venue_events_upcoming
  ON venue_events (venue_id, starts_at)
  WHERE status = 'published';
