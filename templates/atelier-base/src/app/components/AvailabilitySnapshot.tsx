import Link from "next/link";
import { getTakenSlots } from "../../lib/bookings";
import { getSlotsForDay } from "../../lib/services";
import { loadBookingMode, loadBusiness } from "../../lib/settings";
import { todayIsoInTz, nowMinutesInTz, dayOfWeekInTz } from "../../lib/tz";

// IMPORTANT: do NOT call cookies() here — it opts the component's tree
// into dynamic rendering on every request, which overrides the home page's
// `revalidate = 60` ISR and causes 503s on memory-constrained shared hosts.
// We emit one string per language with data-i18n attributes; CSS in
// globals.css shows only the one matching the current html lang
// (LangProvider keeps html.lang synced to the user's preference).

type LangText = React.ReactNode;

function L({
  en,
  el,
  de,
  it,
}: {
  en: LangText;
  el: LangText;
  de?: LangText;
  it?: LangText;
}) {
  return (
    <>
      <span data-i18n="en">{en}</span>
      <span data-i18n="el">{el}</span>
      <span data-i18n="de">{de ?? en}</span>
      <span data-i18n="it">{it ?? en}</span>
    </>
  );
}

function slotMinutes(s: string): number {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
}

const RESERVATION_SLOTS = [
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
  "19:00", "19:30", "20:00", "20:30", "21:00", "21:30", "22:00", "22:30",
];

const DAY_NAMES_EN: Record<number, string> = {
  0: "Sunday", 1: "Monday", 2: "Tuesday", 3: "Wednesday",
  4: "Thursday", 5: "Friday", 6: "Saturday",
};
const DAY_NAMES_EL: Record<number, string> = {
  0: "Κυριακή", 1: "Δευτέρα", 2: "Τρίτη", 3: "Τετάρτη",
  4: "Πέμπτη", 5: "Παρασκευή", 6: "Σάββατο",
};
const DAY_NAMES_DE: Record<number, string> = {
  0: "Sonntag", 1: "Montag", 2: "Dienstag", 3: "Mittwoch",
  4: "Donnerstag", 5: "Freitag", 6: "Samstag",
};
const DAY_NAMES_IT: Record<number, string> = {
  0: "Domenica", 1: "Lunedì", 2: "Martedì", 3: "Mercoledì",
  4: "Giovedì", 5: "Venerdì", 6: "Sabato",
};

