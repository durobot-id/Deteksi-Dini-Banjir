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
      icon: <MapPin size={16} strokeWidth={2.2} />,
      label: 'Wilayah',
      value: data.wilayah || '-',
      sub: data.radius_dampak
        ? `Radius: ${(data.radius_dampak / 1000).toFixed(1)} km`
        : null,
      color: '#0d8f7e',
      bg: 'rgba(13,143,126,0.09)',
    },
    {
      icon: <Cpu size={16} strokeWidth={2.2} />,
      label: 'Status Alat',
      value: isOnline
        ? 'Online'
        : data.status_alat === 'maintenance'
        ? 'Maintenance'
        : 'Offline',
      sub: isOnline ? 'Sensor aktif & terhubung' : 'Sensor tidak merespons',
      color: isOnline ? '#0ea56e' : '#e84040',
      bg: isOnline ? 'rgba(14,165,110,0.09)' : 'rgba(232,64,64,0.09)',
      dot: true,
    },
    {
      icon: <Clock size={16} strokeWidth={2.2} />,
      label: 'Data Terakhir',
      value: formatTime(lastUpdated),
      sub: formatDate(lastUpdated),
      color: '#07b0cc',
      bg: 'rgba(7,176,204,0.09)',
      mono: true,
    },
    {
      icon: <Radio size={16} strokeWidth={2.2} />,
      label: 'Radius Dampak',
      value: data.radius_dampak
        ? `${data.radius_dampak.toLocaleString('id-ID')} m`
        : '-',
      sub: 'Area potensi terdampak',
      color: '#7c4dce',
      bg: 'rgba(124,77,206,0.09)',
      mono: true,
    },
  ];

  return (
    <div
      className="grid-2col"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gap: '10px',
      }}
    >
      {cards.map((c, i) => (
        <div
          key={i}
          className="card"
          style={{
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            minWidth: 0,               // critical: mencegah overflow grid
            transition: 'box-shadow 0.2s ease, transform 0.18s ease',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
            (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.transform = '';
            (e.currentTarget as HTMLElement).style.boxShadow = '';
          }}
        >
          {/* Icon */}
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '10px',
              background: c.bg,
              color: c.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {c.icon}
          </div>

          {/* Content */}
          <div style={{ minWidth: 0 }}>
            <p
              style={{
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.07em',
                textTransform: 'uppercase',
                color: '#8ab5ae',
                marginBottom: '4px',
                whiteSpace: 'nowrap',
              }}
            >
              {c.label}
            </p>

            {/* Value row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
              {c.dot && (
                <span
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: c.color,
                    boxShadow: `0 0 5px ${c.color}80`,
                    flexShrink: 0,
                    animation: isOnline ? 'pulse 2s infinite' : 'none',
                  }}
                />
              )}
              <p
                style={{
                  fontWeight: 700,
                  fontSize: '13px',
                  color: c.color,
                  lineHeight: 1.2,
                  fontFamily: c.mono ? 'var(--font-mono)' : 'inherit',
                  letterSpacing: c.mono ? '-0.02em' : undefined,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  minWidth: 0,
                }}
              >
                {c.value}
              </p>
            </div>

            {/* Sub text */}
            {c.sub && (
              <p
                style={{
                  fontSize: '11px',
                  marginTop: '3px',
                  color: '#9ab8b3',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {c.sub}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
