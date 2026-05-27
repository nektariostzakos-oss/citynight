/**
 * GET  /api/marketing/preferences/[token]  — verify token, return current prefs.
 * POST /api/marketing/preferences/[token]  — persist pref updates.
 *
 * No admin session required. The HMAC token is the only auth mechanism —
 * mirrors the /api/marketing/review/[token] pattern.
 *
 * GET response: { push: boolean, email: boolean, sms: boolean }
 * POST body:    { push?: boolean, email?: boolean, sms?: boolean,
 *                 unsubscribeAll?: boolean }
 * POST response: { ok: true }
 */
import { NextRequest, NextResponse } from "next/server";
import {
  verifyPrefToken,
  getContactPrefs,
  setPref,
  unsubscribeAll,
} from "@/lib/marketingPrefs";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const payload = await verifyPrefToken(decodeURIComponent(token));
  if (!payload) {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }

  const prefs = await getContactPrefs({
    email: payload.email || undefined,
    phone: payload.phone || undefined,
  });

  return NextResponse.json(prefs);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const payload = await verifyPrefToken(decodeURIComponent(token));
  if (!payload) {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const contact = {
    email: payload.email || undefined,
    phone: payload.phone || undefined,
  };

  if (body.unsubscribeAll === true) {
    await unsubscribeAll(contact);
    return NextResponse.json({ ok: true });
  }

  // Extract per-channel booleans from the body, ignoring non-booleans.
  const patch: Partial<Record<"push" | "email" | "sms", boolean>> = {};
  if (typeof body.push === "boolean") patch.push = body.push;
  if (typeof body.email === "boolean") patch.email = body.email;
  if (typeof body.sms === "boolean") patch.sms = body.sms;

  await setPref(contact, patch);
  return NextResponse.json({ ok: true });
}
