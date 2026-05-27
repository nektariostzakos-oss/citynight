import { getAppRoot } from "@/lib/appRoot";
import { getCurrentTenant } from "@/lib/tenantContext";
import { DEFAULT_TEMPLATE, isValidTemplateId, type TemplateId } from "@/templates/registry";
import { cache } from "react";
import { promises as fs } from "fs";
import path from "path";

const FILE = () => path.join(getAppRoot(), "data", "settings.json");

export type SmtpSettings = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  secure: "tls" | "ssl" | "none";
  /**
   * Email delivery mode.
   *  - "atelier": SaaS tenants route confirmations/reminders through the
   *    Atelier-hosted relay (POST /api/relay/send on the marketing app),
   *    using the tenant's relay secret. Host/port/user/pass are ignored.
   *  - "smtp" (default): direct SMTP from the values above. This is also the
   *    only mode that works in a standalone customer ZIP install (no relay
   *    is available there).
   * Missing field is treated as "smtp" for backward compat.
   */
  mode?: "atelier" | "smtp";
};

export type BrandingSettings = {
  logoUrl: string;
  logoUrlDark?: string;
  faviconUrl: string;
  wordmark: string;
  tagline_en: string;
  tagline_el: string;
};

export type BusinessHours = {
  day: "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
  open: string;
  close: string;
  closed: boolean;
  // Optional second session for days with a midday break (e.g. 10:00-14:00 + 17:00-21:00).
  // If omitted, the day has a single continuous open-close window.
  open2?: string;
  close2?: string;
};

export type BusinessSettings = {
  name: string;
  streetAddress: string;
  city: string;
  postalCode: string;
  country: string;
  phone: string;
  email: string;
  latitude: number | null;
  longitude: number | null;
  hours: BusinessHours[];
  social: {
    instagram: string;
    facebook: string;
    whatsapp: string;
    tiktok: string;
  };
  priceRange: string;
  /** Year the business was founded, e.g. "2016". Drives the footer
   *  "Established {year}" line. Empty until the owner sets it. */
  foundedYear?: string;
  timezone?: string; // IANA name, e.g. "Europe/Athens". Used for slot/today calcs.
  /** Target link for the post-visit review email. Defaults to a Google
   * search for the business name + city if not set. */
  reviewUrl?: string;
  /**
   * Direct Google Business review URL (the "write a review" deep link,
   * e.g. https://g.page/r/…/review). When set this is used by the review
   * funnel rating page to route happy customers straight to Google. Falls back
   * to `reviewUrl` when not set.
   */
  googleReviewUrl?: string;
  /** Booking operational rules. Defaults applied where unset. */
  bookingRules?: {
    /** Minimum minutes from now before a slot can be booked. Default 45. */
    leadTimeMinutes?: number;
    /** Free cancellation window, in hours. Default 4. */
    cancellationWindowHours?: number;
    /** Optional deposit percent (0–100). 0 = no deposit. Rendered as a note;
     * payment collection is out-of-scope for the template. */
    depositPercent?: number;
    /** No-show / late-cancel fee percent (0–100). Default 50. */
    noShowFeePercent?: number;
  };
};

export type NavLink = {
  id: string;
  label_en: string;
  href: string;
  enabled: boolean;
  /** Per-language labels: label_en (required above), label_el, label_de, ... */
  [key: `label_${string}`]: string | undefined;
};

export type NavSettings = {
  links: NavLink[];
  bookLabel_en: string;
  bookHref: string;
  /** Per-language book button labels: bookLabel_en (above), bookLabel_el, ... */
  [key: `bookLabel_${string}`]: string | undefined;
};

export type EmailTemplate = {
  // English and Greek are required; the other nine languages are optional and
  // filled at runtime from DEFAULT_TEMPLATES. Codes: en el de fr it es nl pl pt sv sq.
  subject_en: string;
  subject_el: string;
  body_en: string;
  body_el: string;
  subject_de?: string;
  body_de?: string;
  subject_fr?: string;
  body_fr?: string;
  subject_it?: string;
  body_it?: string;
  subject_es?: string;
  body_es?: string;
  subject_nl?: string;
  body_nl?: string;
  subject_pl?: string;
  body_pl?: string;
  subject_pt?: string;
  body_pt?: string;
  subject_sv?: string;
  body_sv?: string;
  subject_sq?: string;
  body_sq?: string;
};

export type EmailTemplates = {
  confirmation: EmailTemplate;
  reminder: EmailTemplate;
};

