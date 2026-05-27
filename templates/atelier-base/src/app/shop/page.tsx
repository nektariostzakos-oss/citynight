import type { Metadata } from "next";
import TranslatedPageHeader from "../components/TranslatedPageHeader";
import ShopGrid from "../components/ShopGrid";
import CTA from "../components/CTA";
import { listProducts } from "../../lib/products";
import { buildPageMetadata } from "../../lib/pageSeo";
import { loadTemplateId, loadBusiness } from "@/lib/settings";
import { getCurrency } from "../../lib/stripe";
import { tenantSiteUrl } from "../../lib/tenantSiteUrl";
import { allProductAggregates } from "../../lib/reviews";
import Template2Shop from "@/templates/template2/shop";
import Template3Shop from "@/templates/template3/shop";
import Template4Shop from "@/templates/template4/shop";
import Template5Shop from "@/templates/template5/shop";
import Template6Shop from "@/templates/template6/shop";

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata("seo_shop", { path: "/shop" });
}

export default async function ShopPage() {
  const [tpl, products, business, currency, siteUrl, ratings] = await Promise.all([
    loadTemplateId(),
    listProducts(),
    loadBusiness(),
    getCurrency(),
    tenantSiteUrl(),
    allProductAggregates(),
  ]);

  // ItemList of Products with embedded Offer entries. Only emitted when the
  // tenant has products in stock — an empty catalogue → no ItemList at all
  // (an empty list in JSON-LD is a noisy negative signal). Per-Product
  // aggregateRating is attached only when the product actually has approved
  // reviews; products with zero reviews carry no rating signal at all.
  const cur = (currency || "EUR").toUpperCase();
  const shopLd =
    products.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: `${business.name || "Shop"} products`,
          numberOfItems: products.length,
          itemListElement: products.slice(0, 30).map((p, i) => {
            const item: Record<string, unknown> = {
              "@type": "Product",
              "@id": `${siteUrl}/shop/${p.slug}#product`,
              name: p.name_en || p.name_el,
              image: p.image
                ? p.image.startsWith("http")
                  ? p.image
                  : `${siteUrl}${p.image}`
                : undefined,
              description: p.shortDesc_en || p.shortDesc_el || undefined,
              url: `${siteUrl}/shop/${p.slug}`,
              offers: {
                "@type": "Offer",
                price: String(p.price),
                priceCurrency: cur,
                availability:
                  p.stock > 0
                    ? "https://schema.org/InStock"
                    : "https://schema.org/OutOfStock",
              },
            };
            const agg = ratings.get(p.id);
            if (agg && agg.count > 0) {
              item.aggregateRating = {
                "@type": "AggregateRating",
                ratingValue: agg.average,
                reviewCount: agg.count,
                bestRating: 5,
                worstRating: 1,
              };
            }
            return {
              "@type": "ListItem",
              position: i + 1,
              url: `${siteUrl}/shop/${p.slug}`,
              item,
            };
          }),
        }
      : null;

  const body = (() => {
    if (tpl === "template2") return <Template2Shop />;
    if (tpl === "template3") return <Template3Shop />;
    if (tpl === "template4") return <Template4Shop />;
    if (tpl === "template5") return <Template5Shop />;
    if (tpl === "template6") return <Template6Shop />;
    return (
      <main className="relative">
        <TranslatedPageHeader
          section="page_shop"
          eyebrowKey="page.shop.eyebrow"
          titleKey="page.shop.title"
          subKey="page.shop.sub"
        />
        <ShopGrid products={products} />
        <CTA />
      </main>
    );
  })();

  return (
    <>
      {shopLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(shopLd) }}
        />
      )}
      {body}
    </>
  );
}
