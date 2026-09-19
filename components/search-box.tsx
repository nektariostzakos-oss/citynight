'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import type { Locale } from '@/lib/i18n';
import { SearchIcon, CloseIcon, MapPinIcon } from './nav-icons';

// Fullscreen AJAX search modal. Triggered by clicking the trigger button
// or pressing ⌘K / Ctrl+K anywhere on the site. Results are grouped:
//   Cities → Categories → Venues
// Keyboard navigation flattens those groups into a single focus index.

type VenueHit = {
  venueId: string;
  cityId: string;
  name: string;
  snippet: string;
  citySlug: string;
  areaSlug: string | null;
  slug: string | null;
};
type CityHit = { id: string; slug: string; name: string; region: string | null };
type CategoryHit = { id: string; slug: string; name: string; parentId: string | null };

type Results = { cities: CityHit[]; categories: CategoryHit[]; venues: VenueHit[] };
const EMPTY: Results = { cities: [], categories: [], venues: [] };

const COPY: Record<Locale, {
  placeholder: string; trigger: string; recent: string; empty: string; emptyHint: string;
  groupCities: string; groupCategories: string; groupVenues: string; openHint: string; navHint: string;
}> = {
  en: {
    placeholder: 'Search venues, cities, categories…', trigger: 'Search',
    recent: 'Recent', empty: 'Nothing matches that yet.', emptyHint: 'Try a city name, a venue name, or "rooftop bar"',
    groupCities: 'Cities', groupCategories: 'Categories', groupVenues: 'Venues',
    openHint: 'to open', navHint: 'to navigate',
  },
  el: {
    placeholder: 'Ψάξε μαγαζιά, πόλεις, κατηγορίες…', trigger: 'Αναζήτηση',
    recent: 'Πρόσφατα', empty: 'Δεν βρέθηκε κάτι ακόμη.', emptyHint: 'Δοκίμασε όνομα πόλης, μαγαζιού ή "rooftop bar"',
    groupCities: 'Πόλεις', groupCategories: 'Κατηγορίες', groupVenues: 'Μαγαζιά',
    openHint: 'για άνοιγμα', navHint: 'για πλοήγηση',
  },
  de: {
    placeholder: 'Locations, Städte, Kategorien suchen…', trigger: 'Suche',
    recent: 'Zuletzt', empty: 'Noch keine Treffer.', emptyHint: 'Versuche einen Stadt-, Location-Namen oder "Rooftop-Bar"',
    groupCities: 'Städte', groupCategories: 'Kategorien', groupVenues: 'Locations',
    openHint: 'öffnen', navHint: 'navigieren',
  },
  fr: {
    placeholder: 'Cherchez lieux, villes, catégories…', trigger: 'Rechercher',
    recent: 'Récents', empty: 'Aucun résultat pour le moment.', emptyHint: 'Essayez un nom de ville, de lieu ou "rooftop bar"',
    groupCities: 'Villes', groupCategories: 'Catégories', groupVenues: 'Lieux',
    openHint: 'pour ouvrir', navHint: 'pour naviguer',
  },
  it: {
    placeholder: 'Cerca locali, città, categorie…', trigger: 'Cerca',
    recent: 'Recenti', empty: 'Nessun risultato per ora.', emptyHint: 'Prova un nome di città, locale o "rooftop bar"',
    groupCities: 'Città', groupCategories: 'Categorie', groupVenues: 'Locali',
    openHint: 'per aprire', navHint: 'per navigare',
  },
};

const RECENT_KEY = 'cn:recent-searches';
const MAX_RECENT = 6;

type Row =
  | { kind: 'city'; href: string; label: string; sub: string | null }
  | { kind: 'category'; href: string; label: string; sub: string | null }
  | { kind: 'venue'; href: string; label: string; sub: string };

/**
 * Render an FTS5 snippet safely. `searchVenues` asks SQLite to wrap matches in
 * the control characters U+0001 / U+0002 instead of `<mark>` tags, so the text
 * (a venue description any owner can edit, or scraped from Places) is emitted
 * as plain React text and only the markers become elements. This replaced a
 * `dangerouslySetInnerHTML` that rendered the description as HTML: a stored
 * `<script>` in one description ran for every visitor who searched.
 */
