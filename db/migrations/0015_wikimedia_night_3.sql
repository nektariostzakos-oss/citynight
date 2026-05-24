-- 0015: Night photos for the last 3 holdouts (Patmos, Sifnos, Symi) from
-- Wikimedia Commons. Pexels and Unsplash both lacked night photography for
-- these smaller islands; Wikimedia did. All free-license.
--
-- Photos:
--   patmos · Yiannis Theologos Michellis · CC0          · whitewashed Hora at night with full moon
--   sifnos · Dbatzog                     · Public domain · Apollonia village lights at night
--   symi   · Николай Максимович          · CC BY 3.0     · dramatic Symi-area sunset
--
-- subject_type='location' + source='licensed_stock' is the only path the photos
-- CHECK constraint accepts for stock photography on cities (§6 rule 2).

-- Re-runnable: clear any prior 0015 inserts.
DELETE FROM photos WHERE id LIKE 'photo_night15_%';

-- Demote the existing primary photo for these 3 so the new ones can take precedence.
UPDATE photos
SET is_primary = 0, sort_order = sort_order + 10
WHERE city_id IN ('city_patmos', 'city_sifnos', 'city_symi')
  AND is_primary = 1
  AND id NOT LIKE 'photo_night15_%';

INSERT INTO photos
  (id, city_id, subject_type, source, url, attribution_text, attribution_url, license, is_primary, sort_order)
VALUES
  ('photo_night15_patmos', 'city_patmos', 'location', 'licensed_stock',
   'https://upload.wikimedia.org/wikipedia/commons/8/8e/Patmos_A_night_in_Hora_%2810054982605%29.jpg',
   'Yiannis Theologos Michellis / Wikimedia Commons',
   'https://commons.wikimedia.org/wiki/File:Patmos_A_night_in_Hora_(10054982605).jpg',
   'CC0', 1, 0),
  ('photo_night15_sifnos', 'city_sifnos', 'location', 'licensed_stock',
   'https://upload.wikimedia.org/wikipedia/commons/5/5f/Apollonia%2C_Sifnos_night_view.jpg',
   'Dbatzog / Wikimedia Commons',
   'https://commons.wikimedia.org/wiki/File:Apollonia,_Sifnos_night_view.jpg',
   'Public domain', 1, 0),
  ('photo_night15_symi', 'city_symi', 'location', 'licensed_stock',
   'https://upload.wikimedia.org/wikipedia/commons/d/d5/%CE%A3%CF%8D%CE%BC%CE%B7_-_panoramio_%2815%29.jpg',
   'Николай Максимович / Wikimedia Commons',
   'https://commons.wikimedia.org/wiki/File:%CE%A3%CF%8D%CE%BC%CE%B7_-_panoramio_(15).jpg',
   'CC BY 3.0', 1, 0);
