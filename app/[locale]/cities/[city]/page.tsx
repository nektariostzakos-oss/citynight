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
import { getCityBySlug, getCityHeroPhotoUrl } from '@/lib/queries';
import { listArticlesByCity, listAreasForCity, listCategoriesForCity, type Article } from '@/lib/articles';
import { CityWeatherStrip } from '@/components/city-weather-strip';

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
  const areas = listAreasForCity(cityRow.id, locale);
  const categories = listCategoriesForCity(cityRow.id, locale);
  const heroPhotoUrl = getCityHeroPhotoUrl(cityRow.id);

  return (
    <article className="mx-auto max-w-5xl px-6 py-12 md:py-16">
      <header className="relative mb-12 overflow-hidden rounded-2xl border border-[var(--color-bg-2)] md:mb-16">
        {heroPhotoUrl ? (
          <Image
            src={heroPhotoUrl}
            alt=""
            fill
            sizes="(min-width: 1024px) 960px, 100vw"
            priority
            className="object-cover city-hero-crop"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-bg-1)] via-[var(--color-bg-2)] to-[var(--color-bg-0)]" />
        )}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-r from-[var(--color-bg-0)]/92 via-[var(--color-bg-0)]/80 to-[var(--color-bg-0)]/55"
        />
        <div className="relative px-6 py-8 md:px-10 md:py-12">
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
          <div className="mt-6">
            <CityWeatherStrip lat={cityRow.lat} lng={cityRow.lng} locale={locale} />
          </div>
        </div>
      </header>

      <div className="space-y-16">
        {/* Browse by interest — three vertical chips, always visible.
            Every city surfaces all three categories so visitors who land
            here automatically see what we cover, even before articles
            exist. Chips anchor-link to the matching section below. */}
        <section>
          <h2 className="mb-6 font-display text-2xl font-semibold text-[var(--color-fg-0)] md:text-3xl">
            {locale === 'el' ? 'Κατηγορίες' : 'Browse by interest'}
          </h2>
          <ul className="flex flex-wrap gap-2">
            {(['nightlife', 'food', 'stay'] as const).map((v) => {
              const n = grouped[v]?.length ?? 0;
              const dot = VERTICAL_DOT[v];
              return (
                <li key={v}>
                  <Link
                    href={`#${v}`}
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--color-bg-2)] bg-[var(--color-bg-1)] px-4 py-2 text-sm transition hover:border-[var(--color-accent-cyan)] hover:bg-[var(--color-bg-2)]"
                  >
                    <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${dot}`} />
                    <span className="font-medium text-[var(--color-fg-0)]">{VERTICAL_LABELS[locale]?.[v] ?? v}</span>
                    <span className="text-xs text-[var(--color-fg-2)]">
                      {n} {n === 1 ? (locale === 'el' ? 'άρθρο' : 'article') : (locale === 'el' ? 'άρθρα' : 'articles')}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Phase K.5 — leaf-category chip row. Every city surfaces the
            full category catalogue (rooftop bar, night club, taverna,
            boutique hotel, etc.) regardless of how many articles are
            seeded. Each chip anchor-links to its parent vertical's
            section so a click always lands somewhere useful. */}
        {categories.length > 0 && (
          <section>
            <h2 className="mb-6 font-display text-2xl font-semibold text-[var(--color-fg-0)] md:text-3xl">
              {locale === 'el' ? 'Τι ψάχνεις' : 'Categories'}
            </h2>
            <ul className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={cat.vertical ? `#${cat.vertical}` : '#'}
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--color-bg-3)] bg-[var(--color-bg-1)]/70 px-4 py-2 text-sm text-[var(--color-fg-1)] backdrop-blur transition hover:border-[var(--color-accent-cyan)] hover:text-[var(--color-accent-cyan)]"
                  >
                    {cat.vertical && (
                      <span
                        aria-hidden
                        className={`h-1.5 w-1.5 rounded-full ${
                          cat.vertical === 'nightlife' ? 'bg-[var(--color-accent-pink)]' :
                          cat.vertical === 'food'      ? 'bg-[var(--color-accent-amber)]' :
                                                         'bg-[var(--color-accent-violet)]'
                        }`}
                      />
                    )}
                    <span className="text-[var(--color-fg-0)]">{cat.name}</span>
                    {cat.articleCount > 0 && (
                      <span className="text-xs text-[var(--color-fg-2)]">{cat.articleCount}</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {areas.length > 0 && (
          <section>
            <h2 className="mb-6 font-display text-2xl font-semibold text-[var(--color-fg-0)] md:text-3xl">
              {locale === 'el' ? 'Γειτονιές' : 'Neighborhoods'}
            </h2>
            <ul className="flex flex-wrap gap-2">
              {areas.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/${locale}/cities/${city}/area/${a.slug}`}
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--color-bg-2)] bg-[var(--color-bg-1)] px-4 py-2 text-sm transition hover:border-[var(--color-accent-cyan)] hover:bg-[var(--color-bg-2)]"
                  >
                    <span className="font-medium text-[var(--color-fg-0)]">{a.name}</span>
                    <span className="text-xs text-[var(--color-fg-2)]">
                      {a.articleCount} {a.articleCount === 1 ? (locale === 'el' ? 'άρθρο' : 'article') : (locale === 'el' ? 'άρθρα' : 'articles')}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Vertical sections — always rendered so each interest gets a
            visible landing surface. Empty verticals show a friendly
            placeholder rather than disappearing. */}
        {(['nightlife', 'food', 'stay'] as const).map((v) => {
          const items = grouped[v] ?? [];
          return (
            <section key={v} id={v}>
              <h2 className="mb-6 font-display text-2xl font-semibold text-[var(--color-fg-0)] md:text-3xl">
                {VERTICAL_LABELS[locale]?.[v] ?? v}
              </h2>
              {items.length === 0 ? (
                <p className="text-sm text-[var(--color-fg-2)]">
                  {locale === 'el'
                    ? `Άρθρα ${(VERTICAL_LABELS_GENITIVE.el?.[v] ?? '').toLowerCase()} έρχονται σύντομα.`
                    : `${VERTICAL_LABELS.en?.[v]} guides coming soon.`}
                </p>
              ) : (
                <ul className="grid gap-6 md:grid-cols-2">
                  {items.map((a) => (
                    <ArticleCard key={a.id} article={a} locale={locale} citySlug={city} />
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
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

// Greek-genitive labels for the "X coming soon" placeholder.
// English just borrows the base label ("Nightlife guides coming soon").
const VERTICAL_LABELS_GENITIVE: Record<string, Record<'nightlife' | 'food' | 'stay', string>> = {
  el: { nightlife: 'νυχτερινής ζωής', food: 'φαγητού', stay: 'διαμονής' },
};

const VERTICAL_DOT: Record<'nightlife' | 'food' | 'stay', string> = {
  nightlife: 'bg-[var(--color-accent-pink)]',
  food:      'bg-[var(--color-accent-amber)]',
  stay:      'bg-[var(--color-accent-violet)]',
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
