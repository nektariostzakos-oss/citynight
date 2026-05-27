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
import { AdSlot } from '@/components/ad-slot';
import { getAllCityGuides } from '@/content/cities';
import { HeroLiveStatus } from '@/components/hero-live-status';
import { HeroNearestPanel } from '@/components/hero-nearest-panel';
import { HeroSmartCTA } from '@/components/hero-smart-cta';
import { SmartDestinations } from '@/components/smart-destinations';
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
// Niche, conversion-leaning tagline — leads with what makes the site
// different (locals + AI cross-check) and ends with the "no clickbait"
// promise instead of a generic "curated by people" line.
const HERO_TAGLINE: Record<Locale, (cities: number) => string> = {
  en: (n) => `${n} cities · 3 verticals · 5 languages · zero clickbait`,
  el: (n) => `${n} πόλεις · 3 κατηγορίες · 5 γλώσσες · χωρίς clickbait`,
  de: (n) => `${n} Städte · 3 Verticals · 5 Sprachen · null Clickbait`,
  fr: (n) => `${n} villes · 3 verticals · 5 langues · zéro clickbait`,
  it: (n) => `${n} città · 3 verticals · 5 lingue · zero clickbait`,
};

const COPY: Record<Locale, {
  heroKicker: string;
  heroTitle: string;
  heroTitleAccent: string;
  heroSub: string;
  citiesHeading: string;
  citiesSub: string;
  citiesCta: string;
  citiesNearbyHeading: string;        // template — must include {city}
  citiesNearbyHeadingNoCity: string;
  citiesNearbySub: string;
  citiesLivePill: string;
  heroCtaPickCity: string;
  heroCtaNearestGuide: string;        // template — must include {city}
  latestArticlesHeading: string;
  latestArticlesSub: string;
  ownersHeading: string;
  ownersBody: string;
  ownersCta: string;
  statsCities: string;
  statsArticles: string;
  statsNeighborhoods: string;
  statsLocales: string;
  guidesHeading: string;
  guidesSub: string;
}> = {
  en: {
    heroKicker: 'Greece · nightlife guide',
    heroTitle: 'Where Greece',
    heroTitleAccent: 'goes out',
    heroSub: 'The Greece locals actually go out to. AI-checked, human-curated guides for nightlife, food and stay — across every city worth knowing.',
    citiesHeading: 'Top destinations',
    citiesSub: 'Each city is a guide — neighborhoods, scenes, and the venues that define them.',
    citiesCta: 'All cities →',
    citiesNearbyHeading: 'Closest to {city}',
    citiesNearbyHeadingNoCity: 'Closest to you right now',
    citiesNearbySub: 'Cities sorted by live distance from your current location.',
    citiesLivePill: 'live',
    heroCtaPickCity: 'Pick a city',
    heroCtaNearestGuide: 'Open the {city} guide',
    latestArticlesHeading: 'Latest guides',
    latestArticlesSub: 'Fresh ranked picks across every city.',
    ownersHeading: 'Run a venue?',
    ownersBody: 'Get your own website in 60 seconds — your photos, your menu, your bookings. Free hosted forever. €19/mo only if you want your own domain.',
    ownersCta: 'Make your site →',
    statsCities: 'cities', statsArticles: 'articles', statsNeighborhoods: 'neighborhoods', statsLocales: 'languages',
    guidesHeading: 'Editorial guides',
    guidesSub: 'Long-form, evergreen, written by people who know the cities.',
  },
  el: {
    heroKicker: 'Ελλάδα · οδηγός νυχτερινής ζωής',
    heroTitle: 'Πού βγαίνει',
    heroTitleAccent: 'η Ελλάδα',
    heroSub: 'Η Ελλάδα όπως βγαίνουν οι ντόπιοι. Οδηγοί νυχτερινής ζωής, φαγητού και διαμονής — διασταυρωμένοι με AI, επιμελημένοι από ανθρώπους.',
    citiesHeading: 'Κορυφαίοι προορισμοί',
    citiesSub: 'Κάθε πόλη είναι οδηγός — γειτονιές, σκηνές, και τα μαγαζιά που την ορίζουν.',
    citiesCta: 'Όλες οι πόλεις →',
    citiesNearbyHeading: 'Πιο κοντά στο {city}',
    citiesNearbyHeadingNoCity: 'Πιο κοντά σου τώρα',
    citiesNearbySub: 'Πόλεις ταξινομημένες με ζωντανή απόσταση από την τοποθεσία σου.',
    citiesLivePill: 'live',
    heroCtaPickCity: 'Διάλεξε πόλη',
    heroCtaNearestGuide: 'Δες τον οδηγό για το {city}',
    latestArticlesHeading: 'Πρόσφατοι οδηγοί',
    latestArticlesSub: 'Φρέσκα ranked picks από κάθε πόλη.',
    ownersHeading: 'Έχεις μαγαζί;',
    ownersBody: 'Έτοιμο website σε 60 δευτερόλεπτα — οι φωτογραφίες σου, το μενού σου, οι κρατήσεις σου. Δωρεάν για πάντα. €19/μήνα μόνο για δικό σου domain.',
    ownersCta: 'Φτιάξε το site σου →',
    statsCities: 'πόλεις', statsArticles: 'άρθρα', statsNeighborhoods: 'γειτονιές', statsLocales: 'γλώσσες',
    guidesHeading: 'Editorial οδηγοί',
    guidesSub: 'Μεγάλα κείμενα, evergreen, γραμμένα από ανθρώπους που ξέρουν.',
  },
  de: {
    heroKicker: 'Griechenland · Nightlife-Guide',
    heroTitle: 'Wo Griechenland',
    heroTitleAccent: 'feiert',
    heroSub: 'Griechenland, wie die Einheimischen feiern. KI-geprüft, von Menschen kuratiert — Nightlife, Essen und Übernachten in jeder Stadt, die zählt.',
    citiesHeading: 'Top-Destinationen',
    citiesSub: 'Jede Stadt ist ein Guide — Viertel, Szenen und die Locations, die sie prägen.',
    citiesCta: 'Alle Städte →',
    citiesNearbyHeading: 'Am nächsten an {city}',
    citiesNearbyHeadingNoCity: 'Am nächsten zu Ihnen',
    citiesNearbySub: 'Städte sortiert nach Live-Entfernung zu Ihrem Standort.',
    citiesLivePill: 'live',
    heroCtaPickCity: 'Stadt wählen',
    heroCtaNearestGuide: 'Guide für {city} öffnen',
    latestArticlesHeading: 'Neueste Guides',
    latestArticlesSub: 'Frische Ranglisten aus jeder Stadt.',
    ownersHeading: 'Lokal-Inhaber?',
    ownersBody: 'Ihre eigene Website in 60 Sekunden — Fotos, Speisekarte, Buchungen. Dauerhaft kostenlos. €19/Monat nur für eigene Domain.',
    ownersCta: 'Website erstellen →',
    statsCities: 'Städte', statsArticles: 'Artikel', statsNeighborhoods: 'Viertel', statsLocales: 'Sprachen',
    guidesHeading: 'Editorial-Guides',
    guidesSub: 'Lang, evergreen, geschrieben von Menschen, die die Städte kennen.',
  },
  fr: {
    heroKicker: 'Grèce · guide nocturne',
    heroTitle: 'Où la Grèce',
    heroTitleAccent: 'sort',
    heroSub: 'La Grèce comme la vivent les locaux. Sorties, restos et hôtels — vérifiés par IA, sélectionnés par des humains.',
    citiesHeading: 'Destinations phares',
    citiesSub: 'Chaque ville est un guide — quartiers, scènes, lieux qui la définissent.',
    citiesCta: 'Toutes les villes →',
    citiesNearbyHeading: 'Au plus près de {city}',
    citiesNearbyHeadingNoCity: 'Au plus près de vous',
    citiesNearbySub: 'Villes triées par distance en direct depuis votre position.',
    citiesLivePill: 'live',
    heroCtaPickCity: 'Choisir une ville',
    heroCtaNearestGuide: 'Ouvrir le guide de {city}',
    latestArticlesHeading: 'Derniers guides',
    latestArticlesSub: 'Nouveaux classements pour chaque ville.',
    ownersHeading: 'Propriétaire ?',
    ownersBody: 'Votre propre site en 60 secondes — photos, menu, réservations. Gratuit pour toujours. €19/mois uniquement pour votre propre domaine.',
    ownersCta: 'Créer mon site →',
    statsCities: 'villes', statsArticles: 'articles', statsNeighborhoods: 'quartiers', statsLocales: 'langues',
    guidesHeading: 'Guides éditoriaux',
    guidesSub: 'Long format, intemporels, écrits par des gens qui connaissent.',
  },
  it: {
    heroKicker: 'Grecia · guida notturna',
    heroTitle: 'Dove la Grecia',
    heroTitleAccent: 'esce',
    heroSub: 'La Grecia che vivono i locali. Vita notturna, ristoranti e alloggi — verificati con AI, selezionati da chi sa.',
    citiesHeading: 'Destinazioni top',
    citiesSub: 'Ogni città è una guida — quartieri, scene e i locali che la definiscono.',
    citiesCta: 'Tutte le città →',
    citiesNearbyHeading: 'Più vicino a {city}',
    citiesNearbyHeadingNoCity: 'Più vicino a te ora',
    citiesNearbySub: 'Città ordinate per distanza live dalla tua posizione.',
    citiesLivePill: 'live',
    heroCtaPickCity: 'Scegli una città',
    heroCtaNearestGuide: 'Apri la guida di {city}',
    latestArticlesHeading: 'Ultime guide',
    latestArticlesSub: 'Nuove classifiche da ogni città.',
    ownersHeading: 'Hai un locale?',
    ownersBody: 'Il tuo sito in 60 secondi — foto, menu, prenotazioni. Gratis per sempre. €19/mese solo per il tuo dominio.',
    ownersCta: 'Crea il tuo sito →',
    statsCities: 'città', statsArticles: 'articoli', statsNeighborhoods: 'quartieri', statsLocales: 'lingue',
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

      {/* HERO — typographic centerpiece. Search was removed (the global
          header carries it) and the heroKicker eyebrow was folded into
          the live pill so the chrome above the H1 is a single strip,
          not two competing labels. Mobile gets shorter padding + a
          full-width CTA so the H1 + sub + CTA all fit one viewport. */}
      <section className="relative isolate overflow-hidden">
        <div className="relative min-h-[85svh] w-full md:min-h-[100vh]">
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
          <div className="relative z-10 mx-auto flex min-h-[85svh] max-w-6xl flex-col justify-center px-6 py-16 md:min-h-[100vh] md:py-24">
            {/* Single live-status pill — replaces the old two-piece
                "[Live · 16:52 · Open now]   GREECE · NIGHTLIFE GUIDE"
                row, which read as two competing labels on mobile. */}
            <div>
              <HeroLiveStatus locale={locale} />
            </div>

            <h1 className="mt-6 font-display text-5xl font-semibold leading-[0.92] tracking-tight sm:text-7xl md:mt-7 md:text-[7.5rem] lg:text-[8.5rem]">
              <span className="block">{c.heroTitle}</span>
              <span className="block bg-gradient-to-r from-[var(--color-accent-pink)] via-[var(--color-accent-pink)] to-[var(--color-accent-violet)] bg-clip-text text-transparent">
                {c.heroTitleAccent}.
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-balance text-base text-[var(--color-fg-1)] sm:text-lg md:mt-7 md:text-xl">
              {c.heroSub}
            </p>
            <p className="mt-3 text-xs text-[var(--color-fg-3)] sm:text-sm">
              {HERO_TAGLINE[locale](stats.cities)}
            </p>

            {/* Smart CTA — rewrites to "Δες τον οδηγό για το {city}"
                once GPS resolves and links straight to that city's
                guide. Falls back to "Διάλεξε πόλη" → #cities anchor
                when no GPS yet. */}
            <HeroSmartCTA
              locale={locale}
              copy={{ pickCity: c.heroCtaPickCity, nearestGuide: c.heroCtaNearestGuide }}
            />

            {/* GPS-aware "near you" panel — hidden until location resolves */}
            <div className="mt-8 md:mt-10">
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
          <Stat n={stats.articles}      label={c.statsArticles}      accent="pink" />
          <Stat n={stats.neighborhoods} label={c.statsNeighborhoods} accent="violet" />
          <Stat n={stats.locales}       label={c.statsLocales}       accent="amber" />
        </div>
      </section>

      {/* CITIES — server renders the canonical top 6 (by article count
          desc → alphabetical). Once GPS resolves, the client re-orders
          the same set by live distance and flips the heading to
          "Closest to {visitor city}" + adds a distance chip per tile. */}
      <SmartDestinations
        cities={cities}
        locale={locale}
        serverTop={cities.slice(0, 6).map((_, i) => i)}
        copy={{
          headingDefault: c.citiesHeading,
          headingNearby: c.citiesNearbyHeading,
          headingNearbyNoCity: c.citiesNearbyHeadingNoCity,
          subDefault: c.citiesSub,
          subNearby: c.citiesNearbySub,
          comingSoon: TILE_LOCALE[locale].comingSoon,
          articlesLabel: c.statsArticles,
          livePill: c.citiesLivePill,
          regionLabels: TILE_LOCALE[locale].region,
        }}
      />

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
