'use client';

import { useEffect, useState, useCallback } from 'react';
import { playNotificationSound } from '@/lib/alarm';
import { FloodStatus, getStatusLabel } from '@/lib/types';

export type PermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

const VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

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

// Status → judul & body notif yang ringkas dan jelas
function buildNotifContent(
  title: string,
  body: string,
  status: FloodStatus,
  ketinggian: number,
): { title: string; body: string } {
  const label = getStatusLabel(status).toUpperCase();
  return {
    title: `[${label}] ${title}`,
    body: `${body}\nKetinggian: ${ketinggian.toFixed(1)} cm`,
  };
}

// Vibration pattern per status
function getVibration(status: FloodStatus): number[] {
  switch (status) {
    case 'kritis': return [600, 200, 600, 200, 600, 200, 600];
    case 'bahaya': return [400, 150, 400, 150, 400];
    case 'siaga':  return [200, 100, 200];
    default:       return [150];
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

    // Subscribe ke push notifications
    try {
      const reg = await navigator.serviceWorker.ready;
      if (VAPID_KEY) {
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_KEY),
        });
        setSubscription(sub);
        console.log('[Push] Subscribed:', JSON.stringify(sub));
      }
    } catch (err) {
      console.warn('[Push] Subscribe failed:', err);
    }

    return true;
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

    const isUrgent   = status === 'kritis' || status === 'bahaya';
    const isKritis   = status === 'kritis';
    const vibration  = getVibration(status);

    const options: NotificationOptions = {
      body: finalBody,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: `flood-alert-${status}`,
      // renotify: true → notif muncul lagi meski tag sama (penting untuk update kritis)
      renotify: isUrgent,
      requireInteraction: isUrgent,
      silent: false,
      vibrate: vibration,
      timestamp: Date.now(),
      data: { status, ketinggian, url: '/' },
      actions: isUrgent
        ? [
            { action: 'view', title: 'Lihat Dashboard' },
            { action: 'dismiss', title: 'Tutup' },
          ]
        : [
            { action: 'view', title: 'Lihat Dashboard' },
          ],
    } as NotificationOptions;

    try {
      const reg = await navigator.serviceWorker.ready;
      // Gunakan service worker showNotification agar notif tampil saat app background
      await reg.showNotification(finalTitle, options);

      // Mainkan suara alarm bersamaan
      playNotificationSound(status);
    } catch {
      // Fallback: Notification API langsung (saat SW belum siap)
      if (Notification.permission === 'granted') {
        const n = new Notification(finalTitle, {
          body: finalBody,
          icon: '/icons/icon-192.png',
          tag: `flood-alert-${status}`,
          requireInteraction: isUrgent,
          silent: false,
        });
        n.onclick = () => {
          window.focus();
          n.close();
        };
        playNotificationSound(status);
      }
    }
  }, []);

  return { permission, subscription, requestPermission, sendLocalNotification };
}
