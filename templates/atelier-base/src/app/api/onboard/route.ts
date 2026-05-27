import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "../../../lib/auth";
import { loadSettings, saveSettings } from "../../../lib/settings";

export async function GET() {
  const s = await loadSettings();
  return NextResponse.json({ onboarded: !!s.onboarded });
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const current = await loadSettings();
  await saveSettings({ ...current, ...body, onboarded: true });
  return NextResponse.json({ ok: true });
}
