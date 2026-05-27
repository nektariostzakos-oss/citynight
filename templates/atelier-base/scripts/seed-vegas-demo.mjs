// Seed the running Boulevard Barber Co. demo with realistic operational data:
// clients, bookings (past + future), orders, reviews, waitlist, views, audit.
//
// Usage: node scripts/seed-vegas-demo.mjs
//
// Idempotent: overwrites the seven operational JSON files in demo/data/.
// Reads services.json + staff.json + products.json so cross-references stay
// in sync with whatever's currently configured.

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA = path.resolve(__dirname, "..", "data");

const TODAY = new Date("2026-05-15T12:00:00Z");

function readJson(rel) {
  return fs.readFile(path.join(DATA, rel), "utf-8").then(JSON.parse);
}
function writeJson(rel, data) {
  return fs.writeFile(path.join(DATA, rel), JSON.stringify(data, null, 2));
}

function rand(n) { return Math.floor(Math.random() * n); }
function pick(arr) { return arr[rand(arr.length)]; }
function pickWeighted(items) {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [v, w] of items) { r -= w; if (r <= 0) return v; }
  return items[items.length - 1][0];
}
function id(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
function addDays(date, days) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}
function isoDate(date) { return date.toISOString().slice(0, 10); }
function pad(n) { return String(n).padStart(2, "0"); }

// ── Reference people ────────────────────────────────────────────────────────
const FIRST_NAMES = [
  "Marcus", "Anthony", "Daryl", "Carlos", "Stefan", "James", "Mike", "Devon", "Tyrell", "Bryan",
  "Jordan", "Ethan", "Noah", "Lucas", "Mason", "Aiden", "Caleb", "Owen", "Tomas", "Hassan",
  "Khalid", "Ricardo", "Andre", "Marco", "Damon", "Wesley", "Trent", "Cole", "Brett", "Zach",
];
const LAST_NAMES = [
  "Reyes", "Carter", "Morales", "Williams", "Jenkins", "Brooks", "Hayes", "Cooper", "Reed", "Bell",
  "Rivera", "Hughes", "Sanders", "Murphy", "Bennett", "Ortiz", "Foster", "Russell", "Stewart", "Bryant",
  "Hill", "Wright", "Green", "Ramirez", "Castillo", "Cole", "Fisher", "Wells", "Mason", "Boyd",
];
const EMAIL_DOMAINS = ["gmail.com", "yahoo.com", "outlook.com", "icloud.com", "hotmail.com", "proton.me"];
const CLIENT_TAGS = ["regular", "tourist", "wedding-party", "VIP", "patch-tested", "rebooked"];
const CLIENT_NOTES = [
  "Likes a #2 fade with scissor work on top.",
  "Mojave-dry skin — sensitive to alcohol-based aftershave.",
  "Tips well, always books with Marcus.",
  "Tourist — first-time visitor from Chicago.",
  "Wedding party referral from Bellagio concierge.",
  "Allergic to citrus oils in beard products.",
  "Prefers afternoon slots, dinner reservation at 7pm Fridays.",
  "Loyalty: 3 visits in last 60 days.",
  "",
  "Brings his son for kids cut every 4 weeks.",
];

const VEGAS_HOTELS = ["Bellagio dealer", "Caesars line cook", "Aria valet", "Wynn host", "MGM Grand staff", "Cosmopolitan bartender", "Henderson local", "Summerlin resident", "Las Vegas resident", "Visiting tourist", "Wedding party · Henderson"];

