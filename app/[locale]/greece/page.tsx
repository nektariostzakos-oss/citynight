import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isLocale, LOCALES, type Locale } from '@/lib/i18n';
import { listCitiesWithHero, siteStats } from '@/lib/queries';
import {
  publicMetadata, jsonLdProps,
  breadcrumbJsonLd, itemListJsonLd,
} from '@/lib/seo';
import { isVertical, type Vertical } from '@/content/cities';
import { NearbyCitiesGrid, type CityTile } from '@/components/nearby-cities-grid';

export const revalidate = 3600;

export async function generateMetadata({ params, searchParams }: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ kind?: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const { kind } = await searchParams;
  if (!isLocale(locale)) return {};
  const v: Vertical | null = isVertical(kind) ? kind : null;
  const paths: Partial<Record<Locale, string>> = {};
  // Canonical drops `?kind=` — alternate verticals are filters, not separate pages.
  for (const l of LOCALES) paths[l] = `/${l}/greece`;
  const meta = META[v ?? 'cities'][locale];
  return publicMetadata({ locale, paths, title: meta.title, description: meta.description });
}

type CopyBlock = {
  kicker: string;
  h1: string;
  sub: string;
  countLabel: string; // unit shown under each city tile (e.g., "venues", "places to eat")
  emptyTile: string;  // shown when count is 0 for this vertical in that city
  regions: { label: string; key: string }[];
};

const REGIONS_EN = [
  { label: 'All', key: 'all' },
  { label: 'Cyclades', key: 'South Aegean' },
  { label: 'Crete', key: 'Crete' },
  { label: 'Mainland', key: 'Attica' },
  { label: 'Ionian', key: 'Ionian Islands' },
];

