"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { clientPath, tenantRelativePath } from "../../lib/basePath";

function sid(): string {
  try {
    const k = "atelier_sid";
    let s = localStorage.getItem(k);
    if (!s) {
      s = Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(k, s);
    }
    return s;
  } catch {
    return "";
  }
}

export default function PageTracker() {
  // Tenant-relative: skip admin/setup correctly and record the same path a
  // standalone install would, regardless of the /<slug> mount prefix.
  const pathname = tenantRelativePath(usePathname());
  useEffect(() => {
    if (!pathname) return;
    if (pathname.startsWith("/admin") || pathname.startsWith("/setup")) return;
    const payload = JSON.stringify({
      path: pathname,
      ref: document.referrer || "",
      lang: document.documentElement.lang || navigator.language || "",
      sid: sid(),
    });
    // sendBeacon bypasses the layout's fetch shim, so prefix explicitly.
    // clientPath() adds the live tenant /<slug> (and falls back to the legacy
    // base path) — withBasePath() alone misses the SaaS tenant prefix, so
    // page views 404 against the marketing app instead of recording.
    const trackUrl = clientPath("/api/track");
    try {
      const blob = new Blob([payload], { type: "application/json" });
      if (navigator.sendBeacon) {
        navigator.sendBeacon(trackUrl, blob);
        return;
      }
    } catch {}
    fetch(trackUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);
  return null;
}
