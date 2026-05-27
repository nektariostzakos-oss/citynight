/**
 * Android APK builder.
 *
 * Turns the tenant's PWA into a signed Android app (a Trusted Web Activity)
 * by calling the free PWABuilder CloudAPK service. No build infrastructure,
 * no Android SDK: PWABuilder compiles and signs the package, we store the
 * resulting APK under the tenant's uploads folder.
 *
 * The TWA loads the live website, so a content or feature change never needs
 * a rebuild. Only a branding change (icon, name, color) does.
 *
 * Flow (see `runBuild`): queued -> building -> signing -> ready | failed.
 * `runBuild` is fire-and-forget; the admin page polls the build record.
 */
import AdmZip from "adm-zip";
import crypto from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { getAppRoot } from "@/lib/appRoot";
import { getCurrentTenant } from "@/lib/tenantContext";
import { loadMobileApp, saveMobileApp, loadBusiness } from "@/lib/settings";
import {
  createBuild,
  updateBuild,
  listBuilds,
  deleteBuild,
  getBuild,
  type ApkBuild,
} from "@/lib/apkBuilds";
import { loadKeystore, saveKeystoreOnce } from "@/lib/mobileAppKeystore";

/**
 * PWABuilder CloudAPK endpoint. Overridable via env in case the public host
 * moves; the default is the long-standing production CloudAPK service.
 */
const PWABUILDER_URL =
  process.env.PWABUILDER_CLOUDAPK_URL ||
  "https://pwabuilder-cloudapk.azurewebsites.net";
const GENERATE_PATH = "/generateAppPackage";

/** Hard ceiling on a single build, generous over the typical 60-120s. */
const BUILD_TIMEOUT_MS = 180_000;
/** Successful builds kept per tenant; older APK files are deleted. */
const KEEP_READY = 3;
/** Failed build records older than this are purged. */
const FAILED_TTL_MS = 24 * 60 * 60 * 1000;

const APK_DIR = () => path.join(getAppRoot(), "public", "uploads", "apks");

/** A localhost / LAN origin can't be reached by the PWABuilder service. */
function isPublicOrigin(origin: string): boolean {
  return !/(^https?:\/\/)?(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]|.+\.local)(:|\/|$)/i.test(
    origin,
  );
}

/**
 * Resolve the tenant's public site URL from the request origin. Under the
 * SaaS bundle the tenant is mounted at `/<slug>`, so the site URL carries
 * that segment. The slug comes only from runtime context, never hardcoded.
 */
function siteUrlFor(origin: string): string {
  const slug = getCurrentTenant();
  const base = origin.replace(/\/+$/, "");
  return slug ? `${base}/${slug}` : base;
}

type PwaBuilderPayload = Record<string, unknown>;

/**
 * Build the PWABuilder JSON payload from the tenant's mobile-app settings.
 * Every URL is absolute and points at the public site so the build service
 * can fetch the manifest and icons.
 */
