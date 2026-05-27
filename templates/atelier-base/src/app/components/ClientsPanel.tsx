"use client";

import { useEffect, useRef, useState } from "react";

type Client = {
  id: string;
  name: string;
  email: string;
  phone: string;
  notes?: string;
  tags?: string[];
  bookingCount: number;
  orderCount: number;
  lifetimeValue: number;
  lastSeen: string | null;
  createdAt: string;
};

export default function ClientsPanel() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", notes: "" });

  async function load() {
    setLoading(true);
    const r = await fetch("/api/clients");
    if (r.ok) {
      const d = await r.json();
      setClients(d.clients ?? []);
    }
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  const filtered = clients.filter((c) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.phone.includes(q)
    );
  });

  async function onImport(file: File) {
    setMsg("Importing…");
    const text = await file.text();
    const r = await fetch("/api/clients", {
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

  async function add() {
    if (!form.name || (!form.email && !form.phone)) return;
    const r = await fetch("/api/clients", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    if (r.ok) {
      setAdding(false);
      setForm({ name: "", email: "", phone: "", notes: "" });
      load();
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this client?")) return;
    const r = await fetch(`/api/clients?id=${id}`, { method: "DELETE" });
    if (r.ok) load();
  }

  const totalLtv = clients.reduce((s, c) => s + c.lifetimeValue, 0);
  const withEmail = clients.filter((c) => c.email).length;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-2xl">Clients</h2>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onImport(f);
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
            href="/api/clients/export"
            className="rounded-full border border-white/15 px-4 py-2 text-[10px] uppercase tracking-widest text-white/80 hover:bg-white/10"
          >
            Export CSV
          </a>
          <button
            onClick={() => setAdding(!adding)}
            className="rounded-full bg-[#c9a961] px-5 py-2 text-xs font-semibold uppercase tracking-widest text-black"
          >
            + Add client
          </button>
        </div>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Kpi label="Total clients" value={clients.length.toString()} />
        <Kpi label="With email" value={withEmail.toString()} />
        <Kpi label="Lifetime value" value={`$${totalLtv.toFixed(0)}`} />
      </div>

      {msg && (
        <div className="mb-4 rounded-xl border border-white/15 bg-white/[0.04] p-3 text-sm text-white/80">
          {msg}
        </div>
      )}

      {adding && (
        <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <F label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
            <F label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
            <F label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
            <F label="Notes" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={add}
              className="rounded-full bg-[#c9a961] px-5 py-2 text-xs font-semibold uppercase tracking-widest text-black"
            >
              Save
            </button>
            <button
              onClick={() => setAdding(false)}
              className="rounded-full border border-white/15 px-5 py-2 text-xs uppercase tracking-widest text-white/70"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="mb-3 flex items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, email, phone…"
          className="w-full rounded-full border border-white/15 bg-white/[0.03] px-4 py-1.5 text-sm text-white placeholder-white/30 outline-none focus:border-white/40 sm:w-80"
        />
        <span className="text-xs text-white/60">
          {filtered.length} / {clients.length}
        </span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10">
        {loading ? (
          <p className="p-6 text-white/60">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-center text-white/60">No clients match.</p>
        ) : (
          <div className="divide-y divide-white/10">
            <div className="hidden grid-cols-[1.2fr_1.4fr_1fr_80px_80px_100px_80px] gap-3 bg-white/[0.03] px-5 py-3 text-[10px] uppercase tracking-widest text-white/60 lg:grid">
              <span>Name</span>
              <span>Email</span>
              <span>Phone</span>
              <span className="text-right">Bookings</span>
              <span className="text-right">Orders</span>
              <span className="text-right">LTV</span>
              <span className="text-right">—</span>
            </div>
            {filtered.map((c) => (
              <div
                key={c.id}
                className="grid gap-1 px-4 py-3 text-sm sm:px-5 lg:grid-cols-[1.2fr_1.4fr_1fr_80px_80px_100px_80px] lg:items-center lg:gap-3"
              >
                <a href={`/admin/clients/${encodeURIComponent(c.id)}`} className="font-medium text-white hover:text-[#c9a961]">
                  {c.name}
                </a>
                <a href={`mailto:${c.email}`} className="truncate text-white/75 hover:text-white">
                  {c.email || <span className="text-white/55">—</span>}
                </a>
                <a href={`tel:${c.phone}`} className="text-white/75 hover:text-white">
                  {c.phone || <span className="text-white/55">—</span>}
                </a>
                <div className="text-white/80 lg:text-right">{c.bookingCount}</div>
                <div className="text-white/80 lg:text-right">{c.orderCount}</div>
                <div className="text-[#c9a961] lg:text-right">${c.lifetimeValue.toFixed(0)}</div>
                <div className="lg:text-right">
                  <button
                    onClick={() => remove(c.id)}
                    className="rounded-full border border-red-400/40 px-2.5 py-1 text-[10px] uppercase tracking-widest text-red-300 hover:bg-red-500/10"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="mt-4 text-xs text-white/60">
        CSV headers: <code className="text-white/60">name,email,phone,notes,tags</code> (tags separated by <code className="text-white/60">|</code>).
      </p>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-[10px] uppercase tracking-widest text-white/60">{label}</p>
      <p className="mt-1 font-serif text-2xl text-white">{value}</p>
    </div>
  );
}

function F({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-[10px] uppercase tracking-widest text-white/65">
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-white/40"
      />
    </div>
  );
}
