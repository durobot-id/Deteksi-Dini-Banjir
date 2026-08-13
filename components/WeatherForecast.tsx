'use client';

import { useState } from 'react';
import {
  Cloud, Droplets, Wind, Thermometer, TrendingUp,
  RefreshCw, AlertTriangle, Sun, CloudRain, CloudLightning,
  CloudSnow, CloudDrizzle, Haze, Eye,
} from 'lucide-react';
import {
  useBmkgWeather,
  predictFloodRisk,
  isHeavyRain,
  isRainy,
  formatHour,
  BmkgDayForecast,
} from '@/hooks/useBmkgWeather';

interface WeatherForecastProps {
  adm4?: string;
  namaWilayah?: string;
  ketinggian: number;
}

// Map weather description → Lucide icon (no emoji)
function WeatherIcon({ desc, size = 22 }: { desc: string; size?: number }) {
  const d = desc.toLowerCase();
  const style = { flexShrink: 0 as const };

  if (d.includes('petir') || d.includes('badai') || d.includes('thunder') || d.includes('storm')) {
    return <CloudLightning size={size} style={style} strokeWidth={1.8} />;
  }
  if (d.includes('lebat') || d.includes('hujan deras') || d.includes('heavy')) {
    return <CloudRain size={size} style={style} strokeWidth={1.8} />;
  }
  if (d.includes('hujan') || d.includes('rain') || d.includes('shower')) {
    return <CloudDrizzle size={size} style={style} strokeWidth={1.8} />;
  }
  if (d.includes('salju') || d.includes('snow') || d.includes('hail')) {
    return <CloudSnow size={size} style={style} strokeWidth={1.8} />;
  }
  if (d.includes('kabut') || d.includes('asap') || d.includes('fog') || d.includes('haze') || d.includes('mist')) {
    return <Haze size={size} style={style} strokeWidth={1.8} />;
  }
  if (d.includes('berawan') || d.includes('mendung') || d.includes('cloud') || d.includes('overcast')) {
    return <Cloud size={size} style={style} strokeWidth={1.8} />;
  }
  if (d.includes('cerah') || d.includes('clear') || d.includes('sunny') || d.includes('fair')) {
    return <Sun size={size} style={style} strokeWidth={1.8} />;
  }
  return <Eye size={size} style={style} strokeWidth={1.8} />;
}

// Derive icon color from weather type
function getWeatherIconColor(desc: string): string {
  const d = desc.toLowerCase();
  if (d.includes('petir') || d.includes('badai') || d.includes('thunder')) return '#ef4444';
  if (d.includes('lebat') || d.includes('heavy')) return '#3b82f6';
  if (d.includes('hujan') || d.includes('rain') || d.includes('shower')) return '#60a5fa';
  if (d.includes('kabut') || d.includes('fog')) return '#94a3b8';
  if (d.includes('cerah') || d.includes('clear') || d.includes('sunny')) return '#f59e0b';
  return '#6b9e96';
}

