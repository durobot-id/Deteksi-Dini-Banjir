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

  useEffect(() => {
    if (status === 'bahaya' || status === 'kritis') {
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, [status]);

  if (!visible) return null;

  const isKritis = status === 'kritis';

  const cfg = isKritis
    ? {
        gradient: 'linear-gradient(135deg, #b91c1c 0%, #991b1b 100%)',
        border: 'rgba(255,120,120,0.28)',
        iconBg: 'rgba(255,255,255,0.18)',
        title: 'SIAGA KRITIS — EVAKUASI SEGERA',
        sub: `Ketinggian ${ketinggian.toFixed(1)} cm melampaui batas kritis. Tinggalkan area rawan banjir segera!`,
        Icon: Siren,
      }
    : {
        gradient: 'linear-gradient(135deg, #b45309 0%, #92400e 100%)',
        border: 'rgba(255,210,80,0.2)',
        iconBg: 'rgba(255,255,255,0.15)',
        title: 'PERINGATAN BAHAYA BANJIR',
        sub: `Ketinggian ${ketinggian.toFixed(1)} cm. Bersiap untuk evakuasi jika terus meningkat.`,
        Icon: AlertTriangle,
      };

  return (
    <div
      className="rounded-2xl relative overflow-hidden animate-fadeInUp"
      style={{
        background: cfg.gradient,
        border: `1px solid ${cfg.border}`,
        boxShadow: isKritis
          ? '0 4px 24px rgba(185,28,28,0.35)'
          : '0 4px 20px rgba(180,83,9,0.28)',
      }}
    >
      {/* Animated shimmer overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.07) 50%, transparent 60%)',
          animation: isKritis ? 'flow 2.2s ease-in-out infinite' : undefined,
        }}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          padding: '18px 20px',
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: cfg.iconBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            animation: isKritis ? 'alertPulse 1.4s ease-in-out infinite' : undefined,
          }}
        >
          <cfg.Icon size={22} color="white" strokeWidth={2.2} />
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              color: 'white',
              fontWeight: 800,
              fontSize: '12px',
              letterSpacing: '0.07em',
              textTransform: 'uppercase',
              lineHeight: 1.3,
            }}
          >
            {cfg.title}
          </p>
          <p
            style={{
              color: 'rgba(255,255,255,0.85)',
              fontSize: '12px',
              marginTop: '6px',
              lineHeight: 1.55,
            }}
          >
            {cfg.sub}
          </p>
        </div>

        {/* Tutup */}
        <button
          onClick={() => setVisible(false)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '28px',
            height: '28px',
            borderRadius: '8px',
            color: 'rgba(255,255,255,0.6)',
            background: 'rgba(255,255,255,0.12)',
            flexShrink: 0,
          }}
          aria-label="Tutup peringatan"
        >
          <X size={14} />
        </button>
      </div>

    </div>
  );
}
