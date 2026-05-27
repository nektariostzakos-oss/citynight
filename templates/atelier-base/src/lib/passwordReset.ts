import { getAppRoot } from "@/lib/appRoot";
import crypto from "crypto";
import { promises as fs } from "fs";
import path from "path";

/**
 * Password-reset tokens. HMAC-signed, valid for 1h. Token encodes
 * userId + issuedAt timestamp so we can check expiry cheaply.
 *
 * Shares the session secret so every install has unique tokens.
 */
const SECRET_FILE = () => path.join(getAppRoot(), "data", "secret.json");

async function loadSecret(): Promise<string> {
  try {
    const raw = await fs.readFile(SECRET_FILE(), "utf-8");
    const parsed = JSON.parse(raw) as { passwordResetSecret?: string };
    if (parsed.passwordResetSecret && parsed.passwordResetSecret.length >= 32) {
      return parsed.passwordResetSecret;
    }
    const fresh = crypto.randomBytes(32).toString("hex");
    await fs.writeFile(
      SECRET_FILE(),
      JSON.stringify({ ...parsed, passwordResetSecret: fresh }, null, 2),
      "utf-8"
    );
    return fresh;
  } catch {
    const fresh = crypto.randomBytes(32).toString("hex");
    await fs.mkdir(path.dirname(SECRET_FILE()), { recursive: true });
    await fs.writeFile(
      SECRET_FILE(),
      JSON.stringify({ passwordResetSecret: fresh }, null, 2),
      "utf-8"
    );
    return fresh;
  }
}

const TTL_MS = 60 * 60_000; // 1 hour

export async function signResetToken(userId: string): Promise<string> {
  const secret = await loadSecret();
  const issuedAt = Date.now();
  const payload = `${userId}.${issuedAt}`;
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("hex").slice(0, 32);
  // URL-friendly base64 of the payload + sig, joined with ".".
  return Buffer.from(`${payload}.${sig}`, "utf-8").toString("base64url");
}

export async function verifyResetToken(token: string): Promise<string | null> {
  if (!token) return null;
  let decoded: string;
  try {
    decoded = Buffer.from(token, "base64url").toString("utf-8");
  } catch {
    return null;
  }
  const [userId, issuedAtStr, sig] = decoded.split(".");
  if (!userId || !issuedAtStr || !sig) return null;
  const issuedAt = Number(issuedAtStr);
  if (!Number.isFinite(issuedAt)) return null;
  if (Date.now() - issuedAt > TTL_MS) return null;

  const secret = await loadSecret();
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${userId}.${issuedAt}`)
    .digest("hex")
    .slice(0, 32);
  const a = Buffer.from(expected, "utf-8");
  const b = Buffer.from(sig, "utf-8");
  if (a.length !== b.length) return null;
  if (!crypto.timingSafeEqual(a, b)) return null;
  return userId;
}
