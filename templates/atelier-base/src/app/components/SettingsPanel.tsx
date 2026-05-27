"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useBranding } from "../../lib/brandingClient";
import { useBusiness } from "../../lib/businessClient";
import { useNavSettings } from "../../lib/navClient";
import { clientPath } from "../../lib/basePath";
import MembershipPanel from "./MembershipPanel";
import type {
  BusinessSettings,
  BusinessHours,
  NavSettings,
  NavLink,
  EmailTemplates,
  AnalyticsSettings,
} from "../../lib/settings";
import type { EmailTemplate } from "../../lib/settings";
import { seoDefaults } from "../../lib/seoDefaults";
import { useLang } from "../../lib/i18n";
import { LANG_NAMES, type Lang } from "../../lib/langs";

const EMPTY_TEMPLATES: EmailTemplates = {
  confirmation: { subject_en: "", subject_el: "", body_en: "", body_el: "" },
  reminder: { subject_en: "", subject_el: "", body_en: "", body_el: "" },
};

const SEO_PAGES: { key: string; label: string }[] = [
  { key: "seo_home", label: "Home" },
  { key: "seo_services", label: "Services" },
  { key: "seo_shop", label: "Shop" },
  { key: "seo_gallery", label: "Gallery" },
  { key: "seo_about", label: "Team" },
  { key: "seo_contact", label: "Contact" },
  { key: "seo_book", label: "Book" },
];

type SeoBlock = {
  title_en: string;
  title_el: string;
  description_en: string;
  description_el: string;
  ogImage: string;
};

const EMPTY_SEO: SeoBlock = {
  title_en: "",
  title_el: "",
  description_en: "",
  description_el: "",
  ogImage: "",
};

type Smtp = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  secure: "tls" | "ssl" | "none";
};

type Branding = {
  logoUrl: string;
  logoUrlDark: string;
  faviconUrl: string;
  wordmark: string;
  tagline_en: string;
  tagline_el: string;
};

const EMPTY_BRANDING: Branding = {
  logoUrl: "/brand/default-logo.svg",
  logoUrlDark: "",
  faviconUrl: "/favicon.ico",
  wordmark: "YOUR SALON",
  tagline_en: "",
  tagline_el: "",
};

const DAYS: { key: BusinessHours["day"]; label: string }[] = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];

const EMPTY_BUSINESS: BusinessSettings = {
  name: "Your Salon",
  streetAddress: "",
  city: "",
  postalCode: "",
  country: "GB",
  phone: "",
  email: "",
  latitude: null,
  longitude: null,
  hours: DAYS.map((d) => ({
    day: d.key,
    open: "10:00",
    close: "19:00",
    closed: false,
  })),
  social: { instagram: "", facebook: "", whatsapp: "", tiktok: "" },
  priceRange: "$$$",
};

const EMPTY: Smtp = {
  host: "",
  port: 587,
  user: "",
  pass: "",
  from: "",
  secure: "tls",
};

const PRESETS: { label: string; smtp: Partial<Smtp>; help: string }[] = [
  {
    label: "Gmail / Google Workspace",
    smtp: { host: "smtp.gmail.com", port: 587, secure: "tls" },
    help: "Use a 16-character App Password as the password (not your real Google password). Create one at myaccount.google.com → Security → App passwords.",
  },
  {
    label: "Brevo (Sendinblue)",
    smtp: { host: "smtp-relay.brevo.com", port: 587, secure: "tls" },
    help: "Username = your Brevo login email. Password = your SMTP key from app.brevo.com → SMTP & API.",
  },
  {
    label: "Mailgun",
    smtp: { host: "smtp.mailgun.org", port: 587, secure: "tls" },
    help: "Username + password from your domain's SMTP credentials in app.mailgun.com.",
  },
  {
    label: "SendGrid",
    smtp: { host: "smtp.sendgrid.net", port: 587, secure: "tls" },
    help: "Username is the literal word 'apikey'. Password is the API key you generate in SendGrid.",
  },
  {
    label: "Office 365 / Outlook",
    smtp: { host: "smtp.office365.com", port: 587, secure: "tls" },
    help: "Use your Microsoft 365 account email + password. SMTP AUTH must be enabled for the user in the Microsoft admin center.",
  },
];

type SettingsTab =
  | "business" | "brand" | "nav" | "email" | "seo" | "analytics" | "payments"
  | "membership";

