import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/db';
import {
  exchangeCodeForToken,
  fetchUserProfile,
  OAUTH_STATE_COOKIE,
  OAUTH_VERIFIER_COOKIE,
  OAUTH_RETURN_COOKIE,
} from '@/lib/auth/google-oauth';
import { createSession } from '@/lib/auth/session';
import { timingSafeEqualHex } from '@/lib/auth/crypto';

// /api/auth/google/callback
//
// Validates state, exchanges the auth code for tokens, fetches the Google
// profile, then either:
//   (a) signs in an existing user matched by google_id,
//   (b) links a Google account to an existing magic-link user with the same email, or
//   (c) creates a fresh user.
// In all cases we mint a citynight session cookie and redirect to the
// originally requested path (or the dashboard).

export const dynamic = 'force-dynamic';

type UserRow = { id: string; email: string; google_id: string | null };

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const stateParam = url.searchParams.get('state');
  const errorParam = url.searchParams.get('error');

  const jar = await cookies();
  const stateCookie = jar.get(OAUTH_STATE_COOKIE)?.value ?? null;
  const verifierCookie = jar.get(OAUTH_VERIFIER_COOKIE)?.value ?? null;
  const nextPath = jar.get(OAUTH_RETURN_COOKIE)?.value ?? null;

  // Always clear the flow cookies — they're single-use.
  jar.delete(OAUTH_STATE_COOKIE);
  jar.delete(OAUTH_VERIFIER_COOKIE);
  jar.delete(OAUTH_RETURN_COOKIE);

  if (errorParam) return errorRedirect(req, `oauth_error:${errorParam}`);
  if (!code || !stateParam) return errorRedirect(req, 'missing_code_or_state');
  if (!stateCookie || !verifierCookie) return errorRedirect(req, 'missing_flow_cookies');

  // Constant-time compare to defeat timing oracles, even though state is short.
  const stateOk =
    stateParam.length === stateCookie.length &&
    timingSafeEqualHex(
      Buffer.from(stateParam).toString('hex'),
      Buffer.from(stateCookie).toString('hex'),
    );
  if (!stateOk) return errorRedirect(req, 'state_mismatch');

  let profile;
  try {
    const tokens = await exchangeCodeForToken({ code, codeVerifier: verifierCookie });
    profile = await fetchUserProfile(tokens.access_token);
  } catch {
    return errorRedirect(req, 'token_exchange_failed');
  }

  if (!profile.email_verified) return errorRedirect(req, 'email_not_verified');

  const dbh = db.$client;

  // Try google_id first (covers returning users + users who linked already).
  const byGoogleId = dbh
    .prepare(`SELECT id, email, google_id FROM users WHERE google_id = ?`)
    .get(profile.sub) as UserRow | undefined;

  let userId: string;
  if (byGoogleId) {
    userId = byGoogleId.id;
    // Refresh display fields in case they changed on Google's side.
    dbh.prepare(
      `UPDATE users SET name = COALESCE(?, name), avatar_url = ?, email_verified = 1 WHERE id = ?`,
    ).run(profile.name, profile.picture, userId);
  } else {
    // No google_id match — check email. If a magic-link user already exists
    // with the same email, LINK the Google account to that row (don't create
    // a duplicate user). Otherwise create a new user.
    const byEmail = dbh
      .prepare(`SELECT id, email, google_id FROM users WHERE email = ?`)
      .get(profile.email) as UserRow | undefined;

    if (byEmail) {
      // Refuse to overwrite an existing google_id (shouldn't happen given the
      // earlier lookup, but defend in depth).
      if (byEmail.google_id && byEmail.google_id !== profile.sub) {
        return errorRedirect(req, 'account_linked_to_other_google');
      }
      userId = byEmail.id;
      dbh.prepare(
        `UPDATE users SET google_id = ?, name = COALESCE(name, ?), avatar_url = ?, email_verified = 1 WHERE id = ?`,
      ).run(profile.sub, profile.name, profile.picture, userId);
    } else {
      userId = crypto.randomUUID();
      dbh.prepare(`
        INSERT INTO users (id, email, name, locale, role, google_id, avatar_url, email_verified)
        VALUES (?, ?, ?, ?, 'owner', ?, ?, 1)
      `).run(userId, profile.email, profile.name, profile.locale ?? 'en', profile.sub, profile.picture);
    }
  }

  await createSession(userId);

  const safeNext = isSafeRelativePath(nextPath) ? nextPath! : '/en/dashboard';
  return NextResponse.redirect(new URL(safeNext, req.url));
}

function isSafeRelativePath(p: string | null): p is string {
  return !!p && p.startsWith('/') && !p.startsWith('//');
}

function errorRedirect(req: NextRequest, code: string): NextResponse {
  // Land on the sign-in page with an error param the client can render.
  const url = new URL('/en/sign-in', req.url);
  url.searchParams.set('error', code);
  return NextResponse.redirect(url);
}