export type AnalyticsSettings = {
  ga4: string;
  gtm: string;
  metaPixel: string;
  /** Meta Conversions API access token — enables server-side events. */
  metaCapiToken: string;
  /** GA4 Measurement Protocol API secret — enables server-side events. */
  ga4ApiSecret: string;
};

export type AiSettings = {
  apiKey: string;
  unsplashKey?: string;
};

export type PaymentsSettings = {
  /** Stripe secret key (sk_live_… / sk_test_…). Leave blank to disable
   * card checkout: orders fall back to "we'll contact you about payment". */
  stripeSecretKey?: string;
  /** Publishable key (pk_…). Used for redirect-to-Checkout flows only,
   * so it doesn't need to be exposed to the client bundle. */
  stripePublishableKey?: string;
  /** Currency code (USD / EUR / GBP). Defaults to USD. */
  currency?: string;
};

/**
 * Optional client-membership programme. When enabled, the booking flow lets
 * a customer buy a prepaid membership; an active member gets `discountPercent`
 * off every booking. Billing is one-off Stripe Checkout — no auto-renew — so a
 * membership simply expires at the end of the term it was bought for.
 */
export type MembershipSettings = {
  enabled: boolean;
  /** Percent off every booking for an active member (0–100). */
  discountPercent: number;
  /** Prepaid price per term, in the shop currency. A blank / 0 term is
   * not offered to customers. */
  price1m?: number;
  price6m?: number;
  price12m?: number;
};

export type ThemeSettings = {
  background: string;
  foreground: string;
  primary: string;
  primaryAccent: string;
  surface: string;
  surfaceStrong: string;
  border: string;
  borderStrong: string;
  muted: string;
  muted2: string;
};

export type FontChoice =
  | "geist"
  | "inter"
  | "manrope"
  | "playfair"
  | "cormorant"
  | "fraunces";

export type TypographySettings = {
  headingFont: FontChoice;
  bodyFont: FontChoice;
};

export const FONT_VAR: Record<FontChoice, string> = {
  geist: "var(--font-geist-sans)",
  inter: "var(--font-inter)",
  manrope: "var(--font-manrope)",
  playfair: "var(--font-playfair)",
  cormorant: "var(--font-cormorant)",
  fraunces: "var(--font-fraunces)",
};

export const FONT_LABEL: Record<FontChoice, string> = {
  geist: "Geist (modern sans)",
  inter: "Inter (neutral sans)",
  manrope: "Manrope (geometric sans)",
  playfair: "Playfair Display (classic serif)",
  cormorant: "Cormorant Garamond (elegant serif)",
  fraunces: "Fraunces (modern serif)",
};

export const DEFAULT_TYPOGRAPHY: TypographySettings = {
  headingFont: "playfair",
  bodyFont: "geist",
};

export const DEFAULT_THEME: ThemeSettings = {
  background: "#0a0806",
  foreground: "#f5efe6",
  primary: "#c9a961",
  primaryAccent: "#d4b878",
  surface: "rgba(255, 255, 255, 0.03)",
  surfaceStrong: "rgba(255, 255, 255, 0.06)",
  border: "rgba(255, 255, 255, 0.1)",
  borderStrong: "rgba(255, 255, 255, 0.18)",
  muted: "rgba(245, 239, 230, 0.65)",
  muted2: "rgba(245, 239, 230, 0.45)",
};

export type BookingMode = "appointment" | "reservation";

export type LicenseInfo = {
  /**
   * ATL-XXXX-XXXX-XXXX-XXXX, the key the buyer typed at install. Null for
   * SaaS-hosted tenants, which are provisioned by us and need no key.
   */
  key: string | null;
  /** "self-hosted", "managed", or "saas". */
  packageId: string;
  /** Customer's first name from the license record, used as a friendly greeting. */
  firstName?: string;
  /** The domain this license is bound to. Null when installed on a local host. */
  boundDomain?: string | null;
  /** ISO timestamp the key was validated at install time. */
  validatedAt: string;
};

/**
 * Android app builder settings. Drives the TWA (Trusted Web Activity) APK
 * the owner generates from `/admin/mobile-app`. Every field is optional: a
 * fresh tenant can hit "Build" on day one and `loadMobileApp()` fills sane
 * defaults from the business identity + theme.
 *
 * The signing keystore is NOT stored here. It is sensitive, so it lives in a
 * separate gitignored file (`data/mobile-app-keystore.json`, see
 * `mobileAppKeystore.ts`) and never travels through the settings API.
 */
