-- 0009: Real Unsplash CITY hero photos — all 10 Greek destinations.
--
-- Why cities not venues: Unsplash has iconic, accurate photos of real Greek
-- places (Acropolis, Mykonos windmills, Oia caldera, etc.). It does NOT have
-- photos of specific businesses (Six Dogs, Cavo Paradiso, etc.) — those will
-- come from Google Places API ingest later (which returns photos OF the actual
-- business). For now venue cards keep their placeholder image and the styled
-- fallback handles missing ones.
--
-- §6 rule 2: city photos are subject_type='location' + source='licensed_stock'
-- which IS allowed by the photos CHECK constraint. Each photo carries the
-- Unsplash photographer credit and a UTM-tagged profile link.
--
-- URL format: `https://images.unsplash.com/photo-{slug}?w=1800&q=80&auto=format&fit=crop`

-- Re-runnable: clear any existing city heroes from this seed before re-inserting.
DELETE FROM photos WHERE id LIKE 'photo_hero_%';

INSERT INTO photos
  (id, city_id, subject_type, source, url, attribution_text, attribution_url, license, is_primary, sort_order)
VALUES
  -- ─── ATHENS ─── Acropolis at night, ancient core
  ('photo_hero_athens_1',       'city_athens',       'location', 'licensed_stock',
   'https://images.unsplash.com/photo-1505884065216-0661d68e5c47?w=1800&q=80&auto=format&fit=crop',
   'aussieactive / Unsplash',   'https://unsplash.com/@aussieactive?utm_source=citynight.gr&utm_medium=referral',
   'Unsplash', 1, 0),
  ('photo_hero_athens_2',       'city_athens',       'location', 'licensed_stock',
   'https://images.unsplash.com/photo-1664203183800-037799a2a0e4?w=1800&q=80&auto=format&fit=crop',
   'corbettcampbell / Unsplash','https://unsplash.com/@corbettcampbell?utm_source=citynight.gr&utm_medium=referral',
   'Unsplash', 0, 1),

  -- ─── THESSALONIKI ─── Waterfront / White Tower / city skyline
  ('photo_hero_thessaloniki_1', 'city_thessaloniki', 'location', 'licensed_stock',
   'https://images.unsplash.com/photo-1641758140558-ee487bb94c0e?w=1800&q=80&auto=format&fit=crop',
   'Miltiadis Fragkidis / Unsplash', 'https://unsplash.com/@_miltiadis_?utm_source=citynight.gr&utm_medium=referral',
   'Unsplash', 1, 0),
  ('photo_hero_thessaloniki_2', 'city_thessaloniki', 'location', 'licensed_stock',
   'https://images.unsplash.com/photo-1613538384222-cd71e8488d7a?w=1800&q=80&auto=format&fit=crop',
   'Anastasius / Unsplash',      'https://unsplash.com/@anastasius1985?utm_source=citynight.gr&utm_medium=referral',
   'Unsplash', 0, 1),

  -- ─── MYKONOS ─── Windmills + Chora
  ('photo_hero_mykonos_1',      'city_mykonos',      'location', 'licensed_stock',
   'https://images.unsplash.com/photo-1711252133985-f8bd5a56c5f4?w=1800&q=80&auto=format&fit=crop',
   'Hongbin / Unsplash',         'https://unsplash.com/?utm_source=citynight.gr&utm_medium=referral',
   'Unsplash', 1, 0),
  ('photo_hero_mykonos_2',      'city_mykonos',      'location', 'licensed_stock',
   'https://images.unsplash.com/photo-1637631997616-a3e320378379?w=1800&q=80&auto=format&fit=crop',
   'Harrison Fitts / Unsplash',  'https://www.harrisonfitts.com/?utm_source=citynight.gr&utm_medium=referral',
   'Unsplash', 0, 1),
  ('photo_hero_mykonos_3',      'city_mykonos',      'location', 'licensed_stock',
   'https://images.unsplash.com/photo-1600418691323-528448f24489?w=1800&q=80&auto=format&fit=crop',
   'Despina Galani / Unsplash',  'http://www.bellacove.com?utm_source=citynight.gr&utm_medium=referral',
   'Unsplash', 0, 2),

  -- ─── SANTORINI ─── Oia + caldera + sunset
  ('photo_hero_santorini_1',    'city_santorini',    'location', 'licensed_stock',
   'https://images.unsplash.com/photo-1669203408570-4140ee21f211?w=1800&q=80&auto=format&fit=crop',
   'Damien Schneider / Unsplash','https://damien-schneider.pro/?utm_source=citynight.gr&utm_medium=referral',
   'Unsplash', 1, 0),
  ('photo_hero_santorini_2',    'city_santorini',    'location', 'licensed_stock',
   'https://images.unsplash.com/photo-1672622851784-0dbd3df4c088?w=1800&q=80&auto=format&fit=crop',
   'Tânia Mousinho / Unsplash',  'http://www.shotsbytania.com?utm_source=citynight.gr&utm_medium=referral',
   'Unsplash', 0, 1),
  ('photo_hero_santorini_3',    'city_santorini',    'location', 'licensed_stock',
   'https://images.unsplash.com/photo-1509321528270-797a4f7c1485?w=1800&q=80&auto=format&fit=crop',
   'Gurwinder Singh / Unsplash', 'https://unsplash.com/?utm_source=citynight.gr&utm_medium=referral',
   'Unsplash', 0, 2),

  -- ─── CORFU ─── Old town + Venetian fortress
  ('photo_hero_corfu_1',        'city_corfu',        'location', 'licensed_stock',
   'https://images.unsplash.com/photo-1682197289142-424218d0cd7c?w=1800&q=80&auto=format&fit=crop',
   'Monika Guzikowska / Unsplash','https://unsplash.com/@monik_guzik?utm_source=citynight.gr&utm_medium=referral',
   'Unsplash', 1, 0),
  ('photo_hero_corfu_2',        'city_corfu',        'location', 'licensed_stock',
   'https://images.unsplash.com/photo-1754901968707-0bad6cec0e9d?w=1800&q=80&auto=format&fit=crop',
   'Gssns / Unsplash',           'https://unsplash.com/@gssns?utm_source=citynight.gr&utm_medium=referral',
   'Unsplash', 0, 1),

  -- ─── ZAKYNTHOS ─── Navagio Shipwreck Beach
  ('photo_hero_zakynthos_1',    'city_zakynthos',    'location', 'licensed_stock',
   'https://images.unsplash.com/photo-1571021785662-712e369a2829?w=1800&q=80&auto=format&fit=crop',
   'Andrey Shevard / Unsplash',  'https://unsplash.com/@andreyshevard?utm_source=citynight.gr&utm_medium=referral',
   'Unsplash', 1, 0),
  ('photo_hero_zakynthos_2',    'city_zakynthos',    'location', 'licensed_stock',
   'https://images.unsplash.com/photo-1589140592598-91853cbbc95b?w=1800&q=80&auto=format&fit=crop',
   'Patrick Keller / Unsplash',  'https://unsplash.com/@patmunich?utm_source=citynight.gr&utm_medium=referral',
   'Unsplash', 0, 1),

  -- ─── HERAKLION (CRETE) ─── Crete coast + old port
  ('photo_hero_heraklion_1',    'city_heraklion',    'location', 'licensed_stock',
   'https://images.unsplash.com/photo-1598845511224-75cd1ac5fd23?w=1800&q=80&auto=format&fit=crop',
   'Evangelos Mpikakis / Unsplash','https://www.cretebydrone.com?utm_source=citynight.gr&utm_medium=referral',
   'Unsplash', 1, 0),
  ('photo_hero_heraklion_2',    'city_heraklion',    'location', 'licensed_stock',
   'https://images.unsplash.com/photo-1586119732042-ff23ccf4bd23?w=1800&q=80&auto=format&fit=crop',
   'Evangelos Mpikakis / Unsplash','https://www.cretebydrone.com?utm_source=citynight.gr&utm_medium=referral',
   'Unsplash', 0, 1),

  -- ─── RHODES ─── Old town + harbour
  ('photo_hero_rhodes_1',       'city_rhodes',       'location', 'licensed_stock',
   'https://images.unsplash.com/photo-1602769247692-126fdf1f1da6?w=1800&q=80&auto=format&fit=crop',
   'Despina Galani / Unsplash',  'http://www.bellacove.com?utm_source=citynight.gr&utm_medium=referral',
   'Unsplash', 1, 0),
  ('photo_hero_rhodes_2',       'city_rhodes',       'location', 'licensed_stock',
   'https://images.unsplash.com/photo-1595942820590-f855c6b8ba88?w=1800&q=80&auto=format&fit=crop',
   'Dimitris Kiriakakis / Unsplash','https://dimeloper.com?utm_source=citynight.gr&utm_medium=referral',
   'Unsplash', 0, 1),

  -- ─── PAROS ─── Naoussa fishing village + white cubes
  ('photo_hero_paros_1',        'city_paros',        'location', 'licensed_stock',
   'https://images.unsplash.com/photo-1602008194020-13ac6665ebdb?w=1800&q=80&auto=format&fit=crop',
   'Despina Galani / Unsplash',  'http://www.bellacove.com?utm_source=citynight.gr&utm_medium=referral',
   'Unsplash', 1, 0),
  ('photo_hero_paros_2',        'city_paros',        'location', 'licensed_stock',
   'https://images.unsplash.com/photo-1630142918036-523eab28cd69?w=1800&q=80&auto=format&fit=crop',
   'Leonardo Baldissara / Unsplash','https://unsplash.com/?utm_source=citynight.gr&utm_medium=referral',
   'Unsplash', 0, 1),

  -- ─── IOS ─── Cyclades island, Chora
  ('photo_hero_ios_1',          'city_ios',          'location', 'licensed_stock',
   'https://images.unsplash.com/photo-1600178848364-da3927d398c8?w=1800&q=80&auto=format&fit=crop',
   'Despina Galani / Unsplash',  'http://www.bellacove.com?utm_source=citynight.gr&utm_medium=referral',
   'Unsplash', 1, 0),
  ('photo_hero_ios_2',          'city_ios',          'location', 'licensed_stock',
   'https://images.unsplash.com/photo-1661807029904-f2329c3220bb?w=1800&q=80&auto=format&fit=crop',
   'Dimitris Kiriakakis / Unsplash','https://dimeloper.com?utm_source=citynight.gr&utm_medium=referral',
   'Unsplash', 0, 1);
