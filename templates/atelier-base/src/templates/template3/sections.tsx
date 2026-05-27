"use client";

/**
 * template3 — day spa front-end ("Aurelia"), fully editable.
 *
 * Every section reads its copy + imagery through useSection() so the inline
 * editor (the gold "Edit" pencil, admin-only) can rewrite it, exactly like the
 * salon template. The hardcoded values below are the defaults a fresh install
 * renders until an owner edits — the design itself (the arch motif, the
 * centered editorial layout, Cormorant + Geist) is unchanged.
 */

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { useSection } from "@/lib/editorClient";
import EditPencil from "../../app/components/EditPencil";
import { T3_CSS } from "./theme";

/** Unsplash photo URL (free commercial licence). */
export const U = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=1280&q=80&auto=format&fit=crop`;

/** The arch motif: a spa-window curve, on every "arch" image frame. */
const ARCH: CSSProperties = {
  borderRadius: "47% 47% 1.25rem 1.25rem / 34% 34% 1.25rem 1.25rem",
};

/** Injects the Sage & Stone theme. Render once per page. */
export function T3Style() {
  return <style dangerouslySetInnerHTML={{ __html: T3_CSS }} />;
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
      className={`t3-rise${className ? ` ${className}` : ""}`}
      style={{ animationDelay: `${delay}s` }}
    >
      {children}
    </div>
  );
}

function Leaf({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M20 4C9 4 4 10 4 20c10 0 16-5 16-16Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M8 16c2.5-3 5-5 9-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--t3-sage)]">
      <Leaf />
      {children}
    </span>
  );
}

export function Arch({ src, alt, className = "" }: { src: string; alt: string; className?: string }) {
  return (
    <div className={`relative overflow-hidden ${className}`} style={ARCH}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} loading="lazy" className="h-full w-full object-cover" />
    </div>
  );
}

export function Frame({
  src,
  alt,
  className = "",
  radius = "1.25rem",
}: {
  src: string;
  alt: string;
  className?: string;
  radius?: string;
}) {
  return (
    <div className={`relative overflow-hidden ${className}`} style={{ borderRadius: radius }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} loading="lazy" className="h-full w-full object-cover" />
    </div>
  );
}

function SectionHead({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: string;
  text?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <Reveal>
        <div className="flex justify-center">
          <Eyebrow>{eyebrow}</Eyebrow>
        </div>
      </Reveal>
      <Reveal delay={0.05}>
        <h2 className="font-serif mt-5 text-4xl leading-[1.1] text-[var(--t3-ink)] sm:text-5xl">
          {title}
        </h2>
      </Reveal>
      {text ? (
        <Reveal delay={0.1}>
          <p className="mt-4 leading-relaxed text-[var(--t3-muted)]">{text}</p>
        </Reveal>
      ) : null}
    </div>
  );
}

/**
 * Inner-page header — editable. `section` is the content key (page_services,
 * page_team, ...); the eyebrow/title/sub props are the defaults.
 */
export function T3PageHeader({
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
    <header className="relative bg-[var(--t3-bg)] px-6 pt-36 pb-14 text-center sm:pt-44">
      <EditPencil section={section} />
      <div className="mx-auto max-w-3xl">
        <Reveal className="flex justify-center">
          <span className="block h-9 w-[4.5rem] rounded-t-full border-x border-t border-[var(--t3-sage)]/45" />
        </Reveal>
        <Reveal delay={0.05} className="mt-6 flex justify-center">
          <Eyebrow>{c.eyebrow_en}</Eyebrow>
        </Reveal>
        <Reveal delay={0.1}>
          <h1 className="font-serif mt-5 text-4xl leading-[1.06] text-[var(--t3-ink)] sm:text-5xl lg:text-6xl">
            {c.title_en}
          </h1>
        </Reveal>
        {c.sub_en ? (
          <Reveal delay={0.15}>
            <p className="mx-auto mt-4 max-w-xl leading-relaxed text-[var(--t3-muted)]">
              {c.sub_en}
            </p>
          </Reveal>
        ) : null}
      </div>
    </header>
  );
}

/* ── default content ─────────────────────────────────────────────────── */

const D_SERVICES = [
  { name_en: "Signature massage", desc_en: "A full-body release, with pressure tuned exactly to you.", mins: 60, price: 75, photo: U("1544161515-4ab6ce6db874") },
  { name_en: "Deep tissue therapy", desc_en: "Focused work for knots, tension and tired, overworked muscles.", mins: 60, price: 85, photo: U("1600334089648-b0d9d3028eb2") },
  { name_en: "Aromatherapy facial", desc_en: "A deep cleanse and botanical mask for calm, clear skin.", mins: 60, price: 70, photo: U("1570172619644-dfd03ed5d881") },
  { name_en: "Hot stone ritual", desc_en: "Warm basalt stones melt tension from the very first minute.", mins: 75, price: 95, photo: U("1512290923902-8a9f81dc236c") },
  { name_en: "Body scrub & wrap", desc_en: "Exfoliation and a nourishing wrap that leaves skin glowing.", mins: 75, price: 80, photo: U("1596178065887-1198b6148b2b") },
  { name_en: "Couples retreat", desc_en: "Two therapists, one quiet room, ninety unhurried minutes.", mins: 90, price: 180, photo: U("1600334129128-685c5582fd35") },
];

const D_GALLERY = [
  { label_en: "The treatment room", photo: U("1519823551278-64ac92734fb1") },
  { label_en: "Relaxation lounge", photo: U("1556228578-8c89e6adf883") },
  { label_en: "Sauna & steam", photo: U("1532926381893-7542290edf1d") },
  { label_en: "Botanical bar", photo: U("1620733723572-11c53f73a416") },
  { label_en: "Warm stone table", photo: U("1571781926291-c477ebfd024b") },
  { label_en: "The quiet corner", photo: U("1583416750470-965b2707b355") },
  { label_en: "Aromatherapy bar", photo: U("1515377905703-c4788e51af15") },
  { label_en: "Soft daylight", photo: U("1610631066894-62452ccb927c") },
  { label_en: "Warm linen", photo: U("1604881988758-f76ad2f7aac1") },
  { label_en: "Hot stones", photo: U("1633933358116-a27b902fad35") },
  { label_en: "Botanical oils", photo: U("1591343395082-e120087004b4") },
  { label_en: "The lounge", photo: U("1542848284-8afa78a08ccb") },
];

/* ── hero ────────────────────────────────────────────────────────────── */

export function T3Hero() {
  const c = useSection("t3_hero", {
    eyebrow_en: "Day spa & wellness retreat",
    eyebrow_el: "Spa ημέρας & κέντρο ευεξίας", eyebrow_de: "Day Spa & Wellness-Retreat", eyebrow_fr: "Spa de jour & retraite bien-être", eyebrow_it: "Day spa & ritiro benessere", eyebrow_es: "Spa de día & retiro de bienestar", eyebrow_nl: "Dagspa & wellnessretraite", eyebrow_pl: "Day spa & azyl wellness", eyebrow_pt: "Spa de dia & retiro de bem-estar", eyebrow_sv: "Dagspa & wellnessretreat", eyebrow_sq: "Spa ditore & strehë mirëqenieje",
    title_en: "An hour that is wholly",
    title_el: "Μια ώρα που είναι απόλυτα", title_de: "Eine Stunde, die ganz", title_fr: "Une heure entièrement", title_it: "Un'ora che è tutta", title_es: "Una hora que es enteramente", title_nl: "Een uur dat helemaal", title_pl: "Godzina, która należy", title_pt: "Uma hora que é totalmente", title_sv: "En timme som är helt", title_sq: "Një orë që është tërësisht",
    titleAccent_en: "yours.",
    titleAccent_el: "δική σου.", titleAccent_de: "dir gehört.", titleAccent_fr: "vôtre.", titleAccent_it: "tua.", titleAccent_es: "tuya.", titleAccent_nl: "van jou is.", titleAccent_pl: "tylko do ciebie.", titleAccent_pt: "tua.", titleAccent_sv: "din.", titleAccent_sq: "e jotja.",
    sub_en: "Massage, facials and quiet body rituals, in a studio built around a single idea: unhurried care. Book online in under a minute.",
    primaryCta_en: "Book a treatment",
    primaryCta_el: "Κλείστε θεραπεία", primaryCta_de: "Behandlung buchen", primaryCta_fr: "Réserver un soin", primaryCta_it: "Prenota un trattamento", primaryCta_es: "Reservar un tratamiento", primaryCta_nl: "Boek een behandeling", primaryCta_pl: "Zarezerwuj zabieg", primaryCta_pt: "Marcar um tratamento", primaryCta_sv: "Boka en behandling", primaryCta_sq: "Rezervo një trajtim",
    secondaryCta_en: "Explore the menu",
    secondaryCta_el: "Δείτε τον κατάλογο", secondaryCta_de: "Menü entdecken", secondaryCta_fr: "Voir le menu", secondaryCta_it: "Esplora il menù", secondaryCta_es: "Explorar el menú", secondaryCta_nl: "Bekijk het menu", secondaryCta_pl: "Zobacz menu", secondaryCta_pt: "Ver o menu", secondaryCta_sv: "Utforska menyn", secondaryCta_sq: "Shfletoni menunë",
    image: U("1540555700478-4be289fbecef"),
    chip1Label_en: "Open today",
    chip1Label_el: "Ανοιχτά σήμερα", chip1Label_de: "Heute geöffnet", chip1Label_fr: "Ouvert aujourd'hui", chip1Label_it: "Aperto oggi", chip1Label_es: "Abierto hoy", chip1Label_nl: "Vandaag open", chip1Label_pl: "Dziś otwarte", chip1Label_pt: "Aberto hoje", chip1Label_sv: "Öppet idag", chip1Label_sq: "Hapur sot",
    chip1Value_en: "9:00 – 21:00",
    chip2Label_en: "Guest rating",
    chip2Label_el: "Βαθμολογία επισκεπτών", chip2Label_de: "Gästebewertung", chip2Label_fr: "Note des clients", chip2Label_it: "Valutazione ospiti", chip2Label_es: "Valoración de clientes", chip2Label_nl: "Gastbeoordeling", chip2Label_pl: "Ocena gości", chip2Label_pt: "Avaliação dos clientes", chip2Label_sv: "Gästbetyg", chip2Label_sq: "Vlerësimi i klientëve",
    chip2Value_en: "4.9 / 5",
  });
  return (
    <section className="relative overflow-hidden bg-[var(--t3-bg)] px-6 pt-36 pb-20 text-center sm:pt-44 lg:pb-24">
      <EditPencil section="t3_hero" />
      <div
        className="pointer-events-none absolute left-1/2 top-24 h-[30rem] w-[30rem] -translate-x-1/2 rounded-full"
        style={{ background: "radial-gradient(circle,rgba(124,138,102,0.14),transparent 70%)" }}
      />
      <div className="relative mx-auto max-w-3xl">
        <Reveal className="flex justify-center">
          <Eyebrow>{c.eyebrow_en}</Eyebrow>
        </Reveal>
        <Reveal delay={0.08}>
          <h1 className="font-serif mt-6 text-[2.9rem] leading-[1.04] tracking-tight text-[var(--t3-ink)] sm:text-6xl lg:text-7xl">
            {c.title_en}{" "}
            <span className="italic text-[var(--t3-sage)]">{c.titleAccent_en}</span>
          </h1>
        </Reveal>
        <Reveal delay={0.16}>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-[var(--t3-muted)]">
            {c.sub_en}
          </p>
        </Reveal>
        <Reveal delay={0.24}>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link
              href="/book"
              className="rounded-full bg-[var(--t3-ink)] px-8 py-4 text-sm font-semibold uppercase tracking-[0.14em] text-[var(--t3-bg)] transition-transform duration-200 hover:scale-[1.03] active:scale-[0.98]"
            >
              {c.primaryCta_en}
            </Link>
            <Link
              href="/services"
              className="rounded-full border border-[var(--t3-border-strong)] px-8 py-4 text-sm font-semibold uppercase tracking-[0.14em] text-[var(--t3-ink)] transition-colors duration-200 hover:bg-[var(--t3-card)]"
            >
              {c.secondaryCta_en}
            </Link>
          </div>
        </Reveal>
      </div>
      <Reveal delay={0.3} className="relative mx-auto mt-16 max-w-md">
        <Arch src={c.image} alt={c.title_en} className="aspect-[4/5] w-full" />
        <div className="absolute -left-5 bottom-12 hidden rounded-2xl border border-[var(--t3-border)] bg-[var(--t3-card)] px-4 py-3 text-left shadow-[0_18px_40px_-26px_rgba(35,39,31,0.5)] sm:block">
          <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--t3-sage)]">{c.chip1Label_en}</p>
          <p className="font-serif text-base text-[var(--t3-ink)]">{c.chip1Value_en}</p>
        </div>
        <div className="absolute -right-5 bottom-24 hidden rounded-2xl border border-[var(--t3-border)] bg-[var(--t3-card)] px-4 py-3 text-left shadow-[0_18px_40px_-26px_rgba(35,39,31,0.5)] sm:block">
          <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--t3-sage)]">{c.chip2Label_en}</p>
          <p className="font-serif text-base text-[var(--t3-ink)]">{c.chip2Value_en}</p>
        </div>
      </Reveal>
    </section>
  );
}

/* ── stats band ──────────────────────────────────────────────────────── */

export function T3Stats() {
  const c = useSection("t3_stats", {
    items: [
      { value: "9 – 21", label_en: "Open every day" },
      { value: "6", label_en: "Treatment rooms" },
      { value: "4.9", label_en: "Guest rating" },
      { value: "900+", label_en: "Visits a year" },
    ],
  });
  const items = (c.items as Array<{ value: string; label_en: string }>) ?? [];
  return (
    <section className="relative border-y border-[var(--t3-border)] bg-[var(--t3-mist)] px-6">
      <EditPencil section="t3_stats" />
      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 py-12 sm:grid-cols-4 sm:gap-0 sm:divide-x sm:divide-[var(--t3-border)]">
        {items.map((s, i) => (
          <div key={i} className="text-center sm:px-6">
            <div className="font-serif text-3xl text-[var(--t3-ink)] sm:text-4xl">{s.value}</div>
            <div className="mt-2 text-[11px] uppercase tracking-[0.18em] text-[var(--t3-muted2)]">
              {s.label_en}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── shared section defaults (used by both the home + page versions) ──── */

const SVC_SECTION = {
  eyebrow_en: "The treatments",
  eyebrow_el: "Οι θεραπείες", eyebrow_de: "Die Behandlungen", eyebrow_fr: "Les soins", eyebrow_it: "I trattamenti", eyebrow_es: "Los tratamientos", eyebrow_nl: "De behandelingen", eyebrow_pl: "Zabiegi", eyebrow_pt: "Os tratamentos", eyebrow_sv: "Behandlingarna", eyebrow_sq: "Trajtimet",
  title_en: "A short, considered menu.",
  title_el: "Ένας σύντομος, προσεγμένος κατάλογος.", title_de: "Eine kurze, durchdachte Auswahl.", title_fr: "Une carte courte et réfléchie.", title_it: "Un menù breve e curato.", title_es: "Una carta breve y cuidada.", title_nl: "Een korte, doordachte kaart.", title_pl: "Krótkie, przemyślane menu.", title_pt: "Uma carta breve e pensada.", title_sv: "En kort, genomtänkt meny.", title_sq: "Një menu e shkurtër, e menduar.",
  text_en: "Every treatment is booked with the time it genuinely needs. No rushing, no upsell, no clock-watching.",
  items: D_SERVICES,
};

const GAL_SECTION = {
  eyebrow_en: "The space",
  eyebrow_el: "Ο χώρος", eyebrow_de: "Der Raum", eyebrow_fr: "Les lieux", eyebrow_it: "Lo spazio", eyebrow_es: "El espacio", eyebrow_nl: "De ruimte", eyebrow_pl: "Przestrzeń", eyebrow_pt: "O espaço", eyebrow_sv: "Lokalen", eyebrow_sq: "Hapësira",
  title_en: "Inside the spa.",
  title_el: "Μέσα στο spa.", title_de: "Im Spa.", title_fr: "À l'intérieur du spa.", title_it: "Dentro la spa.", title_es: "Dentro del spa.", title_nl: "In het spa.", title_pl: "Wnętrze spa.", title_pt: "Dentro do spa.", title_sv: "Inne i spat.", title_sq: "Brenda spa-s.",
  text_en: "Treatment rooms, the lounge and the quiet corners that make an hour here feel like a proper escape.",
  items: D_GALLERY,
};

/* ── treatments (numbered list) ──────────────────────────────────────── */

/** The numbered treatment menu, reused on the home + services pages. */
export function T3ServiceList() {
  const c = useSection("t3_services", SVC_SECTION);
  const items =
    (c.items as Array<{ name_en: string; desc_en: string; mins: number; price: number; photo: string }>) ??
    D_SERVICES;
  return (
    <div className="mx-auto max-w-5xl border-b border-[var(--t3-border)]">
      {items.map((s, i) => (
        <Reveal key={i} delay={(i % 3) * 0.05}>
          <Link
            href="/book"
            className="group grid grid-cols-[auto_1fr_auto] items-center gap-5 border-t border-[var(--t3-border)] px-3 py-7 transition-colors duration-200 hover:bg-[var(--t3-mist)] sm:gap-8 sm:px-6 lg:grid-cols-[auto_auto_1fr_auto]"
          >
            <span className="font-serif text-3xl text-[var(--t3-sage)]/35 transition-colors duration-200 group-hover:text-[var(--t3-sage)] sm:text-4xl">
              {String(i + 1).padStart(2, "0")}
            </span>
            <Arch src={s.photo} alt={s.name_en} className="hidden h-24 w-20 shrink-0 lg:block" />
            <div className="min-w-0">
              <h3 className="font-serif text-xl text-[var(--t3-ink)] sm:text-2xl">{s.name_en}</h3>
              <p className="mt-1 max-w-md text-sm leading-relaxed text-[var(--t3-muted)]">{s.desc_en}</p>
              <p className="mt-2 text-[11px] uppercase tracking-[0.16em] text-[var(--t3-muted2)]">
                {s.mins} minutes
              </p>
            </div>
            <div className="text-right">
              <div className="font-serif text-xl text-[var(--t3-ink)] sm:text-2xl">£{s.price}</div>
              <span className="mt-1 inline-block text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--t3-sage)] opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                Book →
              </span>
            </div>
          </Link>
        </Reveal>
      ))}
    </div>
  );
}

export function T3Services() {
  const c = useSection("t3_services", SVC_SECTION);
  return (
    <section id="services" className="relative bg-[var(--t3-bg)] px-6 py-24 lg:py-28">
      <EditPencil section="t3_services" />
      <div className="mx-auto max-w-7xl">
        <SectionHead eyebrow={c.eyebrow_en} title={c.title_en} text={c.text_en} />
        <div className="mt-14">
          <T3ServiceList />
        </div>
      </div>
    </section>
  );
}

/* ── ritual ──────────────────────────────────────────────────────────── */

export function T3Ritual() {
  const c = useSection("t3_ritual", {
    eyebrow_en: "The ritual",
    eyebrow_el: "Το τελετουργικό", eyebrow_de: "Das Ritual", eyebrow_fr: "Le rituel", eyebrow_it: "Il rituale", eyebrow_es: "El ritual", eyebrow_nl: "Het ritueel", eyebrow_pl: "Rytuał", eyebrow_pt: "O ritual", eyebrow_sv: "Ritualen", eyebrow_sq: "Rituali",
    title_en: "How a visit unfolds.",
    title_el: "Πώς εξελίσσεται μια επίσκεψη.", title_de: "So verläuft ein Besuch.", title_fr: "Le déroulement d'une visite.", title_it: "Come si svolge una visita.", title_es: "Cómo transcurre una visita.", title_nl: "Hoe een bezoek verloopt.", title_pl: "Jak przebiega wizyta.", title_pt: "Como decorre uma visita.", title_sv: "Så går ett besök till.", title_sq: "Si zhvillohet një vizitë.",
    items: [
      { title_en: "Choose your treatment", desc_en: "Browse the menu and book a time online in under a minute." },
      { title_en: "Arrive and unwind", desc_en: "Warm tea, soft light, and a few quiet minutes before we begin." },
      { title_en: "Leave lighter", desc_en: "Unhurried aftercare, and a calm that follows you out the door." },
    ],
  });
  const items = (c.items as Array<{ title_en: string; desc_en: string }>) ?? [];
  return (
    <section className="relative border-y border-[var(--t3-border)] bg-[var(--t3-mist)] px-6 py-24 lg:py-28">
      <EditPencil section="t3_ritual" />
      <div className="mx-auto max-w-6xl">
        <SectionHead eyebrow={c.eyebrow_en} title={c.title_en} />
        <div className="mt-14 grid gap-10 sm:grid-cols-3 sm:gap-8">
          {items.map((r, i) => (
            <Reveal key={i} delay={i * 0.08}>
              <div className="text-center">
                <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-t-full border-x border-t border-[var(--t3-sage)]/45 font-serif text-2xl text-[var(--t3-sage)]">
                  {i + 1}
                </span>
                <h3 className="font-serif mt-6 text-2xl text-[var(--t3-ink)]">{r.title_en}</h3>
                <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-[var(--t3-muted)]">
                  {r.desc_en}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── gallery (masonry) ───────────────────────────────────────────────── */

const ASPECTS = ["aspect-[4/5]", "aspect-[5/6]", "aspect-[1/1]", "aspect-[4/5]", "aspect-[5/4]"];

export function GalleryMasonry({ items }: { items: Array<{ label_en: string; photo: string }> }) {
  return (
    <div className="mx-auto max-w-6xl columns-2 gap-4 lg:columns-3">
      {items.map((g, i) => (
        <Reveal key={i} delay={(i % 3) * 0.06} className="mb-4 break-inside-avoid">
          <figure className="group relative">
            <div
              className={`relative overflow-hidden ${ASPECTS[i % ASPECTS.length]}`}
              style={i % 3 === 0 ? ARCH : { borderRadius: "1.25rem" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={g.photo}
                alt={g.label_en}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-[600ms] ease-out group-hover:scale-[1.05]"
              />
            </div>
            <figcaption className="mt-2 px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--t3-muted2)]">
              {g.label_en}
            </figcaption>
          </figure>
        </Reveal>
      ))}
    </div>
  );
}

/** Full gallery — reads the editable t3_gallery items. Used by the gallery page. */
export function T3GalleryFull() {
  const c = useSection("t3_gallery", GAL_SECTION);
  const items = (c.items as Array<{ label_en: string; photo: string }>) ?? D_GALLERY;
  return (
    <section className="relative px-6 pb-24">
      <EditPencil section="t3_gallery" />
      <GalleryMasonry items={items} />
    </section>
  );
}

export function T3Gallery() {
  const c = useSection("t3_gallery", GAL_SECTION);
  const items = (c.items as Array<{ label_en: string; photo: string }>) ?? D_GALLERY;
  return (
    <section className="relative bg-[var(--t3-bg)] px-6 py-24 lg:py-28">
      <EditPencil section="t3_gallery" />
      <div className="mx-auto max-w-6xl">
        <SectionHead eyebrow={c.eyebrow_en} title={c.title_en} text={c.text_en} />
        <div className="mt-14">
          <GalleryMasonry items={items.slice(0, 6)} />
        </div>
        <div className="mt-10 text-center">
          <Link
            href="/gallery"
            className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--t3-sage)] transition-colors duration-200 hover:text-[var(--t3-sage-deep)]"
          >
            View the full gallery →
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ── therapist ───────────────────────────────────────────────────────── */

export function T3Therapist() {
  const c = useSection("t3_therapist", {
    eyebrow_en: "Meet your lead therapist",
    eyebrow_el: "Γνωρίστε την επικεφαλής θεραπεύτριά σας", eyebrow_de: "Lern deine leitende Therapeutin kennen", eyebrow_fr: "Rencontrez votre thérapeute principale", eyebrow_it: "Incontra la tua terapista principale", eyebrow_es: "Conoce a tu terapeuta principal", eyebrow_nl: "Maak kennis met je hoofdtherapeut", eyebrow_pl: "Poznaj swoją główną terapeutkę", eyebrow_pt: "Conhece a tua terapeuta principal", eyebrow_sv: "Möt din ledande terapeut", eyebrow_sq: "Njihuni me terapisten tuaj kryesore",
    title_en: "Considered care, unhurried.",
    title_el: "Φροντίδα με προσοχή, χωρίς βιασύνη.", title_de: "Achtsame Pflege, ohne Eile.", title_fr: "Des soins attentifs, sans hâte.", title_it: "Cure attente, senza fretta.", title_es: "Cuidado atento, sin prisa.", title_nl: "Aandachtige zorg, zonder haast.", title_pl: "Uważna opieka, bez pośpiechu.", title_pt: "Cuidado atento, sem pressa.", title_sv: "Omtänksam vård, utan stress.", title_sq: "Kujdes i menduar, pa nxitim.",
    body_en: "Our lead therapist trained in clinical and holistic massage, with over a decade of experience in what a body genuinely needs: the right pressure, real quiet, and time that is never rushed. One guest at a time, warm towels, and an hour that is entirely your own.",
    cta_en: "Book your treatment",
    cta_el: "Κλείστε τη θεραπεία σας", cta_de: "Behandlung buchen", cta_fr: "Réservez votre soin", cta_it: "Prenota il tuo trattamento", cta_es: "Reserva tu tratamiento", cta_nl: "Boek je behandeling", cta_pl: "Zarezerwuj swój zabieg", cta_pt: "Marca o teu tratamento", cta_sv: "Boka din behandling", cta_sq: "Rezervo trajtimin tënd",
    image: U("1559599101-f09722fb4948"),
  });
  return (
    <section className="relative bg-[var(--t3-bg)] px-6 pb-24 lg:pb-28">
      <EditPencil section="t3_therapist" />
      <div className="mx-auto max-w-2xl text-center">
        <Reveal className="mx-auto w-48">
          <Arch src={c.image} alt={c.title_en} className="aspect-[4/5] w-full" />
        </Reveal>
        <Reveal delay={0.06}>
          <div className="mt-6 flex justify-center">
            <Eyebrow>{c.eyebrow_en}</Eyebrow>
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <h2 className="font-serif mt-4 text-3xl text-[var(--t3-ink)] sm:text-4xl">{c.title_en}</h2>
        </Reveal>
        <Reveal delay={0.14}>
          <p className="mt-4 leading-relaxed text-[var(--t3-muted)]">{c.body_en}</p>
        </Reveal>
        <Reveal delay={0.18}>
          <Link
            href="/book"
            className="mt-7 inline-block rounded-full bg-[var(--t3-ink)] px-8 py-4 text-sm font-semibold uppercase tracking-[0.14em] text-[var(--t3-bg)] transition-transform duration-200 hover:scale-[1.03] active:scale-[0.98]"
          >
            {c.cta_en}
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

/* ── why us ──────────────────────────────────────────────────────────── */

function Icon({ name }: { name: string }) {
  const p = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "h-6 w-6 text-[var(--t3-sage)]",
  };
  if (name === "leaf")
    return (
      <svg {...p}>
        <path d="M20 4C9 4 4 10 4 20c10 0 16-5 16-16Z" />
        <path d="M8 16c2.5-3 5-5 9-7" />
      </svg>
    );
  if (name === "shield")
    return (
      <svg {...p}>
        <path d="M12 3l7 2.7v5.3c0 4.8-3 7.8-7 9.7-4-1.9-7-4.9-7-9.7V5.7z" />
      </svg>
    );
  if (name === "moon")
    return (
      <svg {...p}>
        <path d="M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z" />
      </svg>
    );
  return (
    <svg {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 1.8" />
    </svg>
  );
}

export function T3WhyUs() {
  const c = useSection("t3_whyus", {
    eyebrow_en: "The difference",
    eyebrow_el: "Η διαφορά", eyebrow_de: "Der Unterschied", eyebrow_fr: "La différence", eyebrow_it: "La differenza", eyebrow_es: "La diferencia", eyebrow_nl: "Het verschil", eyebrow_pl: "Różnica", eyebrow_pt: "A diferença", eyebrow_sv: "Skillnaden", eyebrow_sq: "Dallimi",
    title_en: "Small spa. Serious calm.",
    title_el: "Μικρό spa. Βαθιά ηρεμία.", title_de: "Kleines Spa. Tiefe Ruhe.", title_fr: "Petit spa. Calme absolu.", title_it: "Spa piccola. Calma autentica.", title_es: "Spa pequeño. Calma de verdad.", title_nl: "Klein spa. Echte rust.", title_pl: "Małe spa. Prawdziwy spokój.", title_pt: "Spa pequeno. Calma a sério.", title_sv: "Litet spa. Djup ro.", title_sq: "Spa e vogël. Qetësi e thellë.",
    items: [
      { icon: "leaf", title_en: "Botanical products", desc_en: "Organic oils and plant-based skincare, nothing harsh." },
      { icon: "shield", title_en: "Qualified therapists", desc_en: "Every treatment is given by a trained, insured therapist." },
      { icon: "moon", title_en: "Quiet by design", desc_en: "One guest at a time, in rooms built to slow you down." },
      { icon: "clock", title_en: "Booked in a minute", desc_en: "Pick a treatment and a time. No phone tag, no deposit chase." },
    ],
  });
  const items = (c.items as Array<{ icon: string; title_en: string; desc_en: string }>) ?? [];
  return (
    <section className="relative border-t border-[var(--t3-border)] bg-[var(--t3-bg)] px-6 py-24 lg:py-28">
      <EditPencil section="t3_whyus" />
      <div className="mx-auto max-w-6xl">
        <SectionHead eyebrow={c.eyebrow_en} title={c.title_en} />
        <div className="mt-14 grid gap-y-12 sm:grid-cols-2 sm:divide-x sm:divide-[var(--t3-border)] lg:grid-cols-4">
          {items.map((w, i) => (
            <Reveal key={i} className="sm:px-7">
              <div>
                <Icon name={w.icon} />
                <h3 className="font-serif mt-4 text-xl text-[var(--t3-ink)]">{w.title_en}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--t3-muted)]">{w.desc_en}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── featured testimonial ────────────────────────────────────────────── */

export function T3Testimonial() {
  const c = useSection("t3_testimonial", {
    quote_en: "I left feeling like the whole week had been lifted off my shoulders. It is the quietest, most careful hour of my month, and I have already booked the next one.",
    name_en: "Claire M.",
    detail_en: "Signature massage, every month",
  });
  return (
    <section className="relative border-y border-[var(--t3-border)] bg-[var(--t3-mist)] px-6 py-24 text-center lg:py-32">
      <EditPencil section="t3_testimonial" />
      <div className="mx-auto max-w-3xl">
        <Reveal className="flex justify-center">
          <span className="inline-flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <svg key={i} viewBox="0 0 20 20" className="h-4 w-4 fill-[var(--t3-sage)]">
                <path d="M10 1.6l2.5 5.2 5.7.8-4.1 4 1 5.7L10 14.8 4.9 17.1l1-5.7-4.1-4 5.7-.8z" />
              </svg>
            ))}
          </span>
        </Reveal>
        <Reveal delay={0.08}>
          <blockquote className="font-serif mt-7 text-2xl leading-snug text-[var(--t3-ink)] sm:text-3xl">
            &ldquo;{c.quote_en}&rdquo;
          </blockquote>
        </Reveal>
        <Reveal delay={0.16}>
          <figcaption className="mt-7 text-sm uppercase tracking-[0.18em] text-[var(--t3-muted2)]">
            <span className="text-[var(--t3-ink)]">{c.name_en}</span> · {c.detail_en}
          </figcaption>
        </Reveal>
      </div>
    </section>
  );
}

/* ── closing CTA ─────────────────────────────────────────────────────── */

export function T3BookingCta() {
  const c = useSection("t3_cta", {
    eyebrow_en: "Booking now",
    eyebrow_el: "Κρατήσεις τώρα", eyebrow_de: "Jetzt buchen", eyebrow_fr: "Réservez maintenant", eyebrow_it: "Prenota ora", eyebrow_es: "Reserva ahora", eyebrow_nl: "Boek nu", eyebrow_pl: "Rezerwuj teraz", eyebrow_pt: "Marca agora", eyebrow_sv: "Boka nu", eyebrow_sq: "Rezervo tani",
    title_en: "Ready to give the week back to yourself?",
    title_el: "Έτοιμη να χαρίσεις την εβδομάδα ξανά στον εαυτό σου;", title_de: "Bereit, dir die Woche zurückzuschenken?", title_fr: "Prête à vous redonner votre semaine ?", title_it: "Pronta a restituirti la settimana?", title_es: "¿Lista para devolverte la semana?", title_nl: "Klaar om de week aan jezelf terug te geven?", title_pl: "Gotowa oddać tydzień sobie?", title_pt: "Pronta para devolver a semana a ti mesma?", title_sv: "Redo att ge veckan tillbaka till dig själv?", title_sq: "Gati t'ia kthesh javën vetes?",
    sub_en: "Real-time availability, instant confirmation, and a calm reminder before your visit.",
    cta_en: "Book your treatment",
    cta_el: "Κλείστε τη θεραπεία σας", cta_de: "Behandlung buchen", cta_fr: "Réservez votre soin", cta_it: "Prenota il tuo trattamento", cta_es: "Reserva tu tratamiento", cta_nl: "Boek je behandeling", cta_pl: "Zarezerwuj swój zabieg", cta_pt: "Marca o teu tratamento", cta_sv: "Boka din behandling", cta_sq: "Rezervo trajtimin tënd",
  });
  return (
    <section className="relative bg-[var(--t3-ink)] px-6 py-24 text-center lg:py-32">
      <EditPencil section="t3_cta" />
      <div className="mx-auto max-w-2xl">
        <Reveal className="flex justify-center">
          <span className="block h-11 w-24 rounded-t-full border-x border-t border-[var(--t3-sage)]/55" />
        </Reveal>
        <Reveal delay={0.06}>
          <p className="mt-7 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--t3-sage-deep)]">
            {c.eyebrow_en}
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <h2 className="font-serif mt-3 text-4xl leading-[1.08] text-[var(--t3-bg)] sm:text-5xl lg:text-6xl">
            {c.title_en}
          </h2>
        </Reveal>
        <Reveal delay={0.16}>
          <p className="mx-auto mt-5 max-w-md leading-relaxed text-[var(--t3-on-ink-soft)]">
            {c.sub_en}
          </p>
        </Reveal>
        <Reveal delay={0.22}>
          <Link
            href="/book"
            className="mt-9 inline-block rounded-full bg-[var(--t3-bg)] px-10 py-4 text-sm font-semibold uppercase tracking-[0.14em] text-[var(--t3-ink)] transition-transform duration-200 hover:scale-[1.03] active:scale-[0.98]"
          >
            {c.cta_en}
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

/* ── about page sections ─────────────────────────────────────────────── */

export function T3AboutStory() {
  const c = useSection("t3_about_story", {
    title_en: "It started with one room.",
    p1_en: "This spa opened with a simple idea: give every treatment the time it deserves. No double-booking, no rushing, no leaving before you feel ready.",
    p2_en: "Years on, that has not changed. The rooms stay quiet, the products stay botanical, and every hour belongs entirely to one guest.",
    image: U("1628177142898-93e36e4e3a50"),
  });
  return (
    <section className="relative px-6 pb-24">
      <EditPencil section="t3_about_story" />
      <div className="mx-auto grid max-w-5xl items-center gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        <Reveal className="mx-auto w-full max-w-sm">
          <Arch src={c.image} alt={c.title_en} className="aspect-[4/5] w-full" />
        </Reveal>
        <div>
          <Reveal>
            <h2 className="font-serif text-3xl text-[var(--t3-ink)] sm:text-4xl">{c.title_en}</h2>
          </Reveal>
          <Reveal delay={0.06}>
            <p className="mt-5 leading-relaxed text-[var(--t3-muted)]">{c.p1_en}</p>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="mt-4 leading-relaxed text-[var(--t3-muted)]">{c.p2_en}</p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

export function T3AboutValues() {
  const c = useSection("t3_about_values", {
    eyebrow_en: "What we believe",
    title_en: "Three quiet promises.",
    items: [
      { title_en: "Unhurried", desc_en: "One guest at a time, with the whole appointment to themselves." },
      { title_en: "Spotless", desc_en: "Hospital-grade hygiene and fresh, warm linen for every visit." },
      { title_en: "Honest", desc_en: "Straight advice on the treatment that genuinely suits you." },
    ],
  });
  const items = (c.items as Array<{ title_en: string; desc_en: string }>) ?? [];
  return (
    <section className="relative border-t border-[var(--t3-border)] bg-[var(--t3-mist)] px-6 py-24">
      <EditPencil section="t3_about_values" />
      <div className="mx-auto max-w-6xl">
        <SectionHead eyebrow={c.eyebrow_en} title={c.title_en} />
        <div className="mt-14 grid gap-y-12 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-[var(--t3-border)]">
          {items.map((v, i) => (
            <Reveal key={i} className="text-center sm:px-8">
              <div>
                <span className="mx-auto block h-9 w-[4.5rem] rounded-t-full border-x border-t border-[var(--t3-sage)]/45" />
                <h3 className="font-serif mt-5 text-2xl text-[var(--t3-ink)]">{v.title_en}</h3>
                <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-[var(--t3-muted)]">
                  {v.desc_en}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── shop page ───────────────────────────────────────────────────────── */

export function T3Shop() {
  const c = useSection("t3_shop", {
    items: [
      { name_en: "Bath & body oil", desc_en: "A warm botanical blend for a long, slow soak at home.", price: 24, photo: U("1591343395082-e120087004b4") },
      { name_en: "Massage candle", desc_en: "Soy wax that melts into a nourishing oil for the skin.", price: 28, photo: U("1604881988758-f76ad2f7aac1") },
      { name_en: "Pillow mist", desc_en: "Lavender and cedar to carry the calm through to sleep.", price: 18, photo: U("1610631066894-62452ccb927c") },
      { name_en: "Body scrub", desc_en: "Mineral salts and sweet almond oil for soft, glowing skin.", price: 26, photo: U("1633933358116-a27b902fad35") },
      { name_en: "Hand & body lotion", desc_en: "Rich, fast-absorbing care with a quiet botanical scent.", price: 22, photo: U("1515377905703-c4788e51af15") },
      { name_en: "Spa gift card", desc_en: "The easiest gift for someone who needs an hour to themselves.", price: 60, photo: U("1542848284-8afa78a08ccb") },
    ],
  });
  const items =
    (c.items as Array<{ name_en: string; desc_en: string; price: number; photo: string }>) ?? [];
  return (
    <section className="relative px-6 pb-24">
      <EditPencil section="t3_shop" />
      <div className="mx-auto grid max-w-6xl gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((p, i) => (
          <Reveal key={i} delay={(i % 3) * 0.07}>
            <article className="group text-center">
              <Arch
                src={p.photo}
                alt={p.name_en}
                className="mx-auto aspect-[4/5] w-full max-w-[15rem] transition-transform duration-300 group-hover:-translate-y-1.5"
              />
              <h2 className="font-serif mt-5 text-xl text-[var(--t3-ink)]">{p.name_en}</h2>
              <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-[var(--t3-muted)]">
                {p.desc_en}
              </p>
              <div className="mt-3 flex items-center justify-center gap-3 text-sm">
                <span className="font-serif text-lg text-[var(--t3-ink)]">£{p.price}</span>
                <span className="text-[var(--t3-border-strong)]">·</span>
                <Link
                  href="/cart"
                  className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--t3-sage)] transition-colors duration-200 hover:text-[var(--t3-sage-deep)]"
                >
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

export function T3Blog() {
  const c = useSection("t3_blog", {
    items: [
      { cat_en: "Wellness", date_en: "May 2026", title_en: "Five minutes of stillness that change the whole day", excerpt_en: "The small daily habits that carry the calm of a treatment long after you leave the spa. A short, practical guide to holding onto the quiet.", photo: U("1512290923902-8a9f81dc236c") },
      { cat_en: "Rituals", date_en: "April 2026", title_en: "Why warmth is the heart of every good massage", excerpt_en: "Hot stones, warm oil and warm linen. A look at the role temperature plays in deep rest.", photo: U("1544161515-4ab6ce6db874") },
      { cat_en: "The spa", date_en: "March 2026", title_en: "Why we only book one guest at a time", excerpt_en: "A calmer spa is a cleaner, more careful spa. A look at how we run our day.", photo: U("1559599101-f09722fb4948") },
    ],
  });
  const posts =
    (c.items as Array<{ cat_en: string; date_en: string; title_en: string; excerpt_en: string; photo: string }>) ??
    [];
  const lead = posts[0];
  const rest = posts.slice(1);
  return (
    <section className="relative px-6 pb-24">
      <EditPencil section="t3_blog" />
      <div className="mx-auto max-w-5xl">
        {lead ? (
          <Reveal>
            <article className="group grid items-center gap-8 lg:grid-cols-[1fr_1.1fr]">
              <Arch src={lead.photo} alt={lead.title_en} className="aspect-[5/4] w-full" />
              <div>
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--t3-sage)]">
                  {lead.cat_en}
                  <span className="text-[var(--t3-muted2)]">· {lead.date_en}</span>
                </div>
                <h2 className="font-serif mt-3 text-3xl leading-tight text-[var(--t3-ink)] sm:text-4xl">
                  {lead.title_en}
                </h2>
                <p className="mt-3 leading-relaxed text-[var(--t3-muted)]">{lead.excerpt_en}</p>
                <span className="mt-5 inline-block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--t3-sage)]">
                  Read the article →
                </span>
              </div>
            </article>
          </Reveal>
        ) : null}
        {rest.length > 0 ? (
          <div className="mt-14 border-t border-[var(--t3-border)]">
            {rest.map((p, i) => (
              <Reveal key={i} delay={i * 0.07}>
                <article className="group grid grid-cols-[auto_1fr] items-center gap-6 border-b border-[var(--t3-border)] py-7 sm:gap-8">
                  <Frame src={p.photo} alt={p.title_en} className="h-24 w-32 shrink-0 sm:h-28 sm:w-44" />
                  <div>
                    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--t3-sage)]">
                      {p.cat_en}
                      <span className="text-[var(--t3-muted2)]">· {p.date_en}</span>
                    </div>
                    <h3 className="font-serif mt-2 text-xl leading-snug text-[var(--t3-ink)] sm:text-2xl">
                      {p.title_en}
                    </h3>
                    <p className="mt-1.5 hidden max-w-xl text-sm leading-relaxed text-[var(--t3-muted)] sm:block">
                      {p.excerpt_en}
                    </p>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

/* ── contact page ────────────────────────────────────────────────────── */

export function T3Contact() {
  const c = useSection("t3_contact", {
    details: [
      { label_en: "Spa", value_en: "Your spa address" },
      { label_en: "Phone", value_en: "+44 20 0000 0000" },
      { label_en: "Email", value_en: "hello@yourspa.example" },
      { label_en: "Instagram", value_en: "@yourspa" },
    ],
    hours: [
      { label_en: "Monday", value_en: "09:00 – 19:00" },
      { label_en: "Tuesday", value_en: "09:00 – 19:00" },
      { label_en: "Wednesday", value_en: "09:00 – 19:00" },
      { label_en: "Thursday", value_en: "09:00 – 21:00" },
      { label_en: "Friday", value_en: "09:00 – 21:00" },
      { label_en: "Saturday", value_en: "09:00 – 18:00" },
      { label_en: "Sunday", value_en: "10:00 – 16:00" },
    ],
  });
  const details = (c.details as Array<{ label_en: string; value_en: string }>) ?? [];
  const hours = (c.hours as Array<{ label_en: string; value_en: string }>) ?? [];
  return (
    <section className="relative px-6 pb-24">
      <EditPencil section="t3_contact" />
      <div className="mx-auto grid max-w-4xl gap-x-16 gap-y-12 md:grid-cols-2">
        <Reveal>
          <h2 className="font-serif text-2xl text-[var(--t3-ink)]">The details</h2>
          <dl className="mt-6">
            {details.map((d, i) => (
              <div
                key={i}
                className="flex items-baseline justify-between gap-6 border-t border-[var(--t3-border)] py-4"
              >
                <dt className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--t3-sage)]">
                  {d.label_en}
                </dt>
                <dd className="text-right text-[var(--t3-ink)]">{d.value_en}</dd>
              </div>
            ))}
          </dl>
          <Link
            href="/book"
            className="mt-8 inline-block rounded-full bg-[var(--t3-ink)] px-7 py-3.5 text-sm font-semibold uppercase tracking-[0.14em] text-[var(--t3-bg)] transition-transform duration-200 hover:scale-[1.03] active:scale-[0.98]"
          >
            Book a treatment
          </Link>
        </Reveal>
        <Reveal delay={0.08}>
          <h2 className="font-serif text-2xl text-[var(--t3-ink)]">Opening hours</h2>
          <ul className="mt-6">
            {hours.map((h, i) => (
              <li
                key={i}
                className="flex items-center justify-between border-t border-[var(--t3-border)] py-4 text-sm"
              >
                <span className="text-[var(--t3-muted)]">{h.label_en}</span>
                <span className="text-[var(--t3-ink)]">{h.value_en}</span>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
