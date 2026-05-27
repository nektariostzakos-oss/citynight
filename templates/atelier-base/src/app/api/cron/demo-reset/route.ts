import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { isDemoMode, getResetSecret, resetDemo } from "../../../../lib/demoMode";

/**
 * Demo reset. Restores the demo to its committed seed (demos/barber/data/) so
 * visitors always see the full demo. Requires demo mode (the __demo__ tenant).
 *
 * Auth: pass ?secret=<DEMO_RESET_SECRET> as query param. The secret must be
 * non-empty in env, otherwise the endpoint is locked.
 *
 * Triggered hourly by scheduleDemoReset() in server.js. An external scheduler
 * (Hostinger cron, etc.) can also call it, but is not required.
 */

async function handle(req: NextRequest) {
  if (!isDemoMode()) {
    return NextResponse.json({ error: "demo_mode_off" }, { status: 404 });
  }

  const expected = getResetSecret();
  if (!expected) {
    return NextResponse.json({ error: "no_secret_configured" }, { status: 500 });
  }

  const provided = req.nextUrl.searchParams.get("secret") || "";
  // SEC-3: Use timing-safe comparison to prevent timing-based secret enumeration.
  const aBuf = Buffer.from(provided, "utf-8");
  const bBuf = Buffer.from(expected, "utf-8");
  const secretMatches =
    aBuf.length === bBuf.length && crypto.timingSafeEqual(aBuf, bBuf);
  if (!secretMatches) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await resetDemo();
  return NextResponse.json({ ok: true, ...result, at: new Date().toISOString() });
}

export const GET = handle;
export const POST = handle;
