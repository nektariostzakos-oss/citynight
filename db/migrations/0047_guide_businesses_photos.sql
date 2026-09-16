-- Photo + rating + section placement for guide_businesses.
--
-- The card shows a hero photo (from Google Places photos), the venue's
-- star rating + review count (proxy for "legit + popular"), and is
-- placed inside the right section of the guide body via section_kind.
--
-- section_kind taxonomy (vertical-agnostic editorial buckets):
--   - seafront  → bar/cafe/pub on the city's main strip
--   - casino    → casino-type venues
--   - beach     → beach bars / clubs on the sand
--   - other     → restaurant, hotel, anything else editor pins to the body
--   - tail      → render below the body, before FAQ
-- The page render maps (locale, kind) → H2 slug at runtime so the same
-- DB row drops into the right Greek/English section without per-locale
-- duplication.

ALTER TABLE guide_businesses ADD COLUMN cover_photo_url TEXT;
ALTER TABLE guide_businesses ADD COLUMN cover_photo_attribution TEXT;
ALTER TABLE guide_businesses ADD COLUMN rating REAL;
ALTER TABLE guide_businesses ADD COLUMN review_count INTEGER;
ALTER TABLE guide_businesses ADD COLUMN section_kind TEXT NOT NULL DEFAULT 'tail';
