'use client';

import { useEffect, useState } from 'react';

export interface BmkgWeatherItem {
  datetime: string;
  t: number;
  hu: number;
  weather: number;
  weather_desc: string;
  ws: number;
  wd: string;
  tcc: number;
  tp?: number;
}

export interface BmkgDayForecast {
  date: string;
  dayLabel: string;
  items: BmkgWeatherItem[];
}

export interface BmkgForecast {
  wilayah: string;
  days: BmkgDayForecast[];
  allItems: BmkgWeatherItem[];
  fetchedAt: Date;
}

const RAIN_WEATHER_CODES  = [60, 61, 63, 65, 80, 81, 95, 97];
const HEAVY_RAIN_CODES    = [63, 65, 81, 95, 97];

export function isRainy(code: number)     { return RAIN_WEATHER_CODES.includes(code); }
export function isHeavyRain(code: number) { return HEAVY_RAIN_CODES.includes(code); }

export function getWeatherLabel(code: number): string {
  const map: Record<number, string> = {
    0: 'Cerah', 1: 'Cerah', 2: 'Cerah Berawan', 3: 'Berawan',
    4: 'Berawan Tebal', 5: 'Udara Kabur', 10: 'Asap', 45: 'Berkabut',
    60: 'Hujan Ringan', 61: 'Hujan Sedang', 63: 'Hujan Lebat',
    65: 'Hujan Sangat Lebat', 80: 'Hujan Lokal', 81: 'Hujan Petir',
    95: 'Hujan Petir', 97: 'Hujan Petir Lebat',
  };
  return map[code] ?? 'Tidak diketahui';
}

export function getWeatherEmoji(code: number): string {
  if (HEAVY_RAIN_CODES.includes(code))   return '⛈️';
  if (RAIN_WEATHER_CODES.includes(code)) return '🌧️';
  if (code === 45) return '🌫️';
  if (code === 4)  return '☁️';
  if (code === 3)  return '🌥️';
  if (code <= 2)   return '☀️';
  return '🌤️';
}

// Parse ISO datetime dari BMKG → Date object (konversi UTC ke WIB)
export function parseBmkgDatetime(datetimeStr: string): Date {
  return new Date(datetimeStr); // ISO format langsung bisa di-parse
}

// Format jam dari ISO string → "09:00" (WIB)
export function formatHour(datetimeStr: string): string {
  const d = new Date(datetimeStr);
  return d.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  });
}

export function getDayLabel(date: Date): string {
  const today    = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  const dateStr    = date.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' });
  const todayStr   = today.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' });
  const tomorrowStr = tomorrow.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' });

  if (dateStr === todayStr)    return 'Hari ini';
  if (dateStr === tomorrowStr) return 'Besok';
  return date.toLocaleDateString('id-ID', {
    weekday: 'short', day: 'numeric', month: 'short',
    timeZone: 'Asia/Jakarta',
  });
}

