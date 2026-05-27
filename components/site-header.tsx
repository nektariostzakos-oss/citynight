import Link from 'next/link';
import { type Locale } from '@/lib/i18n';
import { SearchBox } from './search-box';
import { MobileMenu, type PopularCity } from './mobile-menu';
import { LangDropdown } from './lang-dropdown';
import { ThemeToggle } from './theme-toggle';
import { MegaMenu } from './mega-menu';
import { MoonIcon } from './nav-icons';
import { getCurrentUser } from '@/lib/auth/session';
import { AccountMenu } from './account-menu';

// App-feel header. Logo + mega-menu + utilities on the right. The right
// side adapts to auth state: signed-in users get an account dropdown
// (Dashboard / Sign out); visitors get Sign in + Make a site.

const AUTH_LABELS: Record<Locale, {
  signIn: string;
  makeASite: string;
}> = {
  en: { signIn: 'Sign in',   makeASite: 'Make a site' },
  el: { signIn: 'Είσοδος',   makeASite: 'Φτιάξε site' },
  de: { signIn: 'Anmelden',  makeASite: 'Site erstellen' },
  fr: { signIn: 'Connexion', makeASite: 'Créer un site' },
  it: { signIn: 'Accedi',    makeASite: 'Crea un sito' },
};

export async function SiteHeader({
  locale,
  popularCities = [],
}: {
  locale: Locale;
  popularCities?: PopularCity[];
}) {
  const user = await getCurrentUser();
  const t = AUTH_LABELS[locale];

  return (
    <header data-site-chrome="header" className="sticky top-0 z-40 border-b border-[var(--color-bg-2)]/80 bg-[color-mix(in_oklab,var(--color-bg-0)_75%,transparent)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        {/* Logo */}
        <Link href={`/${locale}`} className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-[var(--color-accent-pink)] to-[var(--color-accent-violet)] shadow-[var(--shadow-glow-pink)]">
            <MoonIcon className="h-4 w-4 text-[var(--color-bg-0)]" />
          </span>
          <span>
            <span className="text-[var(--color-fg-0)]">city</span>
            <span className="text-[var(--color-accent-pink)]">night</span>
          </span>
        </Link>

        {/* Desktop mega menu — hover panels for Cities / Nightlife / Food / Stay */}
        <MegaMenu locale={locale} />

        {/* Right side: search + theme + lang + auth + mobile menu */}
        <div className="flex items-center gap-2">
          <SearchBox locale={locale} />
          <ThemeToggle />
          <div className="hidden md:block">
            <LangDropdown current={locale} />
          </div>

          {/* Auth — signed-in users get a dropdown; visitors get inline links. */}
          {user ? (
            <AccountMenu
              locale={locale}
              email={user.email}
              name={user.name}
              role={user.role}
            />
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Link
                href={`/${locale}/sign-in`}
                className="rounded-md px-3 py-1.5 text-sm font-semibold text-[var(--color-fg-1)] hover:text-[var(--color-fg-0)]"
              >
                {t.signIn}
              </Link>
              <Link
                href={`/${locale}/sites/new`}
                className="rounded-md bg-[var(--color-accent-pink)] px-3 py-1.5 text-sm font-semibold text-[var(--color-bg-0)] shadow-[var(--shadow-glow-pink)] hover:brightness-110"
              >
                {t.makeASite}
              </Link>
            </div>
          )}

          <MobileMenu locale={locale} popularCities={popularCities} />
        </div>
      </div>
    </header>
  );
}