function renderSnippet(snippet: string): ReactNode[] {
  const out: ReactNode[] = [];
  const parts = snippet.split('\u0001');
  parts.forEach((part, i) => {
    if (i === 0) {
      if (part) out.push(part);
      return;
    }
    const end = part.indexOf('\u0002');
    if (end === -1) {
      out.push(<mark key={`m${i}`}>{part}</mark>);
      return;
    }
    out.push(<mark key={`m${i}`}>{part.slice(0, end)}</mark>);
    const rest = part.slice(end + 1);
    if (rest) out.push(rest);
  });
  return out;
}

function loadRecent(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((s) => typeof s === 'string').slice(0, MAX_RECENT) : [];
  } catch { return []; }
}

function pushRecent(q: string) {
  if (typeof window === 'undefined') return;
  const cur = loadRecent().filter((s) => s !== q);
  cur.unshift(q);
  window.localStorage.setItem(RECENT_KEY, JSON.stringify(cur.slice(0, MAX_RECENT)));
}

type Variant = 'default' | 'menu';

export function SearchBox({ locale, citySlug, variant = 'default' }: {
  locale: Locale; citySlug?: string;
  /** 'default' = the rounded-[var(--radius-sm)] pill with icon + ⌘K hint (current behavior).
   *  'menu'    = text-only trigger that sits inside the header mega-menu
   *              alongside Cities. No icon, no ⌘K chip, matches the
   *              pill-item styling so it reads as a nav item. */
  variant?: Variant;
}) {
  const [open, setOpen] = useState(false);
  const c = COPY[locale];

  // Global keyboard shortcut: ⌘K / Ctrl+K opens the search anywhere on site.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      {variant === 'menu' ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={c.trigger}
          className="inline-flex min-h-11 items-center rounded-full px-3 text-[15px] font-semibold text-[var(--color-muted)] transition-colors duration-[var(--motion-fast)] hover:text-[var(--color-ink)]"
        >
          {c.trigger}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={c.trigger}
          className="group inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--color-hair)] px-3 text-[15px] text-[var(--color-muted)] transition-colors duration-[var(--motion-fast)] hover:text-[var(--color-bronze)]"
        >
          <SearchIcon className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{c.trigger}</span>
          <span className="hidden md:inline rounded-[var(--radius-sm)] border border-[var(--color-hair)] px-1.5 py-0.5 cn-readout cn-readout-s tracking-wider text-[var(--color-muted)] group-hover:border-[var(--color-bronze)]/40">⌘K</span>
        </button>
      )}
      {open && <SearchModal locale={locale} citySlug={citySlug} onClose={() => setOpen(false)} />}
    </>
  );
}

