import { T5Style, T5PageHeader, T5AboutStory, T5AboutValues, T5Cta } from "./sections";

/** template5 / about — the studio story and what it holds to. */
export default function Template5About() {
  return (
    <>
      <T5Style />
      <main className="bg-[var(--t5-paper)]">
        <T5PageHeader
          section="page_team"
          eyebrow="About"
          title="A warm welcome for everyone."
          sub="An unintimidating studio, founded on a quieter idea of what a yoga class should feel like."
        />
        <T5AboutStory />
        <T5AboutValues />
        <T5Cta />
      </main>
    </>
  );
}
