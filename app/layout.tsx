import type { Metadata, Viewport } from 'next';
import { Manrope } from 'next/font/google';
import './globals.css';

// next/font/google self-hosts the font + auto-emits `font-display: swap`
// + preloads the LCP-critical files automatically. We constrain the variable
// font to the three weights actually used in the codebase (medium 500 for
// body chrome, semibold 600 for most display headings, bold 700 for stats
// + emphasis). Subsets cover EN/DE/FR/IT (latin + latin-ext for ä/ö/é) and
// EL (greek).
const manrope = Manrope({
  subsets: ['latin', 'latin-ext', 'greek'],
  weight: ['500', '600', '700'],
  display: 'swap',
  preload: true,
  variable: '--font-display-loaded',
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://citynight.gr';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'citynight — Greece nightlife guide',
    template: '%s · citynight.gr',
  },
  description: 'The nightlife guide for Greece — clubs, rooftops, bouzoukia, beach clubs. Real venues, real photos, curated.',
  applicationName: 'citynight',
  formatDetection: { telephone: false, address: false, email: false },
  robots: { index: true, follow: true },
  icons: { icon: '/favicon.ico' },
};

// `color-scheme: light dark` lets the browser pick form/scrollbar colours
// based on the actual <html> class set by the no-flash script below.
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)',  color: '#07070b' },
    { media: '(prefers-color-scheme: light)', color: '#f7f7fa' },
  ],
  colorScheme: 'light dark',
  width: 'device-width',
  initialScale: 1,
};

// Reads the persisted theme choice (or the OS preference) and applies the
// `theme-light` class BEFORE the browser paints, so users never see a flash
// of the wrong palette. `theme-ready` is added one frame later so subsequent
// toggles cross-fade instead of snapping.
const NO_FLASH_SCRIPT = `
(function(){
  try {
    var stored = localStorage.getItem('cn:theme');
    var prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    var theme = stored || (prefersLight ? 'light' : 'dark');
    if (theme === 'light') document.documentElement.classList.add('theme-light');
    document.documentElement.style.colorScheme = theme;
    requestAnimationFrame(function(){ document.documentElement.classList.add('theme-ready'); });
  } catch(e) {}
})();
`;

// Root layout is locale-agnostic; per-locale lang attribute is set in app/[locale]/layout.tsx.
// '/' (no prefix) still uses this layout for the soft-default landing surface.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={manrope.variable} suppressHydrationWarning>
      <head>
        {/* DNS + TLS warm-up for the two image CDNs we hit most often. Saves
            ~100ms on the first photo render on a fresh connection. Add more
            here only if you actually see them in WebPageTest's waterfall. */}
        <link rel="preconnect" href="https://images.pexels.com" crossOrigin="" />
        <link rel="preconnect" href="https://lh3.googleusercontent.com" crossOrigin="" />
        {/* Search-console verification — set the env on Hostinger to the
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
      <body className="min-h-screen bg-[var(--color-bg-0)] text-[var(--color-fg-0)] antialiased">
        {children}
      </body>
    </html>
  );
}
