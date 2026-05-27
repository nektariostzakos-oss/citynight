import { NextRequest, NextResponse } from "next/server";
import { loadMembership } from "@/lib/settings";
import { createCheckoutSession } from "@/lib/stripe";
import { withBasePath } from "@/lib/basePath";
import { allowAction, clientIp } from "@/lib/rateLimit";

export const runtime = "nodejs";

/**
 * Start a Stripe Checkout session to buy a prepaid client membership. The
 * membership record is NOT created here — it is created by /api/membership/
 * confirm only after the payment is verified.
 */

const TERM_KEY = { 1: "price1m", 6: "price6m", 12: "price12m" } as const;

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

export async function POST(req: NextRequest) {
  if (!allowAction(`membership:${clientIp(req)}`, 15, 60 * 60_000)) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as {
    email?: string;
    name?: string;
    term?: number;
  };
  const email = String(body.email || "").trim().toLowerCase();
  const name = String(body.name || "").trim().slice(0, 120);
  const term = Number(body.term);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "A valid email is required." },
      { status: 400 },
    );
  }
  if (term !== 1 && term !== 6 && term !== 12) {
    return NextResponse.json(
      { error: "Pick a 1, 6 or 12 month plan." },
      { status: 400 },
    );
  }

  const m = await loadMembership();
  if (!m.enabled) {
    return NextResponse.json(
      { error: "Memberships are not available." },
      { status: 400 },
    );
  }
  const price = Number(m[TERM_KEY[term as 1 | 6 | 12]]) || 0;
  if (price <= 0) {
    return NextResponse.json(
      { error: "That plan is not available." },
      { status: 400 },
    );
  }

  const origin = siteOrigin(req);
  let session;
  try {
    session = await createCheckoutSession({
      lineItems: [
        {
          name: `Membership · ${term} month${term > 1 ? "s" : ""}`,
          amount: price,
          qty: 1,
        },
      ],
      customerEmail: email,
      successUrl: `${origin}${withBasePath(
        "/api/membership/confirm?session_id={CHECKOUT_SESSION_ID}",
      )}`,
      cancelUrl: `${origin}${withBasePath("/book?membership=cancelled")}`,
      orderId: `mem_${Date.now().toString(36)}`,
      metadata: {
        kind: "membership",
        email,
        name,
        term: String(term),
        discount: String(m.discountPercent),
        price: String(price),
      },
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
