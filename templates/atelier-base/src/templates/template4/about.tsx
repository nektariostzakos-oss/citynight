import { T4Style, T4PageHeader, T4AboutStory, T4AboutValues, T4Cta } from "./sections";

/** template4 / about — the clinic story and standards. */
export default function Template4About() {
  return (
    <>
      <T4Style />
      <main className="bg-[var(--t4-bg)]">
        <T4PageHeader
          section="page_team"
          eyebrow="About"
          title="A doctor-led clinic."
          sub="Honest aesthetic medicine, founded on a quieter idea of what good results look like."
        />
        <T4AboutStory />
        <T4AboutValues />
        <T4Cta />
      </main>
    </>
  );
}
