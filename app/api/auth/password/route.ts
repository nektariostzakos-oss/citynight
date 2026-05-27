// POST /api/auth/password — email + password sign-in OR sign-up.
//
// Body: { email, password, mode: 'signin' | 'signup' }
//
// signin: verify against users.password_hash → create session → return ok.
// signup: create user with hashed password → create session → return ok.
//   If email already exists with a password set, returns 409.
//   If email already exists WITHOUT a password (was magic-link only),
//   sets the password on the existing row (legitimate account upgrade
//   path — same email proves the user is the same).
//
// Rate-limit: 8 attempts per 15 min per IP — covers both modes.

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { requireSameOrigin } from '@/lib/csrf';
import { rateLimit429, ipKey } from '@/lib/rate-limit';
import { db } from '@/db';
import { createSession } from '@/lib/auth/session';
import { hashPassword, verifyPassword } from '@/lib/auth/password';

type Body = { email?: string; password?: string; mode?: 'signin' | 'signup' };

export async function POST(req: NextRequest) {
  const csrf = requireSameOrigin(req); if (csrf) return csrf;
  const limited = rateLimit429(`pw-auth:${ipKey(req)}`, { max: 8, windowMs: 15 * 60_000 });
  if (limited) return limited;

  let body: Body;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const mode = body.mode === 'signup' ? 'signup' : 'signin';

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: 'invalid_email' }, { status: 400 });
  }
  if (password.length < 8 || password.length > 256) {
    return NextResponse.json({ ok: false, error: 'invalid_password' }, { status: 400 });
  }

  const sqlite = db.$client;
  const existing = sqlite.prepare(
    `SELECT id, password_hash AS passwordHash, email_verified AS emailVerified FROM users WHERE email = ?`,
  ).get(email) as { id: string; passwordHash: string | null; emailVerified: number } | undefined;

  if (mode === 'signin') {
    if (!existing || !existing.passwordHash) {
      // Generic message — don't leak whether the email exists.
      return NextResponse.json({ ok: false, error: 'invalid_credentials' }, { status: 401 });
    }
    const ok = await verifyPassword(password, existing.passwordHash);
    if (!ok) return NextResponse.json({ ok: false, error: 'invalid_credentials' }, { status: 401 });
    return sessionResponse(await createSession(existing.id));
  }

  // Sign-up path.
  if (existing) {
    if (existing.passwordHash) {
      return NextResponse.json({ ok: false, error: 'account_exists' }, { status: 409 });
    }
    // Existing user with no password (magic-link only) — let them set one.
    const hash = await hashPassword(password);
    sqlite.prepare(`UPDATE users SET password_hash = ? WHERE id = ?`).run(hash, existing.id);
    return sessionResponse(await createSession(existing.id));
  }

  // Brand new user.
  const hash = await hashPassword(password);
  const id = randomUUID();
  sqlite.prepare(`
    INSERT INTO users (id, email, locale, role, password_hash, email_verified)
    VALUES (?, ?, 'el', 'owner', ?, 0)
  `).run(id, email, hash);
  return sessionResponse(await createSession(id));
}

// Next 15 quirk: cookies set via the `cookies()` API inside a route handler
// don't always propagate onto NextResponse.json. Explicitly attaching the
// session cookie to the response we return guarantees the browser gets the
// Set-Cookie header. (Mirrors createSession's options exactly.)
function sessionResponse(session: { token: string; expiresAt: number }): NextResponse {
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: 'cn_sid',
    value: session.token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: Math.max(0, session.expiresAt - Math.floor(Date.now() / 1000)),
  });
  return res;
}