export type MobileAppSettings = {
  /** Full app name shown under the launcher icon, default = business name. */
  appName?: string;
  /** Short launcher label (<= 12 chars recommended). */
  launcherName?: string;
  /** Android package id, e.g. com.atelier.<slug>. Locked after first build. */
  packageId?: string;
  /** TWA toolbar / theme color, default = theme.primary. */
  themeColor?: string;
  /** Splash background color, default = theme.background. */
  backgroundColor?: string;
  /** Dark-mode navigation color, default = theme.background. */
  darkColor?: string;
  /** Optional maskable 512x512 icon. Falls back to /icon-pwa when unset. */
  maskableIconUrl?: string;
  /** Optional monochrome 512x512 icon for themed Android icons. */
  monochromeIconUrl?: string;
  /** Last Android versionCode used. Each build increments it by one. */
  lastVersionCode?: number;
  /** True once a build has run: the package id is then frozen (Play Store
   *  binds the listing to it, so it can never change). */
  lockedPackageId?: boolean;
  /** True once a signing keystore has been generated and stored. */
  hasSigningKey?: boolean;
  /** When true, the public `/install` share page is served. Off by default. */
  installPageEnabled?: boolean;
};

export type AppSettings = {
  smtp?: SmtpSettings;
  branding?: BrandingSettings;
  business?: BusinessSettings;
  nav?: NavSettings;
  templates?: EmailTemplates;
  analytics?: AnalyticsSettings;
  ai?: AiSettings;
  payments?: PaymentsSettings;
  membership?: MembershipSettings;
  mobileApp?: MobileAppSettings;
  theme?: ThemeSettings;
  typography?: TypographySettings;
  bookingMode?: BookingMode;
  industryId?: string;
  onboarded?: boolean;
  license?: LicenseInfo;
  /** Languages the shop shows visitors. Always includes "en". Set in the
   * setup wizard and editable in admin. Codes: en el de fr it es nl pl pt sv sq. */
  enabledLanguages?: string[];
  /** Front-end template ("skin") the public site renders. Defaults to
   * "salon". Chosen in the setup wizard and the admin Tools panel. */
  template?: TemplateId;
  /** Opt a non-__demo__ tenant into the showcase "buy this site" banner
   * (used for the marketing template demos), without the demo-mode
   * force-dark / noindex behaviour. */
  demoShowcase?: boolean;
};

export async function loadPayments(): Promise<PaymentsSettings> {
  const s = await loadSettings();
  return s.payments ?? {};
}

export async function savePayments(p: PaymentsSettings): Promise<PaymentsSettings> {
  const s = await loadSettings();
  await saveSettings({ ...s, payments: { ...(s.payments ?? {}), ...p } });
  return (await loadSettings()).payments ?? {};
}

const DEFAULT_MEMBERSHIP: MembershipSettings = {
  enabled: false,
  discountPercent: 10,
};

export async function loadMembership(): Promise<MembershipSettings> {
  const s = await loadSettings();
  return { ...DEFAULT_MEMBERSHIP, ...(s.membership ?? {}) };
}

export async function saveMembership(
  m: Partial<MembershipSettings>,
): Promise<MembershipSettings> {
  const s = await loadSettings();
  await saveSettings({
    ...s,
    membership: { ...DEFAULT_MEMBERSHIP, ...(s.membership ?? {}), ...m },
  });
  return loadMembership();
}

/**
 * Lowercase a free-text name into a safe Android package-id segment:
 * letters and digits only, never empty. Used to derive a default package id
 * when there is no tenant slug (a standalone customer install).
 */
function appIdSegment(s: string): string {
  const cleaned = s
    .toLowerCase()
    .normalize("NFD")
    // strip combining diacritical marks (accents) after NFD decomposition
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
  return cleaned || "app";
}

/**
 * Mobile-app settings with every default resolved, so the admin form and the
 * APK builder always have a complete object to work from. Defaults are drawn
 * from the business identity + the live theme: app name = business name,
 * colors = theme colors, package id = com.atelier.<tenant-or-name>.
 *
 * The tenant slug, when present, comes only from the per-request runtime
 * context (never hardcoded), so the customer ZIP stays root-clean.
 */
export async function loadMobileApp(): Promise<Required<Omit<
  MobileAppSettings,
  "maskableIconUrl" | "monochromeIconUrl"
