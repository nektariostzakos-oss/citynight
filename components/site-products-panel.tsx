'use client';

// Phase I.6d — owner dashboard products CRUD panel.
//
// Table view + inline add form + per-row edit modal. Calls
// /api/sites/[id]/products[?productId] (GET/POST/PATCH/DELETE).
// Inline edits hit PATCH only with changed fields; the lib applies
// validation and surfaces structured errors (bad_slug / slug_taken /
// bad_price / etc.) which we map to friendly messages.

import { useEffect, useState, useTransition } from 'react';

type Product = {
  id: string;
  siteId: string;
  slug: string;
  name: string;
  category: string | null;
  shortDesc: string | null;
  longDesc: string | null;
  priceCents: number;
  currency: string;
  imageUrl: string | null;
  stock: number | null;
  featured: boolean;
  enabled: boolean;
  sortOrder: number;
};

type Labels = {
  heading: string;
  body: string;
  empty: string;
  loadError: string;
  addCta: string;
  columnName: string;
  columnPrice: string;
  columnStock: string;
  columnEnabled: string;
  columnActions: string;
  edit: string;
  remove: string;
  unlimited: string;
  saving: string;
  saved: string;
};

const ERR: Record<string, string> = {
  bad_slug: 'Slug must be lowercase letters, numbers, and hyphens.',
  slug_taken: 'A product already uses this slug.',
  bad_name: 'Name is required.',
  bad_price: 'Price must be a non-negative number.',
  bad_stock: 'Stock must be a non-negative integer (or blank for unlimited).',
};

