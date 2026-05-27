"use client";

/**
 * Visitor opt-in for booking push notifications.
 *
 * A discreet bottom bar with one Accept button and a dismiss (x). Shown after
 * a booking is made and on the booking confirmation page, so the visitor can
 * choose to get their confirmation / reminder / cancellation as a phone push
 * instead of (alongside) the email.
 *
 * iOS Safari only delivers Web Push to an INSTALLED PWA — Apple's rule, not
 * something to bypass. When we detect iOS not in standalone mode we swap the
 * permission prompt for a short "Add to Home Screen" guide.
 *
 * The visitor's email / phone (from the booking just made) are passed in so
 * the subscription is matched to their bookings. Dismissal is remembered in
 * localStorage so the bar does not nag.
 */

import { useEffect, useState } from "react";
import { clientPath } from "../../lib/basePath";
import { useLang } from "../../lib/i18n";
import { type Lang } from "../../lib/langs";

const DISMISS_KEY = "atelier_push_optin_dismissed_v1";

type Copy = Record<Lang, string>;

const C = {
  title: {
    en: "Get appointment updates on this phone",
    el: "Λάβε ενημερώσεις ραντεβού σε αυτό το κινητό",
    de: "Termin-Updates auf diesem Handy erhalten",
    fr: "Recevez les mises à jour de rendez-vous sur ce téléphone",
    it: "Ricevi gli aggiornamenti degli appuntamenti su questo telefono",
    es: "Recibe avisos de tu cita en este teléfono",
    nl: "Ontvang afspraakupdates op deze telefoon",
    pl: "Otrzymuj powiadomienia o wizycie na tym telefonie",
    pt: "Recebe atualizações da marcação neste telemóvel",
    sv: "Få uppdateringar om din tid på den här telefonen",
    sq: "Merr njoftime për takimin në këtë telefon",
  } as Copy,
  sub: {
    en: "Confirmation, reminder and any changes, straight to your phone.",
    el: "Επιβεβαίωση, υπενθύμιση και αλλαγές, κατευθείαν στο κινητό σου.",
    de: "Bestätigung, Erinnerung und Änderungen, direkt auf dein Handy.",
    fr: "Confirmation, rappel et tout changement, directement sur votre téléphone.",
    it: "Conferma, promemoria e ogni modifica, direttamente sul telefono.",
    es: "Confirmación, recordatorio y cualquier cambio, directo a tu teléfono.",
    nl: "Bevestiging, herinnering en wijzigingen, direct op je telefoon.",
    pl: "Potwierdzenie, przypomnienie i zmiany, prosto na telefon.",
    pt: "Confirmação, lembrete e alterações, direto no teu telemóvel.",
    sv: "Bekräftelse, påminnelse och ändringar, direkt till din telefon.",
    sq: "Konfirmim, kujtesë dhe çdo ndryshim, drejt e në telefonin tënd.",
  } as Copy,
  accept: {
    en: "Accept",
    el: "Αποδοχή",
    de: "Annehmen",
    fr: "Accepter",
    it: "Accetta",
    es: "Aceptar",
    nl: "Accepteren",
    pl: "Akceptuj",
    pt: "Aceitar",
    sv: "Acceptera",
    sq: "Prano",
  } as Copy,
  dismiss: {
    en: "Dismiss",
    el: "Κλείσιμο",
    de: "Schließen",
    fr: "Fermer",
    it: "Chiudi",
    es: "Cerrar",
    nl: "Sluiten",
    pl: "Zamknij",
    pt: "Fechar",
    sv: "Stäng",
    sq: "Mbyll",
  } as Copy,
  enabled: {
    en: "Done. Updates will arrive on this phone.",
    el: "Έτοιμο. Οι ενημερώσεις θα φτάνουν σε αυτό το κινητό.",
    de: "Fertig. Updates kommen auf dieses Handy.",
    fr: "C'est fait. Les mises à jour arriveront sur ce téléphone.",
    it: "Fatto. Gli aggiornamenti arriveranno su questo telefono.",
    es: "Listo. Los avisos llegarán a este teléfono.",
    nl: "Klaar. Updates komen op deze telefoon.",
    pl: "Gotowe. Powiadomienia będą przychodzić na ten telefon.",
    pt: "Pronto. As atualizações chegarão a este telemóvel.",
    sv: "Klart. Uppdateringar kommer till den här telefonen.",
    sq: "U krye. Njoftimet do të vijnë në këtë telefon.",
  } as Copy,
  busy: {
    en: "Setting up...",
    el: "Ρύθμιση...",
    de: "Wird eingerichtet...",
    fr: "Configuration...",
    it: "Configurazione...",
    es: "Configurando...",
    nl: "Instellen...",
    pl: "Konfigurowanie...",
    pt: "A configurar...",
    sv: "Ställer in...",
    sq: "Po konfigurohet...",
  } as Copy,
  blocked: {
    en: "Notifications are blocked. Enable them in your browser settings to get updates.",
    el: "Οι ειδοποιήσεις είναι αποκλεισμένες. Ενεργοποίησέ τες στις ρυθμίσεις του browser.",
    de: "Benachrichtigungen sind blockiert. Aktiviere sie in den Browser-Einstellungen.",
    fr: "Les notifications sont bloquées. Activez-les dans les réglages du navigateur.",
    it: "Le notifiche sono bloccate. Attivale nelle impostazioni del browser.",
    es: "Las notificaciones están bloqueadas. Actívalas en los ajustes del navegador.",
    nl: "Meldingen zijn geblokkeerd. Schakel ze in via je browserinstellingen.",
    pl: "Powiadomienia są zablokowane. Włącz je w ustawieniach przeglądarki.",
    pt: "As notificações estão bloqueadas. Ativa-as nas definições do navegador.",
    sv: "Aviseringar är blockerade. Aktivera dem i webbläsarens inställningar.",
    sq: "Njoftimet janë të bllokuara. Aktivizoji në cilësimet e shfletuesit.",
  } as Copy,
  failed: {
    en: "Could not enable notifications. Please try again later.",
    el: "Δεν ήταν δυνατή η ενεργοποίηση. Δοκίμασε ξανά αργότερα.",
    de: "Benachrichtigungen konnten nicht aktiviert werden. Bitte später erneut versuchen.",
    fr: "Impossible d'activer les notifications. Réessayez plus tard.",
    it: "Impossibile attivare le notifiche. Riprova più tardi.",
    es: "No se pudieron activar las notificaciones. Inténtalo más tarde.",
    nl: "Meldingen konden niet worden ingeschakeld. Probeer het later opnieuw.",
    pl: "Nie udało się włączyć powiadomień. Spróbuj ponownie później.",
    pt: "Não foi possível ativar as notificações. Tenta novamente mais tarde.",
    sv: "Det gick inte att aktivera aviseringar. Försök igen senare.",
    sq: "Njoftimet nuk u aktivizuan. Provo përsëri më vonë.",
  } as Copy,
  iosTitle: {
    en: "Add this site to your Home Screen first",
    el: "Πρόσθεσε πρώτα αυτόν τον ιστότοπο στην Αρχική οθόνη",
    de: "Füge diese Seite zuerst zum Home-Bildschirm hinzu",
    fr: "Ajoutez d'abord ce site à votre écran d'accueil",
    it: "Aggiungi prima questo sito alla schermata Home",
    es: "Añade primero este sitio a tu pantalla de inicio",
    nl: "Voeg deze site eerst toe aan je beginscherm",
    pl: "Najpierw dodaj tę stronę do ekranu głównego",
    pt: "Adiciona primeiro este site ao teu ecrã principal",
    sv: "Lägg först till den här webbplatsen på hemskärmen",
    sq: "Shto fillimisht këtë faqe në ekranin bazë",
  } as Copy,
  iosStep: {
    en: "Tap the Share icon, then choose Add to Home Screen. Open the app and accept notifications there.",
    el: "Πάτησε το εικονίδιο Κοινοποίηση και διάλεξε Προσθήκη στην Αρχική οθόνη. Άνοιξε την εφαρμογή και αποδέξου τις ειδοποιήσεις.",
    de: "Tippe auf das Teilen-Symbol und wähle Zum Home-Bildschirm. Öffne die App und akzeptiere dort die Benachrichtigungen.",
    fr: "Touchez l'icône Partager, puis Sur l'écran d'accueil. Ouvrez l'app et acceptez les notifications.",
    it: "Tocca l'icona Condividi e scegli Aggiungi a Home. Apri l'app e accetta le notifiche.",
    es: "Toca el icono Compartir y elige Anadir a pantalla de inicio. Abre la app y acepta las notificaciones.",
    nl: "Tik op het deel-icoon en kies Zet op beginscherm. Open de app en accepteer daar de meldingen.",
    pl: "Dotknij ikony Udostepnij i wybierz Dodaj do ekranu glownego. Otworz aplikacje i zaakceptuj powiadomienia.",
    pt: "Toca no icone Partilhar e escolhe Adicionar ao ecra principal. Abre a app e aceita as notificacoes.",
    sv: "Tryck pa Dela-ikonen och valj Lagg till pa hemskarmen. Oppna appen och acceptera aviseringarna dar.",
    sq: "Prek ikonen Ndaj dhe zgjidh Shto ne ekranin baze. Hap aplikacionin dhe prano njoftimet.",
  } as Copy,
};

