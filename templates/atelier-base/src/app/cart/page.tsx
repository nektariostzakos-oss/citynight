import type { Metadata } from "next";
import TranslatedPageHeader from "../components/TranslatedPageHeader";
import CartView from "../components/CartView";
import Template2Cart from "@/templates/template2/cart";
import Template3Cart from "@/templates/template3/cart";
import Template4Cart from "@/templates/template4/cart";
import Template5Cart from "@/templates/template5/cart";
import Template6Cart from "@/templates/template6/cart";
import { getCurrency, getPublishableKey } from "../../lib/stripe";
import { loadBusiness, loadTemplateId } from "../../lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const business = await loadBusiness();
  const name = business.name || "Your Salon";
  return {
    title: `Cart · ${name}`,
    alternates: { canonical: "/cart" },
    robots: { index: false, follow: true },
  };
}

export default async function CartPage() {
  const tpl = await loadTemplateId();
  if (tpl === "template2") return <Template2Cart />;
  if (tpl === "template3") return <Template3Cart />;
  if (tpl === "template4") return <Template4Cart />;
  if (tpl === "template5") return <Template5Cart />;
  if (tpl === "template6") return <Template6Cart />;
  const [stripePublishableKey, currency] = await Promise.all([
    getPublishableKey(),
    getCurrency(),
  ]);
  return (
    <main className="relative">
      <TranslatedPageHeader
        section="page_cart"
        eyebrowKey="page.cart.eyebrow"
        titleKey="page.cart.title"
        subKey="page.cart.sub"
      />
      <CartView stripePublishableKey={stripePublishableKey} currency={currency} />
    </main>
  );
}
