import crypto from "node:crypto";
import { loadAnalytics, type AnalyticsSettings } from "./settings";

/**
 * Server-side ad-conversion tracking.
 *
 * The client pixels in layout.tsx report PageViews from the browser. This
 * module reports the money event — `Purchase` — server to server: straight
 * from the payment-confirmation routes to Meta's Conversions API and Google
 * Analytics' Measurement Protocol. Because it never touches the browser it
 * survives ad blockers, third-party-cookie loss and the iOS tracking
 * restrictions that quietly drop client-side pixels, so conversions stay
 * accurate. Every send is best-effort: it never throws and never blocks the
 * customer's checkout.
 *
 * Each tenant supplies its own credentials in the admin (Marketing → SEO /
 * the Analytics settings): Meta Pixel id + CAPI token, GA4 id + API secret.
 * With none set, the calls below no-op.
 */

const META_API_VERSION = "v19.0";

/** SHA-256, lower-cased + trimmed — the format Meta expects for hashed PII. */
function hash(value: string): string {
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

export type TrackContext = {
  clientIp?: string;
  userAgent?: string;
  /** `_fbp` cookie — Meta's browser id, improves match quality. */
  fbp?: string;
  /** `_fbc` cookie — Meta's click id. */
  fbc?: string;
  /** GA4 client id, parsed from the `_ga` cookie. */
  gaClientId?: string;
  eventSourceUrl?: string;
};

/** Pull the server-side tracking context (cookies, IP, UA) off a request. */
export function trackContext(req: Request): TrackContext {
  const h = req.headers;
  const cookie = h.get("cookie") || "";
  const cookieVal = (name: string) => {
    const m = cookie.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
    return m ? decodeURIComponent(m[1]) : "";
  };
  // `_ga` looks like "GA1.1.1234567890.1700000000"; the client id is the
  // last two dot-segments.
  const ga = cookieVal("_ga");
  const gaClientId = ga ? ga.split(".").slice(-2).join(".") : "";
  const xff = h.get("x-forwarded-for") || "";
  return {
    clientIp: xff.split(",")[0].trim(),
    userAgent: h.get("user-agent") || "",
    fbp: cookieVal("_fbp"),
    fbc: cookieVal("_fbc"),
    gaClientId,
    eventSourceUrl: h.get("referer") || "",
  };
}

export type PurchaseEvent = {
  /** Stable id (booking / order / membership id). Doubles as the dedup key. */
  eventId: string;
  value: number;
  currency: string;
  email?: string;
  phone?: string;
  /** "Booking" | "Order" | "Membership" — for reporting. */
  contentName?: string;
};

/**
 * Fire a server-side `Purchase` to Meta CAPI and GA4 Measurement Protocol.
 * Call it from a payment-confirmation route once the payment is verified.
 */
export async function trackPurchase(
  event: PurchaseEvent,
  ctx: TrackContext,
): Promise<void> {
  let analytics: AnalyticsSettings;
  try {
    analytics = await loadAnalytics();
  } catch {
    return;
  }
  await Promise.allSettled([
    sendMetaPurchase(analytics, event, ctx),
    sendGa4Purchase(analytics, event, ctx),
  ]);
}

async function sendMetaPurchase(
  a: AnalyticsSettings,
  event: PurchaseEvent,
  ctx: TrackContext,
): Promise<void> {
  if (!a.metaPixel || !a.metaCapiToken) return;
  const userData: Record<string, unknown> = {};
  if (event.email) userData.em = [hash(event.email)];
  if (event.phone) userData.ph = [hash(event.phone.replace(/[^\d+]/g, ""))];
  if (ctx.clientIp) userData.client_ip_address = ctx.clientIp;
  if (ctx.userAgent) userData.client_user_agent = ctx.userAgent;
  if (ctx.fbp) userData.fbp = ctx.fbp;
  if (ctx.fbc) userData.fbc = ctx.fbc;
  const payload = {
    data: [
      {
        event_name: "Purchase",
        event_time: Math.floor(Date.now() / 1000),
        // Shared id so Meta de-duplicates if a browser pixel ever sends it too.
        event_id: event.eventId,
        action_source: "website",
        ...(ctx.eventSourceUrl ? { event_source_url: ctx.eventSourceUrl } : {}),
        user_data: userData,
        custom_data: {
          currency: event.currency.toUpperCase(),
          value: event.value,
          ...(event.contentName ? { content_name: event.contentName } : {}),
        },
      },
    ],
  };
  try {
    await fetch(
      `https://graph.facebook.com/${META_API_VERSION}/${encodeURIComponent(a.metaPixel)}/events?access_token=${encodeURIComponent(a.metaCapiToken)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
  } catch {
    /* best-effort — a tracking failure must never break a checkout */
  }
}

async function sendGa4Purchase(
  a: AnalyticsSettings,
  event: PurchaseEvent,
  ctx: TrackContext,
): Promise<void> {
  if (!a.ga4 || !a.ga4ApiSecret) return;
  const payload = {
    // The browser's GA client id when we have it, else a random one so the
    // event still lands (it just won't join a prior browser session).
    client_id: ctx.gaClientId || crypto.randomUUID(),
    events: [
      {
        name: "purchase",
        params: {
          currency: event.currency.toUpperCase(),
          value: event.value,
          transaction_id: event.eventId,
          items: [
            {
              item_name: event.contentName || "Purchase",
              price: event.value,
              quantity: 1,
            },
          ],
        },
      },
    ],
  };
  try {
    await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(a.ga4)}&api_secret=${encodeURIComponent(a.ga4ApiSecret)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
  } catch {
    /* best-effort */
  }
}
