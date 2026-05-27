import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { isAdmin } from "@/lib/auth";
import { loadSettings } from "@/lib/settings";
import { getBaseRoot } from "@/lib/appRoot";
import { getCurrentTenant } from "@/lib/tenantContext";
import { extractZip } from "@/lib/zipExtract";

export const runtime = "nodejs";

/**
 * Staged update. Downloads the latest customer template ZIP (license-gated),
 * unpacks it into a sibling folder `<app>-update`, and copies the live
 * `data/` + `public/uploads/` into it. Nothing the site runs on is touched:
 * the operator finishes by swapping the folders and running build + restart,
 * the one step that can briefly take the site offline.
 */

const STAGE_MARKER = ".atelier-staged.json";

const DOWNLOAD_URL =
  process.env.ATELIER_TEMPLATE_DOWNLOAD_URL ||
  process.env.NEXT_PUBLIC_ATELIER_TEMPLATE_DOWNLOAD_URL ||
  "https://atelier.mindscrollers.com/api/template-download";

async function localVersion(root: string): Promise<string> {
  try {
    const pkg = JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf-8"));
    return pkg.version || "0.0.0";
  } catch {
    return "0.0.0";
  }
}

export async function POST() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // SaaS-hosted tenants are updated centrally; self-staging is for the
  // standalone customer install only.
  if (getCurrentTenant()) {
    return NextResponse.json(
      { error: "saas", message: "Hosted sites are updated automatically. No action needed here." },
      { status: 400 }
    );
  }

  const settings = await loadSettings();
  const key = settings.license?.key;
  if (!key) {
    return NextResponse.json(
      {
        error: "no-license",
        message:
          "This install has no license key on file, so it can't fetch updates automatically. Use the manual ZIP steps below.",
      },
      { status: 400 }
    );
  }

  const root = getBaseRoot();

  // 1. Download the latest template ZIP, gated by this install's license key.
  let zipBuf: Buffer;
  let newVersion = "";
  try {
    const res = await fetch(`${DOWNLOAD_URL}?key=${encodeURIComponent(key)}`, {
      cache: "no-store",
    });
    if (!res.ok) {
      const message =
        res.status === 403
          ? "The update server rejected this install's license key. Open a support ticket from your customer portal."
          : `The update server responded with HTTP ${res.status}. Try again shortly.`;
      return NextResponse.json({ error: "download-failed", message }, { status: 502 });
    }
    newVersion = res.headers.get("x-atelier-template-version") || "";
    zipBuf = Buffer.from(await res.arrayBuffer());
  } catch {
    return NextResponse.json(
      {
        error: "unreachable",
        message:
          "Couldn't reach the update server. Check the host's outbound network connection and try again.",
      },
      { status: 502 }
    );
  }
  if (zipBuf.length < 1024) {
    return NextResponse.json(
      { error: "bad-zip", message: "The downloaded update looked empty or corrupt. Try again shortly." },
      { status: 502 }
    );
  }

  // 2. Prepare a staging folder beside the install: <parent>/<name>-update.
  const parent = path.dirname(root);
  const base = path.basename(root);
  const stageDir = path.join(parent, `${base}-update`);

  try {
    let existing = false;
    try {
      await fs.access(stageDir);
      existing = true;
    } catch {
      /* fresh */
    }
    if (existing) {
      // Only ever clear a folder a previous staging run created (it carries
      // our marker file). Anything else is left untouched.
      try {
        await fs.access(path.join(stageDir, STAGE_MARKER));
      } catch {
        return NextResponse.json(
          {
            error: "stage-occupied",
            message: `A folder already exists at ${stageDir} and was not created by this updater. Move or remove it, then try again.`,
          },
          { status: 409 }
        );
      }
      await fs.rm(stageDir, { recursive: true, force: true });
    }
    await fs.mkdir(stageDir, { recursive: true });
  } catch {
    return NextResponse.json(
      {
        error: "stage-write-failed",
        message: `Couldn't create a staging folder at ${stageDir}. The host may not allow writing outside the app directory. Use the manual ZIP steps below.`,
      },
      { status: 500 }
    );
  }

  // 3. Unpack the new template into the staging folder.
  let fileCount = 0;
  try {
    fileCount = await extractZip(zipBuf, stageDir);
  } catch (err) {
    await fs.rm(stageDir, { recursive: true, force: true }).catch(() => {});
    return NextResponse.json(
      { error: "extract-failed", message: `Couldn't unpack the update: ${(err as Error).message}` },
      { status: 500 }
    );
  }

  // 4. Carry the live data + uploads into the staged copy so nothing is lost.
  const fromVersion = await localVersion(root);
  const carried: string[] = [];
  try {
    for (const rel of ["data", path.join("public", "uploads")]) {
      const src = path.join(root, rel);
      try {
        await fs.access(src);
      } catch {
        continue;
      }
      const dst = path.join(stageDir, rel);
      await fs.rm(dst, { recursive: true, force: true }).catch(() => {});
      await fs.mkdir(path.dirname(dst), { recursive: true });
      await fs.cp(src, dst, { recursive: true });
      carried.push(rel);
    }
  } catch (err) {
    await fs.rm(stageDir, { recursive: true, force: true }).catch(() => {});
    return NextResponse.json(
      { error: "data-copy-failed", message: `Couldn't copy your data into the staged folder: ${(err as Error).message}` },
      { status: 500 }
    );
  }

  // 5. Write a manifest so the staged folder is self-identifying.
  const manifest = {
    stagedAt: new Date().toISOString(),
    fromVersion,
    toVersion: newVersion || "unknown",
    files: fileCount,
    carried,
  };
  await fs.writeFile(path.join(stageDir, STAGE_MARKER), JSON.stringify(manifest, null, 2));

  return NextResponse.json({ ok: true, stageDir, appDir: root, ...manifest });
}
