import { getAppRoot } from "@/lib/appRoot";
import { promises as fs } from "fs";
import path from "path";
import { SERVICES, type LocalizedService } from "./services";

const FILE = () => path.join(getAppRoot(), "data", "services.json");

export type CustomService = {
  id: string;
  tkey: string;
  name: string;
  name_el?: string;
  desc: string;
  desc_el?: string;
  duration: number;
  price: number;
  /** Minutes of clean-up / reset time needed AFTER this service before the
   * next booking can start in the same chair. Prevents back-to-back overruns
   * (e.g. balayage processing tail). Defaults to 0. */
  bufferMinutes?: number;
  /** Show as "From $X" rather than a fixed price (useful for colour services
   * where length / thickness changes the final bill). */
  fromPrice?: boolean;
  /** Optional booking deposit for this service, a fixed amount in the shop
   * currency. When set, the booking flow offers the customer an optional
   * Stripe deposit payment. 0 / undefined = no deposit. */
  deposit?: number;
  /** When true, new clients need a 48h patch test before their first booking.
   * Booking flow will show a warning and the admin profile will flag it. */
  requiresPatchTest?: boolean;
  /** Optional: tie this service to a category of add-ons (e.g. colour can add
   * bond treatment). Stored as service IDs the booking flow offers as extras. */
  addOnIds?: string[];
  category?: string;
  enabled: boolean;
  order: number;
};

async function readAll(): Promise<CustomService[] | null> {
  try {
    const parsed = JSON.parse(await fs.readFile(FILE(), "utf-8"));
    return Array.isArray(parsed) ? (parsed as CustomService[]) : null;
  } catch {
    return null;
  }
}
async function writeAll(items: CustomService[]) {
  await fs.mkdir(path.dirname(FILE()), { recursive: true });
  await fs.writeFile(FILE(), JSON.stringify(items, null, 2), "utf-8");
}

export async function getActiveServices(): Promise<LocalizedService[]> {
  const custom = await readAll();
  if (custom && custom.length > 0) {
    return custom
      .filter((s) => s.enabled)
      .sort((a, b) => a.order - b.order)
      .map((s) => ({
        id: s.id,
        tkey: s.tkey || `svc.${s.id}`,
        name: s.name,
        duration: s.duration,
        price: s.price,
        desc: s.desc,
      }));
  }
  return SERVICES;
}

export async function listAdminServices(): Promise<CustomService[]> {
  const custom = await readAll();
  if (custom) return custom.sort((a, b) => a.order - b.order);
  return SERVICES.map((s, i) => ({
    id: s.id,
    tkey: s.tkey,
    name: s.name,
    desc: s.desc,
    duration: s.duration,
    price: s.price,
    enabled: true,
    order: i,
  }));
}

export async function saveServices(items: CustomService[]): Promise<CustomService[]> {
  await writeAll(items);
  return items;
}

export async function upsertService(item: CustomService): Promise<CustomService> {
  const all = await listAdminServices();
  const idx = all.findIndex((s) => s.id === item.id);
  if (idx >= 0) all[idx] = item;
  else all.push(item);
  await writeAll(all);
  return item;
}

export async function deleteService(id: string): Promise<boolean> {
  const all = await listAdminServices();
  const next = all.filter((s) => s.id !== id);
  await writeAll(next);
  return true;
}
