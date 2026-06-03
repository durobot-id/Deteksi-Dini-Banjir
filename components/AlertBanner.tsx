'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Siren, X } from 'lucide-react';
import { FloodStatus } from '@/lib/types';

interface AlertBannerProps {
  status: FloodStatus;
  ketinggian: number;
}

export default function AlertBanner({ status, ketinggian }: AlertBannerProps) {
  const [visible, setVisible] = useState(false);
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    if (status === 'bahaya' || status === 'kritis') {
      setVisible(true);
      const interval = setInterval(() => setBlink(b => !b), 700);
      return () => clearInterval(interval);
    } else {
      setVisible(false);
    }
  }, [status]);

  if (!visible) return null;

  const isKritis = status === 'kritis';

  return (
    <div
      className="rounded-2xl p-4 relative overflow-hidden animate-fadeInUp"
      style={{
        background: isKritis
          ? `linear-gradient(135deg, ${blink ? '#dc2626' : '#b91c1c'}, #991b1b)`
          : 'linear-gradient(135deg, #d97706, #b45309)',
        border: `1px solid ${isKritis ? 'rgba(255,100,100,0.3)' : 'rgba(255,200,0,0.2)'}`,
      }}
    >
      {/* Animated background pulse */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 80% 50%, rgba(255,255,255,0.08) 0%, transparent 70%)',
          animation: 'pulse-ring 2s ease-in-out infinite',
        }}
      />

      <div className="flex items-start gap-3 relative z-10">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'rgba(255,255,255,0.2)' }}
        >
          {isKritis ? (
            <Siren size={18} color="white" />
          ) : (
            <AlertTriangle size={18} color="white" />
          )}
        </div>

        <div className="flex-1">
          <p className="text-white font-extrabold text-sm tracking-tight">
            {isKritis ? '🚨 SIAGA KRITIS — EVAKUASI SEGERA' : '⚠ PERINGATAN BAHAYA BANJIR'}
          </p>
          <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.85)' }}>
            Ketinggian air mencapai{' '}
            <span className="font-bold" style={{ fontFamily: 'var(--font-mono)' }}>
              {ketinggian.toFixed(1)} cm
            </span>
            {isKritis
              ? '. Tinggalkan area rawan banjir segera!'
              : '. Bersiap untuk evakuasi jika terus meningkat.'}
          </p>
        </div>

        <button
          onClick={() => setVisible(false)}
          className="p-1 rounded-lg shrink-0"
          style={{ color: 'rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.1)' }}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