export default function WeatherForecast({ adm4, namaWilayah, ketinggian }: WeatherForecastProps) {
  const { forecast, loading, error } = useBmkgWeather(adm4, namaWilayah);
  const [activeDay, setActiveDay] = useState(0);

  const safeActiveDay = forecast?.days?.length
    ? Math.min(activeDay, forecast.days.length - 1)
    : 0;

  if (!adm4) {
    return (
      <div className="card" style={{ padding: '20px' }}>
        <SectionHeader />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '28px 16px',
            borderRadius: '12px',
            marginTop: '14px',
            background: 'var(--surface)',
            gap: '6px',
          }}
        >
          <Cloud size={26} style={{ color: '#b2cdc9' }} strokeWidth={1.5} />
          <p style={{ fontSize: '13px', color: '#94b5af', fontWeight: 500 }}>
            Kode wilayah BMKG belum diisi
          </p>
          <p style={{ fontSize: '11px', color: '#b2cdc9', marginTop: '2px' }}>
            Tambahkan <code style={{ fontFamily: 'var(--font-mono)', fontSize: '10px' }}>cuaca_config.adm4</code> di Firebase
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="card" style={{ padding: '20px' }}>
        <SectionHeader />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '14px' }}>
          <div className="skeleton" style={{ height: '88px', width: '100%' }} />
          <div style={{ display: 'flex', gap: '6px' }}>
            {[0, 1, 2].map(i => (
              <div key={i} className="skeleton" style={{ height: '36px', flex: 1, borderRadius: '10px' }} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: '8px', overflow: 'hidden' }}>
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} className="skeleton" style={{ height: '110px', width: '68px', flexShrink: 0, borderRadius: '14px' }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !forecast) {
    return (
      <div className="card" style={{ padding: '20px' }}>
        <SectionHeader />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '14px',
            borderRadius: '12px',
            marginTop: '14px',
            background: 'rgba(232,64,64,0.06)',
            border: '1px solid rgba(232,64,64,0.15)',
          }}
        >
          <AlertTriangle size={16} style={{ color: '#e84040', flexShrink: 0 }} strokeWidth={2} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#e84040' }}>Gagal memuat data BMKG</p>
            <p style={{ fontSize: '11px', marginTop: '2px', color: '#94b5af' }}>{error ?? 'Coba refresh halaman'}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: '6px', borderRadius: '8px', background: 'rgba(232,64,64,0.1)', color: '#e84040', display: 'flex' }}
          >
            <RefreshCw size={12} />
          </button>
        </div>
      </div>
    );
  }

  if (!forecast.days || forecast.days.length === 0) {
    return (
      <div className="card p-5">
        <SectionHeader />
        <div
          className="flex items-center justify-center py-8 rounded-xl mt-4"
          style={{ background: 'var(--surface)' }}
        >
          <p style={{ fontSize: '13px', color: '#94b5af' }}>Data cuaca BMKG tidak tersedia untuk wilayah ini</p>
        </div>
      </div>
    );
  }

  const prediction = predictFloodRisk(forecast.allItems, ketinggian);
  const currentDay = forecast.days[safeActiveDay];

  return (
    <div className="card" style={{ padding: '20px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '8px',
          marginBottom: '14px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <div
            style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(7,176,204,0.1)', color: '#07b0cc', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            <Cloud size={14} strokeWidth={2.2} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p
              style={{
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#6b9e96',
                whiteSpace: 'nowrap',
              }}
            >
              Prakiraan Cuaca
            </p>
            <p
              style={{
                fontSize: '11px',
                marginTop: '1px',
                color: '#b2cdc9',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              BMKG · {forecast.wilayah}
            </p>
          </div>
        </div>
        <span
          style={{
            fontSize: '10px',
            fontFamily: 'var(--font-mono)',
            color: '#6b9e96',
            background: 'var(--surface)',
            padding: '3px 8px',
            borderRadius: '999px',
            fontWeight: 600,
            flexShrink: 0,
            whiteSpace: 'nowrap',
          }}
        >
          {forecast.fetchedAt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* Prediksi Risiko Banjir */}
      <div
        style={{
          borderRadius: '16px',
          padding: '14px',
          marginBottom: '14px',
          background: prediction.bgColor,
          border: `1.5px solid ${prediction.color}20`,
        }}
      >
        {/* Label + deskripsi */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
          <TrendingUp size={13} strokeWidth={2.2} style={{ color: prediction.color, flexShrink: 0 }} />
          <span style={{ fontWeight: 800, fontSize: '13px', color: prediction.color }}>
            {prediction.label}
          </span>
          {prediction.estimatedRiseCm > 0 && (
            <span
              style={{
                marginLeft: 'auto',
                fontWeight: 800,
                fontSize: '13px',
                color: prediction.color,
                fontFamily: 'var(--font-mono)',
                flexShrink: 0,
                background: `${prediction.color}12`,
                padding: '2px 8px',
                borderRadius: '999px',
              }}
            >
              +{prediction.estimatedRiseCm} cm
            </span>
          )}
        </div>
        <p style={{ fontSize: '12px', lineHeight: 1.5, color: '#5a8a84', marginBottom: '10px' }}>
          {prediction.description}
        </p>

        {/* Stats baris bawah */}
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
          <StatChip icon={<CloudRain size={11} strokeWidth={2} />} color={prediction.color}>
            Hujan: <b>{prediction.rainHours} jam</b>
          </StatChip>
          {prediction.heavyRainHours > 0 && (
            <StatChip icon={<CloudLightning size={11} strokeWidth={2} />} color="#e84040">
              Lebat: <b>{prediction.heavyRainHours} jam</b>
            </StatChip>
          )}
          <StatChip icon={<Droplets size={11} strokeWidth={2} />} color={prediction.color}>
            Lembab: <b>{prediction.maxHumidity}%</b>
          </StatChip>
        </div>
      </div>

      {/* Day tabs — grid agar tidak tumpang tindih */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${Math.min(forecast.days.length, 4)}, 1fr)`,
          gap: '6px',
          marginBottom: '12px',
        }}
      >
        {forecast.days.map((day, i) => {
          const isActive  = safeActiveDay === i;
          const hasHeavy  = day.items?.some(it => isHeavyRain(it.weather)) ?? false;
          const hasRain   = day.items?.some(it => isRainy(it.weather)) ?? false;
          const tabColor  = hasHeavy ? '#e84040' : hasRain ? '#3b82f6' : '#12a896';
          return (
            <button
              key={i}
              onClick={() => setActiveDay(i)}
              style={{
                padding: '8px 4px',
                borderRadius: '10px',
                background: isActive ? tabColor : 'var(--surface)',
                color: isActive ? 'white' : tabColor,
                border: `1.5px solid ${isActive ? tabColor : tabColor + '40'}`,
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.01em',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{day.dayLabel}</span>
              <span style={{ opacity: 0.85, flexShrink: 0, display: 'flex' }}>
                {hasHeavy ? (
                  <CloudLightning size={10} />
                ) : hasRain ? (
                  <CloudRain size={10} />
                ) : (
                  <Sun size={10} />
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* Day summary */}
      <DaySummary day={currentDay} />

      {/* Hourly scroll — padding kiri-kanan agar tidak mepet */}
      <div
        style={{
          overflowX: 'auto',
          marginTop: '12px',
          paddingBottom: '4px',
          scrollbarWidth: 'none',
          /* Extend scroll area slightly past card edge feel */
          margin: '12px -4px 0',
          padding: '0 4px 6px',
        }}
      >
        <div style={{ display: 'flex', gap: '8px', width: 'max-content' }}>
          {currentDay.items.map((item, i) => {
            const rain        = isRainy(item.weather);
            const heavy       = isHeavyRain(item.weather);
            const cardBg      = heavy ? 'rgba(232,64,64,0.07)' : rain ? 'rgba(96,165,250,0.08)' : 'var(--surface)';
            const accentColor = heavy ? '#e84040' : rain ? '#3b82f6' : '#12a896';
            const iconColor   = getWeatherIconColor(item.weather_desc);

            return (
              <div
                key={i}
                className="flex flex-col items-center p-2.5 rounded-2xl"
                style={{
                  width: '68px',
                  background: cardBg,
                  border: `1px solid ${accentColor}20`,
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    marginBottom: '6px',
                    color: '#6b9e96',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {formatHour(item.datetime)}
                </span>

                {/* Weather icon instead of emoji */}
                <span style={{ color: iconColor, marginBottom: '5px', display: 'flex' }}>
                  <WeatherIcon desc={item.weather_desc} size={22} />
                </span>

                <span
                  className="text-center mb-2"
                  style={{
                    fontSize: '9px',
                    color: accentColor,
                    fontWeight: 600,
                    lineHeight: 1.3,
                  }}
                >
                  {item.weather_desc.length > 12 ? item.weather_desc.slice(0, 11) + '…' : item.weather_desc}
                </span>

                <div className="flex items-center gap-0.5 mb-1">
                  <Thermometer size={9} style={{ color: '#f97316' }} strokeWidth={2} />
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#0d2520', fontFamily: 'var(--font-mono)' }}>
                    {item.t}°
                  </span>
                </div>
                <div className="flex items-center gap-0.5 mb-1">
                  <Droplets size={9} style={{ color: accentColor }} strokeWidth={2} />
                  <span style={{ fontSize: '11px', fontWeight: 600, color: accentColor, fontFamily: 'var(--font-mono)' }}>
                    {item.hu}%
                  </span>
                </div>
                <div className="flex items-center gap-0.5">
                  <Wind size={9} style={{ color: '#94b5af' }} strokeWidth={2} />
                  <span style={{ fontSize: '10px', color: '#94b5af', fontFamily: 'var(--font-mono)' }}>
                    {item.ws}
                  </span>
                </div>

                {heavy && (
                  <span
                    className="font-bold px-1.5 rounded-full mt-1.5"
                    style={{ background: '#e8404020', color: '#e84040', fontSize: '8px', fontWeight: 800, letterSpacing: '0.05em' }}
                  >
                    LEBAT
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          marginTop: '14px',
          paddingTop: '12px',
          borderTop: '1px solid var(--border)',
          color: '#b2cdc9',
          fontSize: '10px',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Thermometer size={10} strokeWidth={1.8} /> Suhu (°C)</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Droplets size={10} strokeWidth={1.8} /> Kelembaban (%)</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Wind size={10} strokeWidth={1.8} /> Angin (km/j)</span>
      </div>
    </div>
  );
}

// ── Helper components ──────────────────────────────────────────

function SectionHeader() {
  return (
    <div className="flex items-center gap-2">
      <div
        className="flex items-center justify-center rounded-lg"
        style={{ width: '28px', height: '28px', background: 'rgba(7,176,204,0.1)', color: '#07b0cc' }}
      >
        <Cloud size={14} strokeWidth={2.2} />
      </div>
      <span
        style={{
          fontSize: '10px',
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: '#6b9e96',
        }}
      >
        Prakiraan Cuaca &amp; Prediksi Banjir
      </span>
    </div>
  );
}

function StatChip({
  icon,
  color,
  children,
}: {
  icon: React.ReactNode;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center gap-1"
      style={{ color: '#5a8a84', fontSize: '11px', fontWeight: 500 }}
    >
      <span style={{ color }}>{icon}</span>
      <span>{children}</span>
    </div>
  );
}

function DaySummary({ day }: { day: BmkgDayForecast }) {
  if (!day?.items || day.items.length === 0) return null;
  const minT     = Math.min(...day.items.map(i => i.t));
  const maxT     = Math.max(...day.items.map(i => i.t));
  const avgHu    = Math.round(day.items.reduce((s, i) => s + i.hu, 0) / (day.items.length || 1));
  const rainCnt  = day.items.filter(i => isRainy(i.weather)).length;
  const heavyCnt = day.items.filter(i => isHeavyRain(i.weather)).length;

  return (
    <div className="flex gap-2 flex-wrap mb-1">
      <Chip icon={<Thermometer size={10} strokeWidth={2} />} label={`${minT}°–${maxT}°C`} />
      <Chip icon={<Droplets size={10} strokeWidth={2} />} label={`Kelembaban ~${avgHu}%`} />
      <Chip
        icon={<CloudRain size={10} strokeWidth={2} />}
        label={`Hujan ${rainCnt * 3} jam`}
        color={rainCnt > 0 ? '#3b82f6' : undefined}
      />
      {heavyCnt > 0 && (
        <Chip
          icon={<CloudLightning size={10} strokeWidth={2} />}
          label={`Lebat ${heavyCnt * 3} jam`}
          color="#e84040"
        />
      )}
    </div>
  );
}

function Chip({ icon, label, color }: { icon: React.ReactNode; label: string; color?: string }) {
  return (
    <div
      className="flex items-center gap-1 px-2.5 py-1 rounded-full"
      style={{
        background: color ? `${color}10` : 'var(--surface)',
        border: `1px solid ${color ? color + '25' : 'rgba(12,160,140,0.14)'}`,
      }}
    >
      <span style={{ color: color ?? '#6b9e96', display: 'flex' }}>{icon}</span>
      <span style={{ fontSize: '11px', fontWeight: 600, color: color ?? '#6b9e96' }}>{label}</span>
    </div>
  );
}