const COPY: Record<'cities' | Vertical, Record<Locale, CopyBlock>> = {
  cities: {
    en: { kicker: 'Greece — by city', h1: 'Every island, every avenue.', sub: 'A guide per city, neighborhood pages within, venue pages beneath. Pick where the night should happen.', countLabel: 'venues', emptyTile: 'Guide coming soon',
      regions: REGIONS_EN },
    el: { kicker: 'Ελλάδα — ανά πόλη', h1: 'Κάθε νησί, κάθε δρόμος.', sub: 'Οδηγός ανά πόλη, σελίδες γειτονιών μέσα, σελίδες μαγαζιών παρακάτω. Διάλεξε πού θα γίνει η βραδιά.', countLabel: 'μαγαζιά', emptyTile: 'Οδηγός έρχεται',
      regions: [{ label: 'Όλες', key: 'all' }, { label: 'Κυκλάδες', key: 'South Aegean' }, { label: 'Κρήτη', key: 'Crete' }, { label: 'Ηπειρωτική', key: 'Attica' }, { label: 'Ιόνιο', key: 'Ionian Islands' }] },
    de: { kicker: 'Griechenland — nach Stadt', h1: 'Jede Insel, jede Straße.', sub: 'Guide pro Stadt, Viertelseiten innen, Location-Seiten darunter.', countLabel: 'Locations', emptyTile: 'Guide bald verfügbar',
      regions: [{ label: 'Alle', key: 'all' }, { label: 'Kykladen', key: 'South Aegean' }, { label: 'Kreta', key: 'Crete' }, { label: 'Festland', key: 'Attica' }, { label: 'Ionische', key: 'Ionian Islands' }] },
    fr: { kicker: 'Grèce — par ville', h1: 'Chaque île, chaque rue.', sub: 'Un guide par ville, des pages de quartier dedans, des fiches de lieux dessous.', countLabel: 'lieux', emptyTile: 'Guide à venir',
      regions: [{ label: 'Toutes', key: 'all' }, { label: 'Cyclades', key: 'South Aegean' }, { label: 'Crète', key: 'Crete' }, { label: 'Continent', key: 'Attica' }, { label: 'Ioniennes', key: 'Ionian Islands' }] },
    it: { kicker: 'Grecia — per città', h1: 'Ogni isola, ogni via.', sub: 'Una guida per città, pagine di quartiere dentro, schede di locale sotto.', countLabel: 'locali', emptyTile: 'Guida in arrivo',
      regions: [{ label: 'Tutte', key: 'all' }, { label: 'Cicladi', key: 'South Aegean' }, { label: 'Creta', key: 'Crete' }, { label: 'Continente', key: 'Attica' }, { label: 'Ioniche', key: 'Ionian Islands' }] },
  },
  nightlife: {
    en: { kicker: 'Greece — nightlife', h1: 'Where Greece comes alive after dark.', sub: 'Clubs, rooftops, bouzoukia and beach clubs — by city, by neighborhood, by the night you want.', countLabel: 'nightlife venues', emptyTile: 'Coming online',
      regions: REGIONS_EN },
    el: { kicker: 'Ελλάδα — νυχτερινή ζωή', h1: 'Εκεί που η Ελλάδα ξυπνάει το βράδυ.', sub: 'Κλαμπ, ρουφ-τοπ, μπουζούκια και beach club — ανά πόλη, γειτονιά, διάθεση.', countLabel: 'μαγαζιά νύχτας', emptyTile: 'Έρχεται σύντομα',
      regions: [{ label: 'Όλες', key: 'all' }, { label: 'Κυκλάδες', key: 'South Aegean' }, { label: 'Κρήτη', key: 'Crete' }, { label: 'Ηπειρωτική', key: 'Attica' }, { label: 'Ιόνιο', key: 'Ionian Islands' }] },
    de: { kicker: 'Griechenland — Nachtleben', h1: 'Wo Griechenland nach Einbruch der Dunkelheit lebt.', sub: 'Clubs, Rooftops, Bouzoukia und Beachclubs — nach Stadt, Viertel und Stimmung.', countLabel: 'Nachtleben-Locations', emptyTile: 'Bald verfügbar',
      regions: [{ label: 'Alle', key: 'all' }, { label: 'Kykladen', key: 'South Aegean' }, { label: 'Kreta', key: 'Crete' }, { label: 'Festland', key: 'Attica' }, { label: 'Ionische', key: 'Ionian Islands' }] },
    fr: { kicker: 'Grèce — vie nocturne', h1: 'Là où la Grèce s\'éveille la nuit.', sub: 'Clubs, rooftops, bouzoukia et beach clubs — par ville, par quartier, par envie.', countLabel: 'lieux de nuit', emptyTile: 'Bientôt en ligne',
      regions: [{ label: 'Toutes', key: 'all' }, { label: 'Cyclades', key: 'South Aegean' }, { label: 'Crète', key: 'Crete' }, { label: 'Continent', key: 'Attica' }, { label: 'Ioniennes', key: 'Ionian Islands' }] },
    it: { kicker: 'Grecia — vita notturna', h1: 'Dove la Grecia si accende dopo il buio.', sub: 'Club, rooftop, bouzoukia e beach club — per città, quartiere, mood.', countLabel: 'locali notturni', emptyTile: 'In arrivo',
      regions: [{ label: 'Tutte', key: 'all' }, { label: 'Cicladi', key: 'South Aegean' }, { label: 'Creta', key: 'Crete' }, { label: 'Continente', key: 'Attica' }, { label: 'Ioniche', key: 'Ionian Islands' }] },
  },
  food: {
    en: { kicker: 'Greece — food', h1: 'Eat your way across Greece.', sub: 'Tavernas, mezedopoleia, modern Greek tasting menus and the local dishes that define each island.', countLabel: 'places to eat', emptyTile: 'Coming online',
      regions: REGIONS_EN },
    el: { kicker: 'Ελλάδα — φαγητό', h1: 'Φάε διασχίζοντας την Ελλάδα.', sub: 'Ταβέρνες, μεζεδοπωλεία, σύγχρονη ελληνική κουζίνα και τα τοπικά πιάτα κάθε νησιού.', countLabel: 'για φαγητό', emptyTile: 'Έρχεται σύντομα',
      regions: [{ label: 'Όλες', key: 'all' }, { label: 'Κυκλάδες', key: 'South Aegean' }, { label: 'Κρήτη', key: 'Crete' }, { label: 'Ηπειρωτική', key: 'Attica' }, { label: 'Ιόνιο', key: 'Ionian Islands' }] },
    de: { kicker: 'Griechenland — Essen', h1: 'Iss dich durch Griechenland.', sub: 'Tavernen, Mezedopoleia, moderne griechische Tasting-Menüs und die typischen Gerichte jeder Insel.', countLabel: 'Restaurants', emptyTile: 'Bald verfügbar',
      regions: [{ label: 'Alle', key: 'all' }, { label: 'Kykladen', key: 'South Aegean' }, { label: 'Kreta', key: 'Crete' }, { label: 'Festland', key: 'Attica' }, { label: 'Ionische', key: 'Ionian Islands' }] },
    fr: { kicker: 'Grèce — gastronomie', h1: 'Mangez à travers la Grèce.', sub: 'Tavernes, mezedopoleia, menus dégustation grecs modernes et plats locaux qui définissent chaque île.', countLabel: 'adresses', emptyTile: 'Bientôt en ligne',
      regions: [{ label: 'Toutes', key: 'all' }, { label: 'Cyclades', key: 'South Aegean' }, { label: 'Crète', key: 'Crete' }, { label: 'Continent', key: 'Attica' }, { label: 'Ioniennes', key: 'Ionian Islands' }] },
    it: { kicker: 'Grecia — cucina', h1: 'Mangia attraverso la Grecia.', sub: 'Taverne, mezedopoleia, menu degustazione moderni e i piatti locali di ogni isola.', countLabel: 'indirizzi', emptyTile: 'In arrivo',
      regions: [{ label: 'Tutte', key: 'all' }, { label: 'Cicladi', key: 'South Aegean' }, { label: 'Creta', key: 'Crete' }, { label: 'Continente', key: 'Attica' }, { label: 'Ioniche', key: 'Ionian Islands' }] },
  },
  stay: {
    en: { kicker: 'Greece — stay', h1: 'Sleep where the story happens.', sub: 'Boutique hotels, beachfront resorts, design villas and cave suites — picked for where the city actually lives.', countLabel: 'places to stay', emptyTile: 'Coming online',
      regions: REGIONS_EN },
    el: { kicker: 'Ελλάδα — διαμονή', h1: 'Κοιμήσου εκεί που γράφεται η ιστορία.', sub: 'Boutique ξενοδοχεία, beachfront resorts, design βίλες και cave suites — επιλεγμένα για το πού πραγματικά ζει η πόλη.', countLabel: 'για διαμονή', emptyTile: 'Έρχεται σύντομα',
      regions: [{ label: 'Όλες', key: 'all' }, { label: 'Κυκλάδες', key: 'South Aegean' }, { label: 'Κρήτη', key: 'Crete' }, { label: 'Ηπειρωτική', key: 'Attica' }, { label: 'Ιόνιο', key: 'Ionian Islands' }] },
    de: { kicker: 'Griechenland — Übernachten', h1: 'Schlaf dort, wo die Geschichte spielt.', sub: 'Boutique-Hotels, Strandresorts, Design-Villen und Höhlensuiten — ausgewählt nach dem Puls der Stadt.', countLabel: 'Unterkünfte', emptyTile: 'Bald verfügbar',
      regions: [{ label: 'Alle', key: 'all' }, { label: 'Kykladen', key: 'South Aegean' }, { label: 'Kreta', key: 'Crete' }, { label: 'Festland', key: 'Attica' }, { label: 'Ionische', key: 'Ionian Islands' }] },
    fr: { kicker: 'Grèce — hébergement', h1: 'Dormez là où l\'histoire se passe.', sub: 'Hôtels de design, resorts en bord de mer, villas et cave suites — choisis pour le vrai pouls de chaque ville.', countLabel: 'hébergements', emptyTile: 'Bientôt en ligne',
      regions: [{ label: 'Toutes', key: 'all' }, { label: 'Cyclades', key: 'South Aegean' }, { label: 'Crète', key: 'Crete' }, { label: 'Continent', key: 'Attica' }, { label: 'Ioniennes', key: 'Ionian Islands' }] },
    it: { kicker: 'Grecia — dormire', h1: 'Dormi dove la storia accade.', sub: 'Boutique hotel, resort fronte mare, ville di design e cave suite — scelti per il vero polso di ogni città.', countLabel: 'sistemazioni', emptyTile: 'In arrivo',
      regions: [{ label: 'Tutte', key: 'all' }, { label: 'Cicladi', key: 'South Aegean' }, { label: 'Creta', key: 'Crete' }, { label: 'Continente', key: 'Attica' }, { label: 'Ioniche', key: 'Ionian Islands' }] },
  },
};

