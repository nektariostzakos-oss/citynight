import { T5Style, T5PageHeader, T5GalleryFull, T5Cta } from "./sections";

/** template5 / gallery — inside the studio. */
export default function Template5Gallery() {
  return (
    <>
      <T5Style />
      <main className="bg-[var(--t5-paper)]">
        <T5PageHeader
          section="page_gallery"
          eyebrow="The studio"
          title="A look inside the room."
          sub="No mirrors, no competition, no perfect bodies on the wall. Just warm light, good props and plenty of space to breathe."
        />
        <T5GalleryFull />
        <T5Cta />
      </main>
    </>
  );
}
