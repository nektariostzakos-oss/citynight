'use client';

import { useState } from 'react';
import type { Locale } from '@/lib/i18n';

const COPY: Record<Locale, { label: string; cta: string; sent: string; err: string }> = {
  en: { label: 'Email', cta: 'Send sign-in link', sent: 'Link sent. Check your inbox.', err: "We couldn't send the link. Try again." },
  el: { label: 'Email', cta: 'Στείλε σύνδεσμο', sent: 'Στάλθηκε. Δες το inbox σου.', err: 'Δεν στάλθηκε. Δοκίμασε ξανά.' },
  de: { label: 'E-Mail', cta: 'Anmeldelink senden', sent: 'Link gesendet. Bitte E-Mails prüfen.', err: 'Konnte nicht gesendet werden.' },
  fr: { label: 'Email', cta: 'Envoyer le lien', sent: 'Envoyé. Vérifiez votre boîte mail.', err: "Échec de l'envoi." },
  it: { label: 'Email', cta: 'Invia link', sent: 'Inviato. Controlla la posta.', err: 'Invio non riuscito.' },
};

export function SignInForm({ locale, purpose = 'login', venueId }: { locale: Locale; purpose?: 'login' | 'claim'; venueId?: string }) {
  const c = COPY[locale];
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending');
    const res = await fetch('/api/auth/request', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, locale, purpose, venueId }),
    });
    setStatus(res.ok ? 'sent' : 'error');
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block">
        <span className="text-xs uppercase tracking-widest text-[var(--color-fg-2)]">{c.label}</span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-2 block w-full rounded-md border border-[var(--color-bg-3)] bg-[var(--color-bg-1)] px-3 py-2 text-[var(--color-fg-0)] focus:border-[var(--color-accent-cyan)] focus:outline-none"
        />
      </label>
      <button
        type="submit"
        disabled={status === 'sending'}
        className="w-full rounded-md bg-[var(--color-accent-pink)] px-4 py-2.5 font-semibold text-[var(--color-bg-0)] shadow-[var(--shadow-glow-pink)] disabled:opacity-60"
      >
        {c.cta}
      </button>
      {status === 'sent' && <p className="text-sm text-[var(--color-success)]">{c.sent}</p>}
      {status === 'error' && <p className="text-sm text-[var(--color-danger)]">{c.err}</p>}
    </form>
  );
}
