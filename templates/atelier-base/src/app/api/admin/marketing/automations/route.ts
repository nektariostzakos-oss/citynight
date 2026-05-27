/**
 * GET  /api/admin/marketing/automations  — list automations with sent counts.
 * PATCH /api/admin/marketing/automations — toggle enabled / edit one automation.
 *
 * Gated by:
 *   1. The tenant admin session (isAdmin).
 *   2. The `automations` marketing feature flag (isMarketingFeatureOn).
 *
 * Returns 401 when not authenticated, 403 when the flag is off or the role
 * is insufficient.
 */
import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { isMarketingFeatureOn } from "@/lib/marketingFlags";
import {
  listAutomations,
  updateAutomation,
  automationSentCounts,
  type AutomationChannel,
  type AutomationMessages,
  type AutomationParams,
} from "@/lib/marketingAutomations";

export const runtime = "nodejs";

/** Shared auth + feature gate. Returns a response on failure, null on pass. */
async function gate(): Promise<NextResponse | null> {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await isMarketingFeatureOn("automations"))) {
    return NextResponse.json(
      { error: "Automations feature is not enabled." },
      { status: 403 },
    );
  }
  return null;
}

/**
 * GET — list all automations enriched with their individual sent counts from
 * the dedup ledger, so the UI can show "sent N times" badges.
 */
export async function GET() {
  const denied = await gate();
  if (denied) return denied;

  const [automations, counts] = await Promise.all([
    listAutomations(),
    automationSentCounts(),
  ]);

  const enriched = automations.map((a) => ({
    ...a,
    sentCount: counts[a.id] ?? 0,
  }));

  return NextResponse.json({ automations: enriched });
}

/**
 * PATCH — update one automation. Accepted fields:
 *   id        string (required)
 *   enabled   boolean
 *   name      string
 *   channels  AutomationChannel[]
 *   messages  AutomationMessages (partial — only channels present are merged)
 *   params    AutomationParams
 *   couponCode string | null  (null clears the coupon)
 *
 * The automation type is immutable.
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
  if (!id) {
    return NextResponse.json({ error: "id is required." }, { status: 400 });
  }

  // Build patch object — only include fields that are present in the body.
  const patch: Parameters<typeof updateAutomation>[1] = {};

  if (typeof body.enabled === "boolean") {
    patch.enabled = body.enabled;
  }

  if (typeof body.name === "string" && body.name.trim()) {
    patch.name = body.name.trim();
  }

  if (Array.isArray(body.channels)) {
    const validChannels: AutomationChannel[] = ["push", "email", "sms"];
    const channels = (body.channels as unknown[]).filter(
      (c): c is AutomationChannel =>
        typeof c === "string" &&
        validChannels.includes(c as AutomationChannel),
    );
    if (channels.length > 0) patch.channels = channels;
  }

  if (body.messages && typeof body.messages === "object") {
    const rawMessages = body.messages as Record<string, unknown>;
    const messages: AutomationMessages = {};

    const rawPush = rawMessages.push as Record<string, unknown> | undefined;
    if (rawPush && typeof rawPush === "object") {
      const title =
        typeof rawPush.title === "string" ? rawPush.title.trim() : "";
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
      if (text) messages.sms = { text };
    }

    if (Object.keys(messages).length > 0) patch.messages = messages;
  }

  if (body.params && typeof body.params === "object") {
    patch.params = body.params as AutomationParams;
  }

  if ("couponCode" in body) {
    patch.couponCode =
      typeof body.couponCode === "string" && body.couponCode.trim()
        ? body.couponCode.trim()
        : undefined;
  }

  const updated = await updateAutomation(id, patch);
  if (!updated) {
    return NextResponse.json(
      { error: "Automation not found." },
      { status: 404 },
    );
  }

  return NextResponse.json({ automation: updated });
}
