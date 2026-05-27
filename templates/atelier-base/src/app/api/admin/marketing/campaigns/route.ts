/**
 * GET  /api/admin/marketing/campaigns        — list campaigns with stats.
 * POST /api/admin/marketing/campaigns        — create a campaign (lands as
 *                                              "pending_approval"; Phase 7).
 * PATCH /api/admin/marketing/campaigns       — change status.
 *   Supported transitions for the tenant owner:
 *     pending_approval -> canceled  (withdraw before review)
 *     scheduled        -> paused
 *     paused           -> scheduled (resume)
 *     scheduled        -> canceled
 *     paused           -> canceled
 *   Approve/reject is an operator-side action (operator command center).
 *
 * Gated by:
 *   1. The tenant admin session (isAdmin).
 *   2. The `campaigns` marketing feature flag (isMarketingFeatureOn).
 *
 * Returns 401 when not authenticated, 403 when the flag is off.
 */
import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { isMarketingFeatureOn } from "@/lib/marketingFlags";
import {
  listCampaigns,
  createCampaign,
  updateCampaignStatus,
  type CampaignChannel,
  type CampaignMessages,
  type CampaignStatus,
} from "@/lib/marketingCampaigns";
import { listEvents, statsForCampaign } from "@/lib/marketingEvents";

export const runtime = "nodejs";

/** Shared auth + feature gate. Returns a response on failure, null on pass. */
async function gate(): Promise<NextResponse | null> {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await isMarketingFeatureOn("campaigns"))) {
    return NextResponse.json(
      { error: "Campaigns feature is not enabled." },
      { status: 403 },
    );
  }
  return null;
}

/**
 * GET — list all campaigns, each enriched with rolled-up event stats so the
 * UI can show delivery numbers without a separate per-campaign fetch.
 */
export async function GET() {
  const denied = await gate();
  if (denied) return denied;

  const [campaigns, events] = await Promise.all([
    listCampaigns(),
    listEvents(),
  ]);

  const enriched = campaigns.map((c) => ({
    ...c,
    eventStats: statsForCampaign(c.id, events),
  }));

  return NextResponse.json({ campaigns: enriched });
}

/**
 * POST — create a new campaign. Lands as "pending_approval" (Phase 7).
 * The campaign must be approved by an operator before the scheduler can send
 * it. The tenant owner can cancel it while waiting for review.
 */
export async function POST(req: NextRequest) {
  const denied = await gate();
  if (denied) return denied;

  const body = (await req.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const segmentId =
    typeof body.segmentId === "string" ? body.segmentId.trim() : "";

  if (!name) {
    return NextResponse.json({ error: "name is required." }, { status: 400 });
  }
  if (!segmentId) {
    return NextResponse.json(
      { error: "segmentId is required." },
      { status: 400 },
    );
  }

  // Validate channels.
  const validChannels: CampaignChannel[] = ["push", "email", "sms"];
  const rawChannels = Array.isArray(body.channels) ? body.channels : [];
  const channels = (rawChannels as unknown[]).filter(
    (c): c is CampaignChannel =>
      typeof c === "string" && validChannels.includes(c as CampaignChannel),
  );
  if (channels.length === 0) {
    return NextResponse.json(
      { error: "At least one channel is required." },
      { status: 400 },
    );
  }

  // Build the messages object, accepting only known shapes.
  const rawMessages =
    body.messages && typeof body.messages === "object"
      ? (body.messages as Record<string, unknown>)
      : {};
  const messages: CampaignMessages = {};

  const rawPush = rawMessages.push as Record<string, unknown> | undefined;
  if (rawPush && typeof rawPush === "object") {
    const title = typeof rawPush.title === "string" ? rawPush.title.trim() : "";
    const pushBody =
      typeof rawPush.body === "string" ? rawPush.body.trim() : "";
    if (title && pushBody) {
      messages.push = {
        title,
        body: pushBody,
        url: typeof rawPush.url === "string" ? rawPush.url : undefined,
      };
    }
  }

  const rawEmail = rawMessages.email as Record<string, unknown> | undefined;
  if (rawEmail && typeof rawEmail === "object") {
    const subject =
      typeof rawEmail.subject === "string" ? rawEmail.subject.trim() : "";
    const emailBody =
      typeof rawEmail.body === "string" ? rawEmail.body.trim() : "";
    if (subject && emailBody) {
      messages.email = { subject, body: emailBody };
    }
  }

  const rawSms = rawMessages.sms as Record<string, unknown> | undefined;
  if (rawSms && typeof rawSms === "object") {
    const text = typeof rawSms.text === "string" ? rawSms.text.trim() : "";
    if (text) {
      messages.sms = { text };
    }
  }

  // Validate that each selected channel has a message.
  for (const ch of channels) {
    if (!messages[ch]) {
      return NextResponse.json(
        { error: `Message payload required for channel: ${ch}` },
        { status: 400 },
      );
    }
  }

  const scheduledAt =
    typeof body.scheduledAt === "string" ? body.scheduledAt : undefined;

  const campaign = await createCampaign({
    name,
    segmentId,
    channels,
    messages,
    scheduledAt,
  });

  return NextResponse.json({ campaign }, { status: 201 });
}

/**
 * PATCH — change the status of an existing campaign. Accepted transitions:
 *   scheduled -> paused    (pause before it sends)
 *   paused    -> scheduled (resume)
 *   scheduled -> canceled  (cancel before it sends)
 *   paused    -> canceled  (cancel a paused campaign)
 */
export async function PATCH(req: NextRequest) {
  const denied = await gate();
  if (denied) return denied;

  const body = (await req.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id.trim() : "";
  const status =
    typeof body.status === "string" ? (body.status as CampaignStatus) : "";

  if (!id) {
    return NextResponse.json({ error: "id is required." }, { status: 400 });
  }

  // Tenant-owner allowed transitions. Approve/reject requires operator auth
  // and is handled in the operator-side API (/api/admin/tenant-marketing).
  const allowed: CampaignStatus[] = ["paused", "scheduled", "canceled"];
  if (!allowed.includes(status as CampaignStatus)) {
    return NextResponse.json(
      {
        error: `Invalid status. Tenant-allowed transitions: ${allowed.join(", ")}. Approve/reject is an operator action.`,
      },
      { status: 400 },
    );
  }

  const updated = await updateCampaignStatus(id, status as CampaignStatus);
  if (!updated) {
    return NextResponse.json(
      {
        error:
          "Campaign not found or cannot be updated in its current state. Note: pending_approval campaigns can only be canceled by the tenant owner.",
      },
      { status: 404 },
    );
  }

  return NextResponse.json({ campaign: updated });
}
