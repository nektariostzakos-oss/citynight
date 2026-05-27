import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { getAppRoot } from "@/lib/appRoot";
import { withFileLock } from "./fileLock";

/**
 * Per-tenant, per-UTC-day, per-channel send quota.
 *
 * Counters live at <getAppRoot()>/data/marketing-quota.json and are reset
 * automatically when the UTC date advances. Config (caps) lives at
 * <getAppRoot()>/data/marketing-quota-config.json so the operator can set
 * per-tenant caps; defaults fall back to env vars, then hardcoded limits.
 *
 * Environment-variable defaults:
 *   ATELIER_TENANT_PUSH_CAP   (default 2000)
 *   ATELIER_TENANT_EMAIL_CAP  (default 1000)
 *   ATELIER_TENANT_SMS_CAP    (default 200)
 *
 * reserveSends(channel, n) is atomic (file-locked) and returns how many of
 * the requested n were actually granted. When the daily cap is exhausted the
 * caller receives 0 and the unsent messages are NOT silently dropped — the
 * caller is responsible for rescheduling or reporting them.
 */

// ---- File paths ---------------------------------------------------------------

const QUOTA_FILE = () =>
  path.join(getAppRoot(), "data", "marketing-quota.json");

const CONFIG_FILE = () =>
  path.join(getAppRoot(), "data", "marketing-quota-config.json");

const QUOTA_LOCK = "marketing-quota.json";
const CONFIG_LOCK = "marketing-quota-config.json";

// ---- Types --------------------------------------------------------------------

export type QuotaChannel = "push" | "email" | "sms";

/** Hardcoded fallback caps used when neither the config file nor env vars
 *  provide a value. Conservative defaults suitable for a small salon. */
const HARDCODED_CAPS: Record<QuotaChannel, number> = {
  push: 2000,
  email: 1000,
  sms: 200,
};

const ENV_CAP: Record<QuotaChannel, string> = {
  push: "ATELIER_TENANT_PUSH_CAP",
  email: "ATELIER_TENANT_EMAIL_CAP",
  sms: "ATELIER_TENANT_SMS_CAP",
};

export type QuotaConfig = {
  /** Max sends per channel per UTC day. null means "use default". */
  caps: Partial<Record<QuotaChannel, number | null>>;
};

/** The persisted counter file shape. */
type QuotaCounters = {
  /** UTC date string "YYYY-MM-DD" for the current window. */
  date: string;
  push: number;
  email: number;
  sms: number;
};

// ---- Helpers ------------------------------------------------------------------

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseEnvCap(env: string | undefined): number | null {
  if (!env) return null;
  const n = parseInt(env, 10);
  return isNaN(n) || n < 0 ? null : n;
}

// ---- Config -------------------------------------------------------------------

async function readConfig(): Promise<QuotaConfig> {
  try {
    const raw = await fs.readFile(CONFIG_FILE(), "utf-8");
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed as QuotaConfig;
  } catch {
    // File absent on first use — return empty.
  }
  return { caps: {} };
}

async function writeConfig(cfg: QuotaConfig): Promise<void> {
  await fs.mkdir(path.dirname(CONFIG_FILE()), { recursive: true });
  await fs.writeFile(
    CONFIG_FILE(),
    JSON.stringify(cfg, null, 2) + "\n",
    "utf-8",
  );
}

/** Read the quota config for this tenant. */
export async function getQuotaConfig(): Promise<QuotaConfig> {
  return readConfig();
}

/** Persist a (partial) config update. Only the supplied caps are changed. */
export async function setQuotaConfig(
  patch: Partial<Record<QuotaChannel, number | null>>,
): Promise<QuotaConfig> {
  return withFileLock(CONFIG_LOCK, async () => {
    const cfg = await readConfig();
    cfg.caps = { ...cfg.caps, ...patch };
    await writeConfig(cfg);
    return cfg;
  });
}

/**
 * Resolve the effective cap for a channel: config file > env var > hardcoded.
 * A stored null means "use env / hardcoded default".
 */
export async function capFor(channel: QuotaChannel): Promise<number> {
  const cfg = await readConfig();
  const stored = cfg.caps[channel];
  if (typeof stored === "number") return stored;
  const fromEnv = parseEnvCap(process.env[ENV_CAP[channel]]);
  return fromEnv !== null ? fromEnv : HARDCODED_CAPS[channel];
}

// ---- Counters ----------------------------------------------------------------

async function readCounters(): Promise<QuotaCounters> {
  try {
    const raw = await fs.readFile(QUOTA_FILE(), "utf-8");
    const parsed = JSON.parse(raw) as QuotaCounters;
    if (parsed && typeof parsed === "object" && parsed.date) return parsed;
  } catch {
    // File absent — start fresh.
  }
  return { date: todayUtc(), push: 0, email: 0, sms: 0 };
}

async function writeCounters(c: QuotaCounters): Promise<void> {
  await fs.mkdir(path.dirname(QUOTA_FILE()), { recursive: true });
  await fs.writeFile(
    QUOTA_FILE(),
    JSON.stringify(c, null, 2) + "\n",
    "utf-8",
  );
}

/** Roll the counters to a fresh day if the UTC date has advanced. */
function rollIfStale(c: QuotaCounters, today: string): QuotaCounters {
  if (c.date === today) return c;
  return { date: today, push: 0, email: 0, sms: 0 };
}

// ---- Public API ---------------------------------------------------------------

/**
 * How many sends remain on the given channel for the current UTC day.
 * Safe to call concurrently; no lock needed for a read.
 */
export async function remainingToday(channel: QuotaChannel): Promise<number> {
  const [counters, cap] = await Promise.all([readCounters(), capFor(channel)]);
  const today = todayUtc();
  const c = rollIfStale(counters, today);
  return Math.max(0, cap - c[channel]);
}

/**
 * Atomically reserve up to `n` sends on `channel` for today.
 *
 * Returns the number actually granted (0..n). When the cap is nearly
 * exhausted a partial grant is returned — the caller should throttle the
 * remaining recipients to the next tick rather than dropping them.
 *
 * Thread-safe via withFileLock inside a single process; for a multi-process
 * deploy swap for a DB transaction or cross-process lock.
 */
export async function reserveSends(
  channel: QuotaChannel,
  n: number,
): Promise<number> {
  if (n <= 0) return 0;

  return withFileLock(QUOTA_LOCK, async () => {
    const today = todayUtc();
    const [raw, cap] = await Promise.all([readCounters(), capFor(channel)]);
    const c = rollIfStale(raw, today);

    const used = c[channel];
    const remaining = Math.max(0, cap - used);
    const granted = Math.min(n, remaining);

    if (granted > 0) {
      c[channel] = used + granted;
      await writeCounters(c);
    }

    return granted;
  });
}
