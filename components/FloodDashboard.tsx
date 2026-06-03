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
import { getFloodStatus } from '@/lib/types';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function FloodDashboard() {
  const {
    data,
    thresholds,
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

  // Status dihitung dari ketinggian_air + threshold dari Firebase
  const status = data ? getFloodStatus(data.ketinggian_air, thresholds) : 'aman';

  if (loading) return <LoadingSkeleton />;

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#f8fffe' }}>
        <div className="card p-8 max-w-sm w-full text-center">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(239,68,68,0.1)' }}
          >
            <AlertCircle size={28} style={{ color: '#ef4444' }} />
          </div>
          <h2 className="font-bold text-lg mb-2" style={{ color: '#0f2923', fontFamily: 'var(--font-display)' }}>
            Gagal Terhubung
          </h2>
          <p className="text-sm mb-5" style={{ color: '#6b9e96' }}>{error}</p>
          <div
            className="text-xs p-3 rounded-xl text-left mb-4"
            style={{ background: '#f0fdfa', color: '#0d9488', fontFamily: 'var(--font-mono)' }}
          >
            <p className="font-bold mb-1">Periksa:</p>
            <p>• Konfigurasi Firebase di .env.local</p>
            <p>• Rules Firebase diset ke public</p>
            <p>• Koneksi internet aktif</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 mx-auto text-sm font-semibold px-4 py-2 rounded-xl transition-all hover:scale-95 active:scale-90"
            style={{ background: '#14b8a6', color: 'white' }}
          >
            <RefreshCw size={14} />
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header isOnline={isDeviceOnline} />

      <main className="max-w-4xl mx-auto px-4 py-4 pb-24 flex flex-col gap-4 animate-fadeInUp">
        {data && (status === 'bahaya' || status === 'kritis') && (
          <AlertBanner status={status} ketinggian={data.ketinggian_air} />
        )}

        {data && (
          <WaterLevelGauge
            ketinggian={data.ketinggian_air}
            status={status}
            prevKetinggian={prevKetinggian}
          />
        )}

        {data && <StatusCards data={data} lastUpdated={lastUpdated} />}
        {data && <MapWidget data={data} status={status} />}

        <HistoryChart history={history} onClear={clearHistory} />

        {data && <Notifications currentStatus={status} ketinggian={data.ketinggian_air} />}
      </main>

      <InstallBanner />
    </>
  );
}