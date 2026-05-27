"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { Lang } from "../../../../lib/langs";
import { withBasePath } from "../../../../lib/basePath";

/**
 * Public customer preference center.
 *
 * Reached from the unsubscribe / preferences link in every marketing email
 * and SMS. The URL carries a signed, time-limited HMAC token — no admin
 * session required. The API route validates the token before any read or write.
 *
 * The customer sees per-channel toggles (push / email / sms) and an
 * "unsubscribe from everything" action. A POST persists the choice.
 *
 * Root-clean: no hardcoded slug / /_t / /barber. Page sits at:
 *   /marketing/preferences/<token>              (standalone / customer ZIP)
 *   /<slug>/marketing/preferences/<token>       (SaaS tenant)
 *
 * L10n: all visible strings are L10nStr records across all 11 languages.
 * Language is detected from navigator.language with English fallback.
 */

type L10nStr = Record<Lang, string>;

// ---- Copy (11 languages) -------------------------------------------------------

const COPY: {
  title: L10nStr;
  subtitle: L10nStr;
  pushLabel: L10nStr;
  pushDesc: L10nStr;
  emailLabel: L10nStr;
  emailDesc: L10nStr;
  smsLabel: L10nStr;
  smsDesc: L10nStr;
  save: L10nStr;
  saving: L10nStr;
  saved: L10nStr;
  unsubAll: L10nStr;
  unsubAllConfirm: L10nStr;
  unsubAllDone: L10nStr;
  errorInvalid: L10nStr;
  errorGeneric: L10nStr;
  loading: L10nStr;
} = {
  title: {
    en: "Communication preferences",
    el: "Προτιμήσεις επικοινωνίας",
    de: "Kommunikationspräferenzen",
    fr: "Préférences de communication",
    it: "Preferenze di comunicazione",
    es: "Preferencias de comunicación",
    nl: "Communicatievoorkeuren",
    pl: "Preferencje komunikacji",
    pt: "Preferências de comunicação",
    sv: "Kommunikationsinställningar",
    sq: "Preferencat e komunikimit",
  },
  subtitle: {
    en: "Choose which messages you want to receive from us.",
    el: "Επίλεξε ποια μηνύματα θέλεις να λαμβάνεις από εμάς.",
    de: "Wählen Sie, welche Nachrichten Sie von uns erhalten möchten.",
    fr: "Choisissez les messages que vous souhaitez recevoir de notre part.",
    it: "Scegli quali messaggi vuoi ricevere da noi.",
    es: "Elige qué mensajes deseas recibir de nuestra parte.",
    nl: "Kies welke berichten je van ons wilt ontvangen.",
    pl: "Wybierz, jakie wiadomości chcesz od nas otrzymywać.",
    pt: "Escolha quais mensagens deseja receber de nós.",
    sv: "Välj vilka meddelanden du vill ta emot från oss.",
    sq: "Zgjidhni cilat mesazhe dëshironi të merrni nga ne.",
  },
  pushLabel: {
    en: "Push notifications",
    el: "Ειδοποιήσεις push",
    de: "Push-Benachrichtigungen",
    fr: "Notifications push",
    it: "Notifiche push",
    es: "Notificaciones push",
    nl: "Pushmeldingen",
    pl: "Powiadomienia push",
    pt: "Notificações push",
    sv: "Push-aviseringar",
    sq: "Njoftimet push",
  },
  pushDesc: {
    en: "Browser and device notifications",
    el: "Ειδοποιήσεις browser και συσκευής",
    de: "Browser- und Gerätebenachrichtigungen",
    fr: "Notifications navigateur et appareil",
    it: "Notifiche browser e dispositivo",
    es: "Notificaciones del navegador y el dispositivo",
    nl: "Browser- en apparaatmeldingen",
    pl: "Powiadomienia przeglądarki i urządzenia",
    pt: "Notificações do navegador e dispositivo",
    sv: "Webbläsar- och enhetsaviseringar",
    sq: "Njoftime nga shfletuesi dhe pajisja",
  },
  emailLabel: {
    en: "Email marketing",
    el: "Μάρκετινγκ μέσω email",
    de: "E-Mail-Marketing",
    fr: "Marketing par e-mail",
    it: "Marketing via email",
    es: "Marketing por correo electrónico",
    nl: "E-mailmarketing",
    pl: "Marketing e-mailowy",
    pt: "Marketing por email",
    sv: "E-postmarknadsföring",
    sq: "Marketing me email",
  },
  emailDesc: {
    en: "Offers, news and promotions by email",
    el: "Προσφορές, νέα και προωθήσεις μέσω email",
    de: "Angebote, Neuigkeiten und Aktionen per E-Mail",
    fr: "Offres, actualités et promotions par e-mail",
    it: "Offerte, novità e promozioni via email",
    es: "Ofertas, noticias y promociones por email",
    nl: "Aanbiedingen, nieuws en promoties per e-mail",
    pl: "Oferty, aktualności i promocje pocztą e-mail",
    pt: "Ofertas, novidades e promoções por email",
    sv: "Erbjudanden, nyheter och kampanjer via e-post",
    sq: "Oferta, lajme dhe promovime me email",
  },
  smsLabel: {
    en: "SMS messages",
    el: "Μηνύματα SMS",
    de: "SMS-Nachrichten",
    fr: "Messages SMS",
    it: "Messaggi SMS",
    es: "Mensajes SMS",
    nl: "Sms-berichten",
    pl: "Wiadomości SMS",
    pt: "Mensagens SMS",
    sv: "SMS-meddelanden",
    sq: "Mesazhe SMS",
  },
  smsDesc: {
    en: "Text promotions and reminders",
    el: "Προωθήσεις και υπενθυμίσεις SMS",
    de: "SMS-Aktionen und Erinnerungen",
    fr: "Promotions et rappels par SMS",
    it: "Promozioni e promemoria via SMS",
    es: "Promociones y recordatorios por SMS",
    nl: "Sms-promoties en herinneringen",
    pl: "Promocje i przypomnienia SMS",
    pt: "Promoções e lembretes por SMS",
    sv: "SMS-kampanjer och påminnelser",
    sq: "Promovime dhe kujtesa me SMS",
  },
  save: {
    en: "Save preferences",
    el: "Αποθήκευση προτιμήσεων",
    de: "Präferenzen speichern",
    fr: "Enregistrer les préférences",
    it: "Salva preferenze",
    es: "Guardar preferencias",
    nl: "Voorkeuren opslaan",
    pl: "Zapisz preferencje",
    pt: "Guardar preferências",
    sv: "Spara inställningar",
    sq: "Ruaj preferencat",
  },
  saving: {
    en: "Saving...",
    el: "Αποθήκευση...",
    de: "Wird gespeichert...",
    fr: "Enregistrement...",
    it: "Salvataggio...",
    es: "Guardando...",
    nl: "Opslaan...",
    pl: "Zapisywanie...",
    pt: "A guardar...",
    sv: "Sparar...",
    sq: "Po ruaj...",
  },
  saved: {
    en: "Preferences saved.",
    el: "Οι προτιμήσεις αποθηκεύτηκαν.",
    de: "Präferenzen gespeichert.",
    fr: "Préférences enregistrées.",
    it: "Preferenze salvate.",
    es: "Preferencias guardadas.",
    nl: "Voorkeuren opgeslagen.",
    pl: "Preferencje zapisane.",
    pt: "Preferências guardadas.",
    sv: "Inställningar sparade.",
    sq: "Preferencat u ruajtën.",
  },
  unsubAll: {
    en: "Unsubscribe from all messages",
    el: "Διαγραφή από όλα τα μηνύματα",
    de: "Von allen Nachrichten abmelden",
    fr: "Se désabonner de tous les messages",
    it: "Annulla iscrizione a tutti i messaggi",
    es: "Cancelar suscripción a todos los mensajes",
    nl: "Afmelden voor alle berichten",
    pl: "Zrezygnuj ze wszystkich wiadomości",
    pt: "Cancelar subscrição de todas as mensagens",
    sv: "Avsluta alla prenumerationer",
    sq: "Çregjistrohu nga të gjitha mesazhet",
  },
  unsubAllConfirm: {
    en: "This will turn off all marketing messages. Continue?",
    el: "Αυτό θα απενεργοποιήσει όλα τα μηνύματα μάρκετινγκ. Συνέχεια;",
    de: "Dadurch werden alle Marketingnachrichten deaktiviert. Weiter?",
    fr: "Cela désactivera tous les messages marketing. Continuer ?",
    it: "Verranno disattivati tutti i messaggi di marketing. Continuare?",
    es: "Esto desactivará todos los mensajes de marketing. ¿Continuar?",
    nl: "Hiermee worden alle marketingberichten uitgeschakeld. Doorgaan?",
    pl: "Spowoduje to wyłączenie wszystkich wiadomości marketingowych. Kontynuować?",
    pt: "Isto irá desativar todas as mensagens de marketing. Continuar?",
    sv: "Det här stänger av alla marknadsföringsmeddelanden. Fortsätta?",
    sq: "Kjo do të çaktivizojë të gjitha mesazhet e marketingut. Vazhdo?",
  },
  unsubAllDone: {
    en: "You have been unsubscribed from all marketing messages.",
    el: "Έχετε διαγραφεί από όλα τα μηνύματα μάρκετινγκ.",
    de: "Sie wurden von allen Marketingnachrichten abgemeldet.",
    fr: "Vous avez été désabonné de tous les messages marketing.",
    it: "Sei stato cancellato da tutti i messaggi di marketing.",
    es: "Has sido dado de baja de todos los mensajes de marketing.",
    nl: "Je bent afgemeld voor alle marketingberichten.",
    pl: "Zostałeś wypisany ze wszystkich wiadomości marketingowych.",
    pt: "Foi cancelada a sua subscrição de todas as mensagens de marketing.",
    sv: "Du har avslutat alla dina marknadsföringsprenumerationer.",
    sq: "Jeni çregjistruar nga të gjitha mesazhet e marketingut.",
  },
  errorInvalid: {
    en: "This link has expired or is invalid.",
    el: "Ο σύνδεσμος έχει λήξει ή δεν είναι έγκυρος.",
    de: "Dieser Link ist abgelaufen oder ungültig.",
    fr: "Ce lien a expiré ou est invalide.",
    it: "Questo link è scaduto o non è valido.",
    es: "Este enlace ha caducado o no es válido.",
    nl: "Deze link is verlopen of ongeldig.",
    pl: "Ten link wygasł lub jest nieprawidłowy.",
    pt: "Este link expirou ou é inválido.",
    sv: "Den här länken har gått ut eller är ogiltig.",
    sq: "Ky link ka skaduar ose është i pavlefshëm.",
  },
  errorGeneric: {
    en: "Something went wrong. Please try again.",
    el: "Κάτι πήγε στραβά. Παρακαλούμε δοκίμασε ξανά.",
    de: "Etwas ist schiefgelaufen. Bitte versuchen Sie es erneut.",
    fr: "Une erreur s'est produite. Veuillez réessayer.",
    it: "Qualcosa è andato storto. Riprova.",
    es: "Algo ha salido mal. Por favor, inténtalo de nuevo.",
    nl: "Er is iets misgegaan. Probeer het opnieuw.",
    pl: "Coś poszło nie tak. Spróbuj ponownie.",
    pt: "Algo correu mal. Por favor, tente novamente.",
    sv: "Något gick fel. Försök igen.",
    sq: "Diçka shkoi keq. Ju lutem provoni përsëri.",
  },
  loading: {
    en: "Loading your preferences...",
    el: "Φόρτωση προτιμήσεων...",
    de: "Präferenzen werden geladen...",
    fr: "Chargement de vos préférences...",
    it: "Caricamento delle preferenze...",
    es: "Cargando preferencias...",
    nl: "Voorkeuren laden...",
    pl: "Ładowanie preferencji...",
    pt: "A carregar preferências...",
    sv: "Laddar inställningar...",
    sq: "Po ngarkohen preferencat...",
  },
};

