import { NextRequest, NextResponse } from "next/server";
import { verifyReviewToken, recordFeedback } from "../../../../../lib/reviewEngine";
import { loadBusiness } from "../../../../../lib/settings";
import { isMarketingFeatureOn } from "../../../../../lib/marketingFlags";

/**
 * Public API for the customer rating page.
 *
 * No admin session required — the route validates only the HMAC token that
 * was embedded in the review-request email link. Both GET and POST are
 * intentionally unauthenticated so the page works without cookies.
 *
 * GET  /api/marketing/review/[token]
 *   Verifies the token and returns { googleReviewUrl } so the client can
 *   show the "Leave a Google review" button on a high rating.
 *
 * POST /api/marketing/review/[token]
 *   Body: { rating: number, comment?: string }
 *   Records a private feedback entry for ratings <= 3.
 *   For ratings >= 4 it simply returns 200 (the client shows the Google CTA;
 *   no server-side storage needed for high ratings).
 *
 * Feature gate: if reviewEngine is off, both methods return 403.
 */

type Params = { token: string };

// ---- GET: verify token + return Google URL ----------------------------------

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  // Feature gate.
  const featureOn = await isMarketingFeatureOn("reviewEngine").catch(() => false);
  if (!featureOn) {
    return NextResponse.json({ error: "feature_disabled" }, { status: 403 });
  }

  const { token } = await params;
  const payload = await verifyReviewToken(token);
  if (!payload) {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }

  // Return the Google review URL so the client can build the CTA without
  // leaking other business data.
  const biz = await loadBusiness();
  const googleReviewUrl =
    (biz as { googleReviewUrl?: string }).googleReviewUrl ||
    biz.reviewUrl ||
    null;

  return NextResponse.json({ googleReviewUrl });
}

// ---- POST: record rating / feedback -----------------------------------------

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<Params> },
) {
  // Feature gate.
  const featureOn = await isMarketingFeatureOn("reviewEngine").catch(() => false);
  if (!featureOn) {
    return NextResponse.json({ error: "feature_disabled" }, { status: 403 });
  }

  const { token } = await params;
  const payload = await verifyReviewToken(token);
  if (!payload) {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }

  let body: { rating?: unknown; comment?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const rating = Number(body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "invalid_rating" }, { status: 400 });
  }

  // High ratings (>= 4) are handled client-side: route to Google. Nothing to
  // store server-side — just acknowledge.
  if (rating >= 4) {
    return NextResponse.json({ ok: true });
  }

  // Low ratings (<= 3) are stored privately.
  const comment =
    typeof body.comment === "string" ? body.comment.slice(0, 2000) : "";

  await recordFeedback({
    bookingId: payload.bookingId,
    clientName: payload.clientName,
    clientEmail: payload.clientEmail,
    rating,
    comment,
  });

  return NextResponse.json({ ok: true });
}
