// =============================================
// Service Worker — FloodGuard PWA v3
// Push notifications dikirim oleh push-server.js (Node.js)
// SW ini menerima event push dan menampilkan notifikasi
// =============================================

const CACHE_NAME    = 'floodguard-v3';
const STATIC_ASSETS = ['/', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'];

// ---- Install ----
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ---- Activate ----
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ---- Fetch (cache strategy) ----
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (
    request.url.includes('firebase') ||
    request.url.includes('googleapis') ||
    request.url.includes('bmkg') ||
    request.url.includes('maps')
  ) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/')));
    return;
  }
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});

// =============================================
// ---- Push Event (dari push-server.js via Web Push) ----
// Ini yang berjalan meski app ditutup/belum dibuka
// =============================================
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload = {};
  try { payload = event.data.json(); } catch { return; }

  const {
    title            = 'Peringatan Banjir',
    body             = '',
    status           = 'siaga',
    ketinggian       = 0,
    icon             = '/icons/icon-192.png',
    badge            = '/icons/icon-192.png',
    tag              = 'flood-push',
    renotify         = false,
    requireInteraction = false,
    vibrate          = [200, 100, 200],
    data             = {},
    actions          = [],
  } = payload;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      tag,
      renotify,
      requireInteraction,
      silent: false,
      vibrate,
      timestamp: Date.now(),
      data: { ...data, url: '/' },
      actions,
    })
  );
});

// =============================================
// ---- Notification Click ----
// =============================================
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const appUrl = event.notification.data?.url || '/';
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          return;
        }
      }
      if (clients.openWindow) return clients.openWindow(appUrl);
    })
  );
});

// ---- Message dari app ----
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