const META: Record<'cities' | Vertical, Record<Locale, { title: string; description: string }>> = {
  cities: {
    en: { title: 'Cities — Greece guide', description: 'Nightlife, food and stays across Greece — Athens, Mykonos, Santorini, Thessaloniki, Rhodes, Corfu and more.' },
    el: { title: 'Πόλεις — οδηγός Ελλάδας', description: 'Νυχτερινή ζωή, φαγητό και διαμονή σε όλη την Ελλάδα — Αθήνα, Μύκονος, Σαντορίνη, Θεσσαλονίκη, Ρόδος, Κέρκυρα και άλλες.' },
    de: { title: 'Städte — Griechenland-Guide', description: 'Nachtleben, Essen und Unterkünfte in ganz Griechenland.' },
    fr: { title: 'Villes — guide de la Grèce', description: 'Vie nocturne, cuisine et hébergement dans toute la Grèce.' },
    it: { title: 'Città — guida della Grecia', description: 'Vita notturna, cucina e alloggio in tutta la Grecia.' },
  },
  nightlife: {
    en: { title: 'Greece nightlife — by city', description: 'Clubs, rooftops, bouzoukia and beach clubs — Athens, Mykonos, Santorini and the rest of Greece.' },
    el: { title: 'Νυχτερινή ζωή στην Ελλάδα — ανά πόλη', description: 'Κλαμπ, ρουφ-τοπ, μπουζούκια και beach club σε όλη την Ελλάδα.' },
    de: { title: 'Nachtleben in Griechenland — nach Stadt', description: 'Clubs, Rooftops, Bouzoukia und Beachclubs in ganz Griechenland.' },
    fr: { title: 'Vie nocturne en Grèce — par ville', description: 'Clubs, rooftops, bouzoukia et beach clubs partout en Grèce.' },
    it: { title: 'Vita notturna in Grecia — per città', description: 'Club, rooftop, bouzoukia e beach club in tutta la Grecia.' },
  },
  food: {
    en: { title: 'Greek food guide — by city', description: 'Tavernas, mezedopoleia and modern Greek dining across Greece.' },
    el: { title: 'Φαγητό στην Ελλάδα — ανά πόλη', description: 'Ταβέρνες, μεζεδοπωλεία και σύγχρονη ελληνική κουζίνα σε όλη την Ελλάδα.' },
    de: { title: 'Griechisches Essen — nach Stadt', description: 'Tavernen, Mezedopoleia und moderne griechische Küche.' },
    fr: { title: 'Cuisine grecque — par ville', description: 'Tavernes, mezedopoleia et cuisine grecque moderne.' },
    it: { title: 'Cucina greca — per città', description: 'Taverne, mezedopoleia e cucina greca moderna.' },
  },
  stay: {
    en: { title: 'Where to stay in Greece — by city', description: 'Boutique hotels, beachfront resorts and design villas across Greece.' },
    el: { title: 'Πού να μείνεις στην Ελλάδα — ανά πόλη', description: 'Boutique ξενοδοχεία, beachfront resorts και design βίλες σε όλη την Ελλάδα.' },
    de: { title: 'Übernachten in Griechenland — nach Stadt', description: 'Boutique-Hotels, Strandresorts und Design-Villen in ganz Griechenland.' },
    fr: { title: 'Où dormir en Grèce — par ville', description: 'Hôtels boutique, resorts et villas de design dans toute la Grèce.' },
    it: { title: 'Dove dormire in Grecia — per città', description: 'Boutique hotel, resort e ville di design in tutta la Grecia.' },
  },
};

