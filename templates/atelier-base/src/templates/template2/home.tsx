import {
  T2Style,
  T2Hero,
  T2Marquee,
  T2Services,
  T2Gallery,
  T2Artist,
  T2WhyUs,
  T2Testimonials,
  T2BookingCta,
} from "./sections";

/**
 * template2 / home — the nail-artist salon homepage.
 *
 * <T2Style/> re-declares the theme custom properties (Porcelain & Rose) and
 * forces the Fraunces + Geist pairing, so the shared Nav, Footer and chrome
 * adopt the light nail-studio look alongside these sections.
 */
export default function Template2Home() {
  return (
    <>
      <T2Style />
      <main className="relative bg-[var(--t2-bg)]">
        <T2Hero />
        <T2Marquee />
        <T2Services />
        <T2Gallery />
        <T2Artist />
        <T2WhyUs />
        <T2Testimonials />
        <T2BookingCta />
      </main>
    </>
  );
}
