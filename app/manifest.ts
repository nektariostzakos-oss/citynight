import type { MetadataRoute } from 'next';

// Home-screen icons with the logo "Ζενίθ" (2026-09-17). display stays "browser": citynight is a
// website, not an offline app, so a saved shortcut simply opens the site.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'citynight',
    short_name: 'citynight',
    start_url: '/',
    display: 'browser',
    background_color: '#07070b',
    theme_color: '#07070b',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
