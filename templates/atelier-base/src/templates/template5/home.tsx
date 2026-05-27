import {
  T5Style,
  T5Hero,
  T5Marquee,
  T5Stats,
  T5Classes,
  T5Schedule,
  T5Gallery,
  T5Teacher,
  T5WhyUs,
  T5Faq,
  T5Testimonial,
  T5Cta,
} from "./sections";

/**
 * template5 / home — the Marigold yoga-studio homepage.
 *
 * <T5Style/> re-declares the Marigold theme and forces the Bricolage + Geist
 * pairing, so the shared Nav, Footer and chrome adopt the warm collage look.
 */
export default function Template5Home() {
  return (
    <>
      <T5Style />
      <main className="relative bg-[var(--t5-paper)]">
        <T5Hero />
        <T5Marquee />
        <T5Stats />
        <T5Classes />
        <T5Schedule />
        <T5Gallery />
        <T5Teacher />
        <T5WhyUs />
        <T5Faq />
        <T5Testimonial />
        <T5Cta />
      </main>
    </>
  );
}
