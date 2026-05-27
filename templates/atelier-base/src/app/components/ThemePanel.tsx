"use client";

import { useEffect, useState } from "react";

type Theme = {
  background: string;
  foreground: string;
  primary: string;
  primaryAccent: string;
  surface: string;
  surfaceStrong: string;
  border: string;
  borderStrong: string;
  muted: string;
  muted2: string;
};

type Typography = { headingFont: FontChoice; bodyFont: FontChoice };
type FontChoice = "geist" | "inter" | "manrope" | "playfair" | "cormorant" | "fraunces";

const FONT_OPTIONS: { id: FontChoice; label: string; family: string }[] = [
  { id: "geist", label: "Geist", family: "var(--font-geist-sans)" },
  { id: "inter", label: "Inter", family: "var(--font-inter)" },
  { id: "manrope", label: "Manrope", family: "var(--font-manrope)" },
  { id: "playfair", label: "Playfair Display", family: "var(--font-playfair)" },
  { id: "cormorant", label: "Cormorant Garamond", family: "var(--font-cormorant)" },
  { id: "fraunces", label: "Fraunces", family: "var(--font-fraunces)" },
];

const DEFAULT_THEME: Theme = {
  background: "#0a0806",
  foreground: "#f5efe6",
  primary: "#c9a961",
  primaryAccent: "#d4b878",
  surface: "rgba(255, 255, 255, 0.03)",
  surfaceStrong: "rgba(255, 255, 255, 0.06)",
  border: "rgba(255, 255, 255, 0.1)",
  borderStrong: "rgba(255, 255, 255, 0.18)",
  muted: "rgba(245, 239, 230, 0.65)",
  muted2: "rgba(245, 239, 230, 0.45)",
};

const DARK_LAYERS = {
  surface: "rgba(255, 255, 255, 0.03)",
  surfaceStrong: "rgba(255, 255, 255, 0.07)",
  border: "rgba(255, 255, 255, 0.12)",
  borderStrong: "rgba(255, 255, 255, 0.22)",
} as const;
const LIGHT_LAYERS = {
  surface: "rgba(0, 0, 0, 0.04)",
  surfaceStrong: "rgba(0, 0, 0, 0.08)",
  border: "rgba(0, 0, 0, 0.1)",
  borderStrong: "rgba(0, 0, 0, 0.22)",
} as const;

function dark(fg: string): { muted: string; muted2: string } {
  const rgb = fg.startsWith("#")
    ? `${parseInt(fg.slice(1, 3), 16)}, ${parseInt(fg.slice(3, 5), 16)}, ${parseInt(fg.slice(5, 7), 16)}`
    : "255, 255, 255";
  return { muted: `rgba(${rgb}, 0.65)`, muted2: `rgba(${rgb}, 0.45)` };
}
function light(fg: string): { muted: string; muted2: string } {
  const rgb = fg.startsWith("#")
    ? `${parseInt(fg.slice(1, 3), 16)}, ${parseInt(fg.slice(3, 5), 16)}, ${parseInt(fg.slice(5, 7), 16)}`
    : "0, 0, 0";
  return { muted: `rgba(${rgb}, 0.7)`, muted2: `rgba(${rgb}, 0.5)` };
}

