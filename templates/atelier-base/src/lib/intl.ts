/**
 * Locale-aware date, time, number, and currency formatting for the salon
 * template. Wraps the Intl.* APIs so callers never hardcode a locale string
 * like "en-US" or a naked "$".
 *
 * Pass the request's detected `Lang` (see i18nServer.detectLang). localeFor()
 * maps it to the matching BCP-47 locale.
 */

import type { Lang } from "./langs";

/** BCP-47 locale for each supported language. pt is European Portuguese. */
const LOCALES: Record<Lang, string> = {
  en: "en-GB",
  el: "el-GR",
  de: "de-DE",
  fr: "fr-FR",
  it: "it-IT",
  es: "es-ES",
  nl: "nl-NL",
  pl: "pl-PL",
  pt: "pt-PT",
  sv: "sv-SE",
  sq: "sq-AL",
};

/** Map a supported language to its BCP-47 locale (e.g. "pt" -> "pt-PT"). */
export function localeFor(lang: Lang): string {
  return LOCALES[lang] ?? LOCALES.en;
}

/** Coerce a Date | ISO string | epoch ms into a Date; invalid input -> now. */
function toDate(value: Date | string | number): Date {
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

/** Localized date. Default medium style, e.g. "5 May 2026" / "5 Μαΐ 2026". */
export function formatDate(
  value: Date | string | number,
  lang: Lang,
  options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" },
): string {
  return new Intl.DateTimeFormat(localeFor(lang), options).format(toDate(value));
}

/** Localized time of day, e.g. "14:30". */
export function formatTime(
  value: Date | string | number,
  lang: Lang,
  options: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" },
): string {
  return new Intl.DateTimeFormat(localeFor(lang), options).format(toDate(value));
}

/** Localized currency amount, e.g. "€19.00" / "19,00 €". Defaults to EUR. */
export function formatCurrency(
  amount: number,
  lang: Lang,
  currency = "EUR",
): string {
  return new Intl.NumberFormat(localeFor(lang), {
    style: "currency",
    currency,
  }).format(Number.isFinite(amount) ? amount : 0);
}

/** Localized plain number with digit grouping, e.g. "1,234" / "1.234". */
export function formatNumber(
  value: number,
  lang: Lang,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(localeFor(lang), options).format(
    Number.isFinite(value) ? value : 0,
  );
}
