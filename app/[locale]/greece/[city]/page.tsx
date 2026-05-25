import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { isLocale, LOCALES, type Locale } from '@/lib/i18n';
import {
  getCityBySlug,
  listVenuesForCity,
  listCategories,
  listCityLocationPhotos,
  listNearbyCities,
} from '@/lib/queries';
import { VenueCard } from '@/components/venue-card';
import { AdSlot } from '@/components/ad-slot';
import { CityHero } from '@/components/city-hero';
import { NeighborhoodGrid } from '@/components/neighborhood-grid';
import {
  publicMetadata, jsonLdProps,
  breadcrumbJsonLd, itemListJsonLd, cityPlaceJsonLd,
} from '@/lib/seo';
import { getCityGuide } from '@/content/cities';

// City pages — re-cut hourly. Owner edits flip them sooner via
// revalidatePath() from the venues PATCH route, so changes are visible
// within seconds regardless of this window.
export const revalidate = 3600;

const NEIGHBOURHOODS_HEADING: Record<Locale, string> = {
  en: 'Where to go, by neighborhood',
  el: 'Πού να πας, ανά γειτονιά',
  de: 'Wohin gehen — nach Viertel',
  fr: 'Où sortir, par quartier',
  it: 'Dove andare, per quartiere',
};

const CATEGORIES_HEADING: Record<Locale, string> = {
  en: 'By the kind of night you want',
  el: 'Ανάλογα με τη βραδιά που θες',
  de: 'Nach Art der Nacht',
  fr: 'Selon le type de soirée',
  it: 'Per tipo di serata',
};

const VENUES_HEADING: Record<Locale, string> = {
  en: 'Top venues right now',
  el: 'Κορυφαία μαγαζιά τώρα',
  de: 'Top-Locations gerade jetzt',
  fr: 'Lieux phares du moment',
  it: 'Locali top in questo momento',
};

const NO_VENUES_COPY: Record<Locale, string> = {
  en: "We're indexing venues for this city now. The guide is up; venue listings follow shortly.",
  el: 'Καταγράφουμε τα μαγαζιά της πόλης. Ο οδηγός είναι έτοιμος· οι καταχωρήσεις έρχονται σύντομα.',
  de: 'Wir indexieren gerade die Locations dieser Stadt. Der Guide ist online; die Einträge folgen in Kürze.',
  fr: 'Nous indexons les lieux de cette ville. Le guide est en ligne ; les fiches arrivent.',
  it: 'Stiamo indicizzando i locali di questa città. La guida è online; le schede arrivano a breve.',
};

const META: Record<Locale, { title: (c: string) => string; description: (c: string) => string; editorialSoon: (c: string) => string }> = {
  en: { title: (c) => `${c} nightlife guide — clubs, bars, beach clubs`, description: (c) => `Nightlife in ${c} — clubs, rooftops, bouzoukia, beach clubs.`, editorialSoon: (c) => `Nightlife guide for ${c}. Editorial coming soon.` },
  el: { title: (c) => `${c} — οδηγός νυχτερινής ζωής, μπαρ & beach clubs`, description: (c) => `Νυχτερινή ζωή στην ${c} — κλαμπ, ρουφ-τοπ, μπουζούκια, beach clubs.`, editorialSoon: (c) => `Οδηγός νυχτερινής ζωής για ${c}. Το συντακτικό έρχεται σύντομα.` },
  de: { title: (c) => `${c} Nightlife-Guide — Clubs, Bars, Beachclubs`, description: (c) => `Nachtleben in ${c} — Clubs, Rooftops, Bouzoukia, Beachclubs.`, editorialSoon: (c) => `Nightlife-Guide für ${c}. Redaktioneller Inhalt folgt in Kürze.` },
  fr: { title: (c) => `${c} — guide de la vie nocturne : clubs, bars, beach clubs`, description: (c) => `Vie nocturne à ${c} — clubs, rooftops, bouzoukia, beach clubs.`, editorialSoon: (c) => `Guide nightlife pour ${c}. Contenu rédactionnel bientôt.` },
  it: { title: (c) => `${c} — guida alla vita notturna: club, bar, beach club`, description: (c) => `Vita notturna a ${c} — club, rooftop, bouzoukia, beach club.`, editorialSoon: (c) => `Guida nightlife per ${c}. Contenuto redazionale in arrivo.` },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string; city: string }> }): Promise<Metadata> {
  const { locale, city } = await params;
  if (!isLocale(locale)) return {};
  const c = getCityBySlug(city, locale);
  if (!c) return {};
  const guide = getCityGuide(city);
  const m = META[locale];
  const paths: Partial<Record<Locale, string>> = {};
  for (const l of LOCALES) paths[l] = `/${l}/greece/${c.slug}`;
  // OG image: city hero if we have one. Falls back to /og.png inside publicMetadata.
  const photos = listCityLocationPhotos(c.id);
  const hero = photos.find((p) => p.isPrimary) ?? photos[0] ?? null;
  return publicMetadata({
    locale,
    paths,
    title: m.title(c.name),
    description: guide?.intro[locale]?.slice(0, 160) ?? m.description(c.name),
    ogImage: hero?.url ?? null,
  });
}

