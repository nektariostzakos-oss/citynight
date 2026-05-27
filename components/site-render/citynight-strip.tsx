// Slim "back to citynight" strip on top of every SaaS site. Mirrors the
// chrome on the old directory pages, repointed at the new URL tree:
// left = "← back to {city}" → /{locale}/cities/{citySlug}; right = "on
// citynight" → /{locale}.

import Link from 'next/link';
import type { Locale } from '@/lib/i18n';
import { MoonIcon } from '@/components/nav-icons';

const BACK: Record<Locale, (city: string) => string> = {
  en: (c) => `← Back to ${c}`,
  el: (c) => `← Πίσω στο ${c}`,
  de: (c) => `← Zurück zu ${c}`,
  fr: (c) => `← Retour à ${c}`,
  it: (c) => `← Torna a ${c}`,
};

const BRAND_SUFFIX: Record<Locale, string> = {
  en: 'on citynight',
  el: 'στο citynight',
  de: 'auf citynight',
  fr: 'sur citynight',
  it: 'su citynight',
};

const CLAIM_LABEL: Record<Locale, string> = {
  en: 'Claim',
  el: 'Διεκδίκησε',
  de: 'Übernehmen',
  fr: 'Revendiquer',
  it: 'Rivendica',
};

export function CitynightStrip({
  locale, citySlug, cityName, siteId, unclaimed,
}: {
  locale: Locale;
  citySlug: string;
  cityName: string;
  /** Site id — only used to build the claim URL when unclaimed=true. */
  siteId?: string;
  /** Show the "Claim this business" CTA. True for sites whose owner is
   *  the citynight system user (i.e. migrated venues no real owner has
   *  picked up yet). */
  unclaimed?: boolean;
}) {
  return (
    <div
      // Local grid overrides the shared `.venue-back-strip` flex so the
      // claim pill sits dead-center between the back link (left) and the
      // citynight wordmark (right). Three equal-fraction columns keep the
      // centre piece centered regardless of left/right widths.
      className="venue-back-strip"
      style={{
        borderColor: 'var(--site-border)',
        background: 'color-mix(in oklab, var(--site-bg) 90%, transparent)',
        color: 'var(--site-muted)',
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        gap: '0.75rem',
      }}
    >
      <Link
        href={`/${locale}/cities/${citySlug}`}
        style={{ color: 'inherit', justifySelf: 'start' }}
        className="transition hover:!text-[var(--site-primary)]"
      >
        {BACK[locale](cityName)}
      </Link>

      <div style={{ justifySelf: 'center' }}>
        {unclaimed && siteId ? (
          <Link
            href={`/${locale}/claim/site/${siteId}`}
            className="inline-flex items-center gap-1 rounded-full px-4 py-1 font-semibold transition"
            style={{
              background: 'var(--site-primary)',
              color: 'var(--site-bg)',
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
            }}
          >
            {CLAIM_LABEL[locale]}
          </Link>
        ) : null}
      </div>

      <div style={{ justifySelf: 'end' }}>
        <Link
          href={`/${locale}`}
          style={{ color: 'inherit' }}
          className="flex items-center gap-1.5 transition hover:!text-[var(--site-primary)]"
        >
          <span aria-hidden className="grid h-4 w-4 place-items-center rounded bg-gradient-to-br from-[var(--color-accent-pink)] to-[var(--color-accent-violet)]">
            <MoonIcon className="h-2.5 w-2.5 text-[var(--color-bg-0)]" />
          </span>
          {BRAND_SUFFIX[locale]}
        </Link>
      </div>
    </div>
  );
}
