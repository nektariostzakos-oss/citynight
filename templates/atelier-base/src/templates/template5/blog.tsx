import { T5Style, T5PageHeader, T5Blog, T5Cta } from "./sections";

/** template5 / blog — notes from the studio. */
export default function Template5Blog() {
  return (
    <>
      <T5Style />
      <main className="bg-[var(--t5-paper)]">
        <T5PageHeader
          section="page_blog"
          eyebrow="The journal"
          title="Notes from the studio."
          sub="Gentle guides to starting, practising and sticking with yoga, written by the people who teach it."
        />
        <T5Blog />
        <T5Cta />
      </main>
    </>
  );
}
