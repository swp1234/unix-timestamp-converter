const CACHE_NAME = 'unix-timestamp-converter-v1';
const URLS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/app.js',
  './js/i18n.js'
];

self.addEventListener('install', function(event) {
  event.waitUntil(caches.open(CACHE_NAME).then(function(cache) {
    return cache.addAll(URLS_TO_CACHE);
  }).then(function() { return self.skipWaiting(); }));
});

self.addEventListener('activate', function(event) {
  event.waitUntil(caches.keys().then(function(keys) {
    return Promise.all(keys.filter(function(key) { return key !== CACHE_NAME; }).map(function(key) {
      return caches.delete(key);
    }));
  }).then(function() { return self.clients.claim(); }));
});

self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET') return;
  event.respondWith(fetch(event.request).then(function(response) {
    const copy = response.clone();
    caches.open(CACHE_NAME).then(function(cache) { cache.put(event.request, copy); });
    return response;
  }).catch(function() {
    return caches.match(event.request).then(function(response) {
      return response || caches.match('./index.html');
    });
  }));
});
