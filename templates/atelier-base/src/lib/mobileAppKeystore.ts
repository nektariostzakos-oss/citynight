/**
 * Per-tenant Android signing keystore storage.
 *
 * The keystore PWABuilder generates on the FIRST build must be reused on every
 * later build: Google Play binds an app's update channel to its signing key,
 * so a re-signed APK is rejected as a different app. We persist it once and
 * feed it back on every rebuild.
 *
 * The keystore is sensitive, so it never lives in `settings.json` (which the
 * admin settings API can read) and never under `public/`. It sits in its own
 * file under the tenant's gitignored `data/` tree, resolved through
 * `getAppRoot()` so SaaS tenants are isolated automatically.
 */
import { getAppRoot } from "@/lib/appRoot";
import { withFileLock } from "@/lib/fileLock";
import { promises as fs } from "fs";
import path from "path";

export type SigningKeystore = {
  /** base64-encoded .keystore file PWABuilder produced. */
  keystoreBase64: string;
  /** Key alias inside the keystore. */
  alias: string;
  /** Key + store password (PWABuilder uses one password for both). */
  password: string;
  /** ISO timestamp the keystore was first stored. */
  createdAt: string;
};

const FILE = () =>
  path.join(getAppRoot(), "data", "mobile-app-keystore.json");

/** The stored keystore, or null if no build has ever produced one. */
export async function loadKeystore(): Promise<SigningKeystore | null> {
  try {
    const raw = await fs.readFile(FILE(), "utf-8");
    const parsed = JSON.parse(raw) as SigningKeystore;
    if (parsed && parsed.keystoreBase64 && parsed.alias) return parsed;
    return null;
  } catch {
    return null;
  }
}

/**
 * Persist the keystore from the first successful build. Locked so a second
 * concurrent build can't half-write the file. A keystore is written exactly
 * once: if one already exists this is a no-op, which guarantees later builds
 * keep signing with the original key.
 */
export async function saveKeystoreOnce(
  ks: Omit<SigningKeystore, "createdAt">,
): Promise<SigningKeystore> {
  return withFileLock(FILE(), async () => {
    const existing = await loadKeystore();
    if (existing) return existing;
    const record: SigningKeystore = { ...ks, createdAt: new Date().toISOString() };
    await fs.mkdir(path.dirname(FILE()), { recursive: true });
    await fs.writeFile(FILE(), JSON.stringify(record, null, 2), "utf-8");
    return record;
  });
}
