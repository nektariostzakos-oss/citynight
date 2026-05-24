// Technical SEO core for every route — canonical, hreflang, OG, robots,
// JSON-LD. Single source of truth so route files stay short and consistent.
//
// Rules of the road:
//  - Canonical URLs are absolute, with NO trailing slash, and always under
//    NEXT_PUBLIC_SITE_URL.
//  - Hreflang covers all 5 supported locales + x-default (→ en).
//  - Robots: public pages are index,follow. /dashboard, /claim, /auth — noindex,nofollow.
//  - OG image: if a route has a real photo, use it; otherwise the site default.
//  - JSON-LD never includes facts the schema doesn't have (no opening hours
//    from AI text, no aggregateRating without real reviewCount, no fake images).

import type { Metadata } from 'next';
import { LOCALES, HREFLANG, type Locale } from './i18n';

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://citynight.gr').replace(/\/$/, '');
export const SITE_NAME = 'citynight';
const DEFAULT_OG = `${SITE_URL}/og.png`;

// IETF tag → Open Graph locale (`xx_XX`). Inlined — too small for a separate file.
const OG_LOCALE: Record<Locale, string> = {
  en: 'en_US',
  el: 'el_GR',
  de: 'de_DE',
  fr: 'fr_FR',
  it: 'it_IT',
};

// ───────────────────────────────────────────────────────────────────────────
// URL + alternates
// ───────────────────────────────────────────────────────────────────────────

function joinUrl(pathSuffix: string): string {
  const p = pathSuffix.startsWith('/') ? pathSuffix : `/${pathSuffix}`;
  const url = `${SITE_URL}${p}`;
  // Strip trailing slash (except for the bare site root).
  return url === SITE_URL ? `${SITE_URL}/` : url.replace(/\/+$/, '');
}

/** Build canonical + hreflang languages from a {locale: path} map.
 *  Canonical = English version. x-default also points at English. */
export function alternatesFor(pathByLocale: Partial<Record<Locale, string>>): {
  canonical: string;
  languages: Record<string, string>;
} {
  const canonicalLocale: Locale = 'en';
  const fallbackPath = pathByLocale[canonicalLocale] ?? Object.values(pathByLocale)[0] ?? `/${canonicalLocale}`;
  const languages: Record<string, string> = {};
  for (const l of LOCALES) {
    const p = pathByLocale[l];
    if (p) languages[HREFLANG[l]] = joinUrl(p);
  }
  languages['x-default'] = joinUrl(fallbackPath);
  return { canonical: joinUrl(fallbackPath), languages };
}

/** Build a {locale: `/${locale}${suffix}`} map for a route that exists under
 *  every locale. Pass '' for `/${locale}`, '/greece' for the country index. */
export function localizedPaths(suffix: string): Partial<Record<Locale, string>> {
  const out: Partial<Record<Locale, string>> = {};
  for (const l of LOCALES) out[l] = `/${l}${suffix}`;
  return out;
}

// ───────────────────────────────────────────────────────────────────────────
// generateMetadata builders
// ───────────────────────────────────────────────────────────────────────────

export type PublicMetaInput = {
  locale: Locale;
  /** Path map keyed by locale (use localizedPaths(suffix) for common cases). */
  paths: Partial<Record<Locale, string>>;
  title: string;
  description: string;
  /** Absolute or origin-relative URL. Falls back to /og.png. */
  ogImage?: string | null;
  /** Open Graph type. 'website' (default), 'article', 'profile'. */
  ogType?: 'website' | 'article' | 'profile';
};

function absImage(src: string | null | undefined): string {
  if (!src) return DEFAULT_OG;
  if (/^https?:\/\//.test(src)) return src;
  return `${SITE_URL}${src.startsWith('/') ? src : `/${src}`}`;
}

export function publicMetadata(input: PublicMetaInput): Metadata {
  const alternates = alternatesFor(input.paths);
  const image = absImage(input.ogImage);
  return {
    title: input.title,
    description: input.description,
    alternates,
    openGraph: {
      title: input.title,
      description: input.description,
      url: alternates.canonical,
      siteName: SITE_NAME,
      images: [{ url: image, width: 1200, height: 630, alt: input.title }],
      locale: OG_LOCALE[input.locale],
      alternateLocale: LOCALES.filter((l) => l !== input.locale).map((l) => OG_LOCALE[l]),
      type: input.ogType ?? 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: input.title,
      description: input.description,
      images: [image],
    },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  };
}

/** Metadata for private / utility surfaces (dashboard, claim, auth, sign-in). */
export function privateMetadata(input: { title: string; description?: string }): Metadata {
  return {
    title: input.title,
    description: input.description,
    robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
  };
}

// ───────────────────────────────────────────────────────────────────────────
// JSON-LD helpers
// ───────────────────────────────────────────────────────────────────────────

type Json = Record<string, unknown>;

function strip<T extends Json>(o: T): T {
  for (const k of Object.keys(o)) if (o[k] === undefined || o[k] === null) delete o[k];
  return o;
}

/** Organization — same payload across locales. */
export function organizationJsonLd(): Json {
  return strip({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
  });
}

/** WebSite + SearchAction (sitelinks search box) for the active locale. */
export function websiteJsonLd(locale: Locale): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: `${SITE_URL}/${locale}`,
    inLanguage: HREFLANG[locale],
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/${locale}/greece?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export type BreadcrumbItem = { name: string; path: string };

export function breadcrumbJsonLd(items: BreadcrumbItem[]): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: joinUrl(it.path),
    })),
  };
}

