-- Phase I.3 — Services + Staff catalogue per site.
--
-- Atelier's `data/services.json` and `data/staff.json` move into SQLite,
-- one row set per site. The booking engine (next migration) joins both.
--
-- Pricing is stored as INTEGER cents to avoid float drift. UI converts to
-- the site's currency (atelier defaults to local; citynight v1 is EUR for
-- Greek venues but we keep the cents form generic).

CREATE TABLE IF NOT EXISTS site_services (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,                                  -- atelier `id` (e.g. "signature-cut")
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL,                   -- atelier `duration`
  buffer_minutes INTEGER NOT NULL DEFAULT 0,           -- atelier `bufferMinutes`
  price_cents INTEGER NOT NULL,                        -- atelier `price` * 100
  category TEXT,                                       -- free-text grouping
  enabled INTEGER NOT NULL DEFAULT 1,                  -- atelier `enabled`
  sort_order INTEGER NOT NULL DEFAULT 0,               -- atelier `order`
  -- i18n key fallback for atelier's `tkey` — when set, UI prefers translation
  -- table lookup over `name`. Optional; most sites just edit `name` directly.
  tkey TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE UNIQUE INDEX IF NOT EXISTS site_services_site_slug
  ON site_services (site_id, slug);
CREATE INDEX IF NOT EXISTS site_services_site_enabled_sort
  ON site_services (site_id, enabled, sort_order);

CREATE TABLE IF NOT EXISTS site_staff (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,                                  -- atelier `id` (e.g. "marcus")
  name TEXT NOT NULL,
  role TEXT,                                           -- atelier `role`
  bio TEXT,                                            -- atelier `bio`
  photo_url TEXT,                                      -- atelier `photo`
  specialties TEXT,                                    -- JSON array of strings
  enabled INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,               -- atelier `order`

  -- Default weekly schedule. Atelier shape: `workDays` int[] of weekday
  -- numbers (1=Mon … 7=Sun, ISO), `startTime`/`endTime`/`breakStart`/`breakEnd`
  -- as 24h "HH:MM". The site_availability_rules table can override per
  -- weekday or per date; this is the fallback.
  work_days TEXT NOT NULL DEFAULT '[1,2,3,4,5]',       -- JSON array of ints
  start_time TEXT NOT NULL DEFAULT '09:00',
  end_time TEXT NOT NULL DEFAULT '18:00',
  break_start TEXT,
  break_end TEXT,

  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE UNIQUE INDEX IF NOT EXISTS site_staff_site_slug
  ON site_staff (site_id, slug);
CREATE INDEX IF NOT EXISTS site_staff_site_enabled_sort
  ON site_staff (site_id, enabled, sort_order);

-- Which staff can perform which service. Atelier defaults to "any staff
-- can do any enabled service"; this junction lets owners restrict the
-- mapping (e.g. only the master barber does straight-razor shaves).
-- Empty join for a service → all enabled staff can perform it.
CREATE TABLE IF NOT EXISTS site_service_staff (
  service_id TEXT NOT NULL REFERENCES site_services(id) ON DELETE CASCADE,
  staff_id TEXT NOT NULL REFERENCES site_staff(id) ON DELETE CASCADE,
  PRIMARY KEY (service_id, staff_id)
);
CREATE INDEX IF NOT EXISTS site_service_staff_staff
  ON site_service_staff (staff_id);
