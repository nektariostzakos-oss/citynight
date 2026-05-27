/**
 * GET /api/marketing/click/[token]
 *
 * Click-tracking redirect for campaign push and email links.
 *
 * The token is base64url-encoded "{campaignId}|{recipient}|{targetUrl}".
 * This endpoint:
 *   1. Decodes the token.
 *   2. Appends a "click" event to the marketing event log.
 *   3. 302s the browser to the original target URL.
 *
 * Best-effort: if the token is malformed or the event write fails, the
 * redirect still happens so the user is never stranded. A bad token is
 * redirected to "/" rather than returning an error page.
 *
 * No authentication required — this is opened by campaign recipients in
 * their browser / notification click.
 */
import { NextRequest, NextResponse } from "next/server";
import { appendEvent } from "@/lib/marketingEvents";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  let campaignId = "";
  let recipient = "";
  let targetUrl = "/";

  try {
    // Restore standard base64 padding then decode.
    const padded = token.replace(/-/g, "+").replace(/_/g, "/");
    const raw = Buffer.from(padded, "base64").toString("utf-8");
    const parts = raw.split("|");
    if (parts.length >= 3) {
      campaignId = parts[0];
      recipient = parts[1];
      // The URL may itself contain "|", so rejoin everything after the 2nd "|".
      targetUrl = parts.slice(2).join("|");
    }
  } catch {
    // Malformed token — redirect to root.
    return NextResponse.redirect("/", { status: 302 });
  }

  // Validate the target URL is safe (http/https) before redirecting.
  try {
    const parsed = new URL(targetUrl);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      targetUrl = "/";
    }
  } catch {
    // Relative path — keep it as-is (safe).
    if (!targetUrl.startsWith("/")) targetUrl = "/";
  }

  // Append the click event — best-effort, never blocks the redirect.
  if (campaignId && recipient) {
    appendEvent({
      campaignId,
      channel: "email", // click events are primarily from email links
      recipient,
      kind: "click",
    }).catch(() => undefined);
  }

  return NextResponse.redirect(targetUrl, { status: 302 });
}
