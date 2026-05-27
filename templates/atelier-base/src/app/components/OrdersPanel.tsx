"use client";

import { useEffect, useState } from "react";
import type { Order, OrderStatus } from "../../lib/orders";

const STATUS_TONES: Record<OrderStatus, string> = {
  new: "border-amber-400/40 bg-amber-500/10 text-amber-300",
  paid: "border-emerald-400/40 bg-emerald-500/10 text-emerald-300",
  shipped: "border-blue-400/40 bg-blue-500/10 text-blue-300",
  completed: "border-white/20 bg-white/5 text-white/60",
  cancelled: "border-red-400/40 bg-red-500/10 text-red-300",
  refunded: "border-purple-400/40 bg-purple-500/10 text-purple-300",
};

export default function OrdersPanel() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const r = await fetch("/api/orders");
    const d = await r.json();
    setOrders(d.orders ?? []);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function update(id: string, status: OrderStatus) {
    await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  }

  async function refund(id: string) {
    if (
      !confirm(
        "Refund this order? This issues a real Stripe refund to the customer and cannot be undone.",
      )
    )
      return;
    setBusy(id);
    const r = await fetch(`/api/orders/${id}/refund`, { method: "POST" });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) alert(d.error || "Refund failed.");
    setBusy(null);
    load();
  }

  if (loading) return <p className="text-white/60">Loading…</p>;

  const stats = {
    new: orders.filter((o) => o.status === "new").length,
    revenue: orders
      .filter((o) => o.status !== "cancelled")
      .reduce((s, o) => s + o.subtotal, 0),
  };

  return (
    <div>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Orders" value={orders.length.toString()} />
        <Stat label="New" value={stats.new.toString()} />
        <Stat label="Revenue" value={`$${stats.revenue.toFixed(2)}`} />
      </div>

      {orders.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center text-white/60">
          No orders yet.
        </p>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <details
              key={o.id}
              className="rounded-2xl border border-white/10 bg-white/[0.02] p-4"
            >
              <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
                <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                  <span
                    className={`rounded-full border px-3 py-0.5 text-[10px] uppercase tracking-widest ${STATUS_TONES[o.status]}`}
                  >
                    {o.status}
                  </span>
                  <span className="font-medium">{o.name}</span>
                  <span className="text-white/60">·</span>
                  <span className="font-serif text-lg text-[#c9a961]">
                    ${o.subtotal.toFixed(2)}
                  </span>
                  <span className="text-white/60">
                    · {o.items.reduce((s, i) => s + i.qty, 0)} items
                  </span>
                </div>
                <span className="text-xs text-white/60">
                  {new Date(o.createdAt).toLocaleString()}
                </span>
              </summary>
              <div className="mt-4 grid gap-4 border-t border-white/10 pt-4 sm:grid-cols-[1fr_auto]">
                <div>
                  <p className="text-xs text-white/50">
                    <a href={`tel:${o.phone}`} className="hover:text-white">
                      {o.phone}
                    </a>{" "}
                    ·{" "}
                    <a href={`mailto:${o.email}`} className="hover:text-white">
                      {o.email}
                    </a>
                  </p>
                  <p className="mt-1 text-sm whitespace-pre-line text-white/80">
                    {o.address}, {o.postal} {o.city}
                  </p>
                  {o.notes && (
                    <p className="mt-2 rounded-lg border border-white/10 bg-white/[0.03] p-2 text-xs text-white/60">
                      {o.notes}
                    </p>
                  )}
                  <ul className="mt-3 space-y-1 text-sm">
                    {o.items.map((it, i) => (
                      <li
                        key={i}
                        className="flex justify-between text-white/80"
                      >
                        <span>
                          {it.qty} × {it.name}
                        </span>
                        <span className="text-[#c9a961]">
                          ${(it.price * it.qty).toFixed(2)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-col gap-2">
                  {(["new", "paid", "shipped", "completed", "cancelled"] as OrderStatus[]).map(
                    (s) => (
                      <button
                        key={s}
                        onClick={() => update(o.id, s)}
                        disabled={o.status === s || o.status === "refunded"}
                        className={`rounded-full px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest ${
                          o.status === s
                            ? "cursor-default bg-white/5 text-white/60"
                            : "border border-white/15 bg-white/[0.03] text-white/85 hover:bg-white/10 disabled:opacity-40"
                        }`}
                      >
                        Mark {s}
                      </button>
                    )
                  )}
                  {/* Refund: real Stripe refund, only when the order carries a
                      Stripe payment reference and is not already refunded. */}
                  {o.status !== "refunded" &&
                    o.status !== "cancelled" &&
                    (o.paymentIntentId || o.stripeSessionId) && (
                      <button
                        onClick={() => refund(o.id)}
                        disabled={busy === o.id}
                        className="mt-1 rounded-full border border-red-400/40 bg-red-500/10 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-red-300 hover:bg-red-500/20 disabled:opacity-50"
                      >
                        {busy === o.id ? "Refunding…" : "Refund"}
                      </button>
                    )}
                </div>
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <p className="text-xs uppercase tracking-widest text-white/60">{label}</p>
      <p className="mt-2 font-serif text-3xl">{value}</p>
    </div>
  );
}
