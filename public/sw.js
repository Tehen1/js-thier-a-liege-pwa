// JS Thier / Next App Router: same-origin, versioned offline cache.
// Keep the "jsthier-next-" prefix so activate() still purges the old Next caches.
const CACHE = 'jsthier-next-astro-20261105';
// Jsthier gallery assets 2026-11-05
const CORE = ['/', '/offline.html', '/manifest.webmanifest', '/app.js', '/pwa.js', '/safe-html.js', '/theme-init.js', '/theme.js', '/game.js', '/runner.js', '/board.js', '/images/crest.svg', '/icons/icon-192.png', '/icons/icon-512.png', '/images/halloween-party-2026-10-30.jpg', '/images/tournois-jeunes-mai.jpg', '/images/cotisations-2026-2027.jpg', '/images/recrutement-u10-u12-u17.jpg', '/images/reprise-entrainements.jpg', '/images/recrutement-u17-joueurs-gardiens.jpg', '/images/photo-equipe-jeunes-clubhouse.jpg'];
const isSafe = (url) => url.origin === self.location.origin && !url.pathname.startsWith('/api/') && !url.pathname.startsWith('/admin/') && !url.pathname.startsWith('/_next/data/') && !url.searchParams.has('_rsc');

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const responses = await Promise.allSettled(CORE.map(async (url) => {
      const response = await fetch(url, { cache: 'reload' });
      if (response.ok) await cache.put(url, response.clone());
      return response;
    }));
    // Next.js uses content-hashed JS/CSS assets. Precache those referenced by the homepage.
    const response = responses[0];
    if (response.status === 'fulfilled' && response.value.ok) {
      const markup = await response.value.clone().text();
      const paths = [...markup.matchAll(/(?:src|href)="(\/(?:_next\/static|_astro)\/[^"?#]+)"/g)].map((m) => m[1]);
      await Promise.allSettled([...new Set(paths)].map(async (path) => {
        const asset = await fetch(path, { cache: 'reload' });
        if (asset.ok) await cache.put(path, asset);
      }));
    }
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith('jsthier-next-') && key !== CACHE).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (!isSafe(url)) return;
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok && url.pathname === '/') {
          const cache = await caches.open(CACHE);
          await cache.put('/', response.clone());
        }
        return response;
      } catch {
        const cache = await caches.open(CACHE);
        return (url.pathname === '/' ? await cache.match('/') : null)
          || (await cache.match('/offline.html'))
          || Response.error();
      }
    })());
    return;
  }
  if (url.pathname.startsWith('/_astro/')) {
    event.respondWith(caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    }));
    return;
  }
  if (!/\.(?:js|css|webmanifest|svg|png|jpg|jpeg|webp|ico)$/.test(url.pathname)) return;
  event.respondWith(caches.open(CACHE).then(async (cache) => {
    try {
      const fresh = await fetch(request);
      if (fresh.ok) await cache.put(request, fresh.clone());
      return fresh;
    } catch {
      return (await cache.match(request)) || Response.error();
    }
  }));
});
