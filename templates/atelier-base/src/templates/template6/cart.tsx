import CartView from "../../app/components/CartView";
import { getCurrency, getPublishableKey } from "../../lib/stripe";
import { T6Style, T6PageHeader } from "./sections";

/** template6 / cart — the shopping bag in the Maison Loré theme. */
export default async function Template6Cart() {
  const [stripePublishableKey, currency] = await Promise.all([
    getPublishableKey(),
    getCurrency(),
  ]);
  return (
    <>
      <T6Style />
      <main className="bg-[var(--t6-paper)] pb-24">
        <T6PageHeader section="page_cart" eyebrow="Your bag" title="Almost yours." />
        <CartView stripePublishableKey={stripePublishableKey} currency={currency} />
      </main>
    </>
  );
}
