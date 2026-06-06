'use client';

import { useEffect, useState } from 'react';
import { Bell, BellOff, BellRing, X } from 'lucide-react';
import { usePushNotification } from '@/hooks/usePushNotification';

export default function NotificationPermission() {
  const { permission, requestPermission } = usePushNotification();
  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible]     = useState(false);

  useEffect(() => {
    // Tampilkan banner setelah 2 detik jika belum granted
    if (permission === 'default') {
      const t = setTimeout(() => setVisible(true), 2000);
      return () => clearTimeout(t);
    }
  }, [permission]);

  if (permission === 'unsupported') return null;
  if (permission === 'granted')     return <GrantedBadge />;
  if (permission === 'denied')      return <DeniedBadge />;
  if (!visible || dismissed)        return null;

  return (
    <div className="card p-4 relative overflow-hidden"
      style={{ border: '1.5px solid rgba(20,184,166,0.25)' }}>
      {/* Accent line */}
      <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
        style={{ background: 'linear-gradient(90deg, #14b8a6, #06b6d4)' }} />

      <button onClick={() => setDismissed(true)}
        className="absolute top-3 right-3 p-1 rounded-full"
        style={{ color: '#94b5af', background: 'rgba(0,0,0,0.04)' }}>
        <X size={12} />
      </button>

      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'linear-gradient(135deg, #14b8a6, #06b6d4)' }}>
          <BellRing size={18} color="white" />
        </div>
        <div className="flex-1 pr-4">
          <p className="font-bold text-sm" style={{ color: '#0f2923' }}>
            Aktifkan Notifikasi Peringatan
          </p>
          <p className="text-xs mt-0.5 leading-relaxed" style={{ color: '#6b9e96' }}>
            Dapatkan peringatan banjir dan suara alarm meski aplikasi ditutup.
          </p>
          <button onClick={requestPermission}
            className="mt-3 flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition-all hover:scale-95 active:scale-90"
            style={{ background: 'linear-gradient(135deg, #14b8a6, #06b6d4)', color: 'white' }}>
            <Bell size={12} />
            Aktifkan Sekarang
          </button>
        </div>
      </div>
    </div>
  );
}

function GrantedBadge() {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
      style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
      <Bell size={12} style={{ color: '#10b981' }} />
      <span className="text-xs font-semibold" style={{ color: '#10b981' }}>
        Notifikasi aktif — alarm akan berbunyi saat status berubah
      </span>
    </div>
  );
}

function DeniedBadge() {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
      style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
      <BellOff size={12} style={{ color: '#ef4444' }} />
      <span className="text-xs font-semibold" style={{ color: '#ef4444' }}>
        Notifikasi diblokir — aktifkan di pengaturan browser
      </span>
    </div>
  );
}
