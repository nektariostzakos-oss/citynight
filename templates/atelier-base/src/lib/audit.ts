import { getAppRoot } from "@/lib/appRoot";
import { promises as fs } from "fs";
import path from "path";

const FILE = () => path.join(getAppRoot(), "data", "audit.json");
const MAX = 5000;

export type AuditEntry = {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  target: string;
  meta?: Record<string, unknown>;
  createdAt: string;
};

async function readAll(): Promise<AuditEntry[]> {
  try {
    return JSON.parse(await fs.readFile(FILE(), "utf-8")) as AuditEntry[];
  } catch {
    return [];
  }
}
async function writeAll(items: AuditEntry[]) {
  await fs.mkdir(path.dirname(FILE()), { recursive: true });
  await fs.writeFile(FILE(), JSON.stringify(items, null, 2), "utf-8");
}

export async function log(input: Omit<AuditEntry, "id" | "createdAt">): Promise<void> {
  const all = await readAll();
  all.push({
    ...input,
    id: `a_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
    createdAt: new Date().toISOString(),
  });
  if (all.length > MAX) all.splice(0, all.length - MAX);
  await writeAll(all);
}

export async function listAudit(limit = 200): Promise<AuditEntry[]> {
  const all = await readAll();
  return all.slice(-limit).reverse();
}
