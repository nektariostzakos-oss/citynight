"use client";

import { useState } from "react";

export default function RequestForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    try {
      await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
    } catch {}
    // Always succeed to the user — prevents account enumeration.
    setSent(true);
    setBusy(false);
  }

  if (sent) {
    return (
      <div className="mt-6 space-y-3">
        <p className="text-sm text-emerald-300">
          ✓ If that email matches an admin account, a reset link is on its way.
        </p>
        <p className="text-xs text-white/60">
          Check your inbox (and spam folder). The link is valid for 1 hour.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <p className="text-sm text-white/60">
        Enter your admin email. If we find an account, we&rsquo;ll send you a
        reset link that works for 1 hour.
      </p>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        autoComplete="email"
        placeholder="you@yourshop.com"
        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none focus:border-white/40"
      />
      <button
        type="submit"
        disabled={busy || !email.trim()}
        className="w-full rounded-full bg-[#c9a961] px-6 py-3 text-sm font-semibold uppercase tracking-widest text-black disabled:opacity-50"
      >
        {busy ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}
