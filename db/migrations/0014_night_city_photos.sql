-- 0014: Replace daytime city heroes with NIGHT photos (citynight.gr brand).
-- The site is a nightlife guide — heroes must read as night/evening, not
-- bright noon. Sourced from Pexels (no key needed, free license) and
-- Unsplash (also free). All photographer-attributed.
--
-- Strategy: this migration only INSERTS new primary photos for the 25
-- cities below where confirmed night/evening photos are available. It
-- demotes the older 0009/0013 photos to sort_order=10 (still in DB so
-- we can roll back via UPDATE, but no longer primary).
--
-- 8 cities NOT covered here (chios, lesvos, samos, andros, sifnos, patmos,
-- symi, tinos) — Pexels/Unsplash both lack night photography for them.
-- These will be addressed in a follow-up migration as photos surface.

-- Demote existing primary city photos so the new night photos can take precedence.
UPDATE photos SET is_primary = 0, sort_order = sort_order + 10 WHERE subject_type = 'location' AND is_primary = 1 AND city_id IN ('city_athens', 'city_thessaloniki', 'city_mykonos', 'city_santorini', 'city_rhodes', 'city_corfu', 'city_heraklion', 'city_nafplio', 'city_chania', 'city_skiathos', 'city_ioannina', 'city_patras', 'city_rethymno', 'city_kos', 'city_kefalonia', 'city_zakynthos', 'city_hydra', 'city_aegina', 'city_spetses', 'city_halkidiki', 'city_lefkada', 'city_naxos', 'city_paros', 'city_ios', 'city_milos');

-- Re-runnable: clear any previous 0014 rows before re-inserting.
DELETE FROM photos WHERE id LIKE 'photo_night_%';

INSERT INTO photos
  (id, city_id, subject_type, source, url, attribution_text, attribution_url, license, is_primary, sort_order)