export function itemListJsonLd(input: { name: string; items: { name: string; path: string }[] }): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: input.name,
    numberOfItems: input.items.length,
    itemListElement: input.items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      url: joinUrl(it.path),
    })),
  };
}

/** schema.org Place for a city — used on the city index alongside the ItemList. */
export function cityPlaceJsonLd(city: {
  name: string;
  lat?: number | null;
  lng?: number | null;
  region?: string | null;
  slug: string;
  locale: Locale;
  imageUrl?: string | null;
}): Json {
  return strip({
    '@context': 'https://schema.org',
    '@type': 'Place',
    name: city.name,
    url: `${SITE_URL}/${city.locale}/greece/${city.slug}`,
    image: city.imageUrl ? absImage(city.imageUrl) : undefined,
    address: {
      '@type': 'PostalAddress',
      addressLocality: city.name,
      addressRegion: city.region ?? undefined,
      addressCountry: 'GR',
    },
    geo: city.lat && city.lng
      ? { '@type': 'GeoCoordinates', latitude: city.lat, longitude: city.lng }
      : undefined,
  });
}

// Category slug → schema.org @type. Defaults to LocalBusiness when unknown.
const CATEGORY_SCHEMA: Record<string, string> = {
  night_club: 'NightClub',
  bar: 'BarOrPub',
  rooftop_bar: 'BarOrPub',
  live_music: 'NightClub',
  bouzoukia: 'NightClub',
  beach_club: 'NightClub',
  restaurant: 'Restaurant',
  taverna: 'Restaurant',
  mezedopoleio: 'Restaurant',
  hotel: 'LodgingBusiness',
  boutique_hotel: 'LodgingBusiness',
  resort: 'Resort',
  villa: 'LodgingBusiness',
};

export function categorySchemaType(slug: string | null | undefined): string {
  if (!slug) return 'LocalBusiness';
  return CATEGORY_SCHEMA[slug] ?? 'LocalBusiness';
}

/** OpeningHoursSpecification from the raw Google Places `regularOpeningHours.periods`
 *  shape we store on venues.opening_hours. Trusted because the source is
 *  Places — never AI. Returns undefined when the JSON doesn't parse. */
function openingHoursSpec(raw: string | null | undefined):
  | Array<{ '@type': 'OpeningHoursSpecification'; dayOfWeek: string; opens: string; closes: string }>
  | undefined {
  if (!raw) return undefined;
  try {
    const obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const periods: Array<{
      open?: { day?: number; hour?: number; minute?: number };
      close?: { day?: number; hour?: number; minute?: number };
    }> = obj?.periods ?? [];
    if (!Array.isArray(periods) || !periods.length) return undefined;
    const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const out: NonNullable<ReturnType<typeof openingHoursSpec>> = [];
    for (const p of periods) {
      if (typeof p?.open?.day !== 'number' || typeof p?.close?.day !== 'number') continue;
      const dow = DAYS[p.open.day];
      if (!dow) continue;
      const pad = (n: number) => String(n).padStart(2, '0');
      out.push({
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: dow,
        opens: `${pad(p.open.hour ?? 0)}:${pad(p.open.minute ?? 0)}`,
        closes: `${pad(p.close.hour ?? 0)}:${pad(p.close.minute ?? 0)}`,
      });
    }
    return out.length ? out : undefined;
  } catch {
    return undefined;
  }
}

const PRICE_LEVEL_TO_RANGE: Record<number, string> = { 0: 'Free', 1: '€', 2: '€€', 3: '€€€', 4: '€€€€' };

export type LocalBusinessInput = {
  locale: Locale;
  path: string;
  name: string;
  description?: string | null;
  address?: string | null;
  cityName: string;
  region?: string | null;
  phone?: string | null;
  website?: string | null;
  lat?: number | null;
  lng?: number | null;
  rating?: number | null;
  reviewCount?: number | null;
  priceLevel?: number | null;
  /** Raw `opening_hours` JSON from venues. Source = Google Places. */
  openingHours?: string | null;
  /** Real photos only — the photos CHECK constraint guarantees that. */
  photos?: { url: string }[];
  categorySlug?: string | null;
};

