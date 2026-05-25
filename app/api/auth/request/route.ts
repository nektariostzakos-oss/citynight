import { NextRequest, NextResponse } from 'next/server';
import { mintMagicToken } from '@/lib/auth/magic-link';
import { sendEmail, magicLinkEmail } from '@/lib/email';
import { isLocale } from '@/lib/i18n';
import { rateLimit429, ipKey } from '@/lib/rate-limit';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/auth/request — { email, locale, purpose?, venueId? } → emails magic link.
// We always respond 204 regardless of whether the email exists; never leak account existence.
//
// Rate-limited per IP (5/15 min) AND per email (3/15 min) so a malicious
// actor can't spam-email a target or exhaust our Resend quota by cycling
// IPs. Both checks fire — whichever trips first.

export async function POST(req: NextRequest) {
  // Per-IP throttle — first to keep bot floods cheap.
  const ipLimit = rateLimit429(`auth-request:ip:${ipKey(req)}`, { max: 5, windowMs: 15 * 60_000 });
  if (ipLimit) return ipLimit;

  let body: { email?: unknown; locale?: unknown; purpose?: unknown; venueId?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!EMAIL_RE.test(email)) return NextResponse.json({ ok: false }, { status: 400 });

  // Per-email throttle — prevents targeted spam of one inbox even if the
  // attacker rotates IPs.
  const emailLimit = rateLimit429(`auth-request:email:${email}`, { max: 3, windowMs: 15 * 60_000 });
  if (emailLimit) return emailLimit;

  const localeRaw = typeof body.locale === 'string' ? body.locale : null;
  const locale = isLocale(localeRaw) ? localeRaw : 'en';
  const purpose = body.purpose === 'claim' ? 'claim' : 'login';
  const venueId = purpose === 'claim' && typeof body.venueId === 'string' ? body.venueId : undefined;

  const { token } = mintMagicToken(email, purpose, { venueId });

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin;
  const url = `${base}/${locale}/auth/verify?token=${encodeURIComponent(token)}&purpose=${purpose}`;

  const tmpl = magicLinkEmail({ url, purpose });
  await sendEmail({ to: email, subject: tmpl.subject, html: tmpl.html, text: tmpl.text });

  // 204 always — never let response distinguish "exists" vs "doesn't".
  return new NextResponse(null, { status: 204 });
}
