"use client";

import { useEffect, useState } from "react";
import { Share2, Link2, Check } from "lucide-react";
import { useLang } from "../../lib/i18n";
import { langPick } from "../../lib/langs";

const COPY = {
  share: {
    en: "Share",
    el: "Κοινοποίηση",
    de: "Teilen",
    fr: "Partager",
    it: "Condividi",
    es: "Compartir",
    nl: "Delen",
    pl: "Udostępnij",
    pt: "Partilhar",
    sv: "Dela",
    sq: "Shpërndaje",
  },
  copy: {
    en: "Copy link",
    el: "Αντιγραφή συνδέσμου",
    de: "Link kopieren",
    fr: "Copier le lien",
    it: "Copia link",
    es: "Copiar enlace",
    nl: "Link kopiëren",
    pl: "Kopiuj link",
    pt: "Copiar ligação",
    sv: "Kopiera länk",
    sq: "Kopjo lidhjen",
  },
  copied: {
    en: "Link copied",
    el: "Ο σύνδεσμος αντιγράφηκε",
    de: "Link kopiert",
    fr: "Lien copié",
    it: "Link copiato",
    es: "Enlace copiado",
    nl: "Link gekopieerd",
    pl: "Link skopiowany",
    pt: "Ligação copiada",
    sv: "Länk kopierad",
    sq: "Lidhja u kopjua",
  },
};

function XMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
    </svg>
  );
}
function FbMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M24 12.073C24 5.404 18.627 0 12 0S0 5.404 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.413c0-3.026 1.792-4.697 4.533-4.697 1.313 0 2.686.236 2.686.236v2.971H15.83c-1.49 0-1.955.93-1.955 1.886v2.264h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073Z" />
    </svg>
  );
}
function WaMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 0 1 8.413 3.488 11.82 11.82 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24Zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981Zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414Z" />
    </svg>
  );
}

export default function PostShare({ title }: { title: string }) {
  const { lang } = useLang();
  const tr = (k: keyof typeof COPY) => langPick(COPY[k], lang);

  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [canNative, setCanNative] = useState(false);

  useEffect(() => {
    setUrl(window.location.href);
    setCanNative(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url || window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {}
  }

  async function nativeShare() {
    try {
      await navigator.share({ title, url: url || window.location.href });
    } catch {}
  }

  const e = encodeURIComponent;
  const targets = [
    {
      label: "X",
      href: `https://twitter.com/intent/tweet?url=${e(url)}&text=${e(title)}`,
      icon: <XMark />,
    },
    {
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${e(url)}`,
      icon: <FbMark />,
    },
    {
      label: "WhatsApp",
      href: `https://wa.me/?text=${e(`${title} ${url}`)}`,
      icon: <WaMark />,
    },
  ];

  const btn =
    "flex h-10 w-10 items-center justify-center rounded-full border border-white/12 bg-white/[0.03] text-white/65 transition-colors hover:border-[var(--gold)]/45 hover:text-[var(--gold)]";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-[10px] uppercase tracking-[0.3em] text-white/40">
        {tr("share")}
      </span>
      <div className="flex items-center gap-2">
        {canNative && (
          <button type="button" onClick={nativeShare} aria-label={tr("share")} className={btn}>
            <Share2 className="h-4 w-4" />
          </button>
        )}
        {targets.map((t) => (
          <a
            key={t.label}
            href={t.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t.label}
            className={btn}
          >
            {t.icon}
          </a>
        ))}
        <button
          type="button"
          onClick={copy}
          aria-label={copied ? tr("copied") : tr("copy")}
          className={btn}
        >
          {copied ? (
            <Check className="h-4 w-4 text-[var(--gold)]" />
          ) : (
            <Link2 className="h-4 w-4" />
          )}
        </button>
        {copied && (
          <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--gold)]">
            {tr("copied")}
          </span>
        )}
      </div>
    </div>
  );
}
