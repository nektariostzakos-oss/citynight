"use client";

import { useEffect, useState } from "react";

type Redemption = { at: string; amount: number; note?: string };
type GiftCard = {
  id: string;
  code: string;
  amount: number;
  balance: number;
  buyerName: string;
  buyerEmail: string;
  recipient?: string;
  orderId?: string;
  issuedAt: string;
  status: "active" | "redeemed" | "expired";
  redemptions: Redemption[];
};

export default function GiftCardsPanel() {
  const [cards, setCards] = useState<GiftCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const r = await fetch("/api/gift-cards");
    const d = await r.json();
    setCards(d.cards ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function redeem() {
    setMsg(null);
    const r = await fetch("/api/gift-cards", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "redeem", code, amount: Number(amount), note }),
    });
    const d = await r.json();
    if (!r.ok || !d.ok) {
      setMsg(d.error || "Redeem failed");
      return;
    }
    setMsg(`✓ Redeemed $${Number(amount).toFixed(2)}. Balance: $${d.card.balance.toFixed(2)}`);
    setCode("");
    setAmount("");
    setNote("");
    load();
  }

  return (
    <div>
      <h2 className="mb-1 font-serif text-2xl">Gift cards</h2>
      <p className="mb-6 text-xs text-white/50">
        Codes auto-issued when a voucher product is ordered. Redeem from here as the card is spent in the chair.
      </p>

      <div className="mb-8 rounded-xl border border-white/10 bg-white/[0.02] p-5">
        <p className="mb-3 text-[10px] uppercase tracking-[0.3em] text-[#c9a961]">Redeem</p>
        <div className="grid gap-3 sm:grid-cols-[1.2fr_1fr_1.5fr_auto]">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="GC-XXXX-XXXX"
            className="rounded-md border border-white/10 bg-white/5 px-3 py-2 font-mono text-sm text-white"
          />
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount $"
            type="number"
            min={0.01}
            step={0.01}
            className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
          />
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional)"
            className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
          />
          <button
            onClick={redeem}
            disabled={!code || !amount}
            className="rounded-full bg-[#c9a961] px-5 py-2 text-xs font-semibold uppercase tracking-widest text-black disabled:opacity-60"
          >
            Redeem
          </button>
        </div>
        {msg && <p className="mt-3 text-xs text-white/70">{msg}</p>}
      </div>

      {loading ? (
        <p className="text-white/60">Loading…</p>
      ) : cards.length === 0 ? (
        <p className="rounded-lg border border-white/10 bg-white/[0.02] p-6 text-center text-white/60">
          No gift cards yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.03] text-left text-[10px] uppercase tracking-widest text-white/50">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Buyer</th>
                <th className="px-4 py-3">Recipient</th>
                <th className="px-4 py-3 text-right">Issued</th>
                <th className="px-4 py-3 text-right">Balance</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {cards.map((c) => (
                <tr key={c.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-mono text-[#c9a961]">{c.code}</td>
                  <td className="px-4 py-3">
                    <div className="text-white">{c.buyerName}</div>
                    <div className="text-xs text-white/60">{c.buyerEmail}</div>
                  </td>
                  <td className="px-4 py-3 text-white/70">{c.recipient || "—"}</td>
                  <td className="px-4 py-3 text-right text-white/60">${c.amount.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={c.balance > 0 ? "text-[#c9a961]" : "text-white/60"}>
                      ${c.balance.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest ${
                      c.status === "active" ? "bg-emerald-500/15 text-emerald-300" :
                      c.status === "redeemed" ? "bg-white/10 text-white/60" :
                      "bg-amber-500/15 text-amber-200"
                    }`}>
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
