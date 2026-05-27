'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useNearbyCities } from './nearby-cities-context';
import { useVisitorLocation } from './visitor-location-provider';
import { formatDistanceKm, haversineKm } from '@/lib/geo-distance';
import type { Locale } from '@/lib/i18n';

// Smart "Κοντά σου τώρα" hero panel. Phase K.14 rewrite.
//
// What changed since the original 2×2 nearest-cities grid:
//   1. The nearest CITY is now the panel's primary tile — bigger, with
//      three vertical chips (nightlife / food / stay) that link into
//      that city's article guide.
//   2. Below it, the 4 nearest NEIGHBORHOODS render as compact tiles
//      that link directly to /{locale}/cities/{citySlug}/area/{areaSlug}
//      — the URL each area guide will live at once seeded.
//   3. A "next cities" mini-row at the bottom replaces what the panel
//      used to be its whole purpose. The big SmartDestinations grid
//      further down already covers full city ranking, so this row stays
//      to a tight 3-of-the-rest preview.
//
// Hidden until GPS resolves. Everything is local distance math — no
// extra network calls.

export type HeroNearbyArea = {
  slug: string;
  name: string;
  lat: number;
  lng: number;
  cityName: string;
  citySlug: string;
};

type Tone = {
  heading: string;
  subtitle: string;
  openGuide: string;            // "Open guide →"
  neighborhoods: string;
  nextCities: string;
  verticalNightlife: string;
  verticalFood: string;
  verticalStay: string;
  noAreasYet: string;
};

const COPY: Record<Locale, Tone> = {
  en: {
    heading: 'Near you right now',
    subtitle: 'Closest first',
    openGuide: 'Open guide →',
    neighborhoods: 'Neighborhoods',
    nextCities: 'Next cities',
    verticalNightlife: 'Nightlife',
    verticalFood: 'Food',
    verticalStay: 'Stay',
    noAreasYet: 'Neighborhood guides coming soon for this area.',
  },
  el: {
    heading: 'Κοντά σου τώρα',
    subtitle: 'Ταξινόμηση κατά απόσταση',
    openGuide: 'Δες οδηγό →',
    neighborhoods: 'Γειτονιές',
    nextCities: 'Επόμενες πόλεις',
    verticalNightlife: 'Νυχτερινή',
    verticalFood: 'Φαγητό',
    verticalStay: 'Διαμονή',
    noAreasYet: 'Οδηγοί γειτονιάς έρχονται σύντομα.',
  },
  de: {
    heading: 'Jetzt in deiner Nähe',
    subtitle: 'Nächste zuerst',
    openGuide: 'Guide öffnen →',
    neighborhoods: 'Viertel',
    nextCities: 'Nächste Städte',
    verticalNightlife: 'Nightlife',
    verticalFood: 'Essen',
    verticalStay: 'Stay',
    noAreasYet: 'Viertel-Guides folgen bald.',
  },
  fr: {
    heading: 'Près de vous maintenant',
    subtitle: 'Les plus proches d’abord',
    openGuide: 'Ouvrir le guide →',
    neighborhoods: 'Quartiers',
    nextCities: 'Villes suivantes',
    verticalNightlife: 'Sorties',
    verticalFood: 'Resto',
    verticalStay: 'Hôtels',
    noAreasYet: 'Guides de quartier bientôt.',
  },
  it: {
    heading: 'Vicino a te ora',
    subtitle: 'I più vicini per primi',
    openGuide: 'Apri la guida →',
    neighborhoods: 'Quartieri',
    nextCities: 'Prossime città',
    verticalNightlife: 'Notte',
    verticalFood: 'Cibo',
    verticalStay: 'Stay',
    noAreasYet: 'Guide di quartiere in arrivo.',
  },
};

