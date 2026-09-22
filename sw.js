const CACHE = 'kingdom-battles-cinderwatch-v4';
const OLD_CACHES = ['kingdom-battles-cinderwatch-v3', 'kingdom-battles-cinderwatch-v2', 'kingdom-battles-fresh-v1'];
const ASSETS = [
  './', './index.html', './styles.css', './game.js?v=4', './manifest.webmanifest', './sw.js', './favicon.svg',
  './assets/generated/title-crest.png',
  './assets/generated/doctrine-scout.png', './assets/generated/doctrine-archer.png',
  './assets/generated/doctrine-boss.png', './assets/generated/doctrine-cavalry.png',
  './assets/generated/doctrine-wizard.png', './assets/generated/doctrine-troll.png',
  './assets/generated/doctrine-catapult.png', './assets/generated/doctrine-dragon.png',
  './assets/generated/doctrine-ram.png', './assets/generated/doctrine-bomber.png',
  './assets/generated/doctrine-cannon.png', './assets/generated/doctrine-infernal.png'
];

self.addEventListener('install', event => event.waitUntil(
  caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
));
self.addEventListener('activate', event => event.waitUntil(
  Promise.all(OLD_CACHES.map(name => caches.delete(name))).then(() => self.clients.claim())
));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    const copy = response.clone();
    caches.open(CACHE).then(cache => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match('./index.html'))));
});