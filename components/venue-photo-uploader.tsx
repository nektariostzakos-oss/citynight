'use client';

import { useEffect, useRef, useState } from 'react';

export type Photo = { id: string; url: string; isPrimary: boolean; sortOrder: number };

export type VenuePhotoUploaderLabels = {
  heading: string;
  body: string;
  upload: string;
  uploading: string;
  remove: string;
  setPrimary: string;
  primary: string;
  moveUp: string;
  moveDown: string;
  empty: string;
  errorTooLarge: string;
  errorType: string;
  errorGeneric: string;
  hint: string;
  /** Template string with `{n}` placeholder — e.g. `"up to {n} photos"`. */
  maxNoticeTpl: string;
};

export function VenuePhotoUploader({
  venueId, endpointBase, initial, max = 40, labels,
}: {
  venueId: string;
  /** Override endpoint base — e.g. `/api/sites/${siteId}/photos` for the SaaS dashboard. */
  endpointBase?: string;
  initial: readonly Photo[];
  max?: number;
  labels: VenuePhotoUploaderLabels;
}) {
  const baseUrl = endpointBase ?? `/api/venues/${venueId}/photos`;
  const [photos, setPhotos] = useState<Photo[]>([...initial]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Stable signature for the photos so we only persist a reorder when the
  // user actually reordered, not on every render.
  const lastPersistedRef = useRef<string>('');
  useEffect(() => {
    lastPersistedRef.current = signaturize(photos);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function persistOrder(next: Photo[]) {
    const sig = signaturize(next);
    if (sig === lastPersistedRef.current) return;
    const primaryId = next.find((p) => p.isPrimary)?.id ?? null;
    const res = await fetch(`${baseUrl}/reorder`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ids: next.map((p) => p.id), primaryId }),
    });
    if (res.ok) lastPersistedRef.current = sig;
  }

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setBusy(true); setError(null);
    try {
      for (const file of files) {
        if (photos.length >= max) break;
        if (file.size > 5 * 1024 * 1024) { setError(labels.errorTooLarge); continue; }
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
          setError(labels.errorType); continue;
        }
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch(baseUrl, {
          method: 'POST',
          body: fd,
        });
        if (!res.ok) { setError(labels.errorGeneric); continue; }
        const data = (await res.json()) as { id: string; url: string };
        setPhotos((p) => [...p, { id: data.id, url: data.url, isPrimary: false, sortOrder: p.length }]);
      }
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function remove(id: string) {
    const res = await fetch(`${baseUrl}/${id}`, { method: 'DELETE' });
    if (res.ok) setPhotos((p) => p.filter((x) => x.id !== id));
  }

  function move(i: number, dir: -1 | 1) {
    setPhotos((p) => {
      const j = i + dir;
      if (j < 0 || j >= p.length) return p;
      const next = p.slice();
      const a = next[i], b = next[j];
      if (!a || !b) return p;
      next[i] = b; next[j] = a;
      void persistOrder(next);
      return next;
    });
  }

  function makePrimary(id: string) {
    setPhotos((p) => {
      const next = p.map((x) => ({ ...x, isPrimary: x.id === id }));
      void persistOrder(next);
      return next;
    });
  }

  const atCap = photos.length >= max;

  return (
    <section>
      <h2 className="font-display text-xl font-semibold text-[var(--color-fg-0)]">{labels.heading}</h2>
      <p className="mt-1 text-sm text-[var(--color-fg-2)]">{labels.body}</p>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={onPick}
          disabled={busy || atCap}
          className="hidden"
          id={`photo-upload-${venueId}`}
        />
        <label
          htmlFor={`photo-upload-${venueId}`}
          className={`inline-flex cursor-pointer items-center gap-2 rounded-md bg-[var(--color-accent-pink)] px-4 py-2 text-sm font-semibold text-[var(--color-bg-0)] shadow-[var(--shadow-glow-pink)] ${
            busy || atCap ? 'pointer-events-none opacity-60' : ''
          }`}
        >
          {busy ? labels.uploading : labels.upload}
        </label>
        <p className="text-xs text-[var(--color-fg-3)]">{labels.hint} · {labels.maxNoticeTpl.replace('{n}', String(max))}</p>
        {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
      </div>

      {photos.length === 0 ? (
        <p className="mt-5 rounded-lg border border-dashed border-[var(--color-bg-3)] p-5 text-sm text-[var(--color-fg-2)]">
          {labels.empty}
        </p>
      ) : (
        <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((p, i) => (
            <li key={p.id} className="group relative">
              <div className={`relative aspect-[4/5] overflow-hidden rounded-md border ${p.isPrimary ? 'border-[var(--color-accent-pink)]' : 'border-[var(--color-bg-2)]'}`}>
                {/* Plain <img> instead of next/image — we already cache-control:
                    immutable on /api/uploads/* and don't need next's optimisation
                    pipeline for a small admin dashboard surface. */}
                <img src={p.url} alt="" className="h-full w-full object-cover" />
                {p.isPrimary && (
                  <span className="absolute left-2 top-2 rounded-full bg-[var(--color-accent-pink)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-bg-0)]">
                    {labels.primary}
                  </span>
                )}
              </div>
              <div className="mt-2 flex items-center gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => makePrimary(p.id)}
                  disabled={p.isPrimary}
                  className="rounded border border-[var(--color-bg-3)] px-2 py-0.5 text-[var(--color-fg-2)] hover:border-[var(--color-accent-pink)] hover:text-[var(--color-accent-pink)] disabled:opacity-40"
                >
                  {labels.setPrimary}
                </button>
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label={labels.moveUp}
                  className="rounded border border-[var(--color-bg-3)] px-2 py-0.5 text-[var(--color-fg-2)] hover:text-[var(--color-fg-0)] disabled:opacity-40"
                >↑</button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === photos.length - 1}
                  aria-label={labels.moveDown}
                  className="rounded border border-[var(--color-bg-3)] px-2 py-0.5 text-[var(--color-fg-2)] hover:text-[var(--color-fg-0)] disabled:opacity-40"
                >↓</button>
                <button
                  type="button"
                  onClick={() => remove(p.id)}
                  aria-label={labels.remove}
                  className="ml-auto rounded border border-[var(--color-bg-3)] px-2 py-0.5 text-[var(--color-fg-2)] hover:border-[var(--color-danger)] hover:text-[var(--color-danger)]"
                >✕</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function signaturize(p: readonly Photo[]): string {
  return p.map((x) => `${x.id}:${x.isPrimary ? 1 : 0}`).join(',');
}
