// The city view. URL: /{locale}/cities/{city}  e.g. /el/cities/loutraki
//
// Direction A "Αντικύθηρα" (products/citynight/design/tokens.md, approved
// 2026-09-17; prototype design/2026-09-17-antikythera-prototype.html). The
// city opens on its instrument — how far the night has gone, when the sun set
// and will rise, how many places are open right now — and then lists what is
// open, with the guides underneath.
//
// Data reads are the ones this page already had (city row, its published
// guides, the category catalogue) plus the verified businesses those guides
// carry, which is where the opening hours behind every live state live. No
// new SQL, no schema change.

import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { isLocale, type Locale } from '@/lib/i18n';
import { publicMetadata } from '@/lib/seo';
import { getCityBySlug } from '@/lib/queries';
import { listArticlesByCity, listCategoriesForCity, listGuideBusinesses, type Article, type GuideBusiness, type OpeningPeriod } from '@/lib/articles';
import { formatPriceLevel } from '@/lib/opening-hours';
import { noEmDash } from '@/lib/article-md';
import { CityWeatherStrip } from '@/components/city-weather-strip';
import { CityLivePanel, type DialRing } from '@/components/city-live-panel';
import { opensLateTonight, venueState } from '@/components/venue-card';
import { athensClock } from '@/components/instrument/night';
import { todayWindows, windowsForDial } from '@/components/instrument/hours';
import { VenueFilters, type VenueRowData } from './venue-filters';

export const revalidate = 1800;

type Params = Promise<{ locale: string; city: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, city } = await params;
  if (!isLocale(locale)) return {};
  const cityRow = getCityBySlug(city, locale as Locale);
  if (!cityRow) return {};
  const t = COPY[locale === 'el' ? 'el' : 'en'];
  return publicMetadata({
    locale,
    paths: { el: `/el/cities/${city}`, en: `/en/cities/${city}` },
    // No suffix here: the root layout's title template already appends
    // "· citynight.gr", and adding it twice shipped "Λουτράκι · citynight.gr ·
    // citynight.gr" to search results (fixed 2026-09-19).
    title: cityRow.name,
    description: t.metaDescription(cityRow.name),
  });
}

