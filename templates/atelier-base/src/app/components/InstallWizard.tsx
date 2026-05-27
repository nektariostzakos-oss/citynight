"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { qrToSvg } from "../../lib/qr";
import { lookupPostal } from "../../lib/postalLookup";
import { withBasePath, clientPath } from "../../lib/basePath";
import { useTheme } from "../../lib/theme";
import type { Lang } from "../../lib/langs";
import { SELECTABLE_TEMPLATES, DEFAULT_TEMPLATE, type TemplateId } from "../../templates/registry";

/**
 * The installer's own UI language. Kept separate from the live site's language
 * system (useLang / LangProvider): that one is gated to the site's enabled
 * languages, which during setup is only English, so it cannot drive the
 * wizard. This context lets the header dropdown pick any of the 11 languages
 * the wizard speaks; it is browser-detected on first paint.
 *
 * `t(key)` resolves a stable string key against WIZARD_STRINGS in the current
 * UI language, so every visible string in the wizard re-renders the moment the
 * header dropdown changes uiLang.
 */
const WizardLangContext = createContext<{
  uiLang: string;
  setUiLang: (l: string) => void;
  t: (key: string) => string;
}>({ uiLang: "en", setUiLang: () => {}, t: (k) => k });

/** Substitute `{token}` placeholders in a translated string. */
function fmt(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{(\w+)\}/g, (m, k) =>
    k in vars ? String(vars[k]) : m,
  );
}

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
}
function wordmarkFrom(name: string) {
  return name.trim().toUpperCase().slice(0, 24);
}
function suggestedEmail(name: string) {
  const handle = slugify(name).replace(/-/g, "");
  return handle ? `hello@${handle}.com` : "";
}
function generatePassword() {
  const words = ["cedar", "lantern", "quiet", "amber", "river", "oak", "harbor", "copper", "slate", "maple", "linen", "velvet", "ember", "orchid", "atlas", "north", "birch", "ivory"];
  const pick = () => words[Math.floor(Math.random() * words.length)];
  const n = Math.floor(10 + Math.random() * 89);
  return `${pick()}-${pick()}-${pick()}-${n}`;
}

type Template = {
  id: string;
  name: string;
  industry: string;
  tagline: string;
  description: string;
  cover: string;
  accentColor: string;
  features: string[];
  stats: { services: number; products: number; posts: number; categories: number };
  theme: Record<string, string>;
  branding: { wordmark: string; tagline_en: string; tagline_el: string };
};

type HourRow = {
  day: "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
  open: string;   // "HH:MM"
  close: string;
  closed: boolean;
  open2?: string; // optional second window for split-shift shops
  close2?: string;
};

type Business = {
  name: string;
  streetAddress: string;
  city: string;
  postalCode: string;
  country: string;
  phone: string;
  email: string;
  foundedYear: string;  // e.g. "2016" — drives the footer "Established" line
  timezone: string;  // IANA zone id, e.g. "Europe/London"
  hours: HourRow[];  // 7 entries, monday-first
};

const DEFAULT_HOURS: HourRow[] = [
  { day: "mon", open: "10:00", close: "19:00", closed: false },
  { day: "tue", open: "10:00", close: "19:00", closed: false },
  { day: "wed", open: "10:00", close: "19:00", closed: false },
  { day: "thu", open: "10:00", close: "19:00", closed: false },
  { day: "fri", open: "10:00", close: "19:00", closed: false },
  { day: "sat", open: "10:00", close: "17:00", closed: false },
  { day: "sun", open: "00:00", close: "00:00", closed: true },
];

// Small curated list — covers most salon markets. The wizard also allows
// free-text fallback for any IANA zone if yours isn't here.
const COMMON_TIMEZONES: { id: string; label: string }[] = [
  { id: "Europe/London", label: "London · GMT" },
  { id: "Europe/Athens", label: "Athens · EET" },
  { id: "Europe/Paris", label: "Paris · CET" },
  { id: "Europe/Berlin", label: "Berlin · CET" },
  { id: "Europe/Madrid", label: "Madrid · CET" },
  { id: "Europe/Rome", label: "Rome · CET" },
  { id: "Europe/Amsterdam", label: "Amsterdam · CET" },
  { id: "Europe/Lisbon", label: "Lisbon · WET" },
  { id: "Europe/Dublin", label: "Dublin · GMT" },
  { id: "Europe/Istanbul", label: "Istanbul · TRT" },
  { id: "Asia/Nicosia", label: "Nicosia · EET" },
  { id: "America/New_York", label: "New York · ET" },
  { id: "America/Chicago", label: "Chicago · CT" },
  { id: "America/Los_Angeles", label: "Los Angeles · PT" },
];

type Admin = { email: string; password: string; confirm: string };

type Social = { instagram: string; facebook: string; whatsapp: string; tiktok: string };
type Brand = { tagline_en: string; tagline_el: string; priceRange: string; logoUrl: string; heroLayout: string; template: TemplateId };
type BookingRules = {
  leadTimeMinutes: number;
  cancellationWindowHours: number;
  depositPercent: number;
  noShowFeePercent: number;
};
type Analytics = { ga4: string; gtm: string; metaPixel: string };
type BookingMode = "appointment" | "reservation";

type StepDef = { id: string; label: string };

// The installer adapts to the data-mode picked on the Start step. A "fresh"
// install walks every buyer-fillable setting — but the Business step stays a
// single progress entry that paginates through its own sub-pages with Next
// buttons, so only the technical pieces (SMTP, Stripe, AI keys) are left for
// after launch. A "demo" install copies the template's showcase content, so
// it only asks for the few things that must be the buyer's: name, logo, tz.
// `label` is a WIZARD_STRINGS key, resolved through t() in the ProgressBar.
const FRESH_STEPS: StepDef[] = [
  { id: "start", label: "step.start" },
  { id: "business", label: "step.business" },
  { id: "review", label: "step.review" },
];
const DEMO_STEPS: StepDef[] = [
  { id: "start", label: "step.start" },
  { id: "basics", label: "step.basics" },
  { id: "review", label: "step.review" },
];

// The Business step's internal sub-pages, walked with Next/Back inside the
// step itself. Each is a self-contained settings group.
const BUSINESS_SUBSTEPS = [
  "identity", "location", "social", "brand", "media", "booking", "analytics", "team",
] as const;
type BusinessSub = (typeof BUSINESS_SUBSTEPS)[number];

/**
 * Spread the buyer's uploaded photos across every static image slot of a
 * clean install — homepage hero, about, contact, CTA and both galleries — so
 * the site looks finished the moment it launches. Slots are filled at random;
 * with fewer photos than slots, images repeat rather than leaving a hardcoded
 * stock fallback showing. The result is a content.json the install writes
 * verbatim. Demo installs ignore this — they ship the template's own photos.
 */
