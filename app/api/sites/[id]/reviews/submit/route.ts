// POST /api/sites/[id]/reviews/submit
//
// Public — accepts a token-protected review submission from a customer
// after a completed booking. Token validates against
// REVIEW_TOKEN_SECRET. Idempotent on bookingId (resubmits update the
// pending row; approved/rejected can't be silently overwritten).
//
// CSRF same-origin + rate-limited 5/h/IP.

import { NextRequest, NextResponse } from 'next/server';
import { requireSameOrigin } from '@/lib/csrf';
import { rateLimit429, ipKey } from '@/lib/rate-limit';
import { verifyReviewToken, submitBookingReview } from '@/lib/crm';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const csrf = requireSameOrigin(req); if (csrf) return csrf;
  const limited = rateLimit429(`review-submit:${ipKey(req)}`, { max: 5, windowMs: 60 * 60_000 });
  if (limited) return limited;

  const { id: siteId } = await params;
  let body: Record<string, unknown>;
  try { body = (await req.json()) as Record<string, unknown>; }
  catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }); }

  const token = typeof body.token === 'string' ? body.token : null;
  if (!token) return NextResponse.json({ error: 'missing_token' }, { status: 400 });
  const verified = verifyReviewToken(siteId, token);
  if (!verified) return NextResponse.json({ error: 'bad_token' }, { status: 403 });

  const rating = typeof body.rating === 'number' ? Math.floor(body.rating) : NaN;
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'bad_rating' }, { status: 400 });
  }

  try {
    const review = submitBookingReview(siteId, verified.bookingId, {
      rating,
      title: typeof body.title === 'string' ? body.title : null,
      body: typeof body.body === 'string' ? body.body : null,
      authorName: typeof body.authorName === 'string' ? body.authorName : null,
      authorEmail: typeof body.authorEmail === 'string' ? body.authorEmail : null,
    });
    return NextResponse.json({ ok: true, review: { id: review.id, status: review.status } });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'booking_not_found') return NextResponse.json({ error: 'booking_not_found' }, { status: 404 });
      if (err.message === 'already_finalised') return NextResponse.json({ error: 'already_finalised' }, { status: 409 });
      if (err.message === 'bad_rating') return NextResponse.json({ error: 'bad_rating' }, { status: 400 });
    }
    throw err;
  }
}
