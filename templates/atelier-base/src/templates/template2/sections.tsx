"use client";

/**
 * template2 — nail-artist salon front-end ("Maison Lune"), fully editable.
 *
 * Every section reads its copy + imagery through useSection() so the inline
 * editor (the gold "Edit" pencil, admin-only) can rewrite it, exactly like the
 * salon template. The hardcoded values below are the defaults a fresh install
 * renders until an owner edits — the "Porcelain & Rose" design is unchanged.
 */

import Link from "next/link";
import type { ReactNode } from "react";
import { useSection } from "@/lib/editorClient";
import EditPencil from "../../app/components/EditPencil";
import { T2_CSS } from "./theme";

/** Unsplash photo URL (free commercial licence). */
export const U = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=1200&q=80&auto=format&fit=crop`;

/** Injects the Porcelain & Rose theme + keyframes. Render once per page. */
export function T2Style() {
  return <style dangerouslySetInnerHTML={{ __html: T2_CSS }} />;
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
      className={`t2-rise${className ? ` ${className}` : ""}`}
      style={{ animationDelay: `${delay}s` }}
    >
      {children}
    </div>
  );
}

export function Eyebrow({ children, onDark }: { children: ReactNode; onDark?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.32em] text-[var(--t2-rose)]">
      <span className={`h-px w-7 ${onDark ? "bg-[var(--t2-rose)]/70" : "bg-[var(--t2-rose)]/50"}`} />
      {children}
    </span>
  );
}

function Stars({ n = 5 }: { n?: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {Array.from({ length: n }).map((_, i) => (
        <svg key={i} viewBox="0 0 20 20" className="h-3.5 w-3.5 fill-[var(--t2-rose)]">
          <path d="M10 1.6l2.5 5.2 5.7.8-4.1 4 1 5.7L10 14.8 4.9 17.1l1-5.7-4.1-4 5.7-.8z" />
        </svg>
      ))}
    </span>
  );
}

export function ImageSlot({
  label,
  src,
  className = "",
  rounded = "rounded-[1.75rem]",
}: {
  label: string;
  src?: string;
  className?: string;
  rounded?: string;
}) {
  if (src) {
    return (
      <div className={`relative overflow-hidden ${rounded} ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={label} loading="lazy" className="h-full w-full object-cover" />
      </div>
    );
  }
  return (
    <div
      className={`relative overflow-hidden ${rounded} ${className}`}
      style={{ background: "linear-gradient(140deg,var(--t2-blush) 0%,var(--t2-bg) 54%,var(--t2-blush) 100%)" }}
    >
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(120% 78% at 78% 16%,rgba(176,127,134,0.20),transparent 62%)" }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--t2-rose)]/75">
          <span className="h-1 w-1 rounded-full bg-[var(--t2-rose)]/60" />
          {label}
        </span>
      </div>
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
    <div className="max-w-2xl">
      <Reveal>
        <Eyebrow>{eyebrow}</Eyebrow>
      </Reveal>
      <Reveal delay={0.05}>
        <h2 className="font-serif mt-5 text-4xl leading-tight text-[var(--t2-ink)] sm:text-5xl">
          {title}
        </h2>
      </Reveal>
      {text ? (
        <Reveal delay={0.1}>
          <p className="mt-4 leading-relaxed text-[var(--t2-muted)]">{text}</p>
        </Reveal>
      ) : null}
    </div>
  );
}

/** Inner-page header — editable. `section` is the content key. */
export function T2PageHeader({
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
    <header className="relative bg-[var(--t2-bg)] px-6 pt-36 pb-14 text-center sm:pt-40">
      <EditPencil section={section} />
      <div className="mx-auto max-w-3xl">
        <div className="t2-rise flex justify-center" style={{ animationDelay: "0ms" }}>
          <Eyebrow>{c.eyebrow_en}</Eyebrow>
        </div>
        <h1
          className="t2-rise font-serif mt-5 text-4xl leading-[1.08] text-[var(--t2-ink)] sm:text-5xl lg:text-6xl"
          style={{ animationDelay: "90ms" }}
        >
          {c.title_en}
        </h1>
        {c.sub_en ? (
          <p
            className="t2-rise mx-auto mt-4 max-w-xl leading-relaxed text-[var(--t2-muted)]"
            style={{ animationDelay: "180ms" }}
          >
            {c.sub_en}
          </p>
        ) : null}
      </div>
    </header>
  );
}

/* ── default content ─────────────────────────────────────────────────── */

const D_SERVICES = [
  { name_en: "Classic manicure", name_el: "Κλασικό μανικιούρ", name_de: "Klassische Maniküre", name_fr: "Manucure classique", name_it: "Manicure classica", name_es: "Manicura clásica", name_nl: "Klassieke manicure", name_pl: "Klasyczny manicure", name_pt: "Manicure clássica", name_sv: "Klassisk manikyr", name_sq: "Manikyr klasik",
    desc_en: "Shape, cuticle care and a flawless coat of colour.", desc_el: "Σχηματισμός, περιποίηση επωνυχίων και ένα άψογο στρώμα χρώματος.", desc_de: "Form, Nagelhautpflege und ein makelloser Farbauftrag.", desc_fr: "Forme, soin des cuticules et une pose de couleur impeccable.", desc_it: "Forma, cura delle cuticole e una stesura di colore impeccabile.", desc_es: "Forma, cuidado de cutículas y una capa de color impecable.", desc_nl: "Vorm, nagelriemverzorging en een vlekkeloze laklaag.", desc_pl: "Nadanie kształtu, pielęgnacja skórek i nieskazitelna warstwa koloru.", desc_pt: "Forma, cuidado das cutículas e uma camada de cor impecável.", desc_sv: "Form, nagelbandsvård och ett felfritt lager färg.", desc_sq: "Formësim, kujdes i kutikulave dhe një shtresë e përsosur ngjyre.",
    price: 28, photo: U("1607779097040-26e80aa78e66") },
  { name_en: "Gel & BIAB", name_el: "Τζελ & BIAB", name_de: "Gel & BIAB", name_fr: "Gel & BIAB", name_it: "Gel & BIAB", name_es: "Gel y BIAB", name_nl: "Gel & BIAB", name_pl: "Żel & BIAB", name_pt: "Gel & BIAB", name_sv: "Gel & BIAB", name_sq: "Xhel & BIAB",
    desc_en: "Strength and a glassy shine that holds for three weeks plus.", desc_el: "Αντοχή και κρυστάλλινη λάμψη που κρατάει πάνω από τρεις εβδομάδες.", desc_de: "Stabilität und glasartiger Glanz, der über drei Wochen hält.", desc_fr: "Solidité et brillance vitrée qui tiennent plus de trois semaines.", desc_it: "Resistenza e una lucentezza vetrosa che dura oltre tre settimane.", desc_es: "Resistencia y un brillo vidrioso que aguanta más de tres semanas.", desc_nl: "Stevigheid en een glasachtige glans die ruim drie weken meegaat.", desc_pl: "Wytrzymałość i szklisty połysk, który utrzymuje się ponad trzy tygodnie.", desc_pt: "Resistência e um brilho vítreo que dura mais de três semanas.", desc_sv: "Hållbarhet och en glasartad glans som håller i över tre veckor.", desc_sq: "Qëndrueshmëri dhe një shkëlqim si xham që mban mbi tre javë.",
    price: 42, photo: U("1632345031435-8727f6897d53") },
  { name_en: "Hand-painted art", name_el: "Σχέδια στο χέρι", name_de: "Handgemalte Kunst", name_fr: "Art peint à la main", name_it: "Arte dipinta a mano", name_es: "Arte pintado a mano", name_nl: "Handgeschilderde kunst", name_pl: "Wzory ręcznie malowane", name_pt: "Arte pintada à mão", name_sv: "Handmålad konst", name_sq: "Art i pikturuar me dorë",
    desc_en: "Chrome, fine-line and bespoke sets, painted by hand.", desc_el: "Chrome, λεπτές γραμμές και προσωποποιημένα σετ, ζωγραφισμένα στο χέρι.", desc_de: "Chrome, feine Linien und individuelle Sets, von Hand gemalt.", desc_fr: "Chrome, traits fins et compositions sur mesure, peints à la main.", desc_it: "Chrome, linee sottili e set su misura, dipinti a mano.", desc_es: "Chrome, líneas finas y sets a medida, pintados a mano.", desc_nl: "Chrome, fijne lijnen en sets op maat, met de hand geschilderd.", desc_pl: "Chrome, cienkie linie i zestawy na zamówienie, malowane ręcznie.", desc_pt: "Chrome, linhas finas e conjuntos à medida, pintados à mão.", desc_sv: "Krom, tunna linjer och skräddarsydda set, målade för hand.", desc_sq: "Krom, vija të holla dhe sete me porosi, të pikturuara me dorë.",
    price: 55, photo: U("1604654894610-df63bc536371") },
  { name_en: "Luxury pedicure", name_el: "Πεντικιούρ πολυτελείας", name_de: "Luxus-Pediküre", name_fr: "Pédicure de luxe", name_it: "Pedicure di lusso", name_es: "Pedicura de lujo", name_nl: "Luxe pedicure", name_pl: "Luksusowy pedicure", name_pt: "Pedicure de luxo", name_sv: "Lyxpedikyr", name_sq: "Pedikyr luksoz",
    desc_en: "A warm soak, exfoliation and colour that wears beautifully.", desc_el: "Ένα ζεστό μπάνιο, απολέπιση και χρώμα που κρατάει υπέροχα.", desc_de: "Ein warmes Bad, Peeling und eine Farbe, die wunderschön sitzt.", desc_fr: "Un bain chaud, un gommage et une couleur qui se porte à merveille.", desc_it: "Un bagno caldo, esfoliazione e un colore che resta splendido.", desc_es: "Un baño cálido, exfoliación y un color que dura precioso.", desc_nl: "Een warm voetbad, peeling en een kleur die mooi blijft.", desc_pl: "Ciepła kąpiel, peeling i kolor, który pięknie się trzyma.", desc_pt: "Um banho quente, esfoliação e uma cor que dura linda.", desc_sv: "Ett varmt fotbad, peeling och en färg som sitter vackert.", desc_sq: "Një banjë e ngrohtë, eksfoliim dhe ngjyrë që mban bukur.",
    price: 45, photo: U("1599206676335-193c82b13c9e") },
  { name_en: "Gel extensions", name_el: "Επεκτάσεις τζελ", name_de: "Gel-Verlängerungen", name_fr: "Extensions gel", name_it: "Extension in gel", name_es: "Extensiones de gel", name_nl: "Gelverlengingen", name_pl: "Przedłużanie żelem", name_pt: "Extensões em gel", name_sv: "Gelförlängningar", name_sq: "Zgjatime me xhel",
    desc_en: "Sculpted length in gel or acrylic, shaped to suit your hands.", desc_el: "Επεκτάσεις μήκους σε τζελ ή ακρυλικό, σχηματισμένες για τα χέρια σας.", desc_de: "Modellierte Länge in Gel oder Acryl, geformt für deine Hände.", desc_fr: "Longueur sculptée en gel ou acrylique, modelée pour vos mains.", desc_it: "Lunghezza scolpita in gel o acrilico, modellata per le tue mani.", desc_es: "Longitud esculpida en gel o acrílico, adaptada a tus manos.", desc_nl: "Gemodelleerde lengte in gel of acryl, op vorm gevijld voor je handen.", desc_pl: "Wymodelowana długość w żelu lub akrylu, dopasowana do twoich dłoni.", desc_pt: "Comprimento esculpido em gel ou acrílico, moldado para as tuas mãos.", desc_sv: "Skulpterad längd i gel eller akryl, formad efter dina händer.", desc_sq: "Gjatësi e modeluar në xhel ose akrilik, formësuar për duart tuaja.",
    price: 60, photo: U("1612887390768-fb02affea7a6") },
  { name_en: "Soak-off & repair", name_el: "Αφαίρεση & επιδιόρθωση", name_de: "Entfernung & Reparatur", name_fr: "Dépose & réparation", name_it: "Rimozione & riparazione", name_es: "Retirada y reparación", name_nl: "Verwijderen & herstellen", name_pl: "Usuwanie i naprawa", name_pt: "Remoção & reparação", name_sv: "Borttagning & reparation", name_sq: "Heqje & riparim",
    desc_en: "Gentle removal and a quiet reset for tired nails.", desc_el: "Απαλή αφαίρεση και ένα ήσυχο reset για κουρασμένα νύχια.", desc_de: "Sanftes Entfernen und ein ruhiger Neustart für müde Nägel.", desc_fr: "Une dépose douce et un repos discret pour les ongles fatigués.", desc_it: "Rimozione delicata e un reset tranquillo per le unghie stanche.", desc_es: "Retirada suave y un descanso tranquilo para las uñas cansadas.", desc_nl: "Zachte verwijdering en een rustige reset voor moede nagels.", desc_pl: "Delikatne usunięcie i spokojny reset zmęczonych paznokci.", desc_pt: "Remoção suave e um descanso tranquilo para unhas cansadas.", desc_sv: "Skonsam borttagning och en lugn återställning för trötta naglar.", desc_sq: "Heqje e butë dhe një rifillim i qetë për thonjtë e lodhur.",
    price: 20, photo: U("1641814250010-9887d86eedfd") },
];