VALUES
  -- athens: Acropolis illuminated at night
  ('photo_night_athens', 'city_athens', 'location', 'licensed_stock',
   'https://images.pexels.com/photos/20872423/pexels-photo-20872423.jpeg?auto=compress&cs=tinysrgb&w=1800',
   'zikos / Pexels', 'https://www.pexels.com/photo/20872423/',
   'Pexels', 1, 0),
  -- thessaloniki: Blue-lit umbrellas Zongopoulos at night
  ('photo_night_thessaloniki', 'city_thessaloniki', 'location', 'licensed_stock',
   'https://images.pexels.com/photos/12905559/pexels-photo-12905559.jpeg?auto=compress&cs=tinysrgb&w=1800',
   'Chrysos / Pexels', 'https://www.pexels.com/photo/12905559/',
   'Pexels', 1, 0),
  -- mykonos: Mykonos at night with moon
  ('photo_night_mykonos', 'city_mykonos', 'location', 'licensed_stock',
   'https://images.pexels.com/photos/15241777/pexels-photo-15241777.jpeg?auto=compress&cs=tinysrgb&w=1800',
   'Diego F. Parra / Pexels', 'https://www.pexels.com/photo/15241777/',
   'Pexels', 1, 0),
  -- santorini: Santorini illuminated cityscape evening
  ('photo_night_santorini', 'city_santorini', 'location', 'licensed_stock',
   'https://images.pexels.com/photos/15238529/pexels-photo-15238529.jpeg?auto=compress&cs=tinysrgb&w=1800',
   'Diego F. Parra / Pexels', 'https://www.pexels.com/photo/15238529/',
   'Pexels', 1, 0),
  -- rhodes: Rhodes Old Town illuminated streets
  ('photo_night_rhodes', 'city_rhodes', 'location', 'licensed_stock',
   'https://images.pexels.com/photos/8803858/pexels-photo-8803858.jpeg?auto=compress&cs=tinysrgb&w=1800',
   'Marton Novak / Pexels', 'https://www.pexels.com/photo/8803858/',
   'Pexels', 1, 0),
  -- corfu: Corfu Old Fortress at night reflecting on sea
  ('photo_night_corfu', 'city_corfu', 'location', 'licensed_stock',
   'https://images.pexels.com/photos/12182642/pexels-photo-12182642.jpeg?auto=compress&cs=tinysrgb&w=1800',
   'mosxonas_d-a / Pexels', 'https://www.pexels.com/photo/12182642/',
   'Pexels', 1, 0),
  -- heraklion: Morosini Fountain at night
  ('photo_night_heraklion', 'city_heraklion', 'location', 'licensed_stock',
   'https://images.pexels.com/photos/723022/pexels-photo-723022.jpeg?auto=compress&cs=tinysrgb&w=1800',
   'George Desipris / Pexels', 'https://www.pexels.com/photo/723022/',
   'Pexels', 1, 0),
  -- nafplio: Palamidi castle illuminated at dusk
  ('photo_night_nafplio', 'city_nafplio', 'location', 'licensed_stock',
   'https://images.pexels.com/photos/27390799/pexels-photo-27390799.jpeg?auto=compress&cs=tinysrgb&w=1800',
   'Ekaterina Visnevsky / Pexels', 'https://www.pexels.com/photo/27390799/',
   'Pexels', 1, 0),
  -- chania: Chania lighthouse reflected in harbour at night
  ('photo_night_chania', 'city_chania', 'location', 'licensed_stock',
   'https://images.pexels.com/photos/23961771/pexels-photo-23961771.jpeg?auto=compress&cs=tinysrgb&w=1800',
   'Alexiou Konstadinos / Pexels', 'https://www.pexels.com/photo/23961771/',
   'Pexels', 1, 0),
  -- skiathos: Marina at night with illuminated yachts
  ('photo_night_skiathos', 'city_skiathos', 'location', 'licensed_stock',
   'https://images.pexels.com/photos/18137548/pexels-photo-18137548.jpeg?auto=compress&cs=tinysrgb&w=1800',
   'umudicreative / Pexels', 'https://www.pexels.com/photo/18137548/',
   'Pexels', 1, 0),
  -- ioannina: Illuminated urban landscape through stone window
  ('photo_night_ioannina', 'city_ioannina', 'location', 'licensed_stock',
   'https://images.pexels.com/photos/8001009/pexels-photo-8001009.jpeg?auto=compress&cs=tinysrgb&w=1800',
   'Melike Sayar / Pexels', 'https://www.pexels.com/photo/8001009/',
   'Pexels', 1, 0),
  -- patras: Rio Antirrio bridge illuminated at night
  ('photo_night_patras', 'city_patras', 'location', 'licensed_stock',
   'https://images.pexels.com/photos/19731846/pexels-photo-19731846.jpeg?auto=compress&cs=tinysrgb&w=1800',
   'Michalis Venetsianos / Pexels', 'https://www.pexels.com/photo/19731846/',
   'Pexels', 1, 0),
  -- rethymno: Colorful waterfront illuminated at night
  ('photo_night_rethymno', 'city_rethymno', 'location', 'licensed_stock',
   'https://images.pexels.com/photos/14158261/pexels-photo-14158261.jpeg?auto=compress&cs=tinysrgb&w=1800',
   'george-zografidis / Pexels', 'https://www.pexels.com/photo/14158261/',
   'Pexels', 1, 0),
  -- kos: Outdoor dining with string lights at night
  ('photo_night_kos', 'city_kos', 'location', 'licensed_stock',
   'https://images.pexels.com/photos/17813247/pexels-photo-17813247.jpeg?auto=compress&cs=tinysrgb&w=1800',
   'leefinvrede / Pexels', 'https://www.pexels.com/photo/17813247/',
   'Pexels', 1, 0),
  -- kefalonia: Argostoli illuminated waterfront night
  ('photo_night_kefalonia', 'city_kefalonia', 'location', 'licensed_stock',
   'https://images.pexels.com/photos/10501513/pexels-photo-10501513.jpeg?auto=compress&cs=tinysrgb&w=1800',
   'Simonptr / Pexels', 'https://www.pexels.com/photo/10501513/',
   'Pexels', 1, 0),
  -- zakynthos: Zakynthos port with ferry and lighthouse at night
  ('photo_night_zakynthos', 'city_zakynthos', 'location', 'licensed_stock',
   'https://images.pexels.com/photos/36021193/pexels-photo-36021193.jpeg?auto=compress&cs=tinysrgb&w=1800',
   'Frankie Fantopoulos / Pexels', 'https://www.pexels.com/photo/36021193/',
   'Pexels', 1, 0),
  -- hydra: Illuminated houses on Greek coast at night
  ('photo_night_hydra', 'city_hydra', 'location', 'licensed_stock',
   'https://images.pexels.com/photos/37468605/pexels-photo-37468605.jpeg?auto=compress&cs=tinysrgb&w=1800',
   'Frankie Fantopoulos / Pexels', 'https://www.pexels.com/photo/37468605/',
   'Pexels', 1, 0),
  -- aegina: Aegina water and boat at night
  ('photo_night_aegina', 'city_aegina', 'location', 'licensed_stock',
   'https://images.unsplash.com/photo-1674242925627-68e488442164?w=1800&q=80&auto=format&fit=crop',
   'Hunor Kerekes / Unsplash', 'https://unsplash.com/photos/photo-1674242925627-68e488442164',
   'Unsplash', 1, 0),
  -- spetses: Spetses harbour at night
  ('photo_night_spetses', 'city_spetses', 'location', 'licensed_stock',
   'https://images.unsplash.com/photo-1515937350506-3e7b51a95339?w=1800&q=80&auto=format&fit=crop',
   'Dan Russon / Unsplash', 'https://unsplash.com/photos/photo-1515937350506-3e7b51a95339',
   'Unsplash', 1, 0),
  -- halkidiki: Halkidiki coastline at night
  ('photo_night_halkidiki', 'city_halkidiki', 'location', 'licensed_stock',
   'https://images.unsplash.com/photo-1562137544-1b006d6d8b21?w=1800&q=80&auto=format&fit=crop',
   'Filiz Mehmed / Unsplash', 'https://unsplash.com/photos/photo-1562137544-1b006d6d8b21',
   'Unsplash', 1, 0),
  -- lefkada: Lefkada boat under starry night sky
  ('photo_night_lefkada', 'city_lefkada', 'location', 'licensed_stock',
   'https://images.unsplash.com/photo-1623513580816-6182b8968d1b?w=1800&q=80&auto=format&fit=crop',
   'Hendrik Cornelissen / Unsplash', 'https://unsplash.com/photos/photo-1623513580816-6182b8968d1b',
   'Unsplash', 1, 0),
  -- naxos: Cycladic waterfront at night
  ('photo_night_naxos', 'city_naxos', 'location', 'licensed_stock',
   'https://images.unsplash.com/photo-1589701015409-9503c0a87897?w=1800&q=80&auto=format&fit=crop',
   'Evangelos Mpikakis / Unsplash', 'https://unsplash.com/photos/photo-1589701015409-9503c0a87897',
   'Unsplash', 1, 0),
  -- paros: Paros at night
  ('photo_night_paros', 'city_paros', 'location', 'licensed_stock',
   'https://images.unsplash.com/photo-1663756375448-69a6fda57f06?w=1800&q=80&auto=format&fit=crop',
   'Tobias Rademacher / Unsplash', 'https://unsplash.com/photos/photo-1663756375448-69a6fda57f06',
   'Unsplash', 1, 0),
  -- ios: White and black houses by water at night
  ('photo_night_ios', 'city_ios', 'location', 'licensed_stock',
   'https://images.unsplash.com/photo-1600071897035-01f1db028451?w=1800&q=80&auto=format&fit=crop',
   'Joshua Rondeau / Unsplash', 'https://unsplash.com/photos/photo-1600071897035-01f1db028451',
   'Unsplash', 1, 0),
  -- milos: Sun setting over Milos waters
  ('photo_night_milos', 'city_milos', 'location', 'licensed_stock',
   'https://images.unsplash.com/photo-1700850065684-e8aed0bf75cb?w=1800&q=80&auto=format&fit=crop',
   'Jesse Paul / Unsplash', 'https://unsplash.com/photos/photo-1700850065684-e8aed0bf75cb',
   'Unsplash', 1, 0);

