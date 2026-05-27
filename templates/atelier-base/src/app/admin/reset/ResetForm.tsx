"use client";

import { useState } from "react";

export default function ResetForm({ token }: { token: string }) {
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (pw.length < 8) return setMsg("At least 8 characters.");
    if (pw !== confirm) return setMsg("Passwords don't match.");
    setBusy(true);
    try {
      const r = await fetch("/api/auth/reset", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password: pw }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Reset failed");
      setDone(true);
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="mt-6">
        <p className="text-sm text-emerald-300">✓ Password updated.</p>
        <p className="mt-3 text-sm text-white/60">
          You can now sign in with the new password.
        </p>
        <a
          href="/admin/login"
          className="mt-6 inline-block rounded-full bg-[#c9a961] px-6 py-2.5 text-xs font-semibold uppercase tracking-widest text-black"
        >
          Go to sign in →
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-3">
      <input
        type="password"
        value={pw}
        onChange={(e) => setPw(e.target.value)}
        placeholder="New password (min 8 chars)"
        required
        autoFocus
        autoComplete="new-password"
        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none focus:border-white/40"
      />
      <input
        type="password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder="Confirm"
        required
        autoComplete="new-password"
        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none focus:border-white/40"
      />
      {msg && <p className="text-xs text-red-300">{msg}</p>}
      <button
        type="submit"
        disabled={busy || pw.length < 8 || pw !== confirm}
        className="w-full rounded-full bg-[#c9a961] px-6 py-3 text-sm font-semibold uppercase tracking-widest text-black disabled:opacity-40"
      >
        {busy ? "Saving…" : "Set new password"}
      </button>
    </form>
  );
}
