-- SaaS tenant model (Phase G1). Sits next to `venues`; sharing nothing
-- structurally so the directory product stays independent. A customer can
-- have both (a paid SaaS site AND a free directory listing) but for v1
-- they're separate rows that don't auto-sync.
--
-- Pricing surface served by this schema:
--   • Hosted plan — €19/mo recurring (Stripe subscription) — site lives at
--     citynight.gr/sites/{slug} plus optional free custom_domain.
--   • Self-host plan — €190 one-time (Stripe Checkout one-off) — customer
--     downloads the Atelier ZIP and runs it themselves. zip_purchased_at
--     marks the entitlement.
--
-- A site can hold both states (saas_status='active' AND zip_purchased_at IS
-- NOT NULL) if the customer subscribed monthly AND later bought the ZIP.

CREATE TABLE IF NOT EXISTS sites (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,                            -- citynight.gr/sites/{slug}
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

  -- Business info shown on the site
  name TEXT NOT NULL,
  vertical TEXT NOT NULL CHECK (vertical IN (
    'restaurant','bar','rooftop','nightclub','beach_club','hotel','cafe','salon','other'
  )),
  template_id TEXT NOT NULL,                            -- e.g. 'restaurant', 'bar' — picks renderer
  city TEXT,                                            -- free-text city; not bound to cities.id
  country TEXT NOT NULL DEFAULT 'GR',
  address TEXT,
  phone TEXT,
  contact_email TEXT,
  hours TEXT,                                           -- JSON, Atelier shape

  -- Mini-site content (mirrors venues.* names so editor reuse is trivial)
  about_text TEXT,
  reservation_url TEXT,
  reservation_email TEXT,
  reservation_phone TEXT,
  reservation_notes TEXT,

  -- Per-tenant design — same DesignParams shape as venues.design_params
  design_params TEXT,                                   -- JSON, nullable
  design_params_locked INTEGER NOT NULL DEFAULT 0,

  -- Branding
  wordmark TEXT,
  tagline TEXT,
  logo_url TEXT,
  favicon_url TEXT,

  -- Hosting
  custom_domain TEXT,                                   -- nullable, UNIQUE via partial index below

  -- Subscription state (Stripe-driven)
  saas_status TEXT NOT NULL DEFAULT 'trialing' CHECK (saas_status IN (
    'trialing','active','past_due','canceled','paused','zip_only'
  )),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT UNIQUE,
  current_period_end INTEGER,                           -- unix seconds
  zip_purchased_at INTEGER,                             -- unix seconds; non-null = entitled to download
  zip_stripe_session_id TEXT UNIQUE,                    -- Checkout session id for the one-off

  -- Lifecycle
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','suspended')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  published_at INTEGER,
  suspended_at INTEGER
);

CREATE INDEX IF NOT EXISTS sites_owner       ON sites (owner_id);
CREATE INDEX IF NOT EXISTS sites_status      ON sites (status);
CREATE INDEX IF NOT EXISTS sites_saas_status ON sites (saas_status);
CREATE UNIQUE INDEX IF NOT EXISTS sites_custom_domain
  ON sites (custom_domain) WHERE custom_domain IS NOT NULL;

-- Menu sections + items — parallel to venue_menu_*. Same shape; per-site.
CREATE TABLE IF NOT EXISTS site_menu_sections (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS site_menu_sections_site_sort
  ON site_menu_sections (site_id, sort_order);

CREATE TABLE IF NOT EXISTS site_menu_items (
  id TEXT PRIMARY KEY,
  section_id TEXT NOT NULL REFERENCES site_menu_sections(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price TEXT,
  is_popular INTEGER NOT NULL DEFAULT 0,
  is_vegetarian INTEGER NOT NULL DEFAULT 0,
  is_vegan INTEGER NOT NULL DEFAULT 0,
  is_gluten_free INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS site_menu_items_section_sort
  ON site_menu_items (section_id, sort_order);

-- Visitor-submitted messages (reservation / contact)
CREATE TABLE IF NOT EXISTS site_messages (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('reservation','contact')),
  from_name TEXT,
  from_email TEXT,
  from_phone TEXT,
  party_size INTEGER,
  desired_at INTEGER,
  body TEXT,
  forwarded_at INTEGER,
  read_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS site_messages_site_created
  ON site_messages (site_id, created_at DESC);

-- Owner-uploaded photos for the site
CREATE TABLE IF NOT EXISTS site_photos (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  storage_key TEXT,                                     -- relative path inside UPLOADS_PATH
  attribution_text TEXT,
  is_primary INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS site_photos_site_sort
  ON site_photos (site_id, sort_order);

-- Editorial pages — blog posts + standalone pages
CREATE TABLE IF NOT EXISTS site_pages (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'post' CHECK (kind IN ('post','page')),
  title TEXT NOT NULL,
  excerpt TEXT,
  body TEXT,                                            -- raw HTML or markdown owner authored
  cover_url TEXT,
  category TEXT,
  published INTEGER NOT NULL DEFAULT 0,
  published_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE UNIQUE INDEX IF NOT EXISTS site_pages_site_slug
  ON site_pages (site_id, slug);
CREATE INDEX IF NOT EXISTS site_pages_site_published
  ON site_pages (site_id, published, published_at DESC);

-- Stripe webhook event log (idempotency + audit). Mirrors stripe_event_log
-- already used for venue subscriptions; we keep one table that covers both.
-- (Existing 0026_stripe_event_log.sql already created stripe_event_log; the
-- SaaS webhook handler will write rows there too, distinguished by event
-- type. No new table needed.)
