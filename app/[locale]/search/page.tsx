import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/i18n';
import { searchVenues, searchCities, searchCategories } from '@/lib/queries';
import { publicMetadata, localizedPaths } from '@/lib/seo';

// Public crawlable search results. Same FTS5 backend the in-header search
// modal uses, but rendered as a real page so the URL is shareable +
// indexable (well — noindex'd; see metadata below). The modal is for
// in-session typeahead, this page is for "I bookmarked a search" UX +
// deep-link entry from external referrers.
//
// Performance budget: this page runs three SQL queries (venues / cities /
// categories) — all hit FTS5 or small-table LIKE indexes, p95 ≤ 200 ms.

export const dynamic = 'force-dynamic';

const COPY: Record<Locale, {
  metaTitle: string;
  metaDescription: string;
  h1: string;
  placeholder: string;
  noQuery: string;
  noResults: (q: string) => string;
  groupCities: string;
  groupCategories: string;
  groupVenues: string;
}> = {
  en: {
    metaTitle: 'Search venues, cities & categories',
    metaDescription: 'Full-text search across every published venue, city, and category on citynight.gr.',
    h1: 'Search', placeholder: 'Search venues, cities, categories…',
    noQuery: 'Type something into the box above to search.',
    noResults: (q) => `Nothing matches “${q}” yet.`,
    groupCities: 'Cities', groupCategories: 'Categories', groupVenues: 'Venues',
  },
  el: {
    metaTitle: 'Αναζήτηση μαγαζιών, πόλεων & κατηγοριών',
    metaDescription: 'Πλήρης αναζήτηση κειμένου σε όλα τα δημοσιευμένα μαγαζιά, πόλεις και κατηγορίες του citynight.gr.',
    h1: 'Αναζήτηση', placeholder: 'Ψάξε μαγαζιά, πόλεις, κατηγορίες…',
    noQuery: 'Πληκτρολόγησε κάτι πιο πάνω για να ψάξεις.',
    noResults: (q) => `Δεν βρέθηκε κάτι για «${q}» ακόμη.`,
    groupCities: 'Πόλεις', groupCategories: 'Κατηγορίες', groupVenues: 'Μαγαζιά',
  },
  de: {
    metaTitle: 'Locations, Städte & Kategorien suchen',
    metaDescription: 'Volltextsuche über alle veröffentlichten Locations, Städte und Kategorien auf citynight.gr.',
    h1: 'Suche', placeholder: 'Locations, Städte, Kategorien suchen…',
    noQuery: 'Tippe oben etwas ein, um zu suchen.',
    noResults: (q) => `Noch nichts für „${q}".`,
    groupCities: 'Städte', groupCategories: 'Kategorien', groupVenues: 'Locations',
  },
  fr: {
    metaTitle: 'Recherche de lieux, villes & catégories',
    metaDescription: 'Recherche plein-texte sur tous les lieux, villes et catégories publiés sur citynight.gr.',
    h1: 'Recherche', placeholder: 'Cherchez lieux, villes, catégories…',
    noQuery: 'Tapez quelque chose ci-dessus pour chercher.',
    noResults: (q) => `Rien ne correspond à « ${q} » pour le moment.`,
    groupCities: 'Villes', groupCategories: 'Catégories', groupVenues: 'Lieux',
  },
  it: {
    metaTitle: 'Cerca locali, città e categorie',
    metaDescription: 'Ricerca full-text su tutti i locali, città e categorie pubblicate su citynight.gr.',
    h1: 'Cerca', placeholder: 'Cerca locali, città, categorie…',
    noQuery: 'Scrivi qualcosa sopra per cercare.',
    noResults: (q) => `Nessun risultato per "${q}" per ora.`,
    groupCities: 'Città', groupCategories: 'Categorie', groupVenues: 'Locali',
  },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const c = COPY[locale];
  // noindex — search results are session-specific noise for Google, even if
  // they're useful for sharing. Only the search FORM (with no q=) would be
  // worth indexing, and that's behind a header trigger already.
  return {
    ...publicMetadata({
      locale,
      paths: localizedPaths('/search'),
      title: c.metaTitle,
      description: c.metaDescription,
    }),
    robots: { index: false, follow: true },
  };
}

