import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { getAppRoot } from "@/lib/appRoot";
import { getTenantPath } from "./tenantContext";

/**
 * HMAC-signed token for the "rate your purchase" flow on /shop/[slug]/review.
 *
 * Mirrors reviewEngine.ts (the booking-side equivalent) but carries an order
 * and a product id instead of a booking id, and runs on a 30-day TTL — long
 * enough that a customer who waits two weeks before opening their shipment
 * can still leave a review, but short enough that an old leaked link can't
 * be replayed forever.
 *
 * Token format: base64url-encoded
 *   `<orderId>|<productId>|<customerEmail>|<issuedAt>|<hmac>`
 *
 * The secret lives in `data/secret.json` under its own key
 * (`productReviewTokenSecret`), separate from the booking review secret so
 * either can be rotated independently. The file is per-tenant via getAppRoot().
 */

const SECRET_FILE = () => path.join(getAppRoot(), "data", "secret.json");
const TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

export type ProductReviewTokenPayload = {
  orderId: string;
  productId: string;
  customerEmail: string;
  issuedAt: number; // Unix seconds
};

type StoredSecrets = {
  bookingTokenSecret?: string;
  reviewTokenSecret?: string;
  productReviewTokenSecret?: string;
};

async function readSecrets(): Promise<StoredSecrets> {
  try {
    return JSON.parse(await fs.readFile(SECRET_FILE(), "utf-8")) as StoredSecrets;
  } catch {
    return {};
  }
}

async function writeSecrets(s: StoredSecrets): Promise<void> {
  await fs.mkdir(path.dirname(SECRET_FILE()), { recursive: true });
  await fs.writeFile(SECRET_FILE(), JSON.stringify(s, null, 2), "utf-8");
}

async function loadProductReviewSecret(): Promise<string> {
  const s = await readSecrets();
  if (s.productReviewTokenSecret && s.productReviewTokenSecret.length >= 32) {
    return s.productReviewTokenSecret;
  }
  // Auto-generate on first use; persisted so subsequent boots use the same key.
  const fresh = crypto.randomBytes(32).toString("hex");
  await writeSecrets({ ...s, productReviewTokenSecret: fresh });
  return fresh;
}

function b64urlEncode(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64urlDecode(s: string): Buffer {
  const padded = (s + "===").slice(0, s.length + ((4 - (s.length % 4)) % 4));
  return Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

/** Build a signed token covering one (orderId, productId, email) triple. */
export async function buildProductReviewToken(payload: {
  orderId: string;
  productId: string;
  customerEmail: string;
}): Promise<string> {
  const secret = await loadProductReviewSecret();
  const issuedAt = Math.floor(Date.now() / 1000);
  // Pipe-delimited: order / product ids never contain pipes; email can't
  // either, but we still sanitize defensively.
  const raw = [
    payload.orderId.replace(/\|/g, ""),
    payload.productId.replace(/\|/g, ""),
    payload.customerEmail.toLowerCase().replace(/\|/g, ""),
    String(issuedAt),
  ].join("|");

  const hmac = crypto
    .createHmac("sha256", secret)
    .update(raw)
    .digest("hex")
    .slice(0, 32);

  return b64urlEncode(Buffer.from(raw + "|" + hmac, "utf-8"));
}

/**
 * Verify a token. Returns the payload on success or null on bad signature /
 * malformed payload / expired token. Verification is constant-time on the
 * HMAC compare so the endpoint can't be used as a token-shape oracle.
 */
export async function verifyProductReviewToken(
  token: string,
): Promise<ProductReviewTokenPayload | null> {
  try {
    const decoded = b64urlDecode(token).toString("utf-8");
    const parts = decoded.split("|");
    // Expected: orderId | productId | email | issuedAt | hmac
    if (parts.length < 5) return null;
    const [orderId, productId, customerEmail, issuedAtStr, mac] = parts;
    const issuedAt = Number(issuedAtStr);
    if (!orderId || !productId || !customerEmail || !issuedAt || isNaN(issuedAt)) {
      return null;
    }

    const age = Math.floor(Date.now() / 1000) - issuedAt;
    if (age < 0 || age > TOKEN_TTL_SECONDS) return null;

    const raw = [orderId, productId, customerEmail, issuedAtStr].join("|");
    const secret = await loadProductReviewSecret();
    const expected = crypto
      .createHmac("sha256", secret)
      .update(raw)
      .digest("hex")
      .slice(0, 32);

    const a = Buffer.from(expected, "utf-8");
    const b = Buffer.from(mac ?? "", "utf-8");
    if (a.length !== b.length) return null;
    if (!crypto.timingSafeEqual(a, b)) return null;

    return { orderId, productId, customerEmail, issuedAt };
  } catch {
    return null;
  }
}

/**
 * Public-facing URL the customer clicks in their post-purchase email.
 * Root-clean: uses getTenantPath() so it resolves to `/<slug>/shop/...` under
 * a tenant mount and to `/shop/...` standalone.
 */
export async function buildProductReviewUrl(payload: {
  orderId: string;
  productId: string;
  productSlug: string;
  customerEmail: string;
}): Promise<string> {
  const token = await buildProductReviewToken({
    orderId: payload.orderId,
    productId: payload.productId,
    customerEmail: payload.customerEmail,
  });
  const slug = getTenantPath();
  const base = slug ? `/${slug}` : "";
  return `${base}/shop/${payload.productSlug}/review?t=${encodeURIComponent(token)}`;
}
