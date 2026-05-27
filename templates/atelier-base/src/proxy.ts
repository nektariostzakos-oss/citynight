import { getAppRoot } from "@/lib/appRoot";
import { NextResponse, type NextRequest } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { SUPPORTED_LANGS, type Lang } from "@/lib/i18n";
import { BASE_PATH } from "@/lib/basePath";
import { getCurrentTenant } from "@/lib/tenantContext";

/**
 * Edge proxy. Two jobs:
 *
 *  1. Setup gate — until data/settings.json has onboarded:true, every page
 *     redirects to /setup. Skipped when the app is mounted under a base path
 *     (NEXT_PUBLIC_BASE_PATH): that build is the operator-run hosted demo,
 *     which is never "installed" and must always serve content. A customer's
 *     standalone template builds at root, so the gate still applies to them.
 *  2. Language auto-detect — on first arrival (no `atelier_lang` cookie), pick a
 *     language from the IP-country header or Accept-Language, clamp it to the
 *     shop's enabled languages, and set a 1-year cookie. We never redirect for
 *     language; the cookie just rides along on whatever response goes back.
 */

// Cached once the install finishes. Keyed by tenant slug ("" standalone) so
// one tenant's onboarded state never leaks into another's. Before a tenant is
// onboarded we re-read so setup completion is picked up; after, we cache.
const settingsCache = new Map<
  string,
  { onboarded: boolean; enabledLanguages: Lang[] }
>();

async function getSettings(): Promise<{ onboarded: boolean; enabledLanguages: Lang[] }> {
  const key = getCurrentTenant() ?? "";
  const cached = settingsCache.get(key);
  if (cached) return cached;
  let onboarded = false;
  let enabledLanguages: Lang[] = ["en"];
  try {
    const raw = await fs.readFile(
      path.join(getAppRoot(), "data", "settings.json"),
      "utf-8",
    );
    const parsed = JSON.parse(raw) as { onboarded?: boolean; enabledLanguages?: unknown };
    onboarded = !!parsed.onboarded;
    const list = Array.isArray(parsed.enabledLanguages) ? parsed.enabledLanguages : [];
    const valid = list.filter(
      (l): l is Lang => typeof l === "string" && SUPPORTED_LANGS.includes(l as Lang),
    );
    if (valid.length > 0) {
      enabledLanguages = valid.includes("en") ? valid : ["en", ...valid];
    }
  } catch {
    /* settings file doesn't exist yet — treat as not onboarded */
  }
  const result = { onboarded, enabledLanguages };
  if (onboarded) settingsCache.set(key, result);
  return result;
}

// HTTP methods that mutate state — blocked on a billing-locked tenant.
const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const PREVIEW_COOKIE = "atelier_preview";
const LANG_COOKIE = "atelier_lang";
const ONE_YEAR_S = 60 * 60 * 24 * 365;

// Country code → language. Unlisted countries fall through to Accept-Language.
const LANG_FROM_COUNTRY: Record<string, Lang> = {
  GR: "el", CY: "el",
  DE: "de", AT: "de",
  FR: "fr",
  IT: "it",
  ES: "es",
  NL: "nl",
  PL: "pl",
  PT: "pt",
  SE: "sv",
  AL: "sq", XK: "sq",
  GB: "en", US: "en", AU: "en",
};

const LANG_FROM_PREFIX: Array<[string, Lang]> = [
  ["el", "el"], ["de", "de"], ["fr", "fr"], ["it", "it"], ["es", "es"],
  ["nl", "nl"], ["pl", "pl"], ["pt", "pt"], ["sv", "sv"], ["sq", "sq"], ["en", "en"],
];

function detectLangFromHeaders(req: NextRequest): Lang {
  const country = (
    req.headers.get("cf-ipcountry") ||
    req.headers.get("x-vercel-ip-country") ||
    req.headers.get("x-country-code") ||
    req.headers.get("x-real-country") ||
    ""
  ).toUpperCase();
  if (country && LANG_FROM_COUNTRY[country]) return LANG_FROM_COUNTRY[country];

  const accept = (req.headers.get("accept-language") || "").toLowerCase();
  const parts = accept
    .split(",")
    .map((s) => {
      const [tag, ...rest] = s.trim().split(";");
      const q = rest.map((r) => r.trim()).find((r) => r.startsWith("q="));
      return { tag: tag.trim(), q: q ? Number(q.slice(2)) : 1 };
    })
    .filter((p) => p.tag)
    .sort((a, b) => b.q - a.q);
  for (const p of parts) {
    for (const [prefix, lang] of LANG_FROM_PREFIX) {
      if (p.tag.startsWith(prefix)) return lang;
    }
  }
  return "en";
}