>> & Pick<MobileAppSettings, "maskableIconUrl" | "monochromeIconUrl">> {
  const s = await loadSettings();
  const m = s.mobileApp ?? {};
  const business = { ...DEFAULT_BUSINESS, ...(s.business ?? {}) };
  const branding = { ...DEFAULT_BRANDING, ...(s.branding ?? {}) };
  const theme = { ...DEFAULT_THEME, ...(s.theme ?? {}) };
  const displayName = branding.wordmark || business.name || "Your Salon";
  const slug = getCurrentTenant();
  const idSegment = slug ? appIdSegment(slug) : appIdSegment(displayName);
  return {
    appName: m.appName || displayName,
    launcherName: m.launcherName || displayName.slice(0, 12),
    packageId: m.packageId || `com.atelier.${idSegment}`,
    themeColor: m.themeColor || theme.primary,
    backgroundColor: m.backgroundColor || theme.background,
    darkColor: m.darkColor || theme.background,
    maskableIconUrl: m.maskableIconUrl,
    monochromeIconUrl: m.monochromeIconUrl,
    lastVersionCode: m.lastVersionCode ?? 0,
    lockedPackageId: m.lockedPackageId ?? false,
    hasSigningKey: m.hasSigningKey ?? false,
    installPageEnabled: m.installPageEnabled ?? false,
  };
}

export async function saveMobileApp(
  patch: Partial<MobileAppSettings>,
): Promise<MobileAppSettings> {
  const s = await loadSettings();
  const next: MobileAppSettings = { ...(s.mobileApp ?? {}), ...patch };
  // The package id is frozen once a build has locked it: the Play Store
  // listing is permanently bound to it, so a later change would orphan it.
  if (s.mobileApp?.lockedPackageId) {
    next.packageId = s.mobileApp.packageId;
    next.lockedPackageId = true;
  }
  await saveSettings({ ...s, mobileApp: next });
  return (await loadSettings()).mobileApp ?? {};
}

export async function loadIndustryId(): Promise<string> {
  const s = await loadSettings();
  return typeof s.industryId === "string" ? s.industryId : "barber";
}

/**
 * The front-end template the public site renders. Falls back to the salon
 * design when unset or invalid. Applies to every install — SaaS tenants and
 * standalone customer ZIPs alike.
 */
export async function loadTemplateId(): Promise<TemplateId> {
  const s = await loadSettings();
  return isValidTemplateId(s.template) ? s.template : DEFAULT_TEMPLATE;
}

/** True when this tenant opts into the showcase "buy this site" banner. */
export async function loadDemoShowcase(): Promise<boolean> {
  const s = await loadSettings();
  return s.demoShowcase === true;
}

// NB: these are the factory defaults a fresh ("clean") install falls back
// to BEFORE the Install Wizard runs. Keep them generic so nobody inherits
// someone else's brand. The bundled demo ZIP overrides them via a populated
// data/settings.json with real copy.
export const DEFAULT_BRANDING: BrandingSettings = {
  logoUrl: "",
  faviconUrl: "",
  wordmark: "YOUR SALON",
  tagline_en: "Haircare · Your City",
  tagline_el: "Κομμωτήριο · Πόλη",
};

export const DEFAULT_ANALYTICS: AnalyticsSettings = {
  ga4: "",
  gtm: "",
  metaPixel: "",
  metaCapiToken: "",
  ga4ApiSecret: "",
};

