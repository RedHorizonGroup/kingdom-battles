const CACHE = 'kingdom-battles-cinderwatch-v3';
const OLD_CACHES = ['kingdom-battles-cinderwatch-v2', 'kingdom-battles-fresh-v1'];
const ASSETS = ['./', './index.html', './styles.css', './game.js?v=3', './manifest.webmanifest', './sw.js', './favicon.svg'];

self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(Promise.all(OLD_CACHES.map(name => caches.delete(name))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    const copy = response.clone();
    caches.open(CACHE).then(cache => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match('./index.html'))));
});
