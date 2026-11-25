import type { MetadataRoute } from 'next';

// Makes SoloFlow installable as its own app window (no browser address bar or tabs).
// Browsers only offer a proper install over HTTPS (or on localhost); see docs/UNRAID.md.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'SoloFlow',
    short_name: 'SoloFlow',
    description: 'Bookkeeping for Australian sole traders: statements, categories, GST and BAS.',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui'],
    orientation: 'any',
    background_color: '#f1f1f4',
    theme_color: '#f1f1f4',
    categories: ['finance', 'business', 'productivity'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }
    ],
    shortcuts: [
      { name: 'Import a statement', url: '/statements', icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
      { name: 'Accounts', url: '/accounts', icons: [{ src: '/icon-192.png', sizes: '192x192' }] }
    ]
  };
}