export default async function AvailabilitySnapshot() {
  const mode = await loadBookingMode();
  const business = await loadBusiness();
  const tz = business.timezone || "Europe/Athens";
  const today = todayIsoInTz(tz);
  const taken = await getTakenSlots(today, "any");
  const leadTime = business.bookingRules?.leadTimeMinutes ?? 45;
  const cutoff = nowMinutesInTz(tz) + leadTime;

  const dayIdx = dayOfWeekInTz(tz);
  const dowEn = DAY_NAMES_EN[dayIdx];
  const dowEl = DAY_NAMES_EL[dayIdx];
  const dowDe = DAY_NAMES_DE[dayIdx];
  const dowIt = DAY_NAMES_IT[dayIdx];

  const allSlots = mode === "reservation" ? RESERVATION_SLOTS : getSlotsForDay(dayIdx, business.hours);
  const allFreeToday = allSlots.filter((s) => !taken.includes(s) && slotMinutes(s) >= cutoff);
  const free = allFreeToday.slice(0, 3);
  const totalFree = allFreeToday.length;

  const closedToday = business.hours?.find((h) => {
    const d = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][dayIdx];
    return h.day === d;
  })?.closed;

  if (closedToday) {
    return (
      <section className="px-6 py-10" style={{ background: "var(--surface)" }}>
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4 rounded-xl border px-6 py-5"
          style={{ borderColor: "var(--border)", background: "var(--background)" }}
        >
          <div>
            <p className="eyebrow">
              <L
                en={`Today · ${dowEn}`}
                el={`Σήμερα · ${dowEl}`}
                de={`Heute · ${dowDe}`}
                it={`Oggi · ${dowIt}`}
              />
            </p>
            <p className="mt-2 font-serif text-2xl" style={{ color: "var(--foreground)" }}>
              <L
                en="We're closed today."
                el="Είμαστε κλειστά σήμερα."
                de="Heute geschlossen."
                it="Oggi siamo chiusi."
              />
            </p>
            <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
              <L
                en="Booking opens for tomorrow. Pick a date that works."
                el="Οι κρατήσεις για αύριο είναι ανοιχτές. Διάλεξε ημερομηνία που σου ταιριάζει."
                de="Buchungen für morgen sind offen. Wähle ein passendes Datum."
                it="Le prenotazioni per domani sono aperte. Scegli una data che ti va bene."
              />
            </p>
          </div>
          <Link href="/book" className="btn-premium-outline">
            <L
              en="See full calendar"
              el="Δες το ημερολόγιο"
              de="Ganzen Kalender ansehen"
              it="Vedi il calendario completo"
            />
          </Link>
        </div>
      </section>
    );
  }

  if (free.length === 0) {
    return (
      <section className="px-6 py-10" style={{ background: "var(--surface)" }}>
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4 rounded-xl border px-6 py-5"
          style={{ borderColor: "var(--border)", background: "var(--background)" }}
        >
          <div>
            <p className="eyebrow">
              <L
                en="Today · Fully booked"
                el="Σήμερα · Γεμάτο"
                de="Heute · Ausgebucht"
                it="Oggi · Tutto prenotato"
              />
            </p>
            <p className="mt-2 font-serif text-2xl" style={{ color: "var(--foreground)" }}>
              <L
                en="No openings left for today."
                el="Δεν υπάρχουν άλλες θέσεις για σήμερα."
                de="Heute sind keine Plätze mehr frei."
                it="Nessun posto disponibile per oggi."
              />
            </p>
            <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
              <L
                en="Tomorrow has plenty. Pick your time."
                el="Αύριο υπάρχουν πολλές επιλογές. Διάλεξε την ώρα σου."
                de="Morgen gibt es reichlich. Wähle deine Zeit."
                it="Domani c'è ampia scelta. Scegli il tuo orario."
              />
            </p>
          </div>
          <Link href="/book" className="btn-premium-outline">
            <L
              en="View tomorrow"
              el="Δες το αύριο"
              de="Morgen ansehen"
              it="Vedi domani"
            />
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="px-6 py-12" style={{ background: "var(--surface)" }}>
      <div
        className="mx-auto max-w-4xl rounded-2xl border p-6 sm:p-8"
        style={{
          borderColor: "color-mix(in srgb, var(--gold) 30%, transparent)",
          background: "color-mix(in srgb, var(--gold) 6%, transparent)",
        }}
      >
        <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="text-center sm:text-left">
            <p className="eyebrow flex items-center justify-center gap-2 sm:justify-start">
              <span
                aria-hidden
                className="inline-block h-1.5 w-1.5 animate-pulse rounded-full"
                style={{ background: "#22c55e" }}
              />
              {mode === "reservation" ? (
                <L
                  en="Tonight · still available"
                  el="Απόψε · διαθέσιμο"
                  de="Heute Abend · noch verfügbar"
                  it="Stasera · ancora disponibile"
                />
              ) : (
                <L
                  en={`Today · ${dowEn}`}
                  el={`Σήμερα · ${dowEl}`}
                  de={`Heute · ${dowDe}`}
                  it={`Oggi · ${dowIt}`}
                />
              )}
            </p>
            <h2 className="mt-2 font-serif text-2xl sm:text-4xl" style={{ color: "var(--foreground)" }}>
              {mode === "reservation" ? (
                <L
                  en="Tables open tonight."
                  el="Τραπέζια διαθέσιμα απόψε."
                  de="Heute Abend sind Tische frei."
                  it="Tavoli liberi stasera."
                />
              ) : (
                <L
                  en="Walk-in slots open today."
                  el="Θέσεις διαθέσιμες σήμερα."
                  de="Heute Plätze ohne Termin frei."
                  it="Oggi posti liberi senza appuntamento."
                />
              )}
            </h2>
            {totalFree > 0 && totalFree <= 5 && (
              <p className="mt-2 text-sm font-medium" style={{ color: "var(--gold)" }}>
                {totalFree === 1 ? (
                  <L
                    en="Only 1 spot left today."
                    el="Μόνο 1 θέση απομένει σήμερα."
                    de="Nur noch 1 Platz heute frei."
                    it="Solo 1 posto rimasto oggi."
                  />
                ) : (
                  <L
                    en={`Only ${totalFree} spots left today.`}
                    el={`Μόνο ${totalFree} θέσεις απομένουν σήμερα.`}
                    de={`Nur noch ${totalFree} Plätze heute frei.`}
                    it={`Solo ${totalFree} posti rimasti oggi.`}
                  />
                )}
              </p>
            )}
          </div>
          <div className="flex justify-center sm:block">
            <Link
              href="/book"
              className="btn-premium !px-5 !py-2 !text-[10px] sm:!px-7 sm:!py-3 sm:!text-xs"
            >
              {mode === "reservation" ? (
                <L
                  en="Reserve a table"
                  el="Κράτηση τραπεζιού"
                  de="Tisch reservieren"
                  it="Prenota un tavolo"
                />
              ) : (
                <L
                  en="See full calendar"
                  el="Δες το ημερολόγιο"
                  de="Ganzen Kalender ansehen"
                  it="Vedi il calendario completo"
                />
              )}
            </Link>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:gap-3">
          {free.map((s) => (
            <Link
              key={s}
              href={`/book?date=${today}&time=${s}`}
              className="inline-flex flex-col items-center justify-center gap-0.5 rounded-full border px-2 py-2 transition-colors hover:bg-[color:var(--gold)] hover:text-[color:var(--background)] sm:flex-row sm:items-baseline sm:gap-2 sm:px-5 sm:py-2.5"
              style={{
                borderColor: "color-mix(in srgb, var(--gold) 50%, transparent)",
                color: "var(--foreground)",
              }}
            >
              <span className="font-serif text-base sm:text-lg">{s}</span>
              <span className="text-[8px] uppercase tracking-widest opacity-70 sm:text-[9px]">
                <L en="free" el="ελεύθερο" de="frei" it="libero" />
              </span>
            </Link>
          ))}
        </div>

        <p className="mt-4 text-xs" style={{ color: "var(--muted-2)" }}>
          {mode === "reservation" ? (
            <L
              en="Showing the next three open seatings. Tap a time to start your reservation."
              el="Οι τρεις επόμενες διαθέσιμες ώρες τραπεζιού. Πάτησε μία για να κάνεις κράτηση."
              de="Die nächsten drei freien Tischzeiten. Tippe auf eine Zeit, um die Reservierung zu starten."
              it="Mostriamo i prossimi tre tavoli liberi. Tocca un orario per iniziare la prenotazione."
            />
          ) : (
            <L
              en="Showing the next three open chairs. Tap a slot to lock it in."
              el="Οι τρεις επόμενες διαθέσιμες θέσεις για σήμερα. Πάτησε μία για να την κλείσεις."
              de="Die nächsten drei freien Stühle. Tippe auf einen Platz, um ihn zu sichern."
              it="Mostriamo le prossime tre poltrone libere. Tocca uno slot per bloccarlo."
            />
          )}
        </p>
      </div>
    </section>
  );
}
