
const CACHE_NAME = 'corricion-v3-persist';
const ASSETS = [
  './',
  './index.html',
  './index.js',
  './App.js',
  './icon.png',
  './manifest.json',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://cdn.tailwindcss.com'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Basic handler to keep the SW responsive during tracking
self.addEventListener('fetch', (event) => {
  // If we are tracking, we want to ensure the SW is seen as "busy" or active
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// Logic to handle background tasks if requested by the app
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'gps-keepalive') {
    console.log('SW: Keeping process alive via periodic sync');
  }
});
