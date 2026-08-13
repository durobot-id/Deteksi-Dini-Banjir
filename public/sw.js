// =============================================
// Service Worker — FloodGuard PWA
// Handles: caching, push notifications, background sync
// =============================================

const CACHE_NAME = 'floodguard-v2';
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
// ---- Push Notification (dari FCM server) ----
// =============================================
self.addEventListener('push', (event) => {
  let data = {
    title: 'Peringatan Banjir',
    body: 'Ada perubahan status ketinggian air.',
    status: 'siaga',
    ketinggian: 0,
  };

  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {}

  const statusLabel = {
    aman: 'AMAN', siaga: 'SIAGA', bahaya: 'BAHAYA', kritis: 'KRITIS',
  };

  const label    = statusLabel[data.status] || 'SIAGA';
  const isUrgent = data.status === 'kritis' || data.status === 'bahaya';
  const isKritis = data.status === 'kritis';

  // Vibration pattern berdasarkan tingkat keparahan
  const vibration = isKritis
    ? [600, 200, 600, 200, 600, 200, 600]
    : isUrgent
    ? [400, 150, 400, 150, 400]
    : [200, 100, 200];

  const notifTitle = `[${label}] ${data.title}`;
  const notifBody  = `${data.body}\nKetinggian: ${Number(data.ketinggian).toFixed(1)} cm`;

  event.waitUntil(
    self.registration.showNotification(notifTitle, {
      body: notifBody,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: `flood-${data.status}`,
      renotify: isUrgent,
      requireInteraction: isUrgent,
      silent: false,
      vibrate: vibration,
      timestamp: Date.now(),
      data: { url: '/', status: data.status, ketinggian: data.ketinggian },
      actions: isUrgent
        ? [
            { action: 'view',    title: 'Lihat Dashboard' },
            { action: 'dismiss', title: 'Tutup' },
          ]
        : [
            { action: 'view', title: 'Lihat Dashboard' },
          ],
    })
  );
});

// =============================================
// ---- Notification Click ----
// =============================================
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  // Buka atau fokus ke tab app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const appUrl = event.notification.data?.url || '/';
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.postMessage({
            type: 'NOTIFICATION_CLICK',
            data: event.notification.data,
          });
          return;
        }
      }
      if (clients.openWindow) return clients.openWindow(appUrl);
    })
  );
});

// =============================================
// ---- Background Sync ----
// =============================================
self.addEventListener('sync', (event) => {
  if (event.tag === 'flood-status-check') {
    event.waitUntil(checkFloodStatus());
  }
});

async function checkFloodStatus() {
  console.log('[SW] Background sync: flood-status-check');
}

// ---- Message dari app ----
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
