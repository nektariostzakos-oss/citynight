"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import {
  BARBERS,
  HOURS,
  getSlotsForDay,
  SERVICES,
  getDailySlots,
} from "../../lib/services";
import { useLang } from "../../lib/i18n";
import { langPick } from "../../lib/langs";
import { useSection } from "../../lib/editorClient";
import { useBusiness } from "../../lib/businessClient";
import PushOptInBar from "./PushOptInBar";

type LiveService = {
  id: string;
  price: number;
  duration: number;
  name_en: string;
  name_el: string;
  desc_en: string;
  desc_el: string;
  tkey?: string;
  fromPrice?: boolean;
  requiresPatchTest?: boolean;
  addOnIds?: string[];
};

type Step = 1 | 2 | 3 | 4 | 5;

function todayStr() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

/** Map a 2-letter language code to a BCP-47 locale tag for Intl APIs. */
function toBCP47(lang: string): string {
  if (lang === "el") return "el-GR";
  if (lang === "de") return "de-DE";
  if (lang === "fr") return "fr-FR";
  if (lang === "es") return "es-ES";
  if (lang === "it") return "it-IT";
  if (lang === "pt") return "pt-PT";
  if (lang === "nl") return "nl-NL";
  if (lang === "ru") return "ru-RU";
  if (lang === "pl") return "pl-PL";
  if (lang === "tr") return "tr-TR";
  return "en-GB";
}

function dateRange(days: number, locale: string) {
  const out: { iso: string; day: string; date: string; weekday: string }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    out.push({
      iso,
      day: d.getDate().toString(),
      date: d.toLocaleDateString(locale, { month: "short" }),
      weekday: d.toLocaleDateString(locale, { weekday: "short" }),
    });
  }
  return out;
}

