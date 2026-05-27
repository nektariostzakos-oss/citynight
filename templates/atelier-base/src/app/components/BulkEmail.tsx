"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Booking, BookingStatus } from "../../lib/bookings";
import { useBusiness } from "../../lib/businessClient";

type Audience =
  | "all"
  | "upcoming"
  | "today"
  | "completed"
  | "cancelled"
  | "custom";

type LogEntry = {
  to: string;
  subject: string;
  body: string;
  sentAt: string;
  delivered: boolean;
  error?: string;
};

type Template = { id: string; label: string; subject: string; body: string };

function buildTemplates(name: string): Template[] {
  return [
    {
      id: "reminder",
      label: "Appointment reminder",
      subject: `Reminder · Your ${name} booking`,
      body: `Hi {name},\n\nQuick reminder of your booking at ${name} tomorrow.\n\nSee you soon,\nThe team`,
    },
    {
      id: "promo",
      label: "Monthly promo",
      subject: `10% off this month at ${name}`,
      body: `Hi {name},\n\nA small thank-you for being one of our regulars. 10% off any service this month.\nMention the code at the chair.\n\nSee you soon,\nThe team`,
    },
    {
      id: "closure",
      label: "Holiday closure",
      subject: "We're closed: short break ahead",
      body: `Hi {name},\n\nA quick heads-up: the studio will be closed from {date} to {date2} for a short break.\nBookings outside that window remain confirmed.\n\nThanks for your patience,\nThe team`,
    },
    {
      id: "blank",
      label: "Blank",
      subject: "",
      body: "",
    },
  ];
}

