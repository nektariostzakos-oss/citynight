// GET  /api/sites/[id]/products  — owner list (includes disabled).
// POST /api/sites/[id]/products  — create a new product.

import { NextRequest, NextResponse } from 'next/server';
import { requireSameOrigin } from '@/lib/csrf';
import { requireSiteOwner } from '@/lib/auth/site-owner';
import { listProducts, createProduct, type ProductInput } from '@/lib/shop';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try { await requireSiteOwner(id); } catch (e) { if (e instanceof Response) return e; throw e; }
  return NextResponse.json({ products: listProducts(id) });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const csrf = requireSameOrigin(req); if (csrf) return csrf;
  const { id } = await params;
  try { await requireSiteOwner(id); } catch (e) { if (e instanceof Response) return e; throw e; }

  let body: Record<string, unknown>;
  try { body = (await req.json()) as Record<string, unknown>; }
  catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }); }

  const input = pickInput(body, /* required= */ true);
  if (!input) return NextResponse.json({ error: 'missing_required' }, { status: 400 });

  try {
    const product = createProduct(id, input as ProductInput);
    return NextResponse.json({ ok: true, product });
  } catch (err) {
    if (err instanceof Error) return NextResponse.json({ error: err.message }, { status: 400 });
    throw err;
  }
}

function pickInput(body: Record<string, unknown>, requireAll: boolean): Partial<ProductInput> | null {
  const slug = strOrNull(body.slug, 80);
  const name = strOrNull(body.name, 120);
  const priceCents = numOrNull(body.priceCents);

  if (requireAll && (!slug || !name || priceCents === null)) return null;

  return {
    ...(slug ? { slug } : {}),
    ...(name ? { name } : {}),
    ...(priceCents !== null ? { priceCents } : {}),
    ...(body.category !== undefined ? { category: strOrNull(body.category, 80) } : {}),
    ...(body.shortDesc !== undefined ? { shortDesc: strOrNull(body.shortDesc, 200) } : {}),
    ...(body.longDesc !== undefined ? { longDesc: strOrNull(body.longDesc, 2000) } : {}),
    ...(body.currency !== undefined ? { currency: strOrNull(body.currency, 3) ?? undefined } : {}),
    ...(body.imageUrl !== undefined ? { imageUrl: strOrNull(body.imageUrl, 500) } : {}),
    ...(body.stock !== undefined ? { stock: body.stock === null ? null : numOrNull(body.stock) } : {}),
    ...(body.featured !== undefined ? { featured: !!body.featured } : {}),
    ...(body.enabled !== undefined ? { enabled: !!body.enabled } : {}),
    ...(body.sortOrder !== undefined ? { sortOrder: numOrNull(body.sortOrder) ?? 0 } : {}),
  };
}

function strOrNull(v: unknown, maxLen: number): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  if (!t || t.length > maxLen) return null;
  return t;
}
function numOrNull(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  return Math.floor(v);
}
