// Tabs shown above every venue subdirectory page (/menu, /book, /about,
// /gallery) and above the main venue page. Driven by the availability map
// from lib/mini-site.ts so empty tabs don't show.

import Link from 'next/link';
import type { Locale } from '@/lib/i18n';

export type MiniNavLabels = {
  overview: string;
  menu: string;
  book: string;
  about: string;
  gallery: string;
};

export const MINI_NAV_LABELS: Record<Locale, MiniNavLabels> = {
  en: { overview: 'Overview', menu: 'Menu', book: 'Reserve', about: 'About', gallery: 'Gallery' },
  el: { overview: 'Επισκόπηση', menu: 'Μενού', book: 'Κράτηση', about: 'Σχετικά', gallery: 'Φωτογραφίες' },
  de: { overview: 'Übersicht', menu: 'Speisekarte', book: 'Reservieren', about: 'Über', gallery: 'Galerie' },
  fr: { overview: 'Aperçu', menu: 'Carte', book: 'Réserver', about: 'À propos', gallery: 'Galerie' },
  it: { overview: 'Panoramica', menu: 'Menù', book: 'Prenotare', about: 'Chi siamo', gallery: 'Galleria' },
};

export function VenueMiniNav({
  basePath,
  active,
  labels,
  availability,
}: {
  /** /{locale}/greece/{city}/{bucket}/{venue} */
  basePath: string;
  active: 'overview' | 'menu' | 'book' | 'about' | 'gallery';
  labels: MiniNavLabels;
  availability: { menu: boolean; about: boolean; book: boolean; gallery: boolean };
}) {
  const tabs: { key: typeof active; label: string; href: string; show: boolean }[] = [
    { key: 'overview', label: labels.overview, href: basePath,             show: true },
    { key: 'menu',     label: labels.menu,     href: `${basePath}/menu`,    show: availability.menu },
    { key: 'book',     label: labels.book,     href: `${basePath}/book`,    show: availability.book },
    { key: 'about',    label: labels.about,    href: `${basePath}/about`,   show: availability.about },
    { key: 'gallery',  label: labels.gallery,  href: `${basePath}/gallery`, show: availability.gallery },
  ];

  const visible = tabs.filter((t) => t.show);
  // No reason to render a single-tab nav — the page is its own breadcrumb.
  if (visible.length <= 1) return null;

  return (
    <nav aria-label="Venue sections" className="-mx-2 mb-6 flex flex-wrap gap-1 overflow-x-auto border-b border-[var(--color-bg-2)] pb-px">
      {visible.map((t) => {
        const isActive = t.key === active;
        return (
          <Link
            key={t.key}
            href={t.href}
            aria-current={isActive ? 'page' : undefined}
            className={`relative inline-flex items-center px-3 py-2 text-sm font-semibold transition ${
              isActive
                ? 'text-[var(--venue-accent,var(--color-accent-pink))]'
                : 'text-[var(--color-fg-2)] hover:text-[var(--color-fg-0)]'
            }`}
          >
            {t.label}
            {isActive && (
              <span
                aria-hidden
                className="absolute inset-x-2 -bottom-px h-0.5 rounded-t"
                style={{ background: 'var(--venue-accent, var(--color-accent-pink))', boxShadow: '0 -2px 12px var(--venue-glow, transparent)' }}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
