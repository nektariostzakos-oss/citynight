// Magazine-style city guide. Renders a fixed field set on every page
// for visual + factual consistency:
//   - hero photo (city-level, from photos table) + display H1 + tagline
//   - quick-facts strip: population, distance from Athens, airport,
//     best months, typical visit length (all from cities + article)
//   - known_for chips (article.knownFor)
//   - editorial intro lead → wide secondary photo → rest of body markdown
//   - tertiary photo before FAQ
//   - FAQs (extracted from intro markdown, JSON-LD emitted)
//   - related guides for this city
//
// Same route also catches legacy SaaS-site slugs and 301s them to
// /sites/{slug}. See lookup order in ArticlePage().

import { notFound, permanentRedirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { isLocale, type Locale } from '@/lib/i18n';
import { publicMetadata, jsonLdProps, articleJsonLd, breadcrumbJsonLd, faqJsonLd } from '@/lib/seo';
import { getCityBySlug, getCityPhotos, type City, type CityPhoto } from '@/lib/queries';
import { getPublishedSiteBySlug } from '@/lib/site-queries';
import { getArticleBySlug, listArticlesByCity, listGuideBusinesses, type Article, type GuideBusiness } from '@/lib/articles';
import { renderMarkdown, extractFaqs, extractH2Headings, splitBodyByH2, sectionKindMatchesHeading } from '@/lib/article-md';
import { CityLivePanel } from '@/components/city-live-panel';
import { GuideToc } from '@/components/guide-toc';
import { GuideBusinessCard } from '@/components/guide-business-card';

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
    description: article.subtitle ?? article.tagline ?? article.intro?.slice(0, 160) ?? article.title,
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
    const photos = getCityPhotos(cityRow.id);
    const businesses = listGuideBusinesses(article.id);
    return <GuideRender article={article} cityRow={cityRow} photos={photos} businesses={businesses} locale={locale as Locale} city={city} />;
  }

  // Legacy SaaS-site URL → 301 to canonical /sites/{slug}.
  const site = getPublishedSiteBySlug(slug);
  if (site) permanentRedirect(`/${locale}/sites/${slug}`);

  notFound();
}

// ─── render ─────────────────────────────────────────────────────────────

