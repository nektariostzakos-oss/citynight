import { NextResponse } from "next/server";
import { loadNav } from "../../../lib/settings";

export async function GET() {
  const nav = await loadNav();
  return NextResponse.json(
    { nav },
    { headers: { "cache-control": "no-store" } }
  );
}
