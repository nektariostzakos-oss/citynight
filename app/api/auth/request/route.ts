import { NextRequest, NextResponse } from 'next/server';
import { mintMagicToken } from '@/lib/auth/magic-link';
import { sendEmail, magicLinkEmail } from '@/lib/email';
import { isLocale } from '@/lib/i18n';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/auth/request — { email, locale, purpose?, venueId? } → emails magic link.
// We always respond 204 regardless of whether the email exists; never leak account existence.

export async function POST(req: NextRequest) {
  let body: { email?: unknown; locale?: unknown; purpose?: unknown; venueId?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!EMAIL_RE.test(email)) return NextResponse.json({ ok: false }, { status: 400 });

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
