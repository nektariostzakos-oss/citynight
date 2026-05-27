import { getAppRoot } from "@/lib/appRoot";
import { promises as fs } from "fs";
import path from "path";

const FILE = () => path.join(getAppRoot(), "data", "views.json");
const MAX_ROWS = 20_000;

export type View = {
  id: string;
  path: string;
  ref: string;
  lang: string;
  ua: string;
  sid: string;
  createdAt: string;
};

async function readAll(): Promise<View[]> {
  try {
    const raw = await fs.readFile(FILE(), "utf-8");
    return JSON.parse(raw) as View[];
  } catch {
    return [];
  }
}

async function writeAll(items: View[]) {
  await fs.mkdir(path.dirname(FILE()), { recursive: true });
  await fs.writeFile(FILE(), JSON.stringify(items, null, 2), "utf-8");
}

export async function recordView(
  input: Omit<View, "id" | "createdAt">
): Promise<void> {
  const all = await readAll();
  all.push({
    ...input,
    id: `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
  });
  if (all.length > MAX_ROWS) all.splice(0, all.length - MAX_ROWS);
  await writeAll(all);
}

export async function listViews(): Promise<View[]> {
  return readAll();
}

/** How many recorded views match an exact page path (e.g. /blog/my-post). */
export async function countViews(pagePath: string): Promise<number> {
  const all = await readAll();
  return all.reduce((n, v) => (v.path === pagePath ? n + 1 : n), 0);
}
