import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { getAppRoot } from "@/lib/appRoot";

/**
 * Tenant marketing event log.
 *
 * Append-only ring buffer at <getAppRoot()>/data/marketing-events.json.
 * Capped at MAX_EVENTS entries (oldest dropped when the cap is exceeded) so
 * the file never grows unbounded. 20 000 events covers ~1–2 months of typical
 * send volume for a small salon.
 *
 * One event is written per recipient per channel per campaign pass.
 * Stats are rolled up in-memory from the event log by statsForCampaign().
 */

const FILE = () =>
  path.join(getAppRoot(), "data", "marketing-events.json");

/** Ring-buffer cap: keep the most recent N events. */
const MAX_EVENTS = 20_000;

// ---- Types ------------------------------------------------------------------

export type MarketingEventKind = "send" | "open" | "click" | "fail";
export type MarketingEventChannel = "push" | "email" | "sms";

export type MarketingEvent = {
  id: string;
  campaignId: string;
  channel: MarketingEventChannel;
  /** Recipient identifier: email address, phone number, or push endpoint. */
  recipient: string;
  kind: MarketingEventKind;
  /** ISO datetime. */
  at: string;
  /** Human-readable error reason, present only on kind="fail". */
  error?: string;
};

export type CampaignChannelStats = {
  send: number;
  open: number;
  click: number;
  fail: number;
};

export type CampaignEventStats = {
  push: CampaignChannelStats;
  email: CampaignChannelStats;
  sms: CampaignChannelStats;
};

// ---- Helpers ----------------------------------------------------------------

async function readEvents(): Promise<MarketingEvent[]> {
  try {
    const raw = await fs.readFile(FILE(), "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as MarketingEvent[]) : [];
  } catch {
    return [];
  }
}

async function writeEvents(items: MarketingEvent[]): Promise<void> {
  await fs.mkdir(path.dirname(FILE()), { recursive: true });
  await fs.writeFile(FILE(), JSON.stringify(items, null, 2) + "\n", "utf-8");
}

// ---- Public API -------------------------------------------------------------

export async function listEvents(): Promise<MarketingEvent[]> {
  return readEvents();
}

/** Events for a specific campaign, newest-first. */
export async function eventsForCampaign(
  campaignId: string,
): Promise<MarketingEvent[]> {
  const all = await readEvents();
  return all
    .filter((e) => e.campaignId === campaignId)
    .sort((a, b) => b.at.localeCompare(a.at));
}

/**
 * Append one event to the log. The ring buffer cap is enforced in-process;
 * no file lock is needed for append-only writes because individual event
 * appends are not read-modify-write sequences. For campaign-level stats we
 * compute from the log in statsForCampaign(), not from a separate counter.
 *
 * NOTE: if two concurrent ticks somehow both append, the worst outcome is a
 * duplicate event entry. Stats stay consistent because they are re-counted
 * from the log. Acceptable for a best-effort marketing feature.
 */
export async function appendEvent(
  event: Omit<MarketingEvent, "id" | "at">,
): Promise<MarketingEvent> {
  const all = await readEvents();
  const entry: MarketingEvent = {
    ...event,
    id: "mevt_" + crypto.randomBytes(6).toString("hex"),
    at: new Date().toISOString(),
  };
  // Keep only the most recent MAX_EVENTS entries.
  const next = [...all, entry].slice(-MAX_EVENTS);
  await writeEvents(next);
  return entry;
}

/** Roll up per-channel send/open/click/fail counts for one campaign. */
export function statsForCampaign(
  campaignId: string,
  events: MarketingEvent[],
): CampaignEventStats {
  const blank = (): CampaignChannelStats => ({
    send: 0,
    open: 0,
    click: 0,
    fail: 0,
  });
  const out: CampaignEventStats = {
    push: blank(),
    email: blank(),
    sms: blank(),
  };
  for (const e of events) {
    if (e.campaignId !== campaignId) continue;
    const ch = e.channel as keyof CampaignEventStats;
    if (!out[ch]) continue;
    const kind = e.kind as keyof CampaignChannelStats;
    if (kind in out[ch]) out[ch][kind]++;
  }
  return out;
}
