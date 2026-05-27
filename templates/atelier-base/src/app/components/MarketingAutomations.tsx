"use client";

/**
 * Lifecycle automations panel for the tenant marketing suite.
 *
 * Renders the four built-in automation types as editable cards. Each card has:
 *   - On/off switch (toggles `enabled`).
 *   - Channel pickers (push / email / sms).
 *   - Message editor per selected channel.
 *   - Type-specific param field (days, visit count).
 *   - Optional coupon code field.
 *   - "Sent N times" badge from the dedup ledger.
 *
 * The server page pre-loads initialAutomations to avoid a first-paint spinner.
 * All mutations go through PATCH /api/admin/marketing/automations.
 */

import { useCallback, useEffect, useState } from "react";
import type { Lang } from "../../lib/langs";
import { withBasePath } from "../../lib/basePath";

// ---- Types ------------------------------------------------------------------

type AutomationChannel = "push" | "email" | "sms";
type AutomationType = "win_back" | "birthday" | "rebooking" | "loyalty";

type AutomationMessages = {
  push?: { title: string; body: string; url?: string };
  email?: { subject: string; body: string };
  sms?: { text: string };
};

type AutomationParams = Record<string, number>;

type Automation = {
  id: string;
  type: AutomationType;
  name: string;
  enabled: boolean;
  channels: AutomationChannel[];
  messages: AutomationMessages;
  couponCode?: string;
  params: AutomationParams;
  sentCount: number;
  updatedAt: string;
};

// ---- Copy (11 languages) ---------------------------------------------------

type Copy = Record<Lang, string>;

