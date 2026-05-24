'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useNearbyCities } from './nearby-cities-context';
import { useVisitorLocation } from './visitor-location-provider';
import { formatDistanceKm } from '@/lib/geo-distance';
import type { Locale } from '@/lib/i18n';

// Client wrapper around the /greece city tile grid. The server renders the
// canonical alphabetical order (Google sees that). After hydration, if the
// visitor's IP-derived lat/lng is known, we re-render the same tiles in
// distance order with a "X km" badge added — never adding or removing tiles,
// only reordering, so the grid stays SEO-equivalent.

// Region labels per locale. Greek is the primary surface — region must never
// leak the English DB value into the UI.
const REGION_LABEL: Record<Locale, Record<string, string>> = {
  en: { 'Attica': 'Attica', 'South Aegean': 'Cyclades & Dodecanese', 'North Aegean': 'North Aegean', 'Crete': 'Crete', 'Ionian Islands': 'Ionian', 'Central Macedonia': 'Macedonia', 'Western Macedonia': 'West Macedonia', 'East Macedonia & Thrace': 'East Macedonia & Thrace', 'Peloponnese': 'Peloponnese', 'Epirus': 'Epirus', 'Thessaly': 'Sporades & Thessaly', 'Central Greece': 'Central Greece' },
  el: { 'Attica': 'Αττική', 'South Aegean': 'Κυκλάδες & Δωδεκάνησα', 'North Aegean': 'Βόρειο Αιγαίο', 'Crete': 'Κρήτη', 'Ionian Islands': 'Ιόνιο', 'Central Macedonia': 'Μακεδονία', 'Western Macedonia': 'Δυτική Μακεδονία', 'East Macedonia & Thrace': 'Αν. Μακεδονία & Θράκη', 'Peloponnese': 'Πελοπόννησος', 'Epirus': 'Ήπειρος', 'Thessaly': 'Σποράδες & Θεσσαλία', 'Central Greece': 'Στερεά Ελλάδα' },
  de: { 'Attica': 'Attika', 'South Aegean': 'Kykladen & Dodekanes', 'North Aegean': 'Nordägäis', 'Crete': 'Kreta', 'Ionian Islands': 'Ionische Inseln', 'Central Macedonia': 'Makedonien', 'Western Macedonia': 'Westmakedonien', 'East Macedonia & Thrace': 'Ostmakedonien & Thrakien', 'Peloponnese': 'Peloponnes', 'Epirus': 'Epirus', 'Thessaly': 'Sporaden & Thessalien', 'Central Greece': 'Mittelgriechenland' },
  fr: { 'Attica': 'Attique', 'South Aegean': 'Cyclades & Dodécanèse', 'North Aegean': 'Égée du Nord', 'Crete': 'Crète', 'Ionian Islands': 'Îles ioniennes', 'Central Macedonia': 'Macédoine', 'Western Macedonia': 'Macédoine-Occidentale', 'East Macedonia & Thrace': 'Macédoine-Orientale & Thrace', 'Peloponnese': 'Péloponnèse', 'Epirus': 'Épire', 'Thessaly': 'Sporades & Thessalie', 'Central Greece': 'Grèce centrale' },
  it: { 'Attica': 'Attica', 'South Aegean': 'Cicladi & Dodecaneso', 'North Aegean': 'Egeo Settentrionale', 'Crete': 'Creta', 'Ionian Islands': 'Isole Ionie', 'Central Macedonia': 'Macedonia', 'Western Macedonia': 'Macedonia Occidentale', 'East Macedonia & Thrace': 'Macedonia Orientale & Tracia', 'Peloponnese': 'Peloponneso', 'Epirus': 'Epiro', 'Thessaly': 'Sporadi & Tessaglia', 'Central Greece': 'Grecia centrale' },
};

export type CityTile = {
  id: string;
  slug: string;
  name: string;
  region: string | null;
  lat: number | null;
  lng: number | null;
  heroPhotoUrl: string | null;
  venueCount: number;
  countLabel: string;
  emptyLabel: string;
};

