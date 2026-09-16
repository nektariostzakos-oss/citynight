-- guide_businesses must reference a real Google Places result, not editor
-- guesswork. The earlier seed used eyeballed lat/lng — the user reported
-- that pressing "Directions" landed on the wrong spot, which is exactly
-- what this migration prevents going forward.
--
-- New columns:
--   - google_place_id: canonical Places id (stable across renames /
--     moves). When set, the front-end builds the deep link using
--     `destination_place_id=...`, which is the most precise way to open
--     Google Maps Directions to a specific business.
--   - places_verified_at: unixepoch of last successful Places lookup.
--
-- Coordinates / address / google_maps_url stay on the same row but are
-- now expected to be POPULATED FROM PLACES (not editor input). The seed
-- script enforces this: a row is only inserted if Places returned a
-- matching result for the business name + city.

ALTER TABLE guide_businesses ADD COLUMN google_place_id TEXT;
ALTER TABLE guide_businesses ADD COLUMN places_verified_at INTEGER;

CREATE INDEX IF NOT EXISTS guide_businesses_place_id
  ON guide_businesses (google_place_id) WHERE google_place_id IS NOT NULL;