const C: Record<string, Copy> = {
  heading: {
    en: "Lifecycle automations",
    el: "Αυτοματισμοί ζωτικού κύκλου",
    de: "Lifecycle-Automatisierungen",
    fr: "Automatisations cycle de vie",
    it: "Automazioni del ciclo di vita",
    es: "Automatizaciones del ciclo de vida",
    nl: "Levenscyclus-automatiseringen",
    pl: "Automatyzacje cyklu życia",
    pt: "Automações do ciclo de vida",
    sv: "Livscykelautomationer",
    sq: "Automatizime cikli jete",
  },
  featureOff: {
    en: "The Automations feature is currently disabled. Contact your platform operator to enable it.",
    el: "Η λειτουργία Αυτοματισμών είναι απενεργοποιημένη.",
    de: "Die Automations-Funktion ist derzeit deaktiviert.",
    fr: "La fonctionnalité Automatisations est désactivée.",
    it: "La funzionalità Automazioni è attualmente disabilitata.",
    es: "La función de Automatizaciones está desactivada.",
    nl: "De functie Automatiseringen is momenteel uitgeschakeld.",
    pl: "Funkcja Automatyzacje jest obecnie wyłączona.",
    pt: "A funcionalidade de Automações está desativada.",
    sv: "Funktionen Automatiseringar är för närvarande inaktiverad.",
    sq: "Funksioni i Automatizimeve është çaktivizuar.",
  },
  enabled: {
    en: "Enabled",
    el: "Ενεργό",
    de: "Aktiviert",
    fr: "Activé",
    it: "Abilitato",
    es: "Habilitado",
    nl: "Ingeschakeld",
    pl: "Włączony",
    pt: "Ativado",
    sv: "Aktiverad",
    sq: "I aktivizuar",
  },
  disabled: {
    en: "Disabled",
    el: "Ανενεργό",
    de: "Deaktiviert",
    fr: "Désactivé",
    it: "Disabilitato",
    es: "Deshabilitado",
    nl: "Uitgeschakeld",
    pl: "Wyłączony",
    pt: "Desativado",
    sv: "Inaktiverad",
    sq: "I çaktivizuar",
  },
  channels: {
    en: "Channels",
    el: "Κανάλια",
    de: "Kanäle",
    fr: "Canaux",
    it: "Canali",
    es: "Canales",
    nl: "Kanalen",
    pl: "Kanały",
    pt: "Canais",
    sv: "Kanaler",
    sq: "Kanale",
  },
  messagePush: {
    en: "Push message",
    el: "Μήνυμα push",
    de: "Push-Nachricht",
    fr: "Message push",
    it: "Messaggio push",
    es: "Mensaje push",
    nl: "Push-bericht",
    pl: "Wiadomość push",
    pt: "Mensagem push",
    sv: "Push-meddelande",
    sq: "Mesazh push",
  },
  messageEmail: {
    en: "Email message",
    el: "Μήνυμα email",
    de: "E-Mail-Nachricht",
    fr: "Message email",
    it: "Messaggio email",
    es: "Mensaje de correo",
    nl: "E-mailbericht",
    pl: "Wiadomość e-mail",
    pt: "Mensagem de email",
    sv: "E-postmeddelande",
    sq: "Mesazh email",
  },
  messageSms: {
    en: "SMS message",
    el: "Μήνυμα SMS",
    de: "SMS-Nachricht",
    fr: "Message SMS",
    it: "Messaggio SMS",
    es: "Mensaje SMS",
    nl: "SMS-bericht",
    pl: "Wiadomość SMS",
    pt: "Mensagem SMS",
    sv: "SMS-meddelande",
    sq: "Mesazh SMS",
  },
  pushTitle: {
    en: "Title",
    el: "Τίτλος",
    de: "Titel",
    fr: "Titre",
    it: "Titolo",
    es: "Título",
    nl: "Titel",
    pl: "Tytuł",
    pt: "Título",
    sv: "Titel",
    sq: "Titull",
  },
  pushBody: {
    en: "Body",
    el: "Περιεχόμενο",
    de: "Text",
    fr: "Corps",
    it: "Corpo",
    es: "Cuerpo",
    nl: "Tekst",
    pl: "Treść",
    pt: "Corpo",
    sv: "Text",
    sq: "Tekst",
  },
  pushUrl: {
    en: "URL (optional)",
    el: "URL (προαιρετικό)",
    de: "URL (optional)",
    fr: "URL (optionnel)",
    it: "URL (opzionale)",
    es: "URL (opcional)",
    nl: "URL (optioneel)",
    pl: "URL (opcjonalny)",
    pt: "URL (opcional)",
    sv: "URL (valfritt)",
    sq: "URL (opsionale)",
  },
  emailSubject: {
    en: "Subject",
    el: "Θέμα",
    de: "Betreff",
    fr: "Objet",
    it: "Oggetto",
    es: "Asunto",
    nl: "Onderwerp",
    pl: "Temat",
    pt: "Assunto",
    sv: "Ämne",
    sq: "Subjekt",
  },
  emailBody: {
    en: "Body (HTML allowed). Use {name} for the client name, {coupon} for the coupon code.",
    el: "Περιεχόμενο (HTML επιτρέπεται). Χρήση {name} για το όνομα, {coupon} για τον κωδικό.",
    de: "Text (HTML erlaubt). {name} für den Kundennamen, {coupon} für den Gutscheincode.",
    fr: "Corps (HTML autorisé). Utilisez {name} pour le nom, {coupon} pour le code promo.",
    it: "Corpo (HTML consentito). Usa {name} per il nome cliente, {coupon} per il codice sconto.",
    es: "Cuerpo (HTML permitido). Usa {name} para el nombre, {coupon} para el código de cupón.",
    nl: "Tekst (HTML toegestaan). Gebruik {name} voor de naam, {coupon} voor de kortingscode.",
    pl: "Treść (HTML dozwolony). Użyj {name} dla imienia, {coupon} dla kodu kuponu.",
    pt: "Corpo (HTML permitido). Use {name} para o nome, {coupon} para o código de cupão.",
    sv: "Text (HTML tillåtet). Använd {name} för namn, {coupon} för kupongkoden.",
    sq: "Tekst (HTML i lejuar). Përdor {name} për emrin, {coupon} për kodin e kuponit.",
  },
  smsText: {
    en: "Text. Use {name} for client name, {coupon} for coupon code.",
    el: "Κείμενο. Χρήση {name} για το όνομα, {coupon} για τον κωδικό.",
    de: "Text. {name} für den Namen, {coupon} für den Code.",
    fr: "Texte. Utilisez {name} pour le nom, {coupon} pour le code.",
    it: "Testo. Usa {name} per il nome, {coupon} per il codice.",
    es: "Texto. Usa {name} para el nombre, {coupon} para el código.",
    nl: "Tekst. Gebruik {name} voor de naam, {coupon} voor de code.",
    pl: "Tekst. Użyj {name} dla imienia, {coupon} dla kodu.",
    pt: "Texto. Use {name} para o nome, {coupon} para o código.",
    sv: "Text. Använd {name} för namn, {coupon} för koden.",
    sq: "Tekst. Përdor {name} për emrin, {coupon} për kodin.",
  },
  couponCode: {
    en: "Coupon code (optional)",
    el: "Κωδικός κουπονιού (προαιρετικό)",
    de: "Gutscheincode (optional)",
    fr: "Code promo (optionnel)",
    it: "Codice coupon (opzionale)",
    es: "Código de cupón (opcional)",
    nl: "Kortingscode (optioneel)",
    pl: "Kod kuponu (opcjonalny)",
    pt: "Código de cupão (opcional)",
    sv: "Kupongkod (valfritt)",
    sq: "Kodi i kuponit (opsional)",
  },
  daysSince: {
    en: "Days without a visit",
    el: "Ημέρες χωρίς επίσκεψη",
    de: "Tage ohne Besuch",
    fr: "Jours sans visite",
    it: "Giorni senza visita",
    es: "Días sin visita",
    nl: "Dagen zonder bezoek",
    pl: "Dni bez wizyty",
    pt: "Dias sem visita",
    sv: "Dagar utan besök",
    sq: "Ditë pa vizitë",
  },
  daysAfter: {
    en: "Days after visit",
    el: "Ημέρες μετά την επίσκεψη",
    de: "Tage nach dem Besuch",
    fr: "Jours après la visite",
    it: "Giorni dopo la visita",
    es: "Días después de la visita",
    nl: "Dagen na het bezoek",
    pl: "Dni po wizycie",
    pt: "Dias após a visita",
    sv: "Dagar efter besök",
    sq: "Ditë pas vizitës",
  },
  everyNVisits: {
    en: "Every N visits",
    el: "Κάθε N επισκέψεις",
    de: "Alle N Besuche",
    fr: "Tous les N visites",
    it: "Ogni N visite",
    es: "Cada N visitas",
    nl: "Elke N bezoeken",
    pl: "Co N wizyt",
    pt: "A cada N visitas",
    sv: "Var N:e besök",
    sq: "Çdo N vizita",
  },
  save: {
    en: "Save",
    el: "Αποθήκευση",
    de: "Speichern",
    fr: "Enregistrer",
    it: "Salva",
    es: "Guardar",
    nl: "Opslaan",
    pl: "Zapisz",
    pt: "Guardar",
    sv: "Spara",
    sq: "Ruaj",
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
    sq: "Po ruhet...",
  },
  saved: {
    en: "Saved",
    el: "Αποθηκεύτηκε",
    de: "Gespeichert",
    fr: "Enregistré",
    it: "Salvato",
    es: "Guardado",
    nl: "Opgeslagen",
    pl: "Zapisano",
    pt: "Guardado",
    sv: "Sparat",
    sq: "U ruajt",
  },
  saveError: {
    en: "Failed to save. Please try again.",
    el: "Αποτυχία αποθήκευσης. Παρακαλώ δοκιμάστε ξανά.",
    de: "Speichern fehlgeschlagen.",
    fr: "Échec de l'enregistrement.",
    it: "Salvataggio non riuscito.",
    es: "Error al guardar.",
    nl: "Opslaan mislukt.",
    pl: "Błąd zapisu.",
    pt: "Falha ao guardar.",
    sv: "Det gick inte att spara.",
    sq: "Ruajtja dështoi.",
  },
  sentCount: {
    en: "sent",
    el: "απεστάλη",
    de: "gesendet",
    fr: "envoyé",
    it: "inviato",
    es: "enviado",
    nl: "verzonden",
    pl: "wysłano",
    pt: "enviado",
    sv: "skickat",
    sq: "dërguar",
  },
  typeLabel: {
    en: "Type",
    el: "Τύπος",
    de: "Typ",
    fr: "Type",
    it: "Tipo",
    es: "Tipo",
    nl: "Type",
    pl: "Typ",
    pt: "Tipo",
    sv: "Typ",
    sq: "Lloji",
  },
};

