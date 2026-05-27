import { getCurrentTenant, getCurrentTenantSecret } from "./tenantContext";
import { isMarketingFeatureOn } from "./marketingFlags";

/**
 * Tenant-side SMS client for the Atelier marketing relay.
 *
 * Calls the marketing app's /api/relay/sms endpoint from the demo runtime,
 * authenticating with the tenant's relay secret — the same auth pattern as
 * demo/src/lib/email.ts uses for the email relay.
 *
 * This file must stay root-clean: no hardcoded slug, /_t, or /barber. The
 * relay URL is resolved identically to the email relay: ATELIER_RELAY_INTERNAL_URL
 * or http://127.0.0.1:<PORT>, so it always hits the loopback of the same
 * Node process regardless of tenant.
 *
 * Best-effort: sendTenantSms never throws. A failure is returned as
 * { ok: false, error } so callers can log it without crashing.
 */

export type SmsTenantResult =
  | { ok: true; sid: string; used?: number; cap?: number }
  | { ok: false; error: string };

/**
 * The marketing app's loopback origin. Mirrors the same helper in email.ts so
 * the two relays always resolve to the same host. Overridable via
 * ATELIER_RELAY_INTERNAL_URL when an unusual deploy routes relays differently.
 */
function relayInternalUrl(): string {
  const explicit = process.env.ATELIER_RELAY_INTERNAL_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const port = process.env.PORT || "3000";
  return `http://127.0.0.1:${port}`;
}

/**
 * Send one SMS through the Atelier-hosted relay. Returns the relay's response
 * or an error if the feature is off, the tenant context is missing, or the
 * relay call fails.
 *
 * - Returns `{ ok: false, error: "sms_feature_off" }` when the tenant's SMS
 *   marketing flag is disabled — this is a no-op, not an error worth logging.
 * - Returns `{ ok: false, error: "no_tenant_context" }` in a standalone ZIP
 *   install (no ALS context), which means SMS is not available.
 */
export async function sendTenantSms({
  to,
  body,
}: {
  to: string;
  body: string;
}): Promise<SmsTenantResult> {
  // Feature gate: SMS has per-message cost, so the flag is checked first.
  // isMarketingFeatureOn is async and reads the override file when in a SaaS
  // context; in a standalone ZIP it reads only env vars.
  let featureOn: boolean;
  try {
    featureOn = await isMarketingFeatureOn("sms");
  } catch {
    // If the flag resolver itself throws (e.g. corrupt override file) treat
    // it as off: never send an unsanctioned SMS.
    return { ok: false, error: "sms_feature_flag_error" };
  }

  if (!featureOn) {
    return { ok: false, error: "sms_feature_off" };
  }

  const slug = getCurrentTenant();
  const secret = getCurrentTenantSecret();
  if (!slug || !secret) {
    // Standalone customer ZIP or marketing-side call — no relay context.
    return { ok: false, error: "no_tenant_context" };
  }

  try {
    const r = await fetch(`${relayInternalUrl()}/api/relay/sms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, secret, to, body }),
      // Loopback only; keep a tight timeout so a hung relay never blocks a
      // booking response or campaign tick.
      signal: AbortSignal.timeout(10_000),
    });

    if (r.ok) {
      const j = (await r.json()) as {
        ok?: boolean;
        sid?: string;
        used?: number;
        cap?: number;
      };
      return {
        ok: true,
        sid: j.sid ?? "",
        used: j.used,
        cap: j.cap,
      };
    }

    // The relay returned a non-2xx status. Extract the error reason so callers
    // can log it in their send event records.
    let errDetail = `relay_http_${r.status}`;
    try {
      const j = (await r.json()) as {
        error?: string;
        detail?: string;
      };
      errDetail = j.detail || j.error || errDetail;
    } catch {
      /* ignore JSON parse failure */
    }
    return { ok: false, error: errDetail };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "relay_request_failed",
    };
  }
}
