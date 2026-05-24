-- 0002: seed the 10 first-fill cities (§9 config) and 6 nightlife categories.
-- Re-runnable: INSERT OR IGNORE on the unique slug.

INSERT OR IGNORE INTO cities (id, slug, name, region, lat, lng, is_published) VALUES
  ('city_athens',       'athens',       'Athens',       'Attica',        37.9838, 23.7275, 1),
  ('city_thessaloniki', 'thessaloniki', 'Thessaloniki', 'Central Macedonia', 40.6401, 22.9444, 1),
  ('city_mykonos',      'mykonos',      'Mykonos',      'South Aegean',  37.4467, 25.3289, 1),
  ('city_santorini',    'santorini',    'Santorini',    'South Aegean',  36.3932, 25.4615, 1),
  ('city_corfu',        'corfu',        'Corfu',        'Ionian Islands',39.6243, 19.9217, 1),
  ('city_zakynthos',    'zakynthos',    'Zakynthos',    'Ionian Islands',37.7869, 20.8995, 1),
  ('city_heraklion',    'heraklion',    'Heraklion',    'Crete',         35.3387, 25.1442, 1),
  ('city_rhodes',       'rhodes',       'Rhodes',       'South Aegean',  36.4341, 28.2176, 1),
  ('city_paros',        'paros',        'Paros',        'South Aegean',  37.0855, 25.1497, 1),
  ('city_ios',          'ios',          'Ios',          'South Aegean',  36.7339, 25.2820, 1);

INSERT OR IGNORE INTO categories (id, slug, name, parent_id) VALUES
  ('cat_night_club',   'night-club',   'Night club',  NULL),
  ('cat_bar',          'bar',          'Bar',         NULL),
  ('cat_rooftop_bar',  'rooftop-bar',  'Rooftop bar', NULL),
  ('cat_live_music',   'live-music',   'Live music',  NULL),
  ('cat_bouzoukia',    'bouzoukia',    'Bouzoukia',   NULL),
  ('cat_beach_club',   'beach-club',   'Beach club',  NULL);
