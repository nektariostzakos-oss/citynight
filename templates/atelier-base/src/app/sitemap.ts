import type { MetadataRoute } from "next";
import { listProducts } from "../lib/products";
import { listPages } from "../lib/pages";
import { tenantSiteUrl } from "../lib/tenantSiteUrl";

// Per-request: the URL prefix and the product/blog lists are all
// tenant-scoped, so the sitemap must rerun on every request rather than be
// frozen at build time. The customer ZIP still emits the same content on
// every request (its content rarely changes), but the per-request render
// keeps it correct when an admin adds a product.
export const dynamic = "force-dynamic";

/**
 * Per-tenant sitemap.
 *
 * The SaaS bundle resolves `/<slug>/sitemap.xml` (and `/barber/sitemap.xml`)
 * through the demo handler under tenant ALS, so `tenantSiteUrl()` returns the
 * tenant's full origin including the `/<slug>` path prefix. The customer ZIP
 * has no tenant context — `tenantSiteUrl()` falls back to `SITE_URL`, so the
 * standalone install emits the same root-relative sitemap it always has.
 *
 * Product / blog entries are pulled from the tenant's own JSON, so two tenants
 * with different shop catalogues each get their own list. Neither tenant's
 * URLs ever leak into the other's sitemap.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const base = await tenantSiteUrl();
  const staticPages: MetadataRoute.Sitemap = [
    "",
    "/services",
    "/shop",
    "/gallery",
    "/about",
    "/contact",
    "/book",
    "/blog",
    "/privacy",
    "/terms",
  ].map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : path === "/book" ? 0.9 : 0.7,
  }));

  let products: MetadataRoute.Sitemap = [];
  try {
    const list = await listProducts();
    products = list.map((p) => ({
        url: `${base}/shop/${p.slug}`,
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      }));
  } catch {
    // products file may be empty on first deploy; skip
  }

  let posts: MetadataRoute.Sitemap = [];
  try {
    const list = await listPages("post");
    posts = list
      .filter((p) => p.published)
      .map((p) => ({
        url: `${base}/blog/${p.slug}`,
        lastModified: p.updatedAt ? new Date(p.updatedAt) : now,
        changeFrequency: "monthly" as const,
        priority: 0.6,
      }));
  } catch {
    // pages file may be empty on first deploy; skip
  }

  return [...staticPages, ...products, ...posts];
}
