-- Phase I.3 — Shop: products, coupons, gift cards, orders.
--
-- Atelier products carry both EN/EL columns; we collapse to single fields
-- here and rely on the existing translations table for locales (atelier's
-- `name_en` becomes `site_products.name`, the EL version is a row in
-- translations with entity_type='site_product').

CREATE TABLE IF NOT EXISTS site_products (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,                                  -- url segment under /shop/<slug>
  name TEXT NOT NULL,
  category TEXT,
  short_desc TEXT,
  long_desc TEXT,
  price_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  image_url TEXT,                                      -- primary image — also reused as og:image
  stock INTEGER,                                       -- NULL = unlimited / made-to-order
  featured INTEGER NOT NULL DEFAULT 0,                 -- atelier `featured` — homepage carousel
  enabled INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE UNIQUE INDEX IF NOT EXISTS site_products_site_slug
  ON site_products (site_id, slug);
CREATE INDEX IF NOT EXISTS site_products_site_enabled_sort
  ON site_products (site_id, enabled, sort_order);
CREATE INDEX IF NOT EXISTS site_products_featured
  ON site_products (site_id, featured) WHERE featured = 1;

CREATE TABLE IF NOT EXISTS site_coupons (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  code TEXT NOT NULL,                                  -- the redeem code visitors type
  kind TEXT NOT NULL CHECK (kind IN ('percent','fixed')),
  value INTEGER NOT NULL,                              -- percent OR cents
  max_uses INTEGER,                                    -- NULL = unlimited
  used_count INTEGER NOT NULL DEFAULT 0,
  min_total_cents INTEGER NOT NULL DEFAULT 0,          -- atelier `minTotal` * 100
  applies_to TEXT NOT NULL CHECK (applies_to IN ('bookings','shop','both')),
  active INTEGER NOT NULL DEFAULT 1,
  expires_at INTEGER,                                  -- unix seconds; NULL = no expiry
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE UNIQUE INDEX IF NOT EXISTS site_coupons_site_code
  ON site_coupons (site_id, code);
CREATE INDEX IF NOT EXISTS site_coupons_site_active
  ON site_coupons (site_id, active);

CREATE TABLE IF NOT EXISTS site_gift_cards (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  code TEXT NOT NULL,                                  -- printable redeem code, e.g. "GC-7HMK-PQR2"
  amount_cents INTEGER NOT NULL,                       -- face value at issuance
  balance_cents INTEGER NOT NULL,                      -- decremented on redemption
  currency TEXT NOT NULL DEFAULT 'EUR',
  buyer_name TEXT,
  buyer_email TEXT,
  recipient TEXT,                                      -- free-text label for the gift
  order_id TEXT,                                       -- atelier links to the order that purchased it
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','redeemed','expired','void')),
  issued_at INTEGER NOT NULL DEFAULT (unixepoch()),
  expires_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE UNIQUE INDEX IF NOT EXISTS site_gift_cards_site_code
  ON site_gift_cards (site_id, code);

-- Each gift-card redemption is a row in this audit table; balance is the
-- running total. Required for the reissue/void flow and dispute defence.
CREATE TABLE IF NOT EXISTS site_gift_card_redemptions (
  id TEXT PRIMARY KEY,
  gift_card_id TEXT NOT NULL REFERENCES site_gift_cards(id) ON DELETE CASCADE,
  order_id TEXT,                                       -- order that consumed it (nullable: in-person)
  booking_id TEXT REFERENCES site_bookings(id) ON DELETE SET NULL,
  amount_cents INTEGER NOT NULL,                       -- positive: redeem; negative: refund
  note TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS site_gift_card_redemptions_card
  ON site_gift_card_redemptions (gift_card_id, created_at);

-- Orders — products bought online. Atelier ships physical product
-- (pomade, etc.) — citynight inherits the shape. Field names mirror
-- atelier so the data importer can map 1:1.
CREATE TABLE IF NOT EXISTS site_orders (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  client_id TEXT REFERENCES site_clients(id) ON DELETE SET NULL,

  -- Contact + shipping snapshot
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  shipping_address TEXT,
  shipping_city TEXT,
  shipping_postal TEXT,
  shipping_country TEXT,
  notes TEXT,
  lang TEXT NOT NULL DEFAULT 'en',

  -- Money — all in cents to avoid float drift
  subtotal_cents INTEGER NOT NULL,
  discount_cents INTEGER NOT NULL DEFAULT 0,
  shipping_cents INTEGER NOT NULL DEFAULT 0,
  tax_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  coupon_id TEXT REFERENCES site_coupons(id) ON DELETE SET NULL,
  gift_card_id TEXT REFERENCES site_gift_cards(id) ON DELETE SET NULL,

  -- Stripe (Connect destination charge on the site's connected account)
  stripe_payment_intent_id TEXT,
  stripe_checkout_session_id TEXT,
  application_fee_cents INTEGER,                       -- citynight platform cut

  -- Lifecycle (atelier shape: 'pending','paid','shipped','cancelled','refunded')
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending','paid','shipped','delivered','cancelled','refunded'
  )),
  paid_at INTEGER,
  shipped_at INTEGER,
  delivered_at INTEGER,
  cancelled_at INTEGER,

  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS site_orders_site_status_created
  ON site_orders (site_id, status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS site_orders_payment_intent
  ON site_orders (stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS site_orders_session
  ON site_orders (stripe_checkout_session_id) WHERE stripe_checkout_session_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS site_order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES site_orders(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES site_products(id) ON DELETE SET NULL,
  -- Snapshot — name + price frozen at purchase time so editing a product
  -- never rewrites old orders.
  name TEXT NOT NULL,
  unit_price_cents INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  line_total_cents INTEGER NOT NULL                    -- unit_price_cents * quantity (denormalised for reporting)
);
CREATE INDEX IF NOT EXISTS site_order_items_order
  ON site_order_items (order_id);
