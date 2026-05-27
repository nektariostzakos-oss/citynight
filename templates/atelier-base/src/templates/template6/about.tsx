import { T6Style, T6PageHeader, T6AboutStory, T6AboutValues, T6Cta } from "./sections";

/** template6 / about — the editor's letter + standards. */
export default function Template6About() {
  return (
    <>
      <T6Style />
      <main className="bg-[var(--t6-paper)]">
        <T6PageHeader
          section="page_team"
          eyebrow="About"
          title="The salon, and the team."
          sub="A small, light-filled salon by appointment. Three chairs, three stylists, one quiet idea about how a haircut should feel."
        />
        <T6AboutStory />
        <T6AboutValues />
        <T6Cta />
      </main>
    </>
  );
}
