import { T3Style, T3PageHeader, T3Blog, T3BookingCta } from "./sections";

/** template3 / blog — a featured note above a quiet, ruled list. */
export default function Template3Blog() {
  return (
    <>
      <T3Style />
      <main className="bg-[var(--t3-bg)]">
        <T3PageHeader
          section="page_blog"
          eyebrow="The journal"
          title="Notes from the spa."
          sub="Wellness notes, seasonal rituals, and the thinking behind how we work."
        />
        <T3Blog />
        <T3BookingCta />
      </main>
    </>
  );
}
