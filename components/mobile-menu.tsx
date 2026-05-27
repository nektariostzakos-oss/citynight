'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { LOCALES, LOCALE_LABELS, type Locale } from '@/lib/i18n';
import {
  CloseIcon, MenuIcon, MoonIcon, ForkKnifeIcon, BedIcon,
  MapPinIcon, StoreIcon,
} from './nav-icons';
import { SearchBox } from './search-box';
import { useNearbyCities } from './nearby-cities-context';
import { formatDistanceKm } from '@/lib/geo-distance';

// App-feel slide-in drawer. Solid panel (not glassy), single accent strip,
// large tappable verticals tiles, and a "Near you / Popular" smart-preview
// section that uses the visitor's precise location when available. Locks
// body scroll while open.

export type PopularCity = { slug: string; name: string; region: string | null };

type Copy = {
  open: string;
  close: string;
  cities: string;
  nightlife: string;
  food: string;
  stay: string;
  guides: string;
  owners: string;
  signIn: string;
  near: string;
  popular: string;
  language: string;
  goTo: string;
  /** Range expand chip — singular form */
  rangeWider: (km: number) => string;
  rangeReset: string;
};

const COPY: Record<Locale, Copy> = {
  en: {
    open: 'Open menu', close: 'Close menu',
    cities: 'Cities', nightlife: 'Nightlife', food: 'Food', stay: 'Stay',
    guides: 'Guides', owners: 'For owners', signIn: 'Sign in',
    near: 'Near you', popular: 'Popular',
    language: 'Language', goTo: 'Go to',
    rangeWider: (km) => `+ ${km} km`,
    rangeReset: 'Closest',
  },
  el: {
    open: 'Άνοιγμα μενού', close: 'Κλείσιμο μενού',
    cities: 'Πόλεις', nightlife: 'Νυχτερινή ζωή', food: 'Φαγητό', stay: 'Διαμονή',
    guides: 'Οδηγοί', owners: 'Για ιδιοκτήτες', signIn: 'Σύνδεση',
    near: 'Κοντά σου', popular: 'Δημοφιλή',
    language: 'Γλώσσα', goTo: 'Πήγαινε',
    rangeWider: (km) => `+ ${km} χλμ`,
    rangeReset: 'Πιο κοντά',
  },
  de: {
    open: 'Menü öffnen', close: 'Menü schließen',
    cities: 'Städte', nightlife: 'Nightlife', food: 'Essen', stay: 'Übernachten',
    guides: 'Guides', owners: 'Für Inhaber', signIn: 'Anmelden',
    near: 'In deiner Nähe', popular: 'Beliebt',
    language: 'Sprache', goTo: 'Öffnen',
    rangeWider: (km) => `+ ${km} km`,
    rangeReset: 'Näher',
  },
  fr: {
    open: 'Ouvrir le menu', close: 'Fermer le menu',
    cities: 'Villes', nightlife: 'Vie nocturne', food: 'Cuisine', stay: 'Hébergement',
    guides: 'Guides', owners: 'Pour les exploitants', signIn: 'Connexion',
    near: 'Près de vous', popular: 'Populaire',
    language: 'Langue', goTo: 'Ouvrir',
    rangeWider: (km) => `+ ${km} km`,
    rangeReset: 'Plus près',
  },
  it: {
    open: 'Apri menu', close: 'Chiudi menu',
    cities: 'Città', nightlife: 'Vita notturna', food: 'Cucina', stay: 'Dormire',
    guides: 'Guide', owners: 'Per i proprietari', signIn: 'Accedi',
    near: 'Vicino a te', popular: 'Popolari',
    language: 'Lingua', goTo: 'Apri',
    rangeWider: (km) => `+ ${km} km`,
    rangeReset: 'Più vicino',
  },
};

// Range tiers shown sequentially as the visitor taps "+ N km". Cap at 500
// (covers all of Greece comfortably). Single chip — visitor never sees
// multiple options at once, so no decision fatigue.
const RANGE_TIERS_KM = [50, 150, 500];

