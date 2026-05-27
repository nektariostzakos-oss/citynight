// GET /api/atelier/download?venue=<id>
//
// Streams a fully-customised Atelier ZIP for the venue's owner. The owner
// extracts it on their own Hostinger Node app, runs `npm ci && npm run build`,
// hits /setup once (pre-filled from data/settings.json), and the site is live.
//
// Featured-only — this is the upsell over the citynight subdirectory mini-site.
//
// What ships in the ZIP:
//   - Everything in templates/atelier-base/ except node_modules, .next* and
//     non-restaurant demo bundles.
//   - data/settings.json — restaurant template defaults merged with the
//     venue's actual name / address / phone / hours / timezone / email.
//   - data/users.json — empty (wizard creates the admin on first /admin/login).
//   - README-FIRST.txt at the ZIP root with the 5-step install runbook.

import { NextRequest } from 'next/server';
import path from 'node:path';
import fs from 'node:fs/promises';
import { Readable, Writable } from 'node:stream';
import archiver from 'archiver';
import { requireUser } from '@/lib/auth/session';
import { rateLimit429, ipKey } from '@/lib/rate-limit';
import { db } from '@/db';

// Single template variant for v1 — Lemoni restaurant. New verticals get
// added here as we ship them.
type TemplateId = 'restaurant';

export async function GET(req: NextRequest) {
  // Rate-limit — generating + streaming a ~MB-scale ZIP for every refresh is
  // a real cost. 5 / hour / IP keeps the endpoint usable while preventing
  // someone wedging the origin by holding the keyboard down.
  const limited = rateLimit429(`atelier-download:${ipKey(req)}`, { max: 5, windowMs: 60 * 60_000 });
  if (limited) return limited;

  const user = await requireUser();
  const url = new URL(req.url);
  const siteId = url.searchParams.get('site');
  const venueId = url.searchParams.get('venue');

  // Phase H4 — SaaS sites that have paid the €190 one-time ZIP unlock get
  // priority. Old `?venue=` path stays for any Featured directory venue
  // still on the legacy entitlement until H5 deletes it.
  let venue: FeaturedVenueRow | null = null;
  if (siteId) {
    venue = loadOwnedZipPurchasedSite(siteId, user.id);
    if (!venue) return new Response('ZIP not purchased', { status: 402 });
  } else if (venueId) {
    venue = loadOwnedFeaturedVenue(venueId, user.id);
    if (!venue) return new Response('Not found', { status: 404 });
  } else {
    return new Response('site or venue required', { status: 400 });
  }

  const templateId: TemplateId = 'restaurant'; // future: derive from category

  // The vendored Atelier sub-app inside citynight. Customer's deploy lives
  // outside; we're just zipping the source they need.
  const atelierRoot = path.resolve(process.cwd(), 'templates/atelier-base');

  // Stream the ZIP via web streams so Next 15 route handlers can return it
  // directly without buffering the whole thing in memory.
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', (err) => {
    console.error('[atelier-download] archive error', err);
    try { writable.abort(err); } catch { /* already closed */ }
  });
  archive.pipe(Writable.fromWeb(writable));

  // Kick off the zipping in the background; the response streams the bytes
  // as archiver produces them.
  void buildArchive(archive, atelierRoot, templateId, venue).catch((err) => {
    console.error('[atelier-download] build error', err);
  });

  const fileName = `${slugify(venue.name)}-atelier.zip`;
  return new Response(readable, {
    status: 200,
    headers: {
      'content-type': 'application/zip',
      'content-disposition': `attachment; filename="${fileName}"`,
      'cache-control': 'no-store',
    },
  });
}

type FeaturedVenueRow = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  reservation_email: string | null;
  opening_hours: string | null;
  city_name: string;
  country: string;
};

function loadOwnedFeaturedVenue(venueId: string, ownerId: string): FeaturedVenueRow | null {
  const row = db.$client.prepare(`
    SELECT v.id, v.name, v.address, v.phone, v.website, v.reservation_email,
           v.opening_hours, c.name AS city_name,
           'GR' AS country
      FROM venues v
      JOIN cities c ON c.id = v.city_id
     WHERE v.id = ? AND v.owner_id = ? AND v.tier = 'featured'
       AND v.status = 'published'
  `).get(venueId, ownerId) as FeaturedVenueRow | undefined;
  return row ?? null;
}

/** Phase H4 — SaaS site whose €190 one-time ZIP is paid. The owner can
 *  download the customised Atelier ZIP. We reuse the same row shape as
 *  the featured-venue case so buildArchive doesn't branch. */
