-- Phase H1 — every directory venue becomes a free SaaS site. We track
-- the original venue id on the sites row so the H2 redirect handler can
-- map old /greece/... URLs to the new /sites/... URLs without a separate
-- mapping table.
--
-- saas_status for migrated sites = 'active' (they're operational/published)
-- but they have NO stripe_subscription_id. "Paying" = stripe_subscription_id
-- IS NOT NULL (custom-domain upgrade) OR zip_purchased_at IS NOT NULL.
-- "Free hosted" = neither — that's the new default for every business.

ALTER TABLE sites ADD COLUMN legacy_venue_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS sites_legacy_venue_id
  ON sites (legacy_venue_id) WHERE legacy_venue_id IS NOT NULL;
