// Password hashing + verification. PBKDF2-SHA256 via node:crypto — no
// external dependency, no native build. Cost (100k iterations) chosen
// to be ~50–100ms on the Hostinger Cloud VM tier we run on; bump if
// hardware moves.
//
// Format stored in users.password_hash:
//   pbkdf2$<iterations>$<salt-base64>$<hash-base64>

import 'server-only';
import crypto from 'node:crypto';
import { db } from '@/db';

const ITERATIONS = 100_000;
const KEY_LEN = 32;
const SALT_LEN = 16;
const DIGEST = 'sha256';

/** Hash a plaintext password into the storable string format. */
export async function hashPassword(plain: string): Promise<string> {
  if (typeof plain !== 'string' || plain.length < 8 || plain.length > 256) {
    throw new Error('Password must be 8–256 characters');
  }
  const salt = crypto.randomBytes(SALT_LEN);
  const hash = await pbkdf2(plain, salt);
  return `pbkdf2$${ITERATIONS}$${salt.toString('base64')}$${hash.toString('base64')}`;
}

/** Constant-time verify of plaintext against a stored hash. Returns false
 *  on any structural mismatch — never throws, so the caller can return a
 *  generic "invalid credentials" without leaking which side was wrong. */
export async function verifyPassword(plain: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored || typeof plain !== 'string' || !plain.length) return false;
  const parts = stored.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
  const iters = Number(parts[1]);
  if (!Number.isFinite(iters) || iters < 1) return false;
  let salt: Buffer, expected: Buffer;
  try {
    salt = Buffer.from(parts[2]!, 'base64');
    expected = Buffer.from(parts[3]!, 'base64');
  } catch { return false; }
  if (expected.length !== KEY_LEN) return false;
  const candidate = await pbkdf2(plain, salt, iters);
  if (candidate.length !== expected.length) return false;
  return crypto.timingSafeEqual(candidate, expected);
}

/** Set or update a user's password. Used by the sign-up + change-password
 *  flows, and by the dev seed script. */
export async function setUserPassword(userId: string, plain: string): Promise<void> {
  const hash = await hashPassword(plain);
  db.$client.prepare(`UPDATE users SET password_hash = ? WHERE id = ?`).run(hash, userId);
}

function pbkdf2(plain: string, salt: Buffer, iters: number = ITERATIONS): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(plain, salt, iters, KEY_LEN, DIGEST, (err, key) => {
      if (err) reject(err);
      else resolve(key);
    });
  });
}
