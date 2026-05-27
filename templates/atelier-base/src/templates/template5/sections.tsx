"use client";

/**
 * template5 — yoga / movement studio front-end ("Marigold").
 *
 * Design DNA, deliberately unlike the other four skins: a paper collage. Where
 * template4 is a ruled dossier and template3 is a row of clean arches, this is
 * a pinboard. Photos are "pasted" cards with thick ink outlines, flat offset
 * shadows and small rotations, held down by strips of tape. Section labels are
 * rotated stickers. Hand-drawn doodles (suns, sparkles, squiggles) are
 * scattered into the margins, a faint paper grain sits over everything, and a
 * tilted marquee runs across the page. Headlines clash a bold display sans
 * (Bricolage Grotesque) with a Fraunces italic accent dropped into a marigold
 * highlight box. Warm, sun-baked palette. Every section is editable through
 * useSection().
 */

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { useSection } from "@/lib/editorClient";
import EditPencil from "../../app/components/EditPencil";
import { T5_CSS } from "./theme";

export const U = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=1280&q=80&auto=format&fit=crop`;

export function T5Style() {
  return <style dangerouslySetInnerHTML={{ __html: T5_CSS }} />;
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
      className={`t5-rise${className ? ` ${className}` : ""}`}
      style={{ animationDelay: `${delay}s` }}
    >
      {children}
    </div>
  );
}

/** A faint paper-grain wash, dropped behind a section's content. */
function Grain() {
  return <div aria-hidden className="t5-grain pointer-events-none absolute inset-0 opacity-[0.05]" />;
}

/** Hand-drawn margin marks. Inherit `currentColor`, so colour them with text-*. */
export function Doodle({
  kind,
  className = "",
  style,
  spin = false,
}: {
  kind: "star" | "sun" | "squiggle" | "asterisk" | "arrow";
  className?: string;
  style?: CSSProperties;
  spin?: boolean;
}) {
  const props = {
    viewBox: "0 0 24 24",
    "aria-hidden": true,
    className: `pointer-events-none ${spin ? "t5-spin " : ""}${className}`,
    style,
  } as const;
  if (kind === "star")
    return (
      <svg {...props} fill="currentColor">
        <path d="M12 0c.6 6.3 5.7 11.4 12 12-6.3.6-11.4 5.7-12 12-.6-6.3-5.7-11.4-12-12C6.3 11.4 11.4 6.3 12 0Z" />
      </svg>
    );
  if (kind === "sun")
    return (
      <svg {...props} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
        <circle cx="12" cy="12" r="4.3" fill="currentColor" stroke="none" />
        <path d="M12 1.4v3.1M12 19.5v3.1M1.4 12h3.1M19.5 12h3.1M4.4 4.4l2.2 2.2M17.4 17.4l2.2 2.2M19.6 4.4l-2.2 2.2M6.6 17.4l-2.2 2.2" />
      </svg>
    );
  if (kind === "squiggle")
    return (
      <svg {...props} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M1 9c3-6 6 6 9.5 0S17 3 20 9s3-3 3-3" />
      </svg>
    );
  if (kind === "asterisk")
    return (
      <svg {...props} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        <path d="M12 3v18M3.4 7.5l17.2 9M20.6 7.5L3.4 16.5" />
      </svg>
    );
  return (
    <svg {...props} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 7c7-3 14 1 17 9M19 16l.9-5.4M19 16l-5.3 1.2" />
    </svg>
  );
}

/** A translucent strip of tape, placed absolutely by the caller. */
export function Tape({ className = "", rotate = -5 }: { className?: string; rotate?: number }) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute h-7 w-24 ${className}`}
      style={{
        transform: `rotate(${rotate}deg)`,
        background: "color-mix(in srgb, var(--t5-card) 60%, transparent)",
        boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--t5-ink) 10%, transparent)",
      }}
    />
  );
}

type Tone = "marigold" | "olive" | "clay" | "rose" | "ink" | "paper";
const TONES: Tone[] = ["marigold", "olive", "clay", "rose"];

/** A rotated, pill-shaped sticker. The collage's recurring label unit. */
export function Sticker({
  children,
  tone = "marigold",
  rotate = -3,
  className = "",
}: {
  children: ReactNode;
  tone?: Tone;
  rotate?: number;
  className?: string;
}) {
  const bg = tone === "paper" ? "var(--t5-card)" : `var(--t5-${tone})`;
  const fg = tone === "ink" ? "var(--t5-paper)" : tone === "paper" ? "var(--t5-ink)" : "#241a0e";
  return (
    <span
      className={`inline-block rounded-full px-3.5 py-1.5 text-[10.5px] font-extrabold uppercase tracking-[0.13em] ${className}`}
      style={{
        transform: `rotate(${rotate}deg)`,
        background: bg,
        color: fg,
        border: "2px solid var(--t5-ink)",
        boxShadow: "2.5px 3px 0 var(--t5-ink)",
      }}
    >
      {children}
    </span>
  );
}

