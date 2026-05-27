import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { getAppRoot } from "@/lib/appRoot";
import { withFileLock } from "./fileLock";
import { getTenantPath } from "./tenantContext";

/**
 * Customer preference center — per-channel opt-in/out store.
 *
 * Data lives at <getAppRoot()>/data/marketing-prefs.json. Keyed by lowercased
 * email (and/or normalised phone) so look-ups are O(1). Customers default to
 * opted IN on all channels; a preference record is only written when the
 * customer explicitly changes a setting.
 *
 * HMAC-signed preference tokens mirror the pattern in reviewEngine.ts:
 *   payload: `<email>|<phone>|<issuedAt>`  (phone may be empty string)
 *   token:   base64url( payload + "|" + hmac(payload) )
 * TTL: 90 days. Tokens are one-time-login links — no admin session needed.
 *
 * Root-clean: public URLs are built with getTenantPath() so they resolve
 * correctly under a tenant slug AND in a standalone customer ZIP.
 */

// ---- File paths ---------------------------------------------------------------

const PREFS_FILE = () =>
  path.join(getAppRoot(), "data", "marketing-prefs.json");

const SECRET_FILE = () => path.join(getAppRoot(), "data", "secret.json");

const PREFS_LOCK = "marketing-prefs.json";

// ---- Token TTL ----------------------------------------------------------------

const TOKEN_TTL_SECONDS = 90 * 24 * 60 * 60; // 90 days

// ---- Types --------------------------------------------------------------------

export type PrefChannel = "push" | "email" | "sms";

/** One customer's channel preferences. Missing keys default to opted-in. */
export type CustomerPrefs = {
  /** Lowercased email, or "" if the contact has only a phone. */
  email: string;
  /** Normalised phone (digits + leading +), or "" if email-only. */
  phone: string;
  push: boolean;
  email_mkt: boolean; // "email" is reserved as a key — use email_mkt
  sms: boolean;
  updatedAt: string;
};

/** The full on-disk shape. */
type PrefsStore = Record<string, CustomerPrefs>;

/** Token payload fields. */
type PrefTokenPayload = {
  email: string;
  phone: string;
  issuedAt: number;
};

// ---- Contact normalisation ----------------------------------------------------

function normaliseEmail(e: string | undefined | null): string {
  return (e ?? "").trim().toLowerCase();
}

function normalisePhone(p: string | undefined | null): string {
  return (p ?? "").replace(/[^\d+]/g, "");
}

/** Build the map key for a contact. Email takes precedence; falls back to
 *  phone so that push-only contacts (no email) can still be stored. */
function contactKey(email: string, phone: string): string | null {
  const e = normaliseEmail(email);
  if (e) return `email:${e}`;
  const p = normalisePhone(phone);
  if (p) return `phone:${p}`;
  return null;
}

// ---- File I/O ----------------------------------------------------------------

