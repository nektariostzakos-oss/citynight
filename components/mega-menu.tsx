'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Locale } from '@/lib/i18n';
import { useNearbyCities, type CityWithDistance } from './nearby-cities-context';
import { useVisitorLocation } from './visitor-location-provider';
import { formatDistanceKm, haversineKm } from '@/lib/geo-distance';
import { MoonIcon, ForkKnifeIcon, BedIcon, MapPinIcon } from './nav-icons';

// Phase K.7 — live pulse data piped from the server component
// (site-header.tsx) into the dropdown. Athens timezone for the clock,
// Athens-area weather for the strip, and the single freshest published
// article for the "Just published" card.
export type MegaMenuPulse = {
  athensTime: string;
  weather: { tempC: number; emoji: string; label: string } | null;
  latestArticle: {
    title: string;
    url: string;
    cityName: string;
    coverUrl: string | null;
  } | null;
  /** All seeded areas (neighborhoods) with coords + parent city info.
   * Used by the menu's "Popular areas" column to sort by distance from
   * the visitor's GPS position client-side. */
  areas: Array<{
    slug: string;
    name: string;
    lat: number;
    lng: number;
    cityName: string;
    citySlug: string;
  }>;
  /** Pre-fetched current weather for headline destinations. Surfaces
   * in the menu's third column as a "Live across Greece" strip when
   * there's no fresh article to feature. Each row is 15-min cached
   * server-side via getCityWeather; the parallel fetch is one
   * round-trip per ISR window across all visitors. */
  destinations: Array<{
    citySlug: string;
    cityName: string;
    tempC: number | null;
    emoji: string | null;
  }>;
};

// Futuristic mega menu: hover (desktop) / click (mobile) opens a full-width
// glassmorphic panel below the header. The Cities panel groups cities by
// region; Nightlife/Food/Stay panels link to the verticals + the categories
// inside. Every panel surfaces a "Near you" section at the top when the
// VisitorLocationProvider has resolved the IP — populated from
// NearbyCitiesContext, so the math runs once and is shared.
//
// SEO note: every link visible inside the menu is a normal <a>; Googlebot sees
// all of them regardless of which panel is open. We don't hide content with
// display:none in a way that hurts crawling — the panels are CSS-translated
// off-screen until shown, but their markup is in the DOM.

type Vertical = 'cities' | 'nightlife' | 'food' | 'stay';

type ItemDef = { key: Vertical; label: string; icon: React.ReactNode; accent: AccentKey };
type AccentKey = 'cyan' | 'pink' | 'amber' | 'violet';

const ACCENT: Record<AccentKey, { ring: string; text: string; border: string }> = {
  cyan:   { ring: 'shadow-[var(--shadow-glow-cyan)]',   text: 'text-[var(--color-accent-cyan)]',   border: 'border-[var(--color-accent-cyan)]/40' },
  pink:   { ring: 'shadow-[var(--shadow-glow-pink)]',   text: 'text-[var(--color-accent-pink)]',   border: 'border-[var(--color-accent-pink)]/40' },
  amber:  { ring: '',                                   text: 'text-[var(--color-accent-amber)]',  border: 'border-[var(--color-accent-amber)]/40' },
  violet: { ring: 'shadow-[var(--shadow-glow-violet)]', text: 'text-[var(--color-accent-violet)]', border: 'border-[var(--color-accent-violet)]/40' },
};

const VERTICAL_COPY: Record<Locale, Record<Vertical, { tagline: string }>> = {
  en: {
    cities:    { tagline: 'Every island, every avenue.' },
    nightlife: { tagline: 'Clubs, rooftops, bouzoukia, beach clubs.' },
    food:      { tagline: 'Tavernas, mezedopoleia and modern Greek tables.' },
    stay:      { tagline: 'Boutique stays, beach resorts, design villas.' },
  },
  el: {
    cities:    { tagline: 'Κάθε νησί, κάθε δρόμος.' },
    nightlife: { tagline: 'Κλαμπ, ρουφ-τοπ, μπουζούκια, beach clubs.' },
    food:      { tagline: 'Ταβέρνες, μεζεδοπωλεία, σύγχρονη κουζίνα.' },
    stay:      { tagline: 'Boutique, beach resorts, design βίλες.' },
  },
  de: {
    cities:    { tagline: 'Jede Insel, jede Straße.' },
    nightlife: { tagline: 'Clubs, Rooftops, Bouzoukia, Beachclubs.' },
    food:      { tagline: 'Tavernen, Mezedopoleia, moderne griechische Küche.' },
    stay:      { tagline: 'Boutique-Hotels, Strandresorts, Design-Villen.' },
  },
  fr: {
    cities:    { tagline: 'Chaque île, chaque rue.' },
    nightlife: { tagline: 'Clubs, rooftops, bouzoukia, beach clubs.' },
    food:      { tagline: 'Tavernes, mezedopoleia, cuisine grecque moderne.' },
    stay:      { tagline: 'Boutiques, resorts plage, villas design.' },
  },
  it: {
    cities:    { tagline: 'Ogni isola, ogni via.' },
    nightlife: { tagline: 'Club, rooftop, bouzoukia, beach club.' },
    food:      { tagline: 'Taverne, mezedopoleia, cucina greca moderna.' },
    stay:      { tagline: 'Boutique, resort, ville di design.' },
  },
};