export function useBmkgWeather(adm4?: string, namaWilayah?: string) {
  const [forecast, setForecast] = useState<BmkgForecast | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    if (!adm4) return;

    setLoading(true);
    setError(null);
    setForecast(null);

    fetch(`/api/bmkg?adm4=${adm4}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(json => {
        if (json.error) throw new Error(json.error);

        // =============================================
        // Struktur response BMKG terbaru:
        // json.data[0].cuaca = [ [item, item, ...], [item, ...], [...] ]
        // Setiap sub-array adalah satu kelompok hari
        // =============================================
        const cuacaGroups: BmkgWeatherItem[][] = json?.data?.[0]?.cuaca ?? [];

        if (!cuacaGroups || cuacaGroups.length === 0) {
          throw new Error('Data cuaca kosong dari BMKG');
        }

        // Flatten semua items dari semua grup
        const now = Date.now();
        const allRaw = cuacaGroups.flat();

        const allItems: BmkgWeatherItem[] = allRaw
          .map(item => ({
            ...item,
            weather:      Number(item.weather),
            weather_desc: item.weather_desc || getWeatherLabel(Number(item.weather)),
            t:   Number(item.t),
            hu:  Number(item.hu),
            ws:  Number(item.ws ?? 0),
            tcc: Number(item.tcc ?? 0),
            tp:  Number(item.tp ?? 0),
          }))
          .filter(item => {
            const d = parseBmkgDatetime(item.datetime);
            return !isNaN(d.getTime()) && d.getTime() >= now - 3600_000;
          });

        if (allItems.length === 0) {
          throw new Error('Tidak ada data cuaca yang valid');
        }

        // Kelompokkan per hari (berdasarkan tanggal lokal WIB)
        const dayMap = new Map<string, BmkgWeatherItem[]>();
        for (const item of allItems) {
          const d   = parseBmkgDatetime(item.datetime);
          const key = d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' }); // "2026-06-06"
          if (!dayMap.has(key)) dayMap.set(key, []);
          dayMap.get(key)!.push(item);
        }

        const days: BmkgDayForecast[] = Array.from(dayMap.entries()).map(([date, its]) => ({
          date,
          dayLabel: getDayLabel(new Date(date + 'T00:00:00+07:00')),
          items: its,
        }));

        setForecast({
          wilayah: namaWilayah ?? adm4,
          days,
          allItems,
          fetchedAt: new Date(),
        });
        setLoading(false);
      })
      .catch(err => {
        console.error('[BMKG]', err);
        setError('Gagal memuat data BMKG: ' + err.message);
        setLoading(false);
      });
  }, [adm4, namaWilayah]);

  return { forecast, loading, error };
}

// Prediksi risiko banjir
export type FloodRisk = 'rendah' | 'sedang' | 'tinggi' | 'sangat_tinggi';

export interface FloodPrediction {
  risk: FloodRisk;
  label: string;
  emoji: string;
  color: string;
  bgColor: string;
  description: string;
  rainHours: number;
  heavyRainHours: number;
  maxHumidity: number;
  estimatedRiseCm: number;
}

export function predictFloodRisk(
  items: BmkgWeatherItem[],
  currentKetinggian: number,
): FloodPrediction {
  const first24     = items.slice(0, 8);
  const rainHours   = first24.filter(i => isRainy(i.weather)).length * 3;
  const heavyHours  = first24.filter(i => isHeavyRain(i.weather)).length * 3;
  const maxHumidity = first24.length > 0 ? Math.max(...first24.map(i => i.hu)) : 0;
  const avgHumidity = first24.length > 0
    ? first24.reduce((s, i) => s + i.hu, 0) / first24.length
    : 0;
  const estimatedRiseCm = Math.round(heavyHours * 4 + (rainHours - heavyHours) * 1.5);

  let risk: FloodRisk;
  if (heavyHours >= 9 || (heavyHours >= 6 && currentKetinggian > 80)) {
    risk = 'sangat_tinggi';
  } else if (heavyHours >= 3 || (rainHours >= 12 && avgHumidity > 85)) {
    risk = 'tinggi';
  } else if (rainHours >= 6 || avgHumidity > 80) {
    risk = 'sedang';
  } else {
    risk = 'rendah';
  }

  const map: Record<FloodRisk, Omit<FloodPrediction, 'risk'|'rainHours'|'heavyRainHours'|'maxHumidity'|'estimatedRiseCm'>> = {
    rendah:        { label: 'Risiko Rendah',        emoji: '✅', color: '#10b981', bgColor: 'rgba(16,185,129,0.08)',  description: 'Prakiraan cuaca cerah hingga berawan. Risiko kenaikan air minimal.' },
    sedang:        { label: 'Risiko Sedang',        emoji: '🌧️', color: '#f59e0b', bgColor: 'rgba(245,158,11,0.08)', description: 'Ada potensi hujan ringan–sedang. Pantau ketinggian air secara berkala.' },
    tinggi:        { label: 'Risiko Tinggi',        emoji: '⚠️', color: '#f97316', bgColor: 'rgba(249,115,22,0.08)', description: 'Hujan lebat diprakirakan terjadi. Waspadai potensi kenaikan air signifikan.' },
    sangat_tinggi: { label: 'Risiko Sangat Tinggi', emoji: '🚨', color: '#ef4444', bgColor: 'rgba(239,68,68,0.08)',  description: 'Hujan lebat berkepanjangan. Kemungkinan besar air akan naik drastis. Bersiap evakuasi.' },
  };

  return { risk, ...map[risk], rainHours, heavyRainHours: heavyHours, maxHumidity, estimatedRiseCm };
}