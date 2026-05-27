'use client';

import { useState, useMemo } from 'react';
import {
  PALETTES, TYPE_PAIRS, HERO_LAYOUTS, DENSITIES, MOTIONS,
  DEFAULT_SECTION_ORDER, getPalette, getTypePair,
  type DesignParams, type PaletteId, type TypePairId, type HeroLayout,
  type Density, type Motion,
} from '@/lib/design-system';
import { venueStyleVars } from '@/lib/venue-style';

export type VenueDesignEditorLabels = {
  heading: string;
  body: string;
  palette: string;
  typePair: string;
  heroLayout: string;
  density: string;
  motion: string;
  save: string;
  saving: string;
  saved: string;
  error: string;
  reset: string;
  locked: string;
  aiPicked: string;
  fallback: string;
  preview: string;
  sampleHeading: string;
  sampleBody: string;
};

export type VenueDesignEditorProps = {
  venueId: string;
  /** Current resolved DesignParams the venue is rendering with. */
  initial: DesignParams;
  /** Whether the current design is owner-overridden (locked=1). */
  locked: boolean;
  /** Whether design_params is non-null in the DB. False = renderer is using fallback. */
  hasAiPick: boolean;
  labels: VenueDesignEditorLabels;
};

export function VenueDesignEditor({
  venueId, initial, locked, hasAiPick, labels,
}: VenueDesignEditorProps) {
  const [form, setForm] = useState<DesignParams>(initial);
  const [isLocked, setLocked] = useState(locked);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const styleVars = useMemo(() => venueStyleVars(form), [form]);
  const palette = getPalette(form.palette);
  const type = getTypePair(form.typePair);

  async function onSave() {
    setStatus('saving');
    const res = await fetch(`/api/venues/${venueId}/design`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...form, sectionOrder: form.sectionOrder ?? DEFAULT_SECTION_ORDER }),
    });
    if (res.ok) {
      setStatus('saved');
      setLocked(true);
    } else {
      setStatus('error');
    }
  }

  async function onReset() {
    setStatus('saving');
    const res = await fetch(`/api/venues/${venueId}/design`, { method: 'DELETE' });
    if (res.ok) {
      setStatus('saved');
      setLocked(false);
    } else {
      setStatus('error');
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-display text-xl font-semibold text-[var(--color-fg-0)]">
          {labels.heading}
        </h2>
        <p className="mt-1 text-sm text-[var(--color-fg-2)]">{labels.body}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.22em]">
          {isLocked ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-accent-pink)]/50 px-2.5 py-1 text-[var(--color-accent-pink)]">
              <Dot color="var(--color-accent-pink)" /> {labels.locked}
            </span>
          ) : hasAiPick ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-accent-cyan)]/50 px-2.5 py-1 text-[var(--color-accent-cyan)]">
              <Dot color="var(--color-accent-cyan)" /> {labels.aiPicked}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-bg-3)] px-2.5 py-1 text-[var(--color-fg-2)]">
              <Dot color="var(--color-fg-3)" /> {labels.fallback}
            </span>
          )}
        </div>
      </header>

      <div className="grid gap-5 sm:grid-cols-2">
        <Select
          label={labels.palette}
          value={form.palette}
          onChange={(v) => setForm({ ...form, palette: v as PaletteId })}
          options={PALETTES.map((p) => ({ value: p.id, label: p.name }))}
          swatch={palette.accent}
        />
        <Select
          label={labels.typePair}
          value={form.typePair}
          onChange={(v) => setForm({ ...form, typePair: v as TypePairId })}
          options={TYPE_PAIRS.map((t) => ({ value: t.id, label: t.name }))}
        />
        <Select
          label={labels.heroLayout}
          value={form.heroLayout}
          onChange={(v) => setForm({ ...form, heroLayout: v as HeroLayout })}
          options={HERO_LAYOUTS.map((h) => ({ value: h, label: h }))}
        />
        <Select
          label={labels.density}
          value={form.density}
          onChange={(v) => setForm({ ...form, density: v as Density })}
          options={DENSITIES.map((d) => ({ value: d, label: d }))}
        />
        <Select
          label={labels.motion}
          value={form.motion}
          onChange={(v) => setForm({ ...form, motion: v as Motion })}
          options={MOTIONS.map((m) => ({ value: m, label: m }))}
        />
      </div>

      {/* Mini preview — same CSS variables the real venue page uses, applied
          to a small frame so the owner can see palette + type + glow together
          before saving. Pure visual feedback; not a full hero render. */}
      <div
        style={styleVars}
        className="venue-panel relative overflow-hidden p-6"
        aria-label={labels.preview}
      >
        <p className="mb-3 text-[10px] uppercase tracking-[0.22em] text-[var(--color-fg-2)]">
          {labels.preview}
        </p>
        <span className="venue-chip">{palette.name} · {type.name}</span>
        <p className="venue-h1 mt-4 text-[var(--color-fg-0)]" style={{ fontSize: '2.5rem' }}>
          {labels.sampleHeading}
        </p>
        <p className="venue-body mt-3" style={{ fontSize: '0.95rem' }}>
          {labels.sampleBody}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <span className="venue-cta">{labels.save}</span>
          <span className="venue-cta-ghost">{labels.reset}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={status === 'saving'}
          className="rounded-md bg-[var(--color-accent-pink)] px-4 py-2 text-sm font-semibold text-[var(--color-bg-0)] shadow-[var(--shadow-glow-pink)] disabled:opacity-60"
        >
          {status === 'saving' ? labels.saving : labels.save}
        </button>
        {isLocked && (
          <button
            type="button"
            onClick={onReset}
            disabled={status === 'saving'}
            className="rounded-md border border-[var(--color-bg-3)] px-4 py-2 text-sm font-semibold text-[var(--color-fg-1)] hover:border-[var(--color-accent-cyan)] hover:text-[var(--color-accent-cyan)] disabled:opacity-60"
          >
            {labels.reset}
          </button>
        )}
        {status === 'saved' && <span className="text-sm text-[var(--color-success)]">{labels.saved}</span>}
        {status === 'error' && <span className="text-sm text-[var(--color-danger)]">{labels.error}</span>}
      </div>
    </div>
  );
}

function Select({
  label, value, onChange, options, swatch,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly { value: string; label: string }[];
  swatch?: string;
}) {
  return (
    <label className="block">
      <span className="flex items-center gap-2 text-xs uppercase tracking-widest text-[var(--color-fg-2)]">
        {swatch && (
          <span
            aria-hidden
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ background: swatch, boxShadow: `0 0 8px ${swatch}` }}
          />
        )}
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 block w-full rounded-md border border-[var(--color-bg-3)] bg-[var(--color-bg-1)] px-3 py-2 text-[var(--color-fg-0)] focus:border-[var(--color-accent-cyan)] focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

function Dot({ color }: { color: string }) {
  return <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: color }} />;
}
