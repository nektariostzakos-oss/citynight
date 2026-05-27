-- Phase H3 (user-clarified URL shape) — sites move from /sites/{slug} to
-- /{locale}/cities/{city}/{slug}. Slugs remain globally unique (we keep
-- the existing UNIQUE index); the city segment in the URL is enforced at
-- render time by comparing sites.city_slug to the URL param (mismatch =
-- redirect to the correct city).
--
-- city_slug is the cities.slug value at migration time, e.g. 'loutraki'.
-- Backfill: case-insensitive match against cities.name.

ALTER TABLE sites ADD COLUMN city_slug TEXT;
CREATE INDEX IF NOT EXISTS sites_city_slug ON sites (city_slug);

-- Backfill from cities.name. Anything that doesn't match (e.g. signups
-- that typed a free-text city) stays NULL and the URL falls back to
-- /[locale]/sites/{slug} via a later phase.
UPDATE sites
   SET city_slug = (
     SELECT c.slug FROM cities c
      WHERE LOWER(c.name) = LOWER(sites.city)
      LIMIT 1
   )
 WHERE city_slug IS NULL
   AND city IS NOT NULL;
