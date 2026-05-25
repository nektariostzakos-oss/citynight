import Link from 'next/link';
import { type Locale } from '@/lib/i18n';
import { SearchBox } from './search-box';
import { MobileMenu, type PopularCity } from './mobile-menu';
import { LangDropdown } from './lang-dropdown';
import { ThemeToggle } from './theme-toggle';
import { MegaMenu } from './mega-menu';
import { MoonIcon } from './nav-icons';

// App-feel header. Desktop = futuristic mega menu (MegaMenu component handles
// the hover/click panels). Mobile = small hamburger that opens the animated
// drawer in MobileMenu.

export function SiteHeader({
  locale,
  popularCities = [],
}: {
  locale: Locale;
  popularCities?: PopularCity[];
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-bg-2)]/80 bg-[color-mix(in_oklab,var(--color-bg-0)_75%,transparent)] backdrop-blur-xl">
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

        {/* Right side: search trigger + theme toggle + language + mobile menu */}
        <div className="flex items-center gap-2">
          <SearchBox locale={locale} />
          <ThemeToggle />
          <div className="hidden md:block">
            <LangDropdown current={locale} />
          </div>
          <MobileMenu locale={locale} popularCities={popularCities} />
        </div>
      </div>
    </header>
  );
}