export function HeroNearestPanel({ locale, areas }: { locale: Locale; areas: HeroNearbyArea[] }) {
  const { hasLocation, nearestCities } = useNearbyCities();
  const { visitor } = useVisitorLocation();
  const c = COPY[locale];

  // Compute the 4 nearest neighborhoods CLIENT-SIDE so we never ship
  // SSR HTML with a stale order. Falls back to first 4 alphabetically
  // when somehow we got the prop but no GPS.
  const nearestAreas = useMemo<Array<HeroNearbyArea & { distanceKm: number }>>(() => {
    if (!hasLocation || visitor.lat == null || visitor.lng == null) return [];
    const origin = { lat: visitor.lat, lng: visitor.lng };
    return [...areas]
      .map((a) => ({ ...a, distanceKm: haversineKm(origin, { lat: a.lat, lng: a.lng }) }))
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 4);
  }, [areas, hasLocation, visitor.lat, visitor.lng]);

  if (!hasLocation || nearestCities.length === 0) return null;

  const nearestCity = nearestCities[0]!;
  const nextCities = nearestCities.slice(1, 4);

  return (
    <aside className="relative w-full max-w-md rounded-2xl border border-[var(--color-bg-3)] bg-[color-mix(in_oklab,var(--color-bg-1)_88%,transparent)] p-5 shadow-[0_18px_60px_-12px_rgba(0,0,0,0.6)] backdrop-blur-xl">
      <div className="absolute -top-px left-6 right-6 h-px bg-gradient-to-r from-transparent via-[var(--color-accent-cyan)]/60 to-transparent" aria-hidden />

      {/* Heading row */}
      <div className="flex items-baseline justify-between gap-3">
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent-cyan)]">
          <span className="relative inline-flex h-1.5 w-1.5" aria-hidden>
            <span className="absolute inset-0 animate-ping rounded-full bg-[var(--color-accent-cyan)] opacity-70" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--color-accent-cyan)]" />
          </span>
          {c.heading}
        </p>
        <p className="text-[10px] text-[var(--color-fg-3)]">{c.subtitle}</p>
      </div>

      {/* Primary tile — the nearest city, with vertical chips. */}
      <div className="mt-4 rounded-xl border border-[var(--color-accent-pink)]/30 bg-gradient-to-br from-[var(--color-bg-0)]/80 to-[var(--color-bg-1)]/40 p-4">
        <div className="flex items-baseline justify-between gap-2">
          <Link href={`/${locale}/cities/${nearestCity.slug}`} className="group min-w-0">
            <p className="truncate font-display text-2xl font-semibold leading-tight text-[var(--color-fg-0)] group-hover:text-[var(--color-accent-pink)]">
              {nearestCity.name}
            </p>
            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-[var(--color-fg-3)]">
              {formatDistanceKm(nearestCity.distanceKm)}
            </p>
          </Link>
          <Link
            href={`/${locale}/cities/${nearestCity.slug}`}
            className="shrink-0 rounded-full bg-[var(--color-accent-pink)] px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-bg-0)] shadow-[var(--shadow-glow-pink)] transition hover:brightness-110"
          >
            {c.openGuide}
          </Link>
        </div>

        {/* Three vertical chips — each anchors into the right section
            inside the city guide. */}
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {(['nightlife', 'food', 'stay'] as const).map((v) => {
            const label = v === 'nightlife' ? c.verticalNightlife : v === 'food' ? c.verticalFood : c.verticalStay;
            const dot = v === 'nightlife' ? 'bg-[var(--color-accent-pink)]'
                      : v === 'food'      ? 'bg-[var(--color-accent-amber)]'
                                          : 'bg-[var(--color-accent-violet)]';
            return (
              <li key={v}>
                <Link
                  href={`/${locale}/cities/${nearestCity.slug}#${v}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-bg-3)] bg-[var(--color-bg-0)]/60 px-2.5 py-1 text-[10px] text-[var(--color-fg-1)] transition hover:border-[var(--color-accent-cyan)] hover:text-[var(--color-accent-cyan)]"
                >
                  <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${dot}`} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Neighborhoods near visitor — direct links to area guides. */}
      <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--color-fg-3)]">
        {c.neighborhoods}
      </p>
      {nearestAreas.length > 0 ? (
        <ul className="mt-2 grid grid-cols-2 gap-2">
          {nearestAreas.map((a) => (
            <li key={`${a.citySlug}-${a.slug}`}>
              <Link
                href={`/${locale}/cities/${a.citySlug}/area/${a.slug}`}
                className="group flex flex-col gap-0.5 rounded-lg border border-[var(--color-bg-3)] bg-[var(--color-bg-0)]/60 p-2.5 transition hover:border-[var(--color-accent-cyan)]"
              >
                <span className="truncate text-sm font-medium text-[var(--color-fg-0)] group-hover:text-[var(--color-accent-cyan)]">
                  {a.name}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-fg-3)]">
                  {formatDistanceKm(a.distanceKm)} · {a.cityName}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-[11px] text-[var(--color-fg-3)]">{c.noAreasYet}</p>
      )}

      {/* Next cities — mini-row, dotted dividers, no big tiles. */}
      {nextCities.length > 0 && (
        <>
          <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--color-fg-3)]">
            {c.nextCities}
          </p>
          <ul className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
            {nextCities.map((city) => (
              <li key={city.id} className="inline-flex items-center gap-1.5">
                <Link
                  href={`/${locale}/cities/${city.slug}`}
                  className="inline-flex items-center gap-1.5 text-[var(--color-fg-1)] hover:text-[var(--color-accent-pink)]"
                >
                  <span className="font-medium text-[var(--color-fg-0)]">{city.name}</span>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-fg-3)]">
                    {formatDistanceKm(city.distanceKm)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </aside>
  );
}
