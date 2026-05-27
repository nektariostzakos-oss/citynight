import { Suspense } from "react";
import BookingFlow from "../../app/components/BookingFlow";
import { T5Style, T5PageHeader } from "./sections";

/** template5 / book — the booking flow in the Marigold theme. */
export default function Template5Book() {
  return (
    <>
      <T5Style />
      <main className="bg-[var(--t5-paper)] pb-24">
        <T5PageHeader
          section="page_book"
          eyebrow="Booking"
          title="Roll out your mat."
          sub="Pick a class and a time. Mats and props are waiting, and so are we."
        />
        <Suspense
          fallback={<div className="px-6 py-20 text-center text-[var(--t5-muted2)]">...</div>}
        >
          <BookingFlow />
        </Suspense>
      </main>
    </>
  );
}
