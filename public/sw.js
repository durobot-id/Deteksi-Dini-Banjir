// =============================================
// Service Worker — Flood Alert PWA
// Handles: caching, push notifications, background sync
// =============================================

const CACHE_NAME = 'Deteksi Dini Banjir';
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
  if (request.url.includes('firebase') || request.url.includes('googleapis') ||
      request.url.includes('bmkg') || request.url.includes('maps')) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/')));
    return;
  }
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});

// ---- Push Notification (dari FCM server) ----
self.addEventListener('push', (event) => {
  let data = { title: 'Peringatan Banjir', body: 'Ada update terbaru', status: 'siaga', ketinggian: 0 };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {}

  const statusEmoji = { aman: '✅', siaga: '⚠️', bahaya: '🌊', kritis: '🚨' };
  const emoji = statusEmoji[data.status] || '⚠️';
  const isUrgent = data.status === 'kritis' || data.status === 'bahaya';

  event.waitUntil(
    self.registration.showNotification(`${emoji} ${data.title}`, {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: `flood-${data.status}`,
      renotify: isUrgent,
      requireInteraction: isUrgent,
      vibrate: data.status === 'kritis' ? [500, 200, 500, 200, 500] : [300, 100, 300],
      data: { url: '/', status: data.status, ketinggian: data.ketinggian },
      actions: [
        { action: 'view', title: '📊 Lihat Dashboard' },
        { action: 'dismiss', title: 'Tutup' },
      ],
    })
  );
});

// ---- Notification Click ----
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
          client.postMessage({ type: 'NOTIFICATION_CLICK', data: event.notification.data });
          return;
        }
      }
      if (clients.openWindow) return clients.openWindow(appUrl);
    })
  );
});

// ---- Background Sync (opsional — kirim data yang gagal) ----
self.addEventListener('sync', (event) => {
  if (event.tag === 'flood-status-check') {
    event.waitUntil(checkFloodStatus());
  }
});

async function checkFloodStatus() {
  // Bisa digunakan untuk fetch Firebase dan trigger notif jika perlu
  console.log('[SW] Background sync: flood-status-check');
}

// ---- Message dari app ----
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
