'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { ref, onValue, off } from 'firebase/database';
import { database } from '@/lib/firebase';
import {
  SensorData,
  HistoryEntry,
  getFloodStatus,
  THRESHOLDS,
} from '@/lib/types';

const HISTORY_KEY = 'flood_alert_history';
const MAX_HISTORY = 48; // 48 titik data

function loadHistory(): HistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(entries: HistoryEntry[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(-MAX_HISTORY)));
  } catch {}
}

export function useFloodData() {
  const [data, setData] = useState<SensorData | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const prevKetinggianRef = useRef<number | null>(null);

  const addHistory = useCallback((ketinggian: number) => {
    const entry: HistoryEntry = {
      timestamp: Date.now(),
      ketinggian,
      status: getFloodStatus(ketinggian),
    };
    setHistory(prev => {
      const updated = [...prev, entry].slice(-MAX_HISTORY);
      saveHistory(updated);
      return updated;
    });
  }, []);

  useEffect(() => {
    // Load history from localStorage on mount
    setHistory(loadHistory());

    const sensorRef = ref(database, 'sensor_banjir');

    const unsubscribe = onValue(
      sensorRef,
      (snapshot) => {
        setLoading(false);
        const val = snapshot.val() as SensorData | null;
        if (val) {
          const ketinggian = Number(val.ketinggian_air) || 0;
          // Hitung status jika tidak disediakan
          const status = val.status_banjir || getFloodStatus(ketinggian);
          const enriched: SensorData = { ...val, status_banjir: status };
          setData(enriched);
          setLastUpdated(new Date());
          setError(null);

          // Catat ke history hanya jika nilai berubah signifikan (>0.5cm) atau pertama kali
          if (
            prevKetinggianRef.current === null ||
            Math.abs(ketinggian - prevKetinggianRef.current) >= 0.5
          ) {
            addHistory(ketinggian);
            prevKetinggianRef.current = ketinggian;
          }
        } else {
          setError('Data sensor tidak ditemukan di Firebase.');
        }
      },
      (err) => {
        setLoading(false);
        setError('Gagal terhubung ke Firebase: ' + err.message);
      }
    );

    return () => off(sensorRef, 'value', unsubscribe);
  }, [addHistory]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    if (typeof window !== 'undefined') localStorage.removeItem(HISTORY_KEY);
  }, []);

  const isDeviceOnline = data?.status_alat === 'online';
  const isDataStale =
    lastUpdated ? Date.now() - lastUpdated.getTime() > 5 * 60 * 1000 : false;

  const persen = data
    ? Math.min((data.ketinggian_air / THRESHOLDS.KRITIS) * 100, 100)
    : 0;

  return {
    data,
    history,
    loading,
    error,
    lastUpdated,
    isDeviceOnline,
    isDataStale,
    persen,
    clearHistory,
  };
}
