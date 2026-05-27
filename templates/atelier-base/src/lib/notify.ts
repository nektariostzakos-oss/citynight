/**
 * Booking notifications — Web Push, with email kept as the fallback.
 *
 * For every booking event (new booking, cancellation) this module pushes:
 *   - the CUSTOMER, if they opted in on their phone (matched by email/phone);
 *   - every OWNER/staff device that opted in.
 *
 * Email is unchanged and still the fallback: a customer who never subscribed
 * to push still gets the booking email. Push is purely additive.
 *
 * Every function here is best-effort and self-contained: a push failure must
 * never throw into the booking flow. Route handlers fire these and ignore
 * the returned promise.
 */
import type { Booking } from "./bookings";
import {
  ownerSubscriptions,
  sendPush,
  subscriptionsForClient,
  type PushPayload,
  type PushSubscriptionRecord,
} from "./push";
import { signBookingId } from "./bookingToken";
import { loadBusiness } from "./settings";
import { getTenantPath } from "./tenantContext";
import { SUPPORTED_LANGS, langPick, type Lang } from "./langs";

/** Default language for owner-facing pushes when no preference is stored. */
const OWNER_LANG: Lang = "en";

function clampLang(l: unknown): Lang {
  return SUPPORTED_LANGS.includes(l as Lang) ? (l as Lang) : "en";
}

/**
 * Prefix a root-relative path with the tenant URL slug, so the notification
 * opens the correct site under the SaaS bundle. Standalone (no tenant) the
 * path is returned unchanged. Never hardcodes a slug — the slug comes only
 * from the per-request tenant context.
 */
function tenantUrl(pathRel: string): string {
  const slug = getTenantPath();
  if (!slug) return pathRel;
  if (pathRel === `/${slug}` || pathRel.startsWith(`/${slug}/`)) return pathRel;
  return `/${slug}${pathRel}`;
}

/** The customer's self-service booking page, tenant-correct and token-signed. */
async function bookingUrl(b: Booking): Promise<string> {
  const token = await signBookingId(b.id);
  return tenantUrl(`/b/${encodeURIComponent(b.id)}?t=${token}`);
}

// --- localized notification copy (all 11 languages) -----------------------

type Copy = Record<Lang, string>;

const CONFIRMED_TITLE: Copy = {
  en: "Booking confirmed",
  el: "Το ραντεβού επιβεβαιώθηκε",
  de: "Buchung bestätigt",
  fr: "Réservation confirmée",
  it: "Prenotazione confermata",
  es: "Reserva confirmada",
  nl: "Boeking bevestigd",
  pl: "Rezerwacja potwierdzona",
  pt: "Marcação confirmada",
  sv: "Bokning bekräftad",
  sq: "Rezervimi u konfirmua",
};

const REMINDER_TITLE: Copy = {
  en: "Appointment reminder",
  el: "Υπενθύμιση ραντεβού",
  de: "Termin-Erinnerung",
  fr: "Rappel de rendez-vous",
  it: "Promemoria appuntamento",
  es: "Recordatorio de cita",
  nl: "Herinnering afspraak",
  pl: "Przypomnienie o wizycie",
  pt: "Lembrete de marcação",
  sv: "Påminnelse om tid",
  sq: "Kujtesë takimi",
};

const CANCELLED_TITLE: Copy = {
  en: "Booking cancelled",
  el: "Το ραντεβού ακυρώθηκε",
  de: "Buchung storniert",
  fr: "Réservation annulée",
  it: "Prenotazione annullata",
  es: "Reserva cancelada",
  nl: "Boeking geannuleerd",
  pl: "Rezerwacja anulowana",
  pt: "Marcação cancelada",
  sv: "Bokning avbokad",
  sq: "Rezervimi u anulua",
};

const NEW_BOOKING_TITLE: Copy = {
  en: "New booking",
  el: "Νέο ραντεβού",
  de: "Neue Buchung",
  fr: "Nouvelle réservation",
  it: "Nuova prenotazione",
  es: "Nueva reserva",
  nl: "Nieuwe boeking",
  pl: "Nowa rezerwacja",
  pt: "Nova marcação",
  sv: "Ny bokning",
  sq: "Rezervim i ri",
};

const OWNER_CANCEL_TITLE: Copy = {
  en: "Booking cancelled",
  el: "Ακύρωση ραντεβού",
  de: "Buchung storniert",
  fr: "Réservation annulée",
  it: "Prenotazione annullata",
  es: "Reserva cancelada",
  nl: "Boeking geannuleerd",
  pl: "Rezerwacja anulowana",
  pt: "Marcação cancelada",
  sv: "Bokning avbokad",
  sq: "Rezervim i anuluar",
};

/**
 * Body line: "{service} with {staff}, {date} at {time}".
 * Built without em dashes, localized connectors.
 */
function bookingLine(b: Booking, lang: Lang): string {
  const withWord = langPick(
    {
      en: "with",
      el: "με",
      de: "bei",
      fr: "avec",
      it: "con",
      es: "con",
      nl: "bij",
      pl: "u",
      pt: "com",
      sv: "hos",
      sq: "me",
    },
    lang
  );
  const atWord = langPick(
    {
      en: "at",
      el: "στις",
      de: "um",
      fr: "à",
      it: "alle",
      es: "a las",
      nl: "om",
      pl: "o",
      pt: "às",
      sv: "kl.",
      sq: "në orën",
    },
    lang
  );
  return `${b.serviceName} ${withWord} ${b.barberName}, ${b.date} ${atWord} ${b.time}`;
}

