import { Suspense } from "react";
import BookingFlow from "../../app/components/BookingFlow";
import { T3Style, T3PageHeader } from "./sections";

/** template3 / book — the booking flow in the day spa theme. */
export default function Template3Book() {
  return (
    <>
      <T3Style />
      <main className="bg-[var(--t3-bg)] pb-24">
        <T3PageHeader
          section="page_book"
          eyebrow="Booking"
          title="Reserve your treatment."
          sub="Choose a treatment and a time that suits you. Your confirmation lands straight away."
        />
        <Suspense
          fallback={<div className="px-6 py-20 text-center text-[var(--t3-muted2)]">…</div>}
        >
          <BookingFlow />
        </Suspense>
      </main>
    </>
  );
}
