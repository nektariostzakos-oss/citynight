import { T6Style, T6PageHeader, T6LookbookFull, T6Cta } from "./sections";

/** template6 / gallery — the lookbook. */
export default function Template6Gallery() {
  return (
    <>
      <T6Style />
      <main className="bg-[var(--t6-paper)]">
        <T6PageHeader
          section="page_gallery"
          eyebrow="The work"
          title="From the chair."
          sub="Recent colour, cuts and bridal work. Real clients, real hair, real light."
        />
        <T6LookbookFull />
        <T6Cta />
      </main>
    </>
  );
}