function pick(rec: Copy, lang: Lang): string {
  return rec[lang] ?? rec.en;
}

/**
 * base64url VAPID key -> Uint8Array for applicationServerKey. Backed by an
 * explicit ArrayBuffer so the type matches `BufferSource` exactly.
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const out = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

type Phase = "prompt" | "busy" | "done" | "ios" | "error";

export default function PushOptInBar({
  email,
  phone,
}: {
  /** The booking's email — used to match this device to the visitor's bookings. */
  email?: string;
  /** The booking's phone — alternative match key. */
  phone?: string;
}) {
  const { lang } = useLang();
  const [visible, setVisible] = useState(false);
  const [phase, setPhase] = useState<Phase>("prompt");
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    // Nothing to subscribe with, or no push support at all -> stay hidden.
    if (!email && !phone) return;
    if (typeof window === "undefined") return;
    const supported =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;

    // iOS: push works only inside an installed PWA. Detect iOS + standalone.
    const ua = navigator.userAgent || "";
    const isIos = /iphone|ipad|ipod/i.test(ua);
    const standalone =
      (window.matchMedia &&
        window.matchMedia("(display-mode: standalone)").matches) ||
      // Safari's legacy flag.
      (navigator as unknown as { standalone?: boolean }).standalone === true;

    let dismissed = false;
    try {
      dismissed = localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      /* private mode — show it */
    }
    if (dismissed) return;

    if (isIos && !standalone) {
      // Cannot subscribe yet; offer the install guide instead.
      setPhase("ios");
      setVisible(true);
      return;
    }
    if (!supported) return;
    if (Notification.permission === "granted") {
      // Already granted on a previous visit — silently re-subscribe so the
      // booking just made is covered, but do not show the bar.
      void subscribe(true);
      return;
    }
    if (Notification.permission === "denied") return;
    setVisible(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, phone]);

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setVisible(false);
  }

  async function subscribe(silent = false) {
    if (!silent) setPhase("busy");
    try {
      const permission =
        Notification.permission === "granted"
          ? "granted"
          : await Notification.requestPermission();
      if (permission !== "granted") {
        if (permission === "denied") {
          setPhase("error");
          setErrMsg(pick(C.blocked, lang));
        } else {
          setVisible(false);
        }
        return;
      }

      const reg = await navigator.serviceWorker.ready;

      // Fetch the public VAPID key.
      const vapidRes = await fetch(clientPath("/api/push/vapid"));
      if (!vapidRes.ok) throw new Error("vapid");
      const { publicKey } = (await vapidRes.json()) as { publicKey?: string };
      if (!publicKey) throw new Error("vapid");

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }

      const res = await fetch(clientPath("/api/push/subscribe"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          subscription: sub.toJSON(),
          audience: "customer",
          email: email || undefined,
          phone: phone || undefined,
          lang,
        }),
      });
      if (!res.ok) throw new Error("subscribe");

      if (silent) {
        setVisible(false);
      } else {
        setPhase("done");
        // Remember so the bar does not reappear on other pages.
        try {
          localStorage.setItem(DISMISS_KEY, "1");
        } catch {
          /* ignore */
        }
        setTimeout(() => setVisible(false), 3500);
      }
    } catch {
      if (silent) {
        setVisible(false);
      } else {
        setPhase("error");
        setErrMsg(pick(C.failed, lang));
      }
    }
  }

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label={pick(C.title, lang)}
      className="fixed inset-x-0 bottom-0 z-40 px-3 pb-3"
    >
      <div
        className="mx-auto flex max-w-2xl items-start gap-3 rounded-2xl border p-4 shadow-lg"
        style={{
          borderColor: "var(--border-strong)",
          background: "var(--surface-strong)",
          color: "var(--foreground)",
        }}
      >
        <div className="min-w-0 flex-1">
          {phase === "ios" ? (
            <>
              <p className="text-sm font-semibold">{pick(C.iosTitle, lang)}</p>
              <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
                {pick(C.iosStep, lang)}
              </p>
            </>
          ) : phase === "done" ? (
            <p className="text-sm font-semibold" style={{ color: "var(--gold)" }}>
              {pick(C.enabled, lang)}
            </p>
          ) : phase === "error" ? (
            <p className="text-sm" style={{ color: "#ffa0a0" }}>
              {errMsg}
            </p>
          ) : (
            <>
              <p className="text-sm font-semibold">{pick(C.title, lang)}</p>
              <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
                {pick(C.sub, lang)}
              </p>
            </>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {phase !== "ios" && phase !== "done" && phase !== "error" && (
            <button
              type="button"
              onClick={() => subscribe(false)}
              disabled={phase === "busy"}
              className="rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-widest disabled:opacity-60"
              style={{ background: "var(--gold)", color: "var(--background)" }}
            >
              {phase === "busy" ? pick(C.busy, lang) : pick(C.accept, lang)}
            </button>
          )}
          <button
            type="button"
            onClick={dismiss}
            aria-label={pick(C.dismiss, lang)}
            className="flex h-8 w-8 items-center justify-center rounded-full border text-sm"
            style={{ borderColor: "var(--border)", color: "var(--muted)" }}
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}
