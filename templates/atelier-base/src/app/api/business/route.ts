import { NextResponse } from "next/server";
import { loadBusiness } from "../../../lib/settings";

export async function GET() {
  const business = await loadBusiness();
  return NextResponse.json(
    { business },
    { headers: { "cache-control": "no-store" } }
  );
}
