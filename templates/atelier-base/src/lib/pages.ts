import { getAppRoot } from "@/lib/appRoot";
import { promises as fs } from "fs";
import path from "path";

const FILE = () => path.join(getAppRoot(), "data", "pages.json");

export type Page = {
  id: string;
  slug: string;
  title_en: string;
  title_el: string;
  excerpt_en: string;
  excerpt_el: string;
  body_en: string;
  body_el: string;
  image: string;
  tags: string[];
  category: string;
  kind: "page" | "post";
  published: boolean;
  publishedAt: string;
  updatedAt: string;
};

async function readAll(): Promise<Page[]> {
  try {
    return JSON.parse(await fs.readFile(FILE(), "utf-8")) as Page[];
  } catch {
    return [];
  }
}
async function writeAll(items: Page[]) {
  await fs.mkdir(path.dirname(FILE()), { recursive: true });
  await fs.writeFile(FILE(), JSON.stringify(items, null, 2), "utf-8");
}

export async function listPages(kind?: Page["kind"]): Promise<Page[]> {
  const all = await readAll();
  const filtered = kind ? all.filter((p) => p.kind === kind) : all;
  return filtered.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export async function findPage(slugOrId: string): Promise<Page | null> {
  const all = await readAll();
  return all.find((p) => p.slug === slugOrId || p.id === slugOrId) ?? null;
}

export async function createPage(input: Omit<Page, "id" | "publishedAt" | "updatedAt">): Promise<Page> {
  const all = await readAll();
  const now = new Date().toISOString();
  const p: Page = {
    ...input,
    id: `pg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    publishedAt: now,
    updatedAt: now,
  };
  all.push(p);
  await writeAll(all);
  return p;
}

export async function updatePage(id: string, patch: Partial<Page>): Promise<Page | null> {
  const all = await readAll();
  const i = all.findIndex((p) => p.id === id);
  if (i < 0) return null;
  all[i] = { ...all[i], ...patch, id: all[i].id, updatedAt: new Date().toISOString() };
  await writeAll(all);
  return all[i];
}

export async function deletePage(id: string): Promise<boolean> {
  const all = await readAll();
  const next = all.filter((p) => p.id !== id);
  if (next.length === all.length) return false;
  await writeAll(next);
  return true;
}
