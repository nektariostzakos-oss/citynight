/**
 * Tiny in-memory IP rate limiter (per process).
 * Enough for a single barber-shop server. For multi-instance deploys
 * swap for a Redis-backed limiter.
 */

declare global {
  // eslint-disable-next-line no-var
  var __atelierRateBuckets: Map<string, number[]> | undefined;
  // eslint-disable-next-line no-var
  var __atelierRateLastSweep: number | undefined;
}

const buckets = (globalThis.__atelierRateBuckets ??= new Map<string, number[]>());

// Sweep stale keys periodically so the map doesn't grow unbounded on long-running servers.
const SWEEP_INTERVAL_MS = 5 * 60_000;
const STALE_AFTER_MS = 60 * 60_000;

function maybeSweep(now: number) {
  const last = globalThis.__atelierRateLastSweep ?? 0;
  if (now - last < SWEEP_INTERVAL_MS) return;
  globalThis.__atelierRateLastSweep = now;
  const cutoff = now - STALE_AFTER_MS;
  for (const [k, arr] of buckets) {
    const recent = arr.filter((t) => t > cutoff);
    if (recent.length === 0) buckets.delete(k);
    else if (recent.length !== arr.length) buckets.set(k, recent);
  }
}

/**
 * Derive a rate-limit key for the request.
 *
 * Strategy (in order of preference):
 *  1. If TRUST_PROXY=1 is set, trust the first (leftmost, i.e. the real
 *     client) value in X-Forwarded-For. Use this only when the app sits
 *     behind a trusted reverse proxy that strips/overwrites XFF.
 *  2. Otherwise combine the full X-Forwarded-For chain + User-Agent so that
 *     a single spoofed header is less effective as a bypass. An attacker
 *     would need to predict/match the UA that a legitimate user is sending.
 *
 * Residual risk: without a connection-level remote-address (unavailable
 * inside Next.js App Router handlers without custom server instrumentation),
 * this cannot be made fully spoof-proof. A determined attacker behind a
 * shared IP could still craft both headers. For a barber-shop rate limiter
 * the current approach is sufficient; upgrade to a Redis + real remote-addr
 * solution for higher-value endpoints.
 */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for") ?? "";
  const realIp = req.headers.get("x-real-ip") ?? "";

  if (process.env.TRUST_PROXY === "1") {
    // Trusted proxy mode: leftmost XFF entry is the real client IP.
    if (xff) return xff.split(",")[0].trim();
    if (realIp) return realIp;
    return "anon";
  }

  // Untrusted mode: combine full XFF chain + User-Agent to make a spoofed
  // single header less effective as a rate-limit bypass.
  const ua = req.headers.get("user-agent") ?? "";
  if (xff || realIp) {
    return `${xff}|${realIp}|${ua}`.slice(0, 256);
  }
  return "anon";
}

/**
 * Allow up to `max` actions per `windowMs`. Returns true if the action is
 * allowed (and recorded), false if rate-limited.
 */
export function allowAction(
  key: string,
  max: number,
  windowMs: number
): boolean {
  const now = Date.now();
  maybeSweep(now);
  const arr = buckets.get(key) ?? [];
  const cutoff = now - windowMs;
  const recent = arr.filter((t) => t > cutoff);
  if (recent.length >= max) {
    buckets.set(key, recent);
    return false;
  }
  recent.push(now);
  buckets.set(key, recent);
  return true;
}
