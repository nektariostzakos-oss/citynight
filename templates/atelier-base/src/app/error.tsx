"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useLang } from "../lib/i18n";
import { langPick } from "../lib/langs";

// Root error boundary. Caught by Next when a server component throws
// or a client component crashes during render.

const copy = {
  eyebrow: {
    en: "Something went sideways",
    el: "Κάτι πήγε στραβά",
    de: "Etwas ist schiefgelaufen",
    fr: "Quelque chose a déraillé",
    it: "Qualcosa è andato storto",
    es: "Algo se ha torcido",
    nl: "Er ging iets mis",
    pl: "Coś poszło nie tak",
    pt: "Algo correu mal",
    sv: "Något gick snett",
    sq: "Diçka shkoi keq",
  },
  heading: {
    en: "We hit a snag.",
    el: "Παρουσιάστηκε πρόβλημα.",
    de: "Es gab ein Problem.",
    fr: "On a rencontré un pépin.",
    it: "Si è verificato un problema.",
    es: "Hemos tenido un problema.",
    nl: "We liepen tegen een probleem aan.",
    pl: "Natrafiliśmy na problem.",
    pt: "Encontrámos um problema.",
    sv: "Vi stötte på ett problem.",
    sq: "Hasëm një problem.",
  },
  body: {
    en: "This has been logged. In the meantime, try reloading or head back home.",
    el: "Το σφάλμα καταγράφηκε. Δοκιμάστε να ανανεώσετε τη σελίδα ή επιστρέψτε στην αρχική.",
    de: "Der Fehler wurde protokolliert. Lade die Seite neu oder kehre zur Startseite zurück.",
    fr: "L'incident a été enregistré. En attendant, rechargez la page ou revenez à l'accueil.",
    it: "L'errore è stato registrato. Nel frattempo, prova a ricaricare o torna alla home.",
    es: "El error ha quedado registrado. Mientras tanto, recarga la página o vuelve al inicio.",
    nl: "De fout is geregistreerd. Probeer ondertussen te herladen of ga terug naar home.",
    pl: "Błąd został zapisany. W międzyczasie odśwież stronę lub wróć na stronę główną.",
    pt: "O erro ficou registado. Entretanto, recarrega a página ou volta ao início.",
    sv: "Felet har loggats. Försök under tiden att ladda om sidan eller gå tillbaka hem.",
    sq: "Gabimi u regjistrua. Ndërkohë, provo ta rifreskosh faqen ose kthehu te ballina.",
  },
  retry: {
    en: "Try again",
    el: "Δοκιμάστε ξανά",
    de: "Erneut versuchen",
    fr: "Réessayer",
    it: "Riprova",
    es: "Reintentar",
    nl: "Opnieuw proberen",
    pl: "Spróbuj ponownie",
    pt: "Tentar de novo",
    sv: "Försök igen",
    sq: "Provo sërish",
  },
  home: {
    en: "Back home",
    el: "Αρχική",
    de: "Zur Startseite",
    fr: "Retour à l'accueil",
    it: "Torna alla home",
    es: "Volver al inicio",
    nl: "Terug naar home",
    pl: "Wróć na stronę główną",
    pt: "Voltar ao início",
    sv: "Tillbaka hem",
    sq: "Kthehu te ballina",
  },
} satisfies Record<string, Record<string, string>>;

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // useLang() falls back gracefully to "en" when called outside the provider
  // (e.g. when the root layout itself crashes before LangProvider renders).
  const { lang } = useLang();
  const t = (k: keyof typeof copy) => langPick(copy[k], lang);

  useEffect(() => {
    console.error("[app:error]", error.message, error.digest);
  }, [error]);

  return (
    <main className="flex min-h-[60vh] items-center justify-center px-6 py-24">
      <div className="mx-auto max-w-md text-center">
        <p className="text-[10px] uppercase tracking-[0.4em]" style={{ color: "var(--gold)" }}>
          {t("eyebrow")}
        </p>
        <h1 className="mt-3 font-serif text-3xl sm:text-4xl" style={{ color: "var(--foreground)" }}>
          {t("heading")}
        </h1>
        <p className="mt-4 text-sm" style={{ color: "var(--muted)" }}>
          {t("body")}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => reset()}
            className="inline-flex items-center rounded-full px-5 py-2.5 text-xs font-semibold uppercase tracking-widest"
            style={{ background: "var(--gold)", color: "var(--background)" }}
          >
            {t("retry")}
          </button>
          <Link
            href="/"
            className="inline-flex items-center rounded-full border px-5 py-2.5 text-xs font-semibold uppercase tracking-widest"
            style={{ borderColor: "var(--border-strong)", color: "var(--foreground)" }}
          >
            {t("home")}
          </Link>
        </div>
      </div>
    </main>
  );
}