// ---- Language detection --------------------------------------------------------

function detectLang(): Lang {
  if (typeof navigator === "undefined") return "en";
  const code = navigator.language?.slice(0, 2).toLowerCase() as Lang;
  const supported: Lang[] = [
    "en", "el", "de", "fr", "it", "es", "nl", "pl", "pt", "sv", "sq",
  ];
  return supported.includes(code) ? code : "en";
}

function t(rec: L10nStr, lang: Lang): string {
  return rec[lang] ?? rec.en;
}

// ---- Toggle component ----------------------------------------------------------

function Toggle({
  checked,
  onChange,
  label,
  desc,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  desc: string;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
      <div>
        <div className="text-sm font-medium" style={{ color: "var(--foreground, #f5efe6)" }}>
          {label}
        </div>
        <div className="text-xs mt-0.5" style={{ color: "var(--muted, rgba(245,239,230,0.65))" }}>
          {desc}
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className="relative ml-4 flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 disabled:opacity-40"
        style={{
          background: checked ? "#c9a961" : "rgba(255,255,255,0.15)",
          cursor: disabled ? "not-allowed" : "pointer",
          border: "none",
        }}
      >
        <span
          className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-transform duration-200"
          style={{
            background: "#fff",
            transform: checked ? "translateX(20px)" : "translateX(0)",
          }}
        />
      </button>
    </div>
  );
}

