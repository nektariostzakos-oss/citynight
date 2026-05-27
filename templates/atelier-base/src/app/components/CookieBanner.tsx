"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { tenantRelativePath } from "../../lib/basePath";
import { useLang } from "../../lib/i18n";

/**
 * Minimal GDPR/CCPA-compliant cookie banner. Shown until the visitor picks
 * "Accept all" or "Essential only". Choice stored in localStorage; analytics
 * scripts (layout.tsx) are already guarded by consent via this flag so they
 * don't fire until the visitor opts in.
 */
const KEY = "atelier_cookie_consent_v1";

export type Consent = "all" | "essential" | null;

/** Banner copy per language. Languages with no entry fall back to English. */
const COPY: Record<string, Record<string, string>> = {
  aria: {
    en: "Cookie consent",
    el: "Συγκατάθεση για cookies",
    de: "Cookie-Einwilligung",
    fr: "Consentement aux cookies",
    it: "Consenso ai cookie",
    es: "Consentimiento de cookies",
    nl: "Cookietoestemming",
    pl: "Zgoda na pliki cookie",
    pt: "Consentimento de cookies",
    sv: "Cookie-samtycke",
    sq: "Pëlqimi për cookies",
  },
  body: {
    en: "We use essential cookies to run the site and (optionally) analytics cookies to understand traffic. Pick below.",
    el: "Χρησιμοποιούμε cookies ουσιαστικά για τη λειτουργία και προαιρετικά για στατιστικά/αναλυτικά δεδομένα. Διάλεξε παρακάτω.",
    de: "Wir verwenden essenzielle Cookies für den Betrieb der Website und optional Analyse-Cookies, um den Traffic zu verstehen. Wähle unten.",
    fr: "Nous utilisons des cookies essentiels au fonctionnement du site et, en option, des cookies de mesure d'audience. Choisissez ci-dessous.",
    it: "Usiamo cookie essenziali per far funzionare il sito e, facoltativamente, cookie analitici per capire il traffico. Scegli qui sotto.",
    es: "Usamos cookies esenciales para el funcionamiento del sitio y, de forma opcional, cookies de análisis para entender el tráfico. Elige abajo.",
    nl: "We gebruiken essentiële cookies om de site te laten werken en optioneel analytische cookies om het verkeer te begrijpen. Kies hieronder.",
    pl: "Używamy niezbędnych plików cookie do działania strony i opcjonalnie analitycznych, by rozumieć ruch. Wybierz poniżej.",
    pt: "Usamos cookies essenciais para o site funcionar e, opcionalmente, cookies de análise para entender o tráfego. Escolha abaixo.",
    sv: "Vi använder nödvändiga cookies för att driva sidan och valfritt analyscookies för att förstå trafiken. Välj nedan.",
    sq: "Përdorim cookies thelbësore për funksionimin e faqes dhe, me dëshirë, cookies analitike për të kuptuar trafikun. Zgjidh më poshtë.",
  },
  acceptAll: {
    en: "Accept all",
    el: "Αποδοχή όλων",
    de: "Alle akzeptieren",
    fr: "Tout accepter",
    it: "Accetta tutti",
    es: "Aceptar todo",
    nl: "Alles accepteren",
    pl: "Zaakceptuj wszystkie",
    pt: "Aceitar tudo",
    sv: "Acceptera alla",
    sq: "Prano të gjitha",
  },
  essentialOnly: {
    en: "Essential only",
    el: "Μόνο απαραίτητα",
    de: "Nur essenzielle",
    fr: "Essentiels uniquement",
    it: "Solo essenziali",
    es: "Solo esenciales",
    nl: "Alleen essentiële",
    pl: "Tylko niezbędne",
    pt: "Apenas essenciais",
    sv: "Endast nödvändiga",
    sq: "Vetëm thelbësoret",
  },
  privacy: {
    en: "Privacy policy",
    el: "Πολιτική απορρήτου",
    de: "Datenschutz",
    fr: "Politique de confidentialité",
    it: "Privacy",
    es: "Política de privacidad",
    nl: "Privacybeleid",
    pl: "Polityka prywatności",
    pt: "Política de privacidade",
    sv: "Integritetspolicy",
    sq: "Politika e privatësisë",
  },
};

export function getConsent(): Consent {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(KEY);
    return v === "all" || v === "essential" ? v : null;
  } catch {
    return null;
  }
}

export default function CookieBanner() {
  const [decided, setDecided] = useState<boolean | null>(null);
  const { lang } = useLang();
  // Tenant-relative so the admin/setup hide check matches across SSR/client.
  const pathname = tenantRelativePath(usePathname());
  const primaryBtnRef = useRef<HTMLButtonElement>(null);

  const tr = (key: keyof typeof COPY) => COPY[key][lang] ?? COPY[key].en;

  useEffect(() => {
    setDecided(getConsent() !== null);
  }, []);

  // Move focus to the primary ("Accept all") button when the banner appears.
  useEffect(() => {
    if (decided === false) {
      // Small defer so the element is painted before we focus it.
      const id = window.setTimeout(() => primaryBtnRef.current?.focus(), 50);
      return () => window.clearTimeout(id);
    }
  }, [decided]);

  // Don't show on setup/admin routes — those are internal surfaces, not
  // public pages, so the consent question doesn't apply.
  if (pathname?.startsWith("/setup") || pathname?.startsWith("/admin")) return null;

  function choose(v: Consent) {
    try {
      if (v) window.localStorage.setItem(KEY, v);
    } catch {}
    setDecided(true);
    // Notify layout / analytics hooks that consent changed.
    window.dispatchEvent(new CustomEvent("atelier-consent-changed", { detail: v }));
  }

  if (decided === null || decided === true) return null;

  return (
    <div
      role="dialog"
      aria-label={tr("aria")}
      aria-live="polite"
      className="fixed inset-x-0 bottom-0 z-40 px-4 pb-4 sm:px-6 sm:pb-6"
    >
      <div
        className="mx-auto max-w-3xl rounded-2xl border p-5 shadow-2xl"
        style={{
          borderColor: "var(--border-strong)",
          background: "color-mix(in srgb, var(--background) 94%, transparent)",
          backdropFilter: "blur(14px)",
        }}
      >
        <p className="text-xs uppercase tracking-[0.3em]" style={{ color: "var(--gold)" }}>
          Cookies
        </p>
        <p className="mt-2 text-sm" style={{ color: "var(--foreground)" }}>
          {tr("body")}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            ref={primaryBtnRef}
            onClick={() => choose("all")}
            className="rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-widest focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)]"
            style={{ background: "var(--gold)", color: "var(--background)" }}
          >
            {tr("acceptAll")}
          </button>
          <button
            onClick={() => choose("essential")}
            className="rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-widest focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)]"
            style={{ borderColor: "var(--border-strong)", color: "var(--foreground)" }}
          >
            {tr("essentialOnly")}
          </button>
          <Link
            href="/privacy"
            className="ml-auto text-[11px] uppercase tracking-widest focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)]"
            style={{ color: "var(--muted-2)" }}
          >
            {tr("privacy")}
          </Link>
        </div>
      </div>
    </div>
  );
}
