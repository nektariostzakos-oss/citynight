import EditPencil from "../../app/components/EditPencil";
import { T3Style, T3PageHeader, T3ServiceList, T3BookingCta } from "./sections";

/** template3 / services — the day spa treatment menu as a numbered list. */
export default function Template3Services() {
  return (
    <>
      <T3Style />
      <main className="bg-[var(--t3-bg)]">
        <T3PageHeader
          section="page_services"
          eyebrow="The treatments"
          title="Every treatment, considered."
          sub="A short menu, each treatment booked with the time it genuinely needs. Prices are honest and final, with no surprise at the till."
        />
        <section className="relative px-6 pb-24">
          <EditPencil section="t3_services" />
          <T3ServiceList />
        </section>
        <T3BookingCta />
      </main>
    </>
  );
}
