"use client";

/**
 * template4 — aesthetics / med-spa clinic front-end ("Lumea Aesthetics").
 *
 * Design DNA, deliberately unlike the other three skins: a numbered editorial
 * "dossier". The home is not a stack of centered marketing sections — it is a
 * ruled 12-column grid where each section carries a running number and label
 * in a left margin, content offset to the right, hard hairline rules between.
 * A big typographic hero with a full-bleed image strip opens it. Cool palette,
 * Manrope sans headings. Every section is editable through useSection().
 */

import Link from "next/link";
import type { ReactNode } from "react";
import { useSection } from "@/lib/editorClient";
import EditPencil from "../../app/components/EditPencil";
import { T4_CSS } from "./theme";

export const U = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=1280&q=80&auto=format&fit=crop`;

export function T4Style() {
  return <style dangerouslySetInnerHTML={{ __html: T4_CSS }} />;
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
    <div className={`t4-rise${className ? ` ${className}` : ""}`} style={{ animationDelay: `${delay}s` }}>
      {children}
    </div>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--t4-blue)]">
      <span className="h-px w-8 bg-[var(--t4-blue)]" />
      {children}
    </span>
  );
}

export function Frame({
  src,
  alt,
  className = "",
  radius = "0.6rem",
}: {
  src: string;
  alt: string;
  className?: string;
  radius?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden border border-[var(--t4-border)] ${className}`}
      style={{ borderRadius: radius }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} loading="lazy" className="h-full w-full object-cover" />
    </div>
  );
}

/**
 * The dossier section wrapper: a hard top rule, a left margin carrying the
 * running number + section title + note, and the content offset into the
 * right two-thirds. This asymmetric, ruled rhythm is the template's signature.
 */
function Block({
  section,
  num,
  eyebrow,
  title,
  note,
  children,
}: {
  section: string;
  num: string;
  eyebrow: string;
  title: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <section className="relative border-t border-[var(--t4-border)] px-6">
      <EditPencil section={section} />
      <div className="mx-auto grid max-w-7xl gap-x-10 gap-y-10 py-20 lg:grid-cols-12 lg:py-28">
        <div className="lg:col-span-3">
          <Reveal>
            <div className="flex items-baseline gap-3">
              <span className="font-serif text-5xl font-semibold leading-none text-[var(--t4-blue)]/25">
                {num}
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--t4-blue)]">
                {eyebrow}
              </span>
            </div>
            <h2 className="font-serif mt-5 text-2xl font-semibold leading-tight tracking-tight text-[var(--t4-ink)] sm:text-3xl">
              {title}
            </h2>
            {note ? (
              <p className="mt-3 text-sm leading-relaxed text-[var(--t4-muted)]">{note}</p>
            ) : null}
          </Reveal>
        </div>
        <div className="lg:col-span-8 lg:col-start-5">{children}</div>
      </div>
    </section>
  );
}

