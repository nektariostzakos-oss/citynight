"use client";

/**
 * Audience builder for the tenant marketing suite.
 *
 * Lists saved segments with live recipient counts (fetched on demand) and
 * a form to create new ones. Each segment is a saved filter over the salon's
 * own clients: last visit dates, total spend, services booked, no-show count,
 * upcoming bookings, and channel opt-in.
 *
 * Rendered dark to match the rest of the demo admin. The page server component
 * passes initialSegments so the first paint is not a blank spinner.
 */

import { useCallback, useEffect, useState } from "react";
import { withBasePath } from "../../lib/basePath";

// ---- Types ------------------------------------------------------------------

type SegmentFilter = {
  lastVisitBefore?: string;
  lastVisitAfter?: string;
  minTotalSpend?: number;
  serviceEverBooked?: string[];
  minNoShowCount?: number;
  hasUpcomingBooking?: boolean;
  optedIntoPush?: boolean;
  hasEmail?: boolean;
  hasPhone?: boolean;
};

type MarketingSegment = {
  id: string;
  name: string;
  description: string;
  filter: SegmentFilter;
  createdAt: string;
};

type Preview = {
  id: string;
  count: number;
  reachEmail: number;
  reachPhone: number;
  reachPush: number;
};

// ---- Copy (11 languages) ----------------------------------------------------

type Lang =
  | "en" | "el" | "de" | "fr" | "it" | "es"
  | "nl" | "pl" | "pt" | "sv" | "sq";

type Copy = Record<Lang, string>;