function loadOwnedZipPurchasedSite(siteId: string, ownerId: string): FeaturedVenueRow | null {
  const row = db.$client.prepare(`
    SELECT id, name, address, phone, NULL AS website,
           contact_email AS reservation_email,
           hours AS opening_hours,
           COALESCE(city, '') AS city_name,
           COALESCE(country, 'GR') AS country
      FROM sites
     WHERE id = ? AND owner_id = ?
       AND zip_purchased_at IS NOT NULL
       AND status = 'published'
  `).get(siteId, ownerId) as FeaturedVenueRow | undefined;
  return row ?? null;
}

async function buildArchive(
  archive: archiver.Archiver,
  atelierRoot: string,
  templateId: TemplateId,
  venue: FeaturedVenueRow,
): Promise<void> {
  // Walk the Atelier source. Exclude build artefacts + non-shipped demos.
  const excludeDirs = new Set([
    'node_modules', '.next', '.next-preview', '.next-tenant',
    '.git', 'uploads',
  ]);
  const excludeFiles = new Set([
    'tsconfig.tsbuildinfo',
    'CITYNIGHT_NOTES.md', // internal notes; not shipped to customers
  ]);
  // Only the matching restaurant demo ships; other verticals stay hidden.
  const allowedDemos = new Set<TemplateId | string>([templateId]);

  await walk(atelierRoot, async (abs, rel) => {
    const top = rel.split(/[\\/]/)[0];
    if (top && excludeDirs.has(top)) return;
    const base = path.basename(rel);
    if (excludeFiles.has(base)) return;

    // demos/<id> filter — only the shipped template.
    if (rel.startsWith('demos' + path.sep) || rel.startsWith('demos/')) {
      const demoId = rel.split(/[\\/]/)[1];
      if (demoId && demoId !== 'README.md' && !allowedDemos.has(demoId)) return;
    }
    // Same filter for the matching public/demos/<id> + public/brand/<id>-*.
    if (rel.startsWith('public' + path.sep + 'demos' + path.sep) ||
        rel.startsWith('public/demos/')) {
      const demoId = rel.split(/[\\/]/)[2];
      if (demoId && !allowedDemos.has(demoId)) return;
    }
    if (base.startsWith('barber-')   && base.endsWith('.svg')) return;
    if (base.startsWith('clinic-')   && base.endsWith('.svg')) return;
    if (base.startsWith('hair-')     && base.endsWith('.svg')) return;
    if (base.startsWith('nail-')     && base.endsWith('.svg')) return;
    if (base.startsWith('spa-')      && base.endsWith('.svg')) return;
    if (base.startsWith('yoga-')     && base.endsWith('.svg')) return;

    archive.file(abs, { name: rel.replace(/\\/g, '/') });
  });

  // Override: data/settings.json gets the venue's real business info merged
  // in. The setup wizard reads `onboarded: true` and skips straight to admin
  // creation, so the customer is live in two clicks instead of fifteen.
  const overrideSettings = await buildVenueSettings(atelierRoot, templateId, venue);
  archive.append(JSON.stringify(overrideSettings, null, 2) + '\n', {
    name: 'data/settings.json',
  });

  // Override: data/users.json stays empty so the first /admin/login forces
  // the customer to create an admin account.
  archive.append('[]\n', { name: 'data/users.json' });

  // Customer-facing readme at the ZIP root. Short, actionable, pre-filled.
  archive.append(buildReadme(templateId, venue), { name: 'README-FIRST.txt' });

  await archive.finalize();
}

/** Load the template's default settings.json and merge in the venue's facts. */
async function buildVenueSettings(
  atelierRoot: string, templateId: TemplateId, venue: FeaturedVenueRow,
): Promise<Record<string, unknown>> {
  const defaultsPath = path.join(atelierRoot, 'demos', templateId, 'data', 'settings.json');
  const defaults = JSON.parse(await fs.readFile(defaultsPath, 'utf8')) as Record<string, unknown>;
  const business = (defaults.business ?? {}) as Record<string, unknown>;

  business.name = venue.name;
  if (venue.address) business.streetAddress = venue.address;
  business.city = venue.city_name;
  business.country = 'GR';
  if (venue.phone) business.phone = venue.phone;
  if (venue.reservation_email) business.email = venue.reservation_email;
  business.timezone = 'Europe/Athens';

  if (venue.opening_hours) {
    const hours = parseHoursToAtelier(venue.opening_hours);
    if (hours) business.hours = hours;
  }

  (defaults.business as Record<string, unknown>) = business;
  // Wordmark + tagline pre-filled from venue name; customer can change in admin.
  const branding = (defaults.branding ?? {}) as Record<string, unknown>;
  branding.wordmark = venue.name.toUpperCase().slice(0, 32);
  defaults.branding = branding;

  // Customer must still pick their own SMTP + Stripe — leave those empty
  // from the template defaults.
  return defaults;
}

