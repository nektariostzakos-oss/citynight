import {
  T6Style,
  T6Hero,
  T6InThisIssue,
  T6Services,
  T6Lookbook,
  T6Stylists,
  T6WhyUs,
  T6Testimonial,
  T6Cta,
} from "./sections";

/**
 * template6 / home — the Maison Loré hair-salon homepage.
 *
 * <T6Style/> re-declares the Maison Loré theme and forces the Playfair +
 * Inter pairing, so the shared Nav, Footer and chrome adopt the magazine
 * look. The order below is the magazine flow: cover, in-this-issue, the
 * menu, the work, contributors, the standards, a guest quote, the closing
 * CTA.
 */
export default function Template6Home() {
  return (
    <>
      <T6Style />
      <main className="relative bg-[var(--t6-paper)]">
        <T6Hero />
        <T6InThisIssue />
        <T6Services />
        <T6Lookbook />
        <T6Stylists />
        <T6WhyUs />
        <T6Testimonial />
        <T6Cta />
      </main>
    </>
  );
}
