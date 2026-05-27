/**
 * GET /install/apk — public APK download for the share page.
 *
 * Off until the owner enables the install page. IP rate-limited so the link
 * cannot be slammed; otherwise the same APK file the admin download endpoint
 * serves, with a content-disposition that names the file after the business.
 */
import { promises as fs } from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { getAppRoot } from "@/lib/appRoot";
import { loadBusiness, loadMobileApp } from "@/lib/settings";
import { getLatestReady } from "@/lib/apkBuilds";
import { allowAction, clientIp } from "@/lib/rateLimit";

export const runtime = "nodejs";

function safeName(s: string): string {
  return (
    s
      .normalize("NFKD")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "atelier"
  );
}

export async function GET(req: NextRequest) {
  const mobileApp = await loadMobileApp();
  if (!mobileApp.installPageEnabled) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!allowAction(`install-apk:${clientIp(req)}`, 10, 60 * 60_000)) {
    return NextResponse.json(
      { error: "Too many downloads. Try again later." },
      { status: 429 },
    );
  }
  const ready = await getLatestReady();
  if (!ready?.apkRelPath) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const buf = await fs
    .readFile(path.join(getAppRoot(), "public", ready.apkRelPath))
    .catch(() => null);
  if (!buf) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const business = await loadBusiness();
  const filename = `${safeName(business.name || "atelier")}-v${ready.appVersion}.apk`;
  return new NextResponse(buf as unknown as BodyInit, {
    headers: {
      "content-type": "application/vnd.android.package-archive",
      "content-disposition": `attachment; filename="${filename}"`,
      "content-length": String(buf.length),
      "cache-control": "no-store",
    },
  });
}
