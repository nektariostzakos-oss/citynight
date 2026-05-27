import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { getAppRoot } from "@/lib/appRoot";
import { withFileLock } from "./fileLock";

/**
 * Tenant marketing campaign store.
 *
 * Per-tenant file: <getAppRoot()>/data/marketing-campaigns.json
 * File-locked via withFileLock for all writes.
 *
 * Status machine (Phase 7 approval gate):
 *   draft -> pending_approval -> scheduled -> sending -> sent
 *   (plus paused, canceled, rejected)
 *
 * createCampaign lands new campaigns as "pending_approval". A campaign must
 * be approved (via approveCampaign) before the scheduler can pick it up.
 * rejectCampaign moves a pending campaign to "rejected" with an optional note.
 *
 * Per-tenant autoApproveMarketing flag (future operator override) can bypass
 * the gate by calling approveCampaign() automatically after creation — but
 * that logic lives in the API layer, not here, keeping this store pure.
 */

const FILE = () =>
  path.join(getAppRoot(), "data", "marketing-campaigns.json");
const LOCK = "marketing-campaigns.json";

// ---- Types ------------------------------------------------------------------

export type CampaignChannel = "push" | "email" | "sms";

export type CampaignStatus =
  | "draft"
  | "pending_approval"
  | "scheduled"
  | "sending"
  | "sent"
  | "paused"
  | "canceled"
  | "rejected";

/** Per-channel message payloads. Only channels listed in `channels` need to
 * have their payload populated; the scheduler skips unselected channels. */
export type CampaignMessages = {
  push?: {
    title: string;
    body: string;
    /** Campaign-tracking URL (before click-tracking wrapper is applied). */
    url?: string;
  };
  email?: {
    subject: string;
    /** HTML/plain body. The scheduler wraps click-links and appends the
     *  unsubscribe footer. Keep {unsubscribe_url} as a placeholder so the
     *  footer insertion point is explicit. */
    body: string;
  };
  sms?: {
    text: string;
  };
};

export type CampaignStats = {
  /** Total recipients targeted (resolved at send time). */
  recipients: number;
  push: { sent: number; failed: number; clicks: number };
  email: { sent: number; failed: number; opens: number; clicks: number };
  sms: { sent: number; failed: number };
};

export type MarketingCampaign = {
  id: string;
  name: string;
  /** Segment id to resolve recipients from. */
  segmentId: string;
  /** Subset of channels this campaign will use. */
  channels: CampaignChannel[];
  messages: CampaignMessages;
  /**
   * ISO datetime for scheduled delivery. When absent (undefined / null) the
   * campaign is treated as "send as soon as the scheduler next runs".
   */
  scheduledAt?: string;
  status: CampaignStatus;
  stats: CampaignStats;
  createdAt: string;
  /** ISO datetime when the campaign entered "sending" state. */
  startedAt?: string;
  /** ISO datetime when the campaign reached "sent" state. */
  sentAt?: string;
  /** ISO datetime when the campaign was approved / rejected (Phase 7). */
  reviewedAt?: string;
  /** Optional note left by the reviewer on rejection. */
  rejectionNote?: string;
};

// ---- Helpers ----------------------------------------------------------------

function emptyStats(): CampaignStats {
  return {
    recipients: 0,
    push: { sent: 0, failed: 0, clicks: 0 },
    email: { sent: 0, failed: 0, opens: 0, clicks: 0 },
    sms: { sent: 0, failed: 0 },
  };
}

