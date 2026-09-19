import { noEmDash } from '@/lib/article-md';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { isLocale, type Locale } from '@/lib/i18n';
import { listCitiesWithHero, siteStats } from '@/lib/queries';
import { listPublishedArticles, listGuideBusinesses } from '@/lib/articles';
import { AdSlot } from '@/components/ad-slot';
import { getAllCityGuides } from '@/content/cities';
import { HeroLiveStatus } from '@/components/hero-live-status';
import { HeroInstrument } from '@/components/hero-instrument';
import { TodayNameDay } from '@/components/today-name-day';
import { SmartDestinations } from '@/components/smart-destinations';
import { getCityWeather } from '@/lib/weather';
import { athensClock, caps } from '@/components/instrument/night';
import { todayWindows, type OpenWindow } from '@/components/instrument/hours';
import {
  publicMetadata, localizedPaths, jsonLdProps,
  organizationJsonLd, websiteJsonLd, breadcrumbJsonLd,
} from '@/lib/seo';

// The home page opens on the instrument, the way the prototype does: the
// statement, the live strip (time, how far the night has gone, what is open),
// the dial beside the cities, then the guides. Every number is a reading, and
// no reading is written that the data does not support.
//
// Direction A "Αντικύθηρα", products/citynight/design/tokens.md, 2026-09-17.

export const revalidate = 1800;

/** Athens. The editorial clock of the site: one sun for the whole page, named
 *  where it is shown so a visitor in Corfu is never told the wrong sunset. */
const ATHENS = { lat: 37.9838, lng: 23.7275 };

/** How many published guides we read for the "open now" count. Each one is a
 *  single indexed query and the page is ISR, so this stays cheap. */
const GUIDES_SAMPLED = 8;

const META: Record<Locale, { title: string; description: string }> = {
  en: { title: 'citynight: Greece nightlife, food & stay guide', description: 'Greece-wide guide for nightlife, restaurants and hotels. Real venues, real photos, five languages.' },
  el: { title: 'citynight: Οδηγός νυχτερινής ζωής, φαγητού & διαμονής στην Ελλάδα', description: 'Πανελλήνιος οδηγός για νυχτερινή ζωή, εστιατόρια και ξενοδοχεία. Πραγματικά μαγαζιά, πραγματικές φωτογραφίες, πέντε γλώσσες.' },
  de: { title: 'citynight: Griechenland: Nightlife, Essen & Übernachten', description: 'Landesweiter Guide für Nachtleben, Restaurants und Hotels in Griechenland. Echte Locations, echte Fotos, fünf Sprachen.' },
  fr: { title: 'citynight: Grèce : guide nightlife, cuisine & hébergement', description: 'Guide national pour la vie nocturne, les restaurants et les hôtels en Grèce. Vrais lieux, vraies photos, cinq langues.' },
  it: { title: 'citynight: Grecia: guida nightlife, cucina & alloggi', description: 'Guida nazionale per vita notturna, ristoranti e hotel in Grecia. Locali veri, foto vere, cinque lingue.' },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const m = META[locale];
  return publicMetadata({ locale, paths: localizedPaths(''), title: m.title, description: m.description });
}

