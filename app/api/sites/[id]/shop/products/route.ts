// GET /api/sites/[id]/shop/products — public list of enabled products.

import { NextRequest, NextResponse } from 'next/server';
import { listEnabledProducts } from '@/lib/shop';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const products = listEnabledProducts(id).map((p) => ({
    id: p.id, slug: p.slug, name: p.name,
    category: p.category, shortDesc: p.shortDesc, longDesc: p.longDesc,
    priceCents: p.priceCents, currency: p.currency,
    imageUrl: p.imageUrl, stock: p.stock, featured: p.featured,
  }));
  return NextResponse.json({ products });
}
