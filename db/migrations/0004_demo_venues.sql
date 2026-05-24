-- 0004: DEMO DATA — 30 real-world venues across Athens / Mykonos / Santorini.
--
-- These are real venues we'll eventually replace with Google-Places-sourced rows
-- (same google_place_id key) once `node scripts/seed/run.js ingest` runs against
-- the real API. Until then, this seed fills every section of the site so design
-- iteration has full pages to look at.
--
-- Descriptions are hand-curated (admin-authored), evergreen, no facts beyond
-- vibe/setting — same shape we'll allow in the AI enrichment output later.
--
-- Photos: §6 rule 2 forbids stock-on-venue, so no photos here — VenueCard's
-- on-brand placeholder is what you'll see until Places ingest runs.
-- field_sources marks every fact as 'admin' so the weekly cron will still
-- overwrite when real Places data arrives (admin acts like google_places for
-- precedence — owner edits still win).

------------------------------------------------------------------------------
-- ATHENS (10)
------------------------------------------------------------------------------

INSERT OR IGNORE INTO venues
  (id, slug, city_id, area_id, category_id, name, address, lat, lng, description,
   field_sources, status, claim, rating, review_count, business_status, is_permanently_closed,
   created_at, published_at)
VALUES
  ('venue_demo_six_dogs', 'six-dogs', 'city_athens', 'area_athens_psyrri', 'cat_bar',
   'Six d.o.g.s', 'Avramiotou 6-8, Athens', 37.9784, 23.7257,
   'Multi-level bar tucked behind an unmarked Psyrri door, layered with small rooms, a courtyard and a rooftop with a city view. The crowd leans indie-meets-fashion and the music threads from soul and hip-hop into deeper, later sets.',
   '{"name":"admin","address":"admin","description":"admin"}',
   'published', 'unclaimed', 4.4, 1820, 'OPERATIONAL', 0, unixepoch(), unixepoch()),

  ('venue_demo_clumsies', 'the-clumsies', 'city_athens', 'area_athens_psyrri', 'cat_bar',
   'The Clumsies', 'Praxitelous 30, Athens', 37.9794, 23.7283,
   'Day-to-night cocktail house — café energy in the morning, the kind of mixology bar that draws the city''s bartenders by midnight. Quiet front, livelier back room, drinks led by classics with Greek-ingredient twists.',
   '{"name":"admin","address":"admin","description":"admin"}',
   'published', 'unclaimed', 4.5, 2640, 'OPERATIONAL', 0, unixepoch(), unixepoch()),

  ('venue_demo_a_for_athens', 'a-for-athens', 'city_athens', 'area_athens_psyrri', 'cat_rooftop_bar',
   'A for Athens', 'Miaouli 2-4, Monastiraki', 37.9763, 23.7263,
   'Hotel rooftop staring straight at the Acropolis from across Monastiraki Square. A pre-dinner cocktail surface; arrive early in summer to get a table by the parapet.',
   '{"name":"admin","address":"admin","description":"admin"}',
   'published', 'unclaimed', 4.3, 4310, 'OPERATIONAL', 0, unixepoch(), unixepoch()),

  ('venue_demo_360', '360-cocktail-bar', 'city_athens', 'area_athens_psyrri', 'cat_rooftop_bar',
   '360 Cocktail Bar', 'Ifestou 2, Monastiraki', 37.9766, 23.7253,
   'Open-air rooftop over Monastiraki Square with a full Acropolis view. Quieter than its neighbour, jazz and lounge soundtrack, well-built cocktails.',
   '{"name":"admin","address":"admin","description":"admin"}',
   'published', 'unclaimed', 4.3, 3870, 'OPERATIONAL', 0, unixepoch(), unixepoch()),

  ('venue_demo_lohan', 'lohan', 'city_athens', 'area_athens_gazi', 'cat_night_club',
   'Lohan Nightclub', 'Iera Odos 30, Gazi', 37.9776, 23.7102,
   'A big-room mainstream club on Iera Odos — Greek pop and chart hits, tables in tiers, doors after midnight, peak hour later.',
   '{"name":"admin","address":"admin","description":"admin"}',
   'published', 'unclaimed', 4.0, 1290, 'OPERATIONAL', 0, unixepoch(), unixepoch()),

  ('venue_demo_bolivar', 'bolivar-beach-bar', 'city_athens', 'area_athens_glyfada', 'cat_beach_club',
   'Bolivar Beach Bar', 'Akti Posidonos, Alimos', 37.9114, 23.7110,
   'Athens Riviera beach club running daytime sunbeds into evening DJ sets and concerts. Summers only — when it''s on it''s the city''s main outdoor music venue.',
   '{"name":"admin","address":"admin","description":"admin"}',
   'published', 'unclaimed', 4.1, 2050, 'OPERATIONAL', 0, unixepoch(), unixepoch()),

  ('venue_demo_an_club', 'an-club', 'city_athens', 'area_athens_exarchia', 'cat_live_music',
   'AN Club', 'Solomou 13-15, Exarchia', 37.9844, 23.7320,
   'Long-running Exarchia live room — small, sweaty, hosting touring rock and alternative acts. Stand-up gigs, late doors, drinks at the bar.',
   '{"name":"admin","address":"admin","description":"admin"}',
   'published', 'unclaimed', 4.4, 740, 'OPERATIONAL', 0, unixepoch(), unixepoch()),

  ('venue_demo_posidonio', 'posidonio', 'city_athens', NULL, 'cat_bouzoukia',
   'Posidonio', 'Posidonos Avenue, Palaio Faliro', 37.9269, 23.7000,
   'Coastal-suburb bouzoukia hall — long Greek-music nights anchored by mainstream singers, table service, drinks flowing. The kind of place a night ends after sunrise.',
   '{"name":"admin","address":"admin","description":"admin"}',
   'published', 'unclaimed', 4.2, 1180, 'OPERATIONAL', 0, unixepoch(), unixepoch()),

  ('venue_demo_galaxy', 'galaxy-bar', 'city_athens', 'area_athens_kolonaki', 'cat_rooftop_bar',
   'Galaxy Bar', 'Vasilissis Sofias 46, Ilissia', 37.9756, 23.7541,
   'Rooftop bar of the Hilton with a clear sweep across the city and the Acropolis. Hotel-bar polish — quieter sound, jazz at the piano, dressier crowd than the Monastiraki rooftops.',
   '{"name":"admin","address":"admin","description":"admin"}',
   'published', 'unclaimed', 4.4, 1920, 'OPERATIONAL', 0, unixepoch(), unixepoch()),

  ('venue_demo_underdog', 'underdog', 'city_athens', 'area_athens_psyrri', 'cat_bar',
   'Underdog Athens', 'Iraklidon 8, Thissio', 37.9760, 23.7191,
   'Specialty coffee shop by day, low-lit cocktail bar by night. Tight Thissio-edge space, accomplished drinks list, less of a club crowd, more of a sit-and-talk one.',
   '{"name":"admin","address":"admin","description":"admin"}',
   'published', 'unclaimed', 4.5, 2210, 'OPERATIONAL', 0, unixepoch(), unixepoch());

