// POST /api/sites/[id]/shop/order — create a pending shop order.
//
// Server-side total computation (createOrder reads prices from
// site_products; client cannot lie). Returns the order id + total so the
// caller can immediately POST /shop/order/[orderId]/pay to mint a Stripe
// Connect PaymentIntent.
//
// CSRF + same-origin; rate-limited 10/h/IP (orders are heavier than
// bookings — looser than the coupon endpoint, tighter than reads).

import { NextRequest, NextResponse } from 'next/server';
import { requireSameOrigin } from '@/lib/csrf';
import { rateLimit429, ipKey } from '@/lib/rate-limit';
import { createOrder, OrderError, type CartLine } from '@/lib/shop';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const csrf = requireSameOrigin(req); if (csrf) return csrf;
  const limited = rateLimit429(`shop-order:${ipKey(req)}`, { max: 10, windowMs: 60 * 60_000 });
  if (limited) return limited;

  const { id: siteId } = await params;
  let body: Record<string, unknown>;
  try { body = (await req.json()) as Record<string, unknown>; }
  catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }); }

  const items = parseCart(body.items);
  if (!items.length || items.length > 50) {
    return NextResponse.json({ error: 'bad_cart' }, { status: 400 });
  }

  const customerName = str(body.customerName, 120);
  if (!customerName) return NextResponse.json({ error: 'missing_name' }, { status: 400 });

  const customerEmail = str(body.customerEmail, 200);
  const customerPhone = str(body.customerPhone, 30);
  if (!customerEmail && !customerPhone) {
    return NextResponse.json({ error: 'contact_required' }, { status: 400 });
  }

  try {
    const result = createOrder(siteId, {
      items,
      customerName,
      customerEmail: customerEmail ?? undefined,
      customerPhone: customerPhone ?? undefined,
      shippingAddress: str(body.shippingAddress, 200) ?? undefined,
      shippingCity: str(body.shippingCity, 100) ?? undefined,
      shippingPostal: str(body.shippingPostal, 20) ?? undefined,
      shippingCountry: str(body.shippingCountry, 2) ?? undefined,
      notes: str(body.notes, 500) ?? undefined,
      lang: str(body.lang, 2) ?? undefined,
      couponCode: str(body.couponCode, 40) ?? undefined,
      giftCardCode: str(body.giftCardCode, 40) ?? undefined,
    });
    return NextResponse.json({
      ok: true,
      order: {
        id: result.order.id,
        subtotalCents: result.order.subtotalCents,
        discountCents: result.order.discountCents,
        shippingCents: result.order.shippingCents,
        taxCents: result.order.taxCents,
        totalCents: result.order.totalCents,
        currency: result.order.currency,
        couponApplied: !!result.couponApplied,
        giftCardApplied: !!result.giftCardApplied,
      },
    });
  } catch (err) {
    if (err instanceof OrderError) {
      return NextResponse.json({ error: err.code }, { status: 400 });
    }
    throw err;
  }
}

function str(v: unknown, maxLen: number): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  if (!t || t.length > maxLen) return null;
  return t;
}

function parseCart(v: unknown): CartLine[] {
  if (!Array.isArray(v)) return [];
  const out: CartLine[] = [];
  for (const item of v) {
    if (!item || typeof item !== 'object') continue;
    const obj = item as Record<string, unknown>;
    const productId = typeof obj.productId === 'string' ? obj.productId : null;
    const quantity = typeof obj.quantity === 'number' ? Math.floor(obj.quantity) : NaN;
    if (productId && Number.isFinite(quantity) && quantity > 0 && quantity <= 99) {
      out.push({ productId, quantity });
    }
  }
  return out;
}
