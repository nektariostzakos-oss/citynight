import {
  T4Style,
  T4Hero,
  T4Stats,
  T4Treatments,
  T4Process,
  T4Gallery,
  T4Practitioner,
  T4WhyUs,
  T4Faq,
  T4Testimonial,
  T4Cta,
} from "./sections";

/**
 * template4 / home — the Lumea Aesthetics clinic homepage.
 *
 * <T4Style/> re-declares the Clinic theme and forces the Manrope + Geist
 * pairing, so the shared Nav, Footer and chrome adopt the clinical-luxe look.
 */
export default function Template4Home() {
  return (
    <>
      <T4Style />
      <main className="relative bg-[var(--t4-bg)]">
        <T4Hero />
        <T4Stats />
        <T4Treatments />
        <T4Process />
        <T4Gallery />
        <T4Practitioner />
        <T4WhyUs />
        <T4Faq />
        <T4Testimonial />
        <T4Cta />
      </main>
    </>
  );
}