-- ─── Post-insert fixes ────────────────────────────────────────────────
-- Three Pexels photo IDs were removed/expired between curation and apply.
-- Replaced with Unsplash equivalents (all verified live 2026-05-24).
UPDATE photos SET
  url = 'https://images.unsplash.com/photo-1696265396690-6ef9e3d1b294?w=1800&q=80&auto=format&fit=crop',
  attribution_text = 'Zoe Stefanatou / Unsplash',
  attribution_url = 'https://unsplash.com/photos/photo-1696265396690-6ef9e3d1b294',
  license = 'Unsplash'
WHERE id = 'photo_night_kefalonia';

UPDATE photos SET
  url = 'https://images.unsplash.com/photo-1619887760791-bbb1b3d6e0d1?w=1800&q=80&auto=format&fit=crop',
  attribution_text = 'Andreas Weilguny / Unsplash',
  attribution_url = 'https://unsplash.com/photos/photo-1619887760791-bbb1b3d6e0d1',
  license = 'Unsplash'
WHERE id = 'photo_night_zakynthos';

UPDATE photos SET
  url = 'https://images.unsplash.com/photo-1742932660123-8f960ded48d3?w=1800&q=80&auto=format&fit=crop',
  attribution_text = 'Anastasios Tselepatiotis / Unsplash',
  attribution_url = 'https://unsplash.com/photos/photo-1742932660123-8f960ded48d3',
  license = 'Unsplash'
