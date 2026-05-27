// GET /api/sites/[id]/clients[?search=&limit=&includeDeleted=1] — owner-only.

import { NextRequest, NextResponse } from 'next/server';
import { requireSiteOwner } from '@/lib/auth/site-owner';
import { listClients } from '@/lib/crm';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try { await requireSiteOwner(id); } catch (e) { if (e instanceof Response) return e; throw e; }
  const url = new URL(req.url);
  const search = url.searchParams.get('search') ?? undefined;
  const limit = Math.min(500, Math.max(1, parseInt(url.searchParams.get('limit') ?? '200', 10) || 200));
  const includeDeleted = url.searchParams.get('includeDeleted') === '1';
  return NextResponse.json({ clients: listClients(id, { search, limit, includeDeleted }) });
}