const D_GALLERY = [
  { label_en: "Soft French", label_el: "Απαλό γαλλικό", label_de: "Soft French", label_fr: "French délicate", label_it: "French soft", label_es: "French suave", label_nl: "Soft French", label_pl: "Delikatny french", label_pt: "French suave", label_sv: "Mjuk french", label_sq: "French i butë", photo: U("1630843599725-32ead7671867") },
  { label_en: "Chrome ombre", label_el: "Chrome ombre", label_de: "Chrome-Ombré", label_fr: "Chrome ombré", label_it: "Chrome ombré", label_es: "Chrome ombré", label_nl: "Chrome-ombré", label_pl: "Chrome ombré", label_pt: "Chrome ombré", label_sv: "Krom-ombré", label_sq: "Krom ombré", photo: U("1637264718120-e70224dc0662") },
  { label_en: "Fine-line art", label_el: "Λεπτές γραμμές", label_de: "Fineliner-Kunst", label_fr: "Traits fins", label_it: "Linee sottili", label_es: "Líneas finas", label_nl: "Fijne lijnen", label_pl: "Cienkie linie", label_pt: "Linhas finas", label_sv: "Tunna linjer", label_sq: "Vija të holla", photo: U("1610992015732-2449b76344bc") },
  { label_en: "Glazed nude", label_el: "Glazed nude", label_de: "Glasiertes Nude", label_fr: "Nude glacé", label_it: "Nude glassato", label_es: "Nude glaseado", label_nl: "Geglazuurd nude", label_pl: "Glazurowane nude", label_pt: "Nude glaceado", label_sv: "Glaserad nude", label_sq: "Nude i shkëlqyer", photo: U("1700760933910-d3c03aa18b65") },
  { label_en: "Bridal set", label_el: "Νυφικό σετ", label_de: "Brautset", label_fr: "Manucure mariée", label_it: "Set sposa", label_es: "Set de novia", label_nl: "Bruidsset", label_pl: "Stylizacja ślubna", label_pt: "Conjunto de noiva", label_sv: "Brudset", label_sq: "Set nuserie", photo: U("1610992015836-7c249d75782d") },
  { label_en: "Autumn tones", label_el: "Φθινοπωρινοί τόνοι", label_de: "Herbsttöne", label_fr: "Tons d'automne", label_it: "Tonalità autunnali", label_es: "Tonos de otoño", label_nl: "Herfsttinten", label_pl: "Jesienne odcienie", label_pt: "Tons de outono", label_sv: "Hösttoner", label_sq: "Tone vjeshte", photo: U("1604902396830-aca29e19b067") },
  { label_en: "Soft almond", label_el: "Απαλό αμύγδαλο", label_de: "Soft Almond", label_fr: "Amande douce", label_it: "Mandorla soft", label_es: "Almendra suave", label_nl: "Soft almond", label_pl: "Migdał delikatny", label_pt: "Amêndoa suave", label_sv: "Mjuk mandel", label_sq: "Bajame e butë", photo: U("1607779097040-26e80aa78e66") },
  { label_en: "Studio gel", label_el: "Τζελ στούντιο", label_de: "Studio-Gel", label_fr: "Gel studio", label_it: "Gel studio", label_es: "Gel de estudio", label_nl: "Studio-gel", label_pl: "Żel studyjny", label_pt: "Gel de estúdio", label_sv: "Studiogel", label_sq: "Xhel studioje", photo: U("1632345031435-8727f6897d53") },
  { label_en: "Hand-painted", label_el: "Στο χέρι", label_de: "Handgemalt", label_fr: "Peint à la main", label_it: "Dipinto a mano", label_es: "Pintado a mano", label_nl: "Handgeschilderd", label_pl: "Malowane ręcznie", label_pt: "Pintado à mão", label_sv: "Handmålad", label_sq: "I pikturuar me dorë", photo: U("1604654894610-df63bc536371") },
  { label_en: "Warm nude", label_el: "Ζεστό nude", label_de: "Warmes Nude", label_fr: "Nude chaud", label_it: "Nude caldo", label_es: "Nude cálido", label_nl: "Warm nude", label_pl: "Ciepłe nude", label_pt: "Nude quente", label_sv: "Varm nude", label_sq: "Nude i ngrohtë", photo: U("1690749138086-7422f71dc159") },
  { label_en: "Polished pink", label_el: "Λουστραρισμένο ροζ", label_de: "Glanzpink", label_fr: "Rose poli", label_it: "Rosa lucido", label_es: "Rosa pulido", label_nl: "Gepolijst roze", label_pl: "Wypolerowany róż", label_pt: "Rosa polido", label_sv: "Polerad rosa", label_sq: "Rozë i lëmuar", photo: U("1641814250010-9887d86eedfd") },
  { label_en: "Quiet shimmer", label_el: "Διακριτική λάμψη", label_de: "Sanftes Schimmern", label_fr: "Éclat discret", label_it: "Luccichio discreto", label_es: "Brillo discreto", label_nl: "Subtiele glans", label_pl: "Subtelny blask", label_pt: "Brilho discreto", label_sv: "Stillsam glans", label_sq: "Shkëlqim i qetë", photo: U("1659391542239-9648f307c0b1") },
];

/* ── shared section defaults (used by both the home + page versions) ──── */

const T2_SVC = {
  eyebrow_en: "The services",
  eyebrow_el: "Οι υπηρεσίες", eyebrow_de: "Die Leistungen", eyebrow_fr: "Les prestations", eyebrow_it: "I servizi", eyebrow_es: "Los servicios", eyebrow_nl: "De diensten", eyebrow_pl: "Usługi", eyebrow_pt: "Os serviços", eyebrow_sv: "Tjänsterna", eyebrow_sq: "Shërbimet",
  title_en: "A short, considered menu.",
  title_el: "Ένας σύντομος, προσεγμένος κατάλογος.", title_de: "Eine kurze, durchdachte Auswahl.", title_fr: "Une carte courte et réfléchie.", title_it: "Un menù breve e curato.", title_es: "Una carta breve y cuidada.", title_nl: "Een korte, doordachte kaart.", title_pl: "Krótkie, przemyślane menu.", title_pt: "Uma carta breve e pensada.", title_sv: "En kort, genomtänkt meny.", title_sq: "Një menu e shkurtër, e menduar.",
  text_en: "Every treatment is booked with the time it genuinely needs. No rushing, no upsell, no surprise at the till.",
  text_el: "Κάθε υπηρεσία κλείνεται με τον χρόνο που πραγματικά χρειάζεται. Καμία βιασύνη, καμία πίεση, καμία έκπληξη στο ταμείο.",
  text_de: "Jede Behandlung wird mit der Zeit gebucht, die sie wirklich braucht. Kein Hetzen, kein Upsell, keine Überraschung an der Kasse.",
  text_fr: "Chaque prestation est réservée avec le temps qu'il lui faut vraiment. Sans hâte, sans vente forcée, sans surprise à la caisse.",
  text_it: "Ogni servizio è prenotato con il tempo che richiede davvero. Nessuna fretta, nessun upsell, nessuna sorpresa al momento di pagare.",
  text_es: "Cada servicio se reserva con el tiempo que realmente necesita. Sin prisas, sin ventas adicionales, sin sorpresas al pagar.",
  text_nl: "Elke behandeling wordt geboekt met de tijd die ze echt nodig heeft. Geen haast, geen upsell, geen verrassingen bij het afrekenen.",
  text_pl: "Każda usługa jest rezerwowana na czas, którego naprawdę wymaga. Bez pośpiechu, bez naciągania, bez niespodzianek przy kasie.",
  text_pt: "Cada serviço é marcado com o tempo de que realmente precisa. Sem pressas, sem vendas extra, sem surpresas no momento de pagar.",
  text_sv: "Varje behandling bokas med den tid den verkligen behöver. Ingen brådska, ingen merförsäljning, inga överraskningar i kassan.",
  text_sq: "Çdo shërbim rezervohet me kohën që i duhet vërtet. Pa nxitim, pa shitje shtesë, pa surpriza në arkë.",
  items: D_SERVICES,
};

