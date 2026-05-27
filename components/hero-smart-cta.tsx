'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useNearbyCities } from './nearby-cities-context';
import type { Locale } from '@/lib/i18n';

// Hero CTA that adapts to the visitor's GPS.
//
//  • Without GPS lock (server render, pre-mount, or visitor denied) the
//    button reads "Διάλεξε πόλη" and anchor-scrolls to the cities grid
//    on the same page — same behavior as the old static CTA.
//
//  • Once GPS resolves and the nearest published city is known, the
//    button rewrites itself to "Δες τον οδηγό για το {city}" and links
//    straight to /{locale}/cities/{slug}. The SmartDestinations grid
//    below already reorders to put the same city in slot 01, so the CTA
//    is just a one-tap shortcut for the most likely next action.

export type HeroSmartCTACopy = {
  /** Fallback CTA when no GPS / no nearest city resolved yet. */
  pickCity: string;
  /** Template — must include the literal placeholder `{city}`. */
  nearestGuide: string;
};

export function HeroSmartCTA({ locale, copy }: { locale: Locale; copy: HeroSmartCTACopy }) {
  const { hasLocation, nearestCities } = useNearbyCities();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const nearest = mounted && hasLocation ? nearestCities[0] : null;

  // SSR + pre-mount path: anchor link to the cities section.
  // GPS path: direct link to the nearest city's guide.
  const href = nearest ? `/${locale}/cities/${nearest.slug}` : '#cities';
  const label = nearest ? copy.nearestGuide.replace('{city}', nearest.name) : copy.pickCity;

  return (
    <nav aria-label="Primary call to action" className="mt-8 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      <Link
        href={href}
        className="inline-flex w-full items-center justify-center gap-1 rounded-full bg-[var(--color-accent-pink)] px-5 py-3 text-sm font-semibold text-[var(--color-bg-0)] shadow-[var(--shadow-glow-pink)] transition hover:brightness-110 sm:w-auto sm:py-2"
        suppressHydrationWarning
      >
        {label} →
      </Link>
    </nav>
  );
}
