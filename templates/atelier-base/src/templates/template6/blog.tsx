import { T6Style, T6PageHeader, T6Blog, T6Cta } from "./sections";

/** template6 / blog — notes from the salon. */
export default function Template6Blog() {
  return (
    <>
      <T6Style />
      <main className="bg-[var(--t6-paper)]">
        <T6PageHeader
          section="page_blog"
          eyebrow="The journal"
          title="Notes from the salon."
          sub="Trends, care guides, and the thinking behind how we work. Honest words, no filler."
        />
        <T6Blog />
        <T6Cta />
      </main>
    </>
  );
}
