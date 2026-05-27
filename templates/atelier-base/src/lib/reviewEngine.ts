import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { getAppRoot } from "@/lib/appRoot";
import { withFileLock } from "./fileLock";
import { getTenantPath } from "./tenantContext";

/**
 * Review-generation engine — Phase 6 of the Tenant Marketing Suite.
 *
 * Extends the existing post-visit review-request trigger into a two-branch
 * funnel:
 *   high rating (>= 4)  -> thank you page + link to Google review (public)
 *   low rating  (<= 3)  -> private feedback form (never touches Google)
 *
 * Token format: base64url-encoded HMAC payload
 *   `<bookingId>|<bookingName>|<bookingEmail>|<issuedAt>`
 * where issuedAt is a Unix-seconds string and provides a 72-hour TTL.
 *
 * The secret lives in data/secret.json alongside the booking-token secret
 * (a separate key is used so review tokens can be rotated independently).
 *
 * Root-clean: no hardcoded slug, /_t, or /barber anywhere. Public URLs are
 * built with getTenantPath() so they work under a tenant slug AND standalone.
 */

// ---- File paths -------------------------------------------------------------

const SECRET_FILE = () => path.join(getAppRoot(), "data", "secret.json");
const FEEDBACK_FILE = () =>
  path.join(getAppRoot(), "data", "review-feedback.json");
const FEEDBACK_LOCK = "review-feedback.json";

// ---- Types ------------------------------------------------------------------

/** One entry in the private low-rating feedback store. */
export type ReviewFeedback = {
  id: string;
  bookingId: string;
  clientName: string;
  clientEmail: string;
  rating: number;
  comment: string;
  at: string; // ISO datetime
};

/** Payload encoded in the signed rating-page token. */
export type ReviewTokenPayload = {
  bookingId: string;
  clientName: string;
  clientEmail: string;
  issuedAt: number; // Unix seconds
};

// ---- Token TTL --------------------------------------------------------------

const TOKEN_TTL_SECONDS = 72 * 60 * 60; // 72 hours

// ---- Secret management ------------------------------------------------------

type StoredSecret = {
  bookingTokenSecret?: string;
  reviewTokenSecret?: string;
};

async function readSecretFile(): Promise<StoredSecret> {
  try {
    const raw = await fs.readFile(SECRET_FILE(), "utf-8");
    return JSON.parse(raw) as StoredSecret;
  } catch {
    return {};
  }
}

async function writeSecretFile(s: StoredSecret): Promise<void> {
  await fs.mkdir(path.dirname(SECRET_FILE()), { recursive: true });
  await fs.writeFile(SECRET_FILE(), JSON.stringify(s, null, 2), "utf-8");
}

/** Load (and auto-generate on first use) the HMAC secret for review tokens. */
async function loadReviewSecret(): Promise<string> {
  const s = await readSecretFile();
  if (s.reviewTokenSecret && s.reviewTokenSecret.length >= 32) {
    return s.reviewTokenSecret;
  }
  const fresh = crypto.randomBytes(32).toString("hex");
  await writeSecretFile({ ...s, reviewTokenSecret: fresh });
  return fresh;
}

// ---- Token encode / decode --------------------------------------------------

