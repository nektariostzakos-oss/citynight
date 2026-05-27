import { T2Style, T2PageHeader, T2AboutStory, T2AboutValues, T2BookingCta } from "./sections";

/** template2 / about — the studio story and how it works. */
export default function Template2About() {
  return (
    <>
      <T2Style />
      <main className="bg-[var(--t2-bg)]">
        <T2PageHeader
          section="page_team"
          eyebrow="Our story"
          title="A small studio, run with care."
          sub="No conveyor belt, no upsell. Just considered nails in a calm room."
        />
        <T2AboutStory />
        <T2AboutValues />
        <T2BookingCta />
      </main>
    </>
  );
}