const REVIEW_SAMPLES = [
  { rating: 5, title: "Best fade in Vegas", body: "Marcus took his time and the finish lasts three weeks. Worth every dollar. Already booked the next one." },
  { rating: 5, title: "Hot towel shave is the move", body: "45 minutes of pure relaxation. Walked out feeling like a new person. Will be back every Vegas trip." },
  { rating: 5, title: "Sharp work, no hype", body: "No flash, no nonsense — just clean cuts and a good consultation. The kind of barbershop I grew up with." },
  { rating: 5, title: "Beard work is unreal", body: "Jamal sculpted my beard in a way I couldn't get anywhere else. The hot oil finish in this dry air is a game changer." },
  { rating: 5, title: "Online booking just works", body: "Booked in 30 seconds. Got a text confirmation, another 8 hours before. Showed up, sat down, walked out fresh." },
  { rating: 5, title: "Wedding party perfection", body: "Six groomsmen, two hours, two barbers came to our Wynn suite. Worth every penny — the photos look incredible." },
  { rating: 4, title: "Solid spot, busy on weekends", body: "Quality is great but Friday after 5pm is packed. Book ahead. Diego is excellent with textured hair." },
  { rating: 5, title: "Tre is patient with my kid", body: "My son hates haircuts. Tre kept him calm with LEGO and finished a clean cut in under 30 minutes. Annual hero." },
  { rating: 5, title: "Best $95 I spent in Vegas", body: "Boulevard Package — cut, beard, scalp massage, hot-towel shave. Skipped the show, did this instead. No regrets." },
  { rating: 5, title: "Skin fade that survived the desert", body: "Three weeks later still looks fresh. The aftercare advice from Marcus actually works." },
  { rating: 4, title: "Great cut, parking is tight", body: "Validated lot fills up fast. Get there 10 minutes early. Cut itself? Perfect." },
  { rating: 5, title: "Pomade is the best I've used", body: "Bought a jar after my cut — holds all day in 100°F heat, washes out clean. Already on my second jar." },
  { rating: 5, title: "Regular for 3 years now", body: "Boulevard has been my shop since they opened. Quality has only gotten better. Marcus and the team take real pride in the work." },
  { rating: 5, title: "Diego handled my curls", body: "Most barbers thin out my hair instead of shaping it. Diego actually knows textured cuts. Found my Vegas spot." },
];

const REVIEW_BODIES_BOOKING_CONFIRM_PENDING = [
  { rating: 5, title: "First time and it was excellent", body: "Walked in for a Signature Cut. Quick consultation, clean execution, hot-towel finish. Already rebooked." },
  { rating: 5, title: "Boulevard Package was unreal", body: "Skipped the show on my last night in Vegas to do the full package. Easily worth it. Looks better than any Vegas show photo on my camera roll." },
];

const VIEW_PATHS = [
  ["/", 0.30],
  ["/services", 0.18],
  ["/book", 0.14],
  ["/shop", 0.10],
  ["/about", 0.06],
  ["/contact", 0.06],
  ["/gallery", 0.05],
  ["/blog", 0.05],
  ["/blog/skin-fade-vegas-heat", 0.02],
  ["/blog/beard-care-desert-climate", 0.01],
  ["/blog/hot-towel-shave-worth-it", 0.01],
  ["/shop/signature-pomade", 0.01],
  ["/shop/beard-oil-cedar-smoke", 0.01],
];
const VIEW_REFS = [
  "", "", "", "", "",  // direct
  "https://www.google.com/", "https://www.google.com/", "https://www.google.com/",
  "https://maps.google.com/", "https://maps.google.com/",
  "https://www.instagram.com/", "https://www.tiktok.com/",
  "https://www.facebook.com/", "https://www.yelp.com/",
];
const VIEW_UAS = [
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
];

const AUDIT_ACTIONS = [
  { action: "service.update", target: "Skin Fade", meta: { price: 55, prevPrice: 50 } },
  { action: "service.update", target: "Boulevard Package", meta: { duration: 90 } },
  { action: "staff.update", target: "diego", meta: { startTime: "11:00" } },
  { action: "settings.update", target: "branding", meta: { wordmark: "BOULEVARD" } },
  { action: "settings.update", target: "hours", meta: { day: "thu", close: "20:00" } },
  { action: "booking.complete", target: "walk-in", meta: { service: "Signature Cut" } },
  { action: "booking.cancel", target: "client-request", meta: { hours: 6, refund: "full" } },
  { action: "product.update", target: "signature-pomade", meta: { stock: 38 } },
  { action: "review.approve", target: "Anthony R.", meta: { rating: 5 } },
  { action: "review.approve", target: "Stefan K.", meta: { rating: 5 } },
  { action: "coupon.create", target: "VEGAS25", meta: { discount: 25, type: "percent" } },
  { action: "client.update", target: "wedding-party referral", meta: { tags: ["wedding-party"] } },
  { action: "settings.update", target: "smtp", meta: { provider: "brevo" } },
  { action: "settings.update", target: "payments", meta: { currency: "USD" } },
  { action: "booking.create", target: "online", meta: { service: "Boulevard Package", barber: "marcus" } },
];

