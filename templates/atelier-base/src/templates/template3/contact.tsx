import { T3Style, T3PageHeader, T3Contact, T3BookingCta } from "./sections";

/** template3 / contact — spa details and opening hours, ruled and quiet. */
export default function Template3Contact() {
  return (
    <>
      <T3Style />
      <main className="bg-[var(--t3-bg)]">
        <T3PageHeader
          section="page_contact"
          eyebrow="Visit us"
          title="Come and breathe out."
          sub="Find the spa, check the hours, or drop us a line. We answer messages the same day."
        />
        <T3Contact />
        <T3BookingCta />
      </main>
    </>
  );
}
