-- Phase I.3 — Stripe Connect on sites.
--
-- citynight is a marketplace: each owner connects their own Stripe account.
-- Bookings, orders, gift-cards, and memberships charge directly on that
-- account; citynight platform takes its cut via application_fee_amount on
-- the destination charge. The platform secret key (STRIPE_SECRET_KEY)
-- stays in env; per-site fields here are pointers + cached readiness.
--
-- A site with `stripe_account_id IS NULL` cannot accept payments. The
-- onboarding handler creates the Connect account, stores the id here, and
-- redirects the owner through Stripe's hosted account-link flow. The
-- webhook handler updates `stripe_charges_enabled` / `stripe_payouts_enabled`
-- as Stripe finishes the onboarding identity checks.

ALTER TABLE sites ADD COLUMN stripe_account_id TEXT;
ALTER TABLE sites ADD COLUMN stripe_charges_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sites ADD COLUMN stripe_payouts_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sites ADD COLUMN stripe_details_submitted INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sites ADD COLUMN stripe_account_country TEXT;        -- ISO-3166-1 alpha-2
ALTER TABLE sites ADD COLUMN stripe_account_currency TEXT;        -- ISO-4217, lower-case
ALTER TABLE sites ADD COLUMN stripe_account_updated_at INTEGER;   -- unix seconds

CREATE UNIQUE INDEX IF NOT EXISTS sites_stripe_account
  ON sites (stripe_account_id) WHERE stripe_account_id IS NOT NULL;
