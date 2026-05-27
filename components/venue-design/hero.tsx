// Six hero layouts, dispatched by DesignParams.heroLayout. Every variant
// works off the same props so the renderer can swap them on a per-venue
// basis without conditionally fetching different data. All styling reads
// from the --venue-* custom properties set by venueStyleVars().

import Image from 'next/image';
import Link from 'next/link';
import type { HeroLayout } from '@/lib/design-system';
import { HERO_NEEDS_MULTI_PHOTO } from '@/lib/design-system';

export type HeroPhoto = { id: string; url: string; attribution: string | null };

export type VenueHeroProps = {
  layout: HeroLayout;
  name: string;
  /** Category label in the active locale (e.g. "Rooftop Bar", "Μπουζούκια"). */
  categoryLabel: string | null;
  /** City or area label in the active locale (subhead). */
  locationLabel: string | null;
  rating: number | null;
  /** Used by the marquee variant + decorative chip. */
  taglineLabel: string | null;
  photos: readonly HeroPhoto[];
  /** AI-written description — only the editorial layout actually renders it
   *  in the hero (as a drop-cap lede). Other layouts ignore. */
  descriptionLede: string | null;
  /** Resolved at the renderer level — claim CTA href + label per locale. */
  claim:
    | { claimed: true }
    | { claimed: false; href: string; label: string };
  /** Priority hint for the LCP image. */
  priority?: boolean;
};

export function VenueHero(props: VenueHeroProps) {
  // Layouts that need multiple photos but only have one downgrade to 'split'
  // rather than rendering an empty grid. The AI writer + fallback both try
  // to avoid this; the guard is here so a stale design_params row from
  // before a photo deletion still renders cleanly.
  let layout = props.layout;
  if (HERO_NEEDS_MULTI_PHOTO[layout] && props.photos.length < 2) {
    layout = 'split';
  }

  switch (layout) {
    case 'split':         return <HeroSplit        {...props} />;
    case 'full-bleed':    return <HeroFullBleed    {...props} />;
    case 'layered':       return <HeroLayered      {...props} />;
    case 'marquee':       return <HeroMarquee      {...props} />;
    case 'gallery-grid':  return <HeroGalleryGrid  {...props} />;
    case 'editorial':     return <HeroEditorial    {...props} />;
  }
}

// -------- shared atoms ----------------------------------------------------

function CategoryChip({ label }: { label: string | null }) {
  if (!label) return null;
  return <span className="venue-chip">{label}</span>;
}

function RatingPill({ rating }: { rating: number | null }) {
  if (!rating) return null;
  return (
    <span className="inline-flex items-center gap-1 text-sm text-[var(--color-fg-1)]">
      <span className="venue-stat font-semibold text-[var(--color-fg-0)]">★ {rating.toFixed(1)}</span>
    </span>
  );
}

function ClaimAffordance({ claim }: { claim: VenueHeroProps['claim'] }) {
  if (claim.claimed) return null;
  return (
    <Link href={claim.href} className="venue-cta-ghost text-xs">
      {claim.label}
    </Link>
  );
}

function HeroPhotoEl({
  photo, alt, priority, sizes, className, cropped = true,
}: {
  photo: HeroPhoto; alt: string; priority?: boolean; sizes: string;
  className?: string; cropped?: boolean;
}) {
  return (
    <Image
      src={photo.url}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      fetchPriority={priority ? 'high' : 'auto'}
      className={`object-cover ${cropped ? 'city-hero-crop' : ''} ${className ?? ''}`}
    />
  );
}

function PhotoAttribution({ photo }: { photo: HeroPhoto | undefined }) {
  if (!photo?.attribution) return null;
  return (
    <p className="mt-2 text-[10px] text-[var(--color-fg-3)]">Photo · {photo.attribution}</p>
  );
}

function PhotoFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-[var(--color-bg-1)]">
      <div className="venue-chip">no photo yet</div>
    </div>
  );
}

// -------- 1. split -------------------------------------------------------

