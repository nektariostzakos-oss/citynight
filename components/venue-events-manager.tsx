'use client';

import { useEffect, useState } from 'react';
import type { Locale } from '@/lib/i18n';

// Featured-tier client UI: list + create + cancel events. Talks to the
// /api/venues/[id]/events route. Editing happens in-place — no modal —
// because there are only 4 fields and inline keeps the surface calm.

type VenueEvent = {
  id: string;
  title: string;
  description: string | null;
  startsAt: number;
  endsAt: number | null;
  url: string | null;
  status: 'published' | 'canceled' | 'draft';
};

const COPY: Record<Locale, {
  heading: string;
  empty: string;
  titlePh: string;
  descPh: string;
  urlPh: string;
  startsLabel: string;
  endsLabel: string;
  create: string;
  saving: string;
  cancel: string;
  delete: string;
  canceledTag: string;
}> = {
  en: { heading: 'Events', empty: 'No events yet — post your next one to surface it on your venue page.', titlePh: 'Saturday night residency', descPh: 'Optional details, DJs, ticket info…', urlPh: 'https://tickets.example/...', startsLabel: 'Starts', endsLabel: 'Ends (optional)', create: 'Post event', saving: 'Posting…', cancel: 'Cancel event', delete: 'Delete', canceledTag: 'canceled' },
  el: { heading: 'Events', empty: 'Δεν υπάρχουν events — ανέβασε το επόμενο για να βγει στη σελίδα σου.', titlePh: 'Σαββατιάτικη resident βραδιά', descPh: 'Προαιρετικά: DJs, info για εισιτήρια…', urlPh: 'https://tickets.example/...', startsLabel: 'Ώρα έναρξης', endsLabel: 'Λήξη (προαιρετικό)', create: 'Δημοσίευση event', saving: 'Δημοσίευση…', cancel: 'Ακύρωση event', delete: 'Διαγραφή', canceledTag: 'ακυρωμένο' },
  de: { heading: 'Events', empty: 'Noch keine Events — poste eines, damit es auf deiner Seite erscheint.', titlePh: 'Samstag-Resident-Nacht', descPh: 'Optionale Details, DJs, Ticket-Info…', urlPh: 'https://tickets.example/...', startsLabel: 'Beginn', endsLabel: 'Ende (optional)', create: 'Event posten', saving: 'Wird gepostet…', cancel: 'Event absagen', delete: 'Löschen', canceledTag: 'abgesagt' },
  fr: { heading: 'Événements', empty: 'Aucun événement — publiez-en un pour qu\'il apparaisse sur votre page.', titlePh: 'Résidence du samedi soir', descPh: 'Détails facultatifs, DJs, billetterie…', urlPh: 'https://tickets.example/...', startsLabel: 'Début', endsLabel: 'Fin (facultatif)', create: 'Publier l\'événement', saving: 'Publication…', cancel: 'Annuler l\'événement', delete: 'Supprimer', canceledTag: 'annulé' },
  it: { heading: 'Eventi', empty: 'Nessun evento — pubblicane uno per farlo apparire sulla tua pagina.', titlePh: 'Sabato sera residency', descPh: 'Dettagli opzionali, DJ, biglietti…', urlPh: 'https://tickets.example/...', startsLabel: 'Inizio', endsLabel: 'Fine (opzionale)', create: 'Pubblica evento', saving: 'Pubblicazione…', cancel: 'Annulla evento', delete: 'Elimina', canceledTag: 'annullato' },
};