export function MobileMenu({
  locale,
  popularCities = [],
}: {
  locale: Locale;
  popularCities?: PopularCity[];
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { hasLocation, nearestCities, sortedAllCities } = useNearbyCities();
  // Range tier index. 0 = closest only (default), 1 = +50 km, 2 = +150 km, 3 = +500 km.
  // Bumped by tapping the small chip; reset by tapping it again past the end.
  const [rangeIdx, setRangeIdx] = useState(0);
  const c = COPY[locale];

  // a11y refs: keep a reference to the hamburger trigger so focus can return
  // to it on close, and to the panel root so we can scope the focus trap.
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // Touch-swipe-to-close tracker (right-swipe over ≈80px closes the panel).
  const touchStartX = useRef<number | null>(null);

  // Need to wait for the client mount before we can portal into document.body.
  useEffect(() => { setMounted(true); }, []);

  // Body-scroll lock, Esc handler, focus trap, focus restore — all the panel
  // lifecycle a11y in one effect so cleanup is symmetric.
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = (document.activeElement as HTMLElement | null) ?? null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Move focus into the panel on the next frame so the panel exists in the DOM.
    const focusFrame = window.requestAnimationFrame(() => {
      const first = panelRef.current?.querySelector<HTMLElement>(
        'button, [href], input, [tabindex]:not([tabindex="-1"])',
      );
      first?.focus();
    });

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      // Focus trap — cycle within the panel only.
      const focusables = panelRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
    }
    window.addEventListener('keydown', onKey);

    // Snapshot the trigger ref now — by the time cleanup runs, the ref may
    // have changed (React warns about reading refs in cleanup directly).
    const triggerSnapshot = triggerRef.current;
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
      // Restore focus to whatever opened the panel (typically the hamburger).
      const target = previouslyFocused ?? triggerSnapshot;
      target?.focus?.();
    };
  }, [open]);

  // Smart preview source. When precise location is known, show nearest 4 with
  // distance chips. Otherwise fall back to the server-provided popular list.
  const previewIsNear = hasLocation && nearestCities.length > 0;
  // Range filtering: when the visitor has expanded their range, draw from the
  // full sorted-by-distance list and keep entries within the active radius.
  // Phase K.10 — every menu section caps at 10 entries.
  const radiusKm = rangeIdx === 0 ? null : RANGE_TIERS_KM[rangeIdx - 1] ?? null;
  const previewItems = previewIsNear
    ? (radiusKm === null
        ? nearestCities.slice(0, 10)
        : sortedAllCities.filter((x) => Number.isFinite(x.distanceKm) && x.distanceKm <= radiusKm).slice(0, 10)
      ).map((x) => ({
        slug: x.slug, name: x.name, region: x.region,
        distanceKm: Number.isFinite(x.distanceKm) ? x.distanceKm : null,
      }))
    : popularCities.slice(0, 10).map((x) => ({
        slug: x.slug, name: x.name, region: x.region, distanceKm: null,
      }));
  // Next radius tier the chip will jump to. Wraps back to 0 (closest) after
  // the last tier so the visitor can collapse the list.
  const nextRangeIdx = (rangeIdx + 1) % (RANGE_TIERS_KM.length + 1);
  const showRangeChip = previewIsNear; // only meaningful when we have GPS

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label={c.open}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-bg-3)] bg-[var(--color-bg-1)] text-[var(--color-fg-0)] transition hover:border-[var(--color-accent-cyan)] hover:text-[var(--color-accent-cyan)] md:hidden"
      >
        <MenuIcon />
      </button>

      {open && mounted && createPortal(
        <div className="fixed inset-0 z-[60] md:hidden" role="dialog" aria-modal="true" aria-label={c.cities}>
          {/* Solid backdrop (no transparency on the panel itself). */}
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={c.close}
            className="absolute inset-0 bg-[var(--color-bg-0)]/85 backdrop-blur-md"
          />

          {/* Panel — fully opaque so dark content behind never bleeds through.
              Single top accent gradient bar carries the brand without
              colouring every row.
              touchstart/touchend track horizontal swipes — right-swipe of
              ≥80 px closes the drawer (mirrors native iOS/Android pattern). */}
          <div
            ref={panelRef}
            onTouchStart={(e) => { touchStartX.current = e.touches[0]?.clientX ?? null; }}
            onTouchEnd={(e) => {
              const start = touchStartX.current;
              touchStartX.current = null;
              if (start == null) return;
              const dx = (e.changedTouches[0]?.clientX ?? start) - start;
              if (dx > 80) setOpen(false);
            }}
            className="absolute inset-y-0 right-0 flex w-full max-w-sm flex-col bg-[var(--color-bg-0)] shadow-[0_0_60px_-10px_rgba(0,0,0,0.9)] ring-1 ring-[var(--color-bg-2)]"
          >
            {/* Accent strip */}
            <div
              aria-hidden
              className="h-[3px] w-full bg-gradient-to-r from-[var(--color-accent-pink)] via-[var(--color-accent-violet)] to-[var(--color-accent-cyan)]"
            />

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4">
              <Link
                href={`/${locale}`}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight"
              >
                <span className="grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br from-[var(--color-accent-pink)] to-[var(--color-accent-violet)]">
                  <MoonIcon className="h-3.5 w-3.5 text-[var(--color-bg-0)]" />
                </span>
                <span>
                  <span className="text-[var(--color-fg-0)]">city</span>
                  <span className="text-[var(--color-accent-pink)]">night</span>
                </span>
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={c.close}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-bg-3)] text-[var(--color-fg-0)] hover:border-[var(--color-accent-cyan)] hover:text-[var(--color-accent-cyan)]"
              >
                <CloseIcon />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-5 pb-6">
              {/* Search */}
              <div className="pb-5">
                <SearchBox locale={locale} />
              </div>

              {/* Verticals — 2×2 grid of large tiles. One accent per tile.  */}
              {/* Phase K.3 — drop the Nightlife/Food/Stay tiles. The
                  vertical filters live inside each city's article guide
                  now (e.g. /cities/athens groups articles by vertical).
                  The mobile menu surfaces only the cities entry; the
                  popular-cities list below already gives one-tap access
                  to every city. */}
              <section aria-label={c.cities}>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--color-fg-3)]">
                  {c.cities}
                </p>
                <div className="grid">
                  <Tile
                    href={`/${locale}`}
                    onClick={() => setOpen(false)}
                    icon={<MapPinIcon className="h-5 w-5" />}
                    label={c.cities}
                    accent="cyan"
                  />
                </div>
              </section>

              {/* Smart preview — nearest cities (precise location) or popular.
                  When GPS is on, a tiny single chip on the right lets the
                  visitor widen the radius (+50 → +150 → +500 km → reset).
                  One chip, no menus — chosen to keep the surface calm. */}
              {previewItems.length > 0 && (
                <section className="mt-6" aria-label={previewIsNear ? c.near : c.popular}>
                  <div className="mb-2 flex items-baseline justify-between gap-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--color-fg-3)]">
                      {previewIsNear ? c.near : c.popular}
                      {previewIsNear && radiusKm !== null && (
                        <span className="ml-1.5 normal-case tracking-normal text-[var(--color-fg-2)]">
                          · ≤ {radiusKm} km
                        </span>
                      )}
                    </p>
                    <div className="flex items-center gap-2">
                      {showRangeChip && (
                        <button
                          type="button"
                          onClick={() => setRangeIdx(nextRangeIdx)}
                          className="rounded-full border border-[var(--color-bg-3)] bg-[var(--color-bg-1)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-fg-1)] transition hover:border-[var(--color-accent-cyan)] hover:text-[var(--color-accent-cyan)]"
                          aria-label={nextRangeIdx === 0 ? c.rangeReset : c.rangeWider(RANGE_TIERS_KM[nextRangeIdx - 1]!)}
                        >
                          {nextRangeIdx === 0 ? c.rangeReset : c.rangeWider(RANGE_TIERS_KM[nextRangeIdx - 1]!)}
                        </button>
                      )}
                      {previewIsNear && (
                        <span
                          aria-hidden
                          className="inline-flex items-center gap-1 text-[10px] text-[var(--color-accent-cyan)]"
                        >
                          <span className="relative inline-flex h-1.5 w-1.5">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-accent-cyan)] opacity-70" />
                            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--color-accent-cyan)]" />
                          </span>
                          GPS
                        </span>
                      )}
                    </div>
                  </div>
                  <ul className="flex flex-col divide-y divide-[var(--color-bg-2)] overflow-hidden rounded-xl bg-[var(--color-bg-1)] ring-1 ring-[var(--color-bg-2)]">
                    {previewItems.map((item) => (
                      <li key={item.slug}>
                        <Link
                          href={`/${locale}/cities/${item.slug}`}
                          onClick={() => setOpen(false)}
                          className="flex items-center justify-between gap-3 px-4 py-3 transition active:bg-[var(--color-bg-2)] hover:bg-[var(--color-bg-2)]"
                        >
                          <span className="flex min-w-0 items-center gap-3">
                            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--color-bg-2)] text-[var(--color-accent-cyan)]">
                              <MapPinIcon className="h-4 w-4" />
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate font-semibold text-[var(--color-fg-0)]">
                                {item.name}
                              </span>
                              {item.region && (
                                <span className="block truncate text-[11px] text-[var(--color-fg-3)]">
                                  {item.region}
                                </span>
                              )}
                            </span>
                          </span>
                          {item.distanceKm !== null ? (
                            <span className="shrink-0 rounded-full bg-[var(--color-bg-2)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-fg-1)]">
                              {formatDistanceKm(item.distanceKm)}
                            </span>
                          ) : (
                            <span aria-hidden className="text-[var(--color-fg-3)]">→</span>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Secondary nav rows */}
              <section className="mt-6" aria-label={c.guides}>
                <ul className="flex flex-col divide-y divide-[var(--color-bg-2)] overflow-hidden rounded-xl bg-[var(--color-bg-1)] ring-1 ring-[var(--color-bg-2)]">
                  <SecondaryRow
                    href={`/${locale}/guides`}
                    onClick={() => setOpen(false)}
                    icon={<StoreIcon className="h-4 w-4" />}
                    label={c.guides}
                  />
                  <SecondaryRow
                    href={`/${locale}/sign-in`}
                    onClick={() => setOpen(false)}
                    icon={<StoreIcon className="h-4 w-4" />}
                    label={c.signIn}
                  />
                  <SecondaryRow
                    href={`/${locale}/for-owners`}
                    onClick={() => setOpen(false)}
                    icon={<StoreIcon className="h-4 w-4" />}
                    label={c.owners}
                    accent
                  />
                </ul>
              </section>

              {/* Language picker */}
              <section className="mt-6" aria-label={c.language}>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--color-fg-3)]">
                  {c.language}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {LOCALES.map((l) => (
                    <Link
                      key={l}
                      href={`/${l}`}
                      onClick={() => setOpen(false)}
                      hrefLang={l}
                      className={
                        l === locale
                          ? 'rounded-full bg-[var(--color-accent-cyan)] px-3 py-1.5 text-xs font-semibold text-[var(--color-bg-0)]'
                          : 'rounded-full border border-[var(--color-bg-3)] bg-[var(--color-bg-1)] px-3 py-1.5 text-xs font-semibold text-[var(--color-fg-1)] hover:border-[var(--color-accent-cyan)] hover:text-[var(--color-accent-cyan)]'
                      }
                    >
                      {LOCALE_LABELS[l]}
                    </Link>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

const TILE_ACCENT: Record<'pink' | 'cyan' | 'violet' | 'amber', { icon: string; ring: string; bar: string }> = {
  pink:   { icon: 'text-[var(--color-accent-pink)]',   ring: 'ring-[var(--color-accent-pink)]/30',   bar: 'bg-[var(--color-accent-pink)]' },
  cyan:   { icon: 'text-[var(--color-accent-cyan)]',   ring: 'ring-[var(--color-accent-cyan)]/30',   bar: 'bg-[var(--color-accent-cyan)]' },
  violet: { icon: 'text-[var(--color-accent-violet)]', ring: 'ring-[var(--color-accent-violet)]/30', bar: 'bg-[var(--color-accent-violet)]' },
  amber:  { icon: 'text-[var(--color-accent-amber)]',  ring: 'ring-[var(--color-accent-amber)]/30',  bar: 'bg-[var(--color-accent-amber)]' },
};

function Tile({
  href, onClick, icon, label, accent,
}: {
  href: string;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  accent: 'pink' | 'cyan' | 'violet' | 'amber';
}) {
  const a = TILE_ACCENT[accent];
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`group relative flex flex-col gap-2 overflow-hidden rounded-xl bg-[var(--color-bg-1)] p-4 ring-1 ${a.ring} transition active:scale-[0.99] hover:bg-[var(--color-bg-2)]`}
    >
      <span aria-hidden className={`absolute inset-x-0 top-0 h-[2px] opacity-70 ${a.bar}`} />
      <span className={`flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-bg-2)] ${a.icon}`}>
        {icon}
      </span>
      <span className="text-sm font-semibold text-[var(--color-fg-0)]">{label}</span>
    </Link>
  );
}

function SecondaryRow({
  href, onClick, icon, label, accent = false,
}: {
  href: string;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  accent?: boolean;
}) {
  return (
    <li>
      <Link
        href={href}
        onClick={onClick}
        className="flex items-center gap-3 px-4 py-3 text-sm font-semibold transition hover:bg-[var(--color-bg-2)] active:bg-[var(--color-bg-2)]"
      >
        <span
          className={`grid h-7 w-7 place-items-center rounded-md bg-[var(--color-bg-2)] ${
            accent ? 'text-[var(--color-accent-amber)]' : 'text-[var(--color-fg-1)]'
          }`}
        >
          {icon}
        </span>
        <span className={accent ? 'text-[var(--color-accent-amber)]' : 'text-[var(--color-fg-0)]'}>
          {label}
        </span>
        <span aria-hidden className="ml-auto text-[var(--color-fg-3)]">→</span>
      </Link>
    </li>
  );
}
