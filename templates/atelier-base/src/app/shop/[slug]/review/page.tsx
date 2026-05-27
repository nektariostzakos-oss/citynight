import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { findProduct } from "../../../../lib/products";
import { loadBusiness } from "../../../../lib/settings";
import { verifyProductReviewToken } from "../../../../lib/productReviewToken";
import { hasReviewForOrderProduct } from "../../../../lib/reviews";
import ProductReviewForm from "../../../components/ProductReviewForm";

export const metadata: Metadata = {
  title: "Rate your purchase",
  // The review form is reached only via a one-off signed link in the
  // "rate your purchase" email. It carries customer-identifying tokens, so
  // search engines and link-previewers should not index or cache it.
  robots: { index: false, follow: false, nocache: true },
};

type Params = Promise<{ slug: string }>;
type SP = Promise<{ t?: string }>;

/**
 * /shop/[slug]/review?t=<token>
 *
 * Token-gated form for leaving a product review. The token covers an
 * (orderId, productId, customerEmail) triple. Without a valid token the page
 * shows a "link expired or invalid" state — the same code path that handles
 * tampered tokens, so it gives no information about which check failed.
 *
 * On submit, the form POSTs to /api/reviews with productReviewToken in the
 * body; the API re-verifies and writes a pending review for the moderator.
 */
export default async function ProductReviewPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SP;
}) {
  const { slug } = await params;
  const { t } = await searchParams;
  const product = await findProduct(slug);
  if (!product) notFound();
  const business = await loadBusiness();

  // Verify the token. Any failure (missing / malformed / expired / tampered)
  // collapses into a single "invalid link" path so the page can't be used to
  // probe the token shape.
  const payload = t ? await verifyProductReviewToken(t) : null;
  const tokenOk =
    !!payload &&
    payload.productId === product.id;

  // Already left a review for this (orderId, productId)? Show a thank-you
  // state instead of a fresh form so the customer doesn't accidentally
  // double-submit by reopening the email.
  const already =
    tokenOk && payload
      ? await hasReviewForOrderProduct(payload.orderId, payload.productId)
      : false;

  return (
    <main className="relative pt-32 pb-24">
      <div className="mx-auto max-w-xl px-5">
        <Link
          href={`/shop/${product.slug}`}
          className="text-[10px] uppercase tracking-widest text-white/50 hover:text-[var(--gold)]"
        >
          ← {product.name_en}
        </Link>

        <h1 className="mt-6 font-serif text-4xl leading-tight sm:text-5xl">
          {tokenOk
            ? `Rate your purchase`
            : `This link can't be used`}
        </h1>

        {!tokenOk && (
          <>
            <p className="mt-4 text-[var(--muted)]">
              The link in your email has expired or already been used. If you
              bought {product.name_en} from {business.name || "us"} and would
              like to leave a review, just reply to your order confirmation
              email and we'll send a fresh link.
            </p>
            <Link
              href={`/shop/${product.slug}`}
              className="mt-8 inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] px-6 py-3 text-sm font-medium text-[var(--foreground)] transition-all hover:border-[var(--gold)] hover:bg-[var(--gold)]/[0.06] hover:text-[var(--gold)]"
            >
              Back to {product.name_en}
            </Link>
          </>
        )}

        {tokenOk && already && (
          <>
            <p className="mt-4 text-[var(--muted)]">
              Thanks — you've already reviewed this product. Your review will
              appear publicly once {business.name || "we"} approve it.
            </p>
            <Link
              href={`/shop/${product.slug}`}
              className="mt-8 inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] px-6 py-3 text-sm font-medium text-[var(--foreground)] transition-all hover:border-[var(--gold)] hover:bg-[var(--gold)]/[0.06] hover:text-[var(--gold)]"
            >
              Back to {product.name_en}
            </Link>
          </>
        )}

        {tokenOk && !already && t && (
          <>
            <p className="mt-4 text-[var(--muted)]">
              Your honest opinion helps other customers and us. Reviews are
              posted publicly after a quick check by{" "}
              {business.name || "the store"}.
            </p>
            <ProductReviewForm
              token={t}
              productName={product.name_en}
            />
          </>
        )}
      </div>
    </main>
  );
}