export function NearbyCitiesGrid({
  cities,
  locale,
  linkSuffix,
  nearbyBanner,
}: {
  cities: CityTile[];
  locale: Locale;
  linkSuffix: string; // e.g. '' or '?kind=nightlife'
  // Server→client props must be serializable, so the "you" template carries
  // a literal `{city}` placeholder we substitute at render time.
  nearbyBanner: { youTemplate: string; cta: string };
}) {
  const { hasLocation, sortedAllCities, visitor } = useNearbyCities();
  const { visitor: rawVisitor } = useVisitorLocation();

  // Build the ordered tile list. When location unknown, keep server order.
  const ordered = useMemo(() => {
    if (!hasLocation) return cities;
    // Index input tiles by id, then walk sortedAllCities to produce the new order.
    const byId = new Map(cities.map((c) => [c.id, c]));
    const distById = new Map(sortedAllCities.map((c) => [c.id, c.distanceKm]));
    return [...cities]
      .sort((a, b) => (distById.get(a.id) ?? Infinity) - (distById.get(b.id) ?? Infinity))
      .map((t) => ({ ...t, distanceKm: distById.get(t.id) ?? Infinity }))
      // .map() above so TS is happy; byId is referenced to avoid an unused warning
      .map((t) => (byId.has(t.id) ? t : t));
  }, [cities, hasLocation, sortedAllCities]);

  return (
    <>
      {hasLocation && rawVisitor.city && (
        <div className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-[var(--color-accent-cyan)]/30 bg-[color-mix(in_oklab,var(--color-accent-cyan)_8%,transparent)] px-4 py-3 text-sm">
          <span className="flex items-center gap-2 text-[var(--color-fg-1)]">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--color-accent-cyan)] shadow-[var(--shadow-glow-cyan)]" aria-hidden />
            {nearbyBanner.youTemplate.replace('{city}', rawVisitor.city)}
          </span>
          <span className="text-xs text-[var(--color-fg-3)]">{nearbyBanner.cta}</span>
        </div>
      )}

      <ul id="all" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ordered.map((city) => (
          <li key={city.id} id={`region-${city.region?.replace(/\s+/g, '-').toLowerCase() ?? 'unknown'}`}>
            <Link
              href={`/${locale}/greece/${city.slug}${linkSuffix}`}
              className="group relative block aspect-[5/6] overflow-hidden rounded-lg border border-[var(--color-bg-3)] bg-[var(--color-bg-1)]"
            >
              {city.heroPhotoUrl ? (
                <Image src={city.heroPhotoUrl} alt={city.name} fill sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw" className="object-cover transition duration-500 group-hover:scale-105 city-hero-crop" />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-bg-1)] via-[var(--color-bg-2)] to-[var(--color-bg-0)]" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-bg-0)] via-[var(--color-bg-0)]/30 to-transparent" aria-hidden />
              {hasLocation && 'distanceKm' in city && Number.isFinite((city as { distanceKm: number }).distanceKm) && (
                <span className="absolute right-3 top-3 rounded-full border border-[var(--color-accent-cyan)]/40 bg-[var(--color-bg-0)]/70 px-2 py-0.5 text-[10px] font-medium text-[var(--color-accent-cyan)] backdrop-blur">
                  {formatDistanceKm((city as { distanceKm: number }).distanceKm)}
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 p-5">
                {city.region && <p className="text-[10px] uppercase tracking-widest text-[var(--color-fg-2)]">{REGION_LABEL[locale][city.region] ?? city.region}</p>}
                <p className="mt-1 font-display text-2xl font-semibold text-[var(--color-fg-0)]">{city.name}</p>
                <p className="mt-1 text-xs text-[var(--color-fg-2)]">
                  {city.venueCount > 0 ? `${city.venueCount} ${city.countLabel}` : city.emptyLabel}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {!hasLocation && (
        <p className="mt-6 text-xs text-[var(--color-fg-3)]" suppressHydrationWarning>
          {visitor ? '' : ''}
        </p>
      )}
    </>
  );
}