export function SiteProductsPanel({ siteId, labels }: { siteId: string; labels: Labels }) {
  const [rows, setRows] = useState<Product[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Product | 'new' | null>(null);
  const [pending, startTransition] = useTransition();

  function load() {
    fetch(`/api/sites/${siteId}/products`, { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((d: { products: Product[] }) => { setRows(d.products); setError(null); })
      .catch(() => setError('load'));
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [siteId]);

  function remove(productId: string) {
    if (!confirm('Delete this product? This cannot be undone.')) return;
    startTransition(async () => {
      const res = await fetch(`/api/sites/${siteId}/products/${productId}`, {
        method: 'DELETE', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: '{}',
      });
      if (!res.ok) { setError('delete'); return; }
      load();
    });
  }

  function save(patch: Partial<Product> & { slug?: string; name?: string; priceCents?: number }) {
    const id = editing === 'new' ? null : editing?.id;
    startTransition(async () => {
      const res = await fetch(id ? `/api/sites/${siteId}/products/${id}` : `/api/sites/${siteId}/products`, {
        method: id ? 'PATCH' : 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? 'save');
        return;
      }
      setEditing(null);
      load();
    });
  }

  return (
    <section>
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-display text-xl font-semibold text-[var(--color-fg-0)]">{labels.heading}</h2>
        <button
          type="button"
          onClick={() => { setError(null); setEditing('new'); }}
          className="rounded-md border border-[var(--color-bg-3)] px-3 py-1.5 text-xs font-semibold text-[var(--color-fg-1)] hover:border-[var(--color-accent-cyan)] hover:text-[var(--color-accent-cyan)]"
        >
          + {labels.addCta}
        </button>
      </div>
      <p className="mt-1 text-sm text-[var(--color-fg-2)]">{labels.body}</p>

      <div className="mt-5">
        {rows === null && !error && <p className="text-sm text-[var(--color-fg-2)]">…</p>}
        {error && <p className="text-sm text-red-400">{ERR[error] ?? labels.loadError}</p>}
        {rows && rows.length === 0 && <p className="text-sm text-[var(--color-fg-2)]">{labels.empty}</p>}
        {rows && rows.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-[var(--color-bg-2)]">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--color-bg-1)] text-[var(--color-fg-2)]">
                <tr>
                  <th className="px-4 py-3 font-medium">{labels.columnName}</th>
                  <th className="px-4 py-3 font-medium">{labels.columnPrice}</th>
                  <th className="px-4 py-3 font-medium">{labels.columnStock}</th>
                  <th className="px-4 py-3 font-medium">{labels.columnEnabled}</th>
                  <th className="px-4 py-3 font-medium text-right">{labels.columnActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-bg-2)]">
                {rows.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 text-[var(--color-fg-0)]">
                      <div>{p.name}</div>
                      <div className="text-xs text-[var(--color-fg-2)]">/{p.slug}{p.category ? ` · ${p.category}` : ''}</div>
                    </td>
                    <td className="px-4 py-3 text-[var(--color-fg-1)]">{(p.priceCents / 100).toFixed(2)} {p.currency}</td>
                    <td className="px-4 py-3 text-[var(--color-fg-1)]">{p.stock === null ? labels.unlimited : p.stock}</td>
                    <td className="px-4 py-3"><EnabledPill enabled={p.enabled} /></td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button type="button" disabled={pending} onClick={() => { setError(null); setEditing(p); }} className="rounded border border-[var(--color-bg-3)] px-2 py-1 text-xs text-[var(--color-fg-1)] hover:border-[var(--color-accent-cyan)] hover:text-[var(--color-accent-cyan)]">{labels.edit}</button>
                        <button type="button" disabled={pending} onClick={() => remove(p.id)} className="rounded border border-red-500/40 px-2 py-1 text-xs text-red-400 hover:bg-red-500/10">{labels.remove}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <EditModal
          product={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSave={save}
          saving={pending}
          labels={labels}
        />
      )}
    </section>
  );
}

function EnabledPill({ enabled }: { enabled: boolean }) {
  return enabled ? (
    <span className="inline-flex items-center rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-400">on</span>
  ) : (
    <span className="inline-flex items-center rounded-full border border-[var(--color-bg-3)] bg-[var(--color-bg-1)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-fg-3)]">off</span>
  );
}

function EditModal({ product, onClose, onSave, saving, labels }: {
  product: Product | null;
  onClose: () => void;
  onSave: (p: Partial<Product> & { slug?: string; name?: string; priceCents?: number }) => void;
  saving: boolean;
  labels: Labels;
}) {
  const [slug, setSlug] = useState(product?.slug ?? '');
  const [name, setName] = useState(product?.name ?? '');
  const [category, setCategory] = useState(product?.category ?? '');
  const [shortDesc, setShortDesc] = useState(product?.shortDesc ?? '');
  const [priceEuros, setPriceEuros] = useState(product ? (product.priceCents / 100).toString() : '');
  const [stock, setStock] = useState<string>(product?.stock == null ? '' : String(product.stock));
  const [imageUrl, setImageUrl] = useState(product?.imageUrl ?? '');
  const [enabled, setEnabled] = useState(product?.enabled ?? true);
  const [featured, setFeatured] = useState(product?.featured ?? false);

  function submit() {
    const payload: Partial<Product> & { slug?: string; name?: string; priceCents?: number } = {
      slug: slug.trim(),
      name: name.trim(),
      category: category.trim() || null,
      shortDesc: shortDesc.trim() || null,
      priceCents: Math.round(parseFloat(priceEuros) * 100),
      stock: stock.trim() === '' ? null : parseInt(stock, 10),
      imageUrl: imageUrl.trim() || null,
      enabled, featured,
    };
    onSave(payload);
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-xl border border-[var(--color-bg-3)] bg-[var(--color-bg-0)] p-6 shadow-2xl">
        <h3 className="mb-4 font-display text-lg font-semibold text-[var(--color-fg-0)]">
          {product ? `Edit · ${product.name}` : 'New product'}
        </h3>
        <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="grid gap-4">
          <Row label="Name *">
            <input required type="text" maxLength={120} value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded border border-[var(--color-bg-3)] bg-[var(--color-bg-1)] p-2 text-sm text-[var(--color-fg-0)]" />
          </Row>
          <Row label="Slug *">
            <input required type="text" maxLength={80} value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="signature-pomade" className="w-full rounded border border-[var(--color-bg-3)] bg-[var(--color-bg-1)] p-2 text-sm text-[var(--color-fg-0)]" />
          </Row>
          <div className="grid grid-cols-2 gap-4">
            <Row label="Price * (€)">
              <input required type="number" step="0.01" min="0" value={priceEuros} onChange={(e) => setPriceEuros(e.target.value)} className="w-full rounded border border-[var(--color-bg-3)] bg-[var(--color-bg-1)] p-2 text-sm text-[var(--color-fg-0)]" />
            </Row>
            <Row label="Stock (blank = unlimited)">
              <input type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} className="w-full rounded border border-[var(--color-bg-3)] bg-[var(--color-bg-1)] p-2 text-sm text-[var(--color-fg-0)]" />
            </Row>
          </div>
          <Row label="Category">
            <input type="text" maxLength={80} value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded border border-[var(--color-bg-3)] bg-[var(--color-bg-1)] p-2 text-sm text-[var(--color-fg-0)]" />
          </Row>
          <Row label="Short description">
            <input type="text" maxLength={200} value={shortDesc} onChange={(e) => setShortDesc(e.target.value)} className="w-full rounded border border-[var(--color-bg-3)] bg-[var(--color-bg-1)] p-2 text-sm text-[var(--color-fg-0)]" />
          </Row>
          <Row label="Image URL">
            <input type="text" maxLength={500} value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" className="w-full rounded border border-[var(--color-bg-3)] bg-[var(--color-bg-1)] p-2 text-sm text-[var(--color-fg-0)]" />
          </Row>
          <div className="flex gap-6 text-sm text-[var(--color-fg-1)]">
            <label className="flex items-center gap-2"><input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /> Enabled</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} /> Featured</label>
          </div>
          <div className="mt-2 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded border border-[var(--color-bg-3)] px-4 py-2 text-sm text-[var(--color-fg-1)]">Cancel</button>
            <button type="submit" disabled={saving} className="rounded bg-[var(--color-accent-cyan)] px-4 py-2 text-sm font-semibold text-[var(--color-bg-0)] disabled:opacity-60">
              {saving ? labels.saving : labels.saved}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs text-[var(--color-fg-2)] mb-1">{label}</span>
      {children}
    </label>
  );
}
