"use client";

/**
 * Owner / staff push notifications panel (admin Tools).
 *
 * "Enable notifications on this device" subscribes the current device as an
 * `audience: "owner"` push subscription, so the staff member gets a push on
 * every new booking and cancellation. "Send test notification" hits the
 * staff-only /api/push/test route to confirm delivery on this device.
 *
 * All copy is i18n in the 11 languages. iOS Safari outside an installed PWA
 * cannot subscribe — Apple's rule — so a short install hint is shown there.
 */

import { useEffect, useState } from "react";
import { clientPath } from "../../lib/basePath";
import { useLang } from "../../lib/i18n";
import { type Lang } from "../../lib/langs";
import InstallAppButton from "./InstallAppButton";

type Copy = Record<Lang, string>;

const C = {
  heading: {
    en: "Notifications",
    el: "Ειδοποιήσεις",
    de: "Benachrichtigungen",
    fr: "Notifications",
    it: "Notifiche",
    es: "Notificaciones",
    nl: "Meldingen",
    pl: "Powiadomienia",
    pt: "Notificações",
    sv: "Aviseringar",
    sq: "Njoftimet",
  } as Copy,
  desc: {
    en: "Get a push on this device for every new booking and cancellation. Enable it on each device you want alerts on.",
    el: "Λάβε ειδοποίηση σε αυτή τη συσκευή για κάθε νέο ραντεβού και ακύρωση. Ενεργοποίησέ το σε κάθε συσκευή.",
    de: "Erhalte auf diesem Gerät einen Hinweis bei jeder neuen Buchung und Stornierung. Auf jedem Gerät einzeln aktivieren.",
    fr: "Recevez une notification sur cet appareil pour chaque réservation et annulation. Activez-la sur chaque appareil voulu.",
    it: "Ricevi una notifica su questo dispositivo per ogni nuova prenotazione e annullamento. Attivala su ogni dispositivo.",
    es: "Recibe un aviso en este dispositivo en cada nueva reserva y cancelación. Actívalo en cada dispositivo.",
    nl: "Ontvang een melding op dit apparaat bij elke nieuwe boeking en annulering. Schakel het in op elk apparaat.",
    pl: "Otrzymuj powiadomienie na tym urządzeniu o każdej nowej rezerwacji i anulowaniu. Włącz je na każdym urządzeniu.",
    pt: "Recebe um aviso neste dispositivo a cada nova marcação e cancelamento. Ativa-o em cada dispositivo.",
    sv: "Få en avisering på den här enheten vid varje ny bokning och avbokning. Aktivera den på varje enhet.",
    sq: "Merr një njoftim në këtë pajisje për çdo rezervim të ri dhe anulim. Aktivizoje në çdo pajisje.",
  } as Copy,
  enable: {
    en: "Enable notifications on this device",
    el: "Ενεργοποίηση σε αυτή τη συσκευή",
    de: "Auf diesem Gerät aktivieren",
    fr: "Activer sur cet appareil",
    it: "Attiva su questo dispositivo",
    es: "Activar en este dispositivo",
    nl: "Inschakelen op dit apparaat",
    pl: "Włącz na tym urządzeniu",
    pt: "Ativar neste dispositivo",
    sv: "Aktivera på den här enheten",
    sq: "Aktivizo në këtë pajisje",
  } as Copy,
  test: {
    en: "Send test notification",
    el: "Δοκιμαστική ειδοποίηση",
    de: "Testbenachrichtigung senden",
    fr: "Envoyer une notification test",
    it: "Invia notifica di prova",
    es: "Enviar notificación de prueba",
    nl: "Testmelding sturen",
    pl: "Wyślij powiadomienie testowe",
    pt: "Enviar notificação de teste",
    sv: "Skicka testavisering",
    sq: "Dërgo njoftim prove",
  } as Copy,
  busy: {
    en: "Working...",
    el: "Επεξεργασία...",
    de: "Wird ausgeführt...",
    fr: "En cours...",
    it: "In corso...",
    es: "Procesando...",
    nl: "Bezig...",
    pl: "Przetwarzanie...",
    pt: "A processar...",
    sv: "Arbetar...",
    sq: "Duke punuar...",
  } as Copy,
  enabled: {
    en: "Notifications are enabled on this device.",
    el: "Οι ειδοποιήσεις είναι ενεργές σε αυτή τη συσκευή.",
    de: "Benachrichtigungen sind auf diesem Gerät aktiv.",
    fr: "Les notifications sont activées sur cet appareil.",
    it: "Le notifiche sono attive su questo dispositivo.",
    es: "Las notificaciones están activas en este dispositivo.",
    nl: "Meldingen zijn ingeschakeld op dit apparaat.",
    pl: "Powiadomienia są włączone na tym urządzeniu.",
    pt: "As notificações estão ativas neste dispositivo.",
    sv: "Aviseringar är aktiverade på den här enheten.",
    sq: "Njoftimet janë aktive në këtë pajisje.",
  } as Copy,
  testSent: {
    en: "Test notification sent. Check this device.",
    el: "Η δοκιμαστική ειδοποίηση στάλθηκε. Έλεγξε τη συσκευή.",
    de: "Testbenachrichtigung gesendet. Prüfe dieses Gerät.",
    fr: "Notification test envoyée. Vérifiez cet appareil.",
    it: "Notifica di prova inviata. Controlla questo dispositivo.",
    es: "Notificación de prueba enviada. Revisa este dispositivo.",
    nl: "Testmelding verstuurd. Controleer dit apparaat.",
    pl: "Powiadomienie testowe wysłane. Sprawdź to urządzenie.",
    pt: "Notificação de teste enviada. Verifica este dispositivo.",
    sv: "Testavisering skickad. Kontrollera den här enheten.",
    sq: "Njoftimi i provës u dërgua. Kontrollo këtë pajisje.",
  } as Copy,
  blocked: {
    en: "Notifications are blocked. Enable them in your browser settings.",
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
    en: "Could not enable notifications. Please try again.",
    el: "Δεν ήταν δυνατή η ενεργοποίηση. Δοκίμασε ξανά.",
    de: "Aktivierung fehlgeschlagen. Bitte erneut versuchen.",
    fr: "Échec de l'activation. Réessayez.",
    it: "Attivazione non riuscita. Riprova.",
    es: "No se pudo activar. Inténtalo de nuevo.",
    nl: "Inschakelen mislukt. Probeer het opnieuw.",
    pl: "Nie udało się włączyć. Spróbuj ponownie.",
    pt: "Não foi possível ativar. Tenta novamente.",
    sv: "Det gick inte att aktivera. Försök igen.",
    sq: "Aktivizimi dështoi. Provo përsëri.",
  } as Copy,
  unsupported: {
    en: "This browser does not support push notifications.",
    el: "Αυτός ο browser δεν υποστηρίζει ειδοποιήσεις push.",
    de: "Dieser Browser unterstützt keine Push-Benachrichtigungen.",
    fr: "Ce navigateur ne prend pas en charge les notifications push.",
    it: "Questo browser non supporta le notifiche push.",
    es: "Este navegador no admite notificaciones push.",
    nl: "Deze browser ondersteunt geen pushmeldingen.",
    pl: "Ta przeglądarka nie obsługuje powiadomień push.",
    pt: "Este navegador não suporta notificações push.",
    sv: "Den här webbläsaren stöder inte push-aviseringar.",
    sq: "Ky shfletues nuk i mbështet njoftimet push.",
  } as Copy,
  installApp: {
    en: "Install this site as an app on your device for one-tap access.",
    el: "Εγκατέστησε τον ιστότοπο ως εφαρμογή στη συσκευή σου για άμεση πρόσβαση.",
    de: "Installiere die Seite als App auf deinem Gerät für Zugriff mit einem Tipp.",
    fr: "Installez le site comme une application sur votre appareil pour un accès direct.",
    it: "Installa il sito come app sul tuo dispositivo per un accesso immediato.",
    es: "Instala el sitio como app en tu dispositivo para un acceso directo.",
    nl: "Installeer de site als app op je apparaat voor toegang met één tik.",
    pl: "Zainstaluj stronę jako aplikację na urządzeniu, aby mieć dostęp jednym dotknięciem.",
    pt: "Instala o site como aplicação no teu dispositivo para acesso imediato.",
    sv: "Installera webbplatsen som en app på din enhet för snabb åtkomst.",
    sq: "Instalo faqen si aplikacion në pajisjen tënde për qasje me një prekje.",
  } as Copy,
  iosHint: {
    en: "On iPhone or iPad, add this site to the Home Screen first, then open it from there to enable notifications.",
    el: "Σε iPhone ή iPad, πρόσθεσε πρώτα τον ιστότοπο στην Αρχική οθόνη και άνοιξέ τον από εκεί.",
    de: "Auf iPhone oder iPad zuerst die Seite zum Home-Bildschirm hinzufügen und von dort öffnen.",
    fr: "Sur iPhone ou iPad, ajoutez d'abord le site à l'écran d'accueil, puis ouvrez-le de là.",
    it: "Su iPhone o iPad, aggiungi prima il sito alla schermata Home e aprilo da lì.",
    es: "En iPhone o iPad, añade primero el sitio a la pantalla de inicio y ábrelo desde ahí.",
    nl: "Op iPhone of iPad: voeg de site eerst toe aan het beginscherm en open hem van daaruit.",
    pl: "Na iPhonie lub iPadzie najpierw dodaj stronę do ekranu głównego i otwórz ją stamtąd.",
    pt: "No iPhone ou iPad, adiciona primeiro o site ao ecrã principal e abre-o a partir daí.",
    sv: "På iPhone eller iPad, lägg först till webbplatsen på hemskärmen och öppna den därifrån.",
    sq: "Në iPhone ose iPad, shto fillimisht faqen në ekranin bazë dhe hape prej andej.",
  } as Copy,
};

