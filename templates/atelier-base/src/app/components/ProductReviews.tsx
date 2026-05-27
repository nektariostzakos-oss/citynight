import type { Review } from "../../lib/reviews";

type Props = {
  reviews: Review[];
  average: number;
  count: number;
};

/**
 * Approved product reviews block, rendered under the product description on
 * /shop/[slug]. Server component: no client state, no interactivity. Hidden
 * entirely when there are zero approved reviews — empty rating signals are
 * worse than no signal at all (search engines penalize "0 reviews" stubs).
 */
export default function ProductReviews({ reviews, average, count }: Props) {
  if (count === 0) return null;

  return (
    <section
      aria-labelledby="product-reviews-heading"
      className="mt-16 border-t border-white/10 pt-12"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h2
          id="product-reviews-heading"
          className="font-serif text-3xl tracking-tight"
        >
          Customer reviews
        </h2>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-2xl leading-none text-[var(--gold)]">
            {"★".repeat(Math.round(average))}
            <span className="text-white/20">
              {"★".repeat(5 - Math.round(average))}
            </span>
          </span>
          <span className="text-[var(--muted)]">
            {average.toFixed(1)} · {count} review{count === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      <ul className="mt-8 space-y-6">
        {reviews.slice(0, 10).map((r) => (
          <li
            key={r.id}
            className="rounded-2xl border border-white/10 bg-white/[0.02] p-5"
          >
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[var(--gold)]">
                {"★".repeat(r.rating)}
                <span className="text-white/20">
                  {"★".repeat(5 - r.rating)}
                </span>
              </span>
              <span className="font-medium text-[var(--foreground)]">
                {r.name}
              </span>
              <span className="text-xs text-white/50">
                · {new Date(r.createdAt).toLocaleDateString()}
              </span>
            </div>
            {r.title && (
              <p className="mt-2 font-serif text-lg text-[var(--foreground)]">
                {r.title}
              </p>
            )}
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-[var(--muted)]">
              {r.body}
            </p>
          </li>
        ))}
      </ul>
      {reviews.length > 10 && (
        <p className="mt-4 text-xs text-white/50">
          Showing the 10 most recent of {count}.
        </p>
      )}
    </section>
  );
}
