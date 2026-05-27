import { T4Style, T4PageHeader, T4Shop, T4Cta } from "./sections";

/** template4 / shop — the clinic's medical-grade skincare. */
export default function Template4Shop() {
  return (
    <>
      <T4Style />
      <main className="bg-[var(--t4-bg)]">
        <T4PageHeader
          section="page_shop"
          eyebrow="Skincare"
          title="Medical-grade skincare."
          sub="The products we trust between treatments, chosen for results, not packaging."
        />
        <T4Shop />
        <T4Cta />
      </main>
    </>
  );
}
