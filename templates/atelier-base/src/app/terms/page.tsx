import type { Metadata } from "next";
import { loadBusiness } from "../../lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const b = await loadBusiness();
  return {
    title: `Terms of service · ${b.name}`,
    description: `Terms of service for ${b.name}: booking and cancellation policy, shop orders, gift cards, and governing law.`,
    alternates: { canonical: "/terms" },
    robots: { index: true, follow: true },
  };
}

export const revalidate = 3600;

export default async function TermsPage() {
  const b = await loadBusiness();
  const brand = b.name || "our business";
  const rules = b.bookingRules;
  const cancel = rules?.cancellationWindowHours ?? 4;
  const noshow = rules?.noShowFeePercent ?? 50;
  const year = new Date().getFullYear();

  return (
    <main className="px-6 py-20">
      <article
        className="mx-auto max-w-3xl prose prose-invert prose-headings:font-serif prose-headings:text-[var(--foreground)] prose-p:text-[var(--muted)] prose-p:leading-[1.8] prose-a:text-[var(--gold)] prose-strong:text-[var(--foreground)]"
      >
        <p className="text-[10px] uppercase tracking-[0.4em]" style={{ color: "var(--gold)" }}>
          Legal
        </p>
        <h1>Terms of service</h1>
        <p className="text-sm" style={{ color: "var(--muted-2)" }}>
          Last updated: {year}-{String(new Date().getMonth() + 1).padStart(2, "0")}-{String(new Date().getDate()).padStart(2, "0")}
        </p>

        <p>By booking with or buying from <strong>{brand}</strong>, you agree to the following:</p>

        <h2>Bookings</h2>
        <ul>
          <li>Times shown are local to our timezone ({b.timezone || "Europe/Athens"}).</li>
          <li>
            You may cancel for free up to <strong>{cancel} hours</strong> before your
            appointment via the link in your confirmation email.
            {noshow > 0 ? <> Later cancellations or no-shows may be charged up to <strong>{noshow}%</strong> of the service price.</> : null}
          </li>
          <li>We do our best to run on time. If we run late, we&rsquo;ll tell you.</li>
          <li>First-time colour clients are required to complete a 48h patch test before service. There is no charge for it.</li>
        </ul>

        <h2>Shop orders</h2>
        <ul>
          <li>Prices shown include VAT (where applicable) and are charged in the currency shown at checkout.</li>
          <li>Digital gift cards are delivered by email and never expire. Physical items are shipped or collected in-store.</li>
          <li>Refunds: unused, unopened products within 14 days of receipt, under the UK Consumer Contracts Regulations (or the equivalent in your jurisdiction).</li>
        </ul>

        <h2>Gift cards</h2>
        <p>
          Gift cards are personal and cannot be exchanged for cash. The balance on a card
          decreases with each redemption. If the order that produced the card is
          refunded, the card is deactivated.
        </p>

        <h2>Liability</h2>
        <p>
          We&rsquo;re liable for the services we perform under reasonable care and skill.
          We are not responsible for results of services performed on hair previously
          treated chemically elsewhere without our knowledge. Please disclose any
          colour or treatment history at consultation.
        </p>

        <h2>Changes</h2>
        <p>
          We may update these terms occasionally. The version at the top of this page
          is the current one. Continued use of the site after an update means you
          accept the revised terms.
        </p>

        <h2>Governing law</h2>
        <p>
          These terms are governed by the laws of the country listed in our registered
          address. Disputes go to the courts of that jurisdiction.
        </p>

        <h2>Contact</h2>
        <p>
          {brand}
          {b.streetAddress ? <><br />{b.streetAddress}, {b.city} {b.postalCode}</> : null}
          {b.email ? <><br />Email: <a href={`mailto:${b.email}`}>{b.email}</a></> : null}
          {b.phone ? <><br />Phone: {b.phone}</> : null}
        </p>

        <hr />
        <p className="text-xs" style={{ color: "var(--muted-2)" }}>
          This page is a plain-language template. You are responsible for reviewing
          it with qualified legal counsel before go-live in your jurisdiction.
        </p>
      </article>
    </main>
  );
}
