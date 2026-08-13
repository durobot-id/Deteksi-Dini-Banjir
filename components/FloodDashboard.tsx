'use client';

import { useRef } from 'react';
import { useFloodData } from '@/hooks/useFloodData';
import Header from '@/components/Header';
import WaterLevelGauge from '@/components/WaterLevelGauge';
import StatusCards from '@/components/StatusCards';
import MapWidget from '@/components/MapWidget';
import HistoryChart from '@/components/HistoryChart';
import Notifications from '@/components/Notifications';
import AlertBanner from '@/components/AlertBanner';
import InstallBanner from '@/components/InstallBanner';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import WeatherForecast from '@/components/WeatherForecast';
import NotificationPermission from '@/components/NotificationPermission';
import { getFloodStatus, DEFAULT_THRESHOLDS } from '@/lib/types';
import { AlertCircle, RefreshCw, Loader2 } from 'lucide-react';

export default function FloodDashboard() {
  const {
    data,
    thresholds,
    cuacaConfig,
    history,
    loading,
    error,
    lastUpdated,
    isDeviceOnline,
    clearHistory,
  } = useFloodData();

  const prevKetinggianRef = useRef<number | undefined>(undefined);
  const prevKetinggian = prevKetinggianRef.current;
  if (data) prevKetinggianRef.current = data.ketinggian_air;

  // Pakai threshold dari Firebase; jika belum ada fallback ke default hanya untuk kalkulasi
  const activeThresholds = thresholds ?? DEFAULT_THRESHOLDS;
  const status = data ? getFloodStatus(data.ketinggian_air, activeThresholds) : 'aman';

  // ── Loading state ──
  if (loading) return <LoadingSkeleton />;

  // ── Error state ──
  if (error) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ background: 'var(--surface)' }}
      >
        <div
          className="card w-full text-center"
          style={{ maxWidth: '360px', padding: '32px 24px' }}
        >
          <div
            className="flex items-center justify-center mx-auto mb-4 rounded-2xl"
            style={{ width: '56px', height: '56px', background: 'rgba(232,64,64,0.1)' }}
          >
            <AlertCircle size={26} style={{ color: '#e84040' }} strokeWidth={2} />
          </div>
          <h2 style={{ fontWeight: 800, fontSize: '17px', color: '#0d2520', marginBottom: '8px' }}>
            Gagal Terhubung
          </h2>
          <p style={{ fontSize: '13px', color: '#6b9e96', marginBottom: '20px', lineHeight: 1.5 }}>
            {error}
          </p>
          <div
            style={{
              background: 'var(--surface)',
              borderRadius: '12px',
              padding: '12px',
              marginBottom: '20px',
              textAlign: 'left',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: '#0d8f7e',
              lineHeight: 1.7,
            }}
          >
            <p style={{ fontWeight: 700, marginBottom: '4px' }}>Periksa:</p>
            <p>• Konfigurasi Firebase di .env.local</p>
            <p>• Rules Firebase diset ke public</p>
            <p>• Koneksi internet aktif</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 mx-auto px-5 py-2.5 rounded-xl"
            style={{ background: '#12a896', color: 'white', fontSize: '13px', fontWeight: 700 }}
          >
            <RefreshCw size={14} strokeWidth={2.5} />
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  // ── Waiting for Firebase data (sensor ada tapi thresholds belum) ──
  if (!data) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--surface)' }}
      >
        <div className="flex flex-col items-center gap-3">
          <Loader2
            size={28}
            style={{ color: '#12a896', animation: 'spin 1s linear infinite' }}
            strokeWidth={2}
          />
          <p style={{ fontSize: '13px', color: '#6b9e96', fontWeight: 500 }}>
            Menunggu data sensor…
          </p>
        </div>
      </div>
    );
  }

  // Koordinat: prioritas dari cuaca_config, fallback ke sensor_banjir
  // Jika tidak ada koordinat sama sekali → peta tidak ditampilkan
  const koordinat = cuacaConfig?.koordinat ?? data.koordinat;

  return (
    <>
      <Header isOnline={isDeviceOnline} />

      <main
        style={{
          maxWidth: '600px',
          margin: '0 auto',
          padding: '16px 20px 96px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
        className="animate-fadeInUp"
      >
        {/* Izin notifikasi */}
        <NotificationPermission />

        {/* Banner peringatan — hanya muncul saat bahaya/kritis */}
        {(status === 'bahaya' || status === 'kritis') && (
          <AlertBanner status={status} ketinggian={data.ketinggian_air} />
        )}

        {/* Gauge ketinggian air */}
        <WaterLevelGauge
          ketinggian={data.ketinggian_air}
          status={status}
          prevKetinggian={prevKetinggian}
        />

        {/* Status cards — 2 kolom, adaptif */}
        <StatusCards data={data} lastUpdated={lastUpdated} />

        {/* Peta — hanya jika ada koordinat dari Firebase */}
        {koordinat && (
          <MapWidget
            data={{ ...data, koordinat }}
            status={status}
          />
        )}

        {/* Prakiraan cuaca BMKG — hanya jika cuaca_config ada di Firebase */}
        {cuacaConfig?.adm4 && (
          <WeatherForecast
            adm4={cuacaConfig.adm4}
            namaWilayah={cuacaConfig.nama_wilayah}
            ketinggian={data.ketinggian_air}
          />
        )}

        {/* Grafik riwayat */}
        <HistoryChart history={history} onClear={clearHistory} thresholds={activeThresholds} />

        {/* Notifikasi & alarm */}
        <Notifications
          currentStatus={status}
          ketinggian={data.ketinggian_air}
          thresholds={activeThresholds}
        />
      </main>

      <InstallBanner />
    </>
  );
}