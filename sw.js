// ── Drummer Chart Builder — Service Worker ────────────────────────────────
// Offline-first caching strategy
const CACHE_NAME = "dcb-v2";
const STATIC_ASSETS = [
  "./index.html",
  "./manifest.json",
  "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
  "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.269/build/pdf.min.mjs",
  "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.269/build/pdf.worker.min.mjs",
  "https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500;1,400&family=Syne:wght@400;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&display=swap"
];

// Install: cache all static assets
self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(
        STATIC_ASSETS.map(url =>
          cache.add(url).catch(err => console.warn("[SW] Could not cache:", url, err))
        )
      );
    })
  );
});

// Activate: clean old caches
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: Cache-first for assets, network-first for GitHub API
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);

  // Never intercept GitHub API calls
  if (url.hostname === "api.github.com") return;

  // For same-origin requests (the app itself): cache-first with network fallback
  if (url.origin === self.location.origin || event.request.url.startsWith("https://fonts.") ||
      event.request.url.startsWith("https://cdn.jsdelivr.net") ||
      event.request.url.startsWith("https://cdnjs.cloudflare.com")) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (!response || response.status !== 200) return response;
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        }).catch(() => {
          // Offline fallback for navigation
          if (event.request.mode === "navigate") {
            return caches.match("./index.html");
          }
        });
      })
    );
  }
});

// Background sync support (for future enhancement)
self.addEventListener("sync", event => {
  if (event.tag === "dcb-github-sync") {
    // Background sync handled by the main app
    console.log("[SW] Background sync triggered:", event.tag);
  }
});

// Push notifications (future)
self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
