// Cloudflare Worker for js_thier_pwa PWA
// Handles PWA routing and caching

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
});

async function handleRequest(request) {
  const url = new URL(request.url);
  
  // PWA asset caching
  if (url.pathname.startsWith('/images/') || 
      url.pathname.startsWith('/icons/') ||
      url.pathname === '/manifest.webmanifest' ||
      url.pathname === '/sw.js') {
    
    // Cache PWA assets for better performance
    const cache = caches.default;
    const response = await cache.match(request);
    
    if (response) {
      return response;
    }
    
    const fetchResponse = await fetch(request);
    if (fetchResponse.ok) {
      const cacheResponse = new Response(fetchResponse.body, {
        status: fetchResponse.status,
        statusText: fetchResponse.statusText,
        headers: fetchResponse.headers
      });
      cache.put(request, cacheResponse.clone());
      return cacheResponse;
    }
  }
  
  // Forward other requests
  return fetch(request);
}
