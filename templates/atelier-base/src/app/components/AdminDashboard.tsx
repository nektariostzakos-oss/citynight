"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { withBasePath, clientPath } from "../../lib/basePath";
import { motion, AnimatePresence } from "framer-motion";
import type { Booking, BookingStatus } from "../../lib/bookings";
import BulkEmail from "./BulkEmail";
import SmtpSetup from "./SmtpSetup";
import ProductsPanel from "./ProductsPanel";
import OrdersPanel from "./OrdersPanel";
import AnalyticsPanel from "./AnalyticsPanel";
import ClientsPanel from "./ClientsPanel";
import ReviewsPanel from "./ReviewsPanel";
import WaitlistPanel from "./WaitlistPanel";
import BookingsCalendar from "./BookingsCalendar";
import SettingsHub from "./SettingsHub";
import SettingsPanel from "./SettingsPanel";
import WalkInBookingModal from "./WalkInBookingModal";
import ForcePasswordChange from "./ForcePasswordChange";
import AdminUpdateBadge from "./AdminUpdateBadge";
import MobileAppPanel from "./MobileAppPanel";
import MarketingAudiences from "./MarketingAudiences";
import MarketingCampaigns from "./MarketingCampaigns";
import MarketingAutomations from "./MarketingAutomations";
import MarketingReputation from "./MarketingReputation";
import type { Lang } from "../../lib/langs";

type Me = {
  id: string;
  email: string;
  role: "admin" | "barber";
  barberId?: string;
  mustChangePassword?: boolean;
};

