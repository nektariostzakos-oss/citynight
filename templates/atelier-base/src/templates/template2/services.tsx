import EditPencil from "../../app/components/EditPencil";
import { T2Style, T2PageHeader, T2ServiceCards, T2BookingCta } from "./sections";

/** template2 / services — the full nail-salon treatment menu. */
export default function Template2Services() {
  return (
    <>
      <T2Style />
      <main className="bg-[var(--t2-bg)]">
        <T2PageHeader
          section="page_services"
          eyebrow="The services"
          title="Every treatment, considered."
          sub="A short menu, each treatment booked with the time it genuinely needs. Prices are honest and final, with no surprise at the till."
        />
        <section className="relative px-6 pb-24">
          <EditPencil section="t2_services" />
          <T2ServiceCards />
        </section>
        <T2BookingCta />
      </main>
    </>
  );
}
