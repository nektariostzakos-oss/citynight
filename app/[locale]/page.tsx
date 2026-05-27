import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { isLocale, type Locale } from '@/lib/i18n';
import {
  listCitiesWithHero,
  siteStats,
} from '@/lib/queries';
import { listPublishedArticles } from '@/lib/articles';
import { SearchBox } from '@/components/search-box';
import { AdSlot } from '@/components/ad-slot';
import { getAllCityGuides } from '@/content/cities';
import { HeroLiveStatus } from '@/components/hero-live-status';
import { HeroNearestPanel } from '@/components/hero-nearest-panel';
import {
  publicMetadata, localizedPaths, jsonLdProps,
  organizationJsonLd, websiteJsonLd, breadcrumbJsonLd,
} from '@/lib/seo';

export const revalidate = 1800;

const META: Record<Locale, { title: string; description: string }> = {
  en: { title: 'citynight — Greece nightlife, food & stay guide', description: 'Greece-wide guide for nightlife, restaurants and hotels. Real venues, real photos, five languages.' },
  el: { title: 'citynight — Οδηγός νυχτερινής ζωής, φαγητού & διαμονής στην Ελλάδα', description: 'Πανελλήνιος οδηγός για νυχτερινή ζωή, εστιατόρια και ξενοδοχεία. Πραγματικά μαγαζιά, πραγματικές φωτογραφίες, πέντε γλώσσες.' },
  de: { title: 'citynight — Griechenland: Nightlife, Essen & Übernachten', description: 'Landesweiter Guide für Nachtleben, Restaurants und Hotels in Griechenland. Echte Locations, echte Fotos, fünf Sprachen.' },
  fr: { title: 'citynight — Grèce : guide nightlife, cuisine & hébergement', description: 'Guide national pour la vie nocturne, les restaurants et les hôtels en Grèce. Vrais lieux, vraies photos, cinq langues.' },
  it: { title: 'citynight — Grecia: guida nightlife, cucina & alloggi', description: 'Guida nazionale per vita notturna, ristoranti e hotel in Grecia. Locali veri, foto vere, cinque lingue.' },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const m = META[locale];
  return publicMetadata({
    locale,
    paths: localizedPaths(''),
    title: m.title,
    description: m.description,
  });
}