// Region labels, shared in shape with the mega-menu and the cities grid.
const TILE_LOCALE: Record<Locale, { region: Record<string, string>; comingSoon: string; guidePrefix: string }> = {
  en: { comingSoon: 'Guide coming soon', guidePrefix: 'Guide', region: { 'Attica': 'Attica', 'South Aegean': 'Cyclades & Dodecanese', 'North Aegean': 'North Aegean', 'Crete': 'Crete', 'Ionian Islands': 'Ionian', 'Central Macedonia': 'Macedonia', 'Western Macedonia': 'West Macedonia', 'East Macedonia & Thrace': 'East Macedonia & Thrace', 'Peloponnese': 'Peloponnese', 'Epirus': 'Epirus', 'Thessaly': 'Sporades & Thessaly', 'Central Greece': 'Central Greece' } },
  el: { comingSoon: 'Οδηγός έρχεται', guidePrefix: 'Οδηγός', region: { 'Attica': 'Αττική', 'South Aegean': 'Κυκλάδες & Δωδεκάνησα', 'North Aegean': 'Βόρειο Αιγαίο', 'Crete': 'Κρήτη', 'Ionian Islands': 'Ιόνιο', 'Central Macedonia': 'Μακεδονία', 'Western Macedonia': 'Δυτική Μακεδονία', 'East Macedonia & Thrace': 'Αν. Μακεδονία & Θράκη', 'Peloponnese': 'Πελοπόννησος', 'Epirus': 'Ήπειρος', 'Thessaly': 'Σποράδες & Θεσσαλία', 'Central Greece': 'Στερεά Ελλάδα' } },
  de: { comingSoon: 'Guide folgt', guidePrefix: 'Guide', region: { 'Attica': 'Attika', 'South Aegean': 'Kykladen & Dodekanes', 'North Aegean': 'Nordägäis', 'Crete': 'Kreta', 'Ionian Islands': 'Ionische Inseln', 'Central Macedonia': 'Makedonien', 'Western Macedonia': 'Westmakedonien', 'East Macedonia & Thrace': 'Ostmakedonien & Thrakien', 'Peloponnese': 'Peloponnes', 'Epirus': 'Epirus', 'Thessaly': 'Sporaden & Thessalien', 'Central Greece': 'Mittelgriechenland' } },
  fr: { comingSoon: 'Guide bientôt', guidePrefix: 'Guide', region: { 'Attica': 'Attique', 'South Aegean': 'Cyclades & Dodécanèse', 'North Aegean': 'Égée du Nord', 'Crete': 'Crète', 'Ionian Islands': 'Îles ioniennes', 'Central Macedonia': 'Macédoine', 'Western Macedonia': 'Macédoine-Occidentale', 'East Macedonia & Thrace': 'Macédoine-Orientale & Thrace', 'Peloponnese': 'Péloponnèse', 'Epirus': 'Épire', 'Thessaly': 'Sporades & Thessalie', 'Central Greece': 'Grèce centrale' } },
  it: { comingSoon: 'Guida in arrivo', guidePrefix: 'Guida', region: { 'Attica': 'Attica', 'South Aegean': 'Cicladi & Dodecaneso', 'North Aegean': 'Egeo Settentrionale', 'Crete': 'Creta', 'Ionian Islands': 'Isole Ionie', 'Central Macedonia': 'Macedonia', 'Western Macedonia': 'Macedonia Occidentale', 'East Macedonia & Thrace': 'Macedonia Orientale & Tracia', 'Peloponnese': 'Peloponneso', 'Epirus': 'Epiro', 'Thessaly': 'Sporadi & Tessaglia', 'Central Greece': 'Grecia centrale' } },
};

const HERO_TAGLINE: Record<Locale, (cities: number) => string> = {
  en: (n) => `${n} CITIES · 3 VERTICALS · 5 LANGUAGES · NO CLICKBAIT`,
  el: (n) => `${n} ΠΟΛΕΙΣ · 3 ΚΑΤΗΓΟΡΙΕΣ · 5 ΓΛΩΣΣΕΣ · ΧΩΡΙΣ CLICKBAIT`,
  de: (n) => `${n} STÄDTE · 3 VERTICALS · 5 SPRACHEN · KEIN CLICKBAIT`,
  fr: (n) => `${n} VILLES · 3 VERTICALS · 5 LANGUES · ZÉRO CLICKBAIT`,
  it: (n) => `${n} CITTÀ · 3 VERTICALS · 5 LINGUE · ZERO CLICKBAIT`,
};