export const DEFAULT_TEMPLATES: EmailTemplates = {
  confirmation: {
    subject_en: "{business}: your booking is confirmed",
    subject_el: "{business}: το ραντεβού σας επιβεβαιώθηκε",
    subject_de: "{business}: Ihre Buchung ist bestätigt",
    subject_fr: "{business} : votre réservation est confirmée",
    subject_it: "{business}: la tua prenotazione è confermata",
    subject_es: "{business}: tu reserva está confirmada",
    subject_nl: "{business}: je boeking is bevestigd",
    subject_pl: "{business}: Twoja rezerwacja jest potwierdzona",
    subject_pt: "{business}: a sua marcação está confirmada",
    subject_sv: "{business}: din bokning är bekräftad",
    subject_sq: "{business}: rezervimi juaj është konfirmuar",
    body_en:
      "Hi {name},\n\nYour booking is confirmed:\n\n· {service} ({price})\n· With {barber}\n· On {date} at {time}\n\nWe'll send a reminder 8 hours before. Need to reschedule or cancel? Reply to this email or call us at {phone}.\n\nSee you soon,\n{business}",
    body_el:
      "Γεια σου {name},\n\nΤο ραντεβού σου επιβεβαιώθηκε:\n\n· {service} ({price})\n· Με τον/την {barber}\n· Στις {date} και ώρα {time}\n\nΘα σου στείλουμε υπενθύμιση 8 ώρες πριν. Αν χρειαστεί να αλλάξεις ή να ακυρώσεις, απάντησε σε αυτό το email ή πάρε μας τηλέφωνο στο {phone}.\n\nΘα σε δούμε σύντομα,\n{business}",
    body_de:
      "Hallo {name},\n\nIhre Buchung ist bestätigt:\n\n· {service} ({price})\n· Bei {barber}\n· Am {date} um {time}\n\nWir schicken Ihnen 8 Stunden vorher eine Erinnerung. Möchten Sie verschieben oder absagen? Antworten Sie einfach auf diese E-Mail oder rufen Sie uns unter {phone} an.\n\nBis bald,\n{business}",
    body_fr:
      "Bonjour {name},\n\nVotre réservation est confirmée :\n\n· {service} ({price})\n· Avec {barber}\n· Le {date} à {time}\n\nNous vous enverrons un rappel 8 heures avant. Besoin de modifier ou d'annuler ? Répondez à cet e-mail ou appelez-nous au {phone}.\n\nÀ bientôt,\n{business}",
    body_it:
      "Ciao {name},\n\nLa tua prenotazione è confermata:\n\n· {service} ({price})\n· Con {barber}\n· Il {date} alle {time}\n\nTi invieremo un promemoria 8 ore prima. Vuoi spostare o annullare? Rispondi a questa email o chiamaci al {phone}.\n\nA presto,\n{business}",
    body_es:
      "Hola {name},\n\nTu reserva está confirmada:\n\n· {service} ({price})\n· Con {barber}\n· El {date} a las {time}\n\nTe enviaremos un recordatorio 8 horas antes. ¿Necesitas cambiarla o cancelarla? Responde a este correo o llámanos al {phone}.\n\nHasta pronto,\n{business}",
    body_nl:
      "Hoi {name},\n\nJe boeking is bevestigd:\n\n· {service} ({price})\n· Bij {barber}\n· Op {date} om {time}\n\nWe sturen je 8 uur van tevoren een herinnering. Wil je verzetten of annuleren? Beantwoord deze e-mail of bel ons op {phone}.\n\nTot snel,\n{business}",
    body_pl:
      "Cześć {name},\n\nTwoja rezerwacja jest potwierdzona:\n\n· {service} ({price})\n· U {barber}\n· {date} o {time}\n\nPrzypomnimy Ci 8 godzin wcześniej. Chcesz zmienić termin lub odwołać wizytę? Odpowiedz na ten e-mail lub zadzwoń do nas pod numer {phone}.\n\nDo zobaczenia,\n{business}",
    body_pt:
      "Olá {name},\n\nA sua marcação está confirmada:\n\n· {service} ({price})\n· Com {barber}\n· No dia {date} às {time}\n\nVamos enviar um lembrete 8 horas antes. Precisa de remarcar ou cancelar? Responda a este e-mail ou ligue-nos para {phone}.\n\nAté breve,\n{business}",
    body_sv:
      "Hej {name},\n\nDin bokning är bekräftad:\n\n· {service} ({price})\n· Hos {barber}\n· Den {date} kl. {time}\n\nVi skickar en påminnelse 8 timmar innan. Behöver du boka om eller avboka? Svara på det här mejlet eller ring oss på {phone}.\n\nVi ses snart,\n{business}",
    body_sq:
      "Përshëndetje {name},\n\nRezervimi juaj është konfirmuar:\n\n· {service} ({price})\n· Me {barber}\n· Më {date} në orën {time}\n\nDo t'ju dërgojmë një kujtesë 8 orë para. Doni ta riprogramoni ose ta anuloni? Përgjigjuni këtij emaili ose na telefononi në {phone}.\n\nShihemi së shpejti,\n{business}",
  },
  reminder: {
    subject_en: "Reminder · Your {business} appointment in 8 hours",
    subject_el: "Υπενθύμιση · Το ραντεβού σου στο {business} σε 8 ώρες",
    subject_de: "Erinnerung · Ihr Termin bei {business} in 8 Stunden",
    subject_fr: "Rappel · Votre rendez-vous chez {business} dans 8 heures",
    subject_it: "Promemoria · Il tuo appuntamento da {business} tra 8 ore",
    subject_es: "Recordatorio · Tu cita en {business} en 8 horas",
    subject_nl: "Herinnering · Je afspraak bij {business} over 8 uur",
    subject_pl: "Przypomnienie · Twoja wizyta w {business} za 8 godzin",
    subject_pt: "Lembrete · A sua marcação na {business} daqui a 8 horas",
    subject_sv: "Påminnelse · Din tid hos {business} om 8 timmar",
    subject_sq: "Kujtesë · Termini juaj te {business} për 8 orë",
    body_en:
      "Hi {name},\n\nA quick reminder. Your {business} appointment is in about 8 hours.\n\n· {service}\n· With {barber}\n· {date} at {time}\n\nNeed to reschedule or cancel? Reply to this email or call us at {phone}.\n\nSee you soon,\n{business}",
    body_el:
      "Γεια σου {name},\n\nΥπενθύμιση: το ραντεβού σου στο {business} είναι σε περίπου 8 ώρες.\n\n· {service}\n· Με τον/την {barber}\n· {date} στις {time}\n\nΑν χρειαστεί να αλλάξεις ή να ακυρώσεις, απάντησε σε αυτό το email ή πάρε μας τηλέφωνο στο {phone}.\n\nΤα λέμε σύντομα,\n{business}",
    body_de:
      "Hallo {name},\n\nNur eine kurze Erinnerung. Ihr Termin bei {business} ist in etwa 8 Stunden.\n\n· {service}\n· Bei {barber}\n· {date} um {time}\n\nMöchten Sie verschieben oder absagen? Antworten Sie auf diese E-Mail oder rufen Sie uns unter {phone} an.\n\nBis bald,\n{business}",
    body_fr:
      "Bonjour {name},\n\nUn petit rappel. Votre rendez-vous chez {business} est dans environ 8 heures.\n\n· {service}\n· Avec {barber}\n· {date} à {time}\n\nBesoin de modifier ou d'annuler ? Répondez à cet e-mail ou appelez-nous au {phone}.\n\nÀ bientôt,\n{business}",
    body_it:
      "Ciao {name},\n\nUn piccolo promemoria. Il tuo appuntamento da {business} è tra circa 8 ore.\n\n· {service}\n· Con {barber}\n· {date} alle {time}\n\nVuoi spostare o annullare? Rispondi a questa email o chiamaci al {phone}.\n\nA presto,\n{business}",
    body_es:
      "Hola {name},\n\nUn recordatorio rápido. Tu cita en {business} es dentro de unas 8 horas.\n\n· {service}\n· Con {barber}\n· {date} a las {time}\n\n¿Necesitas cambiarla o cancelarla? Responde a este correo o llámanos al {phone}.\n\nHasta pronto,\n{business}",
    body_nl:
      "Hoi {name},\n\nEven een herinnering. Je afspraak bij {business} is over ongeveer 8 uur.\n\n· {service}\n· Bij {barber}\n· {date} om {time}\n\nWil je verzetten of annuleren? Beantwoord deze e-mail of bel ons op {phone}.\n\nTot snel,\n{business}",
    body_pl:
      "Cześć {name},\n\nKrótkie przypomnienie. Twoja wizyta w {business} jest za około 8 godzin.\n\n· {service}\n· U {barber}\n· {date} o {time}\n\nChcesz zmienić termin lub odwołać wizytę? Odpowiedz na ten e-mail lub zadzwoń do nas pod numer {phone}.\n\nDo zobaczenia,\n{business}",
    body_pt:
      "Olá {name},\n\nUm lembrete rápido. A sua marcação na {business} é daqui a cerca de 8 horas.\n\n· {service}\n· Com {barber}\n· {date} às {time}\n\nPrecisa de remarcar ou cancelar? Responda a este e-mail ou ligue-nos para {phone}.\n\nAté breve,\n{business}",
    body_sv:
      "Hej {name},\n\nEn snabb påminnelse. Din tid hos {business} är om ungefär 8 timmar.\n\n· {service}\n· Hos {barber}\n· {date} kl. {time}\n\nBehöver du boka om eller avboka? Svara på det här mejlet eller ring oss på {phone}.\n\nVi ses snart,\n{business}",
    body_sq:
      "Përshëndetje {name},\n\nNjë kujtesë e shpejtë. Termini juaj te {business} është për rreth 8 orë.\n\n· {service}\n· Me {barber}\n· {date} në orën {time}\n\nDoni ta riprogramoni ose ta anuloni? Përgjigjuni këtij emaili ose na telefononi në {phone}.\n\nShihemi së shpejti,\n{business}",
  },
};

