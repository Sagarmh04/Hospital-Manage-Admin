/* eslint-disable no-restricted-globals */
/* global self, caches, fetch */

const CACHE_NAME = "hospital-admin-v1";
const STATIC_CACHE_URLS = [
  "/",
  "/admin",
  "/login",
  "/manifest.json",
];

// Install event - cache static assets
self.addEventListener("install", (event) => {
  console.log("[Service Worker] Installing...");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Caching static assets");
      return cache.addAll(STATIC_CACHE_URLS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("[Service Worker] Activating...");
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("[Service Worker] Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network first, fallback to cache for offline support
self.addEventListener("fetch", (event) => {
  const { request } = event;
  
  // Skip non-GET requests
  if (request.method !== "GET") {
    return;
  }

  // Skip API requests from caching (always fetch fresh)
  if (request.url.includes("/api/")) {
    event.respondWith(fetch(request));
    return;
  }

  // Network first strategy with cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Clone the response
        const responseToCache = response.clone();

        // Cache the fetched response
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });

        return response;
      })
      .catch(() => {
        // If network fails, try to return cached version
        return caches.match(request).then((response) => {
          if (response) {
            return response;
          }
          
          // If no cache and no network, return a custom offline page
          // For now, just return a basic response
          return new Response("Offline - Please check your connection", {
            status: 503,
            statusText: "Service Unavailable",
            headers: new Headers({
              "Content-Type": "text/plain",
            }),
          });
        });
      })
  );
});

// Listen for messages from the client
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
