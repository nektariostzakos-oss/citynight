import { NextRequest, NextResponse } from "next/server";
import { retrieveCheckoutSession, getCurrency } from "@/lib/stripe";
import { createSubscription, type MembershipTerm } from "@/lib/subscriptions";
import { trackPurchase, trackContext } from "@/lib/tracking";
import { withBasePath } from "@/lib/basePath";

export const runtime = "nodejs";

/**
 * Stripe Checkout success landing for a membership purchase. The membership
 * is created only after the Checkout Session is retrieved and confirmed
 * `paid`; createSubscription() is keyed on the session id, so a refreshed
 * success page can never create a duplicate.
 */

function siteOrigin(req: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL || process.env.ATELIER_SITE_URL;
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      /* fall through */
    }
  }
  const proto = req.headers.get("x-forwarded-proto") || "http";
  const host = req.headers.get("host") || "localhost:3100";
  return `${proto}://${host}`;
}

export async function GET(req: NextRequest) {
  const origin = siteOrigin(req);
  const sessionId = req.nextUrl.searchParams.get("session_id") || "";
  const back = (q: string) =>
    NextResponse.redirect(`${origin}${withBasePath(`/book${q}`)}`);

  if (!sessionId) return back("?membership=failed");

  try {
    const session = await retrieveCheckoutSession(sessionId);
    const md = session?.metadata ?? {};
    const term = Number(md.term) as MembershipTerm;
    if (
      session &&
      session.paymentStatus === "paid" &&
      md.kind === "membership" &&
      (term === 1 || term === 6 || term === 12)
    ) {
      const sub = await createSubscription({
        email: md.email || session.customerEmail || "",
        name: md.name || "",
        term,
        discountPercent: Number(md.discount) || 0,
        pricePaid: Number(md.price) || 0,
        sessionId: session.id,
      });
      // Server-side Purchase conversion for the membership payment.
      await trackPurchase(
        {
          eventId: `membership_${sub.id}`,
          value: sub.pricePaid,
          currency: await getCurrency(),
          email: md.email || session.customerEmail || "",
          contentName: "Membership",
        },
        trackContext(req),
      );
      return back("?membership=ok");
    }
  } catch {
    /* fall through to the failure redirect */
  }
  return back("?membership=failed");
}
