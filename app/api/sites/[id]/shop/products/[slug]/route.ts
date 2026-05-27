// GET /api/sites/[id]/shop/products/[slug] — public product detail.

import { NextRequest, NextResponse } from 'next/server';
import { getProduct } from '@/lib/shop';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string; slug: string }> }) {
  const { id, slug } = await params;
  const p = getProduct(id, slug);
  if (!p || !p.enabled) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({
    product: {
      id: p.id, slug: p.slug, name: p.name,
      category: p.category, shortDesc: p.shortDesc, longDesc: p.longDesc,
      priceCents: p.priceCents, currency: p.currency,
      imageUrl: p.imageUrl, stock: p.stock, featured: p.featured,
    },
  });
}
