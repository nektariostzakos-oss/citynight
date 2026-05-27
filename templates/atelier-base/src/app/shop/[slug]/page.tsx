import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findProduct, listProducts } from "../../../lib/products";
import { getCurrency, getPublishableKey } from "../../../lib/stripe";
import { loadBusiness } from "../../../lib/settings";
import ProductDetail from "../../components/ProductDetail";
import ProductReviews from "../../components/ProductReviews";
import { tenantSiteUrl } from "../../../lib/tenantSiteUrl";
import {
  listApprovedProductReviews,
  productAggregate,
} from "../../../lib/reviews";

export async function generateStaticParams() {
  const all = await listProducts();
  return all.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [product, business, siteUrl] = await Promise.all([
    findProduct(slug),
    loadBusiness(),
    tenantSiteUrl(),
  ]);
  if (!product) return { title: "Product not found" };
  const name = business.name || "Your Salon";
  // The document <title> goes through the root layout's `%s · <brand>`
  // template, so the page title is just the product name (the template adds
  // the brand). OG / Twitter titles are standalone — no template — so they
  // carry the full "Product · Brand" form.
  const title = product.name_en;
  const socialTitle = `${product.name_en} · ${name}`;
  const description = (product.shortDesc_en || product.longDesc_en || `${product.name_en} from ${name}.`).slice(0, 158);
  const image = product.image || "/og.jpg";
  return {
    title,
    description,
    openGraph: {
      title: socialTitle,
      description,
      url: `${siteUrl}/shop/${slug}`,
      images: [{ url: image }],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      images: [image],
    },
    alternates: { canonical: `/shop/${slug}` },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await findProduct(slug);
  if (!product) notFound();

  // Three related products — prefer same category, fill from the rest of the
  // catalogue if the category is thin.
  const all = await listProducts();
  const others = all.filter((p) => p.id !== product.id);
  const sameCat = others.filter((p) => p.category_en === product.category_en);
  const fillers = others.filter((p) => p.category_en !== product.category_en);
  const related = [...sameCat, ...fillers].slice(0, 3);

  // Load Stripe config server-side so the wallet buttons can render
  // immediately on mount (no upfront /api/payment-intent round trip).
  const [
    stripePublishableKey,
    currency,
    business,
    siteUrl,
    productReviews,
    aggregate,
  ] = await Promise.all([
    getPublishableKey(),
    getCurrency(),
    loadBusiness(),
    tenantSiteUrl(),
    listApprovedProductReviews(product.id),
    productAggregate(product.id),
  ]);

  // Product + Offer. AggregateRating + Review are added ONLY when real
  // approved reviews exist for this product — emitting a fabricated rating
  // trips Google's "review snippet should be a real customer review" rule.
  const productLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${siteUrl}/shop/${product.slug}#product`,
    name: product.name_en,
    description: product.shortDesc_en || product.longDesc_en || undefined,
    sku: product.id,
    category: product.category_en || undefined,
    url: `${siteUrl}/shop/${product.slug}`,
    offers: {
      "@type": "Offer",
      url: `${siteUrl}/shop/${product.slug}`,
      price: String(product.price),
      priceCurrency: (currency || "EUR").toUpperCase(),
      availability:
        product.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      seller: { "@id": `${siteUrl}#business` },
    },
  };
  if (product.image) {
    productLd.image = product.image.startsWith("http")
      ? product.image
      : `${siteUrl}${product.image}`;
  }
  if (business.name) {
    productLd.brand = { "@type": "Brand", name: business.name };
  }
  if (aggregate.count > 0) {
    productLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: aggregate.average,
      reviewCount: aggregate.count,
      bestRating: 5,
      worstRating: 1,
    };
    // Embed up to 10 most recent reviews so the rich result has substance.
    productLd.review = productReviews.slice(0, 10).map((r) => ({
      "@type": "Review",
      author: { "@type": "Person", name: r.name },
      datePublished: r.createdAt,
      reviewRating: {
        "@type": "Rating",
        ratingValue: r.rating,
        bestRating: 5,
        worstRating: 1,
      },
      name: r.title || undefined,
      reviewBody: r.body,
    }));
  }

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${siteUrl}/` },
      { "@type": "ListItem", position: 2, name: "Shop", item: `${siteUrl}/shop` },
      { "@type": "ListItem", position: 3, name: product.name_en },
    ],
  };

  return (
    <main className="relative pt-32">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <ProductDetail
        product={product}
        related={related}
        stripePublishableKey={stripePublishableKey}
        currency={currency}
      />
      {/* Customer reviews block — only renders when there are approved
          reviews for this product. The JSON-LD above also gates on the same
          aggregate so the rich result and the on-page UI agree. */}
      <div className="mx-auto max-w-5xl px-6">
        <ProductReviews
          reviews={productReviews}
          average={aggregate.average}
          count={aggregate.count}
        />
      </div>
    </main>
  );
}
