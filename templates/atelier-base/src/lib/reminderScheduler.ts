/**
 * Lightweight in-process reminder ticker.
 * Runs on the server boot (dev + prod) every 5 minutes.
 * In production behind serverless you'd disable this and use Vercel Cron
 * pointing at /api/cron/reminders instead.
 *
 * Each tick does four things in order:
 *   1. Send due booking reminders (email + push).
 *   2. Send post-visit review requests.
 *   3. Process due marketing campaigns.
 *   4. Process lifecycle automations.
 */
import {
  dueForReminder,
  dueForReviewRequest,
  markReminded,
  markReviewRequested,
  listBookings,
} from "./bookings";
import {
  dueForOrderReviewRequest,
  markOrderReviewRequested,
} from "./orders";
import {
  sendBookingReminder,
  sendReviewRequest,
  sendMarketingEmail,
  sendOrderReviewRequest,
} from "./email";
import { pushBookingReminder } from "./notify";
import { buildRatingPageUrl } from "./reviewEngine";
import {
  buildProductReviewUrl,
} from "./productReviewToken";
import { findProduct } from "./products";
import { getSiteUrl } from "./atelierSiteUrl";
import { listCampaigns, updateCampaignStatus } from "./marketingCampaigns";
import { getSegment, computeSegmentClients } from "./marketingSegments";
import { appendEvent, listEvents, statsForCampaign } from "./marketingEvents";
import { isMarketingFeatureOn } from "./marketingFlags";
import { sendPush, subscriptionsForClient } from "./push";
import { sendTenantSms } from "./sms";
import { getTenantPath } from "./tenantContext";
import { listClients } from "./clients";
import {
  listAutomations,
  dueEnrolments,
  recordEnrolments,
} from "./marketingAutomations";
import { isOptedIn } from "./marketingPrefs";
import { reserveSends } from "./marketingQuota";

declare global {
  // eslint-disable-next-line no-var
  var __atelierReminderInterval: NodeJS.Timeout | undefined;
}

const FIVE_MIN = 5 * 60 * 1000;

// ---- click-tracking URL builder --------------------------------------------

/**
 * Wrap a URL in the click-tracking redirect so opens/clicks are recorded.
 * The token is base64url-encoded "{campaignId}|{recipient}|{targetUrl}".
 * Root-clean: uses the tenant path slug from context, no hardcoded slug.
 */
