import { T3Style, T3PageHeader, T3Shop, T3BookingCta } from "./sections";

/** template3 / shop — the spa's botanical range, arch-framed. */
export default function Template3Shop() {
  return (
    <>
      <T3Style />
      <main className="bg-[var(--t3-bg)]">
        <T3PageHeader
          section="page_shop"
          eyebrow="The shop"
          title="Take the calm home."
          sub="The same botanical products we reach for in the treatment room, so the spa feeling lasts between visits."
        />
        <T3Shop />
        <T3BookingCta />
      </main>
    </>
  );
}
