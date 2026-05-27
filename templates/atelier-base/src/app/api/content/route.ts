import { NextRequest, NextResponse } from "next/server";
import { loadContent, saveSection } from "../../../lib/content";
import { isAdmin } from "../../../lib/auth";

export async function GET() {
  return NextResponse.json({ content: await loadContent() });
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { section, patch } = await req.json();
  if (!section || typeof patch !== "object") {
    return NextResponse.json(
      { error: "section + patch required" },
      { status: 400 }
    );
  }
  const all = await saveSection(section, patch);
  return NextResponse.json({ ok: true, content: all });
}
