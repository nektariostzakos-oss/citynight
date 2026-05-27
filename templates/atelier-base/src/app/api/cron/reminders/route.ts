import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import {
  dueForReminder,
  dueForReviewRequest,
  markReminded,
  markReviewRequested,
} from "../../../../lib/bookings";
import { sendBookingReminder, sendReviewRequest } from "../../../../lib/email";
import { pushBookingReminder } from "../../../../lib/notify";
import { isAdmin } from "../../../../lib/auth";

/**
 * Reminder / review cron endpoint.
 *
 * Hits this every ~5 minutes (Vercel Cron, an external scheduler, or the
 * built-in dev-mode interval below). Each tick:
 *  1. Sends an 8h-ahead booking reminder for each booking in the 7h55m–8h05m
 *     window that hasn't been reminded yet.
 *  2. Sends a "how did we do?" review email 2–24h after each completed
 *     booking (once per booking).
 *
 * SEC-4: Auth guard. Authorized callers are either:
 *   - an external scheduler with the DEMO_RESET_SECRET, passed as a
 *     ?secret=<value> query param or an `Authorization: Bearer <value>` header;
 *   - a signed-in admin, running the job manually from the dashboard button.
 * Anything else returns 401.
 */

function checkSecret(req: NextRequest): boolean {
  const envSecret = process.env.DEMO_RESET_SECRET || "";
  if (!envSecret) return false;

  const provided =
    req.nextUrl.searchParams.get("secret") ||
    (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();

  if (!provided) return false;

  // Timing-safe comparison (length-mismatch short-circuit is fine here because
  // the attacker can observe it anyway via the provided value they control).
  const aBuf = Buffer.from(provided, "utf-8");
  const bBuf = Buffer.from(envSecret, "utf-8");
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

export async function GET(req: NextRequest) {
  // Scheduler with the shared secret, or an admin triggering it by hand.
  if (!checkSecret(req) && !(await isAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const [reminders, reviews] = await Promise.all([
    dueForReminder(),
    dueForReviewRequest(),
  ]);

  let remindersSent = 0;
  for (const b of reminders) {
    const ok = await sendBookingReminder(b);
    // Push the customer too, if they subscribed on their phone. Email stays
    // the fallback for anyone not subscribed. Best-effort: never throws.
    await pushBookingReminder(b);
    await markReminded(b.id);
    if (ok) remindersSent++;
  }

  let reviewsSent = 0;
  for (const b of reviews) {
    const ok = await sendReviewRequest(b);
    await markReviewRequested(b.id);
    if (ok) reviewsSent++;
  }

  return NextResponse.json({
    reminders: { checked: reminders.length, sent: remindersSent },
    reviews: { checked: reviews.length, sent: reviewsSent },
  });
}

export async function POST(req: NextRequest) {
  return GET(req);
}
