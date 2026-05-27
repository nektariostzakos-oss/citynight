import EditPencil from "../../app/components/EditPencil";
import { T6Style, T6PageHeader, T6ServiceList, T6Cta } from "./sections";

/** template6 / services — the full salon menu. */
export default function Template6Services() {
  return (
    <>
      <T6Style />
      <main className="bg-[var(--t6-paper)]">
        <T6PageHeader
          section="page_services"
          eyebrow="The menu"
          title="Every service, explained."
          sub="A short, considered list. Honest prices. Every appointment starts with a consultation, so you know what to expect before we begin."
        />
        <section className="relative px-6 py-20">
          <EditPencil section="t6_services" />
          <div className="mx-auto max-w-6xl">
            <T6ServiceList />
          </div>
        </section>
        <T6Cta />
      </main>
    </>
  );
}
