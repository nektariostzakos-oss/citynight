import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "../../../../lib/auth";
import { isMarketingFeatureOn } from "../../../../lib/marketingFlags";
import { getFunnelStats, listFeedback } from "../../../../lib/reviewEngine";
import { listBookings } from "../../../../lib/bookings";
import type { Lang } from "../../../../lib/langs";
import { detectLang } from "../../../../lib/i18nServer";

export const metadata: Metadata = {
  title: "Reputation · Marketing · Admin",
  robots: { index: false, follow: false, noarchive: true },
};

export const dynamic = "force-dynamic";

/**
 * Salon admin reputation panel — Phase 6 of the Tenant Marketing Suite.
 *
 * Server component. Shows the review funnel rates (requests, responses,
 * public-routed, private-routed) and a list of recent private feedback entries.
 * Read-only: no mutations happen here.
 *
 * Auth: tenant admin session required.
 * Feature gate: if reviewEngine is off, a short notice is shown.
 */

// ---- L10n copy --------------------------------------------------------------

type L10nStr = Record<Lang, string>;

const COPY: {
  kpiLabel: L10nStr[];
  feedbackSection: L10nStr;
  feedbackNone: L10nStr;
  rating: L10nStr;
  comment: L10nStr;
  client: L10nStr;
  date: L10nStr;
  featureOff: L10nStr;
  conversionRate: L10nStr;
  publicRate: L10nStr;
} = {
  kpiLabel: [
    {
      en: "Requests sent",
      el: "Αιτήματα απεστάλησαν",
      de: "Anfragen gesendet",
      fr: "Demandes envoyées",
      it: "Richieste inviate",
      es: "Solicitudes enviadas",
      nl: "Verzoeken verzonden",
      pl: "Wysłane prośby",
      pt: "Pedidos enviados",
      sv: "Skickade förfrågningar",
      sq: "Kërkesa të dërguara",
    },
    {
      en: "Ratings received",
      el: "Βαθμολογίες παραλήφθηκαν",
      de: "Bewertungen erhalten",
      fr: "Évaluations reçues",
      it: "Valutazioni ricevute",
      es: "Valoraciones recibidas",
      nl: "Ontvangen beoordelingen",
      pl: "Otrzymane oceny",
      pt: "Avaliações recebidas",
      sv: "Mottagna betyg",
      sq: "Vlerësime të marra",
    },
    {
      en: "Routed to Google",
      el: "Προωθήθηκαν στο Google",
      de: "An Google weitergeleitet",
      fr: "Dirigé vers Google",
      it: "Indirizzati a Google",
      es: "Dirigidos a Google",
      nl: "Doorgestuurd naar Google",
      pl: "Skierowane do Google",
      pt: "Encaminhados para o Google",
      sv: "Vidarebefordrat till Google",
      sq: "Drejtuar te Google",
    },
    {
      en: "Private feedback",
      el: "Ιδιωτικά σχόλια",
      de: "Privates Feedback",
      fr: "Retours privés",
      it: "Feedback privati",
      es: "Comentarios privados",
      nl: "Privéfeedback",
      pl: "Prywatne opinie",
      pt: "Comentários privados",
      sv: "Privat feedback",
      sq: "Komente private",
    },
  ],
  feedbackSection: {
    en: "Recent private feedback",
    el: "Πρόσφατα ιδιωτικά σχόλια",
    de: "Neuestes privates Feedback",
    fr: "Retours privés récents",
    it: "Feedback privati recenti",
    es: "Comentarios privados recientes",
    nl: "Recente privéfeedback",
    pl: "Ostatnie prywatne opinie",
    pt: "Comentários privados recentes",
    sv: "Senaste privata feedback",
    sq: "Komentet e fundit private",
  },
  feedbackNone: {
    en: "No private feedback yet. Low-rating responses from the review funnel will appear here.",
    el: "Δεν υπάρχουν ακόμη ιδιωτικά σχόλια. Οι απαντήσεις με χαμηλή βαθμολογία από τη διαδρομή αξιολόγησης θα εμφανιστούν εδώ.",
    de: "Noch kein privates Feedback. Antworten mit niedrigen Bewertungen aus dem Bewertungs-Funnel werden hier angezeigt.",
    fr: "Pas encore de retours privés. Les réponses avec des évaluations basses du tunnel d'avis apparaîtront ici.",
    it: "Nessun feedback privato ancora. Le risposte con valutazioni basse dal funnel delle recensioni appariranno qui.",
    es: "Aún no hay comentarios privados. Las respuestas con bajas valoraciones del embudo de reseñas aparecerán aquí.",
    nl: "Nog geen privéfeedback. Reacties met lage beoordelingen uit de beoordelingstrechter verschijnen hier.",
    pl: "Brak jeszcze prywatnych opinii. Odpowiedzi z niskimi ocenami z lejka recenzji pojawią się tutaj.",
    pt: "Ainda não há comentários privados. As respostas com avaliações baixas do funil de avaliações aparecerão aqui.",
    sv: "Inget privat feedback ännu. Svar med låga betyg från recensionstunneln visas här.",
    sq: "Ende asnjë koment privat. Përgjigjet me vlerësime të ulëta nga gypi i vlerësimeve do të shfaqen këtu.",
  },
  rating: {
    en: "Rating",
    el: "Βαθμολογία",
    de: "Bewertung",
    fr: "Évaluation",
    it: "Valutazione",
    es: "Valoración",
    nl: "Beoordeling",
    pl: "Ocena",
    pt: "Avaliação",
    sv: "Betyg",
    sq: "Vlerësim",
  },
  comment: {
    en: "Comment",
    el: "Σχόλιο",
    de: "Kommentar",
    fr: "Commentaire",
    it: "Commento",
    es: "Comentario",
    nl: "Opmerking",
    pl: "Komentarz",
    pt: "Comentário",
    sv: "Kommentar",
    sq: "Koment",
  },
  client: {
    en: "Client",
    el: "Πελάτης",
    de: "Kunde",
    fr: "Client",
    it: "Cliente",
    es: "Cliente",
    nl: "Klant",
    pl: "Klient",
    pt: "Cliente",
    sv: "Kund",
    sq: "Klient",
  },
  date: {
    en: "Date",
    el: "Ημερομηνία",
    de: "Datum",
    fr: "Date",
    it: "Data",
    es: "Fecha",
    nl: "Datum",
    pl: "Data",
    pt: "Data",
    sv: "Datum",
    sq: "Data",
  },
  featureOff: {
    en: "The Review Engine feature is currently disabled. Contact your platform operator to enable it for this account.",
    el: "Η λειτουργία Μηχανής Αξιολόγησης είναι απενεργοποιημένη. Επικοινωνήστε με τον χειριστή της πλατφόρμας για να την ενεργοποιήσετε.",
    de: "Die Funktion Bewertungsmotor ist derzeit deaktiviert. Wenden Sie sich an Ihren Plattformbetreiber, um sie fuer dieses Konto zu aktivieren.",
    fr: "La fonctionnalite Moteur d'avis est actuellement desactivee. Contactez votre operateur de plateforme pour l'activer pour ce compte.",
    it: "La funzione Motore delle recensioni è attualmente disabilitata. Contatta il tuo operatore della piattaforma per abilitarla per questo account.",
    es: "La función Motor de reseñas está actualmente desactivada. Contacta con el operador de tu plataforma para habilitarla en esta cuenta.",
    nl: "De functie Beoordelingsmotor is momenteel uitgeschakeld. Neem contact op met uw platformoperator om het voor dit account in te schakelen.",
    pl: "Funkcja Silnik ocen jest obecnie wyłączona. Skontaktuj się z operatorem platformy, aby włączyć ją dla tego konta.",
    pt: "A funcionalidade Motor de avaliações está atualmente desativada. Contacte o operador da plataforma para a ativar para esta conta.",
    sv: "Funktionen Recensionsmotor är för närvarande inaktiverad. Kontakta din plattformsoperatör för att aktivera den för det här kontot.",
    sq: "Veçoria e Motorit të Vlerësimeve është aktualisht e çaktivizuar. Kontaktoni operatorin e platformës suaj për ta aktivizuar për këtë llogari.",
  },
  conversionRate: {
    en: "Response rate",
    el: "Ποσοστό απόκρισης",
    de: "Rücklaufquote",
    fr: "Taux de réponse",
    it: "Tasso di risposta",
    es: "Tasa de respuesta",
    nl: "Responspercentage",
    pl: "Wskaźnik odpowiedzi",
    pt: "Taxa de resposta",
    sv: "Svarsfrekvens",
    sq: "Shkalla e përgjigjes",
  },
  publicRate: {
    en: "Public route rate",
    el: "Ποσοστό δημόσιας δρομολόγησης",
    de: "Öffentliche Weiterleitungsrate",
    fr: "Taux de redirection publique",
    it: "Tasso di instradamento pubblico",
    es: "Tasa de enrutamiento público",
    nl: "Openbare routeringspercentage",
    pl: "Wskaźnik publicznego routingu",
    pt: "Taxa de encaminhamento público",
    sv: "Offentlig routningshastighet",
    sq: "Shkalla e rrugëzimit publik",
  },
};