// ── Read template references ─────────────────────────────────────────────────
const services = await readJson("services.json");
const staff = (await readJson("staff.json")).filter((s) => s.enabled);
const products = await readJson("products.json");

// ── Clients (25 unique) ──────────────────────────────────────────────────────
const usedKeys = new Set();
const clients = [];
const NUM_CLIENTS = 25;
while (clients.length < NUM_CLIENTS) {
  const fn = pick(FIRST_NAMES);
  const ln = pick(LAST_NAMES);
  const name = `${fn} ${ln}`;
  const handle = `${fn}.${ln}`.toLowerCase().replace(/[^a-z.]/g, "");
  const email = `${handle}${rand(99) + 1}@${pick(EMAIL_DOMAINS)}`;
  if (usedKeys.has(email)) continue;
  usedKeys.add(email);
  const phone = `+1 702 ${pad(rand(900) + 100)} ${pad(rand(9000) + 1000)}`;
  const created = addDays(TODAY, -rand(540));
  const birthYear = 1970 + rand(40);
  const tags = Math.random() < 0.65
    ? [pick(CLIENT_TAGS), pick(CLIENT_TAGS)].filter((v, i, a) => a.indexOf(v) === i)
    : [];
  clients.push({
    id: id("c"),
    name,
    email,
    phone,
    notes: pick(CLIENT_NOTES),
    tags,
    createdAt: created.toISOString(),
    birthday: `${birthYear}-${pad(rand(12) + 1)}-${pad(rand(28) + 1)}`,
    preferredStaffId: Math.random() < 0.6 ? pick(staff).id : undefined,
    loyaltyPoints: rand(10),
  });
}

