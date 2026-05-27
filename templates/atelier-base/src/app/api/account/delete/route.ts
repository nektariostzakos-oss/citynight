import { NextResponse } from "next/server";
import { isAdmin } from "../../../../lib/auth";
import { getCurrentTenant } from "../../../../lib/tenantContext";
import { DEMO_TENANT_SLUG } from "../../../../lib/demoMode";

/**
 * POST /api/account/delete
 *
 * Permanently deletes this hosted SaaS account. Authenticated here by the
 * tenant's own site-admin session; the actual delete (Stripe cancel +
 * registry/data removal) lives in the marketing app, which owns the tenant
 * registry, so this route forwards to it server-to-server with the shared
 * internal secret.
 *
 * Hosted tenants only — a standalone customer install has no tenant context.
 */
export async function POST() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const slug = getCurrentTenant();
  if (!slug || slug === DEMO_TENANT_SLUG) {
    return NextResponse.json(
      { error: "This is not a hosted account." },
      { status: 403 },
    );
  }

  const secret = process.env.DEMO_RESET_SECRET || "";
  if (!secret) {
    return NextResponse.json(
      { error: "Account deletion is not available on this install." },
      { status: 503 },
    );
  }
  const base = process.env.MARKETING_URL || "http://127.0.0.1:3100";

  try {
    const res = await fetch(`${base}/api/saas/delete-account`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug, secret }),
    });
    if (!res.ok) {
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      return NextResponse.json(
        { error: d.error || "Could not delete the account." },
        { status: 502 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Could not reach the account service." },
      { status: 502 },
    );
  }
}