const C: Record<string, Copy> = {
  heading: {
    en: "Saved audiences",
    el: "Αποθηκευμένο κοινό",
    de: "Gespeicherte Zielgruppen",
    fr: "Audiences enregistrées",
    it: "Segmenti salvati",
    es: "Audiencias guardadas",
    nl: "Opgeslagen doelgroepen",
    pl: "Zapisane grupy",
    pt: "Audiências guardadas",
    sv: "Sparade målgrupper",
    sq: "Audienca te ruajtura",
  },
  newSegment: {
    en: "New audience",
    el: "Νέο κοινό",
    de: "Neue Zielgruppe",
    fr: "Nouvelle audience",
    it: "Nuovo segmento",
    es: "Nueva audiencia",
    nl: "Nieuw publiek",
    pl: "Nowa grupa",
    pt: "Nova audiência",
    sv: "Ny målgrupp",
    sq: "Audiencë e re",
  },
  name: {
    en: "Name",
    el: "Όνομα",
    de: "Name",
    fr: "Nom",
    it: "Nome",
    es: "Nombre",
    nl: "Naam",
    pl: "Nazwa",
    pt: "Nome",
    sv: "Namn",
    sq: "Emri",
  },
  description: {
    en: "Description",
    el: "Περιγραφή",
    de: "Beschreibung",
    fr: "Description",
    it: "Descrizione",
    es: "Descripción",
    nl: "Omschrijving",
    pl: "Opis",
    pt: "Descrição",
    sv: "Beskrivning",
    sq: "Përshkrim",
  },
  filters: {
    en: "Filters",
    el: "Φίλτρα",
    de: "Filter",
    fr: "Filtres",
    it: "Filtri",
    es: "Filtros",
    nl: "Filters",
    pl: "Filtry",
    pt: "Filtros",
    sv: "Filter",
    sq: "Filtra",
  },
  lastVisitBefore: {
    en: "Last visit before",
    el: "Τελευταία επίσκεψη πριν",
    de: "Letzter Besuch vor",
    fr: "Dernière visite avant le",
    it: "Ultima visita prima del",
    es: "Última visita antes del",
    nl: "Laatste bezoek voor",
    pl: "Ostatnia wizyta przed",
    pt: "Última visita antes de",
    sv: "Senaste besök före",
    sq: "Vizita e fundit para",
  },
  lastVisitAfter: {
    en: "Last visit after",
    el: "Τελευταία επίσκεψη μετά",
    de: "Letzter Besuch nach",
    fr: "Dernière visite après le",
    it: "Ultima visita dopo il",
    es: "Última visita después del",
    nl: "Laatste bezoek na",
    pl: "Ostatnia wizyta po",
    pt: "Última visita depois de",
    sv: "Senaste besök efter",
    sq: "Vizita e fundit pas",
  },
  minSpend: {
    en: "Min. total spend",
    el: "Ελάχ. συνολικές αγορές",
    de: "Mindestausgaben",
    fr: "Dépenses min.",
    it: "Spesa min. totale",
    es: "Gasto mín. total",
    nl: "Min. totaaluitgaven",
    pl: "Min. wydatki",
    pt: "Gasto mín. total",
    sv: "Min. totalkostnad",
    sq: "Shpenzime min.",
  },
  minNoShow: {
    en: "Min. no-shows",
    el: "Ελάχ. αδικαιολόγητες απουσίες",
    de: "Mind. Nichterscheinen",
    fr: "No-shows min.",
    it: "Assenze min.",
    es: "Inasistencias mín.",
    nl: "Min. no-shows",
    pl: "Min. nieobecności",
    pt: "Faltas mín.",
    sv: "Min. uteblivanden",
    sq: "Min. mungesa",
  },
  hasUpcoming: {
    en: "Has upcoming booking",
    el: "Έχει επερχόμενο ραντεβού",
    de: "Hat bevorstehende Buchung",
    fr: "A une réservation à venir",
    it: "Ha una prenotazione futura",
    es: "Tiene reserva próxima",
    nl: "Heeft aankomende boeking",
    pl: "Ma nadchodzącą rezerwację",
    pt: "Tem marcação futura",
    sv: "Har kommande bokning",
    sq: "Ka rezervim te ardhshem",
  },
  optedIntoPush: {
    en: "Opted into push",
    el: "Εγγραφή push ειδοποιήσεων",
    de: "Push aktiviert",
    fr: "Inscrit aux notifications push",
    it: "Iscritto alle notifiche push",
    es: "Suscrito a notificaciones push",
    nl: "Push ingeschakeld",
    pl: "Zgoda na push",
    pt: "Com push ativo",
    sv: "Push aktiverat",
    sq: "Me push te aktivizuar",
  },
  hasEmail: {
    en: "Has email address",
    el: "Έχει email",
    de: "Hat E-Mail-Adresse",
    fr: "A une adresse email",
    it: "Ha indirizzo email",
    es: "Tiene email",
    nl: "Heeft e-mailadres",
    pl: "Ma adres email",
    pt: "Tem email",
    sv: "Har e-postadress",
    sq: "Ka email",
  },
  hasPhone: {
    en: "Has phone number",
    el: "Έχει αριθμό τηλεφώνου",
    de: "Hat Telefonnummer",
    fr: "A un numéro de téléphone",
    it: "Ha numero di telefono",
    es: "Tiene teléfono",
    nl: "Heeft telefoonnummer",
    pl: "Ma numer telefonu",
    pt: "Tem telefone",
    sv: "Har telefonnummer",
    sq: "Ka numër telefoni",
  },
  save: {
    en: "Save audience",
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
  preview: {
    en: "Preview",
    el: "Προεπισκόπηση",
    de: "Vorschau",
    fr: "Aperçu",
    it: "Anteprima",
    es: "Vista previa",
    nl: "Voorbeeld",
    pl: "Podgląd",
    pt: "Pré-visualizar",
    sv: "Förhandsgranska",
    sq: "Paraparje",
  },
  delete: {
    en: "Delete",
    el: "Διαγραφή",
    de: "Löschen",
    fr: "Supprimer",
    it: "Elimina",
    es: "Eliminar",
    nl: "Verwijderen",
    pl: "Usuń",
    pt: "Eliminar",
    sv: "Ta bort",
    sq: "Fshi",
  },
  recipients: {
    en: "recipients",
    el: "παραλήπτες",
    de: "Empfänger",
    fr: "destinataires",
    it: "destinatari",
    es: "destinatarios",
    nl: "ontvangers",
    pl: "odbiorcy",
    pt: "destinatários",
    sv: "mottagare",
    sq: "marrës",
  },
  empty: {
    en: "No saved audiences yet. Create one below.",
    el: "Δεν υπάρχουν αποθηκευμένα κοινά. Δημιουργήστε ένα παρακάτω.",
    de: "Noch keine gespeicherten Zielgruppen. Erstellen Sie eine unten.",
    fr: "Aucune audience enregistrée. Créez-en une ci-dessous.",
    it: "Nessun segmento salvato. Creane uno qui sotto.",
    es: "No hay audiencias guardadas. Crea una abajo.",
    nl: "Nog geen opgeslagen doelgroepen. Maak er hieronder een aan.",
    pl: "Brak zapisanych grup. Utwórz poniżej.",
    pt: "Sem audiências guardadas. Cria uma abaixo.",
    sv: "Inga sparade målgrupper. Skapa en nedan.",
    sq: "Nuk ka audienca te ruajtura. Krijo nje me poshte.",
  },
  confirmDelete: {
    en: "Delete this audience?",
    el: "Διαγραφή αυτού του κοινού;",
    de: "Diese Zielgruppe löschen?",
    fr: "Supprimer cette audience?",
    it: "Eliminare questo segmento?",
    es: "Eliminar esta audiencia?",
    nl: "Doelgroep verwijderen?",
    pl: "Usunąć tę grupę?",
    pt: "Eliminar esta audiência?",
    sv: "Ta bort den här målgruppen?",
    sq: "Fshi kete audience?",
  },
};

function p(key: string, lang: Lang): string {
  return C[key]?.[lang] ?? C[key]?.en ?? key;
}

// ---- Component --------------------------------------------------------------

function detectLang(): Lang {
  if (typeof document === "undefined") return "en";
  const attr = document.documentElement.lang?.slice(0, 2) as Lang | undefined;
  const validLangs: Lang[] = [
    "en", "el", "de", "fr", "it", "es", "nl", "pl", "pt", "sv", "sq",
  ];
  return validLangs.includes(attr as Lang) ? (attr as Lang) : "en";
}

type BlankFilter = {
  lastVisitBefore: string;
  lastVisitAfter: string;
  minTotalSpend: string;
  minNoShowCount: string;
  hasUpcomingBooking: boolean | null;
  optedIntoPush: boolean | null;
  hasEmail: boolean | null;
  hasPhone: boolean | null;
};

const EMPTY_FILTER: BlankFilter = {
  lastVisitBefore: "",
  lastVisitAfter: "",
  minTotalSpend: "",
  minNoShowCount: "",
  hasUpcomingBooking: null,
  optedIntoPush: null,
  hasEmail: null,
  hasPhone: null,
};

function buildSegmentFilter(f: BlankFilter): SegmentFilter {
  const out: SegmentFilter = {};
  if (f.lastVisitBefore) out.lastVisitBefore = f.lastVisitBefore;
  if (f.lastVisitAfter) out.lastVisitAfter = f.lastVisitAfter;
  const spend = parseFloat(f.minTotalSpend);
  if (!isNaN(spend) && spend > 0) out.minTotalSpend = spend;
  const noShow = parseInt(f.minNoShowCount, 10);
  if (!isNaN(noShow) && noShow > 0) out.minNoShowCount = noShow;
  if (f.hasUpcomingBooking !== null) out.hasUpcomingBooking = f.hasUpcomingBooking;
  if (f.optedIntoPush !== null) out.optedIntoPush = f.optedIntoPush;
  if (f.hasEmail !== null) out.hasEmail = f.hasEmail;
  if (f.hasPhone !== null) out.hasPhone = f.hasPhone;
  return out;
}

function filterLabel(filter: SegmentFilter, lang: Lang): string[] {
  const parts: string[] = [];
  if (filter.lastVisitBefore) parts.push(`${p("lastVisitBefore", lang)} ${filter.lastVisitBefore}`);
  if (filter.lastVisitAfter) parts.push(`${p("lastVisitAfter", lang)} ${filter.lastVisitAfter}`);
  if (filter.minTotalSpend) parts.push(`${p("minSpend", lang)}: ${filter.minTotalSpend}`);
  if (filter.minNoShowCount) parts.push(`${p("minNoShow", lang)}: ${filter.minNoShowCount}`);
  if (filter.hasUpcomingBooking) parts.push(p("hasUpcoming", lang));
  if (filter.optedIntoPush) parts.push(p("optedIntoPush", lang));
  if (filter.hasEmail) parts.push(p("hasEmail", lang));
  if (filter.hasPhone) parts.push(p("hasPhone", lang));
  return parts;
}

// Tri-state toggle: null (unset), true, false.
function TriToggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean | null;
  onChange: (v: boolean | null) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-white/60">{label}</span>
      <button
        type="button"
        onClick={() => onChange(null)}
        className={`rounded px-2 py-0.5 text-[10px] uppercase tracking-wider transition-colors ${
          value === null
            ? "bg-[#c9a961] text-black"
            : "border border-white/15 text-white/40 hover:bg-white/5"
        }`}
      >
        Any
      </button>
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`rounded px-2 py-0.5 text-[10px] uppercase tracking-wider transition-colors ${
          value === true
            ? "bg-[#c9a961] text-black"
            : "border border-white/15 text-white/40 hover:bg-white/5"
        }`}
      >
        Yes
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`rounded px-2 py-0.5 text-[10px] uppercase tracking-wider transition-colors ${
          value === false
            ? "bg-white/10 text-white"
            : "border border-white/15 text-white/40 hover:bg-white/5"
        }`}
      >
        No
      </button>
    </div>
  );
}