async function readCampaigns(): Promise<MarketingCampaign[]> {
  try {
    const raw = await fs.readFile(FILE(), "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as MarketingCampaign[]) : [];
  } catch {
    return [];
  }
}

async function writeCampaigns(items: MarketingCampaign[]): Promise<void> {
  await fs.mkdir(path.dirname(FILE()), { recursive: true });
  await fs.writeFile(FILE(), JSON.stringify(items, null, 2) + "\n", "utf-8");
}

// ---- CRUD -------------------------------------------------------------------

export async function listCampaigns(): Promise<MarketingCampaign[]> {
  return readCampaigns();
}

export async function getCampaign(
  id: string,
): Promise<MarketingCampaign | null> {
  return (await readCampaigns()).find((c) => c.id === id) ?? null;
}

export async function createCampaign(input: {
  name: string;
  segmentId: string;
  channels: CampaignChannel[];
  messages: CampaignMessages;
  scheduledAt?: string;
}): Promise<MarketingCampaign> {
  return withFileLock(LOCK, async () => {
    const all = await readCampaigns();
    const campaign: MarketingCampaign = {
      id: "mcmp_" + crypto.randomBytes(6).toString("hex"),
      name: input.name.trim(),
      segmentId: input.segmentId,
      channels: input.channels,
      messages: input.messages,
      scheduledAt: input.scheduledAt,
      // Phase 7: campaigns must be approved before the scheduler can pick them
      // up. The operator approves via approveCampaign() which transitions to
      // "scheduled". Per-tenant auto-approve is handled in the API layer.
      status: "pending_approval",
      stats: emptyStats(),
      createdAt: new Date().toISOString(),
    };
    all.push(campaign);
    await writeCampaigns(all);
    return campaign;
  });
}

export async function updateCampaign(
  id: string,
  patch: Partial<
    Pick<
      MarketingCampaign,
      "name" | "segmentId" | "channels" | "messages" | "scheduledAt"
    >
  >,
): Promise<MarketingCampaign | null> {
  return withFileLock(LOCK, async () => {
    const all = await readCampaigns();
    const idx = all.findIndex((c) => c.id === id);
    if (idx < 0) return null;
    const existing = all[idx];
    // Only allow edits on campaigns that have not yet started sending.
    if (existing.status === "sending" || existing.status === "sent") {
      return null;
    }
    all[idx] = { ...existing, ...patch };
    await writeCampaigns(all);
    return all[idx];
  });
}

export async function deleteCampaign(id: string): Promise<boolean> {
  return withFileLock(LOCK, async () => {
    const all = await readCampaigns();
    const existing = all.find((c) => c.id === id);
    if (!existing) return false;
    // Prevent deleting an in-flight campaign.
    if (existing.status === "sending") return false;
    const next = all.filter((c) => c.id !== id);
    await writeCampaigns(next);
    return true;
  });
}

/**
 * Update only the status (and timestamps) of a campaign. Used by the
 * scheduler (sending, sent) and the pause/resume/cancel API.
 */
export async function updateCampaignStatus(
  id: string,
  status: CampaignStatus,
  extra?: Partial<Pick<MarketingCampaign, "startedAt" | "sentAt" | "stats">>,
): Promise<MarketingCampaign | null> {
  return withFileLock(LOCK, async () => {
    const all = await readCampaigns();
    const idx = all.findIndex((c) => c.id === id);
    if (idx < 0) return null;
    all[idx] = { ...all[idx], status, ...(extra ?? {}) };
    await writeCampaigns(all);
    return all[idx];
  });
}

/**
 * Approve a campaign: transitions "pending_approval" -> "scheduled".
 * Only campaigns in the "pending_approval" state can be approved. Returns null
 * when the campaign is not found or is not in the correct state.
 */
export async function approveCampaign(
  id: string,
): Promise<MarketingCampaign | null> {
  return withFileLock(LOCK, async () => {
    const all = await readCampaigns();
    const idx = all.findIndex((c) => c.id === id);
    if (idx < 0) return null;
    if (all[idx].status !== "pending_approval") return null;
    all[idx] = {
      ...all[idx],
      status: "scheduled",
      reviewedAt: new Date().toISOString(),
    };
    await writeCampaigns(all);
    return all[idx];
  });
}

/**
 * Reject a campaign: transitions "pending_approval" -> "rejected".
 * An optional human-readable note is stored on the campaign record so the
 * tenant owner can see why the campaign was turned down.
 */
export async function rejectCampaign(
  id: string,
  note?: string,
): Promise<MarketingCampaign | null> {
  return withFileLock(LOCK, async () => {
    const all = await readCampaigns();
    const idx = all.findIndex((c) => c.id === id);
    if (idx < 0) return null;
    if (all[idx].status !== "pending_approval") return null;
    all[idx] = {
      ...all[idx],
      status: "rejected",
      reviewedAt: new Date().toISOString(),
      ...(note ? { rejectionNote: note.trim() } : {}),
    };
    await writeCampaigns(all);
    return all[idx];
  });
}
