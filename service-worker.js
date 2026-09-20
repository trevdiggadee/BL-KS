/**
 * service-worker.js
 * Network-first for HTML/CSS/JS so updates appear immediately.
 * Cache-first only for heavy static assets (images, mp3).
 * Bump CACHE_NAME when you change this file.
 */

const CACHE_NAME = 'bloks-cache-v16';

const PRECACHE_URLS = [
  './',
  './index.html',
  './style.css',
  './MenuBG.JPG',
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
  './modes.js',
  './mindbender.js',
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
  './Level-1.mp3',
  './Level-2.mp3',
  './Level-3.mp3',
  './Level-4.mp3',
  './Level-5.mp3',
];

// Files that should always try the network first (so edits show up right away)
const NETWORK_FIRST = [
  'index.html',
  'style.css',
  'main.js',
  'game.js',
  'audio.js',
  'ui.js',
  'settings.js',
  'service-worker.js',
  'pieces.js', 'board.js', 'collision.js', 'scoring.js', 'particles.js', 'effects.js', 'achievements.js', 'modes.js', 'mindbender.js', 'input.js', 'stats.js',
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

function isNetworkFirst(url) {
  const path = new URL(url).pathname;
  return NETWORK_FIRST.some((f) => path.endsWith('/' + f) || path.endsWith(f));
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = event.request.url;

  // Network-first for HTML / CSS / key JS so changes appear immediately
  if (isNetworkFirst(url)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then((c) => c || caches.match('./index.html')))
    );
    return;
  }

  // Cache-first for images, mp3, icons, etc.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
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