const PRESETS: { name: string; theme: Theme }[] = [
  { name: "Classic · gold on black", theme: DEFAULT_THEME },
  {
    name: "Bone & ink · light",
    theme: {
      background: "#f5ede2", foreground: "#1a1612",
      primary: "#8a6f33", primaryAccent: "#a5853b",
      ...LIGHT_LAYERS, ...light("#1a1612"),
    },
  },
  {
    name: "Midnight emerald",
    theme: {
      background: "#04100c", foreground: "#e8f0ea",
      primary: "#5eb894", primaryAccent: "#79cfac",
      ...DARK_LAYERS, ...dark("#e8f0ea"),
    },
  },
  {
    name: "Burgundy salon",
    theme: {
      background: "#150505", foreground: "#f4e8e0",
      primary: "#c85a5a", primaryAccent: "#e07878",
      ...DARK_LAYERS, ...dark("#f4e8e0"),
    },
  },
  {
    name: "Ocean slate",
    theme: {
      background: "#0a1218", foreground: "#e5eff5",
      primary: "#6aa0c4", primaryAccent: "#88bce0",
      ...DARK_LAYERS, ...dark("#e5eff5"),
    },
  },
  {
    name: "Champagne noir",
    theme: {
      background: "#0d0a07", foreground: "#f2e8d4",
      primary: "#d4b878", primaryAccent: "#ecd4a0",
      ...DARK_LAYERS, ...dark("#f2e8d4"),
    },
  },
  {
    name: "Copper dusk",
    theme: {
      background: "#1a0d08", foreground: "#f4e4d6",
      primary: "#c9663d", primaryAccent: "#e08855",
      ...DARK_LAYERS, ...dark("#f4e4d6"),
    },
  },
  {
    name: "Rose gold",
    theme: {
      background: "#140a0c", foreground: "#f5e4e2",
      primary: "#d89894", primaryAccent: "#eab4b0",
      ...DARK_LAYERS, ...dark("#f5e4e2"),
    },
  },
  {
    name: "Royal violet",
    theme: {
      background: "#0d081a", foreground: "#ebe3f5",
      primary: "#9d7ad4", primaryAccent: "#b89cec",
      ...DARK_LAYERS, ...dark("#ebe3f5"),
    },
  },
  {
    name: "Forest cabin",
    theme: {
      background: "#0c1208", foreground: "#e8e6d2",
      primary: "#a8b66a", primaryAccent: "#c2d088",
      ...DARK_LAYERS, ...dark("#e8e6d2"),
    },
  },
  {
    name: "Arctic steel · light",
    theme: {
      background: "#eef2f5", foreground: "#14202a",
      primary: "#3d7594", primaryAccent: "#5891b0",
      ...LIGHT_LAYERS, ...light("#14202a"),
    },
  },
  {
    name: "Desert sun · light",
    theme: {
      background: "#f6ece0", foreground: "#2a1608",
      primary: "#b54f1e", primaryAccent: "#d26a38",
      ...LIGHT_LAYERS, ...light("#2a1608"),
    },
  },
  {
    name: "Monochrome",
    theme: {
      background: "#000000", foreground: "#ffffff",
      primary: "#ffffff", primaryAccent: "#d4d4d4",
      surface: "rgba(255, 255, 255, 0.04)",
      surfaceStrong: "rgba(255, 255, 255, 0.09)",
      border: "rgba(255, 255, 255, 0.15)",
      borderStrong: "rgba(255, 255, 255, 0.3)",
      ...dark("#ffffff"),
    },
  },
  {
    name: "Sapphire moon",
    theme: {
      background: "#050b1f", foreground: "#dfe6f5",
      primary: "#b8c5e0", primaryAccent: "#d6dff0",
      ...DARK_LAYERS, ...dark("#dfe6f5"),
    },
  },
];

const COLOR_ROWS: { key: keyof Theme; label: string; hint: string }[] = [
  { key: "background", label: "Background", hint: "Page base" },
  { key: "foreground", label: "Foreground", hint: "Default text" },
  { key: "primary", label: "Primary", hint: "Accent / brand" },
  { key: "primaryAccent", label: "Primary light", hint: "Hover / highlight" },
  { key: "surface", label: "Surface", hint: "Cards · base" },
  { key: "surfaceStrong", label: "Surface strong", hint: "Cards · raised" },
  { key: "border", label: "Border", hint: "Default border" },
  { key: "borderStrong", label: "Border strong", hint: "Emphasis border" },
  { key: "muted", label: "Muted", hint: "Secondary text" },
  { key: "muted2", label: "Muted soft", hint: "Tertiary text" },
];