/** A pasted photo: thick ink outline, flat offset shadow, optional tape + tilt. */
export function Photo({
  src,
  alt,
  className = "",
  rotate = 0,
  ratio = "4/5",
  tape = false,
  shadow = "var(--t5-marigold)",
}: {
  src: string;
  alt: string;
  className?: string;
  rotate?: number;
  ratio?: string;
  tape?: boolean;
  shadow?: string;
}) {
  return (
    <figure
      className={`relative ${className}`}
      style={{ transform: rotate ? `rotate(${rotate}deg)` : undefined }}
    >
      <div
        className="relative overflow-hidden"
        style={{
          aspectRatio: ratio,
          border: "2.5px solid var(--t5-ink)",
          boxShadow: `6px 7px 0 ${shadow}`,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} loading="lazy" className="h-full w-full object-cover" />
      </div>
      {tape ? <Tape className="-top-3 left-1/2 -translate-x-1/2" rotate={rotate > 0 ? -7 : 7} /> : null}
    </figure>
  );
}

/** The section kicker: a rotated sticker plus a doodle. */
function Kicker({ children, tone = "marigold" }: { children: ReactNode; tone?: Tone }) {
  return (
    <div className="flex items-center gap-3">
      <Sticker tone={tone} rotate={-3}>
        {children}
      </Sticker>
      <Doodle kind="asterisk" className="h-4 w-4 text-[var(--t5-marigold)]" />
    </div>
  );
}

/** A display headline with a Fraunces-italic accent dropped in a marigold box. */
function Headline({
  pre,
  accent,
  post,
  className = "",
}: {
  pre: string;
  accent: string;
  post: string;
  className?: string;
}) {
  return (
    <h1
      className={`font-bold leading-[0.95] tracking-[-0.03em] text-[var(--t5-ink)] ${className}`}
      style={{ fontSize: "clamp(2.6rem, 8.2vw, 6.4rem)" }}
    >
      {pre}{" "}
      <span
        className="t5-accent t5-mark"
        style={{
          background: "var(--t5-marigold)",
          color: "#241a0e",
          padding: "0.02em 0.2em",
          borderRadius: "4px",
          boxShadow: "3px 3px 0 var(--t5-ink)",
          lineHeight: 1.15,
        }}
      >
        {accent}
      </span>{" "}
      {post}
    </h1>
  );
}

/* ── default data (brand-neutral; the showcase layers a brand back on) ── */

const D_CLASSES = [
  { name_en: "Vinyasa flow", desc_en: "A flowing, breath-led class that builds gentle heat. Options for every body.", level_en: "All levels", price: 16, photo: U("1544161515-4ab6ce6db874") },
  { name_en: "Slow flow", desc_en: "Half the pace, twice the detail. Time to actually feel each shape land.", level_en: "Gentle", price: 16, photo: U("1600334089648-b0d9d3028eb2") },
  { name_en: "Yin & restore", desc_en: "Long, supported holds and deep stillness. The softest hour of your week.", level_en: "All levels", price: 16, photo: U("1540555700478-4be289fbecef") },
  { name_en: "Strong flow", desc_en: "A spirited, sweatier practice for when the body wants to work.", level_en: "Strong", price: 18, photo: U("1620733723572-11c53f73a416") },
  { name_en: "Morning mobility", desc_en: "Wake the joints, free the spine, and start the day a little looser.", level_en: "All levels", price: 14, photo: U("1518611012118-696072aa579a") },
  { name_en: "Beginners course", desc_en: "Four weeks, right from the very beginning. No experience, no pressure.", level_en: "Beginner", price: 60, photo: U("1599901860904-17e6ed7083a0") },
];

const D_GALLERY = [
  { label_en: "The main studio", photo: U("1544161515-4ab6ce6db874") },
  { label_en: "Props & bolsters", photo: U("1591343395082-e120087004b4") },
  { label_en: "The quiet corner", photo: U("1540555700478-4be289fbecef") },
  { label_en: "Morning light", photo: U("1518611012118-696072aa579a") },
  { label_en: "Tea after class", photo: U("1604881988758-f76ad2f7aac1") },
  { label_en: "The garden room", photo: U("1610631066894-62452ccb927c") },
  { label_en: "Mats & blankets", photo: U("1633933358116-a27b902fad35") },
  { label_en: "Reception", photo: U("1556228578-8c89e6adf883") },
  { label_en: "Sunday flow", photo: U("1599901860904-17e6ed7083a0") },
];

const CLASS_SECTION = {
  eyebrow_en: "The timetable",
  eyebrow_el: "Το πρόγραμμα", eyebrow_de: "Der Stundenplan", eyebrow_fr: "Le planning", eyebrow_it: "L'orario", eyebrow_es: "El horario", eyebrow_nl: "Het rooster", eyebrow_pl: "Grafik zajęć", eyebrow_pt: "O horário", eyebrow_sv: "Schemat", eyebrow_sq: "Orari",
  title_en: "Classes for every kind of body.",
  title_el: "Μαθήματα για κάθε σώμα.", title_de: "Kurse für jeden Körper.", title_fr: "Des cours pour tous les corps.", title_it: "Lezioni per ogni tipo di corpo.", title_es: "Clases para todos los cuerpos.", title_nl: "Lessen voor elk lichaam.", title_pl: "Zajęcia dla każdego ciała.", title_pt: "Aulas para todo o tipo de corpo.", title_sv: "Pass för alla kroppar.", title_sq: "Klasa për çdo lloj trupi.",
  text_en: "Six honest styles, capped to a warm and comfortable size. Mats and props are provided, so turn up with nothing but yourself.",
  items: D_CLASSES,
};

const GAL_SECTION = {
  eyebrow_en: "The studio",
  eyebrow_el: "Το στούντιο", eyebrow_de: "Das Studio", eyebrow_fr: "Le studio", eyebrow_it: "Lo studio", eyebrow_es: "El estudio", eyebrow_nl: "De studio", eyebrow_pl: "Studio", eyebrow_pt: "O estúdio", eyebrow_sv: "Studion", eyebrow_sq: "Studioja",
  title_en: "A room that feels like a deep breath.",
  title_el: "Ένας χώρος σαν μια βαθιά ανάσα.", title_de: "Ein Raum wie ein tiefer Atemzug.", title_fr: "Une salle comme une grande respiration.", title_it: "Una sala che sa di respiro profondo.", title_es: "Una sala que se siente como respirar hondo.", title_nl: "Een ruimte als een diepe ademhaling.", title_pl: "Sala, która jest jak głęboki oddech.", title_pt: "Uma sala que sabe a respiração funda.", title_sv: "Ett rum som känns som ett djupt andetag.", title_sq: "Një sallë që ndihet si një frymë e thellë.",
  text_en: "No mirrors, no competition, no perfect bodies on the wall. Just warm light, good props and plenty of space.",
  items: D_GALLERY,
};

/* ── inner-page header ───────────────────────────────────────────────── */

export function T5PageHeader({
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
  // Collage signature: the final word of the title drops into a marigold box.
  const words = String(c.title_en).trim().split(/\s+/).filter(Boolean);
  const last = words.length ? words[words.length - 1] : String(c.title_en);
  const pre = words.slice(0, -1).join(" ");
  return (
    <header className="relative overflow-hidden bg-[var(--t5-paper)] px-6 pt-36 pb-16 sm:pt-44">
      <EditPencil section={section} />
      <Grain />
      <Doodle kind="sun" spin className="absolute right-8 top-28 h-12 w-12 text-[var(--t5-marigold)] opacity-70" />
      <Doodle kind="squiggle" className="absolute left-10 bottom-10 h-8 w-14 text-[var(--t5-olive)]" />
      <Doodle kind="star" className="absolute left-12 top-32 h-6 w-6 text-[var(--t5-clay)]" />
      <div className="relative mx-auto max-w-5xl text-center">
        <Reveal>
          <div className="flex justify-center">
            <Kicker tone="clay">{c.eyebrow_en}</Kicker>
          </div>
        </Reveal>
        <Reveal delay={0.06}>
          <h1
            className="mt-6 font-bold leading-[0.96] tracking-[-0.03em] text-[var(--t5-ink)]"
            style={{ fontSize: "clamp(2.5rem, 7vw, 5.4rem)" }}
          >
            {pre ? `${pre} ` : ""}
            <span
              className="t5-accent t5-mark"
              style={{
                background: "var(--t5-marigold)",
                color: "#241a0e",
                padding: "0.02em 0.2em",
                borderRadius: "4px",
                boxShadow: "3px 3px 0 var(--t5-ink)",
                lineHeight: 1.15,
              }}
            >
              {last}
            </span>
          </h1>
        </Reveal>
        {c.sub_en ? (
          <Reveal delay={0.12}>
            <p className="mx-auto mt-6 max-w-xl leading-relaxed text-[var(--t5-muted)]">
              {c.sub_en}
            </p>
          </Reveal>
        ) : null}
      </div>
    </header>
  );
}

/* ── hero ────────────────────────────────────────────────────────────── */

export function T5Hero() {
  const c = useSection("t5_hero", {
    eyebrow_en: "Yoga & movement studio",
    eyebrow_el: "Στούντιο γιόγκα & κίνησης", eyebrow_de: "Yoga- & Bewegungsstudio", eyebrow_fr: "Studio de yoga & mouvement", eyebrow_it: "Studio di yoga & movimento", eyebrow_es: "Estudio de yoga & movimiento", eyebrow_nl: "Yoga- & bewegingsstudio", eyebrow_pl: "Studio jogi & ruchu", eyebrow_pt: "Estúdio de yoga & movimento", eyebrow_sv: "Yoga- & rörelsestudio", eyebrow_sq: "Studio joga & lëvizjeje",
    title_en: "Move slow,",
    title_el: "Κινήσου αργά,", title_de: "Beweg dich langsam,", title_fr: "Bouge lentement,", title_it: "Muoviti piano,", title_es: "Muévete despacio,", title_nl: "Beweeg traag,", title_pl: "Poruszaj się powoli,", title_pt: "Move-te devagar,", title_sv: "Rör dig långsamt,", title_sq: "Lëviz ngadalë,",
    titleAccent_en: "breathe deep,",
    titleAccent_el: "ανάπνευσε βαθιά,", titleAccent_de: "atme tief,", titleAccent_fr: "respire profond,", titleAccent_it: "respira a fondo,", titleAccent_es: "respira hondo,", titleAccent_nl: "adem diep,", titleAccent_pl: "oddychaj głęboko,", titleAccent_pt: "respira fundo,", titleAccent_sv: "andas djupt,", titleAccent_sq: "merr frymë thellë,",
    titleEnd_en: "take up space.",
    titleEnd_el: "πιάσε τον χώρο σου.", titleEnd_de: "nimm dir Raum.", titleEnd_fr: "prends ta place.", titleEnd_it: "prenditi spazio.", titleEnd_es: "ocupa tu espacio.", titleEnd_nl: "neem ruimte in.", titleEnd_pl: "zajmij swoją przestrzeń.", titleEnd_pt: "ocupa o teu espaço.", titleEnd_sv: "ta plats.", titleEnd_sq: "zër hapësirën tënde.",
    sub_en: "A warm, unintimidating yoga studio for every body and every level. Roll out a mat, slow right down, and book your first class online.",
    primaryCta_en: "Book a class",
    primaryCta_el: "Κλείσε μάθημα", primaryCta_de: "Kurs buchen", primaryCta_fr: "Réserver un cours", primaryCta_it: "Prenota una lezione", primaryCta_es: "Reservar una clase", primaryCta_nl: "Boek een les", primaryCta_pl: "Zarezerwuj zajęcia", primaryCta_pt: "Marcar uma aula", primaryCta_sv: "Boka ett pass", primaryCta_sq: "Rezervo një klasë",
    secondaryCta_en: "See the timetable",
    secondaryCta_el: "Δες το πρόγραμμα", secondaryCta_de: "Stundenplan ansehen", secondaryCta_fr: "Voir le planning", secondaryCta_it: "Vedi l'orario", secondaryCta_es: "Ver el horario", secondaryCta_nl: "Bekijk het rooster", secondaryCta_pl: "Zobacz grafik", secondaryCta_pt: "Ver o horário", secondaryCta_sv: "Se schemat", secondaryCta_sq: "Shih orarin",
    note_en: "No experience needed. Ever.",
    note_el: "Καμία εμπειρία απαραίτητη. Ποτέ.", note_de: "Keine Erfahrung nötig. Nie.", note_fr: "Aucune expérience requise. Jamais.", note_it: "Nessuna esperienza richiesta. Mai.", note_es: "Sin experiencia previa. Nunca.", note_nl: "Geen ervaring nodig. Nooit.", note_pl: "Bez doświadczenia. Nigdy.", note_pt: "Sem experiência. Nunca.", note_sv: "Ingen erfarenhet krävs. Aldrig.", note_sq: "Pa përvojë. Kurrë.",
    badge_en: "30+ classes a week",
    badge_el: "30+ μαθήματα την εβδομάδα", badge_de: "30+ Kurse pro Woche", badge_fr: "30+ cours par semaine", badge_it: "30+ lezioni a settimana", badge_es: "30+ clases por semana", badge_nl: "30+ lessen per week", badge_pl: "30+ zajęć tygodniowo", badge_pt: "30+ aulas por semana", badge_sv: "30+ pass i veckan", badge_sq: "30+ klasa në javë",
    sticker_en: "Drop-ins welcome",
    sticker_el: "Χωρίς κράτηση ευπρόσδεκτοι", sticker_de: "Auch ohne Anmeldung", sticker_fr: "Sans réservation bienvenus", sticker_it: "Anche senza prenotazione", sticker_es: "Sin reserva también", sticker_nl: "Inloop welkom", sticker_pl: "Bez zapisów mile widziani", sticker_pt: "Sem marcação também", sticker_sv: "Drop-in välkomna", sticker_sq: "Pa rezervim të mirëpritur",
    image1: U("1544161515-4ab6ce6db874"),
    image2: U("1540555700478-4be289fbecef"),
    image3: U("1518611012118-696072aa579a"),
  });
  return (
    <section className="relative overflow-hidden bg-[var(--t5-paper)] pt-32 pb-20">
      <EditPencil section="t5_hero" />
      <Grain />
      <Doodle kind="sun" spin className="absolute -right-4 top-24 h-20 w-20 text-[var(--t5-marigold)] opacity-80 sm:right-10" />
      <Doodle kind="star" className="absolute left-6 top-40 h-7 w-7 text-[var(--t5-clay)]" />
      <div className="relative mx-auto max-w-7xl px-6">
        <Reveal>
          <Kicker>{c.eyebrow_en}</Kicker>
        </Reveal>
        <Reveal delay={0.07}>
          <Headline
            pre={c.title_en}
            accent={c.titleAccent_en}
            post={c.titleEnd_en}
            className="mt-7 max-w-[14ch]"
          />
        </Reveal>

        <div className="mt-12 grid items-start gap-x-10 gap-y-12 lg:grid-cols-12">
          {/* left — the pitch */}
          <Reveal delay={0.12} className="lg:col-span-5">
            <p className="max-w-md text-lg leading-relaxed text-[var(--t5-muted)]">{c.sub_en}</p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href="/book"
                className="inline-block bg-[var(--t5-marigold)] px-7 py-3.5 text-sm font-extrabold uppercase tracking-wide text-[#241a0e] transition-transform duration-150 hover:-translate-y-0.5"
                style={{ border: "2.5px solid var(--t5-ink)", boxShadow: "5px 5px 0 var(--t5-ink)" }}
              >
                {c.primaryCta_en}
              </Link>
              <Link
                href="/services"
                className="inline-block px-6 py-3.5 text-sm font-extrabold uppercase tracking-wide text-[var(--t5-ink)] transition-colors duration-150 hover:bg-[var(--t5-card)]"
                style={{ border: "2.5px solid var(--t5-ink)" }}
              >
                {c.secondaryCta_en}
              </Link>
            </div>
            <div className="mt-6 flex items-center gap-2.5">
              <Doodle kind="arrow" className="h-5 w-5 text-[var(--t5-olive)]" />
              <span className="t5-accent text-base text-[var(--t5-muted)]">{c.note_en}</span>
            </div>
          </Reveal>

          {/* right — the photo collage */}
          <div className="lg:col-span-7">
            <Reveal delay={0.16}>
              <div className="relative mx-auto aspect-[5/4] w-full max-w-[40rem]">
                <Photo
                  src={c.image1}
                  alt=""
                  className="absolute left-0 top-[6%] w-[58%]"
                  rotate={-5}
                  ratio="4/5"
                  tape
                  shadow="var(--t5-olive)"
                />
                <Photo
                  src={c.image2}
                  alt=""
                  className="absolute right-0 top-0 w-[46%]"
                  rotate={6}
                  ratio="1/1"
                  shadow="var(--t5-clay)"
                />
                <Photo
                  src={c.image3}
                  alt=""
                  className="absolute bottom-0 left-[26%] w-[44%]"
                  rotate={-9}
                  ratio="5/4"
                  tape
                  shadow="var(--t5-marigold)"
                />
                <div className="absolute -right-1 top-[44%]">
                  <Sticker tone="ink" rotate={11}>
                    {c.badge_en}
                  </Sticker>
                </div>
                <div className="absolute -left-2 bottom-[16%]">
                  <Sticker tone="rose" rotate={-12}>
                    {c.sticker_en}
                  </Sticker>
                </div>
                <Doodle kind="star" className="absolute right-[14%] top-[2%] h-6 w-6 text-[var(--t5-marigold)]" />
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── marquee ─────────────────────────────────────────────────────────── */

export function T5Marquee() {
  const c = useSection("t5_marquee", {
    items: [
      { label_en: "All levels welcome" },
      { label_en: "Mats provided" },
      { label_en: "Drop-ins welcome" },
      { label_en: "Small, warm classes" },
      { label_en: "No mirrors" },
      { label_en: "Come as you are" },
    ],
  });
  const items = (c.items as Array<{ label_en: string }>) ?? [];
  const run = [...items, ...items];
  return (
    <section className="relative -my-2 overflow-hidden">
      <EditPencil section="t5_marquee" />
      <div
        className="border-y-2 border-[var(--t5-ink)] bg-[var(--t5-ink)] py-3.5"
        style={{ transform: "rotate(-1.6deg) scale(1.04)" }}
      >
        <div className="t5-marq flex w-max gap-8" aria-hidden>
          {run.map((m, i) => (
            <span key={i} className="flex items-center gap-8">
              <span className="text-sm font-extrabold uppercase tracking-[0.14em] text-[var(--t5-paper)]">
                {m.label_en}
              </span>
              <Doodle kind="star" className="h-4 w-4 shrink-0 text-[var(--t5-marigold)]" />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── stats ───────────────────────────────────────────────────────────── */

export function T5Stats() {
  const c = useSection("t5_stats", {
    items: [
      { value: "30+", label_en: "Classes a week" },
      { value: "6", label_en: "Class styles" },
      { value: "4.9", label_en: "Studio rating" },
      { value: "All", label_en: "Levels welcome" },
    ],
  });
  const items = (c.items as Array<{ value: string; label_en: string }>) ?? [];
  return (
    <section className="relative bg-[var(--t5-paper)] px-6 py-16">
      <EditPencil section="t5_stats" />
      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-5 sm:grid-cols-4">
        {items.map((s, i) => {
          const tone = TONES[i % TONES.length];
          return (
            <Reveal key={i} delay={(i % 4) * 0.06}>
              <div
                className="relative bg-[var(--t5-card)] px-4 py-7 text-center"
                style={{
                  transform: `rotate(${[-3, 2, -2, 3][i % 4]}deg)`,
                  border: "2.5px solid var(--t5-ink)",
                  boxShadow: `5px 6px 0 var(--t5-${tone})`,
                }}
              >
                <Tape className="-top-3 left-1/2 -translate-x-1/2" rotate={i % 2 ? 8 : -8} />
                <div
                  className="font-bold leading-none text-[var(--t5-ink)]"
                  style={{ fontSize: "clamp(2.2rem,5vw,3rem)", fontFamily: "var(--font-bricolage), system-ui, sans-serif" }}
                >
                  {s.value}
                </div>
                <div className="mt-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[var(--t5-muted2)]">
                  {s.label_en}
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

/* ── classes (the menu) ──────────────────────────────────────────────── */

/** The class grid, reused on the home + services pages. */
export function T5ClassList() {
  const c = useSection("t5_classes", CLASS_SECTION);
  const items =
    (c.items as Array<{ name_en: string; desc_en: string; level_en: string; price: number; photo: string }>) ??
    D_CLASSES;
  return (
    <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2">
      {items.map((t, i) => {
        const tone = TONES[i % TONES.length];
        const rot = [-2.5, 2, -1.5, 2.5, -2, 1.5][i % 6];
        return (
          <Reveal key={i} delay={(i % 2) * 0.07}>
            <Link href="/book" className="group block">
              <article
                className="relative h-full bg-[var(--t5-card)] p-4 transition-transform duration-150 group-hover:-translate-y-1"
                style={{
                  transform: `rotate(${rot}deg)`,
                  border: "2.5px solid var(--t5-ink)",
                  boxShadow: `7px 8px 0 var(--t5-${tone})`,
                }}
              >
                <div className="relative overflow-hidden" style={{ border: "2px solid var(--t5-ink)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={t.photo}
                    alt={t.name_en}
                    loading="lazy"
                    className="aspect-[16/10] w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                  />
                  <div className="absolute left-2.5 top-2.5">
                    <Sticker tone={tone} rotate={-4}>
                      {t.level_en}
                    </Sticker>
                  </div>
                </div>
                <div className="mt-4 flex items-start justify-between gap-4">
                  <h3 className="font-bold leading-tight tracking-tight text-[var(--t5-ink)]" style={{ fontSize: "1.35rem" }}>
                    {t.name_en}
                  </h3>
                  <span className="t5-accent shrink-0 text-xl text-[var(--t5-marigold-deep)]">
                    <span className="text-xs font-sans font-bold uppercase text-[var(--t5-muted2)]">from </span>
                    £{t.price}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-[var(--t5-muted)]">{t.desc_en}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-[var(--t5-ink)]">
                  Book this class
                  <Doodle kind="arrow" className="h-4 w-4 text-[var(--t5-marigold-deep)] transition-transform duration-150 group-hover:translate-x-1" />
                </span>
              </article>
            </Link>
          </Reveal>
        );
      })}
    </div>
  );
}

export function T5Classes() {
  const c = useSection("t5_classes", CLASS_SECTION);
  return (
    <section className="relative bg-[var(--t5-card)] px-6 py-24">
      <EditPencil section="t5_classes" />
      <Grain />
      <Doodle kind="squiggle" className="absolute right-12 top-16 h-9 w-16 text-[var(--t5-clay)]" />
      <div className="relative mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <Reveal>
            <Kicker tone="olive">{c.eyebrow_en}</Kicker>
          </Reveal>
          <Reveal delay={0.06}>
            <h2 className="mt-5 font-bold leading-[1.02] tracking-[-0.02em] text-[var(--t5-ink)]" style={{ fontSize: "clamp(2rem,4.4vw,3.2rem)" }}>
              {c.title_en}
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-4 leading-relaxed text-[var(--t5-muted)]">{c.text_en}</p>
          </Reveal>
        </div>
        <div className="mt-14">
          <T5ClassList />
        </div>
      </div>
    </section>
  );
}

/* ── schedule (your first class) ─────────────────────────────────────── */

export function T5Schedule() {
  const c = useSection("t5_schedule", {
    eyebrow_en: "Your first class",
    eyebrow_el: "Το πρώτο σου μάθημα", eyebrow_de: "Dein erster Kurs", eyebrow_fr: "Votre premier cours", eyebrow_it: "La tua prima lezione", eyebrow_es: "Tu primera clase", eyebrow_nl: "Je eerste les", eyebrow_pl: "Twoje pierwsze zajęcia", eyebrow_pt: "A tua primeira aula", eyebrow_sv: "Ditt första pass", eyebrow_sq: "Klasa juaj e parë",
    title_en: "Nervous? Here is the whole plan.",
    title_el: "Άγχος; Να ολόκληρο το πλάνο.", title_de: "Nervös? Hier ist der ganze Ablauf.", title_fr: "Stressé ? Voici tout le déroulé.", title_it: "Nervosa? Ecco tutto il piano.", title_es: "¿Nerviosa? Aquí está todo el plan.", title_nl: "Zenuwachtig? Dit is het hele plan.", title_pl: "Zdenerwowana? Oto cały plan.", title_pt: "Nervosa? Aqui está o plano todo.", title_sv: "Nervös? Här är hela planen.", title_sq: "Nervoz? Ja i gjithë plani.",
    items: [
      { title_en: "Pick a class", desc_en: "Browse the timetable and book the style and time that suits you. All-levels classes are a lovely place to start." },
      { title_en: "Come as you are", desc_en: "Arrive ten minutes early, leave your shoes at the door, and grab a mat. We will show you where everything lives." },
      { title_en: "Breathe and unwind", desc_en: "Move at your own pace. Every shape has an option, and resting is always allowed. That is the whole secret." },
    ],
  });
  const items = (c.items as Array<{ title_en: string; desc_en: string }>) ?? [];
  return (
    <section className="relative bg-[var(--t5-paper)] px-6 py-24">
      <EditPencil section="t5_schedule" />
      <Grain />
      <div className="relative mx-auto max-w-6xl">
        <Reveal>
          <Kicker tone="clay">{c.eyebrow_en}</Kicker>
        </Reveal>
        <Reveal delay={0.06}>
          <h2 className="mt-5 max-w-2xl font-bold leading-[1.02] tracking-[-0.02em] text-[var(--t5-ink)]" style={{ fontSize: "clamp(2rem,4.4vw,3.2rem)" }}>
            {c.title_en}
          </h2>
        </Reveal>
        <div className="mt-14 grid gap-10 sm:grid-cols-3">
          {items.map((s, i) => {
            const tone = TONES[i % TONES.length];
            return (
              <Reveal key={i} delay={i * 0.09}>
                <div className="relative">
                  <div
                    className="relative h-full bg-[var(--t5-card)] p-6 pt-9"
                    style={{
                      transform: `rotate(${[-2.5, 1.5, -1.5][i % 3]}deg)`,
                      border: "2.5px solid var(--t5-ink)",
                      boxShadow: `6px 7px 0 var(--t5-${tone})`,
                    }}
                  >
                    <div
                      className="absolute -left-3 -top-5 flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-[#241a0e]"
                      style={{ background: `var(--t5-${tone})`, border: "2.5px solid var(--t5-ink)", transform: "rotate(-8deg)" }}
                    >
                      {i + 1}
                    </div>
                    <h3 className="font-bold tracking-tight text-[var(--t5-ink)]" style={{ fontSize: "1.3rem" }}>
                      {s.title_en}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--t5-muted)]">{s.desc_en}</p>
                  </div>
                  {i < items.length - 1 ? (
                    <Doodle
                      kind="arrow"
                      className="absolute -right-6 top-1/2 hidden h-8 w-8 -translate-y-1/2 text-[var(--t5-marigold)] sm:block"
                    />
                  ) : null}
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ── gallery ─────────────────────────────────────────────────────────── */

export function T5GalleryCluster({ items }: { items: Array<{ label_en: string; photo: string }> }) {
  return (
    <div className="columns-2 gap-5 sm:columns-3 [&>*]:mb-5">
      {items.map((g, i) => {
        const tone = TONES[i % TONES.length];
        const rot = [-3, 2.5, -1.5, 3, -2.5, 1.5, -2, 2, -3][i % 9];
        return (
          <Reveal key={i} delay={(i % 3) * 0.06}>
            <figure
              className="relative bg-[var(--t5-card)] p-2.5"
              style={{
                transform: `rotate(${rot}deg)`,
                border: "2.5px solid var(--t5-ink)",
                boxShadow: `5px 6px 0 var(--t5-${tone})`,
              }}
            >
              <Tape className="-top-3 left-6" rotate={i % 2 ? 9 : -9} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={g.photo}
                alt={g.label_en}
                loading="lazy"
                className="w-full object-cover"
                style={{ border: "2px solid var(--t5-ink)", aspectRatio: i % 3 === 1 ? "3/4" : "1/1" }}
              />
              <figcaption className="t5-accent mt-2 text-center text-base text-[var(--t5-muted)]">
                {g.label_en}
              </figcaption>
            </figure>
          </Reveal>
        );
      })}
    </div>
  );
}

export function T5Gallery() {
  const c = useSection("t5_gallery", GAL_SECTION);
  const items = (c.items as Array<{ label_en: string; photo: string }>) ?? D_GALLERY;
  return (
    <section className="relative bg-[var(--t5-card)] px-6 py-24">
      <EditPencil section="t5_gallery" />
      <Grain />
      <Doodle kind="sun" spin className="absolute left-10 top-16 h-11 w-11 text-[var(--t5-marigold)] opacity-70" />
      <div className="relative mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <Reveal>
            <Kicker tone="rose">{c.eyebrow_en}</Kicker>
          </Reveal>
          <Reveal delay={0.06}>
            <h2 className="mt-5 font-bold leading-[1.02] tracking-[-0.02em] text-[var(--t5-ink)]" style={{ fontSize: "clamp(2rem,4.4vw,3.2rem)" }}>
              {c.title_en}
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-4 leading-relaxed text-[var(--t5-muted)]">{c.text_en}</p>
          </Reveal>
        </div>
        <div className="mt-14">
          <T5GalleryCluster items={items.slice(0, 6)} />
        </div>
        <Reveal delay={0.12}>
          <Link
            href="/gallery"
            className="mt-6 inline-flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-[var(--t5-ink)]"
          >
            See the whole studio
            <Doodle kind="arrow" className="h-4 w-4 text-[var(--t5-marigold-deep)]" />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

export function T5GalleryFull() {
  const c = useSection("t5_gallery", GAL_SECTION);
  const items = (c.items as Array<{ label_en: string; photo: string }>) ?? D_GALLERY;
  return (
    <section className="relative bg-[var(--t5-paper)] px-6 py-24">
      <EditPencil section="t5_gallery" />
      <Grain />
      <div className="relative mx-auto max-w-6xl">
        <T5GalleryCluster items={items} />
      </div>
    </section>
  );
}

/* ── teacher ─────────────────────────────────────────────────────────── */

export function T5Teacher() {
  const c = useSection("t5_teacher", {
    eyebrow_en: "Meet your teachers",
    eyebrow_el: "Γνωρίστε τους δασκάλους σας", eyebrow_de: "Lern deine Lehrer kennen", eyebrow_fr: "Rencontrez vos professeurs", eyebrow_it: "Incontra i tuoi insegnanti", eyebrow_es: "Conoce a tus profesores", eyebrow_nl: "Maak kennis met je docenten", eyebrow_pl: "Poznaj swoich nauczycieli", eyebrow_pt: "Conhece os teus professores", eyebrow_sv: "Möt dina lärare", eyebrow_sq: "Njihuni me mësuesit tuaj",
    title_en: "Taught by people who still practise.",
    title_el: "Από ανθρώπους που ακόμη ασκούνται.", title_de: "Unterrichtet von Menschen, die selbst noch üben.", title_fr: "Enseigné par des gens qui pratiquent encore.", title_it: "Insegnato da chi pratica ancora.", title_es: "Impartido por quienes aún practican.", title_nl: "Gegeven door mensen die zelf nog oefenen.", title_pl: "Prowadzą ludzie, którzy wciąż praktykują.", title_pt: "Ensinado por quem ainda pratica.", title_sv: "Lärs ut av människor som själva fortfarande övar.", title_sq: "Mësohet nga njerëz që ende praktikojnë.",
    p1_en: "Our teachers are 500-hour trained, but more importantly they are warm, funny and genuinely glad you came. They teach the room in front of them, not a script.",
    p2_en: "You will be offered options every single class, hands-on or hands-off, harder or softer. Nobody is corrected into a shape. You are trusted to know your own body.",
    cta_en: "Book a class",
    cta_el: "Κλείσε μάθημα", cta_de: "Kurs buchen", cta_fr: "Réserver un cours", cta_it: "Prenota una lezione", cta_es: "Reservar una clase", cta_nl: "Boek een les", cta_pl: "Zarezerwuj zajęcia", cta_pt: "Marcar uma aula", cta_sv: "Boka ett pass", cta_sq: "Rezervo një klasë",
    image: U("1599901860904-17e6ed7083a0"),
    credentials: [
      { label_en: "500-hour trained teachers" },
      { label_en: "Trauma-informed and inclusive" },
      { label_en: "Options for every body, every class" },
    ],
  });
  const creds = (c.credentials as Array<{ label_en: string }>) ?? [];
  return (
    <section className="relative bg-[var(--t5-paper)] px-6 py-24">
      <EditPencil section="t5_teacher" />
      <Grain />
      <Doodle kind="star" className="absolute right-12 top-20 h-8 w-8 text-[var(--t5-clay)]" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-x-14 gap-y-12 lg:grid-cols-2">
        <Reveal>
          <div className="relative mx-auto w-full max-w-sm">
            <Photo src={c.image} alt={c.title_en} rotate={-4} ratio="4/5" tape shadow="var(--t5-olive)" />
            <div className="absolute -bottom-5 -right-3">
              <Sticker tone="marigold" rotate={9}>
                Hello, come in
              </Sticker>
            </div>
          </div>
        </Reveal>
        <div>
          <Reveal>
            <Kicker tone="olive">{c.eyebrow_en}</Kicker>
          </Reveal>
          <Reveal delay={0.06}>
            <h2 className="mt-5 font-bold leading-[1.04] tracking-[-0.02em] text-[var(--t5-ink)]" style={{ fontSize: "clamp(1.9rem,4vw,2.9rem)" }}>
              {c.title_en}
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-4 leading-relaxed text-[var(--t5-muted)]">{c.p1_en}</p>
          </Reveal>
          <Reveal delay={0.13}>
            <p className="mt-3 leading-relaxed text-[var(--t5-muted)]">{c.p2_en}</p>
          </Reveal>
          <Reveal delay={0.16}>
            <ul className="mt-6 space-y-2.5">
              {creds.map((cr, i) => (
                <li key={i} className="flex items-center gap-3 text-sm font-semibold text-[var(--t5-ink)]">
                  <Doodle kind="star" className="h-4 w-4 shrink-0 text-[var(--t5-marigold-deep)]" />
                  {cr.label_en}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={0.19}>
            <Link
              href="/book"
              className="mt-7 inline-block bg-[var(--t5-marigold)] px-7 py-3.5 text-sm font-extrabold uppercase tracking-wide text-[#241a0e] transition-transform duration-150 hover:-translate-y-0.5"
              style={{ border: "2.5px solid var(--t5-ink)", boxShadow: "5px 5px 0 var(--t5-ink)" }}
            >
              {c.cta_en}
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ── why us ──────────────────────────────────────────────────────────── */

export function T5WhyUs() {
  const c = useSection("t5_whyus", {
    eyebrow_en: "Why book with us",
    eyebrow_el: "Γιατί να επιλέξεις εμάς", eyebrow_de: "Warum bei uns buchen", eyebrow_fr: "Pourquoi réserver chez nous", eyebrow_it: "Perché scegliere noi", eyebrow_es: "Por qué reservar con nosotros", eyebrow_nl: "Waarom bij ons boeken", eyebrow_pl: "Dlaczego my", eyebrow_pt: "Porquê marcar connosco", eyebrow_sv: "Varför boka hos oss", eyebrow_sq: "Pse të rezervosh me ne",
    title_en: "A studio that feels like a friend's front room.",
    title_el: "Ένα στούντιο σαν το σαλόνι ενός φίλου.", title_de: "Ein Studio wie das Wohnzimmer einer Freundin.", title_fr: "Un studio comme le salon d'un ami.", title_it: "Uno studio che sa di salotto di un amico.", title_es: "Un estudio que se siente como la sala de un amigo.", title_nl: "Een studio als de huiskamer van een vriend.", title_pl: "Studio jak salon u przyjaciółki.", title_pt: "Um estúdio que sabe à sala de um amigo.", title_sv: "En studio som känns som en väns vardagsrum.", title_sq: "Një studio si dhoma e ndenjes e një shoku.",
    items: [
      { title_en: "Every body welcome", desc_en: "Beginners, stiff hips, total newcomers. Every class has options for wherever you are today." },
      { title_en: "Small, warm classes", desc_en: "Capped numbers, so a teacher can actually see you. Never a crowded, anonymous room." },
      { title_en: "Mats and props provided", desc_en: "Turn up with nothing. Mats, blocks, bolsters and blankets are all here, all freshly cleaned." },
      { title_en: "Drop in or commit", desc_en: "Single classes, class packs or unlimited membership. No contracts, no lock-in, no pressure." },
    ],
  });
  const items = (c.items as Array<{ title_en: string; desc_en: string }>) ?? [];
  const icons: Array<"sun" | "star" | "squiggle" | "asterisk"> = ["sun", "star", "squiggle", "asterisk"];
  return (
    <section className="relative bg-[var(--t5-card)] px-6 py-24">
      <EditPencil section="t5_whyus" />
      <Grain />
      <div className="relative mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <Reveal>
            <Kicker>{c.eyebrow_en}</Kicker>
          </Reveal>
          <Reveal delay={0.06}>
            <h2 className="mt-5 font-bold leading-[1.04] tracking-[-0.02em] text-[var(--t5-ink)]" style={{ fontSize: "clamp(1.9rem,4vw,2.9rem)" }}>
              {c.title_en}
            </h2>
          </Reveal>
        </div>
        <div className="mt-14 grid gap-x-8 gap-y-10 sm:grid-cols-2">
          {items.map((w, i) => {
            const tone = TONES[i % TONES.length];
            return (
              <Reveal key={i} delay={(i % 2) * 0.07}>
                <div
                  className="relative h-full bg-[var(--t5-paper)] p-6"
                  style={{
                    transform: `rotate(${[-2, 1.5, 2, -1.5][i % 4]}deg)`,
                    border: "2.5px solid var(--t5-ink)",
                    boxShadow: `6px 7px 0 var(--t5-${tone})`,
                  }}
                >
                  <span
                    className="inline-flex h-12 w-12 items-center justify-center rounded-full"
                    style={{ background: `var(--t5-${tone})`, border: "2.5px solid var(--t5-ink)" }}
                  >
                    <Doodle kind={icons[i % 4]} className="h-6 w-6 text-[#241a0e]" />
                  </span>
                  <h3 className="mt-4 font-bold tracking-tight text-[var(--t5-ink)]" style={{ fontSize: "1.25rem" }}>
                    {w.title_en}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--t5-muted)]">{w.desc_en}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ── faq ─────────────────────────────────────────────────────────────── */

export function T5Faq() {
  const c = useSection("t5_faq", {
    eyebrow_en: "Good questions",
    eyebrow_el: "Καλές ερωτήσεις", eyebrow_de: "Gute Fragen", eyebrow_fr: "Bonnes questions", eyebrow_it: "Buone domande", eyebrow_es: "Buenas preguntas", eyebrow_nl: "Goede vragen", eyebrow_pl: "Dobre pytania", eyebrow_pt: "Boas perguntas", eyebrow_sv: "Bra frågor", eyebrow_sq: "Pyetje të mira",
    title_en: "The things people always ask.",
    title_el: "Αυτά που ρωτούν πάντα.", title_de: "Was immer gefragt wird.", title_fr: "Les questions qui reviennent toujours.", title_it: "Le domande che fanno tutti.", title_es: "Lo que siempre preguntan.", title_nl: "Wat altijd gevraagd wordt.", title_pl: "O co zawsze pytają.", title_pt: "O que perguntam sempre.", title_sv: "Det som alltid frågas.", title_sq: "Çfarë pyesin gjithmonë.",
    items: [
      { q_en: "I've never done yoga. Can I really come?", a_en: "Absolutely, and you will be in good company. Most classes are all-levels, and our beginners course starts right from the very first breath." },
      { q_en: "What should I bring?", a_en: "Just comfy clothes you can move in, and some water. Mats, blocks, bolsters, blankets and straps are all provided." },
      { q_en: "Do I need to book ahead?", a_en: "Booking is the safest bet, as classes can fill up. Drop-ins are always welcome too, whenever there is a free spot." },
      { q_en: "What if I need to cancel?", a_en: "Cancel up to a couple of hours before and your class credit rolls straight back to you. Life happens, we completely understand." },
    ],
  });
  const items = (c.items as Array<{ q_en: string; a_en: string }>) ?? [];
  return (
    <section className="relative bg-[var(--t5-paper)] px-6 py-24">
      <EditPencil section="t5_faq" />
      <Grain />
      <div className="relative mx-auto max-w-3xl">
        <div className="text-center">
          <Reveal>
            <div className="flex justify-center">
              <Kicker tone="clay">{c.eyebrow_en}</Kicker>
            </div>
          </Reveal>
          <Reveal delay={0.06}>
            <h2 className="mt-5 font-bold leading-[1.04] tracking-[-0.02em] text-[var(--t5-ink)]" style={{ fontSize: "clamp(1.9rem,4vw,2.9rem)" }}>
              {c.title_en}
            </h2>
          </Reveal>
        </div>
        <div className="mt-12 space-y-6">
          {items.map((f, i) => {
            const tone = TONES[i % TONES.length];
            return (
              <Reveal key={i} delay={(i % 2) * 0.06}>
                <div
                  className="bg-[var(--t5-card)] p-6"
                  style={{
                    transform: `rotate(${[-1.4, 1, -1, 1.4][i % 4]}deg)`,
                    border: "2.5px solid var(--t5-ink)",
                    boxShadow: `5px 6px 0 var(--t5-${tone})`,
                  }}
                >
                  <h3 className="flex items-start gap-3 font-bold text-[var(--t5-ink)]" style={{ fontSize: "1.15rem" }}>
                    <span className="t5-accent shrink-0 text-2xl text-[var(--t5-marigold-deep)]">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {f.q_en}
                  </h3>
                  <p className="mt-2 pl-9 text-sm leading-relaxed text-[var(--t5-muted)]">{f.a_en}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ── testimonial ─────────────────────────────────────────────────────── */

export function T5Testimonial() {
  const c = useSection("t5_testimonial", {
    quote_en: "I walked in convinced I was too inflexible and too old for yoga. A year on, it is the hour of the week I protect the hardest. Nobody here ever makes you feel like a beginner.",
    name_en: "Priya M.",
    detail_en: "Member since 2025",
  });
  return (
    <section className="relative overflow-hidden bg-[var(--t5-card)] px-6 py-28">
      <EditPencil section="t5_testimonial" />
      <Grain />
      <Doodle kind="sun" spin className="absolute -left-6 bottom-8 h-24 w-24 text-[var(--t5-marigold)] opacity-50" />
      <div className="relative mx-auto max-w-3xl">
        <Reveal>
          <div
            className="relative bg-[var(--t5-paper)] px-8 py-12 sm:px-12"
            style={{ transform: "rotate(-1.8deg)", border: "2.5px solid var(--t5-ink)", boxShadow: "9px 10px 0 var(--t5-marigold)" }}
          >
            <Tape className="-top-4 left-1/2 -translate-x-1/2" rotate={6} />
            <Doodle kind="star" className="absolute right-7 top-7 h-7 w-7 text-[var(--t5-clay)]" />
            <blockquote
              className="t5-accent leading-[1.28] text-[var(--t5-ink)]"
              style={{ fontSize: "clamp(1.5rem,3.6vw,2.4rem)" }}
            >
              &ldquo;{c.quote_en}&rdquo;
            </blockquote>
            <figcaption className="mt-7 flex items-center gap-3">
              <span className="h-0.5 w-9 bg-[var(--t5-marigold-deep)]" />
              <span className="text-sm font-extrabold uppercase tracking-[0.1em] text-[var(--t5-ink)]">
                {c.name_en}
              </span>
              <span className="text-sm text-[var(--t5-muted2)]">{c.detail_en}</span>
            </figcaption>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ── closing CTA ─────────────────────────────────────────────────────── */

export function T5Cta() {
  const c = useSection("t5_cta", {
    eyebrow_en: "Roll out your mat",
    eyebrow_el: "Άπλωσε το στρώμα σου", eyebrow_de: "Roll deine Matte aus", eyebrow_fr: "Déroule ton tapis", eyebrow_it: "Stendi il tuo tappetino", eyebrow_es: "Despliega tu esterilla", eyebrow_nl: "Rol je mat uit", eyebrow_pl: "Rozłóż swoją matę", eyebrow_pt: "Estende o teu tapete", eyebrow_sv: "Rulla ut din matta", eyebrow_sq: "Shtri stivën tënde",
    title_en: "Your first class",
    title_el: "Το πρώτο σου μάθημα", title_de: "Dein erster Kurs", title_fr: "Ton premier cours", title_it: "La tua prima lezione", title_es: "Tu primera clase", title_nl: "Je eerste les", title_pl: "Twoje pierwsze zajęcia", title_pt: "A tua primeira aula", title_sv: "Ditt första pass", title_sq: "Klasa jote e parë",
    titleAccent_en: "is waiting",
    titleAccent_el: "σε περιμένει", titleAccent_de: "wartet", titleAccent_fr: "t'attend", titleAccent_it: "ti aspetta", titleAccent_es: "te espera", titleAccent_nl: "wacht", titleAccent_pl: "czekają", titleAccent_pt: "espera-te", titleAccent_sv: "väntar", titleAccent_sq: "po të pret",
    titleEnd_en: "for you.",
    titleEnd_el: "ήδη.", titleEnd_de: "auf dich.", titleEnd_fr: "déjà.", titleEnd_it: "già.", titleEnd_es: "ya.", titleEnd_nl: "op je.", titleEnd_pl: "na ciebie.", titleEnd_pt: "já.", titleEnd_sv: "på dig.", titleEnd_sq: "tashmë.",
    sub_en: "Book online in under a minute. Real-time availability, instant confirmation, and a genuinely warm welcome at the door.",
    cta_en: "Book a class",
    cta_el: "Κλείσε μάθημα", cta_de: "Kurs buchen", cta_fr: "Réserver un cours", cta_it: "Prenota una lezione", cta_es: "Reservar una clase", cta_nl: "Boek een les", cta_pl: "Zarezerwuj zajęcia", cta_pt: "Marcar uma aula", cta_sv: "Boka ett pass", cta_sq: "Rezervo një klasë",
  });
  return (
    <section className="relative overflow-hidden bg-[var(--t5-ink)] px-6 py-28">
      <EditPencil section="t5_cta" />
      <div aria-hidden className="t5-grain pointer-events-none absolute inset-0 opacity-[0.07]" />
      <Doodle kind="sun" spin className="absolute right-10 top-12 h-16 w-16 text-[var(--t5-marigold)]" />
      <Doodle kind="squiggle" className="absolute left-10 bottom-12 h-9 w-16 text-[var(--t5-rose)]" />
      <div className="relative mx-auto max-w-3xl text-center">
        <Reveal>
          <div className="flex justify-center">
            <Sticker tone="marigold" rotate={-3}>
              {c.eyebrow_en}
            </Sticker>
          </div>
        </Reveal>
        <Reveal delay={0.06}>
          <h2
            className="mt-6 font-bold leading-[0.98] tracking-[-0.03em] text-[var(--t5-paper)]"
            style={{ fontSize: "clamp(2.4rem,6.5vw,4.6rem)" }}
          >
            {c.title_en}{" "}
            <span
              className="t5-accent t5-mark"
              style={{ background: "var(--t5-marigold)", color: "#241a0e", padding: "0.02em 0.2em", borderRadius: "4px" }}
            >
              {c.titleAccent_en}
            </span>{" "}
            {c.titleEnd_en}
          </h2>
        </Reveal>
        <Reveal delay={0.12}>
          <p className="mx-auto mt-5 max-w-lg leading-relaxed text-[var(--t5-ink-soft)]">{c.sub_en}</p>
        </Reveal>
        <Reveal delay={0.16}>
          <Link
            href="/book"
            className="mt-8 inline-block bg-[var(--t5-marigold)] px-9 py-4 text-sm font-extrabold uppercase tracking-wide text-[#241a0e] transition-transform duration-150 hover:-translate-y-0.5"
            style={{ border: "2.5px solid var(--t5-paper)", boxShadow: "6px 6px 0 var(--t5-marigold-deep)" }}
          >
            {c.cta_en}
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

/* ── about page sections ─────────────────────────────────────────────── */

export function T5AboutStory() {
  const c = useSection("t5_about_story", {
    title_en: "A studio built around a simple idea.",
    p1_en: "The studio opened because its founder wanted somewhere unintimidating to practise: no mirrors, no competition, no perfect bodies up on the wall. Just a warm room, good props and patient teaching.",
    p2_en: "That is still the whole idea. Small classes, real teachers, and a space that welcomes you exactly as you arrive, whatever kind of day you have had on the way in.",
    image: U("1518611012118-696072aa579a"),
  });
  return (
    <section className="relative bg-[var(--t5-paper)] px-6 py-24">
      <EditPencil section="t5_about_story" />
      <Grain />
      <div className="relative mx-auto grid max-w-6xl items-center gap-x-14 gap-y-10 lg:grid-cols-2">
        <div>
          <Reveal>
            <h2 className="font-bold leading-[1.04] tracking-[-0.02em] text-[var(--t5-ink)]" style={{ fontSize: "clamp(2rem,4.4vw,3.2rem)" }}>
              {c.title_en}
            </h2>
          </Reveal>
          <Reveal delay={0.08}>
            <p className="mt-5 leading-relaxed text-[var(--t5-muted)]">{c.p1_en}</p>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="mt-3 leading-relaxed text-[var(--t5-muted)]">{c.p2_en}</p>
          </Reveal>
        </div>
        <Reveal delay={0.1}>
          <div className="relative mx-auto w-full max-w-md">
            <Photo src={c.image} alt={c.title_en} rotate={3} ratio="5/4" tape shadow="var(--t5-clay)" />
            <Doodle kind="star" className="absolute -left-5 -top-5 h-9 w-9 text-[var(--t5-marigold)]" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function T5AboutValues() {
  const c = useSection("t5_about_values", {
    eyebrow_en: "What we hold to",
    title_en: "Three things, never bent.",
    items: [
      { title_en: "Welcoming", desc_en: "Every level, every body, every background. Nobody is too new, too stiff or too anything here." },
      { title_en: "Unhurried", desc_en: "Classes that breathe. We would rather do less, well, than rush you through a workout." },
      { title_en: "Honest", desc_en: "Clear pricing, no contracts and no upsell. Come when it helps, pause when it does not." },
    ],
  });
  const items = (c.items as Array<{ title_en: string; desc_en: string }>) ?? [];
  return (
    <section className="relative bg-[var(--t5-card)] px-6 py-24">
      <EditPencil section="t5_about_values" />
      <Grain />
      <div className="relative mx-auto max-w-6xl">
        <div className="max-w-xl">
          <Reveal>
            <Kicker tone="olive">{c.eyebrow_en}</Kicker>
          </Reveal>
          <Reveal delay={0.06}>
            <h2 className="mt-5 font-bold leading-[1.04] tracking-[-0.02em] text-[var(--t5-ink)]" style={{ fontSize: "clamp(2rem,4.4vw,3.2rem)" }}>
              {c.title_en}
            </h2>
          </Reveal>
        </div>
        <div className="mt-12 grid gap-8 sm:grid-cols-3">
          {items.map((v, i) => {
            const tone = TONES[i % TONES.length];
            return (
              <Reveal key={i} delay={i * 0.08}>
                <div
                  className="relative h-full bg-[var(--t5-paper)] p-6 pt-9"
                  style={{
                    transform: `rotate(${[-2, 1.5, -1.5][i % 3]}deg)`,
                    border: "2.5px solid var(--t5-ink)",
                    boxShadow: `6px 7px 0 var(--t5-${tone})`,
                  }}
                >
                  <span className="t5-accent absolute -top-4 left-5 text-3xl text-[var(--t5-marigold-deep)]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="font-bold tracking-tight text-[var(--t5-ink)]" style={{ fontSize: "1.3rem" }}>
                    {v.title_en}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--t5-muted)]">{v.desc_en}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ── shop page ───────────────────────────────────────────────────────── */

export function T5Shop() {
  const c = useSection("t5_shop", {
    items: [
      { name_en: "Cork yoga mat", desc_en: "Naturally grippy, lightly cushioned, and made to last for years of practice.", price: 68, photo: U("1591343395082-e120087004b4") },
      { name_en: "Cork blocks, pair", desc_en: "Two firm, friendly blocks to bring the floor a little closer to you.", price: 22, photo: U("1633933358116-a27b902fad35") },
      { name_en: "Cotton mat strap", desc_en: "A simple woven strap to sling your mat over a shoulder and go.", price: 16, photo: U("1604881988758-f76ad2f7aac1") },
      { name_en: "Linen eye pillow", desc_en: "A gently weighted, lavender-scented pillow for the deepest rest.", price: 18, photo: U("1610631066894-62452ccb927c") },
      { name_en: "Studio tote bag", desc_en: "Roomy organic cotton, printed in-house. Holds a mat, a flask and more.", price: 16, photo: U("1556228578-8c89e6adf883") },
      { name_en: "Class gift card", desc_en: "The kindest little nudge. Redeemable on any class, pack or membership.", price: 40, photo: U("1542848284-8afa78a08ccb") },
    ],
  });
  const items = (c.items as Array<{ name_en: string; desc_en: string; price: number; photo: string }>) ?? [];
  return (
    <section className="relative bg-[var(--t5-card)] px-6 py-24">
      <EditPencil section="t5_shop" />
      <Grain />
      <div className="relative mx-auto grid max-w-6xl gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((p, i) => {
          const tone = TONES[i % TONES.length];
          return (
            <Reveal key={i} delay={(i % 3) * 0.07}>
              <article
                className="group relative flex h-full flex-col bg-[var(--t5-paper)] p-4 transition-transform duration-150 hover:-translate-y-1"
                style={{
                  transform: `rotate(${[-2, 1.5, -1.5, 2, -1, 1][i % 6]}deg)`,
                  border: "2.5px solid var(--t5-ink)",
                  boxShadow: `7px 8px 0 var(--t5-${tone})`,
                }}
              >
                <div className="relative overflow-hidden" style={{ border: "2px solid var(--t5-ink)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.photo}
                    alt={p.name_en}
                    loading="lazy"
                    className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                  />
                  <div className="absolute -bottom-1 right-2">
                    <Sticker tone="ink" rotate={-6}>
                      £{p.price}
                    </Sticker>
                  </div>
                </div>
                <h2 className="mt-5 font-bold tracking-tight text-[var(--t5-ink)]" style={{ fontSize: "1.25rem" }}>
                  {p.name_en}
                </h2>
                <p className="mt-1.5 flex-1 text-sm leading-relaxed text-[var(--t5-muted)]">{p.desc_en}</p>
                <Link
                  href="/cart"
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-[var(--t5-ink)]"
                >
                  Add to bag
                  <Doodle kind="arrow" className="h-4 w-4 text-[var(--t5-marigold-deep)]" />
                </Link>
              </article>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

/* ── blog page ───────────────────────────────────────────────────────── */

export function T5Blog() {
  const c = useSection("t5_blog", {
    items: [
      { cat_en: "Guides", date_en: "May 2026", title_en: "What to expect from your very first class", excerpt_en: "Where to stand, what to wear, and the one thing every nervous beginner is surprised to learn.", photo: U("1518611012118-696072aa579a") },
      { cat_en: "Practice", date_en: "April 2026", title_en: "Five minutes of breathing to start the day", excerpt_en: "A short, simple breathing practice you can do before your feet even touch the floor.", photo: U("1540555700478-4be289fbecef") },
      { cat_en: "Studio", date_en: "March 2026", title_en: "Why we keep our classes small", excerpt_en: "A capped class is not a smaller business decision. It is the whole point of how we teach.", photo: U("1544161515-4ab6ce6db874") },
    ],
  });
  const posts =
    (c.items as Array<{ cat_en: string; date_en: string; title_en: string; excerpt_en: string; photo: string }>) ??
    [];
  return (
    <section className="relative bg-[var(--t5-paper)] px-6 py-24">
      <EditPencil section="t5_blog" />
      <Grain />
      <div className="relative mx-auto grid max-w-6xl gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((p, i) => {
          const tone = TONES[i % TONES.length];
          return (
            <Reveal key={i} delay={(i % 3) * 0.07}>
              <article
                className="group relative flex h-full flex-col bg-[var(--t5-card)] p-4 transition-transform duration-150 hover:-translate-y-1"
                style={{
                  transform: `rotate(${[-2, 1.5, -1.5][i % 3]}deg)`,
                  border: "2.5px solid var(--t5-ink)",
                  boxShadow: `7px 8px 0 var(--t5-${tone})`,
                }}
              >
                <Tape className="-top-3 left-8 z-10" rotate={i % 2 ? 8 : -8} />
                <div className="relative overflow-hidden" style={{ border: "2px solid var(--t5-ink)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.photo}
                    alt={p.title_en}
                    loading="lazy"
                    className="aspect-[16/10] w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                  />
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <Sticker tone={tone} rotate={-3}>
                    {p.cat_en}
                  </Sticker>
                  <span className="t5-accent text-sm text-[var(--t5-muted2)]">{p.date_en}</span>
                </div>
                <h2 className="mt-3 font-bold leading-snug tracking-tight text-[var(--t5-ink)]" style={{ fontSize: "1.3rem" }}>
                  {p.title_en}
                </h2>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--t5-muted)]">{p.excerpt_en}</p>
              </article>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

/* ── contact page ────────────────────────────────────────────────────── */

export function T5Contact() {
  const c = useSection("t5_contact", {
    details: [
      { label_en: "Studio", value_en: "Your studio address" },
      { label_en: "Phone", value_en: "+44 20 0000 0000" },
      { label_en: "Email", value_en: "hello@yourstudio.example" },
      { label_en: "Instagram", value_en: "@yourstudio" },
    ],
    hours: [
      { label_en: "Monday", value_en: "07:00 - 21:00" },
      { label_en: "Tuesday", value_en: "07:00 - 21:00" },
      { label_en: "Wednesday", value_en: "07:00 - 21:00" },
      { label_en: "Thursday", value_en: "07:00 - 21:00" },
      { label_en: "Friday", value_en: "07:00 - 20:00" },
      { label_en: "Saturday", value_en: "08:00 - 17:00" },
      { label_en: "Sunday", value_en: "08:00 - 16:00" },
    ],
  });
  const details = (c.details as Array<{ label_en: string; value_en: string }>) ?? [];
  const hours = (c.hours as Array<{ label_en: string; value_en: string }>) ?? [];
  return (
    <section className="relative bg-[var(--t5-paper)] px-6 py-24">
      <EditPencil section="t5_contact" />
      <Grain />
      <div className="relative mx-auto grid max-w-5xl gap-x-10 gap-y-12 lg:grid-cols-2">
        <Reveal>
          <div
            className="relative h-full bg-[var(--t5-card)] p-7"
            style={{ transform: "rotate(-2deg)", border: "2.5px solid var(--t5-ink)", boxShadow: "7px 8px 0 var(--t5-marigold)" }}
          >
            <Tape className="-top-3.5 left-8" rotate={-8} />
            <h2 className="font-bold tracking-tight text-[var(--t5-ink)]" style={{ fontSize: "1.5rem" }}>
              Find the studio
            </h2>
            <dl className="mt-5 space-y-3.5">
              {details.map((d, i) => (
                <div key={i} className="flex items-baseline justify-between gap-6 border-b-2 border-dashed border-[var(--t5-border-strong)] pb-3">
                  <dt className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[var(--t5-marigold-deep)]">
                    {d.label_en}
                  </dt>
                  <dd className="text-right text-sm font-semibold text-[var(--t5-ink)]">{d.value_en}</dd>
                </div>
              ))}
            </dl>
            <Link
              href="/book"
              className="mt-6 inline-block bg-[var(--t5-marigold)] px-6 py-3 text-sm font-extrabold uppercase tracking-wide text-[#241a0e] transition-transform duration-150 hover:-translate-y-0.5"
              style={{ border: "2.5px solid var(--t5-ink)", boxShadow: "4px 4px 0 var(--t5-ink)" }}
            >
              Book a class
            </Link>
          </div>
        </Reveal>
        <Reveal delay={0.08}>
          <div
            className="relative h-full bg-[var(--t5-card)] p-7"
            style={{ transform: "rotate(2deg)", border: "2.5px solid var(--t5-ink)", boxShadow: "7px 8px 0 var(--t5-olive)" }}
          >
            <Tape className="-top-3.5 right-8" rotate={9} />
            <h2 className="font-bold tracking-tight text-[var(--t5-ink)]" style={{ fontSize: "1.5rem" }}>
              Opening hours
            </h2>
            <ul className="mt-5 space-y-3">
              {hours.map((h, i) => (
                <li key={i} className="flex items-center justify-between border-b-2 border-dashed border-[var(--t5-border-strong)] pb-3 text-sm">
                  <span className="font-semibold text-[var(--t5-muted)]">{h.label_en}</span>
                  <span className="font-semibold text-[var(--t5-ink)]">{h.value_en}</span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
