/**
 * Canonical public base URL for this install.
 *
 * Resolution order:
 *  1. `NEXT_PUBLIC_SITE_URL`  — build-time inlined; set by the customer ZIP's
 *     install wizard. Wins so every customer's own deploy keeps reporting its
 *     own URL in metadata, sitemaps, emails, etc.
 *  2. `ATELIER_SITE_URL`      — runtime, driven by the operator-config store
 *     (`/support/admin/settings`) on the SaaS bundle. Lets the operator change
 *     the canonical URL without a redeploy and without a Hostinger env var.
 *  3. Local-dev placeholder.
 *
 * The trailing slash is stripped so callers can append `/path` safely.
 *
 * Server-only. `ATELIER_SITE_URL` is never inlined into the client bundle,
 * so reading this in a client component falls straight through to the
 * placeholder. Every existing caller is a server route, server component,
 * or library used from one.
 */
export function getSiteUrl(): string {
  const v =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.ATELIER_SITE_URL ||
    "http://localhost:3000";
  return v.replace(/\/$/, "");
}

/**
 * Convenience constant for modules that capture the value at import time.
 * Functionally equivalent to `getSiteUrl()`, but lets old `const SITE_URL = …`
 * call sites swap in a single named import without changing their shape.
 */
export const SITE_URL = getSiteUrl();
