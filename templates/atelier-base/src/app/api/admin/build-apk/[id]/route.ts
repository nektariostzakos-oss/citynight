/**
 * GET    /api/admin/build-apk/[id] — poll status (admin polls every ~3s).
 * DELETE /api/admin/build-apk/[id] — remove a build and its APK file.
 *
 * The DELETE is purely cleanup; an in-flight build can't be cancelled
 * mid-flight (PWABuilder owns the work). It simply stops tracking the record.
 */
import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { getAppRoot } from "@/lib/appRoot";
import { isAdmin } from "@/lib/auth";
import { getBuild, deleteBuild } from "@/lib/apkBuilds";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const build = await getBuild(id);
  if (!build) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ build });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const build = await getBuild(id);
  if (!build) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (build.apkRelPath) {
    await fs
      .rm(path.join(getAppRoot(), "public", build.apkRelPath))
      .catch(() => {});
  }
  await deleteBuild(id);
  return NextResponse.json({ ok: true });
}
