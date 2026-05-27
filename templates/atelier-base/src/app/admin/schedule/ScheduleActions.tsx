"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";

export default function ScheduleActions() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = params.get("date") ?? new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(current);

  useEffect(() => setDate(current), [current]);

  function go(newDate: string) {
    router.push(`${pathname}?date=${encodeURIComponent(newDate)}`);
  }

  function shift(days: number) {
    const d = new Date(date + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + days);
    go(d.toISOString().slice(0, 10));
  }

  return (
    <div className="mx-auto mb-6 flex max-w-5xl flex-wrap items-center justify-between gap-3 print:hidden">
      <div className="flex items-center gap-2">
        <a href="/admin" className="rounded-full border border-black/20 px-3 py-1.5 text-[10px] uppercase tracking-widest text-black/70 hover:bg-black/5">
          ← Admin
        </a>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => shift(-1)}
          className="rounded-full border border-black/20 px-3 py-1.5 text-[10px] uppercase tracking-widest text-black/70 hover:bg-black/5"
        >
          ← Prev
        </button>
        <input
          type="date"
          value={date}
          onChange={(e) => go(e.target.value)}
          className="rounded-md border border-black/20 bg-white px-3 py-1.5 text-sm text-black"
        />
        <button
          onClick={() => shift(1)}
          className="rounded-full border border-black/20 px-3 py-1.5 text-[10px] uppercase tracking-widest text-black/70 hover:bg-black/5"
        >
          Next →
        </button>
        <button
          onClick={() => go(new Date().toISOString().slice(0, 10))}
          className="rounded-full border border-black/20 px-3 py-1.5 text-[10px] uppercase tracking-widest text-black/70 hover:bg-black/5"
        >
          Today
        </button>
        <button
          onClick={() => window.print()}
          className="rounded-full bg-black px-4 py-1.5 text-[10px] uppercase tracking-widest text-white"
        >
          Print
        </button>
      </div>
    </div>
  );
}
