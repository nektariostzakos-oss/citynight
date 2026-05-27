"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BARBERS } from "../../lib/services";

type PublicUser = {
  id: string;
  email: string;
  role: "admin" | "barber";
  barberId?: string;
  createdAt: string;
};

export default function UsersPanel({
  me,
}: {
  me: { id: string; email: string; role: string } | null;
}) {
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    email: "",
    role: "barber" as "admin" | "barber",
    password: "",
    barberId: BARBERS[0]?.id ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [pwForm, setPwForm] = useState({ current: "", next: "", busy: false, msg: "" });

  async function load() {
    setLoading(true);
    const r = await fetch("/api/users");
    if (r.ok) {
      const d = await r.json();
      setUsers(d.users ?? []);
    }
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function add() {
    setError(null);
    const r = await fetch("/api/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      setError(d.error || "Failed");
      return;
    }
    setAdding(false);
    setForm({ email: "", role: "barber", password: "", barberId: BARBERS[0]?.id ?? "" });
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this user?")) return;
    const r = await fetch(`/api/users/${id}`, { method: "DELETE" });
    if (r.ok) load();
    else {
      const d = await r.json().catch(() => ({}));
      alert(d.error || "Could not delete.");
    }
  }

  async function changeMyPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!me) return;
    if (pwForm.next.length < 8) {
      setPwForm((p) => ({ ...p, msg: "At least 8 characters." }));
      return;
    }
    setPwForm((p) => ({ ...p, busy: true, msg: "" }));
    const r = await fetch(`/api/users/${me.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: pwForm.next }),
    });
    setPwForm((p) => ({ ...p, busy: false }));
    if (r.ok) {
      setPwForm({ current: "", next: "", busy: false, msg: "Password updated." });
    } else {
      const d = await r.json().catch(() => ({}));
      setPwForm((p) => ({ ...p, msg: d.error || "Failed" }));
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-2xl">Users</h2>
          <button
            onClick={() => setAdding(true)}
            className="rounded-full bg-[#c9a961] px-5 py-2 text-xs font-semibold uppercase tracking-widest text-black"
          >
            + Add user
          </button>
        </div>

        {loading ? (
          <p className="text-white/60">Loading…</p>
        ) : (
          <div className="divide-y divide-white/10 border-y border-white/10">
            {users.map((u) => (
              <div
                key={u.id}
                className="flex flex-wrap items-center gap-3 py-3 text-sm sm:grid sm:grid-cols-[1fr_auto_auto_auto] sm:gap-4"
              >
                <div>
                  <p className="text-white">{u.email}</p>
                  {u.role === "barber" && (
                    <p className="text-xs text-white/60">
                      Barber: {BARBERS.find((b) => b.id === u.barberId)?.name ?? u.barberId}
                    </p>
                  )}
                </div>
                <span
                  className={`rounded-full border px-3 py-0.5 text-[10px] uppercase tracking-widest ${
                    u.role === "admin"
                      ? "border-[#c9a961]/40 bg-[#c9a961]/10 text-[#c9a961]"
                      : "border-white/15 bg-white/5 text-white/70"
                  }`}
                >
                  {u.role}
                </span>
                <span className="text-xs text-white/60">
                  {new Date(u.createdAt).toLocaleDateString()}
                </span>
                {me?.id !== u.id ? (
                  <button
                    onClick={() => remove(u.id)}
                    className="rounded-full border border-red-400/40 px-3 py-1 text-[10px] uppercase tracking-widest text-red-300 hover:bg-red-500/10"
                  >
                    Delete
                  </button>
                ) : (
                  <span className="text-xs text-white/55">you</span>
                )}
              </div>
            ))}
          </div>
        )}

        <AnimatePresence>
          {adding && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-5"
            >
              <h3 className="mb-3 text-xs uppercase tracking-widest text-[#c9a961]">
                New user
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
                <Field label="Password (min 6)" value={form.password} onChange={(v) => setForm({ ...form, password: v })} type="password" />
                <div>
                  <label className="mb-1 block text-[10px] uppercase tracking-widest text-white/60">Role</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value as "admin" | "barber" })}
                    style={{ colorScheme: "dark" }}
                    className="w-full rounded-xl border border-white/15 bg-[#14110d] px-3 py-2 text-sm text-white"
                  >
                    <option value="barber">Barber</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                {form.role === "barber" && (
                  <div>
                    <label className="mb-1 block text-[10px] uppercase tracking-widest text-white/60">Linked barber</label>
                    <select
                      value={form.barberId}
                      onChange={(e) => setForm({ ...form, barberId: e.target.value })}
                      style={{ colorScheme: "dark" }}
                      className="w-full rounded-xl border border-white/15 bg-[#14110d] px-3 py-2 text-sm text-white"
                    >
                      {BARBERS.filter((b) => b.id !== "any").map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              {error && (
                <p className="mt-3 rounded-lg border border-red-400/40 bg-red-500/10 p-2 text-sm text-red-300">
                  {error}
                </p>
              )}
              <div className="mt-4 flex gap-2">
                <button
                  onClick={add}
                  className="rounded-full bg-[#c9a961] px-5 py-2 text-xs font-semibold uppercase tracking-widest text-black"
                >
                  Create
                </button>
                <button
                  onClick={() => setAdding(false)}
                  className="rounded-full border border-white/15 px-5 py-2 text-xs uppercase tracking-widest text-white/70"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur">
        <h2 className="mb-1 font-serif text-2xl">Change my password</h2>
        <p className="mb-5 text-sm text-white/55">
          Logged in as <span className="text-white">{me?.email ?? "—"}</span>
        </p>
        <form onSubmit={changeMyPassword} className="space-y-3">
          <Field
            label="New password"
            value={pwForm.next}
            onChange={(v) => setPwForm({ ...pwForm, next: v })}
            type="password"
          />
          <button
            type="submit"
            disabled={pwForm.busy || !pwForm.next}
            className="rounded-full bg-[#c9a961] px-5 py-2 text-xs font-semibold uppercase tracking-widest text-black disabled:opacity-40"
          >
            {pwForm.busy ? "Saving…" : "Update password"}
          </button>
          {pwForm.msg && (
            <p
              className={`rounded-lg border p-2 text-sm ${
                pwForm.msg === "Password updated."
                  ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
                  : "border-red-400/40 bg-red-500/10 text-red-200"
              }`}
            >
              {pwForm.msg}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-[10px] uppercase tracking-widest text-white/60">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/40"
      />
    </div>
  );
}
