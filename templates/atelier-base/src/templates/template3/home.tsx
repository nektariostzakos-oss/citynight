import {
  T3Style,
  T3Hero,
  T3Stats,
  T3Services,
  T3Ritual,
  T3Gallery,
  T3Therapist,
  T3WhyUs,
  T3Testimonial,
  T3BookingCta,
} from "./sections";

/**
 * template3 / home — the Aurelia day spa homepage.
 *
 * <T3Style/> re-declares the Sage & Stone theme and forces the Cormorant +
 * Geist pairing, so the shared Nav, Footer and chrome adopt the calm day-spa
 * look. The section order is the template's own: an editorial centered hero, a
 * stat band, the numbered treatment menu, the visit ritual, a masonry gallery,
 * the therapist, the difference, one featured testimonial, a full-bleed CTA.
 */
export default function Template3Home() {
  return (
    <>
      <T3Style />
      <main className="relative bg-[var(--t3-bg)]">
        <T3Hero />
        <T3Stats />
        <T3Services />
        <T3Ritual />
        <T3Gallery />
        <T3Therapist />
        <T3WhyUs />
        <T3Testimonial />
        <T3BookingCta />
      </main>
    </>
  );
}
