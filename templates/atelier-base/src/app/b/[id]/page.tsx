import Link from "next/link";
import { notFound } from "next/navigation";
import { listBookings } from "../../../lib/bookings";
import { verifyBookingToken } from "../../../lib/bookingToken";
import { loadBusiness } from "../../../lib/settings";
import { wallClockInTzToUtc } from "../../../lib/tz";
import { langPick } from "../../../lib/langs";
import CancelButton from "./CancelButton";
import PushOptInBar from "../../components/PushOptInBar";

export const metadata = {
  title: "Your booking",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ClientBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { id } = await params;
  const { t: token } = await searchParams;

  const ok = await verifyBookingToken(id, token ?? "");
  if (!ok) notFound();

  const all = await listBookings();
  const booking = all.find((b) => b.id === id);
  if (!booking) notFound();

  const business = await loadBusiness();
  const tz = business.timezone || "Europe/Athens";
  const slotTs = wallClockInTzToUtc(booking.date, booking.time, tz);
  const now = Date.now();
  const hoursUntil = (slotTs - now) / 3_600_000;
  const isPast = hoursUntil < 0;
  const windowH = business.bookingRules?.cancellationWindowHours ?? 4;
  const cancelAllowed = !isPast && hoursUntil > windowH && booking.status !== "cancelled" && booking.status !== "completed";
  const isCancelled = booking.status === "cancelled";
  const lang = booking.lang === "el" ? "el" : "en";

  const L = (en: string, el: string) => (lang === "el" ? el : en);

  const phone = business.phone?.replace(/\s+/g, "") || "";
  const whatsapp = business.social?.whatsapp?.replace(/[^+\d]/g, "") || "";

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-6 py-16">
      <div className="mx-auto w-full max-w-lg rounded-2xl border p-8" style={{ borderColor: "var(--border-strong)", background: "var(--surface)" }}>
        <p className="text-[10px] uppercase tracking-[0.4em]" style={{ color: "var(--gold)" }}>
          {langPick({ en: "Your booking", el: "Το ραντεβού σου", de: "Deine Buchung", fr: "Votre rendez-vous", it: "La tua prenotazione", es: "Tu reserva", nl: "Je boeking", pl: "Twoja rezerwacja", pt: "A tua marcação", sv: "Din bokning", sq: "Rezervimi yt" }, lang)}
        </p>
        <h1 className="mt-2 font-serif text-3xl" style={{ color: "var(--foreground)" }}>
          {isCancelled
            ? langPick({ en: "Cancelled", el: "Ακυρώθηκε", de: "Storniert", fr: "Annulé", it: "Annullata", es: "Cancelada", nl: "Geannuleerd", pl: "Anulowana", pt: "Cancelada", sv: "Avbokad", sq: "Anuluar" }, lang)
            : langPick({ en: "Confirmed", el: "Επιβεβαιωμένο", de: "Bestätigt", fr: "Confirmé", it: "Confermata", es: "Confirmada", nl: "Bevestigd", pl: "Potwierdzona", pt: "Confirmada", sv: "Bekräftad", sq: "Konfirmuar" }, lang)}
        </h1>

        <dl className="mt-8 space-y-4 text-sm" style={{ color: "var(--foreground)" }}>
          <Row label={langPick({ en: "Service", el: "Υπηρεσία", de: "Leistung", fr: "Prestation", it: "Servizio", es: "Servicio", nl: "Dienst", pl: "Usługa", pt: "Serviço", sv: "Tjänst", sq: "Shërbimi" }, lang)} value={booking.serviceName} />
          <Row label={langPick({ en: "With", el: "Με", de: "Bei", fr: "Avec", it: "Con", es: "Con", nl: "Bij", pl: "U", pt: "Com", sv: "Hos", sq: "Me" }, lang)} value={booking.barberName} />
          <Row label={langPick({ en: "Date", el: "Ημερομηνία", de: "Datum", fr: "Date", it: "Data", es: "Fecha", nl: "Datum", pl: "Data", pt: "Data", sv: "Datum", sq: "Data" }, lang)} value={`${booking.date} · ${booking.time}`} />
          <Row label={langPick({ en: "Reference", el: "Κωδικός", de: "Referenz", fr: "Référence", it: "Riferimento", es: "Referencia", nl: "Referentie", pl: "Numer", pt: "Referência", sv: "Referens", sq: "Referenca" }, lang)} value={booking.id} />
          <Row label={langPick({ en: "Name", el: "Όνομα", de: "Name", fr: "Nom", it: "Nome", es: "Nombre", nl: "Naam", pl: "Imię", pt: "Nome", sv: "Namn", sq: "Emri" }, lang)} value={booking.name} />
        </dl>

        {isCancelled ? (
          <p className="mt-8 text-sm" style={{ color: "var(--muted)" }}>
            {langPick({
              en: "This booking has been cancelled. You're welcome to book another time. We'd love to see you.",
              el: "Το ραντεβού ακυρώθηκε. Μπορείς να κλείσεις ξανά όποτε σε βολεύει.",
              de: "Diese Buchung wurde storniert. Du kannst gerne einen neuen Termin buchen. Wir freuen uns auf dich.",
              fr: "Ce rendez-vous a été annulé. N'hésitez pas à en réserver un autre. On serait ravis de vous revoir.",
              it: "Questa prenotazione è stata annullata. Puoi prenotare un altro orario quando vuoi. Saremo felici di vederti.",
              es: "Esta reserva se ha cancelado. Puedes reservar otra hora cuando quieras. Nos encantaría verte.",
              nl: "Deze boeking is geannuleerd. Je bent welkom om een andere keer te boeken. We zien je graag.",
              pl: "Ta rezerwacja została anulowana. Możesz zarezerwować inny termin, kiedy chcesz. Chętnie cię zobaczymy.",
              pt: "Esta marcação foi cancelada. Podes marcar outra hora quando quiseres. Adorávamos ver-te.",
              sv: "Den här bokningen har avbokats. Du är välkommen att boka en annan tid. Vi ses gärna.",
              sq: "Ky rezervim u anulua. Je i mirëpritur të rezervosh një orë tjetër. Do të na pëlqente të të shihnim.",
            }, lang)}
          </p>
        ) : isPast ? (
          <p className="mt-8 text-sm" style={{ color: "var(--muted)" }}>
            {langPick({
              en: "This booking has already taken place. Hope it went well. We'd appreciate a review!",
              el: "Αυτό το ραντεβού έχει ήδη πραγματοποιηθεί. Θα χαιρόμασταν πολύ για μια κριτική!",
              de: "Dieser Termin hat bereits stattgefunden. Wir hoffen, es hat dir gefallen. Über eine Bewertung würden wir uns freuen!",
              fr: "Ce rendez-vous a déjà eu lieu. On espère que tout s'est bien passé. Un avis serait apprécié !",
              it: "Questa prenotazione è già avvenuta. Speriamo sia andata bene. Ci farebbe piacere una recensione!",
              es: "Esta reserva ya ha tenido lugar. Esperamos que todo fuera bien. Agradeceríamos una reseña.",
              nl: "Deze boeking heeft al plaatsgevonden. We hopen dat het goed ging. Een review stellen we op prijs!",
              pl: "Ta rezerwacja już się odbyła. Mamy nadzieję, że wszystko poszło dobrze. Będziemy wdzięczni za opinię!",
              pt: "Esta marcação já teve lugar. Esperamos que tenha corrido bem. Agradecíamos uma avaliação.",
              sv: "Den här bokningen har redan ägt rum. Vi hoppas att allt gick bra. Vi uppskattar gärna ett omdöme!",
              sq: "Ky rezervim ka ndodhur tashmë. Shpresojmë të ketë shkuar mirë. Do ta vlerësonim një vlerësim!",
            }, lang)}
          </p>
        ) : cancelAllowed ? (
          <div className="mt-8 flex flex-wrap gap-3">
            <CancelButton
              id={booking.id}
              token={token ?? ""}
              label={langPick({ en: "Cancel booking", el: "Ακύρωση ραντεβού", de: "Buchung stornieren", fr: "Annuler le rendez-vous", it: "Annulla prenotazione", es: "Cancelar reserva", nl: "Boeking annuleren", pl: "Anuluj rezerwację", pt: "Cancelar marcação", sv: "Avboka", sq: "Anulo rezervimin" }, lang)}
              confirmText={langPick({ en: "Cancel this booking?", el: "Να ακυρωθεί το ραντεβού;", de: "Diese Buchung stornieren?", fr: "Annuler ce rendez-vous ?", it: "Annullare questa prenotazione?", es: "¿Cancelar esta reserva?", nl: "Deze boeking annuleren?", pl: "Anulować tę rezerwację?", pt: "Cancelar esta marcação?", sv: "Avboka den här bokningen?", sq: "Të anulohet ky rezervim?" }, lang)}
            />
            <Link
              href="/book"
              className="inline-flex items-center rounded-full border px-5 py-2.5 text-xs font-semibold uppercase tracking-widest"
              style={{ borderColor: "var(--border-strong)", color: "var(--foreground)" }}
            >
              {langPick({ en: "Reschedule", el: "Αλλαγή ώρας", de: "Termin ändern", fr: "Reprogrammer", it: "Riprogramma", es: "Cambiar hora", nl: "Verzetten", pl: "Zmień termin", pt: "Reagendar", sv: "Boka om", sq: "Riprogramo" }, lang)}
            </Link>
          </div>
        ) : (
          <p className="mt-8 rounded-lg border px-4 py-3 text-xs"
            style={{ borderColor: "color-mix(in srgb, var(--gold) 30%, transparent)", background: "color-mix(in srgb, var(--gold) 8%, transparent)", color: "var(--foreground)" }}>
            {L(`Free cancellation window has closed (${windowH}h before). Please call or WhatsApp us if you need to change this.`,
               `Το περιθώριο δωρεάν ακύρωσης έκλεισε (${windowH} ώρες πριν). Πάρε μας τηλέφωνο ή WhatsApp αν χρειάζεσαι αλλαγή.`)}
          </p>
        )}

        <div className="mt-10 flex flex-wrap gap-3 border-t pt-6 text-xs uppercase tracking-widest" style={{ borderColor: "var(--border)", color: "var(--muted-2)" }}>
          {whatsapp && (
            <a href={`https://wa.me/${whatsapp.replace(/^\+/, "")}`} target="_blank" rel="noopener noreferrer" className="hover:text-[color:var(--foreground)]">
              WhatsApp
            </a>
          )}
          {phone && <a href={`tel:${phone}`} className="hover:text-[color:var(--foreground)]">{langPick({ en: "Call", el: "Κλήση", de: "Anrufen", fr: "Appeler", it: "Chiama", es: "Llamar", nl: "Bellen", pl: "Zadzwoń", pt: "Ligar", sv: "Ring", sq: "Telefono" }, lang)}</a>}
          <Link href="/" className="hover:text-[color:var(--foreground)]">{langPick({ en: "Home", el: "Αρχική", de: "Start", fr: "Accueil", it: "Home", es: "Inicio", nl: "Home", pl: "Start", pt: "Início", sv: "Hem", sq: "Ballina" }, lang)}</Link>
        </div>
      </div>
      {/* Offer push opt-in only for an upcoming, live booking. */}
      {!isCancelled && !isPast && (
        <PushOptInBar email={booking.email} phone={booking.phone} />
      )}
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-3">
      <dt className="text-[10px] uppercase tracking-widest" style={{ color: "var(--muted-2)" }}>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
