import { NextRequest, NextResponse } from "next/server";
import { createOrder, updateOrderStatus } from "../../../../lib/orders";
import { listProducts, releaseStock, reserveStock } from "../../../../lib/products";
import { createGiftCard } from "../../../../lib/giftCards";
import { allowAction, clientIp } from "../../../../lib/rateLimit";
import { retrievePaymentIntent } from "../../../../lib/stripe";
import { trackPurchase, trackContext } from "../../../../lib/tracking";

type IncomingLine = { id: string; qty: number };

export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req);
    if (!allowAction(`expressorder:hour:${ip}`, 10, 60 * 60_000)) {
      return NextResponse.json({ error: "Too many orders." }, { status: 429 });
    }

    const body = await req.json();
    if (!body.paymentIntentId || typeof body.paymentIntentId !== "string") {
      return NextResponse.json({ error: "Missing paymentIntentId" }, { status: 400 });
    }

    const pi = await retrievePaymentIntent(body.paymentIntentId);
    if (!pi) {
      return NextResponse.json({ error: "Cannot verify payment." }, { status: 502 });
    }
    if (pi.status !== "succeeded" && pi.status !== "processing") {
      return NextResponse.json({ error: `Payment not completed (${pi.status}).` }, { status: 402 });
    }

    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: "Cart is empty." }, { status: 400 });
    }

    const catalog = await listProducts();
    const normalized: Array<{ id: string; slug: string; name: string; price: number; qty: number }> = [];
    for (const raw of body.items as IncomingLine[]) {
      const qty = Math.min(99, Math.max(1, Math.floor(Number(raw.qty) || 1)));
      const product = catalog.find((p) => p.id === raw.id);
      if (!product) {
        return NextResponse.json({ error: `Unknown product: ${String(raw.id)}` }, { status: 400 });
      }
      const name = body.lang === "el" ? product.name_el || product.name_en : product.name_en;
      normalized.push({ id: product.id, slug: product.slug, name, price: Number(product.price) || 0, qty });
    }

    const subtotal = normalized.reduce((s, it) => s + it.price * it.qty, 0);
    // Verify that the PI amount matches what we'd compute from the cart.
    // Stripe stores `amount` in the smallest currency unit.
    if (Math.abs(pi.amount - Math.round(subtotal * 100)) > 1) {
      return NextResponse.json({ error: "Payment amount does not match cart total." }, { status: 400 });
    }

    const reserve = await reserveStock(normalized.map((it) => ({ id: it.id, qty: it.qty })));
    if (!reserve.ok) {
      return NextResponse.json({ error: reserve.error }, { status: 409 });
    }

    let order;
    try {
      order = await createOrder({
        items: normalized,
        subtotal,
        name: String(body.name || "").slice(0, 200),
        phone: String(body.phone || "").slice(0, 40),
        email: String(body.email || "").slice(0, 200),
        address: String(body.address || "").slice(0, 300),
        city: String(body.city || "").slice(0, 100),
        postal: String(body.postal || "").slice(0, 40),
        notes: String(body.notes || "").slice(0, 1000),
        lang: body.lang === "el" ? "el" : "en",
        // Keep the Stripe reference so the order can be refunded later.
        paymentIntentId: pi.id,
        currency: pi.currency,
      });
    } catch (err) {
      await releaseStock(normalized.map((it) => ({ id: it.id, qty: it.qty })));
      throw err;
    }
    // Payment already settled by the wallet — mark order paid immediately.
    await updateOrderStatus(order.id, "paid");
    // Server-side Purchase conversion for the shop order.
    await trackPurchase(
      {
        eventId: `order_${order.id}`,
        value: subtotal,
        currency: pi.currency,
        email: order.email,
        phone: order.phone,
        contentName: "Order",
      },
      trackContext(req),
    );

    const gifts: Array<{ code: string; amount: number }> = [];
    for (const it of normalized) {
      const isVoucher = it.slug.toLowerCase().startsWith("gift-voucher");
      if (!isVoucher) continue;
      for (let i = 0; i < it.qty; i++) {
        const gc = await createGiftCard({
          amount: it.price,
          buyerName: order.name,
          buyerEmail: order.email,
          orderId: order.id,
        });
        gifts.push({ code: gc.code, amount: gc.amount });
      }
    }

    return NextResponse.json({ order, gifts }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Order failed" },
      { status: 500 }
    );
  }
}
