-- 0011: register the Phase C city guides (content/cities/*.json) in the DB so
-- the city pages resolve and the cities index lists them. Areas mirror the
-- `neighborhoods[].slug + name` arrays inside each city JSON; future seed-ingest
-- runs use these area rows to classify venues by lat/lng. Re-runnable.

INSERT OR IGNORE INTO cities (id, slug, name, region, lat, lng, is_published) VALUES
  ('city_chania',    'chania',    'Chania',    'Crete',            35.5138, 24.0180, 1),
  ('city_rethymno',  'rethymno',  'Rethymno',  'Crete',            35.3667, 24.4736, 1),
  ('city_naxos',     'naxos',     'Naxos',     'South Aegean',     37.1036, 25.3768, 1),
  ('city_milos',     'milos',     'Milos',     'South Aegean',     36.6960, 24.4232, 1),
  ('city_sifnos',    'sifnos',    'Sifnos',    'South Aegean',     36.9774, 24.7124, 1),
  ('city_skiathos',  'skiathos',  'Skiathos',  'Thessaly',         39.1633, 23.4900, 1),
  ('city_kos',       'kos',       'Kos',       'South Aegean',     36.8938, 27.2877, 1),
  ('city_kefalonia', 'kefalonia', 'Kefalonia', 'Ionian Islands',   38.1755, 20.5715, 1),
  ('city_lefkada',   'lefkada',   'Lefkada',   'Ionian Islands',   38.8333, 20.7000, 1),
  ('city_halkidiki', 'halkidiki', 'Halkidiki', 'Central Macedonia', 40.3000, 23.4000, 1),
  ('city_nafplio',   'nafplio',   'Nafplio',   'Peloponnese',      37.5683, 22.8000, 1),
  ('city_hydra',     'hydra',     'Hydra',     'Attica',           37.3500, 23.4667, 1),
  ('city_spetses',   'spetses',   'Spetses',   'Attica',           37.2667, 23.1500, 1);

INSERT OR IGNORE INTO areas (id, city_id, slug, name) VALUES
  -- Chania
  ('area_cha_harbour',  'city_chania',    'venetian-harbour', 'Venetian Harbour'),
  ('area_cha_splantz',  'city_chania',    'splantzia',        'Splantzia'),
  ('area_cha_tabak',    'city_chania',    'tabakaria',        'Tabakaria'),
  ('area_cha_agmar',    'city_chania',    'agia-marina',      'Agia Marina'),

  -- Rethymno
  ('area_ret_oldtown',  'city_rethymno',  'old-town',         'Old Town'),
  ('area_ret_rimondi',  'city_rethymno',  'rimondi-square',   'Rimondi Square'),
  ('area_ret_harbour',  'city_rethymno',  'venetian-harbour', 'Venetian Harbour'),
  ('area_ret_beach',    'city_rethymno',  'city-beach',       'City Beach'),

  -- Naxos
  ('area_nax_chora',    'city_naxos',     'chora',            'Chora'),
  ('area_nax_prok',     'city_naxos',     'agios-prokopios',  'Agios Prokopios'),
  ('area_nax_plaka',    'city_naxos',     'plaka',            'Plaka'),
  ('area_nax_halki',    'city_naxos',     'halki',            'Halki'),

  -- Milos
  ('area_mil_adamas',   'city_milos',     'adamas',           'Adamas'),
  ('area_mil_plaka',    'city_milos',     'plaka',            'Plaka'),
  ('area_mil_klima',    'city_milos',     'klima',            'Klima'),
  ('area_mil_pollonia', 'city_milos',     'pollonia',         'Pollonia'),

  -- Sifnos
  ('area_sif_apoll',    'city_sifnos',    'apollonia',        'Apollonia'),
  ('area_sif_artem',    'city_sifnos',    'artemonas',        'Artemonas'),
  ('area_sif_kam',      'city_sifnos',    'kamares',          'Kamares'),
  ('area_sif_kastro',   'city_sifnos',    'kastro',           'Kastro'),

  -- Skiathos
  ('area_ski_town',     'city_skiathos',  'skiathos-town',    'Skiathos Town'),
  ('area_ski_kouk',     'city_skiathos',  'koukounaries',     'Koukounaries'),
  ('area_ski_oldport',  'city_skiathos',  'old-port',         'Old Port'),
  ('area_ski_achl',     'city_skiathos',  'achladies',        'Achladies / Vasilias'),

  -- Kos
  ('area_kos_town',     'city_kos',       'kos-town',         'Kos Town'),
  ('area_kos_kard',     'city_kos',       'kardamena',        'Kardamena'),
  ('area_kos_tig',      'city_kos',       'tigaki',           'Tigaki'),
  ('area_kos_kef',      'city_kos',       'kefalos',          'Kefalos'),

  -- Kefalonia
  ('area_kef_argo',     'city_kefalonia', 'argostoli',        'Argostoli'),
  ('area_kef_fisk',     'city_kefalonia', 'fiskardo',         'Fiskardo'),
  ('area_kef_lassi',    'city_kefalonia', 'lassi',            'Lassi'),
  ('area_kef_sami',     'city_kefalonia', 'sami',             'Sami'),

  -- Lefkada
  ('area_lef_town',     'city_lefkada',   'lefkada-town',     'Lefkada Town'),
  ('area_lef_nydri',    'city_lefkada',   'nydri',            'Nydri'),
  ('area_lef_vas',      'city_lefkada',   'vasiliki',         'Vasiliki'),
  ('area_lef_agnik',    'city_lefkada',   'agios-nikitas',    'Agios Nikitas'),

  -- Halkidiki
  ('area_hal_kall',     'city_halkidiki', 'kallithea',        'Kallithea (Kassandra)'),
  ('area_hal_sani',     'city_halkidiki', 'sani',             'Sani (Kassandra)'),
  ('area_hal_sarti',    'city_halkidiki', 'sarti-armenistis', 'Sarti & Armenistis (Sithonia)'),
  ('area_hal_marm',     'city_halkidiki', 'neos-marmaras',    'Neos Marmaras (Sithonia)'),

  -- Nafplio
  ('area_naf_oldtown',  'city_nafplio',   'old-town',         'Old Town'),
  ('area_naf_synt',     'city_nafplio',   'syntagma-square',  'Syntagma Square'),
  ('area_naf_akro',     'city_nafplio',   'akronafplia',      'Akronafplia'),
  ('area_naf_tolo',     'city_nafplio',   'karathona-tolo',   'Karathona & Tolo'),

  -- Hydra
  ('area_hyd_harbour',  'city_hydra',     'harbour',          'Harbour'),
  ('area_hyd_hydron',   'city_hydra',     'hydronetta',       'Hydronetta'),
  ('area_hyd_kamini',   'city_hydra',     'kamini',           'Kamini'),
  ('area_hyd_vlychos',  'city_hydra',     'vlychos',          'Vlychos'),

  -- Spetses
  ('area_spe_dapia',    'city_spetses',   'dapia',            'Dapia'),
  ('area_spe_oldhar',   'city_spetses',   'old-harbour',      'Old Harbour'),
  ('area_spe_anarg',    'city_spetses',   'anargyrios',       'Anargyrios district'),
  ('area_spe_agmar',    'city_spetses',   'agii-anargyri',    'Agii Anargyri');
