-- 0005: DEMO photos for the 30 demo venues from 0004.
--
-- These are atmospheric placeholders, NOT actual photos of the named venues.
-- `subject_type='venue'`, `source='placeholder'` — the photos CHECK constraint
-- (§6 rule 2) allows 'placeholder' on venue rows specifically for this purpose:
-- show *something* on the card while we wait for real Places-sourced photos.
--
-- URLs use picsum.photos, which serves deterministic Unsplash-curated photos
-- keyed by seed. Replaced when `node scripts/seed/run.js demo-venue-photos`
-- runs against the real Unsplash API (category-themed photos by venue type).

INSERT OR IGNORE INTO photos
  (id, venue_id, subject_type, source, url, attribution_text, attribution_url, license, is_primary, sort_order)
VALUES
  -- Athens
  ('photo_demo_six_dogs',       'venue_demo_six_dogs',       'venue', 'placeholder', 'https://picsum.photos/seed/six-dogs/1600/1000',         'Lorem Picsum (Unsplash)', 'https://picsum.photos', 'CC0', 1, 0),
  ('photo_demo_clumsies',       'venue_demo_clumsies',       'venue', 'placeholder', 'https://picsum.photos/seed/the-clumsies/1600/1000',     'Lorem Picsum (Unsplash)', 'https://picsum.photos', 'CC0', 1, 0),
  ('photo_demo_a_for_athens',   'venue_demo_a_for_athens',   'venue', 'placeholder', 'https://picsum.photos/seed/a-for-athens/1600/1000',     'Lorem Picsum (Unsplash)', 'https://picsum.photos', 'CC0', 1, 0),
  ('photo_demo_360',            'venue_demo_360',            'venue', 'placeholder', 'https://picsum.photos/seed/360-cocktail/1600/1000',     'Lorem Picsum (Unsplash)', 'https://picsum.photos', 'CC0', 1, 0),
  ('photo_demo_lohan',          'venue_demo_lohan',          'venue', 'placeholder', 'https://picsum.photos/seed/lohan-club/1600/1000',       'Lorem Picsum (Unsplash)', 'https://picsum.photos', 'CC0', 1, 0),
  ('photo_demo_bolivar',        'venue_demo_bolivar',        'venue', 'placeholder', 'https://picsum.photos/seed/bolivar-beach/1600/1000',    'Lorem Picsum (Unsplash)', 'https://picsum.photos', 'CC0', 1, 0),
  ('photo_demo_an_club',        'venue_demo_an_club',        'venue', 'placeholder', 'https://picsum.photos/seed/an-club/1600/1000',          'Lorem Picsum (Unsplash)', 'https://picsum.photos', 'CC0', 1, 0),
  ('photo_demo_posidonio',      'venue_demo_posidonio',      'venue', 'placeholder', 'https://picsum.photos/seed/posidonio/1600/1000',        'Lorem Picsum (Unsplash)', 'https://picsum.photos', 'CC0', 1, 0),
  ('photo_demo_galaxy',         'venue_demo_galaxy',         'venue', 'placeholder', 'https://picsum.photos/seed/galaxy-bar/1600/1000',       'Lorem Picsum (Unsplash)', 'https://picsum.photos', 'CC0', 1, 0),
  ('photo_demo_underdog',       'venue_demo_underdog',       'venue', 'placeholder', 'https://picsum.photos/seed/underdog/1600/1000',         'Lorem Picsum (Unsplash)', 'https://picsum.photos', 'CC0', 1, 0),

  -- Mykonos
  ('photo_demo_cavo_paradiso',  'venue_demo_cavo_paradiso',  'venue', 'placeholder', 'https://picsum.photos/seed/cavo-paradiso/1600/1000',    'Lorem Picsum (Unsplash)', 'https://picsum.photos', 'CC0', 1, 0),
  ('photo_demo_paradise_club',  'venue_demo_paradise_club',  'venue', 'placeholder', 'https://picsum.photos/seed/paradise-club/1600/1000',    'Lorem Picsum (Unsplash)', 'https://picsum.photos', 'CC0', 1, 0),
  ('photo_demo_scorpios',       'venue_demo_scorpios',       'venue', 'placeholder', 'https://picsum.photos/seed/scorpios/1600/1000',         'Lorem Picsum (Unsplash)', 'https://picsum.photos', 'CC0', 1, 0),
  ('photo_demo_nammos',         'venue_demo_nammos',         'venue', 'placeholder', 'https://picsum.photos/seed/nammos/1600/1000',           'Lorem Picsum (Unsplash)', 'https://picsum.photos', 'CC0', 1, 0),
  ('photo_demo_super_paradise', 'venue_demo_super_paradise', 'venue', 'placeholder', 'https://picsum.photos/seed/super-paradise/1600/1000',   'Lorem Picsum (Unsplash)', 'https://picsum.photos', 'CC0', 1, 0),
  ('photo_demo_tropicana',      'venue_demo_tropicana',      'venue', 'placeholder', 'https://picsum.photos/seed/tropicana-myk/1600/1000',    'Lorem Picsum (Unsplash)', 'https://picsum.photos', 'CC0', 1, 0),
  ('photo_demo_skandinavian',   'venue_demo_skandinavian',   'venue', 'placeholder', 'https://picsum.photos/seed/skandinavian/1600/1000',     'Lorem Picsum (Unsplash)', 'https://picsum.photos', 'CC0', 1, 0),
  ('photo_demo_galleraki',      'venue_demo_galleraki',      'venue', 'placeholder', 'https://picsum.photos/seed/galleraki/1600/1000',        'Lorem Picsum (Unsplash)', 'https://picsum.photos', 'CC0', 1, 0),
  ('photo_demo_santanna',       'venue_demo_santanna',       'venue', 'placeholder', 'https://picsum.photos/seed/santanna/1600/1000',         'Lorem Picsum (Unsplash)', 'https://picsum.photos', 'CC0', 1, 0),
  ('photo_demo_astra',          'venue_demo_astra',          'venue', 'placeholder', 'https://picsum.photos/seed/astra-bar/1600/1000',        'Lorem Picsum (Unsplash)', 'https://picsum.photos', 'CC0', 1, 0),

  -- Santorini
  ('photo_demo_tropical',       'venue_demo_tropical',       'venue', 'placeholder', 'https://picsum.photos/seed/tropical-oia/1600/1000',     'Lorem Picsum (Unsplash)', 'https://picsum.photos', 'CC0', 1, 0),
  ('photo_demo_casablanca',     'venue_demo_casablanca',     'venue', 'placeholder', 'https://picsum.photos/seed/casablanca/1600/1000',       'Lorem Picsum (Unsplash)', 'https://picsum.photos', 'CC0', 1, 0),
  ('photo_demo_momix',          'venue_demo_momix',          'venue', 'placeholder', 'https://picsum.photos/seed/momix/1600/1000',            'Lorem Picsum (Unsplash)', 'https://picsum.photos', 'CC0', 1, 0),
  ('photo_demo_koo',            'venue_demo_koo',            'venue', 'placeholder', 'https://picsum.photos/seed/koo-club/1600/1000',         'Lorem Picsum (Unsplash)', 'https://picsum.photos', 'CC0', 1, 0),
  ('photo_demo_enigma',         'venue_demo_enigma',         'venue', 'placeholder', 'https://picsum.photos/seed/enigma-cafe/1600/1000',      'Lorem Picsum (Unsplash)', 'https://picsum.photos', 'CC0', 1, 0),
  ('photo_demo_francos',        'venue_demo_francos',        'venue', 'placeholder', 'https://picsum.photos/seed/francos-cafe/1600/1000',     'Lorem Picsum (Unsplash)', 'https://picsum.photos', 'CC0', 1, 0),
  ('photo_demo_pk',             'venue_demo_pk',             'venue', 'placeholder', 'https://picsum.photos/seed/pk-cocktail/1600/1000',      'Lorem Picsum (Unsplash)', 'https://picsum.photos', 'CC0', 1, 0),
  ('photo_demo_crystal',        'venue_demo_crystal',        'venue', 'placeholder', 'https://picsum.photos/seed/crystal-imerov/1600/1000',   'Lorem Picsum (Unsplash)', 'https://picsum.photos', 'CC0', 1, 0),
  ('photo_demo_demilmar',       'venue_demo_demilmar',       'venue', 'placeholder', 'https://picsum.photos/seed/demilmar/1600/1000',         'Lorem Picsum (Unsplash)', 'https://picsum.photos', 'CC0', 1, 0),
  ('photo_demo_wet_stories',    'venue_demo_wet_stories',    'venue', 'placeholder', 'https://picsum.photos/seed/wet-stories/1600/1000',      'Lorem Picsum (Unsplash)', 'https://picsum.photos', 'CC0', 1, 0);
