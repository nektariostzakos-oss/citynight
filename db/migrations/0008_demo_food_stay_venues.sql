-- 0008: DEMO venues for the new Food + Stay verticals — real-world spots so
-- /food and /stay aren't empty during design QA. 2 restaurants + 2 hotels per
-- city across Athens / Mykonos / Santorini = 12 venues.
--
-- Same conventions as 0004: hand-curated descriptions, source='admin' in
-- field_sources, no facts that could date (hours/prices/phones omitted).

INSERT OR IGNORE INTO venues
  (id, slug, city_id, area_id, category_id, name, address, lat, lng, description,
   field_sources, status, claim, rating, review_count, business_status, is_permanently_closed,
   tier, created_at, published_at)
VALUES
  -- ─────────────────────── ATHENS ───────────────────────
  ('venue_demo_funky_gourmet', 'funky-gourmet', 'city_athens', NULL, 'cat_fine_dining',
   'Funky Gourmet', 'Paramythias 13, Athens', 37.9819, 23.7166,
   'Two-Michelin-star tasting-menu restaurant tucked into a neoclassical house near Kerameikos. Modernist, playful Greek cuisine — the chef-driven end of the Athens dining scene.',
   '{"name":"admin","address":"admin","description":"admin"}',
   'published', 'unclaimed', 4.6, 940, 'OPERATIONAL', 0,
   'featured', unixepoch(), unixepoch()),

  ('venue_demo_karamanlidika', 'karamanlidika-tou-fani', 'city_athens', 'area_athens_psyrri', 'cat_taverna',
   'Karamanlidika tou Fani', 'Sokratous 1 & Evripidou, Athens', 37.9808, 23.7244,
   'All-day taverna built around a charcuterie counter — Greek cured meats, regional cheeses, daily stews. A reliable, casual lunch and a long, loud dinner.',
   '{"name":"admin","address":"admin","description":"admin"}',
   'published', 'unclaimed', 4.5, 3210, 'OPERATIONAL', 0,
   'free', unixepoch(), unixepoch()),

  ('venue_demo_grande_bretagne', 'hotel-grande-bretagne', 'city_athens', 'area_athens_kolonaki', 'cat_hotel',
   'Hotel Grande Bretagne', 'Vasileos Georgiou A 1, Syntagma', 37.9758, 23.7349,
   'Athens’ landmark grand hotel facing Syntagma Square, with a rooftop terrace that frames the Acropolis. Five-star service in the spot where the city’s history actually happened.',
   '{"name":"admin","address":"admin","description":"admin"}',
   'published', 'unclaimed', 4.7, 5640, 'OPERATIONAL', 0,
   'featured', unixepoch(), unixepoch()),

  ('venue_demo_electra_metropolis', 'electra-metropolis', 'city_athens', 'area_athens_psyrri', 'cat_boutique_hotel',
   'Electra Metropolis Athens', 'Mitropoleos 15, Athens', 37.9776, 23.7300,
   'Central boutique hotel between Syntagma and Plaka. The signature is the rooftop pool and bar with a head-on Acropolis view — quieter than the Grande Bretagne, modern interior.',
   '{"name":"admin","address":"admin","description":"admin"}',
   'published', 'unclaimed', 4.6, 4220, 'OPERATIONAL', 0,
   'free', unixepoch(), unixepoch()),

  -- ─────────────────────── MYKONOS ───────────────────────
  ('venue_demo_kiku', 'kiku-mykonos', 'city_mykonos', 'area_myk_chora', 'cat_fine_dining',
   'Kiku Mykonos', 'Little Venice, Mykonos Town', 37.4460, 25.3270,
   'Long-established Japanese restaurant on Little Venice, with the sunset-side terrace tables. Fresh fish, Asian-influenced cocktails, a slower table than the bars around it.',
   '{"name":"admin","address":"admin","description":"admin"}',
   'published', 'unclaimed', 4.4, 1180, 'OPERATIONAL', 0,
   'featured', unixepoch(), unixepoch()),

  ('venue_demo_spilia_mykonos', 'spilia-seaside-restaurant', 'city_mykonos', NULL, 'cat_restaurant',
   'Spilia Seaside Restaurant', 'Agia Anna, Kalafati', 37.4220, 25.4360,
   'Restaurant carved into a sea cave on the east coast — swim-up access, live fish tanks in the rock, long Aegean lunches that drift into the afternoon.',
   '{"name":"admin","address":"admin","description":"admin"}',
   'published', 'unclaimed', 4.4, 1690, 'OPERATIONAL', 0,
   'free', unixepoch(), unixepoch()),

  ('venue_demo_cavo_tagoo', 'cavo-tagoo-mykonos', 'city_mykonos', 'area_myk_chora', 'cat_boutique_hotel',
   'Cavo Tagoo Mykonos', 'Tagoo, Mykonos', 37.4502, 25.3243,
   'Cliffside boutique-resort just outside Chora. Infinity pool over the caldera-blue, suites with private pools, the design-magazine reference for Mykonos hospitality.',
   '{"name":"admin","address":"admin","description":"admin"}',
   'published', 'unclaimed', 4.6, 3120, 'OPERATIONAL', 0,
   'featured', unixepoch(), unixepoch()),

  ('venue_demo_belvedere_mykonos', 'belvedere-mykonos', 'city_mykonos', 'area_myk_chora', 'cat_hotel',
   'Belvedere Hotel', 'School of Fine Arts District, Mykonos', 37.4481, 25.3261,
   'Five-star hotel in upper Chora — closer to the Town nightlife than most resorts. Pool bar with skyline views, Matsuhisa restaurant on the property.',
   '{"name":"admin","address":"admin","description":"admin"}',
   'published', 'unclaimed', 4.5, 2480, 'OPERATIONAL', 0,
   'free', unixepoch(), unixepoch()),

  -- ─────────────────────── SANTORINI ───────────────────────
  ('venue_demo_selene', 'selene-santorini', 'city_santorini', NULL, 'cat_fine_dining',
   'Selene', 'Pyrgos Kallistis, Santorini', 36.3811, 25.4434,
   'Modern Greek tasting-menu restaurant in Pyrgos village — Cycladic ingredients, a thoughtful Santorini wine list, a quieter setting away from the Fira/Oia tourist density.',
   '{"name":"admin","address":"admin","description":"admin"}',
   'published', 'unclaimed', 4.6, 870, 'OPERATIONAL', 0,
   'featured', unixepoch(), unixepoch()),

  ('venue_demo_metaxi_mas', 'metaxi-mas-santorini', 'city_santorini', NULL, 'cat_taverna',
   'Metaxi Mas', 'Exo Gonia, Santorini', 36.4040, 25.4540,
   'Inland taverna in the village of Exo Gonia — fava, smoked aubergine, grilled meats, an unmatched winelist for the price. Books out months ahead in summer.',
   '{"name":"admin","address":"admin","description":"admin"}',
   'published', 'unclaimed', 4.7, 3940, 'OPERATIONAL', 0,
   'free', unixepoch(), unixepoch()),

  ('venue_demo_andronis', 'andronis-boutique', 'city_santorini', 'area_sant_oia', 'cat_boutique_hotel',
   'Andronis Boutique Hotel', 'Oia, Santorini', 36.4622, 25.3750,
   'Cliffside boutique hotel in Oia — caldera-facing suites carved into the rock, the kind of pool that ends up on someone’s wedding video. Service is the headline.',
   '{"name":"admin","address":"admin","description":"admin"}',
   'published', 'unclaimed', 4.8, 1640, 'OPERATIONAL', 0,
   'featured', unixepoch(), unixepoch()),

  ('venue_demo_katikies', 'katikies-santorini', 'city_santorini', 'area_sant_oia', 'cat_resort',
   'Katikies Santorini', 'Oia, Santorini', 36.4618, 25.3739,
   'Oia’s most-photographed cluster of cycladic suites: white cube architecture, infinity pools at each level, the icon image of Santorini hospitality.',
   '{"name":"admin","address":"admin","description":"admin"}',
   'published', 'unclaimed', 4.7, 2110, 'OPERATIONAL', 0,
   'featured', unixepoch(), unixepoch());

