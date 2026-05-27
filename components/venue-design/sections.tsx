// Venue page sections — Overview, Hours, Location, Events, FAQ.
//
// Every section pulls its colour + typography from the --venue-* custom
// properties set on the parent <article>. Density tweaks (tight/airy) flow
// naturally through .venue-section gap utilities + .venue-body max-width.

import Link from 'next/link';

// -------- Overview --------------------------------------------------------

export function VenueOverview({
  description, heading, dropCap = false,
}: {
  description: string | null;
  heading: string;
  /** Editorial flavour — first-letter scales up + colours with accent. */
  dropCap?: boolean;
}) {
  if (!description) return null;
  return (
    <section className="venue-section" aria-labelledby="overview-h2">
      <h2 id="overview-h2" className="venue-h2 text-[var(--color-fg-0)]">{heading}</h2>
      <p className={`venue-body mt-5 ${dropCap ? 'venue-dropcap' : ''}`}>{description}</p>
    </section>
  );
}

// -------- Hours -----------------------------------------------------------

// `periods` matches Google Places `regular_opening_hours.periods`.
type Period = {
  open?: { day?: number; hour?: number; minute?: number };
  close?: { day?: number; hour?: number; minute?: number };
};

export function VenueHours({
  periods, dayNames, closedLabel, heading,
}: {
  periods: readonly Period[];
  dayNames: readonly string[]; // [Mon..Sun]
  closedLabel: string;
  heading: string;
}) {
  if (!periods.length) return null;
  // Places API: Sunday=0. Local table reads Mon→Sun, so remap.
  const PLACES_TO_LOCAL = [6, 0, 1, 2, 3, 4, 5];
  const rows = dayNames.map((d) => ({ day: d, opens: '', closes: '' }));
  const pad = (n: number) => String(n).padStart(2, '0');
  for (const p of periods) {
    if (typeof p?.open?.day !== 'number') continue;
    const idx = PLACES_TO_LOCAL[p.open.day];
    if (idx === undefined) continue;
    rows[idx]!.opens = `${pad(p.open.hour ?? 0)}:${pad(p.open.minute ?? 0)}`;
    if (typeof p.close?.day === 'number') {
      rows[idx]!.closes = `${pad(p.close.hour ?? 0)}:${pad(p.close.minute ?? 0)}`;
    }
  }
  return (
    <section className="venue-section" aria-labelledby="hours-h2">
      <h2 id="hours-h2" className="venue-h2 text-[var(--color-fg-0)]">{heading}</h2>
      <dl className="venue-stat mt-5 grid grid-cols-1 gap-x-10 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((r) => {
          const open = !!r.opens;
          return (
            <div
              key={r.day}
              className="flex items-baseline justify-between gap-3 border-b border-[var(--color-bg-2)] py-2"
            >
              <dt className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-fg-2)]">
                {r.day}
              </dt>
              <dd className={open ? 'text-[var(--color-fg-0)]' : 'text-[var(--color-fg-3)]'}>
                {open ? `${r.opens} – ${r.closes || '?'}` : closedLabel}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}

// -------- Location facts --------------------------------------------------

export function VenueLocationFacts({
  heading, address, phone, website, labels,
  mapSlot,
}: {
  heading: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  labels: { address: string; phone: string; website: string };
  /** Renderer slots the lazy map here. Design-lab demo passes a placeholder. */
  mapSlot?: React.ReactNode;
}) {
  if (!address && !phone && !website && !mapSlot) return null;
  return (
    <section className="venue-section" aria-labelledby="location-h2">
      <h2 id="location-h2" className="venue-h2 text-[var(--color-fg-0)]">{heading}</h2>
      <div className="mt-5 grid gap-6 md:grid-cols-[1fr_1.2fr]">
        <dl className="space-y-4 text-sm">
          {address && <Row label={labels.address} value={address} />}
          {phone && (
            <Row
              label={labels.phone}
              value={
                <a href={`tel:${phone.replace(/\s/g, '')}`} className="venue-link">
                  {phone}
                </a>
              }
            />
          )}
          {website && (
            <Row
              label={labels.website}
              value={
                <a
                  href={website}
                  target="_blank"
                  rel="nofollow noopener"
                  className="venue-link break-all"
                >
                  {website.replace(/^https?:\/\//, '')}
                </a>
              }
            />
          )}
        </dl>
        {mapSlot && (
          <div className="venue-panel overflow-hidden">
            {mapSlot}
          </div>
        )}
      </div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-fg-2)]">{label}</dt>
      <dd className="mt-1 text-[var(--color-fg-0)]">{value}</dd>
    </div>
  );
}

// -------- Events ---------------------------------------------------------

export type VenueEvent = {
  id: string | number;
  title: string;
  startsAt: number; // unix seconds
  description?: string | null;
  url?: string | null;
};

export function VenueEvents({
  events, heading, locale,
}: {
  events: readonly VenueEvent[];
  heading: string;
  locale: string;
}) {
  if (!events.length) return null;
  return (
    <section className="venue-section venue-panel p-6" aria-labelledby="events-h2">
      <h2 id="events-h2" className="venue-h2 text-[var(--color-fg-0)]">{heading}</h2>
      <ul className="mt-5 divide-y divide-[var(--color-bg-2)]">
        {events.map((ev) => (
          <li key={ev.id} className="py-4">
            <p className="font-semibold text-[var(--color-fg-0)]">{ev.title}</p>
            <p className="venue-stat mt-1 text-xs uppercase tracking-[0.16em] text-[var(--venue-accent)]">
              {new Date(ev.startsAt * 1000).toLocaleString(locale, {
                weekday: 'short', day: 'numeric', month: 'short',
                hour: '2-digit', minute: '2-digit',
              })}
            </p>
            {ev.description && (
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-fg-1)]">{ev.description}</p>
            )}
            {ev.url && (
              <a
                href={ev.url}
                rel="nofollow noopener"
                target="_blank"
                className="venue-link mt-1 inline-block text-xs"
              >
                {ev.url.replace(/^https?:\/\//, '').slice(0, 60)} →
              </a>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

// -------- FAQ -------------------------------------------------------------

export function VenueFaq({
  faqs, heading,
}: {
  faqs: readonly { q: string; a: string }[];
  heading: string;
}) {
  if (!faqs.length) return null;
  return (
    <section className="venue-section" aria-labelledby="faq-h2">
      <h2 id="faq-h2" className="venue-h2 text-[var(--color-fg-0)]">{heading}</h2>
      <dl className="mt-6 divide-y divide-[var(--color-bg-2)]">
        {faqs.map((f) => (
          <div key={f.q} className="py-4">
            <dt className="font-semibold text-[var(--color-fg-0)]">{f.q}</dt>
            <dd className="mt-1.5 text-sm leading-relaxed text-[var(--color-fg-1)]">{f.a}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

// -------- Related card grid slot ------------------------------------------

// The current VenueCard component already handles related rendering. The
// renderer can drop it in directly — we just provide the heading frame.
export function VenueRelated({
  heading, allLinkLabel, allLinkHref, children,
}: {
  heading: string;
  allLinkLabel: string;
  allLinkHref: string;
  children: React.ReactNode;
}) {
  return (
    <section className="venue-section" aria-labelledby="similar-h2">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="similar-h2" className="venue-h2 text-[var(--color-fg-0)]">{heading}</h2>
        <Link href={allLinkHref} className="venue-link text-sm">{allLinkLabel}</Link>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}
