"use client";

import { useEffect, useState } from "react";
import { withBasePath } from "../../lib/basePath";

/**
 * One-click email delivery setup for the admin.
 *
 *  - SaaS tenants see "Use Atelier email" as the headline option: a single
 *    button enables the Atelier-hosted relay so booking confirmations and
 *    reminders work instantly, with no SMTP, no env vars, no restart. The
 *    relay's daily quota is shown inline once it is on.
 *  - Standalone (customer ZIP) installs and any admin who prefers their own
 *    deliverability can still pick a custom SMTP provider (Gmail / Outlook /
 *    SendGrid / Resend / Custom) — saved to settings.json and tested through
 *    the same /api/settings/test-email endpoint as before.
 */

type Provider = "gmail" | "outlook" | "sendgrid" | "resend" | "custom";

type Preset = {
  label: string;
  host: string;
  port: number;
  secure: "tls" | "ssl";
  userHint?: string;
  passHint?: string;
};

const PRESETS: Record<Exclude<Provider, "custom">, Preset> = {
  gmail: {
    label: "Gmail",
    host: "smtp.gmail.com",
    port: 587,
    secure: "tls",
    passHint:
      "Use a 16-char Google App Password (myaccount.google.com → Security → App passwords), not your normal password.",
  },
  outlook: {
    label: "Outlook / Microsoft 365",
    host: "smtp-mail.outlook.com",
    port: 587,
    secure: "tls",
  },
  sendgrid: {
    label: "SendGrid",
    host: "smtp.sendgrid.net",
    port: 587,
    secure: "tls",
    userHint: 'Username is the literal word "apikey".',
    passHint: "Paste your SendGrid API key.",
  },
  resend: {
    label: "Resend",
    host: "smtp.resend.com",
    port: 465,
    secure: "ssl",
    userHint: 'Username is the literal word "resend".',
    passHint: "Paste your Resend API key (starts with re_).",
  },
};

type Status =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "ok"; msg: string }
  | { kind: "err"; msg: string };

type RelayInfo = {
  mode: "atelier" | "smtp";
  relay: {
    available: boolean;
    blocked?: boolean;
    used?: number;
    cap?: number;
    reason?: string;
  };
};

