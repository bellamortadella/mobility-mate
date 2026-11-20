// Offline support. Network first, so new versions show up right away;
// falls back to the last cached copy when there's no connection.
const CACHE = "mobilitymate-v4";
const SHELL = ["./", "index.html", "styles.css", "exercises.js", "app.js", "manifest.webmanifest?v=4", "icons/icon-192.png?v=4"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  // Same-origin files always revalidate with the server, so a new version shows on the next open.
  const sameOrigin = new URL(e.request.url).origin === self.location.origin;
  e.respondWith(
    (sameOrigin ? fetch(e.request.url, { cache: "no-cache" }) : fetch(e.request))
      .then((res) => {
        if (res.ok || res.type === "opaque") {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
