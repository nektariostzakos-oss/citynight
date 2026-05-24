-- 0003: pre-insert curated neighborhoods for the first 3 city guides into the
-- `areas` table. This gives `/greece/{city}/{neighborhood}` valid URLs from day
-- one (the bucket page resolves area-first, falling back to category), and the
-- seed-ingest pipeline can later classify venues into these by lat/lng.
--
-- IDs are deterministic + namespaced so re-running is safe.

INSERT OR IGNORE INTO areas (id, city_id, slug, name) VALUES
  -- Athens
  ('area_athens_gazi',     'city_athens',    'gazi',     'Gazi'),
  ('area_athens_psyrri',   'city_athens',    'psyrri',   'Psyrri'),
  ('area_athens_kolonaki', 'city_athens',    'kolonaki', 'Kolonaki'),
  ('area_athens_exarchia', 'city_athens',    'exarchia', 'Exarchia'),
  ('area_athens_glyfada',  'city_athens',    'glyfada',  'Glyfada'),

  -- Mykonos
  ('area_myk_chora',       'city_mykonos',   'chora',          'Mykonos Town (Chora)'),
  ('area_myk_paradise',    'city_mykonos',   'paradise-beach', 'Paradise Beach'),
  ('area_myk_superpara',   'city_mykonos',   'super-paradise', 'Super Paradise'),
  ('area_myk_psarou',      'city_mykonos',   'psarou',         'Psarou'),
  ('area_myk_cavo',        'city_mykonos',   'cavo-paradiso',  'Cavo Paradiso'),

  -- Santorini
  ('area_sant_oia',         'city_santorini', 'oia',         'Oia'),
  ('area_sant_fira',        'city_santorini', 'fira',        'Fira'),
  ('area_sant_imerovigli',  'city_santorini', 'imerovigli',  'Imerovigli'),
  ('area_sant_perissa',     'city_santorini', 'perissa',     'Perissa');

-- Approximate lat/lng so the ingest stage can later snap venues to the nearest area
UPDATE areas SET lat = 37.9806, lng = 23.7102 WHERE id = 'area_athens_gazi';
UPDATE areas SET lat = 37.9789, lng = 23.7250 WHERE id = 'area_athens_psyrri';
UPDATE areas SET lat = 37.9776, lng = 23.7430 WHERE id = 'area_athens_kolonaki';
UPDATE areas SET lat = 37.9874, lng = 23.7335 WHERE id = 'area_athens_exarchia';
UPDATE areas SET lat = 37.8732, lng = 23.7548 WHERE id = 'area_athens_glyfada';

UPDATE areas SET lat = 37.4467, lng = 25.3289 WHERE id = 'area_myk_chora';
UPDATE areas SET lat = 37.4115, lng = 25.3494 WHERE id = 'area_myk_paradise';
UPDATE areas SET lat = 37.4076, lng = 25.3537 WHERE id = 'area_myk_superpara';
UPDATE areas SET lat = 37.4174, lng = 25.3360 WHERE id = 'area_myk_psarou';
UPDATE areas SET lat = 37.4109, lng = 25.3477 WHERE id = 'area_myk_cavo';

UPDATE areas SET lat = 36.4612, lng = 25.3756 WHERE id = 'area_sant_oia';
UPDATE areas SET lat = 36.4167, lng = 25.4315 WHERE id = 'area_sant_fira';
UPDATE areas SET lat = 36.4347, lng = 25.4180 WHERE id = 'area_sant_imerovigli';
UPDATE areas SET lat = 36.3539, lng = 25.4747 WHERE id = 'area_sant_perissa';
