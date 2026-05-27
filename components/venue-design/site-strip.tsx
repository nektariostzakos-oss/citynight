// Slim citynight branding for venue pages. The global SiteHeader + SiteFooter
// are hidden via CSS :has(.venue-as-website) so the venue's own design owns
// the page; these tiny strips keep the directory connection visible without
// dominating.

import Link from 'next/link';
import type { Locale } from '@/lib/i18n';
import { MoonIcon } from '@/components/nav-icons';

type BackStripLabels = { back: (cityName: string) => string; brand: string };

const BACK: Record<Locale, BackStripLabels> = {
  en: { back: (c) => `← Back to ${c}`,                       brand: 'on citynight' },
  el: { back: (c) => `← Πίσω στο ${c}`,                      brand: 'στο citynight' },
  de: { back: (c) => `← Zurück zu ${c}`,                     brand: 'auf citynight' },
  fr: { back: (c) => `← Retour à ${c}`,                      brand: 'sur citynight' },
  it: { back: (c) => `← Torna a ${c}`,                       brand: 'su citynight' },
};

export function VenueBackStrip({
  locale, citySlug, cityName,
}: { locale: Locale; citySlug: string; cityName: string }) {
  const t = BACK[locale];
  return (
    <div className="venue-back-strip">
      <Link href={`/${locale}/greece/${citySlug}`}>{t.back(cityName)}</Link>
      <Link href={`/${locale}`} className="flex items-center gap-1.5 text-[var(--color-fg-3)] hover:text-[var(--venue-accent,var(--color-accent-pink))]">
        <span aria-hidden className="grid h-4 w-4 place-items-center rounded bg-gradient-to-br from-[var(--color-accent-pink)] to-[var(--color-accent-violet)]">
          <MoonIcon className="h-2.5 w-2.5 text-[var(--color-bg-0)]" />
        </span>
        {t.brand}
      </Link>
    </div>
  );
}

type MiniFooterLabels = {
  poweredBy: string;
  discover: (city: string) => string;
  ownerCta: string;
  privacy: string;
  terms: string;
};

const FOOTER: Record<Locale, MiniFooterLabels> = {
  en: { poweredBy: 'Powered by',
        discover: (c) => `Discover more in ${c} →`,
        ownerCta: 'Own this venue?',
        privacy: 'Privacy', terms: 'Terms' },
  el: { poweredBy: 'Powered by',
        discover: (c) => `Ανακάλυψε περισσότερα στο ${c} →`,
        ownerCta: 'Είσαι ο ιδιοκτήτης;',
        privacy: 'Privacy', terms: 'Όροι' },
  de: { poweredBy: 'Powered by',
        discover: (c) => `Mehr in ${c} entdecken →`,
        ownerCta: 'Inhaber?',
        privacy: 'Datenschutz', terms: 'AGB' },
  fr: { poweredBy: 'Propulsé par',
        discover: (c) => `Découvrir plus à ${c} →`,
        ownerCta: 'Propriétaire ?',
        privacy: 'Confidentialité', terms: 'CGU' },
  it: { poweredBy: 'Powered by',
        discover: (c) => `Scopri di più a ${c} →`,
        ownerCta: 'Sei il proprietario?',
        privacy: 'Privacy', terms: 'Termini' },
};

export function VenueMiniFooter({
  locale, citySlug, cityName, venueId, claimed,
}: { locale: Locale; citySlug: string; cityName: string; venueId: string; claimed: boolean }) {
  const t = FOOTER[locale];
  return (
    <footer className="venue-mini-footer">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="flex items-center gap-2">
          <span>{t.poweredBy}</span>
          <Link href={`/${locale}`} className="font-display font-semibold text-[var(--color-fg-1)] hover:text-[var(--venue-accent,var(--color-accent-pink))]">
            <span className="text-[var(--color-fg-0)]">city</span>
            <span className="text-[var(--color-accent-pink)]">night</span>
          </Link>
        </p>
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <Link href={`/${locale}/greece/${citySlug}`}>{t.discover(cityName)}</Link>
          {!claimed && (
            <Link href={`/${locale}/claim/${venueId}`} className="text-[var(--venue-accent,var(--color-accent-pink))]">
              {t.ownerCta}
            </Link>
          )}
          <Link href={`/${locale}/legal/privacy`}>{t.privacy}</Link>
          <Link href={`/${locale}/legal/terms`}>{t.terms}</Link>
        </nav>
      </div>
    </footer>
  );
}
