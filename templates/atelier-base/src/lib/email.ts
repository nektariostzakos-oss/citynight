import { getAppRoot } from "@/lib/appRoot";
import nodemailer from "nodemailer";
import { promises as fs } from "fs";
import path from "path";
import type { Booking } from "./bookings";
import { signBookingId } from "./bookingToken";
import {
  loadSmtp,
  smtpReady,
  effectiveSmtpMode,
  loadTemplates,
  loadBusiness,
  type EmailTemplate,
} from "./settings";
import {
  getCurrentTenant,
  getCurrentTenantSecret,
} from "./tenantContext";
import { SUPPORTED_LANGS, type Lang } from "./langs";
import { SITE_URL } from "./atelierSiteUrl";

const LOG_FILE = () => path.join(getAppRoot(), "data", "emails.log.json");

export type SentEmail = {
  to: string;
  subject: string;
  body: string;
  sentAt: string;
  delivered: boolean;
  error?: string;
};

async function buildTransport() {
  const s = await loadSmtp();
  return nodemailer.createTransport({
    host: s.host,
    port: s.port,
    secure: s.secure === "ssl",
    requireTLS: s.secure === "tls",
    auth: s.user ? { user: s.user, pass: s.pass } : undefined,
  });
}

async function fromAddress() {
  const s = await loadSmtp();
  // Generic sender for fresh installs. Owner should override in Settings →
  // Email → "From address" once their real sender is wired up.
  return s.from || `Your Salon <${s.user || "hello@example.com"}>`;
}

async function appendLog(entry: SentEmail) {
  let arr: SentEmail[] = [];
  try {
    const raw = await fs.readFile(LOG_FILE(), "utf-8");
    arr = JSON.parse(raw);
  } catch {}
  arr.unshift(entry);
  await fs.mkdir(path.dirname(LOG_FILE()), { recursive: true });
  await fs.writeFile(LOG_FILE(), JSON.stringify(arr.slice(0, 500), null, 2));
}

