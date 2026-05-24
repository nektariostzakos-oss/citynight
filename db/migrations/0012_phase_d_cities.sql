-- 0012: Phase D batch 1 — 10 more city guides registered in the DB so their
-- pages resolve and the cities index lists them. Areas mirror each city JSON.
-- Re-runnable.

INSERT OR IGNORE INTO cities (id, slug, name, region, lat, lng, is_published) VALUES
  ('city_tinos',    'tinos',    'Tinos',    'South Aegean',     37.5394, 25.1602, 1),
  ('city_andros',   'andros',   'Andros',   'South Aegean',     37.8400, 24.9400, 1),
  ('city_symi',     'symi',     'Symi',     'South Aegean',     36.6131, 27.8417, 1),
  ('city_patmos',   'patmos',   'Patmos',   'South Aegean',     37.3083, 26.5500, 1),
  ('city_aegina',   'aegina',   'Aegina',   'Attica',           37.7464, 23.4283, 1),
  ('city_lesvos',   'lesvos',   'Lesvos',   'North Aegean',     39.1100, 26.5550, 1),
  ('city_chios',    'chios',    'Chios',    'North Aegean',     38.3681, 26.1356, 1),
  ('city_samos',    'samos',    'Samos',    'North Aegean',     37.7547, 26.9772, 1),
  ('city_patras',   'patras',   'Patras',   'Peloponnese',      38.2466, 21.7346, 1),
  ('city_ioannina', 'ioannina', 'Ioannina', 'Epirus',           39.6650, 20.8537, 1);

INSERT OR IGNORE INTO areas (id, city_id, slug, name) VALUES
  ('area_tin_chora',   'city_tinos',   'chora',           'Chora (Tinos Town)'),
  ('area_tin_pyrgos',  'city_tinos',   'pyrgos',          'Pyrgos'),
  ('area_tin_volax',   'city_tinos',   'volax',           'Volax'),
  ('area_tin_agrom',   'city_tinos',   'agios-romanos',   'Agios Romanos'),

  ('area_and_chora',   'city_andros',  'chora',           'Chora'),
  ('area_and_batsi',   'city_andros',  'batsi',           'Batsi'),
  ('area_and_gavrio',  'city_andros',  'gavrio',          'Gavrio'),
  ('area_and_apoik',   'city_andros',  'apoikia-stenies', 'Apoikia & Stenies'),

  ('area_sym_gialos',  'city_symi',    'gialos',          'Gialos (harbour)'),
  ('area_sym_chorio',  'city_symi',    'chorio',          'Chorio (upper town)'),
  ('area_sym_pedi',    'city_symi',    'pedi',            'Pedi bay'),
  ('area_sym_nimb',    'city_symi',    'nimborios',       'Nimborios'),

  ('area_pat_skala',   'city_patmos',  'skala',           'Skala'),
  ('area_pat_chora',   'city_patmos',  'chora',           'Chora'),
  ('area_pat_grikos',  'city_patmos',  'grikos',          'Grikos'),
  ('area_pat_kampos',  'city_patmos',  'kampos',          'Kampos'),

  ('area_aeg_town',    'city_aegina',  'aegina-town',     'Aegina Town'),
  ('area_aeg_perd',    'city_aegina',  'perdika',         'Perdika'),
  ('area_aeg_agmar',   'city_aegina',  'agia-marina',     'Agia Marina'),
  ('area_aeg_souv',    'city_aegina',  'souvala',         'Souvala'),

  ('area_les_myt',     'city_lesvos',  'mytilene',        'Mytilene'),
  ('area_les_mol',     'city_lesvos',  'molyvos',         'Molyvos (Mithymna)'),
  ('area_les_skala',   'city_lesvos',  'skala-eressou',   'Skala Eressou'),
  ('area_les_plom',    'city_lesvos',  'plomari',         'Plomari'),

  ('area_chi_town',    'city_chios',   'chios-town',      'Chios Town'),
  ('area_chi_kar',     'city_chios',   'karfas',          'Karfas'),
  ('area_chi_mesta',   'city_chios',   'mesta-pyrgi',     'Mesta & Pyrgi'),
  ('area_chi_kamp',    'city_chios',   'kampos',          'Kampos'),

  ('area_sam_vathy',   'city_samos',   'vathy',           'Vathy (Samos Town)'),
  ('area_sam_pyth',    'city_samos',   'pythagorio',      'Pythagorio'),
  ('area_sam_kok',     'city_samos',   'kokkari',         'Kokkari'),
  ('area_sam_man',     'city_samos',   'manolates-vourliotes', 'Manolates & Vourliotes'),

  ('area_par_rigaf',   'city_patras',  'riga-feraiou',    'Riga Feraiou & Trion Navarchon'),
  ('area_par_upper',   'city_patras',  'upper-town',      'Upper Town (Ano Poli)'),
  ('area_par_ware',    'city_patras',  'ano-koukouli',    'Warehouse district'),
  ('area_par_water',   'city_patras',  'waterfront',      'Patras waterfront'),

  ('area_ioa_lake',    'city_ioannina','lakefront',       'Lakefront (Molos)'),
  ('area_ioa_baz',     'city_ioannina','old-bazaar',      'Old Bazaar (Kastro back)'),
  ('area_ioa_anat',    'city_ioannina','anatoli',         'Anatoli (bouzoukia road)'),
  ('area_ioa_nisi',    'city_ioannina','nisi',            'Nisi (the island)');