async function buildPayload(
  origin: string,
  versionCode: number,
  appVersion: string,
): Promise<PwaBuilderPayload> {
  const m = await loadMobileApp();
  const business = await loadBusiness();
  const siteUrl = siteUrlFor(origin);
  const icon = (rel: string) => `${siteUrl}${rel}`;
  const stored = await loadKeystore();

  // On the first build we hand PWABuilder a fresh alias + password and ask it
  // to generate ("new") a keystore with them. Every later build reuses the
  // stored keystore ("mine") so Play Store updates keep working.
  const alias = stored?.alias || "atelier";
  const password =
    stored?.password || crypto.randomBytes(18).toString("base64url");

  return {
    packageId: m.packageId,
    name: m.appName,
    launcherName: m.launcherName.slice(0, 30),
    appVersion,
    appVersionCode: versionCode,
    display: "standalone",
    orientation: "portrait",
    host: siteUrl,
    startUrl: "/",
    webManifestUrl: `${siteUrl}/manifest.webmanifest`,
    themeColor: m.themeColor,
    navigationColor: m.themeColor,
    navigationColorDark: m.darkColor,
    navigationDividerColor: m.themeColor,
    navigationDividerColorDark: m.darkColor,
    backgroundColor: m.backgroundColor,
    enableNotifications: true,
    enableSiteSettingsShortcut: true,
    fallbackType: "customtabs",
    fullScopeUrl: `${siteUrl}/`,
    iconUrl: m.maskableIconUrl ? icon(m.maskableIconUrl) : icon("/icon-pwa?s=512"),
    maskableIconUrl: m.maskableIconUrl
      ? icon(m.maskableIconUrl)
      : icon("/icon-pwa?s=512"),
    monochromeIconUrl: m.monochromeIconUrl
      ? icon(m.monochromeIconUrl)
      : undefined,
    splashScreenFadeOutDuration: 300,
    shortcuts: [],
    signingMode: stored ? "mine" : "new",
    signing: {
      file: stored ? stored.keystoreBase64 : null,
      alias,
      fullName: business.name || m.appName,
      organization: business.name || m.appName,
      organizationalUnit: "Atelier",
      countryCode: (business.country || "US").slice(0, 2).toUpperCase(),
      keyPassword: password,
      storePassword: password,
    },
  };
}

/**
 * POST the payload to PWABuilder and return the response ZIP as a Buffer.
 * Retries 5xx responses with exponential backoff; a 4xx fails immediately.
 */
