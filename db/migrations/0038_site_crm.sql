-- Phase I.3 — CRM: clients, memberships, reviews.
--
-- Forward-declared by site_bookings (client_id FK) and
-- site_gift_card_redemptions (booking_id FK back to bookings); SQLite
-- allows forward references in FK definitions as long as the table
-- exists by the time data is inserted, so this is safe.

CREATE TABLE IF NOT EXISTS site_clients (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,

  -- Identity. Email or phone is required (at least one); a UNIQUE partial
  -- index per site lets the same customer email exist across sites.
  email TEXT,
  phone TEXT,
  name TEXT NOT NULL,
  birthday TEXT,                                       -- "YYYY-MM-DD"

  -- Free-form owner notes — preferences, allergies, "always asks for
  -- coffee", etc. Atelier shape: `notes` (string), `tags` (array of strings).
  notes TEXT,
  tags TEXT,                                           -- JSON array of strings

  preferred_staff_id TEXT REFERENCES site_staff(id) ON DELETE SET NULL,

  -- Derived rollups updated when bookings/orders are created/finalised.
  -- Cached so the dashboard doesn't have to aggregate on every page load.
  total_bookings INTEGER NOT NULL DEFAULT 0,
  total_spent_cents INTEGER NOT NULL DEFAULT 0,
  loyalty_points INTEGER NOT NULL DEFAULT 0,
  last_booked_at INTEGER,
  last_ordered_at INTEGER,

  -- GDPR — owners can mark a client deleted (PII wiped) while keeping
  -- booking/order rows with the snapshot fields intact for accounting.
  deleted_at INTEGER,

  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE UNIQUE INDEX IF NOT EXISTS site_clients_site_email
  ON site_clients (site_id, lower(email)) WHERE email IS NOT NULL AND deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS site_clients_site_phone
  ON site_clients (site_id, phone) WHERE phone IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS site_clients_site_last_booked
  ON site_clients (site_id, last_booked_at DESC);

-- Memberships — prepaid term that gives the client a standing discount
-- on bookings until `expires_at`. No auto-renew (atelier's design choice;
-- keeps the Stripe surface to a single one-off charge).
CREATE TABLE IF NOT EXISTS site_memberships (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES site_clients(id) ON DELETE CASCADE,

  term_months INTEGER NOT NULL CHECK (term_months IN (1, 6, 12)),
  -- Frozen at purchase time: a settings change after the fact never
  -- alters a membership already sold.
  discount_percent INTEGER NOT NULL,
  price_paid_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',

  starts_at INTEGER NOT NULL,                          -- unix seconds
  expires_at INTEGER NOT NULL,                         -- starts_at + term_months
  cancelled_at INTEGER,

  -- Stripe Checkout Session that paid for this membership. Used for
  -- idempotency: a refreshed success page must not double-create.
  stripe_checkout_session_id TEXT UNIQUE,

  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS site_memberships_client_active
  ON site_memberships (site_id, client_id, expires_at)
  WHERE cancelled_at IS NULL;

-- Reviews — post-visit feedback. Atelier sources both 'booking' (the
-- one-tap email link after a completed booking) and 'manual' (owner-
-- typed). The 'google' source caches a Google Business Profile review for
-- display on the site without polling the API on every page render.
CREATE TABLE IF NOT EXISTS site_reviews (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  booking_id TEXT REFERENCES site_bookings(id) ON DELETE SET NULL,
  client_id TEXT REFERENCES site_clients(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'booking' CHECK (source IN ('booking','manual','google')),

  -- Snapshot of author identity — survives client deletion.
  author_name TEXT,
  author_email TEXT,

  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title TEXT,
  body TEXT,

  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending','approved','rejected','flagged'
  )),
  approved_at INTEGER,
  reply TEXT,                                          -- owner reply, public
  reply_at INTEGER,

  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS site_reviews_site_status_created
  ON site_reviews (site_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS site_reviews_booking
  ON site_reviews (booking_id) WHERE booking_id IS NOT NULL;
