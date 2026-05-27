// Phase K.1 — article detail page at /{locale}/cities/{city}/{slug}.
//
// This file ALSO catches the legacy SaaS site URL pattern
// /{locale}/cities/{city}/{slug} (which used to render a tenant site).
// Lookup order:
//   1. If an article exists at (locale, slug) AND belongs to {city}
//      → render the listicle.
//   2. Otherwise, if a SaaS site exists at {slug} (sites.slug is UNIQUE)
//      → 301 to its new canonical home at /{locale}/sites/{slug}.
//   3. Else → 404.
//
// Guards: city must be published; cross-city slug collision rejected.

import { notFound, permanentRedirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { isLocale, type Locale } from '@/lib/i18n';
import { publicMetadata, jsonLdProps } from '@/lib/seo';
import { getCityBySlug } from '@/lib/queries';
import { getPublishedSiteBySlug } from '@/lib/site-queries';
import {
  getArticleBySlug,
  getArticleVenues,
  listArticlesByCity,
  type ArticleVenuePick,
} from '@/lib/articles';

export const revalidate = 1800;

type Params = Promise<{ locale: string; city: string; slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, city, slug } = await params;
  if (!isLocale(locale)) return {};
  const article = getArticleBySlug(locale, slug);
  if (!article) return {};
  return publicMetadata({
    locale,
    paths: { [locale]: `/${locale}/cities/${city}/${slug}` },
    title: article.title,
    description: article.subtitle ?? article.intro?.slice(0, 160) ?? article.title,
    ogImage: article.coverUrl ?? undefined,
  });
}

export default async function ArticlePage({ params }: { params: Params }) {
  const { locale, city, slug } = await params;
  if (!isLocale(locale)) notFound();

  const cityRow = getCityBySlug(city, locale as Locale);
  if (!cityRow) notFound();

  const article = getArticleBySlug(locale, slug);
  if (article && article.status === 'published' && article.cityId === cityRow.id) {
    return <ArticleRender article={article} cityRow={cityRow} locale={locale} city={city} />;
  }

  // Legacy SaaS-site URL? sites.slug is UNIQUE so this resolves at most
  // one row regardless of city. 301 to the new canonical /sites/{slug}.
  const site = getPublishedSiteBySlug(slug);
  if (site) {
    permanentRedirect(`/${locale}/sites/${slug}`);
  }

  notFound();
}

// ─── article render ─────────────────────────────────────────────────

type ArticleType = NonNullable<ReturnType<typeof getArticleBySlug>>;
type CityRow = { id: string; slug: string; name: string };

function ArticleRender({ article, cityRow, locale, city }: {
  article: ArticleType;
  cityRow: CityRow;
  locale: string;
  city: string;
}) {
  const picks = getArticleVenues(article.id);
  const otherArticles = listArticlesByCity(cityRow.id, { locale, status: 'published', limit: 5 })
    .filter((a) => a.id !== article.id)
    .slice(0, 4);

  return (
    <article className="mx-auto max-w-3xl px-6 py-12 md:py-16">
      <script
        type="application/ld+json"
        {...jsonLdProps([
          {
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: article.title,
            description: article.subtitle ?? undefined,
            itemListElement: picks.map((p) => ({
              '@type': 'ListItem',
              position: p.rank,
              name: p.venueName,
            })),
          },
        ])}
      />

      <header className="mb-10">
        <nav className="text-sm">
          <Link href={`/${locale}/cities/${city}`} className="text-[var(--color-fg-2)] hover:text-[var(--color-fg-0)]">
            ← {cityRow.name}
          </Link>
        </nav>
        <p className="mt-6 text-xs uppercase tracking-[0.2em] text-[var(--color-fg-2)]">
          {article.vertical} · {cityRow.name}
        </p>
        <h1 className="mt-4 font-display text-3xl font-semibold text-[var(--color-fg-0)] md:text-5xl">
          {article.title}
        </h1>
        {article.subtitle && (
          <p className="mt-4 text-lg text-[var(--color-fg-1)]">{article.subtitle}</p>
        )}
      </header>

      {article.coverUrl && (
        <div className="relative mb-12 aspect-[16/9] w-full overflow-hidden rounded-2xl">
          <Image
            src={article.coverUrl}
            alt={article.title}
            fill
            sizes="(min-width: 768px) 768px, 100vw"
            priority
            className="object-cover"
          />
          {article.coverAttribution && (
            <p className="absolute bottom-2 right-3 text-[10px] text-white/70">
              {article.coverAttribution}
            </p>
          )}
        </div>
      )}

      {article.intro && (
        <div className="prose-site mb-12 max-w-none whitespace-pre-line text-base text-[var(--color-fg-1)] md:text-lg">
          {article.intro}
        </div>
      )}

      <ol className="space-y-10">
        {picks.map((p) => (
          <PickCard key={p.id} pick={p} />
        ))}
      </ol>

      {article.outro && (
        <div className="prose-site mt-16 max-w-none whitespace-pre-line text-base text-[var(--color-fg-1)] md:text-lg">
          {article.outro}
        </div>
      )}

      {otherArticles.length > 0 && (
        <section className="mt-20 border-t border-[var(--color-bg-2)] pt-10">
          <h2 className="font-display text-xl font-semibold text-[var(--color-fg-0)]">
            {locale === 'el' ? `Περισσότερα για ${cityRow.name}` : `More from ${cityRow.name}`}
          </h2>
          <ul className="mt-6 grid gap-4 md:grid-cols-2">
            {otherArticles.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/${locale}/cities/${city}/${a.slug}`}
                  className="block rounded-xl border border-[var(--color-bg-2)] bg-[var(--color-bg-1)] p-5 hover:border-[var(--color-accent-cyan)]"
                >
                  <p className="text-xs uppercase tracking-wide text-[var(--color-fg-2)]">{a.vertical}</p>
                  <p className="mt-1 font-display text-base font-semibold text-[var(--color-fg-0)]">{a.title}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}

function PickCard({ pick }: { pick: ArticleVenuePick }) {
  const stars = pick.venueRating != null ? '★'.repeat(Math.round(pick.venueRating)) : null;
  return (
    <li className="grid items-start gap-6 md:grid-cols-[200px_1fr]">
      <div className="relative aspect-square w-full overflow-hidden rounded-xl">
        {pick.photoUrl ? (
          <Image
            src={pick.photoUrl}
            alt={pick.venueName ?? `#${pick.rank}`}
            fill
            sizes="(min-width: 768px) 200px, 100vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[var(--color-bg-1)] text-3xl text-[var(--color-fg-2)]">
            {pick.rank}
          </div>
        )}
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent-cyan)]">
          #{pick.rank}
        </p>
        <h2 className="mt-2 font-display text-2xl font-semibold text-[var(--color-fg-0)]">
          {pick.venueName}
        </h2>
        {pick.headline && (
          <p className="mt-1 text-sm font-medium text-[var(--color-fg-1)]">{pick.headline}</p>
        )}
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--color-fg-2)]">
          {pick.venueAreaName && <span>{pick.venueAreaName}</span>}
          {stars && (
            <span>
              <span className="text-[var(--color-accent-yellow)]">{stars}</span>{' '}
              <span>({pick.venueReviewCount?.toLocaleString() ?? '—'})</span>
            </span>
          )}
          {pick.venuePriceLevel != null && (
            <span>{'€'.repeat(pick.venuePriceLevel + 1)}</span>
          )}
        </div>
        <p className="mt-4 text-base leading-relaxed text-[var(--color-fg-1)]">{pick.blurb}</p>
      </div>
    </li>
  );
}
