-- 0018: Add Loutraki as the 34th city. End-to-end template for §5 expansion.
-- Loutraki is a Saronic-side town in Peloponnese — famous for the casino,
-- thermal springs and its beach bars / clubs. Visitor of the day is from here.
--
-- Re-runnable: clears prior 0018 rows before re-inserting.

DELETE FROM photos WHERE id LIKE 'photo_loutraki_%';
DELETE FROM translations WHERE entity_id = 'city_loutraki';
DELETE FROM cities WHERE id = 'city_loutraki';

INSERT INTO cities (id, slug, name, region, lat, lng, is_published)
VALUES ('city_loutraki', 'loutraki', 'Loutraki', 'Peloponnese', 38.0179, 22.9758, 1);

-- Per-locale city name translations.
INSERT INTO translations (id, entity_type, entity_id, field, locale, value, source) VALUES
  ('tr_city_name_loutraki_el', 'city', 'city_loutraki', 'name', 'el', 'Λουτράκι',  'admin'),
  ('tr_city_name_loutraki_de', 'city', 'city_loutraki', 'name', 'de', 'Loutraki',  'admin'),
  ('tr_city_name_loutraki_fr', 'city', 'city_loutraki', 'name', 'fr', 'Loutraki',  'admin'),
  ('tr_city_name_loutraki_it', 'city', 'city_loutraki', 'name', 'it', 'Loutraki',  'admin');

-- Hero photo from Pexels: aerial sunset of Loutraki by Giwrgos Lamp.
INSERT INTO photos
  (id, city_id, subject_type, source, url, attribution_text, attribution_url, license, is_primary, sort_order)
VALUES
  ('photo_loutraki_hero', 'city_loutraki', 'location', 'licensed_stock',
   'https://images.pexels.com/photos/28966087/pexels-photo-28966087.jpeg?auto=compress&cs=tinysrgb&w=1800',
   'Giwrgos Lamp / Pexels',
   'https://www.pexels.com/photo/28966087/',
   'Pexels', 1, 0),
  ('photo_loutraki_hero2', 'city_loutraki', 'location', 'licensed_stock',
   'https://images.pexels.com/photos/28400319/pexels-photo-28400319.jpeg?auto=compress&cs=tinysrgb&w=1800',
   'Giwrgos Lamp / Pexels',
   'https://www.pexels.com/photo/28400319/',
   'Pexels', 0, 1);