export default async function CityView({ params }: { params: Params }) {
  const { locale, city } = await params;
  if (!isLocale(locale)) notFound();
  const cityRow = getCityBySlug(city, locale as Locale);
  if (!cityRow) notFound();

  const loc = locale as Locale;
  const t = COPY[locale === 'el' ? 'el' : 'en'];
  // One timestamp for the whole page, so the dial, the readings and every row
  // agree with each other. The page is ISR (30 min), so this is the moment it
  // was generated, not the moment it is read.
  const now = new Date();

  const articles = listArticlesByCity(cityRow.id, { locale, status: 'published' });
  const categories = listCategoriesForCity(cityRow.id, locale);

  // Every verified business the city's guides carry, once each. This is the
  // only place in the model that holds opening hours, so it is the only
  // honest source for "open now".
  const seen = new Set<string>();
  const venues: { business: GuideBusiness; article: Article }[] = [];
  for (const article of articles) {
    for (const business of listGuideBusinesses(article.id)) {
      if (seen.has(business.name)) continue;
      seen.add(business.name);
      venues.push({ business, article });
    }
  }

  // The hours stay on the server: the rows carry the reading, not the raw
  // periods, so the client payload is a few strings per venue.
  const hoursById = new Map<string, OpeningPeriod[] | null>();
  const rows: VenueRowData[] = venues.map(({ business: b, article: a }) => {
    const periods = b.openingHours?.periods ?? null;
    hoursById.set(b.id, periods);
    return {
      id: b.id,
      name: b.name,
      kind: SECTION_KIND[locale === 'el' ? 'el' : 'en'][b.sectionKind] ?? t.vertical[a.vertical],
      rating: b.rating,
      reviewCount: b.reviewCount,
      price: formatPriceLevel(b.priceLevel, locale === 'el' ? 'el' : 'en'),
      photoUrl: b.coverPhotoUrl,
      href: `/${locale}/cities/${city}/${a.slug}`,
      state: venueState(periods, loc, now),
      vertical: a.vertical,
      late: opensLateTonight(periods, now),
    };
  });
  rows.sort((x, y) => Number(y.state.open) - Number(x.state.open) || (y.rating ?? 0) - (x.rating ?? 0));

  const openNow = rows.filter((r) => r.state.open).length;
  // The three rings the dial draws, named beside it.
  const clock = athensClock(now);
  const rings: DialRing[] = rows.slice(0, 3).map((r) => ({
    name: r.name,
    state: r.state,
    hours: windowsForDial(todayWindows(hoursById.get(r.id) ?? null, clock)),
  }));

  const facts = [
    cityRow.population != null ? `${new Intl.NumberFormat(locale === 'el' ? 'el-GR' : locale).format(cityRow.population)} ${t.people}` : null,
    cityRow.terrain ? t.terrain[cityRow.terrain] ?? null : null,
    cityRow.distanceDriveMinutes != null ? `${cityRow.distanceDriveMinutes}′ ${t.fromAthens}` : null,
    cityRow.nearestAirportCode && cityRow.airportDriveMinutes != null
      ? `${t.airport} ${cityRow.nearestAirportCode} ${cityRow.airportDriveMinutes}′`
      : null,
  ].filter(Boolean).join(' · ');

  return (
    <div className="mx-auto w-full max-w-[1180px] px-5 md:px-8">
      <nav aria-label={t.breadcrumb} className="flex flex-wrap items-center gap-x-1.5 pt-2.5 text-[14px] text-[var(--color-muted)]">
        <Link href={`/${locale}`} className="inline-flex min-h-11 items-center underline underline-offset-4 hover:text-[var(--color-ink)]">
          {t.home}
        </Link>
        {cityRow.region && (
          <>
            <span aria-hidden>/</span>
            <span>{cityRow.region}</span>
          </>
        )}
        <span aria-hidden>/</span>
        <span aria-current="page">{cityRow.name}</span>
      </nav>

      <header className="grid gap-2.5 pt-3.5 pb-6">
        {cityRow.lat != null && cityRow.lng != null && (
          <p className="cn-readout text-[var(--color-muted)]">
            {cityRow.lat.toFixed(4)}° {t.north} · {cityRow.lng.toFixed(4)}° {t.east}
          </p>
        )}
        <h1 className="text-[clamp(2.2rem,7vw,4rem)] leading-[1.02] font-semibold tracking-[-0.025em]">
          {cityRow.name}
        </h1>
        {facts && <p className="cn-readout text-[var(--color-muted)]">{facts}</p>}
        <div className="mt-1">
          <CityWeatherStrip lat={cityRow.lat} lng={cityRow.lng} locale={locale} />
        </div>
      </header>

      <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="lg:sticky lg:top-[84px]">
          <CityLivePanel
            city={cityRow}
            locale={loc}
            openNow={rows.length > 0 ? openNow : undefined}
            total={rows.length > 0 ? rows.length : undefined}
            rings={rings}
            now={now}
          />
        </div>

        {rows.length > 0 ? (
          <VenueFilters rows={rows} locale={loc} />
        ) : (
          <section aria-labelledby="no-venues">
            <h2 id="no-venues" className="cn-readout text-[var(--color-muted)]">{t.noVenuesTitle}</h2>
            <p className="mt-3 max-w-[52ch] text-[var(--color-muted)]">{t.noVenues(cityRow.name)}</p>
          </section>
        )}
      </div>

      <section className="py-9" aria-labelledby="guides-title">
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 id="guides-title" className="text-[clamp(1.5rem,4vw,2.2rem)] leading-tight font-semibold tracking-[-0.015em]">
            {t.guides}
          </h2>
          <span className="cn-readout text-[var(--color-muted)]">
            {articles.length} {articles.length === 1 ? t.guideOne : t.guideMany}
          </span>
        </div>

        {articles.length === 0 ? (
          <p className="max-w-[52ch] text-[var(--color-muted)]">{t.noGuides(cityRow.name)}</p>
        ) : (
          <ul className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/${locale}/cities/${city}/${a.slug}`}
                  className="group grid h-full gap-2.5 rounded-[20px] border border-[var(--color-hair)] bg-[var(--color-surface)] p-[18px] transition-colors hover:border-[var(--color-bronze)]"
                >
                  <span className="cn-readout text-[var(--color-muted)]">
                    {t.vertical[a.vertical]} · {cityRow.name}
                  </span>
                  <span className="text-[19px] leading-tight font-semibold text-[var(--color-ink)] transition-colors group-hover:text-[var(--color-bronze)]">
                    {noEmDash(a.title)}
                  </span>
                  {(a.tagline ?? a.subtitle) && (
                    <span className="text-[15px] text-[var(--color-muted)]">{noEmDash(a.tagline ?? a.subtitle)}</span>
                  )}
                  {a.knownFor.length > 0 && (
                    <span className="flex flex-wrap gap-1.5">
                      {a.knownFor.slice(0, 4).map((k) => (
                        <span key={k} className="rounded-full border border-[var(--color-hair)] px-2.5 py-0.5 text-[13px] text-[var(--color-muted)]">
                          {k}
                        </span>
                      ))}
                    </span>
                  )}
                  {a.bestMonths.length > 0 && (
                    <>
                      <span className="cn-readout text-[var(--color-muted)]">
                        {t.bestMonths}
                        {a.typicalVisitLength ? ` · ${t.visit[a.typicalVisitLength]}` : ''}
                      </span>
                      <MonthsBar months={a.bestMonths} locale={locale === 'el' ? 'el' : 'en'} label={t.bestMonthsLabel} />
                    </>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}

        {categories.length > 0 && (
          <div className="mt-6 border-t border-[var(--color-hair)] pt-4">
            <p className="cn-readout text-[var(--color-muted)]">{t.whatYouLookFor}</p>
            <ul className="mt-2.5 flex flex-wrap gap-1.5">
              {categories.map((cat) => (
                <li
                  key={cat.id}
                  className="rounded-full border border-[var(--color-hair)] px-3 py-1 text-[14px] text-[var(--color-muted)]"
                >
                  {cat.name}
                  {cat.articleCount > 0 && (
                    <span className="cn-readout cn-readout-s ml-1.5 text-[var(--color-faint)]">{cat.articleCount}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}

/** Guides written before the voice rule still carry em dashes in the
 *  database. Until that copy is rewritten they render as colons, which is what
 *  the tokens say (tokens.md, voice). Nothing else about the text changes. */
// ─── the months bar ───────────────────────────────────────────────────

const MONTH_INITIAL: Record<'el' | 'en', string[]> = {
  el: ['Ι', 'Φ', 'Μ', 'Α', 'Μ', 'Ι', 'Ι', 'Α', 'Σ', 'Ο', 'Ν', 'Δ'],
  en: ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'],
};

function MonthsBar({ months, locale, label }: { months: number[]; locale: 'el' | 'en'; label: string }) {
  const on = new Set(months);
  const fmt = new Intl.DateTimeFormat(locale === 'el' ? 'el-GR' : 'en-GB', { month: 'long' });
  const names = months.map((m) => fmt.format(new Date(Date.UTC(2026, m - 1, 1)))).join(', ');
  return (
    <span className="grid w-full grid-cols-12 gap-[3px]" role="img" aria-label={`${label}: ${names}`}>
      {MONTH_INITIAL[locale].map((initial, i) => (
        <span
          key={i}
          aria-hidden
          className={`grid h-6 place-items-center rounded-[4px] border cn-readout cn-readout-s ${
            on.has(i + 1)
              ? 'border-[var(--color-bronze)] bg-[color-mix(in_srgb,var(--color-bronze)_22%,transparent)] text-[var(--color-ink)]'
              : 'border-[var(--color-hair)] text-[var(--color-muted)]'
          }`}
        >
          {initial}
        </span>
      ))}
    </span>
  );
}

// ─── copy ─────────────────────────────────────────────────────────────

// Section kinds are the editorial buckets the seed pipeline assigns; they are
// what a visitor would call the place. Anything unmapped falls back to the
// guide's vertical rather than inventing a category.
const SECTION_KIND: Record<'el' | 'en', Record<GuideBusiness['sectionKind'], string | undefined>> = {
  el: {
    seafront: 'Παραλιακή', casino: 'Καζίνο', beach: 'Beach bar', spa: 'Spa',
    seafood: 'Ψαροταβέρνα', taverna: 'Ταβέρνα', modern: 'Μοντέρνα κουζίνα',
    other: undefined, tail: undefined,
  },
  en: {
    seafront: 'Seafront', casino: 'Casino', beach: 'Beach bar', spa: 'Spa',
    seafood: 'Seafood taverna', taverna: 'Taverna', modern: 'Modern kitchen',
    other: undefined, tail: undefined,
  },
};

type CityCopy = {
  metaDescription: (city: string) => string;
  breadcrumb: string; home: string;
  north: string; east: string; people: string; fromAthens: string; airport: string;
  terrain: Record<string, string | undefined>;
  vertical: Record<'nightlife' | 'food' | 'stay', string>;
  visit: Record<'day_trip' | 'weekend' | 'week' | 'multi_day', string>;
  guides: string; guideOne: string; guideMany: string;
  bestMonths: string; bestMonthsLabel: string; whatYouLookFor: string;
  noGuides: (city: string) => string;
  noVenuesTitle: string; noVenues: (city: string) => string;
};

const COPY: Record<'el' | 'en', CityCopy> = {
  el: {
    metaDescription: (c) => `Τι είναι ανοιχτό τώρα στο ${c}, πότε δύει ο ήλιος και οι οδηγοί μας για νυχτερινή ζωή, φαγητό και διαμονή.`,
    breadcrumb: 'Διαδρομή', home: 'Αρχική',
    north: 'Β', east: 'Α', people: 'ΚΑΤΟΙΚΟΙ', fromAthens: 'ΑΠΟ ΑΘΗΝΑ', airport: 'ΑΕΡΟΔΡΟΜΙΟ',
    terrain: { seaside: 'ΠΑΡΑΘΑΛΑΣΣΙΑ', island: 'ΝΗΣΙ', island_capital: 'ΠΡΩΤΕΥΟΥΣΑ ΝΗΣΙΟΥ', mainland: 'ΗΠΕΙΡΩΤΙΚΗ', mountain: 'ΟΡΕΙΝΗ' },
    vertical: { nightlife: 'Νυχτερινή ζωή', food: 'Φαγητό', stay: 'Διαμονή' },
    visit: { day_trip: 'Ημερήσια', weekend: 'Σαββατοκύριακο', week: 'Μία εβδομάδα', multi_day: 'Λίγες μέρες' },
    guides: 'Οδηγοί', guideOne: 'ΟΔΗΓΟΣ', guideMany: 'ΟΔΗΓΟΙ',
    bestMonths: 'ΚΑΛΥΤΕΡΟΙ ΜΗΝΕΣ', bestMonthsLabel: 'Καλύτεροι μήνες', whatYouLookFor: 'ΤΙ ΨΑΧΝΕΙΣ',
    noGuides: (c) => `Δεν έχουμε ακόμη δημοσιευμένο οδηγό για ${c}. Μόλις βγει, θα είναι εδώ.`,
    noVenuesTitle: 'ΚΑΤΑΣΤΗΜΑΤΑ',
    noVenues: (c) => `Δεν έχουμε ακόμη επαληθευμένα καταστήματα για ${c}, οπότε δεν δείχνουμε ωράρια. Το όργανο πάνω διαβάζει τη νύχτα της πόλης.`,
  },
  en: {
    metaDescription: (c) => `What is open right now in ${c}, when the sun sets, and our guides to nightlife, food and stay.`,
    breadcrumb: 'Breadcrumb', home: 'Home',
    north: 'N', east: 'E', people: 'PEOPLE', fromAthens: 'FROM ATHENS', airport: 'AIRPORT',
    terrain: { seaside: 'SEASIDE', island: 'ISLAND', island_capital: 'ISLAND CAPITAL', mainland: 'MAINLAND', mountain: 'MOUNTAIN' },
    vertical: { nightlife: 'Nightlife', food: 'Food', stay: 'Stay' },
    visit: { day_trip: 'Day trip', weekend: 'Weekend', week: 'A week', multi_day: 'A few days' },
    guides: 'Guides', guideOne: 'GUIDE', guideMany: 'GUIDES',
    bestMonths: 'BEST MONTHS', bestMonthsLabel: 'Best months', whatYouLookFor: 'WHAT YOU LOOK FOR',
    noGuides: (c) => `No published guide for ${c} yet. It will be here the day it ships.`,
    noVenuesTitle: 'VENUES',
    noVenues: (c) => `We hold no verified venues for ${c} yet, so we show no hours. The instrument above still reads the city's night.`,
  },
};