// Per-locale region labels + "Guide coming soon" tile copy. Shares the same
// shape as the mega-menu/CityHero region maps so a translation update in one
// place isn't out of sync with the others (keep these aligned by hand for now).
const TILE_LOCALE: Record<Locale, { region: Record<string, string>; comingSoon: string; guidePrefix: string }> = {
  en: { comingSoon: 'Guide coming soon', guidePrefix: 'Guide', region: { 'Attica': 'Attica', 'South Aegean': 'Cyclades & Dodecanese', 'North Aegean': 'North Aegean', 'Crete': 'Crete', 'Ionian Islands': 'Ionian', 'Central Macedonia': 'Macedonia', 'Western Macedonia': 'West Macedonia', 'East Macedonia & Thrace': 'East Macedonia & Thrace', 'Peloponnese': 'Peloponnese', 'Epirus': 'Epirus', 'Thessaly': 'Sporades & Thessaly', 'Central Greece': 'Central Greece' } },
  el: { comingSoon: 'Οδηγός έρχεται', guidePrefix: 'Οδηγός', region: { 'Attica': 'Αττική', 'South Aegean': 'Κυκλάδες & Δωδεκάνησα', 'North Aegean': 'Βόρειο Αιγαίο', 'Crete': 'Κρήτη', 'Ionian Islands': 'Ιόνιο', 'Central Macedonia': 'Μακεδονία', 'Western Macedonia': 'Δυτική Μακεδονία', 'East Macedonia & Thrace': 'Αν. Μακεδονία & Θράκη', 'Peloponnese': 'Πελοπόννησος', 'Epirus': 'Ήπειρος', 'Thessaly': 'Σποράδες & Θεσσαλία', 'Central Greece': 'Στερεά Ελλάδα' } },
  de: { comingSoon: 'Guide folgt', guidePrefix: 'Guide', region: { 'Attica': 'Attika', 'South Aegean': 'Kykladen & Dodekanes', 'North Aegean': 'Nordägäis', 'Crete': 'Kreta', 'Ionian Islands': 'Ionische Inseln', 'Central Macedonia': 'Makedonien', 'Western Macedonia': 'Westmakedonien', 'East Macedonia & Thrace': 'Ostmakedonien & Thrakien', 'Peloponnese': 'Peloponnes', 'Epirus': 'Epirus', 'Thessaly': 'Sporaden & Thessalien', 'Central Greece': 'Mittelgriechenland' } },
  fr: { comingSoon: 'Guide bientôt', guidePrefix: 'Guide', region: { 'Attica': 'Attique', 'South Aegean': 'Cyclades & Dodécanèse', 'North Aegean': 'Égée du Nord', 'Crete': 'Crète', 'Ionian Islands': 'Îles ioniennes', 'Central Macedonia': 'Macédoine', 'Western Macedonia': 'Macédoine-Occidentale', 'East Macedonia & Thrace': 'Macédoine-Orientale & Thrace', 'Peloponnese': 'Péloponnèse', 'Epirus': 'Épire', 'Thessaly': 'Sporades & Thessalie', 'Central Greece': 'Grèce centrale' } },
  it: { comingSoon: 'Guida in arrivo', guidePrefix: 'Guida', region: { 'Attica': 'Attica', 'South Aegean': 'Cicladi & Dodecaneso', 'North Aegean': 'Egeo Settentrionale', 'Crete': 'Creta', 'Ionian Islands': 'Isole Ionie', 'Central Macedonia': 'Macedonia', 'Western Macedonia': 'Macedonia Occidentale', 'East Macedonia & Thrace': 'Macedonia Orientale & Tracia', 'Peloponnese': 'Peloponneso', 'Epirus': 'Epiro', 'Thessaly': 'Sporadi & Tessaglia', 'Central Greece': 'Grecia centrale' } },
};

// Hero quick-action chips. Each routes to a vertical or category page.
// Keep this list to 4 — more than that and the hero gets cluttered.
// Phase K.6 — hero quick-action chips removed. They previously linked
// to /greece?kind=X (a dead URL pattern; each landed on the same
// vertical-filtered listing). In the article-led model the right
// next-click is "open a city guide", which the cities grid + the
// "All cities" CTA below the hero already serve.

// Tagline appended below the hero subtitle — short, futuristic, action-y.
const HERO_TAGLINE: Record<Locale, (cities: number) => string> = {
  en: (n) => `${n} cities · 5 languages · curated by people who know the streets`,
  el: (n) => `${n} πόλεις · 5 γλώσσες · επιμελημένα από ανθρώπους που ξέρουν`,
  de: (n) => `${n} Städte · 5 Sprachen · kuratiert von Leuten vor Ort`,
  fr: (n) => `${n} villes · 5 langues · sélectionnées par des connaisseurs`,
  it: (n) => `${n} città · 5 lingue · selezionate da chi conosce le strade`,
};

