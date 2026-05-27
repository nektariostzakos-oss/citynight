import { T2Style, T2PageHeader, T2Blog, T2BookingCta } from "./sections";

/** template2 / blog — nail-care notes from the studio. */
export default function Template2Blog() {
  return (
    <>
      <T2Style />
      <main className="bg-[var(--t2-bg)]">
        <T2PageHeader
          section="page_blog"
          eyebrow="The journal"
          title="Notes from the studio."
          sub="Care tips, seasonal looks, and the thinking behind how we work."
        />
        <T2Blog />
        <T2BookingCta />
      </main>
    </>
  );
}
