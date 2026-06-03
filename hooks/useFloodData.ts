'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { ref, onValue, off, set } from 'firebase/database';
import { database } from '@/lib/firebase';
import {
  SensorData,
  ThresholdData,
  HistoryEntry,
  getFloodStatus,
  DEFAULT_THRESHOLDS,
} from '@/lib/types';

const HISTORY_KEY = 'flood_alert_history';
const MAX_HISTORY = 48;

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
  const [thresholds, setThresholds] = useState<ThresholdData>(DEFAULT_THRESHOLDS);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const prevKetinggianRef = useRef<number | null>(null);
  const offlineSetRef = useRef(false);

  const addHistory = useCallback((ketinggian: number, status: HistoryEntry['status']) => {
    const entry: HistoryEntry = {
      timestamp: Date.now(),
      ketinggian,
      status,
    };
    setHistory(prev => {
      const updated = [...prev, entry].slice(-MAX_HISTORY);
      saveHistory(updated);
      return updated;
    });
  }, []);

  useEffect(() => {
    setHistory(loadHistory());

    const statusRef = ref(database, 'sensor_banjir/status_alat');
    const sensorRef = ref(database, 'sensor_banjir');
    const thresholdRef = ref(database, 'threshold');

    // Set status_alat = offline saat page load/refresh
    if (!offlineSetRef.current) {
      offlineSetRef.current = true;
      set(statusRef, 'offline').catch(() => {});
    }

    // Listen threshold dari Firebase — update realtime jika diubah
    const unsubscribeThreshold = onValue(thresholdRef, (snapshot) => {
      const val = snapshot.val() as ThresholdData | null;
      if (val) {
        // Pastikan semua field ada, fallback ke default jika tidak
        setThresholds({
          AMAN:   val.AMAN   ?? DEFAULT_THRESHOLDS.AMAN,
          SIAGA:  val.SIAGA  ?? DEFAULT_THRESHOLDS.SIAGA,
          BAHAYA: val.BAHAYA ?? DEFAULT_THRESHOLDS.BAHAYA,
          KRITIS: val.KRITIS ?? DEFAULT_THRESHOLDS.KRITIS,
        });
      }
    });

    // Listen data sensor
    const unsubscribeSensor = onValue(
      sensorRef,
      (snapshot) => {
        setLoading(false);
        const val = snapshot.val() as SensorData | null;
        if (val) {
          setData(val);
          setLastUpdated(new Date());
          setError(null);

          // Hitung status dari threshold yang aktif
          const ketinggian = Number(val.ketinggian_air) || 0;
          const status = getFloodStatus(ketinggian, thresholds);

          if (
            prevKetinggianRef.current === null ||
            Math.abs(ketinggian - prevKetinggianRef.current) >= 0.5
          ) {
            addHistory(ketinggian, status);
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

    return () => {
      off(sensorRef, 'value', unsubscribeSensor);
      off(thresholdRef, 'value', unsubscribeThreshold);
    };
  }, [addHistory, thresholds]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    if (typeof window !== 'undefined') localStorage.removeItem(HISTORY_KEY);
  }, []);

  const isDeviceOnline = data?.status_alat === 'online';
  const isDataStale =
    lastUpdated ? Date.now() - lastUpdated.getTime() > 5 * 60 * 1000 : false;

  return {
    data,
    thresholds,
    history,
    loading,
    error,
    lastUpdated,
    isDeviceOnline,
    isDataStale,
    clearHistory,
  };
}