export async function sendBulk(
  recipients: string[],
  subject: string,
  body: string
): Promise<{ sent: number; failed: number; mode: "smtp" | "preview"; results: SentEmail[] }> {
  const cleaned = Array.from(
    new Set(
      recipients
        .map((r) => r.trim().toLowerCase())
        .filter((r) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r))
    )
  );

  const from = await fromAddress();
  const results: SentEmail[] = [];
  let sent = 0;
  let failed = 0;

  // Atelier-hosted relay: each recipient is one /api/relay/send call. The
  // marketing app's per-tenant daily quota applies; a recipient is logged
  // as failed (with the reason) if the quota or upstream SMTP rejected it.
  const mode = await effectiveSmtpMode();
  if (mode === "atelier") {
    for (const to of cleaned) {
      const r = await relaySend(to, subject, body);
      const entry: SentEmail = {
        to,
        subject,
        body,
        sentAt: new Date().toISOString(),
        delivered: r.ok,
        ...(r.ok ? {} : { error: `Atelier relay: ${r.error}` }),
      };
      results.push(entry);
      await appendLog(entry);
      if (r.ok) sent++;
      else failed++;
    }
    return { sent, failed, mode: "smtp", results };
  }

  if (!(await smtpReady())) {
    for (const to of cleaned) {
      const entry: SentEmail = {
        to,
        subject,
        body,
        sentAt: new Date().toISOString(),
        delivered: false,
        error: "SMTP not configured (preview mode)",
      };
      results.push(entry);
      await appendLog(entry);
    }
    return { sent: 0, failed: 0, mode: "preview", results };
  }

  const transport = await buildTransport();
  for (const to of cleaned) {
    try {
      await transport.sendMail({
        from,
        to,
        subject,
        text: body,
        html: body
          .split("\n")
          .map((l) => `<p>${escape(l)}</p>`)
          .join(""),
      });
      const entry: SentEmail = {
        to,
        subject,
        body,
        sentAt: new Date().toISOString(),
        delivered: true,
      };
      results.push(entry);
      await appendLog(entry);
      sent++;
    } catch (e) {
      const entry: SentEmail = {
        to,
        subject,
        body,
        sentAt: new Date().toISOString(),
        delivered: false,
        error: e instanceof Error ? e.message : "Send failed",
      };
      results.push(entry);
      await appendLog(entry);
      failed++;
    }
  }
  return { sent, failed, mode: "smtp", results };
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function readEmailLog(): Promise<SentEmail[]> {
  try {
    const raw = await fs.readFile(LOG_FILE(), "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function isSmtpConfigured() {
  return smtpReady();
}

/**
 * The marketing app's loopback origin. Same Node process, so 127.0.0.1 is
 * always reachable and never hits the public network. The PORT env is the
 * one server.js binds; default to 3000 to stay parallel with Next's local
 * dev default. Overridable via ATELIER_RELAY_INTERNAL_URL if a future deploy
 * needs to point the relay at a different process.
 */
function relayInternalUrl(): string {
  const explicit = process.env.ATELIER_RELAY_INTERNAL_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const port = process.env.PORT || "3000";
  return `http://127.0.0.1:${port}`;
}

/**
 * Send one email via the Atelier-hosted relay. Returns true on success. The
 * caller still logs the SentEmail; this function only produces the boolean
 * and a reason string for the log.
 */
async function relaySend(
  to: string,
  subject: string,
  body: string,
): Promise<{ ok: boolean; error?: string }> {
  const slug = getCurrentTenant();
  const secret = getCurrentTenantSecret();
  if (!slug || !secret) {
    return { ok: false, error: "Relay unavailable (no tenant context)" };
  }
  const biz = await loadBusiness();
  // Reply-To: the salon's own email, so a recipient hitting "Reply" goes to
  // the salon — never to our shared relay mailbox.
  const replyTo = biz.email || "";
  try {
    const r = await fetch(`${relayInternalUrl()}/api/relay/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug,
        secret,
        to,
        subject,
        body,
        replyTo,
        fromName: biz.name || "",
      }),
      // Loopback only; reasonable timeout so a hung upstream never hangs a
      // booking response.
      signal: AbortSignal.timeout(10_000),
    });
    if (r.ok) return { ok: true };
    const j: { error?: string; detail?: string } = await r
      .json()
      .catch(() => ({}));
    return {
      ok: false,
      error: j.detail || j.error || `relay returned ${r.status}`,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "relay request failed",
    };
  }
}

/**
 * Single-recipient send (used for confirmations / reminders).
 *  - mode "atelier" → POST to the marketing app's /api/relay/send
 *  - mode "smtp"    → open a Nodemailer transport with the tenant's own SMTP
 *  - either way, a failure is logged in preview-mode form so the admin's
 *    email log shows what was attempted and why it didn't go through.
 */
async function sendOne(to: string, subject: string, body: string) {
  const mode = await effectiveSmtpMode();

  if (mode === "atelier") {
    const r = await relaySend(to, subject, body);
    await appendLog({
      to,
      subject,
      body,
      sentAt: new Date().toISOString(),
      delivered: r.ok,
      ...(r.ok ? {} : { error: `Atelier relay: ${r.error}` }),
    });
    return r.ok;
  }

  const from = await fromAddress();
  if (!(await smtpReady())) {
    const entry: SentEmail = {
      to,
      subject,
      body,
      sentAt: new Date().toISOString(),
      delivered: false,
      error: "SMTP not configured (preview mode)",
    };
    await appendLog(entry);
    return false;
  }
  try {
    const transport = await buildTransport();
    await transport.sendMail({
      from,
      to,
      subject,
      text: body,
      html: body
        .split("\n")
        .map((l) => `<p>${escape(l)}</p>`)
        .join(""),
    });
    await appendLog({
      to,
      subject,
      body,
      sentAt: new Date().toISOString(),
      delivered: true,
    });
    return true;
  } catch (e) {
    await appendLog({
      to,
      subject,
      body,
      sentAt: new Date().toISOString(),
      delivered: false,
      error: e instanceof Error ? e.message : "Send failed",
    });
    return false;
  }
}

export const EMAIL_PLACEHOLDERS = [
  "{name}",
  "{service}",
  "{price}",
  "{barber}",
  "{date}",
  "{time}",
  "{phone}",
  "{email}",
  "{business}",
  "{address}",
  "{city}",
  "{manage_url}",
] as const;

// Manage-booking trailer, auto-appended when a stored template predates the
// {manage_url} placeholder. English fallback for any unmapped language.
const MANAGE_TRAILER: Record<Lang, string> = {
  en: "Cancel or reschedule: {manage_url}",
  el: "Ακύρωση ή αλλαγή: {manage_url}",
  de: "Absagen oder verschieben: {manage_url}",
  fr: "Annuler ou modifier : {manage_url}",
  it: "Annulla o sposta: {manage_url}",
  es: "Cancelar o cambiar: {manage_url}",
  nl: "Annuleren of verzetten: {manage_url}",
  pl: "Odwołaj lub zmień termin: {manage_url}",
  pt: "Cancelar ou remarcar: {manage_url}",
  sv: "Avboka eller boka om: {manage_url}",
  sq: "Anulo ose riprogramo: {manage_url}",
};

async function renderTemplate(
  tpl: EmailTemplate,
  lang: Lang,
  b: Booking
): Promise<{ subject: string; body: string }> {
  const biz = await loadBusiness();
  const subject: string =
    tpl[("subject_" + lang) as keyof EmailTemplate] || tpl.subject_en;
  let body: string =
    tpl[("body_" + lang) as keyof EmailTemplate] || tpl.body_en;
  const token = await signBookingId(b.id);
  const manageUrl = `${SITE_URL}/b/${encodeURIComponent(b.id)}?t=${token}`;

  // Auto-append the manage-booking line when the template doesn't include
  // {manage_url} (so older installs with stored templates still benefit).
  if (!body.includes("{manage_url}")) {
    body = body + "\n\n" + (MANAGE_TRAILER[lang] || MANAGE_TRAILER.en);
  }

  const vars: Record<string, string> = {
    "{name}": b.name,
    "{service}": b.serviceName,
    "{price}": String(b.price),
    "{barber}": b.barberName,
    "{date}": b.date,
    "{time}": b.time,
    "{phone}": biz.phone,
    "{email}": biz.email,
    "{business}": biz.name,
    "{address}": biz.streetAddress,
    "{city}": biz.city,
    "{manage_url}": manageUrl,
  };
  const apply = (s: string) =>
    Object.entries(vars).reduce(
      (acc, [k, v]) => acc.split(k).join(v),
      s
    );
  return { subject: apply(subject), body: apply(body) };
}

/**
 * Public helper, used by the booking flow success screen when it wants to
 * show the client the "your self-service link" URL without opening the email.
 */
export async function manageBookingUrl(id: string): Promise<string> {
  const token = await signBookingId(id);
  return `${SITE_URL}/b/${encodeURIComponent(id)}?t=${token}`;
}

/** Plain-text one-shot send, for password resets, generic alerts, etc. */
export async function sendPlainEmail(to: string, subject: string, body: string) {
  return sendOne(to, subject, body);
}

/** Clamp a booking's stored language to a supported Lang, defaulting to en. */
function bookingLang(b: Booking): Lang {
  return SUPPORTED_LANGS.includes(b.lang as Lang) ? (b.lang as Lang) : "en";
}

export async function sendBookingConfirmation(b: Booking) {
  const lang = bookingLang(b);
  const { confirmation } = await loadTemplates();
  const { subject, body } = await renderTemplate(confirmation, lang, b);
  return sendOne(b.email, subject, body);
}

export async function sendBookingReminder(b: Booking) {
  const lang = bookingLang(b);
  const { reminder } = await loadTemplates();
  const { subject, body } = await renderTemplate(reminder, lang, b);
  return sendOne(b.email, subject, body);
}

/**
 * Post-visit review request. Asks the client to leave a Google review
 * (or any link the business sets via NEXT_PUBLIC_REVIEW_URL / Settings in
 * future). Sent 2–24h after a completed booking.
 */
function safeUrl(u: string | undefined | null): string | null {
  if (!u) return null;
  const trimmed = u.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

// Post-visit review email, all 11 languages. {brand} is substituted at send
// time. English is the fallback for any unmapped language.
const REVIEW_SUBJECT: Record<Lang, string> = {
  en: "{brand}: how did we do?",
  el: "{brand}: πώς σου φάνηκε;",
  de: "{brand}: Wie war es bei uns?",
  fr: "{brand} : comment ça s'est passé ?",
  it: "{brand}: com'è andata?",
  es: "{brand}: ¿qué tal fue?",
  nl: "{brand}: hoe was het?",
  pl: "{brand}: jak nam poszło?",
  pt: "{brand}: como correu?",
  sv: "{brand}: hur var det hos oss?",
  sq: "{brand}: si ju duket?",
};

// {name}, {url} and {brand} are substituted at send time.
const REVIEW_BODY: Record<Lang, string> = {
  en: "Hi {name},\n\nThanks for sitting in the chair with us. If you enjoyed it, a quick review means a lot:\n\n{url}\n\nSee you soon,\n{brand}",
  el: "Γεια σου {name},\n\nΕυχαριστούμε που μας εμπιστεύτηκες. Αν σου άρεσε η εμπειρία, μια σύντομη κριτική μας βοηθά πολύ:\n\n{url}\n\nΤα λέμε σύντομα,\n{brand}",
  de: "Hallo {name},\n\nDanke, dass Sie bei uns Platz genommen haben. Wenn es Ihnen gefallen hat, hilft uns eine kurze Bewertung sehr:\n\n{url}\n\nBis bald,\n{brand}",
  fr: "Bonjour {name},\n\nMerci de nous avoir fait confiance. Si l'expérience vous a plu, un petit avis compte beaucoup pour nous :\n\n{url}\n\nÀ bientôt,\n{brand}",
  it: "Ciao {name},\n\nGrazie per esserti seduto sulla nostra poltrona. Se ti è piaciuto, una breve recensione per noi vale tanto:\n\n{url}\n\nA presto,\n{brand}",
  es: "Hola {name},\n\nGracias por confiar en nosotros. Si te gustó la experiencia, una reseña rápida nos ayuda mucho:\n\n{url}\n\nHasta pronto,\n{brand}",
  nl: "Hoi {name},\n\nBedankt dat je bij ons in de stoel zat. Als het je beviel, helpt een korte review ons enorm:\n\n{url}\n\nTot snel,\n{brand}",
  pl: "Cześć {name},\n\nDziękujemy za zaufanie. Jeśli wizyta Ci się spodobała, krótka opinia bardzo nam pomaga:\n\n{url}\n\nDo zobaczenia,\n{brand}",
  pt: "Olá {name},\n\nObrigado por se ter sentado na nossa cadeira. Se gostou da experiência, uma breve avaliação ajuda-nos imenso:\n\n{url}\n\nAté breve,\n{brand}",
  sv: "Hej {name},\n\nTack för att du satt i stolen hos oss. Om du gillade det betyder ett kort omdöme mycket:\n\n{url}\n\nVi ses snart,\n{brand}",
  sq: "Përshëndetje {name},\n\nFaleminderit që na zgjodhët. Nëse ju pëlqeu përvoja, një vlerësim i shkurtër na ndihmon shumë:\n\n{url}\n\nShihemi së shpejti,\n{brand}",
};

/**
 * Marketing email sender — arbitrary subject + HTML body.
 *
 * Reuses the same relay/SMTP path as the transactional mailers, but takes
 * an explicit HTML body so campaign messages can carry rich formatting and
 * tracked links. The caller is responsible for including the unsubscribe
 * footer before calling this function.
 *
 * Returns { ok, error? } so the campaign scheduler can write a "fail" event
 * without throwing.
 */
export async function sendMarketingEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ ok: boolean; error?: string }> {
  const mode = await effectiveSmtpMode();

  if (mode === "atelier") {
    const r = await relaySend(to, subject, html);
    await appendLog({
      to,
      subject,
      body: html,
      sentAt: new Date().toISOString(),
      delivered: r.ok,
      ...(r.ok ? {} : { error: `Atelier relay: ${r.error}` }),
    });
    return r;
  }

  if (!(await smtpReady())) {
    await appendLog({
      to,
      subject,
      body: html,
      sentAt: new Date().toISOString(),
      delivered: false,
      error: "SMTP not configured (preview mode)",
    });
    return { ok: false, error: "smtp_not_configured" };
  }

  const from = await fromAddress();
  try {
    const transport = await buildTransport();
    await transport.sendMail({
      from,
      to,
      subject,
      html,
      // Plain-text fallback strips tags.
      text: html.replace(/<[^>]+>/g, " ").replace(/\s{2,}/g, " ").trim(),
    });
    await appendLog({
      to,
      subject,
      body: html,
      sentAt: new Date().toISOString(),
      delivered: true,
    });
    return { ok: true };
  } catch (e) {
    const error = e instanceof Error ? e.message : "send_failed";
    await appendLog({
      to,
      subject,
      body: html,
      sentAt: new Date().toISOString(),
      delivered: false,
      error,
    });
    return { ok: false, error };
  }
}

/**
 * Per-language copy for the "rate your purchase" email. Keeps the template
 * tight: one greeting, one sentence of context, then the bulleted product
 * links the scheduler computed. No HTML — plain text travels through every
 * spam filter cleanly and matches the style of the booking emails.
 */
const ORDER_REVIEW_SUBJECT: Record<string, string> = {
  en: "How was your purchase from {brand}?",
  el: "Πώς ήταν η αγορά σου από το {brand};",
};
const ORDER_REVIEW_GREETING: Record<string, string> = {
  en: "Hi {name},",
  el: "Γεια {name},",
};
const ORDER_REVIEW_INTRO: Record<string, string> = {
  en:
    "Thanks for shopping with {brand}. If you have a moment, we'd love your honest review on each item below. Each link is unique to your order and only works once.",
  el:
    "Ευχαριστούμε για την αγορά σου από το {brand}. Αν έχεις λίγο χρόνο, θα εκτιμούσαμε μια ειλικρινή κριτική για κάθε προϊόν παρακάτω. Κάθε σύνδεσμος είναι μοναδικός για την παραγγελία σου και χρησιμοποιείται μία φορά.",
};
const ORDER_REVIEW_OUTRO: Record<string, string> = {
  en: "— {brand}",
  el: "— {brand}",
};

/**
 * Send the post-purchase "rate your item" email for one order.
 *
 * Caller (the reminder scheduler) computes one signed URL per purchased
 * product and passes them in via `lines`. We render the email here so we
 * can:
 *  - reuse the same tenant business / locale resolution that the booking
 *    emails use,
 *  - keep all transactional copy in one place,
 *  - log a single email per order (not per line item) in emails.log.json.
 */
export async function sendOrderReviewRequest(
  order: { id: string; name: string; email: string; lang: "en" | "el" },
  lines: Array<{ name: string; url: string }>,
) {
  if (!order.email || lines.length === 0) {
    return { ok: false as const, error: "no-recipient-or-lines" };
  }
  const biz = await loadBusiness();
  const brand = biz.name || "Your Salon";
  const lang: "en" | "el" = order.lang === "el" ? "el" : "en";

  const vars: Record<string, string> = {
    "{name}": order.name || "there",
    "{brand}": brand,
  };
  const apply = (s: string) =>
    Object.entries(vars).reduce((acc, [k, v]) => acc.split(k).join(v), s);

  const subject = apply(ORDER_REVIEW_SUBJECT[lang] || ORDER_REVIEW_SUBJECT.en);
  const greeting = apply(ORDER_REVIEW_GREETING[lang] || ORDER_REVIEW_GREETING.en);
  const intro = apply(ORDER_REVIEW_INTRO[lang] || ORDER_REVIEW_INTRO.en);
  const outro = apply(ORDER_REVIEW_OUTRO[lang] || ORDER_REVIEW_OUTRO.en);

  const linesBlock = lines
    .map((l) => `• ${l.name}\n  ${l.url}`)
    .join("\n\n");

  const body = [greeting, "", intro, "", linesBlock, "", outro].join("\n");
  return sendOne(order.email, subject, body);
}

export async function sendReviewRequest(b: Booking) {
  const biz = await loadBusiness();
  const lang = bookingLang(b);
  const brand = biz.name || "Your Salon";
  const reviewUrl =
    safeUrl((biz as { reviewUrl?: string }).reviewUrl) ||
    safeUrl(process.env.NEXT_PUBLIC_REVIEW_URL) ||
    `https://www.google.com/search?q=${encodeURIComponent(brand + " " + (biz.city || "") + " reviews")}`;

  const vars: Record<string, string> = {
    "{name}": b.name,
    "{url}": reviewUrl,
    "{brand}": brand,
  };
  const apply = (s: string) =>
    Object.entries(vars).reduce((acc, [k, v]) => acc.split(k).join(v), s);

  const subject = apply(REVIEW_SUBJECT[lang] || REVIEW_SUBJECT.en);
  const body = apply(REVIEW_BODY[lang] || REVIEW_BODY.en);

  return sendOne(b.email, subject, body);
}
