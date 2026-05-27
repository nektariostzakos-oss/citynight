import EditPencil from "../../app/components/EditPencil";
import { T4Style, T4PageHeader, T4TreatmentList, T4Cta } from "./sections";

/** template4 / services — the full clinic treatment menu. */
export default function Template4Services() {
  return (
    <>
      <T4Style />
      <main className="bg-[var(--t4-bg)]">
        <T4PageHeader
          section="page_services"
          eyebrow="Treatments"
          title="Every treatment, explained."
          sub="A focused, medical-grade menu. Every price starts from, and is confirmed at consultation before anything begins."
        />
        <section className="relative px-6 py-24">
          <EditPencil section="t4_treatments" />
          <T4TreatmentList />
        </section>
        <T4Cta />
      </main>
    </>
  );
}
