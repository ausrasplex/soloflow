// SoloFlow service worker. It keeps only the app's own static files (icons, fonts, scripts) and an offline page.
// Pages and /api responses hold private financial data, so they are never cached: they always come from the server.
const VERSION = 'soloflow-v1';
const OFFLINE = '/offline.html';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll([OFFLINE, '/icon.svg', '/icon-192.png'])).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // pages: always from the network; the offline page when the server cannot be reached
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match(OFFLINE)));
    return;
  }
  // build files are named by their content, so a cached copy is always right
  if (url.pathname.startsWith('/_next/static/') || /\.(?:png|svg|woff2?|ico)$/.test(url.pathname)) {
    e.respondWith(caches.open(VERSION).then(async (c) => {
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) c.put(req, res.clone());
      return res;
    }));
  }
  // everything else (including /api) goes straight to the network
});