export const DEFAULT_NAV: NavSettings = {
  links: [
    { id: "home", label_en: "Home", label_el: "Αρχική", label_de: "Start", label_it: "Home", href: "/", enabled: true },
    { id: "services", label_en: "Services", label_el: "Υπηρεσίες", label_de: "Leistungen", label_it: "Servizi", href: "/services", enabled: true },
    { id: "shop", label_en: "Shop", label_el: "Κατάστημα", label_de: "Shop", label_it: "Negozio", href: "/shop", enabled: true },
    { id: "gallery", label_en: "Gallery", label_el: "Γκαλερί", label_de: "Galerie", label_it: "Galleria", href: "/gallery", enabled: true },
    { id: "team", label_en: "Team", label_el: "Ομάδα", label_de: "Team", label_it: "Team", href: "/about", enabled: true },
    { id: "contact", label_en: "Contact", label_el: "Επικοινωνία", label_de: "Kontakt", label_it: "Contatti", href: "/contact", enabled: true },
    { id: "blog", label_en: "Blog", label_el: "Blog", label_de: "Blog", label_it: "Blog", href: "/blog", enabled: true },
  ],
  bookLabel_en: "Book",
  bookLabel_el: "Κράτηση",
  bookLabel_de: "Buchen",
  bookLabel_it: "Prenota",
  bookHref: "/book",
};

