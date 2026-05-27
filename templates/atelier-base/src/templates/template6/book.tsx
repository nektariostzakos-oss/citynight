import { Suspense } from "react";
import BookingFlow from "../../app/components/BookingFlow";
import { T6Style, T6PageHeader } from "./sections";

/** template6 / book — the booking flow in the Maison Loré theme. */
export default function Template6Book() {
  return (
    <>
      <T6Style />
      <main className="bg-[var(--t6-paper)] pb-24">
        <T6PageHeader
          section="page_book"
          eyebrow="Booking"
          title="A chair, kept for you."
          sub="Pick a service, a stylist, and a time. Your appointment is confirmed instantly."
        />
        <Suspense fallback={<div className="px-6 py-20 text-center text-[var(--t6-muted2)]">…</div>}>
          <BookingFlow />
        </Suspense>
      </main>
    </>
  );
}
