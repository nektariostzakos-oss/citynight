import CartView from "../../app/components/CartView";
import { getCurrency, getPublishableKey } from "../../lib/stripe";
import { T5Style, T5PageHeader } from "./sections";

/** template5 / cart — the shopping bag in the Marigold theme. */
export default async function Template5Cart() {
  const [stripePublishableKey, currency] = await Promise.all([
    getPublishableKey(),
    getCurrency(),
  ]);
  return (
    <>
      <T5Style />
      <main className="bg-[var(--t5-paper)] pb-24">
        <T5PageHeader
          section="page_cart"
          eyebrow="Your bag"
          title="Almost yours."
        />
        <CartView stripePublishableKey={stripePublishableKey} currency={currency} />
      </main>
    </>
  );
}
