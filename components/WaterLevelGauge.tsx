'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { FloodStatus, getStatusColor, getStatusLabel } from '@/lib/types';

interface WaterLevelGaugeProps {
  ketinggian: number;
  status: FloodStatus;
  prevKetinggian?: number;
}

const STATUS_BG: Record<FloodStatus, string> = {
  aman:   'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
  siaga:  'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
  bahaya: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
  kritis: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
};

const STATUS_ICON: Record<FloodStatus, string> = {
  aman:   '💧',
  siaga:  '⚠️',
  bahaya: '🌊',
  kritis: '🚨',
};

export default function WaterLevelGauge({ ketinggian, status, prevKetinggian }: WaterLevelGaugeProps) {
  const [displayed, setDisplayed] = useState(ketinggian);
  const [animated, setAnimated] = useState(false);
  const colors = getStatusColor(status);

  useEffect(() => {
    setAnimated(false);
    const t = setTimeout(() => {
      setDisplayed(ketinggian);
      setAnimated(true);
    }, 80);
    return () => clearTimeout(t);
  }, [ketinggian]);

  const delta = prevKetinggian !== undefined ? ketinggian - prevKetinggian : 0;
  const showTrend = prevKetinggian !== undefined && Math.abs(delta) > 0.1;
  const TrendIcon = delta > 0.5 ? TrendingUp : delta < -0.5 ? TrendingDown : Minus;
  const trendColor = delta > 0.5 ? '#ef4444' : delta < -0.5 ? '#10b981' : '#94a3b8';

  return (
    <div
      className="card relative overflow-hidden"
      style={{ background: STATUS_BG[status], transition: 'background 0.6s ease' }}
    >
      {/* Subtle top border accent */}
      <div
        className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
        style={{ background: colors.hex, transition: 'background 0.4s ease' }}
      />

      <div className="p-5 pt-6">
        {/* Label */}
        <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: `${colors.hex}99` }}>
          Ketinggian Air Saat Ini
        </p>

        {/* Main reading — nilai + satuan sejajar */}
        <div className="flex items-center justify-between">
          <div
            className="flex items-baseline gap-2"
            style={{
              opacity: animated ? 1 : 0,
              transform: animated ? 'translateY(0)' : 'translateY(10px)',
              transition: 'all 0.4s ease',
            }}
          >
            <span
              style={{
                fontSize: 'clamp(52px, 14vw, 80px)',
                lineHeight: 1,
                fontWeight: 800,
                color: colors.hex,
                fontFamily: 'var(--font-mono)',
                letterSpacing: '-0.04em',
              }}
            >
              {displayed.toFixed(1)}
            </span>
            <span
              style={{
                fontSize: '1.25rem',
                fontWeight: 600,
                color: colors.hex,
                opacity: 0.65,
                marginBottom: '4px',
              }}
            >
              cm
            </span>
          </div>

          {/* Status badge — dari Firebase */}
          <div className="flex flex-col items-end gap-2">
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-2xl"
              style={{
                background: `${colors.hex}18`,
                border: `1.5px solid ${colors.hex}35`,
              }}
            >
              <span style={{ fontSize: '1.1rem' }}>{STATUS_ICON[status]}</span>
              <span
                className="font-extrabold text-sm tracking-wide"
                style={{ color: colors.hex }}
              >
                {getStatusLabel(status)}
              </span>
            </div>

            {/* Trend delta */}
            {showTrend && (
              <div className="flex items-center gap-1" style={{ color: trendColor }}>
                <TrendIcon size={12} strokeWidth={2.5} />
                <span
                  className="text-xs font-bold"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  {delta > 0 ? '+' : ''}
                  {delta.toFixed(1)} cm
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
