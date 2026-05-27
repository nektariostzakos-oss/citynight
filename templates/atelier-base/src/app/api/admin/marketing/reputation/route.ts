import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { isMarketingFeatureOn } from "@/lib/marketingFlags";
import { getFunnelStats } from "@/lib/reviewEngine";
import { listBookings } from "@/lib/bookings";

/**
 * GET /api/admin/marketing/reputation
 *
 * Returns the review-funnel stats for the salon admin's reputation panel.
 * Double-gated: the tenant admin session AND the `reviewEngine` marketing
 * feature flag (403 when the feature is off).
 */
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!(await isMarketingFeatureOn("reviewEngine"))) {
    return NextResponse.json({ error: "feature_off" }, { status: 403 });
  }
  // A review request is counted on every booking whose reviewedAt is set.
  const bookings = await listBookings();
  const requestedCount = bookings.filter((b) => b.reviewedAt).length;
  const stats = await getFunnelStats(requestedCount);
  return NextResponse.json({ stats });
}
