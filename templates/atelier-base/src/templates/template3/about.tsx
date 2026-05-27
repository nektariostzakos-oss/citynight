import { T3Style, T3PageHeader, T3AboutStory, T3AboutValues, T3BookingCta } from "./sections";

/** template3 / about — the spa story and what it stands for. */
export default function Template3About() {
  return (
    <>
      <T3Style />
      <main className="bg-[var(--t3-bg)]">
        <T3PageHeader
          section="page_team"
          eyebrow="Our story"
          title="A calm spa, run with care."
          sub="No conveyor belt, no upsell. Just considered treatments in a quiet room."
        />
        <T3AboutStory />
        <T3AboutValues />
        <T3BookingCta />
      </main>
    </>
  );
}
