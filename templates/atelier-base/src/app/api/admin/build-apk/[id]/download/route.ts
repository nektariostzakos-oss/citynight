/**
 * GET /api/admin/build-apk/[id]/download — stream the signed APK.
 *
 * Admin-only. Caps downloads per build (`MAX_DOWNLOADS`) so the URL can't be
 * embedded anywhere public and abused as a free CDN. The owner can always
 * trigger a rebuild to reset the counter.
 */
import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { getAppRoot } from "@/lib/appRoot";
import { isAdmin } from "@/lib/auth";
import { getBuild, updateBuild } from "@/lib/apkBuilds";
import { loadBusiness } from "@/lib/settings";

export const runtime = "nodejs";

const MAX_DOWNLOADS = 5;

/** Strip filesystem-hostile characters from the business name. */
function safeName(s: string): string {
  return (
    s
      .normalize("NFKD")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "atelier"
  );
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const build = await getBuild(id);
  if (!build || build.status !== "ready" || !build.apkRelPath) {
    return NextResponse.json({ error: "APK not ready" }, { status: 404 });
  }
  if (build.downloads >= MAX_DOWNLOADS) {
    return NextResponse.json(
      { error: "Download limit reached. Run a fresh build to download again." },
      { status: 410 },
    );
  }
  const absPath = path.join(getAppRoot(), "public", build.apkRelPath);
  const buf = await fs.readFile(absPath).catch(() => null);
  if (!buf) {
    return NextResponse.json({ error: "APK file missing" }, { status: 410 });
  }

  await updateBuild(id, { downloads: build.downloads + 1 });

  const business = await loadBusiness();
  const filename = `${safeName(business.name || "atelier")}-v${build.appVersion}.apk`;
  return new NextResponse(buf as unknown as BodyInit, {
    headers: {
      "content-type": "application/vnd.android.package-archive",
      "content-disposition": `attachment; filename="${filename}"`,
      "content-length": String(buf.length),
      "cache-control": "no-store",
    },
  });
}
