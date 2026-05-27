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
    <section id="cities" className="mx-auto w-full max-w-6xl px-6 py-16 scroll-mt-20">
      <div className="flex items-start gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl" suppressHydrationWarning>
              {heading}
            </h2>
            {gpsOn && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-accent-cyan)]/40 bg-[var(--color-accent-cyan)]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent-cyan)]">
                <span aria-hidden className="relative inline-flex h-1.5 w-1.5">
                  <span className="absolute inset-0 animate-ping rounded-full bg-[var(--color-accent-cyan)] opacity-70" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--color-accent-cyan)]" />
                </span>
                {copy.livePill}
              </span>
            )}
          </div>
          <p className="mt-2 text-[var(--color-fg-2)]" suppressHydrationWarning>{sub}</p>
        </div>
      </div>

      <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ordered.map((city, idx) => (
          <li key={city.id}>
            <Link
              href={`/${locale}/cities/${city.slug}`}
              className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-[var(--color-bg-3)] bg-[var(--color-bg-1)] px-5 py-4 transition hover:-translate-y-0.5 hover:border-[var(--color-accent-pink)] hover:shadow-[0_18px_60px_-20px_rgba(255,45,149,0.45)]"
            >
              <span
                aria-hidden
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--color-bg-3)] bg-[var(--color-bg-0)] font-mono text-[11px] font-bold tracking-tight text-[var(--color-fg-1)] transition group-hover:border-[var(--color-accent-pink)] group-hover:text-[var(--color-accent-pink)]"
              >
                {String(idx + 1).padStart(2, '0')}
              </span>

              <div className="min-w-0 flex-1">
                {city.region && (
                  <p className="truncate text-[10px] uppercase tracking-widest text-[var(--color-fg-3)]">
                    {copy.regionLabels[city.region] ?? city.region}
                  </p>
                )}
                <p className="truncate font-display text-lg font-semibold text-[var(--color-fg-0)] transition group-hover:text-[var(--color-accent-pink)]">
                  {city.name}
                </p>
                <p className="mt-0.5 truncate text-xs text-[var(--color-fg-2)]">
                  {city.articleCount > 0 ? `${city.articleCount} ${copy.articlesLabel}` : copy.comingSoon}
                </p>
              </div>

              {city.distanceKm !== null && (
                <span className="shrink-0 rounded-full border border-[var(--color-accent-cyan)]/40 bg-[var(--color-bg-0)]/70 px-2 py-0.5 text-[10px] font-medium text-[var(--color-accent-cyan)] backdrop-blur">
                  {formatDistanceKm(city.distanceKm)}
                </span>
              )}
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
  );
}
