"use client";

/**
 * Campaign builder and campaign list for the tenant marketing suite.
 *
 * Lets the salon owner:
 *   - See all campaigns with per-channel delivery stats.
 *   - Create a new campaign: name, segment, channels, per-channel messages,
 *     optional schedule datetime.
 *   - Pause, resume, or cancel a scheduled campaign.
 *
 * Rendered dark to match the rest of the demo admin. The page server component
 * passes initialCampaigns and initialSegments so the first paint is not empty.
 */

import { useCallback, useEffect, useState } from "react";
import { withBasePath } from "../../lib/basePath";

// ---- Types ------------------------------------------------------------------

type CampaignChannel = "push" | "email" | "sms";
type CampaignStatus =
  | "draft"
  | "pending_approval"
  | "scheduled"
  | "sending"
  | "sent"
  | "paused"
  | "canceled"
  | "rejected";

type CampaignMessages = {
  push?: { title: string; body: string; url?: string };
  email?: { subject: string; body: string };
  sms?: { text: string };
};

type ChannelStats = { send: number; fail: number; click: number; open: number };
type EventStats = {
  push: ChannelStats;
  email: ChannelStats;
  sms: ChannelStats;
};

type Campaign = {
  id: string;
  name: string;
  segmentId: string;
  channels: CampaignChannel[];
  messages: CampaignMessages;
  scheduledAt?: string;
  status: CampaignStatus;
  createdAt: string;
  sentAt?: string;
  stats: {
    recipients: number;
    push: { sent: number; failed: number; clicks: number };
    email: { sent: number; failed: number; opens: number; clicks: number };
    sms: { sent: number; failed: number };
  };
  eventStats?: EventStats;
};

type Segment = {
  id: string;
  name: string;
};

// ---- Copy (11 languages) ----------------------------------------------------

type Lang =
  | "en" | "el" | "de" | "fr" | "it" | "es"
  | "nl" | "pl" | "pt" | "sv" | "sq";

type Copy = Record<Lang, string>;

