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
  },
  images: {
    // Google Places photo URLs are short-lived; we cache them in DB and serve directly.
    // Allow common Google photo CDN hostnames.
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'places.googleapis.com' },
      { protocol: 'https', hostname: 'maps.googleapis.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'images.pexels.com' },
      { protocol: 'https', hostname: 'upload.wikimedia.org' },
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'fastly.picsum.photos' },
    ],
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
      // Static assets are immutable via the framework's own hashing.
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
};

const withMDX = createMDX({});
export default withBundleAnalyzer(withMDX(nextConfig));
