import { NextRequest, NextResponse } from "next/server";
import { listAdminStaff } from "../../../../lib/customStaff";

/**
 * Public read-only endpoint — returns each staff member's weekly availability
 * (workDays, startTime, endTime, optional lunch break). Used by the booking
 * flow to hide slots outside the chosen stylist's working hours.
 */
export async function GET(_req: NextRequest) {
  const staff = await listAdminStaff();
  const payload = staff
    .filter((s) => s.enabled !== false)
    .map((s) => ({
      id: s.id,
      workDays: s.workDays ?? [1, 2, 3, 4, 5, 6],
      startTime: s.startTime ?? "10:00",
      endTime: s.endTime ?? "21:00",
      breakStart: s.breakStart,
      breakEnd: s.breakEnd,
    }));
  return NextResponse.json(
    { staff: payload },
    { headers: { "cache-control": "public, max-age=60, stale-while-revalidate=300" } }
  );
}
