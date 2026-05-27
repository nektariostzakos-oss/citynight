import Hero, { type NextSlotInfo } from "./Hero";
import { isDemoMode } from "../../lib/demoMode";
import InfoStrip from "./InfoStrip";
import ServicesPreview from "./ServicesPreview";
import ShopPreview from "./ShopPreview";
import GalleryStrip from "./GalleryStrip";
import BlogStrip from "./BlogStrip";
import Testimonials from "./Testimonials";
import CTA from "./CTA";
import AvailabilitySnapshot from "./AvailabilitySnapshot";
import TransformationsStrip from "./TransformationsStrip";
import { getTakenSlots } from "../../lib/bookings";
import { getSlotsForDay } from "../../lib/services";
import { getActiveServices } from "../../lib/customServices";
import { loadBusiness } from "../../lib/settings";
import {
  todayIsoInTz,
  nowMinutesInTz,
  dayOfWeekInTz,
  dateAtOffsetInTz,
} from "../../lib/tz";

/**
 * The full homepage body — hero plus every section strip — shared by two
 * routes: the real homepage (`/`) and the noindex `/preview` route the
 * showcase hero's phone mock-up iframes. `/preview` renders this with
 * `framed`, which tells the hero to drop its phone (so the iframe shows the
 * site but does not recurse). Keeping one component means the two routes can
 * never drift apart.
 */

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
const DAY_EN = { sun: "Sun", mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat" } as const;
const DAY_EL = { sun: "Κυρ", mon: "Δευ", tue: "Τρί", wed: "Τετ", thu: "Πέμ", fri: "Παρ", sat: "Σάβ" } as const;
const DAY_DE = { sun: "So", mon: "Mo", tue: "Di", wed: "Mi", thu: "Do", fri: "Fr", sat: "Sa" } as const;
const DAY_IT = { sun: "Dom", mon: "Lun", tue: "Mar", wed: "Mer", thu: "Gio", fri: "Ven", sat: "Sab" } as const;

function slotMinutes(s: string): number {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
}

async function computeNextSlot(): Promise<NextSlotInfo> {
  try {
    const business = await loadBusiness();
    const tz = business.timezone || "Europe/Athens";
    const todayIdx = dayOfWeekInTz(tz);
    const todayDow = DAY_KEYS[todayIdx];
    const todayHours = business.hours?.find((h) => h.day === todayDow);
    // Open today per business hours — drives the hero pill. Computed here on
    // the server so the pill never flips between SSR and client timezones.
    const openToday = !!todayHours && !todayHours.closed;
    const leadTime = business.bookingRules?.leadTimeMinutes ?? 45;
    const cutoff = nowMinutesInTz(tz) + leadTime;

    // Today's free slots (if open)
    if (!todayHours?.closed) {
      const taken = await getTakenSlots(todayIsoInTz(tz), "any");
      const todaySlots = getSlotsForDay(todayIdx, business.hours);
      const free = todaySlots
        .filter((s) => !taken.includes(s) && slotMinutes(s) >= cutoff)
        .slice(0, 1);
      if (free.length > 0) {
        return { time: free[0], label_en: "Today", label_el: "Σήμερα", label_de: "Heute", label_it: "Oggi", booked: false, openToday };
      }
    }

    // Try next 7 days for the first open day with a slot
    for (let offset = 1; offset <= 7; offset++) {
      const future = dateAtOffsetInTz(offset, tz);
      const dkey = DAY_KEYS[future.dayOfWeek];
      const dh = business.hours?.find((h) => h.day === dkey);
      if (dh?.closed) continue;
      const taken = await getTakenSlots(future.iso, "any");
      const daySlots = getSlotsForDay(future.dayOfWeek, business.hours);
      const free = daySlots.filter((s) => !taken.includes(s)).slice(0, 1);
      if (free.length > 0) {
        const label_en = offset === 1 ? "Tomorrow" : DAY_EN[dkey];
        const label_el = offset === 1 ? "Αύριο" : DAY_EL[dkey];
        const label_de = offset === 1 ? "Morgen" : DAY_DE[dkey];
        const label_it = offset === 1 ? "Domani" : DAY_IT[dkey];
        const booked = !todayHours?.closed; // today existed but was full
        return { time: free[0], label_en, label_el, label_de, label_it, booked, openToday };
      }
    }
    return { time: "", label_en: "", label_el: "", label_de: "", label_it: "", booked: true, openToday };
  } catch {
    return null;
  }
}

export default async function HomeContent({ framed }: { framed?: boolean }) {
  const [nextSlot, services] = await Promise.all([
    computeNextSlot(),
    getActiveServices().catch(() => []),
  ]);
  const priced = services.filter((s) => s.price > 0).map((s) => s.price);
  const minPrice = priced.length > 0 ? Math.min(...priced) : null;
  return (
    <main className="relative">
      <Hero
        nextSlot={nextSlot}
        minPrice={minPrice}
        demoMode={isDemoMode()}
        framed={framed}
      />
      <AvailabilitySnapshot />
      <InfoStrip />
      <ServicesPreview />
      <TransformationsStrip />
      <ShopPreview />
      <GalleryStrip />
      <BlogStrip />
      <Testimonials />
      <CTA />
    </main>
  );
}
