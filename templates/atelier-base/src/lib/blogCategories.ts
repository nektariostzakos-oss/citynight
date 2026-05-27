import { getAppRoot } from "@/lib/appRoot";
import { promises as fs } from "fs";
import path from "path";

const FILE = () => path.join(getAppRoot(), "data", "blog-categories.json");

export type Category = {
  id: string;
  name: string;
  slug: string;
  order: number;
};

const DEFAULTS: Category[] = [
  { id: "cat_grooming", name: "Grooming tips", slug: "grooming-tips", order: 0 },
  { id: "cat_styling", name: "Styling guides", slug: "styling-guides", order: 1 },
  { id: "cat_beard", name: "Beard care", slug: "beard-care", order: 2 },
  { id: "cat_hair", name: "Hair care", slug: "hair-care", order: 3 },
  { id: "cat_chair", name: "Behind the chair", slug: "behind-the-chair", order: 4 },
  { id: "cat_news", name: "News", slug: "news", order: 5 },
];

async function readAll(): Promise<Category[] | null> {
  try {
    const parsed = JSON.parse(await fs.readFile(FILE(), "utf-8"));
    return Array.isArray(parsed) ? (parsed as Category[]) : null;
  } catch {
    return null;
  }
}
async function writeAll(items: Category[]) {
  await fs.mkdir(path.dirname(FILE()), { recursive: true });
  await fs.writeFile(FILE(), JSON.stringify(items, null, 2), "utf-8");
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export async function listCategories(): Promise<Category[]> {
  const custom = await readAll();
  const items = custom ?? DEFAULTS;
  return [...items].sort((a, b) => a.order - b.order);
}

export async function createCategory(name: string): Promise<Category> {
  const all = await listCategories();
  if (all.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
    throw new Error("Category already exists.");
  }
  const c: Category = {
    id: `cat_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
    name: name.trim(),
    slug: slugify(name),
    order: all.length,
  };
  await writeAll([...all, c]);
  return c;
}

export async function deleteCategory(id: string): Promise<boolean> {
  const all = await listCategories();
  const next = all.filter((c) => c.id !== id);
  if (next.length === all.length) return false;
  await writeAll(next);
  return true;
}

export async function renameCategory(id: string, name: string): Promise<Category | null> {
  const all = await listCategories();
  const idx = all.findIndex((c) => c.id === id);
  if (idx < 0) return null;
  all[idx] = { ...all[idx], name: name.trim(), slug: slugify(name) };
  await writeAll(all);
  return all[idx];
}
