"use client";

import { useEffect, useState } from "react";
import ImagePicker from "./ImagePicker";

type Staff = {
  id: string;
  name: string;
  role: string;
  bio: string;
  photo: string;
  specialties: string[];
  enabled: boolean;
  workDays: number[];
  startTime: string;
  endTime: string;
  breakStart?: string;
  breakEnd?: string;
  order: number;
};

const EMPTY: Staff = {
  id: "", name: "", role: "", bio: "", photo: "", specialties: [],
  enabled: true, workDays: [1, 2, 3, 4, 5, 6], startTime: "10:00", endTime: "21:00", order: 0,
};
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function StaffPanel() {
  const [items, setItems] = useState<Staff[]>([]);
  const [draft, setDraft] = useState<Staff | null>(null);

  async function load() {
    const r = await fetch("/api/staff");
    const d = await r.json();
    setItems(d.staff ?? []);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!draft) return;
    await fetch("/api/staff", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(draft),
    });
    setDraft(null);
    load();
  }
  async function remove(id: string) {
    if (!confirm("Delete this staff member?")) return;
    await fetch(`/api/staff?id=${id}`, { method: "DELETE" });
    load();
  }
  function toggleDay(d: number) {
    if (!draft) return;
    const next = draft.workDays.includes(d)
      ? draft.workDays.filter((x) => x !== d)
      : [...draft.workDays, d].sort();
    setDraft({ ...draft, workDays: next });
  }

  if (draft) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-serif text-2xl">{items.find((i) => i.id === draft.id) ? "Edit staff" : "New staff"}</h2>
          <button onClick={() => setDraft(null)} className="rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-widest text-white/70">Back</button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <F label="ID (slug)" value={draft.id} onChange={(v) => setDraft({ ...draft, id: v })} />
          <F label="Name" value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} />
          <F label="Role" value={draft.role} onChange={(v) => setDraft({ ...draft, role: v })} />
          <F label="Specialties (comma separated)" value={draft.specialties.join(", ")} onChange={(v) => setDraft({ ...draft, specialties: v.split(",").map((s) => s.trim()).filter(Boolean) })} />
          <F label="Start time" value={draft.startTime} onChange={(v) => setDraft({ ...draft, startTime: v })} />
          <F label="End time" value={draft.endTime} onChange={(v) => setDraft({ ...draft, endTime: v })} />
          <F label="Break start (optional)" value={draft.breakStart ?? ""} onChange={(v) => setDraft({ ...draft, breakStart: v || undefined })} />
          <F label="Break end (optional)" value={draft.breakEnd ?? ""} onChange={(v) => setDraft({ ...draft, breakEnd: v || undefined })} />
          <F label="Order" type="number" value={String(draft.order)} onChange={(v) => setDraft({ ...draft, order: Number(v) || 0 })} />
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={draft.enabled} onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })} />
            <span className="text-sm">Enabled</span>
          </label>
          <F label="Bio" value={draft.bio} onChange={(v) => setDraft({ ...draft, bio: v })} textarea />
        </div>
        <div className="mt-4">
          <p className="mb-2 text-[10px] uppercase tracking-widest text-white/65">Working days</p>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((d, i) => (
              <button key={i} onClick={() => toggleDay(i)} className={`rounded-full px-3 py-1 text-xs ${draft.workDays.includes(i) ? "bg-[#c9a961] text-black" : "border border-white/15 text-white/70"}`}>
                {d}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4">
          <ImagePicker label="Photo" preset="staff" value={draft.photo} onChange={(v) => setDraft({ ...draft, photo: v })} />
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
        <h2 className="font-serif text-2xl">Staff</h2>
        <button onClick={() => setDraft({ ...EMPTY, order: items.length })} className="rounded-full bg-[#c9a961] px-5 py-2 text-xs font-semibold uppercase tracking-widest text-black">+ Add staff</button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.length === 0 ? <p className="col-span-full p-6 text-center text-white/60">No staff yet.</p> : items.map((s) => (
          <div key={s.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center gap-3">
              {s.photo ? <img src={s.photo} alt="" className="h-12 w-12 rounded-full object-cover" /> : <div className="h-12 w-12 rounded-full bg-white/5" />}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{s.name}</p>
                <p className="truncate text-xs text-white/50">{s.role}</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-white/50">{s.workDays.map((d) => DAYS[d]).join(", ")} · {s.startTime}–{s.endTime}</p>
            <div className="mt-3 flex gap-2">
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
        <textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-white/40" />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-white/40" />
      )}
    </div>
  );
}