export default function SettingsPanel({ scopeTo }: { scopeTo?: SettingsTab } = {}) {
  const [smtp, setSmtp] = useState<Smtp>(EMPTY);
  const [branding, setBrandingLocal] = useState<Branding>(EMPTY_BRANDING);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [help, setHelp] = useState<string>("");
  const [testTo, setTestTo] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    msg: string;
  } | null>(null);
  const [savingBrand, setSavingBrand] = useState(false);
  const [brandSavedAt, setBrandSavedAt] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const faviconInputRef = useRef<HTMLInputElement | null>(null);
  const { refresh: refreshBranding, setBranding: setBrandingCtx } =
    useBranding();
  const [business, setBusinessLocal] = useState<BusinessSettings>(EMPTY_BUSINESS);
  const [savingBiz, setSavingBiz] = useState(false);
  const [bizSavedAt, setBizSavedAt] = useState<string | null>(null);
  const { refresh: refreshBusiness, setBusiness: setBusinessCtx } = useBusiness();
  const [navDraft, setNavDraft] = useState<NavSettings>({
    links: [],
    bookLabel_en: "Book",
    bookLabel_el: "Κράτηση",
    bookHref: "/book",
  });
  const [savingNav, setSavingNav] = useState(false);
  const [navSavedAt, setNavSavedAt] = useState<string | null>(null);
  const { refresh: refreshNav, setNav: setNavCtx } = useNavSettings();
  const [templates, setTemplates] = useState<EmailTemplates>(EMPTY_TEMPLATES);
  // Email templates are edited in English first, then in each language the
  // owner enabled at setup (no hardcoded second language).
  const { enabled: enabledLangs } = useLang();
  const emailLangs: Lang[] = [
    "en",
    ...enabledLangs.filter((l) => l !== "en"),
  ];
  const [savingTpl, setSavingTpl] = useState(false);
  const [tplSavedAt, setTplSavedAt] = useState<string | null>(null);
  const [tab, setTab] = useState<SettingsTab>(scopeTo ?? "business");
  const [payments, setPayments] = useState<{
    stripeSecretKey: string;
    stripePublishableKey: string;
    currency: string;
  }>({ stripeSecretKey: "", stripePublishableKey: "", currency: "USD" });
  const [savingPay, setSavingPay] = useState(false);
  const [paySavedAt, setPaySavedAt] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsSettings>({
    ga4: "",
    gtm: "",
    metaPixel: "",
    metaCapiToken: "",
    ga4ApiSecret: "",
  });
  const [savingAn, setSavingAn] = useState(false);
  const [anSavedAt, setAnSavedAt] = useState<string | null>(null);
  const [seoPage, setSeoPage] = useState<string>(SEO_PAGES[0].key);
  const [seoDraft, setSeoDraft] = useState<SeoBlock>(EMPTY_SEO);
  const [seoLoading, setSeoLoading] = useState(false);
  const [savingSeo, setSavingSeo] = useState(false);
  const [seoSavedAt, setSeoSavedAt] = useState<string | null>(null);
  const seoOgInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let alive = true;
    setSeoLoading(true);
    fetch(`/api/content`)
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        const stored = (d.content?.[seoPage] ?? {}) as Partial<SeoBlock>;
        const computed = seoDefaults(seoPage, business);
        setSeoDraft({
          title_en: stored.title_en || computed.title_en,
          title_el: stored.title_el || computed.title_el,
          description_en: stored.description_en || computed.description_en,
          description_el: stored.description_el || computed.description_el,
          ogImage: stored.ogImage || "",
        });
        setSeoLoading(false);
      })
      .catch(() => alive && setSeoLoading(false));
    return () => {
      alive = false;
    };
  }, [seoPage, business]);

  async function saveSeo() {
    setSavingSeo(true);
    await fetch("/api/content", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ section: seoPage, patch: seoDraft }),
    });
    setSavingSeo(false);
    setSeoSavedAt(new Date().toLocaleTimeString());
    setTimeout(() => setSeoSavedAt(null), 4000);
  }

  async function onPickOgImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const url = await uploadImage(file);
    if (url) setSeoDraft((s) => ({ ...s, ogImage: url }));
  }

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.settings?.smtp) setSmtp({ ...EMPTY, ...d.settings.smtp });
        if (d.settings?.branding)
          setBrandingLocal({ ...EMPTY_BRANDING, ...d.settings.branding });
        if (d.settings?.business)
          setBusinessLocal({
            ...EMPTY_BUSINESS,
            ...d.settings.business,
            social: { ...EMPTY_BUSINESS.social, ...(d.settings.business.social ?? {}) },
            hours:
              Array.isArray(d.settings.business.hours) &&
              d.settings.business.hours.length === 7
                ? d.settings.business.hours
                : EMPTY_BUSINESS.hours,
          });
        if (d.settings?.nav) setNavDraft(d.settings.nav as NavSettings);
        if (d.settings?.templates)
          setTemplates(d.settings.templates as EmailTemplates);
        if (d.settings?.analytics)
          setAnalytics({
            ga4: "",
            gtm: "",
            metaPixel: "",
            metaCapiToken: "",
            ga4ApiSecret: "",
            ...d.settings.analytics,
          });
        if (d.settings?.payments)
          setPayments({
            stripeSecretKey: d.settings.payments.stripeSecretKey || "",
            stripePublishableKey: d.settings.payments.stripePublishableKey || "",
            currency: d.settings.payments.currency || "USD",
          });
        setLoading(false);
      });
  }, []);

  async function savePayments() {
    setSavingPay(true);
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ payments }),
    });
    setSavingPay(false);
    setPaySavedAt(new Date().toLocaleTimeString());
  }

  async function saveAnalytics() {
    setSavingAn(true);
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ analytics }),
    });
    setSavingAn(false);
    setAnSavedAt(new Date().toLocaleTimeString());
    setTimeout(() => setAnSavedAt(null), 4000);
  }

  async function saveTemplates() {
    setSavingTpl(true);
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ templates }),
    });
    setSavingTpl(false);
    setTplSavedAt(new Date().toLocaleTimeString());
    setTimeout(() => setTplSavedAt(null), 4000);
  }

  async function saveNav() {
    setSavingNav(true);
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ nav: navDraft }),
    });
    setSavingNav(false);
    setNavSavedAt(new Date().toLocaleTimeString());
    setTimeout(() => setNavSavedAt(null), 4000);
    setNavCtx(navDraft);
    refreshNav();
  }

  function updateLink(i: number, patch: Partial<NavLink>) {
    const next = navDraft.links.slice();
    next[i] = { ...next[i], ...patch };
    setNavDraft({ ...navDraft, links: next });
  }
  function moveLink(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= navDraft.links.length) return;
    const next = navDraft.links.slice();
    [next[i], next[j]] = [next[j], next[i]];
    setNavDraft({ ...navDraft, links: next });
  }
  function removeLink(i: number) {
    const next = navDraft.links.slice();
    next.splice(i, 1);
    setNavDraft({ ...navDraft, links: next });
  }
  function addLink() {
    setNavDraft({
      ...navDraft,
      links: [
        ...navDraft.links,
        {
          id: `link-${Date.now().toString(36)}`,
          label_en: "New link",
          label_el: "Νέο",
          href: "/",
          enabled: true,
        },
      ],
    });
  }

  async function saveBusiness() {
    setSavingBiz(true);
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ business }),
    });
    setSavingBiz(false);
    setBizSavedAt(new Date().toLocaleTimeString());
    setTimeout(() => setBizSavedAt(null), 4000);
    setBusinessCtx(business);
    refreshBusiness();
  }

  async function uploadImage(file: File): Promise<string | null> {
    setUploadError(null);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      setUploadError(d.error || "Upload failed");
      return null;
    }
    return d.url as string;
  }

  async function onPickLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const url = await uploadImage(file);
    if (url) setBrandingLocal((b) => ({ ...b, logoUrl: url }));
  }

  async function onPickLogoDark(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const url = await uploadImage(file);
    if (url) setBrandingLocal((b) => ({ ...b, logoUrlDark: url }));
  }

  async function onPickFavicon(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const url = await uploadImage(file);
    if (url) setBrandingLocal((b) => ({ ...b, faviconUrl: url }));
  }

  async function saveBranding() {
    setSavingBrand(true);
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ branding }),
    });
    setSavingBrand(false);
    setBrandSavedAt(new Date().toLocaleTimeString());
    setTimeout(() => setBrandSavedAt(null), 4000);
    setBrandingCtx(branding);
    refreshBranding();
  }

  function applyPreset(label: string) {
    const p = PRESETS.find((x) => x.label === label);
    if (!p) return;
    setSmtp((s) => ({ ...s, ...p.smtp }));
    setHelp(p.help);
  }

  async function save() {
    setSaving(true);
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ smtp }),
    });
    setSaving(false);
    setSavedAt(new Date().toLocaleTimeString());
    setTimeout(() => setSavedAt(null), 4000);
  }

  async function sendTest() {
    if (!testTo) return;
    setTesting(true);
    setTestResult(null);
    // Save first so the test uses what's in the form right now.
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ smtp }),
    });
    const res = await fetch("/api/settings/test-email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ to: testTo }),
    });
    const d = await res.json();
    setTestResult({
      ok: res.ok,
      msg: res.ok ? "Test email sent. Check your inbox." : d.error || "Failed",
    });
    setTesting(false);
  }

  if (loading) {
    return (
      <p className="text-white/60">Loading…</p>
    );
  }

  const TABS: { id: typeof tab; label: string }[] = [
    { id: "business", label: "Business" },
    { id: "brand", label: "Brand" },
    { id: "nav", label: "Navigation" },
    { id: "email", label: "Email" },
    { id: "payments", label: "Payments" },
    { id: "membership", label: "Membership" },
    { id: "analytics", label: "Analytics" },
  ];

  return (
    <div className="space-y-6">
    {!scopeTo && (
    <div
      role="tablist"
      className="flex flex-wrap gap-2 rounded-full border border-white/10 bg-white/[0.03] p-1.5 backdrop-blur"
    >
      {TABS.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={tab === t.id}
          onClick={() => setTab(t.id)}
          className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-widest transition-colors ${
            tab === t.id
              ? "bg-[#c9a961] text-black"
              : "text-white/60 hover:text-white"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
    )}

    {tab === "business" && (
    <>
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur">
      <h2 className="mb-1 font-serif text-2xl">1. Business info</h2>
      <p className="mb-6 text-sm text-white/55">
        Address, phone, email, hours, socials. Feeds the footer, contact page,
        Google structured data, and map link.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Business name"
          value={business.name}
          onChange={(v) => setBusinessLocal({ ...business, name: v })}
        />
        <Field
          label="Price range ($ to $$$$)"
          value={business.priceRange}
          onChange={(v) => setBusinessLocal({ ...business, priceRange: v })}
        />
        <Field
          label="Street address"
          value={business.streetAddress}
          onChange={(v) => setBusinessLocal({ ...business, streetAddress: v })}
        />
        <Field
          label="City"
          value={business.city}
          onChange={(v) => setBusinessLocal({ ...business, city: v })}
        />
        <Field
          label="Postal code"
          value={business.postalCode}
          onChange={(v) => setBusinessLocal({ ...business, postalCode: v })}
        />
        <Field
          label="Country (ISO, e.g. GR)"
          value={business.country}
          onChange={(v) => setBusinessLocal({ ...business, country: v })}
        />
        <Field
          label="Timezone (IANA, e.g. Europe/Athens)"
          value={business.timezone || "Europe/Athens"}
          onChange={(v) => setBusinessLocal({ ...business, timezone: v })}
        />
        <Field
          label="Review URL (Google / Trustpilot / etc.)"
          value={business.reviewUrl || ""}
          onChange={(v) => setBusinessLocal({ ...business, reviewUrl: v })}
        />
        <Field
          label="Phone"
          value={business.phone}
          onChange={(v) => setBusinessLocal({ ...business, phone: v })}
        />
        <Field
          label="Email"
          value={business.email}
          onChange={(v) => setBusinessLocal({ ...business, email: v })}
        />
        <Field
          label="Latitude (optional)"
          type="number"
          value={business.latitude == null ? "" : String(business.latitude)}
          onChange={(v) =>
            setBusinessLocal({
              ...business,
              latitude: v === "" ? null : Number(v),
            })
          }
        />
        <Field
          label="Longitude (optional)"
          type="number"
          value={business.longitude == null ? "" : String(business.longitude)}
          onChange={(v) =>
            setBusinessLocal({
              ...business,
              longitude: v === "" ? null : Number(v),
            })
          }
        />
      </div>

      <h3 className="mt-8 mb-3 text-xs uppercase tracking-widest text-white/60">
        Booking rules
      </h3>
      <div className="grid gap-4 md:grid-cols-4">
        <Field
          label="Lead time (min)"
          value={String(business.bookingRules?.leadTimeMinutes ?? 45)}
          onChange={(v) =>
            setBusinessLocal({
              ...business,
              bookingRules: {
                ...(business.bookingRules ?? {}),
                leadTimeMinutes: Math.max(0, Number(v) || 0),
              },
            })
          }
        />
        <Field
          label="Cancellation window (h)"
          value={String(business.bookingRules?.cancellationWindowHours ?? 4)}
          onChange={(v) =>
            setBusinessLocal({
              ...business,
              bookingRules: {
                ...(business.bookingRules ?? {}),
                cancellationWindowHours: Math.max(0, Number(v) || 0),
              },
            })
          }
        />
        <Field
          label="Deposit %"
          value={String(business.bookingRules?.depositPercent ?? 0)}
          onChange={(v) =>
            setBusinessLocal({
              ...business,
              bookingRules: {
                ...(business.bookingRules ?? {}),
                depositPercent: Math.min(100, Math.max(0, Number(v) || 0)),
              },
            })
          }
        />
        <Field
          label="No-show fee %"
          value={String(business.bookingRules?.noShowFeePercent ?? 50)}
          onChange={(v) =>
            setBusinessLocal({
              ...business,
              bookingRules: {
                ...(business.bookingRules ?? {}),
                noShowFeePercent: Math.min(100, Math.max(0, Number(v) || 0)),
              },
            })
          }
        />
      </div>

      <h3 className="mt-8 mb-3 text-xs uppercase tracking-widest text-white/60">
        Opening hours
      </h3>
      <p className="mb-2 text-xs text-white/60">
        Leave the second session empty for a continuous day, or fill both for a midday break.
      </p>
      <div className="space-y-2">
        {business.hours.map((h, i) => {
          const hasSplit = !!(h.open2 && h.close2);
          return (
            <div
              key={h.day}
              className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="w-14 shrink-0 text-sm text-white/80">
                  {DAYS.find((d) => d.key === h.day)?.label}
                </span>
                <input
                  type="time"
                  value={h.open}
                  disabled={h.closed}
                  onChange={(e) => {
                    const next = business.hours.slice();
                    next[i] = { ...h, open: e.target.value };
                    setBusinessLocal({ ...business, hours: next });
                  }}
                  style={{ colorScheme: "dark" }}
                  className="min-w-[100px] flex-1 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white disabled:opacity-40"
                />
                <input
                  type="time"
                  value={h.close}
                  disabled={h.closed}
                  onChange={(e) => {
                    const next = business.hours.slice();
                    next[i] = { ...h, close: e.target.value };
                    setBusinessLocal({ ...business, hours: next });
                  }}
                  style={{ colorScheme: "dark" }}
                  className="min-w-[100px] flex-1 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white disabled:opacity-40"
                />
                <label className="flex shrink-0 items-center gap-2 text-xs uppercase tracking-widest text-white/50">
                  <input
                    type="checkbox"
                    checked={h.closed}
                    onChange={(e) => {
                      const next = business.hours.slice();
                      next[i] = { ...h, closed: e.target.checked };
                      setBusinessLocal({ ...business, hours: next });
                    }}
                    style={{ accentColor: "#c9a961" }}
                  />
                  Closed
                </label>
              </div>
              {!h.closed && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="w-14 shrink-0 text-[10px] uppercase tracking-widest text-white/60">
                    2nd session
                  </span>
                  <input
                    type="time"
                    value={h.open2 ?? ""}
                    onChange={(e) => {
                      const next = business.hours.slice();
                      next[i] = { ...h, open2: e.target.value || undefined };
                      setBusinessLocal({ ...business, hours: next });
                    }}
                    style={{ colorScheme: "dark" }}
                    className="min-w-[100px] flex-1 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white"
                  />
                  <input
                    type="time"
                    value={h.close2 ?? ""}
                    onChange={(e) => {
                      const next = business.hours.slice();
                      next[i] = { ...h, close2: e.target.value || undefined };
                      setBusinessLocal({ ...business, hours: next });
                    }}
                    style={{ colorScheme: "dark" }}
                    className="min-w-[100px] flex-1 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const next = business.hours.slice();
                      next[i] = { ...h, open2: undefined, close2: undefined };
                      setBusinessLocal({ ...business, hours: next });
                    }}
                    disabled={!hasSplit}
                    className="text-[10px] uppercase tracking-widest text-white/60 hover:text-white disabled:opacity-40"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <h3 className="mt-8 mb-3 text-xs uppercase tracking-widest text-white/60">
        Social links
      </h3>
      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Instagram URL"
          value={business.social.instagram}
          onChange={(v) =>
            setBusinessLocal({
              ...business,
              social: { ...business.social, instagram: v },
            })
          }
          placeholder="https://instagram.com/yourshop"
        />
        <Field
          label="Facebook URL"
          value={business.social.facebook}
          onChange={(v) =>
            setBusinessLocal({
              ...business,
              social: { ...business.social, facebook: v },
            })
          }
          placeholder="https://facebook.com/yourshop"
        />
        <Field
          label="WhatsApp URL"
          value={business.social.whatsapp}
          onChange={(v) =>
            setBusinessLocal({
              ...business,
              social: { ...business.social, whatsapp: v },
            })
          }
          placeholder="https://wa.me/306945325780"
        />
        <Field
          label="TikTok URL"
          value={business.social.tiktok}
          onChange={(v) =>
            setBusinessLocal({
              ...business,
              social: { ...business.social, tiktok: v },
            })
          }
          placeholder="https://tiktok.com/@yourshop"
        />
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button
          onClick={saveBusiness}
          disabled={savingBiz}
          className="rounded-full bg-[#c9a961] px-7 py-3 text-xs font-semibold uppercase tracking-widest text-black disabled:opacity-50"
        >
          {savingBiz ? "Saving…" : "Save business info"}
        </button>
        {bizSavedAt && (
          <span className="text-xs text-emerald-300">Saved at {bizSavedAt}</span>
        )}
      </div>
    </div>
    </>
    )}

    {tab === "nav" && (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur">
      <h2 className="mb-1 font-serif text-2xl">2. Navigation</h2>
      <p className="mb-6 text-sm text-white/55">
        Reorder, rename, hide, add, or remove nav links. The &quot;Book&quot;
        button sits on the right of the nav bar.
      </p>

      <div className="space-y-2">
        {navDraft.links.map((l, i) => (
          <div
            key={l.id + i}
            className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2"
          >
            <div className="flex shrink-0 flex-col gap-1">
              <button
                type="button"
                onClick={() => moveLink(i, -1)}
                disabled={i === 0}
                aria-label="Move up"
                className="h-5 w-5 rounded border border-white/15 text-[10px] text-white/70 disabled:opacity-30"
              >
                ▲
              </button>
              <button
                type="button"
                onClick={() => moveLink(i, 1)}
                disabled={i === navDraft.links.length - 1}
                aria-label="Move down"
                className="h-5 w-5 rounded border border-white/15 text-[10px] text-white/70 disabled:opacity-30"
              >
                ▼
              </button>
            </div>
            <input
              value={l.label_en}
              onChange={(e) => updateLink(i, { label_en: e.target.value })}
              placeholder="Label (EN)"
              className="min-w-[140px] flex-1 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white placeholder-white/30"
            />
            <input
              value={l.label_el ?? ""}
              onChange={(e) => updateLink(i, { label_el: e.target.value })}
              placeholder="Label (EL)"
              className="min-w-[140px] flex-1 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white placeholder-white/30"
            />
            <input
              value={l.href}
              onChange={(e) => updateLink(i, { href: e.target.value })}
              placeholder="/path or https://..."
              className="min-w-[140px] flex-1 rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white placeholder-white/30"
            />
            <label className="flex shrink-0 items-center gap-1.5 text-[10px] uppercase tracking-widest text-white/50">
              <input
                type="checkbox"
                checked={l.enabled !== false}
                onChange={(e) => updateLink(i, { enabled: e.target.checked })}
                style={{ accentColor: "#c9a961" }}
              />
              Show
            </label>
            <button
              type="button"
              onClick={() => removeLink(i)}
              className="shrink-0 rounded-md border border-red-400/40 bg-red-500/10 px-2 py-1.5 text-[10px] uppercase tracking-widest text-red-200"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addLink}
        className="mt-3 w-full rounded-lg border border-dashed border-[#c9a961]/50 bg-[#c9a961]/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-widest text-[#c9a961]"
      >
        + Add link
      </button>

      <h3 className="mt-8 mb-3 text-xs uppercase tracking-widest text-white/60">
        Book button
      </h3>
      <div className="grid gap-4 md:grid-cols-3">
        <Field
          label="Label (EN)"
          value={navDraft.bookLabel_en}
          onChange={(v) => setNavDraft({ ...navDraft, bookLabel_en: v })}
        />
        <Field
          label="Label (EL)"
          value={navDraft.bookLabel_el ?? ""}
          onChange={(v) => setNavDraft({ ...navDraft, bookLabel_el: v })}
        />
        <Field
          label="Link"
          value={navDraft.bookHref}
          onChange={(v) => setNavDraft({ ...navDraft, bookHref: v })}
          placeholder="/book"
        />
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button
          onClick={saveNav}
          disabled={savingNav}
          className="rounded-full bg-[#c9a961] px-7 py-3 text-xs font-semibold uppercase tracking-widest text-black disabled:opacity-50"
        >
          {savingNav ? "Saving…" : "Save navigation"}
        </button>
        {navSavedAt && (
          <span className="text-xs text-emerald-300">Saved at {navSavedAt}</span>
        )}
      </div>
    </div>
    )}

    {tab === "brand" && (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur">
      <h2 className="mb-1 font-serif text-2xl">3. Branding</h2>
      <p className="mb-6 text-sm text-white/55">
        Upload your logo and favicon, set the wordmark and tagline. Applied
        site-wide.
      </p>

      <div className="grid gap-6 md:grid-cols-3">
        <div>
          <label className="mb-2 block text-xs uppercase tracking-widest text-white/60">
            Logo · dark mode
          </label>
          <p className="mb-2 text-[10px] text-white/45">Shown on dark backgrounds. Use a cream / light-coloured artwork.</p>
          <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-white/10 bg-black/30">
              {branding.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={branding.logoUrl}
                  alt="Logo (dark mode)"
                  className="max-h-14 max-w-14 object-contain"
                />
              ) : (
                <span className="text-[10px] uppercase tracking-widest text-white/55">
                  None
                </span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={onPickLogo}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                className="rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-white"
              >
                {branding.logoUrl ? "Replace" : "Upload"}
              </button>
              {branding.logoUrl && (
                <button
                  type="button"
                  onClick={() =>
                    setBrandingLocal((b) => ({ ...b, logoUrl: "" }))
                  }
                  className="text-[11px] uppercase tracking-widest text-white/60 hover:text-white/70"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs uppercase tracking-widest text-white/60">
            Logo · light mode
          </label>
          <p className="mb-2 text-[10px] text-white/45">Shown on light backgrounds. Use a dark-coloured artwork.</p>
          <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-white/10 bg-white/80">
              {branding.logoUrlDark ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={branding.logoUrlDark}
                  alt="Logo (light mode)"
                  className="max-h-14 max-w-14 object-contain"
                />
              ) : (
                <span className="text-[10px] uppercase tracking-widest text-black/45">
                  None
                </span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <input
                id="logo-dark-input"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={onPickLogoDark}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => document.getElementById("logo-dark-input")?.click()}
                className="rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-white"
              >
                {branding.logoUrlDark ? "Replace" : "Upload"}
              </button>
              {branding.logoUrlDark && (
                <button
                  type="button"
                  onClick={() =>
                    setBrandingLocal((b) => ({ ...b, logoUrlDark: "" }))
                  }
                  className="text-[11px] uppercase tracking-widest text-white/60 hover:text-white/70"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs uppercase tracking-widest text-white/60">
            Favicon
          </label>
          <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-white/10 bg-black/30">
              {branding.faviconUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={branding.faviconUrl}
                  alt="Favicon"
                  className="max-h-8 max-w-8 object-contain"
                />
              ) : (
                <span className="text-[10px] uppercase tracking-widest text-white/55">
                  Default
                </span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <input
                ref={faviconInputRef}
                type="file"
                accept="image/png,image/x-icon,image/vnd.microsoft.icon,image/svg+xml"
                onChange={onPickFavicon}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => faviconInputRef.current?.click()}
                className="rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-white"
              >
                {branding.faviconUrl ? "Replace" : "Upload"}
              </button>
              {branding.faviconUrl && (
                <button
                  type="button"
                  onClick={() =>
                    setBrandingLocal((b) => ({ ...b, faviconUrl: "" }))
                  }
                  className="text-[11px] uppercase tracking-widest text-white/60 hover:text-white/70"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>

        <Field
          label="Wordmark"
          value={branding.wordmark}
          onChange={(v) => setBrandingLocal({ ...branding, wordmark: v })}
          placeholder="YOUR SALON"
        />
        <div />

        <Field
          label="Tagline (English)"
          value={branding.tagline_en}
          onChange={(v) => setBrandingLocal({ ...branding, tagline_en: v })}
          placeholder="Barber · Loutraki"
        />
        <Field
          label="Tagline (Ελληνικά)"
          value={branding.tagline_el}
          onChange={(v) => setBrandingLocal({ ...branding, tagline_el: v })}
          placeholder="Barber · Λουτράκι"
        />
      </div>

      {uploadError && (
        <p className="mt-4 rounded-lg border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-200">
          {uploadError}
        </p>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button
          onClick={saveBranding}
          disabled={savingBrand}
          className="rounded-full bg-[#c9a961] px-7 py-3 text-xs font-semibold uppercase tracking-widest text-black disabled:opacity-50"
        >
          {savingBrand ? "Saving…" : "Save branding"}
        </button>
        {brandSavedAt && (
          <span className="text-xs text-emerald-300">
            Saved at {brandSavedAt}. Reload to update favicon.
          </span>
        )}
      </div>
    </div>
    )}

    {tab === "email" && (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur">
      <h2 className="mb-1 font-serif text-2xl">4. Email templates</h2>
      <p className="mb-4 text-sm text-white/55">
        Customise the confirmation and 8-hour reminder emails. Use placeholders
        and they&apos;ll be replaced at send time.
      </p>
      <p className="mb-6 rounded-lg border border-[#c9a961]/30 bg-[#c9a961]/5 p-3 text-xs text-[#c9a961]">
        Placeholders: {`{name} {service} {price} {barber} {date} {time} {phone} {email} {business} {address} {city}`}
      </p>

      {(["confirmation", "reminder"] as const).map((kind) => (
        <div key={kind} className="mb-6 rounded-xl border border-white/10 bg-white/[0.02] p-5">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-widest text-white/70">
            {kind === "confirmation" ? "Booking confirmation" : "8-hour reminder"}
          </h3>
          {emailLangs.map((lng) => {
            const tpl = templates[kind] as Record<string, string | undefined>;
            const subjKey = `subject_${lng}`;
            const bodyKey = `body_${lng}`;
            const setKey = (key: string, val: string) =>
              setTemplates({
                ...templates,
                [kind]: { ...templates[kind], [key]: val } as EmailTemplate,
              });
            return (
              <div key={lng} className="mb-5 last:mb-0">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#c9a961]">
                  {LANG_NAMES[lng]}
                </p>
                <div className="grid gap-4">
                  <Field
                    label="Subject"
                    value={tpl[subjKey] ?? ""}
                    onChange={(v) => setKey(subjKey, v)}
                  />
                  <div>
                    <label className="mb-2 block text-xs uppercase tracking-widest text-white/60">
                      Body
                    </label>
                    <textarea
                      rows={8}
                      value={tpl[bodyKey] ?? ""}
                      onChange={(e) => setKey(bodyKey, e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-white/40"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={saveTemplates}
          disabled={savingTpl}
          className="rounded-full bg-[#c9a961] px-7 py-3 text-xs font-semibold uppercase tracking-widest text-black disabled:opacity-50"
        >
          {savingTpl ? "Saving…" : "Save templates"}
        </button>
        {tplSavedAt && (
          <span className="text-xs text-emerald-300">Saved at {tplSavedAt}</span>
        )}
      </div>
    </div>
    )}

    {tab === "seo" && (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur">
      <h2 className="mb-1 font-serif text-2xl">SEO · per page</h2>
      <p className="mb-4 text-sm text-white/55">
        Title + description + share image for each page. Shown in Google,
        Facebook/WhatsApp shares, and the browser tab.
      </p>

      <button
        type="button"
        onClick={() => window.open(clientPath("/sitemap.xml"), "_blank", "noopener")}
        className="mb-6 rounded-full border border-[#c9a961]/40 bg-[#c9a961]/10 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-[#c9a961] transition-colors hover:bg-[#c9a961]/20"
      >
        Download sitemap.xml
      </button>

      <label className="mb-2 block text-xs uppercase tracking-widest text-white/60">
        Page
      </label>
      <select
        value={seoPage}
        onChange={(e) => setSeoPage(e.target.value)}
        style={{ colorScheme: "dark" }}
        className="mb-6 appearance-none rounded-xl border border-white/10 bg-[#14110d] px-4 py-3 text-sm text-white"
      >
        {SEO_PAGES.map((p) => (
          <option key={p.key} value={p.key}>
            {p.label}
          </option>
        ))}
      </select>

      {seoLoading ? (
        <p className="text-white/60">Loading…</p>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Title (EN)"
              value={seoDraft.title_en}
              onChange={(v) => setSeoDraft({ ...seoDraft, title_en: v })}
              placeholder="Keep under 60 chars"
            />
            <Field
              label="Title (EL)"
              value={seoDraft.title_el}
              onChange={(v) => setSeoDraft({ ...seoDraft, title_el: v })}
            />
            <div>
              <label className="mb-2 block text-xs uppercase tracking-widest text-white/60">
                Description (EN)
              </label>
              <textarea
                rows={3}
                value={seoDraft.description_en}
                onChange={(e) =>
                  setSeoDraft({ ...seoDraft, description_en: e.target.value })
                }
                placeholder="140–160 characters"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-white/40"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs uppercase tracking-widest text-white/60">
                Description (EL)
              </label>
              <textarea
                rows={3}
                value={seoDraft.description_el}
                onChange={(e) =>
                  setSeoDraft({ ...seoDraft, description_el: e.target.value })
                }
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-white/40"
              />
            </div>
          </div>

          <div className="mt-6">
            <label className="mb-2 block text-xs uppercase tracking-widest text-white/60">
              Social share image (1200 × 630)
            </label>
            <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="flex h-16 w-28 items-center justify-center rounded-lg border border-white/10 bg-black/30">
                {seoDraft.ogImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={seoDraft.ogImage}
                    alt="Share"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-[10px] uppercase tracking-widest text-white/55">
                    Default
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <input
                  ref={seoOgInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={onPickOgImage}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => seoOgInputRef.current?.click()}
                  className="rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-white"
                >
                  {seoDraft.ogImage ? "Replace" : "Upload"}
                </button>
                {seoDraft.ogImage && (
                  <button
                    type="button"
                    onClick={() =>
                      setSeoDraft((s) => ({ ...s, ogImage: "" }))
                    }
                    className="text-[11px] uppercase tracking-widest text-white/60 hover:text-white/70"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              onClick={saveSeo}
              disabled={savingSeo}
              className="rounded-full bg-[#c9a961] px-7 py-3 text-xs font-semibold uppercase tracking-widest text-black disabled:opacity-50"
            >
              {savingSeo ? "Saving…" : "Save SEO"}
            </button>
            {seoSavedAt && (
              <span className="text-xs text-emerald-300">
                Saved at {seoSavedAt}
              </span>
            )}
          </div>
        </>
      )}
    </div>
    )}

    {tab === "email" && (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur">
        <h2 className="mb-1 font-serif text-2xl">6. Email delivery (SMTP)</h2>
        <p className="mb-6 text-sm text-white/55">
          Pick your provider, paste the credentials, save. Confirmation +
          8-hour reminder emails will start going out from your account.
        </p>

        <label className="mb-2 block text-xs uppercase tracking-widest text-white/60">
          Provider preset
        </label>
        <select
          onChange={(e) => applyPreset(e.target.value)}
          defaultValue=""
          style={{ colorScheme: "dark" }}
          className="appearance-none rounded-xl border border-white/10 bg-[#14110d] bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2210%22 height=%226%22 viewBox=%220 0 10 6%22><path fill=%22%23c9a961%22 d=%22M0 0l5 6 5-6z%22/></svg>')] bg-[length:10px_6px] bg-[position:right_14px_center] bg-no-repeat px-4 py-3 pr-9 text-sm text-white outline-none focus:border-white/40"
        >
          <option value="" disabled>
            Pick a provider…
          </option>
          {PRESETS.map((p) => (
            <option key={p.label} value={p.label}>
              {p.label}
            </option>
          ))}
        </select>

        <AnimatePresence>
          {help && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 overflow-hidden rounded-lg border border-[#c9a961]/30 bg-[#c9a961]/5 p-3 text-sm text-[#c9a961]"
            >
              {help}
            </motion.p>
          )}
        </AnimatePresence>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field
            label="Host"
            value={smtp.host}
            onChange={(v) => setSmtp({ ...smtp, host: v })}
            placeholder="smtp.gmail.com"
          />
          <Field
            label="Port"
            type="number"
            value={String(smtp.port)}
            onChange={(v) => setSmtp({ ...smtp, port: Number(v) || 587 })}
          />
          <Field
            label="Username"
            value={smtp.user}
            onChange={(v) => setSmtp({ ...smtp, user: v })}
            placeholder="hello@yoursalon.local"
          />
          <Field
            label="Password / API key"
            type="password"
            value={smtp.pass}
            onChange={(v) => setSmtp({ ...smtp, pass: v })}
          />
          <Field
            label="From address"
            value={smtp.from}
            onChange={(v) => setSmtp({ ...smtp, from: v })}
            placeholder='Your Salon <hello@yoursalon.local>'
          />
          <div>
            <label className="mb-2 block text-xs uppercase tracking-widest text-white/60">
              Encryption
            </label>
            <select
              value={smtp.secure}
              onChange={(e) =>
                setSmtp({ ...smtp, secure: e.target.value as Smtp["secure"] })
              }
              style={{ colorScheme: "dark" }}
              className="w-full appearance-none rounded-xl border border-white/10 bg-[#14110d] bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2210%22 height=%226%22 viewBox=%220 0 10 6%22><path fill=%22%23c9a961%22 d=%22M0 0l5 6 5-6z%22/></svg>')] bg-[length:10px_6px] bg-[position:right_14px_center] bg-no-repeat px-4 py-3 pr-9 text-sm text-white outline-none focus:border-white/40"
            >
              <option value="tls">TLS / STARTTLS (port 587)</option>
              <option value="ssl">SSL (port 465)</option>
              <option value="none">None</option>
            </select>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="rounded-full bg-[#c9a961] px-7 py-3 text-xs font-semibold uppercase tracking-widest text-black disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save settings"}
          </button>
          {savedAt && (
            <span className="text-xs text-emerald-300">
              Saved at {savedAt}
            </span>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur">
        <h2 className="mb-1 font-serif text-2xl">7. Send a test email</h2>
        <p className="mb-6 text-sm text-white/55">
          Saves your settings first, then sends a tiny "it works" message.
        </p>
        <Field
          label="Send to"
          value={testTo}
          onChange={setTestTo}
          placeholder="you@example.com"
        />
        <button
          onClick={sendTest}
          disabled={testing || !testTo}
          className="mt-4 rounded-full border border-white/20 bg-white/5 px-6 py-2.5 text-xs font-semibold uppercase tracking-widest text-white disabled:opacity-40"
        >
          {testing ? "Sending…" : "Send test"}
        </button>

        {testResult && (
          <p
            className={`mt-4 rounded-lg border p-3 text-sm ${
              testResult.ok
                ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
                : "border-red-400/40 bg-red-500/10 text-red-200"
            }`}
          >
            {testResult.msg}
          </p>
        )}

        <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.02] p-4 text-xs text-white/55">
          <p className="mb-2 uppercase tracking-widest text-white/60">
            What gets sent automatically
          </p>
          <ul className="space-y-1.5">
            <li>· Booking confirmation when a customer completes the form</li>
            <li>· Reminder email 8 hours before each appointment</li>
            <li>· Bulk emails you trigger from the "Bulk email" tab</li>
          </ul>
        </div>
      </div>
    </div>
    )}

    {tab === "payments" && (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur">
      <h2 className="mb-1 font-serif text-2xl">Payments (Stripe)</h2>
      <p className="mb-6 text-sm text-white/55">
        Paste your Stripe keys to accept card payments on shop orders. Leave
        blank to use the manual &ldquo;we&rsquo;ll contact you about
        payment&rdquo; flow. Your keys never leave the server.
      </p>
      <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
        <Field
          label="Stripe secret key"
          value={payments.stripeSecretKey}
          onChange={(v) => setPayments({ ...payments, stripeSecretKey: v })}
          placeholder="sk_live_… or sk_test_…"
        />
        <Field
          label="Currency (3-letter)"
          value={payments.currency}
          onChange={(v) => setPayments({ ...payments, currency: v.toUpperCase().slice(0, 3) })}
          placeholder="USD"
        />
      </div>
      <div className="mt-4">
        <Field
          label="Stripe publishable key (optional, for future on-site Checkout)"
          value={payments.stripePublishableKey}
          onChange={(v) => setPayments({ ...payments, stripePublishableKey: v })}
          placeholder="pk_live_… or pk_test_…"
        />
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          onClick={savePayments}
          disabled={savingPay}
          className="rounded-full bg-[#c9a961] px-7 py-3 text-xs font-semibold uppercase tracking-widest text-black disabled:opacity-50"
        >
          {savingPay ? "Saving…" : "Save payments"}
        </button>
        {paySavedAt && (
          <span className="text-xs text-emerald-300">Saved at {paySavedAt}</span>
        )}
      </div>
      <p className="mt-6 rounded-lg border border-white/10 bg-white/[0.02] p-3 text-xs text-white/50">
        Use a <strong className="text-white/70">test key</strong> while you try it,
        then swap to the live key when you&rsquo;re ready. Test card:{" "}
        <code className="rounded bg-black/40 px-1.5 py-0.5">4242 4242 4242 4242</code>,
        any future expiry, any CVC.
      </p>
    </div>
    )}

    {/* Membership sits right after Payments — it is a billing feature. */}
    {tab === "membership" && <MembershipPanel />}

    {tab === "analytics" && (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur">
      <h2 className="mb-1 font-serif text-2xl">8. Analytics</h2>
      <p className="mb-6 text-sm text-white/55">
        Paste your tracking IDs. Scripts are injected site-wide only when an ID
        is set. Leave blank to disable.
      </p>

      <div className="grid gap-4 md:grid-cols-3">
        <Field
          label="Google Analytics 4"
          value={analytics.ga4}
          onChange={(v) => setAnalytics({ ...analytics, ga4: v })}
          placeholder="G-XXXXXXXXXX"
        />
        <Field
          label="Google Tag Manager"
          value={analytics.gtm}
          onChange={(v) => setAnalytics({ ...analytics, gtm: v })}
          placeholder="GTM-XXXXXXX"
        />
        <Field
          label="Meta Pixel"
          value={analytics.metaPixel}
          onChange={(v) => setAnalytics({ ...analytics, metaPixel: v })}
          placeholder="1234567890"
        />
      </div>

      <h3 className="mt-8 mb-1 font-serif text-lg">Server-side conversions</h3>
      <p className="mb-4 text-sm text-white/55">
        Add these and the site reports the Purchase event server to server,
        straight from the payment confirmation. It survives ad blockers,
        cookie loss and iOS tracking limits, so bookings, orders and
        memberships are counted accurately. Leave blank to keep
        browser-only tracking.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Meta Conversions API token"
          value={analytics.metaCapiToken}
          onChange={(v) => setAnalytics({ ...analytics, metaCapiToken: v })}
          placeholder="EAAB… (Events Manager → Settings)"
        />
        <Field
          label="GA4 Measurement Protocol secret"
          value={analytics.ga4ApiSecret}
          onChange={(v) => setAnalytics({ ...analytics, ga4ApiSecret: v })}
          placeholder="Admin → Data Streams → Measurement Protocol"
        />
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button
          onClick={saveAnalytics}
          disabled={savingAn}
          className="rounded-full bg-[#c9a961] px-7 py-3 text-xs font-semibold uppercase tracking-widest text-black disabled:opacity-50"
        >
          {savingAn ? "Saving…" : "Save analytics"}
        </button>
        {anSavedAt && (
          <span className="text-xs text-emerald-300">Saved at {anSavedAt}</span>
        )}
      </div>
    </div>
    )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs uppercase tracking-widest text-white/60">
        {label}
      </label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-white/40"
      />
    </div>
  );
}
