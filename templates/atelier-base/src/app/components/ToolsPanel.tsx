"use client";

import { useEffect, useRef, useState } from "react";
import { clientPath } from "../../lib/basePath";
import { SELECTABLE_TEMPLATES, type TemplateId } from "../../templates/registry";
import OwnerPushPanel from "./OwnerPushPanel";

type AuditEntry = {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  target: string;
  createdAt: string;
};

type Holiday = { id: string; date: string; label: string; recurring: boolean };

export default function ToolsPanel({ isTenant = false }: { isTenant?: boolean }) {
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [holForm, setHolForm] = useState({ date: "", label: "", recurring: false });
  const [gdprId, setGdprId] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  // The /barber showcase locks destructive bulk actions so visitors cannot
  // wipe or overwrite it. The layout marks demo mode with a body class.
  const [isDemo, setIsDemo] = useState(false);
  // Front-end template ("skin") the public site renders. Switching it here
  // rewrites the `template` settings field; the public routes dispatch on it.
  const [template, setTemplate] = useState<TemplateId>("salon");
  const [templateSaving, setTemplateSaving] = useState(false);
  useEffect(() => {
    setIsDemo(document.body.classList.contains("demo-mode"));
  }, []);

  async function load() {
    const [a, h, s] = await Promise.all([
      fetch("/api/audit").then((r) => r.ok ? r.json() : { entries: [] }),
      fetch("/api/holidays").then((r) => r.ok ? r.json() : { holidays: [] }),
      fetch("/api/settings").then((r) => r.ok ? r.json() : { settings: {} }),
    ]);
    setAudit(a.entries ?? []);
    setHolidays(h.holidays ?? []);
    if (SELECTABLE_TEMPLATES.some((t) => t.id === s.settings?.template)) {
      setTemplate(s.settings.template as TemplateId);
    }
  }
  useEffect(() => { load(); }, []);

  async function addHoliday() {
    if (!holForm.date) return;
    await fetch("/api/holidays", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(holForm) });
    setHolForm({ date: "", label: "", recurring: false });
    load();
  }
  async function removeHoliday(id: string) {
    await fetch(`/api/holidays?id=${id}`, { method: "DELETE" });
    load();
  }

  async function saveTemplate(next: TemplateId) {
    if (next === template || templateSaving) return;
    setTemplateSaving(true);
    const prev = template;
    setTemplate(next);
    const r = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ template: next }),
    });
    setTemplateSaving(false);
    if (r.ok) {
      setMsg("Site template updated. Your public website now uses it.");
    } else {
      setTemplate(prev);
      setMsg("Could not update the site template.");
    }
  }

  async function downloadBackup() {
    window.location.href = clientPath("/api/backup");
  }
  async function restoreBackup(file: File) {
    setMsg("Restoring…");
    const text = await file.text();
    const r = await fetch("/api/backup", { method: "POST", headers: { "content-type": "application/json" }, body: text });
    const d = await r.json();
    setMsg(
      r.ok
        ? `Restored ${d.restored} files and ${d.restoredUploads ?? 0} images.`
        : d.error || "Restore failed.",
    );
  }

  async function importDemo() {
    if (!confirm("Import demo content? This replaces your current services, staff, products, pages, blog posts, page content, images and sample records with the full demo set. Your login and business settings are kept.")) return;
    setMsg("Importing demo content…");
    const r = await fetch("/api/import-demo", { method: "POST" });
    const d = await r.json();
    if (r.ok) {
      setMsg(`Imported ${d.imported} demo files and ${d.images ?? 0} images. Reloading…`);
      setTimeout(() => window.location.reload(), 900);
    } else {
      setMsg(d.error || "Import failed.");
    }
  }
  async function resetSite() {
    if (!confirm("Reset the site to a brand-new install? This permanently deletes ALL content, records, settings and uploaded images, and returns the site to the first-run setup wizard. You will need to sign in and run setup again. This cannot be undone.")) return;
    setMsg("Resetting…");
    const r = await fetch("/api/reset-site", { method: "POST" });
    const d = await r.json();
    if (r.ok) {
      setMsg("Site reset to a fresh install. Returning to setup…");
      setTimeout(() => { window.location.href = clientPath("/setup"); }, 900);
    } else {
      setMsg(d.error || "Reset failed.");
    }
  }

  async function deleteAccount() {
    if (!confirm("Permanently delete this account? This cancels your subscription and erases your site, bookings, clients and every record. This cannot be undone.")) return;
    if (!confirm("Final check: the account and all its data will be gone for good. Delete now?")) return;
    setMsg("Deleting account…");
    const r = await fetch("/api/account/delete", { method: "POST" });
    const d = await r.json().catch(() => ({}));
    if (r.ok) {
      setMsg("Account deleted. Goodbye.");
      setTimeout(() => { window.location.href = "/"; }, 1400);
    } else {
      setMsg(d.error || "Could not delete the account.");
    }
  }

  async function exportGdpr() {
    if (!gdprId) return;
    window.location.href = clientPath(`/api/gdpr?id=${encodeURIComponent(gdprId)}`);
  }
  async function deleteGdpr() {
    if (!gdprId) return;
    if (!confirm(`Redact all personal data matching "${gdprId}"? This is irreversible.`)) return;
    const r = await fetch(`/api/gdpr?id=${encodeURIComponent(gdprId)}`, { method: "DELETE" });
    const d = await r.json();
    setMsg(r.ok ? `Redacted: ${d.redacted.bookings}b / ${d.redacted.orders}o / ${d.redacted.clients}c.` : d.error || "Failed.");
  }

  return (
    <div className="space-y-6">
      <h2 className="font-serif text-2xl">Tools</h2>

      {msg && <div className="rounded-xl border border-white/15 bg-white/[0.04] p-3 text-sm text-white/80">{msg}</div>}

      <OwnerPushPanel />

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-widest text-white/70">Site template</h3>
        <p className="mb-3 text-xs text-white/60">Pick the front-end design your public website uses. Your admin panel, bookings and all other data stay exactly the same.</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {SELECTABLE_TEMPLATES.map((tpl) => {
            const active = tpl.id === template;
            return (
              <button
                key={tpl.id}
                onClick={() => saveTemplate(tpl.id)}
                disabled={isDemo || templateSaving}
                className={`overflow-hidden rounded-xl border text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${active ? "border-[#c9a961] bg-[#c9a961]/10" : "border-white/15 bg-white/[0.02] hover:bg-white/[0.05]"}`}
              >
                <div className="relative aspect-[16/10] w-full overflow-hidden border-b border-white/10 bg-[#0a0806]">
                  <iframe
                    src={clientPath("/preview/" + tpl.id)}
                    title={`${tpl.name} preview`}
                    loading="lazy"
                    tabIndex={-1}
                    aria-hidden="true"
                    className="absolute left-0 top-0 origin-top-left"
                    style={{ width: "400%", height: "400%", border: 0, transform: "scale(0.25)", pointerEvents: "none" }}
                  />
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-serif text-lg">{tpl.name}</span>
                    {active && <span className="text-[10px] font-semibold uppercase tracking-widest text-[#c9a961]">Active</span>}
                  </div>
                  <p className="mt-1 text-xs text-white/60">{tpl.description}</p>
                </div>
              </button>
            );
          })}
        </div>
        {isDemo && <p className="mt-2 text-xs text-[#c9a961]">Template switching is disabled on the live demo.</p>}
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-widest text-white/70">Backup & restore</h3>
        <div className="flex flex-wrap gap-2">
          <button onClick={downloadBackup} className="rounded-full bg-[#c9a961] px-5 py-2 text-xs font-semibold uppercase tracking-widest text-black">Download backup</button>
          <input ref={fileRef} type="file" accept=".json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) restoreBackup(f); e.target.value = ""; }} />
          <button onClick={() => fileRef.current?.click()} disabled={isDemo} className="rounded-full border border-white/15 px-5 py-2 text-xs uppercase tracking-widest text-white/70 disabled:cursor-not-allowed disabled:opacity-40">Restore from file</button>
        </div>
        <p className="mt-2 text-xs text-white/60">A full-site backup: every record (bookings, orders, products, clients, services, staff, pages, content, settings and more) plus all uploaded images, in one file. Restore brings the site back exactly, nothing missing.</p>
        {isDemo && <p className="mt-1 text-xs text-[#c9a961]">Restore is disabled on the live demo.</p>}
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-widest text-white/70">Demo content & reset</h3>
        <div className="flex flex-wrap gap-2">
          <button onClick={importDemo} disabled={isDemo} className="rounded-full border border-white/15 px-5 py-2 text-xs uppercase tracking-widest text-white/80 disabled:cursor-not-allowed disabled:opacity-40">Import demo content</button>
          <button onClick={resetSite} disabled={isDemo} className="rounded-full border border-red-400/40 px-5 py-2 text-xs uppercase tracking-widest text-red-300 disabled:cursor-not-allowed disabled:opacity-40">Reset site</button>
        </div>
        <p className="mt-2 text-xs text-white/60">Import demo content fills the site with the full demo: services, staff, products, blog posts, reviews and images, so you can see how a populated site looks. Reset wipes the site back to a brand-new install and returns it to the first-run setup wizard.</p>
        {isDemo && <p className="mt-1 text-xs text-[#c9a961]">Import and reset are disabled on the live demo. It restores itself every hour.</p>}
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-widest text-white/70">Holidays & closures</h3>
        <div className="mb-3 grid gap-2 sm:grid-cols-[160px_1fr_auto_auto]">
          <input type="date" value={holForm.date} onChange={(e) => setHolForm({ ...holForm, date: e.target.value })} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm" style={{ colorScheme: "dark" }} />
          <input placeholder="Label (e.g. Christmas)" value={holForm.label} onChange={(e) => setHolForm({ ...holForm, label: e.target.value })} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm" />
          <label className="flex items-center gap-2 px-2 text-sm">
            <input type="checkbox" checked={holForm.recurring} onChange={(e) => setHolForm({ ...holForm, recurring: e.target.checked })} />
            Yearly
          </label>
          <button onClick={addHoliday} className="rounded-full bg-[#c9a961] px-4 py-1 text-xs font-semibold uppercase tracking-widest text-black">Add</button>
        </div>
        <ul className="divide-y divide-white/10 border-y border-white/10">
          {holidays.length === 0 ? <li className="py-3 text-white/60">No holidays set.</li> : holidays.map((h) => (
            <li key={h.id} className="flex items-center justify-between py-2 text-sm">
              <span>{h.date} · {h.label} {h.recurring && <span className="text-xs text-white/60">· yearly</span>}</span>
              <button onClick={() => removeHoliday(h.id)} className="rounded-full border border-red-400/40 px-3 py-1 text-[10px] uppercase tracking-widest text-red-300">Delete</button>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-widest text-white/70">GDPR · personal data</h3>
        <div className="flex flex-wrap gap-2">
          <input placeholder="email or phone" value={gdprId} onChange={(e) => setGdprId(e.target.value)} className="min-w-[260px] flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm" />
          <button onClick={exportGdpr} className="rounded-full border border-white/15 px-5 py-2 text-xs uppercase tracking-widest text-white/80">Export JSON</button>
          <button onClick={deleteGdpr} className="rounded-full border border-red-400/40 px-5 py-2 text-xs uppercase tracking-widest text-red-300">Redact</button>
        </div>
        <p className="mt-2 text-xs text-white/60">Redacts name, email, phone, address, notes across bookings, orders, clients.</p>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-widest text-white/70">Audit log</h3>
        {audit.length === 0 ? <p className="text-white/60">No audit entries yet.</p> : (
          <ul className="max-h-96 divide-y divide-white/10 overflow-y-auto border-y border-white/10 text-sm">
            {audit.map((a) => (
              <li key={a.id} className="py-2">
                <div className="flex justify-between">
                  <span><span className="text-white/80">{a.userEmail}</span> <span className="text-[#c9a961]">{a.action}</span> <span className="text-white/60">{a.target}</span></span>
                  <span className="text-xs text-white/60">{new Date(a.createdAt).toLocaleString()}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Hosted SaaS accounts only — a standalone install owns its own server
          and has nothing to "delete" here. Hidden on the /barber showcase. */}
      {isTenant && !isDemo && (
        <section className="rounded-2xl border border-red-400/30 bg-red-500/[0.04] p-5">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-widest text-red-300">Danger zone</h3>
          <button
            onClick={deleteAccount}
            className="rounded-full border border-red-400/50 bg-red-500/10 px-5 py-2 text-xs uppercase tracking-widest text-red-300 transition-colors hover:bg-red-500/20"
          >
            Delete account
          </button>
          <p className="mt-2 text-xs text-white/60">Permanently deletes this account: cancels your subscription and erases your site, bookings, clients and every record. This cannot be undone.</p>
        </section>
      )}
    </div>
  );
}
