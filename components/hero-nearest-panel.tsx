'use client';

import Link from 'next/link';
import { useNearbyCities } from './nearby-cities-context';
import { formatDistanceKm } from '@/lib/geo-distance';
import type { Locale } from '@/lib/i18n';

// Glassmorphic "near you" panel for the hero. Lists the top 4 cities sorted
// by distance from the GPS-precise visitor location, with a "Tonight" CTA on
// each. Hidden until the location resolves — never blocks the hero.

const COPY: Record<Locale, { heading: string; tonight: string; subtitle: string }> = {
  en: { heading: 'Near you tonight',  tonight: 'Tonight →', subtitle: 'Closest first' },
  el: { heading: 'Κοντά σου απόψε',    tonight: 'Απόψε →',    subtitle: 'Ταξινόμηση κατά απόσταση' },
  de: { heading: 'In deiner Nähe heute Nacht', tonight: 'Heute Nacht →', subtitle: 'Nächste zuerst' },
  fr: { heading: 'Près de vous ce soir', tonight: 'Ce soir →',  subtitle: 'Les plus proches d’abord' },
  it: { heading: 'Vicino a te stasera', tonight: 'Stasera →',  subtitle: 'I più vicini per primi' },
};

export function HeroNearestPanel({ locale }: { locale: Locale }) {
  const { hasLocation, nearestCities } = useNearbyCities();
  const c = COPY[locale];

  if (!hasLocation || nearestCities.length === 0) return null;

  return (
    <aside className="relative w-full max-w-md rounded-2xl border border-[var(--color-bg-3)] bg-[color-mix(in_oklab,var(--color-bg-1)_88%,transparent)] p-5 shadow-[0_18px_60px_-12px_rgba(0,0,0,0.6)] backdrop-blur-xl">
      {/* Accent edge */}
      <div className="absolute -top-px left-6 right-6 h-px bg-gradient-to-r from-transparent via-[var(--color-accent-cyan)]/60 to-transparent" aria-hidden />
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent-cyan)]">{c.heading}</p>
        <p className="text-[10px] text-[var(--color-fg-3)]">{c.subtitle}</p>
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-2">
        {nearestCities.slice(0, 4).map((city) => (
          <li key={city.id}>
            <Link
              href={`/${locale}/${city.slug}`}
              className="group relative flex flex-col gap-1 rounded-lg border border-[var(--color-bg-3)] bg-[var(--color-bg-0)]/60 p-3 transition hover:border-[var(--color-accent-pink)] hover:bg-[var(--color-bg-0)]/90"
            >
              <p className="font-display text-lg font-semibold leading-none text-[var(--color-fg-0)] group-hover:text-[var(--color-accent-pink)]">{city.name}</p>
              <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--color-fg-3)]">
                {formatDistanceKm(city.distanceKm)}
              </p>
              <span aria-hidden className="absolute right-2 top-2 text-[10px] text-[var(--color-fg-3)] opacity-0 transition group-hover:opacity-100">↗</span>
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
