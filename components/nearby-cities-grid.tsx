'use client';

import { useMemo } from 'react';
import Link from 'next/link';
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
  articleCount: number;
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

      {/* Phase K.12 — city photos removed. Each tile is a compact "app
          button" panel: rank-less, photo-less, with name + region + count
          + (when GPS is on) live distance chip. */}
      <ul id="all" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ordered.map((city) => (
          <li key={city.id} id={`region-${city.region?.replace(/\s+/g, '-').toLowerCase() ?? 'unknown'}`}>
            <Link
              href={`/${locale}/cities/${city.slug}`}
              className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-[var(--color-bg-3)] bg-[var(--color-bg-1)] px-5 py-4 transition hover:-translate-y-0.5 hover:border-[var(--color-accent-cyan)] hover:shadow-[0_14px_48px_-20px_rgba(0,212,255,0.45)]"
            >
              <div className="min-w-0 flex-1">
                {city.region && (
                  <p className="truncate text-[10px] uppercase tracking-widest text-[var(--color-fg-3)]">
                    {REGION_LABEL[locale][city.region] ?? city.region}
                  </p>
                )}
                <p className="truncate font-display text-lg font-semibold text-[var(--color-fg-0)] transition group-hover:text-[var(--color-accent-cyan)]">
                  {city.name}
                </p>
                <p className="mt-0.5 truncate text-xs text-[var(--color-fg-2)]">
                  {city.articleCount > 0 ? `${city.articleCount} ${city.countLabel}` : city.emptyLabel}
                </p>
              </div>

              {hasLocation && 'distanceKm' in city && Number.isFinite((city as { distanceKm: number }).distanceKm) && (
                <span className="shrink-0 rounded-full border border-[var(--color-accent-cyan)]/40 bg-[var(--color-bg-0)]/70 px-2 py-0.5 text-[10px] font-medium text-[var(--color-accent-cyan)] backdrop-blur">
                  {formatDistanceKm((city as { distanceKm: number }).distanceKm)}
                </span>
              )}
              <span
                aria-hidden
                className="shrink-0 text-[var(--color-fg-3)] transition group-hover:translate-x-0.5 group-hover:text-[var(--color-accent-cyan)]"
              >
                →
              </span>
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
