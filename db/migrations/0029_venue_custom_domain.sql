-- Custom domain mapping (Phase D). Each venue can map at most one external
-- domain (or subdomain) to its citynight page. The middleware reads the Host
-- header on inbound requests and rewrites to the venue's canonical URL.
--
-- Why nullable + UNIQUE: most venues will never use this. We want the
-- uniqueness constraint to prevent two venues claiming the same domain
-- (would cause non-deterministic routing).

ALTER TABLE venues ADD COLUMN custom_domain TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS venues_custom_domain ON venues (custom_domain) WHERE custom_domain IS NOT NULL;