export default function ThemePanel() {
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);
  const [typography, setTypography] = useState<Typography>({ headingFont: "playfair", bodyFont: "geist" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const r = await fetch("/api/settings");
    if (r.ok) {
      const d = await r.json();
      if (d.settings.theme) setTheme({ ...DEFAULT_THEME, ...d.settings.theme });
      if (d.settings.typography) setTypography(d.settings.typography);
    }
  }
  useEffect(() => { load(); }, []);

  // live preview — set CSS vars on :root while editing
  useEffect(() => {
    const r = document.documentElement;
    r.style.setProperty("--background", theme.background);
    r.style.setProperty("--foreground", theme.foreground);
    r.style.setProperty("--gold", theme.primary);
    r.style.setProperty("--gold-2", theme.primaryAccent);
    r.style.setProperty("--surface", theme.surface);
    r.style.setProperty("--surface-strong", theme.surfaceStrong);
    r.style.setProperty("--border", theme.border);
    r.style.setProperty("--border-strong", theme.borderStrong);
    r.style.setProperty("--muted", theme.muted);
    r.style.setProperty("--muted-2", theme.muted2);
  }, [theme]);

  useEffect(() => {
    const r = document.documentElement;
    const head = FONT_OPTIONS.find((f) => f.id === typography.headingFont)?.family;
    const body = FONT_OPTIONS.find((f) => f.id === typography.bodyFont)?.family;
    if (head) r.style.setProperty("--font-heading", head);
    if (body) r.style.setProperty("--font-body", body);
  }, [typography]);

  async function save() {
    setSaving(true);
    setMsg(null);
    const r = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ theme, typography }),
    });
    setSaving(false);
    setMsg(r.ok ? "Saved. Reload to persist across pages." : "Save failed.");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-2xl">Theme & typography</h2>
        <div className="flex items-center gap-2">
          {msg && <span className="text-xs text-white/60">{msg}</span>}
          <button
            onClick={() => {
              if (!confirm("Reset theme and fonts to the factory defaults?")) return;
              setTheme(DEFAULT_THEME);
              setTypography({ headingFont: "playfair", bodyFont: "geist" });
              setMsg("Defaults loaded. Click Save to persist.");
            }}
            className="rounded-full border border-white/15 px-5 py-2 text-xs uppercase tracking-widest text-white/80 hover:bg-white/10"
          >
            Reset to defaults
          </button>
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-white/15 px-5 py-2 text-xs uppercase tracking-widest text-white/80 hover:bg-white/10"
          >
            Open site ↗
          </a>
          <button
            onClick={save}
            disabled={saving}
            className="rounded-full bg-[#c9a961] px-6 py-2 text-xs font-semibold uppercase tracking-widest text-black disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      <LivePreview theme={theme} typography={typography} />


      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-widest text-white/70">Presets</h3>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() => setTheme(p.theme)}
              className="group flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
            >
              <span className="h-4 w-4 rounded-full border border-white/20" style={{ background: p.theme.background }} />
              <span className="h-4 w-4 rounded-full border border-white/20" style={{ background: p.theme.primary }} />
              {p.name}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-widest text-white/70">Colors</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {COLOR_ROWS.map((row) => (
            <ColorRow
              key={row.key}
              label={row.label}
              hint={row.hint}
              value={theme[row.key]}
              onChange={(v) => setTheme({ ...theme, [row.key]: v })}
            />
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-widest text-white/70">Typography</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <FontSelect
            label="Heading font"
            value={typography.headingFont}
            onChange={(v) => setTypography({ ...typography, headingFont: v })}
          />
          <FontSelect
            label="Body font"
            value={typography.bodyFont}
            onChange={(v) => setTypography({ ...typography, bodyFont: v })}
          />
        </div>
        <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-5">
          <p className="text-[10px] uppercase tracking-widest" style={{ color: "var(--gold)" }}>Preview</p>
          <h1
            className="mt-2 text-4xl"
            style={{ fontFamily: FONT_OPTIONS.find((f) => f.id === typography.headingFont)?.family }}
          >
            The quick brown fox jumps
          </h1>
          <p
            className="mt-3 text-sm opacity-80"
            style={{ fontFamily: FONT_OPTIONS.find((f) => f.id === typography.bodyFont)?.family }}
          >
            Body text uses your selected body font. Pack my box with five dozen liquor jugs. This sentence
            contains every letter of the alphabet so you can judge how the font sets a paragraph.
          </p>
        </div>
      </section>
    </div>
  );
}

function ColorRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const isRgba = value.startsWith("rgba") || value.startsWith("rgb");
  const hex = isRgba ? rgbaToHex(value) : value;
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <input
        type="color"
        value={hex || "#000000"}
        onChange={(e) => onChange(isRgba ? hexToRgba(e.target.value, alphaOf(value) ?? 1) : e.target.value)}
        className="h-10 w-10 shrink-0 cursor-pointer rounded border border-white/10 bg-transparent"
      />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-white/85">{label}</p>
        <p className="text-[10px] uppercase tracking-widest text-white/60">{hint}</p>
      </div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-36 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs font-mono outline-none focus:border-white/40"
      />
    </div>
  );
}

function FontSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: FontChoice;
  onChange: (v: FontChoice) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-[10px] uppercase tracking-widest text-white/65">{label}</label>
      <div className="grid gap-2">
        {FONT_OPTIONS.map((f) => (
          <button
            key={f.id}
            onClick={() => onChange(f.id)}
            className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors ${
              value === f.id ? "border-[#c9a961] bg-[#c9a961]/10" : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"
            }`}
          >
            <span className="text-lg" style={{ fontFamily: f.family }}>
              {f.label}
            </span>
            <span className="text-xs text-white/60" style={{ fontFamily: f.family }}>
              Aa 123
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function LivePreview({ theme, typography }: { theme: Theme; typography: Typography }) {
  const headingFamily = FONT_OPTIONS.find((f) => f.id === typography.headingFont)?.family;
  const bodyFamily = FONT_OPTIONS.find((f) => f.id === typography.bodyFont)?.family;
  return (
    <section
      className="overflow-hidden rounded-2xl border"
      style={{
        background: theme.background,
        color: theme.foreground,
        borderColor: theme.borderStrong,
        fontFamily: bodyFamily,
      }}
    >
      <div className="flex items-center justify-between border-b px-6 py-3" style={{ borderColor: theme.border }}>
        <div className="flex items-center gap-3">
          <span className="text-[10px] uppercase tracking-[0.4em]" style={{ color: theme.primary }}>
            Live preview
          </span>
          <span className="text-xs" style={{ color: theme.muted }}>
            Updates as you edit · Click Save to persist
          </span>
        </div>
        <div className="flex gap-4 text-[10px] uppercase tracking-widest" style={{ color: theme.muted }}>
          <span>Services</span><span>Shop</span><span>Contact</span>
        </div>
      </div>

      <div className="px-6 py-10 sm:px-10 sm:py-14">
        <p className="text-[10px] uppercase tracking-[0.4em]" style={{ color: theme.primary }}>
          Barber · Loutraki
        </p>
        <h1
          className="mt-3 text-4xl sm:text-5xl leading-[1.1]"
          style={{ fontFamily: headingFamily, color: theme.foreground }}
        >
          A sharper look, every visit.
        </h1>
        <p className="mt-4 max-w-xl text-sm sm:text-base" style={{ color: theme.muted }}>
          Classic grooming in the heart of the city. Book a chair, grab a coffee, walk out
          feeling like a new version of yourself.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            className="rounded-full px-6 py-2.5 text-xs font-semibold uppercase tracking-widest transition-opacity hover:opacity-90"
            style={{ background: theme.primary, color: theme.background }}
          >
            Book now
          </button>
          <button
            className="rounded-full border px-6 py-2.5 text-xs font-semibold uppercase tracking-widest"
            style={{ borderColor: theme.borderStrong, color: theme.foreground }}
          >
            Services →
          </button>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[
            { title: "Men's Cut", price: "$12", duration: "30 min" },
            { title: "Beard Sculpt", price: "$10", duration: "20 min" },
            { title: "Full Grooming", price: "$18", duration: "60 min" },
          ].map((s) => (
            <div
              key={s.title}
              className="rounded-xl border p-5 transition-colors"
              style={{ background: theme.surface, borderColor: theme.border }}
            >
              <p className="text-[10px] uppercase tracking-widest" style={{ color: theme.primary }}>
                {s.duration}
              </p>
              <h3 className="mt-2 text-lg" style={{ fontFamily: headingFamily, color: theme.foreground }}>
                {s.title}
              </h3>
              <p className="mt-1 text-xs" style={{ color: theme.muted2 }}>
                Classic finish with hot towel.
              </p>
              <p className="mt-3 text-2xl" style={{ fontFamily: headingFamily, color: theme.primaryAccent }}>
                {s.price}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function alphaOf(rgba: string): number | null {
  const m = rgba.match(/rgba?\([^)]+\)/);
  if (!m) return null;
  const parts = m[0].replace(/rgba?\(|\)/g, "").split(",").map((s) => s.trim());
  return parts.length === 4 ? Number(parts[3]) : 1;
}

function rgbaToHex(rgba: string): string {
  const parts = rgba.replace(/rgba?\(|\)/g, "").split(",").map((s) => s.trim());
  const r = Number(parts[0]) || 0;
  const g = Number(parts[1]) || 0;
  const b = Number(parts[2]) || 0;
  const h = (n: number) => n.toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

function hexToRgba(hex: string, a: number): string {
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
