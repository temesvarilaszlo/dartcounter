importScripts('./precache.js');

const CACHE = `dartcounter-${self.PRECACHE.version}`;
const NETWORK_TIMEOUT_MS = 3000;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(self.PRECACHE.files))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(networkFirst(request));
});

// Network-first so stale code is never served while online; the timeout keeps
// the app usable on a weak signal by falling back to the cache.
async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  const network = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  });
  network.catch(() => {});

  try {
    return await Promise.race([network, timeout(NETWORK_TIMEOUT_MS)]);
  } catch {
    const cached = await cache.match(request, { ignoreSearch: true });
    return cached ?? network;
  }
}

function timeout(ms) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms));
}
