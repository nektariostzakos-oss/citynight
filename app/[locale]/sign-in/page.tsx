import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { isLocale, type Locale } from '@/lib/i18n';
import { SignInForm } from '@/components/sign-in-form';
import { GoogleSignInButton } from '@/components/google-signin-button';
import { privateMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = privateMetadata({ title: 'Sign in — citynight' });

const COPY: Record<Locale, { h1: string; sub: string; errors: Record<string, string> }> = {
  en: {
    h1: 'Sign in',
    sub: 'Continue with Google, or sign in with your email and password. New? Switch to "Create account" below.',
    errors: {
      state_mismatch: 'Sign-in session expired. Please try again.',
      missing_flow_cookies: 'Sign-in session expired. Please try again.',
      email_not_verified: 'Your Google email address must be verified.',
      token_exchange_failed: 'Google sign-in failed. Please try again.',
      account_linked_to_other_google: 'This email is already linked to a different Google account.',
    },
  },
  el: {
    h1: 'Σύνδεση',
    sub: 'Συνέχισε με Google ή με email + κωδικό. Νέος; Διάλεξε «Δημιουργία λογαριασμού» παρακάτω.',
    errors: {
      state_mismatch: 'Η σύνδεση έληξε. Δοκίμασε ξανά.',
      missing_flow_cookies: 'Η σύνδεση έληξε. Δοκίμασε ξανά.',
      email_not_verified: 'Το email του Google πρέπει να είναι επιβεβαιωμένο.',
      token_exchange_failed: 'Η σύνδεση με Google απέτυχε. Δοκίμασε ξανά.',
      account_linked_to_other_google: 'Αυτό το email είναι ήδη συνδεδεμένο με άλλον Google λογαριασμό.',
    },
  },
  de: {
    h1: 'Anmelden',
    sub: 'Mit Google fortfahren oder einen einmaligen E-Mail-Link erhalten. Kein Passwort.',
    errors: {
      state_mismatch: 'Sitzung abgelaufen. Bitte erneut versuchen.',
      missing_flow_cookies: 'Sitzung abgelaufen. Bitte erneut versuchen.',
      email_not_verified: 'Ihre Google-E-Mail-Adresse muss verifiziert sein.',
      token_exchange_failed: 'Google-Anmeldung fehlgeschlagen.',
      account_linked_to_other_google: 'Diese E-Mail ist bereits mit einem anderen Google-Konto verknüpft.',
    },
  },
  fr: {
    h1: 'Connexion',
    sub: "Continuez avec Google ou recevez un lien à usage unique par email. Sans mot de passe.",
    errors: {
      state_mismatch: 'Session expirée. Réessayez.',
      missing_flow_cookies: 'Session expirée. Réessayez.',
      email_not_verified: 'Votre email Google doit être vérifié.',
      token_exchange_failed: 'La connexion Google a échoué.',
      account_linked_to_other_google: 'Cet email est déjà lié à un autre compte Google.',
    },
  },
  it: {
    h1: 'Accedi',
    sub: 'Continua con Google o ricevi un link monouso via email. Niente password.',
    errors: {
      state_mismatch: 'Sessione scaduta. Riprova.',
      missing_flow_cookies: 'Sessione scaduta. Riprova.',
      email_not_verified: 'La tua email Google deve essere verificata.',
      token_exchange_failed: 'Accesso con Google fallito.',
      account_linked_to_other_google: 'Questa email è già collegata a un altro account Google.',
    },
  },
};

export default async function SignInPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { error, next } = await searchParams;
  const c = COPY[locale];
  const errorMsg = error ? c.errors[error] ?? null : null;
  // Google OAuth is only offered when the client ID is configured — otherwise
  // the start endpoint would throw on the server. Magic-link works without it.
  const googleEnabled = Boolean(process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET);

  return (
    <section className="mx-auto w-full max-w-md px-6 py-20">
      <h1 className="font-display text-3xl font-semibold tracking-tight">{c.h1}</h1>
      <p className="mt-2 text-[var(--color-fg-1)]">{c.sub}</p>

      {errorMsg && (
        <p className="mt-6 rounded-md border border-[var(--color-danger)]/50 bg-[var(--color-danger)]/10 px-3 py-2 text-sm text-[var(--color-danger)]">
          {errorMsg}
        </p>
      )}

      <div className="mt-8 space-y-5">
        {googleEnabled && <GoogleSignInButton locale={locale} next={next} />}
        <SignInForm locale={locale} next={next} />
      </div>
    </section>
  );
}
