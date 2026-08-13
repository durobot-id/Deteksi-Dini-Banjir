'use client';

import { useEffect, useState } from 'react';
import { Bell, BellOff, BellRing, X, CheckCircle, ShieldAlert } from 'lucide-react';
import { usePushNotification } from '@/hooks/usePushNotification';

export default function NotificationPermission() {
  const { permission, requestPermission } = usePushNotification();
  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible]     = useState(false);

  useEffect(() => {
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
    <div
      className="card p-4 relative overflow-hidden"
      style={{ border: '1.5px solid rgba(12,160,140,0.22)' }}
    >
      {/* Accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px]"
        style={{ background: 'linear-gradient(90deg, #12a896, #07b0cc)' }}
      />

      <button
        onClick={() => setDismissed(true)}
        className="absolute top-3 right-3 flex items-center justify-center w-6 h-6 rounded-full"
        style={{ color: '#94b5af', background: 'rgba(0,0,0,0.04)' }}
        aria-label="Tutup"
      >
        <X size={12} />
      </button>

      <div className="flex items-start gap-3 pr-5">
        <div
          className="flex items-center justify-center rounded-xl shrink-0"
          style={{
            width: '42px',
            height: '42px',
            background: 'linear-gradient(135deg, #12a896, #07b0cc)',
          }}
        >
          <BellRing size={19} color="white" strokeWidth={2.2} />
        </div>
        <div className="flex-1">
          <p style={{ fontWeight: 700, fontSize: '13px', color: '#0d2520', letterSpacing: '-0.01em' }}>
            Aktifkan Notifikasi Peringatan
          </p>
          <p style={{ fontSize: '12px', marginTop: '3px', lineHeight: 1.5, color: '#6b9e96' }}>
            Terima alarm dan peringatan banjir langsung di HP, bahkan saat aplikasi ditutup.
          </p>
          <button
            onClick={requestPermission}
            className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all"
            style={{
              background: 'linear-gradient(135deg, #12a896, #07b0cc)',
              color: 'white',
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '0.01em',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            <Bell size={12} strokeWidth={2.5} />
            Aktifkan Sekarang
          </button>
        </div>
      </div>
    </div>
  );
}

function GrantedBadge() {
  // Sudah granted — tidak perlu tampilkan banner apapun
  return null;
}

function DeniedBadge() {
  return (
    <div
      className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
      style={{
        background: 'rgba(232,64,64,0.06)',
        border: '1px solid rgba(232,64,64,0.15)',
      }}
    >
      <ShieldAlert size={13} style={{ color: '#e84040', flexShrink: 0 }} strokeWidth={2.2} />
      <span style={{ fontSize: '12px', fontWeight: 600, color: '#e84040' }}>
        Notifikasi diblokir — aktifkan di pengaturan browser
      </span>
      <BellOff size={12} style={{ color: '#e84040', marginLeft: 'auto', flexShrink: 0 }} strokeWidth={2} />
    </div>
  );
}
