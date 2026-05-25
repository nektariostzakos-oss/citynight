// Tiny rate-limit helper backed by an in-memory token-bucket map.
//
// Why in-memory: this project runs as a single `next start` process on
// Hostinger (§4). One process = one bucket map = correct counting. If we
// ever scale to multiple Node workers we'll need a shared store (Redis,
// or SQLite-backed counter rows), but that's a future concern.
//
// Buckets are keyed by an arbitrary string (IP, user id, "ip:route", etc.).
// The caller decides what's being rate-limited; this module just enforces.
//
// Usage:
//   import { rateLimit, ipKey } from '@/lib/rate-limit';
//   const r = rateLimit(`magic-link:${ipKey(req)}`, { max: 5, windowMs: 15 * 60_000 });
//   if (!r.ok) return new Response('Too many requests', { status: 429, headers: { 'retry-after': String(r.retryAfterSec) } });

import 'server-only';
import type { NextRequest } from 'next/server';

type Bucket = { hits: number[]; lastSeen: number };
const BUCKETS = new Map<string, Bucket>();

// House-keeping — every N inserts, drop buckets we haven't seen in a while
// so the map doesn't grow without bound. Cheap O(n) sweep, runs maybe once
// per a few thousand requests.
const SWEEP_EVERY = 2000;
let inserts = 0;

function sweep(now: number) {
  for (const [k, b] of BUCKETS) {
    // Drop buckets idle for >1 hour. Anything actively rate-limiting will
    // have lastSeen within the last window length anyway.
    if (now - b.lastSeen > 60 * 60_000) BUCKETS.delete(k);
  }
}

export type RateLimitOpts = {
  max: number;       // allowed hits within the window
  windowMs: number;  // window length in ms
};

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
};

export function rateLimit(key: string, opts: RateLimitOpts): RateLimitResult {
  const now = Date.now();
  const cutoff = now - opts.windowMs;
  let b = BUCKETS.get(key);
  if (!b) {
    b = { hits: [], lastSeen: now };
    BUCKETS.set(key, b);
    if (++inserts % SWEEP_EVERY === 0) sweep(now);
  }
  // Drop hits older than the window.
  b.hits = b.hits.filter((t) => t > cutoff);
  b.lastSeen = now;

  if (b.hits.length >= opts.max) {
    const oldest = b.hits[0] ?? now;
    const retryAfterMs = Math.max(0, oldest + opts.windowMs - now);
    return { ok: false, remaining: 0, retryAfterSec: Math.ceil(retryAfterMs / 1000) };
  }

  b.hits.push(now);
  return { ok: true, remaining: opts.max - b.hits.length, retryAfterSec: 0 };
}

/** Extract a "best available" client IP from a Next request — Cloudflare
 *  first, then X-Forwarded-For (first hop), then the connection IP, then
 *  a literal 'unknown' so we still bucket consistently. */
export function ipKey(req: NextRequest): string {
  const cf = req.headers.get('cf-connecting-ip');
  if (cf) return cf;
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]!.trim();
  // NextRequest doesn't expose .ip in all runtimes; fall through.
  return 'unknown';
}

/** Convenience wrapper that builds a 429 Response with the proper
 *  Retry-After header. Returns null when the request is allowed. */
export function rateLimit429(key: string, opts: RateLimitOpts): Response | null {
  const r = rateLimit(key, opts);
  if (r.ok) return null;
  return new Response(JSON.stringify({ ok: false, error: 'rate_limited', retryAfterSec: r.retryAfterSec }), {
    status: 429,
    headers: {
      'content-type': 'application/json',
      'retry-after': String(r.retryAfterSec),
    },
  });
}
