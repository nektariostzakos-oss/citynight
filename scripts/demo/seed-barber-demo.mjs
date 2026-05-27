#!/usr/bin/env node
// Demo seeder for a booking-capable site (barber). Verifies the booking
// flow end-to-end on a real local DB.
//
//   node scripts/demo/seed-barber-demo.mjs
//
// Reachable at:  /el/cities/athens/oakline-barber-demo/book
//                /en/cities/athens/oakline-barber-demo/book
//
// Idempotent — re-running deletes and recreates the demo site (cascades
// to its services, staff, bookings via FK ON DELETE CASCADE).

import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });
import Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';

const dbPath = process.env.DATABASE_PATH;
if (!dbPath) { console.error('DATABASE_PATH not set.'); process.exit(1); }
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

const SLUG = 'oakline-barber-demo';
const SITE_ID = 'site_demo_oakline';
const OWNER_EMAIL = 'demo@oakline-barber.gr';

// ── owner user ────────────────────────────────────────────────────────
let owner = db.prepare(`SELECT id FROM users WHERE email = ?`).get(OWNER_EMAIL);
if (!owner) {
  const id = randomUUID();
  db.prepare(`INSERT INTO users (id, email, name, locale, role, email_verified) VALUES (?, ?, 'Oakline Demo', 'el', 'owner', 1)`)
    .run(id, OWNER_EMAIL);
  owner = { id };
}

// ── reset + create site ───────────────────────────────────────────────
db.prepare(`DELETE FROM sites WHERE id = ?`).run(SITE_ID);

db.prepare(`
  INSERT INTO sites (
    id, slug, owner_id, name, vertical, template_id,
    city, country, address, phone, contact_email,
    about_text, wordmark, tagline,
    saas_status, status, published_at, created_at
  ) VALUES (
    ?, ?, ?, 'Oakline Barbershop', 'salon', 'barber',
    'Athens', 'GR', 'Skoufa 12, Kolonaki, Athens', '+30 210 360 1234', 'hello@oakline-barber.gr',
    ?, 'OAKLINE', 'Master cuts · Kolonaki',
    'active', 'published', unixepoch(), unixepoch()
  )
`).run(
  SITE_ID, SLUG, owner.id,
  `Oakline opened in 2018 on a quiet street in Kolonaki. Three chairs, no rush, classic technique. Our barbers have cut hair from London to Beirut; our towels are hot, our scissors are sharp, and our coffee is good.`,
);

// link to athens via city_slug so the URL /cities/athens/{slug} resolves
db.prepare(`UPDATE sites SET city_slug = 'athens' WHERE id = ?`).run(SITE_ID);

// ── services ──────────────────────────────────────────────────────────
const services = [
  { slug: 'signature-cut', name: 'Signature Cut', desc: 'Consultation, scissor or clipper cut, hot-towel finish.', duration: 45, buffer: 5, priceCents: 4500, category: 'Hair', order: 1 },
  { slug: 'skin-fade',     name: 'Skin Fade',     desc: 'Bald-fade transitions with razor-clean edges.', duration: 50, buffer: 5, priceCents: 5500, category: 'Hair', order: 2 },
  { slug: 'beard-sculpt',  name: 'Beard Sculpt',  desc: 'Trim, line-up, hot towel, beard oil finish.',   duration: 30, buffer: 5, priceCents: 3000, category: 'Beard', order: 3 },
  { slug: 'father-son',    name: 'Father & Son',  desc: 'Two cuts side-by-side. Bring a book or two.',    duration: 75, buffer: 5, priceCents: 7500, category: 'Hair', order: 4 },
  { slug: 'straight-razor', name: 'Straight Razor Shave', desc: 'Hot lather, single blade, twice over the grain.', duration: 40, buffer: 5, priceCents: 4000, category: 'Beard', order: 5 },
];
const insertService = db.prepare(`
  INSERT INTO site_services (id, site_id, slug, name, description, duration_minutes, buffer_minutes, price_cents, category, enabled, sort_order)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
`);
const serviceIds = {};
for (const s of services) {
  const id = randomUUID();
  insertService.run(id, SITE_ID, s.slug, s.name, s.desc, s.duration, s.buffer, s.priceCents, s.category, s.order);
  serviceIds[s.slug] = id;
}

// ── staff ─────────────────────────────────────────────────────────────
const staff = [
  { slug: 'elliott', name: 'Elliott Vance', role: 'Master Barber & Owner', specialties: ['Skin fades', 'Classic cuts', 'Pompadours'], start: '10:00', end: '19:00', breakStart: '13:00', breakEnd: '13:30' },
  { slug: 'reuben',  name: 'Reuben Okafor', role: 'Senior Barber',         specialties: ['Beards', 'Hot-towel shaves'],               start: '11:00', end: '20:00', breakStart: '14:30', breakEnd: '15:00' },
  { slug: 'diego',   name: 'Diego Marin',   role: 'Barber',                specialties: ['Texture', 'Curly hair'],                     start: '10:00', end: '18:00', breakStart: null,    breakEnd: null    },
];
const insertStaff = db.prepare(`
  INSERT INTO site_staff (id, site_id, slug, name, role, specialties, enabled, sort_order, work_days, start_time, end_time, break_start, break_end)
  VALUES (?, ?, ?, ?, ?, ?, 1, ?, '[1,2,3,4,5,6]', ?, ?, ?, ?)
`);
const staffIds = {};
staff.forEach((p, i) => {
  const id = randomUUID();
  insertStaff.run(id, SITE_ID, p.slug, p.name, p.role, JSON.stringify(p.specialties), i, p.start, p.end, p.breakStart, p.breakEnd);
  staffIds[p.slug] = id;
});

console.log(`Seeded site ${SITE_ID}`);
console.log(`Services: ${services.length}, Staff: ${staff.length}`);
console.log('');
console.log('Try the booking page at:');
console.log(`  http://localhost:3000/el/cities/athens/${SLUG}/book`);
console.log(`  http://localhost:3000/en/cities/athens/${SLUG}/book`);
