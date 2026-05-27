import { getAppRoot } from "@/lib/appRoot";
import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { isAdmin } from "../../../lib/auth";
import { isDemoMode } from "../../../lib/demoMode";

const DATA_DIR = () => path.join(getAppRoot(), "data");
const UPLOADS_DIR = () => path.join(getAppRoot(), "public", "uploads");
const ALLOWED = new Set([
  "bookings.json", "orders.json", "products.json", "users.json", "content.json",
  "settings.json", "clients.json", "coupons.json", "reviews.json", "pages.json",
  "waitlist.json", "views.json", "services.json", "staff.json", "holidays.json",
  "audit.json", "gift-cards.json", "blog-categories.json", "transformations.json",
  "install-stats.json", "emails.log.json", "barber-knowledge.json",
]);

// File extensions an uploaded asset may have. Restore writes attacker-supplied
// filenames into public/uploads, so anything outside this set is rejected.
const UPLOAD_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif", ".svg"]);

/** A filename is a safe flat upload name — no path segments, allowed extension. */
function isSafeUploadName(name: string): boolean {
  if (!name || name.includes("/") || name.includes("\\") || name.includes("..")) {
    return false;
  }
  if (name.startsWith(".")) return false; // skip .gitkeep and dotfiles
  return UPLOAD_EXTS.has(path.extname(name).toLowerCase());
}

/** Read every uploaded image as base64 so the backup is a complete site copy. */
async function collectUploads(): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  let names: string[] = [];
  try {
    names = await fs.readdir(UPLOADS_DIR());
  } catch {
    return out;
  }
  for (const name of names) {
    if (!isSafeUploadName(name)) continue;
    try {
      const full = path.join(UPLOADS_DIR(), name);
      const stat = await fs.stat(full);
      if (!stat.isFile()) continue;
      out[name] = (await fs.readFile(full)).toString("base64");
    } catch {
      // skip a file we cannot read rather than abort the whole backup
    }
  }
  return out;
}

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const files = await fs.readdir(DATA_DIR()).catch(() => []);
  const out: Record<string, unknown> = {};
  for (const f of files) {
    if (!ALLOWED.has(f)) continue;
    try {
      out[f] = JSON.parse(await fs.readFile(path.join(DATA_DIR(), f), "utf-8"));
    } catch {}
  }
  // A full-site snapshot: data files plus every uploaded image, so a restore
  // brings the site back exactly, with nothing missing.
  const uploads = await collectUploads();
  const body = JSON.stringify(
    { backedUpAt: new Date().toISOString(), files: out, uploads },
    null,
    2,
  );
  return new NextResponse(body, {
    headers: {
      "content-type": "application/json",
      "content-disposition": `attachment; filename="backup-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}

/**
 * Expected top-level JSON shape per allowed filename.
 * "array"  — the file's root value must be an Array.
 * "object" — the file's root value must be a plain object (not Array, not null).
 */
const FILE_SHAPE: Record<string, "array" | "object"> = {
  "bookings.json":        "array",
  "orders.json":          "array",
  "products.json":        "array",
  "users.json":           "array",
  "content.json":         "object",
  "settings.json":        "object",
  "clients.json":         "array",
  "coupons.json":         "array",
  "reviews.json":         "array",
  "pages.json":           "array",
  "waitlist.json":        "array",
  "views.json":           "array",
  "services.json":        "array",
  "staff.json":           "array",
  "holidays.json":        "array",
  "audit.json":           "array",
  "gift-cards.json":      "array",
  "blog-categories.json": "array",
  "transformations.json": "array",
  "install-stats.json":   "object",
  "emails.log.json":      "array",
  "barber-knowledge.json":"array",
};

function validateShape(name: string, content: unknown): boolean {
  const expected = FILE_SHAPE[name];
  if (!expected) return false; // no schema registered — reject
  if (expected === "array") return Array.isArray(content);
  // "object": must be a non-null, non-array plain object
  return (
    content !== null &&
    typeof content === "object" &&
    !Array.isArray(content)
  );
}

/** Restore the uploaded images carried in a backup. Returns how many landed. */
async function restoreUploads(uploads: unknown): Promise<number> {
  if (!uploads || typeof uploads !== "object" || Array.isArray(uploads)) return 0;
  await fs.mkdir(UPLOADS_DIR(), { recursive: true });
  let written = 0;
  for (const [name, b64] of Object.entries(uploads as Record<string, unknown>)) {
    if (!isSafeUploadName(name) || typeof b64 !== "string") continue;
    try {
      await fs.writeFile(path.join(UPLOADS_DIR(), name), Buffer.from(b64, "base64"));
      written++;
    } catch {
      // skip an image we cannot write rather than abort the whole restore
    }
  }
  return written;
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // The /barber showcase is locked: visitors may browse the admin but must not
  // overwrite the demo's data. The hourly reset owns its state.
  if (isDemoMode()) {
    return NextResponse.json({ error: "Restore is disabled in the live demo." }, { status: 403 });
  }
  const body = await req.json();
  const files = body.files;
  if (!files || typeof files !== "object" || Array.isArray(files)) {
    return NextResponse.json({ error: "Invalid backup" }, { status: 400 });
  }
  let restored = 0;
  const rejected: string[] = [];
  for (const [name, content] of Object.entries(files)) {
    if (!ALLOWED.has(name)) continue;
    if (!validateShape(name, content)) {
      rejected.push(name);
      continue;
    }
    await fs.mkdir(DATA_DIR(), { recursive: true });
    await fs.writeFile(path.join(DATA_DIR(), name), JSON.stringify(content, null, 2), "utf-8");
    restored++;
  }
  if (rejected.length > 0) {
    return NextResponse.json(
      { error: "Shape validation failed for: " + rejected.join(", ") },
      { status: 422 }
    );
  }
  // Older backups carry no `uploads` key — restoreUploads simply returns 0,
  // so a pre-images backup still restores cleanly.
  const restoredUploads = await restoreUploads(body.uploads);
  return NextResponse.json({ ok: true, restored, restoredUploads });
}
