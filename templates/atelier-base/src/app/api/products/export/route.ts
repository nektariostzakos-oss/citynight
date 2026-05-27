import { NextResponse } from "next/server";
import { isAdmin } from "../../../../lib/auth";
import { listProducts } from "../../../../lib/products";
import { toCsv } from "../../../../lib/csv";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const products = await listProducts();
  const csv = toCsv(
    products.map((p) => ({
      id: p.id,
      slug: p.slug,
      name_en: p.name_en,
      name_el: p.name_el,
      price: p.price,
      stock: p.stock,
      category_en: p.category_en,
      category_el: p.category_el,
      shortDesc_en: p.shortDesc_en,
      shortDesc_el: p.shortDesc_el,
      longDesc_en: p.longDesc_en,
      longDesc_el: p.longDesc_el,
      image: p.image,
      featured: p.featured ? "true" : "false",
    })),
    ["id", "slug", "name_en", "name_el", "price", "stock", "category_en", "category_el", "shortDesc_en", "shortDesc_el", "longDesc_en", "longDesc_el", "image", "featured"]
  );
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="products-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