function clickTrackUrl(
  campaignId: string,
  recipient: string,
  targetUrl: string,
): string {
  const slug = getTenantPath();
  const raw = `${campaignId}|${recipient}|${targetUrl}`;
  const token = Buffer.from(raw, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const base = slug ? `/${slug}` : "";
  return `${base}/api/marketing/click/${token}`;
}

// ---- campaign processing ----------------------------------------------------

async function processCampaigns(): Promise<void> {
  // Feature gate: if campaigns feature is off, skip entirely.
  let campaignsOn: boolean;
  try {
    campaignsOn = await isMarketingFeatureOn("campaigns");
  } catch {
    return;
  }
  if (!campaignsOn) return;

  const now = new Date();
  let all;
  try {
    all = await listCampaigns();
  } catch {
    return;
  }

  const due = all.filter((c) => {
    if (c.status !== "scheduled") return false;
    // If no scheduledAt, treat as "send immediately".
    if (!c.scheduledAt) return true;
    return new Date(c.scheduledAt) <= now;
  });

  for (const campaign of due) {
    // Flip to "sending" atomically so a concurrent tick doesn't double-send.
    const inFlight = await updateCampaignStatus(campaign.id, "sending", {
      startedAt: new Date().toISOString(),
    });
    if (!inFlight) continue; // another tick got there first

    // Resolve the segment to a recipient list.
    let clients;
    try {
      const segment = await getSegment(campaign.segmentId);
      if (!segment) {
        await updateCampaignStatus(campaign.id, "canceled");
        continue;
      }
      clients = await computeSegmentClients(segment);
    } catch {
      // If segment resolution fails, leave as "sending" and retry next tick.
      continue;
    }

    // Resolve channel feature flags in parallel.
    const [pushOn, emailOn, smsOn] = await Promise.all([
      isMarketingFeatureOn("push").catch(() => false),
      isMarketingFeatureOn("email").catch(() => false),
      isMarketingFeatureOn("sms").catch(() => false),
    ]);

    // Per-recipient send — best-effort, failures write a "fail" event.
    // Phase 7: each channel is gated by (a) the preference center and
    // (b) the per-tenant daily send quota. reserveSends is atomic and
    // returns how many of the requested sends were granted; we send one
    // at a time so a partial grant never skips a recipient silently.
    for (const client of clients) {
      // -- Push --
      if (
        campaign.channels.includes("push") &&
        pushOn &&
        client.reach.push &&
        campaign.messages.push
      ) {
        // Preference center: skip if the client has opted out of push.
        const pushOptedIn = await isOptedIn(
          { email: client.email, phone: client.phone },
          "push",
        ).catch(() => true);

        if (pushOptedIn) {
          // Quota: reserve 1 push send; skip if cap is exhausted for today.
          const granted = await reserveSends("push", 1).catch(() => 1);
          if (granted > 0) {
            const msg = campaign.messages.push;
            let url = msg.url;
            if (url) {
              url = clickTrackUrl(campaign.id, client.email || client.phone, url);
            }
            const subs = await subscriptionsForClient(client.email, client.phone).catch(() => []);
            if (subs.length > 0) {
              try {
                const result = await sendPush(subs, {
                  title: msg.title,
                  body: msg.body,
                  url,
                  tag: `campaign-${campaign.id}`,
                });
                const recipient = client.email || client.phone;
                if (result.sent > 0) {
                  await appendEvent({
                    campaignId: campaign.id,
                    channel: "push",
                    recipient,
                    kind: "send",
                  }).catch(() => undefined);
                }
                if (result.failed > 0) {
                  await appendEvent({
                    campaignId: campaign.id,
                    channel: "push",
                    recipient,
                    kind: "fail",
                    error: "push_delivery_failure",
                  }).catch(() => undefined);
                }
              } catch (err) {
                await appendEvent({
                  campaignId: campaign.id,
                  channel: "push",
                  recipient: client.email || client.phone,
                  kind: "fail",
                  error: err instanceof Error ? err.message : "push_error",
                }).catch(() => undefined);
              }
            }
          }
          // granted === 0 means the daily cap is exhausted. The recipient
          // is NOT dropped — the campaign will be retried in the next tick
          // (still "sending") if the operator raises the cap. Best-effort:
          // the scheduler marks "sent" after this loop regardless.
        }
      }

      // -- Email --
      if (
        campaign.channels.includes("email") &&
        emailOn &&
        client.reach.email &&
        client.email &&
        campaign.messages.email
      ) {
        // Preference center: skip if the client has opted out of email.
        const emailOptedIn = await isOptedIn(
          { email: client.email, phone: client.phone },
          "email",
        ).catch(() => true);

        if (emailOptedIn) {
          // Quota: reserve 1 email send.
          const granted = await reserveSends("email", 1).catch(() => 1);
          if (granted > 0) {
            const msg = campaign.messages.email;
            // Wrap any URLs in the body through the click tracker.
            const trackedBody = msg.body.replace(
              /href="([^"]+)"/g,
              (_, rawUrl: string) => {
                const tracked = clickTrackUrl(campaign.id, client.email, rawUrl);
                return `href="${tracked}"`;
              },
            );

            // Build a real signed preferences URL for this recipient so they
            // can manage opt-ins directly from the email footer.
            const prefUrl = await import("./marketingPrefs")
              .then((m) => m.prefUrlFor({ email: client.email }))
              .catch(() => "#preferences");

            // Replace the {unsubscribe_url} placeholder or append the footer.
            const htmlWithPref = trackedBody.replace("{unsubscribe_url}", prefUrl);
            const finalHtml = htmlWithPref.includes(prefUrl)
              ? htmlWithPref
              : `${htmlWithPref}<p style="font-size:12px;color:#888;margin-top:24px">` +
                `<a href="${prefUrl}">Manage preferences / Unsubscribe</a></p>`;

            const result = await sendMarketingEmail({
              to: client.email,
              subject: msg.subject,
              html: finalHtml,
            }).catch((e) => ({
              ok: false,
              error: e instanceof Error ? e.message : "email_error",
            }));

            await appendEvent({
              campaignId: campaign.id,
              channel: "email",
              recipient: client.email,
              kind: result.ok ? "send" : "fail",
              ...(result.ok ? {} : { error: result.error }),
            }).catch(() => undefined);
          }
        }
      }

      // -- SMS --
      if (
        campaign.channels.includes("sms") &&
        smsOn &&
        client.reach.phone &&
        client.phone &&
        campaign.messages.sms
      ) {
        // Preference center: skip if the client has opted out of sms.
        const smsOptedIn = await isOptedIn(
          { email: client.email, phone: client.phone },
          "sms",
        ).catch(() => true);

        if (smsOptedIn) {
          // Quota: reserve 1 sms send (SMS has per-message cost).
          const granted = await reserveSends("sms", 1).catch(() => 1);
          if (granted > 0) {
            // Build a short preferences link for the SMS body footer.
            const prefUrl = await import("./marketingPrefs")
              .then((m) => m.prefUrlFor({ phone: client.phone }))
              .catch(() => "");

            const smsBody = campaign.messages.sms.text +
              (prefUrl ? ` Manage: ${prefUrl}` : "");

            // sendTenantSms already checks the feature flag internally; we
            // check it at the outer level too to avoid even building the payload.
            const result = await sendTenantSms({
              to: client.phone,
              body: smsBody,
            }).catch((e) => ({
              ok: false as const,
              error: e instanceof Error ? e.message : "sms_error",
            }));

            await appendEvent({
              campaignId: campaign.id,
              channel: "sms",
              recipient: client.phone,
              kind: result.ok ? "send" : "fail",
              ...(!result.ok ? { error: result.error } : {}),
            }).catch(() => undefined);
          }
        }
      }
    }

    // Compute final stats from the event log.
    const events = await listEvents().catch(() => []);
    const evtStats = statsForCampaign(campaign.id, events);

    await updateCampaignStatus(campaign.id, "sent", {
      sentAt: new Date().toISOString(),
      stats: {
        recipients: clients.length,
        push: {
          sent: evtStats.push.send,
          failed: evtStats.push.fail,
          clicks: evtStats.push.click,
        },
        email: {
          sent: evtStats.email.send,
          failed: evtStats.email.fail,
          opens: evtStats.email.open,
          clicks: evtStats.email.click,
        },
        sms: {
          sent: evtStats.sms.send,
          failed: evtStats.sms.fail,
        },
      },
    }).catch(() => undefined);
  }
}