export async function proxy(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;
  const tenant = getCurrentTenant();

  // SaaS read-only enforcement: a tenant whose subscription is past_due /
  // unpaid (server.js sets the banner header) cannot perform admin writes.
  // The public site stays fully readable.
  if (
    req.headers.get("x-atelier-tenant-banner") &&
    WRITE_METHODS.has(req.method) &&
    (pathname === "/admin" ||
      pathname.startsWith("/admin/") ||
      pathname.startsWith("/api/admin/"))
  ) {
    return NextResponse.json(
      {
        error: "read_only",
        message:
          "This site is read-only while a billing issue is resolved. " +
          "Ο ιστότοπος είναι σε λειτουργία μόνο ανάγνωσης λόγω εκκρεμούς χρέωσης.",
      },
      { status: 423 },
    );
  }

  const { onboarded } = await getSettings();

  // First-visit language pick: IP country, then Accept-Language. The cookie is
  // intentionally NOT clamped to the shop's enabled languages here — Next
  // middleware does not carry the per-request tenant context, so it cannot
  // read per-tenant settings reliably. detectLang() (i18nServer) re-clamps the
  // cookie to the enabled set at render time, where the context IS available,
  // so a disabled language can never actually be shown.
  let langToSet: Lang | null = null;
  if (!req.cookies.get(LANG_COOKIE)?.value) {
    langToSet = detectLangFromHeaders(req);
  }
  const finish = (res: NextResponse) => {
    if (langToSet) {
      res.cookies.set(LANG_COOKIE, langToSet, {
        path: "/",
        maxAge: ONE_YEAR_S,
        sameSite: "lax",
        httpOnly: false,
      });
    }
    return res;
  };

  // ?preview=1 turns on preview mode and sticks via cookie so internal nav
  // (services, shop, blog, etc.) keeps working without re-adding the query.
  if (searchParams.get("preview") === "1") {
    const res = NextResponse.next();
    res.cookies.set(PREVIEW_COOKIE, "1", {
      httpOnly: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60, // 1 hour
    });
    return finish(res);
  }
  if (req.cookies.get(PREVIEW_COOKIE)?.value === "1") {
    return finish(NextResponse.next());
  }

  // Never interfere with setup, the setup API, Next internals, or static files.
  if (
    pathname.startsWith("/setup") ||
    pathname.startsWith("/api/install") ||
    pathname.startsWith("/api/install-stats") ||
    pathname.startsWith("/api/import-site") ||
    pathname.startsWith("/api/templates") ||
    // The setup wizard's site-design picker iframes /preview/<template>, so
    // that route must render before onboarding instead of 307-looping back
    // into /setup. It is noindex and self-contained, harmless pre-install.
    pathname.startsWith("/preview/") ||
    pathname.startsWith("/api/license-check") ||
    pathname.startsWith("/api/upload") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/uploads") ||
    pathname.startsWith("/brand") ||
    pathname.startsWith("/demos") ||
    pathname.startsWith("/products") ||
    pathname.startsWith("/blog/") ||
    // The service worker is a static, side-effect-free file and the push API
    // is harmless before onboarding; exempt them so PWA install + Web Push
    // are wired up rather than 307-redirected to /setup.
    pathname.startsWith("/api/push/") ||
    pathname === "/sw.js" ||
    // The manifest's install icons; must load even before onboarding or the
    // browser will not offer "Install app" on the setup screen.
    pathname.startsWith("/icon-pwa") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname === "/llms.txt" ||
    pathname === "/manifest.webmanifest"
  ) {
    return finish(NextResponse.next());
  }

  // The built-in __demo__ showcase always serves content (never "installed").
  if (onboarded || BASE_PATH || tenant === "__demo__") {
    return finish(NextResponse.next());
  }

  // Redirect everything else to the setup page. Under path-based SaaS routing
  // the redirect must carry the tenant slug (/<slug>/setup); on a tenant host
  // (subdomain / custom domain) paths are already root-relative, so /setup.
  const hostMode = req.headers.get("x-atelier-host-mode") === "1";
  const url = req.nextUrl.clone();
  url.pathname = tenant && !hostMode ? `/${tenant}/setup` : "/setup";
  url.search = "";
  return finish(NextResponse.redirect(url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
