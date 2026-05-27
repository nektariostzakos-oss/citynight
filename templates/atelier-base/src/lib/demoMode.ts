import { getAppRoot, getBaseRoot } from "@/lib/appRoot";
import { getCurrentTenant } from "@/lib/tenantContext";
import { promises as fs } from "fs";
import path from "path";

export const DEMO_ADMIN_EMAIL = "admin@oakline.studio";
export const DEMO_ADMIN_PASSWORD = "oakline2026";

/** The reserved slug of the built-in showcase tenant (the /barber demo). */
export const DEMO_TENANT_SLUG = "__demo__";

/**
 * True when the current request is serving the built-in showcase.
 *
 *  - SaaS bundle: the showcase is the reserved `__demo__` tenant. Real paying
 *    tenants are NOT in demo mode (no banner, no force-dark, indexable).
 *  - Standalone: a customer's downloaded ZIP is never in demo mode; only an
 *    internal dev run with DEMO_MODE=1 (and no tenant) is.
 */
export function isDemoMode(): boolean {
  const slug = getCurrentTenant();
  if (slug) return slug === DEMO_TENANT_SLUG;
  return process.env.DEMO_MODE === "true" || process.env.DEMO_MODE === "1";
}

export function getMarketingUrl(): string {
  return process.env.MARKETING_URL || "http://localhost:3100";
}

export function getResetSecret(): string {
  return process.env.DEMO_RESET_SECRET || "";
}

// Lazy: the tenant data root is only known per-request (see appRoot.ts).
const dataDir = () => path.join(getAppRoot(), "data");

// The committed seed at demo/demos/barber/data/ is the single source of truth
// for the showcase. Every reset restores it to exactly this state, so the live
// /barber demo is "locked": a visitor's edits never survive the hourly reset.
const seedDir = () => path.join(getBaseRoot(), "demos", "barber", "data");

const SEED_FILES = [
  "settings.json",
  "services.json",
  "staff.json",
  "products.json",
  "pages.json",
  "content.json",
  "blog-categories.json",
  "transformations.json",
  "bookings.json",
  "orders.json",
  "clients.json",
  "reviews.json",
  "waitlist.json",
  "coupons.json",
  "gift-cards.json",
  "users.json",
] as const;

// Telemetry and logs: blanked on reset so each cycle starts clean.
const CLEARED_FILES = ["views.json", "audit.json", "emails.log.json"] as const;

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * Restore the showcase to its committed seed state. Under the SaaS bundle this
 * runs inside the `__demo__` tenant context (the demo-reset cron is reached via
 * /barber/api/cron/demo-reset), so getAppRoot() resolves to
 * data/tenants/__demo__/_root. Driven hourly by scheduleDemoReset() in
 * server.js.
 */
export async function resetDemo(): Promise<{ restored: string[]; cleared: string[] }> {
  const DATA_DIR = dataDir();
  const SEED_DIR = seedDir();
  await fs.mkdir(DATA_DIR, { recursive: true });
  const restored: string[] = [];
  for (const f of SEED_FILES) {
    const src = path.join(SEED_DIR, f);
    if (await fileExists(src)) {
      await fs.copyFile(src, path.join(DATA_DIR, f));
      restored.push(f);
    }
  }
  const cleared: string[] = [];
  for (const f of CLEARED_FILES) {
    await fs.writeFile(path.join(DATA_DIR, f), "[]\n", "utf-8");
    cleared.push(f);
  }
  // The seed content references local /uploads/*.webp images. Sync any that
  // are missing (copy-if-absent) so the live demo self-heals its images on
  // every reset, including the first boot after a fresh deploy.
  try {
    const seedUploads = path.join(getBaseRoot(), "demos", "barber", "uploads");
    const liveUploads = path.join(getAppRoot(), "public", "uploads");
    await fs.mkdir(liveUploads, { recursive: true });
    for (const f of await fs.readdir(seedUploads)) {
      if (f.startsWith(".")) continue;
      const dst = path.join(liveUploads, f);
      if (!(await fileExists(dst))) {
        await fs.copyFile(path.join(seedUploads, f), dst);
      }
    }
  } catch {
    /* no seed uploads — nothing to sync */
  }
  return { restored, cleared };
}

/**
 * Seed the showcase on first boot when it has never been set up. A no-op once
 * settings.json exists, so it is safe to call on every startup. In the SaaS
 * bundle the __demo__ tenant is seeded by server.js, so this is dead there;
 * it stays for any standalone DEMO_MODE dev run.
 */
export async function ensureDemoSeeded(): Promise<void> {
  if (!isDemoMode()) return;
  if (await fileExists(path.join(dataDir(), "settings.json"))) return;
  await resetDemo();
}
