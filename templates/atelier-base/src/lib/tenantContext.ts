/**
 * Per-request tenant context for the SaaS multi-tenant bundle.
 *
 * When the demo source runs as a tenant site inside the Atelier bundle,
 * server.js wraps every request handler in `tenantStorage.run({ slug }, ...)`.
 * Server code then reads the active slug with `getCurrentTenant()` and resolves
 * its data folder under `data/tenants/<slug>/`.
 *
 * Standalone (a customer's downloaded ZIP) there is no wrapper: the ALS is
 * empty, `getCurrentTenant()` returns null, and every data path falls back to
 * today's single-site behavior. No SaaS code path is active.
 */
import { AsyncLocalStorage } from "node:async_hooks";

/**
 * `slug` is the DATA slug — selects `data/tenants/<slug>/`. `pathSlug` is the
 * URL slug the browser sees, used for client-side link / redirect / fetch
 * prefixing. They are identical for every real tenant; they differ only for
 * the built-in showcase, whose data slug is `__demo__` but whose public URL
 * stays `/barber`. When `pathSlug` is absent it falls back to `slug`.
 */
export type TenantContext = {
  slug: string;
  pathSlug?: string;
  /**
   * Per-tenant relay secret used to authenticate against the marketing app's
   * /api/relay/send endpoint when "Use Atelier email" is enabled. Server.js
   * looks the secret up from the tenant registry once per request and stamps
   * it into the ALS store so the demo runtime can read it without a
   * disallowed cross-app import.
   */
  relaySecret?: string;
};

declare global {
  var __atelierTenantStorage: AsyncLocalStorage<TenantContext> | undefined;
}

/**
 * Shared across the process. Stored on globalThis so that server.js (CommonJS)
 * and the Next app (ESM, possibly a separate module graph) see the same store.
 */
export const tenantStorage: AsyncLocalStorage<TenantContext> =
  (globalThis.__atelierTenantStorage ??=
    new AsyncLocalStorage<TenantContext>());

/**
 * The slug of the tenant serving the current request, or null when there is
 * none (customer ZIP standalone, or a marketing-side call). Synchronous so the
 * 38 `path.join(getAppRoot(), "data", ...)` call sites stay unchanged.
 */
export function getCurrentTenant(): string | null {
  const ctx = tenantStorage.getStore();
  return ctx?.slug ?? null;
}

/**
 * The URL-path slug of the current tenant — the slug shown in the address bar.
 * Use this for anything that builds a tenant URL (link/redirect/fetch
 * prefixes, cookie path). Equals `getCurrentTenant()` for every real tenant;
 * differs only for the built-in showcase (`__demo__` data, `/barber` URL).
 */
export function getTenantPath(): string | null {
  const ctx = tenantStorage.getStore();
  return ctx?.pathSlug ?? ctx?.slug ?? null;
}

/** Run `fn` with the given tenant slug bound as the active context. */
export function withTenant<T>(slug: string, fn: () => T): T {
  return tenantStorage.run({ slug }, fn);
}

/**
 * The relay secret for the current tenant, or null when unset. Returned only
 * to in-process callers; never serialized to the browser. server.js attaches
 * it to the ALS store at the start of every tenant request.
 */
export function getCurrentTenantSecret(): string | null {
  const ctx = tenantStorage.getStore();
  return ctx?.relaySecret ?? null;
}

/**
 * URL path a per-tenant session cookie must be scoped to. Scoping the cookie
 * to `/<slug>` keeps one tenant's admin session from being sent to another
 * tenant's `/admin`. Standalone installs get `/` (today's behavior).
 */
export function tenantCookiePath(): string {
  const slug = getTenantPath();
  return slug ? `/${slug}` : "/";
}
