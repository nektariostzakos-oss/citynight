import { getAppRoot } from "@/lib/appRoot";
import { promises as fs } from "fs";
import path from "path";
import { withFileLock } from "./fileLock";

const FILE = () => path.join(getAppRoot(), "data", "products.json");
const LOCK = "products.json";

export type Product = {
  id: string;
  slug: string;
  name_en: string;
  name_el: string;
  price: number;
  category_en: string;
  category_el: string;
  shortDesc_en: string;
  shortDesc_el: string;
  longDesc_en: string;
  longDesc_el: string;
  image: string;
  stock: number;
  featured: boolean;
};

async function readAll(): Promise<Product[]> {
  try {
    const raw = await fs.readFile(FILE(), "utf-8");
    return JSON.parse(raw) as Product[];
  } catch {
    return [];
  }
}

async function writeAll(items: Product[]) {
  await fs.mkdir(path.dirname(FILE()), { recursive: true });
  await fs.writeFile(FILE(), JSON.stringify(items, null, 2), "utf-8");
}

export async function listProducts(): Promise<Product[]> {
  return readAll();
}

export async function findProduct(
  idOrSlug: string
): Promise<Product | null> {
  const all = await readAll();
  return all.find((p) => p.id === idOrSlug || p.slug === idOrSlug) ?? null;
}

export async function createProduct(
  input: Omit<Product, "id">
): Promise<Product> {
  const all = await readAll();
  const p: Product = {
    ...input,
    id: `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
  };
  all.push(p);
  await writeAll(all);
  return p;
}

export async function updateProduct(
  id: string,
  patch: Partial<Product>
): Promise<Product | null> {
  const all = await readAll();
  const idx = all.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], ...patch, id: all[idx].id };
  await writeAll(all);
  return all[idx];
}

export async function deleteProduct(id: string): Promise<boolean> {
  const all = await readAll();
  const next = all.filter((p) => p.id !== id);
  if (next.length === all.length) return false;
  await writeAll(next);
  return true;
}

/** Decrement stock for an order. Returns false if any line would go negative.
 * Serialized via fileLock so two concurrent orders for the last unit can't
 * both succeed (causing oversell). */
export async function reserveStock(
  items: Array<{ id: string; qty: number }>
): Promise<{ ok: boolean; error?: string }> {
  return withFileLock(LOCK, async () => {
    const all = await readAll();
    const updated = all.slice();
    for (const line of items) {
      const idx = updated.findIndex((p) => p.id === line.id);
      if (idx === -1) return { ok: false, error: `Product ${line.id} not found.` };
      if (updated[idx].stock < line.qty) {
        return {
          ok: false,
          error: `Not enough stock for "${updated[idx].name_en}" (have ${updated[idx].stock}, need ${line.qty}).`,
        };
      }
      updated[idx] = { ...updated[idx], stock: updated[idx].stock - line.qty };
    }
    await writeAll(updated);
    return { ok: true };
  });
}

/** Rollback a stock reservation (e.g. when an order errors after reserveStock). */
export async function releaseStock(
  items: Array<{ id: string; qty: number }>
): Promise<void> {
  await withFileLock(LOCK, async () => {
    const all = await readAll();
    const updated = all.slice();
    for (const line of items) {
      const idx = updated.findIndex((p) => p.id === line.id);
      if (idx === -1) continue;
      updated[idx] = { ...updated[idx], stock: updated[idx].stock + Math.max(0, line.qty) };
    }
    await writeAll(updated);
  });
}