async function callPwaBuilder(payload: PwaBuilderPayload): Promise<Buffer> {
  let lastErr = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), BUILD_TIMEOUT_MS);
    try {
      const res = await fetch(`${PWABUILDER_URL}${GENERATE_PATH}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        signal: ctrl.signal,
      });
      if (res.ok) {
        return Buffer.from(await res.arrayBuffer());
      }
      const text = await res.text().catch(() => "");
      lastErr = `PWABuilder responded ${res.status}: ${text.slice(0, 300)}`;
      // A 4xx is a payload problem; retrying will not help.
      if (res.status < 500) throw new Error(lastErr);
    } catch (err) {
      lastErr =
        err instanceof Error && err.name === "AbortError"
          ? "TIMEOUT"
          : err instanceof Error
            ? err.message
            : String(err);
      if (lastErr.startsWith("PWABuilder responded 4")) throw new Error(lastErr);
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(lastErr || "PWABuilder request failed");
}

type ExtractResult = {
  apk: Buffer;
  keystore?: { keystoreBase64: string };
};

/** Pull the signed APK (and, on a first build, the keystore) from the ZIP. */
function extractFromZip(zipBuf: Buffer): ExtractResult {
  const zip = new AdmZip(zipBuf);
  const entries = zip.getEntries().filter((e) => !e.isDirectory);

  const apkEntries = entries.filter((e) =>
    e.entryName.toLowerCase().endsWith(".apk"),
  );
  if (apkEntries.length === 0) {
    throw new Error("NO_APK");
  }
  // Prefer a "signed" APK when the ZIP carries both signed and unsigned.
  const apkEntry =
    apkEntries.find((e) => e.entryName.toLowerCase().includes("signed")) ??
    apkEntries[0];

  const keystoreEntry = entries.find((e) =>
    e.entryName.toLowerCase().endsWith(".keystore"),
  );

  return {
    apk: apkEntry.getData(),
    keystore: keystoreEntry
      ? { keystoreBase64: keystoreEntry.getData().toString("base64") }
      : undefined,
  };
}

/** Map an internal error string to a human-friendly admin-facing reason. */
function friendlyError(raw: string): string {
  if (raw === "TIMEOUT") {
    return "Build took longer than expected. Check the status in a minute or try again.";
  }
  if (raw === "NO_APK") {
    return "The build service did not return an APK. Try again in a few minutes.";
  }
  if (/manifest/i.test(raw) && /(404|not found|unreachable|fetch)/i.test(raw)) {
    return "Your site's app manifest could not be read. Make sure your site is published and reachable on the public internet.";
  }
  if (/PWABuilder responded 5/.test(raw)) {
    return "The build service is temporarily unavailable. Try again in a few minutes.";
  }
  if (/ENOSPC|disk/i.test(raw)) {
    return "Storage is full. Contact support.";
  }
  if (/PWABuilder responded 4/.test(raw)) {
    return "The app could not be built from your current settings. Check your app name and icon, then try again.";
  }
  return "The build failed. Try again in a few minutes.";
}

/**
 * Retention: keep the newest `KEEP_READY` successful builds, delete older APK
 * files and their records; drop failed records older than `FAILED_TTL_MS`.
 */
export async function purgeOldBuilds(): Promise<void> {
  const all = await listBuilds(100);
  const ready = all.filter((b) => b.status === "ready");
  const stale = ready.slice(KEEP_READY);
  const now = Date.now();
  const oldFailed = all.filter(
    (b) =>
      b.status === "failed" &&
      now - new Date(b.startedAt).getTime() > FAILED_TTL_MS,
  );
  for (const b of [...stale, ...oldFailed]) {
    if (b.apkRelPath) {
      await fs
        .rm(path.join(getAppRoot(), "public", b.apkRelPath))
        .catch(() => {});
    }
    await deleteBuild(b.id);
  }
}

/**
 * Run a build to completion. Fire-and-forget: callers do not await this; the
 * admin page polls the build record for progress. Never throws.
 */
async function runBuild(buildId: string, origin: string): Promise<void> {
  try {
    await updateBuild(buildId, { status: "building" });
    const build = await getBuild(buildId);
    if (!build) return;

    const payload = await buildPayload(
      origin,
      build.versionCode,
      build.appVersion,
    );
    const zipBuf = await callPwaBuilder(payload);

    await updateBuild(buildId, { status: "signing" });
    const { apk, keystore } = extractFromZip(zipBuf);

    // Persist the keystore exactly once, from the first build that yields one.
    if (keystore) {
      const signing = payload.signing as {
        alias: string;
        keyPassword: string;
      };
      await saveKeystoreOnce({
        keystoreBase64: keystore.keystoreBase64,
        alias: signing.alias,
        password: signing.keyPassword,
      });
    }

    await fs.mkdir(APK_DIR(), { recursive: true });
    const apkRelPath = path.posix.join("uploads", "apks", `${buildId}.apk`);
    await fs.writeFile(path.join(getAppRoot(), "public", apkRelPath), apk);

    await updateBuild(buildId, {
      status: "ready",
      finishedAt: new Date().toISOString(),
      apkRelPath,
      apkSizeBytes: apk.length,
    });

    await saveMobileApp({
      lastVersionCode: build.versionCode,
      lockedPackageId: true,
      hasSigningKey: true,
    });
    await purgeOldBuilds();
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    await updateBuild(buildId, {
      status: "failed",
      finishedAt: new Date().toISOString(),
      error: friendlyError(raw),
    });
  }
}

/**
 * Start a new build. Validates the origin is public, allocates the next
 * version code, creates the build record and schedules `runBuild`. Returns
 * the new build's id. Throws a human-readable Error for a localhost origin.
 */
export async function startBuild(origin: string): Promise<ApkBuild> {
  if (!isPublicOrigin(origin)) {
    throw new Error(
      "Your site must be reachable on the public internet to build the app. Publish your site first.",
    );
  }
  const m = await loadMobileApp();
  const versionCode = (m.lastVersionCode ?? 0) + 1;
  const appVersion = `1.0.${versionCode}`;
  const id = `apk_${Date.now().toString(36)}_${crypto
    .randomBytes(4)
    .toString("hex")}`;
  const build = await createBuild({ id, versionCode, appVersion });
  // Fire-and-forget: the heavy work runs after the response is sent.
  setImmediate(() => {
    void runBuild(id, origin);
  });
  return build;
}
