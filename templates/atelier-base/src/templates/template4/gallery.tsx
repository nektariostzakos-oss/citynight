import { T4Style, T4PageHeader, T4GalleryFull, T4Cta } from "./sections";

/** template4 / gallery — inside the clinic. */
export default function Template4Gallery() {
  return (
    <>
      <T4Style />
      <main className="bg-[var(--t4-bg)]">
        <T4PageHeader
          section="page_gallery"
          eyebrow="The clinic"
          title="Inside Lumea."
          sub="Purpose-built consultation and treatment rooms, held to medical-grade standards."
        />
        <T4GalleryFull />
        <T4Cta />
      </main>
    </>
  );
}