function HeroSplit(p: VenueHeroProps) {
  const hero = p.photos[0];
  return (
    <section className="grid gap-8 md:grid-cols-[1fr_1.1fr] md:gap-12">
      <div className="flex flex-col justify-center">
        <div className="flex flex-wrap items-center gap-3">
          <CategoryChip label={p.categoryLabel} />
          <RatingPill rating={p.rating} />
        </div>
        {p.locationLabel && (
          <p className="mt-4 text-sm uppercase tracking-[0.22em] text-[var(--color-fg-2)]">
            {p.locationLabel}
          </p>
        )}
        <h1 className="venue-h1 mt-2 text-[var(--color-fg-0)]">{p.name}</h1>
        {p.taglineLabel && (
          <p className="mt-5 max-w-md text-base text-[var(--color-fg-1)]">{p.taglineLabel}</p>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          <ClaimAffordance claim={p.claim} />
        </div>
      </div>
      <div>
        <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[var(--radius-lg)] md:aspect-[3/4]">
          {hero
            ? <HeroPhotoEl photo={hero} alt={p.name} priority={p.priority} sizes="(min-width:1024px) 600px, 100vw" />
            : <PhotoFallback />}
          <div
            className="pointer-events-none absolute inset-0"
            style={{ boxShadow: 'inset 0 0 0 1px color-mix(in oklab, var(--venue-accent) 35%, transparent)' }}
          />
        </div>
        <PhotoAttribution photo={hero} />
      </div>
    </section>
  );
}

// -------- 2. full-bleed --------------------------------------------------

function HeroFullBleed(p: VenueHeroProps) {
  const hero = p.photos[0];
  return (
    <section>
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-[var(--radius-lg)] sm:aspect-[21/9]">
        {hero
          ? <HeroPhotoEl photo={hero} alt={p.name} priority={p.priority} sizes="(min-width:1280px) 1200px, 100vw" />
          : <PhotoFallback />}
        <div className="venue-hero-scrim absolute inset-0" />
        <div className="absolute inset-x-0 bottom-0 p-6 sm:p-10">
          <div className="flex flex-wrap items-center gap-3">
            <CategoryChip label={p.categoryLabel} />
            <RatingPill rating={p.rating} />
          </div>
          <h1 className="venue-h1 mt-3 text-[var(--color-fg-0)] drop-shadow-[0_2px_24px_rgba(0,0,0,0.6)]">
            {p.name}
          </h1>
          {p.locationLabel && (
            <p className="mt-2 text-sm uppercase tracking-[0.22em] text-[var(--color-fg-1)]">
              {p.locationLabel}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            <ClaimAffordance claim={p.claim} />
          </div>
        </div>
      </div>
      <PhotoAttribution photo={hero} />
    </section>
  );
}

// -------- 3. layered -----------------------------------------------------

function HeroLayered(p: VenueHeroProps) {
  const hero = p.photos[0];
  return (
    <section className="relative">
      <div className="relative mx-auto aspect-[5/4] w-full max-w-4xl overflow-hidden rounded-[var(--radius-lg)] md:aspect-[16/9]">
        {hero
          ? <HeroPhotoEl photo={hero} alt={p.name} priority={p.priority} sizes="(min-width:1024px) 900px, 100vw" />
          : <PhotoFallback />}
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(60% 70% at 50% 60%, transparent 0%, rgba(0,0,0,0.55) 95%)',
          }}
        />
      </div>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <div className="pointer-events-auto flex flex-col items-center gap-3 px-6">
          <CategoryChip label={p.categoryLabel} />
          <h1 className="venue-h1 text-[var(--color-fg-0)] drop-shadow-[0_2px_24px_rgba(0,0,0,0.7)]">
            {p.name}
          </h1>
          {p.locationLabel && (
            <p className="text-sm uppercase tracking-[0.22em] text-[var(--color-fg-1)]">
              {p.locationLabel}
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
            <RatingPill rating={p.rating} />
            <ClaimAffordance claim={p.claim} />
          </div>
        </div>
      </div>
      <PhotoAttribution photo={hero} />
    </section>
  );
}

// -------- 4. marquee ------------------------------------------------------

function HeroMarquee(p: VenueHeroProps) {
  // We loop the name 4× inside the track so even short names tile across
  // wide viewports without animation gaps. The track moves -50% to seam
  // perfectly with the duplicate copies.
  const tile = ` ${p.name.toUpperCase()} ✦`;
  const tileText = tile.repeat(4);
  return (
    <section>
      <div className="-mx-6 overflow-hidden border-y border-[var(--color-bg-2)] py-3" style={{ background: 'color-mix(in oklab, var(--venue-accent) 5%, transparent)' }}>
        <div className="venue-marquee-track whitespace-nowrap" aria-hidden="true">
          <span
            className="px-2"
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 'clamp(3rem, 10vw, 9rem)',
              letterSpacing: '-0.04em',
              color: 'var(--venue-accent)',
              textShadow: '0 0 60px var(--venue-glow)',
            }}
          >
            {tileText}
          </span>
          <span
            className="px-2"
            aria-hidden="true"
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 'clamp(3rem, 10vw, 9rem)',
              letterSpacing: '-0.04em',
              color: 'var(--venue-accent)',
              textShadow: '0 0 60px var(--venue-glow)',
            }}
          >
            {tileText}
          </span>
        </div>
      </div>
      {/* Screen-reader-only real heading; visually replaced by marquee above. */}
      <h1 className="sr-only">{p.name}</h1>
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <CategoryChip label={p.categoryLabel} />
        {p.locationLabel && (
          <p className="text-sm uppercase tracking-[0.22em] text-[var(--color-fg-2)]">{p.locationLabel}</p>
        )}
        <RatingPill rating={p.rating} />
        <ClaimAffordance claim={p.claim} />
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {p.photos.slice(0, 4).map((photo, i) => (
          <div key={photo.id} className="relative aspect-[3/4] overflow-hidden rounded-[var(--radius-md)]">
            <HeroPhotoEl photo={photo} alt={p.name} priority={p.priority && i === 0} sizes="(min-width:640px) 25vw, 50vw" />
          </div>
        ))}
        {/* Fill empty cells with accent-tinted placeholder so the strip never looks broken. */}
        {Array.from({ length: Math.max(0, 4 - p.photos.length) }).map((_, i) => (
          <div key={`pad-${i}`} className="venue-panel-flat aspect-[3/4]" />
        ))}
      </div>
    </section>
  );
}

