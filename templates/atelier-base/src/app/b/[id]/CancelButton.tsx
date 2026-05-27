"use client";

import { useState } from "react";

export default function CancelButton({
  id,
  token,
  label,
  confirmText,
}: {
  id: string;
  token: string;
  label: string;
  confirmText: string;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function cancel() {
    if (!confirm(confirmText)) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch(`/api/bookings/${encodeURIComponent(id)}/cancel`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error || "Cancel failed");
      }
      // Reload to reflect cancelled status
      window.location.reload();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <>
      <button
        onClick={cancel}
        disabled={busy}
        className="inline-flex items-center rounded-full px-5 py-2.5 text-xs font-semibold uppercase tracking-widest disabled:opacity-60"
        style={{ background: "#e04d4d", color: "white" }}
      >
        {busy ? "…" : label}
      </button>
      {err && (
        <p className="mt-2 w-full text-xs" style={{ color: "#ffa0a0" }}>
          {err}
        </p>
      )}
    </>
  );
}
