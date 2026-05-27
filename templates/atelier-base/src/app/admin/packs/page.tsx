"use client";

import { useEffect, useState } from "react";
import type { Pack, CustomerPack } from "@/lib/packs";

/**
 * /admin/packs — Class packs.
 *
 * Two sections: the catalogue (pack definitions the studio sells) and the
 * customer balances (who owns what, how many credits left, when they expire).
 *
 * Operators can define new packs, issue a pack to a customer by email, and
 * void a customer pack. Pack redemption happens automatically inside the
 * booking flow via `findRedeemablePack()` — there's no manual redeem here.
 *
 * Stripe purchase wiring (customer-side checkout) is intentionally out of
 * scope for this page: the operator can issue a pack after any out-of-band
 * payment. Self-serve purchase is the natural follow-on.
 */

type Data = { packs: Pack[]; customerPacks: CustomerPack[] };

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  } catch { return iso; }
}

function expiryText(p: CustomerPack): string {
  if (p.voidedAt) return "voided";
  if (!p.expiresAt) return "no expiry";
  const ms = Date.parse(p.expiresAt) - Date.now();
  if (ms <= 0) return "expired";
  const days = Math.ceil(ms / 86_400_000);
  if (days <= 30) return `expires in ${days}d`;
  return `expires ${fmtDate(p.expiresAt)}`;
}