// ---- Page stages ---------------------------------------------------------------

type Stage = "loading" | "invalid" | "ready" | "unsubbed";

// ---- Main page component -------------------------------------------------------

export default function PreferencesPage() {
  const params = useParams<{ token: string }>();
  const token = params.token ?? "";

  const [lang, setLang] = useState<Lang>("en");
  const [stage, setStage] = useState<Stage>("loading");
  const [push, setPushPref] = useState(true);
  const [email, setEmailPref] = useState(true);
  const [sms, setSmsPref] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Detect language and load current prefs on mount.
  useEffect(() => {
    setLang(detectLang());

    async function load() {
      try {
        const res = await fetch(
          withBasePath(`/api/marketing/preferences/${encodeURIComponent(token)}`),
          { method: "GET" },
        );
        if (!res.ok) {
          setStage("invalid");
          return;
        }
        const data: { push: boolean; email: boolean; sms: boolean } =
          await res.json();
        setPushPref(data.push);
        setEmailPref(data.email);
        setSmsPref(data.sms);
        setStage("ready");
      } catch {
        setStage("invalid");
      }
    }

    if (token) load();
    else setStage("invalid");
  }, [token]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const res = await fetch(
        withBasePath(`/api/marketing/preferences/${encodeURIComponent(token)}`),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ push, email, sms }),
        },
      );
      if (!res.ok) {
        const body: { error?: string } = await res.json().catch(() => ({}));
        setError(body.error || t(COPY.errorGeneric, lang));
      } else {
        setSaved(true);
      }
    } catch {
      setError(t(COPY.errorGeneric, lang));
    } finally {
      setSaving(false);
    }
  }

  async function handleUnsubAll() {
    if (!confirm(t(COPY.unsubAllConfirm, lang))) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(
        withBasePath(`/api/marketing/preferences/${encodeURIComponent(token)}`),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ unsubscribeAll: true }),
        },
      );
      if (!res.ok) {
        const body: { error?: string } = await res.json().catch(() => ({}));
        setError(body.error || t(COPY.errorGeneric, lang));
      } else {
        setStage("unsubbed");
      }
    } catch {
      setError(t(COPY.errorGeneric, lang));
    } finally {
      setSaving(false);
    }
  }

  // ---- Render ----------------------------------------------------------------

  const card = (children: React.ReactNode) => (
    <main
      className="flex min-h-[70vh] items-center justify-center px-6 py-16"
      style={{ background: "var(--background, #0a0806)", color: "var(--foreground, #f5efe6)" }}
    >
      <div
        className="mx-auto w-full max-w-md rounded-2xl border p-8"
        style={{
          background: "var(--surface, rgba(255,255,255,0.03))",
          borderColor: "var(--border-strong, rgba(255,255,255,0.18))",
        }}
      >
        {children}
      </div>
    </main>
  );

  if (stage === "loading") {
    return card(
      <p className="text-sm text-center" style={{ color: "var(--muted, rgba(245,239,230,0.65))" }}>
        {t(COPY.loading, lang)}
      </p>,
    );
  }

  if (stage === "invalid") {
    return card(
      <>
        <p
          className="text-[10px] uppercase tracking-[0.3em] mb-3 text-center"
          style={{ color: "#c9a961" }}
        >
          Preferences
        </p>
        <p className="text-sm text-center" style={{ color: "var(--muted, rgba(245,239,230,0.65))" }}>
          {t(COPY.errorInvalid, lang)}
        </p>
      </>,
    );
  }

  if (stage === "unsubbed") {
    return card(
      <>
        <p
          className="text-[10px] uppercase tracking-[0.3em] mb-4 text-center"
          style={{ color: "#c9a961" }}
        >
          Preferences
        </p>
        <p className="text-sm text-center" style={{ color: "var(--muted, rgba(245,239,230,0.65))" }}>
          {t(COPY.unsubAllDone, lang)}
        </p>
      </>,
    );
  }

  return card(
    <>
      <p
        className="text-[10px] uppercase tracking-[0.3em] mb-1"
        style={{ color: "#c9a961" }}
      >
        Preferences
      </p>
      <h1 className="font-serif text-2xl mb-2" style={{ color: "var(--foreground, #f5efe6)" }}>
        {t(COPY.title, lang)}
      </h1>
      <p className="text-sm mb-6" style={{ color: "var(--muted, rgba(245,239,230,0.65))" }}>
        {t(COPY.subtitle, lang)}
      </p>

      <form onSubmit={handleSave}>
        <Toggle
          checked={push}
          onChange={setPushPref}
          label={t(COPY.pushLabel, lang)}
          desc={t(COPY.pushDesc, lang)}
          disabled={saving}
        />
        <Toggle
          checked={email}
          onChange={setEmailPref}
          label={t(COPY.emailLabel, lang)}
          desc={t(COPY.emailDesc, lang)}
          disabled={saving}
        />
        <Toggle
          checked={sms}
          onChange={setSmsPref}
          label={t(COPY.smsLabel, lang)}
          desc={t(COPY.smsDesc, lang)}
          disabled={saving}
        />

        {error && (
          <p className="mt-3 text-xs text-red-400">{error}</p>
        )}
        {saved && !error && (
          <p className="mt-3 text-xs" style={{ color: "#c9a961" }}>
            {t(COPY.saved, lang)}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="mt-6 w-full rounded-full py-2.5 text-sm uppercase tracking-widest transition-colors disabled:opacity-50"
          style={{
            background: "#c9a961",
            color: "#0a0806",
            border: "none",
            cursor: saving ? "not-allowed" : "pointer",
          }}
        >
          {saving ? t(COPY.saving, lang) : t(COPY.save, lang)}
        </button>
      </form>

      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={() => void handleUnsubAll()}
          disabled={saving}
          className="text-xs underline transition-colors disabled:opacity-40"
          style={{ color: "var(--muted, rgba(245,239,230,0.65))", background: "none", border: "none", cursor: "pointer" }}
        >
          {t(COPY.unsubAll, lang)}
        </button>
      </div>
    </>,
  );
}
