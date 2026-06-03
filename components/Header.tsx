'use client';

import { Wifi, WifiOff, Droplets } from 'lucide-react';

interface HeaderProps {
  isOnline: boolean;
}

export default function Header({ isOnline }: HeaderProps) {
  return (
    <header
      className="sticky top-0 z-50"
      style={{
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(20,184,166,0.12)',
      }}
    >
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #14b8a6, #06b6d4)' }}
          >
            <Droplets size={16} color="white" strokeWidth={2.5} />
          </div>
          <p className="font-bold text-sm" style={{ color: '#0f2923' }}>
            Peringatan Dini Banjir
          </p>
        </div>

        {/* Status Koneksi Alat */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
          style={{
            background: isOnline ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            color: isOnline ? '#059669' : '#dc2626',
            border: `1px solid ${isOnline ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
          }}
        >
          {isOnline ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <Wifi size={11} />
              <span>Online</span>
            </>
          ) : (
            <>
              <WifiOff size={11} />
              <span>Offline</span>
            </>
          )}
        </div>
      </div>
    </header>
  );
}