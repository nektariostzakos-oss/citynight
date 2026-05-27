'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { Locale } from '@/lib/i18n';
import { useNearbyCities, type CityWithDistance } from './nearby-cities-context';
import { useVisitorLocation } from './visitor-location-provider';
import { formatDistanceKm } from '@/lib/geo-distance';
import { MoonIcon, ForkKnifeIcon, BedIcon, MapPinIcon } from './nav-icons';

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
  const t = VERTICAL_COPY[locale];
  const base: ItemDef[] = [
    { key: 'cities',    label: 'Cities',    icon: <MapPinIcon />,    accent: 'cyan' },
    { key: 'nightlife', label: 'Nightlife', icon: <MoonIcon />,      accent: 'pink' },
    { key: 'food',      label: 'Food',      icon: <ForkKnifeIcon />, accent: 'cyan' },
    { key: 'stay',      label: 'Stay',      icon: <BedIcon />,       accent: 'violet' },
  ];
  return base.map((i) => ({ ...i, label: localLabel(locale, i.key) }));

  void t; // silence unused — copy is consumed inside the panel
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

export function MegaMenu({ locale }: { locale: Locale }) {
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
            {open === 'cities'    && <CitiesPanel    locale={locale} c={c} cities={sortedAllCities} nearest={nearestCities} hasLocation={hasLocation} visitorCity={visitor?.city ?? null} />}
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

function CitiesPanel({ locale, c, cities, nearest, hasLocation, visitorCity }: {
  locale: Locale;
  c: CopyShape;
  cities: CityWithDistance[];
  nearest: CityWithDistance[];
  hasLocation: boolean;
  visitorCity: string | null;
}) {
  const bySlug = new Map(cities.map((city) => [city.slug, city]));
  const popular = POPULAR_CITY_SLUGS.map((slug) => bySlug.get(slug)).filter(Boolean) as CityWithDistance[];

  // Regions list for the right-rail CTA — count cities per region for the badge.
  const regionCounts = new Map<string, number>();
  for (const city of cities) {
    const r = city.region ?? 'Other';
    regionCounts.set(r, (regionCounts.get(r) ?? 0) + 1);
  }
  const regionOrder = ['South Aegean', 'Crete', 'Ionian Islands', 'Attica', 'Peloponnese', 'Central Macedonia', 'North Aegean', 'Epirus', 'Thessaly'];
  const topRegions = regionOrder.filter((r) => regionCounts.has(r)).slice(0, 6);

  return (
    <div className="grid gap-6 p-6 md:grid-cols-3">
      {/* Left: Near you */}
      <div className="md:col-span-1">
        <NearYouStrip locale={locale} c={c} nearest={nearest} hasLocation={hasLocation} visitorCity={visitorCity} accent="cyan" />
      </div>

      {/* Middle: Popular cities */}
      <div className="md:col-span-1">
        <p className="text-[10px] uppercase tracking-widest text-[var(--color-fg-3)]">
          {COMMON_COPY[locale].popular}
        </p>
        <ul className="mt-2 space-y-1">
          {popular.map((city) => (
            <li key={city.id}>
              <Link
                href={`/${locale}/cities/${city.slug}`}
                className="flex items-center justify-between rounded px-1 py-1 text-sm text-[var(--color-fg-1)] transition hover:bg-[var(--color-bg-2)] hover:text-[var(--color-accent-cyan)]"
              >
                <span>{city.name}</span>
                {hasLocation && Number.isFinite(city.distanceKm) && (
                  <span className="text-[10px] text-[var(--color-fg-3)]">{formatDistanceKm(city.distanceKm)}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Right: Regions CTA */}
      <div className="md:col-span-1">
        <p className="text-[10px] uppercase tracking-widest text-[var(--color-fg-3)]">
          {COMMON_COPY[locale].byRegion}
        </p>
        <ul className="mt-2 space-y-1">
          {topRegions.map((region) => (
            <li key={region}>
              <Link
                href={`/${locale}/greece#region-${region.replace(/\s+/g, '-').toLowerCase()}`}
                className="flex items-center justify-between rounded px-1 py-1 text-sm text-[var(--color-fg-1)] transition hover:bg-[var(--color-bg-2)] hover:text-[var(--color-accent-cyan)]"
              >
                <span>{c.regions[region] ?? region}</span>
                <span className="text-[10px] text-[var(--color-fg-3)]">{regionCounts.get(region)}</span>
              </Link>
            </li>
          ))}
        </ul>
        <Link
          href={`/${locale}/greece`}
          className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-[var(--color-accent-cyan)] hover:underline"
        >
          {COMMON_COPY[locale].viewAllN(cities.length)} →
        </Link>
      </div>
    </div>
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
        <NearYouStrip locale={locale} c={c} nearest={nearest} hasLocation={hasLocation} visitorCity={visitorCity} accent={accent} kindHref={`/${locale}/greece?kind=${kind}`} />
      </div>

      {/* Middle: categories */}
      <div className="md:col-span-1">
        <p className="text-[10px] uppercase tracking-widest text-[var(--color-fg-3)]">{c.categoryHeading}</p>
        <ul className="mt-2 space-y-1">
          {cats.map((cat) => (
            <li key={cat.slug}>
              <Link
                href={`/${locale}/greece?kind=${kind}`}
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
          href={`/${locale}/greece?kind=${kind}`}
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
          {nearest.slice(0, 5).map((city) => (
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

