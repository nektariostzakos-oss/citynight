import { NextResponse } from "next/server";
import { getVapidPublicKey } from "../../../../lib/vapid";

/**
 * The public VAPID key the browser needs to call
 * `pushManager.subscribe({ applicationServerKey })`. Public by design — the
 * private key never leaves the server. On a standalone install with no
 * configured keys, the first call here generates and persists a pair.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const publicKey = await getVapidPublicKey();
    return NextResponse.json({ publicKey });
  } catch {
    return NextResponse.json(
      { error: "Push is not available." },
      { status: 503 }
    );
  }
}
