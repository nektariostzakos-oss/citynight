import { NextResponse } from "next/server";
import { listAdminServices } from "../../../lib/customServices";

/**
 * Public read-only endpoint for the service catalog, used by the admin
 * walk-in modal and the booking flow. Returns all customer-facing fields
 * (including fromPrice, requiresPatchTest, addOnIds) so the UI can render
 * upsells and warnings without an extra round-trip.
 */
export async function GET() {
  const all = await listAdminServices();
  const services = all
    .filter((s) => s.enabled !== false)
    .sort((a, b) => a.order - b.order)
    .map((s) => ({
      id: s.id,
      name: s.name,
      desc: s.desc,
      price: s.price,
      duration: s.duration,
      fromPrice: s.fromPrice,
      requiresPatchTest: s.requiresPatchTest,
      bufferMinutes: s.bufferMinutes,
      addOnIds: s.addOnIds,
    }));
  return NextResponse.json(
    { services },
    { headers: { "cache-control": "public, max-age=60, stale-while-revalidate=300" } }
  );
}