async function readPrefs(): Promise<PrefsStore> {
  try {
    const raw = await fs.readFile(PREFS_FILE(), "utf-8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as PrefsStore) : {};
  } catch {
    return {};
  }
}

async function writePrefs(store: PrefsStore): Promise<void> {
  await fs.mkdir(path.dirname(PREFS_FILE()), { recursive: true });
  await fs.writeFile(
    PREFS_FILE(),
    JSON.stringify(store, null, 2) + "\n",
    "utf-8",
  );
}

// ---- Secret management (mirrors reviewEngine.ts) ------------------------------

type StoredSecret = {
  bookingTokenSecret?: string;
  reviewTokenSecret?: string;
  prefTokenSecret?: string;
};

async function readSecretFile(): Promise<StoredSecret> {
  try {
    const raw = await fs.readFile(SECRET_FILE(), "utf-8");
    return JSON.parse(raw) as StoredSecret;
  } catch {
    return {};
  }
}

async function writeSecretFile(s: StoredSecret): Promise<void> {
  await fs.mkdir(path.dirname(SECRET_FILE()), { recursive: true });
  await fs.writeFile(SECRET_FILE(), JSON.stringify(s, null, 2), "utf-8");
}

async function loadPrefSecret(): Promise<string> {
  const s = await readSecretFile();
  if (s.prefTokenSecret && s.prefTokenSecret.length >= 32) {
    return s.prefTokenSecret;
  }
  const fresh = crypto.randomBytes(32).toString("hex");
  await writeSecretFile({ ...s, prefTokenSecret: fresh });
  return fresh;
}

// ---- Base64url helpers (mirrors reviewEngine.ts) ------------------------------

function b64urlEncode(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64urlDecode(s: string): Buffer {
  const padded = (s + "===").slice(0, s.length + ((4 - (s.length % 4)) % 4));
  return Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

// ---- Token encode / decode ---------------------------------------------------

/**
 * Build a signed, base64url token for the customer preferences page.
 * Payload: `<email>|<phone>|<issuedAt>` then HMAC appended.
 */
export async function buildPrefToken(contact: {
  email?: string;
  phone?: string;
}): Promise<string> {
  const secret = await loadPrefSecret();
  const issuedAt = Math.floor(Date.now() / 1000);
  const email = normaliseEmail(contact.email).replace(/\|/g, " ");
  const phone = normalisePhone(contact.phone).replace(/\|/g, " ");
  const raw = [email, phone, String(issuedAt)].join("|");
  const hmac = crypto
    .createHmac("sha256", secret)
    .update(raw)
    .digest("hex")
    .slice(0, 32);
  return b64urlEncode(Buffer.from(`${raw}|${hmac}`, "utf-8"));
}

/**
 * Decode and verify a preference token. Returns the payload on success, or
 * null if the token is invalid or expired (> 90 days).
 */
export async function verifyPrefToken(
  token: string,
): Promise<PrefTokenPayload | null> {
  try {
    const decoded = b64urlDecode(token).toString("utf-8");
    const parts = decoded.split("|");
    // Format: email | phone | issuedAt | hmac
    if (parts.length < 4) return null;

    const [email, phone, issuedAtStr, mac] = parts;
    const issuedAt = Number(issuedAtStr);
    if (isNaN(issuedAt) || !issuedAt) return null;

    const age = Math.floor(Date.now() / 1000) - issuedAt;
    if (age < 0 || age > TOKEN_TTL_SECONDS) return null;

    const raw = [email, phone, issuedAtStr].join("|");
    const secret = await loadPrefSecret();
    const expected = crypto
      .createHmac("sha256", secret)
      .update(raw)
      .digest("hex")
      .slice(0, 32);

    const a = Buffer.from(expected, "utf-8");
    const b = Buffer.from(mac ?? "", "utf-8");
    if (a.length !== b.length) return null;
    if (!crypto.timingSafeEqual(a, b)) return null;

    return { email, phone, issuedAt };
  } catch {
    return null;
  }
}

/**
 * Build the root-clean public URL to the preference center for a contact.
 * Under a SaaS tenant: `/<slug>/marketing/preferences/<token>`.
 * Standalone ZIP:       `/marketing/preferences/<token>`.
 */
export async function prefUrlFor(contact: {
  email?: string;
  phone?: string;
}): Promise<string> {
  const token = await buildPrefToken(contact);
  const slug = getTenantPath();
  const base = slug ? `/${slug}` : "";
  return `${base}/marketing/preferences/${token}`;
}

// ---- Preference reads ---------------------------------------------------------

/** Get stored prefs for a contact, or null if no record exists (= opted in). */
async function getPrefs(
  email: string,
  phone: string,
): Promise<CustomerPrefs | null> {
  const key = contactKey(email, phone);
  if (!key) return null;
  const store = await readPrefs();
  return store[key] ?? null;
}

/**
 * Returns true when the contact is opted in for the given channel.
 * Defaults to opted-IN when no preference record exists.
 */
export async function isOptedIn(
  contact: { email?: string; phone?: string },
  channel: PrefChannel,
): Promise<boolean> {
  const email = normaliseEmail(contact.email);
  const phone = normalisePhone(contact.phone);
  const prefs = await getPrefs(email, phone);
  if (!prefs) return true; // default opted-in

  switch (channel) {
    case "push":
      return prefs.push !== false;
    case "email":
      return prefs.email_mkt !== false;
    case "sms":
      return prefs.sms !== false;
  }
}

// ---- Preference writes --------------------------------------------------------

/**
 * Set one or more channel preferences for a contact. Creates the record on
 * first call. File-locked to avoid concurrent writes racing.
 */
export async function setPref(
  contact: { email?: string; phone?: string },
  prefs: Partial<Record<PrefChannel, boolean>>,
): Promise<CustomerPrefs> {
  const email = normaliseEmail(contact.email);
  const phone = normalisePhone(contact.phone);
  const key = contactKey(email, phone);
  if (!key) throw new Error("Contact must have email or phone");

  return withFileLock(PREFS_LOCK, async () => {
    const store = await readPrefs();
    const existing: CustomerPrefs = store[key] ?? {
      email,
      phone,
      push: true,
      email_mkt: true,
      sms: true,
      updatedAt: new Date().toISOString(),
    };
    const updated: CustomerPrefs = {
      ...existing,
      ...(prefs.push !== undefined ? { push: prefs.push } : {}),
      ...(prefs.email !== undefined ? { email_mkt: prefs.email } : {}),
      ...(prefs.sms !== undefined ? { sms: prefs.sms } : {}),
      updatedAt: new Date().toISOString(),
    };
    store[key] = updated;
    await writePrefs(store);
    return updated;
  });
}

/**
 * Unsubscribe a contact from ALL channels at once. Convenience wrapper over
 * setPref() — used by the "unsubscribe from everything" action.
 */
export async function unsubscribeAll(contact: {
  email?: string;
  phone?: string;
}): Promise<CustomerPrefs> {
  return setPref(contact, { push: false, email: false, sms: false });
}

/**
 * Read the current prefs for a contact, returning a record with all channels
 * defaulting to true when no stored record exists.
 */
export async function getContactPrefs(contact: {
  email?: string;
  phone?: string;
}): Promise<{ push: boolean; email: boolean; sms: boolean }> {
  const email = normaliseEmail(contact.email);
  const phone = normalisePhone(contact.phone);
  const stored = await getPrefs(email, phone);
  return {
    push: stored?.push ?? true,
    email: stored?.email_mkt ?? true,
    sms: stored?.sms ?? true,
  };
}