// Generic factory default. Clean installs fall back to this until the owner
// runs the wizard. Hours / currency / priceRange are reasonable mid-market
// placeholders; everything else is clearly "please edit me".
export const DEFAULT_BUSINESS: BusinessSettings = {
  name: "Your Salon",
  streetAddress: "",
  city: "",
  postalCode: "",
  country: "GB",
  phone: "",
  email: "",
  timezone: "Europe/London",
  latitude: null,
  longitude: null,
  hours: [
    { day: "mon", open: "10:00", close: "19:00", closed: false },
    { day: "tue", open: "10:00", close: "19:00", closed: false },
    { day: "wed", open: "10:00", close: "19:00", closed: false },
    { day: "thu", open: "10:00", close: "19:00", closed: false },
    { day: "fri", open: "10:00", close: "19:00", closed: false },
    { day: "sat", open: "10:00", close: "17:00", closed: false },
    { day: "sun", open: "00:00", close: "00:00", closed: true },
  ],
  social: {
    instagram: "",
    facebook: "",
    whatsapp: "",
    tiktok: "",
  },
  priceRange: "$$",
  bookingRules: {
    leadTimeMinutes: 45,
    cancellationWindowHours: 4,
    depositPercent: 0,
    noShowFeePercent: 50,
  },
};

const DEFAULTS: AppSettings = {
  smtp: { host: "", port: 587, user: "", pass: "", from: "", secure: "tls" },
  branding: DEFAULT_BRANDING,
  business: DEFAULT_BUSINESS,
  nav: DEFAULT_NAV,
  templates: DEFAULT_TEMPLATES,
  analytics: DEFAULT_ANALYTICS,
};

/**
 * Internal: do the actual settings file read + defaults merge. Always one
 * fs.readFile per call. Use the cached `loadSettings` export instead.
 */
async function _loadSettings(): Promise<AppSettings> {
  try {
    const raw = await fs.readFile(FILE(), "utf-8");
    const parsed = JSON.parse(raw) as AppSettings;
    return {
      ...DEFAULTS,
      ...parsed,
      smtp: { ...DEFAULTS.smtp!, ...(parsed.smtp ?? {}) },
      branding: { ...DEFAULT_BRANDING, ...(parsed.branding ?? {}) },
      business: {
        ...DEFAULT_BUSINESS,
        ...(parsed.business ?? {}),
        social: {
          ...DEFAULT_BUSINESS.social,
          ...((parsed.business?.social ?? {}) as Partial<BusinessSettings["social"]>),
        },
        hours:
          Array.isArray(parsed.business?.hours) && parsed.business!.hours.length === 7
            ? parsed.business!.hours
            : DEFAULT_BUSINESS.hours,
      },
      nav: {
        ...DEFAULT_NAV,
        ...(parsed.nav ?? {}),
        links:
          Array.isArray(parsed.nav?.links) && parsed.nav!.links.length > 0
            ? parsed.nav!.links
            : DEFAULT_NAV.links,
      },
      templates: {
        confirmation: {
          ...DEFAULT_TEMPLATES.confirmation,
          ...(parsed.templates?.confirmation ?? {}),
        },
        reminder: {
          ...DEFAULT_TEMPLATES.reminder,
          ...(parsed.templates?.reminder ?? {}),
        },
      },
      analytics: { ...DEFAULT_ANALYTICS, ...(parsed.analytics ?? {}) },
    };
  } catch {
    return DEFAULTS;
  }
}

