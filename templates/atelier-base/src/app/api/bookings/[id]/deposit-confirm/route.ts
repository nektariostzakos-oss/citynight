import { NextRequest, NextResponse } from "next/server";
import { getBooking, markDepositPaid } from "@/lib/bookings";
import { retrieveCheckoutSession, getCurrency } from "@/lib/stripe";
import { trackPurchase, trackContext } from "@/lib/tracking";
import { signBookingId } from "@/lib/bookingToken";
import { withBasePath } from "@/lib/basePath";

export const runtime = "nodejs";

/**
 * Stripe Checkout success landing for a booking deposit. The deposit is only
 * flagged paid after the Checkout Session is retrieved and confirmed `paid` —
 * a redirect to this URL on its own never marks anything. Then it bounces the
 * customer to their booking-management page.
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

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const origin = siteOrigin(req);
  const sessionId = req.nextUrl.searchParams.get("session_id") || "";

  const booking = await getBooking(id);
  if (!booking) {
    return NextResponse.redirect(`${origin}${withBasePath("/")}`);
  }

  const token = await signBookingId(id);
  const manage = (q: string) =>
    NextResponse.redirect(
      `${origin}${withBasePath(
        `/b/${encodeURIComponent(id)}?t=${encodeURIComponent(token)}${q}`,
      )}`,
    );

  if (booking.depositPaid) return manage("&deposit=ok");

  if (sessionId) {
    try {
      const session = await retrieveCheckoutSession(sessionId);
      if (
        session &&
        session.paymentStatus === "paid" &&
        session.metadata.order_id === id
      ) {
        await markDepositPaid(id);
        // Server-side Purchase conversion — fires once, on confirmed payment.
        await trackPurchase(
          {
            eventId: `booking_${id}`,
            value: booking.price,
            currency: await getCurrency(),
            email: booking.email,
            phone: booking.phone,
            contentName: "Booking",
          },
          trackContext(req),
        );
        return manage("&deposit=ok");
      }
    } catch {
      /* fall through to the failure redirect */
    }
  }
  return manage("&deposit=failed");
}
