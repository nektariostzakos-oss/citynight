-- Phase post-K — guides-only direction.
--
-- The `article_venues` table powered the listicle format (ranked picks
-- inside an article). The product decision is now: articles are pure
-- editorial guides — no ranked picks, ever. The table and its supporting
-- indexes are removed. Areas-derived-from-picks die with it (see also
-- lib/articles/areas.ts and /cities/{city}/area/ being deleted).
--
-- Safe to drop on first run because there is no production data yet in
-- this column path. IF EXISTS keeps the migration idempotent.

DROP INDEX IF EXISTS article_venues_rank;
DROP INDEX IF EXISTS article_venues_venue;
DROP TABLE IF EXISTS article_venues;