------------------------------------------------------------------------------
-- MYKONOS (10)
------------------------------------------------------------------------------

INSERT OR IGNORE INTO venues
  (id, slug, city_id, area_id, category_id, name, address, lat, lng, description,
   field_sources, status, claim, rating, review_count, business_status, is_permanently_closed,
   tier, created_at, published_at)
VALUES
  ('venue_demo_cavo_paradiso', 'cavo-paradiso', 'city_mykonos', 'area_myk_cavo', 'cat_night_club',
   'Cavo Paradiso', 'Paradise Beach, Mykonos', 37.4106, 25.3476,
   'Cliff-top mega-club perched above Paradise Beach. Opens past 1am, runs headliner DJ sets until sunrise, with a sea-view dancefloor that defines the island''s late hours.',
   '{"name":"admin","address":"admin","description":"admin"}',
   'published', 'unclaimed', 4.4, 3240, 'OPERATIONAL', 0,
   'featured', unixepoch(), unixepoch()),

  ('venue_demo_paradise_club', 'paradise-club', 'city_mykonos', 'area_myk_paradise', 'cat_night_club',
   'Paradise Club', 'Paradise Beach, Mykonos', 37.4118, 25.3493,
   'Beach club by day and a full night-club after dark on Paradise Beach. Day pool sessions hand off to the after-dark room — the most consistent all-day-to-all-night pivot on the island.',
   '{"name":"admin","address":"admin","description":"admin"}',
   'published', 'unclaimed', 4.2, 2790, 'OPERATIONAL', 0,
   'free', unixepoch(), unixepoch()),

  ('venue_demo_scorpios', 'scorpios', 'city_mykonos', 'area_myk_paradise', 'cat_beach_club',
   'Scorpios', 'Paraga Beach, Mykonos', 37.4090, 25.3403,
   'Sunset-led beach club on the south coast, half-restaurant, half-ritual: live drumming, world-music sets, and a daily crescendo into the evening with house DJs.',
   '{"name":"admin","address":"admin","description":"admin"}',
   'published', 'unclaimed', 4.4, 4180, 'OPERATIONAL', 0,
   'featured', unixepoch(), unixepoch()),

  ('venue_demo_nammos', 'nammos', 'city_mykonos', 'area_myk_psarou', 'cat_beach_club',
   'Nammos Mykonos', 'Psarou Beach, Mykonos', 37.4172, 25.3358,
   'The most-photographed table in Greece. Psarou Beach sand, champagne service, midday service that drifts into evening party energy without a hard cut.',
   '{"name":"admin","address":"admin","description":"admin"}',
   'published', 'unclaimed', 4.3, 5610, 'OPERATIONAL', 0,
   'featured', unixepoch(), unixepoch()),

  ('venue_demo_super_paradise', 'super-paradise-beach-club', 'city_mykonos', 'area_myk_superpara', 'cat_beach_club',
   'Super Paradise Beach Club', 'Super Paradise Beach, Mykonos', 37.4075, 25.3539,
   'Smaller cove neighbour to Paradise — slightly more upscale, daytime DJ schedule that pulls international names through the high season.',
   '{"name":"admin","address":"admin","description":"admin"}',
   'published', 'unclaimed', 4.2, 1980, 'OPERATIONAL', 0,
   'free', unixepoch(), unixepoch()),

  ('venue_demo_tropicana', 'tropicana-beach-bar', 'city_mykonos', 'area_myk_paradise', 'cat_beach_club',
   'Tropicana Beach Bar', 'Paradise Beach, Mykonos', 37.4116, 25.3489,
   'Long-standing Paradise Beach bar — the day-drinking, music-loud-from-noon spot that gets younger and louder as the afternoon goes on.',
   '{"name":"admin","address":"admin","description":"admin"}',
   'published', 'unclaimed', 4.0, 1340, 'OPERATIONAL', 0,
   'free', unixepoch(), unixepoch()),

  ('venue_demo_skandinavian', 'skandinavian-bar', 'city_mykonos', 'area_myk_chora', 'cat_bar',
   'Skandinavian Bar', 'Mykonos Town', 37.4466, 25.3287,
   'Multi-level bar in Mykonos Town anchoring the late-night Chora circuit. Several rooms, a courtyard, mainstream sound, mixed crowd — a default stop on any Chora bar crawl.',
   '{"name":"admin","address":"admin","description":"admin"}',
   'published', 'unclaimed', 4.1, 2410, 'OPERATIONAL', 0,
   'free', unixepoch(), unixepoch()),

  ('venue_demo_galleraki', 'galleraki', 'city_mykonos', 'area_myk_chora', 'cat_bar',
   'Galleraki', 'Little Venice, Mykonos Town', 37.4459, 25.3271,
   'Little Venice cocktail bar at the water''s edge — the famous postcard view backdrop. Sunset is busy; later the room hums with cocktails and conversation.',
   '{"name":"admin","address":"admin","description":"admin"}',
   'published', 'unclaimed', 4.3, 1670, 'OPERATIONAL', 0,
   'free', unixepoch(), unixepoch()),

  ('venue_demo_santanna', 'santanna-mykonos', 'city_mykonos', 'area_myk_paradise', 'cat_beach_club',
   'SantAnna Mykonos', 'Paraga Beach, Mykonos', 37.4081, 25.3416,
   'Vast Paraga Beach venue — a private-island feel with a pool, multiple bars, daytime DJ programming and a tendency to peak in late afternoon.',
   '{"name":"admin","address":"admin","description":"admin"}',
   'published', 'unclaimed', 4.2, 1490, 'OPERATIONAL', 0,
   'free', unixepoch(), unixepoch()),

  ('venue_demo_astra', 'astra-bar', 'city_mykonos', 'area_myk_chora', 'cat_bar',
   'Astra Bar', 'Mykonos Town', 37.4471, 25.3291,
   'Long-standing intimate Chora cocktail bar — small room, low ceiling, music that ranges from disco to house through the night.',
   '{"name":"admin","address":"admin","description":"admin"}',
   'published', 'unclaimed', 4.4, 980, 'OPERATIONAL', 0,
   'free', unixepoch(), unixepoch());

