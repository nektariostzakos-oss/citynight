"use client";

import { useEffect } from "react";
import { clientPath } from "../../lib/basePath";

/**
 * Registers the service worker so the site is installable as a PWA and can
 * receive Web Push.
 *
 * `clientPath("/sw.js")` is the client-only, tenant-aware path helper. It
 * resolves to:
 *   - `/sw.js`        on a standalone customer install (scope `/`)
 *   - `/<slug>/sw.js` on a SaaS tenant site (scope `/<slug>/`), read live
 *     from `<html data-tenant>`
 * Script path and scope share the same `/<slug>/` directory, so no
 * `Service-Worker-Allowed` header is needed. Using `clientPath` (not
 * `withBasePath`) is safe here because registration runs in `useEffect`,
 * outside React render — exactly its documented use.
 *
 * Render-free, mounted once in the layout. Guarded so a browser without
 * service worker support is a clean no-op.
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }
    const swUrl = clientPath("/sw.js");
    navigator.serviceWorker.register(swUrl).catch(() => {
      /* registration failure must not affect the page */
    });
  }, []);

  return null;
}
