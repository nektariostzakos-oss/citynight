'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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

export function SearchBox({ locale, citySlug }: { locale: Locale; citySlug?: string }) {
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
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={c.trigger}
        className="group inline-flex items-center gap-2 rounded-full border border-[var(--color-bg-3)] bg-[var(--color-bg-1)]/60 px-3 py-1.5 text-xs text-[var(--color-fg-2)] backdrop-blur transition hover:border-[var(--color-accent-cyan)] hover:text-[var(--color-accent-cyan)]"
      >
        <SearchIcon className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{c.trigger}</span>
        <span className="hidden md:inline rounded border border-[var(--color-bg-3)] px-1.5 py-0.5 text-[10px] tracking-wider text-[var(--color-fg-3)] group-hover:border-[var(--color-accent-cyan)]/40">⌘K</span>
      </button>
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
  const inputRef = useRef<HTMLInputElement>(null);
  const debounce = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={c.trigger}
      className="fixed inset-0 z-[100] flex items-start justify-center bg-[var(--color-bg-0)]/80 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="mt-[8vh] w-[min(720px,92vw)] overflow-hidden rounded-2xl border border-[var(--color-bg-3)] bg-[var(--color-bg-1)] shadow-2xl"
      >
        {/* Input bar */}
        <div className="flex items-center gap-3 border-b border-[var(--color-bg-2)] px-4 py-3">
          <SearchIcon className="h-5 w-5 text-[var(--color-fg-2)]" />
          <input
            ref={inputRef}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKey}
            placeholder={c.placeholder}
            className="flex-1 bg-transparent text-base text-[var(--color-fg-0)] placeholder:text-[var(--color-fg-3)] focus:outline-none"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          {loading && <span className="h-3 w-3 animate-pulse rounded-full bg-[var(--color-accent-cyan)]" aria-hidden />}
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-[var(--color-fg-2)] hover:bg-[var(--color-bg-2)] hover:text-[var(--color-fg-0)]"
            aria-label="Close"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[60vh] overflow-y-auto">
          {!hasQuery && recent.length > 0 && (
            <div className="px-2 py-3">
              <p className="px-3 pb-2 text-[10px] uppercase tracking-widest text-[var(--color-fg-3)]">{c.recent}</p>
              <ul>
                {recent.map((r) => (
                  <li key={r}>
                    <button
                      type="button"
                      onClick={() => setQ(r)}
                      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-[var(--color-fg-1)] hover:bg-[var(--color-bg-2)] hover:text-[var(--color-fg-0)]"
                    >
                      <SearchIcon className="h-3.5 w-3.5 text-[var(--color-fg-3)]" />
                      {r}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!hasQuery && recent.length === 0 && (
            <p className="px-5 py-10 text-center text-sm text-[var(--color-fg-2)]">{c.emptyHint}</p>
          )}

          {hasQuery && !hasResults && !loading && (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-[var(--color-fg-1)]">{c.empty}</p>
              <p className="mt-2 text-xs text-[var(--color-fg-3)]">{c.emptyHint}</p>
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

        {/* Footer hint bar */}
        <div className="flex items-center justify-between gap-4 border-t border-[var(--color-bg-2)] bg-[var(--color-bg-0)]/40 px-4 py-2 text-[11px] text-[var(--color-fg-3)]">
          <span className="flex items-center gap-3">
            <Kbd>↑</Kbd><Kbd>↓</Kbd> {c.navHint}
            <span className="ml-2 inline-flex items-center gap-1"><Kbd>↵</Kbd> {c.openHint}</span>
          </span>
          <span className="flex items-center gap-1"><Kbd>esc</Kbd> close</span>
        </div>
      </div>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-[var(--color-bg-3)] bg-[var(--color-bg-1)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--color-fg-2)]">
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
          <p className="px-3 pb-1 text-[10px] uppercase tracking-widest text-[var(--color-fg-3)]">{s.label}</p>
          <ul>
            {s.items.map(({ row, index }) => (
              <li key={index}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(index)}
                  onClick={() => onPick(row)}
                  className={`flex w-full items-start gap-3 rounded-md px-3 py-2 text-left ${
                    active === index
                      ? 'bg-[var(--color-bg-2)] text-[var(--color-fg-0)]'
                      : 'text-[var(--color-fg-1)] hover:bg-[var(--color-bg-2)]/60'
                  }`}
                >
                  <RowIcon kind={row.kind} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{row.label}</span>
                    {row.sub && (
                      <span
                        className="mt-0.5 block truncate text-xs text-[var(--color-fg-2)]"
                        // venue snippet contains FTS5 `<mark>` highlights
                        dangerouslySetInnerHTML={row.kind === 'venue' ? { __html: row.sub } : undefined}
                      >
                        {row.kind === 'venue' ? null : row.sub}
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
    case 'city':     return <MapPinIcon className="mt-0.5 h-4 w-4 text-[var(--color-accent-cyan)]" />;
    case 'category': return <SearchIcon className="mt-0.5 h-4 w-4 text-[var(--color-accent-violet)]" />;
    case 'venue':    return <SearchIcon className="mt-0.5 h-4 w-4 text-[var(--color-accent-pink)]" />;
  }
}
