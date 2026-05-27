import { getAppRoot, getBaseRoot } from "@/lib/appRoot";
import { getCurrentTenant } from "@/lib/tenantContext";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { promises as fs } from "fs";
import path from "path";
import { randomBytes } from "crypto";
import { loadSettings, saveSettings, type BusinessSettings } from "../../../lib/settings";
import { DEFAULT_TEMPLATE, isValidTemplateId } from "@/templates/registry";
import { createUser, findUserByEmail, signSession } from "../../../lib/users";
import { recordInstall } from "../../../lib/installStats";

// Crypto-strong random password for invited teammates. They can't use it to
// log in directly — the account is flagged mustChangePassword, and the
// teammate is expected to hit /admin/reset with their email.
function randomTeammatePassword(): string {
  return randomBytes(18).toString("base64url");
}

function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  const host = req.headers.get("host");
  if (!host) return true; // local dev curl — allow
  const expected = new Set([`http://${host}`, `https://${host}`]);
  if (origin && expected.has(origin)) return true;
  if (referer) {
    try {
      const r = new URL(referer);
      if (expected.has(`${r.protocol}//${r.host}`)) return true;
    } catch {}
  }
  // No Origin and no matching Referer → refuse. Browsers always send one for
  // same-site POSTs, so a missing pair means a cross-site form submission.
  return !origin && !referer;
}

const DATA_DIR = () => path.join(getAppRoot(), "data");
const DEMOS_DIR = () => path.join(getBaseRoot(), "demos");
const COOKIE = "atelier_session";

type Input = {
  templateId: string;
  mode: "clean" | "demo";
  /** ATL-XXXX-XXXX-XXXX-XXXX. Server re-validates against the mothership. */
  licenseKey: string;
  business: {
    name: string;
    city: string;
    country?: string;
    streetAddress?: string;
    postalCode?: string;
    phone?: string;
    email?: string;
    timezone?: string;
    hours?: Array<{
      day: string;
      open: string;
      close: string;
      closed: boolean;
      open2?: string;
      close2?: string;
    }>;
    social?: { instagram?: string; facebook?: string; whatsapp?: string; tiktok?: string };
    priceRange?: string;
  };
  admin: {
    email: string;
    password: string;
  };
  teammates?: string[];
  /** Languages the shop will show visitors. "en" is always included server-side. */
  enabledLanguages?: string[];
  /** Buyer-supplied brand bits collected in the fresh-install Business step. */
  branding?: { tagline_en?: string; tagline_el?: string; logoUrl?: string };
  /** Booking engine defaults set in the wizard. */
  bookingRules?: {
    leadTimeMinutes?: number;
    cancellationWindowHours?: number;
    depositPercent?: number;
    noShowFeePercent?: number;
  };
  bookingMode?: "appointment" | "reservation";
  /** The front-end template ("skin") the buyer picked in the wizard. Distinct
   *  from `templateId`, which selects the industry data set. */
  siteTemplate?: string;
  /** Optional tracking IDs. */
  analytics?: { ga4?: string; gtm?: string; metaPixel?: string; metaCapiToken?: string; ga4ApiSecret?: string };
  /** A pre-built content.json — the wizard's media step spreads the buyer's
   *  uploaded photos across the static image slots. Clean installs only. */
  content?: Record<string, unknown>;
};

const LICENSE_VALIDATE_URL =
  process.env.ATELIER_LICENSE_URL ||
  process.env.NEXT_PUBLIC_ATELIER_LICENSE_URL ||
  "https://atelier.mindscrollers.com/api/licenses/validate";

// The activate endpoint lives next to validate on the mothership.
const LICENSE_ACTIVATE_URL = LICENSE_VALIDATE_URL.replace(/\/validate\/?$/, "/activate");

type ValidateResult =
  | { valid: true; key: string; packageId: string; firstName: string | null }
  | { valid: false; reason: string };

async function validateLicenseServerSide(rawKey: string): Promise<ValidateResult> {
  const url = `${LICENSE_VALIDATE_URL}?key=${encodeURIComponent(rawKey)}`;
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok && r.status !== 200) {
    return { valid: false, reason: "validate-unreachable" };
  }
  const body = (await r.json().catch(() => ({}))) as Partial<ValidateResult>;
  if (!body || typeof body.valid !== "boolean") {
    return { valid: false, reason: "validate-bad-response" };
  }
  return body as ValidateResult;
}

