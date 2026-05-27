import type { MetadataRoute } from "next";
import { loadBusiness, loadBranding, loadMobileApp } from "../lib/settings";
import { getTenantPath } from "../lib/tenantContext";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const [business, branding, mobileApp] = await Promise.all([
    loadBusiness(),
    loadBranding(),
    loadMobileApp(),
  ]);
  const name = mobileApp.appName || branding.wordmark || business.name || "Your Salon";
  const shortName = mobileApp.launcherName || name.slice(0, 12);
  const description =
    branding.tagline_en || `${name} — book appointments and shop online.`;
  // Under the SaaS bundle the site is mounted at /<slug>; prefix the start_url
  // and every icon path so they resolve. Standalone (no tenant) the prefix is
  // empty and paths stay root-relative.
  const slug = getTenantPath();
  const prefix = slug ? `/${slug}` : "";
  const prefixed = (p: string) =>
    p.startsWith("/") && !p.startsWith("//") ? prefix + p : p;

  // Install icons. A browser will only offer "Install app" when the manifest
  // carries a 192px and a 512px icon, and PWABuilder additionally requires a
  // maskable variant for Android adaptive icons. The optional monochrome icon
  // unlocks themed icons on Android 13+ and is included only when the owner
  // has uploaded one.
  const icons: MetadataRoute.Manifest["icons"] = [
    {
      src: prefixed("/icon-pwa?s=192"),
      sizes: "192x192",
      type: "image/png",
      purpose: "any",
    },
    {
      src: prefixed("/icon-pwa?s=512"),
      sizes: "512x512",
      type: "image/png",
      purpose: "any",
    },
    {
      src: prefixed(mobileApp.maskableIconUrl || "/icon-pwa?s=512"),
      sizes: "512x512",
      type: "image/png",
      purpose: "maskable",
    },
  ];
  if (mobileApp.monochromeIconUrl) {
    icons.push({
      src: prefixed(mobileApp.monochromeIconUrl),
      sizes: "512x512",
      type: "image/png",
      purpose: "monochrome",
    });
  }

  return {
    name,
    short_name: shortName,
    description,
    start_url: `${prefix}/`,
    scope: `${prefix}/`,
    id: `${prefix}/`,
    display: "standalone",
    background_color: mobileApp.backgroundColor || "#0a0806",
    theme_color: mobileApp.themeColor || "#c9a961",
    orientation: "portrait",
    lang: "en",
    icons,
    // App shortcuts surface the most common destinations from the launcher's
    // long-press menu and feed PWABuilder's shortcut list during a build.
    shortcuts: [
      {
        name: "Book now",
        short_name: "Book",
        url: prefixed("/book"),
        icons: [{ src: prefixed("/icon-pwa?s=192"), sizes: "192x192" }],
      },
      {
        name: "Shop",
        short_name: "Shop",
        url: prefixed("/shop"),
        icons: [{ src: prefixed("/icon-pwa?s=192"), sizes: "192x192" }],
      },
    ],
  };
}
