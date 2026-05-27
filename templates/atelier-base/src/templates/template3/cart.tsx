import CartView from "../../app/components/CartView";
import { getCurrency, getPublishableKey } from "../../lib/stripe";
import { T3Style, T3PageHeader } from "./sections";

/** template3 / cart — the shopping bag in the day spa theme. */
export default async function Template3Cart() {
  const [stripePublishableKey, currency] = await Promise.all([
    getPublishableKey(),
    getCurrency(),
  ]);
  return (
    <>
      <T3Style />
      <main className="bg-[var(--t3-bg)] pb-24">
        <T3PageHeader section="page_cart" eyebrow="Your bag" title="Almost yours." />
        <CartView stripePublishableKey={stripePublishableKey} currency={currency} />
      </main>
    </>
  );
}