const C: Record<string, Copy> = {
  heading: {
    en: "Campaigns",
    el: "Καμπάνιες",
    de: "Kampagnen",
    fr: "Campagnes",
    it: "Campagne",
    es: "Campañas",
    nl: "Campagnes",
    pl: "Kampanie",
    pt: "Campanhas",
    sv: "Kampanjer",
    sq: "Fushata",
  },
  newCampaign: {
    en: "New campaign",
    el: "Νέα καμπάνια",
    de: "Neue Kampagne",
    fr: "Nouvelle campagne",
    it: "Nuova campagna",
    es: "Nueva campaña",
    nl: "Nieuwe campagne",
    pl: "Nowa kampania",
    pt: "Nova campanha",
    sv: "Ny kampanj",
    sq: "Fushatë e re",
  },
  name: {
    en: "Campaign name",
    el: "Όνομα καμπάνιας",
    de: "Kampagnenname",
    fr: "Nom de la campagne",
    it: "Nome campagna",
    es: "Nombre de campaña",
    nl: "Campagnenaam",
    pl: "Nazwa kampanii",
    pt: "Nome da campanha",
    sv: "Kampanjnamn",
    sq: "Emri i fushatës",
  },
  segment: {
    en: "Audience segment",
    el: "Τμήμα κοινού",
    de: "Zielgruppensegment",
    fr: "Segment d'audience",
    it: "Segmento di pubblico",
    es: "Segmento de audiencia",
    nl: "Doelgroepsegment",
    pl: "Segment odbiorców",
    pt: "Segmento de audiência",
    sv: "Målgruppssegment",
    sq: "Segmenti i audiencës",
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
    sq: "Kanalet",
  },
  scheduledAt: {
    en: "Schedule (leave blank to send immediately)",
    el: "Προγραμματισμός (αφήστε κενό για άμεση αποστολή)",
    de: "Zeitplan (leer lassen für sofort)",
    fr: "Planification (vide pour envoyer immédiatement)",
    it: "Pianificazione (vuoto per inviare subito)",
    es: "Programar (vacío para enviar ahora)",
    nl: "Plannen (leeg laten voor direct verzenden)",
    pl: "Harmonogram (puste = wyślij natychmiast)",
    pt: "Agendar (vazio para enviar agora)",
    sv: "Schemalägg (lämna tomt för omedelbart)",
    sq: "Planifikoni (boshte per te derguar menjehere)",
  },
  pushTitle: {
    en: "Push title",
    el: "Τίτλος push",
    de: "Push-Titel",
    fr: "Titre push",
    it: "Titolo push",
    es: "Título push",
    nl: "Push-titel",
    pl: "Tytuł push",
    pt: "Título push",
    sv: "Push-titel",
    sq: "Titulli push",
  },
  pushBody: {
    en: "Push body",
    el: "Σώμα push",
    de: "Push-Text",
    fr: "Corps push",
    it: "Testo push",
    es: "Texto push",
    nl: "Push-tekst",
    pl: "Treść push",
    pt: "Corpo push",
    sv: "Push-text",
    sq: "Teksti push",
  },
  pushUrl: {
    en: "Push URL (optional)",
    el: "URL push (προαιρετικό)",
    de: "Push-URL (optional)",
    fr: "URL push (facultatif)",
    it: "URL push (opzionale)",
    es: "URL push (opcional)",
    nl: "Push-URL (optioneel)",
    pl: "URL push (opcjonalnie)",
    pt: "URL push (opcional)",
    sv: "Push-URL (valfritt)",
    sq: "URL push (opsionale)",
  },
  emailSubject: {
    en: "Email subject",
    el: "Θέμα email",
    de: "E-Mail-Betreff",
    fr: "Objet de l'email",
    it: "Oggetto email",
    es: "Asunto del correo",
    nl: "E-mailonderwerp",
    pl: "Temat email",
    pt: "Assunto do email",
    sv: "E-postämne",
    sq: "Subjekti i emailit",
  },
  emailBody: {
    en: "Email body (HTML supported)",
    el: "Σώμα email (υποστηρίζεται HTML)",
    de: "E-Mail-Inhalt (HTML möglich)",
    fr: "Corps de l'email (HTML possible)",
    it: "Corpo email (HTML supportato)",
    es: "Cuerpo del correo (HTML permitido)",
    nl: "E-mailtekst (HTML mogelijk)",
    pl: "Treść email (HTML dozwolone)",
    pt: "Corpo do email (HTML suportado)",
    sv: "E-posttext (HTML stöds)",
    sq: "Teksti i emailit (HTML i mbeshtetun)",
  },
  smsText: {
    en: "SMS text",
    el: "Κείμενο SMS",
    de: "SMS-Text",
    fr: "Texte SMS",
    it: "Testo SMS",
    es: "Texto SMS",
    nl: "Sms-tekst",
    pl: "Treść SMS",
    pt: "Texto SMS",
    sv: "SMS-text",
    sq: "Teksti SMS",
  },
  save: {
    en: "Create campaign",
    el: "Δημιουργία καμπάνιας",
    de: "Kampagne erstellen",
    fr: "Créer la campagne",
    it: "Crea campagna",
    es: "Crear campaña",
    nl: "Campagne aanmaken",
    pl: "Utwórz kampanię",
    pt: "Criar campanha",
    sv: "Skapa kampanj",
    sq: "Krijo fushatë",
  },
  cancel: {
    en: "Cancel",
    el: "Ακύρωση",
    de: "Abbrechen",
    fr: "Annuler",
    it: "Annulla",
    es: "Cancelar",
    nl: "Annuleren",
    pl: "Anuluj",
    pt: "Cancelar",
    sv: "Avbryt",
    sq: "Anulo",
  },
  noCampaigns: {
    en: "No campaigns yet. Create your first campaign to start reaching customers.",
    el: "Δεν υπάρχουν ακόμα καμπάνιες. Δημιουργήστε την πρώτη σας για να ξεκινήσετε.",
    de: "Noch keine Kampagnen. Erstellen Sie Ihre erste Kampagne.",
    fr: "Aucune campagne. Créez votre première campagne.",
    it: "Nessuna campagna. Crea la prima campagna.",
    es: "Sin campañas. Crea tu primera campaña.",
    nl: "Nog geen campagnes. Maak uw eerste campagne aan.",
    pl: "Brak kampanii. Utwórz pierwszą kampanię.",
    pt: "Sem campanhas. Crie a sua primeira campanha.",
    sv: "Inga kampanjer. Skapa din första kampanj.",
    sq: "Asnje fushatë. Krijoni fushatën tuaj te parë.",
  },
  status: {
    en: "Status",
    el: "Κατάσταση",
    de: "Status",
    fr: "Statut",
    it: "Stato",
    es: "Estado",
    nl: "Status",
    pl: "Status",
    pt: "Estado",
    sv: "Status",
    sq: "Statusi",
  },
  recipients: {
    en: "Recipients",
    el: "Παραλήπτες",
    de: "Empfänger",
    fr: "Destinataires",
    it: "Destinatari",
    es: "Destinatarios",
    nl: "Ontvangers",
    pl: "Odbiorcy",
    pt: "Destinatários",
    sv: "Mottagare",
    sq: "Marrësit",
  },
  sent: {
    en: "Sent",
    el: "Εστάλη",
    de: "Gesendet",
    fr: "Envoyé",
    it: "Inviato",
    es: "Enviado",
    nl: "Verzonden",
    pl: "Wysłano",
    pt: "Enviado",
    sv: "Skickat",
    sq: "Dërguar",
  },
  failed: {
    en: "Failed",
    el: "Απέτυχε",
    de: "Fehler",
    fr: "Échoué",
    it: "Fallito",
    es: "Fallido",
    nl: "Mislukt",
    pl: "Nieudane",
    pt: "Falhou",
    sv: "Misslyckades",
    sq: "Deshtoi",
  },
  clicks: {
    en: "Clicks",
    el: "Κλικ",
    de: "Klicks",
    fr: "Clics",
    it: "Clic",
    es: "Clics",
    nl: "Klikken",
    pl: "Kliknięcia",
    pt: "Cliques",
    sv: "Klick",
    sq: "Klikime",
  },
  pauseCampaign: {
    en: "Pause",
    el: "Παύση",
    de: "Pausieren",
    fr: "Mettre en pause",
    it: "Pausa",
    es: "Pausar",
    nl: "Pauzeren",
    pl: "Wstrzymaj",
    pt: "Pausar",
    sv: "Pausa",
    sq: "Pauzë",
  },
  resumeCampaign: {
    en: "Resume",
    el: "Συνέχεια",
    de: "Fortsetzen",
    fr: "Reprendre",
    it: "Riprendi",
    es: "Reanudar",
    nl: "Hervatten",
    pl: "Wznów",
    pt: "Retomar",
    sv: "Återuppta",
    sq: "Rifillo",
  },
  cancelCampaign: {
    en: "Cancel campaign",
    el: "Ακύρωση καμπάνιας",
    de: "Kampagne abbrechen",
    fr: "Annuler la campagne",
    it: "Annulla campagna",
    es: "Cancelar campaña",
    nl: "Campagne annuleren",
    pl: "Anuluj kampanię",
    pt: "Cancelar campanha",
    sv: "Avbryt kampanj",
    sq: "Anulo fushatën",
  },
  noSegments: {
    en: "No segments found. Create an audience segment first.",
    el: "Δεν βρέθηκαν τμήματα. Δημιουργήστε πρώτα ένα τμήμα κοινού.",
    de: "Keine Segmente gefunden. Erstellen Sie zuerst ein Segment.",
    fr: "Aucun segment. Créez d'abord un segment d'audience.",
    it: "Nessun segmento. Crea prima un segmento di pubblico.",
    es: "Sin segmentos. Crea primero un segmento de audiencia.",
    nl: "Geen segmenten gevonden. Maak eerst een segment aan.",
    pl: "Brak segmentów. Najpierw utwórz segment.",
    pt: "Sem segmentos. Crie primeiro um segmento de audiência.",
    sv: "Inga segment. Skapa ett segment först.",
    sq: "Asnje segment. Krijoni nje segment te pare.",
  },
  saving: {
    en: "Creating...",
    el: "Δημιουργία...",
    de: "Erstelle...",
    fr: "Création...",
    it: "Creazione...",
    es: "Creando...",
    nl: "Aanmaken...",
    pl: "Tworzenie...",
    pt: "A criar...",
    sv: "Skapar...",
    sq: "Duke krijuar...",
  },
  featureDisabled: {
    en: "The Campaigns feature is currently disabled. Contact your platform operator to enable it.",
    el: "Η λειτουργία Καμπανιών είναι απενεργοποιημένη. Επικοινωνήστε με τον χειριστή για να την ενεργοποιήσετε.",
    de: "Die Kampagnenfunktion ist deaktiviert. Wenden Sie sich an den Plattformbetreiber.",
    fr: "La fonctionnalité Campagnes est désactivée. Contactez l'opérateur de la plateforme.",
    it: "La funzione Campagne non è attiva. Contatta l'operatore.",
    es: "La función Campañas está desactivada. Contacta al operador.",
    nl: "De campagnefunctie is uitgeschakeld. Neem contact op met de platformbeheerder.",
    pl: "Funkcja kampanii jest wyłączona. Skontaktuj się z operatorem.",
    pt: "A funcionalidade Campanhas está desativada. Contacte o operador.",
    sv: "Kampanjfunktionen är inaktiverad. Kontakta plattformsoperatören.",
    sq: "Funksioni i fushatave eshte i çaktivizuar. Kontaktoni operatorin.",
  },
};

