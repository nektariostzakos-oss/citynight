import { NextRequest, NextResponse } from "next/server";
import { createProduct, listProducts } from "../../../lib/products";
import { isAdmin } from "../../../lib/auth";

export async function GET() {
  return NextResponse.json({ products: await listProducts() });
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const required = ["slug", "name_en", "price"];
  for (const k of required) {
    if (!body[k])
      return NextResponse.json(
        { error: `Missing ${k}` },
        { status: 400 }
      );
  }
  const p = await createProduct({
    slug: String(body.slug),
    name_en: String(body.name_en),
    name_el: String(body.name_el ?? body.name_en),
    price: Number(body.price) || 0,
    category_en: String(body.category_en ?? ""),
    category_el: String(body.category_el ?? ""),
    shortDesc_en: String(body.shortDesc_en ?? ""),
    shortDesc_el: String(body.shortDesc_el ?? ""),
    longDesc_en: String(body.longDesc_en ?? ""),
    longDesc_el: String(body.longDesc_el ?? ""),
    image: String(body.image ?? ""),
    stock: Number(body.stock ?? 0),
    featured: !!body.featured,
  });
  return NextResponse.json({ product: p }, { status: 201 });
}
