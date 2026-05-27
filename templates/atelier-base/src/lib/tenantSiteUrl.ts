import { headers } from "next/headers";
import { getCurrentTenant, getTenantPath } from "./tenantContext";
import { SITE_URL } from "./atelierSiteUrl";

/**
 * Absolute origin URL for the active request, *including* any tenant path
 * slug. Use it for canonical URLs, JSON-LD `url` / `@id`, OG `url`, sitemap
 * entries, robots host/sitemap fields, and anywhere else an absolute URL is
 * required.
 *
 *  1. Standalone customer ZIP (no tenant context) → `SITE_URL`, the value the
 *     install wizard saved. Today's single-site behaviour is preserved.
 *  2. SaaS bundle, host-mode tenant (the tenant's own connected domain) →
 *     `${proto}://${host}` rebuilt from the request headers. The whole site
 *     belongs to the tenant, so no path prefix is added.
 *  3. SaaS bundle, path-mode tenant (`atelier.mindscrollers.com/<slug>/*`) →
 *     `${MARKETING_URL}/${pathSlug}`. The `/barber` showcase resolves to
 *     `/barber` (its `pathSlug`), never `/__demo__` (its data slug).
 */
export async function tenantSiteUrl(): Promise<string> {
  const slug = getCurrentTenant();
  if (!slug) return SITE_URL;
  const hdrs = await headers();
  if (hdrs.get("x-atelier-host-mode") === "1") {
    const proto = hdrs.get("x-forwarded-proto") || "https";
    const host = hdrs.get("host");
    return host ? `${proto}://${host}` : SITE_URL;
  }
  // Canonical override per docs/adr/0001-demo-indexability.md: the
  // built-in showcase has two URL forms (/barber and /__demo__) backed by
  // the same data slug __demo__. We pick /barber as the canonical of
  // record so direct hits on /__demo__ still emit canonical, OG, sitemap,
  // and JSON-LD URLs that point at the user-facing form.
  const requestedPathSlug = getTenantPath() || slug;
  const pathSlug = slug === "__demo__" ? "barber" : requestedPathSlug;
  const root = (
    process.env.MARKETING_URL ||
    process.env.PUBLIC_BASE_URL ||
    "https://atelier.mindscrollers.com"
  ).replace(/\/$/, "");
  return `${root}/${pathSlug}`;
}
