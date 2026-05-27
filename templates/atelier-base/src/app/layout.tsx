import type { Metadata, Viewport } from "next";
import { Geist, Inter, Manrope, Playfair_Display, Cormorant_Garamond, Fraunces, Bricolage_Grotesque } from "next/font/google";
import "./globals.css";
import Nav from "./components/Nav";
import Footer from "./components/Footer";
import { LangProvider } from "../lib/i18n";
import { loadEnabledLanguages, detectLang } from "../lib/i18nServer";
import { ThemeProvider, themeBootScript, themeBootScriptForceDark } from "../lib/theme";
import { EditorProvider } from "../lib/editorClient";
import { CartProvider } from "../lib/cartClient";
import { loadContent } from "../lib/content";
import { loadBranding, loadBusiness, loadNav, loadAnalytics, loadTheme, loadTypography, loadIndustryId, loadDemoShowcase, FONT_VAR } from "../lib/settings";
import { seoDefaults } from "../lib/seoDefaults";
import { BrandingProvider } from "../lib/brandingClient";
import { BusinessProvider } from "../lib/businessClient";
import { NavProvider } from "../lib/navClient";
import JsonLd from "./JsonLd";
import ChatWidgetLazy from "./components/ChatWidgetLazy";
import CookieBanner from "./components/CookieBanner";
import LazyDemoChrome from "./components/LazyDemoChrome";
import DemoBanner from "./components/DemoBanner";
import { isDemoMode, getMarketingUrl } from "../lib/demoMode";
import { getCurrentTenant, getTenantPath } from "../lib/tenantContext";
import { TenantRouterProvider } from "../lib/tenantRouter";
import TenantBanner from "./components/TenantBanner";
import SiteChrome from "./components/SiteChrome";
import ServiceWorkerRegister from "./components/ServiceWorkerRegister";
import { headers } from "next/headers";
import { tenantSiteUrl } from "../lib/tenantSiteUrl";

// next/font generates a critical-path <link rel="preload"> for every font
// declared with `preload: true`. The shipped layout has to expose seven font
// families so any of the six templates can use them, but a single tenant
// only ever uses two at a time (heading + body). The default Boulevard
// install uses Playfair + Geist, so those preload; the rest only load when
// CSS actually references them, which keeps the LCP-critical request graph
// to two woff2 files per page on the default install. Per-template-tenants
// (template5 yoga uses Bricolage + Fraunces, etc.) take a small FOUT cost
// on first visit in exchange.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
  display: "swap",
  preload: false,
});
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "latin-ext"],
  display: "swap",
  preload: false,
});
const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});
const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin", "latin-ext"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
  preload: false,
});
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin", "latin-ext"],
  display: "swap",
  preload: false,
});
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin", "latin-ext"],
  display: "swap",
  preload: false,
});
const FONT_VARS = `${geistSans.variable} ${inter.variable} ${manrope.variable} ${playfair.variable} ${cormorant.variable} ${fraunces.variable} ${bricolage.variable}`;

