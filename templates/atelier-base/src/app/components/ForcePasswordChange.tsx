"use client";

import { useState } from "react";
import { clientPath } from "../../lib/basePath";

/**
 * Blocking modal shown on top of the admin dashboard whenever the currently
 * signed-in user still has the factory mustChangePassword flag set. Prevents
 * any real work until a fresh password is saved — closes the "whole internet
 * knows the default password" gap on new installs.
 */
export default function ForcePasswordChange({
  userId,
  email,
  onDone,
}: {
  userId: string;
  email: string;
  onDone: () => void;
}) {
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function logout() {
    try { await fetch("/api/auth", { method: "DELETE" }); } catch {}
    window.location.href = clientPath("/admin/login");
  }

  async function save() {
    setMsg(null);
    if (pw.length < 8) return setMsg("At least 8 characters.");
    if (pw !== confirm) return setMsg("Passwords don't match.");
    setBusy(true);
    try {
      const r = await fetch(`/api/users/${encodeURIComponent(userId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error || "Save failed");
      }
      onDone();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-2xl border border-amber-400/40 bg-[#0f0c09] p-6 shadow-2xl">
        <p className="text-[10px] uppercase tracking-[0.3em] text-amber-200">
          Security · one-time setup
        </p>
        <h2 className="mt-2 font-serif text-2xl text-white">Set a new password</h2>
        <p className="mt-3 text-sm text-white/65">
          You&rsquo;re still signed in with the factory default. Pick a strong
          password before anyone else finds your admin panel.
        </p>

        <div className="mt-5 space-y-3">
          <input
            type="text"
            value={email}
            readOnly
            className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70"
          />
          <input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="New password (min 8 chars)"
            autoFocus
            autoComplete="new-password"
            className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
          />
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirm"
            autoComplete="new-password"
            className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
          />
          {msg && <p className="text-xs text-red-300">{msg}</p>}
          <button
            onClick={save}
            disabled={busy || pw.length < 8 || pw !== confirm}
            className="w-full rounded-full bg-[#c9a961] px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-black disabled:opacity-40"
          >
            {busy ? "Saving…" : "Save and continue"}
          </button>
          <button
            type="button"
            onClick={logout}
            className="w-full text-center text-[10px] uppercase tracking-[0.25em] text-white/60 hover:text-white/70"
          >
            Sign out instead
          </button>
        </div>
      </div>
    </div>
  );
}
