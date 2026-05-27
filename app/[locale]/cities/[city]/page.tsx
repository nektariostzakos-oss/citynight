// Phase K.1 — city article guide moved to /{locale}/cities/{city}.
//
// URL: /{locale}/cities/{city}  e.g. /el/cities/athens
//
// Replaces the old SaaS "businesses in this city" listing that lived
// here (Phase H3). SaaS site pages moved to /sites/{slug}. The old
// /{locale}/{city} URL 301-redirects to this one.

import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { isLocale, type Locale } from '@/lib/i18n';
import { publicMetadata } from '@/lib/seo';
import { getCityBySlug } from '@/lib/queries';
import { listArticlesByCity, type Article } from '@/lib/articles';

export const revalidate = 1800;

type Params = Promise<{ locale: string; city: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, city } = await params;
  if (!isLocale(locale)) return {};
  const cityRow = getCityBySlug(city, locale as Locale);
  if (!cityRow) return {};
  return publicMetadata({
    locale,
    paths: { el: `/el/cities/${city}`, en: `/en/cities/${city}` },
    title: `${cityRow.name} — citynight.gr`,
    description: `City guide for ${cityRow.name}: ranked picks for nightlife, food and stay.`,
  });
}

export default async function CityArticlesIndex({ params }: { params: Params }) {
  const { locale, city } = await params;
  if (!isLocale(locale)) notFound();
  const cityRow = getCityBySlug(city, locale as Locale);
  if (!cityRow) notFound();

  const articles = listArticlesByCity(cityRow.id, { locale, status: 'published' });
  const grouped = groupByVertical(articles);

  return (
    <article className="mx-auto max-w-5xl px-6 py-12 md:py-16">
      <header className="mb-12 md:mb-16">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-fg-2)]">
          {locale === 'el' ? 'Οδηγός πόλης' : 'City guide'}
        </p>
        <h1 className="mt-4 font-display text-4xl font-semibold text-[var(--color-fg-0)] md:text-6xl">
          {cityRow.name}
        </h1>
        <p className="mt-4 max-w-2xl text-base text-[var(--color-fg-1)] md:text-lg">
          {locale === 'el'
            ? `Όλα τα άρθρα μας για ${cityRow.name} — επιλεγμένα και κατατασσόμενα από εμάς.`
            : `Every guide we've published for ${cityRow.name} — picked and ranked by us.`}
        </p>
      </header>

      {articles.length === 0 ? (
        <p className="text-[var(--color-fg-2)]">
          {locale === 'el' ? 'Δεν υπάρχουν ακόμα άρθρα.' : 'No articles yet — check back soon.'}
        </p>
      ) : (
        <div className="space-y-16">
          {(['nightlife', 'food', 'stay'] as const).map((v) => {
            const items = grouped[v];
            if (!items?.length) return null;
            return (
              <section key={v}>
                <h2 className="mb-6 font-display text-2xl font-semibold text-[var(--color-fg-0)] md:text-3xl">
                  {VERTICAL_LABELS[locale]?.[v] ?? v}
                </h2>
                <ul className="grid gap-6 md:grid-cols-2">
                  {items.map((a) => (
                    <ArticleCard key={a.id} article={a} locale={locale} citySlug={city} />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </article>
  );
}

// ─── helpers ────────────────────────────────────────────────────────

function groupByVertical(articles: Article[]) {
  const out: Record<Article['vertical'], Article[]> = { nightlife: [], food: [], stay: [] };
  for (const a of articles) out[a.vertical].push(a);
  return out;
}

const VERTICAL_LABELS: Record<string, Record<'nightlife' | 'food' | 'stay', string>> = {
  el: { nightlife: 'Νυχτερινή ζωή', food: 'Φαγητό', stay: 'Διαμονή' },
  en: { nightlife: 'Nightlife', food: 'Food', stay: 'Stay' },
};

function ArticleCard({ article, locale, citySlug }: { article: Article; locale: string; citySlug: string }) {
  return (
    <li>
      <Link
        href={`/${locale}/cities/${citySlug}/${article.slug}`}
        className="group block overflow-hidden rounded-2xl border border-[var(--color-bg-2)] bg-[var(--color-bg-1)] transition hover:border-[var(--color-accent-cyan)]"
      >
        {article.coverUrl && (
          <div className="relative aspect-[16/9] w-full overflow-hidden">
            <Image
              src={article.coverUrl}
              alt={article.title}
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover transition group-hover:scale-105"
            />
          </div>
        )}
        <div className="p-6">
          <p className="text-xs uppercase tracking-wide text-[var(--color-fg-2)]">{article.vertical}</p>
          <h3 className="mt-2 font-display text-xl font-semibold text-[var(--color-fg-0)] md:text-2xl">
            {article.title}
          </h3>
          {article.subtitle && (
            <p className="mt-3 text-sm text-[var(--color-fg-1)]">{article.subtitle}</p>
          )}
        </div>
      </Link>
    </li>
  );
}
