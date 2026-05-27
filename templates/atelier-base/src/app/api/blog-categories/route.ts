import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "../../../lib/auth";
import { createCategory, deleteCategory, listCategories, renameCategory } from "../../../lib/blogCategories";

export async function GET() {
  return NextResponse.json({ categories: await listCategories() });
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  if (!body.name) return NextResponse.json({ error: "name required" }, { status: 400 });
  try {
    const c = await createCategory(String(body.name));
    return NextResponse.json({ category: c }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, name } = await req.json();
  if (!id || !name) return NextResponse.json({ error: "id + name required" }, { status: 400 });
  const c = await renameCategory(id, name);
  if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ category: c });
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await deleteCategory(id);
  return NextResponse.json({ ok: true });
}
