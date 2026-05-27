"use client";

import { useEffect, useState } from "react";

type Entry = {
  id: string;
  name: string;
  phone: string;
  email: string;
  serviceName: string;
  preferredDate: string;
  preferredTime: string;
  notes?: string;
  status: "waiting" | "notified" | "converted" | "cancelled";
  createdAt: string;
};

const TONES: Record<Entry["status"], string> = {
  waiting: "border-amber-400/40 bg-amber-500/10 text-amber-300",
  notified: "border-blue-400/40 bg-blue-500/10 text-blue-300",
  converted: "border-emerald-400/40 bg-emerald-500/10 text-emerald-300",
  cancelled: "border-red-400/40 bg-red-500/10 text-red-300",
};

export default function WaitlistPanel() {
  const [items, setItems] = useState<Entry[]>([]);

  async function load() {
    const r = await fetch("/api/waitlist");
    if (r.ok) setItems((await r.json()).waitlist ?? []);
  }
  useEffect(() => { load(); }, []);

  async function setStatus(id: string, status: Entry["status"]) {
    await fetch("/api/waitlist", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, status }) });
    load();
  }
  async function remove(id: string) {
    if (!confirm("Delete this waitlist entry?")) return;
    await fetch(`/api/waitlist?id=${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <h2 className="mb-4 font-serif text-2xl">Waitlist</h2>
      <div className="overflow-hidden rounded-2xl border border-white/10">
        {items.length === 0 ? <p className="p-6 text-center text-white/60">No waitlist entries.</p> : items.map((e) => (
          <div key={e.id} className="border-b border-white/10 p-4 last:border-b-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium">{e.name} · <span className="text-[#c9a961]">{e.serviceName}</span></p>
                <p className="text-xs text-white/50">{e.preferredDate} {e.preferredTime} · <a href={`tel:${e.phone}`} className="hover:text-white">{e.phone}</a> · {e.email}</p>
                {e.notes && <p className="mt-1 text-xs text-white/60">{e.notes}</p>}
              </div>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-widest ${TONES[e.status]}`}>{e.status}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {(["waiting", "notified", "converted", "cancelled"] as Entry["status"][]).map((s) => (
                <button key={s} onClick={() => setStatus(e.id, s)} disabled={e.status === s} className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-widest ${e.status === s ? "bg-white/5 text-white/60" : "border-white/15 text-white/70 hover:bg-white/10"}`}>{s}</button>
              ))}
              <button onClick={() => remove(e.id)} className="rounded-full border border-red-400/40 px-3 py-1 text-[10px] uppercase tracking-widest text-red-300">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
