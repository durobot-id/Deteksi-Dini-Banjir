'use client';

import { useEffect, useState, useRef } from 'react';
import { Bell, CloudRain, AlertTriangle, Waves, X, CheckCircle, Volume2, VolumeX } from 'lucide-react';
import { FloodStatus, ThresholdData, DEFAULT_THRESHOLDS, getStatusColor, getStatusLabel } from '@/lib/types';
import { usePushNotification } from '@/hooks/usePushNotification';
import { startAlarm, stopAlarm } from '@/lib/alarm';

interface Notification {
  id: string;
  type: 'kenaikan' | 'cuaca' | 'status' | 'aman';
  title: string;
  message: string;
  time: Date;
  status: FloodStatus;
  read: boolean;
}

interface NotificationsProps {
  currentStatus: FloodStatus;
  ketinggian: number;
  thresholds?: ThresholdData;
}

const NOTIF_KEY = 'flood_notifications';
const MAX_NOTIF = 20;

function loadNotifs(): Notification[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(NOTIF_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return parsed.map((n: Notification & { time: string }) => ({ ...n, time: new Date(n.time) }));
  } catch { return []; }
}

function saveNotifs(notifs: Notification[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(NOTIF_KEY, JSON.stringify(notifs.slice(0, MAX_NOTIF)));
  } catch {}
}

function makeId() { return Math.random().toString(36).slice(2, 9); }