const STATUSES: { id: "all" | BookingStatus; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "confirmed", label: "Confirmed" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

const statusStyles: Record<BookingStatus, string> = {
  pending: "border-amber-400/40 bg-amber-500/10 text-amber-300",
  confirmed: "border-emerald-400/40 bg-emerald-500/10 text-emerald-300",
  completed: "border-white/20 bg-white/5 text-white/60",
  cancelled: "border-red-400/40 bg-red-500/10 text-red-300",
};

type TabId =
  | "bookings" | "waitlist" | "orders" | "products" | "clients"
  | "reviews" | "seo" | "email" | "analytics" | "mobileApp"
  | "mktAudiences" | "mktCampaigns" | "mktAutomations" | "mktReputation"
  | "businessSetup" | "siteSystem";

type GroupId = "operations" | "marketing" | "business" | "site";

/** The marketing-suite flag map passed from the server. */
type MarketingFlags = Record<string, boolean>;

/**
 * The admin is organised into three plain-language groups so an owner never
 * has to scan a long flat tab row. Each big button opens its group; the
 * group's sections then appear as a small secondary row beneath it. Order is
 * day-to-day first: run the shop, then market it, then change settings.
 * `adminOnly` sections are hidden from the barber role.
 */
const GROUPS: {
  id: GroupId;
  label: string;
  icon: string;
  hint: string;
  tabs: {
    id: TabId;
    label: string;
    adminOnly?: boolean;
    /** When set, the tab shows only if this marketing feature flag is on. */
    feature?: string;
  }[];
}[] = [
  {
    id: "operations",
    label: "Bookings & Orders",
    icon: "📅",
    hint: "Appointments, shop orders and customers",
    tabs: [
      { id: "bookings", label: "Bookings" },
      { id: "waitlist", label: "Waitlist", adminOnly: true },
      { id: "orders", label: "Orders", adminOnly: true },
      { id: "products", label: "Products", adminOnly: true },
      { id: "clients", label: "Clients", adminOnly: true },
    ],
  },
  {
    id: "marketing",
    label: "Marketing",
    icon: "📣",
    hint: "Email, reviews, SEO and analytics",
    tabs: [
      { id: "email", label: "Email", adminOnly: true },
      { id: "reviews", label: "Reviews", adminOnly: true },
      { id: "seo", label: "SEO", adminOnly: true },
      { id: "analytics", label: "Analytics", adminOnly: true },
      { id: "mobileApp", label: "Mobile app", adminOnly: true },
      // Tenant Marketing Suite — rendered inline, gated by a feature flag.
      { id: "mktAudiences", label: "Audiences", adminOnly: true, feature: "segments" },
      { id: "mktCampaigns", label: "Campaigns", adminOnly: true, feature: "campaigns" },
      { id: "mktAutomations", label: "Automations", adminOnly: true, feature: "automations" },
      { id: "mktReputation", label: "Reputation", adminOnly: true, feature: "reviewEngine" },
    ],
  },
  {
    id: "business",
    label: "Business Setup",
    icon: "🏪",
    hint: "Hours, staff, services, coupons, gift cards",
    tabs: [{ id: "businessSetup", label: "Business Setup" }],
  },
  {
    id: "site",
    label: "System Setup",
    icon: "🛠️",
    hint: "Theme, blog, languages, users, backups",
    tabs: [{ id: "siteSystem", label: "System Setup" }],
  },
];

export default function AdminDashboard({
  initial,
  smtpReady = false,
  onboarded = true,
  isTenant = false,
  marketingFlags = {},
  me,
}: {
  initial: Booking[];
  smtpReady?: boolean;
  onboarded?: boolean;
  // True only for a hosted SaaS tenant. A standalone customer ZIP install
  // leaves this false, which hides the Domain feature (the buyer owns their
  // own server and domain already).
  isTenant?: boolean;
  // Resolved Tenant Marketing Suite feature flags; a tab whose `feature` is
  // off here is not shown.
  marketingFlags?: MarketingFlags;
  me: Me;
}) {
  const router = useRouter();
  const [bookings, setBookings] = useState(initial);
  const [filter, setFilter] = useState<"all" | BookingStatus>("all");
  const [day, setDay] = useState<"today" | "upcoming" | "all">("upcoming");
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "calendar">("calendar");
  // Hide the SMTP banner during marketing screenshots so the captured
  // admin shows the clean product, not "complete setup" prompts.
  const [screenshotMode, setScreenshotMode] = useState(false);
  // Admin-only light / dark preference, remembered in localStorage. The
  // public template stays dark; this toggle scopes to the admin via the
  // data-atelier-admin attribute (see globals.css override layer).
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  useEffect(() => {
    try {
      setScreenshotMode(window.localStorage.getItem("atelier_screenshot_mode") === "1");
      if (window.localStorage.getItem("atelier-admin-theme") === "light") {
        setTheme("light");
      }
    } catch {}
  }, []);
  function toggleTheme() {
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      try {
        window.localStorage.setItem("atelier-admin-theme", next);
      } catch {}
      return next;
    });
  }
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - d.getDay());
    return d;
  });
  const [tab, setTab] = useState<TabId>("bookings");
  const [group, setGroup] = useState<GroupId>("operations");
  const isAdmin = me.role === "admin";
  void onboarded;

  // Language for the inline marketing panels, read from the document once.
  const [mktLang, setMktLang] = useState<Lang>("en");
  useEffect(() => {
    const VALID: Lang[] = ["en", "el", "de", "fr", "it", "es", "nl", "pl", "pt", "sv", "sq"];
    const a = document.documentElement.lang?.slice(0, 2) as Lang | undefined;
    if (a && VALID.includes(a)) setMktLang(a);
  }, []);

  // The three groups, with sections the current role cannot see filtered out.
  // A group with no remaining sections (e.g. Marketing for a barber) is hidden.
  const visibleGroups = useMemo(
    () =>
      GROUPS.map((g) => ({
        ...g,
        tabs: g.tabs.filter(
          (t) =>
            (isAdmin || !t.adminOnly) &&
            (!t.feature || marketingFlags[t.feature] !== false),
        ),
      })).filter((g) => g.tabs.length > 0),
    [isAdmin, marketingFlags],
  );
  const activeGroup =
    visibleGroups.find((g) => g.id === group) ?? visibleGroups[0];

  const filtered = useMemo(() => {
    const today = todayStr();
    return bookings
      .filter((b) => (isAdmin ? true : b.barberId === me.barberId))
      .filter((b) => (filter === "all" ? true : b.status === filter))
      .filter((b) => {
        if (day === "today") return b.date === today;
        if (day === "upcoming") return b.date >= today;
        return true;
      })
      .filter((b) => {
        if (!query) return true;
        const q = query.toLowerCase();
        return (
          b.name.toLowerCase().includes(q) ||
          b.phone.includes(q) ||
          b.serviceName.toLowerCase().includes(q) ||
          b.barberName.toLowerCase().includes(q) ||
          b.id.includes(q)
        );
      });
  }, [bookings, filter, day, query]);

  const stats = useMemo(() => {
    const today = todayStr();
    const todays = bookings.filter((b) => b.date === today);
    const upcoming = bookings.filter(
      (b) => b.date >= today && b.status !== "cancelled"
    );
    const revenue = bookings
      .filter((b) => b.status === "completed")
      .reduce((sum, b) => sum + b.price, 0);
    return {
      todayCount: todays.length,
      upcomingCount: upcoming.length,
      pending: bookings.filter((b) => b.status === "pending").length,
      revenue,
    };
  }, [bookings]);

  async function update(id: string, status: BookingStatus) {
    setBusy(id);
    const res = await fetch(`/api/bookings/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const d = await res.json();
      setBookings((bs) => bs.map((b) => (b.id === id ? d.booking : b)));
    }
    setBusy(null);
  }

  async function remove(id: string) {
    if (!confirm("Delete this booking permanently?")) return;
    setBusy(id);
    const res = await fetch(`/api/bookings/${id}`, { method: "DELETE" });
    if (res.ok) setBookings((bs) => bs.filter((b) => b.id !== id));
    setBusy(null);
  }

  async function logout() {
    await fetch("/api/auth", { method: "DELETE" });
    // clientPath() re-prefixes with the live tenant slug; a bare router.push
    // bypasses the TenantRouter click interceptor and would 404 under /<slug>.
    router.push(clientPath("/admin/login"));
    router.refresh();
  }

  return (
    <div
      data-atelier-admin={theme}
      className="relative min-h-screen overflow-hidden bg-[#0a0806] text-white"
    >
      {/* Fine grid backdrop — fades toward the bottom so it reads as an
          effect, not a flat texture. Sits behind every panel. */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        aria-hidden
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          opacity: 0.05,
          maskImage: "linear-gradient(to bottom, #000 0%, transparent 65%)",
          WebkitMaskImage: "linear-gradient(to bottom, #000 0%, transparent 65%)",
        }}
      />
      <header className="relative z-10 border-b border-white/10 bg-white/[0.02] px-4 py-4 sm:px-6 sm:py-5">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#c9a961] sm:text-xs">
              Admin
            </p>
            <h1 className="mt-0.5 font-serif text-xl font-semibold sm:mt-1 sm:text-2xl">
              Dashboard
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <AdminUpdateBadge />
            {isAdmin && (
              <>
                <button
                  onClick={() => setWalkInOpen(true)}
                  className="rounded-full border border-[#c9a961]/40 bg-[#c9a961] px-3 py-1.5 text-[10px] uppercase tracking-widest text-black transition-colors hover:opacity-90 sm:px-4 sm:py-2 sm:text-xs"
                >
                  + Walk-in
                </button>
                <button
                  onClick={async () => {
                    const r = await fetch("/api/cron/reminders");
                    const d = await r.json();
                    const msg = d.reminders
                      ? `Reminders: ${d.reminders.sent}/${d.reminders.checked}\nReviews: ${d.reviews?.sent ?? 0}/${d.reviews?.checked ?? 0}`
                      : `Checked ${d.checked}, sent ${d.sent}`;
                    alert(msg);
                  }}
                  className="rounded-full border border-[#c9a961]/40 bg-[#c9a961]/10 px-3 py-1.5 text-[10px] uppercase tracking-widest text-[#c9a961] transition-colors hover:bg-[#c9a961]/20 sm:px-4 sm:py-2 sm:text-xs"
                >
                  <span className="hidden sm:inline">Run cron</span>
                  <span className="sm:hidden">Cron</span>
                </button>
              </>
            )}
            <a
              href={withBasePath("/admin/schedule")}
              className="rounded-full border border-white/15 px-3 py-1.5 text-[10px] uppercase tracking-widest text-white/70 transition-colors hover:bg-white/10 sm:px-4 sm:py-2 sm:text-xs"
            >
              <span className="hidden sm:inline">Schedule</span>
              <span className="sm:hidden">Day</span>
            </a>
            {isTenant && (
              <a
                href={withBasePath("/admin/domain")}
                className="rounded-full border border-white/15 px-3 py-1.5 text-[10px] uppercase tracking-widest text-white/70 transition-colors hover:bg-white/10 sm:px-4 sm:py-2 sm:text-xs"
              >
                Domain
              </a>
            )}
            <button
              onClick={toggleTheme}
              aria-label="Toggle admin light or dark mode"
              className="rounded-full border border-white/15 px-3 py-1.5 text-[10px] uppercase tracking-widest text-white/70 transition-colors hover:bg-white/10 sm:px-4 sm:py-2 sm:text-xs"
            >
              {theme === "dark" ? "☀ Light" : "☾ Dark"}
            </button>
            <a
              href={withBasePath("/")}
              className="rounded-full border border-white/15 px-3 py-1.5 text-[10px] uppercase tracking-widest text-white/70 transition-colors hover:bg-white/10 sm:px-4 sm:py-2 sm:text-xs"
            >
              <span className="hidden sm:inline">View site</span>
              <span className="sm:hidden">Site</span>
            </a>
            <button
              onClick={logout}
              className="rounded-full border border-white/15 px-3 py-1.5 text-[10px] uppercase tracking-widest text-white/70 transition-colors hover:bg-white/10 sm:px-4 sm:py-2 sm:text-xs"
            >
              <span className="hidden sm:inline">Sign out</span>
              <span className="sm:hidden">Out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-6 py-8">
        {/* One-click SMTP setup. Sits at the very top so it is impossible
            to miss until email delivery is wired up. */}
        {isAdmin && !screenshotMode && (
          <SmtpSetup initialReady={smtpReady} />
        )}

        {/* Big group buttons — the whole admin in a few plain choices. */}
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {visibleGroups.map((g) => {
            const active = activeGroup?.id === g.id;
            return (
              <button
                key={g.id}
                onClick={() => {
                  setGroup(g.id);
                  setTab(g.tabs[0].id);
                }}
                aria-pressed={active}
                className={`flex items-center gap-3 rounded-2xl border px-5 py-4 text-left transition-colors ${
                  active
                    ? "border-[#c9a961] bg-[#c9a961]/15"
                    : "border-white/15 bg-white/[0.04] hover:border-white/30"
                }`}
              >
                <span className="text-2xl" aria-hidden="true">{g.icon}</span>
                <span className="min-w-0">
                  <span
                    className={`block text-sm font-semibold uppercase tracking-wide ${
                      active ? "text-[#c9a961]" : "text-white"
                    }`}
                  >
                    {g.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-white/50">
                    {g.hint}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Sections inside the open group (skipped when the group has one). */}
        {activeGroup && activeGroup.tabs.length > 1 && (
          <div className="mb-6 flex flex-wrap items-center gap-1 rounded-2xl border border-white/15 bg-white/[0.04] p-1 backdrop-blur sm:inline-flex sm:flex-nowrap sm:rounded-full">
            {activeGroup.tabs.map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`relative isolate rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] transition-colors ${
                    active
                      ? "text-black"
                      : "text-white/85 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="admin-tab"
                      className="absolute inset-0 -z-10 rounded-full bg-[#c9a961]"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{t.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {tab === "email" && isAdmin && <BulkEmail bookings={bookings} />}
        {tab === "seo" && isAdmin && <SettingsPanel scopeTo="seo" />}
        {tab === "businessSetup" && <SettingsHub me={me} isTenant={isTenant} scope="business" />}
        {tab === "siteSystem" && <SettingsHub me={me} isTenant={isTenant} scope="site" />}
        {tab === "products" && isAdmin && <ProductsPanel />}
        {tab === "orders" && isAdmin && <OrdersPanel />}
        {tab === "clients" && isAdmin && <ClientsPanel />}
        {tab === "analytics" && isAdmin && <AnalyticsPanel />}
        {tab === "mobileApp" && isAdmin && <MobileAppPanel />}
        {tab === "reviews" && isAdmin && <ReviewsPanel />}
        {tab === "waitlist" && isAdmin && <WaitlistPanel />}
        {tab === "mktAudiences" && isAdmin && (
          <MarketingAudiences initialSegments={[]} />
        )}
        {tab === "mktCampaigns" && isAdmin && (
          <MarketingCampaigns
            initialCampaigns={[]}
            initialSegments={[]}
            featureOn={marketingFlags.campaigns !== false}
            lang={mktLang}
          />
        )}
        {tab === "mktAutomations" && isAdmin && (
          <MarketingAutomations
            initialAutomations={[]}
            featureOn={marketingFlags.automations !== false}
            lang={mktLang}
          />
        )}
        {tab === "mktReputation" && isAdmin && (
          <MarketingReputation
            featureOn={marketingFlags.reviewEngine !== false}
            lang={mktLang}
          />
        )}
        {tab === "bookings" && (
          <>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Today" value={stats.todayCount.toString()} />
          <Stat label="Upcoming" value={stats.upcomingCount.toString()} />
          <Stat label="Pending review" value={stats.pending.toString()} />
          <Stat label="Revenue · completed" value={`$${stats.revenue}`} />
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-full border border-white/15 bg-white/[0.04] p-1">
            {(["list", "calendar"] as const).map((v) => (
              <button key={v} onClick={() => setView(v)} className={`rounded-full px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest ${view === v ? "bg-[#c9a961] text-black" : "text-white/70 hover:bg-white/10"}`}>{v}</button>
            ))}
          </div>
        </div>

        {/* Filters apply to both views — status, date range and search. */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {STATUSES.map((s) => {
              const active = filter === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setFilter(s.id)}
                  className={`rounded-full border px-4 py-1.5 text-xs uppercase tracking-widest transition-colors ${
                    active
                      ? "border-[#c9a961] bg-[#c9a961] text-black"
                      : "border-white/15 text-white/70 hover:bg-white/10"
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              id="admin-booking-range"
              name="bookingRange"
              aria-label="Filter bookings by date range"
              value={day}
              onChange={(e) =>
                setDay(e.target.value as "today" | "upcoming" | "all")
              }
              style={{ colorScheme: "dark" }}
              className="appearance-none rounded-full border border-white/15 bg-[#14110d] bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2210%22 height=%226%22 viewBox=%220 0 10 6%22><path fill=%22%23c9a961%22 d=%22M0 0l5 6 5-6z%22/></svg>')] bg-[length:10px_6px] bg-[position:right_14px_center] bg-no-repeat px-4 py-1.5 pr-9 text-xs uppercase tracking-widest text-white/85 outline-none transition-colors hover:bg-white/[0.06] focus:border-white/40"
            >
              <option value="today">Today</option>
              <option value="upcoming">Upcoming</option>
              <option value="all">All time</option>
            </select>
            <input
              id="admin-booking-search"
              name="bookingSearch"
              type="search"
              aria-label="Search bookings by name, phone, or service"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, phone, service…"
              className="w-full min-w-[180px] flex-1 rounded-full border border-white/15 bg-white/[0.03] px-4 py-1.5 text-sm text-white placeholder-white/30 outline-none focus:border-white/40 sm:w-64 sm:flex-none"
            />
          </div>
        </div>

        {view === "calendar" ? (
          <BookingsCalendar
            bookings={filtered}
            weekStart={weekStart}
            onShift={(n) => {
              if (n === 0) {
                const d = new Date();
                d.setHours(0, 0, 0, 0);
                d.setDate(d.getDate() - d.getDay());
                setWeekStart(d);
              } else {
                const d = new Date(weekStart);
                d.setDate(d.getDate() + n);
                setWeekStart(d);
              }
            }}
            onSelect={(b) => alert(`${b.name} · ${b.serviceName}\n${b.date} ${b.time} · ${b.barberName}\n${b.phone} ${b.email}`)}
          />
        ) : (
        <>
        <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
          <div className="hidden grid-cols-[1fr_1.4fr_1.2fr_1fr_1.2fr_120px_180px] gap-4 border-b border-white/10 bg-white/[0.03] px-6 py-3 text-[10px] uppercase tracking-widest text-white/60 lg:grid">
            <span>Date · Time</span>
            <span>Client</span>
            <span>Service</span>
            <span>Barber</span>
            <span>Phone</span>
            <span>Status</span>
            <span className="text-right">Actions</span>
          </div>

          {filtered.length === 0 && (
            <div className="px-6 py-16 text-center text-white/60">
              No bookings match your filters.
            </div>
          )}

          <AnimatePresence initial={false}>
            {filtered.map((b) => (
              <motion.div
                key={b.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="grid gap-2 border-b border-white/10 px-4 py-4 text-sm last:border-b-0 sm:px-6 sm:py-5 lg:grid-cols-[1fr_1.4fr_1.2fr_1fr_1.2fr_120px_180px] lg:items-center lg:gap-4"
              >
                <div className="font-serif text-base">
                  {b.date}
                  <span className="text-white/60"> · </span>
                  {b.time}
                </div>
                <div>
                  <p className="text-white">{b.name}</p>
                  <p className="text-xs text-white/60">${b.price} · {b.duration}m</p>
                </div>
                <div className="text-white/85">{b.serviceName}</div>
                <div className="text-white/85">{b.barberName}</div>
                <div className="text-white/70">
                  <a href={`tel:${b.phone}`} className="hover:text-white">
                    {b.phone}
                  </a>
                  {b.email && (
                    <p className="text-xs text-white/60">{b.email}</p>
                  )}
                </div>
                <div>
                  <span
                    className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] uppercase tracking-widest ${
                      statusStyles[b.status]
                    }`}
                  >
                    {b.status}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 lg:justify-end">
                  {b.status === "pending" && (
                    <Btn
                      onClick={() => update(b.id, "confirmed")}
                      busy={busy === b.id}
                      tone="gold"
                    >
                      Confirm
                    </Btn>
                  )}
                  {b.status === "confirmed" && (
                    <Btn
                      onClick={() => update(b.id, "completed")}
                      busy={busy === b.id}
                      tone="gold"
                    >
                      Complete
                    </Btn>
                  )}
                  {b.status !== "cancelled" && b.status !== "completed" && (
                    <Btn
                      onClick={() => update(b.id, "cancelled")}
                      busy={busy === b.id}
                      tone="ghost"
                    >
                      Cancel
                    </Btn>
                  )}
                  <Btn
                    onClick={() => remove(b.id)}
                    busy={busy === b.id}
                    tone="danger"
                  >
                    Delete
                  </Btn>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {filtered.some((b) => b.notes) && (
          <p className="mt-4 text-xs text-white/60">
            Tip: bookings with notes are marked in the row above. Hover any
            row to expand details.
          </p>
        )}
        </>
        )}
          </>
        )}
      </main>

      {walkInOpen && (
        <WalkInBookingModal
          onClose={() => setWalkInOpen(false)}
          onCreated={() => router.refresh()}
        />
      )}

      {me.mustChangePassword && (
        <ForcePasswordChange
          userId={me.id}
          email={me.email}
          onDone={() => router.refresh()}
        />
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <p className="text-xs uppercase tracking-widest text-white/60">{label}</p>
      <p className="mt-2 font-serif text-3xl text-white">{value}</p>
    </div>
  );
}

function Btn({
  children,
  onClick,
  busy,
  tone,
}: {
  children: React.ReactNode;
  onClick: () => void;
  busy?: boolean;
  tone: "gold" | "ghost" | "danger";
}) {
  const cls =
    tone === "gold"
      ? "bg-[#c9a961] text-black hover:bg-[#d4b878]"
      : tone === "danger"
        ? "border border-red-400/40 text-red-300 hover:bg-red-500/10"
        : "border border-white/15 text-white/70 hover:bg-white/10";
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={`rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest transition-colors disabled:opacity-50 ${cls}`}
    >
      {children}
    </button>
  );
}
