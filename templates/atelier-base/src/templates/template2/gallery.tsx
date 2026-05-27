import { T2Style, T2PageHeader, T2GalleryFull, T2BookingCta } from "./sections";

/** template2 / gallery — a wall of recent nail work. */
export default function Template2Gallery() {
  return (
    <>
      <T2Style />
      <main className="bg-[var(--t2-bg)]">
        <T2PageHeader
          section="page_gallery"
          eyebrow="The work"
          title="A gallery of recent sets."
          sub="Real nails, real clients. A look at the shapes, finishes and hand-painted detail that leave the studio each week."
        />
        <T2GalleryFull />
        <T2BookingCta />
      </main>
    </>
  );
}
