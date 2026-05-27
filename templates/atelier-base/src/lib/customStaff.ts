import { getAppRoot } from "@/lib/appRoot";
import { promises as fs } from "fs";
import path from "path";

const FILE = () => path.join(getAppRoot(), "data", "staff.json");

export type StaffMember = {
  id: string;
  name: string;
  role: string;
  bio: string;
  photo: string;
  specialties: string[];
  enabled: boolean;
  /** 0 = Sunday … 6 = Saturday. Days the staff member is in. */
  workDays: number[];
  startTime: string;
  endTime: string;
  /** Optional lunch/break window during which this staff isn't bookable. */
  breakStart?: string;
  breakEnd?: string;
  order: number;
};

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}

/**
 * Given a staff member and a 0–6 day-of-week index, return the slot filter
 * predicate (keeps slot strings that fall inside this staff's working hours
 * and outside their lunch break). Returns null if the staff isn't in that day.
 */
export function slotFilterForStaff(staff: StaffMember, dayOfWeek: number): ((slot: string) => boolean) | null {
  if (!staff.workDays?.includes(dayOfWeek)) return null;
  const dayStart = toMinutes(staff.startTime || "00:00");
  const dayEnd = toMinutes(staff.endTime || "23:59");
  const brkStart = staff.breakStart ? toMinutes(staff.breakStart) : null;
  const brkEnd = staff.breakEnd ? toMinutes(staff.breakEnd) : null;
  return (slot: string) => {
    const m = toMinutes(slot);
    if (m < dayStart || m >= dayEnd) return false;
    if (brkStart != null && brkEnd != null && m >= brkStart && m < brkEnd) return false;
    return true;
  };
}

async function readAll(): Promise<StaffMember[] | null> {
  try {
    const parsed = JSON.parse(await fs.readFile(FILE(), "utf-8"));
    return Array.isArray(parsed) ? (parsed as StaffMember[]) : null;
  } catch {
    return null;
  }
}
async function writeAll(items: StaffMember[]) {
  await fs.mkdir(path.dirname(FILE()), { recursive: true });
  await fs.writeFile(FILE(), JSON.stringify(items, null, 2), "utf-8");
}

export async function getActiveStaff(): Promise<
  Array<{ id: string; name: string; role: string }>
> {
  const custom = await readAll();
  if (custom && custom.length > 0) {
    return custom
      .filter((s) => s.enabled)
      .sort((a, b) => a.order - b.order)
      .map((s) => ({ id: s.id, name: s.name, role: s.role }));
  }
  // No staff.json yet (a "start fresh" install) → empty, never the stale
  // hardcoded barber team. The showcase gets its team from its own staff.json.
  return [];
}

export async function listAdminStaff(): Promise<StaffMember[]> {
  const custom = await readAll();
  if (custom) return custom.sort((a, b) => a.order - b.order);
  return [];
}

export async function upsertStaff(item: StaffMember): Promise<StaffMember> {
  const all = await listAdminStaff();
  const idx = all.findIndex((s) => s.id === item.id);
  if (idx >= 0) all[idx] = item;
  else all.push(item);
  await writeAll(all);
  return item;
}

export async function deleteStaff(id: string): Promise<boolean> {
  const all = await listAdminStaff();
  const next = all.filter((s) => s.id !== id);
  await writeAll(next);
  return true;
}