const TYPE_LABELS: Record<AutomationType, Copy> = {
  win_back: {
    en: "Win-back",
    el: "Επανενεργοποίηση",
    de: "Win-back",
    fr: "Reconquête",
    it: "Win-back",
    es: "Recuperación",
    nl: "Win-back",
    pl: "Win-back",
    pt: "Recuperação",
    sv: "Win-back",
    sq: "Rikthim",
  },
  birthday: {
    en: "Birthday offer",
    el: "Προσφορά γενεθλίων",
    de: "Geburtstagsangebot",
    fr: "Offre anniversaire",
    it: "Offerta di compleanno",
    es: "Oferta de cumpleaños",
    nl: "Verjaardagsaanbieding",
    pl: "Oferta urodzinowa",
    pt: "Oferta de aniversário",
    sv: "Födelsdagserbjudande",
    sq: "Ofertë ditëlindjeje",
  },
  rebooking: {
    en: "Rebooking nudge",
    el: "Υπενθύμιση επανακράτησης",
    de: "Wiederbuchungs-Nudge",
    fr: "Rappel de réservation",
    it: "Promemoria prenotazione",
    es: "Recordatorio de reserva",
    nl: "Herboeking herinnering",
    pl: "Przypomnienie rezerwacji",
    pt: "Lembrete de reserva",
    sv: "Ombokningstips",
    sq: "Kujtesë ribukimi",
  },
  loyalty: {
    en: "Loyalty milestone",
    el: "Επίτευγμα πιστότητας",
    de: "Treue-Meilenstein",
    fr: "Jalon de fidélité",
    it: "Traguardo di fedeltà",
    es: "Hito de fidelidad",
    nl: "Loyaliteitsmijlpaal",
    pl: "Kamień milowy lojalnościowy",
    pt: "Marco de fidelidade",
    sv: "Lojalitetsmilstolpe",
    sq: "Guri kilometrik i besnikërisë",
  },
};

