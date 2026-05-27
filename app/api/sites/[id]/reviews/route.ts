// GET /api/sites/[id]/reviews?status=all|pending|approved|rejected|flagged — owner-only.

import { NextRequest, NextResponse } from 'next/server';
import { requireSiteOwner } from '@/lib/auth/site-owner';
import { listReviews, type ReviewStatus } from '@/lib/crm';

const VALID: Set<ReviewStatus | 'all'> = new Set(['all', 'pending', 'approved', 'rejected', 'flagged']);

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try { await requireSiteOwner(id); } catch (e) { if (e instanceof Response) return e; throw e; }
  const url = new URL(req.url);
  const statusParam = url.searchParams.get('status');
  const status = statusParam && VALID.has(statusParam as ReviewStatus | 'all')
    ? (statusParam as ReviewStatus | 'all')
    : 'all';
  const limit = Math.min(500, Math.max(1, parseInt(url.searchParams.get('limit') ?? '200', 10) || 200));
  return NextResponse.json({ reviews: listReviews(id, { status, limit }) });
}
