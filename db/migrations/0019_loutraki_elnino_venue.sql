-- 0019: Add El Nino cafe-bar Loutraki as the first Loutraki venue.
-- Sourced from Google Places API. End-to-end pipeline template.
--
-- Facts (name, address, phone, opening hours, price level, lat/lng) come
-- from Places — fieldSources marks each as such.
-- Description is the ONLY AI-writable field (§6 rule 1). Authored here.
--
-- Photos: 6 from the Places photo list, hand-picked for nightlife brand
-- fit (sunset patrons first; bar interior, beach view, drinks, food).
-- subject_type=venue + source=google_places matches the §6 CHECK.
-- Re-runnable: clear prior 0019 rows.

DELETE FROM photos WHERE id LIKE 'photo_elnino_%';
DELETE FROM translations WHERE entity_id = 'venue_loutraki_elnino';
DELETE FROM venues WHERE id = 'venue_loutraki_elnino';

INSERT INTO venues (id, slug, city_id, area_id, category_id, google_place_id, name, address, lat, lng, phone, opening_hours, price_level, website, description, field_sources, status, claim, tier, rating, review_count, business_status, is_permanently_closed, published_at, last_synced_at) VALUES (
  'venue_loutraki_elnino',
  'el-nino',
  'city_loutraki',
  NULL,
  'cat_bar',
  'ChIJU5T20j8VoBQRLsBYr3iDpTw',
  'El Niño cafe - bar Loutraki',
  'Ποσειδώνος 47 και, Matsi, Loutraki 203 00, Greece',
  37.9715049,
  22.9746701,
  '2744 067755',
  '{"monday":"09:00-03:00","tuesday":"09:00-03:00","wednesday":"09:00-03:00","thursday":"09:00-03:00","friday":"09:00-04:00","saturday":"09:00-04:00","sunday":"09:00-03:00"}',
  2,
  NULL,
  'Παραθαλάσσιο cafe-bar στο Λουτράκι με βεράντα στη θάλασσα. All-day στέκι που μετατρέπεται σε σημείο συνάντησης το ηλιοβασίλεμα και μένει ανοιχτό μέχρι αργά.',
  '{"name":"google_places","address":"google_places","phone":"google_places","opening_hours":"google_places","price_level":"google_places"}',
  'published',
  'unclaimed',
  'free',
  4.5,
  1872,
  'OPERATIONAL',
  0,
  unixepoch(),
  unixepoch()
);

-- Translated descriptions (the only AI-writable field per §6).
INSERT INTO translations (id, entity_type, entity_id, field, locale, value, source) VALUES
  ('tr_elnino_desc_en', 'venue', 'venue_loutraki_elnino', 'description', 'en', 'Waterfront cafe-bar in Loutraki with a sea-facing terrace. An all-day spot that turns into the sunset meeting point and stays open into the small hours.', 'admin'),
  ('tr_elnino_desc_de', 'venue', 'venue_loutraki_elnino', 'description', 'de', 'Bar am Meer in Loutraki mit Terrasse direkt am Wasser. All-Day-Treffpunkt, der zum Sonnenuntergang voll wird und bis in die frühen Morgenstunden geöffnet bleibt.', 'admin'),
  ('tr_elnino_desc_fr', 'venue', 'venue_loutraki_elnino', 'description', 'fr', 'Cafe-bar en bord de mer à Loutraki, terrasse face à la baie. Lieu all-day qui devient le rendez-vous du coucher de soleil et reste ouvert tard.', 'admin'),
  ('tr_elnino_desc_it', 'venue', 'venue_loutraki_elnino', 'description', 'it', 'Cafe-bar sul lungomare di Loutraki con terrazza vista mare. Locale all-day che diventa il punto del tramonto e resta aperto fino a tardi.', 'admin');

-- 6 photos hand-picked from the Places list.
INSERT INTO photos (id, venue_id, subject_type, source, url, attribution_text, attribution_url, license, is_primary, sort_order) VALUES
  ('photo_elnino_01', 'venue_loutraki_elnino', 'venue', 'google_places', 'https://lh3.googleusercontent.com/place-photos/AJRVUZPT9nNWcgfeR_Sih-uNyBAXo541et3n_EQEb59FwRT7AlXAhDE3oFek0ZEPSeZSOcr-C3MRl0iG77ScxLUBY2pKXPF99eXiqhQq6BdnE4bVgD8kvUcSqw6-G2vIxqnHSoYWD2aaORxFaKfniULXEI0m=s4800-w1600', 'Ροδούλα Μπαμπάτσικου / Google', NULL, 'Google Places', 1, 0),
  ('photo_elnino_02', 'venue_loutraki_elnino', 'venue', 'google_places', 'https://lh3.googleusercontent.com/places/ANXAkqGnbGHkKL5UiFLnmhu3kfj52uoWl6rrAQqheSEDKClMwsUoC4OQeCZ49_7Kxbb2k7xczkTjxK5o2Y7wwgmAC1nWHJ9xKXmGmVM=s4800-w1200', 'El Niño Cafe-bar Loutraki / Google', NULL, 'Google Places', 0, 1),
  ('photo_elnino_03', 'venue_loutraki_elnino', 'venue', 'google_places', 'https://lh3.googleusercontent.com/place-photos/AJRVUZMUpA9ioyNVaNwtiZLVib8VCteg_9Ny5IYdEYBp1NGjOdkmFXn5PhSH-2Bfb1RCvJ2GzJFzbaILWesXxGFSmHGHEfG4HRtkqryolmuMK9ipTrdlGog-kKlgK77c6ze08iMUU4k3ndXyWk2Mqg=s4800-w1600', 'Μενέλαος / Google', NULL, 'Google Places', 0, 2),
  ('photo_elnino_04', 'venue_loutraki_elnino', 'venue', 'google_places', 'https://lh3.googleusercontent.com/place-photos/AJRVUZOFHf_YZwLHhOmtPqVXLQwsMWh4Ja7IYH9xEV-yoIa89ODADK3OtcwDsheCI3lJk2apD9Qsyxf06FEqryLRXjYSXxPUEqupwLi-FzQ9SfR2ZeuKXC9_e5Qr0XlqOi-PbLlg_sifoyf1QschAdm8NigJig=s4800-w1600', 'Snezana Stevic / Google', NULL, 'Google Places', 0, 3),
  ('photo_elnino_05', 'venue_loutraki_elnino', 'venue', 'google_places', 'https://lh3.googleusercontent.com/place-photos/AJRVUZMRfvUzg-PNcGogaJb5IM1b8Z8LBeN2fN9JDlIhToMozS9bypqQcIX3LjjPmQeKktqNyGzHRC2eeXwPsIo8reBbf5qMBAsZYe-_JvM8EOCCjVewWksPKfTO1qDwPUWoLZPPd4SWDTosYaiY=s4800-w1600', 'Σωτήρης Παπαγεωργίου / Google', NULL, 'Google Places', 0, 4),
  ('photo_elnino_06', 'venue_loutraki_elnino', 'venue', 'google_places', 'https://lh3.googleusercontent.com/places/ANXAkqFPEWqHQ8pyXBrKTk9zWQdM0Isg5XAeoY9lLc02Hm9uIGYvymVA2UOb3ssV_teyHSlmE3my5K97AMQgJ_MLVjEppiexPgZwW8U=s4800-w1365', 'El Niño Cafe-bar Loutraki / Google', NULL, 'Google Places', 0, 5);

