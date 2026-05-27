#!/usr/bin/env node
// Dev-only: print a magic-link sign-in URL for a demo user. Visit the URL
// once in the browser, you're signed in. Skip the SMTP step entirely.
//
// Usage:
//   node scripts/demo/dev-signin.mjs [email]
//
// Default email is demo-owner@citynight.gr.

import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });
import Database from 'better-sqlite3';
import { randomUUID, randomBytes, createHash } from 'node:crypto';

const dbPath = process.env.DATABASE_PATH;
if (!dbPath) { console.error('DATABASE_PATH not set.'); process.exit(1); }
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

const email = (process.argv[2] ?? 'demo-owner@citynight.gr').toLowerCase().trim();

// Ensure the user exists.
let user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
if (!user) {
  const id = randomUUID();
  db.prepare(`INSERT INTO users (id, email, name, locale, role, email_verified)
              VALUES (?, ?, ?, 'el', 'owner', 1)`).run(id, email, 'Demo Owner');
  user = { id };
  console.log(`+ Created user ${email} (${id})`);
}

// Mint a 32-byte url-safe token; store only its SHA-256 hash.
const tokenBuf = randomBytes(32);
const token = tokenBuf.toString('base64')
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const hash = createHash('sha256').update(token).digest('hex');
const expiresAt = Math.floor(Date.now() / 1000) + 15 * 60;

db.prepare(`
  INSERT INTO magic_tokens (id, email, token_hash, purpose, venue_id, expires_at)
  VALUES (?, ?, ?, 'login', NULL, ?)
`).run(randomUUID(), email, hash, expiresAt);

// For dev we ignore NEXT_PUBLIC_SITE_URL (which points at prod) and print
// the localhost URL the user is actually browsing on.
const port = process.env.PORT ?? '3004';
const url = `http://localhost:${port}/el/auth/verify?token=${encodeURIComponent(token)}&purpose=login`;

console.log('');
console.log(`Magic-link sign-in for ${email}`);
console.log('Open this URL ONCE in your browser:');
console.log('');
console.log(`  ${url}`);
console.log('');
console.log('After verification you\'ll be signed in and redirected to /el/dashboard.');
console.log('Then visit /el/cities/loutraki/el-nino → click Διεκδίκησε → pick a plan.');
