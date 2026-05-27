"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useLang } from "../../lib/i18n";
import { langPick } from "../../lib/langs";
import { useSection } from "../../lib/editorClient";
import { useBranding } from "../../lib/brandingClient";
import { useBusiness } from "../../lib/businessClient";
import { withBasePath, tenantRelativePath } from "../../lib/basePath";
import EditPencil from "./EditPencil";
import InstallAppButton from "./InstallAppButton";

const DAY_LABELS: Record<string, { en: string; el: string }> = {
  mon: { en: "Mon", el: "Δευ" },
  tue: { en: "Tue", el: "Τρι" },
  wed: { en: "Wed", el: "Τετ" },
  thu: { en: "Thu", el: "Πεμ" },
  fri: { en: "Fri", el: "Παρ" },
  sat: { en: "Sat", el: "Σαβ" },
  sun: { en: "Sun", el: "Κυρ" },
};

export default function Footer() {
  // Tenant-relative so the admin/setup hide check matches across SSR/client.
  const pathname = tenantRelativePath(usePathname());
  const { t, lang } = useLang();
  const { branding } = useBranding();
  const { business } = useBusiness();
  const footerTagline =
    lang === "el" ? branding.tagline_el : branding.tagline_en;
  const dayLabel = (d: string) =>
    lang === "el" ? DAY_LABELS[d]?.el ?? d : DAY_LABELS[d]?.en ?? d;
  const hoursLines = compactHours(business.hours, dayLabel);
  const f = useSection("footer", {
    lede_en: t("footer.lede"),
    lede_el: t("footer.lede"),
    cta_en: t("footer.cta"),
    cta_el: t("footer.cta"),
    copy_en: t("footer.copy"),
    copy_el: t("footer.copy"),
    tagline_en: t("sharp_since"),
    tagline_el: t("sharp_since"),
  });
  const pick = (en: string, el: string) => (lang === "el" ? el || en : en);
  // Footer "Established {year}" line. The {founded} placeholder is filled from
  // the business's founded year (set in the setup wizard); with no year set
  // the line is simply hidden so a fresh tenant shows nothing wrong.
  const taglineTpl = pick(f.tagline_en, f.tagline_el);
  const foundedYear = (business.foundedYear || "").trim();
  const taglineText = taglineTpl.includes("{founded}")
    ? (foundedYear ? taglineTpl.replace(/\{founded\}/g, foundedYear) : "")
    : taglineTpl;
  if (pathname.startsWith("/admin") || pathname.startsWith("/setup")) return null;

  const cols = [
    {
      title: t("footer.shop"),
      items: [
        { label: t("nav.services"), href: "/services" },
        { label: t("nav.gallery"), href: "/gallery" },
        { label: t("nav.team"), href: "/about" },
        { label: t("nav.book"), href: "/book" },
      ],
    },
    {
      title: t("footer.visit"),
      items: [
        business.streetAddress && { label: business.streetAddress, href: mapHref(business) },
        business.city && {
          label: `${business.city}${business.postalCode ? " " + business.postalCode : ""}`,
          href: mapHref(business),
        },
        ...hoursLines.map((line) => ({ label: line, href: "", static: true })),
      ].filter(Boolean) as { label: string; href: string; static?: boolean }[],
    },
    {
      title: t("footer.contact"),
      items: [
        business.phone && {
          label: business.phone,
          href: `tel:${business.phone.replace(/\s+/g, "")}`,
        },
        business.email && { label: business.email, href: `mailto:${business.email}` },
        business.social.instagram && { label: "Instagram", href: business.social.instagram, external: true },
        business.social.facebook && { label: "Facebook", href: business.social.facebook, external: true },
        business.social.whatsapp && { label: "WhatsApp", href: business.social.whatsapp, external: true },
        business.social.tiktok && { label: "TikTok", href: business.social.tiktok, external: true },
      ].filter(Boolean) as { label: string; href: string; external?: boolean }[],
    },
  ];

  return (
    <footer
      className="relative mt-32 border-t px-6 py-20"
      style={{
        borderColor: "var(--border)",
        background: "var(--background)",
      }}
    >
      <EditPencil section="footer" />
      <div className="mx-auto grid max-w-7xl gap-16 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <Link href="/" className="flex items-center gap-2.5">
            {branding.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={withBasePath(branding.logoUrl)}
                alt={branding.wordmark || "Logo"}
                width={192}
                height={48}
                loading="lazy"
                decoding="async"
                className="h-12 w-auto object-contain"
              />
            ) : (
              <div className="leading-none">
                <span
                  className="block font-serif text-2xl font-semibold tracking-wider"
                  style={{ color: "var(--foreground)" }}
                >
                  {branding.wordmark || "YOUR SALON"}
                </span>
                {footerTagline && (
                  <span
                    className="block text-[10px] uppercase tracking-[0.3em]"
                    style={{ color: "var(--gold)" }}
                  >
                    {footerTagline}
                  </span>
                )}
              </div>
            )}
          </Link>
          <p
            className="mt-5 max-w-sm text-sm leading-relaxed"
            style={{ color: "var(--muted)" }}
          >
            {pick(f.lede_en, f.lede_el)}
          </p>

          <Link
            href="/book"
            className="mt-12 inline-block group"
            aria-label={t("nav.book")}
          >
            <motion.h3
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="font-serif text-5xl font-semibold tracking-tight transition-all duration-300 sm:text-6xl"
              style={{ color: "var(--gold)" }}
            >
              {pick(f.cta_en, f.cta_el)}{" "}
              <span className="inline-block transition-transform duration-300 group-hover:translate-x-2">
                →
              </span>
            </motion.h3>
          </Link>
        </div>

        {cols.map((col) => (
          <div key={col.title}>
            <h3
              className="mb-5 text-xs font-normal uppercase tracking-widest"
              style={{ color: "var(--gold)" }}
            >
              {col.title}
            </h3>
            <ul className="space-y-3">
              {col.items.map((it) => {
                const item = it as { label: string; href: string; external?: boolean; static?: boolean };
                if (item.static || !item.href) {
                  return (
                    <li key={item.label}>
                      <span className="text-sm" style={{ color: "var(--muted)" }}>
                        {item.label}
                      </span>
                    </li>
                  );
                }
                const external = item.external || /^https?:/.test(item.href);
                return (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      target={external ? "_blank" : undefined}
                      rel={external ? "noopener noreferrer" : undefined}
                      className="text-sm transition-colors"
                      style={{ color: "var(--muted)" }}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <div
        className="mx-auto mt-20 flex max-w-7xl flex-col items-center justify-between gap-3 border-t pt-6 text-xs sm:flex-row"
        style={{
          borderColor: "var(--border)",
          color: "var(--muted-2)",
        }}
      >
        <p>
          {pick(f.copy_en, f.copy_el)
            .replace(/\{year\}/g, String(new Date().getFullYear()))
            .replace(/\{business\}/g, business.name || "")
            .replace(/©\s*\d{4}/, `© ${new Date().getFullYear()}`)}
          {" · "}
          <Link href="/privacy" className="hover:underline">
            {langPick({ en: "Privacy", el: "Απόρρητο", de: "Datenschutz", fr: "Confidentialité", it: "Privacy", es: "Privacidad", nl: "Privacy", pl: "Prywatność", pt: "Privacidade", sv: "Integritet", sq: "Privatësia" }, lang)}
          </Link>
          {" · "}
          <Link href="/terms" className="hover:underline">
            {langPick({ en: "Terms", el: "Όροι", de: "AGB", fr: "Conditions", it: "Termini", es: "Términos", nl: "Voorwaarden", pl: "Regulamin", pt: "Termos", sv: "Villkor", sq: "Kushtet" }, lang)}
          </Link>
        </p>
        <p>
          {langPick({ en: "Designed by ", el: "Σχεδιασμός ", de: "Gestaltet von ", fr: "Conçu par ", it: "Progettato da ", es: "Diseñado por ", nl: "Ontworpen door ", pl: "Zaprojektowane przez ", pt: "Concebido por ", sv: "Designad av ", sq: "Krijuar nga " }, lang)}
          <a
            href="https://mindscrollers.com"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors"
            style={{ color: "var(--gold)" }}
          >
            Mindscrollers LLC
          </a>
        </p>
        {taglineText && <p>{taglineText}</p>}
        <div>
          <InstallAppButton className="text-xs uppercase tracking-widest text-[var(--gold)] transition-opacity hover:opacity-70" />
        </div>
      </div>
    </footer>
  );
}

type Hours = {
  day: string;
  open: string;
  close: string;
  closed: boolean;
  open2?: string;
  close2?: string;
};

function compactHours(hours: Hours[], dayLabel: (d: string) => string): string[] {
  const groups: { days: string[]; range: string }[] = [];
  for (const h of hours) {
    const key = h.closed
      ? "closed"
      : h.open2 && h.close2
        ? `${h.open}–${h.close}, ${h.open2}–${h.close2}`
        : `${h.open}–${h.close}`;
    const last = groups[groups.length - 1];
    if (last && last.range === key) last.days.push(h.day);
    else groups.push({ days: [h.day], range: key });
  }
  return groups.map((g) => {
    const label =
      g.days.length === 1
        ? dayLabel(g.days[0])
        : `${dayLabel(g.days[0])}–${dayLabel(g.days[g.days.length - 1])}`;
    return g.range === "closed" ? `${label} · Closed` : `${label} · ${g.range}`;
  });
}

function mapHref(b: { latitude: number | null; longitude: number | null; streetAddress: string; city: string }): string {
  if (b.latitude && b.longitude) {
    return `https://www.google.com/maps/search/?api=1&query=${b.latitude},${b.longitude}`;
  }
  const q = encodeURIComponent(`${b.streetAddress}, ${b.city}`);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}
