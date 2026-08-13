'use client';

import { useEffect, useState, useCallback } from 'react';
import { playNotificationSound } from '@/lib/alarm';
import { FloodStatus, getStatusLabel, ThresholdData } from '@/lib/types';

export type PermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

const VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const out     = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) out[i] = rawData.charCodeAt(i);
  return out.buffer;
}

function buildNotifContent(
  title: string,
  body: string,
  status: FloodStatus,
  ketinggian: number,
): { title: string; body: string } {
  const label = getStatusLabel(status).toUpperCase();
  return {
    title: `[${label}] ${title}`,
    body:  `${body}\nKetinggian: ${ketinggian.toFixed(1)} cm`,
  };
}

function getVibration(status: FloodStatus): number[] {
  switch (status) {
    case 'kritis': return [600, 200, 600, 200, 600, 200, 600];
    case 'bahaya': return [400, 150, 400, 150, 400];
    case 'siaga':  return [200, 100, 200];
    default:       return [150];
  }
}

/** Daftar Periodic Background Sync jika browser mendukung */
async function registerPeriodicSync(reg: ServiceWorkerRegistration) {
  try {
    // @ts-expect-error — Periodic Background Sync API belum di semua types
    const ps = reg.periodicSync;
    if (!ps) return;
    const status = await navigator.permissions.query({
      // @ts-expect-error
      name: 'periodic-background-sync',
    });
    if (status.state === 'granted') {
      await ps.register('flood-check', { minInterval: 30_000 });
      console.log('[Push] Periodic sync registered');
    }
  } catch {
    // Browser tidak support — polling dari SW sudah cukup
  }
}

export function usePushNotification() {
  const [permission, setPermission] = useState<PermissionState>('default');
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);

  useEffect(() => {
    if (!('Notification' in window)) {
      setPermission('unsupported');
      return;
    }
    setPermission(Notification.permission as PermissionState);
  }, []);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return false;

    const result = await Notification.requestPermission();
    setPermission(result as PermissionState);
    if (result !== 'granted') return false;

    try {
      const reg = await navigator.serviceWorker.ready;

      if (VAPID_KEY) {
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly:      true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_KEY),
        });
        setSubscription(sub);

        // ── Simpan subscription ke Firebase RTDB ──────────────────────────
        // push-server.js akan membaca ini untuk mengirim notif background
        const subJson   = sub.toJSON();
        const subId     = btoa(sub.endpoint).slice(-20).replace(/[^a-zA-Z0-9]/g, '_');
        const FIREBASE  = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL?.replace(/\/$/, '');
        if (FIREBASE) {
          await fetch(`${FIREBASE}/push_subscriptions/${subId}.json`, {
            method:  'PUT',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(subJson),
          });
          console.log('[Push] Subscription disimpan ke Firebase:', subId);
        }
      }

      await registerPeriodicSync(reg);
      reg.active?.postMessage({ type: 'START_POLLING' });
    } catch (err) {
      console.warn('[Push] Setup failed:', err);
    }

    return true;
  }, []);

  /**
   * Sync status ke SW agar SW tahu state terkini
   * (dipanggil dari Notifications.tsx setiap ada perubahan)
   */
  const syncStatusToSW = useCallback(async (
    status: FloodStatus,
    ketinggian: number,
    thresholds?: ThresholdData,
  ) => {
    if (!('serviceWorker' in navigator)) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      reg.active?.postMessage({
        type: 'STATUS_UPDATE',
        status,
        ketinggian,
        thresholds,
      });
    } catch {}
  }, []);

  /**
   * Kirim notifikasi lokal melalui Service Worker.
   * Bekerja saat app di background / HP terkunci.
   */
  const sendLocalNotification = useCallback(async (
    title: string,
    body: string,
    status: FloodStatus,
    ketinggian: number,
  ) => {
    if (Notification.permission !== 'granted') return;

    const { title: finalTitle, body: finalBody } = buildNotifContent(title, body, status, ketinggian);
    const isUrgent  = status === 'kritis' || status === 'bahaya';
    const vibration = getVibration(status);

    const options: NotificationOptions = {
      body:               finalBody,
      icon:               '/icons/icon-192.png',
      badge:              '/icons/icon-192.png',
      tag:                `flood-alert-${status}`,
      renotify:           isUrgent,
      requireInteraction: isUrgent,
      silent:             false,
      vibrate:            vibration,
      timestamp:          Date.now(),
      data:               { status, ketinggian, url: '/' },
      actions: isUrgent
        ? [
            { action: 'view',    title: 'Lihat Dashboard' },
            { action: 'dismiss', title: 'Tutup' },
          ]
        : [{ action: 'view', title: 'Lihat Dashboard' }],
    } as NotificationOptions;

    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(finalTitle, options);
      playNotificationSound(status);
    } catch {
      // Fallback langsung
      if (Notification.permission === 'granted') {
        const n = new Notification(finalTitle, {
          body:               finalBody,
          icon:               '/icons/icon-192.png',
          tag:                `flood-alert-${status}`,
          requireInteraction: isUrgent,
          silent:             false,
        });
        n.onclick = () => { window.focus(); n.close(); };
        playNotificationSound(status);
      }
    }
  }, []);

  return { permission, subscription, requestPermission, sendLocalNotification, syncStatusToSW };
}
