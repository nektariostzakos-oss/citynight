// PATCH  /api/sites/[id]/products/[productId]  — update fields.
// DELETE /api/sites/[id]/products/[productId]  — hard delete.

import { NextRequest, NextResponse } from 'next/server';
import { requireSameOrigin } from '@/lib/csrf';
import { requireSiteOwner } from '@/lib/auth/site-owner';
import { updateProduct, deleteProduct, type ProductInput } from '@/lib/shop';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; productId: string }> }) {
  const csrf = requireSameOrigin(req); if (csrf) return csrf;
  const { id, productId } = await params;
  try { await requireSiteOwner(id); } catch (e) { if (e instanceof Response) return e; throw e; }

  let body: Record<string, unknown>;
  try { body = (await req.json()) as Record<string, unknown>; }
  catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }); }

  const patch: Partial<ProductInput> = {};
  if (typeof body.slug === 'string')      patch.slug = body.slug.trim();
  if (typeof body.name === 'string')      patch.name = body.name.trim();
  if (body.category !== undefined)        patch.category = body.category === null ? null : String(body.category).trim() || null;
  if (body.shortDesc !== undefined)       patch.shortDesc = body.shortDesc === null ? null : String(body.shortDesc).trim() || null;
  if (body.longDesc !== undefined)        patch.longDesc = body.longDesc === null ? null : String(body.longDesc).trim() || null;
  if (typeof body.priceCents === 'number') patch.priceCents = Math.floor(body.priceCents);
  if (typeof body.currency === 'string')  patch.currency = body.currency.toUpperCase();
  if (body.imageUrl !== undefined)        patch.imageUrl = body.imageUrl === null ? null : String(body.imageUrl).trim() || null;
  if (body.stock !== undefined) {
    patch.stock = body.stock === null ? null
      : typeof body.stock === 'number' ? Math.floor(body.stock) : undefined;
  }
  if (typeof body.featured === 'boolean')  patch.featured = body.featured;
  if (typeof body.enabled === 'boolean')   patch.enabled = body.enabled;
  if (typeof body.sortOrder === 'number')  patch.sortOrder = Math.floor(body.sortOrder);

  try {
    const updated = updateProduct(id, productId, patch);
    if (!updated) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ ok: true, product: updated });
  } catch (err) {
    if (err instanceof Error) return NextResponse.json({ error: err.message }, { status: 400 });
    throw err;
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; productId: string }> }) {
  const csrf = requireSameOrigin(req); if (csrf) return csrf;
  const { id, productId } = await params;
  try { await requireSiteOwner(id); } catch (e) { if (e instanceof Response) return e; throw e; }
  const removed = deleteProduct(id, productId);
  if (!removed) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
