import { T6Style, T6PageHeader, T6Shop, T6Cta } from "./sections";

/** template6 / shop — take-home products. */
export default function Template6Shop() {
  return (
    <>
      <T6Style />
      <main className="bg-[var(--t6-paper)]">
        <T6PageHeader
          section="page_shop"
          eyebrow="The shelves"
          title="Take the salon home."
          sub="The same shampoos, conditioners and finishing products we use at the chair, so the look holds between visits."
        />
        <T6Shop />
        <T6Cta />
      </main>
    </>
  );
}
