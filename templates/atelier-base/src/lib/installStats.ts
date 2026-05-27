import { getAppRoot } from "@/lib/appRoot";
import { promises as fs } from "fs";
import path from "path";

const FILE = () => path.join(getAppRoot(), "data", "install-stats.json");

export type InstallStats = {
  total: number;
  recent: string[]; // ISO dates, capped at 200
};

export async function readStats(): Promise<InstallStats> {
  try {
    return JSON.parse(await fs.readFile(FILE(), "utf-8")) as InstallStats;
  } catch {
    // Fresh install — no inflated fake baseline. The counter earns its first
    // tick the moment a buyer actually finishes the wizard.
    return { total: 0, recent: [] };
  }
}

export async function recordInstall(): Promise<InstallStats> {
  const s = await readStats();
  s.total += 1;
  s.recent.push(new Date().toISOString());
  if (s.recent.length > 200) s.recent.splice(0, s.recent.length - 200);
  await fs.mkdir(path.dirname(FILE()), { recursive: true });
  await fs.writeFile(FILE(), JSON.stringify(s, null, 2), "utf-8");
  return s;
}

export async function recentCount(hours: number): Promise<number> {
  const s = await readStats();
  const cutoff = Date.now() - hours * 60 * 60_000;
  return s.recent.filter((d) => new Date(d).getTime() >= cutoff).length;
}
