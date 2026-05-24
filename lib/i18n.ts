// Locale-prefixed routes are the canonical SEO surfaces.
// §10 LAW: never force geo/language redirects (breaks crawling).
// Soft geo default only at the root '/' surface; everywhere else, the URL's locale wins.

export const LOCALES = ['en', 'el', 'de', 'fr', 'it'] as const;
export type Locale = (typeof LOCALES)[number];

// Greek-first product (the audience is Greek + visiting tourists). When the
// browser doesn't tell us anything useful we default to Greek, not English.
export const DEFAULT_LOCALE: Locale = 'el';

// Each locale's display name in its own language (used in the language picker).
export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  el: 'Ελληνικά',
  de: 'Deutsch',
  fr: 'Français',
  it: 'Italiano',
};

// hreflang values per BCP 47 (Google-recommended). 'el' = Greek, 'el-GR' would over-narrow.
export const HREFLANG: Record<Locale, string> = {
  en: 'en',
  el: 'el',
  de: 'de',
  fr: 'fr',
  it: 'it',
};

// Soft country → locale mapping for the root '/' soft default and the
// "view in X?" banner. Anything not mapped falls back to DEFAULT_LOCALE.
const COUNTRY_TO_LOCALE: Record<string, Locale> = {
  GR: 'el',
  CY: 'el',
  DE: 'de',
  AT: 'de',
  CH: 'de',
  FR: 'fr',
  BE: 'fr',
  LU: 'fr',
  MC: 'fr',
  IT: 'it',
  SM: 'it',
};

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}

export function localeFromCountry(country: string | null | undefined): Locale {
  if (!country) return DEFAULT_LOCALE;
  return COUNTRY_TO_LOCALE[country.toUpperCase()] ?? DEFAULT_LOCALE;
}

// Parse the browser's Accept-Language header (also matches navigator.language
// client-side). This is the language the visitor actually reads — better signal
// than geo for choosing the locale to suggest.
//
// Accepts headers like:  "el-GR,el;q=0.9,en;q=0.8,it;q=0.7"
// Returns the first locale tag (en/el/de/fr/it) that we support, in q-order.
export function localeFromAcceptLanguage(header: string | null | undefined): Locale {
  if (!header) return DEFAULT_LOCALE;
  const tags = header
    .split(',')
    .map((part) => {
      const [tag, qs] = part.trim().split(';');
      const q = qs?.match(/q=([\d.]+)/);
      return { tag: (tag || '').toLowerCase(), q: q?.[1] ? parseFloat(q[1]) : 1 };
    })
    .filter((t) => t.tag)
    .sort((a, b) => b.q - a.q);

  for (const { tag } of tags) {
    const primary = tag.split('-')[0];
    if (isLocale(primary)) return primary;
  }
  return DEFAULT_LOCALE;
}