export default function Notifications({
  currentStatus,
  ketinggian,
  thresholds = DEFAULT_THRESHOLDS,
}: NotificationsProps) {
  const [notifs, setNotifs]       = useState<Notification[]>([]);
  const [prevStatus, setPrevStatus] = useState<FloodStatus | null>(null);
  const [alarmOn, setAlarmOn]     = useState(false);
  const { sendLocalNotification } = usePushNotification();
  const alarmingStatus = useRef<FloodStatus | null>(null);

  useEffect(() => { setNotifs(loadNotifs()); }, []);

  // Stop alarm saat status kembali aman
  useEffect(() => {
    if (currentStatus === 'aman' && alarmOn) {
      stopAlarm();
      setAlarmOn(false);
      alarmingStatus.current = null;
    }
  }, [currentStatus, alarmOn]);

  useEffect(() => {
    if (prevStatus === null) { setPrevStatus(currentStatus); return; }
    if (prevStatus === currentStatus) return;

    // Buat notifikasi
    const newNotif: Notification = (() => {
      if (currentStatus === 'aman') return {
        id: makeId(), type: 'aman',
        title: 'Status Normal — Aman',
        message: `Ketinggian air kembali normal: ${ketinggian.toFixed(1)} cm. Area dinyatakan aman.`,
        time: new Date(), status: 'aman', read: false,
      };
      if (currentStatus === 'kritis') return {
        id: makeId(), type: 'kenaikan',
        title: '🚨 SIAGA KRITIS — Evakuasi!',
        message: `Ketinggian ${ketinggian.toFixed(1)} cm melampaui batas kritis (${thresholds.KRITIS} cm). Segera evakuasi!`,
        time: new Date(), status: 'kritis', read: false,
      };
      if (currentStatus === 'bahaya') return {
        id: makeId(), type: 'kenaikan',
        title: '⚠ Peringatan Bahaya Banjir',
        message: `Ketinggian ${ketinggian.toFixed(1)} cm melebihi batas bahaya (${thresholds.BAHAYA} cm). Bersiap evakuasi.`,
        time: new Date(), status: 'bahaya', read: false,
      };
      return {
        id: makeId(), type: 'status',
        title: 'Status Berubah — Siaga',
        message: `Ketinggian air ${ketinggian.toFixed(1)} cm melewati batas siaga (${thresholds.SIAGA} cm). Pantau terus.`,
        time: new Date(), status: 'siaga', read: false,
      };
    })();

    // Simpan notifikasi
    setNotifs(prev => {
      const updated = [newNotif, ...prev].slice(0, MAX_NOTIF);
      saveNotifs(updated);
      return updated;
    });

    // Kirim push notification (bisa diterima saat app di background)
    sendLocalNotification(newNotif.title, newNotif.message, currentStatus, ketinggian);

    // Jalankan alarm suara jika status berbahaya/kritis
    if (currentStatus === 'bahaya' || currentStatus === 'kritis') {
      stopAlarm();
      startAlarm(currentStatus);
      setAlarmOn(true);
      alarmingStatus.current = currentStatus;
    } else {
      stopAlarm();
      setAlarmOn(false);
    }

    setPrevStatus(currentStatus);
  }, [currentStatus, ketinggian, prevStatus, thresholds, sendLocalNotification]);

  // Cleanup alarm saat unmount
  useEffect(() => () => stopAlarm(), []);

  const markRead = (id: string) => {
    setNotifs(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, read: true } : n);
      saveNotifs(updated);
      return updated;
    });
  };

  const dismiss = (id: string) => {
    setNotifs(prev => {
      const updated = prev.filter(n => n.id !== id);
      saveNotifs(updated);
      return updated;
    });
  };

  const toggleAlarm = () => {
    if (alarmOn) {
      stopAlarm();
      setAlarmOn(false);
    } else if (alarmingStatus.current) {
      startAlarm(alarmingStatus.current as 'siaga' | 'bahaya' | 'kritis');
      setAlarmOn(true);
    }
  };

  const unreadCount = notifs.filter(n => !n.read).length;

  const getIcon = (type: Notification['type'], status: FloodStatus) => {
    const color = getStatusColor(status).hex;
    const props = { size: 16, strokeWidth: 2, color };
    switch (type) {
      case 'cuaca':    return <CloudRain {...props} />;
      case 'aman':     return <CheckCircle {...props} />;
      case 'kenaikan': return <Waves {...props} />;
      default:         return <AlertTriangle {...props} />;
    }
  };

  function formatNotifTime(date: Date): string {
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60)   return 'Baru saja';
    if (diff < 3600) return `${Math.floor(diff / 60)} mnt lalu`;
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Bell size={14} style={{ color: '#6b9e96' }} />
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#6b9e96' }}>
            Notifikasi
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Tombol matikan/nyalakan alarm — hanya muncul saat bahaya/kritis */}
          {(currentStatus === 'bahaya' || currentStatus === 'kritis') && (
            <button onClick={toggleAlarm}
              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-bold transition-all hover:scale-95"
              style={{
                background: alarmOn ? 'rgba(239,68,68,0.12)' : 'rgba(20,184,166,0.1)',
                color: alarmOn ? '#ef4444' : '#14b8a6',
                border: `1px solid ${alarmOn ? 'rgba(239,68,68,0.25)' : 'rgba(20,184,166,0.2)'}`,
              }}>
              {alarmOn ? <Volume2 size={11} /> : <VolumeX size={11} />}
              {alarmOn ? 'Alarm Aktif' : 'Alarm Mati'}
            </button>
          )}
          {unreadCount > 0 && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: '#ef4444', color: 'white' }}>
              {unreadCount} baru
            </span>
          )}
        </div>
      </div>

      {/* List notifikasi */}
      {notifs.length === 0 ? (
        <div className="card p-5 text-center">
          <Bell size={24} className="mx-auto mb-2" style={{ color: '#b2cdc9' }} />
          <p className="text-sm font-medium" style={{ color: '#94b5af' }}>Belum ada notifikasi</p>
          <p className="text-xs mt-1" style={{ color: '#b2cdc9' }}>
            Notifikasi dan alarm akan muncul saat status berubah
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {notifs.slice(0, 5).map((n) => {
            const colors = getStatusColor(n.status);
            return (
              <div key={n.id} onClick={() => markRead(n.id)}
                className="card p-4 flex gap-3 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
                style={{ borderLeft: `3px solid ${colors.hex}`, opacity: n.read ? 0.65 : 1 }}>
                <div className="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center mt-0.5"
                  style={{ background: `${colors.hex}15` }}>
                  {getIcon(n.type, n.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold leading-tight" style={{ color: '#0f2923' }}>
                      {n.title}
                    </p>
                    <button onClick={(e) => { e.stopPropagation(); dismiss(n.id); }}
                      className="shrink-0 p-0.5 rounded" style={{ color: '#b2cdc9' }}>
                      <X size={12} />
                    </button>
                  </div>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: '#6b9e96' }}>
                    {n.message}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{ background: `${colors.hex}12`, color: colors.hex }}>
                      {getStatusLabel(n.status)}
                    </span>
                    <span className="text-xs" style={{ color: '#b2cdc9', fontFamily: 'var(--font-mono)' }}>
                      {formatNotifTime(n.time)}
                    </span>
                    {!n.read && (
                      <span className="w-1.5 h-1.5 rounded-full ml-auto"
                        style={{ background: '#ef4444', boxShadow: '0 0 4px #ef444480' }} />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
