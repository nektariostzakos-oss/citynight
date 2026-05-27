/**
 * APK build records, JSON-backed under `<appRoot>/data/apk-builds.json`.
 *
 * One record per "Build Android app" click. The admin page polls a build's
 * status until it is `ready` or `failed`. Resolved through `getAppRoot()`, so
 * each SaaS tenant keeps its own build history with no extra plumbing.
 */
import { getAppRoot } from "@/lib/appRoot";
import { withFileLock } from "@/lib/fileLock";
import { promises as fs } from "fs";
import path from "path";

export type ApkBuildStatus =
  | "queued"
  | "building"
  | "signing"
  | "ready"
  | "failed";

export type ApkBuild = {
  id: string;
  status: ApkBuildStatus;
  startedAt: string;
  finishedAt?: string;
  /** Human-readable failure reason, set only when status is "failed". */
  error?: string;
  /** APK path relative to `<appRoot>/public`, e.g. "uploads/apks/<id>.apk". */
  apkRelPath?: string;
  apkSizeBytes?: number;
  /** Android versionCode and human version this build carries. */
  versionCode: number;
  appVersion: string;
  /** Download counter, capped to discourage sharing the signed URL publicly. */
  downloads: number;
};

const FILE = () => path.join(getAppRoot(), "data", "apk-builds.json");

async function readAll(): Promise<ApkBuild[]> {
  try {
    const raw = await fs.readFile(FILE(), "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ApkBuild[]) : [];
  } catch {
    return [];
  }
}

async function writeAll(builds: ApkBuild[]): Promise<void> {
  await fs.mkdir(path.dirname(FILE()), { recursive: true });
  await fs.writeFile(FILE(), JSON.stringify(builds, null, 2), "utf-8");
}

export async function listBuilds(limit = 10): Promise<ApkBuild[]> {
  const all = await readAll();
  return all
    .slice()
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .slice(0, limit);
}

export async function getBuild(id: string): Promise<ApkBuild | null> {
  const all = await readAll();
  return all.find((b) => b.id === id) ?? null;
}

/** The most recent build that finished successfully, or null. */
export async function getLatestReady(): Promise<ApkBuild | null> {
  const all = await listBuilds(50);
  return all.find((b) => b.status === "ready") ?? null;
}

/** True when a build is still running (queued / building / signing). */
export async function hasActiveBuild(): Promise<boolean> {
  const all = await readAll();
  return all.some(
    (b) =>
      b.status === "queued" ||
      b.status === "building" ||
      b.status === "signing",
  );
}

export async function createBuild(
  init: Pick<ApkBuild, "id" | "versionCode" | "appVersion">,
): Promise<ApkBuild> {
  return withFileLock(FILE(), async () => {
    const all = await readAll();
    const build: ApkBuild = {
      ...init,
      status: "queued",
      startedAt: new Date().toISOString(),
      downloads: 0,
    };
    all.push(build);
    await writeAll(all);
    return build;
  });
}

export async function updateBuild(
  id: string,
  patch: Partial<Omit<ApkBuild, "id">>,
): Promise<ApkBuild | null> {
  return withFileLock(FILE(), async () => {
    const all = await readAll();
    const idx = all.findIndex((b) => b.id === id);
    if (idx === -1) return null;
    all[idx] = { ...all[idx], ...patch };
    await writeAll(all);
    return all[idx];
  });
}

/** Remove a build record (does not delete its APK file). */
export async function deleteBuild(id: string): Promise<boolean> {
  return withFileLock(FILE(), async () => {
    const all = await readAll();
    const next = all.filter((b) => b.id !== id);
    if (next.length === all.length) return false;
    await writeAll(next);
    return true;
  });
}
