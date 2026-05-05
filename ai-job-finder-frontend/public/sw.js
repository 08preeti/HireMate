/* HireMate Service Worker */
const CACHE_NAME = "hiremate-v1";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/static/js/main.js",
  "/manifest.json",
  "/logo192.png",
  "/logo512.png",
];

// Install - cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

// Activate - clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch - serve from cache, fall back to network
self.addEventListener("fetch", (event) => {
  // Skip API calls - always fetch from network
  if (event.request.url.includes("/api/") || 
      event.request.url.includes("onrender.com") ||
      event.request.url.includes("twilio") ||
      event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          // Cache successful responses
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone);
            });
          }
          return response;
        })
        .catch(() => {
          // Offline fallback - return cached home page
          if (event.request.destination === "document") {
            return caches.match("/");
          }
        });
    })
  );
});

// Push notifications (future use)
self.addEventListener("push", (event) => {
  const data = event.data?.json() || {};
  event.waitUntil(
    self.registration.showNotification(data.title || "HireMate", {
      body: data.body || "New job available near you!",
      icon: "/logo192.png",
      badge: "/logo192.png",
      data: { url: data.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || "/")
  );
});