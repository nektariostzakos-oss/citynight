import Link from "next/link";
import { detectLang } from "../lib/i18nServer";
import { langPick } from "../lib/langs";
import { loadBusiness } from "../lib/settings";

export async function generateMetadata() {
  const business = await loadBusiness();
  const name = business.name || "Your Salon";
  return {
    title: `Page not found · ${name}`,
    robots: { index: false, follow: true },
  };
}

const copy = {
  eyebrow: {
    en: "404", el: "404", de: "404", fr: "404", it: "404", es: "404",
    nl: "404", pl: "404", pt: "404", sv: "404", sq: "404",
  },
  heading: {
    en: "Lost the thread.",
    el: "Η σελίδα δεν βρέθηκε.",
    de: "Seite nicht gefunden.",
    fr: "On a perdu le fil.",
    it: "Pagina non trovata.",
    es: "Se perdió el hilo.",
    nl: "De draad kwijt.",
    pl: "Zgubiliśmy wątek.",
    pt: "Perdemos o fio.",
    sv: "Tappade tråden.",
    sq: "E humbëm fillin.",
  },
  body: {
    en: "That page moved, renamed, or was never here. Try one of these instead:",
    el: "Αυτή η σελίδα μετακινήθηκε, μετονομάστηκε ή δεν υπήρξε ποτέ. Δοκιμάστε κάποια από τις παρακάτω:",
    de: "Diese Seite wurde verschoben, umbenannt oder existierte nie. Versuch es stattdessen mit einer davon:",
    fr: "Cette page a été déplacée, renommée ou n'a jamais existé. Essayez plutôt l'une de celles-ci :",
    it: "Quella pagina è stata spostata, rinominata o non è mai esistita. Prova invece una di queste:",
    es: "Esa página se movió, cambió de nombre o nunca estuvo aquí. Prueba con una de estas:",
    nl: "Die pagina is verplaatst, hernoemd of bestond hier nooit. Probeer in plaats daarvan een van deze:",
    pl: "Ta strona została przeniesiona, ma nową nazwę albo nigdy jej tu nie było. Spróbuj jednej z tych:",
    pt: "Essa página mudou, foi renomeada ou nunca esteve aqui. Experimenta uma destas:",
    sv: "Den sidan har flyttats, bytt namn eller fanns aldrig här. Prova någon av dessa istället:",
    sq: "Ajo faqe u zhvendos, ndryshoi emrin ose nuk ka qenë kurrë këtu. Provo një nga këto:",
  },
  home: {
    en: "Home", el: "Αρχική", de: "Start", fr: "Accueil", it: "Home", es: "Inicio",
    nl: "Home", pl: "Start", pt: "Início", sv: "Hem", sq: "Ballina",
  },
  services: {
    en: "Services", el: "Υπηρεσίες", de: "Leistungen", fr: "Prestations", it: "Servizi",
    es: "Servicios", nl: "Diensten", pl: "Usługi", pt: "Serviços", sv: "Tjänster",
    sq: "Shërbimet",
  },
  book: {
    en: "Book", el: "Κράτηση", de: "Termin buchen", fr: "Réserver", it: "Prenota",
    es: "Reservar", nl: "Boeken", pl: "Rezerwacja", pt: "Marcar", sv: "Boka",
    sq: "Rezervo",
  },
  contact: {
    en: "Contact", el: "Επικοινωνία", de: "Kontakt", fr: "Contact", it: "Contatti",
    es: "Contacto", nl: "Contact", pl: "Kontakt", pt: "Contacto", sv: "Kontakt",
    sq: "Kontakti",
  },
} satisfies Record<string, Record<string, string>>;

export default async function NotFound() {
  const lang = await detectLang(undefined);
  const t = (k: keyof typeof copy) => langPick(copy[k], lang);

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-6 py-24">
      <div className="mx-auto max-w-md text-center">
        <p className="text-[10px] uppercase tracking-[0.4em]" style={{ color: "var(--gold)" }}>
          {t("eyebrow")}
        </p>
        <h1
          className="mt-3 font-serif text-4xl sm:text-5xl"
          style={{ color: "var(--foreground)" }}
        >
          {t("heading")}
        </h1>
        <p className="mt-4 text-sm" style={{ color: "var(--muted)" }}>
          {t("body")}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center rounded-full px-5 py-2.5 text-xs font-semibold uppercase tracking-widest"
            style={{ background: "var(--gold)", color: "var(--background)" }}
          >
            {t("home")}
          </Link>
          <Link
            href="/services"
            className="inline-flex items-center rounded-full border px-5 py-2.5 text-xs font-semibold uppercase tracking-widest"
            style={{ borderColor: "var(--border-strong)", color: "var(--foreground)" }}
          >
            {t("services")}
          </Link>
          <Link
            href="/book"
            className="inline-flex items-center rounded-full border px-5 py-2.5 text-xs font-semibold uppercase tracking-widest"
            style={{ borderColor: "var(--border-strong)", color: "var(--foreground)" }}
          >
            {t("book")}
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center rounded-full border px-5 py-2.5 text-xs font-semibold uppercase tracking-widest"
            style={{ borderColor: "var(--border-strong)", color: "var(--foreground)" }}
          >
            {t("contact")}
          </Link>
        </div>
      </div>
    </main>
  );
}
