import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { getAppRoot } from "@/lib/appRoot";
import { withFileLock } from "./fileLock";
import type { EnrichedClient } from "./clients";
import type { Booking } from "./bookings";

/**
 * Lifecycle automations — pre-built, event-driven messages a salon can enable.
 *
 * Per-tenant file: <getAppRoot()>/data/marketing-automations.json
 * File-locked via withFileLock for all writes.
 *
 * Four built-in types (seeded disabled on first read):
 *   - win_back    : client with no visit in N days (default 60).
 *   - birthday    : client whose birthday matches today (MM-DD).
 *   - rebooking   : X days after a completed visit (default 21).
 *   - loyalty     : every N completed visits (default 5).
 *
 * Idempotency: a per-automation sent-ledger (AutomationLog[]) records every
 * enrolment so the same client is never messaged twice for the same trigger
 * occurrence:
 *   - win_back  : deduplicated by clientId + dormancy-window epoch (the
 *                 floor of daysSince counted in daysSince-day chunks).
 *   - birthday  : deduplicated by clientId + year (YYYY).
 *   - rebooking : deduplicated by clientId + bookingId.
 *   - loyalty   : deduplicated by clientId + milestone (visit count rounded
 *                 down to the nearest multiple of everyNVisits).
 */

// ---- File paths ---------------------------------------------------------------

const FILE = () =>
  path.join(getAppRoot(), "data", "marketing-automations.json");

const LOG_FILE = () =>
  path.join(getAppRoot(), "data", "marketing-automation-log.json");

const LOCK = "marketing-automations.json";
const LOG_LOCK = "marketing-automation-log.json";

// ---- Types --------------------------------------------------------------------

export type AutomationChannel = "push" | "email" | "sms";

export type AutomationType = "win_back" | "birthday" | "rebooking" | "loyalty";

/** Per-channel message payload for an automation (mirrors CampaignMessages). */
export type AutomationMessages = {
  push?: { title: string; body: string; url?: string };
  email?: { subject: string; body: string };
  sms?: { text: string };
};

/** Type-specific parameters. */
export type WinBackParams = { daysSince: number };
export type BirthdayParams = Record<string, never>;
export type RebookingParams = { daysAfter: number };
export type LoyaltyParams = { everyNVisits: number };

export type AutomationParams =
  | WinBackParams
  | BirthdayParams
  | RebookingParams
  | LoyaltyParams;

export type Automation = {
  id: string;
  type: AutomationType;
  /** Human label (operator-editable per tenant). */
  name: string;
  /** Disabled by default; salon owner flips on. */
  enabled: boolean;
  channels: AutomationChannel[];
  messages: AutomationMessages;
  /** Optional coupon code attached to the message (from coupons.json). */
  couponCode?: string;
  params: AutomationParams;
  createdAt: string;
  updatedAt: string;
};

/** One row in the dedup ledger. */
export type AutomationLog = {
  automationId: string;
  /** Idempotency key — see per-type derivation in sentKey(). */
  key: string;
  sentAt: string;
};

/** What dueEnrolments returns so the scheduler can send and log. */
export type PendingEnrolment = {
  automation: Automation;
  client: EnrichedClient;
  /** The booking that triggered rebooking (undefined for other types). */
  booking?: Booking;
  /** The dedup key to write into the log after sending. */
  sentKey: string;
};

// ---- Default seed -------------------------------------------------------------

const DEFAULT_AUTOMATIONS: Omit<Automation, "id" | "createdAt" | "updatedAt">[] =
  [
    {
      type: "win_back",
      name: "Win-back",
      enabled: false,
      channels: ["email"],
      messages: {
        email: {
          subject: "We miss you",
          body: "Hi {name}, it's been a while. Book a visit and enjoy your favourite service.",
        },
      },
      params: { daysSince: 60 } as WinBackParams,
    },
    {
      type: "birthday",
      name: "Birthday offer",
      enabled: false,
      channels: ["email"],
      messages: {
        email: {
          subject: "Happy birthday from us",
          body: "Hi {name}, wishing you a great birthday. Use code {coupon} for a treat on us.",
        },
      },
      params: {} as BirthdayParams,
    },
    {
      type: "rebooking",
      name: "Rebooking nudge",
      enabled: false,
      channels: ["push", "email"],
      messages: {
        push: {
          title: "Time for your next visit?",
          body: "Book your next appointment online in seconds.",
        },
        email: {
          subject: "Ready to book again?",
          body: "Hi {name}, it's been a few weeks. Book your next appointment whenever suits you.",
        },
      },
      params: { daysAfter: 21 } as RebookingParams,
    },
    {
      type: "loyalty",
      name: "Loyalty milestone",
      enabled: false,
      channels: ["push"],
      messages: {
        push: {
          title: "Thank you for your loyalty!",
          body: "You've reached a loyalty milestone. Enjoy a special reward.",
        },
      },
      params: { everyNVisits: 5 } as LoyaltyParams,
    },
  ];

// ---- Helpers ------------------------------------------------------------------

