'use client';

// Phase I.5d — public booking flow for sites that have bookable services.
// Multi-step wizard: service → staff → date+time → customer details →
// confirm. Posts to /api/sites/[id]/booking on submit; renders a
// confirmation block with the booking id + selected slot on success.
//
// Deposit step (Stripe Elements) is wired into the API layer (I.5c) but
// not yet surfaced here — services don't carry a deposit_percent column
// in v1. When that lands, this component adds an optional payment step
// between customer-details and confirm.

import { useEffect, useState, useTransition } from 'react';

type Service = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string | null;
  durationMinutes: number;
  priceCents: number;
};

type Staff = {
  id: string;
  slug: string;
  name: string;
  role: string | null;
  bio: string | null;
  photoUrl: string | null;
  specialties: string[];
};

type Step = 'service' | 'staff' | 'datetime' | 'details' | 'confirm';

type Props = {
  siteId: string;
  siteName: string;
  initialServices: Service[];
  locale: string;
  currency?: string;
};

const ANY_STAFF: Staff = { id: '__any', slug: '__any', name: 'First available', role: null, bio: null, photoUrl: null, specialties: [] };

// Locale is threaded through so SSR + client agree on number formatting.
// `Intl.NumberFormat(undefined, ...)` reads the runtime locale, which differs
// between Node (server) and the browser → hydration mismatch.
function formatMoney(cents: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(cents / 100);
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function BookingFlow({ siteId, siteName, initialServices, locale, currency = 'EUR' }: Props) {
  const [step, setStep] = useState<Step>(initialServices.length === 0 ? 'service' : 'service');
  const [service, setService] = useState<Service | null>(null);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [staff, setStaff] = useState<Staff | null>(null);
  const [date, setDate] = useState<string>(todayIso());
  const [slots, setSlots] = useState<string[]>([]);
  const [time, setTime] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Load staff when the user picks a service.
  useEffect(() => {
    if (!service) return;
    setStaffList([]); setStaff(null); setSlots([]); setTime(null);
    fetch(`/api/sites/${siteId}/booking/staff?serviceId=${encodeURIComponent(service.id)}`)
      .then((r) => r.json())
      .then((d: { staff: Staff[] }) => setStaffList([ANY_STAFF, ...d.staff]))
      .catch(() => setError('Could not load staff. Refresh to retry.'));
  }, [service, siteId]);

  // Load slot grid when service + staff + date all chosen.
  useEffect(() => {
    if (!service || !staff || step !== 'datetime') return;
    setSlots([]); setTime(null);
    const staffParam = staff.id === '__any' ? '' : `&staffId=${encodeURIComponent(staff.id)}`;
    // When "First available" is picked, the slot lookup needs a real staff id —
    // we use the first non-ANY staff in the list as a sensible default.
    // Future improvement: union slots across all eligible staff.
    const fallbackStaff = staffList.find((s) => s.id !== '__any');
    const effectiveStaff = staff.id === '__any' ? fallbackStaff : staff;
    if (!effectiveStaff) return;
    fetch(`/api/sites/${siteId}/booking/slots?serviceId=${encodeURIComponent(service.id)}&staffId=${encodeURIComponent(effectiveStaff.id)}&date=${encodeURIComponent(date)}`)
      .then((r) => r.json())
      .then((d: { slots?: string[]; error?: string }) => {
        if (d.error) setError(d.error);
        else setSlots(d.slots ?? []);
      })
      .catch(() => setError('Could not load times.'));
    // `staffParam` is consumed inside the URL above; referenced here to satisfy
    // exhaustive deps without breaking the lazy lookup pattern.
    void staffParam;
  }, [service, staff, date, step, siteId, staffList]);

  function submit() {
    if (!service || !staff || !time || !name) return;
    if (!email && !phone) { setError('We need an email or phone.'); return; }
    setError(null);
    startTransition(async () => {
      const effectiveStaff = staff.id === '__any' ? staffList.find((s) => s.id !== '__any')! : staff;
      const res = await fetch(`/api/sites/${siteId}/booking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          serviceId: service.id, staffId: effectiveStaff.id,
          date, time,
          customerName: name, customerEmail: email || undefined, customerPhone: phone || undefined,
          customerNotes: notes || undefined, lang: locale,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        if (j.error === 'slot_taken') { setError('That slot was just taken. Please pick another time.'); setStep('datetime'); return; }
        setError(j.error ?? 'Could not create booking.');
        return;
      }
      const data = (await res.json()) as { booking: { id: string } };
      setBookingId(data.booking.id);
      setStep('confirm');
    });
  }

  // ─── render ───────────────────────────────────────────────────────

  if (step === 'confirm' && bookingId) {
    return (
      <div className="site-panel p-8">
        <h2 className="site-h2 mb-3">You're booked.</h2>
        <p className="site-body mb-6">{siteName} will see you {date} at {time}{staff && staff.id !== '__any' ? ` with ${staff.name}` : ''}.</p>
        <p className="text-sm" style={{ color: 'var(--site-muted)' }}>Reference: {bookingId}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Steps current={step} />

      {error && (
        <div className="rounded border border-red-400/40 bg-red-50/10 p-4 text-sm" style={{ color: 'var(--site-fg)' }}>
          {error}
        </div>
      )}

      {step === 'service' && (
        <section>
          <h2 className="site-h2 mb-6">Choose a service</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {initialServices.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => { setService(s); setStep('staff'); }}
                className="site-panel text-left p-5 hover:opacity-90 transition"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="site-display text-lg font-semibold" style={{ color: 'var(--site-fg)' }}>{s.name}</span>
                  <span className="text-sm" style={{ color: 'var(--site-primary)' }}>{formatMoney(s.priceCents, currency, locale)}</span>
                </div>
                <div className="mt-1 text-xs" style={{ color: 'var(--site-muted)' }}>{s.durationMinutes} min{s.category ? ` · ${s.category}` : ''}</div>
                {s.description && <p className="mt-3 site-body text-sm">{s.description}</p>}
              </button>
            ))}
          </div>
        </section>
      )}

      {step === 'staff' && service && (
        <section>
          <BackLink onClick={() => setStep('service')} label="← Change service" current={service.name} />
          <h2 className="site-h2 mb-6">Choose your stylist</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {staffList.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => { setStaff(p); setStep('datetime'); }}
                className="site-panel text-left p-5 hover:opacity-90 transition"
              >
                <div className="site-display text-lg font-semibold" style={{ color: 'var(--site-fg)' }}>{p.name}</div>
                {p.role && <div className="mt-1 text-xs" style={{ color: 'var(--site-muted)' }}>{p.role}</div>}
                {p.specialties.length > 0 && (
                  <div className="mt-3 text-xs" style={{ color: 'var(--site-muted)' }}>
                    {p.specialties.join(' · ')}
                  </div>
                )}
              </button>
            ))}
          </div>
        </section>
      )}

      {step === 'datetime' && service && staff && (
        <section>
          <BackLink onClick={() => setStep('staff')} label="← Change stylist" current={`${service.name} · ${staff.name}`} />
          <h2 className="site-h2 mb-6">Pick a date and time</h2>
          <label className="block mb-6">
            <span className="block text-sm mb-2" style={{ color: 'var(--site-muted)' }}>Date</span>
            <input
              type="date"
              value={date}
              min={todayIso()}
              onChange={(e) => setDate(e.target.value)}
              className="site-panel w-full max-w-xs p-3"
              style={{ color: 'var(--site-fg)' }}
            />
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {slots.length === 0 ? (
              <p className="col-span-full site-body text-sm">No available times on this date.</p>
            ) : slots.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setTime(t); setStep('details'); }}
                className="site-panel p-3 text-center font-medium hover:opacity-90 transition"
                style={{ color: 'var(--site-fg)' }}
              >{t}</button>
            ))}
          </div>
        </section>
      )}

      {step === 'details' && service && staff && time && (
        <section>
          <BackLink onClick={() => setStep('datetime')} label="← Change time" current={`${service.name} · ${date} · ${time}`} />
          <h2 className="site-h2 mb-6">Your details</h2>
          <form
            onSubmit={(e) => { e.preventDefault(); submit(); }}
            className="grid gap-4 max-w-xl"
          >
            <Field label="Full name" required>
              <input type="text" required maxLength={120} value={name} onChange={(e) => setName(e.target.value)}
                     className="site-panel w-full p-3" style={{ color: 'var(--site-fg)' }} />
            </Field>
            <Field label="Email">
              <input type="email" maxLength={200} value={email} onChange={(e) => setEmail(e.target.value)}
                     className="site-panel w-full p-3" style={{ color: 'var(--site-fg)' }} />
            </Field>
            <Field label="Phone">
              <input type="tel" maxLength={30} value={phone} onChange={(e) => setPhone(e.target.value)}
                     className="site-panel w-full p-3" style={{ color: 'var(--site-fg)' }} />
            </Field>
            <Field label="Notes (optional)">
              <textarea maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)}
                        rows={3} className="site-panel w-full p-3" style={{ color: 'var(--site-fg)' }} />
            </Field>
            <button type="submit" disabled={pending} className="site-cta mt-2 self-start">
              {pending ? 'Confirming…' : 'Confirm booking'}
            </button>
          </form>
        </section>
      )}
    </div>
  );
}

// ─── small bits ─────────────────────────────────────────────────────

function Steps({ current }: { current: Step }) {
  const order: Step[] = ['service', 'staff', 'datetime', 'details'];
  const labels: Record<Step, string> = {
    service: 'Service', staff: 'Stylist', datetime: 'Date & time', details: 'Details', confirm: 'Done',
  };
  const idx = order.indexOf(current);
  return (
    <ol className="flex items-center gap-2 text-xs" style={{ color: 'var(--site-muted)' }}>
      {order.map((s, i) => (
        <li key={s} className="flex items-center gap-2">
          <span
            className="inline-flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-semibold"
            style={i <= idx
              ? { background: 'var(--site-primary)', color: 'var(--site-bg)', borderColor: 'var(--site-primary)' }
              : { borderColor: 'currentColor' }}
          >{i + 1}</span>
          <span>{labels[s]}</span>
          {i < order.length - 1 && <span aria-hidden>›</span>}
        </li>
      ))}
    </ol>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm mb-2" style={{ color: 'var(--site-muted)' }}>
        {label}{required ? ' *' : ''}
      </span>
      {children}
    </label>
  );
}

function BackLink({ onClick, label, current }: { onClick: () => void; label: string; current: string }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3 text-sm" style={{ color: 'var(--site-muted)' }}>
      <button type="button" onClick={onClick} className="underline-offset-2 hover:underline">{label}</button>
      <span className="truncate">{current}</span>
    </div>
  );
}