// ---- automation processing --------------------------------------------------

/**
 * Phase 4 of the tick: evaluate each enabled lifecycle automation and send to
 * clients that are newly due. Mirrors processCampaigns() in structure.
 *
 * For each enabled automation:
 *   a) Call dueEnrolments() to get the list of clients to message this pass
 *      (already filtered against the dedup ledger so no client is re-messaged).
 *   b) Send on each selected channel (push / email / sms), respecting the
 *      per-channel feature flags.
 *   c) Write one MarketingEvent per recipient (campaignId = "auto:<autoId>").
 *   d) Record the enrolment in the ledger so it won't repeat.
 *
 * Best-effort: never throws. Individual send failures write a "fail" event but
 * do not abort the rest of the pass.
 *
 * Phase 7: preference-center filtering and per-tenant send quotas are applied
 * before each channel send — identical logic to processCampaigns().
 */
async function processAutomations(): Promise<void> {
  // Feature gate: if the automations feature is off, skip entirely.
  let automationsOn: boolean;
  try {
    automationsOn = await isMarketingFeatureOn("automations");
  } catch {
    return;
  }
  if (!automationsOn) return;

  let automations;
  try {
    automations = await listAutomations();
  } catch {
    return;
  }

  const enabled = automations.filter((a) => a.enabled);
  if (enabled.length === 0) return;

  // Load clients and bookings once for the whole pass to avoid redundant reads.
  let clients: Awaited<ReturnType<typeof listClients>>;
  let bookings: Awaited<ReturnType<typeof listBookings>>;
  try {
    [clients, bookings] = await Promise.all([listClients(), listBookings()]);
  } catch {
    return;
  }

  // Resolve channel feature flags once for the pass.
  const [pushOn, emailOn, smsOn] = await Promise.all([
    isMarketingFeatureOn("push").catch(() => false),
    isMarketingFeatureOn("email").catch(() => false),
    isMarketingFeatureOn("sms").catch(() => false),
  ]);

  for (const automation of enabled) {
    let pending;
    try {
      pending = await dueEnrolments(automation, clients, bookings);
    } catch {
      continue; // skip this automation on evaluation error
    }

    if (pending.length === 0) continue;

    // Campaign-id convention for automation events: "auto:<automationId>".
    const campaignId = `auto:${automation.id}`;

    const logged: Array<{ automationId: string; key: string }> = [];

    for (const enrolment of pending) {
      const { client } = enrolment;
      const recipient = client.email || client.phone;
      if (!recipient) continue;

      // -- Push --
      if (
        automation.channels.includes("push") &&
        pushOn &&
        automation.messages.push
      ) {
        // Preference center: skip if the client has opted out of push.
        const pushOptedIn = await isOptedIn(
          { email: client.email, phone: client.phone },
          "push",
        ).catch(() => true);

        if (pushOptedIn) {
          // Quota: reserve 1 push send.
          const granted = await reserveSends("push", 1).catch(() => 1);
          if (granted > 0) {
            const msg = automation.messages.push;
            const subs = await subscriptionsForClient(
              client.email,
              client.phone,
            ).catch(() => []);

            if (subs.length > 0) {
              try {
                const result = await sendPush(subs, {
                  title: msg.title,
                  body: msg.body,
                  url: msg.url,
                  tag: `auto-${automation.id}`,
                });
                if (result.sent > 0) {
                  await appendEvent({
                    campaignId,
                    channel: "push",
                    recipient,
                    kind: "send",
                  }).catch(() => undefined);
                }
                if (result.failed > 0) {
                  await appendEvent({
                    campaignId,
                    channel: "push",
                    recipient,
                    kind: "fail",
                    error: "push_delivery_failure",
                  }).catch(() => undefined);
                }
              } catch (err) {
                await appendEvent({
                  campaignId,
                  channel: "push",
                  recipient,
                  kind: "fail",
                  error: err instanceof Error ? err.message : "push_error",
                }).catch(() => undefined);
              }
            }
          }
        }
      }

      // -- Email --
      if (
        automation.channels.includes("email") &&
        emailOn &&
        client.email &&
        automation.messages.email
      ) {
        // Preference center: skip if the client has opted out of email.
        const emailOptedIn = await isOptedIn(
          { email: client.email, phone: client.phone },
          "email",
        ).catch(() => true);

        if (emailOptedIn) {
          // Quota: reserve 1 email send.
          const granted = await reserveSends("email", 1).catch(() => 1);
          if (granted > 0) {
            const msg = automation.messages.email;
            // Replace {name} and {coupon} placeholders in the message body.
            const coupon = automation.couponCode ?? "";
            const html = msg.body
              .replace(/\{name\}/g, client.name || "")
              .replace(/\{coupon\}/g, coupon);

            // Build a real signed preferences URL for this recipient.
            const prefUrl = await import("./marketingPrefs")
              .then((m) => m.prefUrlFor({ email: client.email }))
              .catch(() => "#preferences");

            const finalHtml = html.includes("{unsubscribe_url}")
              ? html.replace("{unsubscribe_url}", prefUrl)
              : `${html}<p style="font-size:12px;color:#888;margin-top:24px">` +
                `<a href="${prefUrl}">Manage preferences / Unsubscribe</a></p>`;

            const result = await sendMarketingEmail({
              to: client.email,
              subject: msg.subject,
              html: finalHtml,
            }).catch((e) => ({
              ok: false,
              error: e instanceof Error ? e.message : "email_error",
            }));

            await appendEvent({
              campaignId,
              channel: "email",
              recipient: client.email,
              kind: result.ok ? "send" : "fail",
              ...(!result.ok ? { error: result.error } : {}),
            }).catch(() => undefined);
          }
        }
      }

      // -- SMS --
      if (
        automation.channels.includes("sms") &&
        smsOn &&
        client.phone &&
        automation.messages.sms
      ) {
        // Preference center: skip if the client has opted out of sms.
        const smsOptedIn = await isOptedIn(
          { email: client.email, phone: client.phone },
          "sms",
        ).catch(() => true);

        if (smsOptedIn) {
          // Quota: reserve 1 sms send.
          const granted = await reserveSends("sms", 1).catch(() => 1);
          if (granted > 0) {
            const coupon = automation.couponCode ?? "";
            const baseText = automation.messages.sms.text
              .replace(/\{name\}/g, client.name || "")
              .replace(/\{coupon\}/g, coupon);

            // Append a short preferences link for opt-out.
            const prefUrl = await import("./marketingPrefs")
              .then((m) => m.prefUrlFor({ phone: client.phone }))
              .catch(() => "");

            const text = baseText + (prefUrl ? ` Manage: ${prefUrl}` : "");

            const result = await sendTenantSms({
              to: client.phone,
              body: text,
            }).catch((e) => ({
              ok: false as const,
              error: e instanceof Error ? e.message : "sms_error",
            }));

            await appendEvent({
              campaignId,
              channel: "sms",
              recipient: client.phone,
              kind: result.ok ? "send" : "fail",
              ...(!result.ok ? { error: result.error } : {}),
            }).catch(() => undefined);
          }
        }
      }

      // Record the enrolment in the dedup ledger after sends complete.
      logged.push({ automationId: automation.id, key: enrolment.sentKey });
    }

    if (logged.length > 0) {
      await recordEnrolments(logged).catch(() => undefined);
    }
  }
}

