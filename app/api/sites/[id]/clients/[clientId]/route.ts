// GET   /api/sites/[id]/clients/[clientId]  — detail
// PATCH /api/sites/[id]/clients/[clientId]  — notes / tags / preferredStaffId / loyaltyPoints
// DELETE /api/sites/[id]/clients/[clientId] — GDPR soft-delete (wipes PII)

import { NextRequest, NextResponse } from 'next/server';
import { requireSameOrigin } from '@/lib/csrf';
import { requireSiteOwner } from '@/lib/auth/site-owner';
import { getClient, updateClient, deleteClient, type ClientPatch } from '@/lib/crm';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string; clientId: string }> }) {
  const { id, clientId } = await params;
  try { await requireSiteOwner(id); } catch (e) { if (e instanceof Response) return e; throw e; }
  const client = getClient(id, clientId);
  if (!client) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ client });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; clientId: string }> }) {
  const csrf = requireSameOrigin(req); if (csrf) return csrf;
  const { id, clientId } = await params;
  try { await requireSiteOwner(id); } catch (e) { if (e instanceof Response) return e; throw e; }

  let body: Record<string, unknown>;
  try { body = (await req.json()) as Record<string, unknown>; }
  catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }); }

  const patch: ClientPatch = {};
  if (typeof body.name === 'string') patch.name = body.name.trim();
  if (body.notes !== undefined) patch.notes = body.notes === null ? null : String(body.notes).trim() || null;
  if (Array.isArray(body.tags)) patch.tags = body.tags.filter((t) => typeof t === 'string').map((t) => String(t).trim()).filter(Boolean).slice(0, 20);
  if (body.preferredStaffId !== undefined) patch.preferredStaffId = body.preferredStaffId === null ? null : String(body.preferredStaffId);
  if (typeof body.loyaltyPoints === 'number') patch.loyaltyPoints = Math.floor(body.loyaltyPoints);

  try {
    const updated = updateClient(id, clientId, patch);
    if (!updated) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ ok: true, client: updated });
  } catch (err) {
    if (err instanceof Error) return NextResponse.json({ error: err.message }, { status: 400 });
    throw err;
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; clientId: string }> }) {
  const csrf = requireSameOrigin(req); if (csrf) return csrf;
  const { id, clientId } = await params;
  try { await requireSiteOwner(id); } catch (e) { if (e instanceof Response) return e; throw e; }
  const removed = deleteClient(id, clientId);
  if (!removed) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
