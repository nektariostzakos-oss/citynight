import { getAppRoot } from "@/lib/appRoot";
import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { isAdmin } from "../../../lib/auth";
import { isDemoMode } from "../../../lib/demoMode";

const DATA_DIR = () => path.join(getAppRoot(), "data");
const UPLOADS_DIR = () => path.join(getAppRoot(), "public", "uploads");

/**
 * Reset returns the whole site to a brand-new install — the exact state a
 * fresh download starts in. Every data file is rewritten to its clean-install
 * default (so settings.onboarded is false and there are no users), and every
 * uploaded image is deleted. The next visit lands on the /setup wizard.
 *
 * This MUST mirror data/_seed/clean-data.json (the manifest build-zip.py and
 * the SaaS tenant provisioner use). Keep the two in sync.
 */
const CLEAN_DATA: Record<string, unknown> = {
  "bookings.json": [],
  "orders.json": [],
  "products.json": [],
  "users.json": [],
  "content.json": {},
  "settings.json": { onboarded: false, enabledLanguages: ["en", "de"] },
  "emails.log.json": [],
  "clients.json": [],
  "views.json": [],
  "audit.json": [],
  "waitlist.json": [],
  "reviews.json": [],
  "coupons.json": [],
  "pages.json": [],
  "blog-categories.json": [],
  "services.json": [],
  "staff.json": [],
  "holidays.json": [],
  "barber-knowledge.json": [],
  "gift-cards.json": [],
  "transformations.json": [],
  "install-stats.json": { total: 0, recent: [] },
};

/** Delete every uploaded image, leaving the folder (and its .gitkeep) intact. */
async function wipeUploads(): Promise<number> {
  let names: string[] = [];
  try {
    names = await fs.readdir(UPLOADS_DIR());
  } catch {
    return 0;
  }
  let removed = 0;
  for (const name of names) {
    if (name.startsWith(".")) continue; // keep .gitkeep
    if (name.includes("/") || name.includes("\\") || name.includes("..")) continue;
    try {
      const full = path.join(UPLOADS_DIR(), name);
      if ((await fs.stat(full)).isFile()) {
        await fs.unlink(full);
        removed++;
      }
    } catch {
      // skip a file we cannot remove rather than abort the whole reset
    }
  }
  return removed;
}

export async function POST() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Locked on the /barber showcase — see backup route.
  if (isDemoMode()) {
    return NextResponse.json({ error: "Reset is disabled in the live demo." }, { status: 403 });
  }
  await fs.mkdir(DATA_DIR(), { recursive: true });

  let cleared = 0;
  for (const [name, value] of Object.entries(CLEAN_DATA)) {
    try {
      await fs.writeFile(
        path.join(DATA_DIR(), name),
        JSON.stringify(value, null, 2) + "\n",
        "utf-8",
      );
      cleared++;
    } catch {
      // skip a file we cannot write rather than abort the whole reset
    }
  }
  const removedImages = await wipeUploads();

  return NextResponse.json({ ok: true, cleared, removedImages });
}
