"use client";

import { useState, useEffect } from "react";
import type { Client } from "../../../../lib/clients";

type Staff = { id: string; name: string };

export default function ClientProfileActions({ client }: { client: Client }) {
  const [birthday, setBirthday] = useState(client.birthday ?? "");
  const [preferredStaffId, setPreferredStaffId] = useState(client.preferredStaffId ?? "");
  const [notes, setNotes] = useState(client.notes ?? "");
  const [tags, setTags] = useState((client.tags ?? []).join(", "));
  const [loyaltyPoints, setLoyaltyPoints] = useState(
    client.loyaltyPoints != null ? String(client.loyaltyPoints) : ""
  );
  const [patchTestAt, setPatchTestAt] = useState(client.patchTestAt ?? "");
  const [staff, setStaff] = useState<Staff[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/staff/availability")
      .then((r) => r.json())
      .catch(() => ({ staff: [] }));
    // Re-use the admin-only /api/staff endpoint for names
    fetch("/api/staff")
      .then((r) => r.ok ? r.json() : { staff: [] })
      .then((d) => setStaff((d.staff as Staff[]) ?? []))
      .catch(() => {});
  }, []);

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const r = await fetch(`/api/clients/${encodeURIComponent(client.id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          birthday: birthday || undefined,
          preferredStaffId: preferredStaffId || undefined,
          notes: notes || undefined,
          tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
          loyaltyPoints: loyaltyPoints === "" ? undefined : Number(loyaltyPoints),
          patchTestAt: patchTestAt || undefined,
        }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error || "Save failed");
      }
      setMsg("Saved.");
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.02] p-5">
      <p className="text-[10px] uppercase tracking-[0.3em] text-[#c9a961]">Client details</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Birthday (MM-DD or YYYY-MM-DD)" value={birthday} onChange={setBirthday} placeholder="1988-03-14" />
        <div>
          <label className="mb-2 block text-xs uppercase tracking-widest text-white/40">
            Preferred stylist
          </label>
          <select
            value={preferredStaffId}
            onChange={(e) => setPreferredStaffId(e.target.value)}
            className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
          >
            <option value="">—</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <Field label="Loyalty points (override)" value={loyaltyPoints} onChange={setLoyaltyPoints} placeholder="auto" />
        <div>
          <label className="mb-2 block text-xs uppercase tracking-widest text-white/40">
            Patch test completed on
          </label>
          <div className="flex gap-2">
            <input
              type="date"
              value={patchTestAt ? patchTestAt.slice(0, 10) : ""}
              onChange={(e) => setPatchTestAt(e.target.value ? new Date(e.target.value).toISOString() : "")}
              style={{ colorScheme: "dark" }}
              className="flex-1 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
            />
            <button
              type="button"
              onClick={() => setPatchTestAt(new Date().toISOString())}
              className="rounded-md border border-white/15 px-3 py-2 text-xs uppercase tracking-widest text-white/70 hover:bg-white/10"
              title="Mark as done today"
            >
              Today
            </button>
            {patchTestAt && (
              <button
                type="button"
                onClick={() => setPatchTestAt("")}
                className="rounded-md border border-white/15 px-3 py-2 text-xs uppercase tracking-widest text-white/50 hover:text-white"
              >
                Clear
              </button>
            )}
          </div>
        </div>
        <Field label="Tags (comma-separated)" value={tags} onChange={setTags} placeholder="VIP, colour, allergies" />
        <div className="sm:col-span-2">
          <label className="mb-2 block text-xs uppercase tracking-widest text-white/40">
            Notes
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Hair type, allergies, chat topics, whatever helps the stylist."
            className="w-full resize-none rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
          />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-full bg-[#c9a961] px-5 py-2 text-xs font-semibold uppercase tracking-widest text-black disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {msg && <p className="text-xs text-white/60">{msg}</p>}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="mb-2 block text-xs uppercase tracking-widest text-white/40">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30"
      />
    </div>
  );
}