const COPY: Record<Locale, {
  heroKicker: string;
  heroTitle: string;
  heroTitleAccent: string;
  heroSub: string;
  citiesHeading: string;
  citiesSub: string;
  citiesCta: string;
  latestArticlesHeading: string;
  latestArticlesSub: string;
  ownersHeading: string;
  ownersBody: string;
  ownersCta: string;
  statsCities: string;
  statsVenues: string;
  statsNeighborhoods: string;
  statsLocales: string;
  guidesHeading: string;
  guidesSub: string;
}> = {
  en: {
    heroKicker: 'Greece · nightlife guide',
    heroTitle: 'Where Greece',
    heroTitleAccent: 'goes out',
    heroSub: 'Clubs, rooftops, bouzoukia, beach clubs — curated, in your language, grounded in real venues.',
    citiesHeading: 'Top destinations',
    citiesSub: 'Each city is a guide — neighborhoods, scenes, and the venues that define them.',
    citiesCta: 'All cities →',
    latestArticlesHeading: 'Latest guides',
    latestArticlesSub: 'Fresh ranked picks across every city.',
    ownersHeading: 'Run a venue?',
    ownersBody: 'Get your own website in 60 seconds — your photos, your menu, your bookings. Free hosted forever. €19/mo only if you want your own domain.',
    ownersCta: 'Make your site →',
    statsCities: 'cities', statsVenues: 'venues', statsNeighborhoods: 'neighborhoods', statsLocales: 'languages',
    guidesHeading: 'Editorial guides',
    guidesSub: 'Long-form, evergreen, written by people who know the cities.',
  },
  el: {
    heroKicker: 'Ελλάδα · οδηγός νυχτερινής ζωής',
    heroTitle: 'Πού βγαίνει',
    heroTitleAccent: 'η Ελλάδα',
    heroSub: 'Κλαμπ, ταράτσες, μπουζούκια, beach club — επιμελημένο, στη γλώσσα σου, βασισμένο σε πραγματικά μαγαζιά.',
    citiesHeading: 'Κορυφαίοι προορισμοί',
    citiesSub: 'Κάθε πόλη είναι οδηγός — γειτονιές, σκηνές, και τα μαγαζιά που την ορίζουν.',
    citiesCta: 'Όλες οι πόλεις →',
    latestArticlesHeading: 'Πρόσφατοι οδηγοί',
    latestArticlesSub: 'Φρέσκα ranked picks από κάθε πόλη.',
    ownersHeading: 'Έχεις μαγαζί;',
    ownersBody: 'Έτοιμο website σε 60 δευτερόλεπτα — οι φωτογραφίες σου, το μενού σου, οι κρατήσεις σου. Δωρεάν για πάντα. €19/μήνα μόνο για δικό σου domain.',
    ownersCta: 'Φτιάξε το site σου →',
    statsCities: 'πόλεις', statsVenues: 'μαγαζιά', statsNeighborhoods: 'γειτονιές', statsLocales: 'γλώσσες',
    guidesHeading: 'Editorial οδηγοί',
    guidesSub: 'Μεγάλα κείμενα, evergreen, γραμμένα από ανθρώπους που ξέρουν.',
  },
  de: {
    heroKicker: 'Griechenland · Nightlife-Guide',
    heroTitle: 'Wo Griechenland',
    heroTitleAccent: 'feiert',
    heroSub: 'Clubs, Rooftops, Bouzoukia, Beachclubs — kuratiert, in Ihrer Sprache, basierend auf echten Locations.',
    citiesHeading: 'Top-Destinationen',
    citiesSub: 'Jede Stadt ist ein Guide — Viertel, Szenen und die Locations, die sie prägen.',
    citiesCta: 'Alle Städte →',
    latestArticlesHeading: 'Neueste Guides',
    latestArticlesSub: 'Frische Ranglisten aus jeder Stadt.',
    ownersHeading: 'Lokal-Inhaber?',
    ownersBody: 'Ihre eigene Website in 60 Sekunden — Fotos, Speisekarte, Buchungen. Dauerhaft kostenlos. €19/Monat nur für eigene Domain.',
    ownersCta: 'Website erstellen →',
    statsCities: 'Städte', statsVenues: 'Locations', statsNeighborhoods: 'Viertel', statsLocales: 'Sprachen',
    guidesHeading: 'Editorial-Guides',
    guidesSub: 'Lang, evergreen, geschrieben von Menschen, die die Städte kennen.',
  },
  fr: {
    heroKicker: 'Grèce · guide nocturne',
    heroTitle: 'Où la Grèce',
    heroTitleAccent: 'sort',
    heroSub: 'Clubs, rooftops, bouzoukia, beach clubs — sélectionné, dans votre langue, ancré sur de vrais lieux.',
    citiesHeading: 'Destinations phares',
    citiesSub: 'Chaque ville est un guide — quartiers, scènes, lieux qui la définissent.',
    citiesCta: 'Toutes les villes →',
    latestArticlesHeading: 'Derniers guides',
    latestArticlesSub: 'Nouveaux classements pour chaque ville.',
    ownersHeading: 'Propriétaire ?',
    ownersBody: 'Votre propre site en 60 secondes — photos, menu, réservations. Gratuit pour toujours. €19/mois uniquement pour votre propre domaine.',
    ownersCta: 'Créer mon site →',
    statsCities: 'villes', statsVenues: 'lieux', statsNeighborhoods: 'quartiers', statsLocales: 'langues',
    guidesHeading: 'Guides éditoriaux',
    guidesSub: 'Long format, intemporels, écrits par des gens qui connaissent.',
  },
  it: {
    heroKicker: 'Grecia · guida notturna',
    heroTitle: 'Dove la Grecia',
    heroTitleAccent: 'esce',
    heroSub: 'Club, rooftop, bouzoukia, beach club — selezionati, nella tua lingua, basati su locali veri.',
    citiesHeading: 'Destinazioni top',
    citiesSub: 'Ogni città è una guida — quartieri, scene e i locali che la definiscono.',
    citiesCta: 'Tutte le città →',
    latestArticlesHeading: 'Ultime guide',
    latestArticlesSub: 'Nuove classifiche da ogni città.',
    ownersHeading: 'Hai un locale?',
    ownersBody: 'Il tuo sito in 60 secondi — foto, menu, prenotazioni. Gratis per sempre. €19/mese solo per il tuo dominio.',
    ownersCta: 'Crea il tuo sito →',
    statsCities: 'città', statsVenues: 'locali', statsNeighborhoods: 'quartieri', statsLocales: 'lingue',
    guidesHeading: 'Guide editoriali',
    guidesSub: 'Lunghe, evergreen, scritte da chi conosce le città.',
  },
};

