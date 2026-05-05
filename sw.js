// ── Drummer Chart Builder — Service Worker ────────────────────────────────
// Offline-First: App Shell wird beim ersten Laden gecacht.
// Danach funktioniert alles ohne Internet (ausser GitHub-Sync).

const CACHE_VERSION = "dcb-v3";
const CACHE_APP     = CACHE_VERSION + "-app";
const CACHE_FONTS   = CACHE_VERSION + "-fonts";
const CACHE_LIBS    = CACHE_VERSION + "-libs";

// ── App Shell: muss immer gecacht sein ───────────────────────────────
const APP_SHELL = [
  "./index.html",
  "./manifest.json"
];

// ── Externe Libraries: werden beim ersten Aufruf gecacht ─────────────
const LIB_URLS = [
  "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"
];

// ── Schriften: werden beim ersten Aufruf gecacht ──────────────────────
// (Google Fonts gibt CSS zurück, das weitere Font-Dateien lädt)
const FONT_ORIGINS = [
  "fonts.googleapis.com",
  "fonts.gstatic.com"
];

// ── Install: App Shell sofort cachen ─────────────────────────────────
self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_APP).then(cache =>
      Promise.allSettled(APP_SHELL.map(url =>
        cache.add(url).catch(e => console.warn("[SW] Cache miss:", url, e.message))
      ))
    )
  );
});

// ── Activate: alte Caches löschen ────────────────────────────────────
self.addEventListener("activate", event => {
  const currentCaches = [CACHE_APP, CACHE_FONTS, CACHE_LIBS];
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => !currentCaches.includes(k))
          .map(k => { console.log("[SW] Deleting old cache:", k); return caches.delete(k); })
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch: Strategie nach URL-Typ ─────────────────────────────────────
self.addEventListener("fetch", event => {
  const req = event.request;
  const url = new URL(req.url);

  // GitHub API: nie cachen — immer live
  if (url.hostname === "api.github.com") return;

  // GitHub Pages / gleiche Origin: Cache-First mit Netzwerk-Fallback
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirstWithRefresh(req, CACHE_APP));
    return;
  }

  // Google Fonts (CSS + Schriftdateien): Cache-First
  if (FONT_ORIGINS.includes(url.hostname)) {
    event.respondWith(cacheFirstStore(req, CACHE_FONTS));
    return;
  }

  // CDN Libraries (html2canvas, jspdf, pdfjs): Cache-First
  if (url.hostname === "cdnjs.cloudflare.com" ||
      url.hostname === "cdn.jsdelivr.net") {
    event.respondWith(cacheFirstStore(req, CACHE_LIBS));
    return;
  }
});

// ── Cache-First: aus Cache laden, bei Miss Netzwerk nutzen + cachen ──
async function cacheFirstStore(req, cacheName) {
  const cached = await caches.match(req);
  if (cached) return cached;
  try {
    const response = await fetch(req);
    if (response && response.status === 200 && response.type !== "error") {
      const cache = await caches.open(cacheName);
      cache.put(req, response.clone());
    }
    return response;
  } catch {
    return new Response("Offline – Ressource nicht verfügbar", { status: 503 });
  }
}

// ── Cache-First mit Hintergrund-Refresh für App Shell ────────────────
async function cacheFirstWithRefresh(req, cacheName) {
  const cached = await caches.match(req);
  // Im Hintergrund aktualisieren (Stale-While-Revalidate)
  const fetchAndUpdate = fetch(req).then(response => {
    if (response && response.status === 200) {
      caches.open(cacheName).then(c => c.put(req, response.clone()));
    }
    return response;
  }).catch(() => null);

  if (cached) return cached; // sofort aus Cache
  // Fallback: auf Netzwerk warten
  const fresh = await fetchAndUpdate;
  if (fresh) return fresh;
  // Offline-Fallback: index.html für Navigation
  if (req.mode === "navigate") {
    return caches.match("./index.html");
  }
  return new Response("Offline", { status: 503 });
}

// ── Nachrichten vom Haupt-Thread ──────────────────────────────────────
self.addEventListener("message", event => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
  if (event.data?.type === "CACHE_STATUS") {
    // Antworte mit Cache-Grösse (für Debug)
    Promise.all([CACHE_APP, CACHE_FONTS, CACHE_LIBS].map(async name => {
      const cache = await caches.open(name);
      const keys  = await cache.keys();
      return { name, count: keys.length };
    })).then(result => event.source?.postMessage({ type: "CACHE_STATUS_RESULT", result }));
  }
});

// ── Hintergrund-Sync (wenn online) ───────────────────────────────────
self.addEventListener("sync", event => {
  if (event.tag === "dcb-github-sync") {
    console.log("[SW] Hintergrund-Sync angestossen — App übernimmt.");
    // Die eigentliche Sync-Logik läuft im Haupt-Thread der App
    self.clients.matchAll().then(clients =>
      clients.forEach(c => c.postMessage({ type: "BACKGROUND_SYNC" }))
    );
  }
});
