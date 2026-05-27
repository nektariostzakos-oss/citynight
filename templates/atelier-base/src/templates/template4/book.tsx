import { Suspense } from "react";
import BookingFlow from "../../app/components/BookingFlow";
import { T4Style, T4PageHeader } from "./sections";

/** template4 / book — the booking flow in the clinic theme. */
export default function Template4Book() {
  return (
    <>
      <T4Style />
      <main className="bg-[var(--t4-bg)] pb-24">
        <T4PageHeader
          section="page_book"
          eyebrow="Booking"
          title="Book a consultation."
          sub="Choose a treatment and a time. Every visit starts with a proper assessment."
        />
        <Suspense
          fallback={<div className="px-6 py-20 text-center text-[var(--t4-muted2)]">…</div>}
        >
          <BookingFlow />
        </Suspense>
      </main>
    </>
  );
}