/** Inner-page header — editable, in the dossier style. */
export function T4PageHeader({
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
  const c = useSection(section, { eyebrow_en: eyebrow, title_en: title, sub_en: sub ?? "" });
  return (
    <header className="relative border-b border-[var(--t4-border)] bg-[var(--t4-bg)] px-6 pt-36 pb-16 sm:pt-44">
      <EditPencil section={section} />
      <div className="mx-auto grid max-w-7xl gap-x-10 gap-y-6 lg:grid-cols-12">
        <div className="lg:col-span-3">
          <Reveal>
            <Eyebrow>{c.eyebrow_en}</Eyebrow>
          </Reveal>
        </div>
        <div className="lg:col-span-8 lg:col-start-5">
          <Reveal delay={0.05}>
            <h1 className="font-serif text-4xl font-semibold leading-[1.04] tracking-tight text-[var(--t4-ink)] sm:text-5xl lg:text-6xl">
              {c.title_en}
            </h1>
          </Reveal>
          {c.sub_en ? (
            <Reveal delay={0.1}>
              <p className="mt-5 max-w-xl leading-relaxed text-[var(--t4-muted)]">{c.sub_en}</p>
            </Reveal>
          ) : null}
        </div>
      </div>
    </header>
  );
}

/* ── default data ────────────────────────────────────────────────────── */

const D_TREATMENTS = [
  { name_en: "Anti-wrinkle treatment", desc_en: "Smooths fine lines with precise, conservative dosing.", cat_en: "Injectables", price: 180, photo: U("1512290923902-8a9f81dc236c") },
  { name_en: "Dermal filler", desc_en: "Restores volume and definition, naturally and subtly.", cat_en: "Injectables", price: 290, photo: U("1570172619644-dfd03ed5d881") },
  { name_en: "Signature HydraFacial", desc_en: "A deep cleanse, exfoliation and hydration in one session.", cat_en: "Skin", price: 140, photo: U("1596178065887-1198b6148b2b") },
  { name_en: "Medical microneedling", desc_en: "Stimulates collagen for firmer, smoother, even-toned skin.", cat_en: "Skin", price: 210, photo: U("1633933358116-a27b902fad35") },
  { name_en: "Laser hair removal", desc_en: "Comfortable, effective reduction across any area.", cat_en: "Laser", price: 90, photo: U("1620733723572-11c53f73a416") },
  { name_en: "Skin consultation", desc_en: "A thorough assessment and a plan built around your skin.", cat_en: "Consultation", price: 45, photo: U("1519823551278-64ac92734fb1") },
];

const D_GALLERY = [
  { label_en: "The consultation room", photo: U("1519823551278-64ac92734fb1") },
  { label_en: "Treatment suite", photo: U("1556228578-8c89e6adf883") },
  { label_en: "Skin analysis", photo: U("1570172619644-dfd03ed5d881") },
  { label_en: "The clinic", photo: U("1610631066894-62452ccb927c") },
  { label_en: "Medical-grade skincare", photo: U("1591343395082-e120087004b4") },
  { label_en: "Aftercare", photo: U("1604881988758-f76ad2f7aac1") },
  { label_en: "Reception", photo: U("1620733723572-11c53f73a416") },
  { label_en: "Laser suite", photo: U("1633933358116-a27b902fad35") },
  { label_en: "Quiet recovery", photo: U("1583416750470-965b2707b355") },
];

const TREAT_SECTION = {
  eyebrow_en: "Treatments",
  eyebrow_el: "Θεραπείες", eyebrow_de: "Behandlungen", eyebrow_fr: "Les soins", eyebrow_it: "Trattamenti", eyebrow_es: "Tratamientos", eyebrow_nl: "Behandelingen", eyebrow_pl: "Zabiegi", eyebrow_pt: "Tratamentos", eyebrow_sv: "Behandlingar", eyebrow_sq: "Trajtimet",
  title_en: "A focused, medical-grade menu.",
  title_el: "Ένας στοχευμένος, ιατρικού επιπέδου κατάλογος.", title_de: "Eine fokussierte Auswahl auf medizinischem Niveau.", title_fr: "Une carte ciblée, de niveau médical.", title_it: "Un menù mirato, di livello medico.", title_es: "Una carta enfocada, de nivel médico.", title_nl: "Een gericht aanbod op medisch niveau.", title_pl: "Skoncentrowane menu na poziomie medycznym.", title_pt: "Uma carta focada, de nível médico.", title_sv: "En fokuserad meny på medicinsk nivå.", title_sq: "Një menu e fokusuar, e nivelit mjekësor.",
  text_en: "Every treatment is planned at consultation and carried out by a registered practitioner. Prices start from, and are confirmed before anything begins.",
  items: D_TREATMENTS,
};

const GAL_SECTION = {
  eyebrow_en: "The clinic",
  eyebrow_el: "Η κλινική", eyebrow_de: "Die Klinik", eyebrow_fr: "La clinique", eyebrow_it: "La clinica", eyebrow_es: "La clínica", eyebrow_nl: "De kliniek", eyebrow_pl: "Klinika", eyebrow_pt: "A clínica", eyebrow_sv: "Kliniken", eyebrow_sq: "Klinika",
  title_en: "A calm, considered space.",
  title_el: "Ένας ήρεμος, προσεγμένος χώρος.", title_de: "Ein ruhiger, durchdachter Raum.", title_fr: "Un espace calme et pensé.", title_it: "Uno spazio calmo e curato.", title_es: "Un espacio sereno y cuidado.", title_nl: "Een rustige, doordachte ruimte.", title_pl: "Spokojna, przemyślana przestrzeń.", title_pt: "Um espaço calmo e pensado.", title_sv: "Ett lugnt, genomtänkt rum.", title_sq: "Një hapësirë e qetë, e menduar.",
  text_en: "Purpose-built consultation and treatment rooms, held to medical-grade standards.",
  items: D_GALLERY,
};

/* ── hero ────────────────────────────────────────────────────────────── */

export function T4Hero() {
  const c = useSection("t4_hero", {
    eyebrow_en: "Aesthetics & skin clinic",
    eyebrow_el: "Κλινική αισθητικής & δέρματος", eyebrow_de: "Ästhetik- & Hautklinik", eyebrow_fr: "Clinique d'esthétique & de la peau", eyebrow_it: "Clinica estetica & della pelle", eyebrow_es: "Clínica de estética & de la piel", eyebrow_nl: "Kliniek voor esthetiek & huid", eyebrow_pl: "Klinika estetyki & skóry", eyebrow_pt: "Clínica de estética & da pele", eyebrow_sv: "Klinik för estetik & hud", eyebrow_sq: "Klinikë estetike & lëkure",
    title_en: "Considered",
    title_el: "Προσεγμένη", title_de: "Durchdachte", title_fr: "Des soins", title_it: "Cure estetiche", title_es: "Estética", title_nl: "Doordachte", title_pl: "Przemyślana", title_pt: "Estética", title_sv: "Genomtänkt", title_sq: "Kujdes",
    titleAccent_en: "aesthetic care.",
    titleAccent_el: "αισθητική φροντίδα.", titleAccent_de: "ästhetische Pflege.", titleAccent_fr: "esthétiques réfléchis.", titleAccent_it: "ponderate.", titleAccent_es: "con criterio.", titleAccent_nl: "esthetische zorg.", titleAccent_pl: "pielęgnacja estetyczna.", titleAccent_pt: "pensada ao detalhe.", titleAccent_sv: "estetisk vård.", titleAccent_sq: "estetik i menduar.",
    sub_en: "A doctor-led aesthetics clinic. Honest assessments, conservative treatment, and results that look like you on a good day. Book a consultation online.",
    primaryCta_en: "Book a consultation",
    primaryCta_el: "Κλείστε ραντεβού", primaryCta_de: "Beratung buchen", primaryCta_fr: "Prendre rendez-vous", primaryCta_it: "Prenota una consulenza", primaryCta_es: "Reservar una consulta", primaryCta_nl: "Boek een consult", primaryCta_pl: "Umów konsultację", primaryCta_pt: "Marcar uma consulta", primaryCta_sv: "Boka en konsultation", primaryCta_sq: "Rezervo një konsultë",
    secondaryCta_en: "See treatments",
    secondaryCta_el: "Δείτε τις θεραπείες", secondaryCta_de: "Behandlungen ansehen", secondaryCta_fr: "Voir les soins", secondaryCta_it: "Vedi i trattamenti", secondaryCta_es: "Ver tratamientos", secondaryCta_nl: "Bekijk behandelingen", secondaryCta_pl: "Zobacz zabiegi", secondaryCta_pt: "Ver tratamentos", secondaryCta_sv: "Se behandlingar", secondaryCta_sq: "Shih trajtimet",
    trust1_en: "Doctor-led",
    trust1_el: "Με ιατρική επίβλεψη", trust1_de: "Ärztlich geleitet", trust1_fr: "Dirigé par un médecin", trust1_it: "Guidata da un medico", trust1_es: "Dirigida por un médico", trust1_nl: "Onder leiding van een arts", trust1_pl: "Pod kierunkiem lekarza", trust1_pt: "Dirigida por um médico", trust1_sv: "Läkarledd", trust1_sq: "Drejtuar nga mjeku",
    trust2_en: "CQC-registered",
    trust2_el: "Πιστοποιημένη κλινική", trust2_de: "Registrierte Klinik", trust2_fr: "Clinique agréée", trust2_it: "Clinica registrata", trust2_es: "Clínica registrada", trust2_nl: "Geregistreerde kliniek", trust2_pl: "Zarejestrowana klinika", trust2_pt: "Clínica registada", trust2_sv: "Registrerad klinik", trust2_sq: "Klinikë e regjistruar",
    trust3_en: "4.9 patient rating",
    trust3_el: "4.9 βαθμολογία ασθενών", trust3_de: "4,9 Patientenbewertung", trust3_fr: "Note patients 4,9", trust3_it: "Valutazione pazienti 4,9", trust3_es: "Valoración de pacientes 4,9", trust3_nl: "4,9 patiëntbeoordeling", trust3_pl: "Ocena pacjentów 4,9", trust3_pt: "Avaliação dos pacientes 4,9", trust3_sv: "4,9 patientbetyg", trust3_sq: "Vlerësimi i pacientëve 4.9",
    image: U("1570172619644-dfd03ed5d881"),
    cardLabel_en: "Lead doctor",
    cardLabel_el: "Επικεφαλής ιατρός", cardLabel_de: "Leitende Ärztin", cardLabel_fr: "Médecin référent", cardLabel_it: "Medico responsabile", cardLabel_es: "Médica principal", cardLabel_nl: "Hoofdarts", cardLabel_pl: "Lekarz prowadzący", cardLabel_pt: "Médica responsável", cardLabel_sv: "Ledande läkare", cardLabel_sq: "Mjeku kryesor",
    cardValue_en: "A GMC-registered medical doctor",
  });
  return (
    <section className="relative bg-[var(--t4-bg)] pt-32 pb-0">
      <EditPencil section="t4_hero" />
      <div className="mx-auto max-w-7xl px-6">
        <Reveal>
          <Eyebrow>{c.eyebrow_en}</Eyebrow>
        </Reveal>
        <Reveal delay={0.07}>
          <h1 className="font-serif mt-7 max-w-5xl text-[3.1rem] font-semibold leading-[0.98] tracking-tight text-[var(--t4-ink)] sm:text-7xl lg:text-[6rem]">
            {c.title_en}{" "}
            <span className="text-[var(--t4-blue)]">{c.titleAccent_en}</span>
          </h1>
        </Reveal>
        <div className="mt-10 grid items-end gap-8 border-t border-[var(--t4-border)] pt-8 lg:grid-cols-12">
          <Reveal delay={0.12} className="lg:col-span-5">
            <p className="leading-relaxed text-[var(--t4-muted)]">{c.sub_en}</p>
          </Reveal>
          <Reveal delay={0.16} className="lg:col-span-4 lg:col-start-9">
            <div className="flex flex-wrap gap-3">
              <Link
                href="/book"
                className="rounded-lg bg-[var(--t4-blue)] px-6 py-3.5 text-sm font-semibold tracking-tight text-white transition-colors duration-200 hover:bg-[var(--t4-blue-deep)]"
              >
                {c.primaryCta_en}
              </Link>
              <Link
                href="/services"
                className="rounded-lg border border-[var(--t4-border-strong)] px-6 py-3.5 text-sm font-semibold tracking-tight text-[var(--t4-ink)] transition-colors duration-200 hover:bg-[var(--t4-card)]"
              >
                {c.secondaryCta_en}
              </Link>
            </div>
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-1.5 text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--t4-muted2)]">
              <span>{c.trust1_en}</span>
              <span>{c.trust2_en}</span>
              <span>{c.trust3_en}</span>
            </div>
          </Reveal>
        </div>
      </div>
      {/* Full-width cinematic image strip — edge to edge. */}
      <Reveal delay={0.2} className="mt-14">
        <div className="relative aspect-[16/7] w-full overflow-hidden border-y border-[var(--t4-border)] sm:aspect-[16/5]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={c.image} alt={c.title_en} className="h-full w-full object-cover" />
          <div className="absolute bottom-0 left-0 m-5 max-w-[16rem] rounded-lg border border-[var(--t4-border)] bg-[var(--t4-card)] px-5 py-4 shadow-[0_24px_50px_-30px_rgba(27,35,48,0.55)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--t4-blue)]">
              {c.cardLabel_en}
            </p>
            <p className="font-serif mt-1 text-sm font-semibold text-[var(--t4-ink)]">
              {c.cardValue_en}
            </p>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ── credentials band ────────────────────────────────────────────────── */

export function T4Stats() {
  const c = useSection("t4_stats", {
    items: [
      { value: "12 yrs", label_en: "In clinical practice" },
      { value: "8,000+", label_en: "Treatments delivered" },
      { value: "4.9", label_en: "Patient rating" },
      { value: "CQC", label_en: "Registered clinic" },
    ],
  });
  const items = (c.items as Array<{ value: string; label_en: string }>) ?? [];
  return (
    <section className="relative bg-[var(--t4-card)] px-6">
      <EditPencil section="t4_stats" />
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-12 gap-y-4 py-6">
        {items.map((s, i) => (
          <div key={i} className="flex items-baseline gap-2.5">
            <span className="font-serif text-xl font-semibold text-[var(--t4-ink)]">{s.value}</span>
            <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--t4-muted2)]">
              {s.label_en}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── 01 · treatments ─────────────────────────────────────────────────── */

/** The treatment list, reused on the home + services pages. */
export function T4TreatmentList() {
  const c = useSection("t4_treatments", TREAT_SECTION);
  const items =
    (c.items as Array<{ name_en: string; desc_en: string; cat_en: string; price: number; photo: string }>) ??
    D_TREATMENTS;
  return (
    <div className="border-t border-[var(--t4-border)]">
      {items.map((t, i) => (
        <Reveal key={i} delay={(i % 3) * 0.05}>
          <Link
            href="/book"
            className="group grid grid-cols-[auto_1fr_auto] items-baseline gap-5 border-b border-[var(--t4-border)] py-6 transition-colors duration-200 hover:bg-[var(--t4-card)]"
          >
            <span className="font-serif text-sm font-semibold text-[var(--t4-blue)]/50">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h3 className="font-serif text-lg font-semibold text-[var(--t4-ink)] sm:text-xl">
                  {t.name_en}
                </h3>
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--t4-muted2)]">
                  {t.cat_en}
                </span>
              </div>
              <p className="mt-1 max-w-md text-sm leading-relaxed text-[var(--t4-muted)]">
                {t.desc_en}
              </p>
            </div>
            <div className="text-right">
              <span className="font-serif text-lg font-semibold text-[var(--t4-ink)]">
                <span className="text-xs font-medium text-[var(--t4-muted2)]">from </span>£{t.price}
              </span>
            </div>
          </Link>
        </Reveal>
      ))}
    </div>
  );
}

export function T4Treatments() {
  const c = useSection("t4_treatments", TREAT_SECTION);
  return (
    <Block section="t4_treatments" num="01" eyebrow={c.eyebrow_en} title={c.title_en} note={c.text_en}>
      <T4TreatmentList />
    </Block>
  );
}

/* ── 02 · your visit ─────────────────────────────────────────────────── */

export function T4Process() {
  const c = useSection("t4_process", {
    eyebrow_en: "Your visit",
    eyebrow_el: "Η επίσκεψή σας", eyebrow_de: "Ihr Besuch", eyebrow_fr: "Votre visite", eyebrow_it: "La tua visita", eyebrow_es: "Tu visita", eyebrow_nl: "Jouw bezoek", eyebrow_pl: "Twoja wizyta", eyebrow_pt: "A tua visita", eyebrow_sv: "Ditt besök", eyebrow_sq: "Vizita juaj",
    title_en: "Three steps, no pressure.",
    title_el: "Τρία βήματα, καμία πίεση.", title_de: "Drei Schritte, kein Druck.", title_fr: "Trois étapes, sans pression.", title_it: "Tre passi, nessuna pressione.", title_es: "Tres pasos, sin presión.", title_nl: "Drie stappen, geen druk.", title_pl: "Trzy kroki, bez presji.", title_pt: "Três passos, sem pressão.", title_sv: "Tre steg, ingen press.", title_sq: "Tre hapa, pa presion.",
    items: [
      { title_en: "Consultation", desc_en: "A thorough, unhurried assessment with a practitioner. No pressure, no hard sell." },
      { title_en: "Your treatment plan", desc_en: "A clear, costed plan built around your skin and your goals." },
      { title_en: "Treatment & aftercare", desc_en: "Carried out by a medical professional, with full aftercare and a follow-up." },
    ],
  });
  const items = (c.items as Array<{ title_en: string; desc_en: string }>) ?? [];
  return (
    <Block section="t4_process" num="02" eyebrow={c.eyebrow_en} title={c.title_en}>
      <div className="border-t border-[var(--t4-border)]">
        {items.map((s, i) => (
          <Reveal key={i} delay={i * 0.07}>
            <div className="grid grid-cols-[auto_1fr] gap-6 border-b border-[var(--t4-border)] py-6">
              <span className="font-serif text-3xl font-semibold leading-none text-[var(--t4-blue)]/30">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="font-serif text-lg font-semibold text-[var(--t4-ink)]">{s.title_en}</h3>
                <p className="mt-1.5 leading-relaxed text-[var(--t4-muted)]">{s.desc_en}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </Block>
  );
}

/* ── 03 · the clinic ─────────────────────────────────────────────────── */

export function T4GalleryGrid({ items }: { items: Array<{ label_en: string; photo: string }> }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {items.map((g, i) => (
        <Reveal key={i} delay={(i % 3) * 0.06}>
          <figure className="group relative overflow-hidden border border-[var(--t4-border)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={g.photo}
              alt={g.label_en}
              loading="lazy"
              className="aspect-square w-full object-cover transition-transform duration-[600ms] ease-out group-hover:scale-[1.05]"
            />
            <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent p-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-white">
              {g.label_en}
            </figcaption>
          </figure>
        </Reveal>
      ))}
    </div>
  );
}

export function T4GalleryFull() {
  const c = useSection("t4_gallery", GAL_SECTION);
  const items = (c.items as Array<{ label_en: string; photo: string }>) ?? D_GALLERY;
  return (
    <section className="relative px-6 py-24">
      <EditPencil section="t4_gallery" />
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map((g, i) => (
            <Reveal key={i} delay={(i % 3) * 0.06}>
              <figure className="group relative overflow-hidden border border-[var(--t4-border)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={g.photo}
                  alt={g.label_en}
                  loading="lazy"
                  className="aspect-[4/3] w-full object-cover transition-transform duration-[600ms] ease-out group-hover:scale-[1.05]"
                />
                <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent p-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-white">
                  {g.label_en}
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function T4Gallery() {
  const c = useSection("t4_gallery", GAL_SECTION);
  const items = (c.items as Array<{ label_en: string; photo: string }>) ?? D_GALLERY;
  return (
    <Block section="t4_gallery" num="03" eyebrow={c.eyebrow_en} title={c.title_en} note={c.text_en}>
      <T4GalleryGrid items={items.slice(0, 6)} />
      <Link
        href="/gallery"
        className="mt-6 inline-block text-sm font-semibold tracking-tight text-[var(--t4-blue)] transition-colors duration-200 hover:text-[var(--t4-blue-deep)]"
      >
        View the clinic →
      </Link>
    </Block>
  );
}

/* ── 04 · practitioner ───────────────────────────────────────────────── */

export function T4Practitioner() {
  const c = useSection("t4_practitioner", {
    eyebrow_en: "Practitioner",
    eyebrow_el: "Ο ιατρός", eyebrow_de: "Fachärztin", eyebrow_fr: "Le praticien", eyebrow_it: "Il medico", eyebrow_es: "La profesional", eyebrow_nl: "De behandelaar", eyebrow_pl: "Specjalista", eyebrow_pt: "A profissional", eyebrow_sv: "Behandlaren", eyebrow_sq: "Specialisti",
    title_en: "Led by a medical doctor.",
    title_el: "Με επικεφαλής ιατρό.", title_de: "Geleitet von einer Ärztin.", title_fr: "Dirigé par un médecin.", title_it: "Guidata da un medico.", title_es: "Dirigida por una médica.", title_nl: "Geleid door een arts.", title_pl: "Pod kierunkiem lekarza.", title_pt: "Dirigida por uma médica.", title_sv: "Ledd av en läkare.", title_sq: "Drejtuar nga një mjek.",
    p1_en: "Our lead doctor trained in medicine before specialising in aesthetics, and works to one principle: the best results are the ones nobody can point to.",
    p2_en: "Every consultation here is with a doctor. Every treatment is planned conservatively, explained clearly, and carried out to medical-grade standards.",
    cta_en: "Book a consultation",
    cta_el: "Κλείστε ραντεβού", cta_de: "Beratung buchen", cta_fr: "Prendre rendez-vous", cta_it: "Prenota una consulenza", cta_es: "Reservar una consulta", cta_nl: "Boek een consult", cta_pl: "Umów konsultację", cta_pt: "Marcar uma consulta", cta_sv: "Boka en konsultation", cta_sq: "Rezervo një konsultë",
    image: U("1559599101-f09722fb4948"),
    credentials: [
      { label_en: "GMC-registered medical doctor" },
      { label_en: "Level 7 in aesthetic medicine" },
      { label_en: "Fully insured & CQC-registered" },
    ],
  });
  const creds = (c.credentials as Array<{ label_en: string }>) ?? [];
  return (
    <Block section="t4_practitioner" num="04" eyebrow={c.eyebrow_en} title={c.title_en}>
      <div className="grid gap-8 sm:grid-cols-[1fr_1.4fr]">
        <Reveal>
          <Frame src={c.image} alt={c.title_en} className="aspect-[4/5] w-full" />
        </Reveal>
        <div>
          <Reveal delay={0.06}>
            <p className="leading-relaxed text-[var(--t4-muted)]">{c.p1_en}</p>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-4 leading-relaxed text-[var(--t4-muted)]">{c.p2_en}</p>
          </Reveal>
          <Reveal delay={0.14}>
            <ul className="mt-6 border-t border-[var(--t4-border)]">
              {creds.map((cr, i) => (
                <li
                  key={i}
                  className="flex items-center gap-3 border-b border-[var(--t4-border)] py-3 text-sm text-[var(--t4-ink)]"
                >
                  <span className="font-serif text-xs font-semibold text-[var(--t4-blue)]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {cr.label_en}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={0.18}>
            <Link
              href="/book"
              className="mt-6 inline-block rounded-lg bg-[var(--t4-blue)] px-6 py-3 text-sm font-semibold tracking-tight text-white transition-colors duration-200 hover:bg-[var(--t4-blue-deep)]"
            >
              {c.cta_en}
            </Link>
          </Reveal>
        </div>
      </div>
    </Block>
  );
}

/* ── 05 · why us ─────────────────────────────────────────────────────── */

export function T4WhyUs() {
  const c = useSection("t4_whyus", {
    eyebrow_en: "Why Lumea",
    eyebrow_el: "Γιατί Lumea", eyebrow_de: "Warum Lumea", eyebrow_fr: "Pourquoi Lumea", eyebrow_it: "Perché Lumea", eyebrow_es: "Por qué Lumea", eyebrow_nl: "Waarom Lumea", eyebrow_pl: "Dlaczego Lumea", eyebrow_pt: "Porquê Lumea", eyebrow_sv: "Varför Lumea", eyebrow_sq: "Pse Lumea",
    title_en: "Medicine first. Always.",
    title_el: "Πρώτα η ιατρική. Πάντα.", title_de: "Medizin zuerst. Immer.", title_fr: "La médecine d'abord. Toujours.", title_it: "Prima la medicina. Sempre.", title_es: "Primero la medicina. Siempre.", title_nl: "Geneeskunde eerst. Altijd.", title_pl: "Najpierw medycyna. Zawsze.", title_pt: "Primeiro a medicina. Sempre.", title_sv: "Medicinen först. Alltid.", title_sq: "Mjekësia e para. Gjithmonë.",
    items: [
      { title_en: "Doctor-led", desc_en: "Every treatment is planned and performed by a registered medical practitioner." },
      { title_en: "Honest advice", desc_en: "We will tell you when a treatment is not right for you. No pressure, ever." },
      { title_en: "Regulated & insured", desc_en: "A registered, CQC-compliant clinic held to medical-grade standards." },
      { title_en: "Natural results", desc_en: "Conservative dosing and a careful hand. Refreshed, never overdone." },
    ],
  });
  const items = (c.items as Array<{ title_en: string; desc_en: string }>) ?? [];
  return (
    <Block section="t4_whyus" num="05" eyebrow={c.eyebrow_en} title={c.title_en}>
      <div className="grid gap-x-10 gap-y-px sm:grid-cols-2">
        {items.map((w, i) => (
          <Reveal key={i} delay={(i % 4) * 0.05}>
            <div className="border-t border-[var(--t4-border)] py-5">
              <h3 className="font-serif text-base font-semibold text-[var(--t4-ink)]">{w.title_en}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--t4-muted)]">{w.desc_en}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </Block>
  );
}

/* ── 06 · FAQ ────────────────────────────────────────────────────────── */

export function T4Faq() {
  const c = useSection("t4_faq", {
    eyebrow_en: "Good questions",
    eyebrow_el: "Καλές ερωτήσεις", eyebrow_de: "Gute Fragen", eyebrow_fr: "Bonnes questions", eyebrow_it: "Buone domande", eyebrow_es: "Buenas preguntas", eyebrow_nl: "Goede vragen", eyebrow_pl: "Dobre pytania", eyebrow_pt: "Boas perguntas", eyebrow_sv: "Bra frågor", eyebrow_sq: "Pyetje të mira",
    title_en: "The things people ask.",
    title_el: "Αυτά που ρωτούν οι περισσότεροι.", title_de: "Was Patienten häufig fragen.", title_fr: "Les questions fréquentes.", title_it: "Le domande più frequenti.", title_es: "Lo que la gente pregunta.", title_nl: "Wat mensen vaak vragen.", title_pl: "O co pytają pacjenci.", title_pt: "O que as pessoas perguntam.", title_sv: "Det folk brukar fråga.", title_sq: "Çfarë pyesin njerëzit.",
    items: [
      { q_en: "Does it hurt?", a_en: "Most treatments are very comfortable. We use numbing where it helps and always work at your pace." },
      { q_en: "How long do results last?", a_en: "It depends on the treatment, typically three to twelve months. We are specific at your consultation." },
      { q_en: "Is there any downtime?", a_en: "Most treatments have little to none. Anything with recovery is explained clearly beforehand." },
      { q_en: "Who performs the treatment?", a_en: "A registered medical practitioner, every time. Never a non-medical injector." },
    ],
  });
  const items = (c.items as Array<{ q_en: string; a_en: string }>) ?? [];
  return (
    <Block section="t4_faq" num="06" eyebrow={c.eyebrow_en} title={c.title_en}>
      <div className="border-t border-[var(--t4-border)]">
        {items.map((f, i) => (
          <Reveal key={i} delay={(i % 2) * 0.06}>
            <div className="grid gap-2 border-b border-[var(--t4-border)] py-6 sm:grid-cols-[1fr_1.4fr] sm:gap-8">
              <h3 className="font-serif text-base font-semibold text-[var(--t4-ink)]">{f.q_en}</h3>
              <p className="leading-relaxed text-[var(--t4-muted)]">{f.a_en}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </Block>
  );
}

/* ── testimonial (pattern break) ─────────────────────────────────────── */

export function T4Testimonial() {
  const c = useSection("t4_testimonial", {
    quote_en: "I went in nervous and came out reassured. The doctor talked me out of half of what I thought I wanted, and the result is so subtle that friends just keep telling me I look well.",
    name_en: "Rebecca H.",
    detail_en: "Anti-wrinkle treatment",
  });
  return (
    <section className="relative border-t border-[var(--t4-border)] bg-[var(--t4-card)] px-6 py-24 lg:py-32">
      <EditPencil section="t4_testimonial" />
      <div className="mx-auto max-w-4xl">
        <Reveal>
          <blockquote className="font-serif text-3xl font-semibold leading-[1.18] tracking-tight text-[var(--t4-ink)] sm:text-4xl lg:text-[2.9rem]">
            <span className="text-[var(--t4-blue)]">&ldquo;</span>
            {c.quote_en}
            <span className="text-[var(--t4-blue)]">&rdquo;</span>
          </blockquote>
        </Reveal>
        <Reveal delay={0.1}>
          <figcaption className="mt-8 flex items-center gap-3 text-sm font-medium uppercase tracking-[0.12em] text-[var(--t4-muted2)]">
            <span className="h-px w-8 bg-[var(--t4-blue)]" />
            <span className="text-[var(--t4-ink)]">{c.name_en}</span> · {c.detail_en}
          </figcaption>
        </Reveal>
      </div>
    </section>
  );
}

/* ── closing CTA ─────────────────────────────────────────────────────── */

export function T4Cta() {
  const c = useSection("t4_cta", {
    eyebrow_en: "Book now",
    eyebrow_el: "Κλείστε τώρα", eyebrow_de: "Jetzt buchen", eyebrow_fr: "Réservez maintenant", eyebrow_it: "Prenota ora", eyebrow_es: "Reserva ahora", eyebrow_nl: "Boek nu", eyebrow_pl: "Rezerwuj teraz", eyebrow_pt: "Marca agora", eyebrow_sv: "Boka nu", eyebrow_sq: "Rezervo tani",
    title_en: "Start with a consultation.",
    title_el: "Ξεκινήστε με μια συνεδρία γνωριμίας.", title_de: "Beginnen Sie mit einer Beratung.", title_fr: "Commencez par une consultation.", title_it: "Inizia con una consulenza.", title_es: "Empieza con una consulta.", title_nl: "Begin met een consult.", title_pl: "Zacznij od konsultacji.", title_pt: "Começa com uma consulta.", title_sv: "Börja med en konsultation.", title_sq: "Filloni me një konsultë.",
    sub_en: "No obligation, no pressure. A proper assessment and an honest plan. Real-time availability and instant confirmation.",
    cta_en: "Book a consultation",
    cta_el: "Κλείστε ραντεβού", cta_de: "Beratung buchen", cta_fr: "Prendre rendez-vous", cta_it: "Prenota una consulenza", cta_es: "Reservar una consulta", cta_nl: "Boek een consult", cta_pl: "Umów konsultację", cta_pt: "Marcar uma consulta", cta_sv: "Boka en konsultation", cta_sq: "Rezervo një konsultë",
  });
  return (
    <section className="relative bg-[var(--t4-ink)] px-6 py-24 lg:py-28">
      <EditPencil section="t4_cta" />
      <div className="mx-auto grid max-w-7xl gap-x-10 gap-y-8 lg:grid-cols-12">
        <div className="lg:col-span-3">
          <span className="inline-flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--t4-blue-deep)]">
            <span className="h-px w-8 bg-[var(--t4-blue-deep)]" />
            {c.eyebrow_en}
          </span>
        </div>
        <div className="lg:col-span-8 lg:col-start-5">
          <Reveal>
            <h2 className="font-serif text-3xl font-semibold leading-[1.06] tracking-tight text-[var(--t4-bg)] sm:text-5xl">
              {c.title_en}
            </h2>
          </Reveal>
          <Reveal delay={0.08}>
            <p className="mt-4 max-w-lg leading-relaxed text-[var(--t4-on-ink-soft)]">{c.sub_en}</p>
          </Reveal>
          <Reveal delay={0.14}>
            <Link
              href="/book"
              className="mt-7 inline-block rounded-lg bg-[var(--t4-blue)] px-8 py-4 text-sm font-semibold tracking-tight text-white transition-colors duration-200 hover:bg-[var(--t4-blue-deep)]"
            >
              {c.cta_en}
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ── about page sections ─────────────────────────────────────────────── */

export function T4AboutStory() {
  const c = useSection("t4_about_story", {
    title_en: "Founded on a quieter idea of aesthetics.",
    p1_en: "This clinic opened because its founder, a doctor, was tired of seeing aesthetics done badly: oversold, overdone, and detached from medicine.",
    p2_en: "The clinic runs on the opposite principle. Every consultation is with a doctor, every plan is honest, and the goal is always a result that looks like you, not like a treatment.",
    image: U("1556228578-8c89e6adf883"),
  });
  return (
    <section className="relative border-b border-[var(--t4-border)] px-6 py-24">
      <EditPencil section="t4_about_story" />
      <div className="mx-auto grid max-w-7xl gap-x-10 gap-y-10 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <Reveal>
            <h2 className="font-serif text-3xl font-semibold leading-tight tracking-tight text-[var(--t4-ink)] sm:text-4xl">
              {c.title_en}
            </h2>
          </Reveal>
        </div>
        <div className="lg:col-span-6 lg:col-start-7">
          <Reveal delay={0.06}>
            <Frame src={c.image} alt={c.title_en} className="aspect-[16/9] w-full" />
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-6 leading-relaxed text-[var(--t4-muted)]">{c.p1_en}</p>
          </Reveal>
          <Reveal delay={0.14}>
            <p className="mt-4 leading-relaxed text-[var(--t4-muted)]">{c.p2_en}</p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

export function T4AboutValues() {
  const c = useSection("t4_about_values", {
    eyebrow_en: "What we hold to",
    title_en: "Three standards, never bent.",
    items: [
      { title_en: "Medical", desc_en: "A doctor leads every consultation and every treatment. No exceptions." },
      { title_en: "Conservative", desc_en: "We treat less than you expect, and tell you why. Subtle is the point." },
      { title_en: "Transparent", desc_en: "Clear pricing, clear risks, clear aftercare. Decided before anything begins." },
    ],
  });
  const items = (c.items as Array<{ title_en: string; desc_en: string }>) ?? [];
  return (
    <Block section="t4_about_values" num="—" eyebrow={c.eyebrow_en} title={c.title_en}>
      <div className="border-t border-[var(--t4-border)]">
        {items.map((v, i) => (
          <Reveal key={i} delay={i * 0.07}>
            <div className="grid grid-cols-[auto_1fr] gap-6 border-b border-[var(--t4-border)] py-6">
              <span className="font-serif text-3xl font-semibold leading-none text-[var(--t4-blue)]/30">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="font-serif text-lg font-semibold text-[var(--t4-ink)]">{v.title_en}</h3>
                <p className="mt-1.5 leading-relaxed text-[var(--t4-muted)]">{v.desc_en}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </Block>
  );
}

/* ── shop page ───────────────────────────────────────────────────────── */

export function T4Shop() {
  const c = useSection("t4_shop", {
    items: [
      { name_en: "Vitamin C serum", desc_en: "A stable, medical-grade antioxidant for brighter, protected skin.", price: 58, photo: U("1591343395082-e120087004b4") },
      { name_en: "SPF 50 fluid", desc_en: "Daily broad-spectrum protection that wears beautifully under makeup.", price: 34, photo: U("1604881988758-f76ad2f7aac1") },
      { name_en: "Retinal night serum", desc_en: "A gentle, effective retinoid for smoother texture over time.", price: 64, photo: U("1610631066894-62452ccb927c") },
      { name_en: "Gentle cleanser", desc_en: "A pH-balanced cleanser that respects the skin barrier.", price: 28, photo: U("1515377905703-c4788e51af15") },
      { name_en: "Barrier repair cream", desc_en: "Ceramide-rich moisture for compromised or post-treatment skin.", price: 46, photo: U("1633933358116-a27b902fad35") },
      { name_en: "Skincare gift card", desc_en: "Let them choose. Redeemable on any product or treatment.", price: 75, photo: U("1542848284-8afa78a08ccb") },
    ],
  });
  const items =
    (c.items as Array<{ name_en: string; desc_en: string; price: number; photo: string }>) ?? [];
  return (
    <section className="relative px-6 py-24">
      <EditPencil section="t4_shop" />
      <div className="mx-auto grid max-w-7xl gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((p, i) => (
          <Reveal key={i} delay={(i % 3) * 0.07}>
            <article className="group flex h-full flex-col border border-[var(--t4-border)] bg-[var(--t4-card)] transition-colors duration-200 hover:border-[var(--t4-border-strong)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.photo} alt={p.name_en} loading="lazy" className="aspect-[4/3] w-full object-cover" />
              <div className="flex flex-1 flex-col p-6">
                <h2 className="font-serif text-lg font-semibold text-[var(--t4-ink)]">{p.name_en}</h2>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--t4-muted)]">{p.desc_en}</p>
                <div className="mt-5 flex items-center justify-between border-t border-[var(--t4-border)] pt-4">
                  <span className="font-serif text-base font-semibold text-[var(--t4-ink)]">£{p.price}</span>
                  <Link
                    href="/cart"
                    className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--t4-blue)]"
                  >
                    Add to bag →
                  </Link>
                </div>
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ── blog page ───────────────────────────────────────────────────────── */

export function T4Blog() {
  const c = useSection("t4_blog", {
    items: [
      { cat_en: "Guides", date_en: "May 2026", title_en: "What to expect from your first consultation", excerpt_en: "A walk through the assessment, the questions we ask, and why we never treat on the first promise.", photo: U("1519823551278-64ac92734fb1") },
      { cat_en: "Treatments", date_en: "April 2026", title_en: "Anti-wrinkle treatment: an honest guide", excerpt_en: "What it does, what it does not, and how to spot conservative, well-judged dosing.", photo: U("1512290923902-8a9f81dc236c") },
      { cat_en: "Skincare", date_en: "March 2026", title_en: "How to read a skincare label", excerpt_en: "The actives worth paying for, the claims worth ignoring, and a simple routine that works.", photo: U("1591343395082-e120087004b4") },
    ],
  });
  const posts =
    (c.items as Array<{ cat_en: string; date_en: string; title_en: string; excerpt_en: string; photo: string }>) ??
    [];
  return (
    <section className="relative px-6 py-24">
      <EditPencil section="t4_blog" />
      <div className="mx-auto max-w-7xl border-t border-[var(--t4-border)]">
        {posts.map((p, i) => (
          <Reveal key={i} delay={(i % 3) * 0.07}>
            <article className="group grid grid-cols-[auto_1fr] items-center gap-6 border-b border-[var(--t4-border)] py-7 sm:grid-cols-[auto_1fr_auto] sm:gap-10">
              <span className="font-serif text-sm font-semibold text-[var(--t4-blue)]/50">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--t4-blue)]">
                  {p.cat_en}
                  <span className="text-[var(--t4-muted2)]">· {p.date_en}</span>
                </div>
                <h2 className="font-serif mt-2 text-xl font-semibold leading-snug text-[var(--t4-ink)] sm:text-2xl">
                  {p.title_en}
                </h2>
                <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-[var(--t4-muted)]">
                  {p.excerpt_en}
                </p>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.photo}
                alt={p.title_en}
                loading="lazy"
                className="hidden h-28 w-44 border border-[var(--t4-border)] object-cover sm:block"
              />
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ── contact page ────────────────────────────────────────────────────── */

export function T4Contact() {
  const c = useSection("t4_contact", {
    details: [
      { label_en: "Clinic", value_en: "Your clinic address" },
      { label_en: "Phone", value_en: "+44 20 0000 0000" },
      { label_en: "Email", value_en: "hello@yourclinic.example" },
      { label_en: "Instagram", value_en: "@yourclinic" },
    ],
    hours: [
      { label_en: "Monday", value_en: "09:00 – 18:00" },
      { label_en: "Tuesday", value_en: "09:00 – 18:00" },
      { label_en: "Wednesday", value_en: "09:00 – 20:00" },
      { label_en: "Thursday", value_en: "09:00 – 20:00" },
      { label_en: "Friday", value_en: "09:00 – 18:00" },
      { label_en: "Saturday", value_en: "10:00 – 16:00" },
      { label_en: "Sunday", value_en: "Closed" },
    ],
  });
  const details = (c.details as Array<{ label_en: string; value_en: string }>) ?? [];
  const hours = (c.hours as Array<{ label_en: string; value_en: string }>) ?? [];
  return (
    <section className="relative px-6 py-24">
      <EditPencil section="t4_contact" />
      <div className="mx-auto grid max-w-7xl gap-x-10 gap-y-12 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <h2 className="font-serif text-xl font-semibold text-[var(--t4-ink)]">The clinic</h2>
          <dl className="mt-5 border-t border-[var(--t4-border)]">
            {details.map((d, i) => (
              <div
                key={i}
                className="flex items-baseline justify-between gap-6 border-b border-[var(--t4-border)] py-4"
              >
                <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--t4-blue)]">
                  {d.label_en}
                </dt>
                <dd className="text-right text-sm text-[var(--t4-ink)]">{d.value_en}</dd>
              </div>
            ))}
          </dl>
          <Link
            href="/book"
            className="mt-7 inline-block rounded-lg bg-[var(--t4-blue)] px-6 py-3 text-sm font-semibold tracking-tight text-white transition-colors duration-200 hover:bg-[var(--t4-blue-deep)]"
          >
            Book a consultation
          </Link>
        </div>
        <div className="lg:col-span-5 lg:col-start-8">
          <h2 className="font-serif text-xl font-semibold text-[var(--t4-ink)]">Opening hours</h2>
          <ul className="mt-5 border-t border-[var(--t4-border)]">
            {hours.map((h, i) => (
              <li
                key={i}
                className="flex items-center justify-between border-b border-[var(--t4-border)] py-4 text-sm"
              >
                <span className="text-[var(--t4-muted)]">{h.label_en}</span>
                <span className="text-[var(--t4-ink)]">{h.value_en}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