function t(key: string, lang: Lang): string {
  const r = C[key];
  if (!r) return key;
  return r[lang] ?? r.en ?? key;
}

// ---- Status badge -----------------------------------------------------------

const STATUS_COLORS: Record<CampaignStatus, string> = {
  draft: "bg-white/10 text-white/50",
  pending_approval: "bg-amber-500/20 text-amber-400",
  scheduled: "bg-blue-500/20 text-blue-400",
  sending: "bg-yellow-500/20 text-yellow-400",
  sent: "bg-green-500/20 text-green-400",
  paused: "bg-orange-500/20 text-orange-400",
  canceled: "bg-red-500/20 text-red-400",
  rejected: "bg-red-600/20 text-red-500",
};

function StatusBadge({ status }: { status: CampaignStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[status] ?? "bg-white/10 text-white/50"}`}
    >
      {status}
    </span>
  );
}

// ---- Props ------------------------------------------------------------------

export type MarketingCampaignsProps = {
  initialCampaigns: Campaign[];
  initialSegments: Segment[];
  featureOn: boolean;
  lang: Lang;
};

// ---- Component --------------------------------------------------------------

export default function MarketingCampaigns({
  initialCampaigns,
  initialSegments,
  featureOn,
  lang,
}: MarketingCampaignsProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns);
  const [segments, setSegments] = useState<Segment[]>(initialSegments);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Form state.
  const [name, setName] = useState("");
  const [segmentId, setSegmentId] = useState(initialSegments[0]?.id ?? "");
  const [channels, setChannels] = useState<CampaignChannel[]>(["email"]);
  const [scheduledAt, setScheduledAt] = useState("");
  const [pushTitle, setPushTitle] = useState("");
  const [pushBody, setPushBody] = useState("");
  const [pushUrl, setPushUrl] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [smsText, setSmsText] = useState("");

  const toggleChannel = (ch: CampaignChannel) =>
    setChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch],
    );

  const reload = useCallback(async () => {
    try {
      const r = await fetch(withBasePath("/api/admin/marketing/campaigns"), {
        cache: "no-store",
      });
      if (r.ok) {
        const j = (await r.json()) as { campaigns: Campaign[] };
        setCampaigns(j.campaigns);
      }
    } catch {
      // best-effort reload
    }
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !segmentId || channels.length === 0) return;
    setSaving(true);
    setError("");

    const messages: CampaignMessages = {};
    if (channels.includes("push") && pushTitle && pushBody) {
      messages.push = {
        title: pushTitle,
        body: pushBody,
        url: pushUrl || undefined,
      };
    }
    if (channels.includes("email") && emailSubject && emailBody) {
      messages.email = { subject: emailSubject, body: emailBody };
    }
    if (channels.includes("sms") && smsText) {
      messages.sms = { text: smsText };
    }

    try {
      const r = await fetch(withBasePath("/api/admin/marketing/campaigns"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          segmentId,
          channels,
          messages,
          scheduledAt: scheduledAt || undefined,
        }),
      });
      if (!r.ok) {
        const j = (await r.json()) as { error?: string };
        setError(j.error ?? "Failed to create campaign.");
      } else {
        setShowForm(false);
        setName("");
        setChannels(["email"]);
        setScheduledAt("");
        setPushTitle("");
        setPushBody("");
        setPushUrl("");
        setEmailSubject("");
        setEmailBody("");
        setSmsText("");
        await reload();
      }
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  };

  const patchStatus = async (id: string, status: CampaignStatus) => {
    try {
      const r = await fetch(withBasePath("/api/admin/marketing/campaigns"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (r.ok) await reload();
    } catch {
      // best-effort
    }
  };

  useEffect(() => {
    // Refresh campaign list once on mount to pick up any scheduler updates.
    void reload();
    // Also load segments on mount so the panel works rendered inline in the
    // admin dashboard (which cannot pre-load server props).
    void (async () => {
      try {
        const r = await fetch(withBasePath("/api/admin/marketing/segments"));
        if (!r.ok) return;
        const d = await r.json();
        const next = (d.segments ?? []) as Segment[];
        setSegments(next);
        setSegmentId((cur) => cur || next[0]?.id || "");
      } catch {
        // best-effort
      }
    })();
  }, [reload]);

  if (!featureOn) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center">
        <p className="text-sm text-white/50">{t("featureDisabled", lang)}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-serif text-lg font-semibold">
          {t("heading", lang)}
        </h2>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-full border border-[#c9a961]/40 bg-[#c9a961]/10 px-4 py-2 text-xs uppercase tracking-widest text-[#c9a961] transition-colors hover:bg-[#c9a961]/20"
        >
          {showForm ? t("cancel", lang) : t("newCampaign", lang)}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="rounded-xl border border-white/10 bg-white/[0.03] p-6 space-y-4"
        >
          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
              {error}
            </p>
          )}

          {/* Campaign name */}
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-widest text-white/50">
              {t("name", lang)}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white placeholder-white/30 focus:border-[#c9a961]/40 focus:outline-none"
            />
          </div>

          {/* Segment picker */}
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-widest text-white/50">
              {t("segment", lang)}
            </label>
            {segments.length === 0 ? (
              <p className="text-sm text-white/40">{t("noSegments", lang)}</p>
            ) : (
              <select
                value={segmentId}
                onChange={(e) => setSegmentId(e.target.value)}
                required
                className="w-full rounded-lg border border-white/10 bg-[#0a0806] px-3 py-2 text-sm text-white focus:border-[#c9a961]/40 focus:outline-none"
              >
                {segments.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Channel checkboxes */}
          <div>
            <label className="mb-2 block text-xs uppercase tracking-widest text-white/50">
              {t("channels", lang)}
            </label>
            <div className="flex flex-wrap gap-3">
              {(["push", "email", "sms"] as CampaignChannel[]).map((ch) => (
                <label
                  key={ch}
                  className="flex cursor-pointer items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={channels.includes(ch)}
                    onChange={() => toggleChannel(ch)}
                    className="accent-[#c9a961]"
                  />
                  <span className="capitalize text-white/70">{ch}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Push message */}
          {channels.includes("push") && (
            <fieldset className="rounded-lg border border-white/10 p-4 space-y-3">
              <legend className="px-1 text-xs uppercase tracking-widest text-[#c9a961]">
                Push
              </legend>
              <div>
                <label className="mb-1 block text-xs text-white/50">
                  {t("pushTitle", lang)}
                </label>
                <input
                  type="text"
                  value={pushTitle}
                  onChange={(e) => setPushTitle(e.target.value)}
                  required={channels.includes("push")}
                  className="w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white placeholder-white/30 focus:border-[#c9a961]/40 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-white/50">
                  {t("pushBody", lang)}
                </label>
                <textarea
                  value={pushBody}
                  onChange={(e) => setPushBody(e.target.value)}
                  required={channels.includes("push")}
                  rows={2}
                  className="w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white placeholder-white/30 focus:border-[#c9a961]/40 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-white/50">
                  {t("pushUrl", lang)}
                </label>
                <input
                  type="url"
                  value={pushUrl}
                  onChange={(e) => setPushUrl(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white placeholder-white/30 focus:border-[#c9a961]/40 focus:outline-none"
                />
              </div>
            </fieldset>
          )}

          {/* Email message */}
          {channels.includes("email") && (
            <fieldset className="rounded-lg border border-white/10 p-4 space-y-3">
              <legend className="px-1 text-xs uppercase tracking-widest text-[#c9a961]">
                Email
              </legend>
              <div>
                <label className="mb-1 block text-xs text-white/50">
                  {t("emailSubject", lang)}
                </label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  required={channels.includes("email")}
                  className="w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white placeholder-white/30 focus:border-[#c9a961]/40 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-white/50">
                  {t("emailBody", lang)}
                </label>
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  required={channels.includes("email")}
                  rows={5}
                  className="w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white placeholder-white/30 focus:border-[#c9a961]/40 focus:outline-none"
                />
              </div>
            </fieldset>
          )}

          {/* SMS message */}
          {channels.includes("sms") && (
            <fieldset className="rounded-lg border border-white/10 p-4">
              <legend className="px-1 text-xs uppercase tracking-widest text-[#c9a961]">
                SMS
              </legend>
              <label className="mb-1 block text-xs text-white/50">
                {t("smsText", lang)}
              </label>
              <textarea
                value={smsText}
                onChange={(e) => setSmsText(e.target.value)}
                required={channels.includes("sms")}
                rows={3}
                maxLength={160}
                className="w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white placeholder-white/30 focus:border-[#c9a961]/40 focus:outline-none"
              />
              <p className="mt-1 text-right text-xs text-white/30">
                {smsText.length}/160
              </p>
            </fieldset>
          )}

          {/* Schedule */}
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-widest text-white/50">
              {t("scheduledAt", lang)}
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="rounded-lg border border-white/10 bg-[#0a0806] px-3 py-2 text-sm text-white focus:border-[#c9a961]/40 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving || segments.length === 0}
              className="rounded-full bg-[#c9a961] px-6 py-2 text-xs font-semibold uppercase tracking-widest text-[#0a0806] transition-opacity disabled:opacity-50"
            >
              {saving ? t("saving", lang) : t("save", lang)}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-sm text-white/40 hover:text-white/70"
            >
              {t("cancel", lang)}
            </button>
          </div>
        </form>
      )}

      {/* Campaign list */}
      {campaigns.length === 0 && !showForm ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center">
          <p className="text-sm text-white/40">{t("noCampaigns", lang)}</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {campaigns.map((c) => {
            const evtStats = c.eventStats;
            return (
              <li
                key={c.id}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-white">{c.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <StatusBadge status={c.status} />
                      {c.channels.map((ch) => (
                        <span
                          key={ch}
                          className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-widest text-white/50"
                        >
                          {ch}
                        </span>
                      ))}
                    </div>
                    {c.scheduledAt && (
                      <p className="mt-1 text-xs text-white/40">
                        {new Date(c.scheduledAt).toLocaleString()}
                      </p>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex shrink-0 items-center gap-2">
                    {c.status === "scheduled" && (
                      <>
                        <button
                          onClick={() => patchStatus(c.id, "paused")}
                          className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/60 hover:bg-white/10"
                        >
                          {t("pauseCampaign", lang)}
                        </button>
                        <button
                          onClick={() => patchStatus(c.id, "canceled")}
                          className="rounded-full border border-red-500/30 px-3 py-1 text-xs text-red-400 hover:bg-red-500/10"
                        >
                          {t("cancelCampaign", lang)}
                        </button>
                      </>
                    )}
                    {c.status === "paused" && (
                      <>
                        <button
                          onClick={() => patchStatus(c.id, "scheduled")}
                          className="rounded-full border border-[#c9a961]/30 px-3 py-1 text-xs text-[#c9a961] hover:bg-[#c9a961]/10"
                        >
                          {t("resumeCampaign", lang)}
                        </button>
                        <button
                          onClick={() => patchStatus(c.id, "canceled")}
                          className="rounded-full border border-red-500/30 px-3 py-1 text-xs text-red-400 hover:bg-red-500/10"
                        >
                          {t("cancelCampaign", lang)}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Stats */}
                {(c.stats.recipients > 0 || evtStats) && (
                  <div className="mt-4 flex flex-wrap gap-4 border-t border-white/5 pt-4">
                    <StatChip
                      label={t("recipients", lang)}
                      value={c.stats.recipients}
                    />
                    {c.channels.includes("email") && evtStats && (
                      <>
                        <StatChip
                          label={`Email ${t("sent", lang)}`}
                          value={evtStats.email.send}
                        />
                        <StatChip
                          label={`Email ${t("failed", lang)}`}
                          value={evtStats.email.fail}
                        />
                        <StatChip
                          label={`Email ${t("clicks", lang)}`}
                          value={evtStats.email.click}
                        />
                      </>
                    )}
                    {c.channels.includes("push") && evtStats && (
                      <>
                        <StatChip
                          label={`Push ${t("sent", lang)}`}
                          value={evtStats.push.send}
                        />
                        <StatChip
                          label={`Push ${t("clicks", lang)}`}
                          value={evtStats.push.click}
                        />
                      </>
                    )}
                    {c.channels.includes("sms") && evtStats && (
                      <>
                        <StatChip
                          label={`SMS ${t("sent", lang)}`}
                          value={evtStats.sms.send}
                        />
                        <StatChip
                          label={`SMS ${t("failed", lang)}`}
                          value={evtStats.sms.fail}
                        />
                      </>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <p className="text-lg font-semibold text-white">{value}</p>
      <p className="text-[10px] uppercase tracking-widest text-white/40">
        {label}
      </p>
    </div>
  );
}