export default function SmtpSetup({
  initialReady,
}: {
  initialReady: boolean;
}) {
  // Two parallel concerns: (1) is email delivery working AT ALL, and (2) is
  // the panel open for the operator to change something. The "open" defaults
  // to "yes" when nothing is set, "no" when something is.
  const [ready, setReady] = useState(initialReady);
  const [open, setOpen] = useState(!initialReady);

  // Mode + relay state (probed once on mount, refreshed after Save).
  const [info, setInfo] = useState<RelayInfo | null>(null);
  const [mode, setMode] = useState<"atelier" | "smtp">("atelier");

  // Custom SMTP form state (only used in "smtp" mode).
  const [provider, setProvider] = useState<Provider>("gmail");
  const [host, setHost] = useState("");
  const [port, setPort] = useState(587);
  const [secure, setSecure] = useState<"tls" | "ssl" | "none">("tls");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [from, setFrom] = useState("");

  const [status, setStatus] = useState<Status>({ kind: "idle" });

  // Probe the server for "is the relay available for me?". Used both on
  // mount (via the effect below) and after every Save so the displayed
  // quota stays current. Returns the result rather than reading state, so
  // callers can sequence on it without re-rendering.
  async function probe(): Promise<RelayInfo | null> {
    try {
      const r = await fetch(withBasePath("/api/settings/relay-status"));
      if (!r.ok) return null;
      const j: RelayInfo = await r.json();
      setInfo(j);
      setMode(j.mode);
      return j;
    } catch {
      /* probe failed; UI degrades gracefully to the custom SMTP form */
      return null;
    }
  }
  useEffect(() => {
    // Defer the first probe out of the effect body so the rule against
    // synchronous setState-in-effect is happy. The await inside probe()
    // already moves the setState calls off the synchronous frame, but
    // queueMicrotask makes that explicit.
    queueMicrotask(() => {
      void probe();
    });
  }, []);

  const relayAvailable = !!info && info.relay.available;
  const relayBlocked = !!info && !!info.relay.blocked;

  // ---------- collapsed views (the strip above the dashboard) -------------

  if (ready && !open) {
    const usage =
      mode === "atelier" && info?.relay?.cap
        ? ` · ${info.relay.used ?? 0} / ${info.relay.cap} today`
        : "";
    return (
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
        <span>
          <strong>
            {mode === "atelier"
              ? "Email delivery: Atelier-hosted"
              : "Email delivery: your own SMTP"}
          </strong>
          {usage} · Confirmations and reminders are sending live.
        </span>
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setStatus({ kind: "idle" });
          }}
          className="rounded-full border border-white/15 px-3 py-1 text-xs uppercase tracking-widest text-white/70 hover:bg-white/10"
        >
          Change
        </button>
      </div>
    );
  }

  if (!ready && !open) {
    return (
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
        <span>
          <strong>Email delivery not set up.</strong> Confirmations and 8-hour
          reminders are being logged in preview mode only.
        </span>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="shrink-0 rounded-full bg-[#c9a961] px-4 py-2 text-xs font-semibold uppercase tracking-widest text-black hover:bg-[#d8b974]"
        >
          Set up email
        </button>
      </div>
    );
  }

  // ---------- open panel: mode picker + the chosen mode's form -----------

  async function enableAtelier() {
    setStatus({ kind: "saving" });
    try {
      const r = await fetch(withBasePath("/api/settings"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ smtp: { mode: "atelier" } }),
      });
      if (!r.ok) {
        const j: { error?: string } = await r.json().catch(() => ({}));
        throw new Error(j.error || `Save failed (${r.status})`);
      }
      await probe();
      setReady(true);
      setMode("atelier");
      setStatus({
        kind: "ok",
        msg: "Atelier email is on. Confirmations and reminders will send through it.",
      });
    } catch (err) {
      setStatus({
        kind: "err",
        msg: err instanceof Error ? err.message : "Save failed",
      });
    }
  }

  async function sendAtelierTest(to: string) {
    setStatus({ kind: "saving" });
    try {
      const r = await fetch(withBasePath("/api/settings/test-email"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to }),
      });
      const j: { ok?: boolean; error?: string } = await r
        .json()
        .catch(() => ({}));
      if (!r.ok) {
        setStatus({
          kind: "err",
          msg: j.error || "Test send failed.",
        });
        return;
      }
      await probe();
      setStatus({
        kind: "ok",
        msg: `Test sent to ${to}. Check your inbox (and spam).`,
      });
    } catch (err) {
      setStatus({
        kind: "err",
        msg: err instanceof Error ? err.message : "Test failed",
      });
    }
  }

  async function saveCustomSmtp(e: React.FormEvent) {
    e.preventDefault();
    setStatus({ kind: "saving" });

    const isCustom = provider === "custom";
    const preset = isCustom ? null : PRESETS[provider];
    const smtp = {
      mode: "smtp" as const,
      host: isCustom ? host : preset!.host,
      port: isCustom ? Number(port) : preset!.port,
      user,
      pass,
      from,
      secure: isCustom ? secure : preset!.secure,
    };

    try {
      const r = await fetch(withBasePath("/api/settings"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ smtp }),
      });
      if (!r.ok) {
        const j: { error?: string } = await r.json().catch(() => ({}));
        throw new Error(j.error || `Save failed (${r.status})`);
      }

      const fromAddr = from.match(/<([^>]+)>/)?.[1] || from.trim();
      const candidate = fromAddr || user;
      const to = candidate.includes("@") ? candidate : "";
      if (!to) {
        setReady(true);
        setMode("smtp");
        await probe();
        setStatus({
          kind: "ok",
          msg: "Saved. Add an email-shaped username or From address to send a test.",
        });
        return;
      }

      const t = await fetch(withBasePath("/api/settings/test-email"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to }),
      });
      const tj: { ok?: boolean; error?: string } = await t
        .json()
        .catch(() => ({}));
      if (!t.ok) {
        setReady(false);
        setStatus({
          kind: "err",
          msg: tj.error || "Saved, but the test send failed.",
        });
        return;
      }
      setReady(true);
      setMode("smtp");
      await probe();
      setStatus({
        kind: "ok",
        msg: `Test sent to ${to}. Check your inbox (and spam).`,
      });
    } catch (err) {
      setStatus({
        kind: "err",
        msg: err instanceof Error ? err.message : "Save failed",
      });
    }
  }

  const isCustom = provider === "custom";
  const preset = isCustom ? null : PRESETS[provider];

  return (
    <div className="mb-6 rounded-xl border border-white/15 bg-white/[0.04] p-5 text-sm text-white/80">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-white">Email delivery</h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs uppercase tracking-widest text-white/50 hover:text-white"
        >
          Close
        </button>
      </div>

      {/* Two-mode picker. The Atelier card is hidden when the relay isn't
          available (standalone customer ZIP, or relay-disabled deploy). */}
      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        {info && info.mode !== undefined && (
          <button
            type="button"
            onClick={() => setMode("atelier")}
            disabled={!relayAvailable && mode !== "atelier"}
            aria-pressed={mode === "atelier"}
            className={`group rounded-xl border p-4 text-left transition-colors ${
              mode === "atelier"
                ? "border-[#c9a961] bg-[#c9a961]/15"
                : relayAvailable
                ? "border-white/15 bg-white/[0.04] hover:border-white/30"
                : "cursor-not-allowed border-white/10 bg-white/[0.02] opacity-50"
            }`}
          >
            <div className="mb-1 flex items-center gap-2">
              <span className="text-base font-semibold text-white">
                Use Atelier email
              </span>
              <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] uppercase tracking-widest text-emerald-300">
                Free · Recommended
              </span>
            </div>
            <p className="text-xs leading-relaxed text-white/60">
              We send through our managed mail server. Zero setup, zero
              passwords. Daily limit{" "}
              {info.relay.cap ?? "—"} emails per site.
              {relayBlocked &&
                " (Currently paused for your account; contact support.)"}
              {!relayAvailable &&
                !relayBlocked &&
                " (Not available on this install.)"}
            </p>
          </button>
        )}

        <button
          type="button"
          onClick={() => setMode("smtp")}
          aria-pressed={mode === "smtp"}
          className={`group rounded-xl border p-4 text-left transition-colors ${
            mode === "smtp"
              ? "border-[#c9a961] bg-[#c9a961]/15"
              : "border-white/15 bg-white/[0.04] hover:border-white/30"
          }`}
        >
          <div className="mb-1 text-base font-semibold text-white">
            Use my own SMTP
          </div>
          <p className="text-xs leading-relaxed text-white/60">
            Connect Gmail, Outlook, SendGrid, Resend, or any SMTP server you
            control. Higher limits, your sending reputation, your address.
          </p>
        </button>
      </div>

      {mode === "atelier" ? (
        // ----- Atelier-hosted relay panel -----
        <div className="space-y-3">
          {info && (
            <p className="text-xs text-white/50">
              {relayAvailable
                ? `Today: ${info.relay.used ?? 0} / ${info.relay.cap ?? 0} emails sent.`
                : relayBlocked
                ? "Your account is currently blocked from the relay. Contact support."
                : info.relay.reason === "no_tenant_context"
                ? "The Atelier relay is for hosted SaaS sites; this is a standalone install."
                : "The Atelier relay is offline right now. Pick 'Use my own SMTP' below."}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={enableAtelier}
              disabled={status.kind === "saving" || !relayAvailable}
              className="rounded-full bg-[#c9a961] px-5 py-2 text-xs font-semibold uppercase tracking-widest text-black hover:bg-[#d8b974] disabled:opacity-50"
            >
              {status.kind === "saving"
                ? "Working…"
                : info?.mode === "atelier"
                ? "Atelier email is on"
                : "Turn on Atelier email"}
            </button>
            {info?.mode === "atelier" && (
              <SendTestRow onSend={sendAtelierTest} busy={status.kind === "saving"} />
            )}
          </div>
        </div>
      ) : (
        // ----- Custom SMTP panel -----
        <form onSubmit={saveCustomSmtp}>
          <div className="mb-4 flex flex-wrap gap-2">
            {(
              ["gmail", "outlook", "sendgrid", "resend", "custom"] as Provider[]
            ).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setProvider(p)}
                className={`rounded-full border px-3 py-1.5 text-xs uppercase tracking-widest transition-colors ${
                  provider === p
                    ? "border-[#c9a961] bg-[#c9a961]/15 text-[#c9a961]"
                    : "border-white/15 text-white/70 hover:border-white/30"
                }`}
              >
                {p === "custom"
                  ? "Custom SMTP"
                  : PRESETS[p as Exclude<Provider, "custom">].label}
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {isCustom && (
              <>
                <label className="block">
                  <span className="block text-xs uppercase tracking-wide text-white/50">
                    SMTP host
                  </span>
                  <input
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white outline-none focus:border-[#c9a961]"
                    placeholder="smtp.example.com"
                    required
                  />
                </label>
                <label className="block">
                  <span className="block text-xs uppercase tracking-wide text-white/50">
                    Port
                  </span>
                  <input
                    type="number"
                    value={port}
                    onChange={(e) => setPort(Number(e.target.value) || 587)}
                    className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white outline-none focus:border-[#c9a961]"
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="block text-xs uppercase tracking-wide text-white/50">
                    Security
                  </span>
                  <select
                    value={secure}
                    onChange={(e) =>
                      setSecure(e.target.value as "tls" | "ssl" | "none")
                    }
                    className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white outline-none focus:border-[#c9a961]"
                  >
                    <option value="tls">STARTTLS (587)</option>
                    <option value="ssl">SSL (465)</option>
                    <option value="none">None</option>
                  </select>
                </label>
              </>
            )}

            <label className="block">
              <span className="block text-xs uppercase tracking-wide text-white/50">
                {preset?.userHint ? "Username" : "Email / username"}
              </span>
              <input
                value={user}
                onChange={(e) => setUser(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white outline-none focus:border-[#c9a961]"
                placeholder={
                  preset?.userHint ? "apikey" : "you@yourdomain.com"
                }
                required
                autoComplete="email"
              />
              {preset?.userHint && (
                <span className="mt-1 block text-[11px] text-white/40">
                  {preset.userHint}
                </span>
              )}
            </label>

            <label className="block">
              <span className="block text-xs uppercase tracking-wide text-white/50">
                Password / API key
              </span>
              <input
                type="password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white outline-none focus:border-[#c9a961]"
                required
                autoComplete="new-password"
              />
              {preset?.passHint && (
                <span className="mt-1 block text-[11px] text-white/40">
                  {preset.passHint}
                </span>
              )}
            </label>

            <label className="block sm:col-span-2">
              <span className="block text-xs uppercase tracking-wide text-white/50">
                From address (optional)
              </span>
              <input
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white outline-none focus:border-[#c9a961]"
                placeholder="Your Salon <hello@yoursalon.com>"
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
            <button
              type="submit"
              disabled={status.kind === "saving"}
              className="rounded-full bg-[#c9a961] px-5 py-2 text-xs font-semibold uppercase tracking-widest text-black hover:bg-[#d8b974] disabled:opacity-50"
            >
              {status.kind === "saving" ? "Working…" : "Save & send test"}
            </button>
          </div>
        </form>
      )}

      <div className="mt-4 text-xs">
        {status.kind === "saving" && (
          <span className="text-white/50">Working…</span>
        )}
        {status.kind === "ok" && (
          <span className="text-emerald-300">{status.msg}</span>
        )}
        {status.kind === "err" && (
          <span className="text-rose-300">{status.msg}</span>
        )}
      </div>
    </div>
  );
}

/**
 * Tiny inline form for sending a one-off Atelier-relay test email. Kept
 * separate so the headline button is still the single decision the operator
 * has to make; the test is a follow-up step.
 */
function SendTestRow({
  onSend,
  busy,
}: {
  onSend: (to: string) => void;
  busy: boolean;
}) {
  const [to, setTo] = useState("");
  return (
    <div className="flex items-center gap-2">
      <input
        type="email"
        value={to}
        onChange={(e) => setTo(e.target.value)}
        placeholder="send test to…"
        className="w-56 rounded-lg border border-white/15 bg-black/30 px-3 py-1.5 text-xs text-white outline-none focus:border-[#c9a961]"
      />
      <button
        type="button"
        disabled={busy || !to.includes("@")}
        onClick={() => onSend(to)}
        className="rounded-full border border-white/15 px-3 py-1.5 text-xs uppercase tracking-widest text-white/80 hover:border-white/30 disabled:opacity-50"
      >
        Send test
      </button>
    </div>
  );
}