const COPY: Record<Locale, {
  heroTitle: string; heroSub: string;
  citiesHeading: string; citiesSub: string;
  citiesNearbyHeading: string; citiesNearbyHeadingNoCity: string; citiesNearbySub: string;
  citiesLivePill: string;
  guidesHeading: string; guidesCount: (n: number) => string; bestMonths: string; yearRound: string;
  latestHeading: string; latestSub: string;
  ownersHeading: string; ownersBody: string; ownersCta: string;
  statsArticles: string;
}> = {
  en: {
    heroTitle: 'Where Greece goes out.',
    heroSub: 'Greece the way locals go out. Guides to nightlife, food and stay, cross-checked with AI and edited by people.',
    citiesHeading: 'Top destinations', citiesSub: 'Every city is a guide: neighborhoods, scenes and the places that define them.',
    citiesNearbyHeading: 'Closest to {city}', citiesNearbyHeadingNoCity: 'Closest to you right now',
    citiesNearbySub: 'Cities sorted by live distance from your position.',
    citiesLivePill: 'live',
    guidesHeading: 'Guides', guidesCount: (n) => `${n} GUIDES`, bestMonths: 'BEST MONTHS', yearRound: 'ALL YEAR',
    latestHeading: 'Latest guides', latestSub: 'The newest ranked picks, city by city.',
    ownersHeading: 'Run a place?',
    ownersBody: 'Your own website in 60 seconds: your photos, your menu, your bookings. Free hosting forever. 19 euro a month only if you want your own domain.',
    ownersCta: 'Make your site',
    statsArticles: 'articles',
  },
  el: {
    heroTitle: 'Πού βγαίνει η Ελλάδα.',
    heroSub: 'Η Ελλάδα όπως βγαίνουν οι ντόπιοι. Οδηγοί νυχτερινής ζωής, φαγητού και διαμονής, διασταυρωμένοι με AI και επιμελημένοι από ανθρώπους.',
    citiesHeading: 'Κορυφαίοι προορισμοί', citiesSub: 'Κάθε πόλη είναι οδηγός: γειτονιές, σκηνές και τα μαγαζιά που την ορίζουν.',
    citiesNearbyHeading: 'Πιο κοντά στο {city}', citiesNearbyHeadingNoCity: 'Πιο κοντά σου τώρα',
    citiesNearbySub: 'Πόλεις ταξινομημένες με ζωντανή απόσταση από την τοποθεσία σου.',
    citiesLivePill: 'live',
    guidesHeading: 'Οδηγοί', guidesCount: (n) => `${n} ΟΔΗΓΟΙ`, bestMonths: 'ΚΑΛΥΤΕΡΟΙ ΜΗΝΕΣ', yearRound: 'ΟΛΟ ΤΟΝ ΧΡΟΝΟ',
    latestHeading: 'Πρόσφατοι οδηγοί', latestSub: 'Τα πιο πρόσφατα, πόλη πόλη.',
    ownersHeading: 'Έχεις μαγαζί;',
    ownersBody: 'Έτοιμο website σε 60 δευτερόλεπτα: οι φωτογραφίες σου, το μενού σου, οι κρατήσεις σου. Δωρεάν για πάντα. 19 ευρώ τον μήνα μόνο αν θέλεις δικό σου domain.',
    ownersCta: 'Φτιάξε το site σου',
    statsArticles: 'άρθρα',
  },
  de: {
    heroTitle: 'Wo Griechenland feiert.',
    heroSub: 'Griechenland, wie die Einheimischen ausgehen. Guides für Nachtleben, Essen und Übernachten, mit KI gegengeprüft und von Menschen redigiert.',
    citiesHeading: 'Top-Destinationen', citiesSub: 'Jede Stadt ist ein Guide: Viertel, Szenen und die Orte, die sie prägen.',
    citiesNearbyHeading: 'Am nächsten an {city}', citiesNearbyHeadingNoCity: 'Am nächsten zu Ihnen',
    citiesNearbySub: 'Städte nach Live-Entfernung zu Ihrem Standort.',
    citiesLivePill: 'live',
    guidesHeading: 'Guides', guidesCount: (n) => `${n} GUIDES`, bestMonths: 'BESTE MONATE', yearRound: 'GANZJÄHRIG',
    latestHeading: 'Neueste Guides', latestSub: 'Die frischesten Ranglisten, Stadt für Stadt.',
    ownersHeading: 'Lokal-Inhaber?',
    ownersBody: 'Ihre eigene Website in 60 Sekunden: Fotos, Speisekarte, Buchungen. Dauerhaft kostenlos. 19 Euro im Monat nur für die eigene Domain.',
    ownersCta: 'Website erstellen',
    statsArticles: 'Artikel',
  },
  fr: {
    heroTitle: 'Là où la Grèce sort.',
    heroSub: 'La Grèce comme la vivent les locaux. Des guides sorties, cuisine et hébergement, recoupés par IA et édités par des humains.',
    citiesHeading: 'Destinations phares', citiesSub: 'Chaque ville est un guide : quartiers, scènes et lieux qui la définissent.',
    citiesNearbyHeading: 'Au plus près de {city}', citiesNearbyHeadingNoCity: 'Au plus près de vous',
    citiesNearbySub: 'Villes triées par distance en direct depuis votre position.',
    citiesLivePill: 'live',
    guidesHeading: 'Guides', guidesCount: (n) => `${n} GUIDES`, bestMonths: 'MEILLEURS MOIS', yearRound: "TOUTE L'ANNÉE",
    latestHeading: 'Derniers guides', latestSub: 'Les classements les plus récents, ville par ville.',
    ownersHeading: 'Vous tenez un lieu ?',
    ownersBody: 'Votre site en 60 secondes : vos photos, votre carte, vos réservations. Gratuit pour toujours. 19 euros par mois uniquement pour votre propre domaine.',
    ownersCta: 'Créer mon site',
    statsArticles: 'articles',
  },
  it: {
    heroTitle: 'Dove esce la Grecia.',
    heroSub: 'La Grecia come la vivono i locali. Guide di vita notturna, cucina e alloggi, verificate con AI e curate da persone.',
    citiesHeading: 'Destinazioni top', citiesSub: 'Ogni città è una guida: quartieri, scene e i locali che la definiscono.',
    citiesNearbyHeading: 'Più vicino a {city}', citiesNearbyHeadingNoCity: 'Più vicino a te ora',
    citiesNearbySub: 'Città ordinate per distanza live dalla tua posizione.',
    citiesLivePill: 'live',
    guidesHeading: 'Guide', guidesCount: (n) => `${n} GUIDE`, bestMonths: 'MESI MIGLIORI', yearRound: 'TUTTO L’ANNO',
    latestHeading: 'Ultime guide', latestSub: 'Le classifiche più recenti, città per città.',
    ownersHeading: 'Hai un locale?',
    ownersBody: 'Il tuo sito in 60 secondi: le tue foto, il tuo menu, le tue prenotazioni. Gratis per sempre. 19 euro al mese solo se vuoi il tuo dominio.',
    ownersCta: 'Crea il tuo sito',
    statsArticles: 'articoli',
  },
};

