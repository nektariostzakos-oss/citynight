// Google OAuth 2.0 with PKCE. Minimal, no external SDK.
//
// Flow (Authorization Code + PKCE):
//   1. /api/auth/google/start   — generate state + code_verifier, set short-lived
//                                 httpOnly cookies, redirect to Google's consent screen
//   2. /api/auth/google/callback — Google sends back ?code=&state=. We verify state
//                                 matches the cookie, POST code+code_verifier to Google's
//                                 token endpoint, fetch userinfo, create/link the local
//                                 user, mint a session, redirect to the post-login target.
//
// Why PKCE on a confidential client: it costs nothing and shuts down code-interception
// attacks if our callback ever ends up in a referrer header by accident. Google encourages
// PKCE for web server apps too.

import 'server-only';
import crypto from 'node:crypto';

const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_ENDPOINT = 'https://openidconnect.googleapis.com/v1/userinfo';

export type GoogleProfile = {
  sub: string;            // Google's stable user id
  email: string;
  email_verified: boolean;
  name: string | null;
  picture: string | null;
  locale: string | null;
};

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export function getClientId(): string  { return env('GOOGLE_OAUTH_CLIENT_ID'); }
export function getClientSecret(): string { return env('GOOGLE_OAUTH_CLIENT_SECRET'); }

// Public origin used to compute the redirect URI Google sends users back to.
// Must match EXACTLY one of the "Authorized redirect URIs" registered in the
// Google Cloud Console for this OAuth client.
function siteOrigin(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
}

export function getRedirectUri(): string {
  return `${siteOrigin()}/api/auth/google/callback`;
}

// Cookies that carry the per-flow state and PKCE verifier from /start to /callback.
// httpOnly, sameSite=lax (we need to receive them on Google's cross-site redirect back),
// secure in prod, short TTL (5 min — plenty for the consent screen).
export const OAUTH_STATE_COOKIE = 'cn_g_state';
export const OAUTH_VERIFIER_COOKIE = 'cn_g_pkce';
export const OAUTH_RETURN_COOKIE = 'cn_g_return';
export const OAUTH_COOKIE_TTL_S = 60 * 5;

function base64UrlOfBytes(bytes: Buffer): string {
  return bytes.toString('base64url');
}

export function randomState(): string {
  return base64UrlOfBytes(crypto.randomBytes(24));
}

export function generatePkce(): { verifier: string; challenge: string } {
  const verifier = base64UrlOfBytes(crypto.randomBytes(32));
  const challenge = base64UrlOfBytes(crypto.createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

export function buildAuthUrl(args: { state: string; codeChallenge: string }): string {
  const params = new URLSearchParams({
    client_id: getClientId(),
    redirect_uri: getRedirectUri(),
    response_type: 'code',
    scope: 'openid email profile',
    state: args.state,
    code_challenge: args.codeChallenge,
    code_challenge_method: 'S256',
    // `prompt=select_account` is friendlier than the default — lets the user
    // pick which Google account if they're signed into several.
    prompt: 'select_account',
    access_type: 'online',
  });
  return `${GOOGLE_AUTH_ENDPOINT}?${params.toString()}`;
}

type TokenResponse = {
  access_token: string;
  id_token?: string;
  expires_in: number;
  token_type: string;
};

export async function exchangeCodeForToken(args: { code: string; codeVerifier: string }): Promise<TokenResponse> {
  const body = new URLSearchParams({
    code: args.code,
    client_id: getClientId(),
    client_secret: getClientSecret(),
    redirect_uri: getRedirectUri(),
    grant_type: 'authorization_code',
    code_verifier: args.codeVerifier,
  });
  const res = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Google token exchange failed (${res.status}): ${text.slice(0, 300)}`);
  }
  return (await res.json()) as TokenResponse;
}

export async function fetchUserProfile(accessToken: string): Promise<GoogleProfile> {
  const res = await fetch(GOOGLE_USERINFO_ENDPOINT, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Google userinfo failed (${res.status})`);
  }
  const raw = (await res.json()) as Record<string, unknown>;
  const sub = String(raw.sub ?? '');
  const email = String(raw.email ?? '');
  if (!sub || !email) throw new Error('Google profile missing sub or email');
  return {
    sub,
    email: email.toLowerCase(),
    email_verified: Boolean(raw.email_verified),
    name: typeof raw.name === 'string' ? raw.name : null,
    picture: typeof raw.picture === 'string' ? raw.picture : null,
    locale: typeof raw.locale === 'string' ? raw.locale : null,
  };
}
