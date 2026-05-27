"use client";

import { useEffect, useState } from "react";

type Review = {
  id: string;
  name: string;
  rating: number;
  title: string;
  body: string;
  source: "booking" | "order" | "manual" | "import";
  bookingId?: string;
  productId?: string;
  orderId?: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
};

type ProductLookup = { id: string; slug: string; name_en: string };

export default function ReviewsPanel() {
  const [items, setItems] = useState<Review[]>([]);
  const [products, setProducts] = useState<ProductLookup[]>([]);
  const [filter, setFilter] = useState<"all" | Review["status"]>("all");
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: "", rating: 5, title: "", body: "" });

  async function load() {
    const r = await fetch("/api/reviews");
    if (r.ok) setItems((await r.json()).reviews ?? []);
  }
  // Preload the product catalog once so we can map productId -> name without
  // a round-trip per review row. The endpoint is unauthenticated and small,
  // so the cost is negligible.
  async function loadProducts() {
    try {
      const r = await fetch("/api/products");
      if (r.ok) {
        const data = await r.json();
        const list: ProductLookup[] = Array.isArray(data.products)
          ? data.products.map((p: { id: string; slug: string; name_en: string }) => ({
              id: p.id,
              slug: p.slug,
              name_en: p.name_en,
            }))
          : [];
        setProducts(list);
      }
    } catch {
      /* product lookup is best-effort */
    }
  }
  useEffect(() => {
    load();
    loadProducts();
  }, []);
  const productById = (id: string | undefined) =>
    id ? products.find((p) => p.id === id) ?? null : null;

  async function setStatus(id: string, status: Review["status"]) {
    await fetch("/api/reviews", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, status }) });
    load();
  }
  async function remove(id: string) {
    if (!confirm("Delete review?")) return;
    await fetch(`/api/reviews?id=${id}`, { method: "DELETE" });
    load();
  }
  async function add() {
    if (!draft.name || !draft.body) return;
    await fetch("/api/reviews", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(draft) });
    setDraft({ name: "", rating: 5, title: "", body: "" });
    setAdding(false);
    load();
  }

  const filtered = filter === "all" ? items : items.filter((r) => r.status === filter);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-2xl">Reviews</h2>
        <div className="flex flex-wrap gap-2">
          {(["all", "pending", "approved", "rejected"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-widest ${filter === f ? "border-[#c9a961] bg-[#c9a961] text-black" : "border-white/15 text-white/70"}`}>{f}</button>
          ))}
          <button onClick={() => setAdding(!adding)} className="rounded-full bg-[#c9a961] px-4 py-1 text-xs font-semibold uppercase tracking-widest text-black">+ Add</button>
        </div>
      </div>

      {adding && (
        <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <F label="Name" value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} />
            <F label="Rating (1-5)" type="number" value={String(draft.rating)} onChange={(v) => setDraft({ ...draft, rating: Math.max(1, Math.min(5, Number(v) || 5)) })} />
            <F label="Title" value={draft.title} onChange={(v) => setDraft({ ...draft, title: v })} />
            <F label="Body" value={draft.body} onChange={(v) => setDraft({ ...draft, body: v })} textarea />
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={add} className="rounded-full bg-[#c9a961] px-5 py-2 text-xs font-semibold uppercase tracking-widest text-black">Save</button>
            <button onClick={() => setAdding(false)} className="rounded-full border border-white/15 px-5 py-2 text-xs uppercase tracking-widest text-white/70">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {filtered.length === 0 ? <p className="rounded-2xl border border-white/10 p-6 text-center text-white/60">No reviews.</p> : filtered.map((r) => {
          const product = productById(r.productId);
          return (
          <div key={r.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="text-[#c9a961]">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                <span className="font-medium">{r.name}</span>
                <span className="text-xs text-white/60">· {r.source}</span>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-widest ${r.status === "approved" ? "border-emerald-400/40 text-emerald-300" : r.status === "rejected" ? "border-red-400/40 text-red-300" : "border-amber-400/40 text-amber-300"}`}>{r.status}</span>
              </div>
              <span className="text-xs text-white/60">{new Date(r.createdAt).toLocaleDateString()}</span>
            </div>
            {/* Order-sourced reviews carry a product reference; surface it so
                the operator can click through to the product detail page
                before approving. */}
            {r.source === "order" && (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-white/50">Product:</span>
                {product ? (
                  <a
                    href={`/shop/${product.slug}`}
                    target="_blank"
                    rel="noopener"
                    className="rounded-full border border-white/15 px-2 py-0.5 text-white/80 hover:border-[#c9a961] hover:text-[#c9a961]"
                  >
                    {product.name_en}
                  </a>
                ) : (
                  <span className="rounded-full border border-white/15 px-2 py-0.5 text-white/60">
                    {r.productId ?? "unknown product"}
                  </span>
                )}
                {r.orderId && (
                  <>
                    <span className="text-white/50">· Order:</span>
                    <span className="font-mono text-white/60">{r.orderId.slice(-8)}</span>
                  </>
                )}
              </div>
            )}
            {r.title && <p className="mt-2 font-serif text-base">{r.title}</p>}
            <p className="mt-1 text-sm text-white/80">{r.body}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {r.status !== "approved" && <button onClick={() => setStatus(r.id, "approved")} className="rounded-full border border-emerald-400/40 px-3 py-1 text-[10px] uppercase tracking-widest text-emerald-300">Approve</button>}
              {r.status !== "rejected" && <button onClick={() => setStatus(r.id, "rejected")} className="rounded-full border border-white/15 px-3 py-1 text-[10px] uppercase tracking-widest text-white/70">Reject</button>}
              <button onClick={() => remove(r.id)} className="rounded-full border border-red-400/40 px-3 py-1 text-[10px] uppercase tracking-widest text-red-300">Delete</button>
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}

function F({ label, value, onChange, type = "text", textarea }: { label: string; value: string; onChange: (v: string) => void; type?: string; textarea?: boolean }) {
  return (
    <div>
      <label className="mb-1 block text-[10px] uppercase tracking-widest text-white/65">{label}</label>
      {textarea ? (
        <textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-white/40" />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-white/40" />
      )}
    </div>
  );
}
