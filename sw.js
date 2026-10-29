/* Service worker de la JS Thier à Liège
 * - pré-cache l'application (page, styles, scripts, images) pour un usage hors ligne
 * - pages : réseau d'abord (contenu frais), cache si hors ligne, sinon page « hors ligne »
 * - fichiers du site : cache d'abord puis mise à jour en arrière-plan (rapide)
 * - ne touche jamais aux requêtes vers d'autres sites (Foot24, Facebook…)
 * Changer VERSION à chaque mise en ligne pour publier une mise à jour.
 */
const VERSION = 'v1-2026-10-29';
const CACHE = `jsthier-${VERSION}`;
const SHELL = [
  './',
  'index.html',
  'offline.html',
  'privacy.html',
  'style.css',
  'theme-init.js',
  'app.js',
  'pwa.js',
  'safe-html.js',
  'theme.js',
  'game.js',
  'runner.js',
  'board.js',
  'manifest.webmanifest',
  'images/crest.svg',
  'images/b529bf4e.png',
  'images/d6d4e380.png',
  'icons/maskable.svg',
];
const scopeURL = (p) => new URL(p, self.registration.scope).href;

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // un fichier manquant (ex. icônes PNG pas encore générées) ne bloque pas l'installation
    await Promise.allSettled(SHELL.map(async (p) => {
      const res = await fetch(scopeURL(p), { cache: 'reload' });
      if (res.ok) await cache.put(scopeURL(p), res);
    }));
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('jsthier-') && k !== CACHE).map((k) => caches.delete(k)));
    if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
    await self.clients.claim();
  })());
});

// la page demande d'activer tout de suite la nouvelle version (bouton « Mettre à jour »)
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

const timeout = (ms) => new Promise((_, ko) => setTimeout(() => ko(new Error('timeout')), ms));

async function networkFirst(event) {
  const cache = await caches.open(CACHE);
  try {
    const preload = await event.preloadResponse;
    const res = preload || await Promise.race([fetch(event.request), timeout(4000)]);
    if (res && res.ok && res.type === 'basic') cache.put(event.request, res.clone());
    return res;
  } catch {
    return (await cache.match(event.request, { ignoreSearch: true }))
      || (await cache.match(scopeURL('index.html')))
      || (await cache.match(scopeURL('offline.html')))
      || new Response('Hors ligne', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
}

async function staleWhileRevalidate(event) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(event.request, { ignoreSearch: true });
  const refresh = fetch(event.request)
    .then((res) => { if (res.ok && res.type === 'basic') cache.put(event.request, res.clone()); return res; })
    .catch(() => cached);
  if (cached) { event.waitUntil(refresh.then(() => {}, () => {})); return cached; }
  return refresh;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // autres sites : pas d'interception
  if (request.mode === 'navigate') return event.respondWith(networkFirst(event));
  event.respondWith(staleWhileRevalidate(event));
});
