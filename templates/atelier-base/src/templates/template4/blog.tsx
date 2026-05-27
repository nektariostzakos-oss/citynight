import { T4Style, T4PageHeader, T4Blog, T4Cta } from "./sections";

/** template4 / blog — honest notes from the clinic. */
export default function Template4Blog() {
  return (
    <>
      <T4Style />
      <main className="bg-[var(--t4-bg)]">
        <T4PageHeader
          section="page_blog"
          eyebrow="The journal"
          title="Notes from the clinic."
          sub="Honest guides to treatments, skin and aesthetic medicine."
        />
        <T4Blog />
        <T4Cta />
      </main>
    </>
  );
}