export default function BulkEmail({ bookings }: { bookings: Booking[] }) {
  const { business } = useBusiness();
  const businessName = business.name || "Your Salon";
  const TEMPLATES = useMemo(() => buildTemplates(businessName), [businessName]);

  const [audience, setAudience] = useState<Audience>("upcoming");
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "all">(
    "all"
  );
  const [customRecipients, setCustomRecipients] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const seededRef = useRef(false);

  // Seed subject/body from the first template once the business name loads.
  useEffect(() => {
    if (!seededRef.current && TEMPLATES[0].subject) {
      seededRef.current = true;
      setSubject(TEMPLATES[0].subject);
      setBody(TEMPLATES[0].body);
    }
  }, [TEMPLATES]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    sent: number;
    failed: number;
    mode: "smtp" | "preview";
  } | null>(null);
  const [smtp, setSmtp] = useState<boolean | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);

  useEffect(() => {
    fetch("/api/email")
      .then((r) => r.json())
      .then((d) => {
        setSmtp(d.smtp);
        setLog(d.log ?? []);
      })
      .catch(() => {});
  }, [result]);

  const today = new Date().toISOString().slice(0, 10);

  const recipients = useMemo<{ email: string; name: string }[]>(() => {
    if (audience === "custom") {
      return customRecipients
        .split(/[,\n]/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((email) => ({ email, name: "there" }));
    }
    let pool = bookings.filter((b) => !!b.email);
    if (audience === "upcoming") pool = pool.filter((b) => b.date >= today);
    if (audience === "today") pool = pool.filter((b) => b.date === today);
    if (audience === "completed")
      pool = pool.filter((b) => b.status === "completed");
    if (audience === "cancelled")
      pool = pool.filter((b) => b.status === "cancelled");
    if (statusFilter !== "all")
      pool = pool.filter((b) => b.status === statusFilter);
    const seen = new Set<string>();
    const out: { email: string; name: string }[] = [];
    for (const b of pool) {
      const key = b.email.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ email: b.email, name: b.name });
    }
    return out;
  }, [audience, customRecipients, bookings, statusFilter, today]);

  function applyTemplate(id: string) {
    const t = TEMPLATES.find((x) => x.id === id);
    if (!t) return;
    setSubject(t.subject);
    setBody(t.body);
  }

  async function send() {
    if (recipients.length === 0 || !subject.trim() || !body.trim()) return;
    if (
      !confirm(
        `Send to ${recipients.length} recipient${
          recipients.length === 1 ? "" : "s"
        }?`
      )
    )
      return;
    setSubmitting(true);
    setResult(null);
    const res = await fetch("/api/email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        recipients: recipients.map((r) => r.email),
        subject,
        body,
      }),
    });
    const d = await res.json();
    setResult(d);
    setSubmitting(false);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
      <div className="space-y-6">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <p className="mb-3 text-xs uppercase tracking-widest text-white/60">
            Audience
          </p>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["upcoming", "Upcoming"],
                ["today", "Today"],
                ["all", "All clients"],
                ["completed", "Completed"],
                ["cancelled", "Cancelled"],
                ["custom", "Custom list"],
              ] as [Audience, string][]
            ).map(([id, label]) => {
              const active = audience === id;
              return (
                <button
                  key={id}
                  onClick={() => setAudience(id)}
                  className={`rounded-full border px-4 py-1.5 text-xs uppercase tracking-widest transition-colors ${
                    active
                      ? "border-[#c9a961] bg-[#c9a961] text-black"
                      : "border-white/15 text-white/70 hover:bg-white/10"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {audience !== "custom" && (
            <div className="mt-4">
              <p className="mb-2 text-xs uppercase tracking-widest text-white/60">
                Refine by status
              </p>
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as BookingStatus | "all")
                }
                style={{ colorScheme: "dark" }}
                className="appearance-none rounded-lg border border-white/15 bg-[#14110d] bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2210%22 height=%226%22 viewBox=%220 0 10 6%22><path fill=%22%23c9a961%22 d=%22M0 0l5 6 5-6z%22/></svg>')] bg-[length:10px_6px] bg-[position:right_14px_center] bg-no-repeat px-4 py-2 pr-9 text-sm text-white outline-none transition-colors hover:bg-white/[0.06] focus:border-white/40"
              >
                <option value="all">Any status</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          )}

          {audience === "custom" && (
            <div className="mt-4">
              <p className="mb-2 text-xs uppercase tracking-widest text-white/60">
                Email addresses (comma or newline)
              </p>
              <textarea
                rows={4}
                value={customRecipients}
                onChange={(e) => setCustomRecipients(e.target.value)}
                placeholder="one@example.com, two@example.com"
                className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:border-white/40"
              />
            </div>
          )}

          <p className="mt-4 text-xs text-white/50">
            {recipients.length} recipient{recipients.length === 1 ? "" : "s"}{" "}
            selected
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <p className="mb-3 text-xs uppercase tracking-widest text-white/60">
            Templates
          </p>
          <div className="flex flex-wrap gap-2">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => applyTemplate(t.id)}
                className="rounded-full border border-white/15 px-4 py-1.5 text-xs uppercase tracking-widest text-white/80 transition-colors hover:bg-white/10"
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <label className="mb-2 block text-xs uppercase tracking-widest text-white/60">
                Subject
              </label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none focus:border-white/40"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs uppercase tracking-widest text-white/60">
                Message
              </label>
              <textarea
                rows={10}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your message…"
                className="w-full resize-y rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none focus:border-white/40"
              />
              <p className="mt-2 text-xs text-white/60">
                Plain text. Lines will be wrapped as paragraphs in the email.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={send}
              disabled={
                submitting ||
                recipients.length === 0 ||
                !subject.trim() ||
                !body.trim()
              }
              className="rounded-full bg-[#c9a961] px-7 py-3 text-xs font-semibold uppercase tracking-widest text-black disabled:opacity-40"
            >
              {submitting ? "Sending…" : `Send to ${recipients.length}`}
            </button>
            {smtp === false && (
              <p className="text-xs text-amber-300/80">
                SMTP not configured. Runs in preview mode (logs only, no
                actual delivery). Set SMTP_HOST / SMTP_USER / SMTP_PASS env
                vars to enable real sending.
              </p>
            )}
          </div>

          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`mt-6 rounded-xl border p-4 text-sm ${
                  result.mode === "smtp"
                    ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
                    : "border-amber-400/40 bg-amber-500/10 text-amber-200"
                }`}
              >
                {result.mode === "smtp"
                  ? `Sent ${result.sent} email${result.sent === 1 ? "" : "s"} (${result.failed} failed).`
                  : `Preview mode: queued ${recipients.length} message${
                      recipients.length === 1 ? "" : "s"
                    } to the log. No emails were actually delivered.`}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="space-y-6">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <p className="mb-3 text-xs uppercase tracking-widest text-white/60">
            Recipients preview
          </p>
          <div className="max-h-72 overflow-y-auto pr-2 text-sm">
            {recipients.length === 0 ? (
              <p className="text-white/60">No recipients match your filter.</p>
            ) : (
              recipients.map((r) => (
                <div
                  key={r.email}
                  className="flex items-center justify-between border-b border-white/5 py-2 last:border-b-0"
                >
                  <span className="text-white">{r.name}</span>
                  <span className="text-white/50">{r.email}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <p className="mb-3 text-xs uppercase tracking-widest text-white/60">
            Recent activity
          </p>
          <div className="max-h-96 space-y-2 overflow-y-auto pr-2 text-sm">
            {log.length === 0 ? (
              <p className="text-white/60">No emails sent yet.</p>
            ) : (
              log.slice(0, 30).map((e, i) => (
                <div
                  key={i}
                  className="flex items-start justify-between gap-3 border-b border-white/5 pb-2 last:border-b-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-white">{e.to}</p>
                    <p className="truncate text-xs text-white/60">
                      {e.subject}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-widest ${
                      e.delivered
                        ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-300"
                        : "border-amber-400/40 bg-amber-500/10 text-amber-300"
                    }`}
                  >
                    {e.delivered ? "Sent" : "Preview"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