function GuideRender({ article, cityRow, photos, businesses, locale, city }: {
  article: Article;
  cityRow: City;
  photos: CityPhoto[];
  businesses: GuideBusiness[];
  locale: Locale;
  city: string;
}) {
  const t: LabelPack = locale === 'el' ? LABELS.el : LABELS.en;

  const articlePath = `/${locale}/cities/${city}/${article.slug}`;
  const cityPath = `/${locale}/cities/${city}`;
  const otherArticles = listArticlesByCity(cityRow.id, { locale, status: 'published', limit: 5 })
    .filter((a) => a.id !== article.id).slice(0, 3);

  // Split intro markdown so we can place a wide photo between the lead
  // and the first ## heading. The lead reads like a magazine kicker.
  const { lead, body } = splitLead(article.intro ?? '');
  const faqs = article.intro ? extractFaqs(article.intro) : [];
  const published = article.publishedAt ? new Date(article.publishedAt * 1000) : undefined;
  const updated = article.updatedAt ? new Date(article.updatedAt * 1000) : published;

  // Hero photo: prefer the article's own cover when set. Nightlife guides
  // override the daytime city hero with a true night-scape via this path
  // ([[project-nightlife-nightscape-photos]]). Falls back to the city's
  // first location photo for any guide without a dedicated cover.
  const heroPhoto: { url: string; attribution: string | null } | null =
    article.coverUrl
      ? { url: article.coverUrl, attribution: article.coverAttribution }
      : photos[0] ?? null;
  // Body photo always comes from the city's photo pool (location-scope).
  // We only use one supporting shot — the second appears between the
  // intro lead and the first H2 to give the page a visual break without
  // turning the article into a photo dump.
  const secondaryPhoto = photos.find((p) => p.url !== heroPhoto?.url) ?? null;
  // Table of contents — generated from H2 headings in the intro markdown.
  const tocItems = article.intro ? extractH2Headings(article.intro) : [];

  const verticalLabel = t.vertical[article.vertical];
  const terrainLabel = cityRow.terrain ? (t.terrain[cityRow.terrain] ?? null) : null;

  // Quick-facts items — every guide gets the same shape. Skip items
  // whose source datum is null so partially-seeded cities still render
  // cleanly (instead of "—" sprinkled everywhere).
  const facts: Array<{ label: string; value: string }> = [];
  if (cityRow.population != null) facts.push({ label: t.facts.population, value: formatNumber(cityRow.population, locale) });
  if (cityRow.distanceKm != null) facts.push({
    label: t.facts.fromAthens,
    value: cityRow.distanceDriveMinutes != null
      ? `${cityRow.distanceKm} km · ${cityRow.distanceDriveMinutes} ${t.facts.min}`
      : `${cityRow.distanceKm} km`,
  });
  if (cityRow.nearestAirportCode && cityRow.airportDriveMinutes != null) facts.push({
    label: t.facts.airport,
    value: `${cityRow.nearestAirportCode} · ${cityRow.airportDriveMinutes} ${t.facts.min}`,
  });
  if (article.bestMonths.length > 0) facts.push({
    label: t.facts.bestSeason,
    value: formatMonthRange(article.bestMonths, locale),
  });
  if (article.typicalVisitLength) facts.push({
    label: t.facts.visitLength,
    value: t.visitLength[article.typicalVisitLength] ?? article.typicalVisitLength,
  });

  return (
    <>
      <script
        type="application/ld+json"
        {...jsonLdProps([
          articleJsonLd({
            locale,
            path: articlePath,
            headline: article.title,
            description: article.subtitle ?? article.tagline ?? article.intro?.slice(0, 200) ?? null,
            datePublished: published,
            dateModified: updated,
            image: heroPhoto?.url ?? article.coverUrl,
          }),
          breadcrumbJsonLd([
            { name: t.home, path: `/${locale}` },
            { name: cityRow.name, path: cityPath },
            { name: article.title, path: articlePath },
          ]),
          faqJsonLd(faqs),
        ])}
      />

      {/* ── HERO ───────────────────────────────────────────────────── */}
      <header className="relative isolate flex min-h-[80vh] w-full items-end overflow-hidden border-b border-[var(--color-bg-2)]">
        {heroPhoto ? (
          <Image
            src={heroPhoto.url}
            alt={cityRow.name}
            fill
            sizes="100vw"
            priority
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-bg-1)] via-[var(--color-bg-2)] to-[var(--color-bg-0)]" />
        )}
        {/* Dual gradient: vertical for legibility of bottom text, gentle
            left for the eyebrow at the top corner. */}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[var(--color-bg-0)] via-[var(--color-bg-0)]/55 to-transparent" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-[var(--color-bg-0)]/35 via-transparent to-transparent" />

        <div className="relative mx-auto w-full max-w-5xl px-6 pb-16 pt-32 md:px-10 md:pb-24">
          <nav className="text-sm">
            <Link href={cityPath} className="text-[var(--color-fg-2)] hover:text-[var(--color-fg-0)]">
              ← {cityRow.name}
            </Link>
          </nav>
          <p className="mt-8 text-xs font-medium uppercase tracking-[0.25em] text-[var(--color-accent-cyan)]">
            {t.eyebrow[article.vertical]}
          </p>
          <h1 className="mt-3 font-display text-5xl font-semibold leading-[0.95] tracking-tight text-[var(--color-fg-0)] md:text-7xl lg:text-8xl">
            {cityRow.name}
          </h1>
          <p className="mt-5 text-sm text-[var(--color-fg-1)] md:text-base">
            {[cityRow.region, terrainLabel].filter(Boolean).join(' · ')}
          </p>
          {article.tagline && (
            <p className="mt-6 max-w-2xl font-display text-xl leading-snug text-[var(--color-fg-0)]/90 md:text-2xl">
              {article.tagline}
            </p>
          )}
        </div>

      </header>

      {/* ── QUICK FACTS STRIP ─────────────────────────────────────── */}
      {facts.length > 0 && (
        <section className="border-b border-[var(--color-bg-2)] bg-[var(--color-bg-1)]/60 backdrop-blur">
          <ul className="mx-auto flex max-w-5xl flex-wrap items-stretch gap-y-3 px-6 py-4 text-sm md:px-10">
            {facts.map((f, i) => (
              <li
                key={f.label}
                className={`flex flex-col px-4 md:px-6 ${i > 0 ? 'border-l border-[var(--color-bg-2)]' : ''}`}
              >
                <span className="text-[10px] uppercase tracking-[0.15em] text-[var(--color-fg-2)]">{f.label}</span>
                <span className="mt-1 font-medium text-[var(--color-fg-0)]">{f.value}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── LIVE PANEL (weather + sun + sea + directions + nearby) ── */}
      <CityLivePanel city={cityRow} locale={locale} />

      {/* ── KNOWN FOR CHIPS (full-width strip above the two-col body) ── */}
      {article.knownFor.length > 0 && (
        <section className="mx-auto max-w-5xl px-6 pt-10 md:px-10">
          <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--color-fg-2)]">{t.knownFor}</p>
          <ul className="flex flex-wrap gap-2">
            {article.knownFor.map((tag) => (
              <li
                key={tag}
                className="inline-flex items-center rounded-full border border-[var(--color-bg-2)] bg-[var(--color-bg-1)] px-4 py-1.5 text-sm font-medium text-[var(--color-fg-0)]"
              >
                {tag}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── MAIN BODY ─ TOC sidebar + article column ─────────────── */}
      <div className="mx-auto grid max-w-5xl gap-10 px-6 pb-24 pt-12 md:px-10 lg:grid-cols-[220px_1fr]">
        {/* Desktop sticky TOC, mobile collapsible — both rendered by GuideToc. */}
        <aside>
          <GuideToc items={tocItems} label={t.tocLabel} />
        </aside>

        <article>
          {/* ── ARTICLE HEADING ─────────────────────────────────── */}
          <header className="mb-10">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--color-fg-2)]">
              {verticalLabel} · {cityRow.name}
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold leading-tight text-[var(--color-fg-0)] md:text-4xl">
              {article.title}
            </h2>
            {article.subtitle && (
              <p className="mt-4 text-lg text-[var(--color-fg-1)]">{article.subtitle}</p>
            )}
          </header>

          {/* ── INTRO LEAD ──────────────────────────────────────── */}
          {lead && (
            <div className="prose-site mb-12 max-w-none border-l-2 border-[var(--color-accent-cyan)] pl-6 text-lg text-[var(--color-fg-1)] md:text-xl">
              {renderMarkdown(lead)}
            </div>
          )}

          {/* ── PHOTO STRIP 2 ───────────────────────────────────── */}
          {secondaryPhoto && <WidePhoto photo={secondaryPhoto} alt={cityRow.name} />}

          {/* ── INTERLEAVED BODY (sections + cards) ────────────── */}
          {/* Split body at every H2; render each section, then any
              verified business cards whose section_kind matches that
              H2's keywords. Businesses tagged 'tail' / 'other' fall
              through to the tail section below. */}
          {(() => {
            const sections = body ? splitBodyByH2(body) : [];
            const usedIds = new Set<string>();
            const sectionsRendered = sections.map((sec) => {
              const inSection = businesses.filter(
                (b) => sectionKindMatchesHeading(b.sectionKind, sec.label),
              );
              inSection.forEach((b) => usedIds.add(b.id));
              return { sec, inSection };
            });
            // Tail: cards that didn't pin to any H2 (section_kind 'other'
            // or a label no section in this article matches). The seed
            // pipeline targets 10 cards per guide; we surface every one
            // we verified, so unpinned cards land here instead of being
            // dropped.
            const tail = businesses.filter((b) => !usedIds.has(b.id));
            return (
              <div className="mt-12 space-y-12">
                {sectionsRendered.map(({ sec, inSection }) => (
                  <section key={sec.id}>
                    <div className="prose-site max-w-none">
                      {renderMarkdown(sec.content)}
                    </div>
                    {inSection.length > 0 && (
                      <ul className="mt-8 space-y-6">
                        {inSection.map((b) => (
                          <li key={b.id}>
                            <GuideBusinessCard business={b} locale={locale} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                ))}
                {sections.length === 0 && body && (
                  <div className="prose-site max-w-none">{renderMarkdown(body)}</div>
                )}
                {tail.length > 0 && (
                  <section>
                    <h2 className="mt-12 mb-4 font-display text-2xl font-semibold text-[var(--color-fg-0)] md:text-3xl">
                      {t.moreVerified}
                    </h2>
                    <p className="mb-6 text-[var(--color-fg-1)]">{t.moreVerifiedHint}</p>
                    <ul className="space-y-6">
                      {tail.map((b) => (
                        <li key={b.id}>
                          <GuideBusinessCard business={b} locale={locale} />
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>
            );
          })()}

          {/* ── OUTRO (rare) ────────────────────────────────────── */}
          {article.outro && (
            <div className="prose-site mt-12 max-w-none">
              {renderMarkdown(article.outro)}
            </div>
          )}

          {/* ── RELATED GUIDES ──────────────────────────────────── */}
          {otherArticles.length > 0 && (
            <section className="mt-20 border-t border-[var(--color-bg-2)] pt-10">
              <h2 className="font-display text-xl font-semibold text-[var(--color-fg-0)]">
                {t.moreFrom} {cityRow.name}
              </h2>
              <ul className="mt-6 grid gap-4 md:grid-cols-2">
                {otherArticles.map((a) => (
                  <li key={a.id}>
                    <Link
                      href={`/${locale}/cities/${city}/${a.slug}`}
                      className="block rounded-xl border border-[var(--color-bg-2)] bg-[var(--color-bg-1)] p-5 transition hover:border-[var(--color-accent-cyan)]"
                    >
                      <p className="text-xs uppercase tracking-wide text-[var(--color-fg-2)]">{t.vertical[a.vertical]}</p>
                      <p className="mt-1 font-display text-base font-semibold text-[var(--color-fg-0)]">{a.title}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </article>
      </div>
    </>
  );
}

function WidePhoto({ photo, alt }: { photo: CityPhoto; alt: string }) {
  return (
    <figure className="relative -mx-6 my-12 aspect-[21/9] overflow-hidden md:mx-0 md:rounded-2xl">
      <Image
        src={photo.url}
        alt={alt}
        fill
        sizes="(min-width: 768px) 768px, 100vw"
        className="object-cover"
      />
      {photo.attribution && (
        <figcaption className="absolute bottom-2 right-3 text-[10px] text-white/70">
          {photo.attribution}
        </figcaption>
      )}
    </figure>
  );
}

// ─── helpers ────────────────────────────────────────────────────────────

/** Split markdown into the lead (everything before the first H2) and the
 *  body (first H2 onward). Both trimmed. */
function splitLead(src: string): { lead: string; body: string } {
  const idx = src.search(/^##\s+/m);
  if (idx === -1) return { lead: src.trim(), body: '' };
  return { lead: src.slice(0, idx).trim(), body: src.slice(idx).trim() };
}

function formatNumber(n: number, locale: Locale): string {
  try { return new Intl.NumberFormat(locale === 'el' ? 'el-GR' : locale).format(n); }
  catch { return String(n); }
}

function formatMonthRange(months: number[], locale: Locale): string {
  if (months.length === 0) return '';
  const names = (locale === 'el'
    ? ['Ιαν','Φεβ','Μαρ','Απρ','Μάι','Ιουν','Ιουλ','Αυγ','Σεπ','Οκτ','Νοε','Δεκ']
    : ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']);
  // If contiguous, render as "Jun–Sep". Otherwise comma-list.
  const sorted = [...months].sort((a, b) => a - b);
  const contiguous = sorted.every((m, i) => i === 0 || m === sorted[i - 1]! + 1);
  if (contiguous && sorted.length >= 2) {
    return `${names[sorted[0]! - 1]}–${names[sorted[sorted.length - 1]! - 1]}`;
  }
  return sorted.map((m) => names[m - 1]).join(', ');
}

type LabelPack = {
  home: string;
  knownFor: string;
  moreFrom: string;
  moreVerified: string;
  moreVerifiedHint: string;
  tocLabel: string;
  pinned: string;
  pinnedSlug: string;
  pinnedHint: string;
  facts: { population: string; fromAthens: string; airport: string; bestSeason: string; visitLength: string; min: string };
  vertical: Record<'nightlife' | 'food' | 'stay', string>;
  eyebrow: Record<'nightlife' | 'food' | 'stay', string>;
  terrain: Record<string, string>;
  visitLength: Record<string, string>;
};

// Only EN and EL are fully translated for now; other locales fall back
// to EN at lookup time. When DE/FR/IT content lands, add their entries.
const LABELS = {
  el: {
    home: 'Αρχική',
    knownFor: 'Γνωστό για',
    moreFrom: 'Περισσότερα για',
    moreVerified: 'Περισσότερα επαληθευμένα μαγαζιά',
    moreVerifiedHint: 'Κι άλλα μαγαζιά που πέρασαν τους ίδιους ελέγχους — Google Places + πρόσφατες κριτικές.',
    tocLabel: 'Σε αυτή τη σελίδα',
    pinned: 'Επαληθευμένα μαγαζιά',
    pinnedSlug: 'epalitheumena-magazia',
    pinnedHint: 'Κάθε μαγαζί παρακάτω έχει επαληθευτεί μέσω της σελίδας του στο Facebook. Άνοιξε το χάρτη ή πάρε οδηγίες απευθείας.',
    facts: { population: 'Πληθυσμός', fromAthens: 'Από Αθήνα', airport: 'Αεροδρόμιο', bestSeason: 'Σαιζόν', visitLength: 'Διάρκεια', min: 'λεπτά' },
    vertical: { nightlife: 'Νυχτερινή ζωή', food: 'Φαγητό', stay: 'Διαμονή' },
    eyebrow: { nightlife: 'Οδηγός νυχτερινής ζωής', food: 'Οδηγός φαγητού', stay: 'Οδηγός διαμονής' },
    terrain: { seaside: 'Παραθαλάσσιο', mountain: 'Ορεινό', island: 'Νησί', island_capital: 'Πρωτεύουσα νησιού', mainland_city: 'Ηπειρωτική πόλη', wine_region: 'Αμπελώνες' },
    visitLength: { day_trip: 'Ημερήσια', weekend: 'Σαββατοκύριακο', week: 'Εβδομάδα', multi_day: 'Πολυήμερο' },
  },
  en: {
    home: 'Home',
    knownFor: 'Known for',
    moreFrom: 'More from',
    moreVerified: 'More verified spots',
    moreVerifiedHint: 'A few more venues that cleared the same checks — Google Places + recent reviews.',
    tocLabel: 'On this page',
    pinned: 'Verified spots',
    pinnedSlug: 'verified-spots',
    pinnedHint: 'Each spot below is verified via its Facebook page. Open the map or get directions directly.',
    facts: { population: 'Population', fromAthens: 'From Athens', airport: 'Airport', bestSeason: 'Best season', visitLength: 'Visit', min: 'min' },
    vertical: { nightlife: 'Nightlife', food: 'Food', stay: 'Stay' },
    eyebrow: { nightlife: 'Nightlife guide', food: 'Food guide', stay: 'Stay guide' },
    terrain: { seaside: 'Seaside', mountain: 'Mountain', island: 'Island', island_capital: 'Island capital', mainland_city: 'Mainland city', wine_region: 'Wine region' },
    visitLength: { day_trip: 'Day trip', weekend: 'Weekend', week: 'Week', multi_day: 'Multi-day' },
  },
};
