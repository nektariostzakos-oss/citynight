import { NextRequest, NextResponse } from "next/server";
import { listProducts } from "../../../lib/products";
import { allowAction, clientIp } from "../../../lib/rateLimit";
import { createPaymentIntent, getCurrency, getPublishableKey } from "../../../lib/stripe";

type IncomingLine = { id: string; qty: number };

export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req);
    if (!allowAction(`pi:hour:${ip}`, 30, 60 * 60_000)) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }
    const body = await req.json();
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: "Cart is empty." }, { status: 400 });
    }
    if (body.items.length > 50) {
      return NextResponse.json({ error: "Too many line items." }, { status: 400 });
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
    if (subtotal <= 0) {
      return NextResponse.json({ error: "Total must be greater than zero." }, { status: 400 });
    }

    const publishableKey = await getPublishableKey();
    if (!publishableKey) {
      return NextResponse.json({ error: "Stripe not configured." }, { status: 503 });
    }

    const pi = await createPaymentIntent({
      amount: subtotal,
      metadata: {
        source: "express-checkout",
        item_ids: normalized.map((it) => it.id).join(","),
      },
      receiptEmail: typeof body.email === "string" && body.email.trim() ? body.email.trim() : undefined,
    });
    if (!pi) {
      return NextResponse.json({ error: "Stripe not configured." }, { status: 503 });
    }

    return NextResponse.json({
      clientSecret: pi.clientSecret,
      paymentIntentId: pi.paymentIntentId,
      amount: Number(subtotal.toFixed(2)),
      currency: await getCurrency(),
      publishableKey,
    });
  } catch (e) {
    console.error("[payment-intent] exception:", e);
    return NextResponse.json(
      { error: "Could not create payment. Please try again." },
      { status: 500 }
    );
  }
}
