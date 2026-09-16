import createMDX from '@next/mdx';
import createBundleAnalyzer from '@next/bundle-analyzer';

// Bundle analyzer opt-in via `ANALYZE=1 npm run build`. Generates HTML
// reports at .next/analyze/{client,nodejs,edge}.html. Off by default.
const withBundleAnalyzer = createBundleAnalyzer({ enabled: process.env.ANALYZE === '1' });

/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ['ts', 'tsx', 'mdx'],
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    // ISR cache lives in .next/cache and must persist between requests on Hostinger.
    // No worker queues; revalidation is on schedule + on owner edits.
    //
    // Build-time only. `next build` runs ON the Hostinger host (docs/DEPLOYMENT.md):
    // Next forks (logical CPUs - 1) static-generation worker processes by default,
    // ~23 on that node, ~10 threads each, against the account's 200 "Max Processes"
    // cap, which is CloudLinux NPROC and counts every thread of every site on the
    // account. One worker keeps a deploy from 503-ing everything; the build is
    // slower and nobody is waiting on it. scripts/hostinger-build.mjs caps
    // Turbopack/swc the same way.
    cpus: 1,
  },
  // Normalize trailing slashes: /en/greece/athens/  → /en/greece/athens.
  // Next 15 default is `false` already; making it explicit + documented.
  trailingSlash: false,

  // Permanent (301) cosmetic redirects. Old IETF-style locales (/el-GR/...)
  // → bare 2-letter locale; double-locale typos collapse cleanly.
  async redirects() {
    return [
      // /el-GR/anything → /el/anything (and the same for the other 4 locales)
      { source: '/el-GR/:path*', destination: '/el/:path*', permanent: true },
      { source: '/el-gr/:path*', destination: '/el/:path*', permanent: true },
      { source: '/en-US/:path*', destination: '/en/:path*', permanent: true },
      { source: '/en-us/:path*', destination: '/en/:path*', permanent: true },
      { source: '/de-DE/:path*', destination: '/de/:path*', permanent: true },
      { source: '/de-de/:path*', destination: '/de/:path*', permanent: true },
      { source: '/fr-FR/:path*', destination: '/fr/:path*', permanent: true },
      { source: '/fr-fr/:path*', destination: '/fr/:path*', permanent: true },
      { source: '/it-IT/:path*', destination: '/it/:path*', permanent: true },
      { source: '/it-it/:path*', destination: '/it/:path*', permanent: true },
      // Pre-launch path shape some early drafts used: /greece/... → /en/greece/...
      { source: '/greece/:path*', destination: '/en/greece/:path*', permanent: true },
    ];
  },

  images: {
    // Guide business cards pull photos from each venue's own website or
    // Facebook CDN. Hostnames are unpredictable (thousands of small-
    // business sites + dozens of FB CDN buckets), so the allowlist used to be
    // a wildcard (`hostname: '**'`). Two problems with that on this host:
    //   1. `/_next/image?url=https://anything` was an OPEN image proxy: any
    //      URL on the internet, fetched and re-encoded by our server on
    //      demand, with the result written to .next/cache/images. Anyone
    //      could use citynight.gr as a free resizer or fill the disk.
    //   2. Every unique photo cost a sharp decode + WebP encode on a shared
    //      Hostinger box whose CPU and thread budget every site shares.
    // The seed pipeline only stores URLs it has byte-probed as images, so the
    // browser can load them straight from the source; Cloudflare in front can
    // Polish/resize at the edge if that is ever wanted. Optimizer off.
    unoptimized: true,
  },
  async headers() {
    // ISR + Cloudflare caching contract — public routes carry explicit
    // s-maxage + stale-while-revalidate that match the per-page revalidate
    // window. Cloudflare caches at the edge, Hostinger origin serves the
    // SWR refresh. /api, /dashboard, /claim, /auth never cache (default
    // Cache-Control on the route handler still applies; the security
    // headers here are about cross-origin / XSS / clickjacking).
    const security = [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
    ];
    return [
      // Default: security headers, NO cache directive (let route segments decide).
      { source: '/:path*', headers: security },

      // Locale roots + index — 30 min edge cache, 1 day SWR.
      {
        source: '/:locale(en|el|de|fr|it)',
        headers: [
          ...security,
          { key: 'Cache-Control', value: 'public, s-maxage=1800, stale-while-revalidate=86400' },
        ],
      },
      {
        source: '/:locale(en|el|de|fr|it)/greece',
        headers: [
          ...security,
          { key: 'Cache-Control', value: 'public, s-maxage=3600, stale-while-revalidate=86400' },
        ],
      },
      // City pages — 1h s-maxage, 1d SWR.
      {
        source: '/:locale(en|el|de|fr|it)/greece/:city',
        headers: [
          ...security,
          { key: 'Cache-Control', value: 'public, s-maxage=3600, stale-while-revalidate=86400' },
        ],
      },
      // Venue pages — 6h s-maxage, 1d SWR.
      {
        source: '/:locale(en|el|de|fr|it)/greece/:city/:bucket/:venue',
        headers: [
          ...security,
          { key: 'Cache-Control', value: 'public, s-maxage=21600, stale-while-revalidate=86400' },
        ],
      },
      // Guides — 1d s-maxage, 7d SWR.
      {
        source: '/:locale(en|el|de|fr|it)/guides/:slug*',
        headers: [
          ...security,
          { key: 'Cache-Control', value: 'public, s-maxage=86400, stale-while-revalidate=604800' },
        ],
      },
      // Next.js sets immutable Cache-Control on /_next/static/* itself
      // (max-age=31536000, immutable) — no override needed here.
    ];
  },
};

const withMDX = createMDX({});
export default withBundleAnalyzer(withMDX(nextConfig));