type ActivateResult =
  | { ok: true; domain: string; bound: boolean }
  | {
      ok: false;
      reason: string;
      boundDomain?: string;
      activations?: string[];
      maxActivations?: number;
    };

/**
 * Bind this license to the install's own domain. Each package has an
 * activation cap (self-hosted: 1, agency: 5): an install beyond the cap is
 * refused by the mothership with reason "max-activations". Local/private
 * hosts are allowed through without consuming a slot.
 */
async function activateLicenseServerSide(rawKey: string, domain: string): Promise<ActivateResult> {
  try {
    const r = await fetch(LICENSE_ACTIVATE_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key: rawKey, domain }),
      cache: "no-store",
    });
    const body = (await r.json().catch(() => ({}))) as Partial<ActivateResult>;
    if (!body || typeof body.ok !== "boolean") {
      return { ok: false, reason: "activate-bad-response" };
    }
    return body as ActivateResult;
  } catch {
    return { ok: false, reason: "activate-unreachable" };
  }
}

// Runtime data — per-install records. Always empty on fresh install unless
// the buyer explicitly picked "demo" mode (then we carry the showcase samples
// so they can see how it feels populated).
const OPERATIONAL = new Set([
  "bookings.json",
  "orders.json",
  "views.json",
  "clients.json",
  "audit.json",
  "waitlist.json",
  "reviews.json",
  "emails.log.json",
]);

// Catalogue data — services, staff, products, pages, blog taxonomy, site
// copy. In demo mode we copy the template's showcase content. In clean mode
// the buyer starts with a genuinely empty catalogue and builds it themselves
// — otherwise "clean" is just a re-skinned demo.
const TEMPLATE_ARRAYS = new Set([
  "products.json",
  "pages.json",
  "blog-categories.json",
  "services.json",
  "staff.json",
]);
async function copyIfExists(src: string, dst: string) {
  try {
    const raw = await fs.readFile(src, "utf-8");
    await fs.writeFile(dst, raw, "utf-8");
    return true;
  } catch {
    return false;
  }
}