export default async function SearchPage({
  params, searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale } = await params;
  const { q: qRaw } = await searchParams;
  if (!isLocale(locale)) notFound();
  const c = COPY[locale];

  const q = (qRaw ?? '').trim().slice(0, 80);
  const showResults = q.length >= 2;

  // p95 ≤ 200 ms: three small-table queries. searchVenues hits FTS5; the
  // city/category lookups hit small tables (33 cities, ~6 categories).
  const venues = showResults ? searchVenues(q, { locale, limit: 20 }) : [];
  const cities = showResults ? searchCities(q, 8) : [];
  const categories = showResults ? searchCategories(q, 8) : [];

  return (
    <section className="mx-auto w-full max-w-3xl px-6 py-12">
      <h1 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">{c.h1}</h1>

      <form method="GET" action={`/${locale}/search`} className="mt-6">
        <label className="block">
          <span className="sr-only">{c.placeholder}</span>
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder={c.placeholder}
            autoFocus
            autoComplete="off"
            spellCheck={false}
            className="w-full rounded-lg border border-[var(--color-bg-3)] bg-[var(--color-bg-1)] px-4 py-3 text-base text-[var(--color-fg-0)] focus:border-[var(--color-accent-cyan)] focus:outline-none"
          />
        </label>
      </form>

      {!showResults && (
        <p className="mt-8 text-sm text-[var(--color-fg-2)]">{c.noQuery}</p>
      )}

      {showResults && cities.length === 0 && categories.length === 0 && venues.length === 0 && (
        <p className="mt-8 text-sm text-[var(--color-fg-2)]">{c.noResults(q)}</p>
      )}

      {showResults && cities.length > 0 && (
        <section className="mt-8">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--color-fg-3)]">{c.groupCities}</h2>
          <ul className="mt-3 divide-y divide-[var(--color-bg-2)]">
            {cities.map((city) => (
              <li key={city.id}>
                <Link href={`/${locale}/greece/${city.slug}`} className="flex items-baseline justify-between gap-3 py-2.5 transition hover:text-[var(--color-accent-cyan)]">
                  <span className="font-semibold text-[var(--color-fg-0)]">{city.name}</span>
                  {city.region && <span className="text-xs text-[var(--color-fg-3)]">{city.region}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {showResults && categories.length > 0 && (
        <section className="mt-8">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--color-fg-3)]">{c.groupCategories}</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {categories.map((cat) => (
              <li key={cat.id}>
                <Link
                  href={`/${locale}/greece?kind=nightlife`}
                  className="inline-block rounded-full border border-[var(--color-bg-3)] bg-[var(--color-bg-1)] px-3 py-1.5 text-sm text-[var(--color-fg-1)] hover:border-[var(--color-accent-cyan)] hover:text-[var(--color-accent-cyan)]"
                >
                  {cat.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {showResults && venues.length > 0 && (
        <section className="mt-8">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--color-fg-3)]">{c.groupVenues}</h2>
          <ul className="mt-3 divide-y divide-[var(--color-bg-2)]">
            {venues.map((v) => (
              <li key={v.venueId}>
                <Link
                  href={`/${locale}/greece/${v.citySlug}/${v.areaSlug ?? 'venue'}/${v.slug ?? ''}`}
                  className="block py-3 transition hover:text-[var(--color-accent-cyan)]"
                >
                  <p className="font-semibold text-[var(--color-fg-0)]">{v.name}</p>
                  {v.snippet && (
                    <p className="mt-0.5 text-xs leading-relaxed text-[var(--color-fg-2)]">
                      {v.snippet.replace(/<\/?[bB]>/g, '')}
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </section>
  );
}
