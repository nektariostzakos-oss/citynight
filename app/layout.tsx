import type { Metadata, Viewport } from 'next';
import './globals.css';

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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_SCRIPT }} />
      </head>
      <body className="min-h-screen bg-[var(--color-bg-0)] text-[var(--color-fg-0)] antialiased">
        {children}
      </body>
    </html>
  );
}
