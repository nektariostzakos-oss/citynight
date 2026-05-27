import CartView from "../../app/components/CartView";
import { getCurrency, getPublishableKey } from "../../lib/stripe";
import { T2Style, T2PageHeader } from "./sections";

/** template2 / cart — the shopping bag in the nail-studio theme. */
export default async function Template2Cart() {
  const [stripePublishableKey, currency] = await Promise.all([
    getPublishableKey(),
    getCurrency(),
  ]);
  return (
    <>
      <T2Style />
      <main className="bg-[var(--t2-bg)] pb-24">
        <T2PageHeader section="page_cart" eyebrow="Your bag" title="Almost yours." />
        <CartView stripePublishableKey={stripePublishableKey} currency={currency} />
      </main>
    </>
  );
}