-- ─── Photo refresh: replace dated cocktail with business-uploaded wine table.
-- Lean on business-uploaded photos (3 of 6) for freshness.
DELETE FROM photos WHERE id LIKE 'photo_elnino_%';
INSERT INTO photos (id, venue_id, subject_type, source, url, attribution_text, attribution_url, license, is_primary, sort_order) VALUES
  ('photo_elnino_01', 'venue_loutraki_elnino', 'venue', 'google_places', 'https://lh3.googleusercontent.com/place-photos/AJRVUZPT9nNWcgfeR_Sih-uNyBAXo541et3n_EQEb59FwRT7AlXAhDE3oFek0ZEPSeZSOcr-C3MRl0iG77ScxLUBY2pKXPF99eXiqhQq6BdnE4bVgD8kvUcSqw6-G2vIxqnHSoYWD2aaORxFaKfniULXEI0m=s4800-w1600', 'Ροδούλα Μπαμπάτσικου / Google', NULL, 'Google Places', 1, 0),
  ('photo_elnino_02', 'venue_loutraki_elnino', 'venue', 'google_places', 'https://lh3.googleusercontent.com/places/ANXAkqGnbGHkKL5UiFLnmhu3kfj52uoWl6rrAQqheSEDKClMwsUoC4OQeCZ49_7Kxbb2k7xczkTjxK5o2Y7wwgmAC1nWHJ9xKXmGmVM=s4800-w1200', 'El Niño Cafe-bar Loutraki / Google', NULL, 'Google Places', 0, 1),
  ('photo_elnino_03', 'venue_loutraki_elnino', 'venue', 'google_places', 'https://lh3.googleusercontent.com/places/ANXAkqHCxW6Iv8xrMM2hwWIYkhBCza_fBPaKoDDYRfQCftkbVhKPriiMWe9yjKMi3Tpeff_XkDMgMbMRPQtJD2_VBE13gQv1ZmgrPZY=s4800-w1600', 'El Niño Cafe-bar Loutraki / Google', NULL, 'Google Places', 0, 2),
  ('photo_elnino_04', 'venue_loutraki_elnino', 'venue', 'google_places', 'https://lh3.googleusercontent.com/places/ANXAkqFPEWqHQ8pyXBrKTk9zWQdM0Isg5XAeoY9lLc02Hm9uIGYvymVA2UOb3ssV_teyHSlmE3my5K97AMQgJ_MLVjEppiexPgZwW8U=s4800-w1365', 'El Niño Cafe-bar Loutraki / Google', NULL, 'Google Places', 0, 3),
  ('photo_elnino_05', 'venue_loutraki_elnino', 'venue', 'google_places', 'https://lh3.googleusercontent.com/place-photos/AJRVUZOFHf_YZwLHhOmtPqVXLQwsMWh4Ja7IYH9xEV-yoIa89ODADK3OtcwDsheCI3lJk2apD9Qsyxf06FEqryLRXjYSXxPUEqupwLi-FzQ9SfR2ZeuKXC9_e5Qr0XlqOi-PbLlg_sifoyf1QschAdm8NigJig=s4800-w1600', 'Snezana Stevic / Google', NULL, 'Google Places', 0, 4),
  ('photo_elnino_06', 'venue_loutraki_elnino', 'venue', 'google_places', 'https://lh3.googleusercontent.com/place-photos/AJRVUZMUpA9ioyNVaNwtiZLVib8VCteg_9Ny5IYdEYBp1NGjOdkmFXn5PhSH-2Bfb1RCvJ2GzJFzbaILWesXxGFSmHGHEfG4HRtkqryolmuMK9ipTrdlGog-kKlgK77c6ze08iMUU4k3ndXyWk2Mqg=s4800-w1600', 'Μενέλαος / Google', NULL, 'Google Places', 0, 5);
