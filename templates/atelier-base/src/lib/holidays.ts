import { getAppRoot } from "@/lib/appRoot";
import { promises as fs } from "fs";
import path from "path";

const FILE = () => path.join(getAppRoot(), "data", "holidays.json");

export type Holiday = {
  id: string;
  date: string;
  label: string;
  recurring: boolean;
};

async function readAll(): Promise<Holiday[]> {
  try {
    return JSON.parse(await fs.readFile(FILE(), "utf-8")) as Holiday[];
  } catch {
    return [];
  }
}
async function writeAll(items: Holiday[]) {
  await fs.mkdir(path.dirname(FILE()), { recursive: true });
  await fs.writeFile(FILE(), JSON.stringify(items, null, 2), "utf-8");
}

export async function listHolidays(): Promise<Holiday[]> {
  return (await readAll()).sort((a, b) => a.date.localeCompare(b.date));
}

export async function addHoliday(input: Omit<Holiday, "id">): Promise<Holiday> {
  const all = await readAll();
  const h: Holiday = {
    ...input,
    id: `h_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
  };
  all.push(h);
  await writeAll(all);
  return h;
}

export async function deleteHoliday(id: string): Promise<boolean> {
  const all = await readAll();
  const next = all.filter((h) => h.id !== id);
  if (next.length === all.length) return false;
  await writeAll(next);
  return true;
}

export async function isHoliday(date: string): Promise<boolean> {
  const all = await readAll();
  const md = date.slice(5);
  return all.some((h) => h.date === date || (h.recurring && h.date.slice(5) === md));
}
