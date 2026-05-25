'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Locale } from '@/lib/i18n';

// Phase 5 client form for /api/venues/submit. Three fields (name + city +
// category) — anything more is a fact we'd rather pull from Google Places
// than ask the visitor to retype. The server response carries the auto-
// decision (auto_publish / hold / reject); we surface it in-place with a
// localized status line + a deep-link to the manage page when it lands live.

type CityOpt = { slug: string; name: string; region: string | null };
type CategoryOpt = { slug: string; name: string };
type FormCopy = {
  fName: string; fCity: string; fCategory: string;
  fNamePh: string; cityPh: string; catPh: string;
  hint: string;
};

const STATUS_COPY: Record<Locale, {
  saving: string;
  published: string;
  pending: string;
  rejected: string;
  network: string;
  submit: string;
  managed: string;
}> = {
  en: {
    saving: 'Checking against Google Places…',
    published: 'Live now — your page is published. Manage it below.',
    pending: 'Held for review — we couldn’t confidently match Google Places, an editor will look at it shortly.',
    rejected: 'No match on Google Places. Please double-check the name and city, then try again.',
    network: 'Could not submit — check your connection and retry.',
    submit: 'Submit venue',
    managed: 'Open the manage page →',
  },
  el: {
    saving: 'Έλεγχος στο Google Places…',
    published: 'Live τώρα — η σελίδα σου δημοσιεύτηκε. Διαχείριση παρακάτω.',
    pending: 'Σε αναμονή — δεν μπορέσαμε να το ταιριάξουμε με σιγουριά. Συντάκτης θα ρίξει μια ματιά σύντομα.',
    rejected: 'Δεν βρέθηκε στο Google Places. Έλεγξε το όνομα και την πόλη και ξαναδοκίμασε.',
    network: 'Δεν στάλθηκε — έλεγξε σύνδεση και δοκίμασε ξανά.',
    submit: 'Αποστολή μαγαζιού',
    managed: 'Άνοιξε τη σελίδα διαχείρισης →',
  },
  de: {
    saving: 'Abgleich mit Google Places…',
    published: 'Live — die Seite ist veröffentlicht. Unten verwalten.',
    pending: 'Zur Prüfung gehalten — kein klarer Google-Places-Treffer; ein Redakteur schaut bald drauf.',
    rejected: 'Kein Google-Places-Treffer. Bitte Name + Stadt prüfen und erneut versuchen.',
    network: 'Senden fehlgeschlagen — Verbindung prüfen.',
    submit: 'Location einreichen',
    managed: 'Verwaltungsseite öffnen →',
  },
  fr: {
    saving: 'Vérification auprès de Google Places…',
    published: 'En ligne — votre page est publiée. À gérer ci-dessous.',
    pending: 'En attente de revue — pas de correspondance claire ; un éditeur va regarder.',
    rejected: 'Aucune correspondance Google Places. Vérifiez nom + ville puis réessayez.',
    network: 'Envoi impossible — vérifiez votre connexion.',
    submit: 'Soumettre le lieu',
    managed: 'Ouvrir la page de gestion →',
  },
  it: {
    saving: 'Verifica su Google Places…',
    published: 'Online — la pagina è pubblicata. Gestiscila qui sotto.',
    pending: 'In attesa di revisione — nessun match certo; un editor la guarderà a breve.',
    rejected: 'Nessun match su Google Places. Controlla nome e città e riprova.',
    network: 'Invio fallito — controlla la connessione.',
    submit: 'Invia il locale',
    managed: 'Apri la pagina di gestione →',
  },
};

type ApiResponse = {
  ok: boolean;
  venueId?: string;
  decision?: 'auto_publish' | 'hold' | 'reject';
  status?: 'published' | 'pending' | 'rejected';
  error?: string;
};