function t(key: string, lang: Lang): string {
  return C[key]?.[lang] ?? C[key]?.en ?? key;
}

function tType(type: AutomationType, lang: Lang): string {
  return TYPE_LABELS[type]?.[lang] ?? TYPE_LABELS[type]?.en ?? type;
}

// ---- Subcomponents -----------------------------------------------------------

type ChannelPickerProps = {
  selected: AutomationChannel[];
  onChange: (channels: AutomationChannel[]) => void;
  lang: Lang;
};

function ChannelPicker({ selected, onChange, lang }: ChannelPickerProps) {
  const channels: AutomationChannel[] = ["push", "email", "sms"];
  return (
    <div className="flex flex-wrap gap-2">
      {channels.map((ch) => {
        const on = selected.includes(ch);
        return (
          <button
            key={ch}
            type="button"
            onClick={() =>
              onChange(
                on ? selected.filter((c) => c !== ch) : [...selected, ch],
              )
            }
            className={`rounded-full border px-3 py-1 text-xs uppercase tracking-widest transition-colors ${
              on
                ? "border-[#c9a961] bg-[#c9a961]/20 text-[#c9a961]"
                : "border-white/15 text-white/50 hover:border-white/30"
            }`}
          >
            {ch}
          </button>
        );
      })}
    </div>
  );
}

type MessageEditorProps = {
  channels: AutomationChannel[];
  messages: AutomationMessages;
  onChange: (messages: AutomationMessages) => void;
  lang: Lang;
};

