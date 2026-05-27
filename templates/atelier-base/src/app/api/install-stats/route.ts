import { NextResponse } from "next/server";
import { readStats, recentCount } from "../../../lib/installStats";

export async function GET() {
  const s = await readStats();
  const week = await recentCount(24 * 7);
  return NextResponse.json({ total: s.total, week });
}
