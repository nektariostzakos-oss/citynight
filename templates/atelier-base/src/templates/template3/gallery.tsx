import { T3Style, T3PageHeader, T3GalleryFull, T3BookingCta } from "./sections";

/** template3 / gallery — a masonry look inside the spa. */
export default function Template3Gallery() {
  return (
    <>
      <T3Style />
      <main className="bg-[var(--t3-bg)]">
        <T3PageHeader
          section="page_gallery"
          eyebrow="The space"
          title="A look inside Aurelia."
          sub="The treatment rooms, the lounge and the quiet corners that make an hour here feel like a proper escape."
        />
        <T3GalleryFull />
        <T3BookingCta />
      </main>
    </>
  );
}
