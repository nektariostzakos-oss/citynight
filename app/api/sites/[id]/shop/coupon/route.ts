// POST /api/sites/[id]/shop/coupon — validate a coupon code against a
// shop subtotal. Returns the computed discount in cents on success, or a
// structured reason on failure. Does NOT consume the coupon — that
// happens inside the order transaction in lib/shop/createOrder.
//
// CSRF + same-origin; rate-limited 30/h/IP to prevent brute-forcing codes.

import { NextRequest, NextResponse } from 'next/server';
import { requireSameOrigin } from '@/lib/csrf';
import { rateLimit429, ipKey } from '@/lib/rate-limit';
import { applyCoupon } from '@/lib/shop';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const csrf = requireSameOrigin(req); if (csrf) return csrf;
  const limited = rateLimit429(`coupon-check:${ipKey(req)}`, { max: 30, windowMs: 60 * 60_000 });
  if (limited) return limited;

  const { id: siteId } = await params;
  let body: { code?: unknown; subtotalCents?: unknown };
  try { body = (await req.json()) as { code?: unknown; subtotalCents?: unknown }; }
  catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }); }

  const code = typeof body.code === 'string' ? body.code.trim() : '';
  const subtotalCents = typeof body.subtotalCents === 'number' && Number.isFinite(body.subtotalCents)
    ? Math.floor(body.subtotalCents) : -1;
  if (!code || subtotalCents < 0) {
    return NextResponse.json({ error: 'bad_input' }, { status: 400 });
  }

  const result = applyCoupon({ siteId, code, scope: 'shop', subtotalCents });
  if (!result.ok) {
    return NextResponse.json({ ok: false, reason: result.reason });
  }
  return NextResponse.json({
    ok: true,
    discountCents: result.discountCents,
    coupon: { id: result.coupon.id, code: result.coupon.code, kind: result.coupon.kind, value: result.coupon.value },
  });
}
