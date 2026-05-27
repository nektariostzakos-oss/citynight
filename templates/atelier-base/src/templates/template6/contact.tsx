import { T6Style, T6PageHeader, T6Contact, T6Cta } from "./sections";

/** template6 / contact — salon details and opening hours. */
export default function Template6Contact() {
  return (
    <>
      <T6Style />
      <main className="bg-[var(--t6-paper)]">
        <T6PageHeader
          section="page_contact"
          eyebrow="Visit us"
          title="Find the salon."
          sub="Address, opening hours and the quickest way to get in touch. We reply within the same day."
        />
        <T6Contact />
        <T6Cta />
      </main>
    </>
  );
}
