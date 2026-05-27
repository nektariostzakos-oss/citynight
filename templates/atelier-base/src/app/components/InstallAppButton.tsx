"use client";

/**
 * "Install app" control. Adds the site to the phone or desktop as a PWA.
 *
 * Chrome / Edge / Android fire `beforeinstallprompt`; we capture it and the
 * button calls `prompt()` on click. iOS Safari has no such event, so a tap
 * there reveals the Share -> Add to Home Screen hint. Other browsers get a
 * "use the browser menu" hint. When the site is already running as an
 * installed app the control renders nothing.
 *
 * Reusable: pass `className` to match the surrounding nav, footer, or panel.
 * All copy is i18n in the 11 languages.
 */

import { useEffect, useState } from "react";
import { useLang } from "../../lib/i18n";
import { type Lang } from "../../lib/langs";

type Copy = Record<Lang, string>;

const C = {
  install: {
    en: "Install app",
    el: "Εγκατάσταση εφαρμογής",
    de: "App installieren",
    fr: "Installer l'application",
    it: "Installa l'app",
    es: "Instalar la app",
    nl: "App installeren",
    pl: "Zainstaluj aplikację",
    pt: "Instalar a aplicação",
    sv: "Installera appen",
    sq: "Instalo aplikacionin",
  } as Copy,
  iosHint: {
    en: "Tap the Share icon, then Add to Home Screen.",
    el: "Πάτησε το εικονίδιο Κοινή χρήση και μετά Προσθήκη στην Αρχική οθόνη.",
    de: "Auf das Teilen-Symbol tippen, dann Zum Home-Bildschirm.",
    fr: "Touchez l'icône Partager, puis Sur l'écran d'accueil.",
    it: "Tocca l'icona Condividi, poi Aggiungi a Home.",
    es: "Toca el icono Compartir y luego Añadir a pantalla de inicio.",
    nl: "Tik op het deel-icoon en daarna op Zet op beginscherm.",
    pl: "Dotknij ikony Udostępnij, a potem Dodaj do ekranu głównego.",
    pt: "Toca no ícone Partilhar e depois Adicionar ao ecrã principal.",
    sv: "Tryck på dela-ikonen och sedan Lägg till på hemskärmen.",
    sq: "Prek ikonën Ndaj, pastaj Shto në ekranin bazë.",
  } as Copy,
  menuHint: {
    en: "Open your browser menu and choose Install.",
    el: "Άνοιξε το μενού του browser και διάλεξε Εγκατάσταση.",
    de: "Browser-Menü öffnen und Installieren wählen.",
    fr: "Ouvrez le menu du navigateur et choisissez Installer.",
    it: "Apri il menu del browser e scegli Installa.",
    es: "Abre el menú del navegador y elige Instalar.",
    nl: "Open het browsermenu en kies Installeren.",
    pl: "Otwórz menu przeglądarki i wybierz Zainstaluj.",
    pt: "Abre o menu do navegador e escolhe Instalar.",
    sv: "Öppna webbläsarens meny och välj Installera.",
    sq: "Hap menynë e shfletuesit dhe zgjidh Instalo.",
  } as Copy,
};

function pick(rec: Copy, lang: Lang): string {
  return rec[lang] ?? rec.en;
}

/** The `beforeinstallprompt` event, which is not in the standard lib types. */
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function InstallAppButton({
  className,
}: {
  /** Styling for the button, so each mount matches its surroundings. */
  className?: string;
}) {
  const { lang } = useLang();
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(
    null,
  );
  const [hidden, setHidden] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const standalone =
      (window.matchMedia &&
        window.matchMedia("(display-mode: standalone)").matches) ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    // Already running as an installed app: nothing to offer.
    if (standalone) {
      setHidden(true);
      return;
    }
    setIsIos(/iphone|ipad|ipod/i.test(navigator.userAgent || ""));

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as InstallPromptEvent);
    };
    const onInstalled = () => setHidden(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function onClick() {
    if (installPrompt) {
      try {
        await installPrompt.prompt();
        await installPrompt.userChoice;
      } catch {
        /* the user dismissed it */
      }
      setInstallPrompt(null);
      return;
    }
    // No captured prompt: guide the user instead of doing nothing. iOS Safari
    // never fires beforeinstallprompt; other browsers may not have yet.
    setHint(isIos ? pick(C.iosHint, lang) : pick(C.menuHint, lang));
  }

  if (hidden) return null;

  const cls =
    className ??
    "rounded-full border border-white/15 px-5 py-2 text-xs uppercase tracking-widest text-white/80 transition-colors hover:bg-white/10";

  return (
    <>
      <button type="button" onClick={onClick} className={cls}>
        {pick(C.install, lang)}
      </button>
      {hint && (
        <span className="mt-1 block text-xs opacity-70">{hint}</span>
      )}
    </>
  );
}
