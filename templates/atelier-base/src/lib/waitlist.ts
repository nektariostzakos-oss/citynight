import { getAppRoot } from "@/lib/appRoot";
import { promises as fs } from "fs";
import path from "path";

const FILE = () => path.join(getAppRoot(), "data", "waitlist.json");

export type WaitlistEntry = {
  id: string;
  name: string;
  phone: string;
  email: string;
  serviceId: string;
  serviceName: string;
  barberId: string;
  preferredDate: string;
  preferredTime: string;
  notes?: string;
  status: "waiting" | "notified" | "converted" | "cancelled";
  createdAt: string;
};

async function readAll(): Promise<WaitlistEntry[]> {
  try {
    return JSON.parse(await fs.readFile(FILE(), "utf-8")) as WaitlistEntry[];
  } catch {
    return [];
  }
}
async function writeAll(items: WaitlistEntry[]) {
  await fs.mkdir(path.dirname(FILE()), { recursive: true });
  await fs.writeFile(FILE(), JSON.stringify(items, null, 2), "utf-8");
}

export async function listWaitlist(): Promise<WaitlistEntry[]> {
  return (await readAll()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function addWaitlist(input: Omit<WaitlistEntry, "id" | "status" | "createdAt">): Promise<WaitlistEntry> {
  const all = await readAll();
  const e: WaitlistEntry = {
    ...input,
    id: `wl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    status: "waiting",
    createdAt: new Date().toISOString(),
  };
  all.push(e);
  await writeAll(all);
  return e;
}

export async function updateWaitlistStatus(id: string, status: WaitlistEntry["status"]): Promise<WaitlistEntry | null> {
  const all = await readAll();
  const i = all.findIndex((e) => e.id === id);
  if (i < 0) return null;
  all[i].status = status;
  await writeAll(all);
  return all[i];
}

export async function deleteWaitlist(id: string): Promise<boolean> {
  const all = await readAll();
  const next = all.filter((e) => e.id !== id);
  if (next.length === all.length) return false;
  await writeAll(next);
  return true;
}

/**
 * Mark the first waiting entry for a (service, date, time) slot as
 * "notified" so the operator knows a seat just opened up. Called from the
 * booking-cancel paths. Returns the promoted entry or null when nobody
 * was waiting. Match falls back to (service, date) so a waitlister who
 * left their preferredTime blank still gets surfaced.
 */
export async function promoteForSlot(
  serviceId: string,
  date: string,
  time: string,
): Promise<WaitlistEntry | null> {
  const all = await readAll();
  const idx = all.findIndex(
    (e) =>
      e.status === "waiting" &&
      e.serviceId === serviceId &&
      e.preferredDate === date &&
      (!e.preferredTime || e.preferredTime === time),
  );
  if (idx < 0) return null;
  all[idx].status = "notified";
  await writeAll(all);
  return all[idx];
}
