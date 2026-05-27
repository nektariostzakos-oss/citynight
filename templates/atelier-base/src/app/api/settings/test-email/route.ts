import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { isAdmin } from "../../../../lib/auth";
import {
  effectiveSmtpMode,
  loadSmtp,
  loadBusiness,
} from "../../../../lib/settings";
import {
  getCurrentTenant,
  getCurrentTenantSecret,
} from "../../../../lib/tenantContext";

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { to } = await req.json();
  if (!to) {
    return NextResponse.json({ error: "Recipient required" }, { status: 400 });
  }

  // Atelier-hosted relay path: forward to /api/relay/send instead of opening
  // a local SMTP transport. The exact same code path booking confirmations
  // use, so a successful test proves the live flow works.
  if ((await effectiveSmtpMode()) === "atelier") {
    const slug = getCurrentTenant();
    const secret = getCurrentTenantSecret();
    if (!slug || !secret) {
      return NextResponse.json(
        { error: "Atelier relay is only available for SaaS tenants." },
        { status: 400 },
      );
    }
    const biz = await loadBusiness();
    const explicit = process.env.ATELIER_RELAY_INTERNAL_URL;
    const base = explicit
      ? explicit.replace(/\/$/, "")
      : `http://127.0.0.1:${process.env.PORT || "3000"}`;
    try {
      const r = await fetch(`${base}/api/relay/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          secret,
          to,
          subject: `${biz.name || "Your Salon"}: Atelier email test`,
          body:
            "If you can read this, the Atelier-hosted email relay is " +
            "working for your site. Booking confirmations and reminders " +
            "will send through this same path.\n\n— " +
            (biz.name || "Your Salon"),
          replyTo: biz.email || "",
          fromName: biz.name || "",
        }),
        signal: AbortSignal.timeout(10_000),
      });
      const j: { ok?: boolean; error?: string; detail?: string } = await r
        .json()
        .catch(() => ({}));
      if (!r.ok) {
        return NextResponse.json(
          { error: j.detail || j.error || `Relay returned ${r.status}` },
          { status: r.status },
        );
      }
      return NextResponse.json({ ok: true });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Relay request failed" },
        { status: 500 },
      );
    }
  }

  // Direct SMTP path.
  const s = await loadSmtp();
  if (!s.host) {
    return NextResponse.json(
      { error: "Fill in SMTP details first." },
      { status: 400 }
    );
  }

  try {
    const transport = nodemailer.createTransport({
      host: s.host,
      port: s.port,
      secure: s.secure === "ssl",
      requireTLS: s.secure === "tls",
      auth: s.user ? { user: s.user, pass: s.pass } : undefined,
    });
    await transport.sendMail({
      from: s.from || `Your Salon <${s.user}>`,
      to,
      subject: "Your Salon SMTP test",
      text: "If you can read this, your SMTP settings work.\n\n— Your Salon",
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Send failed" },
      { status: 500 }
    );
  }
}
