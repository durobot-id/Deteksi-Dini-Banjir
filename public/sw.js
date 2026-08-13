// =============================================
// Service Worker — FloodGuard PWA v3
// Background push: polling Firebase RTDB saat app ditutup
// =============================================

const CACHE_NAME      = 'floodguard-v3';
const STATIC_ASSETS   = ['/', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'];
const FIREBASE_DB_URL = 'https://deteksi-dini-banjir-349c3-default-rtdb.asia-southeast1.firebasedatabase.app';
const POLL_INTERVAL   = 30_000; // 30 detik

// State di-memory SW
let lastKnownStatus    = null;
let lastKnownLevel     = null;
let pollingTimer       = null;
let thresholds         = { AMAN: 50, SIAGA: 100, BAHAYA: 150, KRITIS: 200 };

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
  // Mulai polling saat SW aktif
  startPolling();
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
// ---- Background Polling Firebase ----
// =============================================

function startPolling() {
  if (pollingTimer) return;
  pollingTimer = setInterval(pollFirebase, POLL_INTERVAL);
  // Langsung poll sekali saat mulai
  pollFirebase();
}

function stopPolling() {
  if (pollingTimer) {
    clearInterval(pollingTimer);
    pollingTimer = null;
  }
}

async function pollFirebase() {
  // Jika ada client (app terbuka), biarkan app yang handle — skip polling
  const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  if (clientList.length > 0) {
    // App sedang terbuka — reset state agar sinkron dengan app
    return;
  }

  try {
    // Ambil data sensor dari Firebase RTDB (REST API, no SDK diperlukan)
    const [sensorRes, threshRes] = await Promise.all([
      fetch(`${FIREBASE_DB_URL}/sensor_data.json`),
      fetch(`${FIREBASE_DB_URL}/thresholds.json`),
    ]);

    if (!sensorRes.ok) return;
    const sensor = await sensorRes.json();
    if (!sensor) return;

    // Update thresholds jika ada
    if (threshRes.ok) {
      const th = await threshRes.json();
      if (th) thresholds = th;
    }

    const level  = typeof sensor.ketinggian === 'number' ? sensor.ketinggian : parseFloat(sensor.ketinggian || '0');
    const status = calcStatus(level);

    // Hanya notif jika status berubah
    if (lastKnownStatus !== null && status !== lastKnownStatus) {
      const prev = lastKnownStatus;
      // Notif hanya jika naik ke bahaya/kritis, atau turun ke aman dari bahaya/kritis
      const shouldNotify =
        (status === 'bahaya' || status === 'kritis') ||
        (status === 'aman' && (prev === 'bahaya' || prev === 'kritis'));

      if (shouldNotify) {
        await showFloodNotification(status, level);
      }
    }

    lastKnownStatus = status;
    lastKnownLevel  = level;
  } catch (err) {
    // Silent fail — jangan crash SW
    console.warn('[SW Poll] Error:', err);
  }
}

function calcStatus(level) {
  if (level >= thresholds.KRITIS) return 'kritis';
  if (level >= thresholds.BAHAYA) return 'bahaya';
  if (level >= thresholds.SIAGA)  return 'siaga';
  return 'aman';
}

async function showFloodNotification(status, level) {
  const isKritis = status === 'kritis';
  const isUrgent = status === 'kritis' || status === 'bahaya';

  const LABEL = { aman: 'AMAN', siaga: 'SIAGA', bahaya: 'BAHAYA', kritis: 'KRITIS' };
  const label  = LABEL[status] || 'SIAGA';

  const titles = {
    aman:   'Status Normal — Area Aman',
    siaga:  'Siaga — Pantau Ketinggian Air',
    bahaya: '⚠ PERINGATAN BAHAYA BANJIR',
    kritis: '🚨 SIAGA KRITIS — EVAKUASI SEGERA',
  };
  const bodies = {
    aman:   `Ketinggian air kembali normal: ${level.toFixed(1)} cm. Area dinyatakan aman.`,
    siaga:  `Ketinggian ${level.toFixed(1)} cm melewati batas siaga (${thresholds.SIAGA} cm). Harap waspada.`,
    bahaya: `Ketinggian ${level.toFixed(1)} cm melebihi batas bahaya (${thresholds.BAHAYA} cm). Bersiap evakuasi!`,
    kritis: `Ketinggian ${level.toFixed(1)} cm melampaui batas kritis (${thresholds.KRITIS} cm). Segera evakuasi!`,
  };

  const vibration = isKritis
    ? [600, 200, 600, 200, 600, 200, 600]
    : isUrgent
    ? [400, 150, 400, 150, 400]
    : [200, 100, 200];

  return self.registration.showNotification(`[${label}] ${titles[status]}`, {
    body:              bodies[status],
    icon:              '/icons/icon-192.png',
    badge:             '/icons/icon-192.png',
    tag:               `flood-bg-${status}`,
    renotify:          isUrgent,
    requireInteraction: isUrgent,
    silent:            false,
    vibrate:           vibration,
    timestamp:         Date.now(),
    data:              { url: '/', status, ketinggian: level },
    actions: isUrgent
      ? [
          { action: 'view',    title: 'Lihat Dashboard' },
          { action: 'dismiss', title: 'Tutup' },
        ]
      : [{ action: 'view', title: 'Lihat Dashboard' }],
  });
}

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

  event.waitUntil(showFloodNotification(data.status, Number(data.ketinggian)));
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
          client.postMessage({ type: 'NOTIFICATION_CLICK', data: event.notification.data });
          return;
        }
      }
      if (clients.openWindow) return clients.openWindow(appUrl);
    })
  );
});

// =============================================
// ---- Periodic Background Sync (Chrome) ----
// Backup untuk polling — browser yang support akan
// membangunkan SW secara periodik tanpa perlu interval
// =============================================
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'flood-check') {
    event.waitUntil(pollFirebase());
  }
});

// =============================================
// ---- Message dari app ----
// =============================================
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  // App kirim status terkini agar SW sinkron
  if (event.data?.type === 'STATUS_UPDATE') {
    lastKnownStatus = event.data.status;
    lastKnownLevel  = event.data.ketinggian;
    if (event.data.thresholds) thresholds = event.data.thresholds;
  }

  // App minta SW mulai/berhenti polling
  if (event.data?.type === 'START_POLLING') startPolling();
  if (event.data?.type === 'STOP_POLLING')  stopPolling();
});
