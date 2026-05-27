"use client";

/**
 * Reputation panel for the tenant marketing suite.
 *
 * Renders the review funnel (requests sent -> ratings received -> public
 * Google route vs private feedback) and the recent private feedback list.
 * Self-fetches on mount so it can be rendered inline inside the admin
 * dashboard tab, with no server props.
 */

import { useEffect, useState } from "react";
import type { Lang } from "../../lib/langs";
import { withBasePath } from "../../lib/basePath";

type Feedback = {
  id: string;
  bookingId: string;
  clientName: string;
  clientEmail: string;
  rating: number;
  comment: string;
  at: string;
};

type FunnelStats = {
  requested: number;
  ratingsReceived: number;
  publicRouted: number;
  privateRouted: number;
  recentFeedback: Feedback[];
};

const C: Record<string, Record<Lang, string>> = {
  requested: {
    en: "Requests sent", el: "Αιτήματα", de: "Anfragen gesendet",
    fr: "Demandes envoyées", it: "Richieste inviate", es: "Solicitudes enviadas",
    nl: "Verzoeken verzonden", pl: "Wysłane prośby", pt: "Pedidos enviados",
    sv: "Förfrågningar skickade", sq: "Kërkesa të dërguara",
  },
  received: {
    en: "Ratings received", el: "Αξιολογήσεις", de: "Bewertungen erhalten",
    fr: "Évaluations reçues", it: "Valutazioni ricevute", es: "Valoraciones recibidas",
    nl: "Beoordelingen ontvangen", pl: "Otrzymane oceny", pt: "Avaliações recebidas",
    sv: "Mottagna betyg", sq: "Vlerësime të marra",
  },
  publicR: {
    en: "Routed to Google", el: "Προς Google", de: "An Google geleitet",
    fr: "Dirigées vers Google", it: "Inviate a Google", es: "Dirigidas a Google",
    nl: "Naar Google geleid", pl: "Skierowane do Google", pt: "Encaminhadas ao Google",
    sv: "Skickade till Google", sq: "Drejtuar te Google",
  },
  privateR: {
    en: "Private feedback", el: "Ιδιωτικά σχόλια", de: "Privates Feedback",
    fr: "Retours privés", it: "Feedback privato", es: "Comentarios privados",
    nl: "Privéfeedback", pl: "Prywatne opinie", pt: "Comentários privados",
    sv: "Privat feedback", sq: "Koment privat",
  },
  recent: {
    en: "Recent private feedback", el: "Πρόσφατα ιδιωτικά σχόλια",
    de: "Aktuelles privates Feedback", fr: "Retours privés récents",
    it: "Feedback privato recente", es: "Comentarios privados recientes",
    nl: "Recente privéfeedback", pl: "Ostatnie prywatne opinie",
    pt: "Comentários privados recentes", sv: "Senaste privat feedback",
    sq: "Komente private të fundit",
  },
  empty: {
    en: "Builds as reviews accrue.", el: "Συμπληρώνεται με τον καιρό.",
    de: "Wird mit der Zeit aufgebaut.", fr: "Se construit au fil du temps.",
    it: "Si costruisce nel tempo.", es: "Se completa con el tiempo.",
    nl: "Vult zich na verloop van tijd.", pl: "Uzupełnia się z czasem.",
    pt: "Constrói-se com o tempo.", sv: "Byggs upp med tiden.",
    sq: "Ndërtohet me kohën.",
  },
  off: {
    en: "The review engine is switched off for this salon.",
    el: "Η μηχανή αξιολογήσεων είναι απενεργοποιημένη.",
    de: "Die Bewertungs-Engine ist für diesen Salon deaktiviert.",
    fr: "Le moteur d'avis est désactivé pour ce salon.",
    it: "Il motore di recensioni è disattivato per questo salone.",
    es: "El motor de reseñas está desactivado para este salón.",
    nl: "De reviewmotor staat uit voor deze salon.",
    pl: "Silnik recenzji jest wyłączony dla tego salonu.",
    pt: "O motor de avaliações está desligado para este salão.",
    sv: "Recensionsmotorn är avstängd för den här salongen.",
    sq: "Motori i vlerësimeve është i çaktivizuar për këtë sallon.",
  },
};

function t(key: keyof typeof C, lang: Lang): string {
  return C[key][lang] ?? C[key].en;
}

export default function MarketingReputation({
  featureOn,
  lang,
}: {
  featureOn: boolean;
  lang: Lang;
}) {
  const [stats, setStats] = useState<FunnelStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!featureOn) {
      setLoading(false);
      return;
    }
    fetch(withBasePath("/api/admin/marketing/reputation"))
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.stats) setStats(d.stats as FunnelStats);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [featureOn]);

  if (!featureOn) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center">
        <p className="text-sm text-white/50">{t("off", lang)}</p>
      </div>
    );
  }
  if (loading) {
    return <p className="p-4 text-sm text-white/50">…</p>;
  }

  const s = stats ?? {
    requested: 0,
    ratingsReceived: 0,
    publicRouted: 0,
    privateRouted: 0,
    recentFeedback: [],
  };

  const tiles: { key: keyof typeof C; value: number }[] = [
    { key: "requested", value: s.requested },
    { key: "received", value: s.ratingsReceived },
    { key: "publicR", value: s.publicRouted },
    { key: "privateR", value: s.privateRouted },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => (
          <div
            key={tile.key}
            className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
          >
            <div className="text-[10px] uppercase tracking-[0.15em] text-white/45">
              {t(tile.key, lang)}
            </div>
            <div className="mt-1 text-2xl font-semibold text-[#c9a961]">
              {tile.value}
            </div>
          </div>
        ))}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-white/80">
          {t("recent", lang)}
        </h3>
        {s.recentFeedback.length === 0 ? (
          <p className="mt-2 text-sm text-white/45">{t("empty", lang)}</p>
        ) : (
          <ul className="mt-2 divide-y divide-white/10 rounded-xl border border-white/10">
            {s.recentFeedback.map((f) => (
              <li key={f.id} className="p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-white/80">{f.clientName}</span>
                  <span className="text-xs text-[#c9a961]">
                    {"★".repeat(Math.max(0, Math.min(5, f.rating)))}
                  </span>
                </div>
                {f.comment && (
                  <p className="mt-1 text-xs text-white/55">{f.comment}</p>
                )}
                <p className="mt-1 text-[10px] text-white/35">
                  {new Date(f.at).toLocaleDateString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