// ── Bookings (past 60d completed/cancelled + next 14d confirmed/pending) ─────
const bookings = [];
const TIME_SLOTS = ["10:00", "10:30", "11:00", "11:30", "12:00", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00"];

function randomBooking(dayOffset, status) {
  const date = addDays(TODAY, dayOffset);
  const dow = date.getUTCDay();
  const candidates = staff.filter((s) => s.workDays.includes(dow));
  if (candidates.length === 0) return null;
  const barber = pickWeighted([
    [candidates.find((s) => s.id === "marcus") || candidates[0], 4],
    [candidates.find((s) => s.id === "jamal") || candidates[0], 3],
    [candidates.find((s) => s.id === "diego") || candidates[0], 2.5],
    [candidates.find((s) => s.id === "tre") || candidates[0], 2],
  ]);
  const service = pickWeighted([
    [services.find((s) => s.id === "signature-cut"), 3.5],
    [services.find((s) => s.id === "skin-fade"), 3],
    [services.find((s) => s.id === "cut-beard-combo"), 2.5],
    [services.find((s) => s.id === "boulevard-package"), 1.5],
    [services.find((s) => s.id === "beard-sculpt"), 1.5],
    [services.find((s) => s.id === "hot-towel-shave"), 1],
    [services.find((s) => s.id === "kids-cut"), 1],
    [services.find((s) => s.id === "senior-cut"), 0.5],
  ]);
  const client = pick(clients);
  const time = pick(TIME_SLOTS);
  const created = new Date(date);
  created.setUTCDate(created.getUTCDate() - rand(7) - 1);
  return {
    id: id("b"),
    serviceId: service.id,
    serviceName: service.name,
    price: service.price,
    duration: service.duration,
    barberId: barber.id,
    barberName: barber.name,
    date: isoDate(date),
    time,
    name: client.name,
    phone: client.phone,
    email: client.email,
    notes: Math.random() < 0.15 ? "First time client — please consult on style." : undefined,
    status,
    createdAt: created.toISOString(),
    lang: "en",
    walkIn: Math.random() < 0.10,
  };
}

// Past 60 days — mostly completed, some cancelled
for (let d = -60; d < 0; d++) {
  const n = pickWeighted([[3, 1], [4, 2], [5, 3], [6, 2]]);
  for (let i = 0; i < n; i++) {
    const status = pickWeighted([["completed", 9], ["cancelled", 1]]);
    const b = randomBooking(d, status);
    if (b) bookings.push(b);
  }
}
// Today + next 14 days — mostly confirmed
for (let d = 0; d <= 14; d++) {
  const n = pickWeighted([[2, 1], [3, 2], [4, 2], [5, 1]]);
  for (let i = 0; i < n; i++) {
    const status = pickWeighted([["confirmed", 7], ["pending", 2], ["cancelled", 1]]);
    const b = randomBooking(d, status);
    if (b) bookings.push(b);
  }
}

// Dedupe by (barberId, date, time) — keep latest
const slotMap = new Map();
for (const b of bookings) {
  slotMap.set(`${b.barberId}|${b.date}|${b.time}`, b);
}
const finalBookings = Array.from(slotMap.values());

// ── Orders (past 90d, varied statuses) ───────────────────────────────────────
const orders = [];
for (let i = 0; i < 28; i++) {
  const daysAgo = rand(90);
  const created = addDays(TODAY, -daysAgo);
  const lineCount = pickWeighted([[1, 3], [2, 4], [3, 2], [4, 1]]);
  const lines = [];
  const used = new Set();
  for (let j = 0; j < lineCount; j++) {
    let p;
    let tries = 0;
    do { p = pick(products); tries++; } while (used.has(p.id) && tries < 6);
    used.add(p.id);
    const qty = pickWeighted([[1, 6], [2, 2], [3, 1]]);
    lines.push({ id: p.id, name: p.name_en, price: p.price, qty });
  }
  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const client = pick(clients);
  const status = daysAgo > 10
    ? "completed"
    : daysAgo > 5
    ? pickWeighted([["completed", 4], ["shipped", 1]])
    : pickWeighted([["paid", 2], ["shipped", 2], ["new", 1]]);
  orders.push({
    id: id("o"),
    items: lines,
    subtotal,
    name: client.name,
    phone: client.phone,
    email: client.email,
    address: `${rand(9000) + 1000} ${pick(["Sahara Ave", "Tropicana Ave", "Flamingo Rd", "Charleston Blvd", "Spring Mountain Rd"])}`,
    city: "Las Vegas",
    postal: `891${pad(rand(99))}`,
    notes: Math.random() < 0.1 ? "Please include gift receipt." : undefined,
    lang: "en",
    status,
    createdAt: created.toISOString(),
  });
}
orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

// ── Reviews ──────────────────────────────────────────────────────────────────
const reviews = [];
const completedRecent = finalBookings
  .filter((b) => b.status === "completed")
  .sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`))
  .slice(0, 14);
const reviewerNames = clients.slice(0, 14).map((c) => `${c.name.split(" ")[0]} ${c.name.split(" ")[1][0]}.`);

for (let i = 0; i < REVIEW_SAMPLES.length; i++) {
  const sample = REVIEW_SAMPLES[i];
  const linkedBooking = completedRecent[i] || null;
  const created = linkedBooking
    ? new Date(new Date(`${linkedBooking.date}T${linkedBooking.time}:00Z`).getTime() + 24 * 60 * 60 * 1000)
    : addDays(TODAY, -rand(45) - 1);
  reviews.push({
    id: id("r"),
    name: reviewerNames[i] || `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)[0]}.`,
    rating: sample.rating,
    title: sample.title,
    body: sample.body,
    source: linkedBooking ? "booking" : "import",
    bookingId: linkedBooking?.id,
    status: "approved",
    createdAt: created.toISOString(),
  });
}
for (const pending of REVIEW_BODIES_BOOKING_CONFIRM_PENDING) {
  reviews.push({
    id: id("r"),
    name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)[0]}.`,
    rating: pending.rating,
    title: pending.title,
    body: pending.body,
    source: "booking",
    status: "pending",
    createdAt: addDays(TODAY, -rand(3) - 1).toISOString(),
  });
}
reviews.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

