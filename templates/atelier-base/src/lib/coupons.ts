import { getAppRoot } from "@/lib/appRoot";
import { promises as fs } from "fs";
import path from "path";

const FILE = () => path.join(getAppRoot(), "data", "coupons.json");

export type Coupon = {
  id: string;
  code: string;
  kind: "percent" | "fixed";
  value: number;
  maxUses: number;
  uses: number;
  minTotal: number;
  expiresAt: string;
  appliesTo: "all" | "bookings" | "products";
  active: boolean;
  createdAt: string;
};

async function readAll(): Promise<Coupon[]> {
  try {
    return JSON.parse(await fs.readFile(FILE(), "utf-8")) as Coupon[];
  } catch {
    return [];
  }
}
async function writeAll(items: Coupon[]) {
  await fs.mkdir(path.dirname(FILE()), { recursive: true });
  await fs.writeFile(FILE(), JSON.stringify(items, null, 2), "utf-8");
}

export async function listCoupons(): Promise<Coupon[]> {
  return (await readAll()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createCoupon(input: Omit<Coupon, "id" | "uses" | "createdAt">): Promise<Coupon> {
  const all = await readAll();
  const c: Coupon = {
    ...input,
    code: input.code.toUpperCase().trim(),
    uses: 0,
    id: `cpn_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
  };
  all.push(c);
  await writeAll(all);
  return c;
}

export async function updateCoupon(id: string, patch: Partial<Coupon>): Promise<Coupon | null> {
  const all = await readAll();
  const i = all.findIndex((c) => c.id === id);
  if (i < 0) return null;
  all[i] = { ...all[i], ...patch, id: all[i].id };
  if (patch.code) all[i].code = all[i].code.toUpperCase().trim();
  await writeAll(all);
  return all[i];
}

export async function deleteCoupon(id: string): Promise<boolean> {
  const all = await readAll();
  const next = all.filter((c) => c.id !== id);
  if (next.length === all.length) return false;
  await writeAll(next);
  return true;
}

export async function validateCoupon(
  code: string,
  total: number,
  scope: "bookings" | "products"
): Promise<{ ok: boolean; coupon?: Coupon; error?: string; discount?: number }> {
  const all = await readAll();
  const c = all.find((x) => x.code === code.toUpperCase().trim());
  if (!c) return { ok: false, error: "Invalid code." };
  if (!c.active) return { ok: false, error: "Code is inactive." };
  if (c.expiresAt && new Date(c.expiresAt).getTime() < Date.now())
    return { ok: false, error: "Code has expired." };
  if (c.maxUses && c.uses >= c.maxUses) return { ok: false, error: "Code is fully redeemed." };
  if (c.minTotal && total < c.minTotal)
    return { ok: false, error: `Minimum $${c.minTotal} required.` };
  if (c.appliesTo !== "all" && c.appliesTo !== scope)
    return { ok: false, error: `Code doesn't apply to ${scope}.` };
  const discount = c.kind === "percent" ? (total * c.value) / 100 : Math.min(c.value, total);
  return { ok: true, coupon: c, discount };
}

export async function redeemCoupon(id: string): Promise<void> {
  const all = await readAll();
  const i = all.findIndex((c) => c.id === id);
  if (i < 0) return;
  all[i].uses += 1;
  await writeAll(all);
}