function pick(rec: Copy, lang: Lang): string {
  return rec[lang] ?? rec.en;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const buffer = new ArrayBuffer(raw.length);
  const out = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export default function OwnerPushPanel() {
  const { lang } = useLang();
  const [supported, setSupported] = useState(true);
  const [iosNeedsInstall, setIosNeedsInstall] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ok =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    setSupported(ok);

    const ua = navigator.userAgent || "";
    const isIos = /iphone|ipad|ipod/i.test(ua);
    const standalone =
      (window.matchMedia &&
        window.matchMedia("(display-mode: standalone)").matches) ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (isIos && !standalone) {
      setIosNeedsInstall(true);
      return;
    }
    if (!ok) return;
    // Reflect a subscription already present on this device.
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        if (sub && Notification.permission === "granted") setEnabled(true);
      })
      .catch(() => {});
  }, []);

  async function enable() {
    setBusy(true);
    setMsg(null);
    try {
      const permission =
        Notification.permission === "granted"
          ? "granted"
          : await Notification.requestPermission();
      if (permission !== "granted") {
        setMsg(
          permission === "denied"
            ? pick(C.blocked, lang)
            : pick(C.failed, lang)
        );
        return;
      }

      // Make sure the service worker is registered before subscribing.
      // Waiting on serviceWorker.ready alone can resolve a beat too late on a
      // first visit, which is what made enabling take two clicks.
      const existingReg = await navigator.serviceWorker.getRegistration();
      if (!existingReg) {
        await navigator.serviceWorker.register(clientPath("/sw.js"));
      }
      const reg = await navigator.serviceWorker.ready;

      const vapidRes = await fetch(clientPath("/api/push/vapid"));
      if (!vapidRes.ok) throw new Error("vapid");
      const { publicKey } = (await vapidRes.json()) as { publicKey?: string };
      if (!publicKey) throw new Error("vapid");
      const appServerKey = urlBase64ToUint8Array(publicKey);

      // Always re-subscribe from scratch. A subscription left over from an
      // earlier VAPID key still looks valid to the browser, but the push
      // service silently rejects every message sent to it, so the device
      // quietly stops receiving notifications. Dropping it guarantees the
      // stored subscription matches the key the server signs with.
      const stale = await reg.pushManager.getSubscription();
      if (stale) {
        try {
          await stale.unsubscribe();
        } catch {
          /* ignore — we re-subscribe regardless */
        }
      }

      let sub: PushSubscription;
      try {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: appServerKey,
        });
      } catch {
        // Chrome's push service occasionally fails the first subscribe call
        // right after a permission grant; a single retry clears it.
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: appServerKey,
        });
      }

      const res = await fetch(clientPath("/api/push/subscribe"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          subscription: sub.toJSON(),
          audience: "owner",
          lang,
        }),
      });
      if (!res.ok) throw new Error("subscribe");
      setEnabled(true);
      setMsg(pick(C.enabled, lang));
    } catch {
      setMsg(pick(C.failed, lang));
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(clientPath("/api/push/test"), { method: "POST" });
      const d = await res.json().catch(() => ({}));
      setMsg(res.ok ? pick(C.testSent, lang) : d.error || pick(C.failed, lang));
    } catch {
      setMsg(pick(C.failed, lang));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-widest text-white/70">
        {pick(C.heading, lang)}
      </h3>
      <p className="mb-3 text-xs text-white/60">{pick(C.desc, lang)}</p>

      {iosNeedsInstall ? (
        <p className="text-xs text-[#c9a961]">{pick(C.iosHint, lang)}</p>
      ) : !supported ? (
        <p className="text-xs text-white/60">{pick(C.unsupported, lang)}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={enable}
            disabled={busy}
            className="rounded-full bg-[#c9a961] px-5 py-2 text-xs font-semibold uppercase tracking-widest text-black disabled:opacity-60"
          >
            {busy ? pick(C.busy, lang) : pick(C.enable, lang)}
          </button>
          <button
            onClick={sendTest}
            disabled={busy || !enabled}
            className="rounded-full border border-white/15 px-5 py-2 text-xs uppercase tracking-widest text-white/80 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {pick(C.test, lang)}
          </button>
        </div>
      )}

      {msg && <p className="mt-3 text-xs text-white/80">{msg}</p>}

      <div className="mt-4 border-t border-white/10 pt-4">
        <p className="mb-2 text-xs text-white/60">{pick(C.installApp, lang)}</p>
        <InstallAppButton />
      </div>
    </section>
  );
}
