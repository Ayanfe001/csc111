const CACHE_NAME = 'horly-cbt-v1.0.1';

// List all the files your app needs to work offline
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './launchericon-192x192.png',
  './launchericon-512x512.png',
  './questions/cos.js',
  './questions/phy.js',
  './questions/csc.js',
  './questions/vos.js',
  './questions/vos117.js',
  './questions/gns113.js',
  './questions/gst112.js',
  './questions/csc124.js'
];

// 1. Install Event: Cache all assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Caching offline assets');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  // Force the waiting service worker to become the active service worker.
  self.skipWaiting();
});

// 2. Activate Event: Clean up old caches if you update the version
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Clearing old cache');
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. Fetch Event: Serve from cache first, then network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Return cached file if found, otherwise fetch from the internet
      return cachedResponse || fetch(event.request);
    })
  );
});
