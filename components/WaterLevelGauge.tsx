'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Minus, Droplets, AlertTriangle, Waves, Siren } from 'lucide-react';
import { FloodStatus, getStatusColor, getStatusLabel } from '@/lib/types';

interface WaterLevelGaugeProps {
  ketinggian: number;
  status: FloodStatus;
  prevKetinggian?: number;
}

const STATUS_BG: Record<FloodStatus, string> = {
  aman:   'linear-gradient(145deg, #edfaf7 0%, #d7f5ed 100%)',
  siaga:  'linear-gradient(145deg, #fffbeb 0%, #fef3c4 100%)',
  bahaya: 'linear-gradient(145deg, #fff6ed 0%, #ffead5 100%)',
  kritis: 'linear-gradient(145deg, #fef2f2 0%, #fee0e0 100%)',
};

const STATUS_ICON: Record<FloodStatus, React.ReactNode> = {
  aman:   <Droplets size={15} strokeWidth={2.2} />,
  siaga:  <AlertTriangle size={15} strokeWidth={2.2} />,
  bahaya: <Waves size={15} strokeWidth={2.2} />,
  kritis: <Siren size={15} strokeWidth={2.2} />,
};

export default function WaterLevelGauge({ ketinggian, status, prevKetinggian }: WaterLevelGaugeProps) {
  const [displayed, setDisplayed] = useState(ketinggian);
  const [animated, setAnimated]   = useState(false);
  const colors = getStatusColor(status);

  useEffect(() => {
    setAnimated(false);
    const t = setTimeout(() => {
      setDisplayed(ketinggian);
      setAnimated(true);
    }, 80);
    return () => clearTimeout(t);
  }, [ketinggian]);

  const delta     = prevKetinggian !== undefined ? ketinggian - prevKetinggian : 0;
  const showTrend = prevKetinggian !== undefined && Math.abs(delta) > 0.1;
  const TrendIcon = delta > 0.5 ? TrendingUp : delta < -0.5 ? TrendingDown : Minus;
  const trendColor = delta > 0.5 ? '#e84040' : delta < -0.5 ? '#0ea56e' : '#94a3b8';

  return (
    <div
      style={{
        background: STATUS_BG[status],
        transition: 'background 0.5s ease',
        borderRadius: '16px',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Top accent bar */}
      <div
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: '3px',
          background: `linear-gradient(90deg, ${colors.hex}, ${colors.hex}70)`,
          transition: 'background 0.4s ease',
        }}
      />

      <div style={{ padding: '20px 20px 20px', paddingTop: '24px' }}>
        {/* Section label */}
        <p
          style={{
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: `${colors.hex}bb`,
            marginBottom: '14px',
          }}
        >
          Ketinggian Air Saat Ini
        </p>

        {/* Layout: angka kiri, badge kanan — stack vertical agar tidak clash */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          {/* Baris 1: Angka + satuan */}
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: '8px',
              opacity: animated ? 1 : 0,
              transform: animated ? 'translateY(0)' : 'translateY(10px)',
              transition: 'all 0.45s cubic-bezier(.22,.68,0,1.2)',
            }}
          >
            <span
              style={{
                fontSize: 'clamp(52px, 14vw, 80px)',
                lineHeight: 1,
                fontWeight: 900,
                color: colors.hex,
                fontFamily: 'var(--font-mono)',
                letterSpacing: '-0.04em',
              }}
            >
              {displayed.toFixed(1)}
            </span>
            <span
              style={{
                fontSize: '20px',
                fontWeight: 600,
                color: colors.hex,
                opacity: 0.5,
                paddingBottom: '6px',
              }}
            >
              cm
            </span>
          </div>

          {/* Baris 2: Badge status + trend — baris terpisah agar tidak tumpang tindih */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Badge status */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '999px',
                background: `${colors.hex}18`,
                border: `1.5px solid ${colors.hex}35`,
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ color: colors.hex, display: 'flex', flexShrink: 0 }}>
                {STATUS_ICON[status]}
              </span>
              <span
                style={{
                  fontWeight: 800,
                  fontSize: '13px',
                  letterSpacing: '0.02em',
                  color: colors.hex,
                }}
              >
                {getStatusLabel(status)}
              </span>
            </div>

            {/* Trend delta */}
            {showTrend && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: trendColor,
                }}
              >
                <TrendIcon size={13} strokeWidth={2.5} />
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {delta > 0 ? '+' : ''}{delta.toFixed(1)} cm
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
