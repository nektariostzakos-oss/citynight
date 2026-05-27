"use client";

import { useEffect, useRef, useState } from "react";
import { withBasePath } from "../../lib/basePath";
import type { Product } from "../../lib/products";
import ImagePicker from "./ImagePicker";

type Draft = Omit<Product, "id">;

const EMPTY: Draft = {
  slug: "",
  name_en: "",
  name_el: "",
  price: 0,
  category_en: "",
  category_el: "",
  shortDesc_en: "",
  shortDesc_el: "",
  longDesc_en: "",
  longDesc_el: "",
  image: "",
  stock: 0,
  featured: false,
};

export default function ProductsPanel() {
  const [items, setItems] = useState<Product[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function importCsv(file: File) {
    setMsg("Importing…");
    const text = await file.text();
    const r = await fetch("/api/products/import", {
      method: "POST",
      headers: { "content-type": "text/csv" },
      body: text,
    });
    const d = await r.json();
    if (!r.ok) {
      setMsg(d.error || "Import failed.");
      return;
    }
    setMsg(`Added ${d.added}, updated ${d.updated}, skipped ${d.skipped}.`);
    load();
  }

  async function load() {
    const r = await fetch("/api/products");
    const d = await r.json();
    setItems(d.products ?? []);
  }
  useEffect(() => {
    load();
  }, []);

  function startEdit(p: Product) {
    setCreating(false);
    setEditing(p.id);
    setDraft({ ...p });
  }
  function startCreate() {
    setCreating(true);
    setEditing(null);
    setDraft({ ...EMPTY });
  }
  function close() {
    setEditing(null);
    setCreating(false);
  }

  async function save() {
    setBusy(true);
    if (creating) {
      await fetch("/api/products", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(draft),
      });
    } else if (editing) {
      await fetch(`/api/products/${editing}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(draft),
      });
    }
    setBusy(false);
    close();
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this product?")) return;
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    load();
  }

  if (creating || editing) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-serif text-2xl">
            {creating ? "New product" : `Edit · ${draft.name_en}`}
          </h2>
          <button
            onClick={close}
            className="rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-widest text-white/70"
          >
            Back
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <F label="Slug (URL)" value={draft.slug} onChange={(v) => setDraft({ ...draft, slug: v })} />
          <F label="Price ($)" type="number" value={String(draft.price)} onChange={(v) => setDraft({ ...draft, price: Number(v) || 0 })} />
          <F label="Stock" type="number" value={String(draft.stock)} onChange={(v) => setDraft({ ...draft, stock: Number(v) || 0 })} />
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-widest text-white/65">
              Featured
            </label>
            <label className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                checked={draft.featured}
                onChange={(e) => setDraft({ ...draft, featured: e.target.checked })}
              />
              <span className="text-sm">Show on homepage</span>
            </label>
          </div>
          <F label="Name (EN)" value={draft.name_en} onChange={(v) => setDraft({ ...draft, name_en: v })} />
          <F label="Name (EL)" value={draft.name_el} onChange={(v) => setDraft({ ...draft, name_el: v })} />
          <F label="Category (EN)" value={draft.category_en} onChange={(v) => setDraft({ ...draft, category_en: v })} />
          <F label="Category (EL)" value={draft.category_el} onChange={(v) => setDraft({ ...draft, category_el: v })} />
          <F label="Short desc (EN)" value={draft.shortDesc_en} onChange={(v) => setDraft({ ...draft, shortDesc_en: v })} textarea />
          <F label="Short desc (EL)" value={draft.shortDesc_el} onChange={(v) => setDraft({ ...draft, shortDesc_el: v })} textarea />
          <F label="Long desc (EN)" value={draft.longDesc_en} onChange={(v) => setDraft({ ...draft, longDesc_en: v })} textarea rows={5} />
          <F label="Long desc (EL)" value={draft.longDesc_el} onChange={(v) => setDraft({ ...draft, longDesc_el: v })} textarea rows={5} />
        </div>
        <div className="mt-4">
          <ImagePicker label="Product image" preset="product" value={draft.image} onChange={(v) => setDraft({ ...draft, image: v })} />
        </div>
        <div className="mt-6 flex gap-3">
          <button
            onClick={save}
            disabled={busy || !draft.slug || !draft.name_en}
            className="rounded-full bg-[#c9a961] px-6 py-2.5 text-xs font-semibold uppercase tracking-widest text-black disabled:opacity-40"
          >
            {busy ? "Saving…" : "Save"}
          </button>
          <button
            onClick={close}
            className="rounded-full border border-white/15 px-6 py-2.5 text-xs uppercase tracking-widest text-white/70"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-2xl">Products</h2>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importCsv(f);
              e.target.value = "";
            }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="rounded-full border border-white/15 px-4 py-2 text-[10px] uppercase tracking-widest text-white/80 hover:bg-white/10"
          >
            Import CSV
          </button>
          <a
            href="/api/products/export"
            className="rounded-full border border-white/15 px-4 py-2 text-[10px] uppercase tracking-widest text-white/80 hover:bg-white/10"
          >
            Export CSV
          </a>
          <button
            onClick={startCreate}
            className="rounded-full bg-[#c9a961] px-5 py-2 text-xs font-semibold uppercase tracking-widest text-black"
          >
            + Add product
          </button>
        </div>
      </div>

      {msg && (
        <div className="mb-4 rounded-xl border border-white/15 bg-white/[0.04] p-3 text-sm text-white/80">
          {msg}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-white/10">
        {items.length === 0 ? (
          <p className="p-6 text-center text-white/60">No products yet.</p>
        ) : (
          items.map((p) => (
            <div
              key={p.id}
              className="flex flex-wrap items-center gap-3 border-b border-white/10 p-3 last:border-b-0 sm:flex-nowrap"
            >
              <img
                src={withBasePath(p.image)}
                alt=""
                className="h-14 w-14 shrink-0 rounded-lg border border-white/10 object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{p.name_en}</p>
                <p className="truncate text-xs text-white/50">
                  {p.category_en} · ${p.price} · stock {p.stock}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => startEdit(p)}
                  className="rounded-full border border-white/15 px-3 py-1 text-xs uppercase tracking-widest text-white/80 hover:bg-white/10"
                >
                  Edit
                </button>
                <button
                  onClick={() => remove(p.id)}
                  className="rounded-full border border-red-400/40 px-3 py-1 text-xs uppercase tracking-widest text-red-300 hover:bg-red-500/10"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function F({
  label,
  value,
  onChange,
  type = "text",
  textarea,
  rows = 2,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  textarea?: boolean;
  rows?: number;
}) {
  return (
    <div>
      <label className="mb-1 block text-[10px] uppercase tracking-widest text-white/65">
        {label}
      </label>
      {textarea ? (
        <textarea
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-white/40"
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-white/40"
        />
      )}
    </div>
  );
}