------------------------------------------------------------------------------
-- SANTORINI (10)
------------------------------------------------------------------------------

INSERT OR IGNORE INTO venues
  (id, slug, city_id, area_id, category_id, name, address, lat, lng, description,
   field_sources, status, claim, rating, review_count, business_status, is_permanently_closed,
   created_at, published_at)
VALUES
  ('venue_demo_tropical', 'tropical-bar', 'city_santorini', 'area_sant_oia', 'cat_rooftop_bar',
   'Tropical Bar', 'Oia, Santorini', 36.4615, 25.3766,
   'Compact cliff terrace in Oia — small interior, smaller balcony, full caldera view. Sunset cocktails are the headline; arrive early for a balcony seat.',
   '{"name":"admin","address":"admin","description":"admin"}',
   'published', 'unclaimed', 4.5, 2160, 'OPERATIONAL', 0, unixepoch(), unixepoch()),

  ('venue_demo_casablanca', 'casablanca-soul', 'city_santorini', 'area_sant_fira', 'cat_live_music',
   'Casablanca Soul', 'Fira, Santorini', 36.4169, 25.4309,
   'Below-street live-music bar in Fira — soul, funk and reggae nights with a Cuban-leaning cocktail list. The kind of place where a sunset extends into the small hours.',
   '{"name":"admin","address":"admin","description":"admin"}',
   'published', 'unclaimed', 4.6, 1430, 'OPERATIONAL', 0, unixepoch(), unixepoch()),

  ('venue_demo_momix', 'momix-cocktail-bar', 'city_santorini', 'area_sant_fira', 'cat_bar',
   'MoMix Cocktail Bar', 'Fira, Santorini', 36.4171, 25.4316,
   'Caldera-edge cocktail bar in Fira leaning into theatre — molecular techniques, smoke, fire and choreography around every pour.',
   '{"name":"admin","address":"admin","description":"admin"}',
   'published', 'unclaimed', 4.5, 2680, 'OPERATIONAL', 0, unixepoch(), unixepoch()),

  ('venue_demo_koo', 'koo-club', 'city_santorini', 'area_sant_fira', 'cat_night_club',
   'Koo Club', 'Erythrou Stavrou, Fira', 36.4163, 25.4307,
   'The closest thing Santorini has to a proper club — Erythrou Stavrou street venue with house and mainstream nights running latest on the island.',
   '{"name":"admin","address":"admin","description":"admin"}',
   'published', 'unclaimed', 4.0, 920, 'OPERATIONAL', 0, unixepoch(), unixepoch()),

  ('venue_demo_enigma', 'enigma-cafe', 'city_santorini', 'area_sant_fira', 'cat_night_club',
   'Enigma Café', 'Erythrou Stavrou, Fira', 36.4164, 25.4302,
   'Vintage Fira club just off the main pedestrian — three rooms, a small dancefloor and a music policy that drifts from house to throwback Greek hits.',
   '{"name":"admin","address":"admin","description":"admin"}',
   'published', 'unclaimed', 4.1, 750, 'OPERATIONAL', 0, unixepoch(), unixepoch()),

  ('venue_demo_francos', 'francos-cafe', 'city_santorini', 'area_sant_fira', 'cat_rooftop_bar',
   'Franco''s Café', 'Fira, Santorini', 36.4172, 25.4314,
   'Historic terrace bar of Fira — classical music as the sun goes down, single seats over the caldera, a tradition more than a venue.',
   '{"name":"admin","address":"admin","description":"admin"}',
   'published', 'unclaimed', 4.3, 1980, 'OPERATIONAL', 0, unixepoch(), unixepoch()),

  ('venue_demo_pk', 'pk-cocktail-bar', 'city_santorini', 'area_sant_oia', 'cat_rooftop_bar',
   'PK Cocktail Bar', 'Oia, Santorini', 36.4609, 25.3761,
   'Cliff-terrace cocktail bar in Oia with full caldera view — built around the sunset, with a list that mixes classics and Greek-spirit creations.',
   '{"name":"admin","address":"admin","description":"admin"}',
   'published', 'unclaimed', 4.4, 1620, 'OPERATIONAL', 0, unixepoch(), unixepoch()),

  ('venue_demo_crystal', 'crystal-cocktail-bar', 'city_santorini', 'area_sant_imerovigli', 'cat_rooftop_bar',
   'Crystal Cocktail Bar', 'Imerovigli, Santorini', 36.4344, 25.4178,
   'Imerovigli terrace bar quieter than Oia''s sunset queues — same caldera view, fewer crowds, and a list that leans toward small-batch Greek gins.',
   '{"name":"admin","address":"admin","description":"admin"}',
   'published', 'unclaimed', 4.6, 870, 'OPERATIONAL', 0, unixepoch(), unixepoch()),

  ('venue_demo_demilmar', 'demilmar-lounge', 'city_santorini', 'area_sant_perissa', 'cat_beach_club',
   'Demilmar Lounge', 'Perivolos Beach, Santorini', 36.3504, 25.4685,
   'Beach-front lounge on Perivolos black sand — long daytime music programme, sunbeds spilling into a bar that runs past sunset.',
   '{"name":"admin","address":"admin","description":"admin"}',
   'published', 'unclaimed', 4.3, 1410, 'OPERATIONAL', 0, unixepoch(), unixepoch()),

  ('venue_demo_wet_stories', 'wet-stories', 'city_santorini', 'area_sant_perissa', 'cat_beach_club',
   'Wet Stories Beach Bar', 'Perissa Beach, Santorini', 36.3535, 25.4751,
   'Casual Perissa Beach bar — beach loungers by day, cocktails and live sets by night, the most relaxed of the island''s beach scene.',
   '{"name":"admin","address":"admin","description":"admin"}',
   'published', 'unclaimed', 4.2, 1090, 'OPERATIONAL', 0, unixepoch(), unixepoch());
