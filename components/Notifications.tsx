'use client';

import { useEffect, useState, useRef } from 'react';
import {
  Bell, CloudRain, AlertTriangle, Waves, X,
  CheckCircle, Volume2, VolumeX,
} from 'lucide-react';
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
  const [notifs, setNotifs]         = useState<Notification[]>([]);
  const [prevStatus, setPrevStatus] = useState<FloodStatus | null>(null);
  const [alarmOn, setAlarmOn]       = useState(false);
  const { sendLocalNotification, syncStatusToSW } = usePushNotification();
  const alarmingStatus              = useRef<FloodStatus | null>(null);

  useEffect(() => { setNotifs(loadNotifs()); }, []);

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

    const newNotif: Notification = (() => {
      if (currentStatus === 'aman') return {
        id: makeId(), type: 'aman',
        title: 'Status Normal — Aman',
        message: `Ketinggian air kembali normal: ${ketinggian.toFixed(1)} cm. Area dinyatakan aman.`,
        time: new Date(), status: 'aman', read: false,
      };
      if (currentStatus === 'kritis') return {
        id: makeId(), type: 'kenaikan',
        title: 'SIAGA KRITIS — Evakuasi Segera',
        message: `Ketinggian ${ketinggian.toFixed(1)} cm melampaui batas kritis (${thresholds.KRITIS} cm). Segera evakuasi!`,
        time: new Date(), status: 'kritis', read: false,
      };
      if (currentStatus === 'bahaya') return {
        id: makeId(), type: 'kenaikan',
        title: 'Peringatan Bahaya Banjir',
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

    setNotifs(prev => {
      const updated = [newNotif, ...prev].slice(0, MAX_NOTIF);
      saveNotifs(updated);
      return updated;
    });

    sendLocalNotification(newNotif.title, newNotif.message, currentStatus, ketinggian);
    // Sinkronkan status ke SW agar bisa notif saat app ditutup
    syncStatusToSW(currentStatus, ketinggian, thresholds);

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
  }, [currentStatus, ketinggian, prevStatus, thresholds, sendLocalNotification, syncStatusToSW]);

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

  const getIcon = (type: Notification['type'], status: FloodStatus) => {
    const color = getStatusColor(status).hex;
    const props = { size: 15, strokeWidth: 2.2, color };
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

  const unreadCount = notifs.filter(n => !n.read).length;

  return (
    <div
      className="card"
      style={{
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      {/* ── Section header ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bell size={13} style={{ color: '#6b9e96' }} strokeWidth={2.2} />
          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.09em',
              textTransform: 'uppercase',
              color: '#6b9e96',
            }}
          >
            Notifikasi
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {(currentStatus === 'bahaya' || currentStatus === 'kritis') && (
            <button
              onClick={toggleAlarm}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 10px',
                borderRadius: '999px',
                background: alarmOn ? 'rgba(232,64,64,0.1)' : 'rgba(12,160,140,0.09)',
                color: alarmOn ? '#e84040' : '#12a896',
                border: `1px solid ${alarmOn ? 'rgba(232,64,64,0.25)' : 'rgba(12,160,140,0.2)'}`,
                fontSize: '11px',
                fontWeight: 700,
              }}
            >
              {alarmOn ? <Volume2 size={11} strokeWidth={2.2} /> : <VolumeX size={11} strokeWidth={2.2} />}
              {alarmOn ? 'Alarm Aktif' : 'Alarm Mati'}
            </button>
          )}
          {unreadCount > 0 && (
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '999px',
                background: '#e84040',
                color: 'white',
              }}
            >
              {unreadCount} baru
            </span>
          )}
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: '1px', background: 'var(--border)', margin: '0 -20px' }} />

      {/* ── Notification list ── */}
      {notifs.length === 0 ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '24px 16px',
            borderRadius: '12px',
            background: 'var(--surface)',
            textAlign: 'center',
            gap: '6px',
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '14px',
              background: 'rgba(12,160,140,0.07)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '4px',
            }}
          >
            <Bell size={20} style={{ color: '#b2cdc9' }} strokeWidth={1.8} />
          </div>
          <p style={{ fontSize: '13px', fontWeight: 600, color: '#94b5af' }}>Belum ada notifikasi</p>
          <p style={{ fontSize: '11px', color: '#b2cdc9', lineHeight: 1.6 }}>
            Notifikasi dan alarm akan muncul otomatis saat status berubah
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {notifs.slice(0, 5).map((n) => {
            const colors = getStatusColor(n.status);
            return (
              <div
                key={n.id}
                onClick={() => markRead(n.id)}
                style={{
                  display: 'flex',
                  gap: '12px',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  borderLeft: `3px solid ${colors.hex}`,
                  background: 'var(--surface)',
                  cursor: 'pointer',
                  opacity: n.read ? 0.6 : 1,
                  transition: 'opacity 0.2s, box-shadow 0.2s, transform 0.15s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)';
                  (e.currentTarget as HTMLElement).style.transform = 'translateX(2px)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.boxShadow = '';
                  (e.currentTarget as HTMLElement).style.transform = '';
                }}
              >
                {/* Status icon */}
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '10px',
                    background: `${colors.hex}14`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px',
                  }}
                >
                  {getIcon(n.type, n.status)}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                    <p style={{ fontSize: '13px', fontWeight: 700, color: '#0d2520', lineHeight: 1.3 }}>
                      {n.title}
                    </p>
                    <button
                      onClick={e => { e.stopPropagation(); dismiss(n.id); }}
                      style={{ flexShrink: 0, color: '#b2cdc9', padding: '2px', borderRadius: '4px' }}
                      aria-label="Hapus notifikasi"
                    >
                      <X size={12} />
                    </button>
                  </div>
                  <p style={{ fontSize: '12px', marginTop: '4px', lineHeight: 1.5, color: '#6b9e96' }}>
                    {n.message}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '999px',
                        background: `${colors.hex}12`,
                        color: colors.hex,
                        letterSpacing: '0.03em',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {getStatusLabel(n.status)}
                    </span>
                    <span style={{ fontSize: '10px', color: '#b2cdc9', fontFamily: 'var(--font-mono)' }}>
                      {formatNotifTime(n.time)}
                    </span>
                    {!n.read && (
                      <span
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: '#e84040',
                          boxShadow: '0 0 4px rgba(232,64,64,0.5)',
                          marginLeft: 'auto',
                          flexShrink: 0,
                        }}
                      />
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
