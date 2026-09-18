/**
 * service-worker.js
 * Cache-first offline support so the game keeps working after the first
 * load, even with no connection. Bump CACHE_NAME whenever a shipped file
 * changes — the old cache is deleted on activate, the new one is filled
 * fresh, and nothing here ever touches player save data (that lives in
 * localStorage, which service workers can't see or clear).
 */

const CACHE_NAME = 'neonblock-cache-v2';

// Paths are relative to this file's own location so the game still works
// if it's served from a subfolder (e.g. GitHub Pages project sites).
const PRECACHE_URLS = [
  './',
  './index.html',
  './style.css',
  './manifest.json',
  './storage.js',
  './pieces.js',
  './board.js',
  './collision.js',
  './scoring.js',
  './audio.js',
  './particles.js',
  './effects.js',
  './achievements.js',
  './input.js',
  './ui.js',
  './stats.js',
  './settings.js',
  './game.js',
  './main.js',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-192.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          // Opportunistically cache same-origin assets fetched later
          // (e.g. a future icon) so they're available offline too.
          if (response.ok && new URL(event.request.url).origin === self.location.origin) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});
