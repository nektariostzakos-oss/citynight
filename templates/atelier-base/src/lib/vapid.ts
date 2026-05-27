/**
 * VAPID key resolution for Web Push.
 *
 * One key pair powers the whole deployment. Resolution order:
 *
 *  1. Environment variables — `ATELIER_VAPID_PUBLIC`, `ATELIER_VAPID_PRIVATE`,
 *     `ATELIER_VAPID_SUBJECT`. This is how the hosted SaaS bundle runs: one
 *     pair set once in the deployment env, shared by every tenant.
 *
 *  2. A persisted per-app file `data/push-keys.json`. The standalone customer
 *     ZIP ships with no env vars, so on first use we generate a real pair with
 *     web-push and persist it here. The buyer configures nothing.
 *
 * The PRIVATE key never leaves the server. Only the PUBLIC key is exposed to
 * the browser, via `GET /api/push/vapid`.
 */
import { getAppRoot } from "@/lib/appRoot";
import { promises as fs } from "fs";
import path from "path";
import webpush from "web-push";
import { withFileLock } from "./fileLock";

export type VapidKeys = {
  publicKey: string;
  privateKey: string;
  subject: string;
};

const FILE = () => path.join(getAppRoot(), "data", "push-keys.json");
const LOCK = "push-keys.json";

/** A sensible default `mailto:` subject for installs that set no subject. */
const DEFAULT_SUBJECT = "mailto:notifications@example.com";

function envKeys(): VapidKeys | null {
  const publicKey = process.env.ATELIER_VAPID_PUBLIC;
  const privateKey = process.env.ATELIER_VAPID_PRIVATE;
  if (publicKey && privateKey) {
    return {
      publicKey,
      privateKey,
      subject: process.env.ATELIER_VAPID_SUBJECT || DEFAULT_SUBJECT,
    };
  }
  return null;
}

async function readFileKeys(): Promise<VapidKeys | null> {
  try {
    const raw = await fs.readFile(FILE(), "utf-8");
    const parsed = JSON.parse(raw) as Partial<VapidKeys>;
    if (parsed.publicKey && parsed.privateKey) {
      return {
        publicKey: parsed.publicKey,
        privateKey: parsed.privateKey,
        subject: parsed.subject || DEFAULT_SUBJECT,
      };
    }
  } catch {
    /* missing or malformed — fall through to generate */
  }
  return null;
}

/**
 * Resolve the active VAPID key pair, generating + persisting one on first use
 * when neither env vars nor a stored file are present. Concurrency-safe: the
 * generate-and-write is serialized through the file lock so two simultaneous
 * first requests cannot each write a different pair.
 */
export async function getVapidKeys(): Promise<VapidKeys> {
  const fromEnv = envKeys();
  if (fromEnv) return fromEnv;

  const existing = await readFileKeys();
  if (existing) return existing;

  return withFileLock(LOCK, async () => {
    // Re-check inside the lock — another request may have just written it.
    const again = await readFileKeys();
    if (again) return again;

    const generated = webpush.generateVAPIDKeys();
    const keys: VapidKeys = {
      publicKey: generated.publicKey,
      privateKey: generated.privateKey,
      subject:
        process.env.ATELIER_VAPID_SUBJECT || DEFAULT_SUBJECT,
    };
    await fs.mkdir(path.dirname(FILE()), { recursive: true });
    await fs.writeFile(FILE(), JSON.stringify(keys, null, 2), "utf-8");
    return keys;
  });
}

/** The browser-safe public key only. */
export async function getVapidPublicKey(): Promise<string> {
  return (await getVapidKeys()).publicKey;
}