function isLightColor(bg: string): boolean {
  const hex = bg.trim();
  if (!hex.startsWith("#")) return false;
  const c = hex.length === 4
    ? hex.slice(1).split("").map((x) => parseInt(x + x, 16))
    : [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
  // relative luminance
  const l = 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
  return l > 160;
}

// Per-industry SEO keyword lists. Defaults fall back to the barber set if a
// template ships with an unknown industryId.
async function keywordsForIndustry(city: string): Promise<string[]> {
  const id = await loadIndustryId();
  const base = {
    barber: ["hair salon", "haircut", "barber", "beauty studio"],
    aesthetics: ["aesthetics", "facial", "hydrafacial", "dermaplaning", "microneedling", "acne treatment", "skincare studio"],
    hair: ["hair salon", "haircut", "colour", "balayage"],
    beauty: ["beauty studio", "facial", "manicure", "wax"],
  }[id] || ["hair salon", "haircut", "barber", "beauty studio"];
  return [...base, city];
}

export async function generateMetadata(): Promise<Metadata> {
  // The bundled /barber showcase is a demo, not a real client site: keep it
  // out of the index. A customer's standalone deployment (not demo mode) is
  // their real site and stays indexable. The /__demo__ tenant (the showcase's
  // data slug) is also noindex when accessed directly, so search engines never
  // index two copies of the demo.
  const demo = isDemoMode();
  const branding = await loadBranding();
  const business = await loadBusiness();
  const favicon = branding.faviconUrl; // undefined → Next uses /icon + /apple-icon generators
  const content = (await loadContent()) as Record<
    string,
    Partial<{ title_en: string; description_en: string; ogImage: string }>
  >;
  const stored = content.seo_home ?? {};
  const industryId = await loadIndustryId();
  const computed = seoDefaults("seo_home", business, industryId);
  const homeTitle = stored.title_en || computed.title_en;
  const homeDesc = stored.description_en || computed.description_en;
  // When no custom OG image is set, omit it and Next falls back to /opengraph-image generator
  const homeOg = stored.ogImage || undefined;
  // Tenant-aware canonical: `${marketing-origin}/${slug}` under the SaaS bundle,
  // SITE_URL when standalone. `metadataBase` makes every relative URL Next
  // generates (canonical "/", openGraph image paths) resolve under it.
  const siteUrl = await tenantSiteUrl();
  // Showcase tenants (the built-in /barber + the template demos at /demo2..6)
  // must NEVER be indexed, regardless of whether the request lands via /barber
  // or the bare /__demo__ slug — so noindex piggybacks on either signal.
  const tenantSlug = getCurrentTenant();
  const noindex = demo || tenantSlug === "__demo__" || tenantSlug?.startsWith("demo");
  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: homeTitle,
      template: `%s · ${business.name || "Your Salon"}`,
    },
    description: homeDesc,
    keywords: (await keywordsForIndustry(business.city || "")).filter(Boolean),
    applicationName: business.name || "Your Salon",
    authors: [{ name: business.name || "Your Salon" }],
    creator: business.name || "Your Salon",
    publisher: business.name || "Your Salon",
    alternates: {
      canonical: "/",
      languages: {
        "en-GB": "/",
        "en-US": "/",
      },
    },
    openGraph: {
      type: "website",
      locale: "en_GB",
      alternateLocale: ["en_US"],
      url: siteUrl,
      siteName: business.name || "Your Salon",
      title: homeTitle,
      description: homeDesc,
      ...(homeOg
        ? {
            images: [
              { url: homeOg, width: 1200, height: 630, alt: business.name || "Your Salon" },
            ],
          }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: homeTitle,
      description: homeDesc,
      ...(homeOg ? { images: [homeOg] } : {}),
    },
    robots: noindex
      ? { index: false, follow: false }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        },
    ...(favicon ? { icons: { icon: favicon, apple: favicon } } : {}),
    formatDetection: {
      telephone: true,
      address: true,
      email: true,
    },
    verification: {
      // add your Google Search Console token here once you have one
      // google: "XXXXXXXXXXXXXXXX",
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0706" },
    { media: "(prefers-color-scheme: light)", color: "#f5ede2" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialContent = (await loadContent()) as Record<
    string,
    Record<string, unknown>
  >;
  const initialBranding = await loadBranding();
  const initialBusiness = await loadBusiness();
  const initialNav = await loadNav();
  const enabledLanguages = await loadEnabledLanguages();
  // <html lang> tracks the visitor's active language (the atelier_lang cookie),
  // clamped to the shop's enabled set, so screen readers and search engines get
  // the locale actually being rendered. Falls back to "en". Never hardcode it.
  const htmlLang = await detectLang(undefined, enabledLanguages);
  const analytics = await loadAnalytics();
  const theme = await loadTheme();
  const typography = await loadTypography();
  const demo = isDemoMode();
  // A non-__demo__ tenant (e.g. the template2 demo) can opt into the showcase
  // banner without demo mode's force-dark / noindex behaviour.
  const showDemoBanner = demo || (await loadDemoShowcase());
  const marketingUrl = getMarketingUrl();
  // SaaS bundle: the active tenant slug (null standalone). Published on <html>
  // so the fetch shim, withBasePath(), and the click interceptor can read it.
  const tenantSlug = getCurrentTenant();
  // Subscription-lifecycle banner: server.js sets this header on a past_due /
  // unpaid tenant so the layout can show a billing-issue strip.
  const hdrs = await headers();
  const tenantBanner = hdrs.get("x-atelier-tenant-banner") || "";
  // Host mode: the tenant is served on its own subdomain / custom domain, so
  // paths are root-relative and the client must NOT prefix /<slug>. Path mode
  // serves the tenant under atelier.mindscrollers.com/<slug>, which needs the
  // prefixing shims. data-tenant drives those shims, so it is set only in
  // path mode.
  const hostMode = hdrs.get("x-atelier-host-mode") === "1";
  // data-tenant drives the URL-prefixing shims, so it carries the URL slug the
  // browser sees (the showcase shows /barber while its data slug is __demo__).
  const pathTenant = tenantSlug && !hostMode ? getTenantPath() : null;
  // The SaaS setup wizard and the admin dashboard run full-screen: the public
  // Nav + Footer are hidden on /setup and /admin so the site menu never
  // overlaps them. That gate is client-reactive (SiteChrome) so it also
  // applies on soft navigation, not just on a hard refresh.
  // Next prefixes Link/Image URLs but NOT raw fetch() calls. Emit a tiny
  // client-side shim that auto-prefixes /api/* and /admin/* fetches with the
  // tenant slug (read live from <html data-tenant>) or the legacy build-time
  // base path. Standalone customer installs have neither, so it is a no-op.
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const headingVar = FONT_VAR[typography.headingFont];
  const bodyVar = FONT_VAR[typography.bodyFont];
  const themeCss = `:root{--background:${theme.background};--foreground:${theme.foreground};--gold:${theme.primary};--gold-2:${theme.primaryAccent};--surface:${theme.surface};--surface-strong:${theme.surfaceStrong};--border:${theme.border};--border-strong:${theme.borderStrong};--muted:${theme.muted};--muted-2:${theme.muted2};--font-heading:${headingVar};--font-body:${bodyVar};}body{font-family:var(--font-body),system-ui,sans-serif;}.font-serif{font-family:var(--font-heading),Georgia,serif;}`;
  const isLight = isLightColor(theme.background);
  return (
    <html
      lang={htmlLang}
      data-scroll-behavior="smooth"
      data-theme={isLight ? "light" : "dark"}
      data-tenant={pathTenant || undefined}
      suppressHydrationWarning
      className={`${FONT_VARS} h-full antialiased${isLight ? " light" : ""}`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var BP="${basePath}";if(window.__atelierBaseFetch)return;window.__atelierBaseFetch=true;var of=window.fetch;function pfx(){var s=document.documentElement.dataset.tenant;return s?"/"+s:BP;}function shouldPrefix(u,p){return typeof u==="string"&&u.length>0&&u.charCodeAt(0)===47&&u.charCodeAt(1)!==47&&!u.startsWith(p+"/")&&!u.startsWith("/api/saas/")&&(u.startsWith("/api/")||u.startsWith("/admin/")||u==="/api"||u==="/admin");}window.fetch=function(input,init){try{var p=pfx();if(p){if(typeof input==="string"){if(shouldPrefix(input,p))input=p+input;}else if(input&&typeof input.url==="string"&&shouldPrefix(input.url,p)){input=new Request(p+input.url,input);}}}catch(e){}return of.call(this,input,init);};})();`,
          }}
        />
        <link rel="preconnect" href="https://images.unsplash.com" crossOrigin="" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="alternate" type="application/rss+xml" title={`${initialBusiness.name || "Your Salon"} Blog · RSS`} href="/blog/rss.xml" />
        <style dangerouslySetInnerHTML={{ __html: themeCss }} />
        <script dangerouslySetInnerHTML={{ __html: demo ? themeBootScriptForceDark : themeBootScript }} />
        <JsonLd />
        {/* Analytics scripts are consent-gated: they only run after the user
            picks "Accept all" in the cookie banner. The banner stores its
            choice in localStorage["atelier_cookie_consent_v1"] and fires a
            'atelier-consent-changed' event so these blocks pick it up live. */}
        {(analytics.gtm || analytics.ga4 || analytics.metaPixel) && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
(function(){
  function hasConsent() {
    try { return localStorage.getItem("atelier_cookie_consent_v1") === "all"; } catch(e) { return false; }
  }
  function load() {
    if (!hasConsent()) return;
    if (window.__atelierAnalyticsLoaded) return;
    window.__atelierAnalyticsLoaded = true;
    ${analytics.gtm ? `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${analytics.gtm}');` : ""}
    ${analytics.ga4 ? `var ga=document.createElement('script');ga.async=true;ga.src='https://www.googletagmanager.com/gtag/js?id=${analytics.ga4}';document.head.appendChild(ga);window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${analytics.ga4}');` : ""}
    ${analytics.metaPixel ? `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${analytics.metaPixel}');fbq('track','PageView');` : ""}
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", load);
  else load();
  window.addEventListener("atelier-consent-changed", load);
})();
              `,
            }}
          />
        )}
      </head>
      <body
        className={`flex min-h-full flex-col overflow-x-hidden${showDemoBanner ? " demo-mode" : ""}`}
        style={{
          background: "var(--background)",
          color: "var(--foreground)",
        }}
      >
        {analytics.gtm && (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${analytics.gtm}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
            />
          </noscript>
        )}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-full focus:px-4 focus:py-2 focus:text-xs focus:font-semibold focus:uppercase focus:tracking-widest"
          style={{ background: "var(--gold)", color: "var(--background)" }}
        >
          Skip to content
        </a>
        {/* No MotionConfig: each motion component (Hero badge, ScrollProgress,
            Reveal-class effects across the demo) calls useReducedMotion locally,
            so the framer-motion runtime can stay out of the providers tree. */}
        <ThemeProvider>
          <LangProvider enabled={enabledLanguages}>
            <BrandingProvider initial={initialBranding}>
              <BusinessProvider initial={initialBusiness}>
                <NavProvider initial={initialNav}>
                  <EditorProvider initialContent={initialContent}>
                    <CartProvider>
                      {pathTenant && <TenantRouterProvider />}
                      {tenantBanner && <TenantBanner kind={tenantBanner} />}
                      {showDemoBanner && <DemoBanner marketingUrl={marketingUrl} />}
                      <SiteChrome
                        tenantMode={!!pathTenant}
                        nav={<Nav demoBannerOn={showDemoBanner} />}
                        footer={<Footer />}
                      >
                        <div id="main-content" className="flex-1">{children}</div>
                      </SiteChrome>
                      <ServiceWorkerRegister />
                      <ChatWidgetLazy />
                      <CookieBanner />
                      {/* EditorPanel, CartSidebar, StickyBookBar,
                          PageTracker are all post-paint chrome — none of
                          them is the LCP element or visible at first
                          paint. LazyDemoChrome dynamic-imports each via
                          ssr:false so their React trees + framer-motion
                          dependencies stay out of the initial route
                          bundle. */}
                      <LazyDemoChrome />
                    </CartProvider>
                  </EditorProvider>
                </NavProvider>
              </BusinessProvider>
            </BrandingProvider>
          </LangProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
