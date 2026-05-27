"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function BookError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[book:error]", error.message, error.digest);
  }, [error]);

  return (
    <main className="flex min-h-[60vh] items-center justify-center px-6 py-24">
      <div className="mx-auto max-w-md text-center">
        <p className="text-[10px] uppercase tracking-[0.4em]" style={{ color: "var(--gold)" }}>
          Booking
        </p>
        <h1 className="mt-3 font-serif text-3xl sm:text-4xl" style={{ color: "var(--foreground)" }}>
          Couldn&rsquo;t load the booking page.
        </h1>
        <p className="mt-4 text-sm" style={{ color: "var(--muted)" }}>
          The calendar service may be temporarily unavailable. You can try again, or reach us directly.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => reset()}
            className="inline-flex items-center rounded-full px-5 py-2.5 text-xs font-semibold uppercase tracking-widest"
            style={{ background: "var(--gold)", color: "var(--background)" }}
          >
            Try again
          </button>
          <Link
            href="/contact"
            className="inline-flex items-center rounded-full border px-5 py-2.5 text-xs font-semibold uppercase tracking-widest"
            style={{ borderColor: "var(--border-strong)", color: "var(--foreground)" }}
          >
            Contact us
          </Link>
        </div>
      </div>
    </main>
  );
}