type CopyShape = {
  nearYou: (city: string | null) => string;
  enable: string;
  viewAll: string;
  viewAllN: (n: number) => string;
  popular: string;
  byRegion: string;
  ownersBlurb: string;
  regions: Record<string, string>;
  categoryHeading: string;
  preciseCta: string;        // small upgrade-to-GPS pill (shown when source='ip')
  preciseLoading: string;    // shown while waiting on permission / GPS fix
  preciseDeniedNote: string; // shown once after the user denies the permission
  preciseActive: string;     // little "✓ precise" chip when source='precise'
  // Phase K.7 — smart mega-menu strings
  tonightInGreece: string;
  filterPlaceholder: string;
  filterEmpty: string;
  justPublished: string;
  popularAreas: string;
  areasEmpty: string;
  liveAcrossGreece: string;
};

const COMMON_COPY: Record<Locale, CopyShape> = {
  en: {
    nearYou: (c) => c ? `Near you · ${c}` : 'Near you',
    enable: 'Detecting your location…',
    viewAll: 'View all', viewAllN: (n) => `View all ${n} cities`,
    popular: 'Popular cities', byRegion: 'Browse by region',
    ownersBlurb: 'Run a venue? Claim it.',
    regions: { 'Attica': 'Attica', 'South Aegean': 'Cyclades & Dodecanese', 'North Aegean': 'North Aegean', 'Crete': 'Crete', 'Ionian Islands': 'Ionian', 'Central Macedonia': 'Macedonia', 'Peloponnese': 'Peloponnese', 'Epirus': 'Epirus', 'Thessaly': 'Sporades & Thessaly' },
    categoryHeading: 'Browse by category',
    preciseCta: 'Use precise location',
    preciseLoading: 'Getting GPS fix…',
    preciseDeniedNote: 'Location permission denied — using IP only.',
    preciseActive: '✓ Precise',
    tonightInGreece: 'Tonight in Greece',
    filterPlaceholder: 'Filter cities…',
    filterEmpty: 'No cities match.',
    justPublished: 'Just published',
    popularAreas: 'Popular areas',
    areasEmpty: 'No neighborhoods seeded yet.',
    liveAcrossGreece: 'Live across Greece',
  },
  el: {
    nearYou: (c) => c ? `Κοντά σου · ${c}` : 'Κοντά σου',
    enable: 'Εντοπίζουμε την τοποθεσία σου…',
    viewAll: 'Δες όλες', viewAllN: (n) => `Δες όλες τις ${n} πόλεις`,
    popular: 'Δημοφιλείς πόλεις', byRegion: 'Ανά περιοχή',
    ownersBlurb: 'Έχεις μαγαζί; Κάνε claim.',
    regions: { 'Attica': 'Αττική', 'South Aegean': 'Κυκλάδες & Δωδεκάνησα', 'North Aegean': 'Βόρειο Αιγαίο', 'Crete': 'Κρήτη', 'Ionian Islands': 'Ιόνιο', 'Central Macedonia': 'Μακεδονία', 'Peloponnese': 'Πελοπόννησος', 'Epirus': 'Ήπειρος', 'Thessaly': 'Σποράδες & Θεσσαλία' },
    categoryHeading: 'Ανά κατηγορία',
    preciseCta: 'Ακριβής τοποθεσία',
    preciseLoading: 'Λαμβάνουμε GPS…',
    preciseDeniedNote: 'Άρνηση πρόσβασης — χρησιμοποιούμε IP μόνο.',
    preciseActive: '✓ Ακριβής',
    tonightInGreece: 'Απόψε στην Ελλάδα',
    filterPlaceholder: 'Φίλτρο πόλεων…',
    filterEmpty: 'Καμία πόλη δεν ταιριάζει.',
    justPublished: 'Μόλις δημοσιεύτηκε',
    popularAreas: 'Δημοφιλείς περιοχές',
    areasEmpty: 'Δεν υπάρχουν ακόμα γειτονιές.',
    liveAcrossGreece: 'Live από όλη την Ελλάδα',
  },
  de: {
    nearYou: (c) => c ? `In deiner Nähe · ${c}` : 'In deiner Nähe',
    enable: 'Standort wird erkannt…',
    viewAll: 'Alle ansehen', viewAllN: (n) => `Alle ${n} Städte ansehen`,
    popular: 'Beliebte Städte', byRegion: 'Nach Region',
    ownersBlurb: 'Betreibst du eine Location? Beanspruche sie.',
    regions: { 'Attica': 'Attika', 'South Aegean': 'Kykladen & Dodekanes', 'North Aegean': 'Nordägäis', 'Crete': 'Kreta', 'Ionian Islands': 'Ionische Inseln', 'Central Macedonia': 'Makedonien', 'Peloponnese': 'Peloponnes', 'Epirus': 'Epirus', 'Thessaly': 'Sporaden & Thessalien' },
    categoryHeading: 'Nach Kategorie',
    preciseCta: 'Genauer Standort',
    preciseLoading: 'GPS wird abgefragt…',
    preciseDeniedNote: 'Standortzugriff verweigert — nur IP.',
    preciseActive: '✓ Genau',
    tonightInGreece: 'Heute in Griechenland',
    filterPlaceholder: 'Städte filtern…',
    filterEmpty: 'Keine Städte gefunden.',
    justPublished: 'Gerade veröffentlicht',
    popularAreas: 'Beliebte Viertel',
    areasEmpty: 'Noch keine Viertel.',
    liveAcrossGreece: 'Live aus ganz Griechenland',
  },
  fr: {
    nearYou: (c) => c ? `Près de vous · ${c}` : 'Près de vous',
    enable: 'Détection de votre position…',
    viewAll: 'Voir tout', viewAllN: (n) => `Voir les ${n} villes`,
    popular: 'Villes populaires', byRegion: 'Par région',
    ownersBlurb: 'Vous tenez un lieu ? Revendiquez-le.',
    regions: { 'Attica': 'Attique', 'South Aegean': 'Cyclades & Dodécanèse', 'North Aegean': 'Égée du Nord', 'Crete': 'Crète', 'Ionian Islands': 'Îles ioniennes', 'Central Macedonia': 'Macédoine', 'Peloponnese': 'Péloponnèse', 'Epirus': 'Épire', 'Thessaly': 'Sporades & Thessalie' },
    categoryHeading: 'Par catégorie',
    preciseCta: 'Position précise',
    preciseLoading: 'Acquisition GPS…',
    preciseDeniedNote: 'Permission refusée — IP uniquement.',
    preciseActive: '✓ Précis',
    tonightInGreece: 'Ce soir en Grèce',
    filterPlaceholder: 'Filtrer les villes…',
    filterEmpty: 'Aucune ville trouvée.',
    justPublished: 'Vient de paraître',
    popularAreas: 'Quartiers populaires',
    areasEmpty: 'Aucun quartier encore.',
    liveAcrossGreece: 'En direct de toute la Grèce',
  },
  it: {
    nearYou: (c) => c ? `Vicino a te · ${c}` : 'Vicino a te',
    enable: 'Rilevamento posizione in corso…',
    viewAll: 'Vedi tutte', viewAllN: (n) => `Vedi tutte le ${n} città`,
    popular: 'Città popolari', byRegion: 'Per regione',
    ownersBlurb: 'Gestisci un locale? Rivendica.',
    regions: { 'Attica': 'Attica', 'South Aegean': 'Cicladi & Dodecaneso', 'North Aegean': 'Egeo Settentrionale', 'Crete': 'Creta', 'Ionian Islands': 'Isole Ionie', 'Central Macedonia': 'Macedonia', 'Peloponnese': 'Peloponneso', 'Epirus': 'Epiro', 'Thessaly': 'Sporadi & Tessaglia' },
    categoryHeading: 'Per categoria',
    preciseCta: 'Posizione precisa',
    preciseLoading: 'GPS in corso…',
    preciseDeniedNote: 'Permesso negato — solo IP.',
    preciseActive: '✓ Preciso',
    tonightInGreece: 'Stasera in Grecia',
    filterPlaceholder: 'Filtra città…',
    filterEmpty: 'Nessuna città trovata.',
    justPublished: 'Appena pubblicato',
    popularAreas: 'Zone popolari',
    areasEmpty: 'Nessun quartiere ancora.',
    liveAcrossGreece: 'Live da tutta la Grecia',
  },
};