const WRAP = 'mx-auto w-full max-w-[1180px] px-5 md:px-8';

const MONTH_INITIAL: Record<Locale, string[]> = {
  el: ['Ι', 'Φ', 'Μ', 'Α', 'Μ', 'Ι', 'Ι', 'Α', 'Σ', 'Ο', 'Ν', 'Δ'],
  en: ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'],
  de: ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'],
  fr: ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'],
  it: ['G', 'F', 'M', 'A', 'M', 'G', 'L', 'A', 'S', 'O', 'N', 'D'],
};

const MONTH_NAMES = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

/** The season line in content/cities/*.json is written by hand in English
 *  ("year-round", "May to October"). Parse the two shapes we actually use and
 *  return null for anything else, so the bar is never guessed. */
function seasonMonths(season: string | null | undefined): number[] | null {
  if (!season) return null;
  const s = season.toLowerCase().trim();
  if (s.includes('year') || s.includes('all year')) return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const range = /^([a-z]+)\s*(?:to|–|—|-)\s*([a-z]+)$/.exec(s);
  if (!range) return null;
  const from = MONTH_NAMES.indexOf(range[1] ?? '') + 1;
  const to = MONTH_NAMES.indexOf(range[2] ?? '') + 1;
  if (from < 1 || to < 1) return null;
  const out: number[] = [];
  for (let m = from; ; m = (m % 12) + 1) {
    out.push(m);
    if (m === to || out.length > 12) break;
  }
  return out;
}

/** The opening sentence of a guide, used as the card's tagline. Curated copy
 *  still carries em dashes in places; they read as colons until the copy is
 *  fixed at the source (voice rules in products/citynight/design/tokens.md). */
function tagline(intro: string): string {
  const firstStop = intro.indexOf('. ');
  const text = firstStop > 40 ? intro.slice(0, firstStop + 1) : intro.slice(0, 160);
  return text.replace(/\s*[\u2014\u2013]\s*/g, ': ').trim();
}