function b64urlEncode(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64urlDecode(s: string): Buffer {
  // Restore standard base64 padding and characters.
  const padded = (s + "===").slice(0, s.length + ((4 - (s.length % 4)) % 4));
  return Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

/**
 * Build a signed, base64url-encoded token for the customer rating page.
 * Payload: `<bookingId>|<clientName>|<clientEmail>|<issuedAt>`
 * The HMAC covers the whole payload so any tampering invalidates the token.
 */
export async function buildReviewToken(payload: {
  bookingId: string;
  clientName: string;
  clientEmail: string;
}): Promise<string> {
  const secret = await loadReviewSecret();
  const issuedAt = Math.floor(Date.now() / 1000);
  // Pipe-delimited: bookingId and name/email may contain spaces but not pipes.
  const raw = [
    payload.bookingId,
    payload.clientName.replace(/\|/g, " "),
    payload.clientEmail.replace(/\|/g, " "),
    String(issuedAt),
  ].join("|");

  const hmac = crypto
    .createHmac("sha256", secret)
    .update(raw)
    .digest("hex")
    .slice(0, 32); // 32 hex chars = 128 bits, sufficient for this use case

  const withMac = raw + "|" + hmac;
  return b64urlEncode(Buffer.from(withMac, "utf-8"));
}

/**
 * Decode and verify a token from the public rating URL.
 * Returns the payload on success, or null if the token is invalid or expired.
 */
export async function verifyReviewToken(
  token: string,
): Promise<ReviewTokenPayload | null> {
  try {
    const decoded = b64urlDecode(token).toString("utf-8");
    const parts = decoded.split("|");
    // Format: bookingId | clientName | clientEmail | issuedAt | hmac
    if (parts.length < 5) return null;

    const [bookingId, clientName, clientEmail, issuedAtStr, mac] = parts;
    const issuedAt = Number(issuedAtStr);
    if (!bookingId || !issuedAt || isNaN(issuedAt)) return null;

    // TTL check.
    const age = Math.floor(Date.now() / 1000) - issuedAt;
    if (age < 0 || age > TOKEN_TTL_SECONDS) return null;

    // Recompute HMAC from the signed portion (everything before the last pipe).
    const raw = [bookingId, clientName, clientEmail, issuedAtStr].join("|");
    const secret = await loadReviewSecret();
    const expected = crypto
      .createHmac("sha256", secret)
      .update(raw)
      .digest("hex")
      .slice(0, 32);

    // Timing-safe compare.
    const a = Buffer.from(expected, "utf-8");
    const b = Buffer.from(mac ?? "", "utf-8");
    if (a.length !== b.length) return null;
    if (!crypto.timingSafeEqual(a, b)) return null;

    return { bookingId, clientName, clientEmail, issuedAt };
  } catch {
    return null;
  }
}

/**
 * Build the full public rating-page URL for a booking.
 * Root-clean: uses getTenantPath() so it resolves correctly under a tenant
 * slug (/acme/marketing/review/<token>) and in a standalone install
 * (/marketing/review/<token>).
 */
export async function buildRatingPageUrl(payload: {
  bookingId: string;
  clientName: string;
  clientEmail: string;
}): Promise<string> {
  const token = await buildReviewToken(payload);
  const slug = getTenantPath();
  const base = slug ? `/${slug}` : "";
  return `${base}/marketing/review/${token}`;
}

// ---- Feedback store ---------------------------------------------------------

async function readFeedback(): Promise<ReviewFeedback[]> {
  try {
    const raw = await fs.readFile(FEEDBACK_FILE(), "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ReviewFeedback[]) : [];
  } catch {
    return [];
  }
}

async function writeFeedback(items: ReviewFeedback[]): Promise<void> {
  await fs.mkdir(path.dirname(FEEDBACK_FILE()), { recursive: true });
  await fs.writeFile(
    FEEDBACK_FILE(),
    JSON.stringify(items, null, 2) + "\n",
    "utf-8",
  );
}

/** Append a private low-rating feedback record. File-locked. */
export async function recordFeedback(input: {
  bookingId: string;
  clientName: string;
  clientEmail: string;
  rating: number;
  comment: string;
}): Promise<ReviewFeedback> {
  return withFileLock(FEEDBACK_LOCK, async () => {
    const all = await readFeedback();
    const entry: ReviewFeedback = {
      id: "rfb_" + crypto.randomBytes(6).toString("hex"),
      bookingId: input.bookingId,
      clientName: input.clientName,
      clientEmail: input.clientEmail,
      rating: input.rating,
      comment: input.comment,
      at: new Date().toISOString(),
    };
    all.unshift(entry);
    await writeFeedback(all);
    return entry;
  });
}

// ---- Funnel stats -----------------------------------------------------------

export type ReviewFunnelStats = {
  /** Total review-request emails sent (bookings where reviewedAt is set). */
  requested: number;
  /** Number of rating responses received (len of feedback store). */
  ratingsReceived: number;
  /** Ratings >= 4 (routed to public Google review page). */
  publicRouted: number;
  /** Ratings <= 3 (caught as private feedback). */
  privateRouted: number;
  /** Recent private feedback entries, newest-first. */
  recentFeedback: ReviewFeedback[];
};

/**
 * Compute funnel stats from the feedback store and the supplied booking list.
 * The booking list is provided by the caller so this function stays pure and
 * testable without side effects.
 */
export async function getFunnelStats(
  requestedCount: number,
): Promise<ReviewFunnelStats> {
  const feedback = await readFeedback();
  const publicRouted = feedback.filter((f) => f.rating >= 4).length;
  const privateRouted = feedback.filter((f) => f.rating <= 3).length;
  return {
    requested: requestedCount,
    ratingsReceived: feedback.length,
    publicRouted,
    privateRouted,
    recentFeedback: feedback.slice(0, 20),
  };
}

/** Read all feedback entries (used by the admin panel). */
export async function listFeedback(): Promise<ReviewFeedback[]> {
  return readFeedback();
}
