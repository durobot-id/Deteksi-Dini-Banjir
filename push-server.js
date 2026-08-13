/**
 * push-server.js — FloodGuard Background Push Notification Server
 *
 * Jalankan dengan: npm run push
 * Server ini berjalan terpisah dari Next.js, memantau Firebase RTDB
 * setiap detik dan mengirim Web Push ke semua subscriber meski app ditutup.
 *
 * Tidak perlu firebase-admin atau service account — hanya REST API + web-push.
 */

const webpush = require('web-push');

// ── Konfigurasi ─────────────────────────────────────────────────────────────
const FIREBASE_DB_URL = 'https://deteksi-dini-banjir-349c3-default-rtdb.asia-southeast1.firebasedatabase.app';
const VAPID_PUBLIC    = 'BBJv7NZirkT6p4UpCjRIaFAnO80QjG2q6_iR1rXmcrDLOtcGxNkGWCqrQpY4znQ3I2eANysig24g4HcL2aFcuek';
const VAPID_PRIVATE   = 'TCaY5268eqN8NWoNrAEdmaNIPomBBljr6ZAutwzsN_U';
const VAPID_EMAIL     = 'mailto:admin@floodguard.local';
const POLL_MS         = 1000; // 1 detik

webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);

// ── State ────────────────────────────────────────────────────────────────────
let lastStatus    = null;
let lastLevel     = null;
let thresholds    = { AMAN: 50, SIAGA: 100, BAHAYA: 150, KRITIS: 200 };
let isFirstPoll   = true;

function calcStatus(level) {
  if (level >= thresholds.KRITIS) return 'kritis';
  if (level >= thresholds.BAHAYA) return 'bahaya';
  if (level >= thresholds.SIAGA)  return 'siaga';
  return 'aman';
}

// ── Buat konten notifikasi ────────────────────────────────────────────────────
function buildContent(status, level) {
  const LABEL = { aman: 'AMAN', siaga: 'SIAGA', bahaya: 'BAHAYA', kritis: 'KRITIS' };
  const titles = {
    aman:   'Status Normal — Area Aman',
    siaga:  'Siaga — Pantau Ketinggian Air',
    bahaya: 'PERINGATAN BAHAYA BANJIR',
    kritis: 'SIAGA KRITIS — EVAKUASI SEGERA',
  };
  const bodies = {
    aman:   `Ketinggian air kembali normal: ${level.toFixed(1)} cm. Area dinyatakan aman.`,
    siaga:  `Ketinggian ${level.toFixed(1)} cm melewati batas siaga (${thresholds.SIAGA} cm). Harap waspada.`,
    bahaya: `Ketinggian ${level.toFixed(1)} cm melebihi batas bahaya (${thresholds.BAHAYA} cm). Bersiap evakuasi!`,
    kritis: `Ketinggian ${level.toFixed(1)} cm melampaui batas kritis (${thresholds.KRITIS} cm). Segera evakuasi!`,
  };
  return {
    title: `[${LABEL[status]}] ${titles[status]}`,
    body:  bodies[status],
  };
}

// ── Kirim push ke semua subscriber ───────────────────────────────────────────
async function sendPushToAll(status, level, subscriptions) {
  const { title, body } = buildContent(status, level);
  const isUrgent = status === 'kritis' || status === 'bahaya';
  const isKritis = status === 'kritis';

  const vibration = isKritis
    ? [600, 200, 600, 200, 600, 200, 600]
    : isUrgent
    ? [400, 150, 400, 150, 400]
    : [200, 100, 200];

  const payload = JSON.stringify({
    title,
    body,
    status,
    ketinggian: level,
    icon:              '/icons/icon-192.png',
    badge:             '/icons/icon-192.png',
    tag:               `flood-push-${status}`,
    renotify:          isUrgent,
    requireInteraction: isUrgent,
    vibrate:           vibration,
    data:              { url: '/', status, ketinggian: level },
    actions: isUrgent
      ? [
          { action: 'view',    title: 'Lihat Dashboard' },
          { action: 'dismiss', title: 'Tutup' },
        ]
      : [{ action: 'view', title: 'Lihat Dashboard' }],
  });

  const keys   = Object.keys(subscriptions);
  let sent     = 0;
  let failed   = 0;

  await Promise.allSettled(
    keys.map(async (key) => {
      const sub = subscriptions[key];
      if (!sub?.endpoint) return;
      try {
        await webpush.sendNotification(sub, payload);
        sent++;
      } catch (err) {
        // 410 Gone = subscription expired/revoked, bisa hapus dari DB
        if (err.statusCode === 410 || err.statusCode === 404) {
          console.warn(`[Push] Sub kadaluarsa (${key}), pertimbangkan hapus dari DB`);
        }
        failed++;
      }
    })
  );

  console.log(`[Push] Notifikasi dikirim: ${sent} berhasil, ${failed} gagal`);
}

