import type { NextConfig } from "next";
import path from "path";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Optional URL prefix. When this app is mounted under a sub-path (e.g.
 * /demo on the atelier bundle), set NEXT_BASE_PATH=/demo. Customers running
 * this template standalone leave it unset and serve at root. Same source.
 */
const BASE_PATH = process.env.NEXT_BASE_PATH || "";

/**
 * SaaS bundle: the demo runs at root (no basePath, so tenant page URLs stay
 * pretty at `/<slug>/*`), but its static assets need a fixed namespace so they
 * don't collide with the marketing app's `/_next/*`. `NEXT_ASSET_PREFIX=/_t`
 * makes Next emit asset URLs as `/_t/_next/*`; server.js strips `/_t` before
 * handing the request to this app. Customers building the standalone ZIP never
 * set it, so their template serves assets from `/_next/*` as before.
 */
const ASSET_PREFIX = process.env.NEXT_ASSET_PREFIX || "";

/**
 * Content-Security-Policy.
 *
 * Dev: includes 'unsafe-eval' because Next.js / Turbopack HMR evaluates
 * string modules at runtime. Prod: drops 'unsafe-eval' for real protection.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://js.stripe.com https://*.js.stripe.com${isDev ? " 'unsafe-eval' blob:" : ""}`,
  "worker-src 'self' blob:",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https: http:",
  "media-src 'self' https: blob: data:",
  "connect-src 'self' ws: wss: https:",
  "frame-src 'self' https://js.stripe.com https://*.js.stripe.com https://hooks.stripe.com https://www.youtube-nocookie.com https://www.youtube.com https://player.vimeo.com",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(self), interest-cohort=()",
  },
  ...(isDev
    ? []
    : [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]),
];

const nextConfig: NextConfig = {
  ...(BASE_PATH ? { basePath: BASE_PATH, assetPrefix: BASE_PATH } : {}),
  ...(!BASE_PATH && ASSET_PREFIX ? { assetPrefix: ASSET_PREFIX } : {}),
  // Build output dir. Overridable via env so a second local dev server (the
  // customer first-run preview, scripts/dev-template-preview.mjs) can run from
  // this same folder without sharing .next with the bundled demo. Customers
  // leave it unset and build to the default ".next".
  distDir: process.env.NEXT_DIST_DIR || ".next",
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  generateEtags: true,
  // No `output: "standalone"`: the bundle runs both apps via server.js
  // (programmatic Next), and the customer template runs `next start` — and
  // `next start` is incompatible with standalone output. Neither path uses
  // the .next/standalone/ server.
  // Pin Turbopack to the npm workspace root (one level up). Without this,
  // Next 16 can't decide which package.json to use as workspace root and
  // refuses to resolve hoisted deps like `next` from the parent
  // node_modules. import.meta.dirname needs Node 20.11+ (matches engines).
  turbopack: {
    root: path.resolve(import.meta.dirname, ".."),
  },
  images: {
    // The optimizer is skipped in two cases:
    //  - Dev: the sandbox can't reach external hosts (TypeError: fetch failed).
    //  - SaaS bundle (ASSET_PREFIX set): the demo shares a port with the
    //    marketing app. Next does NOT apply assetPrefix to the /_next/image
    //    endpoint, so an optimized tenant image is routed to the marketing
    //    app, which has no such file (404). Uploads are already resized to
    //    their placement width and stored as WebP by the upload pipeline, so
    //    optimizing again is redundant — serving the file directly is correct
    //    AND lighter on the server.
    // A customer's standalone template (no ASSET_PREFIX) keeps the optimizer.
    unoptimized: isDev || !!ASSET_PREFIX,
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "source.unsplash.com" },
    ],
  },
  experimental: {
    optimizePackageImports: ["framer-motion"],
  },
  // sharp is a native module (used by the upload route to resize / WebP every
  // image server-side); keep it external so Next never tries to bundle it.
  serverExternalPackages: ["sharp"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        // Admin / setup / API responses must never sit in browser or
        // proxy caches — prevents back-button access after logout and
        // stale auth-gated JSON.
        source: "/:path(admin|admin/.*|setup|api/.*)",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, private" },
          { key: "Pragma", value: "no-cache" },
        ],
      },
      {
        // Uploads are content-hashed (the filename is a fingerprint of the
        // processed bytes) and resized once at upload time, so they are
        // safe to cache permanently. An edit produces a new filename.
        source: "/uploads/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/:all*(jpg|jpeg|png|webp|avif|gif|ico|woff2)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=604800, stale-while-revalidate=86400",
          },
        ],
      },
      {
        source: "/:all*.svg",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=300, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
