"use client";

import { useState } from "react";
import { withBasePath } from "../../lib/basePath";

type Props = {
  token: string;
  productName: string;
};

/**
 * Star-and-text form for the /shop/[slug]/review page. Renders a controlled
 * UI for rating + title + body + name and POSTs the result to /api/reviews.
 *
 * The endpoint re-verifies the token server-side, so this component only
 * needs to forward it untouched. State is local (no global store) — once the
 * submission succeeds we flip to a thank-you panel; we never read the new
 * review back from the API because moderation may not be instant.
 */
export default function ProductReviewForm({ token, productName }: Props) {
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !body.trim() || rating < 1) {
      setError("Please add a star rating, your name and a short review.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(withBasePath("/api/reviews"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          productReviewToken: token,
          name: name.trim(),
          rating,
          title: title.trim(),
          body: body.trim(),
        }),
      });
      if (!res.ok) {
        let msg = "Could not submit review.";
        try {
          const j = await res.json();
          if (j?.error) msg = j.error;
        } catch {
          /* ignore */
        }
        setError(msg);
        setSubmitting(false);
        return;
      }
      setDone(true);
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="mt-10 rounded-2xl border border-emerald-400/30 bg-emerald-400/[0.05] p-6">
        <h2 className="font-serif text-2xl text-emerald-300">
          Thanks for the review.
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          Your review of {productName} has been submitted and is awaiting
          moderation. You can close this page.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-10 space-y-6">
      {/* Star picker — five clickable stars with a hover preview. We keep
          rating in state instead of a numeric input so the touch target is
          big and the visual matches what's posted. */}
      <div>
        <label className="block text-[10px] uppercase tracking-widest text-white/65">
          Your rating
        </label>
        <div className="mt-2 flex gap-1 text-3xl text-[var(--gold)]">
          {[1, 2, 3, 4, 5].map((n) => {
            const active = (hover || rating) >= n;
            return (
              <button
                key={n}
                type="button"
                aria-label={`${n} star${n === 1 ? "" : "s"}`}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                onFocus={() => setHover(n)}
                onBlur={() => setHover(0)}
                onClick={() => setRating(n)}
                className={`transition-opacity ${
                  active ? "opacity-100" : "opacity-30 hover:opacity-60"
                }`}
              >
                ★
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label
          htmlFor="review-name"
          className="block text-[10px] uppercase tracking-widest text-white/65"
        >
          Your name (shown publicly)
        </label>
        <input
          id="review-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-[var(--gold)]/60"
          required
        />
      </div>

      <div>
        <label
          htmlFor="review-title"
          className="block text-[10px] uppercase tracking-widest text-white/65"
        >
          Headline (optional)
        </label>
        <input
          id="review-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-[var(--gold)]/60"
          placeholder="A short summary, e.g. 'Long-lasting and great scent'"
        />
      </div>

      <div>
        <label
          htmlFor="review-body"
          className="block text-[10px] uppercase tracking-widest text-white/65"
        >
          Your review
        </label>
        <textarea
          id="review-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={2000}
          rows={6}
          className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm leading-relaxed outline-none focus:border-[var(--gold)]/60"
          required
        />
      </div>

      {error && (
        <p className="rounded-lg border border-red-400/40 bg-red-400/[0.08] px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex items-center gap-2 rounded-full bg-[var(--gold)] px-7 py-3 text-sm font-medium text-[var(--background)] transition-all hover:bg-[var(--gold-bright)] disabled:opacity-50"
      >
        {submitting ? "Submitting…" : "Submit review"}
      </button>
    </form>
  );
}