// ── Waitlist ─────────────────────────────────────────────────────────────────
const waitlist = [];
const WAITLIST_NOTES = [
  "Looking for any opening Saturday afternoon.",
  "Need a slot before my wedding rehearsal Fri evening.",
  "Visiting Vegas next week, flexible on time.",
  "Tire of waiting list — please text whenever Marcus opens up.",
  "Birthday weekend — would love a slot Sat or Sun.",
];
for (let i = 0; i < 6; i++) {
  const c = pick(clients);
  const s = pick(services);
  const b = pick(staff);
  const preferred = addDays(TODAY, rand(14) + 1);
  waitlist.push({
    id: id("w"),
    name: c.name,
    phone: c.phone,
    email: c.email,
    serviceId: s.id,
    serviceName: s.name,
    barberId: b.id,
    preferredDate: isoDate(preferred),
    preferredTime: pick(["afternoon", "evening", "morning", "16:00", "17:00", "18:00"]),
    notes: pick(WAITLIST_NOTES),
    status: pickWeighted([["waiting", 4], ["notified", 1], ["converted", 1]]),
    createdAt: addDays(TODAY, -rand(7) - 1).toISOString(),
  });
}
waitlist.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

// ── Views (analytics) ────────────────────────────────────────────────────────
const views = [];
const NUM_VIEWS = 820;
for (let i = 0; i < NUM_VIEWS; i++) {
  const daysAgo = pickWeighted([[0, 3], [1, 3], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 1.5], [10, 1.2], [14, 1], [21, 0.8], [30, 0.5]]);
  const minsBack = rand(24 * 60);
  const t = new Date(TODAY.getTime() - daysAgo * 24 * 60 * 60 * 1000 - minsBack * 60 * 1000);
  views.push({
    id: id("v"),
    path: pickWeighted(VIEW_PATHS),
    ref: pick(VIEW_REFS),
    lang: Math.random() < 0.95 ? "en" : "el",
    ua: pick(VIEW_UAS),
    sid: `s_${Math.random().toString(36).slice(2, 10)}`,
    createdAt: t.toISOString(),
  });
}
views.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

// ── Audit log ────────────────────────────────────────────────────────────────
const audit = [];
const operatorEmail = "admin@boulevardbarber.co";
const operatorId = "u_op_marcus";
for (const a of AUDIT_ACTIONS) {
  audit.push({
    id: id("a"),
    userId: operatorId,
    userEmail: operatorEmail,
    action: a.action,
    target: a.target,
    meta: a.meta,
    createdAt: addDays(TODAY, -rand(30) - 1).toISOString(),
  });
}
audit.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

// ── Emails log (a handful of confirmations / reminders so the log isn't empty)
const emails = [];
for (const b of finalBookings.filter((x) => x.status === "completed").slice(0, 12)) {
  emails.push({
    id: id("e"),
    to: b.email,
    subject: `Boulevard Barber Co. — your booking is confirmed`,
    template: "booking_confirmation",
    sentAt: new Date(new Date(`${b.date}T${b.time}:00Z`).getTime() - 60 * 60 * 1000).toISOString(),
    status: "sent",
  });
  emails.push({
    id: id("e"),
    to: b.email,
    subject: `Reminder — your Boulevard appointment in 8 hours`,
    template: "booking_reminder",
    sentAt: new Date(new Date(`${b.date}T${b.time}:00Z`).getTime() - 8 * 60 * 60 * 1000).toISOString(),
    status: "sent",
  });
}
emails.sort((a, b) => b.sentAt.localeCompare(a.sentAt));

// ── Write everything ─────────────────────────────────────────────────────────
await writeJson("clients.json", clients);
await writeJson("bookings.json", finalBookings);
await writeJson("orders.json", orders);
await writeJson("reviews.json", reviews);
await writeJson("waitlist.json", waitlist);
await writeJson("views.json", views);
await writeJson("audit.json", audit);
await writeJson("emails.log.json", emails);

console.log("seeded:");
console.log(`  clients     : ${clients.length}`);
console.log(`  bookings    : ${finalBookings.length}`);
console.log(`  orders      : ${orders.length}`);
console.log(`  reviews     : ${reviews.length}`);
console.log(`  waitlist    : ${waitlist.length}`);
console.log(`  views       : ${views.length}`);
console.log(`  audit       : ${audit.length}`);
console.log(`  emails log  : ${emails.length}`);
