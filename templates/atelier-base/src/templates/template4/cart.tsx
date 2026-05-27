import CartView from "../../app/components/CartView";
import { getCurrency, getPublishableKey } from "../../lib/stripe";
import { T4Style, T4PageHeader } from "./sections";

/** template4 / cart — the shopping bag in the clinic theme. */
export default async function Template4Cart() {
  const [stripePublishableKey, currency] = await Promise.all([
    getPublishableKey(),
    getCurrency(),
  ]);
  return (
    <>
      <T4Style />
      <main className="bg-[var(--t4-bg)] pb-24">
        <T4PageHeader section="page_cart" eyebrow="Your bag" title="Almost yours." />
        <CartView stripePublishableKey={stripePublishableKey} currency={currency} />
      </main>
    </>
  );
}