function pick(rec: L10nStr, lang: Lang): string {
  return rec[lang] ?? rec.en;
}

function pct(num: number, den: number): string {
  if (den === 0) return "0%";
  return Math.round((num / den) * 100) + "%";
}

// ---- Page -------------------------------------------------------------------

export default async function ReputationPage() {
  const me = await currentUser();
  if (!me) redirect("/admin/login");
  if (me.role !== "admin") redirect("/admin");

  const featureOn = await isMarketingFeatureOn("reviewEngine");

  const lang: Lang = await detectLang(undefined);

  if (!featureOn) {
    return (
      <div className="min-h-screen bg-[#0a0806] text-white">
        <header className="border-b border-white/10 bg-white/[0.02] px-4 py-4 sm:px-6 sm:py-5">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-[#c9a961] sm:text-xs">
                Marketing
              </p>
              <h1 className="mt-0.5 font-serif text-xl font-semibold sm:mt-1 sm:text-2xl">
                Reputation
              </h1>
            </div>
            <Link
              href="/admin"
              className="rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-widest text-white/70 transition-colors hover:bg-white/10"
            >
              Back to admin
            </Link>
          </div>
        </header>
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center">
            <p className="text-sm text-white/50">{pick(COPY.featureOff, lang)}</p>
          </div>
        </div>
      </div>
    );
  }

  // Count bookings that have had a review request sent (reviewedAt is set).
  const allBookings = await listBookings();
  const requestedCount = allBookings.filter((b) => b.reviewedAt).length;

  const stats = await getFunnelStats(requestedCount);
  const feedback = await listFeedback();

  const kpiValues = [
    stats.requested,
    stats.ratingsReceived,
    stats.publicRouted,
    stats.privateRouted,
  ];

  return (
    <div className="min-h-screen bg-[#0a0806] text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-white/[0.02] px-4 py-4 sm:px-6 sm:py-5">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#c9a961] sm:text-xs">
              Marketing
            </p>
            <h1 className="mt-0.5 font-serif text-xl font-semibold sm:mt-1 sm:text-2xl">
              Reputation
            </h1>
          </div>
          <Link
            href="/admin"
            className="rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-widest text-white/70 transition-colors hover:bg-white/10"
          >
            Back to admin
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10 space-y-8">

        {/* KPI strip */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {COPY.kpiLabel.map((label, i) => (
            <div
              key={i}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-center"
            >
              <p className="text-2xl font-semibold tabular-nums text-[#c9a961]">
                {kpiValues[i]}
              </p>
              <p className="mt-1 text-[10px] uppercase tracking-widest text-white/50">
                {pick(label, lang)}
              </p>
            </div>
          ))}
        </section>

        {/* Conversion rates */}
        <section className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-center">
            <p className="text-2xl font-semibold tabular-nums text-[#c9a961]">
              {pct(stats.ratingsReceived, stats.requested)}
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-widest text-white/50">
              {pick(COPY.conversionRate, lang)}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-center">
            <p className="text-2xl font-semibold tabular-nums text-[#c9a961]">
              {pct(stats.publicRouted, stats.ratingsReceived)}
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-widest text-white/50">
              {pick(COPY.publicRate, lang)}
            </p>
          </div>
        </section>

        {/* Funnel bar */}
        {stats.requested > 0 && (
          <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-[10px] uppercase tracking-widest text-white/50 mb-3">
              Funnel
            </p>
            <div className="space-y-2">
              {[
                {
                  label: pick(COPY.kpiLabel[0], lang),
                  val: stats.requested,
                  max: stats.requested,
                },
                {
                  label: pick(COPY.kpiLabel[1], lang),
                  val: stats.ratingsReceived,
                  max: stats.requested,
                },
                {
                  label: pick(COPY.kpiLabel[2], lang),
                  val: stats.publicRouted,
                  max: stats.requested,
                },
                {
                  label: pick(COPY.kpiLabel[3], lang),
                  val: stats.privateRouted,
                  max: stats.requested,
                },
              ].map(({ label, val, max }) => (
                <div key={label} className="flex items-center gap-3 text-sm">
                  <span className="w-36 shrink-0 text-white/60 text-xs">{label}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#c9a961] transition-all"
                      style={{ width: pct(val, max) }}
                    />
                  </div>
                  <span className="w-6 text-right tabular-nums text-white/50 text-xs">{val}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Private feedback list */}
        <section>
          <h2 className="text-xs uppercase tracking-widest text-white/50 mb-4">
            {pick(COPY.feedbackSection, lang)}
          </h2>
          {feedback.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center">
              <p className="text-sm text-white/40">{pick(COPY.feedbackNone, lang)}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {feedback.map((fb) => (
                <div
                  key={fb.id}
                  className="rounded-xl border border-white/10 bg-white/[0.03] p-5"
                >
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <p className="text-sm font-medium">{fb.clientName}</p>
                      <p className="text-xs text-white/40">{fb.clientEmail}</p>
                    </div>
                    <div className="text-right shrink-0">
                      {/* Star display */}
                      <p className="text-[#c9a961]" aria-label={`${fb.rating} stars`}>
                        {"★".repeat(fb.rating)}
                        {"☆".repeat(5 - fb.rating)}
                      </p>
                      <p className="text-[10px] text-white/30 mt-0.5">
                        {new Date(fb.at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {fb.comment && (
                    <p className="mt-3 text-sm text-white/70 whitespace-pre-wrap">
                      {fb.comment}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
