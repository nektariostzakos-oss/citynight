"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { clientPath } from "../../lib/basePath";

type Props = {
  demoMode?: boolean;
  demoEmail?: string;
  demoPassword?: string;
};

export default function LoginForm({ demoMode, demoEmail, demoPassword }: Props = {}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const autoFiredRef = useRef(false);
  const emailId = "login-email";
  const passwordId = "login-password";

  async function attempt(e: string, p: string) {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: e, password: p }),
    });
    setLoading(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Wrong email or password");
      return;
    }
    // clientPath() re-prefixes with the live tenant slug; a bare router.push
    // bypasses the TenantRouter click interceptor and would 404 under /<slug>.
    router.push(clientPath("/admin"));
    router.refresh();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await attempt(email, password);
  }

  async function signInAsDemoAdmin() {
    if (!demoEmail || !demoPassword) return;
    setEmail(demoEmail);
    setPassword(demoPassword);
    await attempt(demoEmail, demoPassword);
  }

  // Auto-fire sign-in when arriving via /admin/login?auto=1 in demo mode.
  useEffect(() => {
    if (autoFiredRef.current) return;
    if (!demoMode || !demoEmail || !demoPassword) return;
    try {
      const auto = new URLSearchParams(window.location.search).get("auto");
      if (auto === "1") {
        autoFiredRef.current = true;
        void signInAsDemoAdmin();
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoMode, demoEmail, demoPassword]);

  return (
    <>
      {demoMode && demoEmail && demoPassword && (
        <button
          type="button"
          onClick={signInAsDemoAdmin}
          disabled={loading}
          className="mb-4 w-full rounded-full bg-[#c9a961] py-3 text-sm font-semibold uppercase tracking-widest text-black hover:bg-[#d6b770] disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9a961]"
        >
          {loading ? "Signing in…" : "Sign in as demo admin →"}
        </button>
      )}
      <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor={emailId} className="mb-2 block text-xs uppercase tracking-widest text-white/60">
          Email
        </label>
        <input
          id={emailId}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoFocus
          autoComplete="email"
          placeholder="admin@yoursalon.local"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none transition-colors focus:border-[#c9a961] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9a961]"
        />
      </div>
      <div>
        <label htmlFor={passwordId} className="mb-2 block text-xs uppercase tracking-widest text-white/60">
          Password
        </label>
        <input
          id={passwordId}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none transition-colors focus:border-[#c9a961] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9a961]"
        />
      </div>
      {error && (
        <p role="alert" className="rounded-lg border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-full bg-[#c9a961] py-3 text-sm font-semibold uppercase tracking-widest text-black disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9a961]"
      >
        {loading ? "Signing in…" : "Sign in"}
      </button>
      </form>
    </>
  );
}