async function writeEmptyArray(dst: string) {
  await fs.writeFile(dst, "[]\n", "utf-8");
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "Cross-origin install requests refused." }, { status: 403 });
  }

  const current = await loadSettings();
  if (current.onboarded) {
    return NextResponse.json(
      { error: "This site is already set up. Sign in at /admin/login." },
      { status: 400 }
    );
  }

  const body = (await req.json().catch(() => ({}))) as Partial<Input>;
  if (!body.templateId || !body.mode || !body.business || !body.admin) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }
  if (!body.business.name) {
    return NextResponse.json({ error: "Business name is required." }, { status: 400 });
  }
  // City is required for a fresh install (it seeds the contact page and
  // schema). A demo install copies the showcase content, so the buyer only
  // supplies name / logo / timezone and fills the rest in admin later.
  if (body.mode !== "demo" && !body.business.city) {
    return NextResponse.json({ error: "Business city is required." }, { status: 400 });
  }
  if (!body.admin.email || !body.admin.password) {
    return NextResponse.json({ error: "Admin email and password are required." }, { status: 400 });
  }
  if (body.admin.password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }
  // SaaS-hosted tenants are provisioned and paid through Stripe by us, so the
  // install wizard never asks for a license key and this route skips the whole
  // validate + domain-bind gate. Standalone customer installs still require a
  // valid, unbound key.
  const tenantSlug = getCurrentTenant();
  let licenseInfo: {
    key: string | null;
    packageId: string;
    firstName?: string;
    boundDomain: string | null;
    validatedAt: string;
  };

  if (tenantSlug) {
    licenseInfo = {
      key: null,
      packageId: "saas",
      boundDomain: null,
      validatedAt: new Date().toISOString(),
    };
  } else {
    if (!body.licenseKey) {
      return NextResponse.json({ error: "License key is required." }, { status: 400 });
    }

    // Re-validate server-side so a doctored client can't bypass the license gate.
    const validation = await validateLicenseServerSide(body.licenseKey);
    if (!validation.valid) {
      const reason =
        validation.reason === "revoked"
          ? "This license has been revoked. Contact support."
          : validation.reason === "not-found"
          ? "We can't find that license. Double-check the key from your purchase email."
          : validation.reason === "bad-format"
          ? "That key doesn't look right. Expected ATL-XXXX-XXXX-XXXX-XXXX."
          : "We couldn't verify your license. Check your internet connection and try again.";
      return NextResponse.json({ error: reason }, { status: 400 });
    }
    // Bind the license to this domain. One license, one domain: if the key is
    // already installed on a different site, the mothership refuses here and
    // the install stops before any data is written.
    const installDomain = req.headers.get("host") || "";
    const activation = await activateLicenseServerSide(validation.key, installDomain);
    if (!activation.ok) {
      const reason =
        activation.reason === "max-activations"
          ? `This license has been activated on the maximum number of sites ` +
            `(${activation.maxActivations ?? activation.activations?.length ?? 1}). ` +
            "Release a previous activation in your customer account at " +
            "atelier.mindscrollers.com/support/account, or contact support."
          : activation.reason === "bound-elsewhere"
          ? `This license is already installed on ${activation.boundDomain || "another domain"}. ` +
            "Contact support to move it."
          : activation.reason === "revoked"
          ? "This license has been revoked. Contact support."
          : activation.reason === "not-found"
          ? "We can't find that license. Double-check the key from your purchase email."
          : "We couldn't activate your license. Check your internet connection and try again.";
      return NextResponse.json(
        {
          error: reason,
          reason: activation.reason,
          ...(activation.reason === "max-activations"
            ? { maxActivations: activation.maxActivations }
            : {}),
        },
        { status: 400 },
      );
    }

    licenseInfo = {
      key: validation.key,
      packageId: validation.packageId,
      firstName: validation.firstName ?? undefined,
      boundDomain: activation.bound ? activation.domain : null,
      validatedAt: new Date().toISOString(),
    };
  }

  // Load template meta
  const templateDir = path.join(DEMOS_DIR(), body.templateId);
  let meta: Record<string, unknown>;
  try {
    meta = JSON.parse(await fs.readFile(path.join(templateDir, "meta.json"), "utf-8"));
  } catch {
    return NextResponse.json({ error: "Template not found." }, { status: 404 });
  }

  const existing = await findUserByEmail(body.admin.email);
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists." },
      { status: 400 }
    );
  }

  await fs.mkdir(DATA_DIR(), { recursive: true });

  const templateDataDir = path.join(templateDir, "data");

  // 1. Catalogue data (services / staff / products / pages / blog / content).
  // Demo mode copies the showcase; clean mode writes empty defaults so the
  // buyer actually starts from a blank site.
  for (const f of TEMPLATE_ARRAYS) {
    const dst = path.join(DATA_DIR(), f);
    if (body.mode === "demo") {
      const copied = await copyIfExists(path.join(templateDataDir, f), dst);
      if (!copied) await writeEmptyArray(dst);
    } else {
      await writeEmptyArray(dst);
    }
  }
  // Content (page copy + sections).
  //  - "demo" mode seeds the showcase's content.json verbatim, so the install
  //    is an exact copy of the /barber demo: same copy, images, galleries.
  //  - "clean" / "start fresh" mode writes a blank content.json: every page
  //    renders its default headers from the i18n fallback with no demo images,
  //    no galleries and no logo — a truly empty, optimized starting point.
  // Either way, photos the buyer distributed in the wizard's media step merge
  // on top, section by section, so the buyer's own content always wins.
  const hasWizardContent =
    !!body.content &&
    typeof body.content === "object" &&
    !Array.isArray(body.content) &&
    Object.keys(body.content).length > 0;
  {
    const dst = path.join(DATA_DIR(), "content.json");
    let content: Record<string, unknown> = {};
    if (body.mode === "demo") {
      try {
        content = JSON.parse(
          await fs.readFile(path.join(templateDataDir, "content.json"), "utf-8"),
        );
      } catch {
        content = {};
      }
    }
    if (hasWizardContent) {
      const overrides = body.content as Record<string, unknown>;
      for (const [section, patch] of Object.entries(overrides)) {
        const base = content[section];
        const baseIsObj = !!base && typeof base === "object" && !Array.isArray(base);
        const patchIsObj = !!patch && typeof patch === "object" && !Array.isArray(patch);
        content[section] =
          baseIsObj && patchIsObj
            ? { ...(base as Record<string, unknown>), ...(patch as Record<string, unknown>) }
            : patch;
      }
    }
    await fs.writeFile(dst, JSON.stringify(content, null, 2) + "\n", "utf-8");
  }

  // 2. Operational data (bookings / orders / views / clients / audit / etc).
  // Demo mode carries sample records if the bundle has any; clean mode is
  // always empty.
  for (const f of OPERATIONAL) {
    const dst = path.join(DATA_DIR(), f);
    if (body.mode === "demo") {
      const copied = await copyIfExists(path.join(templateDataDir, f), dst);
      if (!copied) await writeEmptyArray(dst);
    } else {
      await writeEmptyArray(dst);
    }
  }

  // 3. Admin user
  await createUser({
    email: body.admin.email,
    password: body.admin.password,
    role: "admin",
  });

  // 3b. Invited teammates — crypto-strong placeholder, flagged must-change.
  // Teammates activate via "Forgot password" on /admin/login. We deliberately
  // don't log or email the generated password; it exists only to satisfy the
  // passwordHash requirement until they set their own.
  if (Array.isArray(body.teammates)) {
    for (const email of body.teammates) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) continue;
      try {
        await createUser({
          email,
          password: randomTeammatePassword(),
          role: "barber",
          mustChangePassword: true,
        });
      } catch {
        // skip duplicates
      }
    }
  }

  // 4. Settings: business, branding, theme, typography, nav from template meta
  const ALLOWED_DAYS = new Set(["mon","tue","wed","thu","fri","sat","sun"]);
  const providedHours = Array.isArray(body.business.hours)
    ? body.business.hours
        .filter((h): h is NonNullable<typeof h> => !!h && ALLOWED_DAYS.has(h.day))
        .map((h) => ({
          day: h.day as "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun",
          open: String(h.open || "09:00"),
          close: String(h.close || "18:00"),
          closed: !!h.closed,
          ...(h.open2 && h.close2 ? { open2: String(h.open2), close2: String(h.close2) } : {}),
        }))
    : [];
  const hoursInput = providedHours.length === 7 ? providedHours : [
    { day: "mon" as const, open: "10:00", close: "19:00", closed: false },
    { day: "tue" as const, open: "10:00", close: "19:00", closed: false },
    { day: "wed" as const, open: "10:00", close: "19:00", closed: false },
    { day: "thu" as const, open: "10:00", close: "19:00", closed: false },
    { day: "fri" as const, open: "10:00", close: "19:00", closed: false },
    { day: "sat" as const, open: "10:00", close: "17:00", closed: false },
    { day: "sun" as const, open: "00:00", close: "00:00", closed: true },
  ];

  // Sanitisers for the buyer-supplied numeric booking rules.
  const clampNonNeg = (n: unknown, fallback: number) => {
    const v = Number(n);
    return Number.isFinite(v) ? Math.max(0, Math.round(v)) : fallback;
  };
  const clampPct = (n: unknown, fallback: number) => {
    const v = Number(n);
    return Number.isFinite(v) ? Math.min(100, Math.max(0, Math.round(v))) : fallback;
  };

  const business: BusinessSettings = {
    name: body.business.name,
    streetAddress: body.business.streetAddress || "",
    city: body.business.city || "",
    postalCode: body.business.postalCode || "",
    country: body.business.country || "GB",
    phone: body.business.phone || "",
    email: body.business.email || body.admin.email,
    timezone: body.business.timezone || "Europe/London",
    latitude: null,
    longitude: null,
    hours: hoursInput,
    social: {
      instagram: body.business.social?.instagram || "",
      facebook: body.business.social?.facebook || "",
      whatsapp: body.business.social?.whatsapp || "",
      tiktok: body.business.social?.tiktok || "",
    },
    priceRange: body.business.priceRange || "$$",
    bookingRules: {
      leadTimeMinutes: clampNonNeg(body.bookingRules?.leadTimeMinutes, 45),
      cancellationWindowHours: clampNonNeg(body.bookingRules?.cancellationWindowHours, 4),
      depositPercent: clampPct(body.bookingRules?.depositPercent, 0),
      noShowFeePercent: clampPct(body.bookingRules?.noShowFeePercent, 50),
    },
  };

  // Languages the shop shows visitors. English is always on; anything not in
  // the supported set is dropped.
  const VALID_LANGS = new Set(["en", "el", "de", "fr", "it", "es", "nl", "pl", "pt", "sv", "sq"]);
  const langList = Array.isArray(body.enabledLanguages)
    ? body.enabledLanguages.filter((l) => typeof l === "string" && VALID_LANGS.has(l))
    : [];
  const enabledLanguages = langList.includes("en") ? langList : ["en", ...langList];

  const metaBranding = (meta.branding as Record<string, string> | undefined) ?? {};
  const metaTheme = (meta.theme as Record<string, string> | undefined) ?? {};
  const metaTypography = (meta.typography as Record<string, string> | undefined) ?? {};
  const metaNav = meta.nav as
    | { links?: Array<{ id: string; label_en: string; label_el: string; href: string; enabled?: boolean }>; bookLabel_en?: string; bookLabel_el?: string; bookHref?: string }
    | undefined;

  // If the buyer picked "demo" mode we keep the template's own wordmark/logo
  // so the seeded content still looks coherent. On "clean" mode we always
  // stamp the buyer's business name — otherwise the template's brand bleeds
  // into their live site (e.g. the template brand showing up on a yoga studio).
  const useTemplateBrand = body.mode === "demo";
  // Buyer-supplied brand bits always win over the template's. A buyer can
  // upload a logo and set a tagline in either mode; only where they leave a
  // field blank does a demo install fall back to the template's brand.
  const buyerBranding = body.branding ?? {};
  const buyerMode =
    body.bookingMode === "reservation" || body.bookingMode === "appointment"
      ? body.bookingMode
      : null;
  await saveSettings({
    ...current,
    business,
    enabledLanguages,
    analytics: {
      ga4: body.analytics?.ga4 || "",
      gtm: body.analytics?.gtm || "",
      metaPixel: body.analytics?.metaPixel || "",
      metaCapiToken: body.analytics?.metaCapiToken || "",
      ga4ApiSecret: body.analytics?.ga4ApiSecret || "",
    },
    branding: {
      logoUrl: buyerBranding.logoUrl || (useTemplateBrand ? (metaBranding.logoUrl || "") : ""),
      faviconUrl: useTemplateBrand ? (metaBranding.faviconUrl || "") : "",
      wordmark: useTemplateBrand && metaBranding.wordmark
        ? metaBranding.wordmark
        : body.business.name.toUpperCase().slice(0, 24),
      tagline_en: buyerBranding.tagline_en || (useTemplateBrand ? (metaBranding.tagline_en || "") : ""),
      tagline_el: buyerBranding.tagline_el
        || (useTemplateBrand ? (metaBranding.tagline_el || metaBranding.tagline_en || "") : ""),
    },
    nav: metaNav && Array.isArray(metaNav.links) && metaNav.links.length > 0
      ? {
          links: metaNav.links.map((l) => ({ ...l, enabled: l.enabled !== false })),
          bookLabel_en: metaNav.bookLabel_en || "Book",
          bookLabel_el: metaNav.bookLabel_el || "Κράτηση",
          bookHref: metaNav.bookHref || "/book",
        }
      : current.nav,
    theme: Object.keys(metaTheme).length > 0 ? (metaTheme as never) : current.theme,
    typography: Object.keys(metaTypography).length > 0 ? (metaTypography as never) : current.typography,
    bookingMode: buyerMode ?? (meta.bookingMode === "reservation" ? "reservation" : "appointment"),
    industryId: typeof meta.industryId === "string" ? (meta.industryId as string) : "barber",
    // The front-end skin the public site renders. Falls back to the salon
    // design when the wizard sent nothing or an unknown value.
    template: isValidTemplateId(body.siteTemplate) ? body.siteTemplate : DEFAULT_TEMPLATE,
    license: licenseInfo,
    // NB: onboarded stays false here — we only flip it after the session is
    // successfully signed below. Otherwise a cookie failure locks the buyer
    // out of the wizard AND the admin, with no recovery path.
    onboarded: false,
  });

  // 5. Sign in — must succeed before we flip onboarded, so a failure here
  // leaves the buyer able to retry the install rather than stranded.
  const user = await findUserByEmail(body.admin.email);
  if (!user) {
    return NextResponse.json(
      { error: "Admin account was not created. Try again." },
      { status: 500 }
    );
  }
  try {
    const token = await signSession(user.id);
    const c = await cookies();
    c.set(COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 8,
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Could not sign you in. Try visiting /admin/login." },
      { status: 500 }
    );
  }

  // Session is live — lock in the install.
  await saveSettings({ ...(await loadSettings()), onboarded: true });
  await recordInstall().catch(() => {});

  return NextResponse.json({
    ok: true,
    template: body.templateId,
    mode: body.mode,
    summary: {
      adminEmail: body.admin.email,
      businessName: body.business.name,
    },
  });
}
