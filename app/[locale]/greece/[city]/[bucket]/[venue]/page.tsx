import { notFound } from 'next/navigation';
import Image from 'next/image';
import type { Metadata } from 'next';
import Link from 'next/link';
import { isLocale, LOCALES, type Locale } from '@/lib/i18n';
import { getVenueByCityArea, listRelatedVenues, getCityIdBySlug, getCategoryIdBySlug, listUpcomingVenueEvents } from '@/lib/queries';
import { VenueCard } from '@/components/venue-card';
import {
  publicMetadata, jsonLdProps,
  breadcrumbJsonLd, localBusinessJsonLd,
} from '@/lib/seo';
import { LazyMap } from '@/components/lazy-map';
import { AdSlot } from '@/components/ad-slot';
import { AffiliateBlock } from '@/components/affiliate-block';
import { ViewTracker } from '@/components/view-tracker';

// Venue pages — facts move slowly; revalidate every 6h. Owner edits +
// new events flip pages immediately via revalidatePath() from the venues
// PATCH + events POST routes, so this is just the worst-case freshness
// for non-edited venues.
export const revalidate = 21600;

// Per-locale chrome. Greek is the primary surface.
const COPY: Record<Locale, {
  claim: string;
  metaTitle: (v: string, c: string) => string;
  metaDescription: (v: string, c: string) => string;
  address: string;
  phone: string;
  website: string;
  more: (c: string) => string;
  allCityVenues: (c: string) => string;
  noPhotoYet: string;
  claimAndUpload: string;
}> = {
  en: { claim: 'Claim this venue', metaTitle: (v, c) => `${v} — ${c}`, metaDescription: (v, c) => `${v} in ${c}.`, address: 'Address', phone: 'Phone', website: 'Website', more: (c) => `More in ${c}`, allCityVenues: (c) => `All ${c} venues →`, noPhotoYet: 'No photo yet — owner?', claimAndUpload: 'Claim & upload' },
  el: { claim: 'Διεκδίκησε το μαγαζί',  metaTitle: (v, c) => `${v} — ${c}`,  metaDescription: (v, c) => `${v} στο ${c}.`, address: 'Διεύθυνση', phone: 'Τηλέφωνο', website: 'Site', more: (c) => `Περισσότερα στο ${c}`,  allCityVenues: (c) => `Όλα τα μαγαζιά στο ${c} →`, noPhotoYet: 'Χωρίς φωτογραφία — είσαι ο ιδιοκτήτης;', claimAndUpload: 'Διεκδίκησε & ανέβασε' },
  de: { claim: 'Location übernehmen',   metaTitle: (v, c) => `${v} — ${c}`,  metaDescription: (v, c) => `${v} in ${c}.`,  address: 'Adresse',   phone: 'Telefon',   website: 'Website', more: (c) => `Mehr in ${c}`,           allCityVenues: (c) => `Alle Locations in ${c} →`,         noPhotoYet: 'Noch kein Foto — Inhaber?',                       claimAndUpload: 'Übernehmen & hochladen' },
  fr: { claim: 'Revendiquer le lieu',   metaTitle: (v, c) => `${v} — ${c}`,  metaDescription: (v, c) => `${v} à ${c}.`,    address: 'Adresse',   phone: 'Téléphone', website: 'Site',    more: (c) => `Plus à ${c}`,            allCityVenues: (c) => `Tous les lieux de ${c} →`,         noPhotoYet: 'Pas encore de photo — exploitant ?',              claimAndUpload: 'Revendiquer & téléverser' },
  it: { claim: 'Rivendica il locale',   metaTitle: (v, c) => `${v} — ${c}`,  metaDescription: (v, c) => `${v} a ${c}.`,    address: 'Indirizzo', phone: 'Telefono',  website: 'Sito',    more: (c) => `Altri locali a ${c}`,    allCityVenues: (c) => `Tutti i locali di ${c} →`,         noPhotoYet: 'Ancora nessuna foto — proprietario?',             claimAndUpload: 'Rivendica & carica' },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; city: string; bucket: string; venue: string }>;
}): Promise<Metadata> {
  const { locale, city, bucket, venue } = await params;
  if (!isLocale(locale)) return {};
  const v = getVenueByCityArea(city, bucket, venue, locale);
  if (!v) return {};
  const t = COPY[locale];
  const paths: Partial<Record<Locale, string>> = {};
  for (const l of LOCALES) paths[l] = `/${l}/greece/${city}/${bucket}/${venue}`;
  const heroUrl = v.photos[0]?.url ?? null;
  return publicMetadata({
    locale,
    paths,
    title: t.metaTitle(v.name, v.cityName),
    description: (v.description ?? t.metaDescription(v.name, v.cityName)).slice(0, 160),
    ogImage: heroUrl,
    // Venue pages are essentially business profiles; Next's OG type union
    // doesn't expose 'business.business' so we use the closest accepted type.
    ogType: 'website',
  });
}