const ICON = "/icon";

// --- customer pushes -------------------------------------------------------

/** Customer push: booking confirmed. */
async function pushCustomerConfirmed(b: Booking): Promise<void> {
  const subs = await subscriptionsForClient(b.email, b.phone);
  if (subs.length === 0) return;
  const url = await bookingUrl(b);
  await sendByLang(subs, (lang) => ({
    title: langPick(CONFIRMED_TITLE, lang),
    body: bookingLine(b, lang),
    url,
    icon: tenantUrl(ICON),
    tag: `booking-${b.id}`,
  }));
}

/** Customer push: booking cancelled. */
async function pushCustomerCancelled(b: Booking): Promise<void> {
  const subs = await subscriptionsForClient(b.email, b.phone);
  if (subs.length === 0) return;
  const url = await bookingUrl(b);
  await sendByLang(subs, (lang) => ({
    title: langPick(CANCELLED_TITLE, lang),
    body: bookingLine(b, lang),
    url,
    icon: tenantUrl(ICON),
    tag: `booking-${b.id}`,
  }));
}

/** Customer push: appointment reminder. Public — called by the reminder cron. */
export async function pushBookingReminder(b: Booking): Promise<void> {
  try {
    const subs = await subscriptionsForClient(b.email, b.phone);
    if (subs.length === 0) return;
    const url = await bookingUrl(b);
    await sendByLang(subs, (lang) => ({
      title: langPick(REMINDER_TITLE, lang),
      body: bookingLine(b, lang),
      url,
      icon: tenantUrl(ICON),
      tag: `booking-${b.id}`,
    }));
  } catch {
    /* best-effort */
  }
}

// --- owner pushes ----------------------------------------------------------

async function pushOwnerNewBooking(b: Booking): Promise<void> {
  const subs = await ownerSubscriptions();
  if (subs.length === 0) return;
  await sendByLang(subs, (lang) => ({
    title: langPick(NEW_BOOKING_TITLE, lang),
    body: `${b.name} — ${bookingLine(b, lang)}`.replace(" — ", ": "),
    url: tenantUrl("/admin/bookings"),
    icon: tenantUrl(ICON),
    tag: `owner-booking-${b.id}`,
    // Owner alerts must not auto-dismiss on desktop before the owner sees them.
    requireInteraction: true,
  }));
}

async function pushOwnerCancelled(b: Booking): Promise<void> {
  const subs = await ownerSubscriptions();
  if (subs.length === 0) return;
  await sendByLang(subs, (lang) => ({
    title: langPick(OWNER_CANCEL_TITLE, lang),
    body: `${b.name}: ${bookingLine(b, lang)}`,
    url: tenantUrl("/admin/bookings"),
    icon: tenantUrl(ICON),
    tag: `owner-booking-${b.id}`,
    requireInteraction: true,
  }));
}

/**
 * Group subscriptions by their stored language and send each group its own
 * localized payload, so a German customer gets German copy and the owner
 * gets the owner default. Owner subs rarely carry a lang, so they fall to
 * the owner default.
 */
async function sendByLang(
  subs: PushSubscriptionRecord[],
  build: (lang: Lang) => PushPayload
): Promise<void> {
  const groups = new Map<Lang, PushSubscriptionRecord[]>();
  for (const s of subs) {
    const lang =
      s.audience === "owner" ? clampLang(s.lang ?? OWNER_LANG) : clampLang(s.lang);
    const arr = groups.get(lang) ?? [];
    arr.push(s);
    groups.set(lang, arr);
  }
  await Promise.all(
    Array.from(groups.entries()).map(([lang, group]) =>
      sendPush(group, build(lang))
    )
  );
}

// --- public event helpers --------------------------------------------------

/**
 * A booking was just created. Push the customer a confirmation and every
 * owner device a "New booking" alert. Best-effort: never throws.
 */
export async function notifyBookingCreated(b: Booking): Promise<void> {
  try {
    await Promise.all([pushCustomerConfirmed(b), pushOwnerNewBooking(b)]);
  } catch {
    /* best-effort */
  }
}

/**
 * A booking was cancelled. Push the customer and every owner device.
 * Best-effort: never throws.
 */
export async function notifyBookingCancelled(b: Booking): Promise<void> {
  try {
    await Promise.all([pushCustomerCancelled(b), pushOwnerCancelled(b)]);
  } catch {
    /* best-effort */
  }
}

/**
 * Send a test push to one staff user's own owner subscriptions. Used by the
 * admin "Send test notification" button. Returns a delivery summary.
 */
export async function sendOwnerTestPush(
  subs: PushSubscriptionRecord[]
): Promise<{ sent: number; failed: number; pruned: number }> {
  const biz = await loadBusiness().catch(() => ({ name: "" }));
  const name = (biz as { name?: string }).name || "Atelier";
  const payload: PushPayload = {
    title: name,
    body: "Notifications are working on this device.",
    url: tenantUrl("/admin"),
    icon: tenantUrl(ICON),
    tag: "owner-test",
    requireInteraction: true,
  };
  return sendPush(subs, payload);
}
