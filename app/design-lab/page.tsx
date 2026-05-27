// /design-lab — internal preview of the per-venue design system.
//
// Renders 12 fictional venues that span every palette × type-pair × hero
// layout × density × motion combination at least once. The point: I can
// look at the page and verify the system actually produces distinctive
// pages without any one combination falling flat.
//
// `noindex` keeps this off Google. It still ships in production builds —
// remove the route after Phase A is locked, or keep it as a permanent
// design reference (the choice is documented in DESIGN.md).

import type { Metadata } from 'next';
import { VenueHero, type HeroPhoto } from '@/components/venue-design/hero';
import {
  VenueOverview, VenueHours, VenueLocationFacts, VenueEvents, VenueFaq,
} from '@/components/venue-design/sections';
import { venueStyleVars } from '@/lib/venue-style';
import {
  PALETTES, TYPE_PAIRS, HERO_LAYOUTS, DENSITIES, MOTIONS,
  type DesignParams,
} from '@/lib/design-system';

export const metadata: Metadata = {
  title: 'Design Lab',
  robots: { index: false, follow: false },
};

// Deterministic fake photos pulled from Unsplash; remote-pattern is already
// whitelisted in next.config.mjs. Each photo set is themed loosely to its
// category so the system can be evaluated against realistic imagery.
const PHOTO_SETS: Record<string, HeroPhoto[]> = {
  night_club: [
    { id: 'nc-1', url: 'https://images.unsplash.com/photo-1571266028243-d220c6a8c0fc?w=1400&q=70', attribution: 'Unsplash' },
    { id: 'nc-2', url: 'https://images.unsplash.com/photo-1574391884720-bbc049ec09ad?w=1000&q=70', attribution: null },
    { id: 'nc-3', url: 'https://images.unsplash.com/photo-1545128485-c400e7702796?w=1000&q=70', attribution: null },
    { id: 'nc-4', url: 'https://images.unsplash.com/photo-1583244532610-2a234f86616c?w=1000&q=70', attribution: null },
  ],
  rooftop_bar: [
    { id: 'rt-1', url: 'https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=1400&q=70', attribution: 'Unsplash' },
    { id: 'rt-2', url: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=1000&q=70', attribution: null },
    { id: 'rt-3', url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1000&q=70', attribution: null },
    { id: 'rt-4', url: 'https://images.unsplash.com/photo-1543007630-9710e4a00a20?w=1000&q=70', attribution: null },
  ],
  beach_club: [
    { id: 'bc-1', url: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=1400&q=70', attribution: 'Unsplash' },
    { id: 'bc-2', url: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=1000&q=70', attribution: null },
    { id: 'bc-3', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1000&q=70', attribution: null },
    { id: 'bc-4', url: 'https://images.unsplash.com/photo-1517824806704-9040b037703b?w=1000&q=70', attribution: null },
  ],
  bouzoukia: [
    { id: 'bz-1', url: 'https://images.unsplash.com/photo-1493676304819-0d7a8d026dcf?w=1400&q=70', attribution: 'Unsplash' },
    { id: 'bz-2', url: 'https://images.unsplash.com/photo-1542628682-88321d2a4828?w=1000&q=70', attribution: null },
    { id: 'bz-3', url: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=1000&q=70', attribution: null },
    { id: 'bz-4', url: 'https://images.unsplash.com/photo-1574391884720-bbc049ec09ad?w=1000&q=70', attribution: null },
  ],
  bar: [
    { id: 'br-1', url: 'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=1400&q=70', attribution: 'Unsplash' },
    { id: 'br-2', url: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=1000&q=70', attribution: null },
    { id: 'br-3', url: 'https://images.unsplash.com/photo-1525268771113-32d9e9021a97?w=1000&q=70', attribution: null },
    { id: 'br-4', url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=1000&q=70', attribution: null },
  ],
  live_music: [
    { id: 'lm-1', url: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=1400&q=70', attribution: 'Unsplash' },
    { id: 'lm-2', url: 'https://images.unsplash.com/photo-1485579149621-3123dd979885?w=1000&q=70', attribution: null },
    { id: 'lm-3', url: 'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=1000&q=70', attribution: null },
    { id: 'lm-4', url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1000&q=70', attribution: null },
  ],
};

// 12 fictional venues — deliberately diverse across the combinator. Picked
// by hand to make sure each palette, each layout, and each type pair gets
// air time. (The AI writer in Phase C will produce these picks itself.)
type LabVenue = {
  id: string;
  name: string;
  category: keyof typeof PHOTO_SETS;
  categoryLabel: string;
  location: string;
  rating: number | null;
  tagline: string;
  description: string;
  events?: { id: number; title: string; startsAt: number; description?: string }[];
  hours?: boolean;
  design: DesignParams;
};

const NOW = Math.floor(Date.now() / 1000);
const DAY = 86400;

const VENUES: LabVenue[] = [
  {
    id: 'lab-1', name: 'Eden Beach', category: 'beach_club', categoryLabel: 'Beach club',
    location: 'Mykonos · Paranga', rating: 4.6,
    tagline: 'Sun-bleached afternoons, deep house after dark.',
    description: 'A stretch of fine sand on the south coast, where rosé arrives by the magnum and the DJ booth doesn\'t go quiet until the small hours. Sun loungers face the Aegean; the dancefloor faces inwards. The clientele is half-international, half-local — all dressed for photographs.',
    events: [{ id: 1, title: 'Black Coffee — Closing Party', startsAt: NOW + 3 * DAY, description: 'All-day set on the main terrace.' }],
    hours: true,
    design: { v: 1, palette: 'oceanic-teal', typePair: 'glamour', heroLayout: 'full-bleed', density: 'airy', motion: 'dynamic', sectionOrder: ['overview','events','hours','location','faq'] },
  },
  {
    id: 'lab-2', name: 'Vrochi Bouzoukia', category: 'bouzoukia', categoryLabel: 'Μπουζούκια',
    location: 'Athens · Gazi', rating: 4.4,
    tagline: 'Πίστα, λουλούδια στο πάτωμα, μπουκάλι στο τραπέζι.',
    description: 'Live Greek vocals start at 1am. Tables sell out a week ahead in winter; the bar always has room. Cash on top of the napkin, flowers on top of the glass, and the band running until dawn.',
    hours: true,
    design: { v: 1, palette: 'neon-pink', typePair: 'brutalist', heroLayout: 'marquee', density: 'default', motion: 'kinetic', sectionOrder: ['overview','hours','location','faq'] },
  },
  {
    id: 'lab-3', name: 'Couleur Locale', category: 'rooftop_bar', categoryLabel: 'Rooftop bar',
    location: 'Athens · Monastiraki', rating: 4.5,
    tagline: 'The Parthenon, framed by your cocktail.',
    description: 'A rooftop in the old shoemaker\'s district with the kind of Acropolis view that makes everybody pull out their phone, then put it away. The cocktail list leans on Greek herbs — mastic, tsipouro, dittany — and the music never gets in the way of conversation.',
    hours: true,
    design: { v: 1, palette: 'solar-amber', typePair: 'editorial', heroLayout: 'editorial', density: 'airy', motion: 'subtle', sectionOrder: ['overview','hours','location','faq'] },
  },
  {
    id: 'lab-4', name: 'Six DOGS', category: 'bar', categoryLabel: 'Bar',
    location: 'Athens · Psyrri', rating: 4.5,
    tagline: 'Courtyard by day, live stage by night.',
    description: 'A garden bar in a converted neoclassical house, with a courtyard strung with lights and a small stage that hosts indie acts on weekends. The kind of place where afternoon coffee bleeds into late-night negronis and nobody notices the time.',
    events: [{ id: 1, title: 'Larry Gus — live set', startsAt: NOW + 6 * DAY }],
    hours: true,
    design: { v: 1, palette: 'bone-white', typePair: 'editorial', heroLayout: 'split', density: 'default', motion: 'subtle', sectionOrder: ['overview','events','hours','location','faq'] },
  },
  {
    id: 'lab-5', name: 'Lohan', category: 'night_club', categoryLabel: 'Night club',
    location: 'Athens · Iera Odos', rating: 4.0,
    tagline: 'Big rooms, bigger nights.',
    description: 'A mainstream club on the Iera Odos strip with a capacity that fills on Saturdays and a list of resident DJs that rotates twice a year. Bottle service is the default; the dancefloor is the destination.',
    hours: true,
    design: { v: 1, palette: 'magenta-rave', typePair: 'brutalist', heroLayout: 'full-bleed', density: 'tight', motion: 'kinetic', sectionOrder: ['overview','hours','location','faq'] },
  },
  {
    id: 'lab-6', name: 'Cavo Paradiso', category: 'night_club', categoryLabel: 'Night club',
    location: 'Mykonos · Paradise Beach', rating: 4.5,
    tagline: 'Cliffside techno until the sun is up.',
    description: 'The cliff carved into a dance floor — visiting techno acts from Berlin, Detroit, and beyond play to the Aegean at the edge of the world. Pool to the left, sea to the right, sunrise straight ahead.',
    events: [
      { id: 1, title: 'Adam Beyer', startsAt: NOW + 5 * DAY },
      { id: 2, title: 'Tale of Us — closing', startsAt: NOW + 12 * DAY },
    ],
    hours: true,
    design: { v: 1, palette: 'electric-violet', typePair: 'industrial', heroLayout: 'layered', density: 'default', motion: 'dynamic', sectionOrder: ['overview','events','hours','location','faq'] },
  },
  {
    id: 'lab-7', name: 'A for Athens', category: 'rooftop_bar', categoryLabel: 'Rooftop bar',
    location: 'Athens · Monastiraki', rating: 4.3,
    tagline: 'Cocktails over the agora.',
    description: 'A hotel rooftop with one of the better Acropolis views in the city; busy at sunset, quieter after midnight. The room itself is small; the terrace is everything.',
    hours: true,
    design: { v: 1, palette: 'peach-gold', typePair: 'glamour', heroLayout: 'split', density: 'airy', motion: 'subtle', sectionOrder: ['overview','hours','location','faq'] },
  },
  {
    id: 'lab-8', name: 'Scorpios', category: 'beach_club', categoryLabel: 'Beach club',
    location: 'Mykonos · Paraga', rating: 4.7,
    tagline: 'Sunset ritual, daily.',
    description: 'A beach club that takes itself just seriously enough — boho interiors, a long communal table, and a sunset ritual that has been copied across the Mediterranean. The DJ programme is curated; the dress code is unstated but real.',
    hours: true,
    design: { v: 1, palette: 'ember-coral', typePair: 'editorial', heroLayout: 'gallery-grid', density: 'airy', motion: 'subtle', sectionOrder: ['overview','hours','location','faq'] },
  },
  {
    id: 'lab-9', name: 'Half Note', category: 'live_music', categoryLabel: 'Live music',
    location: 'Athens · Mets', rating: 4.6,
    tagline: 'Greece\'s jazz address since 1979.',
    description: 'The country\'s oldest jazz club — a small room with sightlines from every seat and a piano that has been played by some of the most important names in the genre. Two sets a night, no phones.',
    events: [{ id: 1, title: 'Brad Mehldau Trio', startsAt: NOW + 14 * DAY }],
    hours: true,
    design: { v: 1, palette: 'royal-purple', typePair: 'editorial', heroLayout: 'editorial', density: 'airy', motion: 'subtle', sectionOrder: ['overview','events','hours','location','faq'] },
  },
  {
    id: 'lab-10', name: 'Akrotiri Lounge', category: 'rooftop_bar', categoryLabel: 'Rooftop bar',
    location: 'Athens · Agios Kosmas', rating: 4.2,
    tagline: 'Seaside pool club on the south coast.',
    description: 'A pool and lounge complex on the coastal road, with a different crowd every night and a programme that drifts between commercial DJs and local residents. Best at sunset; loudest at 2am.',
    hours: true,
    design: { v: 1, palette: 'aegean-blue', typePair: 'industrial', heroLayout: 'gallery-grid', density: 'default', motion: 'dynamic', sectionOrder: ['overview','hours','location','faq'] },
  },
  {
    id: 'lab-11', name: 'Noel', category: 'bar', categoryLabel: 'Bar',
    location: 'Athens · Kolonaki', rating: 4.6,
    tagline: 'A Christmas-themed cocktail bar. Yes, all year.',
    description: 'A small bar in Kolonaki where it is permanently December — twinkly lights, baubles, kitsch turned into atmosphere. The cocktail list is more serious than the room would suggest; reservations are essential.',
    hours: true,
    design: { v: 1, palette: 'acid-lime', typePair: 'brutalist', heroLayout: 'layered', density: 'tight', motion: 'dynamic', sectionOrder: ['overview','hours','location','faq'] },
  },
  {
    id: 'lab-12', name: 'Lust Beach', category: 'beach_club', categoryLabel: 'Beach club',
    location: 'Crete · Heraklion', rating: 4.1,
    tagline: 'All-day beach, all-night dance floor.',
    description: 'A beach club at the edge of the harbour with a daytime sunbed scene that flips into a tiered dancefloor after dark. Cretan crowd in winter, mixed in summer; the music edges towards house most nights.',
    hours: true,
    design: { v: 1, palette: 'electric-cyan', typePair: 'industrial', heroLayout: 'marquee', density: 'tight', motion: 'kinetic', sectionOrder: ['overview','hours','location','faq'] },
  },
];

// Synthetic week of opening hours — Wed–Sun, 21:00 → 04:00. Used so the
// Hours block actually renders. (The real renderer pulls from Places.)
const SAMPLE_PERIODS = [
  { open: { day: 3, hour: 21, minute: 0 }, close: { day: 4, hour: 4, minute: 0 } },
  { open: { day: 4, hour: 21, minute: 0 }, close: { day: 5, hour: 4, minute: 0 } },
  { open: { day: 5, hour: 21, minute: 0 }, close: { day: 6, hour: 4, minute: 0 } },
  { open: { day: 6, hour: 21, minute: 0 }, close: { day: 0, hour: 4, minute: 0 } },
  { open: { day: 0, hour: 21, minute: 0 }, close: { day: 1, hour: 4, minute: 0 } },
];

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const FAQS = [
  { q: 'Is there a dress code?', a: 'Most nights, smart-casual — sandals are fine in summer.' },
  { q: 'Can I book a table?', a: 'Yes — reservations are encouraged on Fridays and Saturdays.' },
];

export default function DesignLabPage() {
  return (
    <main className="min-h-screen bg-[var(--color-bg-0)] pb-32">
      <header className="border-b border-[var(--color-bg-2)] px-6 py-10 md:py-14">
        <p className="text-xs uppercase tracking-[0.32em] text-[var(--color-fg-2)]">Design Lab · internal</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--color-fg-0)] md:text-5xl">
          Per-venue design system
        </h1>
        <p className="mt-4 max-w-2xl text-[var(--color-fg-1)]">
          12 fictional venues spanning {PALETTES.length} palettes, {TYPE_PAIRS.length} type pairs,
          {' '}{HERO_LAYOUTS.length} hero layouts, {DENSITIES.length} densities, {MOTIONS.length} motion modes.
          Each row below is one venue rendered with one combination — the AI design writer (Phase C)
          will pick these combinations per real venue. Phase A: judge the system itself.
        </p>
        <div className="mt-6 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.18em] text-[var(--color-fg-2)]">
          {PALETTES.map((p) => (
            <span key={p.id} className="inline-flex items-center gap-2 rounded-full border border-[var(--color-bg-2)] px-3 py-1">
              <span className="h-2 w-2 rounded-full" style={{ background: p.accent, boxShadow: `0 0 8px ${p.glow}` }} />
              {p.name}
            </span>
          ))}
        </div>
      </header>

      <div className="space-y-32 px-6 pt-16">
        {VENUES.map((v, i) => (
          <LabVenueArticle key={v.id} venue={v} priority={i === 0} />
        ))}
      </div>
    </main>
  );
}

function LabVenueArticle({ venue, priority }: { venue: LabVenue; priority: boolean }) {
  const photos = PHOTO_SETS[venue.category] ?? [];
  const styleVars = venueStyleVars(venue.design);
  return (
    <article
      style={styleVars}
      className={`venue-root venue-motion-${venue.design.motion}`}
      data-design={`${venue.design.palette}/${venue.design.typePair}/${venue.design.heroLayout}/${venue.design.density}/${venue.design.motion}`}
    >
      <DesignBadge design={venue.design} />
      <VenueHero
        layout={venue.design.heroLayout}
        name={venue.name}
        categoryLabel={venue.categoryLabel}
        locationLabel={venue.location}
        rating={venue.rating}
        taglineLabel={venue.tagline}
        descriptionLede={venue.description}
        photos={photos}
        claim={{ claimed: false, href: '#', label: 'Claim this venue' }}
        priority={priority}
      />

      <div className="mt-16 grid gap-16 md:grid-cols-[1.6fr_1fr]">
        <div>
          <VenueOverview
            description={venue.description}
            heading="Overview"
            dropCap={venue.design.typePair === 'editorial' && venue.design.heroLayout !== 'editorial'}
          />
          {venue.events && (
            <VenueEvents events={venue.events} heading="Upcoming events" locale="en" />
          )}
          {venue.hours && (
            <VenueHours periods={SAMPLE_PERIODS} dayNames={DAY_NAMES} closedLabel="Closed" heading="Hours" />
          )}
        </div>

        <div>
          <VenueLocationFacts
            heading="Location"
            address={`${venue.location}, Greece`}
            phone="+30 210 000 0000"
            website={`https://${venue.name.toLowerCase().replace(/[^a-z]+/g, '')}.gr`}
            labels={{ address: 'Address', phone: 'Phone', website: 'Website' }}
            mapSlot={
              <div className="flex aspect-[4/3] items-center justify-center text-xs uppercase tracking-[0.22em] text-[var(--color-fg-2)]">
                map placeholder
              </div>
            }
          />
        </div>
      </div>

      <div className="mt-16">
        <VenueFaq faqs={FAQS} heading="Common questions" />
      </div>
    </article>
  );
}

// Floating spec label so I can read the combo at a glance while reviewing.
function DesignBadge({ design }: { design: DesignParams }) {
  return (
    <div className="mb-6 inline-flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-[var(--color-fg-3)]">
      <span className="rounded-full border border-[var(--color-bg-2)] px-2 py-0.5">{design.palette}</span>
      <span className="rounded-full border border-[var(--color-bg-2)] px-2 py-0.5">{design.typePair}</span>
      <span className="rounded-full border border-[var(--color-bg-2)] px-2 py-0.5">hero · {design.heroLayout}</span>
      <span className="rounded-full border border-[var(--color-bg-2)] px-2 py-0.5">{design.density}</span>
      <span className="rounded-full border border-[var(--color-bg-2)] px-2 py-0.5">motion · {design.motion}</span>
    </div>
  );
}
