import { NextResponse } from "next/server";
import { isAdmin } from "../../../../lib/auth";
import { effectiveSmtpMode } from "../../../../lib/settings";
import {
  getCurrentTenant,
  getCurrentTenantSecret,
} from "../../../../lib/tenantContext";

/**
 * Lightweight status probe for the Atelier-hosted email relay. Returns
 * whether the relay is enabled in this deploy and the tenant's current
 * daily usage. Read-only — never mutates a thing — so the admin UI can
 * poll it on render without changing state.
 */
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const mode = await effectiveSmtpMode();
  const slug = getCurrentTenant();
  const secret = getCurrentTenantSecret();

  // The relay is a SaaS-only feature. Standalone customer ZIP installs
  // can't reach it, so we report it as unavailable upfront.
  if (!slug || !secret) {
    return NextResponse.json({
      mode,
      relay: { available: false, reason: "no_tenant_context" },
    });
  }

  const explicit = process.env.ATELIER_RELAY_INTERNAL_URL;
  const base = explicit
    ? explicit.replace(/\/$/, "")
    : `http://127.0.0.1:${process.env.PORT || "3000"}`;

  try {
    const r = await fetch(
      `${base}/api/relay/usage?slug=${encodeURIComponent(slug)}` +
        `&secret=${encodeURIComponent(secret)}`,
      { signal: AbortSignal.timeout(5_000) },
    );
    const j: {
      used?: number;
      cap?: number;
      enabled?: boolean;
      blocked?: boolean;
    } = await r.json().catch(() => ({}));
    if (!r.ok) {
      return NextResponse.json({
        mode,
        relay: {
          available: false,
          reason: `status_${r.status}`,
          used: j.used ?? 0,
          cap: j.cap ?? 0,
        },
      });
    }
    return NextResponse.json({
      mode,
      relay: {
        available: !!j.enabled && !j.blocked,
        blocked: !!j.blocked,
        used: j.used ?? 0,
        cap: j.cap ?? 0,
      },
    });
  } catch (e) {
    return NextResponse.json({
      mode,
      relay: {
        available: false,
        reason: e instanceof Error ? e.message : "probe_failed",
      },
    });
  }
}
