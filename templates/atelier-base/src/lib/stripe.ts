import { loadPayments } from "./settings";
import { isDemoMode } from "./demoMode";

/**
 * Stripe key resolution. Keys come from the admin Settings
 * (data/settings.json -> payments) first; if blank, we fall back to env.
 *
 * The /barber showcase is the exception: it has no per-tenant settings keys,
 * and its data is wiped hourly by the demo reset. So in demo mode we resolve
 * a DEDICATED test-mode key from DEMO_STRIPE_SECRET_KEY / _PUBLISHABLE_KEY
 * before the global STRIPE_* env. That keeps the showcase shop on test mode
 * without forcing the marketing site or paying tenants onto the same keys.
 *
 * A customer install (not demo mode) just configures its own keys from the
 * admin Settings page, or sets the global STRIPE_* env on its host.
 */
function resolveSecretKey(settingsKey?: string): string {
  const demoKey = isDemoMode() ? process.env.DEMO_STRIPE_SECRET_KEY : "";
  const k = (
    settingsKey ||
    demoKey ||
    process.env.STRIPE_SECRET_KEY ||
    ""
  ).trim();
  return k.startsWith("sk_") ? k : "";
}

function resolvePublishableKey(settingsKey?: string): string {
  const demoKey = isDemoMode() ? process.env.DEMO_STRIPE_PUBLISHABLE_KEY : "";
  const k = (
    settingsKey ||
    demoKey ||
    process.env.STRIPE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
    ""
  ).trim();
  return k.startsWith("pk_") ? k : "";
}

export async function getPublishableKey(): Promise<string | null> {
  const pay = await loadPayments();
  return resolvePublishableKey(pay.stripePublishableKey) || null;
}

export async function getCurrency(): Promise<string> {
  const pay = await loadPayments();
  return (pay.currency || "usd").toLowerCase();
}

export async function createPaymentIntent(input: {
  amount: number;
  currency?: string;
  metadata?: Record<string, string>;
  receiptEmail?: string;
}): Promise<{ clientSecret: string; paymentIntentId: string } | null> {
  const pay = await loadPayments();
  const secretKey = resolveSecretKey(pay.stripeSecretKey);
  if (!secretKey) return null;
  const currency = (input.currency || pay.currency || "usd").toLowerCase();
  const params = new URLSearchParams();
  params.set("amount", String(Math.round(input.amount * 100)));
  params.set("currency", currency);
  params.set("automatic_payment_methods[enabled]", "true");
  if (input.receiptEmail) params.set("receipt_email", input.receiptEmail);
  if (input.metadata) {
    for (const [k, v] of Object.entries(input.metadata)) {
      params.set(`metadata[${k}]`, v);
    }
  }
  const res = await fetch("https://api.stripe.com/v1/payment_intents", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });
  if (!res.ok) {
    throw new Error(`Stripe PI: ${res.status} ${(await res.text()).slice(0, 300)}`);
  }
  const data = (await res.json()) as { id: string; client_secret: string };
  return { paymentIntentId: data.id, clientSecret: data.client_secret };
}