export default function PacksPage() {
  const [data, setData] = useState<Data | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    try {
      const r = await fetch("/api/admin/packs", { credentials: "same-origin" });
      if (r.status === 401) { setError("Sign in as staff to manage packs."); return; }
      const j = (await r.json()) as Data;
      setData(j);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load.");
    }
  }

  useEffect(() => { reload(); }, []);

  async function post(action: string, body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/admin/packs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ action, ...body }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || `Request failed (${r.status})`);
      }
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  }

  function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    void post("createPack", {
      name: fd.get("name"),
      classes: Number(fd.get("classes")),
      price: Number(fd.get("price")),
      validityDays: fd.get("validityDays") ? Number(fd.get("validityDays")) : undefined,
    });
    e.currentTarget.reset();
  }

  function onGrant(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    void post("grant", {
      packId: fd.get("packId"),
      customerEmail: fd.get("customerEmail"),
      customerName: fd.get("customerName"),
    });
    e.currentTarget.reset();
  }

  const packs = data?.packs ?? [];
  const customerPacks = data?.customerPacks ?? [];

  return (
    <main className="mx-auto max-w-5xl px-5 py-10 text-[var(--foreground)]">
      <header className="mb-8">
        <div className="text-xs uppercase tracking-[0.3em] text-[var(--gold)]">Booking</div>
        <h1 className="mt-2 font-serif text-3xl">Class packs</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
          Prepaid bundles of class credits. Customers redeem them automatically when they
          book a covered service. Memberships are handled separately under subscriptions.
        </p>
      </header>

      {error && (
        <div className="mb-6 rounded-lg border border-red-400/40 bg-red-400/10 px-4 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      <section className="rounded-2xl border border-[var(--border)] p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-serif text-xl">Catalogue</h2>
          <span className="text-xs text-[var(--muted2)]">{packs.length} pack{packs.length === 1 ? "" : "s"}</span>
        </div>
        <form onSubmit={onCreate} className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <input name="name" required placeholder="Name (e.g. 10-class pack)" className="col-span-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" />
          <input name="classes" required type="number" min={1} placeholder="Classes" className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" />
          <input name="price" required type="number" min={0} step="0.01" placeholder="Price" className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" />
          <div className="flex gap-2">
            <input name="validityDays" type="number" min={0} placeholder="Valid days" className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" />
            <button disabled={busy} type="submit" className="rounded-lg bg-[var(--gold)] px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--background)] disabled:opacity-50">Add</button>
          </div>
        </form>
        <div className="mt-5 overflow-x-auto">
          {packs.length === 0 ? (
            <p className="py-4 text-sm text-[var(--muted2)]">No packs yet. Define your first above.</p>
          ) : (
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-[var(--muted2)]">
                <tr>
                  <th className="py-2">Name</th>
                  <th className="py-2 text-right">Classes</th>
                  <th className="py-2 text-right">Price</th>
                  <th className="py-2 text-right">Valid</th>
                  <th className="py-2 text-right">Enabled</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {packs.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2.5">{p.name}</td>
                    <td className="py-2.5 text-right font-serif">{p.classes}</td>
                    <td className="py-2.5 text-right">{p.price.toFixed(2)}</td>
                    <td className="py-2.5 text-right text-[var(--muted)]">{p.validityDays ? `${p.validityDays}d` : "—"}</td>
                    <td className="py-2.5 text-right">
                      <button
                        disabled={busy}
                        onClick={() => post("updatePack", { id: p.id, patch: { enabled: !p.enabled } })}
                        className={`rounded-full border px-2 py-0.5 text-xs ${p.enabled ? "border-emerald-400/30 text-emerald-300" : "border-[var(--border-strong)] text-[var(--muted2)]"}`}
                      >
                        {p.enabled ? "on" : "off"}
                      </button>
                    </td>
                    <td className="py-2.5 text-right">
                      <button
                        disabled={busy}
                        onClick={() => { if (confirm(`Delete "${p.name}"?`)) post("deletePack", { id: p.id }); }}
                        className="text-xs text-red-300 hover:underline"
                      >
                        delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-[var(--border)] p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-serif text-xl">Customer balances</h2>
          <span className="text-xs text-[var(--muted2)]">
            {customerPacks.filter((p) => !p.voidedAt && p.classesRemaining > 0).length} live · {customerPacks.length} total
          </span>
        </div>
        <form onSubmit={onGrant} className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <select name="packId" required className="col-span-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm">
            <option value="">Pack…</option>
            {packs.filter((p) => p.enabled).map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({p.classes} · {p.price.toFixed(0)})</option>
            ))}
          </select>
          <input name="customerEmail" required type="email" placeholder="customer@email" className="col-span-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" />
          <div className="flex gap-2">
            <input name="customerName" placeholder="Name (optional)" className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm" />
            <button disabled={busy || packs.length === 0} type="submit" className="rounded-lg bg-[var(--gold)] px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[var(--background)] disabled:opacity-50">Issue</button>
          </div>
        </form>
        <div className="mt-5 overflow-x-auto">
          {customerPacks.length === 0 ? (
            <p className="py-4 text-sm text-[var(--muted2)]">No issued packs yet.</p>
          ) : (
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-[var(--muted2)]">
                <tr>
                  <th className="py-2">Customer</th>
                  <th className="py-2">Pack</th>
                  <th className="py-2 text-right">Remaining</th>
                  <th className="py-2 text-right">Purchased</th>
                  <th className="py-2 text-right">Expiry</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {customerPacks.map((p) => {
                  const dead = p.voidedAt || p.classesRemaining === 0 || (p.expiresAt && Date.parse(p.expiresAt) <= Date.now());
                  return (
                    <tr key={p.id} className={dead ? "opacity-50" : ""}>
                      <td className="py-2.5">
                        <div>{p.customerName || p.customerEmail.split("@")[0]}</div>
                        <div className="font-mono text-xs text-[var(--muted2)]">{p.customerEmail}</div>
                      </td>
                      <td className="py-2.5">{p.packName}</td>
                      <td className="py-2.5 text-right font-serif">{p.classesRemaining} / {p.classesGranted}</td>
                      <td className="py-2.5 text-right text-[var(--muted2)]">{fmtDate(p.purchasedAt)}</td>
                      <td className="py-2.5 text-right text-[var(--muted)]">{expiryText(p)}</td>
                      <td className="py-2.5 text-right">
                        {!p.voidedAt && (
                          <button
                            disabled={busy}
                            onClick={() => { if (confirm(`Void this pack for ${p.customerEmail}? Remaining credits are forfeit.`)) post("voidCustomerPack", { id: p.id }); }}
                            className="text-xs text-red-300 hover:underline"
                          >
                            void
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </main>
  );
}
