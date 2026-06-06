'use client';

import { useEffect, useState, useCallback } from 'react';
import { playNotificationSound } from '@/lib/alarm';
import { FloodStatus, getStatusLabel } from '@/lib/types';

export type PermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

const VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

// Konversi VAPID key ke Uint8Array
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer;
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

  // Minta izin notifikasi + subscribe push
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return false;

    const result = await Notification.requestPermission();
    setPermission(result as PermissionState);

    if (result !== 'granted') return false;

    // Daftarkan service worker push subscription
    try {
      const reg = await navigator.serviceWorker.ready;
      if (VAPID_KEY) {
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_KEY),
        });
        setSubscription(sub);
        // Di sini bisa kirim sub ke backend/Firebase untuk push server-side
        console.log('[Push] Subscribed:', JSON.stringify(sub));
      }
    } catch (err) {
      console.warn('[Push] Subscribe failed:', err);
    }

    return true;
  }, []);

  // Kirim notifikasi lokal via Service Worker (berfungsi saat app di background)
  const sendLocalNotification = useCallback(async (
    title: string,
    body: string,
    status: FloodStatus,
    ketinggian: number,
  ) => {
    if (Notification.permission !== 'granted') return;

    const statusEmoji: Record<FloodStatus, string> = {
      aman: '✅', siaga: '⚠️', bahaya: '🌊', kritis: '🚨',
    };
    const statusColor: Record<FloodStatus, string> = {
      aman: '#10b981', siaga: '#f59e0b', bahaya: '#f97316', kritis: '#ef4444',
    };

    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, {
        body,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag: `flood-alert-${status}`,        // replace notif yang sama
        renotify: status === 'kritis',        // re-alert jika kritis
        requireInteraction: status === 'kritis' || status === 'bahaya',
        silent: false,
        vibrate: status === 'kritis'
          ? [500, 200, 500, 200, 500]
          : status === 'bahaya'
          ? [300, 100, 300]
          : [200],
        data: { status, ketinggian, url: '/' },
        actions: [
          { action: 'view', title: '📊 Lihat Dashboard' },
          { action: 'dismiss', title: 'Tutup' },
        ],
      } as NotificationOptions);

      // Mainkan suara alarm bersamaan
      playNotificationSound(status);
    } catch (err) {
      // Fallback: notifikasi biasa jika SW belum ready
      if (Notification.permission === 'granted') {
        const n = new Notification(title, {
          body,
          icon: '/icons/icon-192.png',
          tag: `flood-alert-${status}`,
        });
        n.onclick = () => window.focus();
        playNotificationSound(status);
      }
    }
  }, []);

  return { permission, subscription, requestPermission, sendLocalNotification };
}