const T2_GAL = {
  eyebrow_en: "The work",
  eyebrow_el: "Η δουλειά", eyebrow_de: "Die Arbeiten", eyebrow_fr: "Les réalisations", eyebrow_it: "I lavori", eyebrow_es: "El trabajo", eyebrow_nl: "Het werk", eyebrow_pl: "Realizacje", eyebrow_pt: "Os trabalhos", eyebrow_sv: "Arbetena", eyebrow_sq: "Punët",
  title_en: "Recent sets.",
  title_el: "Πρόσφατα σετ.", title_de: "Aktuelle Sets.", title_fr: "Réalisations récentes.", title_it: "Set recenti.", title_es: "Sets recientes.", title_nl: "Recente sets.", title_pl: "Najnowsze stylizacje.", title_pt: "Conjuntos recentes.", title_sv: "Senaste seten.", title_sq: "Sete të fundit.",
  items: D_GALLERY,
};

/* ── hero ────────────────────────────────────────────────────────────── */

export function T2Hero() {
  const c = useSection("t2_hero", {
    eyebrow_en: "Nail artistry studio",
    eyebrow_el: "Στούντιο νυχιών", eyebrow_de: "Nagelstudio", eyebrow_fr: "Studio de manucure", eyebrow_it: "Studio di nail art", eyebrow_es: "Estudio de uñas", eyebrow_nl: "Nagelstudio", eyebrow_pl: "Studio stylizacji paznokci", eyebrow_pt: "Estúdio de unhas", eyebrow_sv: "Nagelstudio", eyebrow_sq: "Studio thonjsh",
    title_en: "Considered nails,",
    title_el: "Νύχια με φροντίδα,", title_de: "Durchdachte Nägel,", title_fr: "Des ongles pensés,", title_it: "Unghie curate,", title_es: "Uñas con criterio,", title_nl: "Doordachte nagels,", title_pl: "Przemyślane paznokcie,", title_pt: "Unhas pensadas,", title_sv: "Genomtänkta naglar,", title_sq: "Thonj të kujdesshëm,",
    titleAccent_en: "crafted by hand.",
    titleAccent_el: "φτιαγμένα στο χέρι.", titleAccent_de: "von Hand gefertigt.", titleAccent_fr: "faits à la main.", titleAccent_it: "fatte a mano.", titleAccent_es: "hechas a mano.", titleAccent_nl: "met de hand gemaakt.", titleAccent_pl: "tworzone ręcznie.", titleAccent_pt: "feitas à mão.", titleAccent_sv: "skapade för hand.", titleAccent_sq: "punuar me dorë.",
    sub_en: "Gel, BIAB and hand-painted art, in an unhurried studio. Book online in under a minute.",
    sub_el: "Gel, BIAB και ζωγραφική στο χέρι, σε ένα στούντιο χωρίς βιασύνη. Κρατήστε online σε λιγότερο από ένα λεπτό.",
    sub_de: "Gel, BIAB und handgemalte Kunst, in einem ruhigen Studio. Online in unter einer Minute buchen.",
    sub_fr: "Gel, BIAB et art peint à la main, dans un studio sans hâte. Réservation en ligne en moins d'une minute.",
    sub_it: "Gel, BIAB e arte dipinta a mano, in uno studio senza fretta. Prenota online in meno di un minuto.",
    sub_es: "Gel, BIAB y arte pintado a mano, en un estudio sin prisas. Reserva online en menos de un minuto.",
    sub_nl: "Gel, BIAB en handgeschilderde kunst, in een rustige studio. Online boeken in minder dan een minuut.",
    sub_pl: "Żel, BIAB i ręcznie malowane wzory, w niespiesznym studiu. Zarezerwuj online w mniej niż minutę.",
    sub_pt: "Gel, BIAB e arte pintada à mão, num estúdio sem pressas. Reserva online em menos de um minuto.",
    sub_sv: "Gel, BIAB och handmålad konst, i en studio utan stress. Boka online på under en minut.",
    sub_sq: "Gel, BIAB dhe art i pikturuar me dorë, në një studio të qetë. Rezervo online për më pak se një minutë.",
    primaryCta_en: "Book an appointment",
    primaryCta_el: "Κλείστε ραντεβού", primaryCta_de: "Termin buchen", primaryCta_fr: "Prendre rendez-vous", primaryCta_it: "Prenota ora", primaryCta_es: "Reservar cita", primaryCta_nl: "Maak een afspraak", primaryCta_pl: "Umów wizytę", primaryCta_pt: "Marcar hora", primaryCta_sv: "Boka tid", primaryCta_sq: "Rezervo takim",
    secondaryCta_en: "See the services",
    secondaryCta_el: "Δείτε τις υπηρεσίες", secondaryCta_de: "Leistungen ansehen", secondaryCta_fr: "Voir les prestations", secondaryCta_it: "Vedi i servizi", secondaryCta_es: "Ver los servicios", secondaryCta_nl: "Bekijk de diensten", secondaryCta_pl: "Zobacz usługi", secondaryCta_pt: "Ver os serviços", secondaryCta_sv: "Se tjänsterna", secondaryCta_sq: "Shih shërbimet",
    rating_en: "4.9 · 600+ visits",
    rating_el: "4.9 · 600+ επισκέψεις", rating_de: "4,9 · 600+ Besuche", rating_fr: "4,9 · 600+ visites", rating_it: "4,9 · 600+ visite", rating_es: "4,9 · 600+ visitas", rating_nl: "4,9 · 600+ bezoeken", rating_pl: "4,9 · 600+ wizyt", rating_pt: "4,9 · 600+ visitas", rating_sv: "4,9 · 600+ besök", rating_sq: "4.9 · 600+ vizita",
    note_en: "Walk-ins welcome",
    note_el: "Χωρίς ραντεβού ευπρόσδεκτοι", note_de: "Auch ohne Termin", note_fr: "Sans rendez-vous bienvenus", note_it: "Anche senza appuntamento", note_es: "Sin cita también", note_nl: "Inloop welkom", note_pl: "Bez rezerwacji mile widziani", note_pt: "Sem marcação também", note_sv: "Drop-in välkomna", note_sq: "Pa termin të mirëpritur",
    image: U("1610992015762-45dca7fa3a85"),
    chipLabel_en: "Next available",
    chipLabel_el: "Επόμενο διαθέσιμο", chipLabel_de: "Nächster Termin", chipLabel_fr: "Prochain créneau", chipLabel_it: "Prossimo libero", chipLabel_es: "Próximo libre", chipLabel_nl: "Eerstvolgende", chipLabel_pl: "Najbliższy termin", chipLabel_pt: "Próximo livre", chipLabel_sv: "Nästa lediga", chipLabel_sq: "I ardhshmi i lirë",
    chipValue_en: "Tomorrow · 10:00",
    chipValue_el: "Αύριο · 10:00", chipValue_de: "Morgen · 10:00", chipValue_fr: "Demain · 10:00", chipValue_it: "Domani · 10:00", chipValue_es: "Mañana · 10:00", chipValue_nl: "Morgen · 10:00", chipValue_pl: "Jutro · 10:00", chipValue_pt: "Amanhã · 10:00", chipValue_sv: "Imorgon · 10:00", chipValue_sq: "Nesër · 10:00",
  });
  const word = (w: string, gi: number, accent: boolean) => (
    <span
      key={gi}
      className={`t2-rise mr-[0.22em] inline-block ${accent ? "italic text-[var(--t2-rose)]" : ""}`}
      style={{ animationDelay: `${90 + gi * 55}ms` }}
    >
      {w}
    </span>
  );
  const line1 = String(c.title_en).split(" ");
  const line2 = String(c.titleAccent_en).split(" ");
  return (
    <section className="relative overflow-hidden bg-[var(--t2-bg)] px-6 pt-32 pb-20 sm:pt-36 lg:pb-28">
      <EditPencil section="t2_hero" />
      <div
        className="pointer-events-none absolute -right-44 -top-28 h-[34rem] w-[34rem] rounded-full"
        style={{ background: "radial-gradient(circle,rgba(176,127,134,0.16),transparent 70%)" }}
      />
      <div className="relative mx-auto grid w-full max-w-7xl items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <div className="t2-rise" style={{ animationDelay: "0ms" }}>
            <Eyebrow>{c.eyebrow_en}</Eyebrow>
          </div>
          <h1 className="font-serif mt-6 text-[2.75rem] leading-[1.04] tracking-tight text-[var(--t2-ink)] sm:text-6xl lg:text-7xl">
            {line1.map((w, i) => word(w, i, false))}
            <br />
            {line2.map((w, i) => word(w, line1.length + i, true))}
          </h1>
          <p className="t2-rise mt-7 max-w-md text-lg leading-relaxed text-[var(--t2-muted)]" style={{ animationDelay: "430ms" }}>
            {c.sub_en}
          </p>
          <div className="t2-rise mt-9 flex flex-wrap items-center gap-3" style={{ animationDelay: "510ms" }}>
            <Link
              href="/book"
              className="rounded-full bg-[var(--t2-ink)] px-8 py-4 text-sm font-semibold uppercase tracking-[0.14em] text-[var(--t2-bg)] transition-transform duration-200 hover:scale-[1.03] active:scale-[0.98]"
            >
              {c.primaryCta_en}
            </Link>
            <Link
              href="/services"
              className="rounded-full border border-[var(--t2-border-strong)] px-8 py-4 text-sm font-semibold uppercase tracking-[0.14em] text-[var(--t2-ink)] transition-colors duration-200 hover:bg-[var(--t2-card)]"
            >
              {c.secondaryCta_en}
            </Link>
          </div>
          <div className="t2-rise mt-10 flex items-center gap-5 text-xs uppercase tracking-[0.16em] text-[var(--t2-muted2)]" style={{ animationDelay: "590ms" }}>
            <span className="flex items-center gap-2">
              <Stars n={5} /> {c.rating_en}
            </span>
            <span className="hidden h-3 w-px bg-[var(--t2-border-strong)] sm:block" />
            <span className="hidden sm:block">{c.note_en}</span>
          </div>
        </div>

        <div className="t2-rise relative" style={{ animationDelay: "240ms" }}>
          <ImageSlot label={c.title_en} src={c.image} className="aspect-[4/5] w-full" />
          <div className="absolute -bottom-5 -left-5 rounded-2xl border border-[var(--t2-border)] bg-[var(--t2-card)] px-5 py-3.5 shadow-[0_18px_40px_-26px_rgba(38,32,29,0.5)] backdrop-blur">
            <p className="text-[10px] uppercase tracking-[0.24em] text-[var(--t2-rose)]">{c.chipLabel_en}</p>
            <p className="font-serif text-lg text-[var(--t2-ink)]">{c.chipValue_en}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── marquee ─────────────────────────────────────────────────────────── */

export function T2Marquee() {
  const c = useSection("t2_marquee", {
    items: [
      { label_en: "BIAB overlays", label_el: "BIAB overlays", label_de: "BIAB-Overlays", label_fr: "Pose BIAB", label_it: "Overlay BIAB", label_es: "Overlays BIAB", label_nl: "BIAB-overlays", label_pl: "Overlay BIAB", label_pt: "Overlays BIAB", label_sv: "BIAB-overlays", label_sq: "Overlay BIAB" },
      { label_en: "Gel extensions", label_el: "Επεκτάσεις τζελ", label_de: "Gel-Verlängerungen", label_fr: "Extensions gel", label_it: "Extension in gel", label_es: "Extensiones de gel", label_nl: "Gelverlengingen", label_pl: "Przedłużanie żelem", label_pt: "Extensões em gel", label_sv: "Gelförlängningar", label_sq: "Zgjatime me xhel" },
      { label_en: "Hand-painted art", label_el: "Σχέδια στο χέρι", label_de: "Handgemalte Kunst", label_fr: "Art peint à la main", label_it: "Arte dipinta a mano", label_es: "Arte pintado a mano", label_nl: "Handgeschilderde kunst", label_pl: "Wzory ręcznie malowane", label_pt: "Arte pintada à mão", label_sv: "Handmålad konst", label_sq: "Art i pikturuar me dorë" },
      { label_en: "Luxury pedicure", label_el: "Πεντικιούρ πολυτελείας", label_de: "Luxus-Pediküre", label_fr: "Pédicure de luxe", label_it: "Pedicure di lusso", label_es: "Pedicura de lujo", label_nl: "Luxe pedicure", label_pl: "Luksusowy pedicure", label_pt: "Pedicure de luxo", label_sv: "Lyxpedikyr", label_sq: "Pedikyr luksoz" },
      { label_en: "Chrome & foil", label_el: "Chrome & foil", label_de: "Chrome & Folie", label_fr: "Chrome & feuille", label_it: "Chrome & foil", label_es: "Chrome y foil", label_nl: "Chrome & folie", label_pl: "Chrome i folia", label_pt: "Chrome & foil", label_sv: "Krom & folie", label_sq: "Krom & fletë" },
      { label_en: "Bridal sets", label_el: "Νυφικά σετ", label_de: "Brautsets", label_fr: "Manucures mariée", label_it: "Set per sposa", label_es: "Sets de novia", label_nl: "Bruidssets", label_pl: "Stylizacje ślubne", label_pt: "Conjuntos de noiva", label_sv: "Brudset", label_sq: "Sete nuserie" },
      { label_en: "Nail repair", label_el: "Επιδιόρθωση νυχιών", label_de: "Nagelreparatur", label_fr: "Réparation d'ongle", label_it: "Riparazione unghie", label_es: "Reparación de uñas", label_nl: "Nagelreparatie", label_pl: "Naprawa paznokci", label_pt: "Reparação de unhas", label_sv: "Nagelreparation", label_sq: "Riparim thonjsh" },
      { label_en: "Soft French", label_el: "Απαλό γαλλικό", label_de: "Soft French", label_fr: "French délicate", label_it: "French soft", label_es: "French suave", label_nl: "Soft French", label_pl: "Delikatny french", label_pt: "French suave", label_sv: "Soft french", label_sq: "French i butë" },
    ],
  });
  const items = (c.items as Array<{ label_en: string }>) ?? [];
  const track = (
    <div className="t2-marq flex shrink-0 items-center gap-10 pr-10">
      {items.map((it, i) => (
        <span
          key={i}
          className="flex items-center gap-10 whitespace-nowrap text-sm uppercase tracking-[0.2em] text-[var(--t2-ink)]/65"
        >
          {it.label_en}
          <span className="h-1.5 w-1.5 rotate-45 bg-[var(--t2-rose)]/70" />
        </span>
      ))}
    </div>
  );
  return (
    <section className="relative overflow-hidden border-y border-[var(--t2-border)] bg-[var(--t2-blush)]/55 py-4">
      <EditPencil section="t2_marquee" />
      <div className="flex">
        {track}
        {track}
      </div>
    </section>
  );
}

/* ── services ────────────────────────────────────────────────────────── */

/** The service card grid, reused on the home + services pages. */
export function T2ServiceCards() {
  const c = useSection("t2_services", T2_SVC);
  const items =
    (c.items as Array<{ name_en: string; desc_en: string; price: number; photo: string }>) ?? D_SERVICES;
  return (
    <div className="mx-auto grid max-w-7xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((s, i) => (
        <Reveal key={i} delay={(i % 3) * 0.07}>
          <article className="group flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-[var(--t2-border)] bg-[var(--t2-card)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_28px_55px_-32px_rgba(38,32,29,0.45)]">
            <ImageSlot label={s.name_en} src={s.photo} rounded="rounded-none" className="aspect-[4/3] w-full" />
            <div className="flex flex-1 flex-col p-6">
              <h3 className="font-serif text-xl text-[var(--t2-ink)]">{s.name_en}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--t2-muted)]">{s.desc_en}</p>
              <div className="mt-5 flex items-center justify-between border-t border-[var(--t2-border)] pt-4">
                <span className="text-sm text-[var(--t2-ink)]">
                  <span className="text-[var(--t2-muted2)]">from</span> £{s.price}
                </span>
                <Link
                  href="/book"
                  className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--t2-rose)] transition-colors duration-200 group-hover:text-[var(--t2-rose-deep)]"
                >
                  Book →
                </Link>
              </div>
            </div>
          </article>
        </Reveal>
      ))}
    </div>
  );
}