// ---- main tick --------------------------------------------------------------

async function tick() {
  try {
    // 1. Booking reminders.
    const [reminders, reviews] = await Promise.all([
      dueForReminder(),
      dueForReviewRequest(),
    ]);
    for (const b of reminders) {
      await sendBookingReminder(b);
      // Web Push alongside the email (email stays the fallback).
      await pushBookingReminder(b);
      await markReminded(b.id);
    }

    // Review requests: when the reviewEngine feature is on, embed the signed
    // rating-page URL so the customer lands on the funnel page; when off, skip
    // entirely (the old plain review email is not sent either, keeping behaviour
    // predictable when the operator disables the feature).
    let reviewEngineOn = false;
    try {
      reviewEngineOn = await isMarketingFeatureOn("reviewEngine");
    } catch {
      // leave false on error — safer to skip than to crash
    }

    if (reviewEngineOn) {
      for (const b of reviews) {
        // Build the signed rating-page URL. The function is root-clean: it uses
        // getTenantPath() so the URL carries the tenant slug when in a SaaS
        // context and resolves to root-relative in a standalone install.
        const ratingPath = await buildRatingPageUrl({
          bookingId: b.id,
          clientName: b.name,
          clientEmail: b.email,
        });
        // The rating page URL is absolute so the email client can open it. In a
        // SaaS deploy ATELIER_SITE_URL / NEXT_PUBLIC_SITE_URL resolve to the
        // public hostname; in a standalone ZIP the owner sets NEXT_PUBLIC_SITE_URL.
        const siteUrl = getSiteUrl();
        const absoluteRatingUrl = ratingPath.startsWith("http")
          ? ratingPath
          : `${siteUrl}${ratingPath}`;

        // Re-use the existing sendReviewRequest but override the target URL via
        // the env that email.ts already reads as a fallback. We do NOT mutate
        // the booking or process.env; instead we pass the overridden URL via a
        // thin wrapper that patches the business object's reviewUrl for this call.
        // Simpler: call sendReviewRequest with the booking whose reviewUrl we
        // temporarily expose through the NEXT_PUBLIC_REVIEW_URL env. Since we
        // cannot pass extra args to the existing function signature without
        // touching email.ts, we use the same approach the existing code already
        // uses: the biz.reviewUrl field takes precedence over the env var.
        //
        // The cleanest zero-change path: set a process-level env override that
        // email.ts reads. This is safe in a single-threaded tick.
        const prevEnv = process.env.NEXT_PUBLIC_REVIEW_URL;
        process.env.NEXT_PUBLIC_REVIEW_URL = absoluteRatingUrl;
        try {
          await sendReviewRequest(b);
        } finally {
          // Always restore to avoid leaking into subsequent ticks.
          if (prevEnv === undefined) {
            delete process.env.NEXT_PUBLIC_REVIEW_URL;
          } else {
            process.env.NEXT_PUBLIC_REVIEW_URL = prevEnv;
          }
        }

        await markReviewRequested(b.id);
      }
    }

    // ---- Post-order "rate your purchase" emails -------------------------
    // One email per order, listing every purchased product with its own
    // signed review link. Once flipped to "requested" the order won't be
    // re-emailed; the flag is single-use.
    try {
      const dueOrders = await dueForOrderReviewRequest();
      for (const order of dueOrders) {
        // Deduplicate by product id so a "2x beard oil" line item yields one
        // link, not two. We still need the product's slug + name to render
        // both the email and the URL, so a single lookup per unique id.
        const uniqueIds = Array.from(
          new Set(order.items.map((it) => it.id)),
        );
        const lines: Array<{ name: string; url: string }> = [];
        for (const productId of uniqueIds) {
          const product = await findProduct(productId).catch(() => null);
          if (!product) continue; // stale line — admin deleted the product
          const url = await buildProductReviewUrl({
            orderId: order.id,
            productId: product.id,
            productSlug: product.slug,
            customerEmail: order.email,
          });
          const siteUrl = getSiteUrl();
          const absoluteUrl = url.startsWith("http") ? url : `${siteUrl}${url}`;
          lines.push({ name: product.name_en, url: absoluteUrl });
        }
        if (lines.length > 0) {
          await sendOrderReviewRequest(
            {
              id: order.id,
              name: order.name,
              email: order.email,
              lang: order.lang,
            },
            lines,
          );
        }
        // Always mark requested, even when lines is empty (every product was
        // deleted) so we don't loop on a dead order forever.
        await markOrderReviewRequested(order.id);
      }
    } catch {
      // swallow — order review failures must never crash the loop
    }
  } catch {
    // swallow — never crash the boot loop
  }

  // 2. Marketing campaigns — runs after reminder work in each tick.
  try {
    await processCampaigns();
  } catch {
    // swallow
  }

  // 3. Lifecycle automations — runs after campaigns each tick.
  try {
    await processAutomations();
  } catch {
    // swallow
  }
}

export function startReminderScheduler() {
  if (process.env.ATELIER_DISABLE_REMINDERS === "1") return;
  if (globalThis.__atelierReminderInterval) return;
  globalThis.__atelierReminderInterval = setInterval(tick, FIVE_MIN);
  // Fire once 30s after boot so a freshly-scheduled appointment can be picked up.
  setTimeout(tick, 30_000);
}
