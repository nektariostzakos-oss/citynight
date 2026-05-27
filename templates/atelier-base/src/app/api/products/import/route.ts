import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "../../../../lib/auth";
import { createProduct, listProducts, updateProduct } from "../../../../lib/products";
import { fromCsv } from "../../../../lib/csv";

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const ct = req.headers.get("content-type") || "";
  const text = ct.includes("application/json")
    ? ((await req.json()).csv as string) || ""
    : await req.text();
  const rows = fromCsv(text);
  if (rows.length === 0) {
    return NextResponse.json({ error: "No rows in CSV." }, { status: 400 });
  }

  const existing = await listProducts();
  const bySlug = new Map(existing.map((p) => [p.slug, p]));
  const byId = new Map(existing.map((p) => [p.id, p]));

  let added = 0, updated = 0, skipped = 0;
  for (const r of rows) {
    const slug = (r.slug || "").trim();
    const name_en = (r.name_en || "").trim();
    if (!slug || !name_en) { skipped++; continue; }
    const payload = {
      slug,
      name_en,
      name_el: r.name_el || name_en,
      price: Number(r.price) || 0,
      stock: Number(r.stock) || 0,
      category_en: r.category_en || "",
      category_el: r.category_el || "",
      shortDesc_en: r.shortDesc_en || "",
      shortDesc_el: r.shortDesc_el || "",
      longDesc_en: r.longDesc_en || "",
      longDesc_el: r.longDesc_el || "",
      image: r.image || "",
      featured: /^(true|1|yes)$/i.test(r.featured || ""),
    };
    const match = (r.id && byId.get(r.id)) || bySlug.get(slug);
    if (match) {
      await updateProduct(match.id, payload);
      updated++;
    } else {
      await createProduct(payload);
      added++;
    }
  }
  return NextResponse.json({ ok: true, added, updated, skipped });
}