export function SubmitNewVenueForm({
  locale,
  cities,
  categories,
  copy,
}: {
  locale: Locale;
  cities: CityOpt[];
  categories: CategoryOpt[];
  copy: FormCopy;
}) {
  const router = useRouter();
  const t = STATUS_COPY[locale];
  const [name, setName] = useState('');
  const [citySlug, setCitySlug] = useState('');
  const [categorySlug, setCategorySlug] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ApiResponse | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !citySlug || !categorySlug) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch('/api/venues/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, citySlug, categorySlug }),
      });
      const json = (await res.json()) as ApiResponse;
      setResult(json);
      // On a successful auto-publish, prefetch the manage page so the deep
      // link feels instant when the visitor taps it.
      if (json.ok && json.venueId && json.status === 'published') {
        router.prefetch(`/${locale}/dashboard/${json.venueId}`);
      }
    } catch {
      setResult({ ok: false, error: 'network' });
    } finally {
      setBusy(false);
    }
  }

  const status = result?.status;

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <label className="block">
        <span className="text-xs uppercase tracking-widest text-[var(--color-fg-2)]">{copy.fName}</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={copy.fNamePh}
          required
          className="mt-2 block w-full rounded-md border border-[var(--color-bg-3)] bg-[var(--color-bg-1)] px-3 py-2 text-[var(--color-fg-0)] focus:border-[var(--color-accent-cyan)] focus:outline-none"
        />
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs uppercase tracking-widest text-[var(--color-fg-2)]">{copy.fCity}</span>
          <select
            value={citySlug}
            onChange={(e) => setCitySlug(e.target.value)}
            required
            className="mt-2 block w-full rounded-md border border-[var(--color-bg-3)] bg-[var(--color-bg-1)] px-3 py-2 text-[var(--color-fg-0)] focus:border-[var(--color-accent-cyan)] focus:outline-none"
          >
            <option value="">{copy.cityPh}</option>
            {cities.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}{c.region ? ` · ${c.region}` : ''}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs uppercase tracking-widest text-[var(--color-fg-2)]">{copy.fCategory}</span>
          <select
            value={categorySlug}
            onChange={(e) => setCategorySlug(e.target.value)}
            required
            className="mt-2 block w-full rounded-md border border-[var(--color-bg-3)] bg-[var(--color-bg-1)] px-3 py-2 text-[var(--color-fg-0)] focus:border-[var(--color-accent-cyan)] focus:outline-none"
          >
            <option value="">{copy.catPh}</option>
            {categories.map((k) => (
              <option key={k.slug} value={k.slug}>{k.name}</option>
            ))}
          </select>
        </label>
      </div>

      <p className="text-xs text-[var(--color-fg-3)]">{copy.hint}</p>

      <button
        type="submit"
        disabled={busy || !name || !citySlug || !categorySlug}
        className="inline-flex items-center gap-2 rounded-md bg-[var(--color-accent-pink)] px-5 py-3 text-sm font-semibold text-[var(--color-bg-0)] shadow-[var(--shadow-glow-pink)] transition hover:brightness-110 disabled:opacity-60"
      >
        {busy ? t.saving : t.submit}
      </button>

      {result && !result.ok && (
        <p className="text-sm text-[var(--color-danger)]">
          {result.error === 'network' ? t.network : (result.error ?? t.network)}
        </p>
      )}

      {result && result.ok && (
        <div
          className={`rounded-lg border p-4 text-sm ${
            status === 'published'
              ? 'border-[var(--color-success)]/40 bg-[var(--color-success)]/10 text-[var(--color-success)]'
              : status === 'pending'
              ? 'border-[var(--color-accent-amber)]/40 bg-[var(--color-accent-amber)]/10 text-[var(--color-accent-amber)]'
              : 'border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 text-[var(--color-danger)]'
          }`}
        >
          <p className="font-semibold">
            {status === 'published' ? t.published : status === 'pending' ? t.pending : t.rejected}
          </p>
          {status === 'published' && result.venueId && (
            <a
              href={`/${locale}/dashboard/${result.venueId}`}
              className="mt-2 inline-flex text-xs font-semibold uppercase tracking-widest underline-offset-4 hover:underline"
            >
              {t.managed}
            </a>
          )}
        </div>
      )}
    </form>
  );
}
