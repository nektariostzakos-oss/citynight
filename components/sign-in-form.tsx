'use client';

import { useState } from 'react';
import type { Locale } from '@/lib/i18n';

type Mode = 'signin' | 'signup';

const LABELS: Record<Locale, {
  signInTab: string;
  signUpTab: string;
  email: string;
  password: string;
  passwordHint: string;
  signInCta: string;
  signUpCta: string;
  submitting: string;
  errInvalid: string;
  errExists: string;
  errGeneric: string;
}> = {
  en: {
    signInTab: 'Sign in', signUpTab: 'Create account',
    email: 'Email', password: 'Password',
    passwordHint: '8 characters or more',
    signInCta: 'Sign in', signUpCta: 'Create account',
    submitting: 'One moment…',
    errInvalid: 'Email or password is wrong.',
    errExists: 'An account with this email already exists. Sign in instead.',
    errGeneric: 'Something went wrong. Try again.',
  },
  el: {
    signInTab: 'Σύνδεση', signUpTab: 'Δημιουργία λογαριασμού',
    email: 'Email', password: 'Κωδικός',
    passwordHint: '8 χαρακτήρες ή περισσότεροι',
    signInCta: 'Σύνδεση', signUpCta: 'Δημιουργία',
    submitting: 'Παρακαλώ περιμένετε…',
    errInvalid: 'Λάθος email ή κωδικός.',
    errExists: 'Υπάρχει ήδη λογαριασμός με αυτό το email. Κάνε σύνδεση.',
    errGeneric: 'Κάτι πήγε στραβά. Δοκίμασε ξανά.',
  },
  de: {
    signInTab: 'Anmelden', signUpTab: 'Konto erstellen',
    email: 'E-Mail', password: 'Passwort',
    passwordHint: 'Mindestens 8 Zeichen',
    signInCta: 'Anmelden', signUpCta: 'Erstellen',
    submitting: 'Einen Moment…',
    errInvalid: 'E-Mail oder Passwort falsch.',
    errExists: 'Konto existiert bereits. Bitte anmelden.',
    errGeneric: 'Etwas ist schiefgelaufen.',
  },
  fr: {
    signInTab: 'Connexion', signUpTab: 'Créer un compte',
    email: 'Email', password: 'Mot de passe',
    passwordHint: '8 caractères minimum',
    signInCta: 'Se connecter', signUpCta: 'Créer',
    submitting: 'Un instant…',
    errInvalid: 'Email ou mot de passe incorrect.',
    errExists: 'Compte déjà existant. Connectez-vous.',
    errGeneric: 'Erreur. Réessayez.',
  },
  it: {
    signInTab: 'Accedi', signUpTab: 'Crea account',
    email: 'Email', password: 'Password',
    passwordHint: 'Almeno 8 caratteri',
    signInCta: 'Accedi', signUpCta: 'Crea',
    submitting: 'Un momento…',
    errInvalid: 'Email o password errati.',
    errExists: 'Account già esistente. Accedi.',
    errGeneric: 'Errore. Riprova.',
  },
};

export function SignInForm({
  locale, defaultMode = 'signin', next,
}: {
  locale: Locale;
  defaultMode?: Mode;
  next?: string;
}) {
  const t = LABELS[locale];
  const [mode, setMode] = useState<Mode>(defaultMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const res = await fetch('/api/auth/password', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password, mode }),
    });
    if (res.ok) {
      const dest = next && next.startsWith('/') ? next : `/${locale}/dashboard`;
      window.location.href = dest;
      return;
    }
    setBusy(false);
    const data = await res.json().catch(() => ({} as { error?: string }));
    if (data.error === 'invalid_credentials' || data.error === 'invalid_email' || data.error === 'invalid_password') {
      setError(t.errInvalid);
    } else if (data.error === 'account_exists') {
      setError(t.errExists);
    } else {
      setError(t.errGeneric);
    }
  }

  return (
    <div>
      <div className="mb-6 inline-flex rounded-full border border-[var(--color-bg-3)] bg-[var(--color-bg-1)] p-1 text-sm">
        <button
          type="button"
          onClick={() => { setMode('signin'); setError(null); }}
          className={`rounded-full px-4 py-1.5 transition ${
            mode === 'signin'
              ? 'bg-[var(--color-accent-pink)] text-[var(--color-bg-0)] shadow-[var(--shadow-glow-pink)]'
              : 'text-[var(--color-fg-1)] hover:text-[var(--color-fg-0)]'
          }`}
        >
          {t.signInTab}
        </button>
        <button
          type="button"
          onClick={() => { setMode('signup'); setError(null); }}
          className={`rounded-full px-4 py-1.5 transition ${
            mode === 'signup'
              ? 'bg-[var(--color-accent-pink)] text-[var(--color-bg-0)] shadow-[var(--shadow-glow-pink)]'
              : 'text-[var(--color-fg-1)] hover:text-[var(--color-fg-0)]'
          }`}
        >
          {t.signUpTab}
        </button>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block">
          <span className="text-xs uppercase tracking-widest text-[var(--color-fg-2)]">{t.email}</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-2 block w-full rounded-md border border-[var(--color-bg-3)] bg-[var(--color-bg-1)] px-3 py-2 text-[var(--color-fg-0)] focus:border-[var(--color-accent-cyan)] focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-widest text-[var(--color-fg-2)]">{t.password}</span>
          <input
            type="password"
            required
            minLength={8}
            maxLength={256}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-2 block w-full rounded-md border border-[var(--color-bg-3)] bg-[var(--color-bg-1)] px-3 py-2 text-[var(--color-fg-0)] focus:border-[var(--color-accent-cyan)] focus:outline-none"
          />
          <span className="mt-1 block text-xs text-[var(--color-fg-3)]">{t.passwordHint}</span>
        </label>

        {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-md bg-[var(--color-accent-pink)] px-4 py-2.5 text-sm font-semibold text-[var(--color-bg-0)] shadow-[var(--shadow-glow-pink)] disabled:opacity-60"
        >
          {busy ? t.submitting : mode === 'signin' ? t.signInCta : t.signUpCta}
        </button>
      </form>
    </div>
  );
}
