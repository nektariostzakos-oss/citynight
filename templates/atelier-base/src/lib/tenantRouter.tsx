"use client";

/**
 * Tenant-aware navigation for the SaaS bundle.
 *
 * A tenant site is served at `/<slug>/*`, but the demo source has no basePath:
 * its `<Link href="/services">` and `router.push("/services")` calls are all
 * root-relative. This provider installs a single document-level click handler
 * that catches internal `<a>` navigations and re-issues them through the Next
 * router with the `/<slug>` prefix, so the address bar stays under the tenant
 * path. server.js strips the slug again before the demo renders the route.
 *
 * Mounted by the demo layout ONLY when `<html data-tenant>` is set. Standalone
 * customer installs never render it, so this code path is dead there.
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";

function tenantSlug(): string | null {
  if (typeof document === "undefined") return null;
  return document.documentElement.dataset.tenant || null;
}

export function TenantRouterProvider() {
  const router = useRouter();

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented) return;
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
        return;
      const slug = tenantSlug();
      if (!slug) return;

      let el = e.target as HTMLElement | null;
      while (el && el.tagName !== "A") el = el.parentElement;
      const a = el as HTMLAnchorElement | null;
      if (!a) return;

      const href = a.getAttribute("href");
      if (!href || !href.startsWith("/") || href.startsWith("//")) return;
      if (a.target && a.target !== "_self") return;
      if (a.hasAttribute("download")) return;
      if (a.getAttribute("rel")?.includes("external")) return;

      // Already prefixed, or an asset path that must not be rewritten.
      if (href === `/${slug}` || href.startsWith(`/${slug}/`)) return;
      if (href.startsWith("/_next/") || href.startsWith("/_t/")) return;

      e.preventDefault();
      router.push(`/${slug}${href}`);
    }

    document.addEventListener("click", onClick, { capture: true });
    return () =>
      document.removeEventListener("click", onClick, { capture: true });
  }, [router]);

  return null;
}