export async function retrievePaymentIntent(id: string): Promise<{
  id: string;
  status: string;
  amount: number;
  currency: string;
} | null> {
  const pay = await loadPayments();
  const secretKey = resolveSecretKey(pay.stripeSecretKey);
  if (!secretKey) return null;
  const res = await fetch(`https://api.stripe.com/v1/payment_intents/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  if (!res.ok) return null;
  return (await res.json()) as { id: string; status: string; amount: number; currency: string };
}

/**
 * Tiny Stripe Checkout wrapper. We don't ship the @stripe/stripe SDK to keep
 * the bundle lean — instead we hit the REST endpoint directly. Works for the
 * common case of redirecting a shop order to Stripe-hosted Checkout.
 *
 * Returns the hosted checkout URL on success, null if Stripe isn't configured.
 */
export async function createCheckoutSession(input: {
  lineItems: Array<{ name: string; amount: number; qty: number }>;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
  orderId: string;
  /** Extra session metadata, echoed back by retrieveCheckoutSession. Used by
   * the booking-deposit and membership flows to carry their context. */
  metadata?: Record<string, string>;
}): Promise<{ url: string; sessionId: string } | null> {
  const pay = await loadPayments();
  const secretKey = resolveSecretKey(pay.stripeSecretKey);
  if (!secretKey) return null;
  const currency = (pay.currency || "usd").toLowerCase();

  // application/x-www-form-urlencoded — Stripe REST API expects this for POST.
  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.set("success_url", input.successUrl);
  params.set("cancel_url", input.cancelUrl);
  params.set("customer_email", input.customerEmail);
  params.set("metadata[order_id]", input.orderId);
  for (const [k, v] of Object.entries(input.metadata ?? {})) {
    params.set(`metadata[${k}]`, v);
  }
  input.lineItems.forEach((li, i) => {
    params.set(`line_items[${i}][quantity]`, String(Math.max(1, Math.floor(li.qty))));
    params.set(`line_items[${i}][price_data][currency]`, currency);
    params.set(`line_items[${i}][price_data][product_data][name]`, li.name.slice(0, 250));
    // Stripe wants the smallest currency unit (pence / cents).
    params.set(`line_items[${i}][price_data][unit_amount]`, String(Math.round(li.amount * 100)));
  });

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Stripe: ${res.status} ${body.slice(0, 300)}`);
  }
  const data = (await res.json()) as { id: string; url: string };
  return { url: data.url, sessionId: data.id };
}

/**
 * Retrieve a Checkout Session to confirm a payment landed. The deposit and
 * membership success routes call this so a booking is never marked paid — and
 * a membership never created — on the strength of a redirect URL alone.
 */
export async function retrieveCheckoutSession(id: string): Promise<{
  id: string;
  paymentStatus: string;
  amountTotal: number;
  metadata: Record<string, string>;
  customerEmail: string | null;
  paymentIntent: string | null;
} | null> {
  const pay = await loadPayments();
  const secretKey = resolveSecretKey(pay.stripeSecretKey);
  if (!secretKey) return null;
  const res = await fetch(
    `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(id)}`,
    { headers: { Authorization: `Bearer ${secretKey}` } },
  );
  if (!res.ok) return null;
  const d = (await res.json()) as {
    id: string;
    payment_status: string;
    amount_total: number;
    metadata: Record<string, string> | null;
    customer_email: string | null;
    customer_details?: { email?: string | null } | null;
    payment_intent?: string | null;
  };
  return {
    id: d.id,
    paymentStatus: d.payment_status,
    amountTotal: d.amount_total,
    metadata: d.metadata ?? {},
    customerEmail: d.customer_email ?? d.customer_details?.email ?? null,
    paymentIntent: d.payment_intent ?? null,
  };
}

/**
 * Issue a full refund for a payment. Used by the admin Orders panel. The
 * refund lands on the original payment method; Stripe handles the rest.
 */
export async function refundPayment(
  paymentIntentId: string,
): Promise<{ ok: true; refundId: string } | { ok: false; error: string }> {
  const pay = await loadPayments();
  const secretKey = resolveSecretKey(pay.stripeSecretKey);
  if (!secretKey) return { ok: false, error: "Stripe is not configured." };
  const params = new URLSearchParams();
  params.set("payment_intent", paymentIntentId);
  const res = await fetch("https://api.stripe.com/v1/refunds", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });
  const data = (await res.json().catch(() => ({}))) as {
    id?: string;
    error?: { message?: string };
  };
  if (!res.ok) {
    return {
      ok: false,
      error: data?.error?.message || `Stripe refund failed (${res.status}).`,
    };
  }
  return { ok: true, refundId: data.id ?? "" };
}
