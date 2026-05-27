import { cookies } from "next/headers";
import { promises as fs } from "fs";
import path from "path";
import { getAppRoot } from "./appRoot";
import { type Lang, SUPPORTED_LANGS } from "./langs";

/**
 * Server-side language resolution for the salon template.
 *
 * The visitor only ever sees languages the shop owner switched on
 * (settings.json `enabledLanguages`). English is always available.
 *
 * Server-only: this file imports `fs` and `next/headers`, so it must not be
 * pulled into a client component. Client code uses the i18n.tsx context.
 */

const LANG_COOKIE = "atelier_lang";

/** Languages the shop owner enabled, validated and with "en" guaranteed. */
export async function loadEnabledLanguages(): Promise<Lang[]> {
  try {
    const raw = await fs.readFile(
      path.join(getAppRoot(), "data", "settings.json"),
      "utf-8",
    );
    const parsed = JSON.parse(raw) as { enabledLanguages?: unknown };
    const list = Array.isArray(parsed.enabledLanguages) ? parsed.enabledLanguages : [];
    const valid = list.filter(
      (l): l is Lang => typeof l === "string" && SUPPORTED_LANGS.includes(l as Lang),
    );
    if (valid.length === 0) return ["en"];
    return valid.includes("en") ? valid : ["en", ...valid];
  } catch {
    return ["en", "de"];
  }
}

/**
 * Resolve the active language: explicit `?lang=` param, then the `atelier_lang`
 * cookie proxy.ts sets, then English. The result is always clamped to the
 * shop's enabled languages — a lang the owner has not switched on falls back
 * to English.
 */
export async function detectLang(
  raw: string | string[] | undefined,
  enabled?: Lang[],
): Promise<Lang> {
  const allowed = enabled && enabled.length > 0 ? enabled : await loadEnabledLanguages();

  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v && SUPPORTED_LANGS.includes(v as Lang) && allowed.includes(v as Lang)) {
    return v as Lang;
  }

  try {
    const jar = await cookies();
    const fromCookie = jar.get(LANG_COOKIE)?.value as Lang | undefined;
    if (fromCookie && allowed.includes(fromCookie)) return fromCookie;
  } catch {
    /* cookies() unavailable outside a request scope */
  }

  return "en";
}
