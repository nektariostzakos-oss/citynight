import { T2Style, T2PageHeader, T2Shop, T2BookingCta } from "./sections";

/** template2 / shop — the nail-care product range. */
export default function Template2Shop() {
  return (
    <>
      <T2Style />
      <main className="bg-[var(--t2-bg)]">
        <T2PageHeader
          section="page_shop"
          eyebrow="The shop"
          title="Take the studio home."
          sub="The same products we reach for at the desk, so your nails keep looking cared-for between appointments."
        />
        <T2Shop />
        <T2BookingCta />
      </main>
    </>
  );
}
