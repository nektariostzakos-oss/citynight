// Per-site review collection. Replaces atelier's data/reviews.json with
// SQLite queries against site_reviews.
//
// Two ways a review is created:
//   1. POST-VISIT FUNNEL — after a completed booking, citynight emails
//      the customer a one-tap link /review/<token>. The token is a
//      timing-safe HMAC over (bookingId, siteId) so a guessed token
//      doesn't grant the right to review someone else's visit.
//   2. OWNER MANUAL ENTRY — owner adds a paper-form / phone-call
//      testimonial through the dashboard.
//
// Reviews land in `status='pending'` and surface on the public site only
// when the owner approves them. This stops drive-by spam ranking.

import 'server-only';
import { db } from '@/db';
import crypto from 'node:crypto';

export type ReviewSource = 'booking' | 'manual' | 'google';
export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'flagged';

export type SiteReview = {
  id: string;
  siteId: string;
  bookingId: string | null;
  clientId: string | null;
  source: ReviewSource;
  authorName: string | null;
  authorEmail: string | null;
  rating: number;
  title: string | null;
  body: string | null;
  status: ReviewStatus;
  approvedAt: number | null;
  reply: string | null;
  replyAt: number | null;
  createdAt: number;
};

const dbh = () => db.$client;

const SELECT = `
  SELECT id, site_id, booking_id, client_id, source,
         author_name, author_email,
         rating, title, body,
         status, approved_at, reply, reply_at, created_at
    FROM site_reviews
`;

function row(r: Record<string, unknown>): SiteReview {
  return {
    id: String(r.id),
    siteId: String(r.site_id),
    bookingId: (r.booking_id as string | null) ?? null,
    clientId: (r.client_id as string | null) ?? null,
    source: r.source as ReviewSource,
    authorName: (r.author_name as string | null) ?? null,
    authorEmail: (r.author_email as string | null) ?? null,
    rating: Number(r.rating),
    title: (r.title as string | null) ?? null,
    body: (r.body as string | null) ?? null,
    status: r.status as ReviewStatus,
    approvedAt: r.approved_at !== null ? Number(r.approved_at) : null,
    reply: (r.reply as string | null) ?? null,
    replyAt: r.reply_at !== null ? Number(r.reply_at) : null,
    createdAt: Number(r.created_at),
  };
}

// ─── reads ────────────────────────────────────────────────────────────

export function listReviews(
  siteId: string,
  opts: { status?: ReviewStatus | 'all'; limit?: number } = {},
): SiteReview[] {
  const filters: string[] = ['site_id = ?'];
  const args: unknown[] = [siteId];
  if (opts.status && opts.status !== 'all') {
    filters.push('status = ?'); args.push(opts.status);
  }
  const limit = Math.min(500, Math.max(1, Math.floor(opts.limit ?? 200)));
  return (dbh().prepare(`${SELECT}
     WHERE ${filters.join(' AND ')}
     ORDER BY created_at DESC
     LIMIT ?
  `).all(...args, limit) as Record<string, unknown>[]).map(row);
}

export function listApprovedReviews(siteId: string, limit = 30): SiteReview[] {
  return (dbh().prepare(`${SELECT}
     WHERE site_id = ? AND status = 'approved'
     ORDER BY approved_at DESC, created_at DESC
     LIMIT ?
  `).all(siteId, limit) as Record<string, unknown>[]).map(row);
}

export function getReview(siteId: string, reviewId: string): SiteReview | null {
  const r = dbh().prepare(`${SELECT} WHERE site_id = ? AND id = ? LIMIT 1`)
    .get(siteId, reviewId) as Record<string, unknown> | undefined;
  return r ? row(r) : null;
}

// ─── booking-link token ───────────────────────────────────────────────
//
// Token shape: base64url(bookingId).base64url(hmacSha256(siteId + ':' +
// bookingId, REVIEW_TOKEN_SECRET)). Verifying re-computes the HMAC and
// compares timing-safe. The bookingId tells us *which* booking is
// authorised; the HMAC stops anyone forging one.

function tokenSecret(): string {
  const s = process.env.REVIEW_TOKEN_SECRET;
  if (!s || s.length < 32) {
    throw new Error('REVIEW_TOKEN_SECRET missing or too short (>=32 chars required).');
  }
  return s;
}

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlDecode(s: string): Buffer {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64');
}

export function signReviewToken(siteId: string, bookingId: string): string {
  const mac = crypto.createHmac('sha256', tokenSecret()).update(`${siteId}:${bookingId}`).digest();
  return `${b64url(Buffer.from(bookingId, 'utf8'))}.${b64url(mac)}`;
}

