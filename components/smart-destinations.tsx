'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useNearbyCities } from './nearby-cities-context';
import { useVisitorLocation } from './visitor-location-provider';
import { formatDistanceKm } from '@/lib/geo-distance';
import type { Locale } from '@/lib/i18n';

// Smart destinations grid. Server renders the canonical alphabetical /
// article-count top 6 (so crawlers and JS-off visitors see real city
// links). Once GPS resolves, the client reorders the same tiles by
// distance to the visitor, swaps the heading to "Closest to {city}",
// and adds a live distance chip to each row. No new tiles appear or
// disappear — only the ordering and the chrome change.

export type SmartDestinationCity = {
  id: string;
  slug: string;
  name: string;
  region: string | null;
  articleCount: number;
};

export type SmartDestinationsCopy = {
  /** Default heading shown server-side and pre-GPS (e.g. "Top destinations"). */
  headingDefault: string;
  /** Heading template once GPS resolves and the visitor's city is known.
   *  Must include the literal placeholder `{city}` (e.g. "Closest to {city}"). */
  headingNearby: string;
  /** Heading once GPS resolves but the visitor's city is still unknown. */
  headingNearbyNoCity: string;
  subDefault: string;
  subNearby: string;
  comingSoon: string;
  articlesLabel: string;
  /** "Live" pill copy (e.g. "live"). Shown next to the heading when GPS is on. */
  livePill: string;
  regionLabels: Record<string, string>;
};

export function SmartDestinations({
  cities,
  locale,
  copy,
  serverTop,
}: {
  cities: SmartDestinationCity[];
  locale: Locale;
  copy: SmartDestinationsCopy;
  /** Indexes (into `cities`) the server already chose as the top 6 — used
   *  as the pre-mount / pre-GPS ordering so SSR HTML matches first paint. */
  serverTop: number[];
}) {
  const { hasLocation, sortedAllCities } = useNearbyCities();
  const { visitor } = useVisitorLocation();

  // Mounted gate prevents a hydration mismatch — the server emits the
  // serverTop order; the client only switches to GPS order after mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const ordered = useMemo(() => {
    if (!mounted || !hasLocation) {
      return serverTop
        .map((i) => cities[i])
        .filter((c): c is SmartDestinationCity => !!c)
        .map((c) => ({ ...c, distanceKm: null as number | null }));
    }
    const distById = new Map(sortedAllCities.map((sc) => [sc.id, sc.distanceKm]));
    return [...cities]
      .map((c) => ({ ...c, distanceKm: distById.get(c.id) ?? Infinity }))
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 6)
      .map((c) => ({ ...c, distanceKm: Number.isFinite(c.distanceKm) ? c.distanceKm : null }));
  }, [cities, hasLocation, sortedAllCities, mounted, serverTop]);

  const gpsOn = mounted && hasLocation;
  const heading = gpsOn
    ? (visitor.city ? copy.headingNearby.replace('{city}', visitor.city) : copy.headingNearbyNoCity)
    : copy.headingDefault;
  const sub = gpsOn ? copy.subNearby : copy.subDefault;

  return (
    <section id="cities" className="mx-auto w-full max-w-[1180px] scroll-mt-20 px-5 py-9 md:px-8">
      <div className="flex items-start gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-[clamp(1.5rem,4vw,2.2rem)] font-semibold leading-tight tracking-[-0.015em]" suppressHydrationWarning>
              {heading}
            </h2>
            {gpsOn && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-bronze)] px-2.5 py-0.5 cn-readout cn-readout-s uppercase text-[var(--color-bronze)]">
                {copy.livePill}
              </span>
            )}
          </div>
          <p className="mt-2 text-[var(--color-muted)]" suppressHydrationWarning>{sub}</p>
        </div>
      </div>

      <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ordered.map((city, idx) => (
          <li key={city.id}>
            <Link
              href={`/${locale}/cities/${city.slug}`}
              className="group relative flex items-center gap-4 overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-hair)] bg-[var(--color-surface)] px-5 py-4 transition-colors duration-[var(--motion-fast)] hover:border-[var(--color-bronze)]"
            >
              <span
                aria-hidden
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-hair)] bg-[var(--color-ground)] cn-readout cn-readout-s font-bold tracking-tight text-[var(--color-muted)] transition group-hover:border-[var(--color-bronze)] group-hover:text-[var(--color-bronze)]"
              >
                {String(idx + 1).padStart(2, '0')}
              </span>

              <div className="min-w-0 flex-1">
                {city.region && (
                  <p className="truncate cn-readout cn-readout-s uppercase text-[var(--color-muted)]">
                    {copy.regionLabels[city.region] ?? city.region}
                  </p>
                )}
                <p className="truncate font-display text-lg font-semibold text-[var(--color-ink)] transition group-hover:text-[var(--color-bronze)]">
                  {city.name}
                </p>
                <p className="mt-0.5 truncate text-[13px] text-[var(--color-muted)]">
                  {city.articleCount > 0 ? `${city.articleCount} ${copy.articlesLabel}` : copy.comingSoon}
                </p>
              </div>

              {city.distanceKm !== null && (
                <span className="shrink-0 rounded-full border border-[var(--color-hair)] px-2.5 py-0.5 cn-readout cn-readout-s text-[var(--color-muted)]">
                  {formatDistanceKm(city.distanceKm)}
                </span>
              )}
              <span
                aria-hidden
                className="text-[var(--color-muted)] transition group-hover:translate-x-0.5 group-hover:text-[var(--color-bronze)]"
              >
                →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
