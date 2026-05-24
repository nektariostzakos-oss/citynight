-- 0000_init: full base schema for citynight.gr (matches db/schema.ts §8).
-- Hand-written to keep FTS5 + seed migrations cleanly composable with drizzle-kit.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS cities (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  region TEXT,
  lat REAL,
  lng REAL,
  hero_photo_id TEXT,
  is_published INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS areas (
  id TEXT PRIMARY KEY,
  city_id TEXT NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  lat REAL,
  lng REAL,
  hero_photo_id TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS areas_city_slug ON areas (city_id, slug);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  parent_id TEXT
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  name TEXT,
  locale TEXT DEFAULT 'en',
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner','admin')),
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions (user_id);

CREATE TABLE IF NOT EXISTS magic_tokens (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('login','claim')),
  venue_id TEXT,
  expires_at INTEGER NOT NULL,
  used_at INTEGER
);

CREATE TABLE IF NOT EXISTS venues (
  id TEXT PRIMARY KEY,
  slug TEXT,
  city_id TEXT NOT NULL REFERENCES cities(id),
  area_id TEXT REFERENCES areas(id),
  category_id TEXT REFERENCES categories(id),
  google_place_id TEXT UNIQUE,
  name TEXT NOT NULL,
  address TEXT,
  lat REAL,
  lng REAL,
  phone TEXT,
  opening_hours TEXT,           -- JSON
  price_level INTEGER,
  website TEXT,
  description TEXT,             -- ONLY column AI is permitted to write
  field_sources TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending','published','closed','rejected')),
  claim TEXT NOT NULL DEFAULT 'unclaimed' CHECK (claim IN ('unclaimed','pending','verified')),
  owner_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free','featured')),
  rating REAL,
  review_count INTEGER,
  business_status TEXT,
  is_permanently_closed INTEGER NOT NULL DEFAULT 0,
  seed_photo_refs TEXT,         -- JSON
  last_synced_at INTEGER,
  created_at INTEGER DEFAULT (unixepoch()),
  published_at INTEGER
);
CREATE INDEX IF NOT EXISTS venues_city_status ON venues (city_id, status);
CREATE INDEX IF NOT EXISTS venues_category ON venues (category_id);
CREATE INDEX IF NOT EXISTS venues_claim ON venues (claim);
CREATE UNIQUE INDEX IF NOT EXISTS venues_city_slug ON venues (city_id, slug);

-- §6 integrity rule 2: photos source × subject CHECK constraint —
-- prevents any code path from attaching ai_decorative / licensed_stock to a venue/product.
CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY,
  venue_id TEXT REFERENCES venues(id) ON DELETE CASCADE,
  area_id TEXT REFERENCES areas(id) ON DELETE CASCADE,
  city_id TEXT REFERENCES cities(id) ON DELETE CASCADE,
  subject_type TEXT NOT NULL CHECK (subject_type IN ('venue','product','location','decorative')),
  source TEXT NOT NULL CHECK (source IN ('google_places','owner_upload','own_photography','licensed_stock','placeholder','ai_decorative')),
  url TEXT NOT NULL,
  storage_key TEXT,
  attribution_text TEXT,
  attribution_url TEXT,
  license TEXT,
  cached_until INTEGER,
  is_primary INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch()),
  CONSTRAINT photo_source_matches_subject CHECK (
    (subject_type IN ('venue','product') AND source IN ('google_places','owner_upload','placeholder'))
    OR (subject_type = 'location'  AND source IN ('own_photography','licensed_stock','google_places','placeholder'))
    OR (subject_type = 'decorative' AND source IN ('ai_decorative','licensed_stock'))
  )
);
CREATE INDEX IF NOT EXISTS photos_venue ON photos (venue_id);

CREATE TABLE IF NOT EXISTS claims (
  id TEXT PRIMARY KEY,
  venue_id TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  method TEXT NOT NULL DEFAULT 'email' CHECK (method IN ('email','sms')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','rejected')),
  verified_at INTEGER,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS venue_submissions (
  id TEXT PRIMARY KEY,
  venue_id TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  submitted_by TEXT REFERENCES users(id),
  places_match INTEGER,
  confidence REAL,
  auto_decision TEXT CHECK (auto_decision IN ('auto_publish','hold','reject')),
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  venue_id TEXT REFERENCES venues(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('closed','wrong_info','duplicate','spam')),
  detail TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewing','resolved','dismissed')),
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  venue_id TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('active','past_due','canceled','incomplete')),
  current_period_end INTEGER,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS ad_campaigns (
  id TEXT PRIMARY KEY,
  advertiser_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  creative_url TEXT NOT NULL,
  target_url TEXT NOT NULL,
  scope TEXT NOT NULL CHECK (scope IN ('site','section','category')),
  target_city_id TEXT REFERENCES cities(id),
  target_area_id TEXT REFERENCES areas(id),
  target_category_id TEXT REFERENCES categories(id),
  stripe_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending_payment','pending_moderation','active','paused','rejected','ended')),
  moderation TEXT NOT NULL DEFAULT 'pending' CHECK (moderation IN ('pending','approved','rejected')),
  starts_at INTEGER,
  ends_at INTEGER,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS affiliate_links (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  label TEXT
);

CREATE TABLE IF NOT EXISTS affiliate_destinations (
  id TEXT PRIMARY KEY,
  affiliate_link_id TEXT NOT NULL REFERENCES affiliate_links(id) ON DELETE CASCADE,
  country_code TEXT NOT NULL,
  program TEXT NOT NULL,
  url TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1
);
CREATE UNIQUE INDEX IF NOT EXISTS aff_dest_link_country ON affiliate_destinations (affiliate_link_id, country_code);

CREATE TABLE IF NOT EXISTS translations (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('venue','city','area','category')),
  entity_id TEXT NOT NULL,
  field TEXT NOT NULL,
  locale TEXT NOT NULL,
  value TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'ai' CHECK (source IN ('google_places','owner','own_media','licensed_stock','ai','admin'))
);
CREATE UNIQUE INDEX IF NOT EXISTS tr_unique ON translations (entity_type, entity_id, field, locale);
CREATE INDEX IF NOT EXISTS tr_lookup  ON translations (entity_type, entity_id, locale);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  venue_id TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('view','directions','phone','link')),
  at INTEGER DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS events_venue_at ON events (venue_id, at);

CREATE TABLE IF NOT EXISTS events_daily (
  venue_id TEXT NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  day TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('view','directions','phone','link')),
  count INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS events_daily_pk ON events_daily (venue_id, day, type);