export default async function LocaleHome({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const c = COPY[locale];
  const cities = listCitiesWithHero(null, locale);
  const stats = siteStats();
  const guides = getAllCityGuides();
  const latestArticles = listPublishedArticles(locale, { limit: 6 });
  const cityBySlug = new Map(cities.map((cc) => [cc.slug, cc]));
  const citySlugById = new Map(cities.map((cc) => [cc.id, cc.slug]));

  // The sun over Athens, from Open-Meteo (cached 15 minutes in-process).
  const athens = await getCityWeather(ATHENS.lat, ATHENS.lng);

  // Today's opening windows for every verified business in the newest guides.
  // The browser recounts "open now" from these every minute, so the number on
  // the page is never older than the clock.
  const now = new Date();
  const clock = athensClock(now);
  const sampled = listPublishedArticles(locale, { limit: GUIDES_SAMPLED });
  const windows: OpenWindow[][] = [];
  for (const article of sampled) {
    for (const business of listGuideBusinesses(article.id)) {
      const w = todayWindows(business.openingHours?.periods, clock);
      if (w.length > 0) windows.push(w);
    }
  }

  const breadcrumbName: Record<Locale, string> = { en: 'Home', el: 'Αρχική', de: 'Start', fr: 'Accueil', it: 'Home' };
  const dateText = new Intl.DateTimeFormat(locale === 'el' ? 'el-GR' : locale, {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Athens',
  }).format(now);

  return (
    <>
      <script
        type="application/ld+json"
        {...jsonLdProps([
          organizationJsonLd(),
          websiteJsonLd(locale),
          breadcrumbJsonLd([{ name: breadcrumbName[locale], path: `/${locale}` }]),
        ])}
      />

      {/* THE STATEMENT — date and name day as a readout, then the one line
          the site is about, then what the site is made of. */}
      <section className={`${WRAP} grid gap-[18px] pb-7 pt-10`}>
        <p className="cn-readout flex flex-wrap items-center gap-x-2 text-[var(--color-muted)]">
          <span>{caps(dateText)}</span>
          <TodayNameDay locale={locale} variant="compact" />
        </p>

        <h1 className="font-display text-[clamp(2.5rem,9vw,5.6rem)] font-semibold leading-none tracking-[-0.03em]">
          {c.heroTitle}
        </h1>

        <p className="max-w-[52ch] text-[1.0625rem] leading-relaxed text-[var(--color-ink)] md:text-[1.25rem]">
          {c.heroSub}
        </p>

        <HeroLiveStatus
          locale={locale}
          nowISO={now.toISOString()}
          sunsetISO={athens?.sunsetIso ?? null}
          sunriseISO={athens?.sunriseIso ?? null}
          windows={windows}
          total={windows.length}
        />

        <p className="cn-readout text-[var(--color-muted)]">{HERO_TAGLINE[locale](stats.cities)}</p>
      </section>

      {/* THE INSTRUMENT — the dial, the readings, the cities next to it. */}
      <div className={WRAP}>
        <HeroInstrument
          locale={locale}
          nowISO={now.toISOString()}
          sunsetISO={athens?.sunsetIso ?? null}
          sunriseISO={athens?.sunriseIso ?? null}
          windows={windows}
          total={windows.length}
          cities={cities.slice(0, 5).map((city) => ({
            slug: city.slug,
            name: city.name,
            region: city.region ? (TILE_LOCALE[locale].region[city.region] ?? city.region) : null,
            lat: city.lat,
            lng: city.lng,
          }))}
          fallbackCitySlug={cities[0]?.slug ?? null}
        />
      </div>

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

      {/* THE GUIDES — one card per city guide: what it is known for, and the
          months the city is worth it. Both come from the curated content. */}
      <section id="guides" className={`${WRAP} scroll-mt-20 py-9`} aria-labelledby="guides-heading">
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 id="guides-heading" className="font-display text-[clamp(1.5rem,4vw,2.2rem)] font-semibold leading-tight tracking-[-0.015em]">
            {c.guidesHeading}
          </h2>
          <span className="cn-readout text-[var(--color-muted)]">{c.guidesCount(guides.length)}</span>
        </div>

        <ul className="grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
          {guides.slice(0, 6).map((guide) => {
            const city = cityBySlug.get(guide.slug);
            const months = seasonMonths(guide.season);
            const knownFor = guide.bestFor[locale] ?? guide.bestFor.en ?? [];
            return (
              <li key={guide.slug}>
                <Link
                  href={`/${locale}/cities/${guide.slug}`}
                  className="group grid h-full gap-2.5 rounded-[var(--radius-md)] border border-[var(--color-hair)] bg-[var(--color-surface)] p-[18px] transition-colors duration-[var(--motion-fast)] hover:border-[var(--color-bronze)]"
                >
                  <span className="cn-readout cn-readout-s uppercase text-[var(--color-muted)]">
                    {TILE_LOCALE[locale].guidePrefix}
                    {city?.region ? ` · ${TILE_LOCALE[locale].region[city.region] ?? city.region}` : ''}
                  </span>
                  <span className="font-display text-[19px] font-semibold leading-tight transition-colors duration-[var(--motion-fast)] group-hover:text-[var(--color-bronze)]">
                    {city?.name ?? guide.slug}
                  </span>
                  <span className="line-clamp-3 text-[15px] text-[var(--color-muted)]">
                    {tagline(guide.intro[locale])}
                  </span>
                  {knownFor.length > 0 && (
                    <span className="flex flex-wrap gap-1.5">
                      {knownFor.slice(0, 4).map((k) => (
                        <span key={k} className="rounded-full border border-[var(--color-hair)] px-2.5 py-0.5 text-[13px] text-[var(--color-muted)]">
                          {k}
                        </span>
                      ))}
                    </span>
                  )}
                  {months && (
                    <>
                      <span className="cn-readout cn-readout-s uppercase text-[var(--color-muted)]">
                        {months.length === 12 ? c.yearRound : c.bestMonths}
                      </span>
                      <MonthsBar months={months} locale={locale} />
                    </>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {latestArticles.length > 0 && (
        <section className={`${WRAP} py-9`} aria-labelledby="latest-heading">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h2 id="latest-heading" className="font-display text-[clamp(1.5rem,4vw,2.2rem)] font-semibold leading-tight tracking-[-0.015em]">
              {c.latestHeading}
            </h2>
            <span className="cn-readout text-[var(--color-muted)]">{latestArticles.length}</span>
          </div>
          <ul className="border-t border-[var(--color-hair)]">
            {latestArticles.map((a) => {
              const slug = citySlugById.get(a.cityId) ?? '';
              return (
                <li key={a.id}>
                  <Link
                    href={`/${locale}/cities/${slug}/${a.slug}`}
                    className="flex min-h-16 items-center justify-between gap-4 border-b border-[var(--color-hair)] py-3.5 transition-colors duration-[var(--motion-fast)] hover:text-[var(--color-bronze)]"
                  >
                    <span className="min-w-0">
                      <span className="block font-semibold leading-tight">{noEmDash(a.title)}</span>
                      <span className="cn-readout cn-readout-s block truncate text-[var(--color-muted)]">
                        {caps(a.vertical)} · {caps(cityBySlug.get(slug)?.name ?? '')}
                      </span>
                    </span>
                    <span aria-hidden className="cn-readout shrink-0 text-[var(--color-muted)]">→</span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 text-[15px] text-[var(--color-muted)]">{c.latestSub}</p>
        </section>
      )}

      <div className={`${WRAP} py-2`}>
        <AdSlot id="home-mid" scope="site" />
      </div>

      {/* OWNERS — the one commercial line on the page. */}
      <section className={`${WRAP} pb-16 pt-9`}>
        <div className="rounded-[var(--radius-md)] border border-[var(--color-hair)] bg-[var(--color-surface)] p-[18px] md:p-7">
          <h2 className="font-display text-[clamp(1.5rem,4vw,2.2rem)] font-semibold leading-tight tracking-[-0.015em]">
            {c.ownersHeading}
          </h2>
          <p className="mt-2.5 max-w-[52ch] text-[var(--color-muted)]">{c.ownersBody}</p>
          <Link
            href={`/${locale}/for-owners`}
            className="mt-5 inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--color-bronze)] px-[22px] font-semibold text-[var(--color-on-bronze)] transition-transform duration-[var(--motion-fast)] active:scale-[0.98]"
          >
            {c.ownersCta}
          </Link>
        </div>
      </section>
    </>
  );
}

/** Twelve cells, the months the guide names filled in bronze. A reading, not
 *  a decoration: the letters are the month initials in the page language. */
function MonthsBar({ months, locale }: { months: number[]; locale: Locale }) {
  const on = new Set(months);
  const initials = MONTH_INITIAL[locale] ?? MONTH_INITIAL.en;
  return (
    <span className="grid w-full grid-cols-12 gap-[3px]" aria-hidden>
      {initials.map((letter, i) => (
        <span
          key={`${letter}-${i}`}
          className={`grid h-[22px] place-items-center rounded-[4px] border cn-readout cn-readout-s ${
            on.has(i + 1)
              ? 'border-[var(--color-bronze)] bg-[color-mix(in_srgb,var(--color-bronze)_22%,transparent)] text-[var(--color-ink)]'
              : 'border-[var(--color-hair)] text-[var(--color-muted)]'
          }`}
        >
          {letter}
        </span>
      ))}
    </span>
  );
}
