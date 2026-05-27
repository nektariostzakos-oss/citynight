import { T4Style, T4PageHeader, T4Contact, T4Cta } from "./sections";

/** template4 / contact — clinic details and opening hours. */
export default function Template4Contact() {
  return (
    <>
      <T4Style />
      <main className="bg-[var(--t4-bg)]">
        <T4PageHeader
          section="page_contact"
          eyebrow="Visit us"
          title="Come in for a consultation."
          sub="Find the clinic, check the hours, or send a message. We reply the same day."
        />
        <T4Contact />
        <T4Cta />
      </main>
    </>
  );
}
