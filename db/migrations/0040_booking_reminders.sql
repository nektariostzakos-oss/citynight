-- Phase I.10 — cron-tracking columns on site_bookings.
--
-- reminded_at        Set when the 8h pre-booking reminder cron has emailed
--                    the customer. Guards against duplicate sends on
--                    overlapping cron windows.
-- review_requested_at Set when the post-visit review-request cron has
--                    emailed the one-tap "leave a review" link.
--
-- Both are unix-seconds. NULL means the cron hasn't fired yet for that
-- booking; non-NULL means it has and we skip on subsequent runs.

ALTER TABLE site_bookings ADD COLUMN reminded_at INTEGER;
ALTER TABLE site_bookings ADD COLUMN review_requested_at INTEGER;

CREATE INDEX IF NOT EXISTS site_bookings_reminder_due
  ON site_bookings (date, time, status)
  WHERE reminded_at IS NULL;

CREATE INDEX IF NOT EXISTS site_bookings_review_request_due
  ON site_bookings (completed_at)
  WHERE review_requested_at IS NULL AND status = 'completed';
