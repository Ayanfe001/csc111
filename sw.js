// BUMPED VERSION: Forces phones to update the service worker
const CACHE_NAME = 'horly-cbt-v2.0.2'; 

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './launchericon-192x192.png',
  './launchericon-512x512.png',
  './questions/first/cos.js',
  './questions/first/phy.js',
  './questions/first/csc.js',
  './questions/vos.js',
  './questions/vos117.js',
  './questions/gns113.js',
  './questions/second/gst112.js',
  './questions/second/csc124.js',
  './questions/second/csc122.js'
];

// 1. Install Event: Cache all assets safely
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Caching offline assets...');
      // .addAll can fail if a single file is missing. 
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
          console.error("Warning: Some files failed to cache.", err);
      });
    })
  );
  self.skipWaiting(); 
});

// 2. Activate Event: Delete old versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Clearing old cache: ', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. Fetch Event: Network-First with Bulletproof Offline Fallback
self.addEventListener('fetch', (event) => {
  // Only intercept standard GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Internet is ON: Save newest version to cache and show it
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      })
      .catch(() => {
        // Internet is OFF: Look in the cache. 
        // ignoreSearch: true ignores the ?source=pwa tags Android adds
        return caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // If the file is still not found, but they are trying to load the app, force load index.html
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html', { ignoreSearch: true });
          }
        });
      })
  );
});