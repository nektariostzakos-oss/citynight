"use client";

/**
 * template6 — upscale hair-salon front-end ("Maison Loré").
 *
 * Design DNA, deliberately unlike the other five skins: a fashion magazine
 * spread. Where template5 is a paper collage and template4 is a ruled
 * dossier, this is a magazine page. Cream paper, slate ink, champagne
 * gold and a dusty rose accent. Editorial mastheads above each section, a
 * thin hairline rule beneath, two-column body in some sections, full-bleed
 * photos with offset overlay cards, pull-quotes in Cormorant italic,
 * picture credits in small caps. Playfair Display headlines.
 */

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { useSection } from "@/lib/editorClient";
import EditPencil from "../../app/components/EditPencil";
import { T6_CSS } from "./theme";

export const U = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=1280&q=80&auto=format&fit=crop`;

export function T6Style() {
  return <style dangerouslySetInnerHTML={{ __html: T6_CSS }} />;
}

/* ── kit ─────────────────────────────────────────────────────────────── */

export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <div
      className={`t6-rise${className ? ` ${className}` : ""}`}
      style={{ animationDelay: `${delay}s` }}
    >
      {children}
    </div>
  );
}

/** A magazine masthead — issue number + section label, with hairline rules. */
export function Masthead({ left, right }: { left: string; right?: string }) {
  return (
    <div className="t6-caps flex items-center gap-4 text-[var(--t6-gold)]">
      <span className="h-px flex-1 bg-[var(--t6-border-strong)]" />
      <span>{left}</span>
      {right ? (
        <>
          <span className="text-[var(--t6-muted2)]">·</span>
          <span className="text-[var(--t6-muted)]">{right}</span>
        </>
      ) : null}
      <span className="h-px flex-1 bg-[var(--t6-border-strong)]" />
    </div>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <span className="t6-caps text-[var(--t6-gold)]">{children}</span>;
}

export function Frame({
  src,
  alt,
  className = "",
  ratio,
  style,
}: {
  src: string;
  alt: string;
  className?: string;
  ratio?: string;
  style?: CSSProperties;
}) {
  return (
    <figure
      className={`relative overflow-hidden bg-[var(--t6-mist)] ${className}`}
      style={{ aspectRatio: ratio, ...style }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} loading="lazy" className="h-full w-full object-cover" />
    </figure>
  );
}

/** A picture credit caption — small-caps under a photo. */
export function Credit({ children }: { children: ReactNode }) {
  return (
    <figcaption className="t6-caps mt-2 text-[var(--t6-muted2)]">{children}</figcaption>
  );
}

/** A numbered section block — running number + masthead label + content. */
function Spread({
  section,
  num,
  label,
  title,
  intro,
  children,
}: {
  section: string;
  num: string;
  label: string;
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <section className="relative border-t border-[var(--t6-border-strong)] bg-[var(--t6-paper)] px-6 py-24 lg:py-28">
      <EditPencil section={section} />
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <div className="flex items-baseline gap-5 text-[var(--t6-gold)]">
            <span className="font-serif text-2xl leading-none">{num}</span>
            <span className="t6-caps">{label}</span>
          </div>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 className="font-serif mt-6 max-w-3xl text-[2.2rem] leading-[1.05] tracking-tight text-[var(--t6-ink)] sm:text-5xl">
            {title}
          </h2>
        </Reveal>
        {intro ? (
          <Reveal delay={0.1}>
            <p className="mt-5 max-w-2xl leading-relaxed text-[var(--t6-muted)]">
              {intro}
            </p>
          </Reveal>
        ) : null}
        <div className="mt-12">{children}</div>
      </div>
    </section>
  );
}

/* ── inner-page header ───────────────────────────────────────────────── */

export function T6PageHeader({
  section,
  eyebrow,
  title,
  sub,
}: {
  section: string;
  eyebrow: string;
  title: string;
  sub?: string;
}) {
  const c = useSection(section, {
    eyebrow_en: eyebrow,
    title_en: title,
    sub_en: sub ?? "",
  });
  return (
    <header className="relative bg-[var(--t6-paper)] px-6 pt-36 pb-16 text-center sm:pt-44">
      <EditPencil section={section} />
      <div className="mx-auto max-w-3xl">
        <Reveal>
          <div className="flex justify-center">
            <Eyebrow>{c.eyebrow_en}</Eyebrow>
          </div>
        </Reveal>
        <Reveal delay={0.06}>
          <h1 className="font-serif mt-5 text-4xl leading-[1.04] tracking-tight text-[var(--t6-ink)] sm:text-6xl lg:text-7xl">
            {c.title_en}
          </h1>
        </Reveal>
        {c.sub_en ? (
          <Reveal delay={0.12}>
            <p className="mx-auto mt-5 max-w-xl leading-relaxed text-[var(--t6-muted)]">
              {c.sub_en}
            </p>
          </Reveal>
        ) : null}
      </div>
      <div className="t6-rule mt-14" />
    </header>
  );
}

/* ── default content (brand-neutral) ─────────────────────────────────── */

const D_SERVICES = [
  { name_en: "Cut & finish", desc_en: "A bespoke cut shaped to your hair and your life. Wash, cut, blow-dry.", duration: 60, price: 80, photo: U("1560066984-138dadb4c035") },
  { name_en: "Colour service", desc_en: "Single-process colour, root touch-up or full coverage. Salon-grade product only.", duration: 90, price: 120, photo: U("1522337360788-8b13dee7a37e") },
  { name_en: "Balayage", desc_en: "Hand-painted highlights for soft, sun-kissed dimension that grows out beautifully.", duration: 150, price: 180, photo: U("1487412947147-5cebf100ffc2") },
  { name_en: "Bridal styling", desc_en: "Trial and on-the-day styling for brides and the wedding party. Bookable months in advance.", duration: 120, price: 200, photo: U("1521033540898-ed0e0a4cd24a") },
  { name_en: "Treatments", desc_en: "Olaplex, glossing and deep-conditioning rituals for damaged or coloured hair.", duration: 45, price: 60, photo: U("1554519515-242161756769") },
  { name_en: "Consultation", desc_en: "A no-obligation consultation before any major change. Always free.", duration: 30, price: 0, photo: U("1559599101-f09722fb4948") },
];

const D_LOOKBOOK = [
  { label_en: "Soft balayage", photo: U("1487412947147-5cebf100ffc2") },
  { label_en: "Tonal blonde", photo: U("1522337360788-8b13dee7a37e") },
  { label_en: "Rich brunette", photo: U("1560066984-138dadb4c035") },
  { label_en: "Bridal updo", photo: U("1521033540898-ed0e0a4cd24a") },
  { label_en: "Lived-in colour", photo: U("1605497788044-5a32c7078486") },
  { label_en: "Sharp bob", photo: U("1554519515-242161756769") },
  { label_en: "Layered cut", photo: U("1492106087820-71f1a00d2b11") },
  { label_en: "Rose blonde", photo: U("1607779097040-26e80aa78e66") },
  { label_en: "Toned auburn", photo: U("1599206676335-193c82b13c9e") },
];

const SVC_SECTION = {
  eyebrow_en: "The menu",
  title_en: "A short, considered list. Honest prices.",
  text_en: "Every service is booked with the time it actually needs. We start with a consultation and tell you the price before anything begins.",
  items: D_SERVICES,
};

const LOOK_SECTION = {
  eyebrow_en: "The work",
  title_en: "From the chair, this season.",
  text_en: "Recent colour, cuts and bridal work. Real clients, real hair, real light.",
  items: D_LOOKBOOK,
};

/* ── hero (magazine cover) ───────────────────────────────────────────── */

export function T6Hero() {
  const c = useSection("t6_hero", {
    issue_en: "Issue 23 · Spring / Summer",
    eyebrow_en: "Hair salon",
    title_en: "Hair,",
    titleAccent_en: "edited.",
    sub_en: "An upscale full-service hair salon. Cut, colour, balayage and bridal styling, in a calm room by appointment.",
    primaryCta_en: "Book a chair",
    secondaryCta_en: "See our work",
    image: U("1605497788044-5a32c7078486"),
    cardLabel_en: "Featured stylist",
    cardValue_en: "Léa Moreau",
    cardCaption_en: "Senior Stylist · ten years at the chair",
  });
  return (
    <section className="relative bg-[var(--t6-paper)] pt-32 pb-0">
      <EditPencil section="t6_hero" />
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <Masthead left={c.issue_en} right={c.eyebrow_en} />
        </Reveal>
        <Reveal delay={0.06}>
          <h1 className="font-serif mt-10 text-[3.4rem] leading-[0.96] tracking-tight text-[var(--t6-ink)] sm:text-7xl lg:text-[7.5rem]">
            {c.title_en}{" "}
            <span className="t6-italic text-[var(--t6-gold)]">{c.titleAccent_en}</span>
          </h1>
        </Reveal>
        <div className="mt-10 grid items-end gap-8 border-t border-[var(--t6-border-strong)] pt-8 lg:grid-cols-12">
          <Reveal delay={0.1} className="lg:col-span-6">
            <p className="leading-relaxed text-[var(--t6-muted)]">{c.sub_en}</p>
          </Reveal>
          <Reveal delay={0.14} className="lg:col-span-5 lg:col-start-8">
            <div className="flex flex-wrap gap-3">
              <Link
                href="/book"
                className="rounded-full bg-[var(--t6-ink)] px-7 py-3.5 text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--t6-paper)] transition-transform duration-200 hover:scale-[1.03] active:scale-[0.98]"
              >
                {c.primaryCta_en}
              </Link>
              <Link
                href="/gallery"
                className="rounded-full border border-[var(--t6-border-strong)] px-7 py-3.5 text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--t6-ink)] transition-colors duration-200 hover:bg-[var(--t6-card)]"
              >
                {c.secondaryCta_en}
              </Link>
            </div>
          </Reveal>
        </div>
      </div>
      <Reveal delay={0.2} className="relative mt-16">
        <div className="relative aspect-[16/8] w-full overflow-hidden border-y border-[var(--t6-border-strong)] bg-[var(--t6-mist)] sm:aspect-[16/6]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={c.image} alt={c.title_en} className="h-full w-full object-cover" />
          <div className="absolute bottom-0 left-0 m-5 max-w-[18rem] border border-[var(--t6-border-strong)] bg-[var(--t6-card)] px-6 py-4 shadow-[0_24px_50px_-30px_rgba(32,36,42,0.5)]">
            <p className="t6-caps text-[var(--t6-gold)]">{c.cardLabel_en}</p>
            <p className="font-serif mt-1 text-lg text-[var(--t6-ink)]">{c.cardValue_en}</p>
            <p className="t6-italic mt-1 text-sm text-[var(--t6-muted)]">{c.cardCaption_en}</p>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ── in this issue (3 features band) ─────────────────────────────────── */

export function T6InThisIssue() {
  const c = useSection("t6_inthisissue", {
    items: [
      { eyebrow_en: "01 · The work", title_en: "From the chair, this season.", body_en: "Lived-in balayage, tonal blondes and a fresh take on the bob." },
      { eyebrow_en: "02 · The team", title_en: "Three chairs, three stylists.", body_en: "Small on purpose. By appointment only, never more than three clients at a time." },
      { eyebrow_en: "03 · The plan", title_en: "Consultation always first.", body_en: "No surprise. No upsell. We tell you the price before we touch your hair." },
    ],
  });
  const items =
    (c.items as Array<{ eyebrow_en: string; title_en: string; body_en: string }>) ?? [];
  return (
    <section className="relative bg-[var(--t6-mist)] px-6 py-20">
      <EditPencil section="t6_inthisissue" />
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <Masthead left="In this issue" />
        </Reveal>
        <div className="mt-10 grid gap-x-10 gap-y-12 sm:grid-cols-3">
          {items.map((it, i) => (
            <Reveal key={i} delay={(i % 3) * 0.08}>
              <div className="border-t border-[var(--t6-border-strong)] pt-5">
                <div className="t6-caps text-[var(--t6-gold)]">{it.eyebrow_en}</div>
                <h3 className="font-serif mt-3 text-2xl leading-tight text-[var(--t6-ink)]">
                  {it.title_en}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-[var(--t6-muted)]">
                  {it.body_en}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── services (the numbered menu) ────────────────────────────────────── */

/** The service menu, reused on the home + services pages. */
export function T6ServiceList() {
  const c = useSection("t6_services", SVC_SECTION);
  const items =
    (c.items as Array<{ name_en: string; desc_en: string; duration: number; price: number; photo: string }>) ??
    D_SERVICES;
  return (
    <div className="border-t border-[var(--t6-border-strong)]">
      {items.map((s, i) => (
        <Reveal key={i} delay={(i % 3) * 0.05}>
          <Link
            href="/book"
            className="group grid grid-cols-[auto_1fr_auto] items-center gap-6 border-b border-[var(--t6-border)] py-7 transition-colors duration-200 hover:bg-[var(--t6-card)] sm:gap-10 sm:px-3"
          >
            <span className="font-serif text-3xl text-[var(--t6-gold)]/40 transition-colors duration-200 group-hover:text-[var(--t6-gold)] sm:text-4xl">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0">
              <h3 className="font-serif text-xl leading-tight text-[var(--t6-ink)] sm:text-2xl">
                {s.name_en}
              </h3>
              <p className="mt-1 max-w-md text-sm leading-relaxed text-[var(--t6-muted)]">
                {s.desc_en}
              </p>
              <p className="t6-caps mt-2 text-[var(--t6-muted2)]">{s.duration} minutes</p>
            </div>
            <div className="text-right">
              <div className="font-serif text-xl text-[var(--t6-ink)] sm:text-2xl">
                {s.price === 0 ? "Free" : `£${s.price}`}
              </div>
              <span className="t6-caps mt-1 inline-block text-[var(--t6-gold)] opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                Book →
              </span>
            </div>
          </Link>
        </Reveal>
      ))}
    </div>
  );
}

export function T6Services() {
  const c = useSection("t6_services", SVC_SECTION);
  return (
    <Spread section="t6_services" num="01" label="The menu" title={c.title_en} intro={c.text_en}>
      <T6ServiceList />
    </Spread>
  );
}

/* ── lookbook (gallery) ──────────────────────────────────────────────── */

export function T6LookbookGrid({ items }: { items: Array<{ label_en: string; photo: string }> }) {
  return (
    <div className="grid gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((g, i) => (
        <Reveal key={i} delay={(i % 3) * 0.06}>
          <figure>
            <Frame src={g.photo} alt={g.label_en} ratio={i % 3 === 1 ? "3/4" : "4/5"} />
            <Credit>{g.label_en}</Credit>
          </figure>
        </Reveal>
      ))}
    </div>
  );
}

export function T6LookbookFull() {
  const c = useSection("t6_lookbook", LOOK_SECTION);
  const items = (c.items as Array<{ label_en: string; photo: string }>) ?? D_LOOKBOOK;
  return (
    <section className="relative bg-[var(--t6-paper)] px-6 py-24">
      <EditPencil section="t6_lookbook" />
      <div className="mx-auto max-w-6xl">
        <T6LookbookGrid items={items} />
      </div>
    </section>
  );
}

export function T6Lookbook() {
  const c = useSection("t6_lookbook", LOOK_SECTION);
  const items = (c.items as Array<{ label_en: string; photo: string }>) ?? D_LOOKBOOK;
  return (
    <Spread section="t6_lookbook" num="02" label="The work" title={c.title_en} intro={c.text_en}>
      <T6LookbookGrid items={items.slice(0, 6)} />
      <Reveal delay={0.1}>
        <Link
          href="/gallery"
          className="t6-caps mt-10 inline-block text-[var(--t6-gold)] hover:text-[var(--t6-gold-deep)]"
        >
          View the full lookbook →
        </Link>
      </Reveal>
    </Spread>
  );
}

/* ── stylists (contributors) ─────────────────────────────────────────── */

export function T6Stylists() {
  const c = useSection("t6_stylists", {
    eyebrow_en: "Contributors",
    title_en: "Three chairs, three stylists.",
    text_en: "Small on purpose. Every appointment is with the stylist you booked, every time.",
    items: [
      { name_en: "Léa Moreau", role_en: "Senior Stylist", specialty_en: "Cut · Colour", photo: U("1492106087820-71f1a00d2b11") },
      { name_en: "Hugo Dubois", role_en: "Colour Specialist", specialty_en: "Balayage", photo: U("1605497788044-5a32c7078486") },
      { name_en: "Sofia Rinaldi", role_en: "Bridal Stylist", specialty_en: "Updo · Trial", photo: U("1559599101-f09722fb4948") },
    ],
  });
  const items =
    (c.items as Array<{ name_en: string; role_en: string; specialty_en: string; photo: string }>) ?? [];
  return (
    <Spread section="t6_stylists" num="03" label="Contributors" title={c.title_en} intro={c.text_en}>
      <div className="grid gap-x-8 gap-y-10 sm:grid-cols-3">
        {items.map((p, i) => (
          <Reveal key={i} delay={(i % 3) * 0.07}>
            <figure>
              <Frame src={p.photo} alt={p.name_en} ratio="4/5" />
              <figcaption className="mt-4">
                <h3 className="font-serif text-xl text-[var(--t6-ink)]">{p.name_en}</h3>
                <p className="t6-caps mt-1 text-[var(--t6-gold)]">{p.role_en}</p>
                <p className="t6-italic mt-2 text-sm text-[var(--t6-muted)]">{p.specialty_en}</p>
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>
    </Spread>
  );
}

/* ── why us (4 columns) ──────────────────────────────────────────────── */

export function T6WhyUs() {
  const c = useSection("t6_whyus", {
    eyebrow_en: "The standards",
    title_en: "What stays the same on every visit.",
    items: [
      { title_en: "By appointment only", desc_en: "Never more than three clients in the salon at a time. Your hour is genuinely yours." },
      { title_en: "Salon-grade product", desc_en: "Davines, Olaplex, Wella Professionals. Only what we use ourselves." },
      { title_en: "Consultation first", desc_en: "Every visit starts with a chat. We will not touch your hair until we agree." },
      { title_en: "A quiet, light-filled room", desc_en: "A salon designed to feel like a private studio. Espresso on arrival." },
    ],
  });
  const items = (c.items as Array<{ title_en: string; desc_en: string }>) ?? [];
  return (
    <Spread section="t6_whyus" num="04" label="The standards" title={c.title_en}>
      <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((w, i) => (
          <Reveal key={i} delay={(i % 4) * 0.05}>
            <div className="border-t border-[var(--t6-border-strong)] pt-5">
              <h3 className="font-serif text-lg text-[var(--t6-ink)]">{w.title_en}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--t6-muted)]">{w.desc_en}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </Spread>
  );
}

/* ── testimonial (full-bleed pull-quote) ─────────────────────────────── */

export function T6Testimonial() {
  const c = useSection("t6_testimonial", {
    quote_en: "Léa understood exactly what I wanted from the first conversation. I walked out feeling like the best version of me — not someone trying to look like a magazine cover.",
    name_en: "Camille R.",
    detail_en: "Colour & cut",
  });
  return (
    <section className="relative border-y border-[var(--t6-border-strong)] bg-[var(--t6-mist)] px-6 py-28 text-center">
      <EditPencil section="t6_testimonial" />
      <div className="mx-auto max-w-3xl">
        <Reveal>
          <Masthead left="A note from a guest" />
        </Reveal>
        <Reveal delay={0.08}>
          <blockquote className="t6-italic mt-8 text-2xl leading-[1.3] text-[var(--t6-ink)] sm:text-3xl lg:text-4xl">
            &ldquo;{c.quote_en}&rdquo;
          </blockquote>
        </Reveal>
        <Reveal delay={0.16}>
          <figcaption className="t6-caps mt-8 text-[var(--t6-muted2)]">
            <span className="text-[var(--t6-ink)]">{c.name_en}</span>
            <span> · {c.detail_en}</span>
          </figcaption>
        </Reveal>
      </div>
    </section>
  );
}

/* ── closing CTA ─────────────────────────────────────────────────────── */

export function T6Cta() {
  const c = useSection("t6_cta", {
    eyebrow_en: "Book now",
    title_en: "A chair, and an hour, kept for you.",
    sub_en: "Real-time availability, instant confirmation, and a small reminder the morning of.",
    cta_en: "Book your appointment",
  });
  return (
    <section className="relative bg-[var(--t6-ink)] px-6 py-24 text-center lg:py-28">
      <EditPencil section="t6_cta" />
      <div className="mx-auto max-w-3xl">
        <Reveal>
          <p className="t6-caps text-[var(--t6-gold)]">{c.eyebrow_en}</p>
        </Reveal>
        <Reveal delay={0.06}>
          <h2 className="font-serif mt-5 text-4xl leading-[1.05] text-[var(--t6-paper)] sm:text-5xl lg:text-6xl">
            {c.title_en}
          </h2>
        </Reveal>
        <Reveal delay={0.12}>
          <p className="mx-auto mt-5 max-w-lg leading-relaxed text-[var(--t6-ink-soft)]">
            {c.sub_en}
          </p>
        </Reveal>
        <Reveal delay={0.18}>
          <Link
            href="/book"
            className="mt-9 inline-block rounded-full bg-[var(--t6-gold)] px-9 py-4 text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--t6-ink)] transition-transform duration-200 hover:scale-[1.03] active:scale-[0.98]"
          >
            {c.cta_en}
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

/* ── about page sections ─────────────────────────────────────────────── */

export function T6AboutStory() {
  const c = useSection("t6_about_story", {
    title_en: "A salon built on a quieter idea.",
    p1_en: "Maison Loré opened with one rule: no rushing. Every appointment gets the time it actually needs, every consultation is genuine, and every client leaves looking like themselves.",
    p2_en: "Years later, that has not changed. We are still small on purpose. Three chairs, three stylists working at once, and a steady stream of guests who became regulars and never left.",
    image: U("1521033540898-ed0e0a4cd24a"),
  });
  return (
    <section className="relative border-t border-[var(--t6-border-strong)] bg-[var(--t6-paper)] px-6 py-24">
      <EditPencil section="t6_about_story" />
      <div className="mx-auto grid max-w-6xl items-center gap-x-14 gap-y-12 lg:grid-cols-12">
        <Reveal className="lg:col-span-5">
          <Frame src={c.image} alt={c.title_en} ratio="4/5" />
        </Reveal>
        <div className="lg:col-span-6 lg:col-start-7">
          <Reveal>
            <Masthead left="Editor's letter" />
          </Reveal>
          <Reveal delay={0.06}>
            <h2 className="font-serif mt-6 text-3xl leading-tight text-[var(--t6-ink)] sm:text-4xl">
              {c.title_en}
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-6 leading-relaxed text-[var(--t6-muted)]">{c.p1_en}</p>
          </Reveal>
          <Reveal delay={0.14}>
            <p className="mt-4 leading-relaxed text-[var(--t6-muted)]">{c.p2_en}</p>
          </Reveal>
          <Reveal delay={0.18}>
            <p className="t6-italic mt-6 text-lg text-[var(--t6-gold)]">— The team</p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

export function T6AboutValues() {
  const c = useSection("t6_about_values", {
    eyebrow_en: "What we hold to",
    title_en: "Three things, never bent.",
    items: [
      { title_en: "Patient", desc_en: "We will not rush a colour, a consultation or a goodbye coffee." },
      { title_en: "Salon-grade", desc_en: "Only the products we use ourselves. No house-brand fillers." },
      { title_en: "Honest", desc_en: "If a look will not suit you, we will say so before the foils go on." },
    ],
  });
  const items = (c.items as Array<{ title_en: string; desc_en: string }>) ?? [];
  return (
    <Spread section="t6_about_values" num="—" label={c.eyebrow_en} title={c.title_en}>
      <div className="grid gap-x-10 gap-y-10 sm:grid-cols-3">
        {items.map((v, i) => (
          <Reveal key={i} delay={i * 0.07}>
            <div className="border-t border-[var(--t6-border-strong)] pt-5">
              <h3 className="font-serif text-xl text-[var(--t6-ink)]">{v.title_en}</h3>
              <p className="mt-3 text-sm leading-relaxed text-[var(--t6-muted)]">{v.desc_en}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </Spread>
  );
}

/* ── shop page ───────────────────────────────────────────────────────── */

export function T6Shop() {
  const c = useSection("t6_shop", {
    items: [
      { name_en: "Davines daily duo", desc_en: "The shampoo and conditioner pair we use at the wash basin every day.", price: 38, photo: U("1604881988758-f76ad2f7aac1") },
      { name_en: "Olaplex No.3", desc_en: "Take-home strengthening treatment for colour-treated and chemically-stressed hair.", price: 32, photo: U("1591343395082-e120087004b4") },
      { name_en: "Colour-safe shampoo", desc_en: "Wella Professionals colour-safe shampoo. The one that won't fade your tones.", price: 28, photo: U("1633933358116-a27b902fad35") },
      { name_en: "Boar-bristle brush", desc_en: "The brush we reach for at the chair. Distributes natural oils, smooths shine.", price: 44, photo: U("1515377905703-c4788e51af15") },
      { name_en: "Glossing serum", desc_en: "A finishing serum for shine and smoothness without weight. Three drops, that is all.", price: 35, photo: U("1610631066894-62452ccb927c") },
      { name_en: "Gift card", desc_en: "A Maison Loré gift card, redeemable on any service or product.", price: 75, photo: U("1542848284-8afa78a08ccb") },
    ],
  });
  const items =
    (c.items as Array<{ name_en: string; desc_en: string; price: number; photo: string }>) ?? [];
  return (
    <section className="relative bg-[var(--t6-paper)] px-6 py-24">
      <EditPencil section="t6_shop" />
      <div className="mx-auto grid max-w-6xl gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((p, i) => (
          <Reveal key={i} delay={(i % 3) * 0.06}>
            <article className="group">
              <Frame src={p.photo} alt={p.name_en} ratio="4/5" className="transition-transform duration-300 group-hover:-translate-y-1" />
              <h2 className="font-serif mt-5 text-lg text-[var(--t6-ink)]">{p.name_en}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--t6-muted)]">{p.desc_en}</p>
              <div className="mt-3 flex items-baseline justify-between gap-4 border-t border-[var(--t6-border)] pt-3">
                <span className="font-serif text-base text-[var(--t6-ink)]">£{p.price}</span>
                <Link href="/cart" className="t6-caps text-[var(--t6-gold)] hover:text-[var(--t6-gold-deep)]">
                  Add to bag →
                </Link>
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ── blog page ───────────────────────────────────────────────────────── */

export function T6Blog() {
  const c = useSection("t6_blog", {
    items: [
      { cat_en: "Trends", date_en: "May 2026", title_en: "The quiet balayage looks defining this season", excerpt_en: "Soft, sun-kissed and grown-out by design. The shapes our regulars are asking for right now.", photo: U("1487412947147-5cebf100ffc2") },
      { cat_en: "Care", date_en: "April 2026", title_en: "How to maintain salon colour at home", excerpt_en: "The right shampoo, the right water temperature, and the bottle we never travel without.", photo: U("1591343395082-e120087004b4") },
      { cat_en: "The salon", date_en: "March 2026", title_en: "Why every visit starts with a consultation", excerpt_en: "A few quiet minutes before any colour or cut. The single biggest reason guests come back.", photo: U("1559599101-f09722fb4948") },
    ],
  });
  const posts =
    (c.items as Array<{ cat_en: string; date_en: string; title_en: string; excerpt_en: string; photo: string }>) ??
    [];
  return (
    <section className="relative bg-[var(--t6-paper)] px-6 py-24">
      <EditPencil section="t6_blog" />
      <div className="mx-auto max-w-6xl border-t border-[var(--t6-border-strong)]">
        {posts.map((p, i) => (
          <Reveal key={i} delay={(i % 3) * 0.07}>
            <article className="group grid grid-cols-[auto_1fr_auto] items-center gap-6 border-b border-[var(--t6-border)] py-7 sm:gap-10">
              <span className="font-serif text-3xl text-[var(--t6-gold)]/40 sm:text-4xl">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0">
                <div className="t6-caps flex items-center gap-2 text-[var(--t6-gold)]">
                  {p.cat_en}
                  <span className="text-[var(--t6-muted2)]">· {p.date_en}</span>
                </div>
                <h2 className="font-serif mt-2 text-xl leading-snug text-[var(--t6-ink)] sm:text-2xl">
                  {p.title_en}
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--t6-muted)]">
                  {p.excerpt_en}
                </p>
              </div>
              <Frame src={p.photo} alt={p.title_en} className="hidden h-24 w-32 sm:block" />
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ── contact page ────────────────────────────────────────────────────── */

export function T6Contact() {
  const c = useSection("t6_contact", {
    details: [
      { label_en: "Salon", value_en: "Your salon address" },
      { label_en: "Phone", value_en: "+44 20 0000 0000" },
      { label_en: "Email", value_en: "hello@yoursalon.example" },
      { label_en: "Instagram", value_en: "@yoursalon" },
    ],
    hours: [
      { label_en: "Tuesday", value_en: "10:00 – 19:00" },
      { label_en: "Wednesday", value_en: "10:00 – 19:00" },
      { label_en: "Thursday", value_en: "10:00 – 21:00" },
      { label_en: "Friday", value_en: "10:00 – 21:00" },
      { label_en: "Saturday", value_en: "09:00 – 17:00" },
      { label_en: "Sunday", value_en: "Closed" },
      { label_en: "Monday", value_en: "Closed" },
    ],
  });
  const details = (c.details as Array<{ label_en: string; value_en: string }>) ?? [];
  const hours = (c.hours as Array<{ label_en: string; value_en: string }>) ?? [];
  return (
    <section className="relative bg-[var(--t6-paper)] px-6 py-24">
      <EditPencil section="t6_contact" />
      <div className="mx-auto grid max-w-5xl gap-x-14 gap-y-12 lg:grid-cols-2">
        <Reveal>
          <Masthead left="The salon" />
          <dl className="mt-6">
            {details.map((d, i) => (
              <div key={i} className="flex items-baseline justify-between gap-6 border-t border-[var(--t6-border)] py-4">
                <dt className="t6-caps text-[var(--t6-gold)]">{d.label_en}</dt>
                <dd className="text-right text-[var(--t6-ink)]">{d.value_en}</dd>
              </div>
            ))}
          </dl>
          <Link
            href="/book"
            className="mt-8 inline-block rounded-full bg-[var(--t6-ink)] px-8 py-3.5 text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--t6-paper)] transition-transform duration-200 hover:scale-[1.03]"
          >
            Book a chair
          </Link>
        </Reveal>
        <Reveal delay={0.08}>
          <Masthead left="Opening hours" />
          <ul className="mt-6">
            {hours.map((h, i) => (
              <li key={i} className="flex items-center justify-between border-t border-[var(--t6-border)] py-3.5 text-sm">
                <span className="text-[var(--t6-muted)]">{h.label_en}</span>
                <span className="text-[var(--t6-ink)]">{h.value_en}</span>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
