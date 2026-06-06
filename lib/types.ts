export type FloodStatus = 'aman' | 'siaga' | 'bahaya' | 'kritis';

export interface SensorData {
  ketinggian_air: number;
  wilayah: string;
  koordinat?: {
    lat: number;
    lng: number;
  };
  radius_dampak?: number;
  status_alat: 'online' | 'offline' | 'maintenance';
  waktu_kirim: number;
}

export interface ThresholdData {
  AMAN: number;
  SIAGA: number;
  BAHAYA: number;
  KRITIS: number;
}

export interface CuacaConfig {
  adm4: string;           // kode kecamatan BMKG, contoh: "31.72.01.1001"
  nama_wilayah: string;   // nama tampilan, contoh: "Gambir, Jakarta Pusat"
}

// =============================================
// STRUKTUR DATA FIREBASE REALTIME DATABASE
// =============================================
//
// {
//   "sensor_banjir": {
//     "ketinggian_air": 127.5,
//     "wilayah": "Ciliwung Hilir, Jakarta",
//     "koordinat": { "lat": -6.2088, "lng": 106.8456 },
//     "radius_dampak": 2000,
//     "status_alat": "online",
//     "waktu_kirim": 1717300000000
//   },
//   "threshold": {
//     "AMAN": 80,
//     "SIAGA": 100,
//     "BAHAYA": 130,
//     "KRITIS": 150
//   }
// }
// =============================================


export interface HistoryEntry {
  timestamp: number;
  ketinggian: number;
  status: FloodStatus;
}

export const DEFAULT_THRESHOLDS: ThresholdData = {
  AMAN: 80,
  SIAGA: 100,
  BAHAYA: 130,
  KRITIS: 150,
};

export function getFloodStatus(cm: number, thresholds: ThresholdData = DEFAULT_THRESHOLDS): FloodStatus {
  if (cm >= thresholds.KRITIS) return 'kritis';
  if (cm >= thresholds.BAHAYA) return 'bahaya';
  if (cm >= thresholds.SIAGA)  return 'siaga';
  return 'aman';
}

export function getStatusLabel(status: FloodStatus): string {
  const labels: Record<FloodStatus, string> = {
    aman: 'Aman', siaga: 'Siaga', bahaya: 'Bahaya', kritis: 'Kritis',
  };
  return labels[status];
}

export function getStatusColor(status: FloodStatus) {
  const colors: Record<FloodStatus, { bg: string; text: string; border: string; hex: string }> = {
    aman:   { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', hex: '#10b981' },
    siaga:  { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   hex: '#f59e0b' },
    bahaya: { bg: 'bg-orange-50',  text: 'text-orange-700',  border: 'border-orange-200',  hex: '#f97316' },
    kritis: { bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200',     hex: '#ef4444' },
  };
  return colors[status];
}
