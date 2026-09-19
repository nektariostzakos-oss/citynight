import type { Metadata, Viewport } from 'next';
import { Commissioner, Lilex } from 'next/font/google';
import './globals.css';

// Two faces, both self-hosted by next/font/google with `font-display: swap`
// and preloaded for the LCP. Commissioner (Kostas Bartsokas) carries the
// statements and the reading; Lilex carries every readout, where digits have
// to line up as they change. Subsets cover EN/DE/FR/IT (latin, latin-ext) and
// EL (greek). Direction A "Αντικύθηρα", products/citynight/design/tokens.md.
const commissioner = Commissioner({
  subsets: ['latin', 'latin-ext', 'greek'],
  weight: ['400', '500', '600'],
  display: 'swap',
  preload: true,
  variable: '--font-body-loaded',
});

const lilex = Lilex({
  subsets: ['latin', 'greek'],
  weight: ['400', '500'],
  display: 'swap',
  preload: false,
  variable: '--font-mono-loaded',
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://citynight.gr';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'citynight: Greece nightlife guide',
    template: '%s · citynight.gr',
  },
  description: 'The nightlife guide for Greece: clubs, rooftops, bouzoukia, beach clubs. Real venues, real photos, curated.',
  applicationName: 'citynight',
  formatDetection: { telephone: false, address: false, email: false },
  robots: { index: true, follow: true },
  // Icons come from the file conventions: app/favicon.ico, app/icon.svg,
  // app/apple-icon.png and app/manifest.ts (logo "Ζενίθ", 2026-09-17).
};

// Dark is the default and the operating system does not change it, so the
// browser chrome gets one colour: the dark ground. The script below sets the
// real `color-scheme` on <html> once the choice is known.
export const viewport: Viewport = {
  themeColor: '#0b0f14',
  colorScheme: 'light dark',
  width: 'device-width',
  initialScale: 1,
};

// Reads the persisted theme choice and applies the `theme-light` class BEFORE
// the browser paints, so users never see a flash of the wrong palette.
// `theme-ready` is added one frame later so later toggles cross-fade instead
// of snapping.
//
// Three choices are stored under `cn:theme`: 'dark', 'light' and 'sun'.
// 'sun' follows Athens, the editorial timezone of the site: light between
// sunrise and sunset, dark otherwise, and it flips itself at the crossing
// without a reload. Sun times are computed here (the sunrise equation, NOAA,
// accurate to about a minute) rather than fetched, because this runs before
// first paint and must not wait on a network call. Nothing is stored unless
// the visitor chooses: no stored choice follows the operating system.
//
// The resolver is exposed as `window.__cnTheme` so the toggle in
// components/theme-toggle.tsx applies a choice without duplicating any of it:
//   window.__cnTheme.get()            -> 'dark' | 'light' | 'sun' | null
//   window.__cnTheme.apply('sun')     -> stores the choice, paints, returns 'dark' | 'light'
//   window.__cnTheme.resolve('sun')   -> 'dark' | 'light', no side effects
const NO_FLASH_SCRIPT = `
(function(){
  var LAT = 37.9838, LNG = 23.7275; // Athens
  function sun(now){
    var jd = now/86400000 + 2440587.5;
    var n = Math.round(jd - 2451545.0 + LNG/360); // the transit nearest to now, at this longitude
    var js = n - LNG/360;
    var M = (357.5291 + 0.98560028*js) % 360, r = Math.PI/180;
    var C = 1.9148*Math.sin(M*r) + 0.02*Math.sin(2*M*r) + 0.0003*Math.sin(3*M*r);
    var L = (M + C + 180 + 102.9372) % 360;
    var jt = 2451545.0 + js + 0.0053*Math.sin(M*r) - 0.0069*Math.sin(2*L*r);
    var sd = Math.sin(L*r)*Math.sin(23.4397*r), cd = Math.cos(Math.asin(sd));
    var cw = (Math.sin(-0.833*r) - Math.sin(LAT*r)*sd) / (Math.cos(LAT*r)*cd);
    if (cw > 1 || cw < -1) return null; // never rises or never sets
    var w = Math.acos(cw)/r/360;
    var ms = function(j){ return (j - 2440587.5)*86400000; };
    return { rise: ms(jt - w), set: ms(jt + w) };
  }
  function resolve(choice){
    if (choice === 'light' || choice === 'dark') return choice;
    if (choice === 'sun') {
      var now = Date.now(), t = sun(now);
      if (t) return (now >= t.rise && now < t.set) ? 'light' : 'dark';
    }
    return 'dark';
  }
  var timer = null;
  function paint(choice){
    var theme = resolve(choice);
    var el = document.documentElement;
    el.classList.toggle('theme-light', theme === 'light');
    el.style.colorScheme = theme;
    el.setAttribute('data-theme-choice', choice || 'dark');
    if (timer) { clearTimeout(timer); timer = null; }
    if (choice === 'sun') {
      var now = Date.now(), t = sun(now);
      if (t) {
        var next = now < t.rise ? t.rise : (now < t.set ? t.set : t.rise + 86400000);
        timer = setTimeout(function(){ paint('sun'); }, Math.max(60000, Math.min(next - now + 1000, 21600000)));
      }
    }
    return theme;
  }
  function stored(){
    try {
      var v = localStorage.getItem('cn:theme');
      return (v === 'light' || v === 'dark' || v === 'sun') ? v : null;
    } catch(e) { return null; }
  }
  window.__cnTheme = {
    get: stored,
    resolve: resolve,
    apply: function(choice){
      try { localStorage.setItem('cn:theme', choice); } catch(e) {}
      return paint(choice);
    }
  };
  try {
    paint(stored() || 'dark');
    requestAnimationFrame(function(){ document.documentElement.classList.add('theme-ready'); });
  } catch(e) {}
})();
`;

// Root layout is locale-agnostic; per-locale lang attribute is set in app/[locale]/layout.tsx.
// '/' (no prefix) still uses this layout for the soft-default landing surface.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${commissioner.variable} ${lilex.variable}`} suppressHydrationWarning>
      <head>
        {/* DNS + TLS warm-up for the two image CDNs we hit most often. Saves
            ~100ms on the first photo render on a fresh connection. Add more
            here only if you actually see them in WebPageTest's waterfall. */}
        <link rel="preconnect" href="https://images.pexels.com" crossOrigin="" />
        <link rel="preconnect" href="https://lh3.googleusercontent.com" crossOrigin="" />
        {/* Search-console verification: set the env on Hostinger to the
            content value GSC / Bing give you in the meta-tag verification
            flow. We render only when set; absent env = no tag. */}
        {process.env.GSC_VERIFICATION && (
          <meta name="google-site-verification" content={process.env.GSC_VERIFICATION} />
        )}
        {process.env.BING_VERIFICATION && (
          <meta name="msvalidate.01" content={process.env.BING_VERIFICATION} />
        )}
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_SCRIPT }} />
      </head>
      <body className="min-h-screen bg-[var(--color-ground)] text-[var(--color-ink)] antialiased">
        {children}
      </body>
    </html>
  );
}
