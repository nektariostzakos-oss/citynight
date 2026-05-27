"use client";

import { useEffect, useState } from "react";

type Coupon = {
  id: string;
  code: string;
  kind: "percent" | "fixed";
  value: number;
  maxUses: number;
  uses: number;
  minTotal: number;
  expiresAt: string;
  appliesTo: "all" | "bookings" | "products";
  active: boolean;
  createdAt: string;
};

type Draft = Omit<Coupon, "id" | "uses" | "createdAt">;
const EMPTY: Draft = {
  code: "", kind: "percent", value: 10, maxUses: 0, minTotal: 0,
  expiresAt: "", appliesTo: "all", active: true,
};

export default function CouponsPanel() {
  const [items, setItems] = useState<Coupon[]>([]);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY);

  async function load() {
    const r = await fetch("/api/coupons");
    if (r.ok) setItems((await r.json()).coupons ?? []);
  }
  useEffect(() => { load(); }, []);

  async function create() {
    if (!draft.code) return;
    await fetch("/api/coupons", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(draft) });
    setDraft(EMPTY); setAdding(false); load();
  }
  async function toggle(c: Coupon) {
    await fetch("/api/coupons", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: c.id, active: !c.active }) });
    load();
  }
  async function remove(id: string) {
    if (!confirm("Delete coupon?")) return;
    await fetch(`/api/coupons?id=${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-serif text-2xl">Coupons</h2>
        <button onClick={() => setAdding(!adding)} className="rounded-full bg-[#c9a961] px-5 py-2 text-xs font-semibold uppercase tracking-widest text-black">+ New coupon</button>
      </div>

      {adding && (
        <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <F label="Code" value={draft.code} onChange={(v) => setDraft({ ...draft, code: v.toUpperCase() })} />
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-widest text-white/65">Kind</label>
              <select value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as "percent" | "fixed" })} style={{ colorScheme: "dark" }} className="w-full rounded-lg border border-white/10 bg-[#14110d] px-3 py-2 text-sm">
                <option value="percent">Percent %</option>
                <option value="fixed">Fixed $</option>
              </select>
            </div>
            <F label="Value" type="number" value={String(draft.value)} onChange={(v) => setDraft({ ...draft, value: Number(v) || 0 })} />
            <F label="Min total $" type="number" value={String(draft.minTotal)} onChange={(v) => setDraft({ ...draft, minTotal: Number(v) || 0 })} />
            <F label="Max uses (0 = ∞)" type="number" value={String(draft.maxUses)} onChange={(v) => setDraft({ ...draft, maxUses: Number(v) || 0 })} />
            <F label="Expires at (YYYY-MM-DD)" value={draft.expiresAt} onChange={(v) => setDraft({ ...draft, expiresAt: v })} />
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-widest text-white/65">Applies to</label>
              <select value={draft.appliesTo} onChange={(e) => setDraft({ ...draft, appliesTo: e.target.value as "all" | "bookings" | "products" })} style={{ colorScheme: "dark" }} className="w-full rounded-lg border border-white/10 bg-[#14110d] px-3 py-2 text-sm">
                <option value="all">All</option>
                <option value="bookings">Bookings</option>
                <option value="products">Products</option>
              </select>
            </div>
            <label className="flex items-center gap-2 pt-6">
              <input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} />
              <span className="text-sm">Active</span>
            </label>
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={create} className="rounded-full bg-[#c9a961] px-5 py-2 text-xs font-semibold uppercase tracking-widest text-black">Create</button>
            <button onClick={() => setAdding(false)} className="rounded-full border border-white/15 px-5 py-2 text-xs uppercase tracking-widest text-white/70">Cancel</button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-white/10">
        {items.length === 0 ? <p className="p-6 text-center text-white/60">No coupons yet.</p> : items.map((c) => (
          <div key={c.id} className="flex flex-wrap items-center gap-3 border-b border-white/10 p-4 last:border-b-0">
            <div className="flex-1">
              <p className="font-mono text-lg text-[#c9a961]">{c.code}</p>
              <p className="text-xs text-white/50">
                {c.kind === "percent" ? `${c.value}% off` : `$${c.value} off`} · {c.appliesTo} · {c.uses}/{c.maxUses || "∞"} uses
                {c.expiresAt && ` · expires ${c.expiresAt}`}
              </p>
            </div>
            <button onClick={() => toggle(c)} className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-widest ${c.active ? "border-emerald-400/40 text-emerald-300" : "border-white/15 text-white/50"}`}>
              {c.active ? "Active" : "Inactive"}
            </button>
            <button onClick={() => remove(c.id)} className="rounded-full border border-red-400/40 px-3 py-1 text-[10px] uppercase tracking-widest text-red-300 hover:bg-red-500/10">Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function F({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="mb-1 block text-[10px] uppercase tracking-widest text-white/65">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-white/40" />
    </div>
  );
}
