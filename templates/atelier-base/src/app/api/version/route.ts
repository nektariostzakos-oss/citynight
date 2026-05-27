import { getBaseRoot } from "@/lib/appRoot";
import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Same-origin version check used by the admin dashboard's update badge.
 * Server-side fetches the mothership's latest, compares to local package.json.
 * Cached for 1h to keep load light on the operator endpoint.
 */

const UPSTREAM =
  process.env.ATELIER_VERSION_URL ||
  process.env.NEXT_PUBLIC_ATELIER_VERSION_URL ||
  "https://atelier.mindscrollers.com/api/template-version";

type Cached = {
  latest: string;
  repoUrl: string;
  changelogUrl: string;
  releasedAt: string | null;
  title: string | null;
  notes: string;
  at: number;
};
const CACHE_TTL_MS = 60 * 60 * 1000;
let cached: Cached | null = null;

async function readLocalVersion(): Promise<string> {
  // Override knob — primarily for local dev where the demo + the marketing
  // mothership read the same package.json. Set ATELIER_OVERRIDE_CURRENT in
  // demo/.env.local to fake an older customer install for testing.
  const override = (process.env.ATELIER_OVERRIDE_CURRENT || "").trim();
  if (override) return override;
  try {
    const file = path.join(getBaseRoot(), "package.json");
    const pkg = JSON.parse(await fs.readFile(file, "utf-8")) as { version?: string };
    return pkg.version || "0.0.0";
  } catch {
    return "0.0.0";
  }
}

async function fetchUpstream(): Promise<Cached | null> {
  try {
    const r = await fetch(UPSTREAM, { cache: "no-store" });
    if (!r.ok) return null;
    const body = (await r.json()) as Partial<Cached>;
    if (!body?.latest) return null;
    return {
      latest: body.latest,
      repoUrl: body.repoUrl || "",
      changelogUrl: body.changelogUrl || "",
      releasedAt: body.releasedAt ?? null,
      title: body.title ?? null,
      notes: body.notes ?? "",
      at: Date.now(),
    };
  } catch {
    return null;
  }
}

/** Semver-ish compare. Returns 1 if a > b, -1 if a < b, 0 if equal. */
function cmp(a: string, b: string): number {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const ai = pa[i] ?? 0;
    const bi = pb[i] ?? 0;
    if (ai > bi) return 1;
    if (ai < bi) return -1;
  }
  return 0;
}

export async function GET() {
  const current = await readLocalVersion();
  if (!cached || Date.now() - cached.at > CACHE_TTL_MS) {
    const fresh = await fetchUpstream();
    if (fresh) cached = fresh;
  }
  const latest = cached?.latest || current;
  const updateAvailable = cmp(latest, current) > 0;
  return NextResponse.json(
    {
      current,
      latest,
      updateAvailable,
      repoUrl: cached?.repoUrl || "",
      changelogUrl: cached?.changelogUrl || "",
      releasedAt: cached?.releasedAt ?? null,
      title: cached?.title ?? null,
      notes: cached?.notes ?? "",
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