export default async function CityPage({ params }: { params: Promise<{ locale: string; city: string }> }) {
  const { locale, city } = await params;
  if (!isLocale(locale)) notFound();
  const cityRow = getCityBySlug(city, locale);
  if (!cityRow) notFound();

  const guide = getCityGuide(city); // null for cities without an editorial guide yet
  const photos = listCityLocationPhotos(cityRow.id);
  const heroPhoto = photos.find((p) => p.isPrimary) ?? photos[0] ?? null;
  const supportingPhotos = photos.filter((p) => p !== heroPhoto).slice(0, 3);
  const venues = listVenuesForCity(cityRow.id, locale, { limit: 60 });
  const categories = listCategories(locale);
  const nearbyCities = listNearbyCities(cityRow.id, locale, 6);

  // Top-10 venues for the ItemList JSON-LD (vs. the 60 we render in the
  // grid — keeps the structured-data signal focused on the editorially-
  // strongest set instead of every published listing).
  const topVenues = venues.slice(0, 10);

  // Group by category so each shows up as its own H3 sub-section. Keeps
  // anchor-text descriptive ("best bars in {city}" → bar venue names) and
  // gives Google a clearer topical map of the city.
  const venuesByCategory = new Map<string, { slug: string; name: string; venues: typeof venues }>();
  for (const v of venues) {
    if (!v.categorySlug || !v.categoryName) continue;
    if (!venuesByCategory.has(v.categorySlug)) {
      venuesByCategory.set(v.categorySlug, { slug: v.categorySlug, name: v.categoryName, venues: [] });
    }
    venuesByCategory.get(v.categorySlug)!.venues.push(v);
  }

  // Localized labels for the new content blocks.
  const NEARBY_LABEL: Record<Locale, string> = { en: 'Nearby cities', el: 'Κοντινές πόλεις', de: 'In der Nähe', fr: 'Villes proches',   it: 'Città vicine' };
  const BY_CATEGORY_LABEL: Record<Locale, (city: string) => string> = {
    en: (c) => `${c} by category`, el: (c) => `${c} ανά κατηγορία`, de: (c) => `${c} nach Kategorie`, fr: (c) => `${c} par catégorie`, it: (c) => `${c} per categoria`,
  };
  const TOP_LABEL: Record<Locale, (city: string) => string> = {
    en: (c) => `Top venues in ${c}`, el: (c) => `Κορυφαία μαγαζιά στην ${c}`, de: (c) => `Top-Locations in ${c}`, fr: (c) => `Lieux phares à ${c}`, it: (c) => `Locali top a ${c}`,
  };

  const greeceLabel: Record<Locale, string> = { en: 'Greece', el: 'Ελλάδα', de: 'Griechenland', fr: 'Grèce', it: 'Grecia' };
  const homeLabel: Record<Locale, string> = { en: 'Home', el: 'Αρχική', de: 'Start', fr: 'Accueil', it: 'Home' };

  return (
    <>
      {/* JSON-LD: Breadcrumb + ItemList of venues + Place for the city */}
      <script
        type="application/ld+json"
        {...jsonLdProps([
          breadcrumbJsonLd([
            { name: homeLabel[locale], path: `/${locale}` },
            { name: greeceLabel[locale], path: `/${locale}/greece` },
            { name: cityRow.name, path: `/${locale}/greece/${cityRow.slug}` },
          ]),
          itemListJsonLd({
            name: TOP_LABEL[locale](cityRow.name),
            // Top 10 — editorial signal, not the full 60-venue dump.
            items: topVenues.map((v) => ({
              name: v.name,
              path: `/${locale}/greece/${cityRow.slug}/${v.areaSlug ?? v.categorySlug ?? ''}/${v.slug ?? ''}`,
            })),
          }),
          cityPlaceJsonLd({
            name: cityRow.name,
            slug: cityRow.slug,
            locale,
            region: cityRow.region,
            lat: cityRow.lat,
            lng: cityRow.lng,
            imageUrl: heroPhoto?.url,
          }),
        ])}
      />

      <CityHero
        cityName={cityRow.name}
        region={cityRow.region}
        season={guide?.season ?? 'Year-round'}
        bestFor={guide?.bestFor[locale] ?? []}
        photo={heroPhoto}
        locale={locale}
      />

      {/* Editorial intro — the SEO-load-bearing prose. Falls back to a short
          generic line if a city doesn't have a curated guide yet. */}
      <section className="mx-auto w-full max-w-3xl px-6 py-12">
        {guide?.intro[locale] ? (
          <p className="text-lg leading-relaxed text-[var(--color-fg-1)] md:text-xl">
            {guide.intro[locale]}
          </p>
        ) : (
          <p className="text-lg text-[var(--color-fg-2)]">
            {META[locale].editorialSoon(cityRow.name)}
          </p>
        )}
      </section>

      {/* "Where to go" by neighborhood */}
      {guide && (
        <NeighborhoodGrid
          locale={locale}
          citySlug={cityRow.slug}
          heading={NEIGHBOURHOODS_HEADING[locale]}
          neighborhoods={guide.neighborhoods}
        />
      )}

      {/* Supporting stock photos (location subject, licensed_stock allowed by CHECK) */}
      {supportingPhotos.length > 0 && (
        <section className="mx-auto w-full max-w-6xl px-6 py-4">
          <ul className="grid gap-3 sm:grid-cols-3">
            {supportingPhotos.map((p, i) => (
              <li key={i} className="relative aspect-[4/3] overflow-hidden rounded-lg">
                <Image
                  src={p.url}
                  alt={`${cityRow.name} scene ${i + 1}`}
                  fill
                  sizes="(min-width: 640px) 33vw, 100vw"
                  loading="lazy"
                  decoding="async"
                  className="object-cover city-hero-crop"
                />
                {/* Attribution intentionally not overlaid on the image (it
                    looked like a watermark to visitors). Visible credit lives
                    in the hero caption + the global credits page. */}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Categories — sub-pillar navigation */}
      <section className="mx-auto w-full max-w-6xl px-6 py-10">
        <h2 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
          {CATEGORIES_HEADING[locale]}
        </h2>
        <nav aria-label="Categories" className="mt-6 flex flex-wrap gap-2">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/${locale}/greece/${cityRow.slug}/${cat.slug}`}
              className="rounded-full border border-[var(--color-bg-3)] px-4 py-2 text-sm text-[var(--color-fg-1)] transition hover:border-[var(--color-accent-cyan)] hover:text-[var(--color-accent-cyan)]"
            >
              {cat.name}
            </Link>
          ))}
        </nav>
      </section>

      {/* Display ad — informational section */}
      <div className="mx-auto max-w-6xl px-6 py-4">
        <AdSlot id={`city-${cityRow.slug}-mid`} scope="section" />
      </div>

      {/* Top venues — editorial top-10 with descriptive H2. */}
      <section className="mx-auto w-full max-w-6xl px-6 py-12">
        <h2 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
          {TOP_LABEL[locale](cityRow.name)}
        </h2>

        {venues.length === 0 ? (
          <p className="mt-6 rounded-lg border border-dashed border-[var(--color-bg-3)] bg-[var(--color-bg-1)] p-6 text-sm text-[var(--color-fg-2)]">
            {NO_VENUES_COPY[locale]}
          </p>
        ) : (
          <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {topVenues.map((v) => (
              <li key={v.id}>
                <VenueCard venue={v} locale={locale} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* By-category sub-lists — each category gets its own H3 + a tight
          list of venues. Anchor text reads "Top {category} in {city}" which
          gives Google a strong topical signal + lets visitors jump straight
          into the slice they came for. */}
      {venuesByCategory.size > 1 && (
        <section className="mx-auto w-full max-w-6xl px-6 py-8">
          <h2 className="font-display text-xl font-semibold tracking-tight md:text-2xl">
            {BY_CATEGORY_LABEL[locale](cityRow.name)}
          </h2>
          <div className="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[...venuesByCategory.values()].map((group) => (
              <div key={group.slug}>
                <h3 className="font-display text-base font-semibold text-[var(--color-accent-cyan)]">
                  <Link href={`/${locale}/greece/${cityRow.slug}/${group.slug}`} className="hover:underline">
                    {group.name}
                  </Link>
                </h3>
                <ul className="mt-2 space-y-1.5 text-sm">
                  {group.venues.slice(0, 6).map((v) => (
                    <li key={v.id}>
                      <Link
                        href={`/${locale}/greece/${cityRow.slug}/${v.areaSlug ?? v.categorySlug ?? ''}/${v.slug ?? ''}`}
                        className="text-[var(--color-fg-1)] hover:text-[var(--color-accent-cyan)]"
                      >
                        {v.name}
                      </Link>
                      {v.areaName && (
                        <span className="ml-1.5 text-[11px] text-[var(--color-fg-3)]">· {v.areaName}</span>
                      )}
                    </li>
                  ))}
                </ul>
                {group.venues.length > 6 && (
                  <Link
                    href={`/${locale}/greece/${cityRow.slug}/${group.slug}`}
                    className="mt-2 inline-block text-xs font-semibold text-[var(--color-accent-cyan)] hover:underline"
                  >
                    + {group.venues.length - 6} more →
                  </Link>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Nearby cities — internal-link cluster + UX safety net (visitor
          picked the wrong island, here are the actual closest options). */}
      {nearbyCities.length > 0 && (
        <section className="border-t border-[var(--color-bg-2)] bg-[var(--color-bg-1)]/30">
          <div className="mx-auto w-full max-w-6xl px-6 py-10">
            <h2 className="font-display text-lg font-semibold tracking-tight text-[var(--color-fg-1)]">
              {NEARBY_LABEL[locale]}
            </h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {nearbyCities.map((nc) => (
                <li key={nc.id}>
                  <Link
                    href={`/${locale}/greece/${nc.slug}`}
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--color-bg-3)] bg-[var(--color-bg-1)] px-3 py-1.5 text-sm text-[var(--color-fg-1)] transition hover:border-[var(--color-accent-cyan)] hover:text-[var(--color-accent-cyan)]"
                  >
                    {nc.name}
                    <span className="text-[10px] text-[var(--color-fg-3)]">{Math.round(nc.distanceKm)} km</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </>
  );
}
