import { NextRequest, NextResponse } from "next/server";
import { createOrder, listOrders, setOrderPaymentRef } from "../../../lib/orders";
import { isStaff } from "../../../lib/auth";
import { listProducts, releaseStock, reserveStock } from "../../../lib/products";
import { allowAction, clientIp } from "../../../lib/rateLimit";
import { createGiftCard } from "../../../lib/giftCards";
import { redeemCoupon, validateCoupon } from "../../../lib/coupons";
import { createCheckoutSession } from "../../../lib/stripe";
import { withBasePath } from "../../../lib/basePath";

export async function GET() {
  if (!(await isStaff())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ orders: await listOrders() });
}

export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req);
    if (!allowAction(`order:hour:${ip}`, 5, 60 * 60_000)) {
      return NextResponse.json(
        { error: "Too many orders. Try again later." },
        { status: 429 }
      );
    }

    const body = await req.json();

    // Honeypot
    if (typeof body.website === "string" && body.website.trim()) {
      return NextResponse.json({ error: "Spam detected" }, { status: 400 });
    }

    // Per-email throttle — one buyer shouldn't generate a storm of
    // order-confirmation emails to the same address (or to a victim's).
    if (typeof body.email === "string" && body.email.trim().length > 0) {
      const emailKey = body.email.trim().toLowerCase();
      if (!allowAction(`order:email:${emailKey}`, 5, 60 * 60_000)) {
        return NextResponse.json(
          { error: "Too many recent orders for this email. Try again later." },
          { status: 429 }
        );
      }
    }

    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: "Cart is empty." }, { status: 400 });
    }

    const required = ["name", "phone", "email", "address", "city", "postal"];
    for (const k of required) {
      if (!body[k]) {
        return NextResponse.json(
          { error: `Missing ${k}` },
          { status: 400 }
        );
      }
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(body.email))) {
      return NextResponse.json({ error: "Invalid email." }, { status: 400 });
    }
    if (!/^\+?[0-9 ()\-]{6,20}$/.test(String(body.phone))) {
      return NextResponse.json({ error: "Invalid phone." }, { status: 400 });
    }

    // SERVER-SIDE PRICE AUTHORITY — never trust client-supplied prices.
    // Look up each line against the catalog, build an authoritative
    // items[] with canonical price + name + slug, then compute subtotal.
    // Rejects any unknown product id.
    const catalog = await listProducts();
    type IncomingLine = { id: string; qty: number };
    const incoming = body.items as IncomingLine[];
    const normalized: Array<{
      id: string;
      slug: string;
      name: string;
      price: number;
      qty: number;
    }> = [];
    if (incoming.length > 50) {
      return NextResponse.json(
        { error: "Too many line items." },
        { status: 400 }
      );
    }
    for (const raw of incoming) {
      const qty = Math.min(99, Math.max(1, Math.floor(Number(raw.qty) || 1)));
      const product = catalog.find((p) => p.id === raw.id);
      if (!product) {
        return NextResponse.json(
          { error: `Unknown product: ${String(raw.id)}` },
          { status: 400 }
        );
      }
      const nameLocalised = body.lang === "el"
        ? product.name_el || product.name_en
        : product.name_en;
      normalized.push({
        id: product.id,
        slug: product.slug,
        name: nameLocalised,
        price: Number(product.price) || 0,
        qty,
      });
    }

    // Reserve stock atomically.
    const reserve = await reserveStock(normalized.map((it) => ({ id: it.id, qty: it.qty })));
    if (!reserve.ok) {
      return NextResponse.json({ error: reserve.error }, { status: 409 });
    }

    const grossSubtotal = normalized.reduce((s, it) => s + it.price * it.qty, 0);

    // Coupon handling — server-side, authoritative. Accepts couponCode,
    // validates it, deducts discount from grossSubtotal, redeems on success.
    let subtotal = grossSubtotal;
    let appliedCoupon: { code: string; discount: number } | null = null;
    if (typeof body.couponCode === "string" && body.couponCode.trim().length > 0) {
      const res = await validateCoupon(body.couponCode.trim(), grossSubtotal, "products");
      if (!res.ok) {
        await releaseStock(normalized.map((it) => ({ id: it.id, qty: it.qty })));
        return NextResponse.json({ error: res.error }, { status: 400 });
      }
      subtotal = Math.max(0, Number((grossSubtotal - (res.discount ?? 0)).toFixed(2)));
      appliedCoupon = { code: res.coupon!.code, discount: res.discount ?? 0 };
      await redeemCoupon(res.coupon!.id);
    }

    let order;
    try {
      order = await createOrder({
        items: normalized,
        subtotal,
        name: body.name,
        phone: body.phone,
        email: body.email,
        address: body.address,
        city: body.city,
        postal: body.postal,
        notes: body.notes ?? "",
        lang: body.lang === "el" ? "el" : "en",
      });
    } catch (err) {
      // Roll stock back so we don't oversell because of a downstream failure.
      await releaseStock(normalized.map((it) => ({ id: it.id, qty: it.qty })));
      throw err;
    }

    // Auto-issue a gift card for each voucher line. Voucher detection is
    // now authoritative — uses the catalog slug, not client-sent name.
    const gifts: Array<{ code: string; amount: number }> = [];
    for (const it of normalized) {
      const isVoucher = it.slug.toLowerCase().startsWith("gift-voucher");
      if (!isVoucher) continue;
      for (let i = 0; i < it.qty; i++) {
        const gc = await createGiftCard({
          amount: it.price, // canonical, from products.json
          buyerName: body.name,
          buyerEmail: body.email,
          recipient: body.notes || undefined,
          orderId: order.id,
        });
        gifts.push({ code: gc.code, amount: gc.amount });
      }
    }

    // If Stripe is configured, create a Checkout Session and send the
    // customer there. Otherwise fall back to the "we'll contact you" flow.
    let checkoutUrl: string | null = null;
    try {
      // Build the Stripe return origin from the configured site URL, not the
      // request headers: behind Hostinger's proxy the Host header is the
      // internal localhost address, which would send Stripe back to
      // localhost after payment. NEXT_PUBLIC_SITE_URL is the bundle's
      // /barber URL or the customer's own domain; .origin strips any path
      // so withBasePath() below can add /barber cleanly. Request headers are
      // only a local-dev fallback when the env var is unset.
      let origin = "";
      const configuredSite = process.env.NEXT_PUBLIC_SITE_URL || process.env.ATELIER_SITE_URL;
      if (configuredSite) {
        try {
          origin = new URL(configuredSite).origin;
        } catch {
          /* malformed NEXT_PUBLIC_SITE_URL — fall through to headers */
        }
      }
      if (!origin) {
        const proto = req.headers.get("x-forwarded-proto") || "http";
        const host = req.headers.get("host") || "localhost:3100";
        origin = `${proto}://${host}`;
      }
      const session = await createCheckoutSession({
        lineItems: normalized.map((it) => ({ name: it.name, amount: it.price, qty: it.qty })),
        customerEmail: body.email,
        successUrl: `${origin}${withBasePath(`/shop/thanks?order=${encodeURIComponent(order.id)}`)}`,
        cancelUrl: `${origin}${withBasePath(`/cart?order=${encodeURIComponent(order.id)}&cancelled=1`)}`,
        orderId: order.id,
      });
      checkoutUrl = session?.url ?? null;
      // Remember the session so this order can be refunded from the admin.
      if (session?.sessionId) {
        await setOrderPaymentRef(order.id, { stripeSessionId: session.sessionId });
      }
    } catch (err) {
      console.error("[orders] Stripe session failed", err instanceof Error ? err.message : err);
    }

    return NextResponse.json(
      { order, gifts, appliedCoupon, checkoutUrl },
      { status: 201 }
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Order failed" },
      { status: 500 }
    );
  }
}