const CATEGORY_SETS: Record<Exclude<Vertical, 'cities'>, { slug: string; label: Record<Locale, string> }[]> = {
  nightlife: [
    { slug: 'night-club',  label: { en: 'Night clubs',    el: 'Κλαμπ',      de: 'Clubs',          fr: 'Clubs',           it: 'Club' } },
    { slug: 'bar',         label: { en: 'Bars',           el: 'Μπαρ',        de: 'Bars',           fr: 'Bars',            it: 'Bar' } },
    { slug: 'rooftop-bar', label: { en: 'Rooftop bars',   el: 'Rooftop',    de: 'Rooftop-Bars',   fr: 'Rooftops',        it: 'Rooftop' } },
    { slug: 'live-music',  label: { en: 'Live music',     el: 'Live μουσική', de: 'Live-Musik',   fr: 'Concerts',        it: 'Musica live' } },
    { slug: 'bouzoukia',   label: { en: 'Bouzoukia',      el: 'Μπουζούκια', de: 'Bouzoukia',      fr: 'Bouzoukia',       it: 'Bouzoukia' } },
    { slug: 'beach-club',  label: { en: 'Beach clubs',    el: 'Beach club', de: 'Beachclubs',     fr: 'Beach clubs',     it: 'Beach club' } },
  ],
  food: [
    { slug: 'taverna',     label: { en: 'Tavernas',       el: 'Ταβέρνες',   de: 'Tavernen',       fr: 'Tavernes',        it: 'Taverne' } },
    { slug: 'restaurant',  label: { en: 'Restaurants',    el: 'Εστιατόρια', de: 'Restaurants',    fr: 'Restaurants',     it: 'Ristoranti' } },
    { slug: 'fine-dining', label: { en: 'Fine dining',    el: 'Fine dining',de: 'Feinküche',      fr: 'Fine dining',     it: 'Fine dining' } },
  ],
  stay: [
    { slug: 'hotel',           label: { en: 'Hotels',         el: 'Ξενοδοχεία',     de: 'Hotels',          fr: 'Hôtels',         it: 'Hotel' } },
    { slug: 'boutique-hotel',  label: { en: 'Boutique hotels',el: 'Boutique',       de: 'Boutique-Hotels', fr: 'Hôtels boutique',it: 'Boutique' } },
    { slug: 'resort',          label: { en: 'Resorts',        el: 'Resorts',        de: 'Resorts',         fr: 'Resorts',        it: 'Resort' } },
  ],
};

