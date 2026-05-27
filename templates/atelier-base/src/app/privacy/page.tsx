import type { Metadata } from "next";
import { loadBusiness } from "../../lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const b = await loadBusiness();
  return {
    title: `Privacy policy · ${b.name}`,
    description: `How ${b.name} collects, uses, and protects your personal data. Includes your rights under GDPR, UK GDPR, and CCPA.`,
    alternates: { canonical: "/privacy" },
    robots: { index: true, follow: true },
  };
}

export const revalidate = 3600;

export default async function PrivacyPage() {
  const b = await loadBusiness();
  const brand = b.name || "our business";
  const contact = b.email || "our contact page";
  const address = [b.streetAddress, b.city, b.postalCode, b.country].filter(Boolean).join(", ");
  const year = new Date().getFullYear();

  return (
    <main className="px-6 py-20">
      <article
        className="mx-auto max-w-3xl prose prose-invert prose-headings:font-serif prose-headings:text-[var(--foreground)] prose-p:text-[var(--muted)] prose-p:leading-[1.8] prose-a:text-[var(--gold)] prose-strong:text-[var(--foreground)]"
        style={{ color: "var(--foreground)" }}
      >
        <p className="text-[10px] uppercase tracking-[0.4em]" style={{ color: "var(--gold)" }}>
          Legal
        </p>
        <h1>Privacy policy</h1>
        <p className="text-sm" style={{ color: "var(--muted-2)" }}>
          Last updated: {year}-{String(new Date().getMonth() + 1).padStart(2, "0")}-{String(new Date().getDate()).padStart(2, "0")}
        </p>

        <p>
          <strong>{brand}</strong>{address ? ` (${address})` : ""} respects your privacy.
          This page explains what personal information we collect, why we collect it,
          and what rights you have.
        </p>

        <h2>What we collect</h2>
        <ul>
          <li><strong>Booking details:</strong> your name, phone number, email (optional), and any notes you add. Used solely to confirm your appointment and send reminders.</li>
          <li><strong>Order details:</strong> when you buy from our shop, we keep your name, phone, email and delivery address for fulfilment and receipts.</li>
          <li><strong>Analytics (opt-in):</strong> anonymised usage data via Google Analytics / Meta Pixel, only after you consent via the cookie banner.</li>
          <li><strong>Cookies:</strong> a small language-preference cookie and a session cookie when you sign in as admin. No third-party tracking cookies unless you opt in.</li>
        </ul>

        <h2>What we don't collect</h2>
        <p>We never ask for card numbers on this site. Payments (when enabled) are handled by Stripe. We only receive a confirmation that a payment happened, not your card details.</p>

        <h2>Who we share it with</h2>
        <ul>
          <li><strong>Email provider</strong> (to deliver confirmations/reminders).</li>
          <li><strong>Stripe</strong> (if you pay by card).</li>
          <li><strong>No one else.</strong> We do not sell or rent your information.</li>
        </ul>

        <h2>How long we keep it</h2>
        <p>Booking and order records are kept for up to 3 years for accounting purposes. Email contents in our outbound log are kept for up to 30 days. You can request deletion at any time.</p>

        <h2>Your rights (GDPR / UK GDPR / CCPA)</h2>
        <ul>
          <li>Access a copy of what we hold on you.</li>
          <li>Correct anything that&rsquo;s wrong.</li>
          <li>Delete your data (&ldquo;right to be forgotten&rdquo;).</li>
          <li>Object to direct marketing.</li>
          <li>Withdraw analytics consent at any time by clearing your cookies.</li>
        </ul>
        <p>
          Email <a href={`mailto:${b.email}`}>{contact}</a> with the word
          &ldquo;Privacy&rdquo; in the subject to exercise any of these rights.
          We reply within 30 days.
        </p>

        <h2>Complaints</h2>
        <p>
          You can also complain to your local data protection authority. In the UK
          this is the ICO (ico.org.uk); in the EU, the authority in your country.
        </p>

        <h2>Contact</h2>
        <p>
          {brand}
          {address ? <><br />{address}</> : null}
          {b.phone ? <><br />Phone: {b.phone}</> : null}
          {b.email ? <><br />Email: <a href={`mailto:${b.email}`}>{b.email}</a></> : null}
        </p>

        <hr />
        <p className="text-xs" style={{ color: "var(--muted-2)" }}>
          This page is a plain-language template. You are responsible for
          reviewing it with qualified legal counsel before go-live in your
          jurisdiction.
        </p>
      </article>
    </main>
  );
}
