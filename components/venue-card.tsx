import Link from 'next/link';
import Image from 'next/image';
import type { Locale } from '@/lib/i18n';
import type { VenueListItem } from '@/lib/queries';

// Phase 3 ground rule: if there's no photo, render a styled placeholder + claim CTA.
// We never compose a stock/AI image here (§6 rule 2 is also enforced at the DB level).

export function VenueCard({ venue, locale }: { venue: VenueListItem; locale: Locale }) {
  const href = venue.slug && venue.areaSlug
    ? `/${locale}/greece/${venue.citySlug}/${venue.areaSlug}/${venue.slug}`
    : venue.slug && venue.categorySlug
      ? `/${locale}/greece/${venue.citySlug}/${venue.categorySlug}/${venue.slug}`
      : `/${locale}/greece/${venue.citySlug}`;

  return (
    <article className="group overflow-hidden rounded-lg border border-[var(--color-bg-3)] bg-[var(--color-bg-1)] transition hover:border-[var(--color-accent-pink)]">
      <Link href={href} className="block">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-[var(--color-bg-2)]">
          {venue.photoUrl ? (
            <Image
              src={venue.photoUrl}
              alt={venue.name}
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition group-hover:scale-105 city-hero-crop"
            />
          ) : (
            <PlaceholderArt />
          )}
          {venue.tier === 'featured' && (
            <span
              aria-label="Featured listing"
              className="absolute left-3 top-3 rounded-full bg-[var(--color-accent-pink)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-bg-0)]"
            >
              Featured
            </span>
          )}
        </div>

        <div className="p-4">
          <p className="font-display text-base font-semibold leading-tight">{venue.name}</p>
          <p className="mt-1 text-xs text-[var(--color-fg-2)]">
            {[venue.areaName, venue.categoryName].filter(Boolean).join(' · ')}
          </p>
          {venue.description && (
            <p className="mt-2 line-clamp-2 text-sm text-[var(--color-fg-1)]">{venue.description}</p>
          )}
        </div>
      </Link>
    </article>
  );
}

// Subtle neon-on-dark placeholder — no fake imagery, no stock.
function PlaceholderArt() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[var(--color-bg-1)] via-[var(--color-bg-2)] to-[var(--color-bg-1)]">
      <svg viewBox="0 0 64 64" className="h-12 w-12 text-[var(--color-fg-3)]" aria-hidden>
        <circle cx="32" cy="32" r="20" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="32" cy="32" r="6" fill="currentColor" opacity="0.4" />
      </svg>
    </div>
  );
}
