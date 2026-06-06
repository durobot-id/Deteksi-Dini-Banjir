'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { ref, onValue, off, set } from 'firebase/database';
import { database } from '@/lib/firebase';
import {
  SensorData,
  ThresholdData,
  CuacaConfig,
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
  } catch { return []; }
}

function saveHistory(entries: HistoryEntry[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(-MAX_HISTORY)));
  } catch {}
}

export function useFloodData() {
  const [data, setData]           = useState<SensorData | null>(null);
  const [thresholds, setThresholds] = useState<ThresholdData>(DEFAULT_THRESHOLDS);
  const [cuacaConfig, setCuacaConfig] = useState<CuacaConfig | null>(null);
  const [history, setHistory]     = useState<HistoryEntry[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const prevKetinggianRef = useRef<number | null>(null);
  const offlineSetRef     = useRef(false);
  const thresholdsRef     = useRef<ThresholdData>(DEFAULT_THRESHOLDS);

  const addHistory = useCallback((ketinggian: number, status: HistoryEntry['status']) => {
    const entry: HistoryEntry = { timestamp: Date.now(), ketinggian, status };
    setHistory(prev => {
      const updated = [...prev, entry].slice(-MAX_HISTORY);
      saveHistory(updated);
      return updated;
    });
  }, []);

  useEffect(() => {
    setHistory(loadHistory());

    const statusRef    = ref(database, 'sensor_banjir/status_alat');
    const sensorRef    = ref(database, 'sensor_banjir');
    const thresholdRef = ref(database, 'threshold');
    const cuacaRef     = ref(database, 'cuaca_config');

    if (!offlineSetRef.current) {
      offlineSetRef.current = true;
      set(statusRef, 'offline').catch(() => {});
    }

    // Listen threshold
    const unsubscribeThreshold = onValue(thresholdRef, (snapshot) => {
      const val = snapshot.val() as ThresholdData | null;
      if (val) {
        const t: ThresholdData = {
          AMAN:   val.AMAN   ?? DEFAULT_THRESHOLDS.AMAN,
          SIAGA:  val.SIAGA  ?? DEFAULT_THRESHOLDS.SIAGA,
          BAHAYA: val.BAHAYA ?? DEFAULT_THRESHOLDS.BAHAYA,
          KRITIS: val.KRITIS ?? DEFAULT_THRESHOLDS.KRITIS,
        };
        thresholdsRef.current = t;
        setThresholds(t);
      }
    });

    // Listen cuaca_config
    const unsubscribeCuaca = onValue(cuacaRef, (snapshot) => {
      const val = snapshot.val() as CuacaConfig | null;
      if (val?.adm4) setCuacaConfig(val);
    });

    // Listen sensor
    const unsubscribeSensor = onValue(
      sensorRef,
      (snapshot) => {
        setLoading(false);
        const val = snapshot.val() as SensorData | null;
        if (val) {
          setData(val);
          setLastUpdated(new Date());
          setError(null);
          const ketinggian = Number(val.ketinggian_air) || 0;
          const status = getFloodStatus(ketinggian, thresholdsRef.current);
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
      off(sensorRef,    'value', unsubscribeSensor);
      off(thresholdRef, 'value', unsubscribeThreshold);
      off(cuacaRef,     'value', unsubscribeCuaca);
    };
  }, [addHistory]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    if (typeof window !== 'undefined') localStorage.removeItem(HISTORY_KEY);
  }, []);

  const isDeviceOnline = data?.status_alat === 'online';
  const isDataStale    = lastUpdated
    ? Date.now() - lastUpdated.getTime() > 5 * 60 * 1000
    : false;

  return {
    data,
    thresholds,
    cuacaConfig,
    history,
    loading,
    error,
    lastUpdated,
    isDeviceOnline,
    isDataStale,
    clearHistory,
  };
}