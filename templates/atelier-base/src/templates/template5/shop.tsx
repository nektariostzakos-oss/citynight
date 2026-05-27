import { T5Style, T5PageHeader, T5Shop, T5Cta } from "./sections";

/** template5 / shop — mats, props and studio bits. */
export default function Template5Shop() {
  return (
    <>
      <T5Style />
      <main className="bg-[var(--t5-paper)]">
        <T5PageHeader
          section="page_shop"
          eyebrow="The shop"
          title="Mats, props and studio bits."
          sub="The kit we actually use and trust on the studio floor, chosen to last for years of practice."
        />
        <T5Shop />
        <T5Cta />
      </main>
    </>
  );
}