WHERE id = 'photo_night_hydra';

-- ─── Phase 2: 4 more night photos found on Unsplash (chios, lesvos, samos, andros) ───
UPDATE photos SET is_primary = 0, sort_order = sort_order + 10
  WHERE city_id IN ('city_chios','city_lesvos','city_samos','city_andros')
    AND is_primary = 1
    AND id NOT LIKE 'photo_night_%';

INSERT INTO photos
  (id, city_id, subject_type, source, url, attribution_text, attribution_url, license, is_primary, sort_order)
VALUES
  ('photo_night_chios',  'city_chios',  'location', 'licensed_stock',
   'https://images.unsplash.com/photo-1645615952474-4e9f188e8b80?w=1800&q=80&auto=format&fit=crop',
   'Vasiliki Mastropetrou / Unsplash',
   'https://unsplash.com/photos/photo-1645615952474-4e9f188e8b80',
   'Unsplash', 1, 0),
  ('photo_night_lesvos', 'city_lesvos', 'location', 'licensed_stock',
   'https://images.unsplash.com/photo-1583163567997-77b04e6c5b24?w=1800&q=80&auto=format&fit=crop',
   'Tânia Mousinho / Unsplash',
   'https://unsplash.com/photos/photo-1583163567997-77b04e6c5b24',
   'Unsplash', 1, 0),
  ('photo_night_samos',  'city_samos',  'location', 'licensed_stock',
   'https://images.unsplash.com/photo-1726677411578-68f41c1efaa7?w=1800&q=80&auto=format&fit=crop',
   'Vilde Velund Sirnes / Unsplash',
   'https://unsplash.com/photos/photo-1726677411578-68f41c1efaa7',
   'Unsplash', 1, 0),
  ('photo_night_andros', 'city_andros', 'location', 'licensed_stock',
   'https://images.unsplash.com/photo-1515086215594-3427c60130a5?w=1800&q=80&auto=format&fit=crop',
   'Adolfo Ruiz / Unsplash',
   'https://unsplash.com/photos/photo-1515086215594-3427c60130a5',
   'Unsplash', 1, 0);

-- 3 cities still NOT covered: patmos, sifnos, symi.
-- Neither Pexels nor Unsplash had night photos for these small islands as of
-- 2026-05-24. They keep their 0013 daytime hero until better photos surface.
