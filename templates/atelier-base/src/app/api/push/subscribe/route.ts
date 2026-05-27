import { NextRequest, NextResponse } from "next/server";
import { saveSubscription, type RawPushSubscription } from "../../../../lib/push";
import { currentUser, isStaff } from "../../../../lib/auth";
import { SUPPORTED_LANGS, type Lang } from "../../../../lib/langs";
import { allowAction, clientIp } from "../../../../lib/rateLimit";

/**
 * Store a Web Push subscription.
 *
 * Body: the browser's PushSubscription JSON (`endpoint` + `keys`) plus
 *   - `audience`: "customer" | "owner"
 *   - `email` / `phone`: customer contact, so the booking flow can match
 *     this device to the visitor's bookings (customer audience only)
 *   - `lang`: preferred notification language
 *
 * An "owner" subscription requires a signed-in staff session — otherwise any
 * visitor could opt in to every booking alert. A "customer" subscription is
 * open: the visitor simply provides the contact they booked with.
 */
export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  if (!allowAction(`push:sub:${ip}`, 20, 60 * 60_000)) {
    return NextResponse.json({ error: "Too many attempts." }, { status: 429 });
  }

  let body: {
    subscription?: RawPushSubscription;
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
    audience?: string;
    email?: string;
    phone?: string;
    lang?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  // Accept either { subscription: {...} } or the PushSubscription fields
  // spread at the top level (toJSON() output).
  const subscription: RawPushSubscription | undefined =
    body.subscription ??
    (body.endpoint
      ? { endpoint: body.endpoint, keys: body.keys }
      : undefined);

  if (
    !subscription ||
    typeof subscription.endpoint !== "string" ||
    !subscription.keys?.p256dh ||
    !subscription.keys?.auth
  ) {
    return NextResponse.json(
      { error: "Invalid subscription." },
      { status: 400 }
    );
  }

  const audience = body.audience === "owner" ? "owner" : "customer";

  if (audience === "owner") {
    const staff = await isStaff();
    if (!staff) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (audience === "customer" && !body.email && !body.phone) {
    return NextResponse.json(
      { error: "An email or phone is required." },
      { status: 400 }
    );
  }

  const lang: Lang | undefined =
    typeof body.lang === "string" && SUPPORTED_LANGS.includes(body.lang as Lang)
      ? (body.lang as Lang)
      : undefined;

  const me = audience === "owner" ? await currentUser() : null;

  const record = await saveSubscription({
    subscription,
    audience,
    clientEmail: audience === "customer" ? body.email : undefined,
    clientPhone: audience === "customer" ? body.phone : undefined,
    userId: me?.id,
    lang,
  });

  if (!record) {
    return NextResponse.json(
      { error: "Invalid subscription." },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true, id: record.id });
}
