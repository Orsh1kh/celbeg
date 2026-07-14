// ═══════════════════════════════════════════════════════════
// CELBEG.MN — Service Worker
// ───────────────────────────────────────────────────────────
// • Static asset-ыг cache-т хадгална (offline боломж)
// • Supabase болон гадаад API-г огт cache-хийхгүй, шууд network-т
// • HTML navigation: network-first (шинэ deploy-г шуурхай авна),
//   offline үед cached index.html
// ═══════════════════════════════════════════════════════════

const CACHE_VERSION = 'celbeg-v1';
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/img/favicon.svg',
  '/img/icon-192.svg',
  '/img/icon-512.svg',
  '/img/icon-maskable.svg',
  '/img/no-photo.svg',
];

// ── install: pre-cache core shell ─────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

// ── activate: purge old caches ────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── fetch: routing ────────────────────────────────────────
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  // GET only — POST/PUT/DELETE-г огт хамруулахгүй
  if (req.method !== 'GET') return;

  // Skip cross-origin (Supabase, Google Fonts CDN, jsdelivr)
  if (url.origin !== self.location.origin) return;

  // Skip Supabase бүх дуудалт (магадгүй ижил origin биш ч)
  if (url.hostname.includes('supabase')) return;

  // HTML navigation: network-first
  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith(
      fetch(req)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_VERSION).then(c => c.put(req, clone));
          return res;
        })
        .catch(() => caches.match(req).then(cached => cached || caches.match('/')))
    );
    return;
  }

  // Same-origin static assets: cache-first with background revalidate
  event.respondWith(
    caches.match(req).then(cached => {
      const fetchAndUpdate = fetch(req).then(res => {
        if (res && res.ok) {
          const clone = res.clone();
          caches.open(CACHE_VERSION).then(c => c.put(req, clone));
        }
        return res;
      }).catch(() => cached);
      return cached || fetchAndUpdate;
    })
  );
});

// ── message: manual skipWaiting (upgrade hook) ────────────
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