function items(locale: Locale): ItemDef[] {
  // Phase K.3 — top nav collapses to a single Cities dropdown. The old
  // Nightlife / Food / Stay verticals listed categories (rooftop-bar,
  // nightclub, etc.), which no longer have their own URLs in the
  // article-led model — verticals are filters surfaced inside each
  // city's article guide instead.
  const base: ItemDef[] = [
    { key: 'cities', label: 'Cities', icon: <MapPinIcon />, accent: 'cyan' },
  ];
  return base.map((i) => ({ ...i, label: localLabel(locale, i.key) }));
}

function localLabel(locale: Locale, key: Vertical): string {
  const labels: Record<Vertical, Record<Locale, string>> = {
    cities:    { en: 'Cities',    el: 'Πόλεις',   de: 'Städte',  fr: 'Villes',     it: 'Città' },
    nightlife: { en: 'Nightlife', el: 'Νυχτερινή',de: 'Nachtleben', fr: 'Vie nocturne', it: 'Vita notturna' },
    food:      { en: 'Food',      el: 'Φαγητό',   de: 'Essen',   fr: 'Cuisine',    it: 'Cucina' },
    stay:      { en: 'Stay',      el: 'Διαμονή',  de: 'Übernachten', fr: 'Hébergement', it: 'Alloggio' },
  };
  return labels[key][locale];
}

