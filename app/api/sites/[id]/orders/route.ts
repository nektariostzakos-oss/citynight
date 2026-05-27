// GET /api/sites/[id]/orders?status=&limit= — owner-only orders list.

import { NextRequest, NextResponse } from 'next/server';
import { requireSiteOwner } from '@/lib/auth/site-owner';
import { listOrders, type OrderStatus } from '@/lib/shop';

const VALID: OrderStatus[] = ['pending', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded'];

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try { await requireSiteOwner(id); } catch (e) { if (e instanceof Response) return e; throw e; }

  const url = new URL(req.url);
  const statusParam = url.searchParams.get('status');
  const status = statusParam && VALID.includes(statusParam as OrderStatus) ? statusParam as OrderStatus : undefined;
  const limit = Math.min(500, Math.max(1, parseInt(url.searchParams.get('limit') ?? '200', 10) || 200));

  const orders = listOrders(id, { status, limit });
  return NextResponse.json({ orders });
}
