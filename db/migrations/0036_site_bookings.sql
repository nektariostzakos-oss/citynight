-- Phase I.3 — Bookings, availability rules, holidays.
--
-- The atelier booking engine moves to SQLite. Each booking belongs to one
-- service + one staff member (a row in site_service_staff guarantees the
-- match is allowed). Slot-collision checks become an indexed query on
-- (site_id, staff_id, date, time).
--
-- `date` is the LOCAL calendar date in the site's timezone (`sites.country`
-- + a future `sites.timezone` field). `time` is the local 24h "HH:MM" the
-- slot starts. Storing both as text mirrors atelier and avoids the trap of
-- UTC-converting before the timezone is decided.

CREATE TABLE IF NOT EXISTS site_bookings (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  service_id TEXT NOT NULL REFERENCES site_services(id) ON DELETE RESTRICT,
  staff_id TEXT NOT NULL REFERENCES site_staff(id) ON DELETE RESTRICT,
  client_id TEXT REFERENCES site_clients(id) ON DELETE SET NULL, -- nullable: walk-ins / first-time bookings before account creation

  -- Slot
  date TEXT NOT NULL,                                  -- "YYYY-MM-DD" in site-local tz
  time TEXT NOT NULL,                                  -- "HH:MM"
  duration_minutes INTEGER NOT NULL,                   -- copy of service.duration_minutes at booking time
  buffer_minutes INTEGER NOT NULL DEFAULT 0,

  -- Snapshot of contact info — survives client row deletion (GDPR).
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,

  -- Snapshot of pricing — survives service price changes.
  price_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',                -- ISO-4217

  -- Deposit (memberships + standard "secure with X% upfront" feature)
  deposit_percent INTEGER,                             -- 0..100, NULL = no deposit
  deposit_paid_cents INTEGER,                          -- captured at booking time
  deposit_stripe_payment_intent_id TEXT,

  -- Membership applied at booking (frozen for audit)
  membership_id TEXT REFERENCES site_memberships(id) ON DELETE SET NULL,
  discount_percent INTEGER,                            -- combined membership + coupon discount, 0..100

  -- Lifecycle
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN (
    'pending','confirmed','completed','no_show','cancelled'
  )),
  cancelled_at INTEGER,
  cancellation_reason TEXT,
  completed_at INTEGER,

  notes TEXT,                                          -- owner / staff note
  customer_notes TEXT,                                 -- atelier accepts customer-supplied notes
  walk_in INTEGER NOT NULL DEFAULT 0,                  -- atelier `walkIn`
  lang TEXT NOT NULL DEFAULT 'en',                     -- locale at booking time, for reminder emails

  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Slot-collision lookups — the hot path for "is this slot free?".
CREATE INDEX IF NOT EXISTS site_bookings_slot
  ON site_bookings (site_id, staff_id, date, time);

-- Owner dashboard: bookings for a given site, sorted by upcoming.
CREATE INDEX IF NOT EXISTS site_bookings_site_date
  ON site_bookings (site_id, date, time);

-- Client history: all bookings for one customer.
CREATE INDEX IF NOT EXISTS site_bookings_client
  ON site_bookings (client_id) WHERE client_id IS NOT NULL;

-- Stripe deposit reconciliation
CREATE UNIQUE INDEX IF NOT EXISTS site_bookings_deposit_intent
  ON site_bookings (deposit_stripe_payment_intent_id)
  WHERE deposit_stripe_payment_intent_id IS NOT NULL;

-- Per-staff availability override. If a staff member has no rules, fall
-- back to their default schedule on site_staff. Multiple rules per staff
-- are OR-ed (any matching rule means the staff IS available in that range).
-- A single OPEN-time row overrides the default; CLOSED rows punch holes
-- (e.g. half-day off).
CREATE TABLE IF NOT EXISTS site_availability_rules (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  staff_id TEXT NOT NULL REFERENCES site_staff(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('open','closed')),
  -- One-off date OR recurring weekday. Exactly one of these is non-null;
  -- a CHECK enforces XOR.
  date TEXT,                                           -- "YYYY-MM-DD"
  weekday INTEGER,                                     -- 1..7 ISO
  start_time TEXT NOT NULL,                            -- "HH:MM"
  end_time TEXT NOT NULL,                              -- "HH:MM"
  reason TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  CHECK ((date IS NULL) != (weekday IS NULL))          -- XOR
);
CREATE INDEX IF NOT EXISTS site_availability_rules_staff
  ON site_availability_rules (site_id, staff_id);
CREATE INDEX IF NOT EXISTS site_availability_rules_date
  ON site_availability_rules (site_id, date) WHERE date IS NOT NULL;

-- Site-wide closures. Different from staff-specific availability rules —
-- a holiday closes the whole site for everyone (Christmas, public holiday,
-- owner vacation). Bookings cannot be made on these dates.
CREATE TABLE IF NOT EXISTS site_holidays (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  date TEXT NOT NULL,                                  -- "YYYY-MM-DD"
  reason TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE UNIQUE INDEX IF NOT EXISTS site_holidays_site_date
  ON site_holidays (site_id, date);
