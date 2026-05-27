import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail, updatePassword } from "../../../../lib/users";
import { signResetToken, verifyResetToken } from "../../../../lib/passwordReset";
import { allowAction, clientIp } from "../../../../lib/rateLimit";
import { sendPlainEmail } from "../../../../lib/email";
import { loadBranding } from "../../../../lib/settings";
import { SITE_URL } from "../../../../lib/atelierSiteUrl";

/**
 * Password-reset flow.
 * POST { email } → (if user exists) email a reset link. Always returns 200
 *                   so we don't reveal which emails have admin accounts.
 * PUT  { token, password } → set new password if token is valid & unexpired.
 */

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  if (!allowAction(`reset:ip:${ip}`, 5, 60 * 60_000)) {
    return NextResponse.json({ ok: true }); // rate-limit silently
  }

  const body = await req.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email) return NextResponse.json({ ok: true });

  if (!allowAction(`reset:email:${email}`, 3, 60 * 60_000)) {
    return NextResponse.json({ ok: true });
  }

  const user = await findUserByEmail(email);
  // ALWAYS 200 — same response whether user exists or not.
  if (!user) return NextResponse.json({ ok: true });

  const token = await signResetToken(user.id);
  const url = `${SITE_URL}/admin/reset?t=${encodeURIComponent(token)}`;
  const branding = await loadBranding().catch(() => ({ wordmark: "Your Salon" }));
  const brand = branding.wordmark || "Your Salon";
  const subject = `${brand} admin — reset your password`;
  const bodyText =
    `A password reset was requested for this account.\n\n` +
    `Open this link within the next hour to set a new password:\n\n${url}\n\n` +
    `If you didn't request this, ignore this email — your current password still works.`;
  try {
    await sendPlainEmail(user.email, subject, bodyText);
  } catch (e) {
    console.error("[password-reset] send failed", e instanceof Error ? e.message : e);
  }
  return NextResponse.json({ ok: true });
}

export async function PUT(req: NextRequest) {
  const ip = clientIp(req);
  if (!allowAction(`reset-confirm:ip:${ip}`, 10, 60 * 60_000)) {
    return NextResponse.json({ error: "Too many attempts." }, { status: 429 });
  }
  const body = await req.json().catch(() => ({}));
  const token = typeof body.token === "string" ? body.token : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }
  const userId = await verifyResetToken(token);
  if (!userId) {
    return NextResponse.json({ error: "Link expired or invalid. Request a new one." }, { status: 400 });
  }
  const ok = await updatePassword(userId, password);
  if (!ok) return NextResponse.json({ error: "Account not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
