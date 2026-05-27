import { Suspense } from "react";
import BookingFlow from "../../app/components/BookingFlow";
import { T2Style, T2PageHeader } from "./sections";

/** template2 / book — the booking flow in the nail-studio theme. */
export default function Template2Book() {
  return (
    <>
      <T2Style />
      <main className="bg-[var(--t2-bg)] pb-24">
        <T2PageHeader
          section="page_book"
          eyebrow="Booking"
          title="Reserve your appointment."
          sub="Choose a treatment and a time that suits you. Your confirmation lands straight away."
        />
        <Suspense
          fallback={<div className="px-6 py-20 text-center text-[var(--t2-muted2)]">…</div>}
        >
          <BookingFlow />
        </Suspense>
      </main>
    </>
  );
}
