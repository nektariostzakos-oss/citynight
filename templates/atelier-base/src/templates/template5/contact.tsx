import { T5Style, T5PageHeader, T5Contact, T5Cta } from "./sections";

/** template5 / contact — studio details and opening hours. */
export default function Template5Contact() {
  return (
    <>
      <T5Style />
      <main className="bg-[var(--t5-paper)]">
        <T5PageHeader
          section="page_contact"
          eyebrow="Visit us"
          title="Come and say hello."
          sub="Find the studio, check the timetable, or send a message. We reply the same day."
        />
        <T5Contact />
        <T5Cta />
      </main>
    </>
  );
}
