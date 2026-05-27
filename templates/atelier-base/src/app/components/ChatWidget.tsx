"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useLang } from "../../lib/i18n";
import { langPick } from "../../lib/langs";
import { useBranding } from "../../lib/brandingClient";
import { useBusiness } from "../../lib/businessClient";

type Action = { label: string; href: string };
type Msg = { role: "user" | "assistant"; content: string; actions?: Action[] };

const STORAGE_KEY = "atelier_chat_v2";

export default function ChatWidget() {
  const pathname = usePathname();
  const { lang, setLang } = useLang();
  const { branding } = useBranding();
  const { business } = useBusiness();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setMessages((JSON.parse(raw) as Msg[]).slice(-40));
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-40))); } catch {}
  }, [messages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  // Proactive nudge: after 20s of inactivity on a page, pulse the button (first visit only).
  // The setTimeout callback runs outside React's render, so it is not a "setState in effect".
  useEffect(() => {
    if (open || messages.length > 0) return;
    let stale = false;
    try { if (sessionStorage.getItem("atelier_chat_nudged")) return; } catch {}
    const t = setTimeout(() => {
      if (stale) return;
      setUnread((n) => (n === 0 ? 1 : n));
      try { sessionStorage.setItem("atelier_chat_nudged", "1"); } catch {}
    }, 20_000);
    return () => { stale = true; clearTimeout(t); };
  }, [open, messages.length]);

  // Lightweight language auto-detect from the user's very first message.
  // Greek characters → switch UI to EL; otherwise leave as-is. Only once per session.
  useEffect(() => {
    if (messages.length !== 1) return;
    const first = messages[0];
    if (first.role !== "user") return;
    try { if (sessionStorage.getItem("atelier_chat_lang_detected")) return; } catch {}
    const greekRe = /[Ͱ-Ͽἀ-῿]/;
    const detected: "el" | "en" = greekRe.test(first.content) ? "el" : "en";
    if (detected !== lang) setLang(detected);
    try { sessionStorage.setItem("atelier_chat_lang_detected", "1"); } catch {}
  }, [messages, lang, setLang]);

  // Hide on the admin dashboard and the setup wizard. The segment may be
  // prefixed by a tenant slug under SaaS (e.g. /scisors/setup), so match the
  // segment anywhere in the path, not just at the start.
  if (/(^|\/)(admin|setup)(\/|$)/.test(pathname || "")) return null;

  // Build human-handoff action using whatever contact channel is configured
  function handoffAction(): Action | null {
    const wa = (business.social?.whatsapp || "").replace(/[^+\d]/g, "");
    if (wa) {
      const msg = lang === "el"
        ? `Γεια, θα ήθελα λίγη βοήθεια από ${branding.wordmark || "την ομάδα σας"}.`
        : `Hi, I'd like some help from ${branding.wordmark || "your team"}.`;
      return { label: "WhatsApp", href: `https://wa.me/${wa.replace(/^\+/, "")}?text=${encodeURIComponent(msg)}` };
    }
    if (business.phone) {
      return { label: langPick({ en: "Call us", el: "Κλήση", de: "Anrufen", fr: "Appelez-nous", it: "Chiamaci", es: "Llámanos", nl: "Bel ons", pl: "Zadzwoń", pt: "Ligue-nos", sv: "Ring oss", sq: "Na telefono" }, lang), href: `tel:${business.phone.replace(/\s+/g, "")}` };
    }
    if (business.email) {
      return { label: langPick({ en: "Email us", el: "Email", de: "E-Mail", fr: "Écrivez-nous", it: "Email", es: "Escríbenos", nl: "Mail ons", pl: "Napisz e-mail", pt: "Envie-nos um email", sv: "Mejla oss", sq: "Na shkruaj" }, lang), href: `mailto:${business.email}` };
    }
    return null;
  }

  const greeting = lang === "el"
    ? `Γεια σας · είμαι ο concierge του ${branding.wordmark || "site"}. Ρωτήστε με για ραντεβού, τιμές, ωράριο ή προϊόντα.`
    : `Hi. I'm the ${branding.wordmark || "site"} concierge. Ask me about bookings, prices, hours, or products.`;

  async function askRaw(text: string) {
    if (!text.trim() || busy) return;
    setErr(null);
    const nextMsgs: Msg[] = [...messages, { role: "user", content: text.trim() }];
    setMessages(nextMsgs);
    setBusy(true);
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: nextMsgs, lang }),
      });
      const d = await r.json();
      if (!r.ok) {
        setErr(d.reply || d.error || "Something went wrong.");
      } else {
        setMessages((m) => [...m, {
          role: "assistant",
          content: typeof d.text === "string" ? d.text : (d.reply || ""),
          actions: Array.isArray(d.actions) ? d.actions : undefined,
        }]);
        if (!open) setUnread((n) => Math.min(n + 1, 9));
      }
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function send() {
    const t = input;
    setInput("");
    askRaw(t);
  }

  function reset() {
    setMessages([]);
    setErr(null);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }

  const placeholder = langPick({ en: "Type a message…", el: "Γράψε ένα μήνυμα…", de: "Schreib eine Nachricht…", fr: "Écrivez un message…", it: "Scrivi un messaggio…", es: "Escribe un mensaje…", nl: "Typ een bericht…", pl: "Napisz wiadomość…", pt: "Escreva uma mensagem…", sv: "Skriv ett meddelande…", sq: "Shkruaj një mesazh…" }, lang);
  const quickReplies = lang === "el"
    ? ["Ωράριο;", "Τιμές;", "Πώς κλείνω ραντεβού;", "Πού είστε;"]
    : ["What are your hours?", "How much is a cut?", "How do I book?", "Where are you?"];

  return (
    <>
      {/* Floating trigger */}
      <motion.button
        onClick={() => { setOpen((v) => !v); setUnread(0); }}
        aria-label={open ? "Close concierge" : "Open concierge"}
        initial={{ opacity: 0, scale: 0.8, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: 0.9, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        className="fixed z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] sm:bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))]"
        style={{
          right: "1.25rem",
          background: "var(--gold)",
          color: "var(--background)",
          boxShadow: "0 18px 40px -10px color-mix(in srgb, var(--gold) 55%, transparent), 0 4px 12px rgba(0,0,0,0.25)",
        }}
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M20 12c0-4.418-3.582-8-8-8s-8 3.582-8 8c0 1.584.46 3.06 1.254 4.303L4 20l3.817-1.244A7.96 7.96 0 0 0 12 20c4.418 0 8-3.582 8-8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="9" cy="12" r="1" fill="currentColor"/>
            <circle cx="12" cy="12" r="1" fill="currentColor"/>
            <circle cx="15" cy="12" r="1" fill="currentColor"/>
          </svg>
        )}
        {!open && unread > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold"
            style={{ background: "#e04d4d", color: "white", boxShadow: "0 0 0 2px var(--background)" }}
            aria-label={`${unread} unread messages`}
          >
            {unread > 9 ? "9+" : unread}
          </motion.span>
        )}
      </motion.button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="fixed z-40 flex flex-col bottom-[calc(9.25rem+env(safe-area-inset-bottom,0px))] sm:bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))]"
            style={{
              right: "1.25rem",
              width: "min(380px, calc(100vw - 2.5rem))",
              maxHeight: "min(580px, calc(100vh - 8rem))",
              background: "var(--background)",
              border: "1px solid var(--border-strong)",
              boxShadow: "0 40px 80px -20px rgba(0,0,0,0.6), 0 8px 24px rgba(0,0,0,0.35)",
              borderRadius: "16px",
              overflow: "hidden",
            }}
          >
            <div className="flex items-center justify-between px-4 py-3" style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full"
                  style={{ background: "var(--gold)", color: "var(--background)" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L3 8v8l9 6 9-6V8z"/></svg>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em]" style={{ color: "var(--gold)" }}>Concierge</p>
                  <p className="text-sm font-serif leading-tight" style={{ color: "var(--foreground)" }}>
                    {branding.wordmark || "Atelier"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={reset}
                  className="text-[10px] uppercase tracking-widest hover:underline"
                  style={{ color: "var(--muted-2)" }}
                >
                  {langPick({ en: "New", el: "Νέα", de: "Neu", fr: "Nouveau", it: "Nuova", es: "Nueva", nl: "Nieuw", pl: "Nowa", pt: "Nova", sv: "Ny", sq: "E re" }, lang)}
                </button>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {messages.length === 0 && (
                <>
                  <div className="rounded-2xl px-4 py-3 text-sm"
                    style={{ background: "var(--surface-strong)", color: "var(--foreground)" }}>
                    {greeting}
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {quickReplies.map((q) => (
                      <button
                        key={q}
                        onClick={() => askRaw(q)}
                        disabled={busy}
                        className="rounded-full border px-3 py-1 text-[11px] hover:bg-white/5 disabled:opacity-50"
                        style={{ borderColor: "var(--border-strong)", color: "var(--muted)" }}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {messages.map((m, i) => (
                <div key={i} className={`group flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className="max-w-[85%] space-y-2">
                    <div
                      className="rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed"
                      style={
                        m.role === "user"
                          ? { background: "var(--gold)", color: "var(--background)" }
                          : { background: "var(--surface-strong)", color: "var(--foreground)" }
                      }
                      dangerouslySetInnerHTML={{ __html: formatInline(m.content) }}
                    />
                    {m.actions && m.actions.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {m.actions.map((a) => (
                          <Link
                            key={a.href + a.label}
                            href={a.href}
                            target={a.href.startsWith("http") ? "_blank" : undefined}
                            rel={a.href.startsWith("http") ? "noreferrer" : undefined}
                            className="inline-flex items-center rounded-full px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-widest"
                            style={{ background: "var(--gold)", color: "var(--background)" }}
                          >
                            {a.label}
                          </Link>
                        ))}
                      </div>
                    )}
                    {m.role === "assistant" && m.content && (
                      <div className="flex items-center gap-3 pl-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={() => {
                            try {
                              navigator.clipboard.writeText(m.content.replace(/\*\*/g, ""));
                            } catch {}
                          }}
                          className="text-[10px] uppercase tracking-widest hover:underline"
                          style={{ color: "var(--muted-2)" }}
                          aria-label={langPick({ en: "Copy", el: "Αντιγραφή", de: "Kopieren", fr: "Copier", it: "Copia", es: "Copiar", nl: "Kopiëren", pl: "Kopiuj", pt: "Copiar", sv: "Kopiera", sq: "Kopjo" }, lang)}
                        >
                          {langPick({ en: "Copy", el: "Αντιγραφή", de: "Kopieren", fr: "Copier", it: "Copia", es: "Copiar", nl: "Kopiëren", pl: "Kopiuj", pt: "Copiar", sv: "Kopiera", sq: "Kopjo" }, lang)}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {busy && (
                <div className="flex justify-start">
                  <div className="rounded-2xl px-3.5 py-2.5" style={{ background: "var(--surface-strong)" }}>
                    <TypingDots />
                  </div>
                </div>
              )}

              {err && (
                <div className="rounded-lg border px-3 py-2 text-xs space-y-2"
                  style={{
                    borderColor: "color-mix(in srgb, #e04d4d 35%, transparent)",
                    background: "color-mix(in srgb, #e04d4d 10%, transparent)",
                    color: "#e89c9c",
                  }}>
                  <div>{err}</div>
                  {handoffAction() && (
                    <Link
                      href={handoffAction()!.href}
                      target={handoffAction()!.href.startsWith("http") ? "_blank" : undefined}
                      rel={handoffAction()!.href.startsWith("http") ? "noreferrer" : undefined}
                      className="inline-flex items-center rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-widest"
                      style={{ background: "var(--gold)", color: "var(--background)" }}
                    >
                      {langPick({ en: "Talk to a human", el: "Μίλησε με άνθρωπο", de: "Mit einem Menschen sprechen", fr: "Parler à un humain", it: "Parla con una persona", es: "Hablar con una persona", nl: "Praat met een mens", pl: "Porozmawiaj z człowiekiem", pt: "Falar com uma pessoa", sv: "Prata med en människa", sq: "Fol me një person" }, lang)} · {handoffAction()!.label}
                    </Link>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-end gap-2 px-3 py-3"
              style={{ borderTop: "1px solid var(--border)", background: "var(--surface)" }}>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
                }}
                rows={1}
                placeholder={placeholder}
                disabled={busy}
                className="flex-1 resize-none rounded-xl border px-3 py-2 text-sm outline-none disabled:opacity-50"
                style={{
                  background: "var(--background)",
                  borderColor: "var(--border-strong)",
                  color: "var(--foreground)",
                  maxHeight: "120px",
                }}
              />
              <button
                onClick={send}
                disabled={!input.trim() || busy}
                className="shrink-0 rounded-full px-4 py-2 text-[10px] font-semibold uppercase tracking-widest disabled:opacity-40"
                style={{ background: "var(--gold)", color: "var(--background)" }}
              >
                {busy ? "…" : langPick({ en: "Send", el: "Στείλε", de: "Senden", fr: "Envoyer", it: "Invia", es: "Enviar", nl: "Verzenden", pl: "Wyślij", pt: "Enviar", sv: "Skicka", sq: "Dërgo" }, lang)}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1.5 py-1.5">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ background: "var(--muted)" }}
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </span>
  );
}

// Tiny, safe inline formatter: **bold**, newlines → <br>. No HTML allowed in.
function formatInline(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  return escaped
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, "<br/>");
}