export default function BookingFlow() {
  const { t, lang } = useLang();
  const { business } = useBusiness();
  const shouldReduceMotion = useReducedMotion();
  const params = useSearchParams();
  const initialServiceId = params.get("service") ?? "";
  const initialBarberId = params.get("barber") ?? "";

  const [step, setStep] = useState<Step>(initialServiceId ? 2 : 1);
  const [serviceId, setServiceId] = useState(initialServiceId);
  const [barberId, setBarberId] = useState(initialBarberId || "any");
  const [date, setDate] = useState(todayStr());
  const [time, setTime] = useState("");
  const [taken, setTaken] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [addOnIds, setAddOnIds] = useState<string[]>([]);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);

  // Restore any in-progress draft once, on mount. Browser refresh / tab
  // switch shouldn't force the user to re-type everything.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("atelier_book_draft_v1");
      if (!raw) return;
      const d = JSON.parse(raw) as Partial<Record<string, string | string[] | number>>;
      if (typeof d.serviceId === "string" && !initialServiceId && d.serviceId) setServiceId(d.serviceId);
      if (typeof d.barberId === "string" && !initialBarberId && d.barberId) setBarberId(d.barberId);
      if (typeof d.date === "string" && d.date) setDate(d.date);
      if (typeof d.time === "string" && d.time) setTime(d.time);
      if (typeof d.name === "string") setName(d.name);
      if (typeof d.phone === "string") setPhone(d.phone);
      if (typeof d.email === "string") setEmail(d.email);
      if (typeof d.notes === "string") setNotes(d.notes);
      if (Array.isArray(d.addOnIds)) setAddOnIds(d.addOnIds as string[]);
    } catch { /* bad draft — ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist every change. Skip while we're on the final success screen.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        "atelier_book_draft_v1",
        JSON.stringify({ serviceId, barberId, date, time, name, phone, email, notes, addOnIds })
      );
    } catch {}
  }, [serviceId, barberId, date, time, name, phone, email, notes, addOnIds]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{
    ref: string;
    manageToken?: string;
    deposit?: number;
    depositPaid?: boolean;
  } | null>(null);
  const [honeypot, setHoneypot] = useState("");

  // Membership offer shown on the confirmation screen. Loaded once; only kept
  // when the shop has actually switched memberships on.
  const [membership, setMembership] = useState<{
    enabled: boolean;
    discountPercent: number;
    price1m: number;
    price6m: number;
    price12m: number;
  } | null>(null);
  const [payBusy, setPayBusy] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/membership")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && d.enabled) setMembership(d);
      })
      .catch(() => {});
  }, []);

  /** Send the customer to Stripe Checkout for this booking's deposit. */
  async function payDeposit() {
    if (!done) return;
    setPayBusy(true);
    setPayError(null);
    try {
      const res = await fetch(
        `/api/bookings/${encodeURIComponent(done.ref)}/pay`,
        { method: "POST" },
      );
      const d = await res.json();
      if (res.ok && d.checkoutUrl) {
        window.location.href = d.checkoutUrl;
        return;
      }
      setPayError(d.error || t("book.error.network"));
    } catch {
      setPayError(t("book.error.network"));
    }
    setPayBusy(false);
  }

  /** Send the customer to Stripe Checkout to buy a membership. */
  async function buyMembership(term: 1 | 6 | 12) {
    setPayBusy(true);
    setPayError(null);
    try {
      const res = await fetch("/api/membership/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, name, term }),
      });
      const d = await res.json();
      if (res.ok && d.checkoutUrl) {
        window.location.href = d.checkoutUrl;
        return;
      }
      setPayError(d.error || t("book.error.network"));
    } catch {
      setPayError(t("book.error.network"));
    }
    setPayBusy(false);
  }

  const live = useSection("services", {
    items: SERVICES.map((s) => ({
      id: s.id,
      price: s.price,
      duration: s.duration,
      name_en: t(`${s.tkey}.name`),
      name_el: t(`${s.tkey}.name`),
      desc_en: t(`${s.tkey}.desc`),
      desc_el: t(`${s.tkey}.desc`),
    })) as LiveService[],
  });
  // Prefer the admin-managed services.json (includes fromPrice /
  // requiresPatchTest / bufferMinutes); fall back to the editable
  // content section if the API isn't there.
  const [liveOverride, setLiveOverride] = useState<LiveService[] | null>(null);
  useEffect(() => {
    fetch("/api/services")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (!d?.services?.length) return;
        setLiveOverride(d.services.map((s: { id: string; name: string; desc: string; price: number; duration: number; fromPrice?: boolean; requiresPatchTest?: boolean; addOnIds?: string[] }) => ({
          id: s.id,
          name_en: s.name,
          name_el: s.name,
          desc_en: s.desc,
          desc_el: s.desc,
          price: s.price,
          duration: s.duration,
          fromPrice: s.fromPrice,
          requiresPatchTest: s.requiresPatchTest,
          addOnIds: s.addOnIds,
        })));
      })
      .catch(() => {});
  }, []);
  const services: LiveService[] = liveOverride ?? ((live.items as LiveService[]) ?? []);
  const pickName = (s: LiveService) =>
    lang === "el" ? s.name_el || s.name_en : s.name_en;
  const pickDesc = (s: LiveService) =>
    lang === "el" ? s.desc_el || s.desc_en : s.desc_en;
  const service: LiveService | undefined = useMemo(
    () => services.find((s) => s.id === serviceId),
    [services, serviceId]
  );
  const barber = BARBERS.find((b) => b.id === barberId);
  // Slots for the currently-selected date, based on that weekday's business
  // hours (handles days with a midday break via open2/close2).
  const slots = useMemo(() => {
    if (!date) return [];
    // Parse the ISO date as a local date (YYYY-MM-DD has no timezone → treated
    // as local midnight, which for weekday purposes is stable).
    const [y, m, d] = date.split("-").map(Number);
    const localDate = new Date(y, (m || 1) - 1, d || 1);
    const perDay = getSlotsForDay(localDate.getDay(), business.hours);
    // Fall back to the fixed daily grid if the business has no hours configured.
    return perDay.length > 0 ? perDay : getDailySlots();
  }, [date, business.hours]);
  const days = useMemo(
    () => dateRange(14, toBCP47(lang)),
    [lang]
  );

  useEffect(() => {
    if (!date || !barberId) return;
    const ctrl = new AbortController();
    fetch(
      `/api/bookings?date=${encodeURIComponent(date)}&barber=${encodeURIComponent(barberId)}`,
      { signal: ctrl.signal }
    )
      .then((r) => r.json())
      .then((d) => setTaken(d.taken ?? []))
      .catch(() => {});
    return () => ctrl.abort();
  }, [date, barberId]);

  const dayClosed = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    const localDate = new Date(y, (m || 1) - 1, d || 1);
    const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
    const key = DAY_KEYS[localDate.getDay()];
    const h = business.hours?.find((x) => x.day === key);
    // Prefer the real per-day setting; fall back to legacy HOURS.closedDays.
    if (h) return h.closed;
    return HOURS.closedDays.includes(localDate.getDay());
  };

  // If the current date lands on a closed day (e.g. booking page opened on a Sunday),
  // auto-jump to the next open date.
  useEffect(() => {
    if (dayClosed(date)) {
      const next = days.find((d) => !dayClosed(d.iso));
      if (next) setDate(next.iso);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, days]);

  async function submit() {
    if (!service || !barber) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: (() => {
          // Fold chosen add-ons into the booking: bump price + duration, add a
          // "+ Add-on name" line to the stored service name so admin + emails
          // see everything the client signed up for in one place.
          const addOns = (service.addOnIds ?? [])
            .filter((id) => addOnIds.includes(id))
            .map((id) => services.find((s) => s.id === id))
            .filter((s): s is LiveService => !!s);
          const totalPrice = service.price + addOns.reduce((n, a) => n + a.price, 0);
          const totalDuration = service.duration + addOns.reduce((n, a) => n + a.duration, 0);
          const nameWithAddOns = addOns.length
            ? `${pickName(service)} + ${addOns.map((a) => pickName(a)).join(" + ")}`
            : pickName(service);

          return JSON.stringify({
            serviceId: service.id,
            serviceName: nameWithAddOns,
            price: totalPrice,
            duration: totalDuration,
            barberId: barber.id,
            barberName:
              lang === "el" && barber.id === "any"
                ? "Όποιος είναι ελεύθερος"
                : barber.name,
            date,
            time,
            name,
            phone,
            email,
            notes,
            lang,
            website: honeypot,
            couponCode: couponCode.trim() || undefined,
          });
        })(),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || t("book.error.network"));
      if (d.appliedCoupon) setAppliedCoupon(d.appliedCoupon);
      setDone({
        ref: d.booking.id,
        manageToken: d.manageToken,
        deposit: d.booking.deposit,
        depositPaid: d.booking.depositPaid,
      });
      try { window.localStorage.removeItem("atelier_book_draft_v1"); } catch {}
    } catch (e) {
      setError(e instanceof Error ? e.message : t("book.error.network"));
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    const successLine = t("book.success.line")
      .replace("{date}", date)
      .replace("{time}", time)
      .replace("{barber}", barber?.name ?? "");
    return (
      <section className="px-6 pb-32">
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={shouldReduceMotion ? { duration: 0 } : undefined}
          className="mx-auto max-w-2xl rounded-2xl border border-[var(--gold)]/40 bg-[var(--gold)]/5 p-12 text-center"
        >
          <motion.div
            initial={shouldReduceMotion ? false : { scale: 0 }}
            animate={{ scale: 1 }}
            transition={shouldReduceMotion ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 14 }}
            className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--gold)] text-2xl text-black"
          >
            ✓
          </motion.div>
          <h2 className="font-serif text-4xl font-semibold tracking-tight">
            {t("book.success.title")}
          </h2>
          <p className="mt-3 text-white/65">{successLine}</p>
          <p className="mt-2 text-xs uppercase tracking-widest text-white/60">
            {t("book.success.ref")} · {done.ref}
          </p>
          <p className="mx-auto mt-4 max-w-md text-sm text-white/60">
            {t("book.success.email_sent")}
          </p>

          {appliedCoupon && (
            <p className="mt-2 text-xs uppercase tracking-widest" style={{ color: "var(--gold)" }}>
              {langPick({ en: "Discount applied", el: "Εφαρμόστηκε έκπτωση", de: "Rabatt angewendet", fr: "Réduction appliquée", it: "Sconto applicato", es: "Descuento aplicado", nl: "Korting toegepast", pl: "Zniżka naliczona", pt: "Desconto aplicado", sv: "Rabatt tillämpad", sq: "Zbritja u aplikua" }, lang)} · {appliedCoupon.code} · −${appliedCoupon.discount.toFixed(2)}
            </p>
          )}

          <p className="mx-auto mt-2 max-w-md text-xs text-white/60">
            {lang === "el"
              ? `Ακύρωση δωρεάν έως ${business.bookingRules?.cancellationWindowHours ?? 4} ώρες πριν.`
              : `Free cancellation up to ${business.bookingRules?.cancellationWindowHours ?? 4}h before.`}
          </p>

          {/* Optional deposit — the booking is already confirmed; paying just
              secures the slot. Skippable: the customer can pay in person. */}
          {!done.depositPaid && (done.deposit ?? 0) > 0 && (
            <div className="mx-auto mt-6 max-w-md rounded-xl border border-white/15 bg-white/[0.04] p-4">
              <p className="text-sm font-medium">
                {langPick(
                  {
                    en: `Pay your $${done.deposit} deposit`,
                    el: `Πληρώστε την προκαταβολή $${done.deposit}`,
                    de: `Ihre Anzahlung von $${done.deposit} zahlen`,
                  },
                  lang,
                )}
              </p>
              <p className="mt-1 text-xs text-white/55">
                {langPick(
                  {
                    en: "Optional. Secure your slot now, or settle it in person.",
                    el: "Προαιρετικό. Κλείστε τη θέση σας τώρα ή πληρώστε στο κατάστημα.",
                    de: "Optional. Sichern Sie Ihren Termin oder zahlen Sie vor Ort.",
                  },
                  lang,
                )}
              </p>
              <button
                onClick={payDeposit}
                disabled={payBusy}
                className="mt-3 rounded-full bg-[var(--gold)] px-5 py-2 text-xs font-semibold uppercase tracking-widest text-black disabled:opacity-60"
              >
                {payBusy
                  ? "…"
                  : langPick(
                      { en: "Pay deposit", el: "Πληρωμή προκαταβολής", de: "Anzahlung zahlen" },
                      lang,
                    )}
              </button>
            </div>
          )}
          {done.depositPaid && (
            <p className="mt-4 text-xs uppercase tracking-widest text-emerald-400">
              {langPick(
                { en: "Deposit paid", el: "Η προκαταβολή πληρώθηκε", de: "Anzahlung bezahlt" },
                lang,
              )}
            </p>
          )}

          {/* Membership offer. A member's standing discount is applied to
              every future booking automatically (server-side, by email). */}
          {membership && membership.discountPercent > 0 && (
            <div className="mx-auto mt-6 max-w-md rounded-xl border border-[var(--gold)]/30 bg-[var(--gold)]/5 p-4">
              <p className="text-sm font-medium">
                {langPick(
                  {
                    en: `Save ${membership.discountPercent}% on every visit`,
                    el: `Εξοικονομήστε ${membership.discountPercent}% σε κάθε επίσκεψη`,
                    de: `Sparen Sie ${membership.discountPercent}% bei jedem Besuch`,
                  },
                  lang,
                )}
              </p>
              <p className="mt-1 text-xs text-white/55">
                {langPick(
                  {
                    en: "Become a member — pick a term:",
                    el: "Γίνετε μέλος — επιλέξτε διάρκεια:",
                    de: "Werden Sie Mitglied — Laufzeit wählen:",
                  },
                  lang,
                )}
              </p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {(
                  [
                    [1, membership.price1m],
                    [6, membership.price6m],
                    [12, membership.price12m],
                  ] as const
                )
                  .filter(([, price]) => price > 0)
                  .map(([term, price]) => (
                    <button
                      key={term}
                      onClick={() => buyMembership(term)}
                      disabled={payBusy}
                      className="rounded-full border border-[var(--gold)]/40 px-4 py-2 text-xs font-semibold uppercase tracking-widest hover:bg-[var(--gold)]/10 disabled:opacity-60"
                    >
                      {term}{" "}
                      {langPick({ en: "mo", el: "μήνες", de: "Mon." }, lang)} · $
                      {price}
                    </button>
                  ))}
              </div>
            </div>
          )}
          {payError && (
            <p className="mt-3 text-xs text-red-300">{payError}</p>
          )}

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {(() => {
              const startDt = new Date(`${date}T${time}:00`);
              const endDt = new Date(startDt.getTime() + (service?.duration ?? 30) * 60_000);
              const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
              const brand = business.name || "Your Salon";
              const title = `${pickName(service!)} · ${brand}`;
              const details = [
                `${t("book.sum.service")}: ${pickName(service!)}`,
                barber?.name ? `${t("book.sum.barber")}: ${barber.name}` : "",
                `${t("book.success.ref")}: ${done.ref}`,
              ].filter(Boolean).join("\n");
              const gcal = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${fmt(startDt)}/${fmt(endDt)}&details=${encodeURIComponent(details)}`;
              const icsLines = [
                "BEGIN:VCALENDAR",
                "VERSION:2.0",
                "PRODID:-//Your Salon//Booking//EN",
                "BEGIN:VEVENT",
                `UID:${done.ref}@yoursalon.local`,
                `DTSTAMP:${fmt(new Date())}`,
                `DTSTART:${fmt(startDt)}`,
                `DTEND:${fmt(endDt)}`,
                `SUMMARY:${title}`,
                `DESCRIPTION:${details.replace(/\n/g, "\\n")}`,
                "END:VEVENT",
                "END:VCALENDAR",
              ].join("\r\n");
              const ics = `data:text/calendar;charset=utf-8,${encodeURIComponent(icsLines)}`;
              return (
                <>
                  <a
                    href={gcal}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-white hover:border-white/40"
                  >
                    {langPick({ en: "Google Calendar", el: "Google Ημερολόγιο", de: "Google Kalender", fr: "Google Agenda", it: "Google Calendar", es: "Google Calendar", nl: "Google Agenda", pl: "Kalendarz Google", pt: "Google Agenda", sv: "Google Kalender", sq: "Google Calendar" }, lang)}
                  </a>
                  <a
                    href={ics}
                    download={`atelier-${done.ref}.ics`}
                    className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-white hover:border-white/40"
                  >
                    {langPick({ en: "Apple / Outlook (.ics)", el: "Apple / Outlook (.ics)", de: "Apple / Outlook (.ics)", it: "Apple / Outlook (.ics)" }, lang)}
                  </a>
                </>
              );
            })()}
          </div>

          {done.manageToken && (
            <div className="mt-6">
              <a
                href={`/b/${encodeURIComponent(done.ref)}?t=${done.manageToken}`}
                className="text-xs uppercase tracking-widest text-white/60 hover:text-white"
              >
                {langPick({ en: "Manage booking →", el: "Διαχείριση ραντεβού →", de: "Buchung verwalten →", fr: "Gérer la réservation →", it: "Gestisci prenotazione →", es: "Gestionar la reserva →", nl: "Boeking beheren →", pl: "Zarządzaj rezerwacją →", pt: "Gerir a reserva →", sv: "Hantera bokning →", sq: "Menaxho rezervimin →" }, lang)}
              </a>
            </div>
          )}

          <a
            href="/"
            className="mt-10 inline-block rounded-full bg-white px-6 py-3 text-sm font-medium text-black"
          >
            {t("book.success.back")}
          </a>
        </motion.div>
        {/* Offer push opt-in once the booking is confirmed. */}
        <PushOptInBar email={email} phone={phone} />
      </section>
    );
  }

  const membershipNotice = params.get("membership");

  return (
    <section className="px-6 pb-32">
      <div className="mx-auto max-w-4xl">
        {membershipNotice === "ok" && (
          <p className="mb-4 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-center text-sm text-emerald-300">
            {langPick(
              {
                en: "Membership active. Your discount now applies to every booking.",
                el: "Η συνδρομή ενεργοποιήθηκε. Η έκπτωσή σας ισχύει πλέον σε κάθε ραντεβού.",
                de: "Mitgliedschaft aktiv. Ihr Rabatt gilt jetzt für jede Buchung.",
              },
              lang,
            )}
          </p>
        )}
        {(membershipNotice === "cancelled" || membershipNotice === "failed") && (
          <p className="mb-4 rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-center text-sm text-white/70">
            {langPick(
              {
                en: "Membership payment was not completed.",
                el: "Η πληρωμή της συνδρομής δεν ολοκληρώθηκε.",
                de: "Die Mitgliedszahlung wurde nicht abgeschlossen.",
              },
              lang,
            )}
          </p>
        )}
        <Stepper step={step} />

        <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-10 backdrop-blur">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="1"
                initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={shouldReduceMotion ? {} : { opacity: 0, y: -12 }}
                transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.3 }}
              >
                <h2 className="mb-6 font-serif text-2xl">{t("book.step.service")}</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {services.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setServiceId(s.id);
                        setStep(2);
                      }}
                      className={`group rounded-xl border p-5 text-left transition-colors ${
                        serviceId === s.id
                          ? "border-[var(--gold)] bg-[var(--gold)]/10"
                          : "border-white/10 bg-white/[0.02] hover:border-white/30"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <p className="font-serif text-lg">{pickName(s)}</p>
                        <p className="font-serif text-lg text-[var(--gold)]">
                          {s.fromPrice ? langPick({ en: "from $", el: "από $", de: "ab $", fr: "à partir de $", it: "da $", es: "desde $", nl: "vanaf $", pl: "od $", pt: "a partir de $", sv: "från $", sq: "nga $" }, lang) : "$"}{s.price}
                        </p>
                      </div>
                      <p className="mt-1 text-xs uppercase tracking-widest text-white/60">
                        {s.duration} {t("minutes")}
                        {s.requiresPatchTest && (
                          <span className="ml-2 rounded-full bg-amber-500/20 px-2 py-0.5 text-[9px] text-amber-200">
                            {langPick({ en: "Patch test", el: "Patch test", de: "Patch-Test", fr: "Test cutané", it: "Test cutaneo", es: "Prueba cutánea", nl: "Huidtest", pl: "Próba uczuleniowa", pt: "Teste cutâneo", sv: "Hudtest", sq: "Test lëkure" }, lang)}
                          </span>
                        )}
                      </p>
                      <p className="mt-2 text-sm text-white/55">{pickDesc(s)}</p>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="2"
                initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={shouldReduceMotion ? {} : { opacity: 0, y: -12 }}
                transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.3 }}
              >
                <h2 className="mb-6 font-serif text-2xl">{t("book.step.barber")}</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {BARBERS.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => {
                        setBarberId(b.id);
                        setStep(3);
                      }}
                      className={`rounded-xl border p-5 text-left transition-colors ${
                        barberId === b.id
                          ? "border-[var(--gold)] bg-[var(--gold)]/10"
                          : "border-white/10 bg-white/[0.02] hover:border-white/30"
                      }`}
                    >
                      <p className="font-serif text-lg">
                        {lang === "el" && b.id === "any"
                          ? "Όποιος είναι ελεύθερος"
                          : b.name}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-widest text-white/60">
                        {b.role}
                      </p>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="3"
                initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={shouldReduceMotion ? {} : { opacity: 0, y: -12 }}
                transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.3 }}
              >
                <h2 className="mb-6 font-serif text-2xl">{t("book.step.time")}</h2>
                {(() => {
                  const openDays = days.filter((d) => !dayClosed(d.iso));
                  return (
                    <div className="-mx-1 flex gap-2 overflow-x-auto pb-2">
                      {openDays.map((d) => {
                        const active = date === d.iso;
                        return (
                          <button
                            key={d.iso}
                            onClick={() => {
                              setDate(d.iso);
                              setTime("");
                            }}
                            className={`min-w-[5.5rem] rounded-xl border px-4 py-3 text-center transition-colors ${
                              active
                                ? "border-[var(--gold)] bg-[var(--gold)]/10"
                                : "border-white/10 bg-white/[0.02] hover:border-white/30"
                            }`}
                          >
                            <p className="text-[10px] uppercase tracking-widest text-white/50">
                              {d.weekday}
                            </p>
                            <p className="mt-1 font-serif text-2xl">{d.day}</p>
                            <p className="text-[10px] uppercase tracking-widest text-white/60">
                              {d.date}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}

                {(() => {
                  const today = todayStr();
                  const now = new Date();
                  const isToday = date === today;
                  const freeSlots = slots.filter((s) => {
                    if (taken.includes(s)) return false;
                    if (isToday) {
                      // Only show slots at least 30 min from now.
                      const [h, m] = s.split(":").map(Number);
                      const slotTs = new Date(
                        now.getFullYear(),
                        now.getMonth(),
                        now.getDate(),
                        h,
                        m
                      ).getTime();
                      if (slotTs - now.getTime() < 30 * 60_000) return false;
                    }
                    return true;
                  });
                  if (freeSlots.length === 0) {
                    return (
                      <p className="mt-8 rounded-xl border border-white/10 bg-white/[0.02] p-6 text-center text-sm text-white/60">
                        {langPick({
                          en: "No available times for this day. Try a different date.",
                          el: "Δεν υπάρχουν διαθέσιμες ώρες για αυτή τη μέρα. Δοκίμασε άλλη ημερομηνία.",
                          de: "Für diesen Tag sind keine Termine verfügbar. Probiere ein anderes Datum.",
                          fr: "Aucun horaire libre ce jour. Essayez une autre date.",
                          it: "Nessun orario disponibile per questo giorno. Prova un'altra data.",
                          es: "No hay horas libres para este día. Prueba otra fecha.",
                          nl: "Geen vrije tijden op deze dag. Probeer een andere datum.",
                          pl: "Brak wolnych godzin tego dnia. Wybierz inną datę.",
                          pt: "Não há horários livres neste dia. Experimente outra data.",
                          sv: "Inga lediga tider denna dag. Prova ett annat datum.",
                          sq: "Nuk ka orare të lira për këtë ditë. Provo një datë tjetër.",
                        }, lang)}
                      </p>
                    );
                  }
                  // Group slots into sessions separated by any gap > 30 min.
                  // This makes the midday break on split-session days visible.
                  const sessions: string[][] = [];
                  let current: string[] = [];
                  let lastMin = -Infinity;
                  for (const s of freeSlots) {
                    const [h, m] = s.split(":").map(Number);
                    const min = h * 60 + m;
                    if (current.length && min - lastMin > 30) {
                      sessions.push(current);
                      current = [];
                    }
                    current.push(s);
                    lastMin = min;
                  }
                  if (current.length) sessions.push(current);

                  const sessionLabel = (range: string[]): string => {
                    if (sessions.length < 2) return "";
                    const first = range[0];
                    const hour = parseInt(first.split(":")[0], 10);
                    if (hour < 12)
                      return langPick({ en: "Morning", el: "Πρωί", de: "Morgen", fr: "Matin", it: "Mattina", es: "Mañana", nl: "Ochtend", pl: "Rano", pt: "Manhã", sv: "Förmiddag", sq: "Mëngjes" }, lang);
                    if (hour < 17)
                      return langPick({ en: "Midday", el: "Μεσημέρι", de: "Mittag", fr: "Midi", it: "Mezzogiorno", es: "Mediodía", nl: "Middag", pl: "Południe", pt: "Meio-dia", sv: "Mitt på dagen", sq: "Mesditë" }, lang);
                    return langPick({ en: "Afternoon", el: "Απόγευμα", de: "Nachmittag", fr: "Après-midi", it: "Pomeriggio", es: "Tarde", nl: "Namiddag", pl: "Popołudnie", pt: "Tarde", sv: "Eftermiddag", sq: "Pasdite" }, lang);
                  };

                  return (
                    <div className="mt-8 space-y-6">
                      {sessions.map((range, si) => (
                        <div key={si}>
                          {sessions.length > 1 && (
                            <p className="mb-3 text-[10px] uppercase tracking-[0.3em] text-white/60">
                              {sessionLabel(range)} · {range[0]}–{range[range.length - 1]}
                            </p>
                          )}
                          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
                            {range.map((slot) => {
                              const active = time === slot;
                              return (
                                <button
                                  key={slot}
                                  onClick={() => {
                                    setTime(slot);
                                    setStep(4);
                                  }}
                                  className={`rounded-lg border py-2.5 text-sm transition-colors ${
                                    active
                                      ? "border-[var(--gold)] bg-[var(--gold)] text-black"
                                      : "border-white/10 bg-white/[0.02] text-white/85 hover:border-white/40"
                                  }`}
                                >
                                  {slot}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="4"
                initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={shouldReduceMotion ? {} : { opacity: 0, y: -12 }}
                transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.3 }}
              >
                <h2 className="mb-6 font-serif text-2xl">{t("book.step.details")}</h2>

                {service && service.addOnIds && service.addOnIds.length > 0 && (
                  <div className="mb-6 rounded-xl border border-white/10 bg-white/[0.02] p-4">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--gold)]">
                      {langPick({ en: "Add to your visit", el: "Πρόσθεσε", de: "Zu deinem Besuch hinzufügen", fr: "Ajoutez à votre visite", it: "Aggiungi alla tua visita", es: "Añade a tu visita", nl: "Voeg toe aan je bezoek", pl: "Dodaj do swojej wizyty", pt: "Adicione à sua visita", sv: "Lägg till i ditt besök", sq: "Shto te vizita jote" }, lang)}
                    </p>
                    <div className="mt-3 space-y-2">
                      {service.addOnIds.map((addOnId) => {
                        const addOn = services.find((s) => s.id === addOnId);
                        if (!addOn) return null;
                        const checked = addOnIds.includes(addOnId);
                        return (
                          <label key={addOnId} className={`flex cursor-pointer items-center justify-between rounded-lg border px-4 py-3 transition-colors ${checked ? "border-[var(--gold)] bg-[var(--gold)]/10" : "border-white/10 bg-white/[0.02] hover:border-white/25"}`}>
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  setAddOnIds((prev) =>
                                    e.target.checked ? [...prev, addOnId] : prev.filter((x) => x !== addOnId)
                                  );
                                }}
                                style={{ accentColor: "var(--gold)" }}
                              />
                              <div>
                                <div className="text-sm text-white">{pickName(addOn)}</div>
                                <div className="text-xs text-white/50">{pickDesc(addOn)}</div>
                              </div>
                            </div>
                            <div className="text-sm text-[var(--gold)]">+${addOn.price}</div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    id="booking-name"
                    label={t("book.fld.name")}
                    value={name}
                    onChange={setName}
                    placeholder=""
                    type="text"
                    autoComplete="name"
                    required
                  />
                  <Field
                    id="booking-phone"
                    label={t("book.fld.phone")}
                    value={phone}
                    onChange={setPhone}
                    placeholder="+30 6900 000 000"
                    type="tel"
                    autoComplete="tel"
                    inputMode="tel"
                    required
                  />
                  <Field
                    id="booking-email"
                    label={t("book.fld.email")}
                    value={email}
                    onChange={setEmail}
                    placeholder="you@example.com"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                  />
                </div>
                <div className="mt-4">
                  <label htmlFor="booking-notes" className="mb-2 block text-xs uppercase tracking-widest text-white/60">
                    {t("book.fld.notes")}
                  </label>
                  <textarea
                    id="booking-notes"
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t("book.notes.ph")}
                    maxLength={1000}
                    className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none transition-colors focus:border-[var(--gold)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)]"
                  />
                </div>

                {/* Honeypot — bots fill it, humans never see it. */}
                <div
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    width: 1,
                    height: 1,
                    padding: 0,
                    margin: -1,
                    overflow: "hidden",
                    clipPath: "inset(50%)",
                    whiteSpace: "nowrap",
                    border: 0,
                  }}
                >
                  <label>
                    Website
                    <input
                      type="text"
                      tabIndex={-1}
                      autoComplete="off"
                      value={honeypot}
                      onChange={(e) => setHoneypot(e.target.value)}
                    />
                  </label>
                </div>

                <button
                  onClick={() => setStep(5)}
                  disabled={!name || !phone}
                  className="mt-8 inline-flex items-center gap-2 rounded-full bg-[var(--gold)] px-7 py-3 text-sm font-semibold uppercase tracking-widest text-black disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {t("book.btn.review")}
                </button>
              </motion.div>
            )}

            {step === 5 && service && barber && (
              <motion.div
                key="5"
                initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={shouldReduceMotion ? {} : { opacity: 0, y: -12 }}
                transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.3 }}
              >
                <h2 className="mb-6 font-serif text-2xl">{t("book.step.confirm")}</h2>
                {service.requiresPatchTest && (
                  <div className="mb-5 rounded-lg border px-4 py-3 text-sm"
                    style={{ borderColor: "color-mix(in srgb, #f59e0b 40%, transparent)", background: "color-mix(in srgb, #f59e0b 10%, transparent)", color: "#fcd34d" }}>
                    {langPick({
                      en: "First-time colour clients need a free 48h patch test. We'll be in touch to arrange it before this appointment.",
                      el: "Για πρώτη βαφή χρειάζεται patch test 48 ώρες πριν. Θα επικοινωνήσουμε μαζί σου για να το κανονίσουμε δωρεάν.",
                      de: "Bei der ersten Farbbehandlung ist ein kostenloser Patch-Test 48 Stunden vorher nötig. Wir melden uns bei dir, um ihn vor diesem Termin zu vereinbaren.",
                      fr: "Pour une première coloration, un test cutané gratuit est requis 48h avant. Nous vous contacterons pour l'organiser avant ce rendez-vous.",
                      it: "Per la prima colorazione serve un patch test gratuito 48 ore prima. Ti contatteremo per organizzarlo prima di questo appuntamento.",
                      es: "Para una primera coloración hace falta una prueba cutánea gratuita 48h antes. Te contactaremos para organizarla antes de esta cita.",
                      nl: "Bij een eerste kleuring is een gratis huidtest 48 uur vooraf nodig. We nemen contact op om die voor deze afspraak in te plannen.",
                      pl: "Przy pierwszej koloryzacji potrzebna jest bezpłatna próba uczuleniowa 48h wcześniej. Skontaktujemy się, by umówić ją przed tą wizytą.",
                      pt: "Numa primeira coloração é preciso um teste cutâneo gratuito 48h antes. Entraremos em contacto para o agendar antes desta marcação.",
                      sv: "Vid en första färgning krävs ett gratis hudtest 48 timmar innan. Vi hör av oss för att boka in det före denna tid.",
                      sq: "Për ngjyrosjen e parë duhet një test lëkure falas 48 orë para. Do të kontaktojmë për ta organizuar para kësaj takimi.",
                    }, lang)}
                  </div>
                )}
                <dl className="divide-y divide-white/10 border-y border-white/10">
                  <Row label={t("book.sum.service")} value={`${service.fromPrice ? (lang === "el" ? "από $" : "from $") : "$"}${service.price} · ${pickName(service)}`} />
                  <Row label={t("book.sum.duration")} value={`${service.duration} ${t("minutes")}`} />
                  <Row label={t("book.sum.barber")} value={barber.name} />
                  <Row label={t("book.sum.date")} value={date} />
                  <Row label={t("book.sum.time")} value={time} />
                  <Row label={t("book.fld.name")} value={name} />
                  <Row label={t("book.fld.phone")} value={phone} />
                  {email && <Row label={t("book.fld.email")} value={email} />}
                  {notes && <Row label={t("book.sum.notes")} value={notes} />}
                </dl>

                {/* Coupon / promo code */}
                <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-4">
                  <label className="mb-2 block text-[10px] uppercase tracking-[0.3em] text-[var(--gold)]">
                    {langPick({ en: "Promo code", el: "Κωδικός έκπτωσης", de: "Aktionscode", fr: "Code promo", it: "Codice promozionale", es: "Código promocional", nl: "Promocode", pl: "Kod promocyjny", pt: "Código promocional", sv: "Kampanjkod", sq: "Kodi promocional" }, lang)}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <input
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="CODE"
                      className="flex-1 min-w-[140px] rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm font-mono uppercase text-white placeholder-white/30 outline-none focus:border-[var(--gold)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)]"
                    />
                  </div>
                  {appliedCoupon && (
                    <p className="mt-2 text-xs text-emerald-300">
                      ✓ {appliedCoupon.code} · −${appliedCoupon.discount.toFixed(2)}
                    </p>
                  )}
                  <p className="mt-2 text-[10px] text-white/60">
                    {lang === "el"
                      ? `Ακύρωση δωρεάν έως ${business.bookingRules?.cancellationWindowHours ?? 4}ω πριν το ραντεβού.`
                      : `Free cancellation up to ${business.bookingRules?.cancellationWindowHours ?? 4}h before the appointment.`}
                    {(business.bookingRules?.noShowFeePercent ?? 0) > 0 &&
                      (lang === "el"
                        ? ` Μετά, χρέωση ${business.bookingRules!.noShowFeePercent}%.`
                        : ` After that, ${business.bookingRules!.noShowFeePercent}% fee applies.`)}
                  </p>
                </div>

                {error && (
                  <p role="alert" className="mt-6 rounded-lg border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-300">
                    {error}
                  </p>
                )}

                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <button
                    onClick={submit}
                    disabled={submitting}
                    className="inline-flex items-center gap-2 rounded-full bg-[var(--gold)] px-7 py-3 text-sm font-semibold uppercase tracking-widest text-black disabled:opacity-50"
                  >
                    {submitting ? t("book.btn.confirming") : t("book.btn.confirm")}
                  </button>
                  <button
                    onClick={() => setStep(4)}
                    className="rounded-full border border-white/20 px-5 py-3 text-sm uppercase tracking-widest text-white/80"
                  >
                    {t("book.btn.back")}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-6 flex justify-between text-sm text-white/50">
          <button
            onClick={() => setStep((s) => Math.max(1, (s - 1) as Step) as Step)}
            disabled={step === 1}
            className="disabled:opacity-30"
          >
            ← {t("book.btn.back")}
          </button>
          <p>
            {t("book.steps.label")} {step} / 5
            {service ? ` · ${pickName(service)}` : ""}
          </p>
        </div>
      </div>
    </section>
  );
}

function Stepper({ step }: { step: Step }) {
  const { t } = useLang();
  const labels = [
    t("book.step.service"),
    t("book.step.barber"),
    t("book.step.time"),
    t("book.step.details"),
    t("book.step.confirm"),
  ];
  return (
    <div className="flex items-center justify-between gap-2">
      {labels.map((l, i) => {
        const n = (i + 1) as Step;
        const active = n === step;
        const done = n < step;
        return (
          <div
            key={l}
            className="flex flex-1 items-center gap-3 first:flex-none last:flex-none"
          >
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold ${
                active
                  ? "border-[var(--gold)] bg-[var(--gold)] text-black"
                  : done
                    ? "border-[var(--gold)] bg-transparent text-[var(--gold)]"
                    : "border-white/15 bg-transparent text-white/60"
              }`}
            >
              {done ? "✓" : n}
            </div>
            <p
              className={`hidden text-xs uppercase tracking-widest sm:block ${
                active ? "text-white" : "text-white/60"
              }`}
            >
              {l}
            </p>
            {i < labels.length - 1 && (
              <div
                className={`hidden flex-1 h-px sm:block ${
                  done ? "bg-[var(--gold)]" : "bg-white/10"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  autoComplete,
  inputMode,
  required,
  maxLength = 200,
}: {
  id?: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: "text" | "email" | "tel";
  autoComplete?: string;
  inputMode?: "text" | "email" | "tel" | "numeric";
  required?: boolean;
  maxLength?: number;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-xs uppercase tracking-widest text-white/60">
        {label}{required ? " *" : ""}
      </label>
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        inputMode={inputMode}
        required={required}
        aria-required={required || undefined}
        maxLength={maxLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none transition-colors focus:border-[var(--gold)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)]"
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[90px_1fr] gap-3 py-3 sm:grid-cols-[120px_1fr] sm:gap-4">
      <dt className="text-xs uppercase tracking-widest text-white/60">
        {label}
      </dt>
      <dd className="text-white">{value}</dd>
    </div>
  );
}