export function localBusinessJsonLd(v: LocalBusinessInput): Json {
  return strip({
    '@context': 'https://schema.org',
    '@type': categorySchemaType(v.categorySlug),
    name: v.name,
    description: v.description ?? undefined,
    url: `${SITE_URL}${v.path}`,
    telephone: v.phone ?? undefined,
    sameAs: v.website ?? undefined,
    image: v.photos?.length ? v.photos.map((p) => p.url) : undefined,
    address: v.address
      ? {
          '@type': 'PostalAddress',
          streetAddress: v.address,
          addressLocality: v.cityName,
          addressRegion: v.region ?? undefined,
          addressCountry: 'GR',
        }
      : undefined,
    geo: v.lat && v.lng ? { '@type': 'GeoCoordinates', latitude: v.lat, longitude: v.lng } : undefined,
    openingHoursSpecification: openingHoursSpec(v.openingHours),
    priceRange: typeof v.priceLevel === 'number' ? PRICE_LEVEL_TO_RANGE[v.priceLevel] : undefined,
    aggregateRating:
      v.rating && v.reviewCount && v.reviewCount > 0
        ? { '@type': 'AggregateRating', ratingValue: v.rating, reviewCount: v.reviewCount }
        : undefined,
  });
}

/** Article — pass dates as ISO strings or Date objects. */
export function articleJsonLd(input: {
  locale: Locale;
  path: string;
  headline: string;
  description?: string | null;
  datePublished?: string | Date;
  dateModified?: string | Date;
  image?: string | null;
}): Json {
  const iso = (d: string | Date | undefined) => (d ? new Date(d).toISOString() : undefined);
  return strip({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: input.headline,
    description: input.description ?? undefined,
    inLanguage: HREFLANG[input.locale],
    image: input.image ? absImage(input.image) : undefined,
    datePublished: iso(input.datePublished),
    dateModified: iso(input.dateModified) ?? iso(input.datePublished),
    mainEntityOfPage: `${SITE_URL}${input.path}`,
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo.png` },
    },
  });
}

export function faqJsonLd(faqs: { q: string; a: string }[] | null | undefined): Json | null {
  if (!faqs?.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

// ───────────────────────────────────────────────────────────────────────────
// <script type="application/ld+json"> helpers
// ───────────────────────────────────────────────────────────────────────────

/** Replace `</` so an injected closing tag can't end the script element. */
function safeJson(payload: unknown): string {
  return JSON.stringify(payload).replace(/</g, '\\u003c');
}

/** Returns the dangerouslySetInnerHTML payload for a JSON-LD <script>. Pass
 *  one object (single block) or an array (multiple). Nullish entries are
 *  dropped — handy for conditional blocks like FAQPage. */
export function jsonLdProps(payload: unknown | unknown[]) {
  const data = (Array.isArray(payload) ? payload : [payload]).filter((x) => x !== null && x !== undefined);
  return { dangerouslySetInnerHTML: { __html: data.length === 1 ? safeJson(data[0]) : safeJson(data) } };
}

// ───────────────────────────────────────────────────────────────────────────
// Back-compat: keep the previous helper name around for existing callers.
// New callers should use localBusinessJsonLd().
// ───────────────────────────────────────────────────────────────────────────
export function venueJsonLd(v: {
  name: string;
  description?: string | null;
  address?: string | null;
  phone?: string | null;
  website?: string | null;
  lat?: number | null;
  lng?: number | null;
  rating?: number | null;
  reviewCount?: number | null;
  cityName: string;
  photos?: { url: string }[];
  categorySlug?: string | null;
}): Json {
  return strip({
    '@context': 'https://schema.org',
    '@type': categorySchemaType(v.categorySlug),
    name: v.name,
    description: v.description ?? undefined,
    telephone: v.phone ?? undefined,
    sameAs: v.website ?? undefined,
    image: v.photos?.length ? v.photos.map((p) => p.url) : undefined,
    address: v.address
      ? { '@type': 'PostalAddress', streetAddress: v.address, addressLocality: v.cityName, addressCountry: 'GR' }
      : undefined,
    geo: v.lat && v.lng ? { '@type': 'GeoCoordinates', latitude: v.lat, longitude: v.lng } : undefined,
    aggregateRating:
      v.rating && v.reviewCount && v.reviewCount > 0
        ? { '@type': 'AggregateRating', ratingValue: v.rating, reviewCount: v.reviewCount }
        : undefined,
  });
}