export function T2Services() {
  const c = useSection("t2_services", T2_SVC);
  return (
    <section id="services" className="relative bg-[var(--t2-bg)] px-6 py-24 lg:py-28">
      <EditPencil section="t2_services" />
      <div className="mx-auto max-w-7xl">
        <SectionHead eyebrow={c.eyebrow_en} title={c.title_en} text={c.text_en} />
        <div className="mt-12">
          <T2ServiceCards />
        </div>
      </div>
    </section>
  );
}

/* ── gallery ─────────────────────────────────────────────────────────── */

export function T2GalleryGrid({ items }: { items: Array<{ label_en: string; photo: string }> }) {
  return (
    <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 lg:grid-cols-4">
      {items.map((g, i) => (
        <Reveal key={i} delay={(i % 4) * 0.06}>
          <figure className="group relative overflow-hidden rounded-[1.5rem]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={g.photo}
              alt={g.label_en}
              loading="lazy"
              className="aspect-[4/5] w-full object-cover transition-transform duration-[600ms] ease-out group-hover:scale-[1.05]"
            />
            <figcaption className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-black/60 to-transparent p-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <span className="h-1 w-1 rounded-full bg-white" />
              {g.label_en}
            </figcaption>
          </figure>
        </Reveal>
      ))}
    </div>
  );
}

/** Full gallery — used by the gallery page. */
export function T2GalleryFull() {
  const c = useSection("t2_gallery", T2_GAL);
  const items = (c.items as Array<{ label_en: string; photo: string }>) ?? D_GALLERY;
  return (
    <section className="relative px-6 pb-24">
      <EditPencil section="t2_gallery" />
      <T2GalleryGrid items={items} />
    </section>
  );
}