export type VerifiedReviewToken = { siteId: string; bookingId: string };

export function verifyReviewToken(siteId: string, token: string): VerifiedReviewToken | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const bookingIdPart = parts[0];
  const macPart = parts[1];
  if (!bookingIdPart || !macPart) return null;
  let bookingId: string;
  try {
    bookingId = b64urlDecode(bookingIdPart).toString('utf8');
  } catch { return null; }
  if (!bookingId) return null;

  const expectedMac = crypto.createHmac('sha256', tokenSecret()).update(`${siteId}:${bookingId}`).digest();
  let givenMac: Buffer;
  try { givenMac = b64urlDecode(macPart); } catch { return null; }
  if (expectedMac.length !== givenMac.length) return null;
  if (!crypto.timingSafeEqual(expectedMac, givenMac)) return null;
  return { siteId, bookingId };
}

// ─── creates ──────────────────────────────────────────────────────────

export type ReviewSubmission = {
  rating: number;
  title?: string | null;
  body?: string | null;
  authorName?: string | null;
  authorEmail?: string | null;
};

/**
 * Submit a review from the public token-protected form. Idempotent on
 * bookingId — a second submission for the same booking updates the
 * existing pending row rather than creating a duplicate. Approved rows
 * are NOT overwritten — once an owner has approved, the customer can't
 * silently rewrite their public review.
 */
export function submitBookingReview(
  siteId: string,
  bookingId: string,
  input: ReviewSubmission,
): SiteReview {
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    throw new Error('bad_rating');
  }
  const title = input.title?.trim() || null;
  const body = input.body?.trim() || null;
  const authorName = input.authorName?.trim() || null;
  const authorEmail = input.authorEmail?.trim().toLowerCase() || null;

  // Look up the booking to pull clientId snapshot.
  const booking = dbh().prepare(
    `SELECT client_id, status FROM site_bookings WHERE site_id = ? AND id = ?`,
  ).get(siteId, bookingId) as { client_id: string | null; status: string } | undefined;
  if (!booking) throw new Error('booking_not_found');

  const existing = dbh().prepare(
    `SELECT id, status FROM site_reviews WHERE site_id = ? AND booking_id = ?`,
  ).get(siteId, bookingId) as { id: string; status: ReviewStatus } | undefined;

  if (existing) {
    if (existing.status === 'approved' || existing.status === 'rejected') {
      throw new Error('already_finalised');
    }
    dbh().prepare(`
      UPDATE site_reviews
         SET rating = ?, title = ?, body = ?, author_name = ?, author_email = ?,
             status = 'pending'
       WHERE id = ?
    `).run(input.rating, title, body, authorName, authorEmail, existing.id);
    return getReview(siteId, existing.id)!;
  }

  const id = crypto.randomUUID();
  dbh().prepare(`
    INSERT INTO site_reviews (
      id, site_id, booking_id, client_id, source,
      author_name, author_email, rating, title, body, status
    ) VALUES (?, ?, ?, ?, 'booking', ?, ?, ?, ?, ?, 'pending')
  `).run(
    id, siteId, bookingId, booking.client_id ?? null,
    authorName, authorEmail, input.rating, title, body,
  );
  return getReview(siteId, id)!;
}

// ─── owner moderation ─────────────────────────────────────────────────

export function approveReview(siteId: string, reviewId: string): SiteReview | null {
  const info = dbh().prepare(`
    UPDATE site_reviews
       SET status = 'approved', approved_at = unixepoch()
     WHERE site_id = ? AND id = ? AND status IN ('pending','flagged')
  `).run(siteId, reviewId);
  if (info.changes === 0) return null;
  return getReview(siteId, reviewId);
}

export function rejectReview(siteId: string, reviewId: string): SiteReview | null {
  const info = dbh().prepare(`
    UPDATE site_reviews SET status = 'rejected' WHERE site_id = ? AND id = ?
  `).run(siteId, reviewId);
  if (info.changes === 0) return null;
  return getReview(siteId, reviewId);
}

export function setReviewReply(siteId: string, reviewId: string, reply: string | null): SiteReview | null {
  const t = reply?.trim() || null;
  if (t && t.length > 1000) throw new Error('reply_too_long');
  const info = dbh().prepare(`
    UPDATE site_reviews SET reply = ?, reply_at = unixepoch() WHERE site_id = ? AND id = ?
  `).run(t, siteId, reviewId);
  if (info.changes === 0) return null;
  return getReview(siteId, reviewId);
}
