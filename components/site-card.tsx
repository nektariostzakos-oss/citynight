// SaaS site card — used on the citynight discovery surfaces (homepage,
// /cities/{city}, search results). Always links to /sites/{slug} (no
// locale prefix — site URLs are flat).

import Image from 'next/image';
import Link from 'next/link';
import type { SiteCard as SiteCardData } from '@/lib/city-sites';

const VERTICAL_LABEL: Record<string, string> = {
  restaurant: 'Restaurant',
  bar: 'Bar',
  rooftop: 'Rooftop',
  nightclub: 'Night club',
  beach_club: 'Beach club',
  hotel: 'Hotel',
  cafe: 'Café',
  salon: 'Salon',
  other: '',
};

export function SiteCard({ site, locale = 'el', citySlug }: {
  site: SiteCardData;
  locale?: string;
  /** City slug for the URL — pass when known (e.g. on a city page). */
  citySlug?: string | null;
}) {
  const cs = citySlug ?? site.citySlug ?? '';
  // If we can't resolve a city slug, fall back to a stripped form of the
  // free-text city name. Better than a broken link.
  const cityPart = cs || (site.city ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const href = cityPart ? `/${locale}/cities/${cityPart}/${site.slug}` : `/${locale}/sites/${site.slug}`;
  return (
    <Link
      href={href}
      className="group block rounded-xl border border-[var(--color-bg-2)] bg-[var(--color-bg-1)] transition hover:border-[var(--color-accent-cyan)]/40 hover:shadow-[0_18px_42px_-12px_rgba(0,229,255,0.18)]"
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-t-xl">
        {site.heroUrl ? (
          <Image
            src={site.heroUrl}
            alt={site.name}
            fill
            sizes="(min-width:1024px) 25vw, (min-width:640px) 33vw, 50vw"
            className="object-cover transition group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[var(--color-bg-2)]">
            <span className="text-xs uppercase tracking-[0.22em] text-[var(--color-fg-3)]">
              {site.name.slice(0, 2).toUpperCase()}
            </span>
          </div>
        )}
      </div>
      <div className="p-4">
        {VERTICAL_LABEL[site.vertical] && (
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--color-accent-pink)]">
            {VERTICAL_LABEL[site.vertical]}
            {site.city ? <span className="text-[var(--color-fg-3)]"> · {site.city}</span> : null}
          </p>
        )}
        <h3 className="mt-2 font-display text-base font-semibold tracking-tight text-[var(--color-fg-0)]">
          {site.name}
        </h3>
        {site.aboutLede && (
          <p className="mt-1 line-clamp-2 text-sm text-[var(--color-fg-2)]">
            {site.aboutLede}
          </p>
        )}
      </div>
    </Link>
  );
}
