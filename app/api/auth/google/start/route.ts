import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  buildAuthUrl,
  generatePkce,
  randomState,
  OAUTH_STATE_COOKIE,
  OAUTH_VERIFIER_COOKIE,
  OAUTH_RETURN_COOKIE,
  OAUTH_COOKIE_TTL_S,
} from '@/lib/auth/google-oauth';

// /api/auth/google/start
//
// Kicks off the Google OAuth flow. Generates a fresh state + PKCE verifier,
// drops both in short-lived httpOnly cookies, and 302s the user to Google's
// consent screen. We also remember an optional `?next=` path so we can return
// the user to where they came from (e.g., a venue claim page) after sign-in.

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const next = sanitiseReturnPath(url.searchParams.get('next'));

  const state = randomState();
  const { verifier, challenge } = generatePkce();

  const cookieJar = await cookies();
  const cookieOpts = {
    httpOnly: true as const,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: OAUTH_COOKIE_TTL_S,
  };
  cookieJar.set({ name: OAUTH_STATE_COOKIE,    value: state,    ...cookieOpts });
  cookieJar.set({ name: OAUTH_VERIFIER_COOKIE, value: verifier, ...cookieOpts });
  if (next) cookieJar.set({ name: OAUTH_RETURN_COOKIE, value: next, ...cookieOpts });

  return NextResponse.redirect(buildAuthUrl({ state, codeChallenge: challenge }));
}

// Only relative paths starting with a single `/` are accepted — prevents open-
// redirect abuse via the `next` query param.
function sanitiseReturnPath(raw: string | null): string | null {
  if (!raw) return null;
  if (!raw.startsWith('/') || raw.startsWith('//')) return null;
  return raw.slice(0, 256);
}
