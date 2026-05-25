// Defence-in-depth CSRF protection for state-changing routes.
//
// Primary protection is the session cookie's SameSite=Lax + httpOnly
// attributes (set in lib/auth/session.ts) — modern browsers won't forward
// our session cookie on a cross-site POST, so an attacker page can't make
// the user's browser PATCH on their behalf.
//
// This module adds a second check: the Origin header must match the site's
// own origin. Browsers always send Origin on POST/PATCH/DELETE; an attacker
// page cannot forge it. Skipping the check on GET (idempotent reads).

import 'server-only';
import type { NextRequest } from 'next/server';

function siteOrigin(): string | null {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (!env) return null;
  try { return new URL(env).origin; } catch { return null; }
}

/** Returns null if the request's Origin matches the site origin; otherwise
 *  returns a Response (403) the caller should `return` immediately.
 *
 *  Behaviour:
 *  - GET / HEAD / OPTIONS are exempt (read-only).
 *  - When NEXT_PUBLIC_SITE_URL is set, Origin must match it exactly.
 *  - When the env is missing (local dev without .env.local), we fall back
 *    to matching the request URL's own origin so localhost still works. */
export function requireSameOrigin(req: NextRequest): Response | null {
  const method = req.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return null;

  const origin = req.headers.get('origin');
  // Browsers always send Origin on cross-origin + same-origin fetch POSTs.
  // Server-to-server callers (Stripe webhook etc.) gate on signatures, not
  // this helper — they should NEVER call requireSameOrigin().
  if (!origin) {
    return new Response(JSON.stringify({ ok: false, error: 'missing_origin' }), {
      status: 403,
      headers: { 'content-type': 'application/json' },
    });
  }

  const expected = siteOrigin() ?? new URL(req.url).origin;
  if (origin !== expected) {
    return new Response(JSON.stringify({ ok: false, error: 'bad_origin' }), {
      status: 403,
      headers: { 'content-type': 'application/json' },
    });
  }
  return null;
}
