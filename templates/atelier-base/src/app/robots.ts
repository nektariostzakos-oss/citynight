import type { MetadataRoute } from "next";
import { getCurrentTenant } from "../lib/tenantContext";
import { tenantSiteUrl } from "../lib/tenantSiteUrl";

// Per-request: the SaaS bundle resolves `/barber/robots.txt` and
// `/<slug>/robots.txt` to this same module under different tenant contexts,
// so the rules + host must rerun for each. Standalone customer ZIPs see the
// same context on every hit, so the per-request cost is negligible.
export const dynamic = "force-dynamic";

const AI_CRAWLERS = [
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "ClaudeBot",
  "Claude-Web",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "Bytespider",
  "CCBot",
  "Meta-ExternalAgent",
  "DuckAssistBot",
  "Amazonbot",
  "cohere-ai",
  "FacebookBot",
  "YouBot",
];

const DEMO_SLUGS = new Set(["__demo__", "demo2", "demo3", "demo4", "demo5", "demo6"]);

/**
 * Per-tenant robots.
 *
 * Behaviour:
 *  - Standalone customer ZIP (no tenant context): the site is the customer's
 *    real site. Allow `/`, block the admin / api / cart / setup surfaces.
 *  - SaaS tenant (path or host mode): the tenant's content lives under its
 *    own origin (resolved by `tenantSiteUrl()`), so paths in this file are
 *    relative to that origin. Same `Disallow` set as standalone — `/admin` and
 *    friends always need to stay out of the index.
 *  - Built-in showcase tenants (`__demo__` and `demo2..demo6`) in production:
 *    emit `Disallow: /` for every crawler. The /barber alias is already
 *    `noindex` via the layout's `robots` metadata; this is the belt to that
 *    metadata's braces, and it explicitly stops `/__demo__` direct hits from
 *    being indexed too. In development we leave the showcase indexable so
 *    smoke tests don't have to special-case it.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const site = await tenantSiteUrl();
  const slug = getCurrentTenant();
  const isShowcase = slug != null && DEMO_SLUGS.has(slug);
  const blockEverything =
    isShowcase && process.env.NODE_ENV === "production";

  if (blockEverything) {
    return {
      rules: [{ userAgent: "*", disallow: "/" }],
      sitemap: `${site}/sitemap.xml`,
      host: site,
    };
  }

  const disallow = ["/admin", "/api", "/cart", "/setup"];

  return {
    rules: [
      { userAgent: "*", allow: "/", disallow },
      ...AI_CRAWLERS.map((ua) => ({ userAgent: ua, allow: "/", disallow })),
    ],
    sitemap: [`${site}/sitemap.xml`, `${site}/llms.txt`],
    host: site,
  };
}