function shuffleImages(arr: string[]): string[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function distributeImages(images: string[]): Record<string, unknown> {
  if (images.length === 0) return {};
  const pick = () => images[Math.floor(Math.random() * images.length)];
  const stripCount = Math.min(6, images.length);
  return {
    hero: { bgImage: pick(), sideImage: pick() },
    page_home: { bgImage: pick() },
    about: { image: pick() },
    contact: { image: pick() },
    cta: { bgImage: pick() },
    gallery_strip: { images: shuffleImages(images).slice(0, stripCount).map((src) => ({ src })) },
    gallery: { items: shuffleImages(images).map((src, i) => ({ src, big: i === 0 })) },
  };
}

// Same-origin proxy. The /api/license-check route forwards to the marketing
// site server-side, so the wizard never deals with CORS or NEXT_PUBLIC_ baking.
const LICENSE_VALIDATE_URL = "/api/license-check";

type LicenseState = {
  rawInput: string;
  status: "idle" | "checking" | "valid" | "invalid";
  message: string | null;
  key: string | null;
  packageId: string | null;
  firstName: string | null;
};

export default function InstallWizard({
  isTenant = false,
  tenantSlug,
}: {
  isTenant?: boolean;
  tenantSlug?: string;
}) {
  const [step, setStep] = useState(0);
  // The installer's own UI language, driven by the header dropdown. Detected
  // on mount, then freely overridable. See WizardLangContext.
  const [uiLang, setUiLang] = useState("en");
  useEffect(() => {
    // proxy.ts already resolved IP-country -> Accept-Language into the
    // `atelier_lang` cookie before this page rendered; honour that first so
    // the wizard opens in the same language the rest of the detection picked.
    // Fall back to the browser language when the cookie is absent.
    const fromCookie = document.cookie
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith("atelier_lang="))
      ?.slice("atelier_lang=".length);
    const candidate = (fromCookie || navigator.language || "").toLowerCase();
    const m = WIZARD_LANGS.find((l) => candidate.startsWith(l.code));
    if (m) setUiLang(m.code);
  }, []);
  // Set when the buyer returns from a Stripe domain purchase
  // (/<slug>/setup?bought=<domain>).
  const [boughtDomain, setBoughtDomain] = useState<string | null>(null);
  // The installer always provisions a fresh, empty site. Demo content is no
  // longer a setup-time choice — buyers import it later from the admin Tools
  // panel if they want a populated site to explore.
  const [dataMode] = useState<"clean" | "demo">("clean");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selected, setSelected] = useState<Template | null>(null);
  const [business, setBusiness] = useState<Business>({
    // Dev-only: `npm run dev:tenant` prefills the business name so the
    // port-3300 tenant host's wizard can be clicked through fast. Unset
    // everywhere else — a real install starts with an empty field.
    name: process.env.NEXT_PUBLIC_ATELIER_DEV_BUSINESS_NAME || "",
    streetAddress: "", city: "", postalCode: "",
    country: "GR", phone: "", email: "", foundedYear: "",
    timezone: "Europe/London", hours: DEFAULT_HOURS,
  });
  const [admin, setAdmin] = useState<Admin>(() => {
    // Dev-only: `npm run dev:tenant` prefills the admin account (email +
    // password) so the wizard's first step can be clicked straight through.
    // The customer ZIP build never defines these, so a real install opens
    // with empty fields.
    const devPass = process.env.NEXT_PUBLIC_ATELIER_DEV_ADMIN_PASSWORD || "";
    return {
      email: process.env.NEXT_PUBLIC_ATELIER_DEV_ADMIN_EMAIL || "",
      password: devPass,
      confirm: devPass,
    };
  });
  const [license, setLicense] = useState<LicenseState>({
    // Dev-only convenience: `npm run dev:template` sets this so the local
    // first-run host opens with a working key already typed (it then
    // auto-verifies). Unset everywhere else — the customer ZIP build never
    // defines it, so a real install still starts with an empty field.
    rawInput: process.env.NEXT_PUBLIC_ATELIER_DEV_LICENSE || "",
    status: "idle",
    message: null,
    key: null,
    packageId: null,
    firstName: null,
  });
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [stats, setStats] = useState<{ total: number; week: number } | null>(null);
  const [teammates, setTeammates] = useState<string[]>([]);
  // English and German are pre-picked, so a fresh install ships bilingual by
  // default. English is locked on; German can still be unticked in the step.
  const [enabledLanguages, setEnabledLanguages] = useState<string[]>(["en", "de"]);
  const [progressEvents, setProgressEvents] = useState<string[]>([]);
  const [social, setSocial] = useState<Social>({ instagram: "", facebook: "", whatsapp: "", tiktok: "" });
  const [brand, setBrand] = useState<Brand>({ tagline_en: "", tagline_el: "", priceRange: "$$", logoUrl: "", heroLayout: "split", template: DEFAULT_TEMPLATE });
  const [bookingRules, setBookingRules] = useState<BookingRules>({
    leadTimeMinutes: 45, cancellationWindowHours: 4, depositPercent: 0, noShowFeePercent: 50,
  });
  const [bookingMode, setBookingMode] = useState<BookingMode>("appointment");
  const [analytics, setAnalytics] = useState<Analytics>({ ga4: "", gtm: "", metaPixel: "" });
  // Buyer-uploaded photos and the content.json the "Distribute" button builds
  // from them. siteContent is null until they distribute; the install writes
  // it verbatim on a clean install so the site launches with real images.
  const [mediaImages, setMediaImages] = useState<string[]>([]);
  const [siteContent, setSiteContent] = useState<Record<string, unknown> | null>(null);

  // The step list depends on the data-mode choice. Once the buyer leaves the
  // Start step the choice is locked in, so recomputing here is safe.
  const STEPS = useMemo(() => {
    const base = dataMode === "demo" ? DEMO_STEPS : FRESH_STEPS;
    // SaaS tenants choose their domain right after the Start step, before
    // filling in business details.
    if (!isTenant) return base;
    const i = base.findIndex((s) => s.id === "start");
    if (i < 0) return [{ id: "domain", label: "step.domain" }, ...base];
    return [
      ...base.slice(0, i + 1),
      { id: "domain", label: "step.domain" },
      ...base.slice(i + 1),
    ];
  }, [dataMode, isTenant]);
  const stepId = STEPS[step]?.id ?? "start";

  useEffect(() => {
    fetch("/api/templates").then((r) => r.json()).then((d) => {
      setTemplates(d.templates || []);
      if (d.templates?.length === 1) setSelected(d.templates[0]);
    });
    fetch("/api/install-stats").then((r) => r.json()).then(setStats).catch(() => {});

    // Returned from a Stripe domain purchase: land on the Domain step with a
    // confirmation, and strip the query so a refresh does not re-trigger it.
    try {
      const bought = new URLSearchParams(window.location.search).get("bought");
      if (bought) {
        setBoughtDomain(bought);
        const di = STEPS.findIndex((s) => s.id === "domain");
        if (di >= 0) setStep(di);
        window.history.replaceState(null, "", window.location.pathname);
      }
    } catch {}

    // Browser auto-detect for country + timezone. We seed the detected IANA
    // zone on first paint — the hours / booking engine is timezone-safe and
    // picking the wrong zone silently breaks every booking slot.
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      const lang = (navigator.language || "").toLowerCase();
      const detected = detectCountry(tz, lang);
      setBusiness((b) => ({
        ...b,
        country: b.country === "GR" && detected ? detected : b.country,
        timezone: tz || b.timezone,
      }));
    } catch {}

    // IP geolocation — fills the timezone (and country, while still default)
    // from where the visitor actually is. Best-effort: any failure or rate
    // limit leaves the browser-detected guess untouched.
    fetch("https://ipapi.co/json/", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d || typeof d !== "object") return;
        const ipTz = typeof d.timezone === "string" ? d.timezone : "";
        const ipCountry = typeof d.country_code === "string" ? d.country_code : "";
        setBusiness((b) => ({
          ...b,
          timezone: ipTz || b.timezone,
          country: b.country === "GR" && ipCountry ? ipCountry : b.country,
        }));
      })
      .catch(() => {});
  }, []);

  // Per top-level-step gate for the shared footer's Continue button. The
  // Business step is excluded — it owns its own internal Next/Back footer.
  const canNext = useMemo(() => {
    switch (stepId) {
      case "start": {
        // SaaS tenants skip the license step; standalone installs require it.
        if (!isTenant && license.status !== "valid") return false;
        const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(admin.email);
        return emailOk && admin.password.length >= 8 && admin.password === admin.confirm;
      }
      case "basics":
        return business.name.trim().length > 0 && !!business.timezone.trim();
      default:
        return true;
    }
  }, [stepId, license, business, admin, isTenant]);

  async function install() {
    if (!selected) return;
    setInstalling(true);
    setError(null);
    setProgressEvents([]);

    // Narrate steps for UX credibility while the POST runs
    const narrate = async () => {
      const lines = [
        fmt(t("install.unpacking"), { name: selected.name }),
        fmt(t("install.applyingTheme"), { theme: selected.theme.background }),
        fmt(t("install.creatingAdmin"), { email: admin.email }),
        t("install.signingIn"),
      ];
      for (const l of lines) {
        await new Promise((r) => setTimeout(r, 300));
        setProgressEvents((p) => [...p, l]);
      }
    };
    const narration = narrate();

    // The buyer's distributed images (if any) plus the chosen hero layout,
    // merged into one content patch the install folds into content.json.
    const installContent: Record<string, unknown> = { ...(siteContent || {}) };
    if (brand.template === "salon" && brand.heroLayout && brand.heroLayout !== "split") {
      const heroPatch = installContent.hero;
      installContent.hero = {
        ...(heroPatch && typeof heroPatch === "object" && !Array.isArray(heroPatch)
          ? (heroPatch as Record<string, unknown>)
          : {}),
        heroLayout: brand.heroLayout,
      };
    }

    const r = await fetch("/api/install", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        templateId: selected.id,
        mode: dataMode,
        licenseKey: license.key,
        business: { ...business, social, priceRange: brand.priceRange },
        admin: { email: admin.email, password: admin.password },
        teammates,
        enabledLanguages,
        branding: { tagline_en: brand.tagline_en, tagline_el: brand.tagline_el, logoUrl: brand.logoUrl },
        bookingRules,
        bookingMode,
        siteTemplate: brand.template,
        analytics,
        content: Object.keys(installContent).length > 0 ? installContent : undefined,
      }),
    });
    await narration;
    setInstalling(false);
    if (r.ok) {
      setDone(true);
    } else {
      const d = await r.json().catch(() => ({ error: t("install.errFailed") }));
      setError(d.error || t("install.errFailed"));
    }
  }

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (done) return;
      const active = document.activeElement;
      const inForm = active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA");
      // The Business step owns its own internal Next/Back, so the parent
      // keyboard shortcut steps aside while the buyer is inside it.
      if (stepId === "business") return;
      if (e.key === "Enter" && !e.shiftKey && !inForm && canNext && step < STEPS.length - 1) {
        setStep((s) => s + 1);
      } else if (e.key === "Enter" && e.shiftKey && step > 0 && step <= STEPS.length - 1) {
        e.preventDefault();
        setStep((s) => Math.max(0, s - 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, canNext, done]);

  // Marketing-site accent: warm gold on near-black, matching atelier.mindscrollers.com.
  const INSTALLER_ACCENT = "#c9a961";

  // Wizard string resolver, rebuilt whenever the header dropdown changes the
  // UI language. Falls back to English, then to the raw key.
  const t = useMemo(() => {
    const lang = (WIZARD_LANGS.some((l) => l.code === uiLang) ? uiLang : "en") as Lang;
    return (key: string) =>
      WIZARD_STRINGS[key]?.[lang] ?? WIZARD_STRINGS[key]?.en ?? key;
  }, [uiLang]);

  return (
    // `install-wizard` carries the theme: globals.css paints the gradient +
    // text colour for dark, and `.light .install-wizard` repaints them and
    // remaps `--color-white` so every `*-white` utility below flips to a dark
    // ink on the light palette. Keep colours off the inline style so light
    // mode can override them.
    <WizardLangContext.Provider value={{ uiLang, setUiLang, t }}>
    <div className="install-wizard relative min-h-screen overflow-hidden">
      <Backdrop />
      <div className="relative mx-auto max-w-5xl px-6 py-10 sm:py-16">
        <Header accent={INSTALLER_ACCENT} stats={stats} />

        <ProgressBar step={step} total={STEPS.length - 1} primary={INSTALLER_ACCENT} labels={STEPS.map((s) => t(s.label))} />

        <div className="mt-10 min-h-[500px]">
          <AnimatePresence mode="wait">
            {done ? (
              <DoneStep key="done" business={business} template={selected} />
            ) : (
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {stepId === "start" && (
                  <StartStep
                    license={license}
                    onLicenseChange={setLicense}
                    admin={admin}
                    onAdminChange={setAdmin}
                    enabledLanguages={enabledLanguages}
                    onLanguagesChange={setEnabledLanguages}
                    isTenant={isTenant}
                    totalSteps={STEPS.length}
                  />
                )}
                {stepId === "business" && (
                  <BusinessStep
                    business={business}
                    onBusinessChange={setBusiness}
                    social={social}
                    onSocialChange={setSocial}
                    brand={brand}
                    onBrandChange={setBrand}
                    bookingRules={bookingRules}
                    onBookingRulesChange={setBookingRules}
                    bookingMode={bookingMode}
                    onBookingModeChange={setBookingMode}
                    analytics={analytics}
                    onAnalyticsChange={setAnalytics}
                    teammates={teammates}
                    onTeammatesChange={setTeammates}
                    mediaImages={mediaImages}
                    onMediaImagesChange={(imgs) => { setMediaImages(imgs); setSiteContent(null); }}
                    distributed={siteContent !== null}
                    onDistribute={() => setSiteContent(distributeImages(mediaImages))}
                    accent={INSTALLER_ACCENT}
                    onComplete={() => setStep((s) => s + 1)}
                    onBack={() => setStep((s) => Math.max(0, s - 1))}
                  />
                )}
                {stepId === "basics" && (
                  <DemoBasicsStep
                    value={business}
                    onChange={setBusiness}
                    brand={brand}
                    onBrandChange={setBrand}
                    enabledLanguages={enabledLanguages}
                    onLanguagesChange={setEnabledLanguages}
                  />
                )}
                {stepId === "domain" && (
                  <DomainStep slug={tenantSlug} boughtDomain={boughtDomain} />
                )}
                {stepId === "review" && (
                  <ReviewStep
                    template={selected}
                    business={business}
                    admin={admin}
                    teammates={teammates}
                    licenseFirstName={license.firstName ?? null}
                    dataMode={dataMode}
                    isTenant={isTenant}
                    social={social}
                    brand={brand}
                    bookingRules={bookingRules}
                    bookingMode={bookingMode}
                    analytics={analytics}
                    installing={installing}
                    progress={progressEvents}
                    error={error}
                    onInstall={install}
                    totalSteps={STEPS.length}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {!done && step < STEPS.length - 1 && stepId !== "business" && (
          <div className="mt-10 flex items-center justify-between">
            {step > 0 ? (
              <button
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                className="rounded-full border border-white/20 px-5 py-2 text-xs uppercase tracking-widest text-white/80 hover:bg-white/10"
              >
                ← {t("nav.back")}
              </button>
            ) : (
              <span />
            )}
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canNext}
              className="rounded-full px-8 py-2.5 text-xs font-semibold uppercase tracking-widest transition-opacity hover:opacity-90 disabled:opacity-40"
              style={{ background: INSTALLER_ACCENT, color: "#0a0806" }}
            >
              {t("nav.continue")} →
            </button>
          </div>
        )}

        {!done && step === STEPS.length - 1 && (
          <div className="mt-10 flex items-center justify-between">
            <button
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={installing}
              className="rounded-full border border-white/20 px-5 py-2 text-xs uppercase tracking-widest text-white/80 hover:bg-white/10 disabled:opacity-40"
            >
              ← {t("nav.back")}
            </button>
          </div>
        )}
      </div>
    </div>
    </WizardLangContext.Provider>
  );
}

// The 11 languages the salon template ships with.
const WIZARD_LANGS: { code: string; flag: string; native: string; english: string }[] = [
  { code: "en", flag: "🇬🇧", native: "English", english: "English" },
  { code: "el", flag: "🇬🇷", native: "Ελληνικά", english: "Greek" },
  { code: "de", flag: "🇩🇪", native: "Deutsch", english: "German" },
  { code: "fr", flag: "🇫🇷", native: "Français", english: "French" },
  { code: "it", flag: "🇮🇹", native: "Italiano", english: "Italian" },
  { code: "es", flag: "🇪🇸", native: "Español", english: "Spanish" },
  { code: "nl", flag: "🇳🇱", native: "Nederlands", english: "Dutch" },
  { code: "pl", flag: "🇵🇱", native: "Polski", english: "Polish" },
  { code: "pt", flag: "🇵🇹", native: "Português", english: "Portuguese" },
  { code: "sv", flag: "🇸🇪", native: "Svenska", english: "Swedish" },
  { code: "sq", flag: "🇦🇱", native: "Shqip", english: "Albanian" },
];

// This one step is shown in the operator's own language (browser-detected),
// since the shop owner running setup may not read English.
const WIZARD_LANG_HEADING: Record<string, string> = {
  en: "Which languages do you want on your site?",
  el: "Σε ποιες γλώσσες θέλεις τον ιστότοπό σου;",
  de: "In welchen Sprachen soll deine Seite verfügbar sein?",
  fr: "Dans quelles langues veux-tu ton site?",
  it: "In quali lingue vuoi il tuo sito?",
  es: "¿En qué idiomas quieres tu sitio?",
  nl: "In welke talen wil je je site?",
  pl: "W jakich językach chcesz swoją stronę?",
  pt: "Em que idiomas queres o teu site?",
  sv: "På vilka språk vill du ha din webbplats?",
  sq: "Në cilat gjuhë e do faqen tënde?",
};
const WIZARD_LANG_SUBTEXT: Record<string, string> = {
  en: "English is always included. Select any additional languages your customers will see.",
  el: "Τα Αγγλικά περιλαμβάνονται πάντα. Διάλεξε όποιες επιπλέον γλώσσες θα βλέπουν οι πελάτες σου.",
  de: "Englisch ist immer dabei. Wähl alle weiteren Sprachen, die deine Kunden sehen sollen.",
  fr: "L'anglais est toujours inclus. Choisis les langues supplémentaires que verront tes clients.",
  it: "L'inglese è sempre incluso. Scegli le lingue aggiuntive che vedranno i tuoi clienti.",
  es: "El inglés siempre está incluido. Elige los idiomas adicionales que verán tus clientes.",
  nl: "Engels zit er altijd bij. Kies de extra talen die je klanten te zien krijgen.",
  pl: "Angielski jest zawsze w zestawie. Wybierz dodatkowe języki, które zobaczą twoi klienci.",
  pt: "O inglês está sempre incluído. Escolhe os idiomas adicionais que os teus clientes vão ver.",
  sv: "Engelska ingår alltid. Välj de ytterligare språk dina kunder ska se.",
  sq: "Anglishtja përfshihet gjithmonë. Zgjidh gjuhët shtesë që do të shohin klientët e tu.",
};
const WIZARD_LANG_ALWAYS: Record<string, string> = {
  en: "always on", el: "πάντα ενεργό", de: "immer aktiv", fr: "toujours actif",
  it: "sempre attivo", es: "siempre activo", nl: "altijd aan", pl: "zawsze aktywny",
  pt: "sempre ativo", sv: "alltid på", sq: "gjithmonë aktiv",
};

/**
 * Every user-visible string in the setup wizard, keyed by a stable id and
 * translated into all 11 languages the salon template ships with. `t(key)`
 * (from WizardLangContext) resolves against this table in the operator's
 * chosen UI language, falling back to English then the raw key.
 */
const WIZARD_STRINGS: Record<string, Record<Lang, string>> = {
  // ── Header ──────────────────────────────────────────────────────────
  "header.by": {
    en: "by Mindscrollers", el: "από τη Mindscrollers", de: "von Mindscrollers",
    fr: "par Mindscrollers", it: "di Mindscrollers", es: "de Mindscrollers",
    nl: "door Mindscrollers", pl: "od Mindscrollers", pt: "da Mindscrollers",
    sv: "av Mindscrollers", sq: "nga Mindscrollers",
  },
  "header.installs": {
    en: "installs", el: "εγκαταστάσεις", de: "Installationen", fr: "installations",
    it: "installazioni", es: "instalaciones", nl: "installaties", pl: "instalacji",
    pt: "instalações", sv: "installationer", sq: "instalime",
  },
  "header.thisWeek": {
    en: "this week", el: "αυτή την εβδομάδα", de: "diese Woche", fr: "cette semaine",
    it: "questa settimana", es: "esta semana", nl: "deze week", pl: "w tym tygodniu",
    pt: "esta semana", sv: "denna vecka", sq: "këtë javë",
  },
  "header.installer": {
    en: "Installer · v1.0", el: "Εγκαταστάτης · v1.0", de: "Installer · v1.0",
    fr: "Installateur · v1.0", it: "Installer · v1.0", es: "Instalador · v1.0",
    nl: "Installatieprogramma · v1.0", pl: "Instalator · v1.0", pt: "Instalador · v1.0",
    sv: "Installerare · v1.0", sq: "Instaluesi · v1.0",
  },
  "header.installerLang": {
    en: "Installer language", el: "Γλώσσα εγκαταστάτη", de: "Sprache des Installers",
    fr: "Langue de l'installateur", it: "Lingua dell'installer", es: "Idioma del instalador",
    nl: "Taal van het installatieprogramma", pl: "Język instalatora", pt: "Idioma do instalador",
    sv: "Installerarens språk", sq: "Gjuha e instaluesit",
  },
  "header.themeToggle": {
    en: "Toggle dark or light theme", el: "Εναλλαγή σκούρου ή φωτεινού θέματος",
    de: "Helles oder dunkles Design wechseln", fr: "Basculer le thème clair ou sombre",
    it: "Cambia tema chiaro o scuro", es: "Cambiar entre tema claro y oscuro",
    nl: "Wissel donker of licht thema", pl: "Przełącz motyw jasny lub ciemny",
    pt: "Alternar tema claro ou escuro", sv: "Växla mörkt eller ljust tema",
    sq: "Ndërro temën e errët ose të çelët",
  },
  "header.firstTime": {
    en: "First-time setup", el: "Πρώτη ρύθμιση", de: "Erstmalige Einrichtung",
    fr: "Première configuration", it: "Prima configurazione", es: "Configuración inicial",
    nl: "Eerste installatie", pl: "Pierwsza konfiguracja", pt: "Configuração inicial",
    sv: "Förstagångsinställning", sq: "Konfigurimi i parë",
  },
  "header.title": {
    en: "Let's build your site.", el: "Ας φτιάξουμε τον ιστότοπό σου.",
    de: "Lass uns deine Website bauen.", fr: "Créons ton site.",
    it: "Costruiamo il tuo sito.", es: "Vamos a crear tu sitio.",
    nl: "Laten we je site bouwen.", pl: "Zbudujmy twoją stronę.",
    pt: "Vamos criar o teu site.", sv: "Nu bygger vi din webbplats.",
    sq: "Le ta ndërtojmë faqen tënde.",
  },
  "header.subtitle": {
    en: "Answer a few questions and your site is live in under two minutes.",
    el: "Απάντησε σε μερικές ερωτήσεις και ο ιστότοπός σου είναι online σε λιγότερο από δύο λεπτά.",
    de: "Beantworte ein paar Fragen und deine Website ist in unter zwei Minuten live.",
    fr: "Réponds à quelques questions et ton site est en ligne en moins de deux minutes.",
    it: "Rispondi a qualche domanda e il tuo sito sarà online in meno di due minuti.",
    es: "Responde unas preguntas y tu sitio estará en línea en menos de dos minutos.",
    nl: "Beantwoord een paar vragen en je site staat binnen twee minuten online.",
    pl: "Odpowiedz na kilka pytań, a twoja strona będzie online w niecałe dwie minuty.",
    pt: "Responde a algumas perguntas e o teu site fica online em menos de dois minutos.",
    sv: "Svara på några frågor så är din webbplats live på under två minuter.",
    sq: "Përgjigju disa pyetjeve dhe faqja jote do të jetë online për më pak se dy minuta.",
  },
  // ── Progress step labels ────────────────────────────────────────────
  "step.start": {
    en: "Start", el: "Έναρξη", de: "Start", fr: "Début", it: "Inizio", es: "Inicio",
    nl: "Start", pl: "Start", pt: "Início", sv: "Start", sq: "Fillimi",
  },
  "step.business": {
    en: "Business", el: "Επιχείρηση", de: "Unternehmen", fr: "Entreprise",
    it: "Attività", es: "Negocio", nl: "Bedrijf", pl: "Firma", pt: "Negócio",
    sv: "Företag", sq: "Biznesi",
  },
  "step.basics": {
    en: "Basics", el: "Βασικά", de: "Grundlagen", fr: "Bases", it: "Essenziali",
    es: "Básicos", nl: "Basis", pl: "Podstawy", pt: "Básicos", sv: "Grunder",
    sq: "Bazat",
  },
  "step.review": {
    en: "Review", el: "Έλεγχος", de: "Überprüfung", fr: "Vérification",
    it: "Revisione", es: "Revisión", nl: "Controle", pl: "Przegląd",
    pt: "Revisão", sv: "Granska", sq: "Rishikimi",
  },
  "step.domain": {
    en: "Domain", el: "Τομέας", de: "Domain", fr: "Domaine", it: "Dominio",
    es: "Dominio", nl: "Domein", pl: "Domena", pt: "Domínio", sv: "Domän",
    sq: "Domeni",
  },
  // ── Footer navigation ───────────────────────────────────────────────
  "nav.back": {
    en: "Back", el: "Πίσω", de: "Zurück", fr: "Retour", it: "Indietro",
    es: "Atrás", nl: "Terug", pl: "Wstecz", pt: "Voltar", sv: "Tillbaka",
    sq: "Mbrapa",
  },
  "nav.continue": {
    en: "Continue", el: "Συνέχεια", de: "Weiter", fr: "Continuer", it: "Continua",
    es: "Continuar", nl: "Doorgaan", pl: "Dalej", pt: "Continuar", sv: "Fortsätt",
    sq: "Vazhdo",
  },
  "nav.next": {
    en: "Next", el: "Επόμενο", de: "Weiter", fr: "Suivant", it: "Avanti",
    es: "Siguiente", nl: "Volgende", pl: "Następne", pt: "Seguinte", sv: "Nästa",
    sq: "Tjetra",
  },
  // ── License step ────────────────────────────────────────────────────
  "license.stepOf": {
    en: "Step 1 of {n}", el: "Βήμα 1 από {n}", de: "Schritt 1 von {n}",
    fr: "Étape 1 sur {n}", it: "Passo 1 di {n}", es: "Paso 1 de {n}",
    nl: "Stap 1 van {n}", pl: "Krok 1 z {n}", pt: "Passo 1 de {n}",
    sv: "Steg 1 av {n}", sq: "Hapi 1 nga {n}",
  },
  "license.heading": {
    en: "Enter your license key", el: "Καταχώρισε το κλειδί της άδειάς σου",
    de: "Gib deinen Lizenzschlüssel ein", fr: "Saisis ta clé de licence",
    it: "Inserisci la tua chiave di licenza", es: "Introduce tu clave de licencia",
    nl: "Voer je licentiesleutel in", pl: "Wprowadź swój klucz licencyjny",
    pt: "Introduz a tua chave de licença", sv: "Ange din licensnyckel",
    sq: "Vendos çelësin e licencës tënde",
  },
  "license.subtext": {
    en: "Find your key in the purchase email from Atelier. Format: ATL-XXXX-XXXX-XXXX-XXXX.",
    el: "Θα βρεις το κλειδί σου στο email αγοράς από την Atelier. Μορφή: ATL-XXXX-XXXX-XXXX-XXXX.",
    de: "Du findest deinen Schlüssel in der Kaufmail von Atelier. Format: ATL-XXXX-XXXX-XXXX-XXXX.",
    fr: "Ta clé se trouve dans l'email d'achat d'Atelier. Format : ATL-XXXX-XXXX-XXXX-XXXX.",
    it: "Trovi la tua chiave nell'email di acquisto di Atelier. Formato: ATL-XXXX-XXXX-XXXX-XXXX.",
    es: "Encuentra tu clave en el correo de compra de Atelier. Formato: ATL-XXXX-XXXX-XXXX-XXXX.",
    nl: "Je sleutel staat in de aankoopmail van Atelier. Formaat: ATL-XXXX-XXXX-XXXX-XXXX.",
    pl: "Klucz znajdziesz w e-mailu zakupu od Atelier. Format: ATL-XXXX-XXXX-XXXX-XXXX.",
    pt: "Encontra a tua chave no email de compra da Atelier. Formato: ATL-XXXX-XXXX-XXXX-XXXX.",
    sv: "Du hittar din nyckel i köpmejlet från Atelier. Format: ATL-XXXX-XXXX-XXXX-XXXX.",
    sq: "Çelësin e gjen në emailin e blerjes nga Atelier. Formati: ATL-XXXX-XXXX-XXXX-XXXX.",
  },
  "license.label": {
    en: "License key", el: "Κλειδί άδειας", de: "Lizenzschlüssel",
    fr: "Clé de licence", it: "Chiave di licenza", es: "Clave de licencia",
    nl: "Licentiesleutel", pl: "Klucz licencyjny", pt: "Chave de licença",
    sv: "Licensnyckel", sq: "Çelësi i licencës",
  },
  "license.checking": {
    en: "Checking…", el: "Έλεγχος…", de: "Wird geprüft…", fr: "Vérification…",
    it: "Verifica…", es: "Comprobando…", nl: "Bezig met controleren…",
    pl: "Sprawdzanie…", pt: "A verificar…", sv: "Kontrollerar…", sq: "Po kontrollohet…",
  },
  "license.verified": {
    en: "Verified", el: "Επαληθεύτηκε", de: "Bestätigt", fr: "Vérifiée",
    it: "Verificata", es: "Verificada", nl: "Geverifieerd", pl: "Zweryfikowano",
    pt: "Verificada", sv: "Verifierad", sq: "U verifikua",
  },
  "license.verify": {
    en: "Verify", el: "Επαλήθευση", de: "Prüfen", fr: "Vérifier", it: "Verifica",
    es: "Verificar", nl: "Verifiëren", pl: "Zweryfikuj", pt: "Verificar",
    sv: "Verifiera", sq: "Verifiko",
  },
  "license.okPrefix": {
    en: "License verified.", el: "Η άδεια επαληθεύτηκε.", de: "Lizenz bestätigt.",
    fr: "Licence vérifiée.", it: "Licenza verificata.", es: "Licencia verificada.",
    nl: "Licentie geverifieerd.", pl: "Licencja zweryfikowana.", pt: "Licença verificada.",
    sv: "Licensen är verifierad.", sq: "Licenca u verifikua.",
  },
  "license.welcomeName": {
    en: "Welcome, {name}.", el: "Καλώς ήρθες, {name}.", de: "Willkommen, {name}.",
    fr: "Bienvenue, {name}.", it: "Benvenuto, {name}.", es: "Bienvenido, {name}.",
    nl: "Welkom, {name}.", pl: "Witaj, {name}.", pt: "Bem-vindo, {name}.",
    sv: "Välkommen, {name}.", sq: "Mirë se erdhe, {name}.",
  },
  "license.welcome": {
    en: "Welcome.", el: "Καλώς ήρθες.", de: "Willkommen.", fr: "Bienvenue.",
    it: "Benvenuto.", es: "Bienvenido.", nl: "Welkom.", pl: "Witaj.",
    pt: "Bem-vindo.", sv: "Välkommen.", sq: "Mirë se erdhe.",
  },
  "license.planManaged": {
    en: "Managed plan.", el: "Πλάνο με διαχείριση.", de: "Verwalteter Plan.",
    fr: "Forfait géré.", it: "Piano gestito.", es: "Plan gestionado.",
    nl: "Beheerd abonnement.", pl: "Plan zarządzany.", pt: "Plano gerido.",
    sv: "Hanterad plan.", sq: "Plan i menaxhuar.",
  },
  "license.planSelf": {
    en: "Self-hosted plan.", el: "Πλάνο αυτοφιλοξενίας.", de: "Selbst gehosteter Plan.",
    fr: "Forfait auto-hébergé.", it: "Piano self-hosted.", es: "Plan autoalojado.",
    nl: "Zelf-gehost abonnement.", pl: "Plan samodzielnego hostingu.",
    pt: "Plano auto-hospedado.", sv: "Självhostad plan.", sq: "Plan i vetëpritur.",
  },
  "license.continueHint": {
    en: "Click Continue to pick a template.",
    el: "Κάνε κλικ στο Συνέχεια για να διαλέξεις πρότυπο.",
    de: "Klick auf Weiter, um eine Vorlage zu wählen.",
    fr: "Clique sur Continuer pour choisir un modèle.",
    it: "Clicca su Continua per scegliere un modello.",
    es: "Haz clic en Continuar para elegir una plantilla.",
    nl: "Klik op Doorgaan om een sjabloon te kiezen.",
    pl: "Kliknij Dalej, aby wybrać szablon.",
    pt: "Clica em Continuar para escolher um modelo.",
    sv: "Klicka på Fortsätt för att välja en mall.",
    sq: "Kliko Vazhdo për të zgjedhur një shabllon.",
  },
  "license.noKey": {
    en: "Don't have a key yet?", el: "Δεν έχεις ακόμη κλειδί;",
    de: "Noch keinen Schlüssel?", fr: "Pas encore de clé ?",
    it: "Non hai ancora una chiave?", es: "¿Aún no tienes una clave?",
    nl: "Nog geen sleutel?", pl: "Nie masz jeszcze klucza?",
    pt: "Ainda não tens uma chave?", sv: "Har du ingen nyckel än?",
    sq: "Nuk ke ende një çelës?",
  },
  "license.getKey": {
    en: "Get one at atelier.mindscrollers.com/pricing",
    el: "Απόκτησέ ένα στο atelier.mindscrollers.com/pricing",
    de: "Hol dir einen unter atelier.mindscrollers.com/pricing",
    fr: "Procure-toi-en une sur atelier.mindscrollers.com/pricing",
    it: "Ottienine una su atelier.mindscrollers.com/pricing",
    es: "Consigue una en atelier.mindscrollers.com/pricing",
    nl: "Haal er een op atelier.mindscrollers.com/pricing",
    pl: "Zdobądź go na atelier.mindscrollers.com/pricing",
    pt: "Obtém uma em atelier.mindscrollers.com/pricing",
    sv: "Skaffa en på atelier.mindscrollers.com/pricing",
    sq: "Merr një në atelier.mindscrollers.com/pricing",
  },
  "license.errFormat": {
    en: "Format should be ATL-XXXX-XXXX-XXXX-XXXX.",
    el: "Η μορφή πρέπει να είναι ATL-XXXX-XXXX-XXXX-XXXX.",
    de: "Das Format sollte ATL-XXXX-XXXX-XXXX-XXXX sein.",
    fr: "Le format doit être ATL-XXXX-XXXX-XXXX-XXXX.",
    it: "Il formato deve essere ATL-XXXX-XXXX-XXXX-XXXX.",
    es: "El formato debe ser ATL-XXXX-XXXX-XXXX-XXXX.",
    nl: "Het formaat moet ATL-XXXX-XXXX-XXXX-XXXX zijn.",
    pl: "Format powinien być ATL-XXXX-XXXX-XXXX-XXXX.",
    pt: "O formato deve ser ATL-XXXX-XXXX-XXXX-XXXX.",
    sv: "Formatet ska vara ATL-XXXX-XXXX-XXXX-XXXX.",
    sq: "Formati duhet të jetë ATL-XXXX-XXXX-XXXX-XXXX.",
  },
  "license.errBound": {
    en: "This license is already installed on {domain}. Each license works on one domain. Contact support to move it.",
    el: "Αυτή η άδεια είναι ήδη εγκατεστημένη στο {domain}. Κάθε άδεια λειτουργεί σε έναν τομέα. Επικοινώνησε με την υποστήριξη για μεταφορά.",
    de: "Diese Lizenz ist bereits auf {domain} installiert. Jede Lizenz gilt für eine Domain. Wende dich an den Support, um sie zu verschieben.",
    fr: "Cette licence est déjà installée sur {domain}. Chaque licence fonctionne sur un seul domaine. Contacte le support pour la déplacer.",
    it: "Questa licenza è già installata su {domain}. Ogni licenza vale per un dominio. Contatta il supporto per spostarla.",
    es: "Esta licencia ya está instalada en {domain}. Cada licencia funciona en un dominio. Contacta con soporte para moverla.",
    nl: "Deze licentie is al geïnstalleerd op {domain}. Elke licentie werkt op één domein. Neem contact op met support om hem te verplaatsen.",
    pl: "Ta licencja jest już zainstalowana na {domain}. Każda licencja działa na jednej domenie. Skontaktuj się z pomocą techniczną, aby ją przenieść.",
    pt: "Esta licença já está instalada em {domain}. Cada licença funciona num domínio. Contacta o suporte para a mover.",
    sv: "Den här licensen är redan installerad på {domain}. Varje licens gäller för en domän. Kontakta supporten för att flytta den.",
    sq: "Kjo licencë është tashmë e instaluar në {domain}. Çdo licencë funksionon në një domen. Kontakto mbështetjen për ta zhvendosur.",
  },
  "license.boundFallback": {
    en: "another domain", el: "άλλον τομέα", de: "einer anderen Domain",
    fr: "un autre domaine", it: "un altro dominio", es: "otro dominio",
    nl: "een ander domein", pl: "innej domenie", pt: "outro domínio",
    sv: "en annan domän", sq: "një domen tjetër",
  },
  "license.errRevoked": {
    en: "This license has been revoked. Contact support.",
    el: "Αυτή η άδεια έχει ανακληθεί. Επικοινώνησε με την υποστήριξη.",
    de: "Diese Lizenz wurde widerrufen. Wende dich an den Support.",
    fr: "Cette licence a été révoquée. Contacte le support.",
    it: "Questa licenza è stata revocata. Contatta il supporto.",
    es: "Esta licencia ha sido revocada. Contacta con soporte.",
    nl: "Deze licentie is ingetrokken. Neem contact op met support.",
    pl: "Ta licencja została unieważniona. Skontaktuj się z pomocą techniczną.",
    pt: "Esta licença foi revogada. Contacta o suporte.",
    sv: "Den här licensen har återkallats. Kontakta supporten.",
    sq: "Kjo licencë është revokuar. Kontakto mbështetjen.",
  },
  "license.errNotFound": {
    en: "We can't find that license. Check the key from your purchase email.",
    el: "Δεν βρίσκουμε αυτή την άδεια. Έλεγξε το κλειδί από το email αγοράς σου.",
    de: "Wir finden diese Lizenz nicht. Prüfe den Schlüssel aus deiner Kaufmail.",
    fr: "Nous ne trouvons pas cette licence. Vérifie la clé de ton email d'achat.",
    it: "Non troviamo questa licenza. Controlla la chiave nell'email di acquisto.",
    es: "No encontramos esa licencia. Revisa la clave de tu correo de compra.",
    nl: "We kunnen die licentie niet vinden. Controleer de sleutel uit je aankoopmail.",
    pl: "Nie możemy znaleźć tej licencji. Sprawdź klucz z e-maila zakupu.",
    pt: "Não encontramos essa licença. Verifica a chave do teu email de compra.",
    sv: "Vi hittar inte den licensen. Kontrollera nyckeln i ditt köpmejl.",
    sq: "Nuk e gjejmë atë licencë. Kontrollo çelësin nga emaili i blerjes.",
  },
  "license.errBadKey": {
    en: "That key doesn't look right. Double-check it and try again.",
    el: "Αυτό το κλειδί δεν φαίνεται σωστό. Έλεγξέ το ξανά και προσπάθησε πάλι.",
    de: "Dieser Schlüssel sieht nicht richtig aus. Prüf ihn und versuch es erneut.",
    fr: "Cette clé semble incorrecte. Vérifie-la et réessaie.",
    it: "Questa chiave non sembra corretta. Ricontrollala e riprova.",
    es: "Esa clave no parece correcta. Compruébala e inténtalo de nuevo.",
    nl: "Die sleutel klopt niet. Controleer hem en probeer opnieuw.",
    pl: "Ten klucz wygląda niepoprawnie. Sprawdź go i spróbuj ponownie.",
    pt: "Essa chave não parece certa. Verifica-a e tenta de novo.",
    sv: "Den nyckeln ser inte rätt ut. Dubbelkolla den och försök igen.",
    sq: "Ai çelës nuk duket i saktë. Kontrollo përsëri dhe provo sërish.",
  },
  "license.errNetwork": {
    en: "Couldn't reach the license server. Check your internet connection.",
    el: "Δεν ήταν δυνατή η σύνδεση με τον διακομιστή αδειών. Έλεγξε τη σύνδεσή σου.",
    de: "Der Lizenzserver war nicht erreichbar. Prüfe deine Internetverbindung.",
    fr: "Impossible de joindre le serveur de licences. Vérifie ta connexion internet.",
    it: "Impossibile raggiungere il server delle licenze. Controlla la connessione internet.",
    es: "No se pudo contactar con el servidor de licencias. Revisa tu conexión a internet.",
    nl: "Kon de licentieserver niet bereiken. Controleer je internetverbinding.",
    pl: "Nie udało się połączyć z serwerem licencji. Sprawdź połączenie internetowe.",
    pt: "Não foi possível contactar o servidor de licenças. Verifica a tua ligação à internet.",
    sv: "Kunde inte nå licensservern. Kontrollera din internetanslutning.",
    sq: "Nuk u arrit serveri i licencave. Kontrollo lidhjen tënde me internetin.",
  },
  // ── Fresh-start note ────────────────────────────────────────────────
  "fresh.eyebrow": {
    en: "Starting point", el: "Σημείο εκκίνησης", de: "Ausgangspunkt",
    fr: "Point de départ", it: "Punto di partenza", es: "Punto de partida",
    nl: "Startpunt", pl: "Punkt startowy", pt: "Ponto de partida",
    sv: "Utgångspunkt", sq: "Pika e nisjes",
  },
  "fresh.tenantTitle": {
    en: "Your site is ready to edit", el: "Ο ιστότοπός σου είναι έτοιμος για επεξεργασία",
    de: "Deine Website ist bereit zum Bearbeiten", fr: "Ton site est prêt à être modifié",
    it: "Il tuo sito è pronto per la modifica", es: "Tu sitio está listo para editar",
    nl: "Je site is klaar om te bewerken", pl: "Twoja strona jest gotowa do edycji",
    pt: "O teu site está pronto para editar", sv: "Din webbplats är redo att redigeras",
    sq: "Faqja jote është gati për t'u redaktuar",
  },
  "fresh.tenantBody1": {
    en: "Your site comes set up with a complete example salon: services, team, shop, gallery and posts. The moment this wizard finishes it is live. Replace the example with your own from the admin dashboard.",
    el: "Ο ιστότοπός σου έρχεται έτοιμος με ένα πλήρες παράδειγμα σαλονιού: υπηρεσίες, ομάδα, κατάστημα, γκαλερί και αναρτήσεις. Μόλις τελειώσει ο οδηγός, είναι online. Αντικατέστησε το παράδειγμα με το δικό σου από τον πίνακα διαχείρισης.",
    de: "Deine Website kommt mit einem kompletten Beispielsalon: Leistungen, Team, Shop, Galerie und Beiträge. Sobald dieser Assistent fertig ist, ist sie live. Ersetz das Beispiel im Admin-Dashboard durch deine eigenen Inhalte.",
    fr: "Ton site est livré avec un salon d'exemple complet : services, équipe, boutique, galerie et articles. Dès que cet assistant se termine, il est en ligne. Remplace l'exemple par le tien depuis le tableau de bord admin.",
    it: "Il tuo sito arriva configurato con un salone di esempio completo: servizi, team, negozio, galleria e articoli. Appena finisce questa procedura è online. Sostituisci l'esempio con il tuo dalla dashboard admin.",
    es: "Tu sitio viene configurado con un salón de ejemplo completo: servicios, equipo, tienda, galería y publicaciones. En cuanto termina este asistente está en línea. Sustituye el ejemplo por el tuyo desde el panel de administración.",
    nl: "Je site komt ingericht met een compleet voorbeeldsalon: diensten, team, shop, galerij en berichten. Zodra deze wizard klaar is, staat hij live. Vervang het voorbeeld door je eigen via het beheerdashboard.",
    pl: "Twoja strona jest gotowa z kompletnym przykładowym salonem: usługi, zespół, sklep, galeria i wpisy. Gdy ten kreator zakończy działanie, strona jest online. Zastąp przykład własną treścią w panelu administracyjnym.",
    pt: "O teu site vem configurado com um salão de exemplo completo: serviços, equipa, loja, galeria e publicações. Assim que este assistente termina, fica online. Substitui o exemplo pelo teu no painel de administração.",
    sv: "Din webbplats levereras med en komplett exempelsalong: tjänster, team, butik, galleri och inlägg. Så snart guiden är klar är den live. Ersätt exemplet med ditt eget från adminpanelen.",
    sq: "Faqja jote vjen e konfiguruar me një salon shembull të plotë: shërbime, ekip, dyqan, galeri dhe postime. Sapo të mbarojë ky udhëzues, ajo është online. Zëvendëso shembullin me tëndin nga paneli i administrimit.",
  },
  "fresh.tenantBody2": {
    en: "Prefer a blank slate? Open Tools in the admin and use Reset site to clear everything back to an empty site.",
    el: "Προτιμάς λευκή σελίδα; Άνοιξε τα Εργαλεία στη διαχείριση και χρησιμοποίησε την Επαναφορά ιστότοπου για να καθαρίσεις τα πάντα σε κενό ιστότοπο.",
    de: "Lieber ein leeres Blatt? Öffne im Admin die Tools und nutze Website zurücksetzen, um alles auf eine leere Website zu setzen.",
    fr: "Tu préfères repartir de zéro ? Ouvre Outils dans l'admin et utilise Réinitialiser le site pour tout remettre à un site vide.",
    it: "Preferisci partire da zero? Apri Strumenti nell'admin e usa Reimposta sito per riportare tutto a un sito vuoto.",
    es: "¿Prefieres empezar de cero? Abre Herramientas en el admin y usa Restablecer sitio para dejar todo como un sitio vacío.",
    nl: "Liever een schone lei? Open Hulpmiddelen in de admin en gebruik Site resetten om alles terug te zetten naar een lege site.",
    pl: "Wolisz zacząć od zera? Otwórz Narzędzia w panelu i użyj Resetuj witrynę, aby przywrócić wszystko do pustej strony.",
    pt: "Preferes uma folha em branco? Abre Ferramentas no admin e usa Repor site para limpar tudo para um site vazio.",
    sv: "Föredrar du ett tomt blad? Öppna Verktyg i adminpanelen och använd Återställ webbplats för att rensa allt till en tom webbplats.",
    sq: "Preferon një fillim nga e para? Hap Veglat në admin dhe përdor Rivendos faqen për ta kthyer gjithçka në një faqe bosh.",
  },
  "fresh.title": {
    en: "Your site starts fresh", el: "Ο ιστότοπός σου ξεκινά από την αρχή",
    de: "Deine Website startet leer", fr: "Ton site démarre vierge",
    it: "Il tuo sito parte da zero", es: "Tu sitio empieza desde cero",
    nl: "Je site begint blanco", pl: "Twoja strona zaczyna od zera",
    pt: "O teu site começa do zero", sv: "Din webbplats börjar tom",
    sq: "Faqja jote nis nga e para",
  },
  "fresh.body1": {
    en: "You begin with a clean, empty site. No sample services, staff or posts to delete. The moment this wizard finishes, your site is live and ready. Add your own services, staff, products and posts anytime from the admin dashboard.",
    el: "Ξεκινάς με έναν καθαρό, άδειο ιστότοπο. Καμία δειγματική υπηρεσία, προσωπικό ή ανάρτηση προς διαγραφή. Μόλις τελειώσει ο οδηγός, ο ιστότοπός σου είναι online και έτοιμος. Πρόσθεσε τις δικές σου υπηρεσίες, προσωπικό, προϊόντα και αναρτήσεις όποτε θέλεις από τον πίνακα διαχείρισης.",
    de: "Du beginnst mit einer sauberen, leeren Website. Keine Beispielleistungen, kein Personal und keine Beiträge zum Löschen. Sobald dieser Assistent fertig ist, ist deine Website live und bereit. Füge deine eigenen Leistungen, dein Personal, Produkte und Beiträge jederzeit im Admin-Dashboard hinzu.",
    fr: "Tu commences avec un site propre et vide. Aucun service, membre d'équipe ou article d'exemple à supprimer. Dès que cet assistant se termine, ton site est en ligne et prêt. Ajoute tes propres services, ton équipe, tes produits et tes articles à tout moment depuis le tableau de bord admin.",
    it: "Parti con un sito pulito e vuoto. Nessun servizio, membro del team o articolo di esempio da eliminare. Appena finisce questa procedura, il tuo sito è online e pronto. Aggiungi i tuoi servizi, il team, i prodotti e gli articoli quando vuoi dalla dashboard admin.",
    es: "Empiezas con un sitio limpio y vacío. Sin servicios, personal ni publicaciones de muestra que borrar. En cuanto termina este asistente, tu sitio está en línea y listo. Añade tus servicios, personal, productos y publicaciones cuando quieras desde el panel de administración.",
    nl: "Je begint met een schone, lege site. Geen voorbeelddiensten, personeel of berichten om te verwijderen. Zodra deze wizard klaar is, staat je site live en klaar. Voeg je eigen diensten, personeel, producten en berichten op elk moment toe via het beheerdashboard.",
    pl: "Zaczynasz z czystą, pustą stroną. Brak przykładowych usług, pracowników czy wpisów do usunięcia. Gdy ten kreator zakończy działanie, twoja strona jest online i gotowa. Dodawaj własne usługi, pracowników, produkty i wpisy w dowolnej chwili z panelu administracyjnego.",
    pt: "Começas com um site limpo e vazio. Sem serviços, equipa ou publicações de exemplo para apagar. Assim que este assistente termina, o teu site fica online e pronto. Adiciona os teus serviços, equipa, produtos e publicações quando quiseres no painel de administração.",
    sv: "Du börjar med en ren, tom webbplats. Inga exempeltjänster, personal eller inlägg att radera. Så snart guiden är klar är din webbplats live och redo. Lägg till dina egna tjänster, din personal, produkter och inlägg när som helst från adminpanelen.",
    sq: "Fillon me një faqe të pastër dhe bosh. Pa shërbime, staf apo postime shembull për t'u fshirë. Sapo të mbarojë ky udhëzues, faqja jote është online dhe gati. Shto shërbimet, stafin, produktet dhe postimet e tua kurdo nga paneli i administrimit.",
  },
  "fresh.body2": {
    en: "Want a fully populated site to explore first? After setup, open Tools in the admin and use Import demo content. A Reset button there clears it back to a fresh site whenever you want.",
    el: "Θέλεις πρώτα έναν πλήρως γεμάτο ιστότοπο για εξερεύνηση; Μετά τη ρύθμιση, άνοιξε τα Εργαλεία στη διαχείριση και χρησιμοποίησε την Εισαγωγή δοκιμαστικού περιεχομένου. Ένα κουμπί Επαναφοράς εκεί τον καθαρίζει σε φρέσκο ιστότοπο όποτε θέλεις.",
    de: "Möchtest du zuerst eine voll gefüllte Website erkunden? Öffne nach der Einrichtung im Admin die Tools und nutze Demo-Inhalte importieren. Ein Zurücksetzen-Button dort leert sie jederzeit wieder zu einer frischen Website.",
    fr: "Tu veux d'abord explorer un site entièrement rempli ? Après la configuration, ouvre Outils dans l'admin et utilise Importer le contenu de démo. Un bouton Réinitialiser y remet le site à neuf quand tu veux.",
    it: "Vuoi prima esplorare un sito completamente popolato? Dopo la configurazione, apri Strumenti nell'admin e usa Importa contenuti demo. Un pulsante Reimposta lo riporta a un sito pulito quando vuoi.",
    es: "¿Quieres explorar primero un sitio totalmente poblado? Tras la configuración, abre Herramientas en el admin y usa Importar contenido de demostración. Un botón Restablecer lo deja como un sitio nuevo cuando quieras.",
    nl: "Wil je eerst een volledig gevulde site verkennen? Open na de installatie Hulpmiddelen in de admin en gebruik Demo-inhoud importeren. Een Reset-knop daar zet hem wanneer je wilt terug naar een verse site.",
    pl: "Chcesz najpierw przejrzeć w pełni wypełnioną stronę? Po konfiguracji otwórz Narzędzia w panelu i użyj Importuj treść demonstracyjną. Przycisk Resetuj w tym miejscu przywróci stronę do stanu pustego, kiedy zechcesz.",
    pt: "Queres explorar primeiro um site totalmente preenchido? Após a configuração, abre Ferramentas no admin e usa Importar conteúdo de demonstração. Um botão Repor limpa-o de volta a um site novo quando quiseres.",
    sv: "Vill du först utforska en helt fylld webbplats? Öppna efter installationen Verktyg i adminpanelen och använd Importera demoinnehåll. En Återställ-knapp där rensar den till en ny webbplats när du vill.",
    sq: "Do të eksplorosh së pari një faqe plotësisht të mbushur? Pas konfigurimit, hap Veglat në admin dhe përdor Importo përmbajtjen demo. Një buton Rivendos atje e pastron sërish në një faqe të re kurdo që dëshiron.",
  },
  "start.tip": {
    en: "Tip: press {enter} to advance, {shiftEnter} to go back.",
    el: "Συμβουλή: πάτα {enter} για να προχωρήσεις, {shiftEnter} για να γυρίσεις πίσω.",
    de: "Tipp: drücke {enter} zum Weitergehen, {shiftEnter} zum Zurückgehen.",
    fr: "Astuce : appuie sur {enter} pour avancer, {shiftEnter} pour revenir.",
    it: "Suggerimento: premi {enter} per avanzare, {shiftEnter} per tornare indietro.",
    es: "Consejo: pulsa {enter} para avanzar, {shiftEnter} para volver.",
    nl: "Tip: druk op {enter} om verder te gaan, {shiftEnter} om terug te gaan.",
    pl: "Wskazówka: naciśnij {enter}, aby przejść dalej, {shiftEnter}, aby cofnąć.",
    pt: "Dica: prime {enter} para avançar, {shiftEnter} para voltar.",
    sv: "Tips: tryck på {enter} för att gå vidare, {shiftEnter} för att gå tillbaka.",
    sq: "Këshillë: shtyp {enter} për të vazhduar, {shiftEnter} për t'u kthyer.",
  },
  // ── Admin account step ──────────────────────────────────────────────
  "admin.eyebrow": {
    en: "Admin account", el: "Λογαριασμός διαχειριστή", de: "Admin-Konto",
    fr: "Compte administrateur", it: "Account amministratore", es: "Cuenta de administrador",
    nl: "Beheerdersaccount", pl: "Konto administratora", pt: "Conta de administrador",
    sv: "Administratörskonto", sq: "Llogaria e administratorit",
  },
  "admin.heading": {
    en: "Your sign-in details", el: "Τα στοιχεία σύνδεσής σου",
    de: "Deine Anmeldedaten", fr: "Tes identifiants de connexion",
    it: "I tuoi dati di accesso", es: "Tus datos de acceso",
    nl: "Je inloggegevens", pl: "Twoje dane logowania",
    pt: "Os teus dados de acesso", sv: "Dina inloggningsuppgifter",
    sq: "Të dhënat e tua të hyrjes",
  },
  "admin.subtext": {
    en: "You'll use this to sign in at {admin} and manage everything.",
    el: "Θα τα χρησιμοποιείς για να συνδέεσαι στο {admin} και να διαχειρίζεσαι τα πάντα.",
    de: "Damit meldest du dich unter {admin} an und verwaltest alles.",
    fr: "Tu les utiliseras pour te connecter sur {admin} et tout gérer.",
    it: "Li userai per accedere su {admin} e gestire tutto.",
    es: "Los usarás para iniciar sesión en {admin} y gestionarlo todo.",
    nl: "Hiermee log je in op {admin} en beheer je alles.",
    pl: "Użyjesz ich do logowania w {admin} i zarządzania wszystkim.",
    pt: "Vais usá-los para iniciar sessão em {admin} e gerir tudo.",
    sv: "Du använder dem för att logga in på {admin} och hantera allt.",
    sq: "Do t'i përdorësh për të hyrë në {admin} dhe për të menaxhuar gjithçka.",
  },
  "admin.email": {
    en: "Email *", el: "Email *", de: "E-Mail *", fr: "E-mail *", it: "Email *",
    es: "Correo *", nl: "E-mail *", pl: "E-mail *", pt: "E-mail *", sv: "E-post *",
    sq: "Email *",
  },
  "admin.emailPlaceholder": {
    en: "you@yourdomain.com", el: "esy@todomainsou.com", de: "du@deinedomain.com",
    fr: "toi@tondomaine.com", it: "tu@tuodominio.com", es: "tu@tudominio.com",
    nl: "jij@jouwdomein.com", pl: "ty@twojadomena.com", pt: "tu@teudominio.com",
    sv: "du@dindoman.com", sq: "ti@domeniyt.com",
  },
  "admin.generate": {
    en: "Generate strong password", el: "Δημιουργία ισχυρού κωδικού",
    de: "Starkes Passwort generieren", fr: "Générer un mot de passe fort",
    it: "Genera password sicura", es: "Generar contraseña segura",
    nl: "Sterk wachtwoord genereren", pl: "Wygeneruj silne hasło",
    pt: "Gerar palavra-passe forte", sv: "Generera starkt lösenord",
    sq: "Gjenero fjalëkalim të fortë",
  },
  "admin.password": {
    en: "Password *", el: "Κωδικός *", de: "Passwort *", fr: "Mot de passe *",
    it: "Password *", es: "Contraseña *", nl: "Wachtwoord *", pl: "Hasło *",
    pt: "Palavra-passe *", sv: "Lösenord *", sq: "Fjalëkalimi *",
  },
  "admin.passwordPlaceholder": {
    en: "8+ characters", el: "8+ χαρακτήρες", de: "8+ Zeichen", fr: "8+ caractères",
    it: "8+ caratteri", es: "8+ caracteres", nl: "8+ tekens", pl: "8+ znaków",
    pt: "8+ caracteres", sv: "8+ tecken", sq: "8+ karaktere",
  },
  "admin.confirm": {
    en: "Confirm password *", el: "Επιβεβαίωση κωδικού *", de: "Passwort bestätigen *",
    fr: "Confirme le mot de passe *", it: "Conferma password *", es: "Confirmar contraseña *",
    nl: "Bevestig wachtwoord *", pl: "Potwierdź hasło *", pt: "Confirmar palavra-passe *",
    sv: "Bekräfta lösenord *", sq: "Konfirmo fjalëkalimin *",
  },
  "admin.confirmPlaceholder": {
    en: "Repeat password", el: "Επανάλαβε τον κωδικό", de: "Passwort wiederholen",
    fr: "Répète le mot de passe", it: "Ripeti la password", es: "Repite la contraseña",
    nl: "Herhaal wachtwoord", pl: "Powtórz hasło", pt: "Repete a palavra-passe",
    sv: "Upprepa lösenordet", sq: "Përsërit fjalëkalimin",
  },
  "admin.show": {
    en: "Show", el: "Εμφάνιση", de: "Anzeigen", fr: "Afficher", it: "Mostra",
    es: "Mostrar", nl: "Tonen", pl: "Pokaż", pt: "Mostrar", sv: "Visa", sq: "Shfaq",
  },
  "admin.hide": {
    en: "Hide", el: "Απόκρυψη", de: "Verbergen", fr: "Masquer", it: "Nascondi",
    es: "Ocultar", nl: "Verbergen", pl: "Ukryj", pt: "Ocultar", sv: "Dölj", sq: "Fshih",
  },
  "admin.copy": {
    en: "Copy", el: "Αντιγραφή", de: "Kopieren", fr: "Copier", it: "Copia",
    es: "Copiar", nl: "Kopiëren", pl: "Kopiuj", pt: "Copiar", sv: "Kopiera", sq: "Kopjo",
  },
  "admin.copied": {
    en: "Copied", el: "Αντιγράφηκε", de: "Kopiert", fr: "Copié", it: "Copiato",
    es: "Copiado", nl: "Gekopieerd", pl: "Skopiowano", pt: "Copiado", sv: "Kopierat",
    sq: "U kopjua",
  },
  "admin.check8": {
    en: "At least 8 characters", el: "Τουλάχιστον 8 χαρακτήρες", de: "Mindestens 8 Zeichen",
    fr: "Au moins 8 caractères", it: "Almeno 8 caratteri", es: "Al menos 8 caracteres",
    nl: "Minstens 8 tekens", pl: "Co najmniej 8 znaków", pt: "Pelo menos 8 caracteres",
    sv: "Minst 8 tecken", sq: "Të paktën 8 karaktere",
  },
  "admin.checkMatch": {
    en: "Passwords match", el: "Οι κωδικοί ταιριάζουν", de: "Passwörter stimmen überein",
    fr: "Les mots de passe correspondent", it: "Le password coincidono",
    es: "Las contraseñas coinciden", nl: "Wachtwoorden komen overeen",
    pl: "Hasła są zgodne", pt: "As palavras-passe coincidem",
    sv: "Lösenorden matchar", sq: "Fjalëkalimet përputhen",
  },
  // ── Language step ───────────────────────────────────────────────────
  "lang.eyebrow": {
    en: "Languages", el: "Γλώσσες", de: "Sprachen", fr: "Langues", it: "Lingue",
    es: "Idiomas", nl: "Talen", pl: "Języki", pt: "Idiomas", sv: "Språk", sq: "Gjuhët",
  },
  "lang.heading": WIZARD_LANG_HEADING as Record<Lang, string>,
  "lang.subtext": WIZARD_LANG_SUBTEXT as Record<Lang, string>,
  "lang.always": WIZARD_LANG_ALWAYS as Record<Lang, string>,
  // ── Domain step ─────────────────────────────────────────────────────
  "domain.eyebrow": {
    en: "Your address", el: "Η διεύθυνσή σου", de: "Deine Adresse",
    fr: "Ton adresse", it: "Il tuo indirizzo", es: "Tu dirección",
    nl: "Je adres", pl: "Twój adres", pt: "O teu endereço", sv: "Din adress",
    sq: "Adresa jote",
  },
  "domain.heading": {
    en: "Where your site lives.", el: "Πού ζει ο ιστότοπός σου.",
    de: "Wo deine Website lebt.", fr: "Où vit ton site.",
    it: "Dove vive il tuo sito.", es: "Dónde vive tu sitio.",
    nl: "Waar je site woont.", pl: "Gdzie mieszka twoja strona.",
    pt: "Onde vive o teu site.", sv: "Var din webbplats bor.",
    sq: "Ku jeton faqja jote.",
  },
  "domain.paymentReceived": {
    en: "Payment received", el: "Η πληρωμή ελήφθη", de: "Zahlung erhalten",
    fr: "Paiement reçu", it: "Pagamento ricevuto", es: "Pago recibido",
    nl: "Betaling ontvangen", pl: "Płatność otrzymana", pt: "Pagamento recebido",
    sv: "Betalning mottagen", sq: "Pagesa u mor",
  },
  "domain.boughtTitle": {
    en: "{domain} is yours.", el: "Το {domain} είναι δικό σου.",
    de: "{domain} gehört dir.", fr: "{domain} est à toi.",
    it: "{domain} è tuo.", es: "{domain} es tuyo.",
    nl: "{domain} is van jou.", pl: "{domain} należy do ciebie.",
    pt: "{domain} é teu.", sv: "{domain} är ditt.", sq: "{domain} është i yti.",
  },
  "domain.boughtBody": {
    en: "We are registering it and connecting it to your site now. It goes live within a few hours. Your site stays available at the address below in the meantime. You can carry on with setup.",
    el: "Το καταχωρίζουμε και το συνδέουμε με τον ιστότοπό σου τώρα. Θα είναι online μέσα σε λίγες ώρες. Στο μεταξύ ο ιστότοπός σου παραμένει διαθέσιμος στη διεύθυνση παρακάτω. Μπορείς να συνεχίσεις τη ρύθμιση.",
    de: "Wir registrieren sie und verbinden sie jetzt mit deiner Website. Sie ist innerhalb weniger Stunden live. In der Zwischenzeit bleibt deine Website unter der Adresse unten erreichbar. Du kannst mit der Einrichtung fortfahren.",
    fr: "Nous l'enregistrons et la connectons à ton site maintenant. Il sera en ligne d'ici quelques heures. Entre-temps, ton site reste accessible à l'adresse ci-dessous. Tu peux poursuivre la configuration.",
    it: "Lo stiamo registrando e collegando al tuo sito ora. Sarà online entro poche ore. Nel frattempo il tuo sito resta disponibile all'indirizzo qui sotto. Puoi proseguire con la configurazione.",
    es: "Lo estamos registrando y conectando con tu sitio ahora. Estará en línea en pocas horas. Mientras tanto, tu sitio sigue disponible en la dirección de abajo. Puedes continuar con la configuración.",
    nl: "We registreren het en verbinden het nu met je site. Het staat binnen enkele uren live. Ondertussen blijft je site bereikbaar op het onderstaande adres. Je kunt verdergaan met de installatie.",
    pl: "Rejestrujemy ją i łączymy z twoją stroną teraz. Będzie online w ciągu kilku godzin. W międzyczasie twoja strona pozostaje dostępna pod adresem poniżej. Możesz kontynuować konfigurację.",
    pt: "Estamos a registá-lo e a ligá-lo ao teu site agora. Fica online dentro de algumas horas. Entretanto, o teu site continua disponível no endereço abaixo. Podes continuar com a configuração.",
    sv: "Vi registrerar den och kopplar den till din webbplats nu. Den blir live inom några timmar. Under tiden är din webbplats tillgänglig på adressen nedan. Du kan fortsätta med installationen.",
    sq: "Po e regjistrojmë dhe po e lidhim me faqen tënde tani. Do të jetë online brenda pak orësh. Ndërkohë faqja jote mbetet e disponueshme në adresën më poshtë. Mund të vazhdosh me konfigurimin.",
  },
  "domain.freeEyebrow": {
    en: "Free address, live now", el: "Δωρεάν διεύθυνση, ενεργή τώρα",
    de: "Kostenlose Adresse, sofort live", fr: "Adresse gratuite, en ligne maintenant",
    it: "Indirizzo gratuito, online subito", es: "Dirección gratuita, activa ya",
    nl: "Gratis adres, nu live", pl: "Darmowy adres, działa od razu",
    pt: "Endereço gratuito, online já", sv: "Gratis adress, live nu",
    sq: "Adresë falas, aktive tani",
  },
  "domain.freeBody": {
    en: "Every site gets this address. It works the moment you finish setup, no configuration needed.",
    el: "Κάθε ιστότοπος παίρνει αυτή τη διεύθυνση. Λειτουργεί μόλις ολοκληρώσεις τη ρύθμιση, χωρίς καμία διαμόρφωση.",
    de: "Jede Website erhält diese Adresse. Sie funktioniert, sobald du die Einrichtung abschließt, ganz ohne Konfiguration.",
    fr: "Chaque site obtient cette adresse. Elle fonctionne dès que tu termines la configuration, sans réglage.",
    it: "Ogni sito riceve questo indirizzo. Funziona appena finisci la configurazione, senza alcuna impostazione.",
    es: "Cada sitio recibe esta dirección. Funciona en cuanto terminas la configuración, sin ajustes.",
    nl: "Elke site krijgt dit adres. Het werkt zodra je de installatie afrondt, zonder configuratie.",
    pl: "Każda strona otrzymuje ten adres. Działa, gdy tylko zakończysz konfigurację, bez żadnych ustawień.",
    pt: "Cada site recebe este endereço. Funciona assim que terminas a configuração, sem configuração extra.",
    sv: "Varje webbplats får denna adress. Den fungerar så snart du är klar med installationen, utan konfiguration.",
    sq: "Çdo faqe merr këtë adresë. Funksionon sapo të përfundosh konfigurimin, pa asnjë rregullim.",
  },
  "domain.connectEyebrow": {
    en: "Optional: connect your own domain", el: "Προαιρετικά: σύνδεσε τον δικό σου τομέα",
    de: "Optional: eigene Domain verbinden", fr: "Optionnel : connecte ton propre domaine",
    it: "Opzionale: collega il tuo dominio", es: "Opcional: conecta tu propio dominio",
    nl: "Optioneel: verbind je eigen domein", pl: "Opcjonalnie: podłącz własną domenę",
    pt: "Opcional: liga o teu próprio domínio", sv: "Valfritt: anslut din egen domän",
    sq: "Opsionale: lidh domenin tënd",
  },
  "domain.connectHeading": {
    en: "Use a domain you own.", el: "Χρησιμοποίησε έναν τομέα που έχεις.",
    de: "Verwende eine Domain, die dir gehört.", fr: "Utilise un domaine qui t'appartient.",
    it: "Usa un dominio che possiedi.", es: "Usa un dominio que ya tengas.",
    nl: "Gebruik een domein dat je bezit.", pl: "Użyj domeny, którą posiadasz.",
    pt: "Usa um domínio que já tens.", sv: "Använd en domän du äger.",
    sq: "Përdor një domen që e zotëron.",
  },
  "domain.connectBody": {
    en: "Already have a domain? Connect it here. You can also do this any time later from your admin dashboard.",
    el: "Έχεις ήδη τομέα; Σύνδεσέ τον εδώ. Μπορείς να το κάνεις και αργότερα οποτεδήποτε από τον πίνακα διαχείρισης.",
    de: "Du hast schon eine Domain? Verbinde sie hier. Das geht auch jederzeit später im Admin-Dashboard.",
    fr: "Tu as déjà un domaine ? Connecte-le ici. Tu peux aussi le faire plus tard depuis ton tableau de bord admin.",
    it: "Hai già un dominio? Collegalo qui. Puoi farlo anche più tardi dalla dashboard admin.",
    es: "¿Ya tienes un dominio? Conéctalo aquí. También puedes hacerlo más tarde desde tu panel de administración.",
    nl: "Heb je al een domein? Verbind het hier. Je kunt dit ook later doen via je beheerdashboard.",
    pl: "Masz już domenę? Podłącz ją tutaj. Możesz to też zrobić później w panelu administracyjnym.",
    pt: "Já tens um domínio? Liga-o aqui. Também o podes fazer mais tarde no painel de administração.",
    sv: "Har du redan en domän? Anslut den här. Du kan också göra det senare från din adminpanel.",
    sq: "Ke tashmë një domen? Lidhe këtu. Mund ta bësh edhe më vonë nga paneli i administrimit.",
  },
  "domain.connecting": {
    en: "Connecting...", el: "Σύνδεση...", de: "Wird verbunden...",
    fr: "Connexion...", it: "Connessione...", es: "Conectando...",
    nl: "Bezig met verbinden...", pl: "Łączenie...", pt: "A ligar...",
    sv: "Ansluter...", sq: "Po lidhet...",
  },
  "domain.connect": {
    en: "Connect", el: "Σύνδεση", de: "Verbinden", fr: "Connecter", it: "Collega",
    es: "Conectar", nl: "Verbinden", pl: "Połącz", pt: "Ligar", sv: "Anslut",
    sq: "Lidh",
  },
  "domain.verifiedLive": {
    en: "Verified. Your site is live at {domain}.",
    el: "Επαληθεύτηκε. Ο ιστότοπός σου είναι online στο {domain}.",
    de: "Bestätigt. Deine Website ist live unter {domain}.",
    fr: "Vérifié. Ton site est en ligne sur {domain}.",
    it: "Verificato. Il tuo sito è online su {domain}.",
    es: "Verificado. Tu sitio está en línea en {domain}.",
    nl: "Geverifieerd. Je site staat live op {domain}.",
    pl: "Zweryfikowano. Twoja strona działa pod {domain}.",
    pt: "Verificado. O teu site está online em {domain}.",
    sv: "Verifierad. Din webbplats är live på {domain}.",
    sq: "U verifikua. Faqja jote është online në {domain}.",
  },
  "domain.dnsHint": {
    en: "Pick where your domain is registered, then add this DNS record there and press Verify. It can take a few minutes to take effect.",
    el: "Διάλεξε πού είναι καταχωρισμένος ο τομέας σου, μετά πρόσθεσε εκεί αυτή την εγγραφή DNS και πάτα Επαλήθευση. Μπορεί να χρειαστούν λίγα λεπτά για να ισχύσει.",
    de: "Wähle, wo deine Domain registriert ist, füge dort diesen DNS-Eintrag hinzu und drücke Prüfen. Es kann ein paar Minuten dauern, bis es wirkt.",
    fr: "Choisis où ton domaine est enregistré, ajoute cet enregistrement DNS là-bas et appuie sur Vérifier. La prise en compte peut prendre quelques minutes.",
    it: "Scegli dove è registrato il tuo dominio, aggiungi lì questo record DNS e premi Verifica. Può richiedere qualche minuto per avere effetto.",
    es: "Elige dónde está registrado tu dominio, añade allí este registro DNS y pulsa Verificar. Puede tardar unos minutos en aplicarse.",
    nl: "Kies waar je domein is geregistreerd, voeg daar dit DNS-record toe en druk op Verifiëren. Het kan een paar minuten duren voordat het werkt.",
    pl: "Wybierz, gdzie zarejestrowano twoją domenę, dodaj tam ten rekord DNS i naciśnij Zweryfikuj. Zastosowanie zmian może potrwać kilka minut.",
    pt: "Escolhe onde o teu domínio está registado, adiciona aí este registo DNS e prime Verificar. Pode demorar alguns minutos a fazer efeito.",
    sv: "Välj var din domän är registrerad, lägg till denna DNS-post där och tryck på Verifiera. Det kan ta några minuter innan det börjar gälla.",
    sq: "Zgjidh ku është regjistruar domeni yt, shto atje këtë regjistrim DNS dhe shtyp Verifiko. Mund të duhen disa minuta që të hyjë në fuqi.",
  },
  "domain.provider": {
    en: "Domain provider", el: "Πάροχος τομέα", de: "Domain-Anbieter",
    fr: "Fournisseur de domaine", it: "Provider del dominio", es: "Proveedor de dominio",
    nl: "Domeinprovider", pl: "Dostawca domeny", pt: "Fornecedor de domínio",
    sv: "Domänleverantör", sq: "Ofruesi i domenit",
  },
  "domain.providerPlaceholder": {
    en: "Where is your domain registered?", el: "Πού είναι καταχωρισμένος ο τομέας σου;",
    de: "Wo ist deine Domain registriert?", fr: "Où ton domaine est-il enregistré ?",
    it: "Dove è registrato il tuo dominio?", es: "¿Dónde está registrado tu dominio?",
    nl: "Waar is je domein geregistreerd?", pl: "Gdzie jest zarejestrowana twoja domena?",
    pt: "Onde está registado o teu domínio?", sv: "Var är din domän registrerad?",
    sq: "Ku është regjistruar domeni yt?",
  },
  "domain.openDns": {
    en: "Open {provider} DNS settings", el: "Άνοιξε τις ρυθμίσεις DNS του {provider}",
    de: "{provider} DNS-Einstellungen öffnen", fr: "Ouvrir les réglages DNS de {provider}",
    it: "Apri le impostazioni DNS di {provider}", es: "Abrir los ajustes DNS de {provider}",
    nl: "DNS-instellingen van {provider} openen", pl: "Otwórz ustawienia DNS {provider}",
    pt: "Abrir as definições DNS de {provider}", sv: "Öppna DNS-inställningar för {provider}",
    sq: "Hap cilësimet DNS të {provider}",
  },
  "domain.dnsType": {
    en: "Type", el: "Τύπος", de: "Typ", fr: "Type", it: "Tipo", es: "Tipo",
    nl: "Type", pl: "Typ", pt: "Tipo", sv: "Typ", sq: "Lloji",
  },
  "domain.dnsName": {
    en: "Name", el: "Όνομα", de: "Name", fr: "Nom", it: "Nome", es: "Nombre",
    nl: "Naam", pl: "Nazwa", pt: "Nome", sv: "Namn", sq: "Emri",
  },
  "domain.dnsValue": {
    en: "Value", el: "Τιμή", de: "Wert", fr: "Valeur", it: "Valore", es: "Valor",
    nl: "Waarde", pl: "Wartość", pt: "Valor", sv: "Värde", sq: "Vlera",
  },
  "domain.dnsTtl": {
    en: "TTL", el: "TTL", de: "TTL", fr: "TTL", it: "TTL", es: "TTL",
    nl: "TTL", pl: "TTL", pt: "TTL", sv: "TTL", sq: "TTL",
  },
  "domain.dnsValueAlt": {
    en: "(some registrars label this “Points to” or “Content”)",
    el: "(σε ορισμένους παρόχους εμφανίζεται ως “Points to” ή “Content”)",
    de: "(manche Anbieter nennen es „Points to“ oder „Content“)",
    fr: "(certains registrars l'appellent « Points to » ou « Content »)",
    it: "(in alcuni registrar appare come “Points to” o “Content”)",
    es: "(en algunos registradores aparece como “Points to” o “Content”)",
    nl: "(sommige aanbieders noemen dit “Points to” of “Content”)",
    pl: "(u niektórych rejestratorów to pole nazywa się „Points to” lub „Content”)",
    pt: "(em alguns registradores aparece como “Points to” ou “Content”)",
    sv: "(vissa registratorer kallar det ”Points to” eller ”Content”)",
    sq: "(disa regjistrues e quajnë “Points to” ose “Content”)",
  },
  "domain.dnsTtlHint": {
    en: "1 hour is a safe default. Lower (e.g. 5 min) while testing; raise to 4–24 hours once stable.",
    el: "1 ώρα είναι ασφαλής προεπιλογή. Χρησιμοποιήστε χαμηλότερη (π.χ. 5 λεπτά) όσο δοκιμάζετε, αυξήστε σε 4–24 ώρες όταν σταθεροποιηθεί.",
    de: "1 Stunde ist ein sicherer Standard. Während des Tests niedriger (z. B. 5 Min.), nach Stabilisierung auf 4–24 Stunden anheben.",
    fr: "1 heure est une valeur sûre. Plus courte (5 min) pendant les tests, 4 à 24 heures une fois stable.",
    it: "1 ora è il valore predefinito sicuro. Abbassa (es. 5 min) durante i test, alza a 4–24 ore una volta stabile.",
    es: "1 hora es un valor seguro por defecto. Más bajo (p. ej. 5 min) durante las pruebas, súbelo a 4–24 horas cuando esté estable.",
    nl: "1 uur is een veilige standaard. Lager (bv. 5 min) tijdens testen, verhoog naar 4–24 uur zodra het stabiel is.",
    pl: "1 godzina to bezpieczne ustawienie. W trakcie testów obniż (np. do 5 min), po ustabilizowaniu podnieś do 4–24 godzin.",
    pt: "1 hora é o valor predefinido seguro. Mais baixo (ex.: 5 min) durante os testes, suba para 4–24 horas quando estiver estável.",
    sv: "1 timme är ett säkert standardvärde. Lägre (t.ex. 5 min) under tester, höj till 4–24 timmar när det är stabilt.",
    sq: "1 orë është një vlerë e parazgjedhur e sigurt. Më e ulët (p.sh. 5 min) gjatë testimit, ngrijeni në 4–24 orë sapo të stabilizohet.",
  },
  "domain.checking": {
    en: "Checking...", el: "Έλεγχος...", de: "Wird geprüft...", fr: "Vérification...",
    it: "Verifica...", es: "Comprobando...", nl: "Bezig met controleren...",
    pl: "Sprawdzanie...", pt: "A verificar...", sv: "Kontrollerar...", sq: "Po kontrollohet...",
  },
  "domain.verify": {
    en: "Verify", el: "Επαλήθευση", de: "Prüfen", fr: "Vérifier", it: "Verifica",
    es: "Verificar", nl: "Verifiëren", pl: "Zweryfikuj", pt: "Verificar",
    sv: "Verifiera", sq: "Verifiko",
  },
  "domain.buyEyebrow": {
    en: "Optional: buy a new domain", el: "Προαιρετικά: αγόρασε νέο τομέα",
    de: "Optional: neue Domain kaufen", fr: "Optionnel : achète un nouveau domaine",
    it: "Opzionale: acquista un nuovo dominio", es: "Opcional: compra un dominio nuevo",
    nl: "Optioneel: koop een nieuw domein", pl: "Opcjonalnie: kup nową domenę",
    pt: "Opcional: compra um novo domínio", sv: "Valfritt: köp en ny domän",
    sq: "Opsionale: bli një domen të ri",
  },
  "domain.buyHeading": {
    en: "Do not have a domain yet?", el: "Δεν έχεις ακόμη τομέα;",
    de: "Noch keine Domain?", fr: "Pas encore de domaine ?",
    it: "Non hai ancora un dominio?", es: "¿Aún no tienes un dominio?",
    nl: "Nog geen domein?", pl: "Nie masz jeszcze domeny?",
    pt: "Ainda não tens um domínio?", sv: "Har du ingen domän än?",
    sq: "Nuk ke ende një domen?",
  },
  "domain.buyBody": {
    en: "Search for one and register it right here. We connect it to your site automatically once it is registered.",
    el: "Αναζήτησε έναν και καταχώρισέ τον εδώ. Τον συνδέουμε αυτόματα με τον ιστότοπό σου μόλις καταχωριστεί.",
    de: "Such eine aus und registriere sie gleich hier. Wir verbinden sie automatisch mit deiner Website, sobald sie registriert ist.",
    fr: "Cherche-en un et enregistre-le ici même. Nous le connectons automatiquement à ton site une fois enregistré.",
    it: "Cercane uno e registralo qui. Lo colleghiamo automaticamente al tuo sito una volta registrato.",
    es: "Busca uno y regístralo aquí mismo. Lo conectamos automáticamente a tu sitio una vez registrado.",
    nl: "Zoek er een en registreer hem hier. We verbinden hem automatisch met je site zodra hij geregistreerd is.",
    pl: "Wyszukaj domenę i zarejestruj ją tutaj. Po rejestracji automatycznie połączymy ją z twoją stroną.",
    pt: "Procura um e regista-o aqui mesmo. Ligamo-lo automaticamente ao teu site assim que estiver registado.",
    sv: "Sök efter en och registrera den direkt här. Vi kopplar den automatiskt till din webbplats när den är registrerad.",
    sq: "Kërko një dhe regjistroje pikërisht këtu. E lidhim automatikisht me faqen tënde sapo të regjistrohet.",
  },
  "domain.searching": {
    en: "Searching...", el: "Αναζήτηση...", de: "Wird gesucht...", fr: "Recherche...",
    it: "Ricerca...", es: "Buscando...", nl: "Bezig met zoeken...", pl: "Wyszukiwanie...",
    pt: "A procurar...", sv: "Söker...", sq: "Po kërkohet...",
  },
  "domain.search": {
    en: "Search", el: "Αναζήτηση", de: "Suchen", fr: "Rechercher", it: "Cerca",
    es: "Buscar", nl: "Zoeken", pl: "Szukaj", pt: "Procurar", sv: "Sök", sq: "Kërko",
  },
  "domain.noResults": {
    en: "No domains found. Try another name.", el: "Δεν βρέθηκαν τομείς. Δοκίμασε άλλο όνομα.",
    de: "Keine Domains gefunden. Versuch einen anderen Namen.",
    fr: "Aucun domaine trouvé. Essaie un autre nom.",
    it: "Nessun dominio trovato. Prova un altro nome.",
    es: "No se encontraron dominios. Prueba con otro nombre.",
    nl: "Geen domeinen gevonden. Probeer een andere naam.",
    pl: "Nie znaleziono domen. Spróbuj innej nazwy.",
    pt: "Nenhum domínio encontrado. Tenta outro nome.",
    sv: "Inga domäner hittades. Prova ett annat namn.",
    sq: "Nuk u gjetën domene. Provo një emër tjetër.",
  },
  "domain.perYear": {
    en: "/yr", el: "/έτος", de: "/Jahr", fr: "/an", it: "/anno", es: "/año",
    nl: "/jr", pl: "/rok", pt: "/ano", sv: "/år", sq: "/vit",
  },
  "domain.buy": {
    en: "Buy", el: "Αγορά", de: "Kaufen", fr: "Acheter", it: "Acquista",
    es: "Comprar", nl: "Kopen", pl: "Kup", pt: "Comprar", sv: "Köp", sq: "Bli",
  },
  "domain.taken": {
    en: "Taken", el: "Κατειλημμένο", de: "Vergeben", fr: "Pris", it: "Occupato",
    es: "Ocupado", nl: "Bezet", pl: "Zajęte", pt: "Ocupado", sv: "Upptaget",
    sq: "I zënë",
  },
  "domain.optionalFooter": {
    en: "This step is optional. You can connect or buy a domain later from your admin.",
    el: "Αυτό το βήμα είναι προαιρετικό. Μπορείς να συνδέσεις ή να αγοράσεις τομέα αργότερα από τη διαχείριση.",
    de: "Dieser Schritt ist optional. Du kannst eine Domain auch später im Admin verbinden oder kaufen.",
    fr: "Cette étape est facultative. Tu peux connecter ou acheter un domaine plus tard depuis ton admin.",
    it: "Questo passaggio è facoltativo. Puoi collegare o acquistare un dominio più tardi dall'admin.",
    es: "Este paso es opcional. Puedes conectar o comprar un dominio más tarde desde tu admin.",
    nl: "Deze stap is optioneel. Je kunt later een domein verbinden of kopen vanuit je admin.",
    pl: "Ten krok jest opcjonalny. Możesz podłączyć lub kupić domenę później w panelu administracyjnym.",
    pt: "Este passo é opcional. Podes ligar ou comprar um domínio mais tarde no teu admin.",
    sv: "Det här steget är valfritt. Du kan ansluta eller köpa en domän senare från din admin.",
    sq: "Ky hap është opsional. Mund të lidhësh ose të blesh një domen më vonë nga admini yt.",
  },
  "domain.errSearch": {
    en: "Could not search domains. Please try again.",
    el: "Δεν ήταν δυνατή η αναζήτηση τομέων. Δοκίμασε ξανά.",
    de: "Domains konnten nicht gesucht werden. Bitte versuch es erneut.",
    fr: "Impossible de rechercher des domaines. Réessaie.",
    it: "Impossibile cercare domini. Riprova.",
    es: "No se pudieron buscar dominios. Inténtalo de nuevo.",
    nl: "Kon geen domeinen zoeken. Probeer het opnieuw.",
    pl: "Nie udało się wyszukać domen. Spróbuj ponownie.",
    pt: "Não foi possível procurar domínios. Tenta novamente.",
    sv: "Det gick inte att söka efter domäner. Försök igen.",
    sq: "Kërkimi i domeneve dështoi. Provo përsëri.",
  },
  "domain.errBuy": {
    en: "Could not start the purchase. Please try again.",
    el: "Δεν ήταν δυνατή η έναρξη της αγοράς. Δοκίμασε ξανά.",
    de: "Der Kauf konnte nicht gestartet werden. Bitte versuch es erneut.",
    fr: "Impossible de démarrer l'achat. Réessaie.",
    it: "Impossibile avviare l'acquisto. Riprova.",
    es: "No se pudo iniciar la compra. Inténtalo de nuevo.",
    nl: "Kon de aankoop niet starten. Probeer het opnieuw.",
    pl: "Nie udało się rozpocząć zakupu. Spróbuj ponownie.",
    pt: "Não foi possível iniciar a compra. Tenta novamente.",
    sv: "Det gick inte att starta köpet. Försök igen.",
    sq: "Nuk u nis dot blerja. Provo përsëri.",
  },
  "domain.errTaken": {
    en: "That domain is already connected to another site.",
    el: "Αυτός ο τομέας είναι ήδη συνδεδεμένος με άλλον ιστότοπο.",
    de: "Diese Domain ist bereits mit einer anderen Website verbunden.",
    fr: "Ce domaine est déjà connecté à un autre site.",
    it: "Questo dominio è già collegato a un altro sito.",
    es: "Ese dominio ya está conectado a otro sitio.",
    nl: "Dat domein is al verbonden met een andere site.",
    pl: "Ta domena jest już połączona z inną stroną.",
    pt: "Esse domínio já está ligado a outro site.",
    sv: "Den domänen är redan kopplad till en annan webbplats.",
    sq: "Ai domen është tashmë i lidhur me një faqe tjetër.",
  },
  "domain.errInvalid": {
    en: "That does not look like a valid domain name.",
    el: "Αυτό δεν μοιάζει με έγκυρο όνομα τομέα.",
    de: "Das sieht nicht nach einem gültigen Domainnamen aus.",
    fr: "Cela ne ressemble pas à un nom de domaine valide.",
    it: "Non sembra un nome di dominio valido.",
    es: "Eso no parece un nombre de dominio válido.",
    nl: "Dat lijkt geen geldige domeinnaam.",
    pl: "To nie wygląda na prawidłową nazwę domeny.",
    pt: "Isso não parece um nome de domínio válido.",
    sv: "Det ser inte ut som ett giltigt domännamn.",
    sq: "Ky nuk duket si një emër domeni i vlefshëm.",
  },
  "domain.errGeneric": {
    en: "Something went wrong. Please try again.",
    el: "Κάτι πήγε στραβά. Δοκίμασε ξανά.",
    de: "Etwas ist schiefgelaufen. Bitte versuch es erneut.",
    fr: "Une erreur s'est produite. Réessaie.",
    it: "Qualcosa è andato storto. Riprova.",
    es: "Algo salió mal. Inténtalo de nuevo.",
    nl: "Er ging iets mis. Probeer het opnieuw.",
    pl: "Coś poszło nie tak. Spróbuj ponownie.",
    pt: "Algo correu mal. Tenta novamente.",
    sv: "Något gick fel. Försök igen.",
    sq: "Diçka shkoi keq. Provo përsëri.",
  },
  "domain.errNetwork": {
    en: "Network error. Please try again.",
    el: "Σφάλμα δικτύου. Δοκίμασε ξανά.",
    de: "Netzwerkfehler. Bitte versuch es erneut.",
    fr: "Erreur réseau. Réessaie.",
    it: "Errore di rete. Riprova.",
    es: "Error de red. Inténtalo de nuevo.",
    nl: "Netwerkfout. Probeer het opnieuw.",
    pl: "Błąd sieci. Spróbuj ponownie.",
    pt: "Erro de rede. Tenta novamente.",
    sv: "Nätverksfel. Försök igen.",
    sq: "Gabim rrjeti. Provo përsëri.",
  },
  // ── Business sub-step labels ────────────────────────────────────────
  "sub.identity": {
    en: "Identity", el: "Ταυτότητα", de: "Identität", fr: "Identité",
    it: "Identità", es: "Identidad", nl: "Identiteit", pl: "Tożsamość",
    pt: "Identidade", sv: "Identitet", sq: "Identiteti",
  },
  "sub.location": {
    en: "Location", el: "Τοποθεσία", de: "Standort", fr: "Lieu", it: "Posizione",
    es: "Ubicación", nl: "Locatie", pl: "Lokalizacja", pt: "Localização",
    sv: "Plats", sq: "Vendndodhja",
  },
  "sub.social": {
    en: "Social", el: "Κοινωνικά", de: "Social", fr: "Réseaux", it: "Social",
    es: "Redes", nl: "Social", pl: "Social", pt: "Redes", sv: "Sociala",
    sq: "Sociale",
  },
  "sub.brand": {
    en: "Brand", el: "Επωνυμία", de: "Marke", fr: "Marque", it: "Brand",
    es: "Marca", nl: "Merk", pl: "Marka", pt: "Marca", sv: "Varumärke",
    sq: "Marka",
  },
  "sub.media": {
    en: "Media", el: "Πολυμέσα", de: "Medien", fr: "Médias", it: "Media",
    es: "Medios", nl: "Media", pl: "Media", pt: "Multimédia", sv: "Media",
    sq: "Media",
  },
  "sub.booking": {
    en: "Booking", el: "Κρατήσεις", de: "Buchung", fr: "Réservation",
    it: "Prenotazioni", es: "Reservas", nl: "Boeking", pl: "Rezerwacje",
    pt: "Reservas", sv: "Bokning", sq: "Rezervimet",
  },
  "sub.analytics": {
    en: "Analytics", el: "Analytics", de: "Analytics", fr: "Analytique",
    it: "Analytics", es: "Analítica", nl: "Analytics", pl: "Analityka",
    pt: "Análises", sv: "Analys", sq: "Analitika",
  },
  "sub.team": {
    en: "Team", el: "Ομάδα", de: "Team", fr: "Équipe", it: "Team",
    es: "Equipo", nl: "Team", pl: "Zespół", pt: "Equipa", sv: "Team",
    sq: "Ekipi",
  },
  "business.count": {
    en: "{n} / {total}", el: "{n} / {total}", de: "{n} / {total}",
    fr: "{n} / {total}", it: "{n} / {total}", es: "{n} / {total}",
    nl: "{n} / {total}", pl: "{n} / {total}", pt: "{n} / {total}",
    sv: "{n} / {total}", sq: "{n} / {total}",
  },
  // ── Identity sub-step ───────────────────────────────────────────────
  "identity.eyebrow": {
    en: "Business identity", el: "Ταυτότητα επιχείρησης", de: "Unternehmensidentität",
    fr: "Identité de l'entreprise", it: "Identità dell'attività", es: "Identidad del negocio",
    nl: "Bedrijfsidentiteit", pl: "Tożsamość firmy", pt: "Identidade do negócio",
    sv: "Företagsidentitet", sq: "Identiteti i biznesit",
  },
  "identity.heading": {
    en: "Your business", el: "Η επιχείρησή σου", de: "Dein Unternehmen",
    fr: "Ton entreprise", it: "La tua attività", es: "Tu negocio",
    nl: "Je bedrijf", pl: "Twoja firma", pt: "O teu negócio",
    sv: "Ditt företag", sq: "Biznesi yt",
  },
  "identity.subtext": {
    en: "This fills the contact page, JSON-LD schema, email templates, and footer. You can change any of it later.",
    el: "Αυτό συμπληρώνει τη σελίδα επικοινωνίας, το σχήμα JSON-LD, τα πρότυπα email και το υποσέλιδο. Μπορείς να τα αλλάξεις όλα αργότερα.",
    de: "Das füllt die Kontaktseite, das JSON-LD-Schema, die E-Mail-Vorlagen und die Fußzeile. Du kannst alles später ändern.",
    fr: "Cela remplit la page de contact, le schéma JSON-LD, les modèles d'e-mail et le pied de page. Tu peux tout modifier plus tard.",
    it: "Questo riempie la pagina contatti, lo schema JSON-LD, i modelli email e il piè di pagina. Puoi cambiare tutto più tardi.",
    es: "Esto rellena la página de contacto, el esquema JSON-LD, las plantillas de correo y el pie de página. Puedes cambiarlo todo más tarde.",
    nl: "Dit vult de contactpagina, het JSON-LD-schema, de e-mailsjablonen en de footer. Je kunt alles later wijzigen.",
    pl: "To wypełnia stronę kontaktu, schemat JSON-LD, szablony e-maili i stopkę. Wszystko możesz zmienić później.",
    pt: "Isto preenche a página de contacto, o esquema JSON-LD, os modelos de email e o rodapé. Podes alterar tudo mais tarde.",
    sv: "Detta fyller kontaktsidan, JSON-LD-schemat, e-postmallarna och sidfoten. Du kan ändra allt senare.",
    sq: "Kjo plotëson faqen e kontaktit, skemën JSON-LD, modelet e emailit dhe fundin e faqes. Mund t'i ndryshosh të gjitha më vonë.",
  },
  "identity.fieldName": {
    en: "Business name *", el: "Όνομα επιχείρησης *", de: "Firmenname *",
    fr: "Nom de l'entreprise *", it: "Nome dell'attività *", es: "Nombre del negocio *",
    nl: "Bedrijfsnaam *", pl: "Nazwa firmy *", pt: "Nome do negócio *",
    sv: "Företagsnamn *", sq: "Emri i biznesit *",
  },
  "identity.fieldCity": {
    en: "City *", el: "Πόλη *", de: "Stadt *", fr: "Ville *", it: "Città *",
    es: "Ciudad *", nl: "Stad *", pl: "Miasto *", pt: "Cidade *", sv: "Stad *",
    sq: "Qyteti *",
  },
  "identity.fieldStreet": {
    en: "Street address", el: "Διεύθυνση οδού", de: "Straße und Hausnummer",
    fr: "Adresse", it: "Indirizzo", es: "Dirección", nl: "Straatadres",
    pl: "Adres ulicy", pt: "Morada", sv: "Gatuadress", sq: "Adresa e rrugës",
  },
  "identity.fieldPostal": {
    en: "Postal code (→ autofills city)", el: "Ταχυδρομικός κώδικας (→ συμπληρώνει την πόλη)",
    de: "Postleitzahl (→ füllt die Stadt automatisch aus)",
    fr: "Code postal (→ remplit la ville)",
    it: "Codice postale (→ compila la città)",
    es: "Código postal (→ rellena la ciudad)",
    nl: "Postcode (→ vult de stad automatisch in)",
    pl: "Kod pocztowy (→ uzupełnia miasto)",
    pt: "Código postal (→ preenche a cidade)",
    sv: "Postnummer (→ fyller i staden)",
    sq: "Kodi postar (→ plotëson qytetin)",
  },
  "identity.fieldCountry": {
    en: "Country (ISO)", el: "Χώρα (ISO)", de: "Land (ISO)", fr: "Pays (ISO)",
    it: "Paese (ISO)", es: "País (ISO)", nl: "Land (ISO)", pl: "Kraj (ISO)",
    pt: "País (ISO)", sv: "Land (ISO)", sq: "Shteti (ISO)",
  },
  "identity.fieldPhone": {
    en: "Phone", el: "Τηλέφωνο", de: "Telefon", fr: "Téléphone", it: "Telefono",
    es: "Teléfono", nl: "Telefoon", pl: "Telefon", pt: "Telefone", sv: "Telefon",
    sq: "Telefoni",
  },
  "identity.fieldFounded": {
    en: "Founded year", el: "Έτος ίδρυσης", de: "Gründungsjahr",
    fr: "Année de création", it: "Anno di fondazione", es: "Año de fundación",
    nl: "Oprichtingsjaar", pl: "Rok założenia", pt: "Ano de fundação",
    sv: "Grundningsår", sq: "Viti i themelimit",
  },
  "identity.fieldEmail": {
    en: "Public email", el: "Δημόσιο email", de: "Öffentliche E-Mail",
    fr: "E-mail public", it: "Email pubblica", es: "Correo público",
    nl: "Openbaar e-mailadres", pl: "Publiczny e-mail", pt: "Email público",
    sv: "Offentlig e-post", sq: "Email publik",
  },
  "identity.namePlaceholder": {
    en: "Your Salon", el: "Το σαλόνι σου", de: "Dein Salon", fr: "Ton salon",
    it: "Il tuo salone", es: "Tu salón", nl: "Jouw salon", pl: "Twój salon",
    pt: "O teu salão", sv: "Din salong", sq: "Salloni yt",
  },
  "identity.wordmarkHint": {
    en: "Wordmark → {wordmark} · slug → {slug}",
    el: "Λογότυπο → {wordmark} · slug → {slug}",
    de: "Wortmarke → {wordmark} · Slug → {slug}",
    fr: "Logotype → {wordmark} · slug → {slug}",
    it: "Logotipo → {wordmark} · slug → {slug}",
    es: "Logotipo → {wordmark} · slug → {slug}",
    nl: "Woordmerk → {wordmark} · slug → {slug}",
    pl: "Logotyp → {wordmark} · slug → {slug}",
    pt: "Logótipo → {wordmark} · slug → {slug}",
    sv: "Ordmärke → {wordmark} · slug → {slug}",
    sq: "Logotipi → {wordmark} · slug → {slug}",
  },
  // ── Location sub-step ───────────────────────────────────────────────
  "location.eyebrow": {
    en: "Location & hours", el: "Τοποθεσία & ώρες", de: "Standort & Öffnungszeiten",
    fr: "Lieu & horaires", it: "Posizione & orari", es: "Ubicación y horario",
    nl: "Locatie & openingstijden", pl: "Lokalizacja i godziny",
    pt: "Localização e horário", sv: "Plats & öppettider", sq: "Vendndodhja & oraret",
  },
  "location.heading": {
    en: "When you're open", el: "Πότε είσαι ανοιχτά", de: "Wann du geöffnet hast",
    fr: "Tes heures d'ouverture", it: "Quando sei aperto", es: "Cuándo abres",
    nl: "Wanneer je open bent", pl: "Kiedy jesteś otwarty",
    pt: "Quando estás aberto", sv: "När du har öppet", sq: "Kur je hapur",
  },
  "location.subtext": {
    en: "Booking slots, reminders, and the daily schedule all derive from this. Get the timezone right or every slot lands hours off.",
    el: "Οι ώρες κρατήσεων, οι υπενθυμίσεις και το ημερήσιο πρόγραμμα προκύπτουν από αυτό. Βάλε σωστά τη ζώνη ώρας, αλλιώς κάθε ώρα θα πέφτει λάθος.",
    de: "Buchungszeiten, Erinnerungen und der Tagesplan leiten sich hieraus ab. Stell die Zeitzone richtig ein, sonst liegt jeder Termin Stunden daneben.",
    fr: "Les créneaux de réservation, les rappels et le planning quotidien en découlent. Indique le bon fuseau horaire, sinon chaque créneau sera décalé de plusieurs heures.",
    it: "Gli orari di prenotazione, i promemoria e il programma giornaliero derivano da qui. Imposta bene il fuso orario o ogni slot sarà sfasato di ore.",
    es: "Las franjas de reserva, los recordatorios y el horario diario salen de aquí. Acierta con la zona horaria o cada franja quedará desfasada por horas.",
    nl: "Boekingsslots, herinneringen en het dagrooster komen hieruit voort. Stel de tijdzone goed in, anders staat elk slot uren verkeerd.",
    pl: "Terminy rezerwacji, przypomnienia i harmonogram dnia wynikają z tego. Ustaw poprawnie strefę czasową, inaczej każdy termin będzie przesunięty o godziny.",
    pt: "As marcações, os lembretes e o horário diário derivam disto. Acerta no fuso horário ou cada marcação ficará desfasada por horas.",
    sv: "Bokningstider, påminnelser och dagsschemat utgår från detta. Ställ in rätt tidszon, annars hamnar varje tid flera timmar fel.",
    sq: "Oraret e rezervimit, kujtesat dhe orari ditor rrjedhin nga kjo. Vendos zonën e duhur orare ose çdo orar do të dalë me orë gabim.",
  },
  "location.tzEyebrow": {
    en: "Timezone *", el: "Ζώνη ώρας *", de: "Zeitzone *", fr: "Fuseau horaire *",
    it: "Fuso orario *", es: "Zona horaria *", nl: "Tijdzone *", pl: "Strefa czasowa *",
    pt: "Fuso horário *", sv: "Tidszon *", sq: "Zona orare *",
  },
  "location.tzHint": {
    en: "Pick where the shop physically is, not where you are now.",
    el: "Διάλεξε πού βρίσκεται φυσικά το κατάστημα, όχι πού είσαι τώρα.",
    de: "Wähle, wo der Laden physisch ist, nicht wo du gerade bist.",
    fr: "Choisis l'emplacement physique du salon, pas l'endroit où tu te trouves.",
    it: "Scegli dove si trova fisicamente il negozio, non dove sei ora.",
    es: "Elige dónde está físicamente el local, no dónde estás ahora.",
    nl: "Kies waar de zaak fysiek staat, niet waar je nu bent.",
    pl: "Wybierz, gdzie fizycznie znajduje się lokal, a nie gdzie jesteś teraz.",
    pt: "Escolhe onde o espaço está fisicamente, não onde estás agora.",
    sv: "Välj var salongen fysiskt ligger, inte var du befinner dig nu.",
    sq: "Zgjidh ku ndodhet fizikisht dyqani, jo ku je tani.",
  },
  "location.tzCustom": {
    en: "Custom (type below)", el: "Προσαρμοσμένη (πληκτρολόγησε παρακάτω)",
    de: "Benutzerdefiniert (unten eingeben)", fr: "Personnalisé (saisir ci-dessous)",
    it: "Personalizzato (digita sotto)", es: "Personalizado (escribe abajo)",
    nl: "Aangepast (typ hieronder)", pl: "Niestandardowa (wpisz poniżej)",
    pt: "Personalizado (escreve abaixo)", sv: "Anpassad (skriv nedan)",
    sq: "I personalizuar (shkruaj më poshtë)",
  },
  "location.hoursEyebrow": {
    en: "Opening hours *", el: "Ώρες λειτουργίας *", de: "Öffnungszeiten *",
    fr: "Horaires d'ouverture *", it: "Orari di apertura *", es: "Horario de apertura *",
    nl: "Openingstijden *", pl: "Godziny otwarcia *", pt: "Horário de funcionamento *",
    sv: "Öppettider *", sq: "Oraret e hapjes *",
  },
  "location.hoursHint": {
    en: "Tick a day as closed to block bookings that day. Split hours (e.g. a midday break) are supported: hit “+ split” on any open day.",
    el: "Σημείωσε μια ημέρα ως κλειστή για να μπλοκάρεις κρατήσεις εκείνη την ημέρα. Υποστηρίζονται χωρισμένες ώρες (π.χ. μεσημεριανό διάλειμμα): πάτα “+ split” σε όποια ανοιχτή ημέρα.",
    de: "Markiere einen Tag als geschlossen, um Buchungen an dem Tag zu sperren. Geteilte Zeiten (z. B. eine Mittagspause) werden unterstützt: tippe an einem offenen Tag auf “+ split”.",
    fr: "Coche un jour comme fermé pour bloquer les réservations ce jour-là. Les horaires coupés (par ex. une pause déjeuner) sont pris en charge : clique sur “+ split” un jour ouvert.",
    it: "Spunta un giorno come chiuso per bloccare le prenotazioni quel giorno. Sono supportati orari spezzati (es. una pausa pranzo): premi “+ split” in un giorno aperto.",
    es: "Marca un día como cerrado para bloquear las reservas ese día. Se admiten horarios partidos (p. ej. un descanso al mediodía): pulsa “+ split” en cualquier día abierto.",
    nl: "Vink een dag aan als gesloten om die dag boekingen te blokkeren. Gesplitste uren (bijv. een middagpauze) worden ondersteund: klik op “+ split” op een open dag.",
    pl: "Zaznacz dzień jako zamknięty, aby zablokować rezerwacje tego dnia. Obsługiwane są godziny dzielone (np. przerwa w południe): kliknij “+ split” w dowolny otwarty dzień.",
    pt: "Marca um dia como fechado para bloquear marcações nesse dia. Horários partidos (ex. uma pausa ao meio-dia) são suportados: prime “+ split” num dia aberto.",
    sv: "Markera en dag som stängd för att blockera bokningar den dagen. Delade tider (t.ex. en lunchrast) stöds: klicka på “+ split” på en öppen dag.",
    sq: "Shëno një ditë si të mbyllur për të bllokuar rezervimet atë ditë. Oraret e ndara (p.sh. një pushim mesdite) mbështeten: shtyp “+ split” në çdo ditë të hapur.",
  },
  "location.closed": {
    en: "Closed", el: "Κλειστά", de: "Geschlossen", fr: "Fermé", it: "Chiuso",
    es: "Cerrado", nl: "Gesloten", pl: "Zamknięte", pt: "Fechado", sv: "Stängt",
    sq: "Mbyllur",
  },
  "location.addSplit": {
    en: "+ split", el: "+ χωρισμός", de: "+ Teilung", fr: "+ pause", it: "+ pausa",
    es: "+ partido", nl: "+ splitsen", pl: "+ podział", pt: "+ pausa", sv: "+ delning",
    sq: "+ ndarje",
  },
  "location.removeSplit": {
    en: "− split", el: "− χωρισμός", de: "− Teilung", fr: "− pause", it: "− pausa",
    es: "− partido", nl: "− splitsen", pl: "− podział", pt: "− pausa", sv: "− delning",
    sq: "− ndarje",
  },
  "location.removeSplitTitle": {
    en: "Remove second window", el: "Αφαίρεση δεύτερου παραθύρου",
    de: "Zweites Zeitfenster entfernen", fr: "Supprimer la deuxième plage",
    it: "Rimuovi la seconda fascia", es: "Eliminar el segundo tramo",
    nl: "Tweede venster verwijderen", pl: "Usuń drugie okno",
    pt: "Remover a segunda janela", sv: "Ta bort andra fönstret",
    sq: "Hiq dritaren e dytë",
  },
  "day.mon": { en: "Mon", el: "Δευ", de: "Mo", fr: "Lun", it: "Lun", es: "Lun", nl: "Ma", pl: "Pon", pt: "Seg", sv: "Mån", sq: "Hën" },
  "day.tue": { en: "Tue", el: "Τρι", de: "Di", fr: "Mar", it: "Mar", es: "Mar", nl: "Di", pl: "Wt", pt: "Ter", sv: "Tis", sq: "Mar" },
  "day.wed": { en: "Wed", el: "Τετ", de: "Mi", fr: "Mer", it: "Mer", es: "Mié", nl: "Wo", pl: "Śr", pt: "Qua", sv: "Ons", sq: "Mër" },
  "day.thu": { en: "Thu", el: "Πεμ", de: "Do", fr: "Jeu", it: "Gio", es: "Jue", nl: "Do", pl: "Czw", pt: "Qui", sv: "Tor", sq: "Enj" },
  "day.fri": { en: "Fri", el: "Παρ", de: "Fr", fr: "Ven", it: "Ven", es: "Vie", nl: "Vr", pl: "Pt", pt: "Sex", sv: "Fre", sq: "Pre" },
  "day.sat": { en: "Sat", el: "Σαβ", de: "Sa", fr: "Sam", it: "Sab", es: "Sáb", nl: "Za", pl: "Sob", pt: "Sáb", sv: "Lör", sq: "Sht" },
  "day.sun": { en: "Sun", el: "Κυρ", de: "So", fr: "Dim", it: "Dom", es: "Dom", nl: "Zo", pl: "Nd", pt: "Dom", sv: "Sön", sq: "Die" },
  // ── Social sub-step ─────────────────────────────────────────────────
  "social.eyebrow": {
    en: "Social profiles", el: "Προφίλ κοινωνικών δικτύων", de: "Social-Media-Profile",
    fr: "Profils sociaux", it: "Profili social", es: "Perfiles sociales",
    nl: "Socialeprofielen", pl: "Profile społecznościowe", pt: "Perfis sociais",
    sv: "Sociala profiler", sq: "Profilet sociale",
  },
  "social.heading": {
    en: "Where to find you", el: "Πού να σε βρουν", de: "Wo man dich findet",
    fr: "Où te trouver", it: "Dove trovarti", es: "Dónde encontrarte",
    nl: "Waar je te vinden bent", pl: "Gdzie cię znaleźć",
    pt: "Onde te encontrar", sv: "Var man hittar dig", sq: "Ku të të gjejnë",
  },
  "social.subtext": {
    en: "Optional. These become the footer and contact-page links. Leave any blank and that icon simply won't show.",
    el: "Προαιρετικά. Αυτά γίνονται σύνδεσμοι στο υποσέλιδο και τη σελίδα επικοινωνίας. Άφησε όποιο θέλεις κενό και αυτό το εικονίδιο απλώς δεν θα εμφανιστεί.",
    de: "Optional. Daraus werden die Links in Fußzeile und Kontaktseite. Lass eines leer und dieses Symbol wird einfach nicht angezeigt.",
    fr: "Facultatif. Ils deviennent les liens du pied de page et de la page de contact. Laisse un champ vide et l'icône ne s'affichera tout simplement pas.",
    it: "Facoltativo. Diventano i link nel piè di pagina e nella pagina contatti. Lascia un campo vuoto e quell'icona semplicemente non comparirà.",
    es: "Opcional. Se convierten en los enlaces del pie de página y la página de contacto. Deja alguno en blanco y ese icono simplemente no aparecerá.",
    nl: "Optioneel. Deze worden de links in de footer en op de contactpagina. Laat er een leeg en dat pictogram wordt gewoon niet getoond.",
    pl: "Opcjonalnie. Stają się linkami w stopce i na stronie kontaktu. Zostaw puste, a dana ikona po prostu się nie pojawi.",
    pt: "Opcional. Tornam-se as ligações do rodapé e da página de contacto. Deixa algum em branco e esse ícone simplesmente não aparece.",
    sv: "Valfritt. De blir länkarna i sidfoten och på kontaktsidan. Lämna något tomt så visas inte den ikonen.",
    sq: "Opsionale. Këto bëhen lidhjet në fund të faqes dhe në faqen e kontaktit. Lëre ndonjë bosh dhe ajo ikonë thjesht nuk do të shfaqet.",
  },
  "social.instagram": {
    en: "Instagram", el: "Instagram", de: "Instagram", fr: "Instagram", it: "Instagram",
    es: "Instagram", nl: "Instagram", pl: "Instagram", pt: "Instagram", sv: "Instagram",
    sq: "Instagram",
  },
  "social.instagramPlaceholder": {
    en: "@yoursalon or full URL", el: "@tosalonisou ή πλήρες URL",
    de: "@deinsalon oder vollständige URL", fr: "@tonsalon ou URL complète",
    it: "@iltuosalone o URL completo", es: "@tusalon o URL completa",
    nl: "@jouwsalon of volledige URL", pl: "@twojsalon lub pełny adres URL",
    pt: "@oteusalao ou URL completo", sv: "@dinsalong eller fullständig URL",
    sq: "@sallonijot ose URL e plotë",
  },
  "social.facebook": {
    en: "Facebook", el: "Facebook", de: "Facebook", fr: "Facebook", it: "Facebook",
    es: "Facebook", nl: "Facebook", pl: "Facebook", pt: "Facebook", sv: "Facebook",
    sq: "Facebook",
  },
  "social.whatsapp": {
    en: "WhatsApp", el: "WhatsApp", de: "WhatsApp", fr: "WhatsApp", it: "WhatsApp",
    es: "WhatsApp", nl: "WhatsApp", pl: "WhatsApp", pt: "WhatsApp", sv: "WhatsApp",
    sq: "WhatsApp",
  },
  "social.tiktok": {
    en: "TikTok", el: "TikTok", de: "TikTok", fr: "TikTok", it: "TikTok",
    es: "TikTok", nl: "TikTok", pl: "TikTok", pt: "TikTok", sv: "TikTok", sq: "TikTok",
  },
  "social.tiktokPlaceholder": {
    en: "@yoursalon", el: "@tosalonisou", de: "@deinsalon", fr: "@tonsalon",
    it: "@iltuosalone", es: "@tusalon", nl: "@jouwsalon", pl: "@twojsalon",
    pt: "@oteusalao", sv: "@dinsalong", sq: "@sallonijot",
  },
  // ── Brand sub-step ──────────────────────────────────────────────────
  "brand.eyebrow": {
    en: "Brand", el: "Επωνυμία", de: "Marke", fr: "Marque", it: "Brand",
    es: "Marca", nl: "Merk", pl: "Marka", pt: "Marca", sv: "Varumärke",
    sq: "Marka",
  },
  "brand.heading": {
    en: "How your brand reads", el: "Πώς διαβάζεται η επωνυμία σου",
    de: "Wie deine Marke wirkt", fr: "L'image de ta marque",
    it: "Come si presenta il tuo brand", es: "Cómo se percibe tu marca",
    nl: "Hoe je merk overkomt", pl: "Jak odbierana jest twoja marka",
    pt: "Como a tua marca se lê", sv: "Hur ditt varumärke uppfattas",
    sq: "Si lexohet marka jote",
  },
  "brand.subtext": {
    en: "All optional. The wordmark is built from your business name automatically; everything here is editable later from the admin.",
    el: "Όλα προαιρετικά. Το λογότυπο δημιουργείται αυτόματα από το όνομα της επιχείρησής σου. Τα πάντα εδώ είναι επεξεργάσιμα αργότερα από τη διαχείριση.",
    de: "Alles optional. Die Wortmarke wird automatisch aus deinem Firmennamen erstellt; alles hier ist später im Admin bearbeitbar.",
    fr: "Tout est facultatif. Le logotype est créé automatiquement à partir du nom de ton entreprise ; tout ici est modifiable plus tard depuis l'admin.",
    it: "Tutto facoltativo. Il logotipo viene creato automaticamente dal nome dell'attività; tutto qui è modificabile più tardi dall'admin.",
    es: "Todo opcional. El logotipo se crea automáticamente con el nombre de tu negocio; todo aquí se puede editar más tarde desde el admin.",
    nl: "Alles optioneel. Het woordmerk wordt automatisch opgebouwd uit je bedrijfsnaam; alles hier is later in de admin te bewerken.",
    pl: "Wszystko opcjonalne. Logotyp powstaje automatycznie z nazwy firmy; wszystko tutaj można edytować później w panelu.",
    pt: "Tudo opcional. O logótipo é criado automaticamente a partir do nome do teu negócio; tudo aqui é editável mais tarde no admin.",
    sv: "Allt är valfritt. Ordmärket skapas automatiskt från ditt företagsnamn; allt här går att redigera senare i adminpanelen.",
    sq: "Të gjitha opsionale. Logotipi krijohet automatikisht nga emri i biznesit tënd; gjithçka këtu mund të redaktohet më vonë nga admini.",
  },
  "brand.noLogoHint": {
    en: "No logo? The site falls back to the wordmark {wordmark}.",
    el: "Δεν έχεις λογότυπο; Ο ιστότοπος χρησιμοποιεί το λογότυπο {wordmark}.",
    de: "Kein Logo? Die Website verwendet ersatzweise die Wortmarke {wordmark}.",
    fr: "Pas de logo ? Le site utilise le logotype {wordmark}.",
    it: "Nessun logo? Il sito ripiega sul logotipo {wordmark}.",
    es: "¿Sin logo? El sitio recurre al logotipo {wordmark}.",
    nl: "Geen logo? De site valt terug op het woordmerk {wordmark}.",
    pl: "Brak logo? Strona użyje logotypu {wordmark}.",
    pt: "Sem logótipo? O site recorre ao logótipo {wordmark}.",
    sv: "Ingen logotyp? Webbplatsen använder ordmärket {wordmark}.",
    sq: "Pa logo? Faqja kthehet te logotipi {wordmark}.",
  },
  "brand.tagline": {
    en: "Tagline", el: "Σλόγκαν", de: "Slogan", fr: "Slogan", it: "Slogan",
    es: "Eslogan", nl: "Slogan", pl: "Hasło", pt: "Slogan", sv: "Slogan",
    sq: "Slogan",
  },
  "brand.taglinePlaceholder": {
    en: "Precision cuts, classic service", el: "Κουρέματα ακριβείας, κλασική εξυπηρέτηση",
    de: "Präzise Schnitte, klassischer Service", fr: "Coupes précises, service classique",
    it: "Tagli precisi, servizio classico", es: "Cortes precisos, servicio clásico",
    nl: "Precieze knipbeurten, klassieke service", pl: "Precyzyjne cięcia, klasyczna obsługa",
    pt: "Cortes precisos, serviço clássico", sv: "Precisa klippningar, klassisk service",
    sq: "Prerje me saktësi, shërbim klasik",
  },
  "brand.priceRange": {
    en: "Price range", el: "Εύρος τιμών", de: "Preisklasse", fr: "Gamme de prix",
    it: "Fascia di prezzo", es: "Rango de precios", nl: "Prijsklasse",
    pl: "Przedział cenowy", pt: "Faixa de preços", sv: "Prisklass",
    sq: "Diapazoni i çmimeve",
  },
  "brand.priceHint": {
    en: "Shown on the contact page and in the business schema.",
    el: "Εμφανίζεται στη σελίδα επικοινωνίας και στο σχήμα της επιχείρησης.",
    de: "Wird auf der Kontaktseite und im Business-Schema angezeigt.",
    fr: "Affiché sur la page de contact et dans le schéma de l'entreprise.",
    it: "Mostrato nella pagina contatti e nello schema dell'attività.",
    es: "Se muestra en la página de contacto y en el esquema del negocio.",
    nl: "Wordt getoond op de contactpagina en in het bedrijfsschema.",
    pl: "Wyświetlany na stronie kontaktu i w schemacie firmy.",
    pt: "Mostrado na página de contacto e no esquema do negócio.",
    sv: "Visas på kontaktsidan och i företagsschemat.",
    sq: "Shfaqet në faqen e kontaktit dhe në skemën e biznesit.",
  },
  "brand.template": {
    en: "Site design", el: "Σχέδιο ιστότοπου", de: "Website-Design",
    fr: "Design du site", it: "Design del sito", es: "Diseño del sitio",
    nl: "Site-ontwerp", pl: "Projekt strony", pt: "Design do site",
    sv: "Webbplatsens design", sq: "Dizajni i faqes",
  },
  "brand.templateHint": {
    en: "Pick the look your public website ships with. You can switch it any time from the admin.",
    el: "Διάλεξε την εμφάνιση με την οποία ξεκινά ο ιστότοπός σου. Μπορείς να την αλλάξεις ανά πάσα στιγμή από τη διαχείριση.",
    de: "Wähle das Aussehen, mit dem deine Website startet. Du kannst es jederzeit im Admin ändern.",
    fr: "Choisis l'apparence avec laquelle ton site démarre. Tu peux en changer à tout moment depuis l'admin.",
    it: "Scegli l'aspetto con cui parte il tuo sito. Puoi cambiarlo in qualsiasi momento dall'admin.",
    es: "Elige el aspecto con el que arranca tu sitio. Puedes cambiarlo cuando quieras desde el admin.",
    nl: "Kies het uiterlijk waarmee je website start. Je kunt het altijd wijzigen via het admin.",
    pl: "Wybierz wygląd, z którym ruszy twoja strona. Możesz go zmienić w każdej chwili w panelu.",
    pt: "Escolhe o visual com que o teu site arranca. Podes mudá-lo a qualquer momento no admin.",
    sv: "Välj utseendet som din webbplats startar med. Du kan byta det när som helst i adminpanelen.",
    sq: "Zgjidh pamjen me të cilën niset faqja jote. Mund ta ndryshosh në çdo kohë nga admini.",
  },
  "brand.tplSalonName": {
    en: "Barber", el: "Barber", de: "Barber", fr: "Barber", it: "Barber",
    es: "Barber", nl: "Barber", pl: "Barber", pt: "Barber", sv: "Barber", sq: "Barber",
  },
  "brand.tplSalonDesc": {
    en: "Warm, dark and editorial. Built for barbers and hair studios.",
    el: "Ζεστό, σκούρο, εκδοτικό ύφος. Φτιαγμένο για μπαρμπέρικα και κομμωτήρια.",
    de: "Warm, dunkel, editorial. Gemacht für Barbershops und Friseurstudios.",
    fr: "Chaud, sombre, éditorial. Conçu pour les barbiers et salons de coiffure.",
    it: "Caldo, scuro, editoriale. Pensato per barbieri e parrucchieri.",
    es: "Cálido, oscuro, editorial. Hecho para barberías y peluquerías.",
    nl: "Warm, donker, editorial. Gemaakt voor barbershops en kappers.",
    pl: "Ciepły, ciemny, edytorski. Stworzony dla barberów i salonów fryzjerskich.",
    pt: "Quente, escuro, editorial. Feito para barbearias e cabeleireiros.",
    sv: "Varmt, mörkt, redaktionellt. Byggt för barberare och frisörsalonger.",
    sq: "I ngrohtë, i errët, editorial. Ndërtuar për berberë dhe sallone flokësh.",
  },
  "brand.tplNailName": {
    en: "Nail Studio", el: "Nail Studio", de: "Nail Studio", fr: "Nail Studio",
    it: "Nail Studio", es: "Nail Studio", nl: "Nail Studio", pl: "Nail Studio",
    pt: "Nail Studio", sv: "Nail Studio", sq: "Nail Studio",
  },
  "brand.tplNailDesc": {
    en: "Light, minimal and premium. Built for nail artists.",
    el: "Φωτεινό, μίνιμαλ, premium. Φτιαγμένο για nail artists.",
    de: "Hell, minimalistisch, premium. Gemacht für Nageldesigner.",
    fr: "Clair, minimaliste, premium. Conçu pour les prothésistes ongulaires.",
    it: "Chiaro, minimale, premium. Pensato per nail artist.",
    es: "Claro, minimalista, premium. Hecho para manicuristas.",
    nl: "Licht, minimalistisch, premium. Gemaakt voor nagelstylisten.",
    pl: "Jasny, minimalistyczny, premium. Stworzony dla stylistek paznokci.",
    pt: "Claro, minimalista, premium. Feito para manicures.",
    sv: "Ljust, minimalistiskt, premium. Byggt för nagelteknologer.",
    sq: "I ndritshëm, minimal, premium. Ndërtuar për artistë thonjsh.",
  },
  "brand.tplSpaName": {
    en: "Day Spa", el: "Day Spa", de: "Day Spa", fr: "Day Spa",
    it: "Day Spa", es: "Day Spa", nl: "Day Spa", pl: "Day Spa",
    pt: "Day Spa", sv: "Day Spa", sq: "Day Spa",
  },
  "brand.tplSpaDesc": {
    en: "Calm, organic and restful. Built for spas and wellness studios.",
    el: "Ήρεμο, οργανικό, χαλαρωτικό. Φτιαγμένο για spa και κέντρα ευεξίας.",
    de: "Ruhig, natürlich, erholsam. Gemacht für Spas und Wellnessstudios.",
    fr: "Calme, organique et reposant. Conçu pour les spas et centres de bien-être.",
    it: "Calmo, organico e rilassante. Pensato per spa e centri benessere.",
    es: "Sereno, orgánico y relajante. Hecho para spas y centros de bienestar.",
    nl: "Rustig, organisch en ontspannen. Gemaakt voor spa's en wellnessstudio's.",
    pl: "Spokojny, naturalny i kojący. Stworzony dla spa i studiów wellness.",
    pt: "Calmo, orgânico e tranquilo. Feito para spas e estúdios de bem-estar.",
    sv: "Lugnt, organiskt och rofyllt. Byggt för spa och wellnessstudior.",
    sq: "I qetë, organik dhe çlodhës. Ndërtuar për spa dhe studio mirëqenieje.",
  },
  "brand.tplClinicName": {
    en: "Aesthetics Clinic", el: "Aesthetics Clinic", de: "Aesthetics Clinic",
    fr: "Aesthetics Clinic", it: "Aesthetics Clinic", es: "Aesthetics Clinic",
    nl: "Aesthetics Clinic", pl: "Aesthetics Clinic", pt: "Aesthetics Clinic",
    sv: "Aesthetics Clinic", sq: "Aesthetics Clinic",
  },
  "brand.tplClinicDesc": {
    en: "Clinical, precise and trusted. Built for med-spas and skin clinics.",
    el: "Κλινικό, ακριβές, αξιόπιστο. Φτιαγμένο για med-spa και κλινικές δέρματος.",
    de: "Klinisch, präzise, vertrauenswürdig. Gemacht für Med-Spas und Hautkliniken.",
    fr: "Clinique, précis et rassurant. Conçu pour les med-spas et cliniques de la peau.",
    it: "Clinico, preciso e affidabile. Pensato per med-spa e cliniche dermatologiche.",
    es: "Clínico, preciso y de confianza. Hecho para med-spas y clínicas de la piel.",
    nl: "Klinisch, precies en betrouwbaar. Gemaakt voor med-spa's en huidklinieken.",
    pl: "Kliniczny, precyzyjny i godny zaufania. Stworzony dla med-spa i klinik skóry.",
    pt: "Clínico, preciso e de confiança. Feito para med-spas e clínicas de pele.",
    sv: "Kliniskt, exakt och pålitligt. Byggt för med-spa och hudkliniker.",
    sq: "Klinik, i saktë dhe i besueshëm. Ndërtuar për med-spa dhe klinika lëkure.",
  },
  "brand.tplYogaName": {
    en: "Yoga Studio", el: "Yoga Studio", de: "Yoga Studio", fr: "Yoga Studio",
    it: "Yoga Studio", es: "Yoga Studio", nl: "Yoga Studio", pl: "Yoga Studio",
    pt: "Yoga Studio", sv: "Yoga Studio", sq: "Yoga Studio",
  },
  "brand.tplYogaDesc": {
    en: "Warm, playful and collaged. Built for yoga and movement studios.",
    el: "Ζεστό, παιχνιδιάρικο, με ύφος κολάζ. Φτιαγμένο για στούντιο γιόγκα και κίνησης.",
    de: "Warm, verspielt, collagenhaft. Gemacht für Yoga- und Bewegungsstudios.",
    fr: "Chaleureux, ludique, façon collage. Conçu pour les studios de yoga et de mouvement.",
    it: "Caldo, giocoso e in stile collage. Pensato per studi di yoga e movimento.",
    es: "Cálido, divertido y tipo collage. Hecho para estudios de yoga y movimiento.",
    nl: "Warm, speels en collage-achtig. Gemaakt voor yoga- en bewegingsstudio's.",
    pl: "Ciepły, zabawny, w stylu kolażu. Stworzony dla studiów jogi i ruchu.",
    pt: "Quente, divertido e estilo colagem. Feito para estúdios de yoga e movimento.",
    sv: "Varmt, lekfullt och collageaktigt. Byggt för yoga- och rörelsestudior.",
    sq: "I ngrohtë, lozonjar dhe me stil kolazhi. Ndërtuar për studio joga dhe lëvizjeje.",
  },
  "brand.heroLayout": {
    en: "Homepage hero style", el: "Στυλ hero αρχικής σελίδας",
    de: "Hero-Stil der Startseite", fr: "Style du hero de la page d'accueil",
    it: "Stile dell'hero della homepage", es: "Estilo del hero de la página de inicio",
    nl: "Hero-stijl van de homepage", pl: "Styl sekcji hero strony głównej",
    pt: "Estilo do hero da página inicial", sv: "Hero-stil för startsidan",
    sq: "Stili i hero-it të faqes kryesore",
  },
  "brand.heroSplit": {
    en: "Split", el: "Διπλό", de: "Geteilt", fr: "Divisé", it: "Diviso",
    es: "Dividido", nl: "Gesplitst", pl: "Podzielony", pt: "Dividido",
    sv: "Delad", sq: "I ndarë",
  },
  "brand.heroSplitHint": {
    en: "Headline beside a portrait photo. The classic look.",
    el: "Τίτλος δίπλα σε μια φωτογραφία πορτρέτου. Η κλασική εμφάνιση.",
    de: "Überschrift neben einem Porträtfoto. Der klassische Look.",
    fr: "Titre à côté d'une photo portrait. Le look classique.",
    it: "Titolo accanto a una foto verticale. L'aspetto classico.",
    es: "Titular junto a una foto vertical. El estilo clásico.",
    nl: "Kop naast een portretfoto. De klassieke look.",
    pl: "Nagłówek obok zdjęcia portretowego. Klasyczny wygląd.",
    pt: "Título ao lado de uma foto vertical. O visual clássico.",
    sv: "Rubrik bredvid ett porträttfoto. Det klassiska utseendet.",
    sq: "Titulli pranë një fotoje portret. Pamja klasike.",
  },
  "brand.heroVideo": {
    en: "Video", el: "Βίντεο", de: "Video", fr: "Vidéo", it: "Video",
    es: "Vídeo", nl: "Video", pl: "Wideo", pt: "Vídeo", sv: "Video",
    sq: "Video",
  },
  "brand.heroVideoHint": {
    en: "A full-screen background video with the headline centred over it.",
    el: "Ένα βίντεο φόντου πλήρους οθόνης με τον τίτλο στο κέντρο.",
    de: "Ein bildschirmfüllendes Hintergrundvideo mit zentrierter Überschrift.",
    fr: "Une vidéo de fond plein écran avec le titre centré dessus.",
    it: "Un video di sfondo a schermo intero con il titolo centrato sopra.",
    es: "Un vídeo de fondo a pantalla completa con el titular centrado.",
    nl: "Een schermvullende achtergrondvideo met de kop gecentreerd.",
    pl: "Pełnoekranowe wideo w tle z nagłówkiem na środku.",
    pt: "Um vídeo de fundo em ecrã inteiro com o título centrado.",
    sv: "En helskärmsbakgrundsvideo med rubriken centrerad över.",
    sq: "Një video sfondi në ekran të plotë me titullin në qendër.",
  },
  "brand.heroShowcase": {
    en: "Showcase", el: "Βιτρίνα", de: "Schaufenster", fr: "Vitrine",
    it: "Vetrina", es: "Escaparate", nl: "Showcase", pl: "Prezentacja",
    pt: "Montra", sv: "Skyltning", sq: "Vitrinë",
  },
  "brand.heroShowcaseHint": {
    en: "A background photo with a phone that live-previews your own site.",
    el: "Μια φωτογραφία φόντου με ένα κινητό που προβάλλει ζωντανά τον ιστότοπό σου.",
    de: "Ein Hintergrundfoto mit einem Smartphone, das deine Website live zeigt.",
    fr: "Une photo de fond avec un téléphone qui prévisualise ton site en direct.",
    it: "Una foto di sfondo con un telefono che mostra in diretta il tuo sito.",
    es: "Una foto de fondo con un teléfono que previsualiza tu sitio en vivo.",
    nl: "Een achtergrondfoto met een telefoon die je site live laat zien.",
    pl: "Zdjęcie w tle z telefonem pokazującym podgląd twojej strony na żywo.",
    pt: "Uma foto de fundo com um telemóvel que pré-visualiza o teu site ao vivo.",
    sv: "Ett bakgrundsfoto med en telefon som förhandsvisar din webbplats live.",
    sq: "Një foto sfondi me një telefon që shfaq drejtpërdrejt faqen tënde.",
  },
  "logo.label": {
    en: "Logo (optional)", el: "Λογότυπο (προαιρετικό)", de: "Logo (optional)",
    fr: "Logo (facultatif)", it: "Logo (facoltativo)", es: "Logo (opcional)",
    nl: "Logo (optioneel)", pl: "Logo (opcjonalnie)", pt: "Logótipo (opcional)",
    sv: "Logotyp (valfritt)", sq: "Logo (opsionale)",
  },
  "logo.uploading": {
    en: "Uploading…", el: "Μεταφόρτωση…", de: "Wird hochgeladen…",
    fr: "Téléversement…", it: "Caricamento…", es: "Subiendo…",
    nl: "Bezig met uploaden…", pl: "Przesyłanie…", pt: "A carregar…",
    sv: "Laddar upp…", sq: "Po ngarkohet…",
  },
  "logo.replace": {
    en: "Replace", el: "Αντικατάσταση", de: "Ersetzen", fr: "Remplacer",
    it: "Sostituisci", es: "Reemplazar", nl: "Vervangen", pl: "Zamień",
    pt: "Substituir", sv: "Ersätt", sq: "Zëvendëso",
  },
  "logo.upload": {
    en: "Upload logo", el: "Μεταφόρτωση λογότυπου", de: "Logo hochladen",
    fr: "Téléverser un logo", it: "Carica logo", es: "Subir logo",
    nl: "Logo uploaden", pl: "Prześlij logo", pt: "Carregar logótipo",
    sv: "Ladda upp logotyp", sq: "Ngarko logon",
  },
  "logo.remove": {
    en: "Remove", el: "Αφαίρεση", de: "Entfernen", fr: "Supprimer", it: "Rimuovi",
    es: "Eliminar", nl: "Verwijderen", pl: "Usuń", pt: "Remover", sv: "Ta bort",
    sq: "Hiq",
  },
  "logo.errUpload": {
    en: "Upload failed.", el: "Η μεταφόρτωση απέτυχε.", de: "Upload fehlgeschlagen.",
    fr: "Le téléversement a échoué.", it: "Caricamento fallito.", es: "La subida falló.",
    nl: "Uploaden mislukt.", pl: "Przesyłanie nie powiodło się.",
    pt: "O carregamento falhou.", sv: "Uppladdningen misslyckades.",
    sq: "Ngarkimi dështoi.",
  },
  // ── Media sub-step ──────────────────────────────────────────────────
  "media.eyebrow": {
    en: "Media gallery", el: "Συλλογή πολυμέσων", de: "Mediengalerie",
    fr: "Galerie média", it: "Galleria media", es: "Galería de medios",
    nl: "Mediagalerij", pl: "Galeria multimediów", pt: "Galeria de multimédia",
    sv: "Mediagalleri", sq: "Galeria e medias",
  },
  "media.heading": {
    en: "Your photos", el: "Οι φωτογραφίες σου", de: "Deine Fotos",
    fr: "Tes photos", it: "Le tue foto", es: "Tus fotos", nl: "Je foto's",
    pl: "Twoje zdjęcia", pt: "As tuas fotos", sv: "Dina foton", sq: "Fotot e tua",
  },
  "media.subtext": {
    en: "Upload every photo of your business: interior, team at work, details, storefront. Then hit Distribute and we place them across the homepage, gallery, contact page and more, so your site launches looking finished.",
    el: "Ανέβασε κάθε φωτογραφία της επιχείρησής σου: εσωτερικό, ομάδα στη δουλειά, λεπτομέρειες, βιτρίνα. Μετά πάτα Διανομή και τις τοποθετούμε στην αρχική σελίδα, τη γκαλερί, τη σελίδα επικοινωνίας και αλλού, ώστε ο ιστότοπός σου να ξεκινήσει ολοκληρωμένος.",
    de: "Lade jedes Foto deines Geschäfts hoch: Innenraum, Team bei der Arbeit, Details, Ladenfront. Tippe dann auf Verteilen und wir platzieren sie auf der Startseite, in der Galerie, der Kontaktseite und mehr, sodass deine Website fertig wirkt.",
    fr: "Téléverse chaque photo de ton établissement : intérieur, équipe au travail, détails, devanture. Clique ensuite sur Répartir et nous les plaçons sur la page d'accueil, la galerie, la page de contact et plus encore, pour que ton site démarre déjà abouti.",
    it: "Carica ogni foto della tua attività: interni, team al lavoro, dettagli, vetrina. Poi premi Distribuisci e le posizioniamo nella homepage, nella galleria, nella pagina contatti e altro, così il tuo sito parte già finito.",
    es: "Sube todas las fotos de tu negocio: interior, equipo trabajando, detalles, escaparate. Luego pulsa Distribuir y las colocamos en la página de inicio, la galería, la página de contacto y más, para que tu sitio se lance con aspecto acabado.",
    nl: "Upload elke foto van je zaak: interieur, team aan het werk, details, etalage. Klik daarna op Verdelen en wij plaatsen ze op de homepage, galerij, contactpagina en meer, zodat je site af lijkt bij de lancering.",
    pl: "Prześlij każde zdjęcie swojej firmy: wnętrze, zespół przy pracy, detale, witrynę. Następnie kliknij Rozmieść, a my umieścimy je na stronie głównej, w galerii, na stronie kontaktu i nie tylko, aby twoja strona startowała jako gotowa.",
    pt: "Carrega todas as fotos do teu negócio: interior, equipa a trabalhar, detalhes, montra. Depois prime Distribuir e nós colocamo-las na página inicial, na galeria, na página de contacto e mais, para o teu site arrancar com aspeto acabado.",
    sv: "Ladda upp varje foto av din verksamhet: interiör, teamet i arbete, detaljer, skyltfönster. Tryck sedan på Fördela så placerar vi dem på startsidan, i galleriet, på kontaktsidan och mer, så att din webbplats ser färdig ut vid lansering.",
    sq: "Ngarko çdo foto të biznesit tënd: brendësinë, ekipin në punë, detajet, vitrinën. Pastaj shtyp Shpërndaj dhe ne i vendosim ato në faqen kryesore, galerinë, faqen e kontaktit dhe më shumë, që faqja jote të nisë e përfunduar.",
  },
  "media.galleryEyebrow": {
    en: "Gallery", el: "Γκαλερί", de: "Galerie", fr: "Galerie", it: "Galleria",
    es: "Galería", nl: "Galerij", pl: "Galeria", pt: "Galeria", sv: "Galleri",
    sq: "Galeria",
  },
  "media.photoCountOne": {
    en: "1 photo uploaded", el: "1 φωτογραφία ανέβηκε", de: "1 Foto hochgeladen",
    fr: "1 photo téléversée", it: "1 foto caricata", es: "1 foto subida",
    nl: "1 foto geüpload", pl: "Przesłano 1 zdjęcie", pt: "1 foto carregada",
    sv: "1 foto uppladdat", sq: "1 foto u ngarkua",
  },
  "media.photoCountMany": {
    en: "{n} photos uploaded", el: "{n} φωτογραφίες ανέβηκαν",
    de: "{n} Fotos hochgeladen", fr: "{n} photos téléversées",
    it: "{n} foto caricate", es: "{n} fotos subidas", nl: "{n} foto's geüpload",
    pl: "Przesłano {n} zdjęć", pt: "{n} fotos carregadas",
    sv: "{n} foton uppladdade", sq: "{n} foto u ngarkuan",
  },
  "media.uploading": {
    en: "Uploading…", el: "Μεταφόρτωση…", de: "Wird hochgeladen…",
    fr: "Téléversement…", it: "Caricamento…", es: "Subiendo…",
    nl: "Bezig met uploaden…", pl: "Przesyłanie…", pt: "A carregar…",
    sv: "Laddar upp…", sq: "Po ngarkohet…",
  },
  "media.uploadPhotos": {
    en: "Upload photos", el: "Μεταφόρτωση φωτογραφιών", de: "Fotos hochladen",
    fr: "Téléverser des photos", it: "Carica foto", es: "Subir fotos",
    nl: "Foto's uploaden", pl: "Prześlij zdjęcia", pt: "Carregar fotos",
    sv: "Ladda upp foton", sq: "Ngarko foto",
  },
  "media.removePhoto": {
    en: "Remove photo", el: "Αφαίρεση φωτογραφίας", de: "Foto entfernen",
    fr: "Supprimer la photo", it: "Rimuovi foto", es: "Eliminar foto",
    nl: "Foto verwijderen", pl: "Usuń zdjęcie", pt: "Remover foto",
    sv: "Ta bort foto", sq: "Hiq foton",
  },
  "media.empty": {
    en: "No photos yet. Upload jpg, png or webp, as many as you have.",
    el: "Καμία φωτογραφία ακόμη. Ανέβασε jpg, png ή webp, όσες έχεις.",
    de: "Noch keine Fotos. Lade jpg, png oder webp hoch, so viele du hast.",
    fr: "Aucune photo pour l'instant. Téléverse des jpg, png ou webp, autant que tu en as.",
    it: "Ancora nessuna foto. Carica jpg, png o webp, quante ne hai.",
    es: "Aún no hay fotos. Sube jpg, png o webp, tantas como tengas.",
    nl: "Nog geen foto's. Upload jpg, png of webp, zoveel als je hebt.",
    pl: "Brak zdjęć. Prześlij jpg, png lub webp, ile masz.",
    pt: "Ainda sem fotos. Carrega jpg, png ou webp, tantas quantas tiveres.",
    sv: "Inga foton än. Ladda upp jpg, png eller webp, så många du har.",
    sq: "Ende pa foto. Ngarko jpg, png ose webp, sa të kesh.",
  },
  "media.errUploadOne": {
    en: "1 image failed to upload. The rest are in.",
    el: "1 εικόνα απέτυχε να ανέβει. Οι υπόλοιπες ανέβηκαν.",
    de: "1 Bild konnte nicht hochgeladen werden. Der Rest ist drin.",
    fr: "1 image n'a pas pu être téléversée. Les autres sont importées.",
    it: "1 immagine non è stata caricata. Le altre sono presenti.",
    es: "1 imagen no se pudo subir. El resto está cargado.",
    nl: "1 afbeelding kon niet worden geüpload. De rest staat erin.",
    pl: "Nie udało się przesłać 1 obrazu. Pozostałe zostały dodane.",
    pt: "1 imagem não foi carregada. As restantes estão.",
    sv: "1 bild kunde inte laddas upp. Resten är klara.",
    sq: "1 imazh dështoi të ngarkohej. Pjesa tjetër janë brenda.",
  },
  "media.errUploadMany": {
    en: "{n} images failed to upload. The rest are in.",
    el: "{n} εικόνες απέτυχαν να ανέβουν. Οι υπόλοιπες ανέβηκαν.",
    de: "{n} Bilder konnten nicht hochgeladen werden. Der Rest ist drin.",
    fr: "{n} images n'ont pas pu être téléversées. Les autres sont importées.",
    it: "{n} immagini non sono state caricate. Le altre sono presenti.",
    es: "{n} imágenes no se pudieron subir. El resto está cargado.",
    nl: "{n} afbeeldingen konden niet worden geüpload. De rest staat erin.",
    pl: "Nie udało się przesłać {n} obrazów. Pozostałe zostały dodane.",
    pt: "{n} imagens não foram carregadas. As restantes estão.",
    sv: "{n} bilder kunde inte laddas upp. Resten är klara.",
    sq: "{n} imazhe dështuan të ngarkohen. Pjesa tjetër janë brenda.",
  },
  "media.distributeEyebrow": {
    en: "Distribute", el: "Διανομή", de: "Verteilen", fr: "Répartir",
    it: "Distribuisci", es: "Distribuir", nl: "Verdelen", pl: "Rozmieść",
    pt: "Distribuir", sv: "Fördela", sq: "Shpërndaj",
  },
  "media.distributeHint": {
    en: "Places your photos across the homepage hero, about section, contact page, call-to-action and both galleries. Press it again any time to reshuffle the placement.",
    el: "Τοποθετεί τις φωτογραφίες σου στο hero της αρχικής, την ενότητα σχετικά, τη σελίδα επικοινωνίας, το call-to-action και τις δύο γκαλερί. Πάτα το ξανά όποτε θέλεις για να αναδιατάξεις την τοποθέτηση.",
    de: "Platziert deine Fotos im Startseiten-Hero, im Über-uns-Bereich, auf der Kontaktseite, im Call-to-Action und in beiden Galerien. Drück es jederzeit erneut, um die Platzierung neu zu mischen.",
    fr: "Place tes photos dans le hero de la page d'accueil, la section à propos, la page de contact, l'appel à l'action et les deux galeries. Clique à nouveau quand tu veux pour remélanger la disposition.",
    it: "Posiziona le tue foto nell'hero della homepage, nella sezione chi siamo, nella pagina contatti, nella call-to-action e in entrambe le gallerie. Premi di nuovo quando vuoi per rimescolare la disposizione.",
    es: "Coloca tus fotos en el hero de la página de inicio, la sección sobre nosotros, la página de contacto, la llamada a la acción y ambas galerías. Pulsa de nuevo cuando quieras para reorganizar la colocación.",
    nl: "Plaatst je foto's in de homepage-hero, de over-sectie, de contactpagina, de call-to-action en beide galerijen. Klik er opnieuw op om de plaatsing te herschikken.",
    pl: "Umieszcza twoje zdjęcia w sekcji hero strony głównej, sekcji o nas, na stronie kontaktu, w wezwaniu do działania i obu galeriach. Kliknij ponownie w dowolnym momencie, aby przetasować rozmieszczenie.",
    pt: "Coloca as tuas fotos no hero da página inicial, na secção sobre, na página de contacto, no apelo à ação e nas duas galerias. Prime de novo quando quiseres para reorganizar a colocação.",
    sv: "Placerar dina foton i startsidans hero, om-sektionen, kontaktsidan, uppmaningen och båda gallerierna. Tryck igen när som helst för att blanda om placeringen.",
    sq: "Vendos fotot e tua në hero-n e faqes kryesore, seksionin rreth nesh, faqen e kontaktit, thirrjen për veprim dhe të dyja galeritë. Shtype përsëri kurdo për të rivendosur shpërndarjen.",
  },
  "media.reshuffle": {
    en: "Reshuffle placement", el: "Αναδιάταξη τοποθέτησης",
    de: "Platzierung neu mischen", fr: "Remélanger la disposition",
    it: "Rimescola la disposizione", es: "Reorganizar la colocación",
    nl: "Plaatsing herschikken", pl: "Przetasuj rozmieszczenie",
    pt: "Reorganizar a colocação", sv: "Blanda om placeringen",
    sq: "Rivendos shpërndarjen",
  },
  "media.distribute": {
    en: "Distribute across the site", el: "Διανομή σε όλον τον ιστότοπο",
    de: "Auf der gesamten Website verteilen", fr: "Répartir sur tout le site",
    it: "Distribuisci su tutto il sito", es: "Distribuir por todo el sitio",
    nl: "Over de hele site verdelen", pl: "Rozmieść w całej witrynie",
    pt: "Distribuir por todo o site", sv: "Fördela över hela webbplatsen",
    sq: "Shpërndaj në të gjithë faqen",
  },
  "media.distributed": {
    en: "Photos placed across the homepage, galleries, about and contact. Your site will launch fully illustrated.",
    el: "Οι φωτογραφίες τοποθετήθηκαν στην αρχική σελίδα, τις γκαλερί, τη σελίδα σχετικά και την επικοινωνία. Ο ιστότοπός σου θα ξεκινήσει πλήρως εικονογραφημένος.",
    de: "Fotos auf Startseite, Galerien, Über-uns und Kontakt platziert. Deine Website startet vollständig bebildert.",
    fr: "Photos placées sur la page d'accueil, les galeries, à propos et contact. Ton site démarrera entièrement illustré.",
    it: "Foto posizionate su homepage, gallerie, chi siamo e contatti. Il tuo sito partirà completamente illustrato.",
    es: "Fotos colocadas en la página de inicio, las galerías, sobre nosotros y contacto. Tu sitio se lanzará totalmente ilustrado.",
    nl: "Foto's geplaatst op de homepage, galerijen, over en contact. Je site start volledig geïllustreerd.",
    pl: "Zdjęcia rozmieszczone na stronie głównej, w galeriach, w sekcji o nas i kontakcie. Twoja strona wystartuje w pełni zilustrowana.",
    pt: "Fotos colocadas na página inicial, galerias, sobre e contacto. O teu site arrancará totalmente ilustrado.",
    sv: "Foton placerade på startsidan, gallerierna, om och kontakt. Din webbplats lanseras helt illustrerad.",
    sq: "Fotot u vendosën në faqen kryesore, galeritë, rreth nesh dhe kontaktin. Faqja jote do të niset plotësisht e ilustruar.",
  },
  "media.skipHint": {
    en: "Optional. Skip it and the site launches with neutral stock photos you can swap from the admin later.",
    el: "Προαιρετικό. Παράλειψέ το και ο ιστότοπος ξεκινά με ουδέτερες φωτογραφίες stock που μπορείς να αλλάξεις αργότερα από τη διαχείριση.",
    de: "Optional. Überspring es und die Website startet mit neutralen Stockfotos, die du später im Admin austauschen kannst.",
    fr: "Facultatif. Passe cette étape et le site démarre avec des photos neutres que tu pourras remplacer plus tard depuis l'admin.",
    it: "Facoltativo. Saltalo e il sito parte con foto stock neutre che potrai sostituire più tardi dall'admin.",
    es: "Opcional. Omítelo y el sitio se lanza con fotos de archivo neutras que podrás cambiar más tarde desde el admin.",
    nl: "Optioneel. Sla het over en de site start met neutrale stockfoto's die je later in de admin kunt vervangen.",
    pl: "Opcjonalnie. Pomiń to, a strona wystartuje z neutralnymi zdjęciami stockowymi, które później wymienisz w panelu.",
    pt: "Opcional. Salta-o e o site arranca com fotos neutras de banco que podes trocar mais tarde no admin.",
    sv: "Valfritt. Hoppa över det så startar webbplatsen med neutrala stockfoton som du kan byta senare i adminpanelen.",
    sq: "Opsionale. Kaloje dhe faqja niset me foto neutrale stock që mund t'i ndërrosh më vonë nga admini.",
  },
  // ── Booking rules sub-step ──────────────────────────────────────────
  "booking.eyebrow": {
    en: "Booking rules", el: "Κανόνες κρατήσεων", de: "Buchungsregeln",
    fr: "Règles de réservation", it: "Regole di prenotazione", es: "Reglas de reserva",
    nl: "Boekingsregels", pl: "Zasady rezerwacji", pt: "Regras de reserva",
    sv: "Bokningsregler", sq: "Rregullat e rezervimit",
  },
  "booking.heading": {
    en: "How bookings behave", el: "Πώς λειτουργούν οι κρατήσεις",
    de: "Wie Buchungen funktionieren", fr: "Le fonctionnement des réservations",
    it: "Come funzionano le prenotazioni", es: "Cómo funcionan las reservas",
    nl: "Hoe boekingen werken", pl: "Jak działają rezerwacje",
    pt: "Como funcionam as reservas", sv: "Hur bokningar fungerar",
    sq: "Si funksionojnë rezervimet",
  },
  "booking.subtext": {
    en: "Sensible defaults are filled in. Tune them now or leave them and adjust later from the admin.",
    el: "Έχουν συμπληρωθεί λογικές προεπιλογές. Ρύθμισέ τες τώρα ή άφησέ τες και προσάρμοσέ τες αργότερα από τη διαχείριση.",
    de: "Sinnvolle Standardwerte sind eingetragen. Pass sie jetzt an oder lass sie und ändere sie später im Admin.",
    fr: "Des valeurs par défaut raisonnables sont déjà remplies. Ajuste-les maintenant ou laisse-les et modifie plus tard depuis l'admin.",
    it: "Sono inseriti valori predefiniti sensati. Regolali ora oppure lasciali e modificali più tardi dall'admin.",
    es: "Se han rellenado valores predeterminados razonables. Ajústalos ahora o déjalos y cámbialos más tarde desde el admin.",
    nl: "Verstandige standaardwaarden zijn ingevuld. Pas ze nu aan of laat ze staan en wijzig later in de admin.",
    pl: "Wpisano rozsądne wartości domyślne. Dostosuj je teraz albo zostaw i zmień później w panelu.",
    pt: "Estão preenchidos valores predefinidos sensatos. Ajusta-os agora ou deixa-os e altera mais tarde no admin.",
    sv: "Vettiga standardvärden är ifyllda. Justera dem nu eller låt dem vara och ändra senare i adminpanelen.",
    sq: "Janë plotësuar vlera të arsyeshme parazgjedhje. Rregulloji tani ose lëri dhe përshtati më vonë nga admini.",
  },
  "booking.modeAppointment": {
    en: "Appointments", el: "Ραντεβού", de: "Termine", fr: "Rendez-vous",
    it: "Appuntamenti", es: "Citas", nl: "Afspraken", pl: "Wizyty",
    pt: "Marcações", sv: "Tidsbokningar", sq: "Takime",
  },
  "booking.modeAppointmentDesc": {
    en: "Clients choose a service, a staff member and an open time slot. Best for salons, barbers and studios.",
    el: "Οι πελάτες επιλέγουν υπηρεσία, μέλος προσωπικού και ελεύθερη ώρα. Ιδανικό για κομμωτήρια, μπαρμπέρικα και στούντιο.",
    de: "Kunden wählen eine Leistung, einen Mitarbeiter und einen freien Termin. Ideal für Salons, Barbershops und Studios.",
    fr: "Les clients choisissent une prestation, un membre du personnel et un créneau libre. Idéal pour les salons, barbiers et studios.",
    it: "I clienti scelgono un servizio, un membro dello staff e un orario libero. Ideale per saloni, barbieri e studi.",
    es: "Los clientes eligen un servicio, un miembro del personal y una hora libre. Ideal para salones, barberías y estudios.",
    nl: "Klanten kiezen een dienst, een medewerker en een vrij tijdslot. Ideaal voor salons, kapperszaken en studio's.",
    pl: "Klienci wybierają usługę, pracownika i wolny termin. Najlepsze dla salonów, barberów i studiów.",
    pt: "Os clientes escolhem um serviço, um membro da equipa e um horário livre. Ideal para salões, barbearias e estúdios.",
    sv: "Kunderna väljer en tjänst, en personalmedlem och en ledig tid. Passar salonger, barberare och studior.",
    sq: "Klientët zgjedhin një shërbim, një anëtar stafi dhe një orar të lirë. Ideale për sallone, berberë dhe studio.",
  },
  "booking.modeReservation": {
    en: "Reservations", el: "Κρατήσεις", de: "Reservierungen", fr: "Réservations",
    it: "Prenotazioni", es: "Reservas", nl: "Reserveringen", pl: "Rezerwacje",
    pt: "Reservas", sv: "Reservationer", sq: "Rezervime",
  },
  "booking.modeReservationDesc": {
    en: "Guests book by date, time and party size. Best for restaurants, bars and venues.",
    el: "Οι επισκέπτες κάνουν κράτηση ανά ημερομηνία, ώρα και αριθμό ατόμων. Ιδανικό για εστιατόρια, μπαρ και χώρους εκδηλώσεων.",
    de: "Gäste buchen nach Datum, Uhrzeit und Personenzahl. Ideal für Restaurants, Bars und Veranstaltungsorte.",
    fr: "Les clients réservent par date, heure et nombre de personnes. Idéal pour les restaurants, bars et lieux d'accueil.",
    it: "Gli ospiti prenotano per data, orario e numero di persone. Ideale per ristoranti, bar e locali.",
    es: "Los comensales reservan por fecha, hora y número de personas. Ideal para restaurantes, bares y locales.",
    nl: "Gasten reserveren op datum, tijd en aantal personen. Ideaal voor restaurants, bars en horecazaken.",
    pl: "Goście rezerwują według daty, godziny i liczby osób. Najlepsze dla restauracji, barów i lokali.",
    pt: "Os clientes reservam por data, hora e número de pessoas. Ideal para restaurantes, bares e espaços.",
    sv: "Gäster bokar efter datum, tid och sällskapets storlek. Passar restauranger, barer och lokaler.",
    sq: "Mysafirët rezervojnë sipas datës, orës dhe numrit të personave. Ideale për restorante, bare dhe lokale.",
  },
  "booking.leadTime": {
    en: "Lead time before a slot", el: "Χρόνος προειδοποίησης πριν από μια ώρα",
    de: "Vorlaufzeit vor einem Termin", fr: "Délai avant un créneau",
    it: "Anticipo prima di uno slot", es: "Antelación antes de una franja",
    nl: "Voorbereidingstijd vóór een slot", pl: "Czas wyprzedzenia przed terminem",
    pt: "Antecedência antes de uma vaga", sv: "Framförhållning före en tid",
    sq: "Koha paraprake para një orari",
  },
  "booking.cancelWindow": {
    en: "Free cancellation window", el: "Παράθυρο δωρεάν ακύρωσης",
    de: "Kostenloses Stornofenster", fr: "Délai d'annulation gratuite",
    it: "Finestra di cancellazione gratuita", es: "Margen de cancelación gratuita",
    nl: "Gratis annuleringsvenster", pl: "Okno bezpłatnej anulacji",
    pt: "Janela de cancelamento gratuito", sv: "Fönster för gratis avbokning",
    sq: "Dritarja e anulimit falas",
  },
  "booking.deposit": {
    en: "Deposit on booking", el: "Προκαταβολή στην κράτηση",
    de: "Anzahlung bei Buchung", fr: "Acompte à la réservation",
    it: "Acconto alla prenotazione", es: "Depósito al reservar",
    nl: "Aanbetaling bij boeking", pl: "Zaliczka przy rezerwacji",
    pt: "Depósito na reserva", sv: "Deposition vid bokning",
    sq: "Depozitë në rezervim",
  },
  "booking.noShowFee": {
    en: "No-show / late-cancel fee", el: "Χρέωση μη εμφάνισης / καθυστερημένης ακύρωσης",
    de: "Gebühr bei Nichterscheinen / Spätstorno", fr: "Frais d'absence / annulation tardive",
    it: "Penale per assenza / cancellazione tardiva", es: "Tarifa por ausencia / cancelación tardía",
    nl: "Kosten voor no-show / late annulering", pl: "Opłata za nieobecność / późną anulację",
    pt: "Taxa de ausência / cancelamento tardio", sv: "Avgift för utebliven / sen avbokning",
    sq: "Tarifa për mosparaqitje / anulim të vonë",
  },
  "unit.minutes": {
    en: "minutes", el: "λεπτά", de: "Minuten", fr: "minutes", it: "minuti",
    es: "minutos", nl: "minuten", pl: "minut", pt: "minutos", sv: "minuter",
    sq: "minuta",
  },
  "unit.hours": {
    en: "hours", el: "ώρες", de: "Stunden", fr: "heures", it: "ore",
    es: "horas", nl: "uur", pl: "godzin", pt: "horas", sv: "timmar", sq: "orë",
  },
  // ── Analytics sub-step ──────────────────────────────────────────────
  "analytics.eyebrow": {
    en: "Analytics", el: "Analytics", de: "Analytics", fr: "Analytique",
    it: "Analytics", es: "Analítica", nl: "Analytics", pl: "Analityka",
    pt: "Análises", sv: "Analys", sq: "Analitika",
  },
  "analytics.heading": {
    en: "Measure your traffic", el: "Μέτρησε την επισκεψιμότητά σου",
    de: "Miss deinen Traffic", fr: "Mesure ton trafic",
    it: "Misura il tuo traffico", es: "Mide tu tráfico",
    nl: "Meet je verkeer", pl: "Mierz swój ruch",
    pt: "Mede o teu tráfego", sv: "Mät din trafik", sq: "Mat trafikun tënd",
  },
  "analytics.subtext": {
    en: "Optional. Paste IDs if you have them. Tracking only fires once a visitor accepts the cookie banner. Skip this and add them later from the admin.",
    el: "Προαιρετικό. Επικόλλησε IDs αν τα έχεις. Η παρακολούθηση ενεργοποιείται μόνο όταν ένας επισκέπτης αποδεχτεί το banner cookies. Παράλειψέ το και πρόσθεσέ τα αργότερα από τη διαχείριση.",
    de: "Optional. Füge IDs ein, falls du welche hast. Tracking startet erst, wenn ein Besucher das Cookie-Banner akzeptiert. Überspring das und füge sie später im Admin hinzu.",
    fr: "Facultatif. Colle les identifiants si tu en as. Le suivi ne se déclenche qu'une fois le bandeau de cookies accepté. Passe cette étape et ajoute-les plus tard depuis l'admin.",
    it: "Facoltativo. Incolla gli ID se li hai. Il tracciamento parte solo quando un visitatore accetta il banner dei cookie. Salta questo passaggio e aggiungili più tardi dall'admin.",
    es: "Opcional. Pega los ID si los tienes. El seguimiento solo se activa cuando un visitante acepta el aviso de cookies. Omite esto y añádelos más tarde desde el admin.",
    nl: "Optioneel. Plak ID's als je ze hebt. Tracking start pas zodra een bezoeker de cookiebanner accepteert. Sla dit over en voeg ze later toe in de admin.",
    pl: "Opcjonalnie. Wklej identyfikatory, jeśli je masz. Śledzenie uruchamia się dopiero, gdy odwiedzający zaakceptuje baner plików cookie. Pomiń to i dodaj je później w panelu.",
    pt: "Opcional. Cola os IDs se os tiveres. O rastreio só dispara quando um visitante aceita o aviso de cookies. Salta isto e adiciona-os mais tarde no admin.",
    sv: "Valfritt. Klistra in ID:n om du har dem. Spårning startar först när en besökare godkänner cookiebannern. Hoppa över detta och lägg till dem senare i adminpanelen.",
    sq: "Opsionale. Ngjit ID-të nëse i ke. Gjurmimi nis vetëm kur një vizitor pranon banerin e cookie-ve. Kaloje këtë dhe shtoji më vonë nga admini.",
  },
  "analytics.ga4": {
    en: "Google Analytics 4 (Measurement ID)",
    el: "Google Analytics 4 (ID μέτρησης)",
    de: "Google Analytics 4 (Mess-ID)",
    fr: "Google Analytics 4 (identifiant de mesure)",
    it: "Google Analytics 4 (ID di misurazione)",
    es: "Google Analytics 4 (ID de medición)",
    nl: "Google Analytics 4 (meet-ID)",
    pl: "Google Analytics 4 (identyfikator pomiaru)",
    pt: "Google Analytics 4 (ID de medição)",
    sv: "Google Analytics 4 (mät-ID)",
    sq: "Google Analytics 4 (ID-ja e matjes)",
  },
  "analytics.gtm": {
    en: "Google Tag Manager (Container ID)",
    el: "Google Tag Manager (ID κοντέινερ)",
    de: "Google Tag Manager (Container-ID)",
    fr: "Google Tag Manager (identifiant de conteneur)",
    it: "Google Tag Manager (ID contenitore)",
    es: "Google Tag Manager (ID de contenedor)",
    nl: "Google Tag Manager (container-ID)",
    pl: "Google Tag Manager (identyfikator kontenera)",
    pt: "Google Tag Manager (ID do contentor)",
    sv: "Google Tag Manager (container-ID)",
    sq: "Google Tag Manager (ID-ja e kontejnerit)",
  },
  "analytics.metaPixel": {
    en: "Meta Pixel ID", el: "ID Meta Pixel", de: "Meta-Pixel-ID",
    fr: "Identifiant Meta Pixel", it: "ID Meta Pixel", es: "ID de Meta Pixel",
    nl: "Meta Pixel-ID", pl: "Identyfikator Meta Pixel", pt: "ID do Meta Pixel",
    sv: "Meta Pixel-ID", sq: "ID-ja e Meta Pixel",
  },
  // ── Team sub-step ───────────────────────────────────────────────────
  "team.eyebrow": {
    en: "Team", el: "Ομάδα", de: "Team", fr: "Équipe", it: "Team",
    es: "Equipo", nl: "Team", pl: "Zespół", pt: "Equipa", sv: "Team", sq: "Ekipi",
  },
  "team.heading": {
    en: "Invite your staff", el: "Προσκάλεσε το προσωπικό σου",
    de: "Lade dein Personal ein", fr: "Invite ton personnel",
    it: "Invita il tuo staff", es: "Invita a tu personal",
    nl: "Nodig je personeel uit", pl: "Zaproś swój personel",
    pt: "Convida a tua equipa", sv: "Bjud in din personal", sq: "Fto stafin tënd",
  },
  "team.subtext": {
    en: "Optional. Add staff emails now and each receives a password-set link on first login. You can always invite more from the admin.",
    el: "Προαιρετικό. Πρόσθεσε emails προσωπικού τώρα και ο καθένας λαμβάνει σύνδεσμο ορισμού κωδικού στην πρώτη σύνδεση. Μπορείς πάντα να προσκαλέσεις κι άλλους από τη διαχείριση.",
    de: "Optional. Füge jetzt Mitarbeiter-E-Mails hinzu, jeder erhält bei der ersten Anmeldung einen Link zum Passwort festlegen. Du kannst jederzeit weitere im Admin einladen.",
    fr: "Facultatif. Ajoute les e-mails du personnel maintenant et chacun reçoit un lien pour définir un mot de passe à la première connexion. Tu peux toujours en inviter d'autres depuis l'admin.",
    it: "Facoltativo. Aggiungi ora le email dello staff e ognuno riceve un link per impostare la password al primo accesso. Puoi sempre invitarne altri dall'admin.",
    es: "Opcional. Añade ahora los correos del personal y cada uno recibe un enlace para crear una contraseña en el primer inicio de sesión. Siempre puedes invitar a más desde el admin.",
    nl: "Optioneel. Voeg nu personeels-e-mails toe; iedereen krijgt bij de eerste login een link om een wachtwoord in te stellen. Je kunt altijd meer mensen uitnodigen via de admin.",
    pl: "Opcjonalnie. Dodaj teraz adresy e-mail pracowników, a każdy otrzyma link do ustawienia hasła przy pierwszym logowaniu. Zawsze możesz zaprosić kolejnych z panelu.",
    pt: "Opcional. Adiciona agora os emails da equipa e cada um recebe um link para definir a palavra-passe no primeiro acesso. Podes sempre convidar mais no admin.",
    sv: "Valfritt. Lägg till personalens e-postadresser nu, var och en får en länk för att skapa lösenord vid första inloggningen. Du kan alltid bjuda in fler i adminpanelen.",
    sq: "Opsionale. Shto tani emailet e stafit dhe secili merr një lidhje për të vendosur fjalëkalimin në hyrjen e parë. Gjithmonë mund të ftosh të tjerë nga admini.",
  },
  "team.teammates": {
    en: "Teammates", el: "Συνεργάτες", de: "Teammitglieder", fr: "Coéquipiers",
    it: "Membri del team", es: "Compañeros", nl: "Teamleden", pl: "Członkowie zespołu",
    pt: "Colegas de equipa", sv: "Teammedlemmar", sq: "Anëtarët e ekipit",
  },
  "team.placeholder": {
    en: "staff@yourdomain.com", el: "prosopiko@todomainsou.com",
    de: "personal@deinedomain.com", fr: "personnel@tondomaine.com",
    it: "staff@tuodominio.com", es: "personal@tudominio.com",
    nl: "personeel@jouwdomein.com", pl: "personel@twojadomena.com",
    pt: "equipa@teudominio.com", sv: "personal@dindoman.com",
    sq: "stafi@domeniyt.com",
  },
  "team.add": {
    en: "Add", el: "Προσθήκη", de: "Hinzufügen", fr: "Ajouter", it: "Aggiungi",
    es: "Añadir", nl: "Toevoegen", pl: "Dodaj", pt: "Adicionar", sv: "Lägg till",
    sq: "Shto",
  },
  // ── Demo basics step ────────────────────────────────────────────────
  "basics.eyebrow": {
    en: "The essentials", el: "Τα βασικά", de: "Das Wesentliche",
    fr: "L'essentiel", it: "Gli essenziali", es: "Lo esencial",
    nl: "De essentie", pl: "Najważniejsze", pt: "O essencial",
    sv: "Det väsentliga", sq: "Thelbësoret",
  },
  "basics.heading": {
    en: "Make it yours", el: "Κάν' το δικό σου", de: "Mach es zu deinem",
    fr: "Personnalise-le", it: "Rendilo tuo", es: "Hazlo tuyo",
    nl: "Maak het van jou", pl: "Spersonalizuj je",
    pt: "Torna-o teu", sv: "Gör det till ditt", sq: "Bëje tëndin",
  },
  "basics.subtext": {
    en: "Your site ships pre-filled with demo content you can explore right away. We just need a few things that must be yours. Everything else is editable from the admin.",
    el: "Ο ιστότοπός σου έρχεται προγεμισμένος με δοκιμαστικό περιεχόμενο που μπορείς να εξερευνήσεις αμέσως. Χρειαζόμαστε μόνο λίγα πράγματα που πρέπει να είναι δικά σου. Όλα τα υπόλοιπα είναι επεξεργάσιμα από τη διαχείριση.",
    de: "Deine Website kommt vorbefüllt mit Demo-Inhalten, die du sofort erkunden kannst. Wir brauchen nur ein paar Dinge, die deine sein müssen. Alles andere ist im Admin bearbeitbar.",
    fr: "Ton site est livré pré-rempli avec du contenu de démo que tu peux explorer tout de suite. Il nous faut juste quelques éléments qui doivent être les tiens. Tout le reste est modifiable depuis l'admin.",
    it: "Il tuo sito arriva precompilato con contenuti demo che puoi esplorare subito. Ci servono solo alcune cose che devono essere tue. Tutto il resto è modificabile dall'admin.",
    es: "Tu sitio viene precargado con contenido de demostración que puedes explorar de inmediato. Solo necesitamos unas pocas cosas que deben ser tuyas. Todo lo demás se edita desde el admin.",
    nl: "Je site komt vooraf gevuld met demo-inhoud die je meteen kunt verkennen. We hebben alleen een paar dingen nodig die van jou moeten zijn. De rest is bewerkbaar in de admin.",
    pl: "Twoja strona jest wstępnie wypełniona treścią demonstracyjną, którą możesz od razu przeglądać. Potrzebujemy tylko kilku rzeczy, które muszą być twoje. Wszystko inne można edytować w panelu.",
    pt: "O teu site vem pré-preenchido com conteúdo de demonstração que podes explorar já. Só precisamos de algumas coisas que têm de ser tuas. Tudo o resto é editável no admin.",
    sv: "Din webbplats levereras förfylld med demoinnehåll som du kan utforska direkt. Vi behöver bara några saker som måste vara dina. Allt annat går att redigera i adminpanelen.",
    sq: "Faqja jote vjen e parambushur me përmbajtje demo që mund ta eksplorosh menjëherë. Na duhen vetëm pak gjëra që duhet të jenë të tuat. Gjithçka tjetër mund të redaktohet nga admini.",
  },
  "basics.tzHint": {
    en: "Every booking slot and reminder is rendered in this zone. Pick where the shop physically is.",
    el: "Κάθε ώρα κράτησης και υπενθύμιση εμφανίζεται σε αυτή τη ζώνη. Διάλεξε πού βρίσκεται φυσικά το κατάστημα.",
    de: "Jeder Buchungstermin und jede Erinnerung wird in dieser Zone angezeigt. Wähle, wo der Laden physisch ist.",
    fr: "Chaque créneau de réservation et chaque rappel s'affiche dans ce fuseau. Choisis l'emplacement physique du salon.",
    it: "Ogni slot di prenotazione e promemoria viene mostrato in questo fuso. Scegli dove si trova fisicamente il negozio.",
    es: "Cada franja de reserva y recordatorio se muestra en esta zona. Elige dónde está físicamente el local.",
    nl: "Elk boekingsslot en elke herinnering wordt in deze zone weergegeven. Kies waar de zaak fysiek staat.",
    pl: "Każdy termin rezerwacji i przypomnienie są wyświetlane w tej strefie. Wybierz, gdzie fizycznie znajduje się lokal.",
    pt: "Cada vaga de reserva e lembrete é apresentada neste fuso. Escolhe onde o espaço está fisicamente.",
    sv: "Varje bokningstid och påminnelse visas i denna zon. Välj var salongen fysiskt ligger.",
    sq: "Çdo orar rezervimi dhe kujtesë shfaqet në këtë zonë. Zgjidh ku ndodhet fizikisht dyqani.",
  },
  // ── Review step ─────────────────────────────────────────────────────
  "review.stepOf": {
    en: "Step {n} of {n}", el: "Βήμα {n} από {n}", de: "Schritt {n} von {n}",
    fr: "Étape {n} sur {n}", it: "Passo {n} di {n}", es: "Paso {n} de {n}",
    nl: "Stap {n} van {n}", pl: "Krok {n} z {n}", pt: "Passo {n} de {n}",
    sv: "Steg {n} av {n}", sq: "Hapi {n} nga {n}",
  },
  "review.heading": {
    en: "Review and install", el: "Έλεγχος και εγκατάσταση",
    de: "Überprüfen und installieren", fr: "Vérifier et installer",
    it: "Rivedi e installa", es: "Revisar e instalar",
    nl: "Controleren en installeren", pl: "Przejrzyj i zainstaluj",
    pt: "Rever e instalar", sv: "Granska och installera",
    sq: "Rishiko dhe instalo",
  },
  "review.subtext": {
    en: "Double-check, then we'll provision everything.",
    el: "Έλεγξε ξανά και μετά θα ρυθμίσουμε τα πάντα.",
    de: "Prüf alles noch einmal, dann richten wir alles ein.",
    fr: "Vérifie une dernière fois, puis nous configurons tout.",
    it: "Ricontrolla, poi configureremo tutto.",
    es: "Vuelve a comprobarlo y luego lo configuraremos todo.",
    nl: "Controleer alles nog eens, daarna richten wij alles in.",
    pl: "Sprawdź jeszcze raz, a my wszystko skonfigurujemy.",
    pt: "Confere mais uma vez e depois configuramos tudo.",
    sv: "Dubbelkolla, sedan ställer vi in allt.",
    sq: "Kontrollo edhe një herë, pastaj ne do të konfigurojmë gjithçka.",
  },
  "review.cardLicense": {
    en: "License", el: "Άδεια", de: "Lizenz", fr: "Licence", it: "Licenza",
    es: "Licencia", nl: "Licentie", pl: "Licencja", pt: "Licença", sv: "Licens",
    sq: "Licenca",
  },
  "review.licensedTo": {
    en: "Licensed to {name}", el: "Αδειοδοτημένο στον/στην {name}",
    de: "Lizenziert für {name}", fr: "Sous licence de {name}",
    it: "Concesso in licenza a {name}", es: "Con licencia para {name}",
    nl: "Gelicentieerd aan {name}", pl: "Licencja dla {name}",
    pt: "Licenciado a {name}", sv: "Licensierad till {name}",
    sq: "I licencuar për {name}",
  },
  "review.licenseVerified": {
    en: "License verified", el: "Η άδεια επαληθεύτηκε", de: "Lizenz bestätigt",
    fr: "Licence vérifiée", it: "Licenza verificata", es: "Licencia verificada",
    nl: "Licentie geverifieerd", pl: "Licencja zweryfikowana",
    pt: "Licença verificada", sv: "Licensen verifierad", sq: "Licenca u verifikua",
  },
  "review.licenseHint": {
    en: "Stored in settings.json after install",
    el: "Αποθηκεύεται στο settings.json μετά την εγκατάσταση",
    de: "Wird nach der Installation in settings.json gespeichert",
    fr: "Stocké dans settings.json après l'installation",
    it: "Salvato in settings.json dopo l'installazione",
    es: "Se guarda en settings.json tras la instalación",
    nl: "Opgeslagen in settings.json na installatie",
    pl: "Zapisywane w settings.json po instalacji",
    pt: "Guardado em settings.json após a instalação",
    sv: "Lagras i settings.json efter installationen",
    sq: "Ruhet në settings.json pas instalimit",
  },
  "review.cardStart": {
    en: "Starting point", el: "Σημείο εκκίνησης", de: "Ausgangspunkt",
    fr: "Point de départ", it: "Punto di partenza", es: "Punto de partida",
    nl: "Startpunt", pl: "Punkt startowy", pt: "Ponto de partida",
    sv: "Utgångspunkt", sq: "Pika e nisjes",
  },
  "review.exampleSalon": {
    en: "Example salon", el: "Παράδειγμα σαλονιού", de: "Beispielsalon",
    fr: "Salon d'exemple", it: "Salone di esempio", es: "Salón de ejemplo",
    nl: "Voorbeeldsalon", pl: "Przykładowy salon", pt: "Salão de exemplo",
    sv: "Exempelsalong", sq: "Salon shembull",
  },
  "review.exampleHint": {
    en: "Services, staff, blog, products pre-loaded. Edit from admin.",
    el: "Υπηρεσίες, προσωπικό, blog, προϊόντα προφορτωμένα. Επεξεργασία από τη διαχείριση.",
    de: "Leistungen, Personal, Blog, Produkte vorgeladen. Im Admin bearbeiten.",
    fr: "Services, personnel, blog, produits préchargés. Modifie depuis l'admin.",
    it: "Servizi, staff, blog, prodotti precaricati. Modifica dall'admin.",
    es: "Servicios, personal, blog y productos precargados. Edita desde el admin.",
    nl: "Diensten, personeel, blog en producten vooraf geladen. Bewerk via de admin.",
    pl: "Usługi, personel, blog i produkty wstępnie załadowane. Edytuj w panelu.",
    pt: "Serviços, equipa, blog e produtos pré-carregados. Edita no admin.",
    sv: "Tjänster, personal, blogg och produkter förinlästa. Redigera i adminpanelen.",
    sq: "Shërbime, staf, blog, produkte të parangarkuara. Redakto nga admini.",
  },
  "review.freshStart": {
    en: "Fresh start", el: "Φρέσκο ξεκίνημα", de: "Frischer Start",
    fr: "Nouveau départ", it: "Partenza pulita", es: "Inicio desde cero",
    nl: "Verse start", pl: "Świeży start", pt: "Início do zero",
    sv: "Ny start", sq: "Fillim i ri",
  },
  "review.freshHint": {
    en: "Blank catalogue. Build your own from the admin.",
    el: "Κενός κατάλογος. Φτιάξε τον δικό σου από τη διαχείριση.",
    de: "Leerer Katalog. Erstell deinen eigenen im Admin.",
    fr: "Catalogue vierge. Crée le tien depuis l'admin.",
    it: "Catalogo vuoto. Crea il tuo dall'admin.",
    es: "Catálogo en blanco. Crea el tuyo desde el admin.",
    nl: "Lege catalogus. Bouw je eigen via de admin.",
    pl: "Pusty katalog. Zbuduj własny w panelu.",
    pt: "Catálogo em branco. Cria o teu no admin.",
    sv: "Tom katalog. Bygg din egen i adminpanelen.",
    sq: "Katalog bosh. Ndërto tëndin nga admini.",
  },
  "review.cardTemplate": {
    en: "Template", el: "Πρότυπο", de: "Vorlage", fr: "Modèle", it: "Modello",
    es: "Plantilla", nl: "Sjabloon", pl: "Szablon", pt: "Modelo", sv: "Mall",
    sq: "Shablloni",
  },
  "review.cardBusiness": {
    en: "Business", el: "Επιχείρηση", de: "Unternehmen", fr: "Entreprise",
    it: "Attività", es: "Negocio", nl: "Bedrijf", pl: "Firma", pt: "Negócio",
    sv: "Företag", sq: "Biznesi",
  },
  "review.cardAdminLogin": {
    en: "Admin login", el: "Σύνδεση διαχειριστή", de: "Admin-Anmeldung",
    fr: "Connexion admin", it: "Accesso admin", es: "Inicio de sesión de admin",
    nl: "Beheerderslogin", pl: "Logowanie administratora", pt: "Início de sessão de admin",
    sv: "Admininloggning", sq: "Hyrja e administratorit",
  },
  "review.adminHint": {
    en: "Sign in at /admin after install",
    el: "Σύνδεση στο /admin μετά την εγκατάσταση",
    de: "Nach der Installation unter /admin anmelden",
    fr: "Connexion sur /admin après l'installation",
    it: "Accedi su /admin dopo l'installazione",
    es: "Inicia sesión en /admin tras la instalación",
    nl: "Log na installatie in op /admin",
    pl: "Zaloguj się w /admin po instalacji",
    pt: "Inicia sessão em /admin após a instalação",
    sv: "Logga in på /admin efter installationen",
    sq: "Hyr në /admin pas instalimit",
  },
  "review.teammatesOne": {
    en: "+ 1 teammate invited", el: "+ 1 συνεργάτης προσκλήθηκε",
    de: "+ 1 Teammitglied eingeladen", fr: "+ 1 coéquipier invité",
    it: "+ 1 membro del team invitato", es: "+ 1 compañero invitado",
    nl: "+ 1 teamlid uitgenodigd", pl: "+ 1 zaproszony członek zespołu",
    pt: "+ 1 colega de equipa convidado", sv: "+ 1 teammedlem inbjuden",
    sq: "+ 1 anëtar ekipi i ftuar",
  },
  "review.teammatesMany": {
    en: "+ {n} teammates invited", el: "+ {n} συνεργάτες προσκλήθηκαν",
    de: "+ {n} Teammitglieder eingeladen", fr: "+ {n} coéquipiers invités",
    it: "+ {n} membri del team invitati", es: "+ {n} compañeros invitados",
    nl: "+ {n} teamleden uitgenodigd", pl: "+ {n} zaproszonych członków zespołu",
    pt: "+ {n} colegas de equipa convidados", sv: "+ {n} teammedlemmar inbjudna",
    sq: "+ {n} anëtarë ekipi të ftuar",
  },
  "review.cardTimezone": {
    en: "Timezone", el: "Ζώνη ώρας", de: "Zeitzone", fr: "Fuseau horaire",
    it: "Fuso orario", es: "Zona horaria", nl: "Tijdzone", pl: "Strefa czasowa",
    pt: "Fuso horário", sv: "Tidszon", sq: "Zona orare",
  },
  "review.timezoneHint": {
    en: "All booking slots & reminders rendered in this zone",
    el: "Όλες οι ώρες κρατήσεων και υπενθυμίσεις εμφανίζονται σε αυτή τη ζώνη",
    de: "Alle Buchungstermine und Erinnerungen werden in dieser Zone angezeigt",
    fr: "Tous les créneaux de réservation et rappels sont affichés dans ce fuseau",
    it: "Tutti gli slot di prenotazione e i promemoria sono mostrati in questo fuso",
    es: "Todas las franjas de reserva y recordatorios se muestran en esta zona",
    nl: "Alle boekingsslots en herinneringen worden in deze zone weergegeven",
    pl: "Wszystkie terminy rezerwacji i przypomnienia są wyświetlane w tej strefie",
    pt: "Todas as vagas de reserva e lembretes são apresentados neste fuso",
    sv: "Alla bokningstider och påminnelser visas i denna zon",
    sq: "Të gjitha oraret e rezervimit dhe kujtesat shfaqen në këtë zonë",
  },
  "review.cardHours": {
    en: "Opening hours", el: "Ώρες λειτουργίας", de: "Öffnungszeiten",
    fr: "Horaires d'ouverture", it: "Orari di apertura", es: "Horario de apertura",
    nl: "Openingstijden", pl: "Godziny otwarcia", pt: "Horário de funcionamento",
    sv: "Öppettider", sq: "Oraret e hapjes",
  },
  "review.closed": {
    en: "closed", el: "κλειστά", de: "geschlossen", fr: "fermé", it: "chiuso",
    es: "cerrado", nl: "gesloten", pl: "zamknięte", pt: "fechado", sv: "stängt",
    sq: "mbyllur",
  },
  "review.cardBrand": {
    en: "Brand", el: "Επωνυμία", de: "Marke", fr: "Marque", it: "Brand",
    es: "Marca", nl: "Merk", pl: "Marka", pt: "Marca", sv: "Varumärke", sq: "Marka",
  },
  "review.logoSet": {
    en: "Logo set", el: "Λογότυπο ορίστηκε", de: "Logo festgelegt",
    fr: "Logo défini", it: "Logo impostato", es: "Logo establecido",
    nl: "Logo ingesteld", pl: "Logo ustawione", pt: "Logótipo definido",
    sv: "Logotyp inställd", sq: "Logoja u vendos",
  },
  "review.priceRange": {
    en: "Price range {range}", el: "Εύρος τιμών {range}",
    de: "Preisklasse {range}", fr: "Gamme de prix {range}",
    it: "Fascia di prezzo {range}", es: "Rango de precios {range}",
    nl: "Prijsklasse {range}", pl: "Przedział cenowy {range}",
    pt: "Faixa de preços {range}", sv: "Prisklass {range}",
    sq: "Diapazoni i çmimeve {range}",
  },
  "review.cardBookingRules": {
    en: "Booking rules", el: "Κανόνες κρατήσεων", de: "Buchungsregeln",
    fr: "Règles de réservation", it: "Regole di prenotazione", es: "Reglas de reserva",
    nl: "Boekingsregels", pl: "Zasady rezerwacji", pt: "Regras de reserva",
    sv: "Bokningsregler", sq: "Rregullat e rezervimit",
  },
  "review.modeAppointment": {
    en: "Appointments", el: "Ραντεβού", de: "Termine", fr: "Rendez-vous",
    it: "Appuntamenti", es: "Citas", nl: "Afspraken", pl: "Wizyty",
    pt: "Marcações", sv: "Tidsbokningar", sq: "Takime",
  },
  "review.modeReservation": {
    en: "Reservations", el: "Κρατήσεις", de: "Reservierungen", fr: "Réservations",
    it: "Prenotazioni", es: "Reservas", nl: "Reserveringen", pl: "Rezerwacje",
    pt: "Reservas", sv: "Reservationer", sq: "Rezervime",
  },
  "review.bookingSummary": {
    en: "{lead}m lead · {cancel}h free cancel",
    el: "{lead} λεπτά προειδοποίηση · {cancel} ώρες δωρεάν ακύρωση",
    de: "{lead} Min. Vorlauf · {cancel} Std. kostenlose Stornierung",
    fr: "{lead} min de délai · {cancel} h d'annulation gratuite",
    it: "{lead} min di anticipo · {cancel} h cancellazione gratuita",
    es: "{lead} min de antelación · {cancel} h cancelación gratuita",
    nl: "{lead} min voorbereiding · {cancel} u gratis annuleren",
    pl: "{lead} min wyprzedzenia · {cancel} h darmowej anulacji",
    pt: "{lead} min de antecedência · {cancel} h cancelamento gratuito",
    sv: "{lead} min framförhållning · {cancel} h gratis avbokning",
    sq: "{lead} min paraprakisht · {cancel} orë anulim falas",
  },
  "review.depositSuffix": {
    en: " · {pct}% deposit", el: " · {pct}% προκαταβολή",
    de: " · {pct}% Anzahlung", fr: " · {pct}% d'acompte",
    it: " · {pct}% di acconto", es: " · {pct}% de depósito",
    nl: " · {pct}% aanbetaling", pl: " · {pct}% zaliczki",
    pt: " · {pct}% de depósito", sv: " · {pct}% deposition",
    sq: " · {pct}% depozitë",
  },
  "review.cardSocial": {
    en: "Social", el: "Κοινωνικά δίκτυα", de: "Social Media", fr: "Réseaux sociaux",
    it: "Social", es: "Redes sociales", nl: "Social media", pl: "Media społecznościowe",
    pt: "Redes sociais", sv: "Sociala medier", sq: "Rrjetet sociale",
  },
  "review.cardAnalytics": {
    en: "Analytics", el: "Analytics", de: "Analytics", fr: "Analytique",
    it: "Analytics", es: "Analítica", nl: "Analytics", pl: "Analityka",
    pt: "Análises", sv: "Analys", sq: "Analitika",
  },
  "review.installLaunch": {
    en: "Install & launch", el: "Εγκατάσταση & εκκίνηση",
    de: "Installieren & starten", fr: "Installer et lancer",
    it: "Installa e avvia", es: "Instalar y lanzar",
    nl: "Installeren & lanceren", pl: "Zainstaluj i uruchom",
    pt: "Instalar e lançar", sv: "Installera & starta",
    sq: "Instalo & nis",
  },
  "review.installing": {
    en: "Installing…", el: "Εγκατάσταση…", de: "Wird installiert…",
    fr: "Installation…", it: "Installazione…", es: "Instalando…",
    nl: "Bezig met installeren…", pl: "Instalowanie…", pt: "A instalar…",
    sv: "Installerar…", sq: "Po instalohet…",
  },
  // ── Install log ─────────────────────────────────────────────────────
  "install.logTitle": {
    en: "Install log", el: "Αρχείο εγκατάστασης", de: "Installationsprotokoll",
    fr: "Journal d'installation", it: "Log di installazione", es: "Registro de instalación",
    nl: "Installatielogboek", pl: "Dziennik instalacji", pt: "Registo de instalação",
    sv: "Installationslogg", sq: "Regjistri i instalimit",
  },
  "install.starting": {
    en: "Starting…", el: "Εκκίνηση…", de: "Wird gestartet…", fr: "Démarrage…",
    it: "Avvio…", es: "Iniciando…", nl: "Bezig met starten…", pl: "Uruchamianie…",
    pt: "A iniciar…", sv: "Startar…", sq: "Po niset…",
  },
  "install.working": {
    en: "Working…", el: "Σε εξέλιξη…", de: "In Arbeit…", fr: "En cours…",
    it: "In corso…", es: "Trabajando…", nl: "Bezig…", pl: "Trwa praca…",
    pt: "A trabalhar…", sv: "Arbetar…", sq: "Po punohet…",
  },
  "install.unpacking": {
    en: "Unpacking {name} bundle", el: "Αποσυμπίεση πακέτου {name}",
    de: "{name}-Bundle wird entpackt", fr: "Décompression du pack {name}",
    it: "Estrazione del pacchetto {name}", es: "Descomprimiendo el paquete {name}",
    nl: "{name}-pakket wordt uitgepakt", pl: "Rozpakowywanie pakietu {name}",
    pt: "A descompactar o pacote {name}", sv: "Packar upp {name}-paketet",
    sq: "Po shpaketohet paketa {name}",
  },
  "install.applyingTheme": {
    en: "Applying theme {theme} · typography",
    el: "Εφαρμογή θέματος {theme} · τυπογραφία",
    de: "Design {theme} wird angewendet · Typografie",
    fr: "Application du thème {theme} · typographie",
    it: "Applicazione del tema {theme} · tipografia",
    es: "Aplicando el tema {theme} · tipografía",
    nl: "Thema {theme} wordt toegepast · typografie",
    pl: "Stosowanie motywu {theme} · typografia",
    pt: "A aplicar o tema {theme} · tipografia",
    sv: "Tillämpar temat {theme} · typografi",
    sq: "Po zbatohet tema {theme} · tipografia",
  },
  "install.creatingAdmin": {
    en: "Creating admin account ({email})",
    el: "Δημιουργία λογαριασμού διαχειριστή ({email})",
    de: "Admin-Konto wird erstellt ({email})",
    fr: "Création du compte administrateur ({email})",
    it: "Creazione dell'account amministratore ({email})",
    es: "Creando la cuenta de administrador ({email})",
    nl: "Beheerdersaccount wordt aangemaakt ({email})",
    pl: "Tworzenie konta administratora ({email})",
    pt: "A criar a conta de administrador ({email})",
    sv: "Skapar administratörskonto ({email})",
    sq: "Po krijohet llogaria e administratorit ({email})",
  },
  "install.signingIn": {
    en: "Signing you in", el: "Σύνδεση σε εξέλιξη", de: "Du wirst angemeldet",
    fr: "Connexion en cours", it: "Accesso in corso", es: "Iniciando tu sesión",
    nl: "Je wordt aangemeld", pl: "Logowanie", pt: "A iniciar a tua sessão",
    sv: "Loggar in dig", sq: "Po të kyçim",
  },
  "install.errFailed": {
    en: "Install failed", el: "Η εγκατάσταση απέτυχε", de: "Installation fehlgeschlagen",
    fr: "L'installation a échoué", it: "Installazione fallita", es: "La instalación falló",
    nl: "Installatie mislukt", pl: "Instalacja nie powiodła się",
    pt: "A instalação falhou", sv: "Installationen misslyckades", sq: "Instalimi dështoi",
  },
  // ── Done step ───────────────────────────────────────────────────────
  "done.eyebrow": {
    en: "Atelier · Install complete", el: "Atelier · Η εγκατάσταση ολοκληρώθηκε",
    de: "Atelier · Installation abgeschlossen", fr: "Atelier · Installation terminée",
    it: "Atelier · Installazione completata", es: "Atelier · Instalación completada",
    nl: "Atelier · Installatie voltooid", pl: "Atelier · Instalacja zakończona",
    pt: "Atelier · Instalação concluída", sv: "Atelier · Installation klar",
    sq: "Atelier · Instalimi përfundoi",
  },
  "done.heading": {
    en: "You're live.", el: "Είσαι online.", de: "Du bist live.",
    fr: "Tu es en ligne.", it: "Sei online.", es: "Estás en línea.",
    nl: "Je bent live.", pl: "Jesteś online.", pt: "Estás online.",
    sv: "Du är live.", sq: "Je online.",
  },
  "done.body": {
    en: "{name} is running on the {template} template, clean install. Add your services, staff, products and posts from the admin.",
    el: "Το {name} τρέχει στο πρότυπο {template}, καθαρή εγκατάσταση. Πρόσθεσε τις υπηρεσίες, το προσωπικό, τα προϊόντα και τις αναρτήσεις σου από τη διαχείριση.",
    de: "{name} läuft auf der Vorlage {template}, saubere Installation. Füge im Admin deine Leistungen, dein Personal, Produkte und Beiträge hinzu.",
    fr: "{name} fonctionne sur le modèle {template}, installation vierge. Ajoute tes services, ton personnel, tes produits et tes articles depuis l'admin.",
    it: "{name} è in esecuzione sul modello {template}, installazione pulita. Aggiungi i tuoi servizi, lo staff, i prodotti e gli articoli dall'admin.",
    es: "{name} funciona con la plantilla {template}, instalación limpia. Añade tus servicios, personal, productos y publicaciones desde el admin.",
    nl: "{name} draait op het sjabloon {template}, schone installatie. Voeg je diensten, personeel, producten en berichten toe via de admin.",
    pl: "{name} działa na szablonie {template}, czysta instalacja. Dodaj swoje usługi, personel, produkty i wpisy w panelu.",
    pt: "{name} está a funcionar no modelo {template}, instalação limpa. Adiciona os teus serviços, equipa, produtos e publicações no admin.",
    sv: "{name} körs på mallen {template}, ren installation. Lägg till dina tjänster, personal, produkter och inlägg i adminpanelen.",
    sq: "{name} po funksionon në shabllonin {template}, instalim i pastër. Shto shërbimet, stafin, produktet dhe postimet e tua nga admini.",
  },
  "done.viewSite": {
    en: "View your site", el: "Δες τον ιστότοπό σου", de: "Deine Website ansehen",
    fr: "Voir ton site", it: "Visualizza il tuo sito", es: "Ver tu sitio",
    nl: "Bekijk je site", pl: "Zobacz swoją stronę", pt: "Ver o teu site",
    sv: "Visa din webbplats", sq: "Shiko faqen tënde",
  },
  "done.openAdmin": {
    en: "Open admin", el: "Άνοιγμα διαχείρισης", de: "Admin öffnen",
    fr: "Ouvrir l'admin", it: "Apri l'admin", es: "Abrir el admin",
    nl: "Admin openen", pl: "Otwórz panel", pt: "Abrir o admin",
    sv: "Öppna adminpanelen", sq: "Hap adminin",
  },
  "done.qrHint": {
    en: "Scan the QR on your phone to view the site on mobile instantly.",
    el: "Σάρωσε το QR με το κινητό σου για να δεις τον ιστότοπο αμέσως στο κινητό.",
    de: "Scanne den QR-Code mit deinem Handy, um die Website sofort mobil anzusehen.",
    fr: "Scanne le QR avec ton téléphone pour voir le site sur mobile immédiatement.",
    it: "Scansiona il QR con il telefono per vedere subito il sito su mobile.",
    es: "Escanea el QR con tu teléfono para ver el sitio en el móvil al instante.",
    nl: "Scan de QR met je telefoon om de site direct op mobiel te bekijken.",
    pl: "Zeskanuj kod QR telefonem, aby od razu zobaczyć stronę na telefonie.",
    pt: "Digitaliza o QR com o telemóvel para ver o site no telemóvel de imediato.",
    sv: "Skanna QR-koden med telefonen för att se webbplatsen på mobilen direkt.",
    sq: "Skano QR-në me telefonin për të parë faqen menjëherë në celular.",
  },
  "done.qrCaption": {
    en: "Your site", el: "Ο ιστότοπός σου", de: "Deine Website",
    fr: "Ton site", it: "Il tuo sito", es: "Tu sitio", nl: "Je site",
    pl: "Twoja strona", pt: "O teu site", sv: "Din webbplats", sq: "Faqja jote",
  },
};

/**
 * Setup wizard step: the shop owner picks which languages the site shows.
 * English is locked on. The selection is saved to settings.json
 * `enabledLanguages` by /api/install.
 */
type DomainDns = {
  apex: { type: string; name: string; value: string; ttl?: number };
  sub: { type: string; name: string; value: string; ttl?: number };
  recommended: "apex" | "sub";
};

// Top domain registrars. Picking one deep-links the buyer straight to that
// provider's DNS page so they add the record without hunting for it. There is
// no universal API to set a record on a customer's behalf at an arbitrary
// registrar, so the record is still added there — this just makes it one hop.
const DOMAIN_PROVIDERS: { id: string; name: string; url: string }[] = [
  { id: "hostinger", name: "Hostinger", url: "https://hpanel.hostinger.com/domains" },
  { id: "godaddy", name: "GoDaddy", url: "https://dcc.godaddy.com/control/portfolio" },
  { id: "namecheap", name: "Namecheap", url: "https://ap.www.namecheap.com/domains/list/" },
  { id: "cloudflare", name: "Cloudflare", url: "https://dash.cloudflare.com/" },
  { id: "squarespace", name: "Squarespace Domains", url: "https://account.squarespace.com/domains" },
  { id: "porkbun", name: "Porkbun", url: "https://porkbun.com/account/domainsSpeedy" },
  { id: "ionos", name: "IONOS", url: "https://my.ionos.com/domains" },
  { id: "namecom", name: "Name.com", url: "https://www.name.com/account/domain" },
  { id: "bluehost", name: "Bluehost", url: "https://my.bluehost.com/" },
  { id: "dynadot", name: "Dynadot", url: "https://www.dynadot.com/account/domain/manage.html" },
  { id: "other", name: "Another provider", url: "" },
];

/**
 * SaaS Domain step. Every tenant always keeps its free address
 * atelier.mindscrollers.com/<slug>; this optional step lets them connect a
 * custom domain they own. The buyer enters the domain, gets the exact DNS
 * record to add, and Verify confirms it points at the platform.
 */
// Exported so the admin "Domain" page can reuse the exact connect / buy flow.
export function DomainStep({
  slug,
  boughtDomain,
}: {
  slug?: string;
  boughtDomain?: string | null;
}) {
  const [domain, setDomain] = useState("");
  const [busy, setBusy] = useState(false);
  const [dns, setDns] = useState<DomainDns | null>(null);
  const [verified, setVerified] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<
    { domain: string; available: boolean; price?: number }[] | null
  >(null);
  const [buyBusy, setBuyBusy] = useState<string | null>(null);
  const { t } = useContext(WizardLangContext);

  const freeUrl = `atelier.mindscrollers.com/${slug || "your-site"}`;

  async function runSearch() {
    const q = searchQ.trim();
    if (!q) return;
    setSearching(true);
    setResults(null);
    setError(null);
    try {
      const res = await fetch(
        `/api/saas/domain/search?q=${encodeURIComponent(q)}`,
      );
      const data = (await res.json()) as {
        results?: { domain: string; available: boolean; price?: number }[];
      };
      setResults(data.results ?? []);
    } catch {
      setError(t("domain.errSearch"));
    } finally {
      setSearching(false);
    }
  }

  async function buy(buyDomain: string) {
    setBuyBusy(buyDomain);
    setError(null);
    try {
      const res = await fetch("/api/saas/domain/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, domain: buyDomain }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError(t("domain.errBuy"));
    } catch {
      setError(t("domain.errBuy"));
    }
    setBuyBusy(null);
  }

  async function call(action: "connect" | "verify") {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/saas/domain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, action, domain: domain.trim() }),
      });
      const data = (await res.json()) as {
        error?: string;
        verified?: boolean;
        dns?: DomainDns;
      };
      if (!res.ok) {
        setError(
          data.error === "domain_taken"
            ? t("domain.errTaken")
            : data.error === "invalid_domain"
              ? t("domain.errInvalid")
              : t("domain.errGeneric"),
        );
        return;
      }
      setConnected(true);
      setDns(data.dns ?? null);
      setVerified(!!data.verified);
    } catch {
      setError(t("domain.errNetwork"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[10px] uppercase tracking-[0.3em] text-[#c9a961]">
          {t("domain.eyebrow")}
        </p>
        <h3 className="mt-2 font-serif text-2xl">{t("domain.heading")}</h3>
      </div>

      {boughtDomain && (
        <div className="rounded-3xl border border-emerald-400/40 bg-emerald-500/10 p-6 sm:p-8">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">
            {t("domain.paymentReceived")}
          </p>
          <h4 className="mt-2 font-serif text-lg text-white">
            {fmt(t("domain.boughtTitle"), { domain: boughtDomain })}
          </h4>
          <p className="mt-1 text-sm text-white/70">
            {t("domain.boughtBody")}
          </p>
        </div>
      )}

      <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-white/45">
          {t("domain.freeEyebrow")}
        </p>
        <p className="mt-2 break-all font-mono text-sm text-white">{freeUrl}</p>
        <p className="mt-2 text-xs text-white/55">
          {t("domain.freeBody")}
        </p>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-white/45">
          {t("domain.connectEyebrow")}
        </p>
        <h4 className="mt-2 font-serif text-lg text-white">
          {t("domain.connectHeading")}
        </h4>
        <p className="mt-1 text-xs text-white/55">
          {t("domain.connectBody")}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <input
            value={domain}
            onChange={(e) => {
              setDomain(e.target.value.toLowerCase());
              setConnected(false);
              setVerified(false);
              setDns(null);
            }}
            placeholder="yoursalon.com"
            autoComplete="off"
            spellCheck={false}
            className="min-w-[220px] flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
          />
          <button
            type="button"
            onClick={() => call("connect")}
            disabled={busy || !domain.trim()}
            className="rounded-full bg-[#c9a961] px-5 py-2 text-xs font-semibold uppercase tracking-widest text-black disabled:opacity-40"
          >
            {busy && !connected ? t("domain.connecting") : t("domain.connect")}
          </button>
        </div>

        {error && <p className="mt-3 text-xs text-red-300">{error}</p>}

        {connected && verified && (
          <p className="mt-4 rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
            {fmt(t("domain.verifiedLive"), { domain })}
          </p>
        )}

        {connected && !verified && dns && (
          <div className="mt-4 space-y-3">
            <p className="text-xs text-white/70">
              {t("domain.dnsHint")}
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                aria-label={t("domain.provider")}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
              >
                <option value="" className="bg-[#0a0806]">
                  {t("domain.providerPlaceholder")}
                </option>
                {DOMAIN_PROVIDERS.map((p) => (
                  <option key={p.id} value={p.id} className="bg-[#0a0806]">
                    {p.name}
                  </option>
                ))}
              </select>
              {(() => {
                const p = DOMAIN_PROVIDERS.find((x) => x.id === provider);
                return p && p.url ? (
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noreferrer external"
                    className="rounded-full bg-[#c9a961] px-4 py-2 text-[11px] font-semibold uppercase tracking-widest text-black"
                  >
                    {fmt(t("domain.openDns"), { provider: p.name })}
                  </a>
                ) : null;
              })()}
            </div>

            {(dns.recommended === "apex" ? [dns.apex] : [dns.sub]).map((r) => (
              <div key={r.type} className="space-y-2">
                <div className="grid grid-cols-4 gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-3 font-mono text-[11px] text-white/80">
                  <span>
                    <span className="text-white/40">{t("domain.dnsType")}</span>
                    <br />
                    {r.type}
                  </span>
                  <span>
                    <span className="text-white/40">{t("domain.dnsName")}</span>
                    <br />
                    {r.name}
                  </span>
                  <span className="break-all">
                    <span className="text-white/40">{t("domain.dnsValue")}</span>
                    <br />
                    {r.value}
                  </span>
                  <span>
                    <span className="text-white/40">{t("domain.dnsTtl")}</span>
                    <br />
                    {r.ttl ?? 3600}
                  </span>
                </div>
                <p className="text-[10px] leading-relaxed text-white/40">
                  {t("domain.dnsValueAlt")} · {t("domain.dnsTtlHint")}
                </p>
              </div>
            ))}
            <button
              type="button"
              onClick={() => call("verify")}
              disabled={busy}
              className="rounded-full border border-white/20 px-5 py-2 text-xs uppercase tracking-widest text-white/80 disabled:opacity-40"
            >
              {busy ? t("domain.checking") : t("domain.verify")}
            </button>
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-white/45">
          {t("domain.buyEyebrow")}
        </p>
        <h4 className="mt-2 font-serif text-lg text-white">
          {t("domain.buyHeading")}
        </h4>
        <p className="mt-1 text-xs text-white/55">
          {t("domain.buyBody")}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <input
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value.toLowerCase())}
            onKeyDown={(e) => {
              if (e.key === "Enter") runSearch();
            }}
            placeholder="yoursalon"
            autoComplete="off"
            spellCheck={false}
            className="min-w-[220px] flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
          />
          <button
            type="button"
            onClick={runSearch}
            disabled={searching || !searchQ.trim()}
            className="rounded-full bg-[#c9a961] px-5 py-2 text-xs font-semibold uppercase tracking-widest text-black disabled:opacity-40"
          >
            {searching ? t("domain.searching") : t("domain.search")}
          </button>
        </div>

        {results && results.length === 0 && (
          <p className="mt-3 text-xs text-white/55">
            {t("domain.noResults")}
          </p>
        )}

        {results && results.length > 0 && (
          <ul className="mt-4 space-y-2">
            {results.map((r) => (
              <li
                key={r.domain}
                className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm"
              >
                <span className="break-all font-mono text-white/85">
                  {r.domain}
                </span>
                {r.available ? (
                  <div className="flex shrink-0 items-center gap-3">
                    {typeof r.price === "number" && (
                      <span className="text-sm font-semibold text-white">
                        €{r.price}
                        <span className="text-[10px] font-normal text-white/45">
                          {" "}{t("domain.perYear")}
                        </span>
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => buy(r.domain)}
                      disabled={!!buyBusy}
                      className="rounded-full bg-[#c9a961] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-black disabled:opacity-40"
                    >
                      {buyBusy === r.domain ? "..." : t("domain.buy")}
                    </button>
                  </div>
                ) : (
                  <span className="shrink-0 text-[11px] uppercase tracking-widest text-white/35">
                    {t("domain.taken")}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-center text-xs text-white/45">
        {t("domain.optionalFooter")}
      </p>
    </div>
  );
}

function LanguageStep({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  // Shown in the operator's language — picked from the header dropdown.
  const { t } = useContext(WizardLangContext);

  const heading = t("lang.heading");
  const subtext = t("lang.subtext");
  const always = t("lang.always");

  function toggle(code: string) {
    if (code === "en") return;
    onChange(
      value.includes(code) ? value.filter((c) => c !== code) : [...value, code],
    );
  }

  return (
    <div>
      <div className="text-xs uppercase tracking-[0.3em] text-[#c9a961]">{t("lang.eyebrow")}</div>
      <h2 className="mt-2 font-serif text-3xl text-white">{heading}</h2>
      <p className="mt-2 max-w-xl text-sm text-white/60">{subtext}</p>
      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        {WIZARD_LANGS.map((l) => {
          const locked = l.code === "en";
          const checked = locked || value.includes(l.code);
          return (
            <button
              key={l.code}
              type="button"
              onClick={() => toggle(l.code)}
              disabled={locked}
              aria-pressed={checked}
              className="flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors"
              style={{
                borderColor: checked ? "#c9a961" : "rgba(255,255,255,0.14)",
                background: checked ? "rgba(201,169,97,0.14)" : "transparent",
                cursor: locked ? "default" : "pointer",
              }}
            >
              <span
                aria-hidden="true"
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded border text-[11px] font-bold"
                style={{
                  borderColor: checked ? "#c9a961" : "rgba(255,255,255,0.3)",
                  background: checked ? "#c9a961" : "transparent",
                  color: "#0a0806",
                }}
              >
                {checked ? "✓" : ""}
              </span>
              <span className="text-xl" aria-hidden="true">{l.flag}</span>
              <span className="min-w-0">
                <span className="block text-sm text-white">{l.native}</span>
                <span className="block text-xs text-white/45">
                  {l.english}
                  {locked ? ` · ${always}` : ""}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function detectCountry(tz: string, lang: string): string | null {
  if (tz.includes("Athens")) return "GR";
  if (lang.startsWith("el")) return "GR";
  if (tz.includes("London")) return "GB";
  if (tz.includes("Paris")) return "FR";
  if (tz.includes("Berlin")) return "DE";
  if (tz.includes("Madrid")) return "ES";
  if (tz.includes("Rome")) return "IT";
  if (tz.includes("Nicosia")) return "CY";
  if (tz.includes("Istanbul")) return "TR";
  if (tz.includes("New_York") || tz.includes("Los_Angeles") || tz.includes("Chicago")) return "US";
  if (lang.startsWith("en-gb")) return "GB";
  if (lang.startsWith("en-us")) return "US";
  return null;
}

function Header({ accent, stats }: { accent: string; stats: { total: number; week: number } | null }) {
  const { uiLang, setUiLang, t } = useContext(WizardLangContext);
  const { theme, toggle } = useTheme();
  return (
    <div className="mb-10">
      <div className="mb-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Inlined so the wizard logo renders identically on a standalone
              ZIP install and a SaaS tenant setup — a `/setup/logo.svg` asset
              request would not reach the demo under a `/<slug>/setup` URL. */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 48 48"
            className="h-10 w-10"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="atelier-setup-mark" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#c2d3ff" />
                <stop offset="100%" stopColor="#7b95e8" />
              </linearGradient>
            </defs>
            <rect
              x="3"
              y="3"
              width="42"
              height="42"
              rx="10"
              fill="none"
              stroke="url(#atelier-setup-mark)"
              strokeWidth="1.5"
            />
            <path
              d="M14 34 L14 14 L24 24 L34 14 L34 34"
              fill="none"
              stroke="url(#atelier-setup-mark)"
              strokeWidth="2.2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <circle cx="24" cy="38" r="1.2" fill="url(#atelier-setup-mark)" />
          </svg>
          <div>
            <p className="font-serif text-lg leading-none tracking-[0.2em] text-white">ATELIER</p>
            <p className="mt-1 text-[9px] uppercase tracking-[0.35em] text-white/65">{t("header.by")}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {stats && (
            <div className="hidden sm:flex gap-4 text-[10px] uppercase tracking-[0.25em] text-white/50">
              <span>
                <span className="text-white">{stats.total.toLocaleString()}</span> {t("header.installs")}
              </span>
              <span>
                <span className="text-white">{stats.week}</span> {t("header.thisWeek")}
              </span>
            </div>
          )}
          <select
            value={uiLang}
            onChange={(e) => setUiLang(e.target.value)}
            aria-label={t("header.installerLang")}
            className="cursor-pointer rounded-full border border-white/15 bg-white/[0.03] px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-white/70 outline-none"
          >
            {WIZARD_LANGS.map((l) => (
              <option key={l.code} value={l.code} className="bg-[#0a0806] text-white">
                {l.native}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={toggle}
            aria-label={t("header.themeToggle")}
            className="cursor-pointer rounded-full border border-white/15 bg-white/[0.03] px-3 py-1.5 text-[12px] leading-none text-white/70"
          >
            {theme === "dark" ? "☀" : "☾"}
          </button>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.03] px-3 py-1 text-[9px] uppercase tracking-[0.3em] text-white/55">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: accent }} />
            {t("header.installer")}
          </div>
        </div>
      </div>
      <div className="text-center">
        <p className="text-[10px] uppercase tracking-[0.4em]" style={{ color: accent }}>
          {t("header.firstTime")}
        </p>
        <h1 className="mt-3 font-serif text-4xl sm:text-5xl">{t("header.title")}</h1>
        <p className="mt-3 text-sm text-white/55">
          {t("header.subtitle")}
        </p>
      </div>
    </div>
  );
}

function ProgressBar({ step, total, labels, primary }: { step: number; total: number; labels: string[]; primary: string }) {
  return (
    <div>
      <div className="relative h-1 w-full overflow-hidden rounded-full bg-white/10">
        <motion.div
          initial={false}
          animate={{ width: `${(step / total) * 100}%` }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="absolute left-0 top-0 h-full"
          style={{ background: primary }}
        />
      </div>
      <div className="mt-3 hidden justify-between text-[10px] uppercase tracking-widest text-white/50 sm:flex">
        {labels.map((l, i) => (
          <span key={l} className={i <= step ? "text-white" : ""}>{l}</span>
        ))}
      </div>
    </div>
  );
}

/**
 * Animated backdrop: a faint grid and two drifting gold light orbs. Mirrors
 * the marketing site's PageHeader treatment so the installer feels like the
 * same product as atelier.mindscrollers.com.
 */
function Backdrop() {
  const reduced = useReducedMotion();
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <motion.div
        className="absolute -top-40 left-[-10%] h-[440px] w-[60vw] rounded-full opacity-40 blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(201,169,97,0.5), transparent 60%)" }}
        animate={reduced ? undefined : { x: [0, 32, 0], y: [0, -26, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-48 right-[-12%] h-[420px] w-[55vw] rounded-full opacity-25 blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(201,169,97,0.38), transparent 60%)" }}
        animate={reduced ? undefined : { x: [0, -30, 0], y: [0, 24, 0] }}
        transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Faint grid. White lines for dark; `.light` repaints them dark so the
          grid stays visible on the light palette. */}
      <div className="install-wizard-grid absolute inset-0 opacity-[0.04]" />
    </div>
  );
}

/**
 * Step 1: activate the license, set up the admin account, then pick the site
 * languages. The fresh-start note, admin account and language picker stay
 * hidden until the key verifies — once it does, they reveal together so the
 * buyer commits to their login and languages in one screen.
 */
function StartStep({
  license,
  onLicenseChange,
  admin,
  onAdminChange,
  enabledLanguages,
  onLanguagesChange,
  isTenant,
  totalSteps,
}: {
  license: LicenseState;
  onLicenseChange: (next: LicenseState) => void;
  admin: Admin;
  onAdminChange: (v: Admin) => void;
  enabledLanguages: string[];
  onLanguagesChange: (v: string[]) => void;
  isTenant: boolean;
  totalSteps: number;
}) {
  // SaaS-hosted tenant: site is already paid and provisioned by us, so the
  // license step is skipped and the rest of the start step shows immediately.
  const verified = isTenant || license.status === "valid";
  const { t } = useContext(WizardLangContext);
  return (
    <div className="space-y-8">
      {!isTenant && <LicenseStep state={license} onChange={onLicenseChange} totalSteps={totalSteps} />}

      <AnimatePresence>
        {verified && (
          <motion.div
            key="post-verify"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 14 }}
            transition={{ duration: 0.35 }}
            className="space-y-6"
          >
            <FreshStartNote isTenant={isTenant} />
            <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 sm:p-8">
              <AdminStep value={admin} onChange={onAdminChange} />
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 sm:p-8">
              <LanguageStep value={enabledLanguages} onChange={onLanguagesChange} />
            </div>
            <p className="text-xs text-white/55">
              {t("start.tip")
                .split(/(\{enter\}|\{shiftEnter\})/)
                .map((part, i) =>
                  part === "{enter}" ? (
                    <kbd key={i} className="rounded border border-white/20 px-1.5 text-[10px]">Enter</kbd>
                  ) : part === "{shiftEnter}" ? (
                    <kbd key={i} className="rounded border border-white/20 px-1.5 text-[10px]">Shift + Enter</kbd>
                  ) : (
                    <span key={i}>{part}</span>
                  ),
                )}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Sets expectations for the starting state. A standalone install begins
// empty; a hosted SaaS tenant is provisioned pre-populated with an example
// salon so the site looks complete from day one.
function FreshStartNote({ isTenant = false }: { isTenant?: boolean }) {
  const { t } = useContext(WizardLangContext);
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 sm:p-8">
      <p className="text-[10px] uppercase tracking-[0.3em] text-[#c9a961]">{t("fresh.eyebrow")}</p>
      {isTenant ? (
        <>
          <h3 className="mt-2 font-serif text-2xl">{t("fresh.tenantTitle")}</h3>
          <p className="mt-3 text-sm leading-relaxed text-white/65">
            {t("fresh.tenantBody1")}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-white/55">
            {t("fresh.tenantBody2")}
          </p>
        </>
      ) : (
        <>
          <h3 className="mt-2 font-serif text-2xl">{t("fresh.title")}</h3>
          <p className="mt-3 text-sm leading-relaxed text-white/65">
            {t("fresh.body1")}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-white/55">
            {t("fresh.body2")}
          </p>
        </>
      )}
    </div>
  );
}

function LicenseStep({
  state,
  onChange,
  totalSteps,
}: {
  state: LicenseState;
  onChange: (next: LicenseState) => void;
  totalSteps: number;
}) {
  const { t } = useContext(WizardLangContext);
  function setRaw(raw: string) {
    // Auto-uppercase + insert dashes after every 4 chars beyond the "ATL-" prefix.
    // Tolerant of paste with or without dashes/spaces.
    const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
    let formatted = "";
    if (cleaned.startsWith("ATL")) {
      formatted = "ATL";
      const rest = cleaned.slice(3);
      for (let i = 0; i < rest.length && i < 16; i += 4) {
        formatted += "-" + rest.slice(i, i + 4);
      }
    } else {
      // user might still be typing — keep raw chars for now
      formatted = cleaned;
    }
    onChange({
      ...state,
      rawInput: formatted,
      // Any edit resets the result so a complete key auto-verifies again.
      status: state.status === "checking" ? "checking" : "idle",
      message: null,
      key: null,
    });
  }

  async function verify() {
    const key = state.rawInput.trim();
    if (!/^ATL-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/.test(key)) {
      onChange({ ...state, status: "invalid", message: t("license.errFormat") });
      return;
    }
    onChange({ ...state, status: "checking", message: null });
    try {
      const url = `${LICENSE_VALIDATE_URL}?key=${encodeURIComponent(key)}`;
      const r = await fetch(url, { cache: "no-store" });
      const body = await r.json().catch(() => ({}));
      if (body?.valid && body?.domainMismatch) {
        // The key is real, but already installed on another domain. One
        // license, one domain — stop the buyer here rather than at install.
        onChange({
          ...state,
          status: "invalid",
          message: fmt(t("license.errBound"), {
            domain: body.boundDomain || t("license.boundFallback"),
          }),
        });
      } else if (body?.valid) {
        onChange({
          rawInput: key,
          status: "valid",
          message: null,
          key: body.key,
          packageId: body.packageId ?? null,
          firstName: body.firstName ?? null,
        });
      } else {
        const reason =
          body?.reason === "revoked"
            ? t("license.errRevoked")
            : body?.reason === "not-found"
            ? t("license.errNotFound")
            : t("license.errBadKey");
        onChange({ ...state, status: "invalid", message: reason });
      }
    } catch {
      onChange({
        ...state,
        status: "invalid",
        message: t("license.errNetwork"),
      });
    }
  }

  // Auto-verify: the moment a complete, well-formed key is present — on paste
  // or when the final character is typed — check it without a button press.
  useEffect(() => {
    if (
      state.status === "idle" &&
      /^ATL-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/.test(state.rawInput.trim())
    ) {
      verify();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.rawInput, state.status]);

  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.4em] text-[#c9a961]">{fmt(t("license.stepOf"), { n: totalSteps })}</p>
      <h2 className="mt-2 font-serif text-3xl">{t("license.heading")}</h2>
      <p className="mt-2 text-sm text-white/55">
        {t("license.subtext")}
      </p>

      <div className="mt-8 max-w-xl">
        <label htmlFor="license-key" className="block text-[10px] uppercase tracking-[0.3em] text-white/55">
          {t("license.label")}
        </label>
        <div className="mt-2 flex gap-2">
          <input
            id="license-key"
            value={state.rawInput}
            onChange={(e) => setRaw(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                verify();
              }
            }}
            placeholder="ATL-XXXX-XXXX-XXXX-XXXX"
            spellCheck={false}
            autoComplete="off"
            className="flex-1 rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 font-mono text-sm tracking-wider text-white placeholder-white/30 outline-none focus:border-[#c9a961]/60 focus:bg-white/[0.06]"
          />
          <button
            type="button"
            onClick={verify}
            disabled={state.status === "checking" || state.rawInput.length < 19}
            className="rounded-xl bg-[#c9a961] px-5 text-[10px] font-semibold uppercase tracking-widest text-black hover:opacity-90 disabled:opacity-40"
          >
            {state.status === "checking" ? t("license.checking") : state.status === "valid" ? t("license.verified") : t("license.verify")}
          </button>
        </div>

        {state.status === "valid" && (
          <div className="mt-4 rounded-xl border border-emerald-400/40 bg-emerald-500/[0.08] p-4 text-sm text-emerald-200">
            ✓ {t("license.okPrefix")}{" "}
            {state.firstName ? fmt(t("license.welcomeName"), { name: state.firstName }) : t("license.welcome")}{" "}
            {state.packageId === "managed" ? t("license.planManaged") : t("license.planSelf")}
            <p className="mt-2 text-xs text-emerald-200/70">
              {t("license.continueHint")}
            </p>
          </div>
        )}
        {state.status === "invalid" && state.message && (
          <p className="mt-4 rounded-xl border border-red-400/40 bg-red-500/[0.08] p-4 text-sm text-red-200">
            {state.message}
          </p>
        )}

        <p className="mt-8 text-xs text-white/50">
          {t("license.noKey")}{" "}
          <a
            href="https://atelier.mindscrollers.com/pricing"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#c9a961] underline-offset-4 hover:underline"
          >
            {t("license.getKey")}
          </a>
          .
        </p>
      </div>
    </div>
  );
}

function TemplateStep({ templates, selected, onSelect }: { templates: Template[]; selected: Template | null; onSelect: (t: Template) => void }) {
  if (templates.length === 0) {
    return <p className="py-20 text-center text-white/60">No templates found.</p>;
  }
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.4em] text-[#c9a961]">Step 2 of 5</p>
      <h2 className="mt-2 font-serif text-3xl">Pick a template</h2>
      <p className="mt-2 text-sm text-white/55">More templates coming. Pick any to preview the look and feel.</p>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((t) => {
          const active = selected?.id === t.id;
          return (
            <div
              key={t.id}
              className={`group overflow-hidden rounded-2xl border transition-all ${
                active ? "border-[#c9a961] shadow-[0_0_0_4px_rgba(201,169,97,0.15)]" : "border-white/10 hover:border-white/30"
              }`}
              style={{ background: t.theme.background as string }}
            >
              <button onClick={() => onSelect(t)} className="block w-full text-left">
                <div className="relative aspect-[8/5] w-full overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={clientPath(t.cover)} alt={t.name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  {active && (
                    <span className="absolute right-3 top-3 rounded-full bg-[#c9a961] px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-black">
                      Selected
                    </span>
                  )}
                </div>
                <div className="p-5 pb-3">
                  <p className="text-[10px] uppercase tracking-[0.3em]" style={{ color: t.accentColor }}>
                    {t.industry}
                  </p>
                  <h3 className="mt-2 font-serif text-xl" style={{ color: t.theme.foreground as string }}>
                    {t.name}
                  </h3>
                  <p className="mt-2 line-clamp-2 text-xs" style={{ color: (t.theme.muted as string) || "rgba(255,255,255,0.6)" }}>
                    {t.tagline}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Tag>{t.stats.services} services</Tag>
                    <Tag>{t.stats.products} products</Tag>
                    <Tag>{t.stats.posts} posts</Tag>
                  </div>
                </div>
              </button>
              <div className="flex gap-2 border-t border-white/10 p-3">
                <button
                  onClick={() => onSelect(t)}
                  className={`flex-1 rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest transition-colors ${
                    active ? "bg-[#c9a961] text-black" : "border border-white/20 text-white/80 hover:bg-white/10"
                  }`}
                >
                  {active ? "Selected ✓" : "Use this"}
                </button>
                <a
                  href={withBasePath("/?preview=1")}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-white/20 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/80 hover:bg-white/10"
                >
                  Preview demo ↗
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {selected && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]"
        >
          <div className="space-y-4">
            <div className="rounded-2xl border border-[#c9a961]/40 bg-[#c9a961]/5 p-5">
              <p className="text-[10px] uppercase tracking-[0.3em] text-[#c9a961]">Selected · {selected.name}</p>
              <p className="mt-2 text-sm text-white/80">{selected.description}</p>
              <ul className="mt-3 grid gap-1.5 text-xs text-white/60 sm:grid-cols-2">
                {selected.features.map((f) => (
                  <li key={f}>· {f}</li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href={withBasePath("/?preview=1")}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-white/20 px-4 py-1.5 text-[10px] uppercase tracking-widest text-white/85 hover:bg-white/10"
                >
                  Open full preview ↗
                </a>
                <a
                  href={withBasePath("/book?preview=1")}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-white/20 px-4 py-1.5 text-[10px] uppercase tracking-widest text-white/85 hover:bg-white/10"
                >
                  Booking flow ↗
                </a>
                <a
                  href={withBasePath("/blog?preview=1")}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-white/20 px-4 py-1.5 text-[10px] uppercase tracking-widest text-white/85 hover:bg-white/10"
                >
                  Blog ↗
                </a>
              </div>
            </div>

            <SpecsBlock />
          </div>

          <MobilePreview template={selected} />
        </motion.div>
      )}
    </div>
  );
}

const SPEC_GROUPS: { icon: string; title: string; items: string[] }[] = [
  {
    icon: "⚡",
    title: "Performance",
    items: [
      "Next.js 16 · App Router · Server Components",
      "LCP < 2.0s · CLS < 0.05 · INP < 200ms",
      "Turbopack dev, AVIF/WebP images, responsive sizes",
      "30-day image cache · long-term static caching",
      "Edge-ready · zero-config deploy",
    ],
  },
  {
    icon: "🔍",
    title: "SEO built-in",
    items: [
      "Per-page metadata · OpenGraph · Twitter cards",
      "LocalBusiness JSON-LD schema auto-generated",
      "Dynamic sitemap.xml + robots.txt + llms.txt",
      "Editable title/description/OG image per route",
      "Multilingual: 11 languages with hreflang alternates",
    ],
  },
  {
    icon: "📊",
    title: "Admin dashboard",
    items: [
      "Bookings · Orders · Clients · Products · Blog CRUD",
      "Services + Staff + Coupons + Reviews · full CRUD",
      "Analytics: pageviews, conversions, top pages/services",
      "Calendar view + waitlist + holidays + audit log",
      "CSV import/export · backup/restore · GDPR tools",
      "Email campaigns · 8-hour reminder cron",
    ],
  },
  {
    icon: "🎨",
    title: "Fully rebrandable",
    items: [
      "14 color presets · 10-token theme editor · live preview",
      "6 premium fonts (Playfair, Inter, Fraunces…)",
      "Logo, favicon, wordmark, tagline: all editable",
      "Navigation, book button, footer: drag-configurable",
      "Industry presets · AI content regenerator",
    ],
  },
  {
    icon: "🛡️",
    title: "Security & reliability",
    items: [
      "CSP, HSTS, X-Frame-Options, Permissions-Policy",
      "PBKDF2 password hashing · signed session cookies",
      "IP rate limiting · honeypot spam defense",
      "Role-based access (admin / staff)",
      "Input length caps · email/phone/date validation",
    ],
  },
  {
    icon: "♿",
    title: "UX & accessibility",
    items: [
      "WCAG 2.2 AA · keyboard + screen-reader tested",
      "Framer-motion microinteractions · reduced-motion safe",
      "Cart · checkout · booking conflict detection",
      "Dark mode native · auto theme per system preference",
      "PWA manifest · installable on mobile",
    ],
  },
];

function SpecsBlock() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-[10px] uppercase tracking-[0.3em] text-[#c9a961]">What's in the box</p>
        <p className="text-[10px] uppercase tracking-widest text-white/60">Every template includes</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SPEC_GROUPS.map((g) => (
          <div key={g.title} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-white">
              <span className="text-base">{g.icon}</span>
              {g.title}
            </p>
            <ul className="mt-3 space-y-1.5 text-[11px] leading-relaxed text-white/65">
              {g.items.map((it) => (
                <li key={it} className="flex gap-1.5">
                  <span className="text-[#c9a961]">•</span>
                  <span>{it}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-4 text-center sm:grid-cols-4">
        <Metric label="Lighthouse" value="95+" />
        <Metric label="First paint" value="< 1.2s" />
        <Metric label="Admin tables" value="14" />
        <Metric label="Languages" value="11" />
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-serif text-2xl text-white">{value}</p>
      <p className="text-[9px] uppercase tracking-[0.25em] text-white/65">{label}</p>
    </div>
  );
}

function MobilePreview({ template }: { template: Template }) {
  const [route, setRoute] = useState<string>("/");
  const [loading, setLoading] = useState(true);
  const [iframeKey, setIframeKey] = useState(0);
  const [device, setDevice] = useState<"mobile" | "desktop">("mobile");

  const ROUTES = [
    { path: "/", label: "Home" },
    { path: "/services", label: "Services" },
    { path: "/shop", label: "Shop" },
    { path: "/blog", label: "Blog" },
    { path: "/book", label: "Book" },
    { path: "/contact", label: "Contact" },
  ];

  useEffect(() => { setLoading(true); }, [route, iframeKey]);

  const src = `${route}${route.includes("?") ? "&" : "?"}preview=1`;

  return (
    <div className="lg:sticky lg:top-6">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-[10px] uppercase tracking-[0.3em] text-white/65">Live preview</p>
        <div className="flex gap-1 rounded-full border border-white/15 bg-white/[0.04] p-0.5">
          {(["mobile", "desktop"] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDevice(d)}
              className={`rounded-full px-3 py-0.5 text-[9px] font-semibold uppercase tracking-widest ${
                device === d ? "bg-[#c9a961] text-black" : "text-white/60 hover:text-white"
              }`}
            >
              {d === "mobile" ? "📱" : "🖥"} {d}
            </button>
          ))}
        </div>
      </div>
      <p className="mb-3 text-xs text-white/55">
        <strong className="text-white/80">{template.name}</strong> · {device === "mobile" ? "390×720 mobile" : "1280×800 desktop, scaled"}
      </p>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {ROUTES.map((r) => (
          <button
            key={r.path}
            onClick={() => setRoute(r.path)}
            className={`rounded-full border px-2.5 py-1 text-[9px] uppercase tracking-widest transition-colors ${
              route === r.path
                ? "border-[#c9a961] bg-[#c9a961]/20 text-white"
                : "border-white/15 text-white/60 hover:bg-white/10"
            }`}
          >
            {r.label}
          </button>
        ))}
        <button
          onClick={() => setIframeKey((k) => k + 1)}
          title="Reload"
          className="rounded-full border border-white/15 px-2.5 py-1 text-[9px] uppercase tracking-widest text-white/60 hover:bg-white/10"
        >
          ⟲
        </button>
      </div>

      {device === "mobile" ? (
        <div className="relative mx-auto" style={{ width: 280 }}>
          <div
            className="relative rounded-[38px] border-[6px] border-white/20 bg-black p-1 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]"
            style={{ width: 280, height: 560 }}
          >
            <div className="absolute left-1/2 top-0 z-10 h-5 w-24 -translate-x-1/2 rounded-b-2xl bg-black" />
            <div className="relative h-full w-full overflow-hidden rounded-[28px] bg-black">
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/15 border-t-[#c9a961]" />
                </div>
              )}
              <iframe
                key={iframeKey}
                src={src}
                onLoad={() => setLoading(false)}
                title={`${template.name} preview`}
                className="h-full w-full border-0"
                style={{ background: template.theme.background as string }}
              />
            </div>
            <div className="absolute bottom-1.5 left-1/2 h-1 w-20 -translate-x-1/2 rounded-full bg-white/40" />
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/15 bg-black shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]">
          <div className="flex items-center gap-1.5 border-b border-white/10 bg-white/[0.04] px-3 py-1.5">
            <span className="h-2 w-2 rounded-full bg-red-400/70" />
            <span className="h-2 w-2 rounded-full bg-amber-400/70" />
            <span className="h-2 w-2 rounded-full bg-emerald-400/70" />
            <span className="ml-3 truncate text-[9px] text-white/60">localhost{route}</span>
          </div>
          <div className="relative" style={{ height: 360 }}>
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/15 border-t-[#c9a961]" />
              </div>
            )}
            <iframe
              key={iframeKey}
              src={src}
              onLoad={() => setLoading(false)}
              title={`${template.name} desktop preview`}
              className="border-0"
              style={{
                width: 1280,
                height: 800,
                transform: "scale(0.22)",
                transformOrigin: "top left",
                background: template.theme.background as string,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/[0.05] px-2 py-0.5 text-[9px] uppercase tracking-widest text-white/60">
      {children}
    </span>
  );
}

/* ── The Business step ───────────────────────────────────────────────────
   One top-level wizard step that paginates its own settings groups with
   Next/Back buttons. Each sub-page is a self-contained group; the buyer
   fills as much as they want so only SMTP/Stripe/AI keys are left for after
   launch. The parent's footer hides while the buyer is in here. */
function BusinessStep({
  business, onBusinessChange,
  social, onSocialChange,
  brand, onBrandChange,
  bookingRules, onBookingRulesChange,
  bookingMode, onBookingModeChange,
  analytics, onAnalyticsChange,
  teammates, onTeammatesChange,
  mediaImages, onMediaImagesChange, distributed, onDistribute,
  accent, onComplete, onBack,
}: {
  business: Business;
  onBusinessChange: (v: Business) => void;
  social: Social;
  onSocialChange: (v: Social) => void;
  brand: Brand;
  onBrandChange: (v: Brand) => void;
  bookingRules: BookingRules;
  onBookingRulesChange: (v: BookingRules) => void;
  bookingMode: BookingMode;
  onBookingModeChange: (m: BookingMode) => void;
  analytics: Analytics;
  onAnalyticsChange: (v: Analytics) => void;
  teammates: string[];
  onTeammatesChange: (v: string[]) => void;
  mediaImages: string[];
  onMediaImagesChange: (v: string[]) => void;
  distributed: boolean;
  onDistribute: () => void;
  accent: string;
  onComplete: () => void;
  onBack: () => void;
}) {
  const [sub, setSub] = useState(0);
  const subId: BusinessSub = BUSINESS_SUBSTEPS[sub];
  const { t } = useContext(WizardLangContext);

  const SUB_LABELS: Record<BusinessSub, string> = {
    identity: t("sub.identity"), location: t("sub.location"), social: t("sub.social"),
    brand: t("sub.brand"), media: t("sub.media"), booking: t("sub.booking"),
    analytics: t("sub.analytics"), team: t("sub.team"),
  };

  // Only the first two sub-pages gate progress; the rest are optional.
  const canAdvance = (() => {
    if (subId === "identity") {
      const emailOk = !business.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(business.email);
      return business.name.trim().length > 0 && business.city.trim().length > 0 && emailOk;
    }
    if (subId === "location") {
      return !!business.timezone.trim() && business.hours.some((h) => !h.closed);
    }
    return true;
  })();

  const isLast = sub >= BUSINESS_SUBSTEPS.length - 1;

  function next() {
    if (!canAdvance) return;
    if (isLast) { onComplete(); return; }
    setSub((s) => s + 1);
  }
  function back() {
    if (sub <= 0) { onBack(); return; }
    setSub((s) => s - 1);
  }

  return (
    <div>
      {/* Internal sub-progress. Visited steps are clickable to jump back. */}
      <div className="mb-7 flex flex-wrap items-center gap-2">
        {BUSINESS_SUBSTEPS.map((id, i) => (
          <button
            key={id}
            type="button"
            onClick={() => i <= sub && setSub(i)}
            disabled={i > sub}
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] uppercase tracking-widest transition-colors ${
              i === sub
                ? "border-[#c9a961] text-[#c9a961]"
                : i < sub
                ? "border-white/15 text-white/70 hover:bg-white/5"
                : "border-white/10 text-white/35"
            }`}
          >
            <span
              className={`flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold ${
                i <= sub ? "bg-[#c9a961] text-black" : "bg-white/10 text-white/50"
              }`}
            >
              {i < sub ? "✓" : i + 1}
            </span>
            {SUB_LABELS[id]}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={subId}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.25 }}
        >
          {subId === "identity" && <IdentityStep value={business} onChange={onBusinessChange} />}
          {subId === "location" && <LocationStep value={business} onChange={onBusinessChange} />}
          {subId === "social" && <SocialStep value={social} onChange={onSocialChange} />}
          {subId === "brand" && (
            <BrandStep value={brand} onChange={onBrandChange} businessName={business.name} timezone={business.timezone} />
          )}
          {subId === "media" && (
            <MediaStep
              images={mediaImages}
              onImagesChange={onMediaImagesChange}
              distributed={distributed}
              onDistribute={onDistribute}
            />
          )}
          {subId === "booking" && (
            <BookingRulesStep
              rules={bookingRules}
              onRulesChange={onBookingRulesChange}
              mode={bookingMode}
              onModeChange={onBookingModeChange}
            />
          )}
          {subId === "analytics" && <AnalyticsStep value={analytics} onChange={onAnalyticsChange} />}
          {subId === "team" && <TeamStep teammates={teammates} onTeammatesChange={onTeammatesChange} />}
        </motion.div>
      </AnimatePresence>

      <div className="mt-10 flex items-center justify-between">
        <button
          onClick={back}
          className="rounded-full border border-white/20 px-5 py-2 text-xs uppercase tracking-widest text-white/80 hover:bg-white/10"
        >
          ← {t("nav.back")}
        </button>
        <div className="flex items-center gap-3">
          <span className="text-[10px] uppercase tracking-widest text-white/45">
            {fmt(t("business.count"), { n: sub + 1, total: BUSINESS_SUBSTEPS.length })}
          </span>
          <button
            onClick={next}
            disabled={!canAdvance}
            className="rounded-full px-8 py-2.5 text-xs font-semibold uppercase tracking-widest transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{ background: accent, color: "#0a0806" }}
          >
            {isLast ? `${t("nav.continue")} →` : `${t("nav.next")} →`}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Business sub-page: identity ─────────────────────────────────────────
   Name, address, contact. */
function IdentityStep({ value, onChange }: { value: Business; onChange: (v: Business) => void }) {
  const { t } = useContext(WizardLangContext);

  function updateName(v: string) {
    const smartEmail = value.email || (v ? suggestedEmail(v) : "");
    onChange({ ...value, name: v, email: value.email ? value.email : smartEmail });
  }

  function updatePostal(v: string) {
    const match = lookupPostal(v);
    if (match && !value.city) {
      onChange({ ...value, postalCode: v, city: match.city, country: match.country });
    } else {
      onChange({ ...value, postalCode: v });
    }
  }

  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.4em] text-[#c9a961]">{t("identity.eyebrow")}</p>
      <h2 className="mt-2 font-serif text-3xl">{t("identity.heading")}</h2>
      <p className="mt-2 text-sm text-white/55">{t("identity.subtext")}</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field label={t("identity.fieldName")} value={value.name} onChange={updateName} placeholder={t("identity.namePlaceholder")} />
        <Field label={t("identity.fieldCity")} value={value.city} onChange={(v) => onChange({ ...value, city: v })} placeholder="London" />
        <Field label={t("identity.fieldStreet")} value={value.streetAddress} onChange={(v) => onChange({ ...value, streetAddress: v })} placeholder="47 Cranley Mews" />
        <Field label={t("identity.fieldPostal")} value={value.postalCode} onChange={updatePostal} placeholder="SW7 3BY" />
        <Field label={t("identity.fieldCountry")} value={value.country} onChange={(v) => onChange({ ...value, country: v })} placeholder="GB" />
        <Field label={t("identity.fieldPhone")} value={value.phone} onChange={(v) => onChange({ ...value, phone: v })} placeholder="+44 20 7946 0412" />
        <Field label={t("identity.fieldFounded")} value={value.foundedYear} onChange={(v) => onChange({ ...value, foundedYear: v.replace(/[^0-9]/g, "").slice(0, 4) })} placeholder="2016" />
        <div className="sm:col-span-2">
          <Field label={t("identity.fieldEmail")} value={value.email} onChange={(v) => onChange({ ...value, email: v })} placeholder="hello@yourdomain.com" />
          {value.name && (
            <p className="mt-1.5 text-[10px] text-white/60">
              {t("identity.wordmarkHint")
                .split(/(\{wordmark\}|\{slug\})/)
                .map((part, i) =>
                  part === "{wordmark}" ? (
                    <span key={i} className="text-[#c9a961]">{wordmarkFrom(value.name)}</span>
                  ) : part === "{slug}" ? (
                    <span key={i} className="text-[#c9a961]">/{slugify(value.name)}</span>
                  ) : (
                    <span key={i}>{part}</span>
                  ),
                )}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Fresh-install step 3: location & opening hours ──────────────────────
   Timezone and the weekly schedule. Both are mandatory: the booking engine
   refuses slots outside opening hours and renders every time in this zone. */
function LocationStep({ value, onChange }: { value: Business; onChange: (v: Business) => void }) {
  const { t } = useContext(WizardLangContext);
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.4em] text-[#c9a961]">{t("location.eyebrow")}</p>
      <h2 className="mt-2 font-serif text-3xl">{t("location.heading")}</h2>
      <p className="mt-2 text-sm text-white/55">{t("location.subtext")}</p>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <p className="text-[10px] uppercase tracking-[0.3em] text-[#c9a961]">{t("location.tzEyebrow")}</p>
        <p className="mt-1 text-xs text-white/55">
          {t("location.tzHint")}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <select
            value={COMMON_TIMEZONES.some((t) => t.id === value.timezone) ? value.timezone : "__custom"}
            onChange={(e) => {
              const v = e.target.value;
              if (v !== "__custom") onChange({ ...value, timezone: v });
            }}
            className="flex-1 min-w-[220px] rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2.5 text-sm text-white outline-none focus:border-[#c9a961]/60"
          >
            {COMMON_TIMEZONES.map((tz) => (
              <option key={tz.id} value={tz.id} className="bg-[#0d0a07]">
                {tz.label} · {tz.id}
              </option>
            ))}
            <option value="__custom" className="bg-[#0d0a07]">{t("location.tzCustom")}</option>
          </select>
          <input
            value={value.timezone}
            onChange={(e) => onChange({ ...value, timezone: e.target.value })}
            placeholder="Europe/London"
            className="flex-1 min-w-[180px] rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2.5 font-mono text-sm text-white placeholder-white/30 outline-none focus:border-[#c9a961]/60"
          />
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <p className="text-[10px] uppercase tracking-[0.3em] text-[#c9a961]">{t("location.hoursEyebrow")}</p>
        <p className="mt-1 text-xs text-white/55">
          {t("location.hoursHint")}
        </p>
        <div className="mt-4 divide-y divide-white/5">
          {value.hours.map((h, i) => (
            <HourRowEditor
              key={h.day}
              row={h}
              onChange={(next) => {
                const copy = [...value.hours];
                copy[i] = next;
                onChange({ ...value, hours: copy });
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Fresh-install step 4: social profiles ───────────────────────────────
   Handles or full URLs — they feed the footer and contact page links. */
function SocialStep({ value, onChange }: { value: Social; onChange: (v: Social) => void }) {
  const { t } = useContext(WizardLangContext);
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.4em] text-[#c9a961]">{t("social.eyebrow")}</p>
      <h2 className="mt-2 font-serif text-3xl">{t("social.heading")}</h2>
      <p className="mt-2 text-sm text-white/55">{t("social.subtext")}</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field label={t("social.instagram")} value={value.instagram} onChange={(v) => onChange({ ...value, instagram: v })} placeholder={t("social.instagramPlaceholder")} />
        <Field label={t("social.facebook")} value={value.facebook} onChange={(v) => onChange({ ...value, facebook: v })} placeholder="facebook.com/yoursalon" />
        <Field label={t("social.whatsapp")} value={value.whatsapp} onChange={(v) => onChange({ ...value, whatsapp: v })} placeholder="+44 7700 900000" />
        <Field label={t("social.tiktok")} value={value.tiktok} onChange={(v) => onChange({ ...value, tiktok: v })} placeholder={t("social.tiktokPlaceholder")} />
      </div>
    </div>
  );
}

/* ── Fresh-install step 5: brand ─────────────────────────────────────────
   Logo, tagline, price band. Wordmark is auto-derived from the name. */
function currencySymbolForTimezone(tz: string): string {
  if (tz === "Europe/London") return "£";
  if (tz === "Europe/Istanbul") return "₺";
  if (tz.startsWith("America/")) return "$";
  if (tz.startsWith("Australia/") || tz.startsWith("Pacific/")) return "$";
  if (tz.startsWith("Europe/") || tz === "Asia/Nicosia") return "€";
  return "$";
}

/** A tiny mock-up of each hero layout, shown in the brand step's picker. */
function HeroThumb({ layout }: { layout: string }) {
  if (layout === "video") {
    return (
      <span className="mb-2 flex h-14 flex-col items-center justify-center gap-1 rounded-md bg-white/[0.07] p-2">
        <span className="flex h-4 w-4 items-center justify-center rounded-full border border-white/40">
          <span className="ml-[1px] h-0 w-0 border-y-[3px] border-l-[6px] border-y-transparent border-l-white/70" />
        </span>
        <span className="h-1.5 w-3/5 rounded-full bg-white/30" />
        <span className="h-1.5 w-2/5 rounded-full bg-[#c9a961]/70" />
      </span>
    );
  }
  if (layout === "showcase") {
    return (
      <span className="mb-2 flex h-14 items-center gap-1.5 rounded-md bg-black/30 p-2">
        <span className="flex flex-1 flex-col gap-1">
          <span className="h-1.5 w-4/5 rounded-full bg-white/30" />
          <span className="h-1.5 w-3/5 rounded-full bg-[#c9a961]/70" />
        </span>
        <span className="flex h-full w-6 rounded-[4px] border border-white/30 bg-white/10 p-[3px]">
          <span className="w-full rounded-[2px] bg-white/15" />
        </span>
      </span>
    );
  }
  return (
    <span className="mb-2 flex h-14 gap-1.5 rounded-md bg-black/30 p-2">
      <span className="flex flex-1 flex-col justify-center gap-1">
        <span className="h-1.5 w-4/5 rounded-full bg-white/30" />
        <span className="h-1.5 w-3/5 rounded-full bg-[#c9a961]/70" />
        <span className="mt-0.5 h-2 w-2/5 rounded bg-[#c9a961]" />
      </span>
      <span className="w-1/3 rounded bg-white/15" />
    </span>
  );
}

// Localized name + description for each front-end template, keyed by id. The
// registry's own `name`/`description` are the English fallback for any
// template not listed here, so a third skin still renders without a crash.
const TEMPLATE_T_KEYS: Record<string, { name: string; desc: string }> = {
  salon: { name: "brand.tplSalonName", desc: "brand.tplSalonDesc" },
  template2: { name: "brand.tplNailName", desc: "brand.tplNailDesc" },
  template3: { name: "brand.tplSpaName", desc: "brand.tplSpaDesc" },
  template4: { name: "brand.tplClinicName", desc: "brand.tplClinicDesc" },
  template5: { name: "brand.tplYogaName", desc: "brand.tplYogaDesc" },
};

function BrandStep({
  value, onChange, businessName, timezone,
}: {
  value: Brand;
  onChange: (v: Brand) => void;
  businessName: string;
  timezone: string;
}) {
  const { t } = useContext(WizardLangContext);
  // The price band uses the currency symbol of the chosen timezone, so the
  // buyer sees £, € or $ for their market instead of a hardcoded $.
  const currency = currencySymbolForTimezone(timezone);
  const priceLevel = Math.min(4, Math.max(1, value.priceRange.length || 2));
  const PRICE_BANDS = [1, 2, 3, 4].map((n) => currency.repeat(n));
  // Keep the stored band in the active currency even before the buyer taps it,
  // so a London install never saves a "$$" range.
  useEffect(() => {
    const want = currency.repeat(priceLevel);
    if (value.priceRange !== want) onChange({ ...value, priceRange: want });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currency]);
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.4em] text-[#c9a961]">{t("brand.eyebrow")}</p>
      <h2 className="mt-2 font-serif text-3xl">{t("brand.heading")}</h2>
      <p className="mt-2 text-sm text-white/55">{t("brand.subtext")}</p>

      <div className="mt-6">
        <label className="mb-1.5 block text-[10px] uppercase tracking-widest text-white/50">{t("brand.template")}</label>
        <div className="grid gap-3 sm:grid-cols-3">
          {SELECTABLE_TEMPLATES.map((tpl) => {
            const active = tpl.id === value.template;
            const keys = TEMPLATE_T_KEYS[tpl.id];
            const label = keys ? t(keys.name) : tpl.name;
            const desc = keys ? t(keys.desc) : tpl.description;
            return (
              <button
                key={tpl.id}
                type="button"
                onClick={() => onChange({ ...value, template: tpl.id })}
                className={`overflow-hidden rounded-xl border text-left transition-colors ${
                  active ? "border-[#c9a961] bg-[#c9a961]/10" : "border-white/15 hover:border-white/30"
                }`}
              >
                <div className="relative aspect-[16/10] w-full overflow-hidden border-b border-white/10 bg-[#0a0806]">
                  <iframe
                    src={clientPath("/preview/" + tpl.id)}
                    title={label}
                    loading="lazy"
                    tabIndex={-1}
                    aria-hidden="true"
                    className="absolute left-0 top-0 origin-top-left"
                    style={{ width: "400%", height: "400%", border: 0, transform: "scale(0.25)", pointerEvents: "none" }}
                  />
                </div>
                <div className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-xs font-semibold uppercase tracking-widest ${active ? "text-[#c9a961]" : "text-white/75"}`}>
                      {label}
                    </span>
                    {active && <span className="text-[#c9a961]" aria-hidden="true">✓</span>}
                  </div>
                  <p className="mt-1 text-[10px] leading-relaxed text-white/50">{desc}</p>
                </div>
              </button>
            );
          })}
        </div>
        <p className="mt-1.5 text-[10px] text-white/50">{t("brand.templateHint")}</p>
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <LogoUploader value={value.logoUrl} onChange={(url) => onChange({ ...value, logoUrl: url })} />
        {businessName && (
          <p className="mt-3 text-[10px] text-white/55">
            {t("brand.noLogoHint")
              .split(/(\{wordmark\})/)
              .map((part, i) =>
                part === "{wordmark}" ? (
                  <span key={i} className="text-[#c9a961]">{wordmarkFrom(businessName)}</span>
                ) : (
                  <span key={i}>{part}</span>
                ),
              )}
          </p>
        )}
      </div>

      <div className="mt-6">
        <Field label={t("brand.tagline")} value={value.tagline_en} onChange={(v) => onChange({ ...value, tagline_en: v })} placeholder={t("brand.taglinePlaceholder")} />
      </div>

      <div className="mt-6">
        <label className="mb-1.5 block text-[10px] uppercase tracking-widest text-white/50">{t("brand.priceRange")}</label>
        <div className="flex gap-2">
          {PRICE_BANDS.map((p, i) => (
            <button
              key={p}
              type="button"
              onClick={() => onChange({ ...value, priceRange: p })}
              className={`rounded-xl border px-5 py-2.5 text-sm transition-colors ${
                priceLevel === i + 1
                  ? "border-[#c9a961] bg-[#c9a961]/10 text-[#c9a961]"
                  : "border-white/15 text-white/65 hover:border-white/30"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[10px] text-white/50">{t("brand.priceHint")}</p>
      </div>

      {/* Hero layout is a salon-template feature; template2 ships its own. */}
      {value.template === "salon" && (
      <div className="mt-6">
        <label className="mb-1.5 block text-[10px] uppercase tracking-widest text-white/50">{t("brand.heroLayout")}</label>
        <div className="grid gap-2 sm:grid-cols-3">
          {([
            { id: "split", label: t("brand.heroSplit"), hint: t("brand.heroSplitHint") },
            { id: "video", label: t("brand.heroVideo"), hint: t("brand.heroVideoHint") },
            { id: "showcase", label: t("brand.heroShowcase"), hint: t("brand.heroShowcaseHint") },
          ] as const).map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => onChange({ ...value, heroLayout: o.id })}
              className={`rounded-xl border p-3 text-left transition-colors ${
                value.heroLayout === o.id
                  ? "border-[#c9a961] bg-[#c9a961]/10"
                  : "border-white/15 hover:border-white/30"
              }`}
            >
              <HeroThumb layout={o.id} />
              <span className={`block text-xs font-semibold uppercase tracking-widest ${value.heroLayout === o.id ? "text-[#c9a961]" : "text-white/75"}`}>
                {o.label}
              </span>
              <span className="mt-1 block text-[10px] leading-relaxed text-white/50">{o.hint}</span>
            </button>
          ))}
        </div>
      </div>
      )}
    </div>
  );
}

/* ── Business sub-page: media ────────────────────────────────────────────
   Upload every business photo into one gallery, then hit "Distribute" — the
   wizard scatters them across every static image slot of the clean install
   (homepage hero, about, contact, CTA, both galleries) so the site launches
   looking finished instead of showing stock placeholders. */
function MediaStep({
  images, onImagesChange, distributed, onDistribute,
}: {
  images: string[];
  onImagesChange: (v: string[]) => void;
  distributed: boolean;
  onDistribute: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const { t } = useContext(WizardLangContext);

  async function uploadFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    setErr(null);
    const added: string[] = [];
    let failed = 0;
    for (const file of Array.from(files)) {
      try {
        const fd = new FormData();
        fd.append("file", file);
        const r = await fetch(withBasePath("/api/upload"), { method: "POST", body: fd });
        const d = await r.json().catch(() => ({}));
        if (r.ok && d.url) added.push(d.url);
        else failed++;
      } catch {
        failed++;
      }
    }
    if (added.length) onImagesChange([...images, ...added]);
    if (failed) setErr(failed === 1 ? t("media.errUploadOne") : fmt(t("media.errUploadMany"), { n: failed }));
    setBusy(false);
  }

  function removeAt(i: number) {
    onImagesChange(images.filter((_, idx) => idx !== i));
  }

  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.4em] text-[#c9a961]">{t("media.eyebrow")}</p>
      <h2 className="mt-2 font-serif text-3xl">{t("media.heading")}</h2>
      <p className="mt-2 text-sm text-white/55">
        {t("media.subtext")}
      </p>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#c9a961]">{t("media.galleryEyebrow")}</p>
            <p className="mt-1 text-xs text-white/55">{images.length === 1 ? t("media.photoCountOne") : fmt(t("media.photoCountMany"), { n: images.length })}</p>
          </div>
          <label className="cursor-pointer rounded-full bg-[#c9a961] px-5 py-2 text-[10px] font-semibold uppercase tracking-widest text-black hover:opacity-90">
            {busy ? t("media.uploading") : t("media.uploadPhotos")}
            <input
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp,image/avif,image/gif"
              className="hidden"
              onChange={(e) => { uploadFiles(e.target.files); e.target.value = ""; }}
            />
          </label>
        </div>

        {images.length > 0 ? (
          <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
            {images.map((src, i) => (
              <div key={src + i} className="group relative aspect-square overflow-hidden rounded-lg border border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={withBasePath(src)} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeAt(i)}
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-xs text-[#f5efe6]/80 opacity-0 transition-opacity hover:text-red-300 group-hover:opacity-100"
                  aria-label={t("media.removePhoto")}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-xl border border-dashed border-white/15 px-4 py-8 text-center text-xs text-white/40">
            {t("media.empty")}
          </p>
        )}
        {err && <p className="mt-3 text-xs text-red-300">{err}</p>}
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <p className="text-[10px] uppercase tracking-[0.3em] text-[#c9a961]">{t("media.distributeEyebrow")}</p>
        <p className="mt-1 text-xs text-white/55">
          {t("media.distributeHint")}
        </p>
        <button
          type="button"
          onClick={onDistribute}
          disabled={images.length === 0}
          className="mt-3 rounded-full border border-[#c9a961]/50 bg-[#c9a961]/10 px-6 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-[#c9a961] hover:bg-[#c9a961]/20 disabled:opacity-40"
        >
          {distributed ? t("media.reshuffle") : t("media.distribute")}
        </button>
        {distributed && (
          <p className="mt-3 rounded-xl border border-emerald-400/40 bg-emerald-500/[0.08] p-3 text-xs text-emerald-200">
            ✓ {t("media.distributed")}
          </p>
        )}
        {!distributed && images.length > 0 && (
          <p className="mt-3 text-[10px] text-white/45">
            {t("media.skipHint")}
          </p>
        )}
      </div>
    </div>
  );
}

/* ── Fresh-install step 6: booking rules ─────────────────────────────────
   Operational defaults for the booking engine. All have sane defaults. */
function BookingRulesStep({
  rules, onRulesChange, mode, onModeChange,
}: {
  rules: BookingRules;
  onRulesChange: (v: BookingRules) => void;
  mode: BookingMode;
  onModeChange: (m: BookingMode) => void;
}) {
  const { t } = useContext(WizardLangContext);
  const MODES: { id: BookingMode; label: string; desc: string }[] = [
    { id: "appointment", label: t("booking.modeAppointment"), desc: t("booking.modeAppointmentDesc") },
    { id: "reservation", label: t("booking.modeReservation"), desc: t("booking.modeReservationDesc") },
  ];
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.4em] text-[#c9a961]">{t("booking.eyebrow")}</p>
      <h2 className="mt-2 font-serif text-3xl">{t("booking.heading")}</h2>
      <p className="mt-2 text-sm text-white/55">{t("booking.subtext")}</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onModeChange(m.id)}
            className={`rounded-2xl border p-5 text-left transition-all ${
              mode === m.id
                ? "border-[#c9a961] bg-[#c9a961]/10"
                : "border-white/10 bg-white/[0.015] hover:border-white/25"
            }`}
          >
            <p className="font-serif text-lg text-white">{m.label}</p>
            <p className="mt-1 text-xs text-white/55">{m.desc}</p>
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <NumField label={t("booking.leadTime")} suffix={t("unit.minutes")} value={rules.leadTimeMinutes} onChange={(n) => onRulesChange({ ...rules, leadTimeMinutes: n })} />
        <NumField label={t("booking.cancelWindow")} suffix={t("unit.hours")} value={rules.cancellationWindowHours} onChange={(n) => onRulesChange({ ...rules, cancellationWindowHours: n })} />
        <NumField label={t("booking.deposit")} suffix="%" max={100} value={rules.depositPercent} onChange={(n) => onRulesChange({ ...rules, depositPercent: n })} />
        <NumField label={t("booking.noShowFee")} suffix="%" max={100} value={rules.noShowFeePercent} onChange={(n) => onRulesChange({ ...rules, noShowFeePercent: n })} />
      </div>
    </div>
  );
}

/* ── Fresh-install step 7: analytics ─────────────────────────────────────
   Paste-in tracking IDs. Fully optional and skippable. */
function AnalyticsStep({ value, onChange }: { value: Analytics; onChange: (v: Analytics) => void }) {
  const { t } = useContext(WizardLangContext);
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.4em] text-[#c9a961]">{t("analytics.eyebrow")}</p>
      <h2 className="mt-2 font-serif text-3xl">{t("analytics.heading")}</h2>
      <p className="mt-2 text-sm text-white/55">{t("analytics.subtext")}</p>

      <div className="mt-6 grid gap-4">
        <Field label={t("analytics.ga4")} value={value.ga4} onChange={(v) => onChange({ ...value, ga4: v })} placeholder="G-XXXXXXXXXX" />
        <Field label={t("analytics.gtm")} value={value.gtm} onChange={(v) => onChange({ ...value, gtm: v })} placeholder="GTM-XXXXXXX" />
        <Field label={t("analytics.metaPixel")} value={value.metaPixel} onChange={(v) => onChange({ ...value, metaPixel: v })} placeholder="000000000000000" />
      </div>
    </div>
  );
}

/* ── Fresh-install step 8: team ──────────────────────────────────────────
   Invite staff. Each gets a password-set link on first login. */
function TeamStep({
  teammates, onTeammatesChange,
}: {
  teammates: string[];
  onTeammatesChange: (v: string[]) => void;
}) {
  const [newMate, setNewMate] = useState("");
  const { t } = useContext(WizardLangContext);

  function addMate() {
    const e = newMate.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return;
    if (teammates.includes(e)) { setNewMate(""); return; }
    onTeammatesChange([...teammates, e]);
    setNewMate("");
  }

  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.4em] text-[#c9a961]">{t("team.eyebrow")}</p>
      <h2 className="mt-2 font-serif text-3xl">{t("team.heading")}</h2>
      <p className="mt-2 text-sm text-white/55">{t("team.subtext")}</p>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#c9a961]">{t("team.teammates")}</p>
          <p className="text-[10px] text-white/60">{teammates.length}/10</p>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            value={newMate}
            onChange={(e) => setNewMate(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addMate())}
            placeholder={t("team.placeholder")}
            className="flex-1 min-w-[240px] rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-[#c9a961]/60"
          />
          <button
            onClick={addMate}
            disabled={teammates.length >= 10}
            className="rounded-full border border-white/20 px-4 py-1.5 text-[10px] uppercase tracking-widest text-white/85 hover:bg-white/10 disabled:opacity-40"
          >
            {t("team.add")}
          </button>
        </div>

        {teammates.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {teammates.map((m) => (
              <span key={m} className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-xs text-white/80">
                {m}
                <button
                  onClick={() => onTeammatesChange(teammates.filter((x) => x !== m))}
                  className="text-white/50 hover:text-red-300"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Demo-install step 2: the essentials ─────────────────────────────────
   Demo mode copies the template's showcase content, so the buyer only needs
   the few things that genuinely must be theirs: name, logo, timezone. */
function DemoBasicsStep({
  value, onChange, brand, onBrandChange, enabledLanguages, onLanguagesChange,
}: {
  value: Business;
  onChange: (v: Business) => void;
  brand: Brand;
  onBrandChange: (v: Brand) => void;
  enabledLanguages: string[];
  onLanguagesChange: (v: string[]) => void;
}) {
  const { t } = useContext(WizardLangContext);
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.4em] text-[#c9a961]">{t("basics.eyebrow")}</p>
      <h2 className="mt-2 font-serif text-3xl">{t("basics.heading")}</h2>
      <p className="mt-2 text-sm text-white/55">{t("basics.subtext")}</p>

      <div className="mt-6 grid gap-4">
        <Field
          label={t("identity.fieldName")}
          value={value.name}
          onChange={(v) => onChange({ ...value, name: v })}
          placeholder={t("identity.namePlaceholder")}
        />
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <LogoUploader value={brand.logoUrl} onChange={(url) => onBrandChange({ ...brand, logoUrl: url })} />
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#c9a961]">{t("location.tzEyebrow")}</p>
          <p className="mt-1 text-xs text-white/55">
            {t("basics.tzHint")}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <select
              value={COMMON_TIMEZONES.some((t) => t.id === value.timezone) ? value.timezone : "__custom"}
              onChange={(e) => {
                const v = e.target.value;
                if (v !== "__custom") onChange({ ...value, timezone: v });
              }}
              className="flex-1 min-w-[220px] rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2.5 text-sm text-white outline-none focus:border-[#c9a961]/60"
            >
              {COMMON_TIMEZONES.map((tz) => (
                <option key={tz.id} value={tz.id} className="bg-[#0d0a07]">
                  {tz.label} · {tz.id}
                </option>
              ))}
              <option value="__custom" className="bg-[#0d0a07]">{t("location.tzCustom")}</option>
            </select>
            <input
              value={value.timezone}
              onChange={(e) => onChange({ ...value, timezone: e.target.value })}
              placeholder="Europe/London"
              className="flex-1 min-w-[180px] rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2.5 font-mono text-sm text-white placeholder-white/30 outline-none focus:border-[#c9a961]/60"
            />
          </div>
        </div>
      </div>

      <div className="mt-8 border-t border-white/10 pt-8">
        <LanguageStep value={enabledLanguages} onChange={onLanguagesChange} />
      </div>
    </div>
  );
}

/* Number input with a unit suffix, clamped to [min, max]. */
function NumField({
  label, value, onChange, suffix, min = 0, max,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  suffix?: string;
  min?: number;
  max?: number;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[10px] uppercase tracking-widest text-white/50">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          onChange={(e) => {
            let n = Number(e.target.value);
            if (!Number.isFinite(n)) n = min;
            n = Math.max(min, n);
            if (typeof max === "number") n = Math.min(max, n);
            onChange(n);
          }}
          className="w-28 rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2.5 text-sm text-white outline-none focus:border-[#c9a961]/60"
        />
        {suffix && <span className="text-xs text-white/50">{suffix}</span>}
      </div>
    </div>
  );
}

/* Logo uploader. Posts to /api/upload, which the install flow allows while
   the site is not yet onboarded (no admin session exists during setup). */
function LogoUploader({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const { t } = useContext(WizardLangContext);

  async function upload(file: File) {
    setBusy(true);
    setErr(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch(withBasePath("/api/upload"), { method: "POST", body: fd });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.url) {
        setErr(d.error || t("logo.errUpload"));
        return;
      }
      onChange(d.url);
    } catch {
      setErr(t("logo.errUpload"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <label className="mb-1.5 block text-[10px] uppercase tracking-widest text-white/50">{t("logo.label")}</label>
      <div className="flex flex-wrap items-center gap-3">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={withBasePath(value)}
            alt=""
            className="h-14 w-14 rounded-xl border border-white/15 bg-white/[0.04] object-contain p-1"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-dashed border-white/20 text-lg text-white/30">
            ◇
          </div>
        )}
        <label className="cursor-pointer rounded-full border border-white/20 px-4 py-1.5 text-[10px] uppercase tracking-widest text-white/85 hover:bg-white/10">
          {busy ? t("logo.uploading") : value ? t("logo.replace") : t("logo.upload")}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/avif,image/gif"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
              e.target.value = "";
            }}
          />
        </label>
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-[10px] uppercase tracking-widest text-white/50 hover:text-red-300"
          >
            {t("logo.remove")}
          </button>
        )}
      </div>
      {err && <p className="mt-1.5 text-xs text-red-300">{err}</p>}
    </div>
  );
}

// Day labels are now resolved via t("day.<id>") in HourRowEditor.

function HourRowEditor({ row, onChange }: { row: HourRow; onChange: (r: HourRow) => void }) {
  const hasSplit = !!(row.open2 && row.close2);
  const { t } = useContext(WizardLangContext);
  return (
    <div className="flex flex-wrap items-center gap-2 py-2.5 text-xs">
      <div className="w-10 font-semibold text-white/80">{t(`day.${row.day}`)}</div>
      <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-white/60">
        <input
          type="checkbox"
          checked={row.closed}
          onChange={(e) => onChange({ ...row, closed: e.target.checked })}
          className="h-3.5 w-3.5 accent-[#c9a961]"
        />
        {t("location.closed")}
      </label>
      {!row.closed && (
        <>
          <TimeInput value={row.open} onChange={(v) => onChange({ ...row, open: v })} />
          <span className="text-white/60">–</span>
          <TimeInput value={row.close} onChange={(v) => onChange({ ...row, close: v })} />
          {hasSplit ? (
            <>
              <span className="text-white/60">,</span>
              <TimeInput value={row.open2 || ""} onChange={(v) => onChange({ ...row, open2: v })} />
              <span className="text-white/60">–</span>
              <TimeInput value={row.close2 || ""} onChange={(v) => onChange({ ...row, close2: v })} />
              <button
                onClick={() => onChange({ ...row, open2: undefined, close2: undefined })}
                className="text-[10px] uppercase tracking-widest text-white/60 hover:text-red-300"
                title={t("location.removeSplitTitle")}
              >
                {t("location.removeSplit")}
              </button>
            </>
          ) : (
            <button
              onClick={() => onChange({ ...row, open2: "17:00", close2: "20:00" })}
              className="rounded-full border border-white/15 px-2.5 py-0.5 text-[9px] uppercase tracking-widest text-white/60 hover:bg-white/10"
            >
              {t("location.addSplit")}
            </button>
          )}
        </>
      )}
    </div>
  );
}

function TimeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="time"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-24 rounded-md border border-white/15 bg-white/[0.04] px-2 py-1 font-mono text-xs text-white outline-none focus:border-[#c9a961]/60"
    />
  );
}

function AdminStep({
  value, onChange,
}: {
  value: Admin;
  onChange: (v: Admin) => void;
}) {
  const passMatch = !value.confirm || value.password === value.confirm;
  const passValid = value.password.length >= 8;
  const [showPass, setShowPass] = useState(false);
  const [copied, setCopied] = useState(false);
  const { t } = useContext(WizardLangContext);

  function generate() {
    const p = generatePassword();
    onChange({ ...value, password: p, confirm: p });
  }
  function copyPassword() {
    if (!value.password) return;
    navigator.clipboard?.writeText(value.password).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.3em] text-[#c9a961]">{t("admin.eyebrow")}</p>
      <h3 className="mt-2 font-serif text-2xl">{t("admin.heading")}</h3>
      <p className="mt-2 text-sm text-white/55">
        {t("admin.subtext")
          .split(/(\{admin\})/)
          .map((part, i) =>
            part === "{admin}" ? (
              <code key={i} className="text-white/80">/admin</code>
            ) : (
              <span key={i}>{part}</span>
            ),
          )}
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Field label={t("admin.email")} value={value.email} onChange={(v) => onChange({ ...value, email: v })} placeholder={t("admin.emailPlaceholder")} type="email" />
        <div className="flex items-end">
          <button
            onClick={generate}
            className="w-full rounded-xl border border-[#c9a961]/40 bg-[#c9a961]/10 px-4 py-2.5 text-xs font-semibold uppercase tracking-widest text-[#c9a961] hover:bg-[#c9a961]/20"
          >
            {t("admin.generate")}
          </button>
        </div>

        <div>
          <label className="mb-1.5 block text-[10px] uppercase tracking-widest text-white/50">{t("admin.password")}</label>
          <div className="relative">
            <input
              type={showPass ? "text" : "password"}
              value={value.password}
              onChange={(e) => onChange({ ...value, password: e.target.value })}
              placeholder={t("admin.passwordPlaceholder")}
              className="w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2.5 pr-24 text-sm text-white placeholder-white/30 outline-none focus:border-[#c9a961]/60"
            />
            <div className="absolute right-1 top-1/2 flex -translate-y-1/2 gap-1">
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="rounded-full px-2 py-1 text-[9px] uppercase tracking-widest text-white/60 hover:bg-white/10"
              >
                {showPass ? t("admin.hide") : t("admin.show")}
              </button>
              <button
                type="button"
                onClick={copyPassword}
                disabled={!value.password}
                className="rounded-full px-2 py-1 text-[9px] uppercase tracking-widest text-[#c9a961] hover:bg-[#c9a961]/20 disabled:opacity-30"
              >
                {copied ? t("admin.copied") : t("admin.copy")}
              </button>
            </div>
          </div>
        </div>

        <Field label={t("admin.confirm")} value={value.confirm} onChange={(v) => onChange({ ...value, confirm: v })} placeholder={t("admin.confirmPlaceholder")} type={showPass ? "text" : "password"} />
      </div>

      <div className="mt-4 space-y-1 text-xs">
        <Check ok={passValid} label={t("admin.check8")} />
        <Check ok={passMatch && !!value.confirm} label={t("admin.checkMatch")} />
      </div>
    </div>
  );
}

function Check({ ok, label }: { ok: boolean; label: string }) {
  return (
    <p className={ok ? "text-emerald-300" : "text-white/60"}>
      {ok ? "✓" : "○"} {label}
    </p>
  );
}

function ReviewStep({
  template, business, admin, teammates, licenseFirstName, dataMode,
  social, brand, bookingRules, bookingMode, analytics,
  installing, progress, error, onInstall, totalSteps, isTenant,
}: {
  template: Template | null;
  business: Business;
  admin: Admin;
  teammates: string[];
  licenseFirstName: string | null;
  dataMode: "clean" | "demo";
  isTenant: boolean;
  social: Social;
  brand: Brand;
  bookingRules: BookingRules;
  bookingMode: BookingMode;
  analytics: Analytics;
  installing: boolean;
  progress: string[];
  error: string | null;
  onInstall: () => void;
  totalSteps: number;
}) {
  const hasSocial = !!(social.instagram || social.facebook || social.whatsapp || social.tiktok);
  const hasAnalytics = !!(analytics.ga4 || analytics.gtm || analytics.metaPixel);
  const hasBrand = !!(brand.logoUrl || brand.tagline_en || brand.tagline_el);
  const fresh = dataMode !== "demo";
  const { t } = useContext(WizardLangContext);
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.4em] text-[#c9a961]">{fmt(t("review.stepOf"), { n: totalSteps })}</p>
      <h2 className="mt-2 font-serif text-3xl">{t("review.heading")}</h2>
      <p className="mt-2 text-sm text-white/55">{t("review.subtext")}</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <ReviewCard title={t("review.cardLicense")}>
          <p className="font-mono text-sm">{licenseFirstName ? fmt(t("review.licensedTo"), { name: licenseFirstName }) : t("review.licenseVerified")}</p>
          <p className="mt-1 text-xs text-white/50">{t("review.licenseHint")}</p>
        </ReviewCard>
        <ReviewCard title={t("review.cardStart")}>
          {dataMode === "demo" || isTenant ? (
            <>
              <p className="font-serif text-lg text-[#c9a961]">{t("review.exampleSalon")}</p>
              <p className="mt-1 text-xs text-white/50">{t("review.exampleHint")}</p>
            </>
          ) : (
            <>
              <p className="font-serif text-lg">{t("review.freshStart")}</p>
              <p className="mt-1 text-xs text-white/50">{t("review.freshHint")}</p>
            </>
          )}
        </ReviewCard>
        {template && (
          <ReviewCard title={t("review.cardTemplate")}>
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={clientPath(template.cover)} alt="" className="h-14 w-24 rounded-lg border border-white/10 object-cover" />
              <div>
                <p className="font-serif text-lg">{template.name}</p>
                <p className="text-xs text-white/50">{template.industry}</p>
              </div>
            </div>
          </ReviewCard>
        )}
        <ReviewCard title={t("review.cardBusiness")}>
          <p className="font-serif text-lg">{business.name}</p>
          <p className="mt-1 text-xs text-white/60">
            {[business.streetAddress, business.postalCode, business.city, business.country]
              .filter(Boolean)
              .join(", ")}
          </p>
          {(business.phone || business.email) && (
            <p className="mt-1 text-xs text-white/50">
              {business.phone}{business.phone && business.email ? " · " : ""}{business.email}
            </p>
          )}
        </ReviewCard>
        <ReviewCard title={t("review.cardAdminLogin")}>
          <p className="font-mono text-sm">{admin.email}</p>
          <p className="mt-1 text-xs text-white/50">{t("review.adminHint")}</p>
          {teammates.length > 0 && (
            <p className="mt-2 text-xs text-white/60">{teammates.length === 1 ? t("review.teammatesOne") : fmt(t("review.teammatesMany"), { n: teammates.length })}</p>
          )}
        </ReviewCard>
        <ReviewCard title={t("review.cardTimezone")}>
          <p className="font-mono text-sm">{business.timezone}</p>
          <p className="mt-1 text-xs text-white/50">{t("review.timezoneHint")}</p>
        </ReviewCard>
        <ReviewCard title={t("review.cardHours")}>
          <ul className="space-y-0.5 text-xs text-white/75 font-mono">
            {business.hours.map((h) => (
              <li key={h.day} className="flex justify-between gap-3">
                <span className="uppercase text-white/50">{h.day}</span>
                <span>
                  {h.closed
                    ? t("review.closed")
                    : `${h.open}–${h.close}${h.open2 && h.close2 ? `, ${h.open2}–${h.close2}` : ""}`}
                </span>
              </li>
            ))}
          </ul>
        </ReviewCard>
        {hasBrand && (
          <ReviewCard title={t("review.cardBrand")}>
            <div className="flex items-center gap-3">
              {brand.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={withBasePath(brand.logoUrl)} alt="" className="h-12 w-12 rounded-lg border border-white/10 bg-white/[0.04] object-contain p-1" />
              ) : null}
              <div>
                <p className="text-sm">{brand.tagline_en || t("review.logoSet")}</p>
                <p className="mt-0.5 text-xs text-white/50">{fmt(t("review.priceRange"), { range: brand.priceRange })}</p>
              </div>
            </div>
          </ReviewCard>
        )}
        {fresh && (
          <ReviewCard title={t("review.cardBookingRules")}>
            <p className="font-serif text-lg">{bookingMode === "appointment" ? t("review.modeAppointment") : t("review.modeReservation")}</p>
            <p className="mt-1 text-xs text-white/55">
              {fmt(t("review.bookingSummary"), {
                lead: bookingRules.leadTimeMinutes,
                cancel: bookingRules.cancellationWindowHours,
              })}
              {bookingRules.depositPercent > 0 ? fmt(t("review.depositSuffix"), { pct: bookingRules.depositPercent }) : ""}
            </p>
          </ReviewCard>
        )}
        {hasSocial && (
          <ReviewCard title={t("review.cardSocial")}>
            <ul className="space-y-0.5 text-xs text-white/75">
              {social.instagram && <li>Instagram · {social.instagram}</li>}
              {social.facebook && <li>Facebook · {social.facebook}</li>}
              {social.whatsapp && <li>WhatsApp · {social.whatsapp}</li>}
              {social.tiktok && <li>TikTok · {social.tiktok}</li>}
            </ul>
          </ReviewCard>
        )}
        {hasAnalytics && (
          <ReviewCard title={t("review.cardAnalytics")}>
            <ul className="space-y-0.5 font-mono text-xs text-white/75">
              {analytics.ga4 && <li>GA4 · {analytics.ga4}</li>}
              {analytics.gtm && <li>GTM · {analytics.gtm}</li>}
              {analytics.metaPixel && <li>Pixel · {analytics.metaPixel}</li>}
            </ul>
          </ReviewCard>
        )}
      </div>

      {error && (
        <p className="mt-5 rounded-xl border border-red-400/40 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </p>
      )}

      <div className="mt-8 flex items-center justify-end">
        <button
          onClick={onInstall}
          disabled={installing}
          className="rounded-full px-10 py-3 text-xs font-semibold uppercase tracking-widest text-black hover:opacity-90 disabled:opacity-50"
          style={{ background: "#c9a961" }}
        >
          {installing ? t("review.installing") : `${t("review.installLaunch")} →`}
        </button>
      </div>

      {installing && <InstallProgress events={progress} />}
    </div>
  );
}

function InstallProgress({ events }: { events: string[] }) {
  const { t } = useContext(WizardLangContext);
  return (
    <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-5 font-mono text-xs text-white/70">
      <p className="mb-3 text-[10px] uppercase tracking-[0.3em] text-[#c9a961]">{t("install.logTitle")}</p>
      <ul className="space-y-1.5">
        {events.length === 0 ? (
          <li className="text-white/60">{t("install.starting")}</li>
        ) : events.map((line, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="text-emerald-400">✓</span>
            <span>{line}</span>
          </li>
        ))}
        <li className="flex items-center gap-2 text-white/50">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[#c9a961]" />
          <span>{t("install.working")}</span>
        </li>
      </ul>
    </div>
  );
}

function ReviewCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <p className="text-[10px] uppercase tracking-[0.3em] text-[#c9a961]">{title}</p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function DoneStep({ business, template }: { business: Business; template: Template | null }) {
  const [qrSvg, setQrSvg] = useState<string>("");
  const { t } = useContext(WizardLangContext);
  useEffect(() => {
    try {
      const origin = window.location.origin;
      setQrSvg(qrToSvg(origin + clientPath("/"), 200, "#0a0806", "#ffffff"));
    } catch {}
  }, []);
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative overflow-hidden rounded-3xl border border-emerald-400/40 bg-emerald-500/5 p-8 sm:p-12 text-center"
    >
      <Confetti />
      <div className="relative">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-2 border-emerald-400 bg-emerald-500/20 text-3xl">
          ✓
        </div>
        <p className="mt-6 text-[10px] uppercase tracking-[0.4em] text-emerald-300">{t("done.eyebrow")}</p>
        <h2 className="mt-2 font-serif text-4xl">{t("done.heading")}</h2>
        <p className="mt-3 text-base text-white/70">
          {t("done.body")
            .split(/(\{name\}|\{template\})/)
            .map((part, i) =>
              part === "{name}" ? (
                <span key={i}>{business.name}</span>
              ) : part === "{template}" ? (
                <strong key={i}>{template?.name}</strong>
              ) : (
                <span key={i}>{part}</span>
              ),
            )}
        </p>

        <div className="mx-auto mt-8 grid max-w-2xl gap-6 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <div className="flex flex-wrap justify-center gap-3 sm:justify-start">
              <a
                href={clientPath("/")}
                className="rounded-full px-8 py-3 text-xs font-semibold uppercase tracking-widest text-black hover:opacity-90"
                style={{ background: "#c9a961" }}
              >
                {t("done.viewSite")} →
              </a>
              <a
                href={clientPath("/admin")}
                className="rounded-full border border-white/30 px-8 py-3 text-xs uppercase tracking-widest text-white hover:bg-white/10"
              >
                {t("done.openAdmin")} →
              </a>
            </div>
            <p className="mt-4 text-xs text-white/50 sm:text-left">
              {t("done.qrHint")}
            </p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div
              className="overflow-hidden rounded-xl border border-white/15 p-2"
              dangerouslySetInnerHTML={{ __html: qrSvg || "" }}
            />
            <p className="text-[9px] uppercase tracking-widest text-white/60">{t("done.qrCaption")}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function Confetti() {
  const pieces = Array.from({ length: 40 }, (_, i) => i);
  const colors = ["#c9a961", "#c9a961", "#6aa0ff", "#e3c88a", "#5eb894"];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 0.4;
        const duration = 2 + Math.random() * 1.5;
        const rotate = Math.random() * 720 - 360;
        const color = colors[i % colors.length];
        return (
          <motion.span
            key={i}
            initial={{ y: -20, opacity: 0, rotate: 0 }}
            animate={{ y: "110vh", opacity: [0, 1, 1, 0], rotate }}
            transition={{ duration, delay, ease: "easeIn" }}
            className="absolute block h-2 w-1.5 rounded-sm"
            style={{ left: `${left}%`, top: 0, background: color }}
          />
        );
      })}
    </div>
  );
}

function Field({
  label, value, onChange, placeholder, type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[10px] uppercase tracking-widest text-white/50">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-[#c9a961]/60"
      />
    </div>
  );
}
