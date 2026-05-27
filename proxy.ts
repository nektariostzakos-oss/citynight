// Custom-domain rewrite proxy (Phase D).
//
// Next 16 renamed the `middleware` file convention to `proxy`. Same
// runtime semantics — exported function intercepts requests before
// they hit the matched route segments.
//
// When a request arrives with Host = an owner-configured custom_domain
// (e.g. edenrestaurant.gr), we look the venue up and rewrite to its
// canonical citynight path. URL bar stays on the custom domain; rendered
// page IS the venue. /menu, /book, /about, /gallery all map through.
//
// Requires Node runtime because lib/custom-domain.ts uses better-sqlite3.
// Hostinger Cloud serves citynight on Node anyway, so this is free.

import { NextRequest, NextResponse } from 'next/server';
import { lookupVenueByHost, isCitynightHost, normaliseHost } from './lib/custom-domain';

export const config = {
  // Exclude Next internals, API routes, and static assets. We only want to
  // intercept top-level pages — APIs should hit citynight directly.
  matcher: ['/((?!_next/|api/|favicon\\.ico|robots\\.txt|sitemap\\.xml|.*\\.[a-zA-Z0-9]+$).*)'],
};

const DEFAULT_LOCALE = 'el'; // matches lib/i18n.ts DEFAULT_LOCALE

export function proxy(req: NextRequest) {
  const rawHost = req.headers.get('host');
  const host = rawHost ? normaliseHost(rawHost) : null;
  if (!host || isCitynightHost(host)) return NextResponse.next();

  const target = lookupVenueByHost(host);
  if (!target) {
    // Unknown host pointing at our server: let the request through to a
    // normal 404 rather than serving someone else's venue accidentally.
    return NextResponse.next();
  }

  const incomingPath = req.nextUrl.pathname.replace(/\/$/, '') || '/';

  // Custom-domain rewrites all go through the new canonical URL shape
  // /[locale]/cities/{city}/{slug}. Visitor sees the custom domain in the
  // browser; we render the site under its citynight surface.
  let rewritePath: string;
  if (target.kind === 'site') {
    if (!target.citySlug) {
      // Site without a city_slug — fallback URL doesn't exist in the new
      // tree. Skip rewrite so the request 404s rather than rendering wrong.
      return NextResponse.next();
    }
    rewritePath = `/${DEFAULT_LOCALE}/cities/${target.citySlug}/${target.slug}${incomingPath === '/' ? '' : incomingPath}`;
  } else {
    // Directory venue custom domain → 301 in-page redirect handler now
    // moves them to /[locale]/cities/{city}/{slug}. Middleware just hits
    // the legacy URL; the page redirects.
    rewritePath = `/${DEFAULT_LOCALE}/greece/${target.citySlug}/${target.bucketSlug}/${target.venueSlug}${incomingPath === '/' ? '' : incomingPath}`;
  }

  const url = req.nextUrl.clone();
  url.pathname = rewritePath;
  const res = NextResponse.rewrite(url);
  res.headers.set('x-custom-domain', host);
  return res;
}
