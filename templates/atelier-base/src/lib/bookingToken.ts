import { getAppRoot } from "@/lib/appRoot";
import crypto from "crypto";
import { promises as fs } from "fs";
import path from "path";

/**
 * HMAC-signed tokens so a booking confirmation email can contain a link
 * that unlocks the booking's self-service page without a login.
 *
 * The secret lives in data/secret.json (auto-generated on first use),
 * outside the git-tracked source tree, so every install has its own.
 */

const SECRET_FILE = () => path.join(getAppRoot(), "data", "secret.json");

type Secret = { bookingTokenSecret?: string };

async function readSecret(): Promise<Secret> {
  try {
    return JSON.parse(await fs.readFile(SECRET_FILE(), "utf-8")) as Secret;
  } catch {
    return {};
  }
}

async function writeSecret(s: Secret): Promise<void> {
  await fs.mkdir(path.dirname(SECRET_FILE()), { recursive: true });
  await fs.writeFile(SECRET_FILE(), JSON.stringify(s, null, 2), "utf-8");
}

async function loadSecret(): Promise<string> {
  const s = await readSecret();
  if (s.bookingTokenSecret && s.bookingTokenSecret.length >= 32) {
    return s.bookingTokenSecret;
  }
  const fresh = crypto.randomBytes(32).toString("hex");
  await writeSecret({ ...s, bookingTokenSecret: fresh });
  return fresh;
}

/**
 * Produce an 8-char hex HMAC of the booking id — short enough to be
 * pasted in a URL, long enough to prevent guessing.
 */
export async function signBookingId(id: string): Promise<string> {
  const secret = await loadSecret();
  return crypto.createHmac("sha256", secret).update(id).digest("hex").slice(0, 16);
}

export async function verifyBookingToken(id: string, token: string): Promise<boolean> {
  if (!token) return false;
  const expected = await signBookingId(id);
  // timing-safe compare
  const a = Buffer.from(expected, "utf-8");
  const b = Buffer.from(token, "utf-8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