function MessageEditor({
  channels,
  messages,
  onChange,
  lang,
}: MessageEditorProps) {
  function setMsg(
    ch: AutomationChannel,
    field: string,
    value: string,
  ) {
    const next = { ...messages };
    if (ch === "push") {
      next.push = { title: "", body: "", ...(next.push ?? {}), [field]: value };
    } else if (ch === "email") {
      next.email = {
        subject: "",
        body: "",
        ...(next.email ?? {}),
        [field]: value,
      };
    } else if (ch === "sms") {
      next.sms = { text: value };
    }
    onChange(next);
  }

  return (
    <div className="space-y-5">
      {channels.includes("push") && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-widest text-[#c9a961]/80">
            {t("messagePush", lang)}
          </p>
          <input
            type="text"
            value={messages.push?.title ?? ""}
            onChange={(e) => setMsg("push", "title", e.target.value)}
            placeholder={t("pushTitle", lang)}
            className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-white/30 focus:border-[#c9a961]/50 focus:outline-none"
          />
          <input
            type="text"
            value={messages.push?.body ?? ""}
            onChange={(e) => setMsg("push", "body", e.target.value)}
            placeholder={t("pushBody", lang)}
            className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-white/30 focus:border-[#c9a961]/50 focus:outline-none"
          />
          <input
            type="url"
            value={messages.push?.url ?? ""}
            onChange={(e) => setMsg("push", "url", e.target.value)}
            placeholder={t("pushUrl", lang)}
            className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-white/30 focus:border-[#c9a961]/50 focus:outline-none"
          />
        </div>
      )}

      {channels.includes("email") && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-widest text-[#c9a961]/80">
            {t("messageEmail", lang)}
          </p>
          <input
            type="text"
            value={messages.email?.subject ?? ""}
            onChange={(e) => setMsg("email", "subject", e.target.value)}
            placeholder={t("emailSubject", lang)}
            className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-white/30 focus:border-[#c9a961]/50 focus:outline-none"
          />
          <textarea
            rows={4}
            value={messages.email?.body ?? ""}
            onChange={(e) => setMsg("email", "body", e.target.value)}
            placeholder={t("emailBody", lang)}
            className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-white/30 focus:border-[#c9a961]/50 focus:outline-none"
          />
        </div>
      )}

      {channels.includes("sms") && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-widest text-[#c9a961]/80">
            {t("messageSms", lang)}
          </p>
          <textarea
            rows={3}
            value={messages.sms?.text ?? ""}
            onChange={(e) => setMsg("sms", "text", e.target.value)}
            placeholder={t("smsText", lang)}
            className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-white/30 focus:border-[#c9a961]/50 focus:outline-none"
          />
        </div>
      )}
    </div>
  );
}

// ---- Save state per card -----------------------------------------------------

type SaveState = "idle" | "saving" | "saved" | "error";

// ---- Automation card ---------------------------------------------------------

type CardProps = {
  automation: Automation;
  lang: Lang;
  onSaved: (updated: Automation) => void;
};

function AutomationCard({ automation, lang, onSaved }: CardProps) {
  const [enabled, setEnabled] = useState(automation.enabled);
  const [channels, setChannels] = useState<AutomationChannel[]>(
    automation.channels,
  );
  const [messages, setMessages] = useState<AutomationMessages>(
    automation.messages,
  );
  const [params, setParams] = useState<AutomationParams>(
    automation.params as AutomationParams,
  );
  const [couponCode, setCouponCode] = useState(automation.couponCode ?? "");
  const [saveState, setSaveState] = useState<SaveState>("idle");

  async function save() {
    setSaveState("saving");
    try {
      const res = await fetch(withBasePath("/api/admin/marketing/automations"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: automation.id,
          enabled,
          channels,
          messages,
          params,
          couponCode: couponCode || null,
        }),
      });
      if (!res.ok) {
        setSaveState("error");
        return;
      }
      const data = (await res.json()) as { automation?: Automation };
      if (data.automation) onSaved(data.automation);
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2500);
    } catch {
      setSaveState("error");
    }
  }

  // Param field label + key by type.
  const paramKey =
    automation.type === "win_back"
      ? "daysSince"
      : automation.type === "rebooking"
        ? "daysAfter"
        : automation.type === "loyalty"
          ? "everyNVisits"
          : null;

  const paramLabel =
    paramKey === "daysSince"
      ? t("daysSince", lang)
      : paramKey === "daysAfter"
        ? t("daysAfter", lang)
        : paramKey === "everyNVisits"
          ? t("everyNVisits", lang)
          : null;

  return (
    <div
      className={`rounded-xl border transition-colors ${
        enabled
          ? "border-[#c9a961]/30 bg-[#c9a961]/5"
          : "border-white/10 bg-white/[0.02]"
      } p-5 sm:p-6`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-[10px] uppercase tracking-[0.3em] text-[#c9a961]/70">
            {tType(automation.type, lang)}
          </span>
          <h3 className="mt-0.5 text-base font-semibold text-white">
            {automation.name}
          </h3>
          {automation.sentCount > 0 && (
            <p className="mt-0.5 text-xs text-white/40">
              {automation.sentCount} {t("sentCount", lang)}
            </p>
          )}
        </div>

        {/* On/off toggle */}
        <button
          type="button"
          onClick={() => setEnabled((v) => !v)}
          aria-pressed={enabled}
          className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors focus:outline-none ${
            enabled ? "bg-[#c9a961]" : "bg-white/20"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
              enabled ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
          <span className="sr-only">
            {enabled ? t("enabled", lang) : t("disabled", lang)}
          </span>
        </button>
      </div>

      {/* Channel pickers */}
      <div className="mt-4 space-y-1.5">
        <p className="text-xs text-white/50">{t("channels", lang)}</p>
        <ChannelPicker
          selected={channels}
          onChange={setChannels}
          lang={lang}
        />
      </div>

      {/* Type-specific param */}
      {paramKey && paramLabel && (
        <div className="mt-4 space-y-1.5">
          <label className="text-xs text-white/50">{paramLabel}</label>
          <input
            type="number"
            min={1}
            value={(params[paramKey] as number) ?? 0}
            onChange={(e) =>
              setParams((p) => ({
                ...p,
                [paramKey]: parseInt(e.target.value, 10) || 0,
              }))
            }
            className="w-28 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white focus:border-[#c9a961]/50 focus:outline-none"
          />
        </div>
      )}

      {/* Message editor (only when at least one channel is selected) */}
      {channels.length > 0 && (
        <div className="mt-5">
          <MessageEditor
            channels={channels}
            messages={messages}
            onChange={setMessages}
            lang={lang}
          />
        </div>
      )}

      {/* Coupon code */}
      <div className="mt-4 space-y-1.5">
        <label className="text-xs text-white/50">{t("couponCode", lang)}</label>
        <input
          type="text"
          value={couponCode}
          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
          placeholder="WELCOME20"
          className="w-48 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm uppercase tracking-widest text-white placeholder-white/20 focus:border-[#c9a961]/50 focus:outline-none"
        />
      </div>

      {/* Save button */}
      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saveState === "saving"}
          className="rounded-full bg-[#c9a961] px-5 py-2 text-xs font-semibold uppercase tracking-widest text-[#0a0806] transition-opacity disabled:opacity-60 hover:opacity-90"
        >
          {saveState === "saving"
            ? t("saving", lang)
            : saveState === "saved"
              ? t("saved", lang)
              : t("save", lang)}
        </button>
        {saveState === "error" && (
          <p className="text-xs text-red-400">{t("saveError", lang)}</p>
        )}
      </div>
    </div>
  );
}

// ---- Root component ----------------------------------------------------------

type Props = {
  initialAutomations: Automation[];
  featureOn: boolean;
  lang: Lang;
};

export default function MarketingAutomations({
  initialAutomations,
  featureOn,
  lang,
}: Props) {
  const [automations, setAutomations] =
    useState<Automation[]>(initialAutomations);

  // Refresh from the API on mount so we always show current sent counts.
  useEffect(() => {
    fetch(withBasePath("/api/admin/marketing/automations"))
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.automations) setAutomations(data.automations as Automation[]);
      })
      .catch(() => undefined);
  }, []);

  const handleSaved = useCallback((updated: Automation) => {
    setAutomations((prev) =>
      prev.map((a) => (a.id === updated.id ? { ...a, ...updated } : a)),
    );
  }, []);

  if (!featureOn) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center">
        <p className="text-sm text-white/50">{t("featureOff", lang)}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="font-serif text-lg font-semibold text-white">
        {t("heading", lang)}
      </h2>
      <div className="space-y-4">
        {automations.map((a) => (
          <AutomationCard
            key={a.id}
            automation={a}
            lang={lang}
            onSaved={handleSaved}
          />
        ))}
      </div>
    </div>
  );
}
