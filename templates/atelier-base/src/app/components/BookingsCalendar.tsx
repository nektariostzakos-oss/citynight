"use client";

import type { Booking } from "../../lib/bookings";

function addDays(base: Date, n: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}
function isoDay(d: Date) {
  return d.toISOString().slice(0, 10);
}

const STATUS_BG: Record<Booking["status"], string> = {
  pending: "bg-amber-500/20 border-amber-400/40 text-amber-200",
  confirmed: "bg-emerald-500/20 border-emerald-400/40 text-emerald-200",
  completed: "bg-white/10 border-white/20 text-white/70",
  cancelled: "bg-red-500/15 border-red-400/40 text-red-200",
};

export default function BookingsCalendar({
  bookings,
  weekStart,
  onShift,
  onSelect,
}: {
  bookings: Booking[];
  weekStart: Date;
  onShift: (n: number) => void;
  onSelect: (b: Booking) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const hours = Array.from({ length: 13 }, (_, i) => 9 + i); // 9..21

  const byDayHour = new Map<string, Booking[]>();
  for (const b of bookings) {
    const h = Number(b.time.slice(0, 2));
    const key = `${b.date}::${h}`;
    const arr = byDayHour.get(key) ?? [];
    arr.push(b);
    byDayHour.set(key, arr);
  }

  return (
    <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02]">
      <div className="flex items-center justify-between border-b border-white/10 p-3">
        <div className="flex gap-2">
          <button onClick={() => onShift(-7)} className="rounded-full border border-white/15 px-3 py-1 text-xs uppercase tracking-widest text-white/80 hover:bg-white/10">‹ Prev</button>
          <button onClick={() => onShift(0)} className="rounded-full border border-white/15 px-3 py-1 text-xs uppercase tracking-widest text-white/80 hover:bg-white/10">Today</button>
          <button onClick={() => onShift(7)} className="rounded-full border border-white/15 px-3 py-1 text-xs uppercase tracking-widest text-white/80 hover:bg-white/10">Next ›</button>
        </div>
        <p className="text-xs text-white/50">
          {isoDay(weekStart)} · {isoDay(addDays(weekStart, 6))}
        </p>
      </div>
      <div className="min-w-[900px]">
        <div className="grid border-b border-white/10 text-[10px] uppercase tracking-widest text-white/60" style={{ gridTemplateColumns: "60px repeat(7, 1fr)" }}>
          <div className="p-2" />
          {days.map((d) => (
            <div key={isoDay(d)} className="border-l border-white/10 p-2">
              <div className="text-white/70">{d.toLocaleDateString(undefined, { weekday: "short" })}</div>
              <div className="text-white/60">{isoDay(d).slice(5)}</div>
            </div>
          ))}
        </div>
        {hours.map((h) => (
          <div key={h} className="grid border-b border-white/5" style={{ gridTemplateColumns: "60px repeat(7, 1fr)" }}>
            <div className="p-2 text-right text-[10px] text-white/60">{h.toString().padStart(2, "0")}:00</div>
            {days.map((d) => {
              const key = `${isoDay(d)}::${h}`;
              const cell = byDayHour.get(key) ?? [];
              return (
                <div key={key} className="min-h-[56px] border-l border-white/10 p-1">
                  {cell.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => onSelect(b)}
                      className={`mb-1 block w-full rounded border px-1.5 py-1 text-left text-[11px] leading-tight ${STATUS_BG[b.status]}`}
                    >
                      <div className="font-medium">{b.time} · {b.name}</div>
                      <div className="truncate text-[10px] opacity-80">{b.serviceName}</div>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