/**
 * Per-request memoized settings reader.
 *
 * The demo layout fans out to seven sibling helpers (loadBranding,
 * loadBusiness, loadNav, loadAnalytics, loadTheme, loadTypography,
 * loadTemplates) plus JsonLd + page-level components, and previously every
 * one of them did its own fs.readFile + JSON.parse. Under `React.cache`
 * the underlying read happens once per request and every sibling reuses
 * the parsed result. Outside a render (e.g. background scheduler tick) the
 * cache key is per-call, so behaviour stays unchanged.
 */
export const loadSettings: () => Promise<AppSettings> = cache(_loadSettings);

export async function loadBranding(): Promise<BrandingSettings> {
  const s = await loadSettings();
  return { ...DEFAULT_BRANDING, ...(s.branding ?? {}) };
}

export async function loadBusiness(): Promise<BusinessSettings> {
  const s = await loadSettings();
  return { ...DEFAULT_BUSINESS, ...(s.business ?? {}) };
}

export async function loadNav(): Promise<NavSettings> {
  const s = await loadSettings();
  return { ...DEFAULT_NAV, ...(s.nav ?? {}) };
}

export async function loadAnalytics(): Promise<AnalyticsSettings> {
  const s = await loadSettings();
  return { ...DEFAULT_ANALYTICS, ...(s.analytics ?? {}) };
}

export async function loadTheme(): Promise<ThemeSettings> {
  const s = await loadSettings();
  return { ...DEFAULT_THEME, ...(s.theme ?? {}) };
}

export async function loadTypography(): Promise<TypographySettings> {
  const s = await loadSettings();
  return { ...DEFAULT_TYPOGRAPHY, ...(s.typography ?? {}) };
}

export async function loadBookingMode(): Promise<BookingMode> {
  const s = await loadSettings();
  return s.bookingMode === "reservation" ? "reservation" : "appointment";
}

export async function loadTemplates(): Promise<EmailTemplates> {
  const s = await loadSettings();
  return {
    confirmation: { ...DEFAULT_TEMPLATES.confirmation, ...(s.templates?.confirmation ?? {}) },
    reminder: { ...DEFAULT_TEMPLATES.reminder, ...(s.templates?.reminder ?? {}) },
  };
}

export async function saveSettings(next: AppSettings): Promise<AppSettings> {
  const merged = { ...(await loadSettings()), ...next };
  await fs.mkdir(path.dirname(FILE()), { recursive: true });
  await fs.writeFile(FILE(), JSON.stringify(merged, null, 2), "utf-8");
  return merged;
}

export async function loadSmtp(): Promise<SmtpSettings> {
  const s = await loadSettings();
  // Settings file wins over env vars; env vars are a fallback for ops setups.
  const fromFile = s.smtp;
  if (fromFile && fromFile.host) return fromFile;
  return {
    host: process.env.SMTP_HOST ?? "",
    port: Number(process.env.SMTP_PORT ?? 587),
    user: process.env.SMTP_USER ?? "",
    pass: process.env.SMTP_PASS ?? "",
    from: process.env.SMTP_FROM ?? "",
    secure: (process.env.SMTP_SECURE as SmtpSettings["secure"]) ?? "tls",
  };
}

/**
 * Resolve the email-delivery mode actually in effect for this request.
 *  - explicit "atelier" / "smtp" stored in settings → honored verbatim
 *  - unset:
 *      · running inside a SaaS tenant → "atelier" (the relay is the default
 *        so booking emails work the moment a tenant is provisioned)
 *      · standalone (customer ZIP) → "smtp" (no relay is reachable)
 */
export async function effectiveSmtpMode(): Promise<"atelier" | "smtp"> {
  const s = await loadSmtp();
  if (s.mode === "atelier") return "atelier";
  if (s.mode === "smtp") return "smtp";
  return getCurrentTenant() ? "atelier" : "smtp";
}

export async function smtpReady(): Promise<boolean> {
  // Atelier-hosted relay is always "ready" — the marketing app's relay
  // endpoint, not local SMTP, sends. Per-send failures surface to the admin
  // when the test pings the endpoint.
  if ((await effectiveSmtpMode()) === "atelier") return true;
  const s = await loadSmtp();
  return !!(s.host && s.user && s.pass);
}
