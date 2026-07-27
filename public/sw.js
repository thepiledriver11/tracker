// Hand-rolled service worker. Caches the app shell so a session can start cold
// with no network; network-first for navigations, cache-first for static assets.
const VERSION = "tt-v1";
const SHELL = `shell-${VERSION}`;
const RUNTIME = `runtime-${VERSION}`;

const SHELL_URLS = ["/today", "/session", "/offline.html", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((c) => c.addAll(SHELL_URLS).catch(() => {}))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => !k.endsWith(VERSION))
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Never cache the API or auth — always hit the network.
  if (url.pathname.startsWith("/api/")) return;

  // Navigations: network-first, fall back to cached shell, then offline page.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(RUNTIME).then((c) => c.put(req, copy));
          return res;
        })
        .catch(async () => {
          return (
            (await caches.match(req)) ||
            (await caches.match("/today")) ||
            (await caches.match("/offline.html"))
          );
        }),
    );
    return;
  }

  // Static assets (_next, fonts, icons): cache-first.
  if (
    url.pathname.startsWith("/_next/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/fonts/")
  ) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(RUNTIME).then((c) => c.put(req, copy));
            return res;
          }),
      ),
    );
  }
});

// Let the page cache the active program payload for cold offline starts.
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "CACHE_PROGRAM" && event.data.url) {
    caches
      .open(RUNTIME)
      .then((c) => c.add(event.data.url))
      .catch(() => {});
  }
});