-- Demo photos for the 12 new venues (same placeholder pattern as 0005).
INSERT OR IGNORE INTO photos
  (id, venue_id, subject_type, source, url, attribution_text, attribution_url, license, is_primary, sort_order)
VALUES
  ('photo_demo_funky_gourmet',     'venue_demo_funky_gourmet',     'venue', 'placeholder', 'https://picsum.photos/seed/funky-gourmet/1600/1000',     'Lorem Picsum (Unsplash)', 'https://picsum.photos', 'CC0', 1, 0),
  ('photo_demo_karamanlidika',     'venue_demo_karamanlidika',     'venue', 'placeholder', 'https://picsum.photos/seed/karamanlidika/1600/1000',     'Lorem Picsum (Unsplash)', 'https://picsum.photos', 'CC0', 1, 0),
  ('photo_demo_grande_bretagne',   'venue_demo_grande_bretagne',   'venue', 'placeholder', 'https://picsum.photos/seed/grande-bretagne/1600/1000',   'Lorem Picsum (Unsplash)', 'https://picsum.photos', 'CC0', 1, 0),
  ('photo_demo_electra_metropolis','venue_demo_electra_metropolis','venue', 'placeholder', 'https://picsum.photos/seed/electra-metropolis/1600/1000','Lorem Picsum (Unsplash)', 'https://picsum.photos', 'CC0', 1, 0),
  ('photo_demo_kiku',              'venue_demo_kiku',              'venue', 'placeholder', 'https://picsum.photos/seed/kiku-mykonos/1600/1000',      'Lorem Picsum (Unsplash)', 'https://picsum.photos', 'CC0', 1, 0),
  ('photo_demo_spilia_mykonos',    'venue_demo_spilia_mykonos',    'venue', 'placeholder', 'https://picsum.photos/seed/spilia-mykonos/1600/1000',    'Lorem Picsum (Unsplash)', 'https://picsum.photos', 'CC0', 1, 0),
  ('photo_demo_cavo_tagoo',        'venue_demo_cavo_tagoo',        'venue', 'placeholder', 'https://picsum.photos/seed/cavo-tagoo/1600/1000',        'Lorem Picsum (Unsplash)', 'https://picsum.photos', 'CC0', 1, 0),
  ('photo_demo_belvedere_mykonos', 'venue_demo_belvedere_mykonos', 'venue', 'placeholder', 'https://picsum.photos/seed/belvedere-mykonos/1600/1000', 'Lorem Picsum (Unsplash)', 'https://picsum.photos', 'CC0', 1, 0),
  ('photo_demo_selene',            'venue_demo_selene',            'venue', 'placeholder', 'https://picsum.photos/seed/selene-santorini/1600/1000',  'Lorem Picsum (Unsplash)', 'https://picsum.photos', 'CC0', 1, 0),
  ('photo_demo_metaxi_mas',        'venue_demo_metaxi_mas',        'venue', 'placeholder', 'https://picsum.photos/seed/metaxi-mas/1600/1000',        'Lorem Picsum (Unsplash)', 'https://picsum.photos', 'CC0', 1, 0),
  ('photo_demo_andronis',          'venue_demo_andronis',          'venue', 'placeholder', 'https://picsum.photos/seed/andronis-oia/1600/1000',      'Lorem Picsum (Unsplash)', 'https://picsum.photos', 'CC0', 1, 0),
  ('photo_demo_katikies',          'venue_demo_katikies',          'venue', 'placeholder', 'https://picsum.photos/seed/katikies-oia/1600/1000',      'Lorem Picsum (Unsplash)', 'https://picsum.photos', 'CC0', 1, 0);
