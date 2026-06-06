'use client';

import { useState } from 'react';
import { Cloud, Droplets, Wind, Thermometer, TrendingUp, RefreshCw, AlertTriangle } from 'lucide-react';
import {
  useBmkgWeather,
  predictFloodRisk,
  getWeatherEmoji,
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

export default function WeatherForecast({ adm4, namaWilayah, ketinggian }: WeatherForecastProps) {
  const { forecast, loading, error } = useBmkgWeather(adm4, namaWilayah);
  const [activeDay, setActiveDay] = useState(0);

  const safeActiveDay = forecast?.days?.length
    ? Math.min(activeDay, forecast.days.length - 1)
    : 0;

  // Ganti kondisi !lat || !lng menjadi:
  if (!adm4) {
    return (
      <div className="card p-5">
        <SectionHeader />
        <div className="flex items-center justify-center py-6 rounded-xl" style={{ background: '#f0fdfa' }}>
          <p className="text-sm" style={{ color: '#94b5af' }}>
            Kode wilayah BMKG belum diisi di Firebase
          </p>
          <p className="text-xs mt-1" style={{ color: '#b2cdc9' }}>
            Tambahkan <code>cuaca_config.adm4</code> di Firebase
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="card p-5">
        <SectionHeader />
        <div className="flex flex-col gap-3 mt-4">
          <div className="h-24 rounded-2xl animate-pulse" style={{ background: '#f0fdfa' }} />
          <div className="flex gap-2">
            {[0,1,2].map(i => (
              <div key={i} className="h-8 flex-1 rounded-xl animate-pulse" style={{ background: '#f0fdfa' }} />
            ))}
          </div>
          <div className="flex gap-2 overflow-hidden">
            {[0,1,2,3,4,5,6,7].map(i => (
              <div key={i} className="h-28 w-16 shrink-0 rounded-xl animate-pulse" style={{ background: '#f0fdfa' }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !forecast) {
    return (
      <div className="card p-5">
        <SectionHeader />
        <div className="flex items-center gap-3 p-4 rounded-xl mt-4"
          style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
          <AlertTriangle size={16} style={{ color: '#ef4444', flexShrink: 0 }} />
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: '#ef4444' }}>Gagal memuat data BMKG</p>
            <p className="text-xs mt-0.5" style={{ color: '#94b5af' }}>{error ?? 'Coba refresh halaman'}</p>
          </div>
          <button onClick={() => window.location.reload()}
            className="p-1.5 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
            <RefreshCw size={12} />
          </button>
        </div>
      </div>
    );
  }

  // Guard: data BMKG belum ada isinya (days kosong)
  if (!forecast.days || forecast.days.length === 0) {
    return (
      <div className="card p-5">
        <SectionHeader />
        <div className="flex items-center justify-center py-6 rounded-xl mt-4" style={{ background: '#f0fdfa' }}>
          <p className="text-sm" style={{ color: '#94b5af' }}>Data cuaca BMKG tidak tersedia untuk wilayah ini</p>
        </div>
      </div>
    );
  }

  const prediction = predictFloodRisk(forecast.allItems, ketinggian);
  const safeDayIndex = safeActiveDay;
  const currentDay = forecast.days[safeDayIndex];

  return (
    <div className="card p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Cloud size={14} style={{ color: '#6b9e96' }} />
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#6b9e96' }}>
              Prakiraan Cuaca & Prediksi Banjir
            </span>
            <p className="text-xs mt-0.5" style={{ color: '#b2cdc9' }}>
              BMKG · {forecast.wilayah}
            </p>
          </div>
        </div>
        <span className="text-xs px-2 py-1 rounded-full font-medium"
          style={{ background: '#f0fdfa', color: '#6b9e96', fontFamily: 'var(--font-mono)' }}>
          {forecast.fetchedAt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* Prediksi Risiko Banjir */}
      <div className="rounded-2xl p-4 mb-4"
        style={{ background: prediction.bgColor, border: `1.5px solid ${prediction.color}25` }}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span style={{ fontSize: '1.1rem' }}>{prediction.emoji}</span>
              <span className="font-extrabold text-sm" style={{ color: prediction.color }}>
                {prediction.label}
              </span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: '#5a8a84' }}>
              {prediction.description}
            </p>
          </div>
          {prediction.estimatedRiseCm > 0 && (
            <div className="flex flex-col items-center px-3 py-2 rounded-xl shrink-0"
              style={{ background: `${prediction.color}15` }}>
              <TrendingUp size={14} style={{ color: prediction.color }} />
              <span className="font-extrabold text-base mt-0.5"
                style={{ color: prediction.color, fontFamily: 'var(--font-mono)' }}>
                +{prediction.estimatedRiseCm}
              </span>
              <span className="text-xs font-medium" style={{ color: prediction.color, opacity: 0.7 }}>
                cm est.
              </span>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="flex gap-3 mt-3 flex-wrap">
          <div className="flex items-center gap-1">
            <Droplets size={11} style={{ color: prediction.color }} />
            <span className="text-xs font-semibold" style={{ color: '#5a8a84' }}>
              Hujan: <strong style={{ color: prediction.color }}>{prediction.rainHours} jam</strong>
            </span>
          </div>
          {prediction.heavyRainHours > 0 && (
            <div className="flex items-center gap-1">
              <span style={{ fontSize: '10px' }}>⛈️</span>
              <span className="text-xs font-semibold" style={{ color: '#5a8a84' }}>
                Lebat: <strong style={{ color: '#ef4444' }}>{prediction.heavyRainHours} jam</strong>
              </span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <span style={{ fontSize: '10px' }}>💧</span>
            <span className="text-xs font-semibold" style={{ color: '#5a8a84' }}>
              Kelembaban maks: <strong style={{ color: prediction.color }}>{prediction.maxHumidity}%</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Tab pilih hari */}
      <div className="flex gap-2 mb-3">
        {forecast.days.map((day, i) => {
          const isActive = safeActiveDay === i;
          const hasRain  = day.items?.some(it => isRainy(it.weather)) ?? false;
          const hasHeavy = day.items?.some(it => isHeavyRain(it.weather)) ?? false;
          const tabColor = hasHeavy ? '#ef4444' : hasRain ? '#3b82f6' : '#14b8a6';
          return (
            <button key={i} onClick={() => setActiveDay(i)}
              className="flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all"
              style={{
                background: isActive ? tabColor : '#f0fdfa',
                color: isActive ? 'white' : tabColor,
                border: `1.5px solid ${isActive ? tabColor : tabColor + '40'}`,
              }}>
              <span>{day.dayLabel}</span>
              <span className="ml-1 text-xs opacity-80">
                {hasHeavy ? '⛈️' : hasRain ? '🌧️' : '☀️'}
              </span>
            </button>
          );
        })}
      </div>

      {/* Ringkasan hari yang dipilih */}
      <DaySummary day={currentDay} />

      {/* Scroll per jam */}
      <div className="overflow-x-auto mt-3 pb-1" style={{ scrollbarWidth: 'none' }}>
        <div className="flex gap-2" style={{ width: 'max-content' }}>
          {currentDay.items.map((item, i) => {
            const rain        = isRainy(item.weather);
            const heavy       = isHeavyRain(item.weather);
            const cardBg      = heavy ? 'rgba(239,68,68,0.07)' : rain ? 'rgba(96,165,250,0.08)' : '#f8fffe';
            const accentColor = heavy ? '#ef4444' : rain ? '#3b82f6' : '#14b8a6';

            return (
              <div key={i} className="flex flex-col items-center p-2.5 rounded-2xl"
                style={{ width: '68px', background: cardBg, border: `1px solid ${accentColor}20`, flexShrink: 0 }}>
                <span className="text-xs font-bold mb-1"
                  style={{ color: '#6b9e96', fontFamily: 'var(--font-mono)' }}>
                  {formatHour(item.datetime)}
                </span>
                <span style={{ fontSize: '1.5rem', lineHeight: 1, marginBottom: '4px' }}>
                  {getWeatherEmoji(item.weather)}
                </span>
                <span className="text-center mb-1.5"
                  style={{ fontSize: '9px', color: accentColor, fontWeight: 600, lineHeight: 1.3 }}>
                  {item.weather_desc.length > 12 ? item.weather_desc.slice(0, 11) + '…' : item.weather_desc}
                </span>
                <div className="flex items-center gap-0.5 mb-0.5">
                  <Thermometer size={9} style={{ color: '#f97316' }} />
                  <span className="text-xs font-bold" style={{ color: '#0f2923', fontFamily: 'var(--font-mono)' }}>
                    {item.t}°
                  </span>
                </div>
                <div className="flex items-center gap-0.5 mb-0.5">
                  <Droplets size={9} style={{ color: accentColor }} />
                  <span className="text-xs font-semibold" style={{ color: accentColor, fontFamily: 'var(--font-mono)' }}>
                    {item.hu}%
                  </span>
                </div>
                <div className="flex items-center gap-0.5">
                  <Wind size={9} style={{ color: '#94b5af' }} />
                  <span className="text-xs" style={{ color: '#94b5af', fontFamily: 'var(--font-mono)' }}>
                    {item.ws}
                  </span>
                </div>
                {heavy && (
                  <span className="text-xs font-bold px-1.5 rounded-full mt-1"
                    style={{ background: '#ef444420', color: '#ef4444', fontSize: '9px' }}>
                    LEBAT
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-xs mt-3" style={{ color: '#b2cdc9' }}>
        🌡️ Suhu (°C) · 💧 Kelembaban (%) · 💨 Angin (km/j)
      </p>
    </div>
  );
}

function SectionHeader() {
  return (
    <div className="flex items-center gap-2">
      <Cloud size={14} style={{ color: '#6b9e96' }} />
      <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#6b9e96' }}>
        Prakiraan Cuaca & Prediksi Banjir
      </span>
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
    <div className="flex gap-2 flex-wrap">
      <Chip icon="🌡️" label={`${minT}°–${maxT}°C`} />
      <Chip icon="💧" label={`Kelembaban ~${avgHu}%`} />
      <Chip icon="🌧️" label={`Hujan ${rainCnt * 3} jam`} color={rainCnt > 0 ? '#3b82f6' : undefined} />
      {heavyCnt > 0 && <Chip icon="⛈️" label={`Lebat ${heavyCnt * 3} jam`} color="#ef4444" />}
    </div>
  );
}

function Chip({ icon, label, color }: { icon: string; label: string; color?: string }) {
  return (
    <div className="flex items-center gap-1 px-2.5 py-1 rounded-full"
      style={{
        background: color ? `${color}10` : '#f0fdfa',
        border: `1px solid ${color ? color + '25' : 'rgba(20,184,166,0.15)'}`,
      }}>
      <span style={{ fontSize: '11px' }}>{icon}</span>
      <span className="text-xs font-semibold" style={{ color: color ?? '#6b9e96' }}>{label}</span>
    </div>
  );
}