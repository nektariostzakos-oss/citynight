// Shared loader + chrome for the venue main page and its subdirectory
// routes (/menu /book /about /gallery). Each subpage stays small — it
// resolves data and renders its specific block; the shell handles the
// venue load + design vars + breadcrumb + mini-nav consistently.

import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Locale } from '@/lib/i18n';
import { getVenueByCityArea } from '@/lib/queries';
import { getMiniSiteAvailability } from '@/lib/mini-site';
import {
  parseDesignParams, defaultDesignParams, type DesignParams,
} from '@/lib/design-system';
import { venueStyleVars } from '@/lib/venue-style';
import { VenueMiniNav, MINI_NAV_LABELS } from '@/components/venue-design/mini-nav';
import { VenueBackStrip, VenueMiniFooter } from '@/components/venue-design/site-strip';

export type LoadedVenue = {
  v: NonNullable<ReturnType<typeof getVenueByCityArea>>;
  design: DesignParams;
  availability: ReturnType<typeof getMiniSiteAvailability>;
  basePath: string;
  homeLabel: string;
  greeceLabel: string;
};

const HOME_LABELS: Record<Locale, string> = { en: 'Home', el: 'Αρχική', de: 'Start', fr: 'Accueil', it: 'Home' };
const GREECE_LABELS: Record<Locale, string> = { en: 'Greece', el: 'Ελλάδα', de: 'Griechenland', fr: 'Grèce', it: 'Grecia' };

export function loadVenueOrNotFound(
  locale: Locale, city: string, bucket: string, slug: string,
): LoadedVenue {
  const v = getVenueByCityArea(city, bucket, slug, locale);
  if (!v) notFound();
  const parsed = v.designParams ? safeJson(v.designParams) : null;
  const design = parseDesignParams(parsed) ?? defaultDesignParams({
    venueId: v.id, categorySlug: v.categorySlug,
  });
  const availability = getMiniSiteAvailability(v.id);
  const basePath = `/${locale}/greece/${city}/${bucket}/${slug}`;
  return {
    v, design, availability, basePath,
    homeLabel: HOME_LABELS[locale], greeceLabel: GREECE_LABELS[locale],
  };
}

/**
 * Wraps a subdirectory page in the venue's design vars + breadcrumb + mini-nav.
 * Each subpage just passes its content as `children`.
 */
export function VenuePageShell({
  locale, loaded, active, children,
}: {
  locale: Locale;
  loaded: LoadedVenue;
  active: 'overview' | 'menu' | 'book' | 'about' | 'gallery';
  children: React.ReactNode;
}) {
  const { v, design, availability, basePath, homeLabel, greeceLabel } = loaded;
  return (
    <div className="venue-as-website">
      {/* Slim "back to citynight" strip replaces the global site header on
          venue pages (CSS :has() hides SiteHeader/SiteFooter when this
          .venue-as-website element is in the DOM). */}
      <VenueBackStrip locale={locale} citySlug={v.citySlug} cityName={v.cityName} />

      <article
        style={venueStyleVars(design)}
        className={`venue-root venue-motion-${design.motion} px-6 py-10`}
        data-design={`${design.palette}/${design.typePair}/${design.heroLayout}/${design.density}/${design.motion}`}
      >
        <nav aria-label="Breadcrumb" className="mb-3 text-xs text-[var(--color-fg-2)]">
          <Link href={`/${locale}`} className="hover:text-[var(--venue-accent)]">{homeLabel}</Link>
          {' · '}
          <Link href={`/${locale}/greece`} className="hover:text-[var(--venue-accent)]">{greeceLabel}</Link>
          {' · '}
          <Link href={`/${locale}/greece/${v.citySlug}`} className="hover:text-[var(--venue-accent)]">{v.cityName}</Link>
          {' · '}
          <Link href={basePath} className="hover:text-[var(--venue-accent)]">{v.name}</Link>
        </nav>

        <VenueMiniNav
          basePath={basePath}
          active={active}
          labels={MINI_NAV_LABELS[locale]}
          availability={availability}
        />

        {children}

        <VenueMiniFooter
          locale={locale}
          citySlug={v.citySlug}
          cityName={v.cityName}
          venueId={v.id}
          claimed={v.claim === 'verified'}
        />
      </article>
    </div>
  );
}

function safeJson(s: string): unknown {
  try { return JSON.parse(s); } catch { return null; }
}
