import { T2Style, T2PageHeader, T2Contact, T2BookingCta } from "./sections";

/** template2 / contact — studio details and opening hours. */
export default function Template2Contact() {
  return (
    <>
      <T2Style />
      <main className="bg-[var(--t2-bg)]">
        <T2PageHeader
          section="page_contact"
          eyebrow="Visit us"
          title="Come and say hello."
          sub="Find the studio, check the hours, or drop us a line. We answer messages the same day."
        />
        <T2Contact />
        <T2BookingCta />
      </main>
    </>
  );
}
