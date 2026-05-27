import { promises as fs } from "node:fs";
import path from "node:path";
import { getCurrentTenant } from "./tenantContext";

/**
 * Tenant Marketing Suite — feature switches, demo-app side.
 *
 * The salon app reads the SAME two sources the operator writes
 * (src/lib/tenantMarketingFlags.ts):
 *   1. Global default — an env var per feature. In the SaaS bundle both apps
 *      share one Node process, so operator-config has already populated
 *      process.env. In a standalone customer ZIP the vars are unset and the
 *      hard fallback applies.
 *   2. Per-tenant override — data/tenant-marketing-overrides.json under the
 *      bundle root (process.env.ATELIER_TENANTS_ROOT). Absent in a ZIP.
 *
 * A feature whose resolved flag is false must render nothing in the tenant UI
 * and its API route must return 403.
 */

export const MARKETING_FEATURES = [
  "push",
  "email",
  "sms",
  "campaigns",
  "automations",
  "reviewEngine",
  "segments",
] as const;

export type MarketingFeature = (typeof MARKETING_FEATURES)[number];
export type MarketingFlags = Record<MarketingFeature, boolean>;

const ENV_OF: Record<MarketingFeature, string> = {
  push: "ATELIER_TENANT_PUSH",
  email: "ATELIER_TENANT_EMAIL_MKT",
  sms: "ATELIER_TENANT_SMS",
  campaigns: "ATELIER_TENANT_CAMPAIGNS",
  automations: "ATELIER_TENANT_AUTOMATIONS",
  reviewEngine: "ATELIER_TENANT_REVIEW",
  segments: "ATELIER_TENANT_SEGMENTS",
};

/** Default when nothing is configured. SMS is off (per-message cost). */
const FALLBACK: MarketingFlags = {
  push: true,
  email: true,
  sms: false,
  campaigns: true,
  automations: true,
  reviewEngine: true,
  segments: true,
};

function envBool(v: string | undefined): boolean | null {
  if (v === undefined || v.trim() === "") return null;
  const s = v.trim().toLowerCase();
  return s === "1" || s === "true" || s === "on" || s === "yes";
}

function overridesFile(): string | null {
  const root = process.env.ATELIER_TENANTS_ROOT;
  if (!root) return null;
  return path.join(root, "data", "tenant-marketing-overrides.json");
}

async function readOverrideFor(
  slug: string,
): Promise<Partial<MarketingFlags>> {
  const file = overridesFile();
  if (!file) return {};
  try {
    const raw = JSON.parse(await fs.readFile(file, "utf-8"));
    const forTenant = raw && typeof raw === "object" ? raw[slug] : null;
    return forTenant && typeof forTenant === "object" ? forTenant : {};
  } catch {
    return {};
  }
}

/**
 * Resolve the marketing flags for the active tenant. Outside a tenant context
 * (a standalone customer ZIP) it returns the global/fallback defaults, so the
 * salon owner keeps full control of their own install.
 */
export async function resolveMarketingFlags(): Promise<MarketingFlags> {
  const out = {} as MarketingFlags;
  for (const f of MARKETING_FEATURES) {
    const parsed = envBool(process.env[ENV_OF[f]]);
    out[f] = parsed === null ? FALLBACK[f] : parsed;
  }
  const slug = getCurrentTenant();
  if (slug) {
    const override = await readOverrideFor(slug);
    for (const f of MARKETING_FEATURES) {
      if (typeof override[f] === "boolean") out[f] = override[f] as boolean;
    }
  }
  return out;
}

/** Whether one feature is on for the active tenant. */
export async function isMarketingFeatureOn(
  feature: MarketingFeature,
): Promise<boolean> {
  return (await resolveMarketingFlags())[feature];
}