export function T2Gallery() {
  const c = useSection("t2_gallery", T2_GAL);
  const items = (c.items as Array<{ label_en: string; photo: string }>) ?? D_GALLERY;
  return (
    <section className="relative bg-[var(--t2-blush)]/45 px-6 py-24 lg:py-28">
      <EditPencil section="t2_gallery" />
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <Reveal>
              <Eyebrow>{c.eyebrow_en}</Eyebrow>
            </Reveal>
            <Reveal delay={0.05}>
              <h2 className="font-serif mt-5 text-4xl leading-tight text-[var(--t2-ink)] sm:text-5xl">
                {c.title_en}
              </h2>
            </Reveal>
          </div>
          <Reveal delay={0.1}>
            <Link
              href="/gallery"
              className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--t2-rose)] transition-colors duration-200 hover:text-[var(--t2-rose-deep)]"
            >
              View full gallery →
            </Link>
          </Reveal>
        </div>
        <div className="mt-12 grid grid-cols-2 gap-4 lg:grid-cols-3">
          {items.slice(0, 6).map((g, i) => (
            <Reveal key={i} delay={(i % 3) * 0.07}>
              <figure className="group relative overflow-hidden rounded-[1.75rem]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={g.photo}
                  alt={g.label_en}
                  loading="lazy"
                  className="aspect-[4/5] w-full object-cover transition-transform duration-[600ms] ease-out group-hover:scale-[1.05]"
                />
                <figcaption className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-black/60 to-transparent p-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <span className="h-1 w-1 rounded-full bg-white" />
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

/* ── artist ──────────────────────────────────────────────────────────── */

export function T2Artist() {
  const c = useSection("t2_artist", {
    eyebrow_en: "Meet your artist",
    eyebrow_el: "Γνωρίστε την καλλιτέχνιδά σας", eyebrow_de: "Lern deine Künstlerin kennen", eyebrow_fr: "Rencontrez votre artiste", eyebrow_it: "Incontra la tua artista", eyebrow_es: "Conoce a tu artista", eyebrow_nl: "Maak kennis met je artiest", eyebrow_pl: "Poznaj swoją artystkę", eyebrow_pt: "Conhece a tua artista", eyebrow_sv: "Möt din nagelartist", eyebrow_sq: "Njihuni me artisten tuaj",
    title_en: "Considered work, by hand.",
    title_el: "Προσεγμένη δουλειά, στο χέρι.", title_de: "Sorgfältige Arbeit, von Hand.", title_fr: "Un travail soigné, à la main.", title_it: "Lavoro curato, a mano.", title_es: "Trabajo cuidado, a mano.", title_nl: "Zorgvuldig werk, met de hand.", title_pl: "Staranna praca, ręcznie.", title_pt: "Trabalho cuidado, à mão.", title_sv: "Omsorgsfullt arbete, för hand.", title_sq: "Punë e kujdesshme, me dorë.",
    p1_en: "Our lead nail artist works to one rule: a set that suits your hands, not a passing trend. Clean prep, the right product, and the time to do it properly.",
    p1_el: "Η επικεφαλής nail artist μας δουλεύει με έναν κανόνα: ένα σετ που ταιριάζει στα χέρια σου, όχι σε μια περαστική τάση. Καθαρή προετοιμασία, το σωστό προϊόν, και ο χρόνος να γίνει σωστά.",
    p1_de: "Unsere leitende Nageldesignerin folgt einer Regel: ein Set, das zu deinen Händen passt, nicht zu einem flüchtigen Trend. Saubere Vorbereitung, das richtige Produkt, und die Zeit, es richtig zu machen.",
    p1_fr: "Notre nail artist en chef applique une seule règle : une pose qui sied à vos mains, pas à une tendance passagère. Une préparation soignée, le bon produit et le temps de bien faire.",
    p1_it: "La nostra nail artist principale segue una sola regola: un set adatto alle tue mani, non a una moda passeggera. Preparazione pulita, il prodotto giusto e il tempo per farlo bene.",
    p1_es: "Nuestra nail artist principal sigue una regla: un set que sienta bien a tus manos, no a una moda pasajera. Preparación limpia, el producto adecuado y el tiempo para hacerlo bien.",
    p1_nl: "Onze hoofdnagelartiest werkt volgens één regel: een set die bij jouw handen past, niet bij een voorbijgaande trend. Een schone voorbereiding, het juiste product en de tijd om het goed te doen.",
    p1_pl: "Nasza główna nail artist kieruje się jedną zasadą: stylizacja, która pasuje do twoich dłoni, a nie do chwilowego trendu. Czyste przygotowanie, właściwe produkty i czas, by zrobić to porządnie.",
    p1_pt: "A nossa nail artist principal segue uma regra: um conjunto que assenta às tuas mãos, não a uma moda passageira. Preparação cuidada, o produto certo e o tempo para fazer bem.",
    p1_sv: "Vår ledande nagelartist har en enda regel: en uppsättning som passar dina händer, inte en flyktig trend. Ren förberedelse, rätt produkt och tid att göra det ordentligt.",
    p1_sq: "Artistja jonë kryesore e thonjve ndjek një rregull: një set që i shkon duarve tuaja, jo një trendi kalimtar. Përgatitje e pastër, produkti i duhur dhe koha për ta bërë siç duhet.",
    p2_en: "The studio stays quiet and unhurried. One client at a time, good coffee, and nails you will keep catching yourself looking at.",
    p2_el: "Το στούντιο μένει ήσυχο και χωρίς βιασύνη. Έναν πελάτη τη φορά, καλό καφέ, και νύχια που θα κοιτάς ξανά και ξανά.",
    p2_de: "Das Studio bleibt ruhig und unaufgeregt. Eine Kundin nach der anderen, guter Kaffee und Nägel, die du immer wieder ansehen wirst.",
    p2_fr: "Le studio reste calme et sans hâte. Une cliente à la fois, du bon café et des ongles que vous ne cesserez de regarder.",
    p2_it: "Lo studio resta tranquillo e senza fretta. Una cliente alla volta, un buon caffè e unghie che continuerai a guardare.",
    p2_es: "El estudio se mantiene tranquilo y sin prisas. Una clienta cada vez, un buen café y unas uñas que no dejarás de mirar.",
    p2_nl: "De studio blijft rustig en ongehaast. Eén klant tegelijk, goede koffie en nagels waar je naar blijft kijken.",
    p2_pl: "Studio pozostaje ciche i niespieszne. Jedna klientka naraz, dobra kawa i paznokcie, na które będziesz patrzeć bez końca.",
    p2_pt: "O estúdio mantém-se tranquilo e sem pressas. Uma cliente de cada vez, bom café e unhas que não vais parar de admirar.",
    p2_sv: "Studion förblir lugn och ostressad. En kund i taget, gott kaffe och naglar du inte slutar titta på.",
    p2_sq: "Studioja mbetet e qetë dhe pa nxitim. Një kliente në një kohë, kafe e mirë dhe thonj që do t'i shikosh pa pushim.",
    cta_en: "Book an appointment",
    cta_el: "Κλείστε ραντεβού", cta_de: "Termin buchen", cta_fr: "Prendre rendez-vous", cta_it: "Prenota ora", cta_es: "Reservar cita", cta_nl: "Maak een afspraak", cta_pl: "Umów wizytę", cta_pt: "Marcar hora", cta_sv: "Boka tid", cta_sq: "Rezervo takim",
    image: U("1736434518489-0eb84070017f"),
    statValue_en: "9 yrs",
    statValue_el: "9 χρόνια", statValue_de: "9 Jahre", statValue_fr: "9 ans", statValue_it: "9 anni", statValue_es: "9 años", statValue_nl: "9 jaar", statValue_pl: "9 lat", statValue_pt: "9 anos", statValue_sv: "9 år", statValue_sq: "9 vjet",
    statLabel_en: "at the desk",
    statLabel_el: "στο τραπέζι", statLabel_de: "am Tisch", statLabel_fr: "à la table", statLabel_it: "al tavolo", statLabel_es: "en la mesa", statLabel_nl: "achter de tafel", statLabel_pl: "przy stoliku", statLabel_pt: "à mesa", statLabel_sv: "vid bordet", statLabel_sq: "në tavolinë",
  });
  return (
    <section className="relative bg-[var(--t2-bg)] px-6 py-24 lg:py-28">
      <EditPencil section="t2_artist" />
      <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-2">
        <Reveal className="order-2 lg:order-1">
          <div className="relative mx-auto max-w-md">
            <ImageSlot label={c.title_en} src={c.image} className="aspect-[4/5] w-full" />
            <div className="absolute -right-4 -top-4 hidden rounded-2xl border border-[var(--t2-border)] bg-[var(--t2-card)] px-5 py-3 shadow-[0_18px_40px_-28px_rgba(38,32,29,0.5)] sm:block">
              <p className="font-serif text-2xl text-[var(--t2-ink)]">{c.statValue_en}</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--t2-muted2)]">{c.statLabel_en}</p>
            </div>
          </div>
        </Reveal>
        <div className="order-1 lg:order-2">
          <Reveal>
            <Eyebrow>{c.eyebrow_en}</Eyebrow>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="font-serif mt-5 text-4xl leading-tight text-[var(--t2-ink)] sm:text-5xl">
              {c.title_en}
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-5 leading-relaxed text-[var(--t2-muted)]">{c.p1_en}</p>
          </Reveal>
          <Reveal delay={0.15}>
            <p className="mt-4 leading-relaxed text-[var(--t2-muted)]">{c.p2_en}</p>
          </Reveal>
          <Reveal delay={0.2}>
            <Link
              href="/book"
              className="mt-8 inline-block rounded-full bg-[var(--t2-ink)] px-8 py-4 text-sm font-semibold uppercase tracking-[0.14em] text-[var(--t2-bg)] transition-transform duration-200 hover:scale-[1.03] active:scale-[0.98]"
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

function Icon({ name }: { name: string }) {
  const p = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "h-[22px] w-[22px] text-[var(--t2-rose)]",
  };
  if (name === "shield")
    return (
      <svg {...p}>
        <path d="M12 3l7 2.7v5.3c0 4.8-3 7.8-7 9.7-4-1.9-7-4.9-7-9.7V5.7z" />
      </svg>
    );
  if (name === "drop")
    return (
      <svg {...p}>
        <path d="M12 3.5s6 6.6 6 10.5a6 6 0 11-12 0c0-3.9 6-10.5 6-10.5z" />
      </svg>
    );
  if (name === "clock")
    return (
      <svg {...p}>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.5V12l3 1.8" />
      </svg>
    );
  return (
    <svg {...p}>
      <path d="M12 20.5C7 17.5 3.5 14 3.5 9.8 3.5 7 5.6 5 8.2 5c1.7 0 3.1 1 3.8 2.4C12.7 6 14.1 5 15.8 5c2.6 0 4.7 2 4.7 4.8 0 4.2-3.5 7.7-8.5 10.7z" />
    </svg>
  );
}

export function T2WhyUs() {
  const c = useSection("t2_whyus", {
    eyebrow_en: "The difference",
    eyebrow_el: "Η διαφορά", eyebrow_de: "Der Unterschied", eyebrow_fr: "La différence", eyebrow_it: "La differenza", eyebrow_es: "La diferencia", eyebrow_nl: "Het verschil", eyebrow_pl: "Różnica", eyebrow_pt: "A diferença", eyebrow_sv: "Skillnaden", eyebrow_sq: "Dallimi",
    title_en: "Small studio. Serious standards.",
    title_el: "Μικρό στούντιο. Σοβαρά πρότυπα.", title_de: "Kleines Studio. Hohe Standards.", title_fr: "Petit studio. Exigences sérieuses.", title_it: "Studio piccolo. Standard seri.", title_es: "Estudio pequeño. Estándares serios.", title_nl: "Klein studio. Serieuze standaarden.", title_pl: "Małe studio. Wysokie standardy.", title_pt: "Estúdio pequeno. Padrões sérios.", title_sv: "Liten studio. Höga krav.", title_sq: "Studio e vogël. Standarde serioze.",
    items: [
      { icon: "shield",
        title_en: "Hospital-grade hygiene", title_el: "Νοσοκομειακή υγιεινή", title_de: "Klinische Hygiene", title_fr: "Hygiène hospitalière", title_it: "Igiene da ospedale", title_es: "Higiene hospitalaria", title_nl: "Klinische hygiëne", title_pl: "Higiena szpitalna", title_pt: "Higiene hospitalar", title_sv: "Sjukhushygien", title_sq: "Higjienë spitalore",
        desc_en: "A fresh file every visit and sealed, sterilised tools.", desc_el: "Νέα λίμα κάθε επίσκεψη και αποστειρωμένα εργαλεία.", desc_de: "Eine frische Feile pro Besuch und versiegelte, sterilisierte Werkzeuge.", desc_fr: "Une lime neuve à chaque visite et des outils stérilisés sous scellés.", desc_it: "Una lima nuova ogni visita e strumenti sigillati e sterilizzati.", desc_es: "Una lima nueva en cada visita y herramientas selladas y esterilizadas.", desc_nl: "Een verse vijl bij elk bezoek en verzegelde, gesteriliseerde tools.", desc_pl: "Świeży pilnik na każdą wizytę i zaplombowane, sterylizowane narzędzia.", desc_pt: "Uma lima nova a cada visita e ferramentas seladas e esterilizadas.", desc_sv: "En ny fil för varje besök och förseglade, steriliserade verktyg.", desc_sq: "Një limë e re çdo vizitë dhe vegla të mbyllura e të sterilizuara." },
      { icon: "drop",
        title_en: "Premium products only", title_el: "Μόνο premium προϊόντα", title_de: "Nur Premium-Produkte", title_fr: "Produits premium uniquement", title_it: "Solo prodotti premium", title_es: "Solo productos premium", title_nl: "Alleen premium producten", title_pl: "Tylko produkty premium", title_pt: "Apenas produtos premium", title_sv: "Endast premiumprodukter", title_sq: "Vetëm produkte premium",
        desc_en: "The GelBottle, BIAB and salon-grade colour, nothing less.", desc_el: "The GelBottle, BIAB και επαγγελματικά χρώματα, τίποτα λιγότερο.", desc_de: "The GelBottle, BIAB und Salonfarben, nichts darunter.", desc_fr: "The GelBottle, BIAB et couleurs qualité salon, rien de moins.", desc_it: "The GelBottle, BIAB e colori da salone, niente di meno.", desc_es: "The GelBottle, BIAB y color de calidad salón, nada menos.", desc_nl: "The GelBottle, BIAB en saloncoatings, niets minder.", desc_pl: "The GelBottle, BIAB i lakier salonowy, nic mniej.", desc_pt: "The GelBottle, BIAB e cores de salão, nada menos.", desc_sv: "The GelBottle, BIAB och salongsfärg, ingenting mindre.", desc_sq: "The GelBottle, BIAB dhe ngjyra premium, asgjë më pak." },
      { icon: "clock",
        title_en: "Booked in 60 seconds", title_el: "Κράτηση σε 60 δευτερόλεπτα", title_de: "In 60 Sekunden gebucht", title_fr: "Réservé en 60 secondes", title_it: "Prenotato in 60 secondi", title_es: "Reservado en 60 segundos", title_nl: "Geboekt in 60 seconden", title_pl: "Rezerwacja w 60 sekund", title_pt: "Marcado em 60 segundos", title_sv: "Bokat på 60 sekunder", title_sq: "Rezervim në 60 sekonda",
        desc_en: "Pick a service, pick a time. No phone tag, no deposit chase.", desc_el: "Διάλεξε υπηρεσία, διάλεξε ώρα. Χωρίς τηλέφωνα, χωρίς προκαταβολή.", desc_de: "Service wählen, Zeit wählen. Kein Telefon-Pingpong, keine Anzahlung.", desc_fr: "Choisissez un service, choisissez une heure. Sans téléphone, sans acompte.", desc_it: "Scegli un servizio, scegli un orario. Niente telefonate, niente acconto.", desc_es: "Elige un servicio, elige una hora. Sin llamadas, sin depósito.", desc_nl: "Kies een dienst, kies een tijd. Geen telefoonrondes, geen aanbetaling.", desc_pl: "Wybierz usługę, wybierz godzinę. Bez telefonów, bez zadatków.", desc_pt: "Escolhe um serviço, escolhe uma hora. Sem chamadas, sem depósito.", desc_sv: "Välj en tjänst, välj en tid. Inga telefonsamtal, ingen handpenning.", desc_sq: "Zgjidh shërbimin, zgjidh kohën. Pa telefonata, pa paradhënie." },
      { icon: "heart",
        title_en: "Honest aftercare", title_el: "Ειλικρινής φροντίδα μετά", title_de: "Ehrliche Nachsorge", title_fr: "Conseils sincères", title_it: "Cura post sincera", title_es: "Cuidado posterior honesto", title_nl: "Eerlijke nazorg", title_pl: "Szczera pielęgnacja", title_pt: "Cuidado pós honesto", title_sv: "Ärlig eftervård", title_sq: "Kujdes i ndershëm pas",
        desc_en: "We show you how to make every set last a little longer.", desc_el: "Σου δείχνουμε πώς να κάνεις κάθε σετ να κρατήσει λίγο παραπάνω.", desc_de: "Wir zeigen dir, wie jedes Set ein wenig länger hält.", desc_fr: "Nous vous montrons comment faire durer chaque pose un peu plus.", desc_it: "Ti mostriamo come far durare ogni set un po' di più.", desc_es: "Te enseñamos a hacer que cada set dure un poco más.", desc_nl: "We laten zien hoe je elke set wat langer goed houdt.", desc_pl: "Pokażemy, jak sprawić, by każda stylizacja trzymała się dłużej.", desc_pt: "Mostramos-te como fazer cada conjunto durar um pouco mais.", desc_sv: "Vi visar hur du får varje set att hålla lite längre.", desc_sq: "Të tregojmë si ta bësh çdo set të mbajë pak më gjatë." },
    ],
  });
  const items = (c.items as Array<{ icon: string; title_en: string; desc_en: string }>) ?? [];
  return (
    <section className="relative bg-[var(--t2-bg)] px-6 py-24 lg:py-28">
      <EditPencil section="t2_whyus" />
      <div className="mx-auto max-w-7xl">
        <SectionHead eyebrow={c.eyebrow_en} title={c.title_en} />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((w, i) => (
            <Reveal key={i} delay={(i % 4) * 0.06}>
              <div className="h-full rounded-[1.75rem] border border-[var(--t2-border)] bg-[var(--t2-card)] p-6">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--t2-blush)]">
                  <Icon name={w.icon} />
                </span>
                <h3 className="font-serif mt-5 text-lg text-[var(--t2-ink)]">{w.title_en}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--t2-muted)]">{w.desc_en}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── testimonials ────────────────────────────────────────────────────── */

export function T2Testimonials() {
  const c = useSection("t2_testimonials", {
    eyebrow_en: "Kind words",
    eyebrow_el: "Καλά λόγια", eyebrow_de: "Nette Worte", eyebrow_fr: "Avis clients", eyebrow_it: "Belle parole", eyebrow_es: "Buenas palabras", eyebrow_nl: "Mooie woorden", eyebrow_pl: "Miłe słowa", eyebrow_pt: "Palavras gentis", eyebrow_sv: "Vänliga ord", eyebrow_sq: "Fjalë të mira",
    title_en: "Booked again before they leave.",
    title_el: "Κλείνουν ξανά πριν φύγουν.", title_de: "Buchen erneut, bevor sie gehen.", title_fr: "Réservent à nouveau avant de partir.", title_it: "Riprenotano prima di uscire.", title_es: "Reservan otra vez antes de irse.", title_nl: "Boeken opnieuw voor ze weggaan.", title_pl: "Rezerwują znów, zanim wyjdą.", title_pt: "Voltam a marcar antes de sair.", title_sv: "Bokar igen innan de går.", title_sq: "Rezervojnë sërish para se të ikin.",
    items: [
      { quote_en: "I finally found someone who shapes my nails to suit my hands. Three weeks on and the BIAB still looks fresh.", name_en: "Sofia R.", detail_en: "BIAB overlay" },
      { quote_en: "The calmest hour of my month. The studio is spotless and the chrome work is genuinely unreal.", name_en: "Amelie D.", detail_en: "Chrome art" },
      { quote_en: "Booked at midnight, confirmed instantly, reminded the morning of. The set lasted my whole holiday.", name_en: "Hannah K.", detail_en: "Gel extensions" },
    ],
  });
  const items = (c.items as Array<{ quote_en: string; name_en: string; detail_en: string }>) ?? [];
  return (
    <section className="relative bg-[var(--t2-blush)]/45 px-6 py-24 lg:py-28">
      <EditPencil section="t2_testimonials" />
      <div className="mx-auto max-w-7xl">
        <SectionHead eyebrow={c.eyebrow_en} title={c.title_en} />
        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {items.map((r, i) => (
            <Reveal key={i} delay={(i % 3) * 0.08}>
              <figure className="flex h-full flex-col rounded-[1.75rem] border border-[var(--t2-border)] bg-[var(--t2-card)] p-7">
                <Stars n={5} />
                <blockquote className="font-serif mt-4 flex-1 text-lg leading-snug text-[var(--t2-ink)]">
                  &ldquo;{r.quote_en}&rdquo;
                </blockquote>
                <figcaption className="mt-6 border-t border-[var(--t2-border)] pt-4 text-sm">
                  <span className="font-semibold text-[var(--t2-ink)]">{r.name_en}</span>
                  <span className="text-[var(--t2-muted2)]"> · {r.detail_en}</span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── closing booking CTA ─────────────────────────────────────────────── */

export function T2BookingCta() {
  const c = useSection("t2_cta", {
    eyebrow_en: "Booking now",
    eyebrow_el: "Κρατήσεις τώρα", eyebrow_de: "Jetzt buchen", eyebrow_fr: "Réservez maintenant", eyebrow_it: "Prenota ora", eyebrow_es: "Reserva ahora", eyebrow_nl: "Boek nu", eyebrow_pl: "Rezerwuj teraz", eyebrow_pt: "Marca agora", eyebrow_sv: "Boka nu", eyebrow_sq: "Rezervo tani",
    title_en: "Ready for nails you'll keep looking at?",
    title_el: "Έτοιμη για νύχια που θα κοιτάς ξανά και ξανά;", title_de: "Bereit für Nägel, die du immer wieder ansiehst?", title_fr: "Prête pour des ongles que vous admirerez sans cesse ?", title_it: "Pronta per unghie che continuerai a guardare?", title_es: "¿Lista para unas uñas que no dejarás de mirar?", title_nl: "Klaar voor nagels waar je naar blijft kijken?", title_pl: "Gotowa na paznokcie, na które będziesz patrzeć bez końca?", title_pt: "Pronta para unhas que não vais parar de admirar?", title_sv: "Redo för naglar du inte slutar titta på?", title_sq: "Gati për thonj që do t'i shikosh pa pushim?",
    sub_en: "Real-time availability, instant confirmation, and a gentle reminder before your visit.",
    sub_el: "Διαθεσιμότητα σε πραγματικό χρόνο, άμεση επιβεβαίωση και μια ευγενική υπενθύμιση πριν την επίσκεψή σας.",
    sub_de: "Verfügbarkeit in Echtzeit, sofortige Bestätigung und eine sanfte Erinnerung vor deinem Besuch.",
    sub_fr: "Disponibilités en temps réel, confirmation immédiate et un rappel discret avant votre visite.",
    sub_it: "Disponibilità in tempo reale, conferma immediata e un promemoria gentile prima della visita.",
    sub_es: "Disponibilidad en tiempo real, confirmación instantánea y un recordatorio amable antes de tu visita.",
    sub_nl: "Beschikbaarheid in real-time, directe bevestiging en een vriendelijke herinnering vóór je bezoek.",
    sub_pl: "Dostępność w czasie rzeczywistym, natychmiastowe potwierdzenie i delikatne przypomnienie przed wizytą.",
    sub_pt: "Disponibilidade em tempo real, confirmação imediata e um lembrete delicado antes da tua visita.",
    sub_sv: "Tillgänglighet i realtid, omedelbar bekräftelse och en mjuk påminnelse före ditt besök.",
    sub_sq: "Disponueshmëri në kohë reale, konfirmim i menjëhershëm dhe një kujtesë e sjellshme para vizitës.",
    cta_en: "Book your appointment",
    cta_el: "Κλείστε το ραντεβού σας", cta_de: "Buche deinen Termin", cta_fr: "Réservez votre rendez-vous", cta_it: "Prenota il tuo appuntamento", cta_es: "Reserva tu cita", cta_nl: "Maak je afspraak", cta_pl: "Umów swoją wizytę", cta_pt: "Marca a tua hora", cta_sv: "Boka din tid", cta_sq: "Rezervo takimin tënd",
  });
  return (
    <section className="relative bg-[var(--t2-bg)] px-6 pb-24 pt-4 lg:pb-28">
      <EditPencil section="t2_cta" />
      <Reveal>
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2.5rem] bg-[var(--t2-ink)] px-8 py-20 text-center sm:px-16">
          <div
            className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full"
            style={{ background: "radial-gradient(circle,rgba(176,127,134,0.42),transparent 70%)" }}
          />
          <div
            className="pointer-events-none absolute -bottom-28 -right-20 h-80 w-80 rounded-full"
            style={{ background: "radial-gradient(circle,rgba(176,127,134,0.30),transparent 70%)" }}
          />
          <div className="relative">
            <div className="flex justify-center">
              <Eyebrow onDark>{c.eyebrow_en}</Eyebrow>
            </div>
            <h2 className="font-serif mx-auto mt-6 max-w-2xl text-4xl leading-[1.08] text-[var(--t2-bg)] sm:text-5xl lg:text-6xl">
              {c.title_en}
            </h2>
            <p className="mx-auto mt-5 max-w-md leading-relaxed text-[var(--t2-on-ink-soft)]">
              {c.sub_en}
            </p>
            <Link
              href="/book"
              className="mt-9 inline-block rounded-full bg-[var(--t2-bg)] px-10 py-4 text-sm font-semibold uppercase tracking-[0.14em] text-[var(--t2-ink)] transition-transform duration-200 hover:scale-[1.03] active:scale-[0.98]"
            >
              {c.cta_en}
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ── about page sections ─────────────────────────────────────────────── */

export function T2AboutStory() {
  const c = useSection("t2_about_story", {
    title_en: "It started with one chair.",
    title_el: "Ξεκίνησε με μία καρέκλα.", title_de: "Es begann mit einem Stuhl.", title_fr: "Tout a commencé avec une chaise.", title_it: "È iniziato con una sola sedia.", title_es: "Empezó con una sola silla.", title_nl: "Het begon met één stoel.", title_pl: "Zaczęło się od jednego krzesła.", title_pt: "Começou com uma cadeira.", title_sv: "Det började med en stol.", title_sq: "Filloi me një karrige.",
    p1_en: "The studio opened with a simple idea: give every set the time it deserves. No double-booking, no rushing a cure, no leaving with nails you are not quite sure about.",
    p1_el: "Το στούντιο άνοιξε με μια απλή ιδέα: δώσε σε κάθε σετ τον χρόνο που του αξίζει. Καμία διπλή κράτηση, καμία βιαστική στεγνωτική, κανένα φεύγα με νύχια που δεν είσαι σίγουρη.",
    p1_de: "Das Studio öffnete mit einer einfachen Idee: jedem Set die Zeit geben, die es verdient. Keine Doppelbuchungen, kein hastiges Aushärten, kein Verlassen mit Nägeln, bei denen du dir nicht sicher bist.",
    p1_fr: "Le studio a ouvert avec une idée simple : donner à chaque pose le temps qu'elle mérite. Pas de double réservation, pas de séchage précipité, pas de départ avec des ongles dont vous n'êtes pas sûre.",
    p1_it: "Lo studio ha aperto con un'idea semplice: dare a ogni set il tempo che merita. Niente doppie prenotazioni, niente catalisi affrettate, niente uscire con unghie di cui non sei convinta.",
    p1_es: "El estudio abrió con una idea sencilla: dar a cada set el tiempo que merece. Sin reservas dobles, sin secados rápidos, sin salir con unas uñas que no terminan de convencerte.",
    p1_nl: "De studio opende met een eenvoudig idee: elke set de tijd geven die hij verdient. Geen dubbele boekingen, geen overhaaste uitharding, niet weggaan met nagels waar je niet zeker van bent.",
    p1_pl: "Studio otworzyło się z prostą myślą: dać każdej stylizacji czas, na jaki zasługuje. Bez podwójnych rezerwacji, bez pośpiesznego utwardzania, bez wychodzenia z paznokciami, których nie jesteś pewna.",
    p1_pt: "O estúdio abriu com uma ideia simples: dar a cada conjunto o tempo que merece. Sem marcações duplas, sem curas à pressa, sem sair com unhas das quais não estás certa.",
    p1_sv: "Studion öppnade med en enkel idé: ge varje set den tid det förtjänar. Inga dubbelbokningar, ingen brådska genom härdningen, ingen som går med naglar man inte är säker på.",
    p1_sq: "Studioja u hap me një ide të thjeshtë: jepi çdo seti kohën që meriton. Pa rezervime të dyfishta, pa nxitim me tharjen, pa ikur me thonj që nuk je e sigurt për ta.",
    p2_en: "Years on, that has not changed. The room stays quiet, the products stay premium, and the work is done by hand, properly.",
    p2_el: "Χρόνια μετά, αυτό δεν έχει αλλάξει. Το δωμάτιο μένει ήσυχο, τα προϊόντα μένουν premium, και η δουλειά γίνεται στο χέρι, σωστά.",
    p2_de: "Jahre später hat sich daran nichts geändert. Der Raum bleibt ruhig, die Produkte bleiben Premium, und die Arbeit wird von Hand gemacht, richtig.",
    p2_fr: "Des années plus tard, rien n'a changé. La salle reste calme, les produits restent premium, et le travail se fait à la main, comme il faut.",
    p2_it: "Anni dopo, non è cambiato nulla. La sala resta tranquilla, i prodotti restano premium e il lavoro si fa a mano, come si deve.",
    p2_es: "Años después, eso no ha cambiado. La sala se mantiene tranquila, los productos siguen siendo premium y el trabajo se hace a mano, como debe ser.",
    p2_nl: "Jaren later is dat niet veranderd. De ruimte blijft rustig, de producten blijven premium en het werk gebeurt met de hand, zoals het hoort.",
    p2_pl: "Lata później nic się nie zmieniło. Pokój pozostaje cichy, produkty premium, a praca wykonywana jest ręcznie, jak należy.",
    p2_pt: "Anos depois, isso não mudou. A sala mantém-se calma, os produtos continuam premium e o trabalho é feito à mão, como deve ser.",
    p2_sv: "Åren har gått och inget har förändrats. Rummet förblir lugnt, produkterna förblir premium och arbetet görs för hand, ordentligt.",
    p2_sq: "Vite më vonë, kjo nuk ka ndryshuar. Salla mbetet e qetë, produktet mbeten premium dhe puna bëhet me dorë, si duhet.",
    image: U("1604654894611-6973b376cbde"),
  });
  return (
    <section className="relative px-6 pb-20">
      <EditPencil section="t2_about_story" />
      <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-2">
        <Reveal>
          <ImageSlot label={c.title_en} src={c.image} className="aspect-[4/5] w-full" />
        </Reveal>
        <div>
          <Reveal>
            <h2 className="font-serif text-3xl text-[var(--t2-ink)] sm:text-4xl">{c.title_en}</h2>
          </Reveal>
          <Reveal delay={0.06}>
            <p className="mt-5 leading-relaxed text-[var(--t2-muted)]">{c.p1_en}</p>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="mt-4 leading-relaxed text-[var(--t2-muted)]">{c.p2_en}</p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

export function T2AboutValues() {
  const c = useSection("t2_about_values", {
    items: [
      { title_en: "Unhurried", title_el: "Χωρίς βιασύνη", title_de: "Ohne Eile", title_fr: "Sans hâte", title_it: "Senza fretta", title_es: "Sin prisas", title_nl: "Zonder haast", title_pl: "Bez pośpiechu", title_pt: "Sem pressas", title_sv: "Utan brådska", title_sq: "Pa nxitim",
        desc_en: "One client at a time, with the whole appointment to themselves.", desc_el: "Έναν πελάτη τη φορά, με όλο το ραντεβού δικό του.", desc_de: "Eine Kundin nach der anderen, mit dem ganzen Termin für sich.", desc_fr: "Une cliente à la fois, avec tout le rendez-vous pour elle.", desc_it: "Una cliente alla volta, con tutto l'appuntamento per sé.", desc_es: "Una clienta a la vez, con toda la cita para ella.", desc_nl: "Eén klant tegelijk, met de hele afspraak voor zichzelf.", desc_pl: "Jedna klientka naraz, z całą wizytą tylko dla siebie.", desc_pt: "Uma cliente de cada vez, com toda a marcação só para si.", desc_sv: "En kund i taget, med hela tiden för sig själv.", desc_sq: "Një kliente në një kohë, me të gjithë takimin për veten." },
      { title_en: "Spotless", title_el: "Άψογο", title_de: "Makellos", title_fr: "Impeccable", title_it: "Impeccabile", title_es: "Impecable", title_nl: "Vlekkeloos", title_pl: "Nieskazitelny", title_pt: "Impecável", title_sv: "Fläckfri", title_sq: "I patëmetë",
        desc_en: "Hospital-grade hygiene and a fresh file for every single visit.", desc_el: "Νοσοκομειακή υγιεινή και νέα λίμα σε κάθε επίσκεψη.", desc_de: "Klinische Hygiene und eine frische Feile bei jedem Besuch.", desc_fr: "Hygiène hospitalière et une lime neuve à chaque visite.", desc_it: "Igiene da ospedale e una lima nuova ad ogni visita.", desc_es: "Higiene hospitalaria y una lima nueva en cada visita.", desc_nl: "Klinische hygiëne en een verse vijl bij elk bezoek.", desc_pl: "Higiena szpitalna i świeży pilnik na każdej wizycie.", desc_pt: "Higiene hospitalar e uma lima nova em cada visita.", desc_sv: "Sjukhushygien och en ny fil för varje besök.", desc_sq: "Higjienë spitalore dhe një limë e re çdo vizitë." },
      { title_en: "Honest", title_el: "Ειλικρινές", title_de: "Ehrlich", title_fr: "Honnête", title_it: "Onesto", title_es: "Honesto", title_nl: "Eerlijk", title_pl: "Szczerze", title_pt: "Honesto", title_sv: "Ärlig", title_sq: "I ndershëm",
        desc_en: "Straight advice on what suits you, and on what will genuinely last.", desc_el: "Ευθεία συμβουλή για τι σου ταιριάζει και για τι θα κρατήσει.", desc_de: "Ehrliche Beratung dazu, was zu dir passt und wirklich hält.", desc_fr: "Des conseils francs sur ce qui vous va et sur ce qui tient vraiment.", desc_it: "Consigli diretti su cosa ti sta bene e su cosa dura davvero.", desc_es: "Consejo directo sobre lo que te queda bien y dura de verdad.", desc_nl: "Eerlijk advies over wat je staat en wat echt blijft zitten.", desc_pl: "Szczera porada o tym, co ci pasuje i co naprawdę się utrzyma.", desc_pt: "Conselho direto sobre o que te assenta e o que dura mesmo.", desc_sv: "Rakt råd om vad som passar dig och vad som verkligen håller.", desc_sq: "Këshilla të drejtpërdrejta për çfarë të shkon dhe çfarë mban vërtet." },
    ],
  });
  const items = (c.items as Array<{ title_en: string; desc_en: string }>) ?? [];
  return (
    <section className="relative px-6 pb-24">
      <EditPencil section="t2_about_values" />
      <div className="mx-auto grid max-w-7xl gap-5 sm:grid-cols-3">
        {items.map((v, i) => (
          <Reveal key={i} delay={(i % 3) * 0.07}>
            <div className="h-full rounded-[1.75rem] border border-[var(--t2-border)] bg-[var(--t2-card)] p-6">
              <h3 className="font-serif text-xl text-[var(--t2-ink)]">{v.title_en}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--t2-muted)]">{v.desc_en}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ── shop page ───────────────────────────────────────────────────────── */

export function T2Shop() {
  const c = useSection("t2_shop", {
    items: [
      { name_en: "Cuticle recovery oil", desc_en: "A nightly drop that keeps nails flexible and cared-for between visits.", price: 16, photo: U("1659391542239-9648f307c0b1") },
      { name_en: "Hand & nail cream", desc_en: "Rich, fast-absorbing care for hands that work hard all day.", price: 22, photo: U("1652990337162-fa84a588d843") },
      { name_en: "Glass nail file", desc_en: "A gentle, lasting file that shapes a clean edge and never frays it.", price: 12, photo: U("1737214475537-2ccc466876ce") },
      { name_en: "Strengthening base coat", desc_en: "The base we reach for at the desk, ready for your own touch-ups.", price: 18, photo: U("1618606679166-7f313aa5b26f") },
      { name_en: "High-shine top coat", desc_en: "A glass-like gloss that keeps colour looking freshly done.", price: 18, photo: U("1571290274554-6a2eaa771e5f") },
      { name_en: "Studio gift card", desc_en: "The easiest gift for someone who loves a properly done set.", price: 50, photo: U("1604902396830-aca29e19b067") },
    ],
  });
  const items =
    (c.items as Array<{ name_en: string; desc_en: string; price: number; photo: string }>) ?? [];
  return (
    <section className="relative px-6 pb-24">
      <EditPencil section="t2_shop" />
      <div className="mx-auto grid max-w-7xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((p, i) => (
          <Reveal key={i} delay={(i % 3) * 0.07}>
            <article className="group flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-[var(--t2-border)] bg-[var(--t2-card)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_28px_55px_-32px_rgba(38,32,29,0.45)]">
              <ImageSlot label={p.name_en} src={p.photo} rounded="rounded-none" className="aspect-[4/3] w-full" />
              <div className="flex flex-1 flex-col p-6">
                <h2 className="font-serif text-xl text-[var(--t2-ink)]">{p.name_en}</h2>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--t2-muted)]">{p.desc_en}</p>
                <div className="mt-5 flex items-center justify-between border-t border-[var(--t2-border)] pt-4">
                  <span className="text-sm text-[var(--t2-ink)]">£{p.price}</span>
                  <Link
                    href="/cart"
                    className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--t2-rose)]"
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

export function T2Blog() {
  const c = useSection("t2_blog", {
    items: [
      { cat_en: "Care", date_en: "May 2026", title_en: "How to make a gel manicure last four full weeks", excerpt_en: "The small daily habits that keep an overlay looking fresh long after you leave the studio.", photo: U("1607779097040-26e80aa78e66") },
      { cat_en: "Trends", date_en: "April 2026", title_en: "The quiet nail looks defining this season", excerpt_en: "Glazed nudes, fine-line art and the softest chrome. What clients are asking for right now.", photo: U("1632345031435-8727f6897d53") },
      { cat_en: "Studio", date_en: "March 2026", title_en: "Why we only book one client at a time", excerpt_en: "A calmer studio is a cleaner, more careful studio. A look at how we run our day.", photo: U("1736434518489-0eb84070017f") },
    ],
  });
  const posts =
    (c.items as Array<{ cat_en: string; date_en: string; title_en: string; excerpt_en: string; photo: string }>) ??
    [];
  return (
    <section className="relative px-6 pb-24">
      <EditPencil section="t2_blog" />
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-3">
        {posts.map((p, i) => (
          <Reveal key={i} delay={(i % 3) * 0.08}>
            <article className="group flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-[var(--t2-border)] bg-[var(--t2-card)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_28px_55px_-32px_rgba(38,32,29,0.45)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.photo} alt={p.title_en} loading="lazy" className="aspect-[16/10] w-full object-cover" />
              <div className="flex flex-1 flex-col p-6">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--t2-rose)]">
                  <span className="h-1 w-1 rounded-full bg-[var(--t2-rose)]" />
                  {p.cat_en}
                  <span className="text-[var(--t2-muted2)]">· {p.date_en}</span>
                </div>
                <h2 className="font-serif mt-3 text-xl leading-snug text-[var(--t2-ink)]">{p.title_en}</h2>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--t2-muted)]">{p.excerpt_en}</p>
                <span className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--t2-rose)]">
                  Read the article →
                </span>
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ── contact page ────────────────────────────────────────────────────── */

export function T2Contact() {
  const c = useSection("t2_contact", {
    details: [
      { label_en: "Studio", value_en: "Your studio address" },
      { label_en: "Phone", value_en: "+44 20 0000 0000" },
      { label_en: "Email", value_en: "hello@yourstudio.example" },
      { label_en: "Instagram", value_en: "@yourstudio" },
    ],
    hours: [
      { label_en: "Monday", value_en: "10:00 – 18:00" },
      { label_en: "Tuesday", value_en: "10:00 – 18:00" },
      { label_en: "Wednesday", value_en: "10:00 – 18:00" },
      { label_en: "Thursday", value_en: "10:00 – 20:00" },
      { label_en: "Friday", value_en: "10:00 – 20:00" },
      { label_en: "Saturday", value_en: "09:00 – 17:00" },
      { label_en: "Sunday", value_en: "Closed" },
    ],
  });
  const details = (c.details as Array<{ label_en: string; value_en: string }>) ?? [];
  const hours = (c.hours as Array<{ label_en: string; value_en: string }>) ?? [];
  return (
    <section className="relative px-6 pb-24">
      <EditPencil section="t2_contact" />
      <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-2">
        <Reveal>
          <div className="h-full rounded-[1.75rem] border border-[var(--t2-border)] bg-[var(--t2-card)] p-7">
            <h2 className="font-serif text-2xl text-[var(--t2-ink)]">The details</h2>
            <dl className="mt-5 space-y-4">
              {details.map((d, i) => (
                <div key={i} className="border-b border-[var(--t2-border)] pb-4 last:border-0 last:pb-0">
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--t2-rose)]">
                    {d.label_en}
                  </dt>
                  <dd className="mt-1 text-[var(--t2-ink)]">{d.value_en}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Reveal>
        <Reveal delay={0.08}>
          <div className="flex h-full flex-col rounded-[1.75rem] border border-[var(--t2-border)] bg-[var(--t2-card)] p-7">
            <h2 className="font-serif text-2xl text-[var(--t2-ink)]">Opening hours</h2>
            <ul className="mt-5 space-y-2.5 text-sm">
              {hours.map((h, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between border-b border-[var(--t2-border)] pb-2.5 last:border-0 last:pb-0"
                >
                  <span className="text-[var(--t2-muted)]">{h.label_en}</span>
                  <span className="text-[var(--t2-ink)]">{h.value_en}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/book"
              className="mt-6 inline-block self-start rounded-full bg-[var(--t2-ink)] px-7 py-3.5 text-sm font-semibold uppercase tracking-[0.14em] text-[var(--t2-bg)] transition-transform duration-200 hover:scale-[1.03] active:scale-[0.98]"
            >
              Book an appointment
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