const ACCENT: Record<'cities' | Vertical, { dot: string; ring: string; hover: string }> = {
  cities:    { dot: 'bg-[var(--color-accent-cyan)]',   ring: 'shadow-[var(--shadow-glow-cyan)]',   hover: 'hover:border-[var(--color-accent-cyan)] hover:text-[var(--color-accent-cyan)]' },
  nightlife: { dot: 'bg-[var(--color-accent-pink)]',   ring: 'shadow-[var(--shadow-glow-pink)]',   hover: 'hover:border-[var(--color-accent-pink)] hover:text-[var(--color-accent-pink)]' },
  food:      { dot: 'bg-[var(--color-accent-cyan)]',   ring: 'shadow-[var(--shadow-glow-cyan)]',   hover: 'hover:border-[var(--color-accent-cyan)] hover:text-[var(--color-accent-cyan)]' },
  stay:      { dot: 'bg-[var(--color-accent-violet)]', ring: 'shadow-[var(--shadow-glow-violet)]', hover: 'hover:border-[var(--color-accent-violet)] hover:text-[var(--color-accent-violet)]' },
};

export default async function GreeceIndex({ params, searchParams }: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ kind?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { kind } = await searchParams;
  const vertical: Vertical | null = isVertical(kind) ? kind : null;
  const mode: 'cities' | Vertical = vertical ?? 'cities';
  const c = COPY[mode][locale];
  const accent = ACCENT[mode];

  const cities = listCitiesWithHero(vertical, locale);
  const stats = siteStats();

  // Preserve the `kind` param on the city-tile links so the city page can read it
  // when we add per-vertical highlighting there.
  const linkSuffix = vertical ? `?kind=${vertical}` : '';

  const greeceLabel: Record<Locale, string> = { en: 'Greece', el: 'Ελλάδα', de: 'Griechenland', fr: 'Grèce', it: 'Grecia' };
  const homeLabel: Record<Locale, string> = { en: 'Home', el: 'Αρχική', de: 'Start', fr: 'Accueil', it: 'Home' };

  return (
    <>
      {/* JSON-LD: Breadcrumb + ItemList of cities */}
      <script
        type="application/ld+json"
        {...jsonLdProps([
          breadcrumbJsonLd([
            { name: homeLabel[locale], path: `/${locale}` },
            { name: greeceLabel[locale], path: `/${locale}/greece` },
          ]),
          itemListJsonLd({
            name: `${greeceLabel[locale]} — ${c.kicker}`,
            items: cities.map((cc) => ({
              name: cc.name,
              path: `/${locale}/greece/${cc.slug}`,
            })),
          }),
        ])}
      />
      <section className="border-b border-[var(--color-bg-2)] bg-gradient-to-b from-[var(--color-bg-1)] to-[var(--color-bg-0)]">
        <div className="mx-auto max-w-6xl px-6 py-16 md:py-24">
          <p className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-[var(--color-fg-2)]">
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${accent.dot} ${accent.ring}`} aria-hidden />
            {c.kicker}
          </p>
          <h1 className="mt-3 font-display text-5xl font-semibold tracking-tight md:text-7xl">{c.h1}</h1>
          <p className="mt-5 max-w-2xl text-lg text-[var(--color-fg-1)]">{c.sub}</p>

          <div className="mt-8 flex flex-wrap gap-6 text-sm">
            <span><span className="font-display text-lg text-[var(--color-fg-0)]">{stats.cities}</span> <span className="text-[var(--color-fg-2)]">cities</span></span>
            <span><span className="font-display text-lg text-[var(--color-fg-0)]">{stats.venues}</span> <span className="text-[var(--color-fg-2)]">venues</span></span>
            <span><span className="font-display text-lg text-[var(--color-fg-0)]">{stats.neighborhoods}</span> <span className="text-[var(--color-fg-2)]">neighborhoods</span></span>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 py-10">
        {/* Region filter — anchor-based, non-JS. Server-rendered region groups below. */}
        <nav aria-label="Region" className="flex flex-wrap gap-2">
          {c.regions.map((r) => (
            <a
              key={r.key}
              href={r.key === 'all' ? '#all' : `#region-${r.key.replace(/\s+/g, '-').toLowerCase()}`}
              className={`rounded-full border border-[var(--color-bg-3)] bg-[var(--color-bg-1)] px-4 py-1.5 text-xs uppercase tracking-widest text-[var(--color-fg-1)] ${accent.hover}`}
            >
              {r.label}
            </a>
          ))}
        </nav>

        <div className="mt-8">
          <NearbyCitiesGrid
            locale={locale}
            linkSuffix={linkSuffix}
            cities={cities.map<CityTile>((city) => ({
              id: city.id, slug: city.slug, name: city.name, region: city.region,
              lat: city.lat, lng: city.lng,
              heroPhotoUrl: city.heroPhotoUrl, venueCount: city.venueCount,
              countLabel: c.countLabel, emptyLabel: c.emptyTile,
            }))}
            nearbyBanner={NEARBY_BANNER[locale]}
          />
        </div>
      </section>
    </>
  );
}

// String templates only — server→client props can't be functions. The client
// component substitutes `{city}` with the detected visitor city.
const NEARBY_BANNER: Record<Locale, { youTemplate: string; cta: string }> = {
  en: { youTemplate: "You're near {city} — closest cities ranked first", cta: 'Showing nearest first' },
  el: { youTemplate: 'Είσαι κοντά σε {city} — οι κοντινότερες πόλεις πρώτες', cta: 'Ταξινόμηση κατά απόσταση' },
  de: { youTemplate: 'Du bist in der Nähe von {city} — nächstgelegene Städte zuerst', cta: 'Nach Nähe sortiert' },
  fr: { youTemplate: "Vous êtes près de {city} — villes les plus proches d'abord", cta: 'Trié par proximité' },
  it: { youTemplate: 'Sei vicino a {city} — città più vicine in alto', cta: 'Ordinate per vicinanza' },
};