export function MegaMenu({ locale, pulse }: { locale: Locale; pulse?: MegaMenuPulse }) {
  const [open, setOpen] = useState<Vertical | null>(null);
  const closeTimer = useRef<number | null>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const nav = items(locale);
  const c = COMMON_COPY[locale];
  const { hasLocation, visitor, nearestCities, sortedAllCities } = useNearbyCities();

  // Close menu on Escape and on click outside.
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(null); }
    function onClick(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpen(null);
    }
    window.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => { window.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onClick); };
  }, []);

  function hoverOpen(key: Vertical) {
    if (closeTimer.current) { window.clearTimeout(closeTimer.current); closeTimer.current = null; }
    setOpen(key);
  }
  function hoverClose() {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpen(null), 120);
  }

  return (
    <div ref={navRef} className="hidden flex-1 justify-center md:flex" onMouseLeave={hoverClose}>
      <nav aria-label="Primary" className="relative">
        <ul className="flex items-center gap-1 rounded-full border border-[var(--color-bg-3)] bg-[var(--color-bg-1)]/60 p-1 backdrop-blur-xl">
          {nav.map((n) => {
            const isOpen = open === n.key;
            return (
              <li key={n.key}>
                <button
                  type="button"
                  onMouseEnter={() => hoverOpen(n.key)}
                  onFocus={() => hoverOpen(n.key)}
                  onClick={() => setOpen(isOpen ? null : n.key)}
                  aria-expanded={isOpen}
                  aria-haspopup="true"
                  className={`group flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition ${
                    isOpen ? `${ACCENT[n.accent].text} bg-[var(--color-bg-2)]` : 'text-[var(--color-fg-1)]'
                  }`}
                >
                  <span className={`${isOpen ? ACCENT[n.accent].text : 'text-[var(--color-fg-2)]'}`}>{n.icon}</span>
                  <span>{n.label}</span>
                  {/* Live pulse — animated ping next to the label so
                      the nav reads "alive". Hidden when the dropdown
                      is open (the strip inside takes over the live cue). */}
                  {!isOpen && (
                    <span aria-hidden className="relative ml-0.5 inline-flex h-1.5 w-1.5">
                      <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${ACCENT[n.accent].text.replace('text-', 'bg-')} opacity-70`} />
                      <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${ACCENT[n.accent].text.replace('text-', 'bg-')}`} />
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        {/* Panel */}
        <div
          className={`absolute left-1/2 top-full z-50 mt-2 w-[min(1024px,92vw)] -translate-x-1/2 transition duration-200 ${
            open ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none -translate-y-2 opacity-0'
          }`}
          onMouseEnter={() => open && hoverOpen(open)}
        >
          <div className="overflow-hidden rounded-2xl border border-[var(--color-bg-3)] bg-[color-mix(in_oklab,var(--color-bg-1)_92%,transparent)] shadow-2xl backdrop-blur-2xl">
            {open === 'cities'    && <CitiesPanel    locale={locale} c={c} cities={sortedAllCities} nearest={nearestCities} hasLocation={hasLocation} visitorCity={visitor?.city ?? null} pulse={pulse} />}
            {open === 'nightlife' && <VerticalPanel  locale={locale} c={c} kind="nightlife" accent="pink"   nearest={nearestCities} hasLocation={hasLocation} visitorCity={visitor?.city ?? null} />}
            {open === 'food'      && <VerticalPanel  locale={locale} c={c} kind="food"      accent="cyan"   nearest={nearestCities} hasLocation={hasLocation} visitorCity={visitor?.city ?? null} />}
            {open === 'stay'      && <VerticalPanel  locale={locale} c={c} kind="stay"      accent="violet" nearest={nearestCities} hasLocation={hasLocation} visitorCity={visitor?.city ?? null} />}
          </div>
        </div>
      </nav>
    </div>
  );
}

// Curated "popular" set — these are the 10 cities that pull the bulk of
// organic search intent. Order is the editorial display order, not
// alphabetical. If the visitor has a location, the Near-you column carries
// the contextual list; this stays the universal browse path.
const POPULAR_CITY_SLUGS = [
  'athens', 'mykonos', 'santorini', 'thessaloniki', 'rhodes',
  'heraklion', 'corfu', 'chania', 'nafplio', 'paros',
];

function CitiesPanel({ locale, c, cities, nearest, hasLocation, visitorCity, pulse }: {
  locale: Locale;
  c: CopyShape;
  cities: CityWithDistance[];
  nearest: CityWithDistance[];
  hasLocation: boolean;
  visitorCity: string | null;
  pulse?: MegaMenuPulse;
}) {
  // Phase K.7 — smart filter. Type to narrow the cities list to a
  // single match-as-you-type column. When the filter is empty, the
  // panel shows the rich 3-column layout (Near you / Popular /
  // Regions). When filtering, we collapse to a single result column
  // so visitors can find any of the ~20 cities in one keystroke.
  const [filter, setFilter] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset filter when the dropdown closes/reopens. (The parent
  // unmounts/remounts CitiesPanel on each open, so this just runs
  // once per mount — autofocus the input on open.)
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const filtered = useMemo(() => {
    if (!filter.trim()) return [];
    const q = filter.trim().toLowerCase();
    return cities.filter((city) => city.name.toLowerCase().includes(q) || city.slug.includes(q)).slice(0, 12);
  }, [cities, filter]);

  const bySlug = new Map(cities.map((city) => [city.slug, city]));
  const popular = POPULAR_CITY_SLUGS.map((slug) => bySlug.get(slug)).filter(Boolean) as CityWithDistance[];

  return (
    <div className="relative">
      {/* Neon edge — subtle gradient strip across the top of the panel. */}
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--color-accent-cyan)]/60 to-transparent" />

      {/* ── Live status strip — Tonight in Greece · 23:00 · 22° Clear ─ */}
      <PulseStrip pulse={pulse} locale={locale} />

      {/* ── Smart filter input ────────────────────────────────────── */}
      <div className="border-b border-[var(--color-bg-2)]/60 px-6 py-3">
        <div className="relative">
          <span aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-fg-3)]">⌕</span>
          <input
            ref={inputRef}
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={COMMON_COPY[locale].filterPlaceholder ?? 'Filter…'}
            className="w-full rounded-lg border border-[var(--color-bg-3)] bg-[var(--color-bg-0)]/50 py-2 pl-9 pr-3 text-sm text-[var(--color-fg-0)] placeholder:text-[var(--color-fg-3)] focus:border-[var(--color-accent-cyan)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-cyan)]/20"
            aria-label={COMMON_COPY[locale].filterPlaceholder ?? 'Filter cities'}
          />
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────── */}
      {filtered.length > 0 ? (
        <FilteredCitiesGrid locale={locale} cities={filtered} hasLocation={hasLocation} />
      ) : (
        <div className="grid gap-6 p-6 md:grid-cols-3">
          <div className="md:col-span-1">
            <NearYouStrip locale={locale} c={c} nearest={nearest} hasLocation={hasLocation} visitorCity={visitorCity} accent="cyan" />
          </div>

          <div className="md:col-span-1">
            <PopularAreas locale={locale} c={c} areas={pulse?.areas ?? []} />
          </div>

          <div className="md:col-span-1">
            {pulse?.latestArticle ? (
              <LatestArticleCard locale={locale} article={pulse.latestArticle} />
            ) : (
              <LiveDestinations locale={locale} c={c} destinations={pulse?.destinations ?? []} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Live pulse strip ───────────────────────────────────────────────

function PulseStrip({ pulse, locale }: { pulse?: MegaMenuPulse; locale: Locale }) {
  if (!pulse) return null;
  return (
    <div className="flex items-center gap-3 border-b border-[var(--color-bg-2)]/60 px-6 py-3 text-xs">
      <span className="relative inline-flex h-2 w-2 shrink-0" aria-hidden>
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-accent-cyan)] opacity-70" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--color-accent-cyan)]" />
      </span>
      <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--color-accent-cyan)]">
        {COMMON_COPY[locale].tonightInGreece ?? 'Tonight in Greece'}
      </span>
      <span aria-hidden className="text-[var(--color-fg-3)]">·</span>
      <span className="font-mono tabular-nums text-[var(--color-fg-0)]" suppressHydrationWarning>
        {pulse.athensTime}
      </span>
      {pulse.weather && (
        <>
          <span aria-hidden className="text-[var(--color-fg-3)]">·</span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden>{pulse.weather.emoji}</span>
            <span className="tabular-nums text-[var(--color-fg-0)]">{pulse.weather.tempC}°</span>
            <span className="text-[var(--color-fg-2)]">{pulse.weather.label}</span>
          </span>
        </>
      )}
    </div>
  );
}

// ─── Filtered single-column result ──────────────────────────────────

function FilteredCitiesGrid({ locale, cities, hasLocation }: {
  locale: Locale;
  cities: CityWithDistance[];
  hasLocation: boolean;
}) {
  if (cities.length === 0) {
    return (
      <div className="p-6 text-sm text-[var(--color-fg-2)]">
        {COMMON_COPY[locale].filterEmpty ?? 'No cities match.'}
      </div>
    );
  }
  return (
    <ul className="grid gap-1 p-3 md:grid-cols-2 lg:grid-cols-3">
      {cities.map((city) => (
        <li key={city.id}>
          <Link
            href={`/${locale}/cities/${city.slug}`}
            className="group flex items-center justify-between rounded-lg px-3 py-2 text-sm text-[var(--color-fg-1)] transition hover:bg-[var(--color-bg-2)] hover:text-[var(--color-accent-cyan)]"
          >
            <span className="inline-flex items-center gap-2">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent-cyan)]/40 transition group-hover:bg-[var(--color-accent-cyan)]" />
              {city.name}
            </span>
            {hasLocation && Number.isFinite(city.distanceKm) && (
              <span className="text-[10px] text-[var(--color-fg-3)]">{formatDistanceKm(city.distanceKm)}</span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}

// ─── Popular areas — neighborhoods sorted by visitor distance ─────

function PopularAreas({ locale, c, areas }: {
  locale: Locale;
  c: CopyShape;
  areas: NonNullable<MegaMenuPulse['areas']>;
}) {
  const { visitor } = useVisitorLocation();
  const hasGps = visitor.source === 'precise' && visitor.lat != null && visitor.lng != null;

  // Compute distances client-side using haversine. Falls back to
  // alphabetical when no GPS lock yet.
  const sorted = useMemo(() => {
    if (!areas.length) return [];
    if (hasGps && visitor.lat != null && visitor.lng != null) {
      const vLat = visitor.lat;
      const vLng = visitor.lng;
      return [...areas]
        .map((a) => ({ ...a, distanceKm: haversineKm({ lat: vLat, lng: vLng }, { lat: a.lat, lng: a.lng }) }))
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, 10);
    }
    return [...areas].sort((a, b) => a.name.localeCompare(b.name)).slice(0, 10);
  }, [areas, hasGps, visitor.lat, visitor.lng]);

  return (
    <>
      <p className="text-[10px] uppercase tracking-widest text-[var(--color-fg-3)]">
        {c.popularAreas}
      </p>
      {sorted.length === 0 ? (
        <p className="mt-2 text-xs text-[var(--color-fg-3)]">{c.areasEmpty}</p>
      ) : (
        <ul className="mt-2 space-y-1">
          {sorted.map((a) => (
            <li key={`${a.citySlug}-${a.slug}`}>
              <Link
                href={`/${locale}/cities/${a.citySlug}/area/${a.slug}`}
                className="group flex items-center justify-between gap-2 rounded px-2 py-1.5 text-sm text-[var(--color-fg-1)] transition hover:bg-[var(--color-bg-2)] hover:text-[var(--color-accent-cyan)]"
              >
                <span className="inline-flex min-w-0 flex-col">
                  <span className="truncate font-medium text-[var(--color-fg-0)]">{a.name}</span>
                  <span className="truncate text-[10px] uppercase tracking-widest text-[var(--color-fg-3)]">
                    {a.cityName}
                  </span>
                </span>
                {'distanceKm' in a && (
                  <span className="shrink-0 text-[10px] text-[var(--color-fg-3)]">
                    {formatDistanceKm((a as { distanceKm: number }).distanceKm)}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

// ─── Live destinations — multi-city weather strip ─────────────────

function LiveDestinations({ locale, c, destinations }: {
  locale: Locale;
  c: CopyShape;
  destinations: NonNullable<MegaMenuPulse['destinations']>;
}) {
  if (destinations.length === 0) return null;
  return (
    <div>
      <p className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-[var(--color-fg-3)]">
        <span className="relative inline-flex h-1.5 w-1.5" aria-hidden>
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-accent-violet)] opacity-70" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--color-accent-violet)]" />
        </span>
        {c.liveAcrossGreece}
      </p>
      <ul className="mt-2 space-y-1">
        {destinations.map((d) => (
          <li key={d.citySlug}>
            <Link
              href={`/${locale}/cities/${d.citySlug}`}
              className="group flex items-center justify-between gap-3 rounded px-2 py-1.5 text-sm transition hover:bg-[var(--color-bg-2)]"
            >
              <span className="truncate font-medium text-[var(--color-fg-0)] group-hover:text-[var(--color-accent-violet)]">
                {d.cityName}
              </span>
              {d.tempC !== null ? (
                <span className="inline-flex shrink-0 items-center gap-1.5 text-[var(--color-fg-2)]">
                  <span aria-hidden className="text-base leading-none">{d.emoji}</span>
                  <span className="tabular-nums text-[var(--color-fg-1)]">{d.tempC}°</span>
                </span>
              ) : (
                <span className="text-[10px] text-[var(--color-fg-3)]">—</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Latest article card ────────────────────────────────────────────

function LatestArticleCard({ locale, article }: {
  locale: Locale;
  article: NonNullable<MegaMenuPulse['latestArticle']>;
}) {
  return (
    <Link
      href={article.url}
      className="group relative block overflow-hidden rounded-lg border border-[var(--color-bg-3)] bg-[var(--color-bg-1)] transition hover:border-[var(--color-accent-pink)] hover:shadow-[0_18px_60px_-20px_rgba(255,45,149,0.35)]"
    >
      {article.coverUrl && (
        <div className="relative aspect-[16/9] w-full overflow-hidden">
          <Image
            src={article.coverUrl}
            alt={article.title}
            fill
            sizes="(min-width:1024px) 25vw, 100vw"
            className="object-cover transition duration-700 group-hover:scale-105"
          />
        </div>
      )}
      <div className="p-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--color-accent-pink)]">
          {COMMON_COPY[locale].justPublished ?? 'Just published'}
        </p>
        <p className="mt-1.5 line-clamp-2 text-sm font-medium text-[var(--color-fg-0)] group-hover:text-[var(--color-accent-pink)]">
          {article.title}
        </p>
        <p className="mt-1 text-[10px] text-[var(--color-fg-3)]">{article.cityName}</p>
      </div>
    </Link>
  );
}

function VerticalPanel({ locale, c, kind, accent, nearest, hasLocation, visitorCity }: {
  locale: Locale;
  c: CopyShape;
  kind: 'nightlife' | 'food' | 'stay';
  accent: AccentKey;
  nearest: CityWithDistance[];
  hasLocation: boolean;
  visitorCity: string | null;
}) {
  const cats = CATEGORY_SETS[kind];
  return (
    <div className="grid gap-6 p-6 md:grid-cols-3">
      {/* Left: Near you */}
      <div className="md:col-span-1">
        <NearYouStrip locale={locale} c={c} nearest={nearest} hasLocation={hasLocation} visitorCity={visitorCity} accent={accent} kindHref={`/${locale}#${kind}`} />
      </div>

      {/* Middle: categories */}
      <div className="md:col-span-1">
        <p className="text-[10px] uppercase tracking-widest text-[var(--color-fg-3)]">{c.categoryHeading}</p>
        <ul className="mt-2 space-y-1">
          {cats.map((cat) => (
            <li key={cat.slug}>
              <Link
                href={`/${locale}#${kind}`}
                className={`flex items-center justify-between rounded px-1 py-1 text-sm text-[var(--color-fg-1)] transition hover:bg-[var(--color-bg-2)] hover:${ACCENT[accent].text}`}
              >
                <span>{cat.label[locale]}</span>
                <span className="text-[var(--color-fg-3)]">→</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Right: hero / CTA */}
      <div className="md:col-span-1">
        <Link
          href={`/${locale}#${kind}`}
          className={`flex h-full flex-col justify-between rounded-xl border ${ACCENT[accent].border} bg-[var(--color-bg-2)]/50 p-4 transition hover:bg-[var(--color-bg-2)]`}
        >
          <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-bg-1)] ${ACCENT[accent].text} ${ACCENT[accent].ring}`}>
            {kind === 'nightlife' ? <MoonIcon /> : kind === 'food' ? <ForkKnifeIcon /> : <BedIcon />}
          </span>
          <div className="mt-3">
            <p className={`font-display text-lg font-semibold ${ACCENT[accent].text}`}>{localLabel(locale, kind)}</p>
            <p className="mt-1 text-xs text-[var(--color-fg-2)]">{VERTICAL_COPY[locale][kind].tagline}</p>
            <p className="mt-3 text-xs text-[var(--color-fg-3)]">{c.viewAll} →</p>
          </div>
        </Link>
      </div>
    </div>
  );
}

function NearYouStrip({ locale, c, nearest, hasLocation, visitorCity, accent, kindHref }: {
  locale: Locale;
  c: CopyShape;
  nearest: CityWithDistance[];
  hasLocation: boolean;
  visitorCity: string | null;
  accent: AccentKey;
  kindHref?: string;
}) {
  const dotClass = `bg-[var(--color-accent-${accent === 'amber' ? 'amber' : accent})]`;
  // Read source/loading/error from the provider directly so the strip can
  // show a status chip (precise active / acquiring GPS / denied) without
  // requiring action — the provider auto-prompts on load.
  const { visitor, preciseLoading, error } = useVisitorLocation();
  const isPrecise = visitor.source === 'precise';
  const isDenied = error === 'permission denied';
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-[var(--color-fg-3)]">
          <span className={`inline-block h-1.5 w-1.5 animate-pulse rounded-full ${dotClass}`} aria-hidden />
          {c.nearYou(visitorCity)}
        </p>
        {isPrecise ? (
          <span className="rounded-full border border-[var(--color-accent-cyan)]/40 bg-[var(--color-accent-cyan)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--color-accent-cyan)]">
            {c.preciseActive}
          </span>
        ) : preciseLoading ? (
          <span className="rounded-full border border-[var(--color-bg-3)] bg-[var(--color-bg-1)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-fg-2)]">
            📍 {c.preciseLoading}
          </span>
        ) : null}
      </div>
      {hasLocation && nearest.length > 0 ? (
        <ul className="mt-2 space-y-1">
          {nearest.slice(0, 10).map((city) => (
            <li key={city.id}>
              <Link
                href={`/${locale}/cities/${city.slug}`}
                className="flex items-center justify-between rounded px-1 py-1 text-sm text-[var(--color-fg-0)] transition hover:bg-[var(--color-bg-2)]"
              >
                <span className="font-medium">{city.name}</span>
                <span className="text-[10px] text-[var(--color-fg-3)]">{formatDistanceKm(city.distanceKm)}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs text-[var(--color-fg-3)]">{c.enable}</p>
      )}
      {isDenied && (
        <p className="mt-2 text-[10px] text-[var(--color-fg-3)]">{c.preciseDeniedNote}</p>
      )}
    </div>
  );
}

