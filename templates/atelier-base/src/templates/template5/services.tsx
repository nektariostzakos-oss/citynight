import EditPencil from "../../app/components/EditPencil";
import { T5Style, T5PageHeader, T5ClassList, T5Cta } from "./sections";

/** template5 / services — the full class timetable. */
export default function Template5Services() {
  return (
    <>
      <T5Style />
      <main className="bg-[var(--t5-paper)]">
        <T5PageHeader
          section="page_services"
          eyebrow="The timetable"
          title="Every class, explained."
          sub="Six honest styles, capped to a warm and comfortable size. Mats and props are provided, so turn up with nothing but yourself."
        />
        <section className="relative bg-[var(--t5-card)] px-6 py-24">
          <EditPencil section="t5_classes" />
          <div className="mx-auto max-w-6xl">
            <T5ClassList />
          </div>
        </section>
        <T5Cta />
      </main>
    </>
  );
}
