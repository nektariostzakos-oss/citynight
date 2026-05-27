"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useLang } from "../../lib/i18n";
import { langPick } from "../../lib/langs";
import { useNavSettings } from "../../lib/navClient";
import { tenantRelativePath } from "../../lib/basePath";

export default function StickyBookBar() {
  // Strip the /<slug> prefix so the visibility checks match between server
  // (slug already stripped) and client, avoiding a hydration mismatch.
  const pathname = tenantRelativePath(usePathname());
  const { lang } = useLang();
  const { nav } = useNavSettings();

  if (
    !pathname ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/setup") ||
    pathname.startsWith(nav.bookHref || "/book")
  ) {
    return null;
  }

  const label = lang === "el"
    ? nav.bookLabel_el || nav.bookLabel_en || "Κράτηση"
    : nav.bookLabel_en || "Book";
  const href = nav.bookHref || "/book";

  return (
    <motion.div
      initial={{ y: 64, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 1.4, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-x-0 bottom-0 z-30 md:hidden"
      style={{
        background: "color-mix(in srgb, var(--background) 92%, transparent)",
        borderTop: "1px solid var(--border-strong)",
        backdropFilter: "blur(14px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex-1 min-w-0">
          <p className="text-[9px] uppercase tracking-[0.3em]" style={{ color: "var(--gold)" }}>
            {langPick({ en: "Available today", el: "Διαθέσιμα σήμερα", de: "Heute verfügbar", fr: "Disponible aujourd'hui", it: "Disponibile oggi", es: "Disponible hoy", nl: "Vandaag beschikbaar", pl: "Dostępne dziś", pt: "Disponível hoje", sv: "Ledigt idag", sq: "Të lira sot" }, lang)}
          </p>
          <p className="truncate text-sm font-serif" style={{ color: "var(--foreground)" }}>
            {langPick({ en: "Reserve your spot", el: "Πάρτε τη θέση σας", de: "Sichere dir deinen Platz", fr: "Réservez votre place", it: "Prenota il tuo posto", es: "Reserva tu lugar", nl: "Reserveer je plek", pl: "Zarezerwuj miejsce", pt: "Reserve o seu lugar", sv: "Boka din plats", sq: "Rezervoni vendin tuaj" }, lang)}
          </p>
        </div>
        <Link
          href={href}
          className="shrink-0 rounded-none px-5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.25em]"
          style={{ background: "var(--gold)", color: "var(--background)" }}
        >
          {label} →
        </Link>
      </div>
    </motion.div>
  );
}
