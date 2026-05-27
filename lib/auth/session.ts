// Own session auth (§3, §12): random opaque session id stored hashed in DB,
// raw id lives in an httpOnly cookie. No JWT — DB is source of truth.

import 'server-only';
import { cookies } from 'next/headers';
import { db } from '@/db';
import { randomBase64Url, sha256, timingSafeEqualHex } from './crypto';

const COOKIE_NAME = 'cn_sid';
const SESSION_TTL_S = 60 * 60 * 24 * 30; // 30 days

export type AuthedUser = {
  id: string;
  email: string;
  name: string | null;
  role: 'owner' | 'admin';
  locale: string | null;
};

function dbh() { return db.$client; }

function maxAgeFromExpiry(expiresAt: number): number {
  return Math.max(0, expiresAt - Math.floor(Date.now() / 1000));
}

export async function createSession(userId: string): Promise<{ token: string; expiresAt: number }> {
  const raw = randomBase64Url(32);
  const hash = sha256(raw);
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_S;
  // Session id stored is the HASH; the raw token is only ever in the cookie.
  dbh().prepare(
    `INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)`,
  ).run(hash, userId, expiresAt);

  (await cookies()).set({
    name: COOKIE_NAME,
    value: raw,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeFromExpiry(expiresAt),
  });

  return { token: raw, expiresAt };
}

export async function destroyCurrentSession(): Promise<void> {
  const jar = await cookies();
  const raw = jar.get(COOKIE_NAME)?.value;
  if (raw) {
    const hash = sha256(raw);
    dbh().prepare(`DELETE FROM sessions WHERE id = ?`).run(hash);
  }
  jar.delete(COOKIE_NAME);
}

export async function getCurrentUser(): Promise<AuthedUser | null> {
  const raw = (await cookies()).get(COOKIE_NAME)?.value;
  if (!raw) return null;

  const hash = sha256(raw);
  const row = dbh().prepare(`
    SELECT u.id AS user_id, u.email, u.name, u.role, u.locale,
           s.id AS session_id, s.expires_at
      FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.id = ?
  `).get(hash) as
    | { user_id: string; email: string; name: string | null; role: 'owner' | 'admin'; locale: string | null; session_id: string; expires_at: number }
    | undefined;

  if (!row) return null;
  if (row.expires_at < Math.floor(Date.now() / 1000)) {
    // Expired — best-effort cleanup.
    dbh().prepare(`DELETE FROM sessions WHERE id = ?`).run(hash);
    return null;
  }

  // Defense in depth — the row id IS the hash already; this is a no-op cost but
  // it keeps the timing-safe pattern available for callers.
  if (!timingSafeEqualHex(hash, row.session_id)) return null;

  return { id: row.user_id, email: row.email, name: row.name, role: row.role, locale: row.locale };
}

export async function requireUser(): Promise<AuthedUser> {
  const u = await getCurrentUser();
  if (!u) throw new Response('Unauthorized', { status: 401 });
  return u;
}

export async function requireAdmin(): Promise<AuthedUser> {
  const u = await requireUser();
  if (u.role !== 'admin') throw new Response('Forbidden', { status: 403 });
  return u;
}
