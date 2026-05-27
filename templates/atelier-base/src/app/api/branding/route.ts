import { NextResponse } from "next/server";
import { loadBranding } from "../../../lib/settings";

export async function GET() {
  const branding = await loadBranding();
  return NextResponse.json(
    { branding },
    { headers: { "cache-control": "no-store" } }
  );
}
