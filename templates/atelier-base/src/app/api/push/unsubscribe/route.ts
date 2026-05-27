import { NextRequest, NextResponse } from "next/server";
import { removeSubscription } from "../../../../lib/push";

/**
 * Remove a Web Push subscription by its endpoint. Called when the user
 * dismisses notifications, or by the browser after an endpoint rotates.
 * Idempotent: a missing endpoint still returns ok.
 */
export async function POST(req: NextRequest) {
  let body: { endpoint?: string; subscription?: { endpoint?: string } };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  const endpoint = body.endpoint || body.subscription?.endpoint || "";
  if (!endpoint) {
    return NextResponse.json({ error: "Missing endpoint." }, { status: 400 });
  }
  const removed = await removeSubscription(endpoint);
  return NextResponse.json({ ok: true, removed });
}