// -------- 5. gallery-grid -------------------------------------------------

function HeroGalleryGrid(p: VenueHeroProps) {
  const [hero, ...rest] = p.photos;
  const thumbs = rest.slice(0, 3);
  return (
    <section className="grid gap-6 md:grid-cols-[1.3fr_1fr] md:gap-10">
      <div className="grid grid-cols-3 grid-rows-2 gap-3">
        <div className="relative col-span-3 row-span-1 aspect-[16/9] overflow-hidden rounded-[var(--radius-lg)] md:col-span-2 md:row-span-2 md:aspect-auto">
          {hero ? <HeroPhotoEl photo={hero} alt={p.name} priority={p.priority} sizes="(min-width:1024px) 700px, 100vw" /> : <PhotoFallback />}
        </div>
        {thumbs.map((photo) => (
          <div key={photo.id} className="relative aspect-[4/5] overflow-hidden rounded-[var(--radius-md)]">
            <HeroPhotoEl photo={photo} alt={p.name} sizes="(min-width:1024px) 220px, 33vw" />
          </div>
        ))}
        {Array.from({ length: Math.max(0, 3 - thumbs.length) }).map((_, i) => (
          <div key={`pad-${i}`} className="venue-panel-flat aspect-[4/5]" />
        ))}
      </div>
      <div className="flex flex-col justify-center">
        <div className="flex flex-wrap items-center gap-3">
          <CategoryChip label={p.categoryLabel} />
          <RatingPill rating={p.rating} />
        </div>
        {p.locationLabel && (
          <p className="mt-4 text-sm uppercase tracking-[0.22em] text-[var(--color-fg-2)]">{p.locationLabel}</p>
        )}
        <h1 className="venue-h1 mt-2 text-[var(--color-fg-0)]">{p.name}</h1>
        {p.taglineLabel && <p className="mt-4 text-[var(--color-fg-1)]">{p.taglineLabel}</p>}
        <div className="mt-5 flex flex-wrap gap-3">
          <ClaimAffordance claim={p.claim} />
        </div>
      </div>
    </section>
  );
}

// -------- 6. editorial ----------------------------------------------------

function HeroEditorial(p: VenueHeroProps) {
  const hero = p.photos[0];
  return (
    <section className="grid gap-10 md:grid-cols-[1.15fr_1fr]">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <CategoryChip label={p.categoryLabel} />
          <RatingPill rating={p.rating} />
        </div>
        {p.locationLabel && (
          <p className="mt-4 text-sm uppercase tracking-[0.22em] text-[var(--color-fg-2)]">
            {p.locationLabel}
          </p>
        )}
        <h1 className="venue-h1 mt-2 text-[var(--color-fg-0)]">{p.name}</h1>
        <div className="venue-rule mt-6" />
        {p.descriptionLede ? (
          <p className="venue-body venue-dropcap mt-6">{p.descriptionLede}</p>
        ) : p.taglineLabel ? (
          <p className="venue-body mt-6">{p.taglineLabel}</p>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-3">
          <ClaimAffordance claim={p.claim} />
        </div>
      </div>
      <div>
        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[var(--radius-lg)] md:aspect-[4/5]">
          {hero ? <HeroPhotoEl photo={hero} alt={p.name} priority={p.priority} sizes="(min-width:1024px) 560px, 100vw" /> : <PhotoFallback />}
        </div>
        <PhotoAttribution photo={hero} />
      </div>
    </section>
  );
}
