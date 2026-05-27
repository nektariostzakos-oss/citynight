import { NextRequest, NextResponse } from "next/server";

/**
 * Same-origin proxy for the marketing site's `/api/licenses/validate`. The
 * install wizard calls THIS endpoint (no CORS, no env baking, no customer-
 * network reachability issues). The server-side proxy then talks to the
 * mothership, which is configurable via env:
 *   ATELIER_LICENSE_URL (preferred, server-only)
 *   NEXT_PUBLIC_ATELIER_LICENSE_URL (fallback, also baked into the wizard)
 *
 * Returns the same shape as the upstream endpoint so the wizard code stays
 * untouched if we ever go direct.
 */

const UPSTREAM =
  process.env.ATELIER_LICENSE_URL ||
  process.env.NEXT_PUBLIC_ATELIER_LICENSE_URL ||
  "https://atelier.mindscrollers.com/api/licenses/validate";

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key") || "";
  if (!key) {
    return NextResponse.json({ valid: false, reason: "missing-key" }, { status: 400 });
  }
  // This install's own host, derived server-side rather than trusted from the
  // client. The mothership uses it to flag a license already bound elsewhere
  // so the wizard can warn at step 1.
  const domain = req.headers.get("host") || "";
  try {
    const url =
      `${UPSTREAM}?key=${encodeURIComponent(key)}` +
      (domain ? `&domain=${encodeURIComponent(domain)}` : "");
    const r = await fetch(url, { cache: "no-store" });
    const body = await r.json().catch(() => ({ valid: false, reason: "validate-bad-response" }));
    return NextResponse.json(body, { status: 200 });
  } catch {
    return NextResponse.json({ valid: false, reason: "validate-unreachable" }, { status: 200 });
  }
}
