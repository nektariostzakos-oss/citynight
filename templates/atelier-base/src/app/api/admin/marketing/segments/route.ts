/**
 * GET  /api/admin/marketing/segments        — list all saved segments.
 *      ?preview=<id>                        — also return recipient count.
 * POST /api/admin/marketing/segments        — create a segment.
 * DELETE /api/admin/marketing/segments?id=  — delete a segment.
 *
 * Gated by:
 *   1. The tenant admin session (isAdmin).
 *   2. The `segments` marketing feature flag (isMarketingFeatureOn).
 *
 * Returns 401 when not authenticated, 403 when the flag is off.
 */
import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { isMarketingFeatureOn } from "@/lib/marketingFlags";
import {
  listSegments,
  getSegment,
  createSegment,
  deleteSegment,
  computeSegmentClients,
  type SegmentFilter,
} from "@/lib/marketingSegments";

export const runtime = "nodejs";

/** Shared auth + feature gate. Returns a response on failure, null on pass. */
async function gate(): Promise<NextResponse | null> {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await isMarketingFeatureOn("segments"))) {
    return NextResponse.json(
      { error: "Segments feature is not enabled." },
      { status: 403 },
    );
  }
  return null;
}

export async function GET(req: NextRequest) {
  const denied = await gate();
  if (denied) return denied;

  const segments = await listSegments();
  const previewId = req.nextUrl.searchParams.get("preview");

  if (previewId) {
    const seg = segments.find((s) => s.id === previewId);
    if (!seg) {
      return NextResponse.json({ error: "Segment not found." }, { status: 404 });
    }
    const clients = await computeSegmentClients(seg);
    return NextResponse.json({
      segments,
      preview: {
        id: previewId,
        count: clients.length,
        reachEmail: clients.filter((c) => c.reach.email).length,
        reachPhone: clients.filter((c) => c.reach.phone).length,
        reachPush: clients.filter((c) => c.reach.push).length,
      },
    });
  }

  return NextResponse.json({ segments });
}

export async function POST(req: NextRequest) {
  const denied = await gate();
  if (denied) return denied;

  const body = (await req.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const description =
    typeof body.description === "string" ? body.description.trim() : "";
  const rawFilter =
    body.filter && typeof body.filter === "object" ? body.filter : {};

  if (!name) {
    return NextResponse.json({ error: "name is required." }, { status: 400 });
  }

  // Build the filter from the raw input, only accepting known keys.
  const filter: SegmentFilter = {};
  const f = rawFilter as Record<string, unknown>;

  if (typeof f.lastVisitBefore === "string") filter.lastVisitBefore = f.lastVisitBefore;
  if (typeof f.lastVisitAfter === "string") filter.lastVisitAfter = f.lastVisitAfter;
  if (typeof f.minTotalSpend === "number") filter.minTotalSpend = f.minTotalSpend;
  if (typeof f.minNoShowCount === "number") filter.minNoShowCount = f.minNoShowCount;
  if (typeof f.hasUpcomingBooking === "boolean") filter.hasUpcomingBooking = f.hasUpcomingBooking;
  if (typeof f.optedIntoPush === "boolean") filter.optedIntoPush = f.optedIntoPush;
  if (typeof f.hasEmail === "boolean") filter.hasEmail = f.hasEmail;
  if (typeof f.hasPhone === "boolean") filter.hasPhone = f.hasPhone;
  if (Array.isArray(f.serviceEverBooked)) {
    filter.serviceEverBooked = (f.serviceEverBooked as unknown[])
      .filter((v): v is string => typeof v === "string");
  }

  const segment = await createSegment({ name, description, filter });
  return NextResponse.json({ segment }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const denied = await gate();
  if (denied) return denied;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id is required." }, { status: 400 });
  }

  const seg = await getSegment(id);
  if (!seg) {
    return NextResponse.json({ error: "Segment not found." }, { status: 404 });
  }

  const ok = await deleteSegment(id);
  return NextResponse.json({ deleted: ok });
}
