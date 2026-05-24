// Comprehensive Greek city inventory for citynight.gr.
//
// Goal: every Greek destination that has nightlife / food / stay relevance.
// Mainland regions + every inhabited island worth a guide page.
// Already in DB at the time of writing: 34 cities (listed in EXISTING_SLUGS).
//
// Schema per row:
//   slug      — URL slug (lowercase, ascii)
//   name      — English/default display name
//   region    — must match one of the canonical region strings in the
//               regions COPY maps in components/mega-menu.tsx and city-hero.tsx
//   lat, lng  — approximate centroid
//   names     — { el, de, fr, it } locale translations
//
// To keep this maintainable each row is a single line.

export const EXISTING_SLUGS = new Set([
  'athens','thessaloniki','heraklion','chania','rethymno',
  'mykonos','santorini','rhodes','corfu',
  'naxos','paros','ios','milos','tinos','andros','sifnos','kos','patmos','symi',
  'chios','lesvos','samos',
  'kefalonia','zakynthos','lefkada','skiathos',
  'ioannina','nafplio','patras',
  'aegina','hydra','spetses','halkidiki','loutraki',
]);

// rows roughly grouped by region. Order doesn't matter — it's all keyed by slug.
export const ALL_CITIES = [
  // ─── Attica / Saronic ───────────────────────────────────────────────────
  { slug: 'glyfada',        name: 'Glyfada',        region: 'Attica',           lat: 37.8633, lng: 23.7536, names: { el: 'Γλυφάδα',         de: 'Glyfada',         fr: 'Glyfada',         it: 'Glyfada' } },
  { slug: 'vouliagmeni',    name: 'Vouliagmeni',    region: 'Attica',           lat: 37.8154, lng: 23.7796, names: { el: 'Βουλιαγμένη',     de: 'Vouliagmeni',     fr: 'Vouliagmeni',     it: 'Vouliagmeni' } },
  { slug: 'piraeus',        name: 'Piraeus',        region: 'Attica',           lat: 37.9476, lng: 23.6356, names: { el: 'Πειραιάς',        de: 'Piräus',          fr: 'Le Pirée',        it: 'Pireo' } },
  { slug: 'sounion',        name: 'Sounion',        region: 'Attica',           lat: 37.6500, lng: 24.0264, names: { el: 'Σούνιο',          de: 'Sounion',         fr: 'Sounion',         it: 'Sunio' } },
  { slug: 'poros',          name: 'Poros',          region: 'Attica',           lat: 37.4986, lng: 23.4577, names: { el: 'Πόρος',           de: 'Poros',           fr: 'Poros',           it: 'Poros' } },
  { slug: 'kythira',        name: 'Kythira',        region: 'Attica',           lat: 36.2667, lng: 22.9833, names: { el: 'Κύθηρα',          de: 'Kythira',         fr: 'Cythère',         it: 'Citera' } },

  // ─── Peloponnese ────────────────────────────────────────────────────────
  { slug: 'korinthos',      name: 'Korinthos',      region: 'Peloponnese',      lat: 37.9410, lng: 22.9357, names: { el: 'Κόρινθος',        de: 'Korinth',         fr: 'Corinthe',        it: 'Corinto' } },
  { slug: 'kalamata',       name: 'Kalamata',       region: 'Peloponnese',      lat: 37.0388, lng: 22.1142, names: { el: 'Καλαμάτα',        de: 'Kalamata',        fr: 'Kalamata',        it: 'Calamata' } },
  { slug: 'olympia',        name: 'Olympia',        region: 'Peloponnese',      lat: 37.6453, lng: 21.6307, names: { el: 'Ολυμπία',         de: 'Olympia',         fr: 'Olympie',         it: 'Olimpia' } },
  { slug: 'sparta',         name: 'Sparta',         region: 'Peloponnese',      lat: 37.0833, lng: 22.4333, names: { el: 'Σπάρτη',          de: 'Sparta',          fr: 'Sparte',          it: 'Sparta' } },
  { slug: 'monemvasia',     name: 'Monemvasia',     region: 'Peloponnese',      lat: 36.6850, lng: 23.0556, names: { el: 'Μονεμβασιά',      de: 'Monemvasia',      fr: 'Monemvasia',      it: 'Monemvasia' } },
  { slug: 'methoni',        name: 'Methoni',        region: 'Peloponnese',      lat: 36.8197, lng: 21.7036, names: { el: 'Μεθώνη',          de: 'Methoni',         fr: 'Méthoni',         it: 'Methoni' } },
  { slug: 'koroni',         name: 'Koroni',         region: 'Peloponnese',      lat: 36.7944, lng: 21.9586, names: { el: 'Κορώνη',          de: 'Koroni',          fr: 'Koroni',          it: 'Coroni' } },
  { slug: 'pylos',          name: 'Pylos',          region: 'Peloponnese',      lat: 36.9133, lng: 21.6960, names: { el: 'Πύλος',           de: 'Pylos',           fr: 'Pylos',           it: 'Pilo' } },
  { slug: 'gythio',         name: 'Gythio',         region: 'Peloponnese',      lat: 36.7561, lng: 22.5663, names: { el: 'Γύθειο',          de: 'Gytheio',         fr: 'Gythio',          it: 'Githio' } },
  { slug: 'tripoli',        name: 'Tripoli',        region: 'Peloponnese',      lat: 37.5083, lng: 22.3781, names: { el: 'Τρίπολη',         de: 'Tripoli',         fr: 'Tripoli',         it: 'Tripoli' } },
  { slug: 'areopoli',       name: 'Areopoli',       region: 'Peloponnese',      lat: 36.6675, lng: 22.3850, names: { el: 'Αρεόπολη',        de: 'Areopoli',        fr: 'Aréopolis',       it: 'Areopoli' } },
  { slug: 'mystras',        name: 'Mystras',        region: 'Peloponnese',      lat: 37.0716, lng: 22.3713, names: { el: 'Μυστράς',         de: 'Mystras',         fr: 'Mistra',          it: 'Mistrà' } },
  { slug: 'nemea',          name: 'Nemea',          region: 'Peloponnese',      lat: 37.8125, lng: 22.7156, names: { el: 'Νεμέα',           de: 'Nemea',           fr: 'Némée',           it: 'Nemea' } },

  // ─── Central Greece (Sterea Ellada) ─────────────────────────────────────
  { slug: 'delphi',         name: 'Delphi',         region: 'Central Greece',   lat: 38.4824, lng: 22.5009, names: { el: 'Δελφοί',          de: 'Delphi',          fr: 'Delphes',         it: 'Delfi' } },
  { slug: 'arachova',       name: 'Arachova',       region: 'Central Greece',   lat: 38.4847, lng: 22.5867, names: { el: 'Αράχωβα',         de: 'Arachova',        fr: 'Aráchova',        it: 'Arachova' } },
  { slug: 'galaxidi',       name: 'Galaxidi',       region: 'Central Greece',   lat: 38.3776, lng: 22.3793, names: { el: 'Γαλαξίδι',        de: 'Galaxidi',        fr: 'Galaxidi',        it: 'Galaxidi' } },
  { slug: 'karpenisi',      name: 'Karpenisi',      region: 'Central Greece',   lat: 38.9133, lng: 21.7867, names: { el: 'Καρπενήσι',       de: 'Karpenisi',       fr: 'Karpenísi',       it: 'Karpenisi' } },
  { slug: 'chalkida',       name: 'Chalkida',       region: 'Central Greece',   lat: 38.4639, lng: 23.5953, names: { el: 'Χαλκίδα',         de: 'Chalkida',        fr: 'Chalcis',         it: 'Calcide' } },
  { slug: 'karystos',       name: 'Karystos',       region: 'Central Greece',   lat: 38.0162, lng: 24.4196, names: { el: 'Κάρυστος',        de: 'Karystos',        fr: 'Karystos',        it: 'Karystos' } },
  { slug: 'eretria',        name: 'Eretria',        region: 'Central Greece',   lat: 38.4015, lng: 23.7942, names: { el: 'Ερέτρια',         de: 'Eretria',         fr: 'Érétrie',         it: 'Eretria' } },
  { slug: 'loutra-edipsou', name: 'Loutra Edipsou', region: 'Central Greece',   lat: 38.8500, lng: 23.0500, names: { el: 'Λουτρά Αιδηψού',  de: 'Loutra Edipsou',  fr: 'Loutra Edipsou',  it: 'Loutra Edipsou' } },
  { slug: 'lamia',          name: 'Lamia',          region: 'Central Greece',   lat: 38.9000, lng: 22.4333, names: { el: 'Λαμία',           de: 'Lamia',           fr: 'Lamía',           it: 'Lamia' } },

  // ─── Thessaly ───────────────────────────────────────────────────────────
  { slug: 'volos',          name: 'Volos',          region: 'Thessaly',         lat: 39.3622, lng: 22.9420, names: { el: 'Βόλος',           de: 'Volos',           fr: 'Volos',           it: 'Volo' } },
  { slug: 'larissa',        name: 'Larissa',        region: 'Thessaly',         lat: 39.6390, lng: 22.4191, names: { el: 'Λάρισα',          de: 'Larisa',          fr: 'Larissa',         it: 'Larissa' } },
  { slug: 'trikala',        name: 'Trikala',        region: 'Thessaly',         lat: 39.5556, lng: 21.7679, names: { el: 'Τρίκαλα',         de: 'Trikala',         fr: 'Trikala',         it: 'Tricala' } },
  { slug: 'kalambaka',      name: 'Kalambaka',      region: 'Thessaly',         lat: 39.7053, lng: 21.6306, names: { el: 'Καλαμπάκα',       de: 'Kalambaka',       fr: 'Kalambáka',       it: 'Kalambaka' } },
  { slug: 'meteora',        name: 'Meteora',        region: 'Thessaly',         lat: 39.7217, lng: 21.6306, names: { el: 'Μετέωρα',         de: 'Meteora',         fr: 'Météores',        it: 'Meteore' } },
  { slug: 'pelion',         name: 'Pelion',         region: 'Thessaly',         lat: 39.4500, lng: 23.0500, names: { el: 'Πήλιο',           de: 'Pelion',          fr: 'Pélion',          it: 'Pelio' } },
  { slug: 'portaria',       name: 'Portaria',       region: 'Thessaly',         lat: 39.3911, lng: 23.0083, names: { el: 'Πορταριά',        de: 'Portaria',        fr: 'Portariá',        it: 'Portaria' } },
  { slug: 'skopelos',       name: 'Skopelos',       region: 'Thessaly',         lat: 39.1222, lng: 23.7269, names: { el: 'Σκόπελος',        de: 'Skopelos',        fr: 'Skópelos',        it: 'Skopelos' } },
  { slug: 'alonissos',      name: 'Alonissos',      region: 'Thessaly',         lat: 39.1456, lng: 23.8651, names: { el: 'Αλόννησος',       de: 'Alonissos',       fr: 'Alónissos',       it: 'Alonissos' } },
  { slug: 'skyros',         name: 'Skyros',         region: 'Thessaly',         lat: 38.9000, lng: 24.5667, names: { el: 'Σκύρος',          de: 'Skyros',          fr: 'Skýros',          it: 'Schiro' } },

  // ─── Epirus ─────────────────────────────────────────────────────────────
  { slug: 'parga',          name: 'Parga',          region: 'Epirus',           lat: 39.2842, lng: 20.4019, names: { el: 'Πάργα',           de: 'Parga',           fr: 'Parga',           it: 'Parga' } },
  { slug: 'preveza',        name: 'Preveza',        region: 'Epirus',           lat: 38.9560, lng: 20.7553, names: { el: 'Πρέβεζα',         de: 'Preveza',         fr: 'Préveza',         it: 'Prevesa' } },
  { slug: 'sivota',         name: 'Sivota',         region: 'Epirus',           lat: 39.4144, lng: 20.2453, names: { el: 'Σύβοτα',          de: 'Sivota',          fr: 'Sivota',          it: 'Sivota' } },
  { slug: 'arta',           name: 'Arta',           region: 'Epirus',           lat: 39.1611, lng: 20.9870, names: { el: 'Άρτα',            de: 'Arta',            fr: 'Árta',            it: 'Arta' } },
  { slug: 'zagori',         name: 'Zagori',         region: 'Epirus',           lat: 39.8833, lng: 20.7500, names: { el: 'Ζαγόρι',          de: 'Zagori',          fr: 'Zagori',          it: 'Zagori' } },
  { slug: 'metsovo',        name: 'Metsovo',        region: 'Epirus',           lat: 39.7728, lng: 21.1812, names: { el: 'Μέτσοβο',         de: 'Metsovo',         fr: 'Métsovo',         it: 'Metsovo' } },
  { slug: 'igoumenitsa',    name: 'Igoumenitsa',    region: 'Epirus',           lat: 39.5036, lng: 20.2622, names: { el: 'Ηγουμενίτσα',     de: 'Igoumenitsa',     fr: 'Igouménitsa',     it: 'Igumenitza' } },

  // ─── Central Macedonia (beyond Thessaloniki + Halkidiki) ────────────────
  { slug: 'edessa',         name: 'Edessa',         region: 'Central Macedonia', lat: 40.8000, lng: 22.0500, names: { el: 'Έδεσσα',          de: 'Edessa',          fr: 'Édessa',          it: 'Edessa' } },
  { slug: 'veria',          name: 'Veria',          region: 'Central Macedonia', lat: 40.5240, lng: 22.2010, names: { el: 'Βέροια',          de: 'Veria',           fr: 'Veria',           it: 'Veria' } },
  { slug: 'naoussa-imathia',name: 'Naoussa Imathia',region: 'Central Macedonia', lat: 40.6300, lng: 22.0700, names: { el: 'Νάουσα',          de: 'Naoussa',         fr: 'Naoussa',         it: 'Naussa' } },
  { slug: 'serres',         name: 'Serres',         region: 'Central Macedonia', lat: 41.0850, lng: 23.5478, names: { el: 'Σέρρες',          de: 'Serres',          fr: 'Serrès',          it: 'Serres' } },
  { slug: 'kilkis',         name: 'Kilkis',         region: 'Central Macedonia', lat: 40.9938, lng: 22.8744, names: { el: 'Κιλκίς',          de: 'Kilkis',          fr: 'Kilkís',          it: 'Kilkis' } },
  { slug: 'pella',          name: 'Pella',          region: 'Central Macedonia', lat: 40.7619, lng: 22.5234, names: { el: 'Πέλλα',           de: 'Pella',           fr: 'Pella',           it: 'Pella' } },

  // ─── Western Macedonia ──────────────────────────────────────────────────
  { slug: 'kastoria',       name: 'Kastoria',       region: 'Western Macedonia', lat: 40.5167, lng: 21.2667, names: { el: 'Καστοριά',        de: 'Kastoria',        fr: 'Kastoriá',        it: 'Castoria' } },
  { slug: 'florina',        name: 'Florina',        region: 'Western Macedonia', lat: 40.7833, lng: 21.4097, names: { el: 'Φλώρινα',         de: 'Florina',         fr: 'Flórina',         it: 'Florina' } },
  { slug: 'kozani',         name: 'Kozani',         region: 'Western Macedonia', lat: 40.3000, lng: 21.7833, names: { el: 'Κοζάνη',          de: 'Kozani',          fr: 'Kozáni',          it: 'Cozani' } },
  { slug: 'grevena',        name: 'Grevena',        region: 'Western Macedonia', lat: 40.0828, lng: 21.4275, names: { el: 'Γρεβενά',         de: 'Grevena',         fr: 'Grevená',         it: 'Grevena' } },

  // ─── Eastern Macedonia & Thrace ─────────────────────────────────────────
  { slug: 'kavala',         name: 'Kavala',         region: 'East Macedonia & Thrace', lat: 40.9333, lng: 24.4000, names: { el: 'Καβάλα',          de: 'Kavala',          fr: 'Kavala',          it: 'Cavala' } },
  { slug: 'drama',          name: 'Drama',          region: 'East Macedonia & Thrace', lat: 41.1500, lng: 24.1500, names: { el: 'Δράμα',           de: 'Drama',           fr: 'Drama',           it: 'Drama' } },
  { slug: 'xanthi',         name: 'Xanthi',         region: 'East Macedonia & Thrace', lat: 41.1417, lng: 24.8867, names: { el: 'Ξάνθη',           de: 'Xanthi',          fr: 'Xánthi',          it: 'Xanthi' } },
  { slug: 'komotini',       name: 'Komotini',       region: 'East Macedonia & Thrace', lat: 41.1167, lng: 25.4000, names: { el: 'Κομοτηνή',        de: 'Komotini',        fr: 'Komotiní',        it: 'Comotini' } },
  { slug: 'alexandroupolis',name: 'Alexandroupolis',region: 'East Macedonia & Thrace', lat: 40.8458, lng: 25.8742, names: { el: 'Αλεξανδρούπολη',  de: 'Alexandroupoli',  fr: 'Alexandroúpoli',  it: 'Alessandropoli' } },

  // ─── Cyclades (more) ────────────────────────────────────────────────────
  { slug: 'antiparos',      name: 'Antiparos',      region: 'South Aegean',     lat: 36.9833, lng: 25.0833, names: { el: 'Αντίπαρος',       de: 'Antiparos',       fr: 'Antíparos',       it: 'Antiparos' } },
  { slug: 'folegandros',    name: 'Folegandros',    region: 'South Aegean',     lat: 36.6219, lng: 24.9111, names: { el: 'Φολέγανδρος',     de: 'Folegandros',     fr: 'Folégandros',     it: 'Folegandros' } },
  { slug: 'kea',            name: 'Kea',            region: 'South Aegean',     lat: 37.6167, lng: 24.3333, names: { el: 'Κέα (Τζια)',      de: 'Kea',             fr: 'Kéa',             it: 'Cea' } },
  { slug: 'kythnos',        name: 'Kythnos',        region: 'South Aegean',     lat: 37.4081, lng: 24.4119, names: { el: 'Κύθνος',          de: 'Kythnos',         fr: 'Kýthnos',         it: 'Citno' } },
  { slug: 'serifos',        name: 'Serifos',        region: 'South Aegean',     lat: 37.1500, lng: 24.4944, names: { el: 'Σέριφος',         de: 'Serifos',         fr: 'Sérifos',         it: 'Serifos' } },
  { slug: 'anafi',          name: 'Anafi',          region: 'South Aegean',     lat: 36.3617, lng: 25.7711, names: { el: 'Ανάφη',           de: 'Anafi',           fr: 'Anáfi',           it: 'Anafi' } },
  { slug: 'amorgos',        name: 'Amorgos',        region: 'South Aegean',     lat: 36.8333, lng: 25.9000, names: { el: 'Αμοργός',         de: 'Amorgos',         fr: 'Amorgos',         it: 'Amorgos' } },
  { slug: 'koufonisia',     name: 'Koufonisia',     region: 'South Aegean',     lat: 36.9333, lng: 25.5833, names: { el: 'Κουφονήσια',      de: 'Koufonisia',      fr: 'Koufonísia',      it: 'Cufonisia' } },
  { slug: 'sikinos',        name: 'Sikinos',        region: 'South Aegean',     lat: 36.6856, lng: 25.1411, names: { el: 'Σίκινος',         de: 'Sikinos',         fr: 'Síkinos',         it: 'Sikinos' } },

  // ─── Dodecanese (more) ──────────────────────────────────────────────────
  { slug: 'kalymnos',       name: 'Kalymnos',       region: 'South Aegean',     lat: 36.9500, lng: 26.9833, names: { el: 'Κάλυμνος',        de: 'Kalymnos',        fr: 'Kálymnos',        it: 'Calino' } },
  { slug: 'karpathos',      name: 'Karpathos',      region: 'South Aegean',     lat: 35.5089, lng: 27.2147, names: { el: 'Κάρπαθος',        de: 'Karpathos',       fr: 'Kárpathos',       it: 'Carpazi' } },
  { slug: 'astypalea',      name: 'Astypalea',      region: 'South Aegean',     lat: 36.5475, lng: 26.3503, names: { el: 'Αστυπάλαια',      de: 'Astypalea',       fr: 'Astypálea',       it: 'Astipalea' } },
  { slug: 'leros',          name: 'Leros',          region: 'South Aegean',     lat: 37.1500, lng: 26.8500, names: { el: 'Λέρος',           de: 'Leros',           fr: 'Léros',           it: 'Lero' } },
  { slug: 'nisyros',        name: 'Nisyros',        region: 'South Aegean',     lat: 36.6000, lng: 27.1500, names: { el: 'Νίσυρος',         de: 'Nisyros',         fr: 'Nísyros',         it: 'Nisiro' } },
  { slug: 'tilos',          name: 'Tilos',          region: 'South Aegean',     lat: 36.4500, lng: 27.3833, names: { el: 'Τήλος',           de: 'Tilos',           fr: 'Tílos',           it: 'Tilo' } },
  { slug: 'kasos',          name: 'Kasos',          region: 'South Aegean',     lat: 35.3933, lng: 26.9203, names: { el: 'Κάσος',           de: 'Kasos',           fr: 'Kásos',           it: 'Caso' } },
  { slug: 'halki',          name: 'Halki',          region: 'South Aegean',     lat: 36.2294, lng: 27.6058, names: { el: 'Χάλκη',           de: 'Halki',           fr: 'Hálki',           it: 'Calki' } },
  { slug: 'lipsi',          name: 'Lipsi',          region: 'South Aegean',     lat: 37.3000, lng: 26.7667, names: { el: 'Λειψοί',          de: 'Lipsi',           fr: 'Lipsí',           it: 'Lipsi' } },
  { slug: 'kastellorizo',   name: 'Kastellorizo',   region: 'South Aegean',     lat: 36.1444, lng: 29.5856, names: { el: 'Καστελλόριζο',    de: 'Kastellorizo',    fr: 'Kastellórizo',    it: 'Castelrosso' } },

  // ─── North Aegean (more) ────────────────────────────────────────────────
  { slug: 'limnos',         name: 'Limnos',         region: 'North Aegean',     lat: 39.9167, lng: 25.2500, names: { el: 'Λήμνος',          de: 'Limnos',          fr: 'Límnos',          it: 'Lemno' } },
  { slug: 'ikaria',         name: 'Ikaria',         region: 'North Aegean',     lat: 37.6122, lng: 26.1564, names: { el: 'Ικαρία',          de: 'Ikaria',          fr: 'Ikaría',          it: 'Icaria' } },
  { slug: 'fournoi',        name: 'Fournoi',        region: 'North Aegean',     lat: 37.5808, lng: 26.4811, names: { el: 'Φούρνοι',         de: 'Fourni',          fr: 'Fournoi',         it: 'Fournoi' } },
  { slug: 'thasos',         name: 'Thasos',         region: 'North Aegean',     lat: 40.7833, lng: 24.7167, names: { el: 'Θάσος',           de: 'Thasos',          fr: 'Thásos',          it: 'Taso' } },
  { slug: 'samothraki',     name: 'Samothraki',     region: 'North Aegean',     lat: 40.4825, lng: 25.5267, names: { el: 'Σαμοθράκη',       de: 'Samothraki',      fr: 'Samothrace',      it: 'Samotracia' } },

  // ─── Ionian (more) ──────────────────────────────────────────────────────
  { slug: 'paxos',          name: 'Paxos',          region: 'Ionian Islands',   lat: 39.2000, lng: 20.1833, names: { el: 'Παξοί',           de: 'Paxos',           fr: 'Paxos',           it: 'Passo' } },
  { slug: 'antipaxos',      name: 'Antipaxos',      region: 'Ionian Islands',   lat: 39.1500, lng: 20.2333, names: { el: 'Αντίπαξοι',       de: 'Antipaxos',       fr: 'Antípaxos',       it: 'Antipaxos' } },
  { slug: 'ithaca',         name: 'Ithaca',         region: 'Ionian Islands',   lat: 38.4419, lng: 20.6608, names: { el: 'Ιθάκη',           de: 'Ithaka',          fr: 'Ithaque',         it: 'Itaca' } },

  // ─── Crete (more) ───────────────────────────────────────────────────────
  { slug: 'agios-nikolaos', name: 'Agios Nikolaos', region: 'Crete',            lat: 35.1900, lng: 25.7150, names: { el: 'Άγιος Νικόλαος',  de: 'Agios Nikolaos',  fr: 'Aghios Nikólaos', it: 'Agios Nikolaos' } },
  { slug: 'elounda',        name: 'Elounda',        region: 'Crete',            lat: 35.2667, lng: 25.7333, names: { el: 'Ελούντα',         de: 'Elounda',         fr: 'Eloúnda',         it: 'Elounda' } },
  { slug: 'sitia',          name: 'Sitia',          region: 'Crete',            lat: 35.2069, lng: 26.1031, names: { el: 'Σητεία',          de: 'Sitia',           fr: 'Sitía',           it: 'Sitia' } },
  { slug: 'ierapetra',      name: 'Ierapetra',      region: 'Crete',            lat: 35.0118, lng: 25.7414, names: { el: 'Ιεράπετρα',       de: 'Ierapetra',       fr: 'Ierápetra',       it: 'Ierapetra' } },
  { slug: 'matala',         name: 'Matala',         region: 'Crete',            lat: 34.9933, lng: 24.7464, names: { el: 'Μάταλα',          de: 'Matala',          fr: 'Mátala',          it: 'Matala' } },
  { slug: 'paleochora',     name: 'Paleochora',     region: 'Crete',            lat: 35.2350, lng: 23.6772, names: { el: 'Παλαιόχωρα',      de: 'Paleochora',      fr: 'Paleochóra',      it: 'Paleochora' } },
];
