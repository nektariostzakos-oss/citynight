import Link from 'next/link';
import { type Locale } from '@/lib/i18n';
import { MobileMenu, type PopularCity } from './mobile-menu';
import { LangDropdown } from './lang-dropdown';
import { ThemeToggle } from './theme-toggle';
import { MegaMenu, type MegaMenuPulse } from './mega-menu';
import { MoonIcon } from './nav-icons';
import { getCurrentUser } from '@/lib/auth/session';
import { AccountMenu } from './account-menu';
import { getCityWeather, weatherLabel } from '@/lib/weather';
import { listPublishedArticles } from '@/lib/articles';
import { formatAthensTime } from '@/lib/format-date';
import { db } from '@/db';

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

  // Phase K.7 — live signals piped to the mega-menu so the dropdown
  // shows "TONIGHT IN GREECE · 23:00 · 22° clear" + a freshest-article
  // card. All three reads are cheap (Athens weather is in-process
  // cached 15min; the article query is one indexed row).
  const pulse = await loadMegaMenuPulse(locale);

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

        {/* Desktop mega menu — Cities dropdown with live tonight strip
            (Athens time + weather) and the freshest article card. */}
        <MegaMenu locale={locale} pulse={pulse} />

        {/* Right side: theme + lang + auth + mobile menu.
            Search was removed — discovery happens through the Cities
            mega-menu (filter input + nearest cities + areas) instead of
            a separate global search box. */}
        <div className="flex items-center gap-2">
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
            // Phase J.5 — SaaS "Make a site" CTA moved out of the header.
            // /for-owners is reachable from the footer; the editorial nav
            // reserves the prominent slot for the article-led product.
            <div className="hidden items-center md:flex">
              <Link
                href={`/${locale}/sign-in`}
                className="rounded-md px-3 py-1.5 text-sm font-semibold text-[var(--color-fg-1)] hover:text-[var(--color-fg-0)]"
              >
                {t.signIn}
              </Link>
            </div>
          )}

          <MobileMenu locale={locale} popularCities={popularCities} />
        </div>
      </div>
    </header>
  );
}

// ─── live pulse loader ────────────────────────────────────────────────

async function loadMegaMenuPulse(locale: Locale): Promise<MegaMenuPulse> {
  // Athens coords (national pulse — citynight is Greek-only). One cached
  // Open-Meteo fetch per 15 minutes, shared across every visitor.
  const weather = await getCityWeather(37.9838, 23.7275);
  const w = weather
    ? {
        tempC: Math.round(weather.temperatureC),
        emoji: weatherLabel(weather.weatherCode, locale).emoji,
        label: weatherLabel(weather.weatherCode, locale).text,
      }
    : null;

  // Freshest published article for the locale + the city it belongs to.
  const [latest] = listPublishedArticles(locale, { limit: 1 });
  let latestArticle: MegaMenuPulse['latestArticle'] = null;
  if (latest) {
    const city = db.$client.prepare(
      `SELECT slug, name FROM cities WHERE id = ?`,
    ).get(latest.cityId) as { slug: string; name: string } | undefined;
    if (city) {
      latestArticle = {
        title: latest.title,
        url: `/${locale}/cities/${city.slug}/${latest.slug}`,
        cityName: city.name,
        coverUrl: latest.coverUrl,
      };
    }
  }

  // Phase K.9 / K.12 — all seeded areas + parent city. We no longer
  // require the area itself to have lat/lng; when it doesn't, the parent
  // city's coords are used so client-side haversine still works. Without
  // this, the "Popular areas" column was silently restricted to the ~14
  // areas with their own coords (Athens + Mykonos seeds) instead of the
  // ~100 areas the rest of Greece carries.
  const areas = db.$client.prepare(`
    SELECT a.slug, a.name,
           COALESCE(a.lat, c.lat) AS lat,
           COALESCE(a.lng, c.lng) AS lng,
           c.name AS cityName, c.slug AS citySlug
      FROM areas a
      JOIN cities c ON c.id = a.city_id
     WHERE COALESCE(a.lat, c.lat) IS NOT NULL
       AND COALESCE(a.lng, c.lng) IS NOT NULL
       AND c.is_published = 1
  `).all() as MegaMenuPulse['areas'];

  // Phase K.10 — headline destinations strip. Pre-fetch current weather
  // for 5 iconic cities in parallel. Each call is 15-min in-process
  // cached + Next ISR cached, so this resolves to ~ 0 ms on warm cache.
  const destinationSlugs = [
    'athens', 'mykonos', 'santorini', 'thessaloniki', 'rhodes',
    'heraklion', 'corfu', 'chania', 'nafplio', 'paros',
  ];
  const destinationRows = db.$client.prepare(
    `SELECT slug, name, lat, lng FROM cities WHERE slug IN (${destinationSlugs.map(() => '?').join(',')}) AND is_published = 1`,
  ).all(...destinationSlugs) as Array<{ slug: string; name: string; lat: number | null; lng: number | null }>;

  const destinations = await Promise.all(
    destinationRows.map(async (row) => {
      const wx = row.lat != null && row.lng != null
        ? await getCityWeather(row.lat, row.lng)
        : null;
      return {
        citySlug: row.slug,
        cityName: row.name,
        tempC: wx ? Math.round(wx.temperatureC) : null,
        emoji: wx ? weatherLabel(wx.weatherCode, locale).emoji : null,
      };
    }),
  );

  // Preserve the requested display order (Athens, Mykonos, Santorini, …)
  // regardless of DB row order.
  const orderedDestinations = destinationSlugs
    .map((slug) => destinations.find((d) => d.citySlug === slug))
    .filter((d): d is MegaMenuPulse['destinations'][number] => !!d);

  return {
    athensTime: formatAthensTime(new Date(), locale),
    weather: w,
    latestArticle,
    areas,
    destinations: orderedDestinations,
  };
}
