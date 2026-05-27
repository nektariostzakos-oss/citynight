// Phase K.2 — neighborhood article index.
//
// URL: /{locale}/cities/{city}/area/{area-slug}
//
// Lists every published article that features at least one venue in the
// requested area. An article counts for an area when any of its picks
// has venue.area_id matching this area — see lib/articles/areas.ts for
// the derivation.

import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { isLocale, type Locale } from '@/lib/i18n';
import { publicMetadata } from '@/lib/seo';
import { getCityBySlug } from '@/lib/queries';
import { getAreaBySlug, listArticlesByCityArea, type Article } from '@/lib/articles';

export const revalidate = 1800;

type Params = Promise<{ locale: string; city: string; area: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, city, area } = await params;
  if (!isLocale(locale)) return {};
  const cityRow = getCityBySlug(city, locale as Locale);
  if (!cityRow) return {};
  const areaRow = getAreaBySlug(cityRow.id, area);
  if (!areaRow) return {};
  return publicMetadata({
    locale,
    paths: { [locale]: `/${locale}/cities/${city}/area/${area}` },
    title: `${areaRow.name}, ${cityRow.name} — citynight.gr`,
    description: `Guides featuring spots in ${areaRow.name}, ${cityRow.name}.`,
  });
}

export default async function AreaArticlesIndex({ params }: { params: Params }) {
  const { locale, city, area } = await params;
  if (!isLocale(locale)) notFound();

  const cityRow = getCityBySlug(city, locale as Locale);
  if (!cityRow) notFound();

  const areaRow = getAreaBySlug(cityRow.id, area);
  if (!areaRow) notFound();

  const articles = listArticlesByCityArea(cityRow.id, areaRow.id, locale);

  return (
    <article className="mx-auto max-w-5xl px-6 py-12 md:py-16">
      <header className="mb-12 md:mb-16">
        <nav className="text-sm">
          <Link href={`/${locale}/cities/${city}`} className="text-[var(--color-fg-2)] hover:text-[var(--color-fg-0)]">
            ← {cityRow.name}
          </Link>
        </nav>
        <p className="mt-6 text-xs uppercase tracking-[0.2em] text-[var(--color-fg-2)]">
          {locale === 'el' ? 'Γειτονιά' : 'Neighborhood'} · {cityRow.name}
        </p>
        <h1 className="mt-4 font-display text-4xl font-semibold text-[var(--color-fg-0)] md:text-6xl">
          {areaRow.name}
        </h1>
        <p className="mt-4 max-w-2xl text-base text-[var(--color-fg-1)] md:text-lg">
          {locale === 'el'
            ? `Άρθρα που περιλαμβάνουν τοποθεσίες στη ${areaRow.name}.`
            : `Guides featuring spots in ${areaRow.name}.`}
        </p>
      </header>

      {articles.length === 0 ? (
        <p className="text-[var(--color-fg-2)]">
          {locale === 'el' ? 'Δεν υπάρχουν ακόμα άρθρα για αυτή τη γειτονιά.' : 'No articles featuring this neighborhood yet.'}
        </p>
      ) : (
        <ul className="grid gap-6 md:grid-cols-2">
          {articles.map((a) => (
            <ArticleCard key={a.id} article={a} locale={locale} citySlug={city} />
          ))}
        </ul>
      )}
    </article>
  );
}

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
