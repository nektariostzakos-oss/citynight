// Magic-link tokens. We store ONLY the SHA-256 hash; the raw token is sent once
// in the email. Tokens are single-use (`used_at` marks consumption), short-lived
// (15 minutes), and scoped (purpose='login'|'claim', optional venueId).

import 'server-only';
import { db } from '@/db';
import { randomBase64Url, sha256 } from './crypto';

const TOKEN_TTL_S = 15 * 60;

export type MagicPurpose = 'login' | 'claim';

function dbh() { return db.$client; }

function uuid() { return crypto.randomUUID(); }

export function mintMagicToken(email: string, purpose: MagicPurpose, opts: { venueId?: string } = {}) {
  const raw = randomBase64Url(32);
  const hash = sha256(raw);
  const expiresAt = Math.floor(Date.now() / 1000) + TOKEN_TTL_S;
  dbh().prepare(`
    INSERT INTO magic_tokens (id, email, token_hash, purpose, venue_id, expires_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(uuid(), email.toLowerCase().trim(), hash, purpose, opts.venueId ?? null, expiresAt);
  return { token: raw, expiresAt };
}

export function consumeMagicToken(token: string, purpose: MagicPurpose) {
  const hash = sha256(token);
  const row = dbh().prepare(`
    SELECT id, email, venue_id, expires_at, used_at, purpose
      FROM magic_tokens WHERE token_hash = ?
  `).get(hash) as
    | { id: string; email: string; venue_id: string | null; expires_at: number; used_at: number | null; purpose: MagicPurpose }
    | undefined;

  if (!row) return null;
  if (row.purpose !== purpose) return null;
  if (row.used_at) return null;
  if (row.expires_at < Math.floor(Date.now() / 1000)) return null;

  dbh().prepare(`UPDATE magic_tokens SET used_at = unixepoch() WHERE id = ?`).run(row.id);
  return { email: row.email, venueId: row.venue_id };
}

// Upsert by email and return user id. Used after a successful magic-link verification.
export function findOrCreateUser(email: string, locale: string | null) {
  const e = email.toLowerCase().trim();
  const existing = dbh().prepare(`SELECT id FROM users WHERE email = ?`).get(e) as { id: string } | undefined;
  if (existing) return existing.id;
  const id = uuid();
  dbh().prepare(`
    INSERT INTO users (id, email, locale, role) VALUES (?, ?, ?, 'owner')
  `).run(id, e, locale ?? 'en');
  return id;
}