export default async function VenuePage({
  params,
}: {
  params: Promise<{ locale: string; city: string; bucket: string; venue: string }>;
}) {
  const { locale, city, bucket, venue } = await params;
  if (!isLocale(locale)) notFound();
  const v = getVenueByCityArea(city, bucket, venue, locale);
  if (!v) notFound();

  const photos = v.photos as { id: string; url: string; attribution: string | null }[];
  const hero = photos[0];
  const gallery = photos.slice(1); // remaining photos shown in the strip below hero
  const claimed = v.claim === 'verified';
  const t = COPY[locale];

  const cityId = getCityIdBySlug(city);
  const categoryId = getCategoryIdBySlug(v.categorySlug as string | null);
  const related = cityId
    ? listRelatedVenues({ cityId, excludeVenueId: v.id as string, categoryId, locale, limit: 6 })
    : [];

  const upcomingEvents = listUpcomingVenueEvents(v.id as string, 6);
  const upcomingHeading: Record<Locale, string> = {
    en: 'Upcoming events', el: 'Επερχόμενα events',
    de: 'Kommende Events', fr: 'Événements à venir', it: 'Prossimi eventi',
  };

  const venuePath = `/${locale}/greece/${city}/${bucket}/${venue}`;
  const homeLabel: Record<Locale, string> = { en: 'Home', el: 'Αρχική', de: 'Start', fr: 'Accueil', it: 'Home' };
  const greeceLabel: Record<Locale, string> = { en: 'Greece', el: 'Ελλάδα', de: 'Griechenland', fr: 'Grèce', it: 'Grecia' };

  return (
    <article className="mx-auto w-full max-w-5xl px-6 py-10">
      {/* JSON-LD: LocalBusiness (typed by category) + Breadcrumb */}
      <script
        type="application/ld+json"
        {...jsonLdProps([
          breadcrumbJsonLd([
            { name: homeLabel[locale], path: `/${locale}` },
            { name: greeceLabel[locale], path: `/${locale}/greece` },
            { name: v.cityName, path: `/${locale}/greece/${city}` },
            { name: v.areaName ?? v.categoryName ?? bucket, path: `/${locale}/greece/${city}/${bucket}` },
            { name: v.name, path: venuePath },
          ]),
          localBusinessJsonLd({
            locale,
            path: venuePath,
            name: v.name,
            description: v.description,
            address: v.address,
            cityName: v.cityName,
            phone: v.phone,
            website: v.website,
            lat: v.lat,
            lng: v.lng,
            rating: v.rating,
            reviewCount: v.reviewCount,
            priceLevel: v.priceLevel,
            openingHours: v.openingHours,
            photos: v.photos.map((p) => ({ url: p.url })),
            categorySlug: v.categorySlug,
          }),
        ])}
      />

      <ViewTracker venueId={v.id} />

      <nav className="text-xs text-[var(--color-fg-2)]">
        <Link href={`/${locale}/greece/${city}`} className="hover:text-[var(--color-accent-cyan)]">{v.cityName as string}</Link>
        {' · '}
        <Link href={`/${locale}/greece/${city}/${bucket}`} className="hover:text-[var(--color-accent-cyan)]">{(v.areaName ?? v.categoryName) as string}</Link>
      </nav>

      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight md:text-6xl">{v.name as string}</h1>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[var(--color-fg-2)]">
        {v.categoryName ? <span>{v.categoryName as string}</span> : null}
        {v.rating ? <span>· ★ {(v.rating as number).toFixed(1)}</span> : null}
        {!claimed && (
          <Link
            href={`/${locale}/claim/${v.id as string}`}
            className="ml-2 rounded-full border border-[var(--color-accent-pink)] px-3 py-0.5 text-xs text-[var(--color-accent-pink)] hover:bg-[var(--color-accent-pink)] hover:text-[var(--color-bg-0)]"
          >
            {t.claim}
          </Link>
        )}
      </div>

      {hero ? (
        <>
          <div className="relative mt-6 aspect-[16/9] w-full overflow-hidden rounded-lg">
            {/* `city-hero-crop` clips the bottom ~3.5% to hide any photographer
                watermark that might exist in the source image. */}
            <Image src={hero.url} alt={v.name as string} fill sizes="(min-width: 1024px) 1024px, 100vw" className="object-cover city-hero-crop" priority fetchPriority="high" />
          </div>
          {hero.attribution && (
            <p className="mt-2 text-[10px] text-[var(--color-fg-3)]">
              Photo · {hero.attribution}
            </p>
          )}
        </>
      ) : (
        <div className="mt-6 flex aspect-[16/9] w-full items-center justify-center rounded-lg bg-[var(--color-bg-1)] text-sm text-[var(--color-fg-3)]">
          {t.noPhotoYet}{' '}
          <Link href={`/${locale}/claim/${v.id as string}`} className="ml-2 text-[var(--color-accent-pink)]">{t.claimAndUpload}</Link>
        </div>
      )}

      {/* Upcoming events — Featured-tier owners can post these from the
          dashboard. Renders only when at least one upcoming event exists. */}
      {upcomingEvents.length > 0 && (
        <section className="mt-6 rounded-xl border border-[var(--color-accent-pink)]/30 bg-[var(--color-bg-1)] p-4" aria-label={upcomingHeading[locale]}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--color-accent-pink)]">
            {upcomingHeading[locale]}
          </p>
          <ul className="mt-3 divide-y divide-[var(--color-bg-2)]">
            {upcomingEvents.map((ev) => (
              <li key={ev.id} className="py-3">
                <p className="font-semibold text-[var(--color-fg-0)]">{ev.title}</p>
                <p className="text-xs text-[var(--color-fg-2)]">
                  {new Date(ev.startsAt * 1000).toLocaleString(locale, {
                    weekday: 'short', day: 'numeric', month: 'short',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </p>
                {ev.description && (
                  <p className="mt-1 text-sm leading-relaxed text-[var(--color-fg-1)]">{ev.description}</p>
                )}
                {ev.url && (
                  <a href={ev.url} rel="nofollow noopener" target="_blank" className="mt-1 inline-block text-xs text-[var(--color-accent-cyan)] hover:underline">
                    {ev.url.replace(/^https?:\/\//, '').slice(0, 60)} →
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Photo gallery — remaining photos in a tight grid below the hero.
          Sourced from Places API (§9 stage 3) so subjectType='venue' + source='google_places'.
          Same `city-hero-crop` mask applied to clip any bottom watermark. */}
      {gallery.length > 0 && (
        <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {gallery.map((p) => (
            <li key={p.id} className="relative aspect-[4/3] overflow-hidden rounded-lg">
              <Image src={p.url} alt={v.name as string} fill sizes="(min-width:1024px) 20vw, (min-width:640px) 33vw, 50vw" loading="lazy" decoding="async" className="object-cover transition hover:scale-105 city-hero-crop" />
            </li>
          ))}
        </ul>
      )}

      <div className="mt-10 grid gap-10 md:grid-cols-3">
        <div className="md:col-span-2">
          {v.description ? (
            <p className="text-lg leading-relaxed text-[var(--color-fg-1)]">{v.description as string}</p>
          ) : null}

          <div className="mt-10">
            <AffiliateBlock venueId={v.id as string} locale={locale} />
          </div>

          <div className="mt-10">
            <AdSlot id={`venue-${v.id as string}-mid`} scope="section" />
          </div>
        </div>

        <aside className="space-y-4 text-sm">
          {v.address ? (
            <Row label={t.address} value={v.address as string} />
          ) : null}
          {v.phone ? (
            <Row label={t.phone} value={<a href={`tel:${(v.phone as string).replace(/\s/g, '')}`} className="text-[var(--color-accent-cyan)]">{v.phone as string}</a>} />
          ) : null}
          {v.website ? (
            <Row
              label={t.website}
              value={
                <a
                  href={v.website as string}
                  target="_blank"
                  rel="nofollow noopener"
                  className="break-all text-[var(--color-accent-cyan)]"
                >
                  {(v.website as string).replace(/^https?:\/\//, '')}
                </a>
              }
            />
          ) : null}

          <LazyMap
            lat={v.lat as number | null}
            lng={v.lng as number | null}
            name={v.name as string}
            locale={locale}
          />
        </aside>
      </div>

      {related.length > 0 && (
        <section className="mt-16 border-t border-[var(--color-bg-2)] pt-12">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
              {t.more(v.cityName as string)}
            </h2>
            <Link href={`/${locale}/greece/${city}`} className="text-sm text-[var(--color-accent-cyan)] hover:underline">
              {t.allCityVenues(v.cityName as string)}
            </Link>
          </div>
          <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((rv) => (
              <li key={rv.id}><VenueCard venue={rv} locale={locale} /></li>
            ))}
          </ul>
        </section>
      )}

    </article>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-[var(--color-fg-2)]">{label}</p>
      <p className="mt-1 text-[var(--color-fg-0)]">{value}</p>
    </div>
  );
}
