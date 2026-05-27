"use client";

import { useEffect, useState } from "react";

type Svc = {
  id: string;
  tkey: string;
  name: string;
  name_el?: string;
  desc: string;
  desc_el?: string;
  duration: number;
  price: number;
  bufferMinutes?: number;
  fromPrice?: boolean;
  /** Optional fixed booking deposit. 0 = no deposit. */
  deposit?: number;
  requiresPatchTest?: boolean;
  /** Comma-separated service IDs offered as add-ons during booking. */
  addOnIds?: string[];
  category?: string;
  enabled: boolean;
  order: number;
};

const EMPTY: Svc = {
  id: "", tkey: "", name: "", desc: "", duration: 30, price: 0,
  bufferMinutes: 0, fromPrice: false,
  category: "", enabled: true, order: 0,
};

export default function ServicesPanel() {
  const [items, setItems] = useState<Svc[]>([]);
  const [draft, setDraft] = useState<Svc | null>(null);

  async function load() {
    const r = await fetch("/api/services/admin");
    const d = await r.json();
    setItems(d.services ?? []);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!draft) return;
    await fetch("/api/services/admin", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(draft),
    });
    setDraft(null);
    load();
  }
  async function remove(id: string) {
    if (!confirm("Delete this service?")) return;
    await fetch(`/api/services/admin?id=${id}`, { method: "DELETE" });
    load();
  }

  if (draft) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-serif text-2xl">{items.find((i) => i.id === draft.id) ? "Edit service" : "New service"}</h2>
          <button onClick={() => setDraft(null)} className="rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-widest text-white/70">Back</button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <F label="ID (slug)" value={draft.id} onChange={(v) => setDraft({ ...draft, id: v })} />
          <F label="Translation key" value={draft.tkey} onChange={(v) => setDraft({ ...draft, tkey: v })} />
          <F label="Name (EN)" value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} />
          <F label="Name (EL)" value={draft.name_el || ""} onChange={(v) => setDraft({ ...draft, name_el: v })} />
          <F label="Duration (min)" type="number" value={String(draft.duration)} onChange={(v) => setDraft({ ...draft, duration: Number(v) || 0 })} />
          <F label="Price ($)" type="number" value={String(draft.price)} onChange={(v) => setDraft({ ...draft, price: Number(v) || 0 })} />
          <F label="Buffer after (min)" type="number" value={String(draft.bufferMinutes ?? 0)} onChange={(v) => setDraft({ ...draft, bufferMinutes: Number(v) || 0 })} />
          <F label="Deposit ($, optional)" type="number" value={String(draft.deposit ?? 0)} onChange={(v) => setDraft({ ...draft, deposit: Number(v) || 0 })} />
          <F label="Category" value={draft.category || ""} onChange={(v) => setDraft({ ...draft, category: v })} />
          <F label="Order" type="number" value={String(draft.order)} onChange={(v) => setDraft({ ...draft, order: Number(v) || 0 })} />
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={!!draft.fromPrice} onChange={(e) => setDraft({ ...draft, fromPrice: e.target.checked })} />
            <span className="text-sm">Price is variable: show as "From $X"</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={!!draft.requiresPatchTest} onChange={(e) => setDraft({ ...draft, requiresPatchTest: e.target.checked })} />
            <span className="text-sm">Requires patch test (48h before, for new clients)</span>
          </label>
          <F
            label="Add-on service IDs (comma-separated)"
            value={(draft.addOnIds ?? []).join(", ")}
            onChange={(v) =>
              setDraft({
                ...draft,
                addOnIds: v.split(",").map((s) => s.trim()).filter(Boolean),
              })
            }
          />
          <F label="Description (EN)" value={draft.desc} onChange={(v) => setDraft({ ...draft, desc: v })} textarea />
          <F label="Description (EL)" value={draft.desc_el || ""} onChange={(v) => setDraft({ ...draft, desc_el: v })} textarea />
          <label className="flex items-center gap-2 sm:col-span-2">
            <input type="checkbox" checked={draft.enabled} onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })} />
            <span className="text-sm">Enabled (shown to customers)</span>
          </label>
        </div>
        <div className="mt-5 flex gap-3">
          <button onClick={save} className="rounded-full bg-[#c9a961] px-6 py-2.5 text-xs font-semibold uppercase tracking-widest text-black">Save</button>
          <button onClick={() => setDraft(null)} className="rounded-full border border-white/15 px-6 py-2.5 text-xs uppercase tracking-widest text-white/70">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-serif text-2xl">Services</h2>
        <button onClick={() => setDraft({ ...EMPTY, order: items.length })} className="rounded-full bg-[#c9a961] px-5 py-2 text-xs font-semibold uppercase tracking-widest text-black">+ Add service</button>
      </div>
      <div className="overflow-hidden rounded-2xl border border-white/10">
        {items.length === 0 ? <p className="p-6 text-center text-white/60">No services yet.</p> : items.map((s) => (
          <div key={s.id} className="flex flex-wrap items-center gap-3 border-b border-white/10 p-4 last:border-b-0">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{s.name} {!s.enabled && <span className="text-xs text-white/60">· disabled</span>}</p>
              <p className="text-xs text-white/50">${s.price} · {s.duration}m {s.category && `· ${s.category}`}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setDraft({ ...s })} className="rounded-full border border-white/15 px-3 py-1 text-xs uppercase tracking-widest text-white/80 hover:bg-white/10">Edit</button>
              <button onClick={() => remove(s.id)} className="rounded-full border border-red-400/40 px-3 py-1 text-xs uppercase tracking-widest text-red-300 hover:bg-red-500/10">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function F({ label, value, onChange, type = "text", textarea }: { label: string; value: string; onChange: (v: string) => void; type?: string; textarea?: boolean }) {
  return (
    <div>
      <label className="mb-1 block text-[10px] uppercase tracking-widest text-white/65">{label}</label>
      {textarea ? (
        <textarea rows={2} value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-white/40" />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-white/40" />
      )}
    </div>
  );
}
