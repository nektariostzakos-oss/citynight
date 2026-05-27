-- Venue mini-site content surface (Phase F1).
--
-- Each venue page on citynight optionally exposes four subdirectory routes:
--   /menu /book /about /gallery
-- They are owner-edited via the dashboard. Free-tier claims can edit About
-- + Gallery (more SEO content for citynight); Featured-tier unlocks Menu +
-- structured reservation settings (that's where the money is).
--
-- Translations: kept simple for now. About is editable per-locale via the
-- existing `translations` table (entity_type='venue', field='about_text').
-- Menus stay single-locale (food names rarely localize meaningfully) —
-- enough for v1; we add per-item translations only if real ops ask for it.

-- Direct columns on venues: cheap, queryable, no extra joins on the venue page.
ALTER TABLE venues ADD COLUMN about_text TEXT;             -- owner-authored primary-locale about
ALTER TABLE venues ADD COLUMN reservation_url TEXT;        -- external booking URL (OpenTable / e-table / their own Atelier site / etc.)
ALTER TABLE venues ADD COLUMN reservation_email TEXT;      -- venue email for reservation forwarding
ALTER TABLE venues ADD COLUMN reservation_notes TEXT;      -- "Reservations recommended for parties of 6+"
ALTER TABLE venues ADD COLUMN reservation_phone TEXT;      -- separate from public phone if they want

-- Menu sections (e.g. "Cocktails", "Small plates", "Mains", "Desserts").
CREATE TABLE IF NOT EXISTS venue_menu_sections (
  id TEXT PRIMARY KEY,
  venue_id TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                          -- "Cocktails"
  description TEXT,                            -- optional intro line
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS venue_menu_sections_venue_sort
  ON venue_menu_sections (venue_id, sort_order);

-- Items within a section.
CREATE TABLE IF NOT EXISTS venue_menu_items (
  id TEXT PRIMARY KEY,
  section_id TEXT NOT NULL REFERENCES venue_menu_sections(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                          -- "Negroni"
  description TEXT,                            -- "Campari, Cinzano Rosso, gin"
  -- Free-text price so owners can write "€8", "From €18", "Market price", etc.
  -- Validating to a strict number locks out the half of restaurants that
  -- price by weight, season, or "ask the chef."
  price TEXT,
  -- Flags for the renderer. Mutually exclusive in UI but both stored — owners
  -- can mark a row both "popular" and "spicy" if they want.
  is_popular INTEGER NOT NULL DEFAULT 0,
  is_vegetarian INTEGER NOT NULL DEFAULT 0,
  is_vegan INTEGER NOT NULL DEFAULT 0,
  is_gluten_free INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS venue_menu_items_section_sort
  ON venue_menu_items (section_id, sort_order);

-- A logging table for contact-form submissions that come in from /book or
-- a future contact-us subdirectory page. Owner sees them in the dashboard;
-- we forward to reservation_email on insert (handled in the API route).
CREATE TABLE IF NOT EXISTS venue_messages (
  id TEXT PRIMARY KEY,
  venue_id TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('reservation','contact')),
  from_name TEXT,
  from_email TEXT,
  from_phone TEXT,
  party_size INTEGER,
  desired_at INTEGER,                         -- unix seconds; null for non-reservation
  body TEXT,
  forwarded_at INTEGER,                        -- non-null once we've emailed reservation_email
  read_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS venue_messages_venue_created
  ON venue_messages (venue_id, created_at DESC);
