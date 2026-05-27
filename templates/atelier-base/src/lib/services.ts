export type Service = {
  id: string;
  name: string;
  duration: number;
  price: number;
  desc: string;
};

export type LocalizedService = Service & { tkey: string };

/**
 * Default service catalogue.
 *
 * Intentionally EMPTY: a "start fresh" install must have no services. The
 * barber showcase gets its catalogue from its own data/services.json (seeded
 * from demos/barber/data/), and getActiveServices() / the page sections fall
 * back to this constant only when a site has no services.json yet — which
 * must render blank, not a stale hardcoded barber menu.
 */
export const SERVICES: LocalizedService[] = [];

// NB: variable name kept as BARBERS for import stability across the
// codebase; the entries here are the salon's stylists.
export const BARBERS = [
  { id: "hannah", name: "Hannah Carter", role: "Senior Stylist · Founder" },
  { id: "mira", name: "Mira Patel", role: "Colour Specialist" },
  { id: "oliver", name: "Oliver Reed", role: "Stylist" },
  { id: "any", name: "First Available", role: "Any chair" },
];

export const HOURS = {
  open: 10,
  close: 21,
  step: 30,
  closedDays: [0],
};

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}

function slotsInRange(openHHMM: string, closeHHMM: string, step = HOURS.step): string[] {
  const out: string[] = [];
  const start = toMinutes(openHHMM);
  const end = toMinutes(closeHHMM);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return out;
  for (let m = start; m < end; m += step) {
    const h = Math.floor(m / 60);
    const mm = m % 60;
    out.push(`${h.toString().padStart(2, "0")}:${mm.toString().padStart(2, "0")}`);
  }
  return out;
}

// Legacy fixed-grid generator: every 30 min between the global open/close.
// Retained for reservation mode and anywhere a caller hasn't been threaded
// through business hours yet.
export function getDailySlots(): string[] {
  return slotsInRange(
    `${HOURS.open.toString().padStart(2, "0")}:00`,
    `${HOURS.close.toString().padStart(2, "0")}:00`
  );
}

// Per-day slot generator that respects the shop's actual hours for that
// weekday — including an optional midday break (open2/close2).
// `dayOfWeek` is 0=Sun … 6=Sat (matches Date.getDay() / dayOfWeekInTz).
export function getSlotsForDay(
  dayOfWeek: number,
  hours: Array<{
    day: "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
    open: string;
    close: string;
    closed: boolean;
    open2?: string;
    close2?: string;
  }> | undefined
): string[] {
  const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
  const key = DAY_KEYS[dayOfWeek];
  const h = hours?.find((x) => x.day === key);
  if (!h || h.closed) return [];
  const morning = slotsInRange(h.open, h.close);
  const evening = h.open2 && h.close2 ? slotsInRange(h.open2, h.close2) : [];
  return [...morning, ...evening];
}
