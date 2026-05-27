-- Phase I.3 — Blog categories + per-site analytics events.
--
-- site_pages already exists (Phase G) with `kind IN ('post','page')` and a
-- free-text `category` column. We add a proper categories table + FK so
-- the owner dashboard can list, rename, and re-slug categories without
-- string surgery on every post.

CREATE TABLE IF NOT EXISTS site_blog_categories (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE UNIQUE INDEX IF NOT EXISTS site_blog_categories_site_slug
  ON site_blog_categories (site_id, slug);
CREATE INDEX IF NOT EXISTS site_blog_categories_site_sort
  ON site_blog_categories (site_id, sort_order);

-- Add a typed FK on site_pages alongside the existing free-text `category`.
-- The text column stays as a write-through fallback (set whenever
-- category_id is set) so old code paths reading the string still work
-- during the port. Once all read paths join through category_id, the text
-- column can be dropped in a later migration.
ALTER TABLE site_pages ADD COLUMN category_id TEXT REFERENCES site_blog_categories(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS site_pages_category
  ON site_pages (category_id) WHERE category_id IS NOT NULL;

-- ────────────────────────────────────────────────────────────────────────
-- Per-site analytics events.
--
-- The existing `events` + `events_daily` tables point at `venues.id`. For
-- sites we add parallel tables — same shape, broader event-type enum
-- (atelier-level: booking/order/membership clicks + completions).
-- Hot writes hit site_events; the daily rollup cron aggregates into
-- site_events_daily for fast dashboard queries.

CREATE TABLE IF NOT EXISTS site_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'view',
    'directions',
    'phone',
    'link',
    'booking_started',
    'booking_completed',
    'order_started',
    'order_completed',
    'membership_purchased',
    'review_submitted'
  )),
  -- Optional drill-down references (NULL for generic events).
  service_id TEXT,
  staff_id TEXT,
  booking_id TEXT,
  order_id TEXT,
  -- Visitor context — anonymous, used for funnel grouping.
  session_id TEXT,
  referrer TEXT,
  locale TEXT,
  country TEXT,                                        -- CF-IPCountry
  at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS site_events_site_at
  ON site_events (site_id, at);

-- Daily rollup — populated by scripts/cron/rollup-analytics.js. One row
-- per (site, day, type) keeps the dashboard graph fast.
CREATE TABLE IF NOT EXISTS site_events_daily (
  site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  day TEXT NOT NULL,                                   -- "YYYY-MM-DD"
  type TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (site_id, day, type)
);