/** Try to translate Google Places opening_hours JSON into Atelier's
 *  `[{day, open, close, closed, ...}]` shape. Bails to null if the shape
 *  isn't recognized — we'd rather ship template defaults than malformed hours. */
function parseHoursToAtelier(raw: string): unknown[] | null {
  try {
    const parsed = JSON.parse(raw) as { periods?: Array<{
      open?: { day?: number; hour?: number; minute?: number };
      close?: { day?: number; hour?: number; minute?: number };
    }>; };
    const periods = parsed?.periods;
    if (!Array.isArray(periods) || !periods.length) return null;

    const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    // Default: every day closed; overwrite where periods exist.
    const out: Record<string, { day: string; open: string; close: string; closed: boolean; open2?: string; close2?: string }> = {};
    for (const d of dayKeys) out[d] = { day: d, open: '00:00', close: '00:00', closed: true };

    const fmt = (h: number | undefined, m: number | undefined) => `${String(h ?? 0).padStart(2, '0')}:${String(m ?? 0).padStart(2, '0')}`;

    for (const p of periods) {
      const d = p.open?.day;
      if (typeof d !== 'number' || d < 0 || d > 6) continue;
      const key = dayKeys[d];
      if (!key) continue;
      const row = out[key];
      if (!row) continue;
      const open = fmt(p.open?.hour, p.open?.minute);
      const close = fmt(p.close?.hour, p.close?.minute);
      if (row.closed) {
        row.open = open; row.close = close; row.closed = false;
      } else {
        // Second slot for split-shift days (e.g. Friday lunch + dinner).
        row.open2 = open; row.close2 = close;
      }
    }
    return dayKeys.map((k) => out[k]);
  } catch {
    return null;
  }
}

function buildReadme(templateId: TemplateId, venue: FeaturedVenueRow): string {
  return `Welcome — ${venue.name}'s standalone website is in this ZIP.

Template: ${templateId}
Pre-filled: business name, address, phone, email, opening hours, timezone.
You still need to: pick an admin password, set up SMTP, swap in your own
photos, edit copy if you want.

Five steps to live:

  1.  Upload the contents of this ZIP into a Hostinger Node app directory.
      The full walkthrough is in DEPLOY.md (also in this ZIP).
  2.  In the Hostinger Node.js panel: Run NPM Install, then run "npm run build"
      from the Terminal.
  3.  Restart the application from the Hostinger panel.
  4.  Open the URL in a browser — you'll land on /setup. Because we pre-filled
      your business info, the wizard skips most steps. Pick an admin password
      and you're in.
  5.  Sign in to /admin/login. From the admin you can change anything — copy,
      photos, services, menu, blog, SMTP, Stripe.

This is a separate website from your citynight.gr page. The two stay in sync
in one direction: you can point a custom domain at the citynight page
(Dashboard → Custom domain), or you can host this Atelier ZIP at your own
domain and link it from the citynight page's "Website" field.

Need help? hello@citynight.gr
`;
}

async function walk(
  root: string,
  cb: (abs: string, rel: string) => Promise<void> | void,
): Promise<void> {
  async function recurse(dir: string): Promise<void> {
    let entries;
    try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const abs = path.join(dir, e.name);
      const rel = path.relative(root, abs);
      if (e.isDirectory()) {
        // Skip excluded top-level dirs before recursing.
        const top = rel.split(/[\\/]/)[0];
        if (top === 'node_modules' || top === '.next' || top === '.next-preview' ||
            top === '.next-tenant' || top === '.git' || top === 'uploads') {
          continue;
        }
        await recurse(abs);
      } else if (e.isFile()) {
        await cb(abs, rel);
      }
    }
  }
  await recurse(root);
}

function slugify(s: string): string {
  return s.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'atelier';
}

// Silence "unused" import — Readable is referenced via type-only paths in
// the JSDoc/comments; keep it imported so future stream piping is one
// keystroke away.
void Readable;
