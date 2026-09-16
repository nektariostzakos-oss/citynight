-- Structured fields powering the magazine-style city guide.
--
-- Two layers:
--   1) cities  — facts that are TRUE for the city regardless of vertical
--                (population, terrain, distance from Athens, airport).
--                Sourced from Wikipedia + Google Distance Matrix once,
--                rarely change. Same data renders on every guide for
--                that city.
--   2) articles — facts that vary by vertical (nightlife vs food vs stay)
--                for the same city: tagline, known_for tag chips,
--                best_months, typical_visit_length.
--
-- Integrity (§6): nothing here is AI-generated. Editor enters once from
-- verified sources; the page renders these values directly. Same fields
-- on every guide → consistent UX, no schema drift between pages.

-- ── cities ─────────────────────────────────────────────────────────────
ALTER TABLE cities ADD COLUMN population INTEGER;
ALTER TABLE cities ADD COLUMN terrain TEXT;                    -- seaside / mountain / island / island_capital / mainland_city / wine_region
ALTER TABLE cities ADD COLUMN distance_km INTEGER;             -- to Athens (or nearest major hub)
ALTER TABLE cities ADD COLUMN distance_drive_minutes INTEGER;  -- realistic drive time, normal traffic
ALTER TABLE cities ADD COLUMN nearest_airport_code TEXT;       -- IATA (ATH / HER / JTR / …)
ALTER TABLE cities ADD COLUMN nearest_airport_name TEXT;
ALTER TABLE cities ADD COLUMN airport_drive_minutes INTEGER;
ALTER TABLE cities ADD COLUMN port_name TEXT;                  -- nullable; islands + ferry-served coastal cities only
ALTER TABLE cities ADD COLUMN language_primary TEXT NOT NULL DEFAULT 'el';
ALTER TABLE cities ADD COLUMN currency TEXT NOT NULL DEFAULT 'EUR';

-- ── articles ───────────────────────────────────────────────────────────
ALTER TABLE articles ADD COLUMN tagline TEXT;                  -- one-line hook under the city name in hero
ALTER TABLE articles ADD COLUMN known_for TEXT;                -- JSON: ["Καζίνο","Παραλιακή",…] in this article's locale
ALTER TABLE articles ADD COLUMN best_months TEXT;              -- JSON: [6,7,8,9] (1=Jan); vertical-specific season
ALTER TABLE articles ADD COLUMN typical_visit_length TEXT;     -- day_trip / weekend / week / multi_day
