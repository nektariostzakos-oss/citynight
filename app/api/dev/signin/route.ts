// DEV-ONLY one-click sign-in. Visit this URL in the browser and you're
// signed in as the named user — no magic-link round-trip, no SMTP. Hard
// 404s in production so it can never leak.
//
//   /api/dev/signin?email=demo-owner@citynight.gr&next=/el/dashboard
//
// Defaults: email=demo-owner@citynight.gr, next=/el/dashboard.

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { db } from '@/db';
import { createSession } from '@/lib/auth/session';

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse('Not found', { status: 404 });
  }
  // Disabled by default — owner wants to demo the real email+password flow.
  // To re-enable temporarily, set ENABLE_DEV_SIGNIN=1 in .env.local.
  if (process.env.ENABLE_DEV_SIGNIN !== '1') {
    return new NextResponse('Disabled. Sign in at /el/sign-in with email + password.', { status: 404 });
  }

  const url = new URL(req.url);
  const email = (url.searchParams.get('email') ?? 'demo-owner@citynight.gr').toLowerCase().trim();
  const next = url.searchParams.get('next') ?? '/el/dashboard';

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new NextResponse('Invalid email', { status: 400 });
  }

  let user = db.$client.prepare('SELECT id FROM users WHERE email = ?').get(email) as { id: string } | undefined;
  if (!user) {
    const id = randomUUID();
    db.$client.prepare(`
      INSERT INTO users (id, email, name, locale, role, email_verified)
      VALUES (?, ?, 'Dev User', 'el', 'owner', 1)
    `).run(id, email);
    user = { id };
  }

  await createSession(user.id);
  // Relative `next` only — never let this bounce to an arbitrary host.
  const safeNext = next.startsWith('/') ? next : '/el/dashboard';
  return NextResponse.redirect(new URL(safeNext, req.url));
}
