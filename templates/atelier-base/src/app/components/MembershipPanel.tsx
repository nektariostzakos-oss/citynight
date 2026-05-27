"use client";

import { useEffect, useState } from "react";

type Membership = {
  enabled: boolean;
  discountPercent: number;
  price1m?: number;
  price6m?: number;
  price12m?: number;
};

type Subscription = {
  id: string;
  email: string;
  name: string;
  term: number;
  discountPercent: number;
  pricePaid: number;
  expiresAt: string;
};

const EMPTY: Membership = { enabled: false, discountPercent: 10 };

export default function MembershipPanel() {
  const [m, setM] = useState<Membership>(EMPTY);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function load() {
    const r = await fetch("/api/membership/admin");
    if (!r.ok) return;
    const d = await r.json();
    setM({ ...EMPTY, ...(d.membership ?? {}) });
    setSubs(Array.isArray(d.subscriptions) ? d.subscriptions : []);
  }
  useEffect(() => {
    load();
  }, []);

  async function save() {
    setBusy(true);
    setSaved(false);
    await fetch("/api/membership/admin", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(m),
    });
    setBusy(false);
    setSaved(true);
    load();
  }

  const now = Date.now();
  const active = subs.filter((s) => new Date(s.expiresAt).getTime() > now);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <h2 className="font-serif text-2xl">Membership</h2>
      <p className="mt-1 text-sm text-white/55">
        Sell prepaid memberships. A member gets a standing discount on every
        booking, applied automatically at checkout. Members pay once for the
        term they pick; there is no auto-renew.
      </p>

      <label className="mt-5 flex items-center gap-2">
        <input
          type="checkbox"
          checked={m.enabled}
          onChange={(e) => setM({ ...m, enabled: e.target.checked })}
        />
        <span className="text-sm">Offer memberships in the booking flow</span>
      </label>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Num
          label="Member discount (%)"
          value={m.discountPercent}
          onChange={(v) => setM({ ...m, discountPercent: v })}
        />
        <div />
        <Num
          label="1 month price (blank = hide)"
          value={m.price1m ?? 0}
          onChange={(v) => setM({ ...m, price1m: v })}
        />
        <Num
          label="6 month price (blank = hide)"
          value={m.price6m ?? 0}
          onChange={(v) => setM({ ...m, price6m: v })}
        />
        <Num
          label="12 month price (blank = hide)"
          value={m.price12m ?? 0}
          onChange={(v) => setM({ ...m, price12m: v })}
        />
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          onClick={save}
          disabled={busy}
          className="rounded-full bg-[#c9a961] px-6 py-2.5 text-xs font-semibold uppercase tracking-widest text-black disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save"}
        </button>
        {saved && <span className="text-xs text-emerald-400">Saved.</span>}
      </div>

      <div className="mt-8">
        <h3 className="font-serif text-lg">
          Members{" "}
          <span className="text-sm text-white/50">
            ({active.length} active{subs.length > active.length
              ? ` · ${subs.length - active.length} expired`
              : ""})
          </span>
        </h3>
        {subs.length === 0 ? (
          <p className="mt-2 text-sm text-white/50">No memberships sold yet.</p>
        ) : (
          <div className="mt-2 overflow-hidden rounded-xl border border-white/10">
            {subs.map((s) => {
              const live = new Date(s.expiresAt).getTime() > now;
              return (
                <div
                  key={s.id}
                  className="flex flex-wrap items-center gap-3 border-b border-white/10 p-3 text-sm last:border-b-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {s.name || s.email}
                    </p>
                    <p className="truncate text-xs text-white/50">
                      {s.email} · {s.term} month · −{s.discountPercent}%
                    </p>
                  </div>
                  <span
                    className={`text-xs ${
                      live ? "text-emerald-400" : "text-white/40"
                    }`}
                  >
                    {live ? "active" : "expired"} ·{" "}
                    {new Date(s.expiresAt).toLocaleDateString()}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Num({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-[10px] uppercase tracking-widest text-white/65">
        {label}
      </label>
      <input
        type="number"
        min={0}
        value={value || ""}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-white/40"
      />
    </div>
  );
}
