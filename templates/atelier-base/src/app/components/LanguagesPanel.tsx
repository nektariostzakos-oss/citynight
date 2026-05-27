"use client";

import { useEffect, useState } from "react";
import { withBasePath } from "../../lib/basePath";

/**
 * Admin "Site Languages" panel. Operator-facing, English only.
 *
 * Lets the shop owner pick which languages visitors can switch between.
 * English is locked on. Saving PATCHes settings.json `enabledLanguages` via
 * /api/settings; `saveSettings` merges, so no other settings are touched.
 */

const LANGS: { code: string; flag: string; native: string; english: string }[] = [
  { code: "en", flag: "🇬🇧", native: "English", english: "English" },
  { code: "el", flag: "🇬🇷", native: "Ελληνικά", english: "Greek" },
  { code: "de", flag: "🇩🇪", native: "Deutsch", english: "German" },
  { code: "fr", flag: "🇫🇷", native: "Français", english: "French" },
  { code: "it", flag: "🇮🇹", native: "Italiano", english: "Italian" },
  { code: "es", flag: "🇪🇸", native: "Español", english: "Spanish" },
  { code: "nl", flag: "🇳🇱", native: "Nederlands", english: "Dutch" },
  { code: "pl", flag: "🇵🇱", native: "Polski", english: "Polish" },
  { code: "pt", flag: "🇵🇹", native: "Português", english: "Portuguese" },
  { code: "sv", flag: "🇸🇪", native: "Svenska", english: "Swedish" },
  { code: "sq", flag: "🇦🇱", native: "Shqip", english: "Albanian" },
];

type SaveState = { kind: "idle" | "saving" | "ok" | "error"; message: string };

export default function LanguagesPanel({ initial }: { initial?: string[] }) {
  const withEn = (l: string[]) => (l.includes("en") ? l : ["en", ...l]);
  const [selected, setSelected] = useState<string[]>(withEn(initial ?? ["en"]));
  const [state, setState] = useState<SaveState>({ kind: "idle", message: "" });

  // Rendered inside the Settings hub without a server-loaded `initial`; in
  // that case load the current language set once on mount.
  useEffect(() => {
    if (initial) return;
    fetch(withBasePath("/api/languages"))
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (Array.isArray(d?.enabled)) setSelected(withEn(d.enabled));
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggle(code: string) {
    if (code === "en") return;
    setSelected((s) =>
      s.includes(code) ? s.filter((c) => c !== code) : [...s, code],
    );
    setState({ kind: "idle", message: "" });
  }

  async function save() {
    setState({ kind: "saving", message: "" });
    try {
      const res = await fetch(withBasePath("/api/settings"), {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enabledLanguages: selected }),
      });
      if (res.ok) {
        setState({
          kind: "ok",
          message: "Saved. Changes take effect immediately for new visitors.",
        });
      } else {
        setState({ kind: "error", message: "Could not save. Try again." });
      }
    } catch {
      setState({ kind: "error", message: "Could not save. Try again." });
    }
  }

  return (
    <div>
      <p className="text-sm text-white/60">
        Choose which languages visitors can switch between in the site header.
        English is always on. The rest are optional.
      </p>

      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        {LANGS.map((l) => {
          const locked = l.code === "en";
          const checked = locked || selected.includes(l.code);
          return (
            <button
              key={l.code}
              type="button"
              onClick={() => toggle(l.code)}
              disabled={locked}
              aria-pressed={checked}
              className="flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors"
              style={{
                borderColor: checked ? "#c9a961" : "rgba(255,255,255,0.12)",
                background: checked ? "rgba(201,169,97,0.08)" : "transparent",
                cursor: locked ? "default" : "pointer",
              }}
            >
              <span
                aria-hidden="true"
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded border text-[11px] font-bold"
                style={{
                  borderColor: checked ? "#c9a961" : "rgba(255,255,255,0.3)",
                  background: checked ? "#c9a961" : "transparent",
                  color: "#0a0806",
                }}
              >
                {checked ? "✓" : ""}
              </span>
              <span className="text-xl" aria-hidden="true">{l.flag}</span>
              <span className="min-w-0">
                <span className="block text-sm text-white">{l.native}</span>
                <span className="block text-xs text-white/45">
                  {l.english}
                  {locked ? " · always on" : ""}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={save}
          disabled={state.kind === "saving"}
          className="rounded-full px-7 py-2.5 text-xs font-semibold uppercase tracking-widest transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: "#c9a961", color: "#0a0806" }}
        >
          {state.kind === "saving" ? "Saving…" : "Save languages"}
        </button>
        {state.kind === "ok" && (
          <span className="text-xs text-emerald-300">{state.message}</span>
        )}
        {state.kind === "error" && (
          <span className="text-xs text-red-300">{state.message}</span>
        )}
      </div>

      <p className="mt-4 text-xs text-white/40">
        Changes take effect immediately for new visitors.
      </p>
    </div>
  );
}
