import { NextRequest, NextResponse } from "next/server";
import { getBooking } from "@/lib/bookings";
import { createCheckoutSession } from "@/lib/stripe";
import { withBasePath } from "@/lib/basePath";
import { allowAction, clientIp } from "@/lib/rateLimit";

export const runtime = "nodejs";

/**
 * Start a Stripe Checkout session for a booking's optional deposit.
 *
 * The booking already exists and is confirmed — paying the deposit is
 * optional (the customer can also pay in person). On success Stripe redirects
 * to /api/bookings/[id]/deposit-confirm, which verifies the payment before
 * flagging the booking.
 */

/** Public origin to send Stripe back to (see api/orders/route.ts). */
function siteOrigin(req: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL || process.env.ATELIER_SITE_URL;
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      /* malformed — fall through to request headers */
    }
  }
  const proto = req.headers.get("x-forwarded-proto") || "http";
  const host = req.headers.get("host") || "localhost:3100";
  return `${proto}://${host}`;
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!allowAction(`deposit:${clientIp(req)}`, 20, 60 * 60_000)) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429 },
    );
  }

  const booking = await getBooking(id);
  if (!booking) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }
  if (booking.depositPaid) {
    return NextResponse.json(
      { error: "The deposit is already paid." },
      { status: 400 },
    );
  }
  const deposit = Number(booking.deposit) || 0;
  if (deposit <= 0) {
    return NextResponse.json(
      { error: "This booking has no deposit." },
      { status: 400 },
    );
  }

  const origin = siteOrigin(req);
  let session;
  try {
    session = await createCheckoutSession({
      lineItems: [
        {
          name: `Deposit · ${booking.serviceName}`.slice(0, 250),
          amount: deposit,
          qty: 1,
        },
      ],
      customerEmail: booking.email,
      successUrl: `${origin}${withBasePath(
        `/api/bookings/${encodeURIComponent(id)}/deposit-confirm?session_id={CHECKOUT_SESSION_ID}`,
      )}`,
      cancelUrl: `${origin}${withBasePath(`/b/${encodeURIComponent(id)}`)}`,
      orderId: id,
      metadata: { kind: "deposit" },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Payment failed." },
      { status: 502 },
    );
  }
  if (!session) {
    return NextResponse.json(
      { error: "Card payment is not available right now." },
      { status: 503 },
    );
  }
  return NextResponse.json({ checkoutUrl: session.url });
}
