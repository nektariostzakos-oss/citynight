import { getAppRoot } from "@/lib/appRoot";
import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";
import { isStaff } from "../../../lib/auth";
import { loadSettings } from "../../../lib/settings";
import { allowAction, clientIp } from "../../../lib/rateLimit";

// Native sharp needs the Node runtime.
export const runtime = "nodejs";

const UPLOAD_DIR = () => path.join(getAppRoot(), "public", "uploads");
const MAX_BYTES = 12 * 1024 * 1024; // generous input cap; output is tiny

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
]);

/**
 * Per-placement target widths. Every upload is resized to exactly what its
 * slot needs and stored as WebP, so a page only ever downloads the pixels it
 * shows. 1920 is the hard ceiling — nothing on the site is wider.
 */
const PRESET_WIDTH: Record<string, number> = {
  hero: 1920,          // full-bleed hero / section / CTA backgrounds
  og: 1200,            // social share image
  default: 1600,       // anything unspecified
  product: 1000,       // shop, about, contact and hero side images
  transformation: 900, // before / after
  gallery: 800,        // gallery grid (no full-screen popup)
  staff: 500,          // team portraits
  logo: 400,           // logo / favicon
};

export async function POST(req: NextRequest) {
  // During first-run setup there is no admin session yet; uploads are allowed
  // while the site is not onboarded, then a staff session is required.
  const setupPhase = !(await loadSettings()).onboarded;
  if (!setupPhase && !(await isStaff())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = clientIp(req);
  if (!allowAction(`upload:${ip}`, 60, 10 * 60_000)) {
    return NextResponse.json(
      { error: "Too many uploads. Try again shortly." },
      { status: 429 },
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "Empty file." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File too big (max ${MAX_BYTES / 1024 / 1024} MB).` },
      { status: 413 },
    );
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json(
      { error: "Only jpg, png, webp, avif, gif images are allowed." },
      { status: 415 },
    );
  }

  const preset = String(form.get("preset") || "default");
  const targetWidth = Math.min(
    1920,
    PRESET_WIDTH[preset] ?? PRESET_WIDTH.default,
  );

  // Server-side processing is authoritative: auto-orient from EXIF, downscale
  // to the slot's exact width (never upscale), strip metadata, encode WebP.
  // Done once here so every page view is just a static file read.
  let processed: Buffer;
  try {
    const input = Buffer.from(await file.arrayBuffer());
    processed = await sharp(input, { animated: true })
      .rotate()
      .resize({ width: targetWidth, withoutEnlargement: true })
      .webp({ quality: 80, effort: 4 })
      .toBuffer();
  } catch {
    return NextResponse.json(
      { error: "Could not process that image." },
      { status: 422 },
    );
  }

  // Hash the PROCESSED bytes: the filename is then a true content fingerprint,
  // so the file can be cached immutably and an edit is always a fresh URL.
  const hash = crypto
    .createHash("sha1")
    .update(processed)
    .digest("hex")
    .slice(0, 12);
  const filename = `${Date.now().toString(36)}_${hash}.webp`;

  await fs.mkdir(UPLOAD_DIR(), { recursive: true });
  await fs.writeFile(path.join(UPLOAD_DIR(), filename), processed);

  return NextResponse.json({ url: `/uploads/${filename}`, width: targetWidth });
}
