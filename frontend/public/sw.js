// Only content-addressed public bundles need an offline cache. Private requests
// and navigation go through the browser's normal request/authorization path.
const bundleCache = 'botlyn-bundles-v3';
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (/^botcraft-(?:(?:static|dynamic)-)?v\d+$/.test(key) ||
          (key.startsWith('botlyn-bundles-') && key !== bundleCache)) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || request.headers.has('Authorization') || url.origin !== self.location.origin ||
      !/^\/assets\/[\w.-]+-[\w-]{8,}\.(?:js|css)$/.test(url.pathname) || url.search) return;
  event.respondWith((async () => {
    const cache = await caches.open(bundleCache);
    const hit = await cache.match(request);
    if (hit) return hit;
    const response = await fetch(request, {credentials: 'omit'});
    const contentType = response.headers.get('Content-Type') || '';
    const bundleType = url.pathname.endsWith('.css') ? /^text\/css\b/i : /^(?:text|application)\/javascript\b/i;
    if (response.ok && !response.redirected && bundleType.test(contentType) &&
        !/private|no-store/i.test(response.headers.get('Cache-Control') || '')) {
      await cache.put(request, response.clone());
    }
    return response;
  })());
});
