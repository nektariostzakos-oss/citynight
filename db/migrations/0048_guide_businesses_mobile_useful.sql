-- Mobile-useful fields for the guide business card.
--
-- All four columns come from Google Places (same source as the rest of
-- the card — see [[project-guide-businesses-verified]]). They power:
--   - tap-to-call on mobile (phone)
--   - "€/€€/€€€" tier (price_level)
--   - "Ανοιχτό τώρα / Open now" computed chip (opening_hours)
--   - swipeable photo gallery (extra_photos: JSON array of {url, attribution})
--
-- price_level is the canonical 0..4 from Places (FREE..VERY_EXPENSIVE).
-- opening_hours stores Places' regularOpeningHours.periods as JSON; the
-- render code computes "open now" against Europe/Athens time.

ALTER TABLE guide_businesses ADD COLUMN phone TEXT;
ALTER TABLE guide_businesses ADD COLUMN price_level INTEGER;        -- 0..4
ALTER TABLE guide_businesses ADD COLUMN opening_hours TEXT;         -- JSON: { periods: [...] }
ALTER TABLE guide_businesses ADD COLUMN extra_photos TEXT;          -- JSON: [{ url, attribution }]
