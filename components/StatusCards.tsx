'use client';

import { MapPin, Cpu, Clock, Radio } from 'lucide-react';
import { SensorData } from '@/lib/types';

interface StatusCardsProps {
  data: SensorData;
  lastUpdated: Date | null;
}

function formatTime(date: Date | null): string {
  if (!date) return '--:--';
  return date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatDate(date: Date | null): string {
  if (!date) return '-';
  return date.toLocaleDateString('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export default function StatusCards({ data, lastUpdated }: StatusCardsProps) {
  const isOnline = data.status_alat === 'online';

  const cards = [
    {
      icon: <MapPin size={16} strokeWidth={2} />,
      label: 'Wilayah',
      value: data.wilayah || '-',
      sub: data.radius_dampak ? `Radius: ${(data.radius_dampak / 1000).toFixed(1)} km` : '',
      color: '#0d9488',
      bg: 'rgba(13,148,136,0.08)',
    },
    {
      icon: <Cpu size={16} strokeWidth={2} />,
      label: 'Status Alat',
      value: isOnline ? 'Online' : data.status_alat === 'maintenance' ? 'Maintenance' : 'Offline',
      sub: isOnline ? 'Sensor aktif & terhubung' : 'Sensor tidak merespons',
      color: isOnline ? '#10b981' : '#ef4444',
      bg: isOnline ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
      dot: true,
    },
    {
      icon: <Clock size={16} strokeWidth={2} />,
      label: 'Data Terakhir',
      value: formatTime(lastUpdated),
      sub: formatDate(lastUpdated),
      color: '#06b6d4',
      bg: 'rgba(6,182,212,0.08)',
      mono: true,
    },
    {
      icon: <Radio size={16} strokeWidth={2} />,
      label: 'Radius Dampak',
      value: data.radius_dampak ? `${data.radius_dampak.toLocaleString('id-ID')} m` : 'N/A',
      sub: 'Area potensi terdampak',
      color: '#8b5cf6',
      bg: 'rgba(139,92,246,0.08)',
      mono: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((c, i) => (
        <div
          key={i}
          className="card p-4 flex flex-col gap-2"
          style={{ animationDelay: `${0.1 + i * 0.05}s` }}
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: c.bg, color: c.color }}
          >
            {c.icon}
          </div>
          <div>
            <p className="text-xs font-medium mb-0.5" style={{ color: '#94b5af' }}>
              {c.label}
            </p>
            <div className="flex items-center gap-1.5">
              {c.dot && (
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{
                    background: c.color,
                    boxShadow: `0 0 6px ${c.color}`,
                    animation: isOnline ? 'pulse 2s infinite' : 'none',
                  }}
                />
              )}
              <p
                className="font-bold text-sm leading-tight"
                style={{
                  color: c.color,
                  fontFamily: c.mono ? 'var(--font-mono)' : 'inherit',
                }}
              >
                {c.value}
              </p>
            </div>
            {c.sub && (
              <p className="text-xs mt-0.5" style={{ color: '#9eb8b4' }}>
                {c.sub}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
