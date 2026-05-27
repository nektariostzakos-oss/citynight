"use client";

import { useMemo, useState } from "react";
import { Elements, ExpressCheckoutElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { useLang } from "../../lib/i18n";
import { langPick } from "../../lib/langs";
import { clientPath } from "../../lib/basePath";

type Line = { id: string; qty: number };

type Props = {
  items: Line[];
  /** Total in major units (e.g. dollars, NOT cents). Required for the deferred-intent flow. */
  amount: number;
  /** ISO currency code (e.g. "usd"). */
  currency: string;
  /** Stripe pk_... key passed from the server. */
  stripePublishableKey: string;
  onSuccess?: (orderId: string) => void;
  email?: string;
};

// Cache stripe.js per publishable key so we don't re-fetch on every mount.
const stripeCache = new Map<string, Promise<Stripe | null>>();
function getStripe(publishableKey: string): Promise<Stripe | null> {
  let p = stripeCache.get(publishableKey);
  if (!p) {
    p = loadStripe(publishableKey);
    stripeCache.set(publishableKey, p);
  }
  return p;
}

/**
 * Wallet "Buy now" button. Uses Stripe's deferred-intent pattern: we hand the
 * Elements provider {mode, amount, currency} upfront so the wallet buttons
 * render immediately — no waiting on /api/payment-intent + Stripe API on page
 * load. The real PaymentIntent is created only when the buyer confirms a
 * wallet payment.
 */
export default function ExpressCheckout({
  items,
  amount,
  currency,
  stripePublishableKey,
  onSuccess,
  email,
}: Props) {
  const { lang } = useLang();
  const stripePromise = useMemo(() => getStripe(stripePublishableKey), [stripePublishableKey]);

  // Amount must be in the smallest currency unit (cents) for Stripe.
  const amountInMinorUnits = Math.max(50, Math.round(amount * 100));

  return (
    <Elements
      stripe={stripePromise}
      options={{
        mode: "payment",
        amount: amountInMinorUnits,
        currency: currency.toLowerCase(),
        appearance: { theme: "night", variables: { colorPrimary: "#c9a961", borderRadius: "999px" } },
      }}
    >
      <Inner items={items} lang={lang} onSuccess={onSuccess} email={email} />
    </Elements>
  );
}

function Inner({
  items,
  lang,
  onSuccess,
  email,
}: {
  items: Line[];
  lang: string;
  onSuccess?: (orderId: string) => void;
  email?: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div>
      <ExpressCheckoutElement
        options={{
          buttonHeight: 44,
          paymentMethods: {
            applePay: "always",
            googlePay: "always",
            link: "auto",
            paypal: "auto",
            amazonPay: "auto",
          },
        }}
        onReady={({ availablePaymentMethods }) => {
          if (!availablePaymentMethods) {
            setMsg(
              langPick({
                en: "No express payment methods available on this device.",
                el: "Καμία διαθέσιμη γρήγορη μέθοδος πληρωμής σε αυτή τη συσκευή.",
                de: "Auf diesem Gerät sind keine Express-Zahlungsmethoden verfügbar.",
                fr: "Aucun moyen de paiement express disponible sur cet appareil.",
                it: "Nessun metodo di pagamento rapido disponibile su questo dispositivo.",
                es: "No hay métodos de pago exprés disponibles en este dispositivo.",
                nl: "Geen snelle betaalmethoden beschikbaar op dit apparaat.",
                pl: "Brak szybkich metod płatności na tym urządzeniu.",
                pt: "Não há métodos de pagamento expresso disponíveis neste dispositivo.",
                sv: "Inga snabba betalmetoder tillgängliga på den här enheten.",
                sq: "Nuk ka metoda pagese të shpejtë në këtë pajisje.",
              }, lang)
            );
          }
        }}
        onClick={({ resolve }) => {
          resolve({
            emailRequired: true,
            phoneNumberRequired: true,
            shippingAddressRequired: true,
            shippingRates: [
              {
                id: "standard",
                displayName: langPick({ en: "Standard shipping", el: "Τυπική αποστολή", de: "Standardversand", fr: "Livraison standard", it: "Spedizione standard", es: "Envío estándar", nl: "Standaardverzending", pl: "Wysyłka standardowa", pt: "Envio padrão", sv: "Standardfrakt", sq: "Transport standard" }, lang),
                amount: 0,
              },
            ],
            business: { name: "Atelier" },
          });
        }}
        onConfirm={async (event) => {
          if (!stripe || !elements) return;
          setBusy(true);
          setMsg(null);
          try {
            const { error: submitError } = await elements.submit();
            if (submitError) throw new Error(submitError.message || "Validation failed");

            // Create the real PaymentIntent now (server re-validates items + price).
            const piRes = await fetch("/api/payment-intent", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ items, lang, email: event.billingDetails?.email || email }),
            });
            const piData = await piRes.json();
            if (!piRes.ok) throw new Error(piData?.error || "Could not start payment");

            const result = await stripe.confirmPayment({
              elements,
              clientSecret: piData.clientSecret,
              confirmParams: {
                return_url: `${window.location.origin}${clientPath(`/shop/thanks?pi=${piData.paymentIntentId}`)}`,
              },
              redirect: "if_required",
            });
            if (result.error) throw new Error(result.error.message || "Payment failed");
            const pi = result.paymentIntent;
            if (!pi || (pi.status !== "succeeded" && pi.status !== "processing")) {
              throw new Error(`Payment status: ${pi?.status ?? "unknown"}`);
            }

            const ship = event.shippingAddress;
            const billing = event.billingDetails;
            const orderRes = await fetch("/api/orders/express", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                paymentIntentId: piData.paymentIntentId,
                items,
                lang,
                name: ship?.name || billing?.name || "",
                email: event.billingDetails?.email || "",
                phone: event.billingDetails?.phone || "",
                address: [ship?.address?.line1, ship?.address?.line2].filter(Boolean).join(", "),
                city: ship?.address?.city || "",
                postal: ship?.address?.postal_code || "",
              }),
            });
            const orderData = await orderRes.json();
            if (!orderRes.ok) throw new Error(orderData?.error || "Failed to record order");

            if (onSuccess) onSuccess(orderData.order.id);
            else window.location.href = clientPath(`/shop/thanks?order=${encodeURIComponent(orderData.order.id)}`);
          } catch (err) {
            setMsg(err instanceof Error ? err.message : "Checkout failed");
          } finally {
            setBusy(false);
          }
        }}
      />
      {busy && (
        <p className="mt-2 text-xs text-white/60">
          {langPick({ en: "Processing payment…", el: "Επεξεργασία πληρωμής…", de: "Zahlung wird verarbeitet…", fr: "Traitement du paiement…", it: "Elaborazione del pagamento…", es: "Procesando el pago…", nl: "Betaling verwerken…", pl: "Przetwarzanie płatności…", pt: "A processar o pagamento…", sv: "Behandlar betalning…", sq: "Po përpunohet pagesa…" }, lang)}
        </p>
      )}
      {msg && (
        <p className="mt-2 rounded-lg border border-red-400/30 bg-red-500/10 p-2 text-xs text-red-200">
          {msg}
        </p>
      )}
    </div>
  );
}