// ── Main polling loop ─────────────────────────────────────────────────────────
async function poll() {
  try {
    const [sensor, th, subs] = await Promise.all([
      fetch(`${FIREBASE_DB_URL}/sensor_banjir.json`).then(r => r.json()),
      fetch(`${FIREBASE_DB_URL}/threshold.json`).then(r => r.json()),
      fetch(`${FIREBASE_DB_URL}/push_subscriptions.json`).then(r => r.json()),
    ]);

    // Update thresholds jika ada
    if (th && typeof th === 'object') {
      thresholds = { ...thresholds, ...th };
    }

    if (!sensor) return;

    // Field ketinggian di Firebase adalah 'ketinggian_air'
    const level  = parseFloat(sensor.ketinggian_air ?? sensor.ketinggian ?? 0);
    const status = calcStatus(level);

    // Log setiap 10 detik agar terminal tidak penuh
    if (Date.now() % 10000 < 1000) {
      console.log(`[Poll] Status: ${status.toUpperCase()} | Level: ${level.toFixed(1)} cm`);
    }

    // Saat pertama kali poll — hanya simpan state, jangan notif
    if (isFirstPoll) {
      isFirstPoll = false;
      lastStatus  = status;
      lastLevel   = level;
      console.log(`[Push] Status awal: ${status.toUpperCase()} (${level.toFixed(1)} cm)`);
      return;
    }

    // Hanya kirim notif jika status benar-benar berubah
    if (status !== lastStatus) {
      console.log(`[Push] Status berubah: ${lastStatus?.toUpperCase()} → ${status.toUpperCase()} (${level.toFixed(1)} cm)`);

      // Kirim notif untuk: naik ke bahaya/kritis, atau turun ke aman dari bahaya/kritis
      const shouldNotify =
        status === 'bahaya' ||
        status === 'kritis' ||
        status === 'siaga'  ||
        (status === 'aman' && (lastStatus === 'bahaya' || lastStatus === 'kritis'));

      if (shouldNotify && subs && Object.keys(subs).length > 0) {
        await sendPushToAll(status, level, subs);
      } else if (!subs || Object.keys(subs).length === 0) {
        console.log('[Push] Tidak ada subscriber — buka app dan allow notifikasi dulu');
      }

      lastStatus = status;
      lastLevel  = level;
    }
  } catch (err) {
    // Jangan crash — terus jalan
    if (err.code !== 'ENOTFOUND') {
      console.error('[Poll] Error:', err.message);
    }
  }
}

// ── Start ─────────────────────────────────────────────────────────────────────
console.log('');
console.log('╔══════════════════════════════════════════════╗');
console.log('║   FloodGuard Push Notification Server        ║');
console.log('║   Monitoring Firebase setiap 1 detik...      ║');
console.log('╚══════════════════════════════════════════════╝');
console.log('');
console.log(`Firebase DB : ${FIREBASE_DB_URL}`);
console.log(`Poll interval: ${POLL_MS}ms`);
console.log('');
console.log('Tekan Ctrl+C untuk berhenti.');
console.log('');

// Poll pertama langsung
poll();
// Lanjut setiap 1 detik
setInterval(poll, POLL_MS);
