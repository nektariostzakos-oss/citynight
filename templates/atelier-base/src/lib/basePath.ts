/**
 * URL-prefix helpers.
 *
 * `withBasePath` is DETERMINISTIC — it returns the same value on the server and
 * the client, so it is safe inside rendered JSX (`<img src>`, `<a href>`).
 * Under the SaaS bundle the demo runs at root with no base path, so it is a
 * pass-through; a tenant's `/uploads/*` and `/api/*` requests are resolved by
 * server.js (Referer-based) and the layout's fetch shim respectively. A legacy
 * sub-path mount still uses the build-time NEXT_PUBLIC_BASE_PATH.
 *
 * `clientPath` is CLIENT-ONLY and tenant-aware — use it for navigations done
 * OUTSIDE React render (window.location assignments, Stripe return_url). Never
 * use it in rendered JSX: it would differ between server and client and break
 * hydration.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

export function withBasePath(p: string): string {
  const env = BASE_PATH;
  if (!env) return p;
  if (p.startsWith(env + "/") || p === env) return p;
  if (!p.startsWith("/")) return p;
  return env + p;
}

/**
 * Tenant-aware path for client-side navigation. Reads the live tenant slug
 * from `<html data-tenant>` and prefixes it. Falls back to `withBasePath` when
 * there is no tenant (standalone install / legacy mount).
 */
export function clientPath(p: string): string {
  if (typeof document !== "undefined") {
    const slug = document.documentElement.dataset.tenant;
    if (slug && p.startsWith("/") && !p.startsWith("//")) {
      return p === `/${slug}` || p.startsWith(`/${slug}/`)
        ? p
        : `/${slug}${p}`;
    }
  }
  return withBasePath(p);
}

/**
 * Inverse of `clientPath` — strips the live tenant `/<slug>` prefix from a
 * pathname so it can be compared against the demo's root-relative hrefs.
 *
 * SSR-safe and hydration-safe: on the server (server.js has already stripped
 * the slug, so `usePathname()` is already root-relative) and on standalone
 * installs (no tenant) it returns the path unchanged. On the client under a
 * tenant mount it removes the `/<slug>` the address bar carries. Both sides
 * therefore resolve to the same value.
 */
export function tenantRelativePath(p: string): string {
  if (typeof document === "undefined" || !p.startsWith("/")) return p;
  const slug = document.documentElement.dataset.tenant;
  if (!slug) return p;
  if (p === `/${slug}`) return "/";
  if (p.startsWith(`/${slug}/`)) return p.slice(slug.length + 1);
  return p;
}
