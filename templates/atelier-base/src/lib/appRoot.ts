import path from "node:path";
import { getCurrentTenant } from "./tenantContext";

/**
 * Filesystem root this app reads `data/` and `public/uploads/` from.
 *
 * Standalone (a customer's install): the process working directory, the app
 * root. Every `path.join(getAppRoot(), "data", X)` resolves to `<cwd>/data/X`.
 *
 * SaaS bundle: when a tenant is in context, the root becomes
 * `<cwd>/data/tenants/<slug>/_root`, so the SAME `path.join(root, "data", X)`
 * shape resolves to `<cwd>/data/tenants/<slug>/_root/data/X` — a fully isolated
 * per-tenant data + uploads tree. The extra `_root` segment exists purely so
 * the 38 callers' `<root>/data/<file>` contract holds without editing any of
 * them. With no tenant in context the function returns the bare cwd, so the
 * customer ZIP is unaffected and no SaaS path is active.
 *
 * `ATELIER_DEMO_ROOT` is still honored as the base for older bundles / tests.
 */
export function getAppRoot(): string {
  const slug = getCurrentTenant();
  if (slug) {
    // Tenant data lives under the BUNDLE root's data/tenants/, which is not
    // the same as the demo app's own root (getBaseRoot, = demo/). server.js
    // publishes the bundle root as ATELIER_TENANTS_ROOT.
    const tenantsRoot = process.env.ATELIER_TENANTS_ROOT || process.cwd();
    return path.join(tenantsRoot, "data", "tenants", slug, "_root");
  }
  return getBaseRoot();
}

/**
 * App-global root, never tenant-scoped. Use this for files that are part of
 * the deployed application rather than a tenant's data: `package.json`, the
 * read-only `demos/` seed content. `data/` and `public/uploads/` callers must
 * use `getAppRoot()` so they stay per-tenant.
 *
 * IMPORTANT: callers must read this lazily (inside the function that needs it),
 * never cache it in a module-level constant — under SaaS the tenant context is
 * only known per request.
 */
export function getBaseRoot(): string {
  return process.env.ATELIER_DEMO_ROOT || process.cwd();
}
