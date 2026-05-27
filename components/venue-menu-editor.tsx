'use client';

import { useState } from 'react';

export type VenueMenuEditorLabels = {
  heading: string;
  body: string;
  addSection: string;
  addItem: string;
  sectionName: string;
  sectionDesc: string;
  itemName: string;
  itemDesc: string;
  itemPrice: string;
  remove: string;
  moveUp: string;
  moveDown: string;
  flagPopular: string;
  flagVegetarian: string;
  flagVegan: string;
  flagGlutenFree: string;
  save: string;
  saving: string;
  saved: string;
  error: string;
  emptyMenu: string;
};

export type MenuEditorItem = {
  id?: string;
  name: string;
  description: string;
  price: string;
  isPopular: boolean;
  isVegetarian: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
};

export type MenuEditorSection = {
  id?: string;
  name: string;
  description: string;
  items: MenuEditorItem[];
};

export function VenueMenuEditor({
  venueId, endpoint, initial, labels,
}: {
  venueId: string;
  /** Override save endpoint for the SaaS dashboard. */
  endpoint?: string;
  initial: MenuEditorSection[];
  labels: VenueMenuEditorLabels;
}) {
  const [sections, setSections] = useState<MenuEditorSection[]>(initial);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const saveUrl = endpoint ?? `/api/venues/${venueId}/menu`;

  function patchSection(i: number, patch: Partial<MenuEditorSection>) {
    setSections((s) => s.map((sec, idx) => (idx === i ? { ...sec, ...patch } : sec)));
  }
  function removeSection(i: number) {
    setSections((s) => s.filter((_, idx) => idx !== i));
  }
  function addSection() {
    setSections((s) => [...s, { name: '', description: '', items: [] }]);
  }
  function patchItem(secIdx: number, itemIdx: number, patch: Partial<MenuEditorItem>) {
    setSections((s) => s.map((sec, sIdx) => {
      if (sIdx !== secIdx) return sec;
      return { ...sec, items: sec.items.map((it, iIdx) => (iIdx === itemIdx ? { ...it, ...patch } : it)) };
    }));
  }
  function removeItem(secIdx: number, itemIdx: number) {
    setSections((s) => s.map((sec, sIdx) =>
      sIdx === secIdx ? { ...sec, items: sec.items.filter((_, iIdx) => iIdx !== itemIdx) } : sec));
  }
  function addItem(secIdx: number) {
    setSections((s) => s.map((sec, sIdx) =>
      sIdx === secIdx
        ? { ...sec, items: [...sec.items, blankItem()] }
        : sec));
  }
  function moveItem(secIdx: number, itemIdx: number, direction: -1 | 1) {
    setSections((s) => s.map((sec, sIdx) => {
      if (sIdx !== secIdx) return sec;
      const j = itemIdx + direction;
      if (j < 0 || j >= sec.items.length) return sec;
      const copy = sec.items.slice();
      const a = copy[itemIdx], b = copy[j];
      if (!a || !b) return sec;
      copy[itemIdx] = b; copy[j] = a;
      return { ...sec, items: copy };
    }));
  }

  async function onSave() {
    setStatus('saving'); setErrorMsg(null);
    // Drop empty rows on save so the owner doesn't have to clean up after
    // exploratory clicks. Server-side validators still reject blanks.
    const payload = {
      sections: sections
        .filter((s) => s.name.trim().length > 0)
        .map((s) => ({
          id: s.id,
          name: s.name.trim(),
          description: s.description.trim() || null,
          items: s.items
            .filter((it) => it.name.trim().length > 0)
            .map((it) => ({
              id: it.id,
              name: it.name.trim(),
              description: it.description.trim() || null,
              price: it.price.trim() || null,
              isPopular: it.isPopular,
              isVegetarian: it.isVegetarian,
              isVegan: it.isVegan,
              isGlutenFree: it.isGlutenFree,
            })),
        })),
    };
    const res = await fetch(saveUrl, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) { setStatus('saved'); return; }
    setStatus('error');
    setErrorMsg(await res.text().catch(() => labels.error));
  }

  return (
    <section>
      <h2 className="font-display text-xl font-semibold text-[var(--color-fg-0)]">{labels.heading}</h2>
      <p className="mt-1 text-sm text-[var(--color-fg-2)]">{labels.body}</p>

      {sections.length === 0 && (
        <p className="mt-6 rounded-lg border border-dashed border-[var(--color-bg-3)] p-5 text-sm text-[var(--color-fg-2)]">
          {labels.emptyMenu}
        </p>
      )}

      <div className="mt-6 space-y-6">
        {sections.map((sec, sIdx) => (
          <div key={sec.id ?? `new-${sIdx}`} className="rounded-lg border border-[var(--color-bg-2)] bg-[var(--color-bg-1)] p-4">
            <div className="flex items-start gap-3">
              <div className="flex-1 space-y-3">
                <input
                  type="text"
                  placeholder={labels.sectionName}
                  value={sec.name}
                  onChange={(e) => patchSection(sIdx, { name: e.target.value })}
                  className="block w-full rounded-md border border-[var(--color-bg-3)] bg-[var(--color-bg-0)] px-3 py-2 font-display text-lg font-semibold text-[var(--color-fg-0)] focus:border-[var(--color-accent-cyan)] focus:outline-none"
                />
                <input
                  type="text"
                  placeholder={labels.sectionDesc}
                  value={sec.description}
                  onChange={(e) => patchSection(sIdx, { description: e.target.value })}
                  className="block w-full rounded-md border border-[var(--color-bg-3)] bg-[var(--color-bg-0)] px-3 py-2 text-sm text-[var(--color-fg-0)] focus:border-[var(--color-accent-cyan)] focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => removeSection(sIdx)}
                className="rounded-md border border-[var(--color-bg-3)] px-2 py-1 text-xs text-[var(--color-fg-2)] hover:border-[var(--color-danger)] hover:text-[var(--color-danger)]"
                aria-label={labels.remove}
              >
                ✕
              </button>
            </div>

            <ul className="mt-4 space-y-3">
              {sec.items.map((it, iIdx) => (
                <li key={it.id ?? `new-${iIdx}`} className="rounded-md border border-[var(--color-bg-2)] bg-[var(--color-bg-0)] p-3">
                  <div className="flex items-start gap-2">
                    <div className="grid flex-1 gap-2 sm:grid-cols-[1.4fr_2fr_0.6fr]">
                      <input
                        type="text"
                        placeholder={labels.itemName}
                        value={it.name}
                        onChange={(e) => patchItem(sIdx, iIdx, { name: e.target.value })}
                        className="rounded-md border border-[var(--color-bg-3)] bg-[var(--color-bg-1)] px-2 py-1.5 text-sm text-[var(--color-fg-0)] focus:border-[var(--color-accent-cyan)] focus:outline-none"
                      />
                      <input
                        type="text"
                        placeholder={labels.itemDesc}
                        value={it.description}
                        onChange={(e) => patchItem(sIdx, iIdx, { description: e.target.value })}
                        className="rounded-md border border-[var(--color-bg-3)] bg-[var(--color-bg-1)] px-2 py-1.5 text-sm text-[var(--color-fg-1)] focus:border-[var(--color-accent-cyan)] focus:outline-none"
                      />
                      <input
                        type="text"
                        placeholder={labels.itemPrice}
                        value={it.price}
                        onChange={(e) => patchItem(sIdx, iIdx, { price: e.target.value })}
                        className="rounded-md border border-[var(--color-bg-3)] bg-[var(--color-bg-1)] px-2 py-1.5 text-sm text-[var(--color-fg-0)] focus:border-[var(--color-accent-cyan)] focus:outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => moveItem(sIdx, iIdx, -1)}
                        disabled={iIdx === 0}
                        aria-label={labels.moveUp}
                        className="h-6 w-6 rounded-md border border-[var(--color-bg-3)] text-xs text-[var(--color-fg-2)] hover:text-[var(--color-fg-0)] disabled:opacity-30"
                      >↑</button>
                      <button
                        type="button"
                        onClick={() => moveItem(sIdx, iIdx, 1)}
                        disabled={iIdx === sec.items.length - 1}
                        aria-label={labels.moveDown}
                        className="h-6 w-6 rounded-md border border-[var(--color-bg-3)] text-xs text-[var(--color-fg-2)] hover:text-[var(--color-fg-0)] disabled:opacity-30"
                      >↓</button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(sIdx, iIdx)}
                      aria-label={labels.remove}
                      className="h-6 w-6 rounded-md border border-[var(--color-bg-3)] text-xs text-[var(--color-fg-2)] hover:border-[var(--color-danger)] hover:text-[var(--color-danger)]"
                    >✕</button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs">
                    <FlagToggle label={labels.flagPopular}      value={it.isPopular}     onChange={(v) => patchItem(sIdx, iIdx, { isPopular: v })} />
                    <FlagToggle label={labels.flagVegetarian}   value={it.isVegetarian}  onChange={(v) => patchItem(sIdx, iIdx, { isVegetarian: v })} />
                    <FlagToggle label={labels.flagVegan}        value={it.isVegan}       onChange={(v) => patchItem(sIdx, iIdx, { isVegan: v })} />
                    <FlagToggle label={labels.flagGlutenFree}   value={it.isGlutenFree}  onChange={(v) => patchItem(sIdx, iIdx, { isGlutenFree: v })} />
                  </div>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={() => addItem(sIdx)}
              className="mt-3 text-sm text-[var(--color-accent-cyan)] hover:underline"
            >
              + {labels.addItem}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={addSection}
          className="rounded-md border border-[var(--color-bg-3)] px-3 py-2 text-sm text-[var(--color-fg-1)] hover:border-[var(--color-accent-cyan)] hover:text-[var(--color-accent-cyan)]"
        >
          + {labels.addSection}
        </button>
        <div className="flex items-center gap-3">
          {status === 'saved' && <span className="text-sm text-[var(--color-success)]">{labels.saved}</span>}
          {status === 'error' && <span className="text-sm text-[var(--color-danger)]">{errorMsg ?? labels.error}</span>}
          <button
            type="button"
            onClick={onSave}
            disabled={status === 'saving'}
            className="rounded-md bg-[var(--color-accent-pink)] px-4 py-2 text-sm font-semibold text-[var(--color-bg-0)] shadow-[var(--shadow-glow-pink)] disabled:opacity-60"
          >
            {status === 'saving' ? labels.saving : labels.save}
          </button>
        </div>
      </div>
    </section>
  );
}

function FlagToggle({
  label, value, onChange,
}: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-1.5">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 accent-[var(--color-accent-pink)]"
      />
      <span className={value ? 'text-[var(--color-fg-0)]' : 'text-[var(--color-fg-3)]'}>{label}</span>
    </label>
  );
}

function blankItem(): MenuEditorItem {
  return { name: '', description: '', price: '', isPopular: false, isVegetarian: false, isVegan: false, isGlutenFree: false };
}