async function readAutomations(): Promise<Automation[]> {
  try {
    const raw = await fs.readFile(FILE(), "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Automation[]) : [];
  } catch {
    return [];
  }
}

async function writeAutomations(items: Automation[]): Promise<void> {
  await fs.mkdir(path.dirname(FILE()), { recursive: true });
  await fs.writeFile(FILE(), JSON.stringify(items, null, 2) + "\n", "utf-8");
}

async function readLog(): Promise<AutomationLog[]> {
  try {
    const raw = await fs.readFile(LOG_FILE(), "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AutomationLog[]) : [];
  } catch {
    return [];
  }
}

async function writeLog(items: AutomationLog[]): Promise<void> {
  await fs.mkdir(path.dirname(LOG_FILE()), { recursive: true });
  await fs.writeFile(
    LOG_FILE(),
    JSON.stringify(items, null, 2) + "\n",
    "utf-8",
  );
}

function makeId(): string {
  return "auto_" + crypto.randomBytes(6).toString("hex");
}

function now(): string {
  return new Date().toISOString();
}

// ---- Seeding ------------------------------------------------------------------

/**
 * Return the current automations list, seeding the four defaults on the first
 * call (when the file is absent or empty). Mirrors the DEFAULT_DRIPS seeding
 * pattern used in the operator email-marketing module.
 */
async function seedIfEmpty(all: Automation[]): Promise<Automation[]> {
  if (all.length > 0) return all;
  const ts = now();
  const seeded: Automation[] = DEFAULT_AUTOMATIONS.map((d) => ({
    ...d,
    id: makeId(),
    createdAt: ts,
    updatedAt: ts,
  }));
  await writeAutomations(seeded);
  return seeded;
}

// ---- Public API ---------------------------------------------------------------

/** List automations, seeding defaults on the first call. */
export async function listAutomations(): Promise<Automation[]> {
  return withFileLock(LOCK, async () => {
    const all = await readAutomations();
    return seedIfEmpty(all);
  });
}

/** Get one automation by id, null if not found. */
export async function getAutomation(id: string): Promise<Automation | null> {
  const all = await listAutomations();
  return all.find((a) => a.id === id) ?? null;
}

/**
 * Update an automation's fields (toggle enabled, edit channels, message,
 * params, coupon code). The type and id are immutable.
 */
export async function updateAutomation(
  id: string,
  patch: Partial<
    Pick<
      Automation,
      "enabled" | "channels" | "messages" | "params" | "couponCode" | "name"
    >
  >,
): Promise<Automation | null> {
  return withFileLock(LOCK, async () => {
    const all = await seedIfEmpty(await readAutomations());
    const idx = all.findIndex((a) => a.id === id);
    if (idx < 0) return null;
    all[idx] = { ...all[idx], ...patch, id, updatedAt: now() };
    await writeAutomations(all);
    return all[idx];
  });
}

// ---- Dedup key derivation ----------------------------------------------------

/**
 * Derive an idempotency key for a given automation + client, so the ledger
 * can guarantee "once per trigger occurrence".
 *
 * win_back  → "<clientId>:wb:<window>" where window = Math.floor(daysSince / epoch)
 * birthday  → "<clientId>:bd:<YYYY>"
 * rebooking → "<clientId>:rb:<bookingId>"
 * loyalty   → "<clientId>:ly:<milestone>" where milestone is visits floored to
 *             the nearest multiple of everyNVisits
 */
function deriveSentKey(
  automation: Automation,
  client: EnrichedClient,
  booking?: Booking,
): string {
  const cid = client.id;
  switch (automation.type) {
    case "win_back": {
      const params = automation.params as WinBackParams;
      const daysSince = params.daysSince;
      const msPerDay = 86_400_000;
      const windowDays = daysSince;
      const epoch = Math.floor(Date.now() / (msPerDay * windowDays));
      return `${cid}:wb:${epoch}`;
    }
    case "birthday": {
      const year = new Date().getFullYear();
      return `${cid}:bd:${year}`;
    }
    case "rebooking": {
      const bid = booking?.id ?? "unknown";
      return `${cid}:rb:${bid}`;
    }
    case "loyalty": {
      const params = automation.params as LoyaltyParams;
      const n = params.everyNVisits;
      const milestone = Math.floor(client.bookingCount / n) * n;
      return `${cid}:ly:${milestone}`;
    }
  }
}

// ---- Eligibility evaluation --------------------------------------------------

/**
 * Returns true if `birthday` (ISO "YYYY-MM-DD", "--MM-DD", or "MM-DD") falls
 * on today's month+day in the caller's local clock.
 */
function isBirthdayToday(birthday: string | undefined): boolean {
  if (!birthday) return false;
  // Extract the last two MM-DD digits from any format.
  const m = birthday.match(/(\d{2})-(\d{2})$/);
  if (!m) return false;
  const bMonth = parseInt(m[1], 10);
  const bDay = parseInt(m[2], 10);
  const today = new Date();
  return bMonth === today.getMonth() + 1 && bDay === today.getDate();
}

/**
 * Compute the ISO date string N days ago (UTC).
 */
function daysAgoDate(n: number): Date {
  return new Date(Date.now() - n * 86_400_000);
}

/**
 * For rebooking: find the most recently completed booking for a client (by
 * email or phone) that is NOT already covered by the ledger.
 */
function lastCompletedBooking(
  client: EnrichedClient,
  bookings: Booking[],
): Booking | undefined {
  const email = (client.email || "").trim().toLowerCase();
  const phone = (client.phone || "").replace(/[^\d+]/g, "");
  const completed = bookings
    .filter((b) => {
      if (b.status !== "completed") return false;
      const be = (b.email || "").trim().toLowerCase();
      const bp = (b.phone || "").replace(/[^\d+]/g, "");
      return (email && be === email) || (phone && bp === phone);
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return completed[0];
}

/**
 * Evaluate which clients are due for a given automation this pass.
 *
 * Returns PendingEnrolment[] — only clients not yet in the ledger for this
 * trigger occurrence. The caller (processAutomations) sends, appends events,
 * then writes the log entries.
 *
 * Note: `bookings` is only used for rebooking type; the caller may pass an
 * empty array for other types to save a read.
 */
export async function dueEnrolments(
  automation: Automation,
  clients: EnrichedClient[],
  bookings: Booking[],
): Promise<PendingEnrolment[]> {
  if (!automation.enabled) return [];

  // Read the dedup ledger once.
  const log = await readLog();
  const logged = new Set(log.map((l) => l.key));

  const pending: PendingEnrolment[] = [];
  const msPerDay = 86_400_000;

  for (const client of clients) {
    switch (automation.type) {
      case "win_back": {
        const params = automation.params as WinBackParams;
        if (!client.lastSeen) continue; // never visited
        const lastDate = new Date(client.lastSeen);
        const daysGone = (Date.now() - lastDate.getTime()) / msPerDay;
        if (daysGone < params.daysSince) continue;
        const key = deriveSentKey(automation, client);
        if (logged.has(key)) continue;
        pending.push({ automation, client, sentKey: key });
        break;
      }
      case "birthday": {
        if (!isBirthdayToday(client.birthday)) continue;
        const key = deriveSentKey(automation, client);
        if (logged.has(key)) continue;
        pending.push({ automation, client, sentKey: key });
        break;
      }
      case "rebooking": {
        const params = automation.params as RebookingParams;
        const booking = lastCompletedBooking(client, bookings);
        if (!booking) continue;
        // Only fire if the visit happened exactly daysAfter days ago (give a
        // 24h window so the 5-min tick doesn't miss it).
        const visitDate = new Date(`${booking.date}T00:00:00`);
        const daysAgo = (Date.now() - visitDate.getTime()) / msPerDay;
        if (daysAgo < params.daysAfter || daysAgo >= params.daysAfter + 1)
          continue;
        const key = deriveSentKey(automation, client, booking);
        if (logged.has(key)) continue;
        pending.push({ automation, client, booking, sentKey: key });
        break;
      }
      case "loyalty": {
        const params = automation.params as LoyaltyParams;
        const completed = bookings.filter((b) => {
          if (b.status !== "completed") return false;
          const be = (b.email || "").trim().toLowerCase();
          const bp = (b.phone || "").replace(/[^\d+]/g, "");
          const ce = (client.email || "").trim().toLowerCase();
          const cp = (client.phone || "").replace(/[^\d+]/g, "");
          return (ce && be === ce) || (cp && bp === cp);
        }).length;
        if (completed === 0) continue;
        if (completed % params.everyNVisits !== 0) continue;
        const key = deriveSentKey(automation, client);
        if (logged.has(key)) continue;
        pending.push({ automation, client, sentKey: key });
        break;
      }
    }
  }

  return pending;
}

/**
 * Record that a batch of (automationId, key) pairs have been sent so the same
 * client is never re-messaged for the same trigger occurrence.
 *
 * Trimmed to 50 000 rows maximum (oldest pruned first) so the file stays
 * bounded even if a salon runs automations for years.
 */
export async function recordEnrolments(
  entries: Array<{ automationId: string; key: string }>,
): Promise<void> {
  if (entries.length === 0) return;
  await withFileLock(LOG_LOCK, async () => {
    const all = await readLog();
    const ts = now();
    for (const { automationId, key } of entries) {
      all.push({ automationId, key, sentAt: ts });
    }
    // Ring-buffer cap: drop oldest past 50 000.
    const capped = all.slice(-50_000);
    await writeLog(capped);
  });
}

// ---- Stats helper -------------------------------------------------------------

/**
 * Count how many enrolments (sends) each automation has accrued.
 * Used by the GET /api/admin/marketing/automations response so the UI can show
 * a "sent N times" badge without a separate fetch.
 */
export async function automationSentCounts(): Promise<
  Record<string, number>
> {
  const log = await readLog();
  const out: Record<string, number> = {};
  for (const row of log) {
    out[row.automationId] = (out[row.automationId] ?? 0) + 1;
  }
  return out;
}
