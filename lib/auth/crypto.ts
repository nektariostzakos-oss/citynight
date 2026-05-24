// Crypto primitives used by sessions + magic tokens.
// We use node:crypto (already on the server) and only ever store HASHES of tokens.

import 'server-only';
import crypto from 'node:crypto';

export function randomBase64Url(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

export function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

// Constant-time comparison for hashed equality checks.
export function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}