export default function MarketingAudiences({
  initialSegments,
}: {
  initialSegments: MarketingSegment[];
}) {
  const [lang, setLang] = useState<Lang>("en");
  const [segments, setSegments] = useState<MarketingSegment[]>(initialSegments);
  const [previews, setPreviews] = useState<Record<string, Preview>>({});
  const [loadingPreview, setLoadingPreview] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formFilter, setFormFilter] = useState<BlankFilter>({ ...EMPTY_FILTER });

  useEffect(() => {
    setLang(detectLang());
  }, []);

  const loadSegments = useCallback(async () => {
    const r = await fetch(withBasePath("/api/admin/marketing/segments"));
    if (r.ok) {
      const d = await r.json();
      setSegments(d.segments ?? []);
    }
  }, []);

  // Refresh on mount so the panel works when rendered inline in the admin
  // dashboard (which cannot pre-load server props).
  useEffect(() => {
    void loadSegments();
  }, [loadSegments]);

  async function loadPreview(id: string) {
    setLoadingPreview(id);
    const r = await fetch(
      withBasePath(`/api/admin/marketing/segments?preview=${id}`),
    );
    if (r.ok) {
      const d = await r.json();
      if (d.preview) {
        setPreviews((prev) => ({ ...prev, [id]: d.preview }));
      }
    }
    setLoadingPreview(null);
  }

  async function save() {
    if (!formName.trim()) return;
    setSaving(true);
    setMsg(null);
    const r = await fetch(withBasePath("/api/admin/marketing/segments"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: formName,
        description: formDesc,
        filter: buildSegmentFilter(formFilter),
      }),
    });
    if (r.ok) {
      setShowForm(false);
      setFormName("");
      setFormDesc("");
      setFormFilter({ ...EMPTY_FILTER });
      await loadSegments();
    } else {
      const d = await r.json().catch(() => ({}));
      setMsg((d as { error?: string }).error ?? "Could not save.");
    }
    setSaving(false);
  }

  async function remove(id: string) {
    if (!confirm(p("confirmDelete", lang))) return;
    await fetch(withBasePath(`/api/admin/marketing/segments?id=${id}`), {
      method: "DELETE",
    });
    setPreviews((prev) => {
      const n = { ...prev };
      delete n[id];
      return n;
    });
    await loadSegments();
  }

  function setFilter<K extends keyof BlankFilter>(key: K, val: BlankFilter[K]) {
    setFormFilter((f) => ({ ...f, [key]: val }));
  }

  const fmtDate = (iso: string) => iso.slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-white/50">
          {p("heading", lang)}
        </h2>
        <button
          type="button"
          onClick={() => {
            setShowForm((v) => !v);
            setMsg(null);
          }}
          className="rounded-full border border-[#c9a961]/40 px-4 py-1.5 text-xs uppercase tracking-widest text-[#c9a961] transition-colors hover:bg-[#c9a961]/10"
        >
          {p("newSegment", lang)}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-white/40 mb-1">
                {p("name", lang)}
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Lapsed clients"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#c9a961]/50"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-white/40 mb-1">
                {p("description", lang)}
              </label>
              <input
                type="text"
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="Optional note"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#c9a961]/50"
              />
            </div>
          </div>

          <div className="border-t border-white/5 pt-4">
            <p className="text-[10px] uppercase tracking-widest text-white/40 mb-3">
              {p("filters", lang)}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-[10px] text-white/40 mb-1">
                  {p("lastVisitBefore", lang)}
                </label>
                <input
                  type="date"
                  value={formFilter.lastVisitBefore}
                  onChange={(e) => setFilter("lastVisitBefore", e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:border-[#c9a961]/50"
                />
              </div>
              <div>
                <label className="block text-[10px] text-white/40 mb-1">
                  {p("lastVisitAfter", lang)}
                </label>
                <input
                  type="date"
                  value={formFilter.lastVisitAfter}
                  onChange={(e) => setFilter("lastVisitAfter", e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:border-[#c9a961]/50"
                />
              </div>
              <div>
                <label className="block text-[10px] text-white/40 mb-1">
                  {p("minSpend", lang)}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formFilter.minTotalSpend}
                  onChange={(e) => setFilter("minTotalSpend", e.target.value)}
                  placeholder="0"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#c9a961]/50"
                />
              </div>
              <div>
                <label className="block text-[10px] text-white/40 mb-1">
                  {p("minNoShow", lang)}
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={formFilter.minNoShowCount}
                  onChange={(e) => setFilter("minNoShowCount", e.target.value)}
                  placeholder="0"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#c9a961]/50"
                />
              </div>
            </div>

            <div className="mt-3 space-y-2">
              <TriToggle
                label={p("hasUpcoming", lang)}
                value={formFilter.hasUpcomingBooking}
                onChange={(v) => setFilter("hasUpcomingBooking", v)}
              />
              <TriToggle
                label={p("optedIntoPush", lang)}
                value={formFilter.optedIntoPush}
                onChange={(v) => setFilter("optedIntoPush", v)}
              />
              <TriToggle
                label={p("hasEmail", lang)}
                value={formFilter.hasEmail}
                onChange={(v) => setFilter("hasEmail", v)}
              />
              <TriToggle
                label={p("hasPhone", lang)}
                value={formFilter.hasPhone}
                onChange={(v) => setFilter("hasPhone", v)}
              />
            </div>
          </div>

          {msg && <p className="text-xs text-red-400">{msg}</p>}

          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={save}
              disabled={saving || !formName.trim()}
              className="rounded-full bg-[#c9a961] px-5 py-2 text-xs font-semibold uppercase tracking-widest text-black transition-opacity disabled:opacity-40 hover:opacity-90"
            >
              {saving ? "Saving…" : p("save", lang)}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setMsg(null); }}
              className="text-xs text-white/40 underline underline-offset-2 hover:text-white/60 transition-colors"
            >
              {p("cancel", lang)}
            </button>
          </div>
        </div>
      )}

      {/* Segment list */}
      {segments.length === 0 ? (
        <p className="text-sm text-white/40">{p("empty", lang)}</p>
      ) : (
        <div className="space-y-3">
          {segments.map((seg) => {
            const pr = previews[seg.id];
            const loading = loadingPreview === seg.id;
            const labels = filterLabel(seg.filter, lang);
            return (
              <div
                key={seg.id}
                className="rounded-xl border border-white/10 bg-white/[0.02] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-sm text-white">
                      {seg.name}
                    </p>
                    {seg.description && (
                      <p className="mt-0.5 text-xs text-white/40 truncate">
                        {seg.description}
                      </p>
                    )}
                    {labels.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {labels.map((l, i) => (
                          <span
                            key={i}
                            className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-white/50"
                          >
                            {l}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => loadPreview(seg.id)}
                      disabled={loading}
                      className="rounded-full border border-white/15 px-3 py-1 text-[10px] uppercase tracking-widest text-white/60 transition-colors hover:bg-white/5 disabled:opacity-40"
                    >
                      {loading ? "…" : p("preview", lang)}
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(seg.id)}
                      className="rounded-full border border-red-800/40 px-3 py-1 text-[10px] uppercase tracking-widest text-red-400/60 transition-colors hover:bg-red-900/10"
                    >
                      {p("delete", lang)}
                    </button>
                  </div>
                </div>

                {/* Preview pill */}
                {pr && (
                  <div className="mt-3 flex flex-wrap gap-3 border-t border-white/5 pt-3">
                    <span className="text-xs text-white/60">
                      <span className="font-semibold text-[#c9a961]">
                        {pr.count}
                      </span>{" "}
                      {p("recipients", lang)}
                    </span>
                    <span className="text-xs text-white/40">
                      Email: {pr.reachEmail}
                    </span>
                    <span className="text-xs text-white/40">
                      Phone: {pr.reachPhone}
                    </span>
                    <span className="text-xs text-white/40">
                      Push: {pr.reachPush}
                    </span>
                    <span className="text-xs text-white/30">
                      {fmtDate(seg.createdAt)}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
