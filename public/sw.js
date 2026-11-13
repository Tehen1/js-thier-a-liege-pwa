// Service worker minimal — JS du Thier à Liège
// Volontairement vanilla : pas d'import, pas de Workbox, pas de dépendance externe.
// Stratégie : cache d'abord, revalidation réseau en arrière-plan (stale-while-revalidate).

const CACHE_NAME = 'jsthier-static-v1';
const PRECACHE_URLS = ['/', '/index.html', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // Une URL absente ne doit pas faire échouer l'installation du worker.
      await Promise.all(PRECACHE_URLS.map((url) => cache.add(url).catch(() => {})));
    })()
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

// Le bouton « Mettre à jour » de /pwa.js attend ce message.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const networkResponse = fetch(request)
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return response;
        })
        .catch(() => cachedResponse || caches.match('/offline.html'));

      return cachedResponse || networkResponse;
    })
  );
});