function SearchModal({ locale, citySlug, onClose }: { locale: Locale; citySlug?: string; onClose: () => void }) {
  const c = COPY[locale];
  const router = useRouter();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Results>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const [active, setActive] = useState(0);
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounce = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Portal target = document.body. Bypasses the stacking context that
  // `backdrop-filter` ancestors (the site header has)
  // would otherwise impose on `position: fixed` children — per CSS spec
  // a `backdrop-filter` other than `none` creates a new containing
  // block for fixed-positioned descendants, which would trap the modal
  // inside the header's box. Portaling to body lets `inset-0` mean the
  // actual viewport again.
  useEffect(() => { setMounted(true); }, []);

  // Flatten visible results into a single navigable list.
  const rows: Row[] = [
    // Phase J.5 — search results updated for the article-led model.
    // Cities link to /{locale}/{city} (the article index). Categories no
    // longer have a standalone URL — they're filters surfaced via
    // articles per city, so we fall their target back to the locale
    // root. Venue rows now point at the venue's city article index
    // (per-venue pages were killed in J.4).
    ...results.cities.map<Row>((h) => ({
      kind: 'city',
      href: `/${locale}/cities/${h.slug}`,
      label: h.name,
      sub: h.region,
    })),
    ...results.categories.map<Row>((h) => ({
      kind: 'category',
      href: `/${locale}`,
      label: h.name,
      sub:
        h.parentId === 'parent_nightlife' ? 'Nightlife'
        : h.parentId === 'parent_food'    ? 'Food'
        : h.parentId === 'parent_stay'    ? 'Stay'
        : null,
    })),
    ...results.venues.map<Row>((h) => ({
      kind: 'venue',
      href: `/${locale}/cities/${h.citySlug}`,
      label: h.name,
      sub: h.snippet,
    })),
  ];

  // Focus the input on open, restore body scroll on close.
  useEffect(() => {
    inputRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    setRecent(loadRecent());
    return () => { document.body.style.overflow = prevOverflow; };
  }, []);

  // Debounced fetch.
  useEffect(() => {
    if (!q.trim()) {
      setResults(EMPTY);
      setLoading(false);
      setActive(0);
      return;
    }
    if (debounce.current) window.clearTimeout(debounce.current);
    setLoading(true);
    debounce.current = window.setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const p = new URLSearchParams({ q, locale });
        if (citySlug) p.set('city', citySlug);
        const res = await fetch(`/api/search?${p.toString()}`, { signal: ctrl.signal });
        if (!res.ok) { setResults(EMPTY); return; }
        const json = await res.json();
        setResults({
          cities: json.cities ?? [],
          categories: json.categories ?? [],
          venues: json.venues ?? [],
        });
        setActive(0);
      } catch (e: unknown) {
        if (e instanceof Error && e.name === 'AbortError') return;
        setResults(EMPTY);
      } finally {
        setLoading(false);
      }
    }, 120);
    return () => { if (debounce.current) window.clearTimeout(debounce.current); };
  }, [q, locale, citySlug]);

  const go = useCallback((row: Row) => {
    pushRecent(q);
    onClose();
    router.push(row.href);
  }, [q, onClose, router]);

  // Keyboard handling on the input.
  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(rows.length - 1, i + 1)); return; }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActive((i) => Math.max(0, i - 1));               return; }
    if (e.key === 'Enter') {
      const row = rows[active];
      if (row) { e.preventDefault(); go(row); }
    }
  }

  const hasQuery = q.trim().length > 0;
  const hasResults = rows.length > 0;

  if (!mounted) return null;
  const modal = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={c.trigger}
      className="fixed inset-0 z-[100] flex flex-col bg-[var(--color-ground)]"
      onClick={onClose}
    >
      {/* Top bar — flush close button. shrink-0 so the flex layout
          puts the input directly under it and the results scroll
          fills the rest. */}
      <div className="flex shrink-0 items-center justify-end px-6 pt-5 md:px-10">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-[var(--color-hair)] bg-[var(--color-surface)] p-2 text-[var(--color-muted)] transition hover:border-[var(--color-bronze)] hover:text-[var(--color-ink)]"
          aria-label="Close"
        >
          <CloseIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Hero input — large, centered, takes the eye. */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="mx-auto mt-8 w-full max-w-3xl shrink-0 px-6 md:mt-14 md:px-10"
      >
        <div className="flex items-center gap-4 border-b border-[var(--color-hair)] pb-4">
          <SearchIcon className="h-7 w-7 text-[var(--color-muted)] md:h-8 md:w-8" />
          <input
            ref={inputRef}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKey}
            placeholder={c.placeholder}
            className="flex-1 bg-transparent font-display text-2xl text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus:outline-none md:text-4xl"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          {loading && <span className="h-3 w-3 rounded-full bg-[var(--color-bronze)]" aria-hidden />}
        </div>
      </div>

      {/* Results body — fills remaining viewport, scrolls if long. */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="mx-auto mt-4 w-full max-w-3xl flex-1 overflow-y-auto px-6 md:px-10"
      >
          {!hasQuery && recent.length > 0 && (
            <div className="px-2 py-3">
              <p className="px-3 pb-2 cn-readout cn-readout-s uppercase text-[var(--color-muted)]">{c.recent}</p>
              <ul>
                {recent.map((r) => (
                  <li key={r}>
                    <button
                      type="button"
                      onClick={() => setQ(r)}
                      className="flex min-h-11 w-full items-center gap-3 rounded-[var(--radius-sm)] px-3 text-left text-[15px] text-[var(--color-muted)] hover:bg-[var(--color-raise)] hover:text-[var(--color-ink)]"
                    >
                      <SearchIcon className="h-3.5 w-3.5 text-[var(--color-muted)]" />
                      {r}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!hasQuery && recent.length === 0 && (
            <p className="px-5 py-10 text-center text-sm text-[var(--color-muted)]">{c.emptyHint}</p>
          )}

          {hasQuery && !hasResults && !loading && (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-[var(--color-muted)]">{c.empty}</p>
              <p className="mt-2 text-xs text-[var(--color-muted)]">{c.emptyHint}</p>
            </div>
          )}

          {hasResults && (
            <ResultGroups
              rows={rows}
              groups={results}
              groupLabels={{ cities: c.groupCities, categories: c.groupCategories, venues: c.groupVenues }}
              active={active}
              setActive={setActive}
              onPick={go}
            />
          )}
      </div>

      {/* Footer hint bar — flex item, sits naturally at bottom because
          the results body has flex-1 above it. */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex shrink-0 items-center justify-between gap-4 border-t border-[var(--color-hair)] bg-[var(--color-surface)] px-6 py-3 cn-readout cn-readout-s text-[var(--color-muted)] md:px-10"
      >
        <span className="flex items-center gap-3">
          <Kbd>↑</Kbd><Kbd>↓</Kbd> {c.navHint}
          <span className="ml-2 inline-flex items-center gap-1"><Kbd>↵</Kbd> {c.openHint}</span>
        </span>
        <span className="flex items-center gap-1"><Kbd>esc</Kbd> close</span>
      </div>
    </div>
  );
  return createPortal(modal, document.body);
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded-[var(--radius-sm)] border border-[var(--color-hair)] bg-[var(--color-surface)] px-1.5 py-0.5 cn-readout cn-readout-s text-[var(--color-muted)]">
      {children}
    </kbd>
  );
}

function ResultGroups({
  rows,
  groups,
  groupLabels,
  active,
  setActive,
  onPick,
}: {
  rows: Row[];
  groups: Results;
  groupLabels: { cities: string; categories: string; venues: string };
  active: number;
  setActive: (n: number) => void;
  onPick: (row: Row) => void;
}) {
  // Walk the rows array and render group headers as we cross boundaries; the
  // flat-row index drives keyboard nav and active highlighting.
  let cursor = 0;
  const sections: { label: string; items: { row: Row; index: number }[] }[] = [];
  // `rows` is the flat concatenation of cities + categories + venues built by
  // the caller, so `rows[cursor]` is in-bounds by construction. The `!` keeps
  // TS happy under noUncheckedIndexedAccess without runtime cost.
  if (groups.cities.length) {
    sections.push({
      label: groupLabels.cities,
      items: groups.cities.map(() => ({ row: rows[cursor]!, index: cursor++ })),
    });
  }
  if (groups.categories.length) {
    sections.push({
      label: groupLabels.categories,
      items: groups.categories.map(() => ({ row: rows[cursor]!, index: cursor++ })),
    });
  }
  if (groups.venues.length) {
    sections.push({
      label: groupLabels.venues,
      items: groups.venues.map(() => ({ row: rows[cursor]!, index: cursor++ })),
    });
  }

  return (
    <div className="px-2 py-3">
      {sections.map((s) => (
        <div key={s.label} className="mb-3 last:mb-0">
          <p className="px-3 pb-1 cn-readout cn-readout-s uppercase text-[var(--color-muted)]">{s.label}</p>
          <ul>
            {s.items.map(({ row, index }) => (
              <li key={index}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(index)}
                  onClick={() => onPick(row)}
                  className={`flex min-h-11 w-full items-start gap-3 rounded-[var(--radius-sm)] px-3 py-2 text-left ${
                    active === index
                      ? 'bg-[var(--color-raise)] text-[var(--color-ink)]'
                      : 'text-[var(--color-muted)] hover:bg-[var(--color-raise)]/60'
                  }`}
                >
                  <RowIcon kind={row.kind} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{row.label}</span>
                    {row.sub && (
                      <span className="mt-0.5 block truncate text-xs text-[var(--color-muted)]">
                        {/* Venue snippets carry FTS5 highlight markers (U+0001 / U+0002), rendered as
                            <mark> through React, so the description text, which any owner
                            can edit, is never injected as HTML. */}
                        {row.kind === 'venue' ? renderSnippet(row.sub) : row.sub}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function RowIcon({ kind }: { kind: Row['kind'] }) {
  switch (kind) {
    case 'city':     return <MapPinIcon className="mt-0.5 h-4 w-4 text-[var(--color-bronze)]" />;
    case 'category': return <SearchIcon className="mt-0.5 h-4 w-4 text-[var(--color-bronze)]" />;
    case 'venue':    return <SearchIcon className="mt-0.5 h-4 w-4 text-[var(--color-bronze)]" />;
  }
}
