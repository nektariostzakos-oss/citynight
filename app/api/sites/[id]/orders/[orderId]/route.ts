// GET   /api/sites/[id]/orders/[orderId]  — one order + line items, owner-only.
// PATCH /api/sites/[id]/orders/[orderId]  — owner updates status.

import { NextRequest, NextResponse } from 'next/server';
import { requireSameOrigin } from '@/lib/csrf';
import { requireSiteOwner } from '@/lib/auth/site-owner';
import { getOrder, listOrderItems, updateOrderStatus, type OrderStatus } from '@/lib/shop';

const VALID: Set<OrderStatus> = new Set(['pending', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded']);

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string; orderId: string }> }) {
  const { id, orderId } = await params;
  try { await requireSiteOwner(id); } catch (e) { if (e instanceof Response) return e; throw e; }
  const order = getOrder(id, orderId);
  if (!order) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const items = listOrderItems(orderId);
  return NextResponse.json({ order, items });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; orderId: string }> }) {
  const csrf = requireSameOrigin(req); if (csrf) return csrf;
  const { id, orderId } = await params;
  try { await requireSiteOwner(id); } catch (e) { if (e instanceof Response) return e; throw e; }

  let body: { status?: unknown };
  try { body = (await req.json()) as { status?: unknown }; }
  catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }); }

  const status = typeof body.status === 'string' ? body.status as OrderStatus : null;
  if (!status || !VALID.has(status)) return NextResponse.json({ error: 'bad_status' }, { status: 400 });

  try {
    const updated = updateOrderStatus(id, orderId, status);
    if (!updated) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ ok: true, order: updated });
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('Cannot change order')) {
      return NextResponse.json({ error: 'invalid_transition', detail: err.message }, { status: 409 });
    }
    throw err;
  }
}
