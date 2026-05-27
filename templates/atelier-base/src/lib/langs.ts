/**
 * Language codes the salon template supports.
 *
 * This module deliberately has NO "use client" directive: it is imported by
 * BOTH client code (i18n.tsx) and server code (i18nServer.ts, the
 * /api/languages route). A "use client" module's exports become client
 * references when imported on the server, so these values cannot live in
 * i18n.tsx — server code that imported SUPPORTED_LANGS from there received a
 * proxy instead of the array, and every server-side language filter silently
 * failed (loadEnabledLanguages always fell back to ["en"]).
 */

export type Lang =
  | "en" | "el" | "de" | "fr" | "it" | "es"
  | "nl" | "pl" | "pt" | "sv" | "sq";

export const SUPPORTED_LANGS: Lang[] = [
  "en", "el", "de", "fr", "it", "es", "nl", "pl", "pt", "sv", "sq",
];

/** Native language names, for the language selector. */
export const LANG_NAMES: Record<Lang, string> = {
  en: "English",
  el: "Ελληνικά",
  de: "Deutsch",
  fr: "Français",
  it: "Italiano",
  es: "Español",
  nl: "Nederlands",
  pl: "Polski",
  pt: "Português",
  sv: "Svenska",
  sq: "Shqip",
};

/**
 * Resolve a `<base>_<lang>` field on a multilingual data object, falling back
 * to the English variant. Used for products, blog posts, transformations and
 * any other data stored with per-language `_xx` suffixes.
 */
export function langField(
  obj: Record<string, unknown> | null | undefined,
  base: string,
  lang: string,
): string {
  if (!obj) return "";
  const v = obj[`${base}_${lang}`] ?? obj[`${base}_en`];
  return typeof v === "string" ? v : "";
}

/**
 * Pick a language value from a `{ en, el, de, ... }` record, falling back to
 * English. For component-local copy that isn't stored in a data file.
 */
export function langPick(
  rec: Record<string, string>,
  lang: string,
): string {
  return rec[lang] ?? rec.en ?? "";
}
