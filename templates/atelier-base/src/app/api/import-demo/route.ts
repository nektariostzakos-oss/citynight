import { getAppRoot, getBaseRoot } from "@/lib/appRoot";
import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { isAdmin } from "../../../lib/auth";
import { isDemoMode } from "../../../lib/demoMode";
import { loadSettings } from "../../../lib/settings";

const DATA_DIR = () => path.join(getAppRoot(), "data");
const UPLOADS_DIR = () => path.join(getAppRoot(), "public", "uploads");
const DEMOS_DIR = () => path.join(getBaseRoot(), "demos");

// Demo data files copied into the live site. users.json (logins) and
// settings.json (business config + license) are deliberately left untouched,
// so importing demo content never changes who can sign in or the site's own
// business details — it only fills the catalogue and sample records.
const IMPORT_FILES = [
  "services.json",
  "staff.json",
  "products.json",
  "pages.json",
  "blog-categories.json",
  "content.json",
  "reviews.json",
  "transformations.json",
  "coupons.json",
  "gift-cards.json",
  "bookings.json",
  "orders.json",
  "clients.json",
  "waitlist.json",
];

// Image extensions a demo bundle's uploads/ folder may carry.
const UPLOAD_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif", ".svg"]);

// Locate the bundled demo to import. We match the install's industry where
// possible, otherwise fall back to the first demo available.
async function pickDemoDir(): Promise<string | null> {
  let entries: import("fs").Dirent[] = [];
  try {
    entries = await fs.readdir(DEMOS_DIR(), { withFileTypes: true });
  } catch {
    return null;
  }
  // Only real demo folders — skip the demos/README.md and any dotfiles.
  const ids = entries
    .filter((e) => e.isDirectory() && !e.name.startsWith("."))
    .map((e) => e.name);
  if (ids.length === 0) return null;
  let industryId = "";
  try {
    industryId = (await loadSettings()).industryId || "";
  } catch {}
  const chosen = industryId && ids.includes(industryId) ? industryId : ids[0];
  return path.join(DEMOS_DIR(), chosen);
}

/**
 * Copy the demo bundle's uploads/ images into the live site's public/uploads/.
 * The demo's content.json references these by `/uploads/<name>`, so without
 * them an imported site would show broken images. Returns how many copied.
 */
async function copyDemoUploads(demoDir: string): Promise<number> {
  const src = path.join(demoDir, "uploads");
  let names: string[] = [];
  try {
    names = await fs.readdir(src);
  } catch {
    return 0; // this demo bundle ships no images
  }
  await fs.mkdir(UPLOADS_DIR(), { recursive: true });
  let copied = 0;
  for (const name of names) {
    if (name.includes("/") || name.includes("\\") || name.includes("..")) continue;
    if (!UPLOAD_EXTS.has(path.extname(name).toLowerCase())) continue;
    try {
      const stat = await fs.stat(path.join(src, name));
      if (!stat.isFile()) continue;
      await fs.copyFile(path.join(src, name), path.join(UPLOADS_DIR(), name));
      copied++;
    } catch {
      // skip a file we cannot copy rather than abort the whole import
    }
  }
  return copied;
}

export async function POST() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Locked on the /barber showcase — see backup route.
  if (isDemoMode()) {
    return NextResponse.json({ error: "Import is disabled in the live demo." }, { status: 403 });
  }
  const demoDir = await pickDemoDir();
  if (!demoDir) {
    return NextResponse.json({ error: "No demo content is available to import." }, { status: 404 });
  }
  const src = path.join(demoDir, "data");
  await fs.mkdir(DATA_DIR(), { recursive: true });

  let imported = 0;
  for (const f of IMPORT_FILES) {
    try {
      const raw = await fs.readFile(path.join(src, f), "utf-8");
      JSON.parse(raw); // guard: skip a corrupt seed file rather than write it
      await fs.writeFile(path.join(DATA_DIR(), f), raw, "utf-8");
      imported++;
    } catch {
      // file missing from this demo bundle — skip it
    }
  }
  if (imported === 0) {
    return NextResponse.json({ error: "No demo files could be imported." }, { status: 500 });
  }
  // Bring the demo's images across too, so the imported site matches the
  // showcase exactly instead of showing broken image placeholders.
  const images = await copyDemoUploads(demoDir);
  return NextResponse.json({ ok: true, imported, images });
}
