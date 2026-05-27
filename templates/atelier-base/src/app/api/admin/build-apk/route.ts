/**
 * POST /api/admin/build-apk — start a new Android APK build.
 * GET  /api/admin/build-apk — list recent builds.
 *
 * Admin-only (the barber role is rejected). Rate-limited per tenant so a
 * runaway loop can't hammer the free PWABuilder service. Only one build can
 * be in flight per tenant: the second request gets 409 until the first
 * finishes.
 */
import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { allowAction } from "@/lib/rateLimit";
import { getCurrentTenant } from "@/lib/tenantContext";
import { startBuild } from "@/lib/apkBuilder";
import { hasActiveBuild, listBuilds } from "@/lib/apkBuilds";
import {
  loadMobileApp,
  saveMobileApp,
  type MobileAppSettings,
} from "@/lib/settings";

export const runtime = "nodejs";

/**
 * Derive the public origin from the request, honoring a trusted proxy's
 * `x-forwarded-*` headers. Defaults to https because every real install is
 * served over TLS; for local dev the localhost guard in startBuild catches it.
 */
function publicOrigin(req: NextRequest): string {
  const xfHost = req.headers.get("x-forwarded-host");
  const host = xfHost || req.headers.get("host") || "";
  const proto =
    req.headers.get("x-forwarded-proto") ||
    (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantKey = getCurrentTenant() ?? "self";
  if (!allowAction(`apk-build:${tenantKey}`, 3, 60 * 60_000)) {
    return NextResponse.json(
      { error: "Too many builds. Try again in an hour." },
      { status: 429 },
    );
  }

  if (await hasActiveBuild()) {
    return NextResponse.json(
      { error: "A build is already running. Wait for it to finish." },
      { status: 409 },
    );
  }

  try {
    const build = await startBuild(publicOrigin(req));
    return NextResponse.json({ buildId: build.id, status: build.status });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not start the build.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const [builds, mobileApp] = await Promise.all([
    listBuilds(10),
    loadMobileApp(),
  ]);
  return NextResponse.json({ builds, mobileApp });
}

/** Keys the admin form is allowed to update. The signing keystore is never
 *  exposed here; it lives in its own file. The package id is read-only once
 *  the first build has locked it. */
const PATCH_ALLOWLIST: ReadonlyArray<keyof MobileAppSettings> = [
  "appName",
  "launcherName",
  "packageId",
  "themeColor",
  "backgroundColor",
  "darkColor",
  "maskableIconUrl",
  "monochromeIconUrl",
  "installPageEnabled",
];

export async function PATCH(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const raw = (await req.json().catch(() => null)) as
    | Record<string, unknown>
    | null;
  if (!raw || typeof raw !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const patch: Partial<MobileAppSettings> = {};
  for (const key of PATCH_ALLOWLIST) {
    if (key in raw) {
      const v = raw[key];
      if (typeof v === "string" || typeof v === "boolean") {
        (patch as Record<string, unknown>)[key] = v;
      }
    }
  }
  // Cheap shape checks: hex color, simple package id, reasonable length.
  if (
    typeof patch.packageId === "string" &&
    !/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*){1,}$/.test(patch.packageId)
  ) {
    return NextResponse.json(
      {
        error:
          "Package id must look like com.example.salon: lowercase letters, digits and dots only.",
      },
      { status: 400 },
    );
  }
  for (const c of ["themeColor", "backgroundColor", "darkColor"] as const) {
    const v = patch[c];
    if (typeof v === "string" && !/^#[0-9a-fA-F]{3,8}$/.test(v)) {
      return NextResponse.json(
        { error: `Invalid color for ${c}.` },
        { status: 400 },
      );
    }
  }
  await saveMobileApp(patch);
  return NextResponse.json({ mobileApp: await loadMobileApp() });
}
