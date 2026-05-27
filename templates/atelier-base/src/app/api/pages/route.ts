import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "../../../lib/auth";
import { createPage, deletePage, listPages, updatePage } from "../../../lib/pages";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const kind = url.searchParams.get("kind") as "page" | "post" | null;
  const all = await listPages(kind ?? undefined);
  if (!(await isAdmin())) {
    return NextResponse.json({ pages: all.filter((p) => p.published) });
  }
  return NextResponse.json({ pages: all });
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  if (!body.slug || !body.title_en) return NextResponse.json({ error: "slug + title required" }, { status: 400 });
  const p = await createPage({
    slug: String(body.slug),
    title_en: String(body.title_en),
    title_el: String(body.title_el || body.title_en),
    excerpt_en: String(body.excerpt_en || ""),
    excerpt_el: String(body.excerpt_el || ""),
    body_en: String(body.body_en || ""),
    body_el: String(body.body_el || ""),
    image: String(body.image || ""),
    tags: Array.isArray(body.tags) ? body.tags : [],
    category: String(body.category || "General"),
    kind: body.kind === "page" ? "page" : "post",
    published: !!body.published,
  });
  return NextResponse.json({ page: p }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, ...patch } = await req.json();
  const p = await updatePage(id, patch);
  if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ page: p });
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await deletePage(id);
  return NextResponse.json({ ok: true });
}