function fmtLocal(ts: number) {
  // Render in the browser's locale + timezone — owners care about local time.
  return new Date(ts * 1000).toLocaleString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function VenueEventsManager({ venueId, locale }: { venueId: string; locale: Locale }) {
  const c = COPY[locale];
  const [events, setEvents] = useState<VenueEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [url, setUrl] = useState('');

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch(`/api/venues/${venueId}/events`);
      const json = await res.json();
      if (json.ok) setEvents(json.events as VenueEvent[]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [venueId]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !startsAt) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/venues/${venueId}/events`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title, description: description || null,
          startsAt: new Date(startsAt).toISOString(),
          endsAt: endsAt ? new Date(endsAt).toISOString() : null,
          url: url || null,
        }),
      });
      if (res.ok) {
        setTitle(''); setDescription(''); setStartsAt(''); setEndsAt(''); setUrl('');
        await refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  async function cancelOne(eventId: string) {
    await fetch(`/api/venues/${venueId}/events?eventId=${eventId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'canceled' }),
    });
    refresh();
  }
  async function deleteOne(eventId: string) {
    await fetch(`/api/venues/${venueId}/events?eventId=${eventId}`, { method: 'DELETE' });
    refresh();
  }

  return (
    <div>
      <h3 className="font-display text-lg font-semibold">{c.heading}</h3>

      {/* Create form */}
      <form onSubmit={onCreate} className="mt-3 rounded-lg border border-[var(--color-bg-3)] bg-[var(--color-bg-1)] p-4">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={c.titlePh}
          required
          maxLength={140}
          className="block w-full rounded-md border border-[var(--color-bg-3)] bg-[var(--color-bg-0)] px-3 py-2 text-sm text-[var(--color-fg-0)] focus:border-[var(--color-accent-cyan)] focus:outline-none"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={c.descPh}
          rows={2}
          maxLength={2000}
          className="mt-2 block w-full rounded-md border border-[var(--color-bg-3)] bg-[var(--color-bg-0)] px-3 py-2 text-sm text-[var(--color-fg-0)] focus:border-[var(--color-accent-cyan)] focus:outline-none"
        />
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <label className="block">
            <span className="text-[10px] uppercase tracking-widest text-[var(--color-fg-2)]">{c.startsLabel}</span>
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border border-[var(--color-bg-3)] bg-[var(--color-bg-0)] px-3 py-2 text-sm text-[var(--color-fg-0)] focus:border-[var(--color-accent-cyan)] focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-widest text-[var(--color-fg-2)]">{c.endsLabel}</span>
            <input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className="mt-1 block w-full rounded-md border border-[var(--color-bg-3)] bg-[var(--color-bg-0)] px-3 py-2 text-sm text-[var(--color-fg-0)] focus:border-[var(--color-accent-cyan)] focus:outline-none"
            />
          </label>
        </div>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={c.urlPh}
          className="mt-2 block w-full rounded-md border border-[var(--color-bg-3)] bg-[var(--color-bg-0)] px-3 py-2 text-sm text-[var(--color-fg-0)] focus:border-[var(--color-accent-cyan)] focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy || !title || !startsAt}
          className="mt-3 rounded-md bg-[var(--color-accent-pink)] px-4 py-2 text-sm font-semibold text-[var(--color-bg-0)] shadow-[var(--shadow-glow-pink)] disabled:opacity-60"
        >
          {busy ? c.saving : c.create}
        </button>
      </form>

      {/* List */}
      {loading ? null : events.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--color-fg-3)]">{c.empty}</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {events.map((e) => (
            <li key={e.id} className="flex items-start justify-between gap-3 rounded-lg border border-[var(--color-bg-3)] bg-[var(--color-bg-1)] p-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[var(--color-fg-0)]">
                  {e.title}
                  {e.status === 'canceled' && (
                    <span className="ml-2 rounded-full bg-[var(--color-danger)]/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-[var(--color-danger)]">
                      {c.canceledTag}
                    </span>
                  )}
                </p>
                <p className="text-xs text-[var(--color-fg-2)]">{fmtLocal(e.startsAt)}{e.endsAt ? ` → ${fmtLocal(e.endsAt)}` : ''}</p>
                {e.description && (
                  <p className="mt-1 text-xs leading-relaxed text-[var(--color-fg-1)]">{e.description}</p>
                )}
              </div>
              <div className="flex shrink-0 flex-col gap-1">
                {e.status !== 'canceled' && (
                  <button type="button" onClick={() => cancelOne(e.id)} className="text-[10px] uppercase tracking-wider text-[var(--color-fg-2)] hover:text-[var(--color-fg-0)]">
                    {c.cancel}
                  </button>
                )}
                <button type="button" onClick={() => deleteOne(e.id)} className="text-[10px] uppercase tracking-wider text-[var(--color-danger)] hover:underline">
                  {c.delete}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