export default async function LocaleHome({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const cities = listCitiesWithHero(null, locale);
  const stats = siteStats();
  const guides = getAllCityGuides();
  // Phase K.3 — Latest articles surface across all cities for the homepage.
  // Cross-locale: each row is the article in its own locale (en/el/...); the
  // homepage filters to the visitor's current locale via listPublishedArticles.
  const latestArticles = listPublishedArticles(locale, { limit: 6 });
  const cityNameBySlug = new Map(cities.map((cc) => [cc.slug, cc.name]));
  // cityId → citySlug lookup so article cards can build /cities/{slug}/... URLs.
  const citySlugById = new Map(cities.map((cc) => [cc.id, cc.slug]));
  const c = COPY[locale];

  const breadcrumbName: Record<Locale, string> = { en: 'Home', el: 'Αρχική', de: 'Start', fr: 'Accueil', it: 'Home' };

  return (
    <>
      {/* JSON-LD: Organization + WebSite (with SearchAction) + Breadcrumb */}
      <script
        type="application/ld+json"
        {...jsonLdProps([
          organizationJsonLd(),
          websiteJsonLd(locale),
          breadcrumbJsonLd([{ name: breadcrumbName[locale], path: `/${locale}` }]),
        ])}
      />

      {/* HERO — futuristic, dynamic, useful.
          Layered: animated photo cycle → glow blobs → faint grid pattern →
          dark gradient overlay → kinetic title + live status + smart search +
          GPS-aware "near you" panel + quick-action chips.
          All client-side enhancements are progressive — the SSR markup still
          shows the first photo + title for crawlers and JS-off visitors. */}
      <section className="relative isolate overflow-hidden">
        <div className="relative min-h-[100vh] w-full">
          {/* 1. Static gradient backdrop. The cycling city-photo hero was
              removed — cities now render as text-only app buttons everywhere
              except inside their own page header. */}
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-bg-1)] via-[var(--color-bg-2)] to-[var(--color-bg-0)]" />

          {/* 2. Neon glow blobs — purely decorative, pulse softly */}
          <div className="pointer-events-none absolute -top-40 left-1/3 h-[42rem] w-[42rem] rounded-full bg-[var(--color-accent-pink)]/18 blur-[140px]" aria-hidden />
          <div className="pointer-events-none absolute -bottom-32 -right-32 h-[36rem] w-[36rem] rounded-full bg-[var(--color-accent-cyan)]/14 blur-[140px]" aria-hidden />
          <div className="pointer-events-none absolute bottom-1/3 left-0 h-[22rem] w-[22rem] -translate-x-1/2 rounded-full bg-[var(--color-accent-violet)]/10 blur-[120px]" aria-hidden />

          {/* 3. Faint hex/grid pattern for the futuristic edge */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.06]"
            aria-hidden
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
              backgroundSize: '64px 64px',
              maskImage: 'radial-gradient(circle at center, black 30%, transparent 75%)',
            }}
          />

          {/* 4. Dark gradient overlay for legibility */}
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-bg-0)]/40 via-[var(--color-bg-0)]/65 to-[var(--color-bg-0)]" aria-hidden />

          {/* 5. Content */}
          <div className="relative z-10 mx-auto flex min-h-[100vh] max-w-6xl flex-col justify-center px-6 py-24">
            <div className="flex items-center gap-3">
              <HeroLiveStatus locale={locale} />
              <span className="hidden text-[10px] uppercase tracking-[0.25em] text-[var(--color-fg-3)] sm:inline">
                {c.heroKicker}
              </span>
            </div>

            <h1 className="mt-7 font-display text-[3.5rem] font-semibold leading-[0.92] tracking-tight sm:text-7xl md:text-[7.5rem] lg:text-[8.5rem]">
              <span className="block">{c.heroTitle}</span>
              <span className="block bg-gradient-to-r from-[var(--color-accent-pink)] via-[var(--color-accent-pink)] to-[var(--color-accent-violet)] bg-clip-text text-transparent">
                {c.heroTitleAccent}.
              </span>
            </h1>

            <p className="mt-7 max-w-2xl text-balance text-base text-[var(--color-fg-1)] sm:text-lg md:text-xl">
              {c.heroSub}
            </p>
            <p className="mt-3 text-xs text-[var(--color-fg-3)] sm:text-sm">
              {HERO_TAGLINE[locale](stats.cities)}
            </p>

            {/* Smart search — wide, prominent */}
            <div className="mt-10 w-full max-w-2xl">
              <SearchBox locale={locale} />
            </div>

            {/* Single CTA — anchor-scroll to the cities grid below. */}
            <nav aria-label="Primary call to action" className="mt-5 flex flex-wrap gap-2">
              <Link
                href="#cities"
                className="inline-flex items-center gap-1 rounded-full bg-[var(--color-accent-pink)] px-5 py-2 text-sm font-semibold text-[var(--color-bg-0)] shadow-[var(--shadow-glow-pink)] transition hover:brightness-110"
              >
                {c.citiesCta}
              </Link>
            </nav>

            {/* GPS-aware "near you" panel — hidden until location resolves */}
            <div className="mt-10">
              <HeroNearestPanel locale={locale} />
            </div>
          </div>

          {/* 6. Scroll affordance */}
          <div className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2" aria-hidden>
            <span className="block h-12 w-px animate-pulse bg-gradient-to-b from-[var(--color-accent-cyan)] to-transparent" />
          </div>
        </div>
      </section>

      {/* STATS STRIP — futuristic "live system" panel.
          Each metric has a colored accent + animated pulse dot. */}
      <section className="relative border-y border-[var(--color-bg-2)] bg-[var(--color-bg-1)]/60 backdrop-blur">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--color-accent-cyan)]/40 to-transparent" aria-hidden />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[var(--color-accent-pink)]/40 to-transparent" aria-hidden />
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-6 py-10 sm:grid-cols-4">
          <Stat n={stats.cities}        label={c.statsCities}        accent="cyan" />
          <Stat n={stats.venues}        label={c.statsVenues}        accent="pink" />
          <Stat n={stats.neighborhoods} label={c.statsNeighborhoods} accent="violet" />
          <Stat n={stats.locales}       label={c.statsLocales}       accent="amber" />
        </div>
      </section>

      {/* CITIES — top destinations grid with neon hover glow + ranking pill. */}
      <section id="cities" className="mx-auto w-full max-w-6xl px-6 py-16 scroll-mt-20">
        <div>
          <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">{c.citiesHeading}</h2>
          <p className="mt-2 text-[var(--color-fg-2)]">{c.citiesSub}</p>
        </div>

        {/* Phase K.12 — city images removed everywhere. Each city is now a
            compact "app button": text-only chip with rank, name, region and
            article count. Tile glows on hover; the actual city photo only
            appears inside the city page header (micro cover). */}
        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cities.slice(0, 6).map((city, idx) => (
            <li key={city.id}>
              <Link
                href={`/${locale}/cities/${city.slug}`}
                className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-[var(--color-bg-3)] bg-[var(--color-bg-1)] px-5 py-4 transition hover:-translate-y-0.5 hover:border-[var(--color-accent-pink)] hover:shadow-[0_18px_60px_-20px_rgba(255,45,149,0.45)]"
              >
                {/* Rank chip — keeps the futuristic "app launcher" feel */}
                <span
                  aria-hidden
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--color-bg-3)] bg-[var(--color-bg-0)] font-mono text-[11px] font-bold tracking-tight text-[var(--color-fg-1)] transition group-hover:border-[var(--color-accent-pink)] group-hover:text-[var(--color-accent-pink)]"
                >
                  {String(idx + 1).padStart(2, '0')}
                </span>

                <div className="min-w-0 flex-1">
                  {city.region && (
                    <p className="truncate text-[10px] uppercase tracking-widest text-[var(--color-fg-3)]">
                      {TILE_LOCALE[locale].region[city.region] ?? city.region}
                    </p>
                  )}
                  <p className="truncate font-display text-lg font-semibold text-[var(--color-fg-0)] transition group-hover:text-[var(--color-accent-pink)]">
                    {city.name}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-[var(--color-fg-2)]">
                    {city.venueCount > 0 ? `${city.venueCount} ${c.statsVenues}` : TILE_LOCALE[locale].comingSoon}
                  </p>
                </div>

                <span
                  aria-hidden
                  className="text-[var(--color-fg-3)] transition group-hover:translate-x-0.5 group-hover:text-[var(--color-accent-pink)]"
                >
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Phase K.3 — homepage trim. The old Categories chip row,
          Neighborhoods cross-city preview, and Top Venues grid are gone
          (category and venue pages no longer exist; neighborhoods now
          live inside each city's article guide via K.2). In their place:
          a Latest Articles section that pulls across-locale and links
          straight to /cities/{city}/{slug}. */}
      {latestArticles.length > 0 && (
        <section className="mx-auto w-full max-w-6xl px-6 py-16">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">{c.latestArticlesHeading}</h2>
              <p className="mt-2 text-[var(--color-fg-2)]">{c.latestArticlesSub}</p>
            </div>
          </div>
          <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {latestArticles.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/${locale}/cities/${citySlugById.get(a.cityId) ?? ''}/${a.slug}`}
                  className="group block overflow-hidden rounded-2xl border border-[var(--color-bg-2)] bg-[var(--color-bg-1)] transition hover:border-[var(--color-accent-cyan)]"
                >
                  {a.coverUrl && (
                    <div className="relative aspect-[16/9] w-full overflow-hidden">
                      <Image src={a.coverUrl} alt={a.title} fill sizes="(min-width: 1024px) 33vw, 50vw" className="object-cover transition group-hover:scale-105" />
                    </div>
                  )}
                  <div className="p-5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-fg-3)]">
                      {a.vertical} · {cityNameBySlug.get(citySlugById.get(a.cityId) ?? '') ?? ''}
                    </p>
                    <p className="mt-2 font-display text-lg font-semibold text-[var(--color-fg-0)]">{a.title}</p>
                    {a.subtitle && <p className="mt-2 text-sm text-[var(--color-fg-2)]">{a.subtitle}</p>}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mx-auto max-w-6xl px-6 py-4">
        <AdSlot id="home-mid" scope="site" />
      </div>

      {/* EDITORIAL GUIDES TEASE */}
      <section className="mx-auto w-full max-w-6xl px-6 py-12">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">{c.guidesHeading}</h2>
            <p className="mt-2 text-sm text-[var(--color-fg-2)]">{c.guidesSub}</p>
          </div>
          <Link href={`/${locale}/guides`} className="hidden text-sm text-[var(--color-accent-cyan)] hover:underline md:inline">
            →
          </Link>
        </div>

        <ul className="mt-6 grid gap-4 md:grid-cols-3">
          {guides.slice(0, 3).map((g) => {
            const city = cities.find((c) => c.slug === g.slug);
            return (
              <li key={g.slug}>
                <Link
                  href={`/${locale}/cities/${g.slug}`}
                  className="group relative block overflow-hidden rounded-lg border border-[var(--color-bg-3)] bg-[var(--color-bg-1)] p-5 transition hover:-translate-y-0.5 hover:border-[var(--color-accent-cyan)] hover:shadow-[0_14px_48px_-20px_rgba(0,212,255,0.4)]"
                >
                  <p className="text-[10px] uppercase tracking-widest text-[var(--color-fg-2)]">{TILE_LOCALE[locale].guidePrefix} · {g.season}</p>
                  <p className="mt-1 font-display text-xl font-semibold text-[var(--color-fg-0)] transition group-hover:text-[var(--color-accent-cyan)]">{city?.name ?? g.slug}</p>
                  <p className="mt-2 line-clamp-2 text-xs text-[var(--color-fg-1)]">{g.intro[locale].slice(0, 130)}…</p>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* OWNERS CTA */}
      <section className="mx-auto w-full max-w-6xl px-6 pb-20">
        <div className="relative overflow-hidden rounded-2xl border border-[var(--color-accent-pink)]/40 bg-gradient-to-br from-[var(--color-bg-1)] via-[var(--color-bg-2)] to-[var(--color-bg-1)] p-8 md:p-12">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[var(--color-accent-pink)]/20 blur-3xl" aria-hidden />
          <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-[var(--color-accent-cyan)]/15 blur-3xl" aria-hidden />
          <div className="relative">
            <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">{c.ownersHeading}</h2>
            <p className="mt-3 max-w-xl text-[var(--color-fg-1)]">{c.ownersBody}</p>
            <Link
              href={`/${locale}/for-owners`}
              className="mt-6 inline-flex items-center rounded-md bg-[var(--color-accent-pink)] px-5 py-2.5 text-sm font-semibold text-[var(--color-bg-0)] shadow-[var(--shadow-glow-pink)] transition hover:brightness-110"
            >
              {c.ownersCta}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

const STAT_ACCENT = {
  cyan:   { dot: 'bg-[var(--color-accent-cyan)]',   num: 'text-[var(--color-accent-cyan)]',   ring: 'shadow-[var(--shadow-glow-cyan)]' },
  pink:   { dot: 'bg-[var(--color-accent-pink)]',   num: 'text-[var(--color-accent-pink)]',   ring: 'shadow-[var(--shadow-glow-pink)]' },
  violet: { dot: 'bg-[var(--color-accent-violet)]', num: 'text-[var(--color-accent-violet)]', ring: 'shadow-[var(--shadow-glow-violet)]' },
  amber:  { dot: 'bg-[var(--color-accent-amber)]',  num: 'text-[var(--color-accent-amber)]',  ring: '' },
} as const;

function Stat({ n, label, accent = 'cyan' }: { n: number; label: string; accent?: keyof typeof STAT_ACCENT }) {
  const a = STAT_ACCENT[accent];
  return (
    <div className="group relative">
      <div className="flex items-center gap-2">
        <span className={`relative inline-flex h-2 w-2 ${a.dot}`} aria-hidden>
          <span className={`absolute inset-0 animate-ping rounded-full ${a.dot} opacity-60`} />
          <span className={`relative inline-flex h-2 w-2 rounded-full ${a.dot} ${a.ring}`} />
        </span>
        <p className={`font-display text-3xl font-bold tabular-nums tracking-tight md:text-5xl ${a.num}`}>
          {n.toLocaleString()}
        </p>
      </div>
      <p className="mt-2 text-[10px] uppercase tracking-[0.22em] text-[var(--color-fg-2)] sm:text-xs">{label}</p>
    </div>
  );
}
