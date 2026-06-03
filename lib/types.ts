export type FloodStatus = 'aman' | 'siaga' | 'bahaya' | 'kritis';

export interface SensorData {
  ketinggian_air: number;       // cm dengan desimal, contoh: 127.5
  wilayah: string;              // nama wilayah
  koordinat?: {
    lat: number;
    lng: number;
  };
  radius_dampak?: number;       // meter
  status_alat: 'online' | 'offline' | 'maintenance';
  waktu_kirim: number;          // Unix timestamp (ms)
  status_banjir: FloodStatus;   // wajib diisi dari Firebase: "aman" | "siaga" | "bahaya" | "kritis"
}

// =============================================
// STRUKTUR DATA FIREBASE REALTIME DATABASE
// =============================================
//
// Root: /sensor_banjir
//
// {
//   "sensor_banjir": {
//     "ketinggian_air": 127.5,
//     "wilayah": "Ciliwung Hilir, Jakarta",
//     "koordinat": {
//       "lat": -6.2088,
//       "lng": 106.8456
//     },
//     "radius_dampak": 2000,
//     "status_alat": "online",
//     "waktu_kirim": 1717300000000,
//     "status_banjir": "siaga"    <-- wajib diisi oleh sensor/ESP32
//   }
// }
// =============================================

export interface HistoryEntry {
  timestamp: number;
  ketinggian: number;
  status: FloodStatus;
}

export const THRESHOLDS = {
  AMAN: 80,
  SIAGA: 100,
  BAHAYA: 130,
  KRITIS: 150,
};

// Fallback jika status_banjir tidak ada di Firebase
export function getFloodStatus(cm: number): FloodStatus {
  if (cm >= THRESHOLDS.KRITIS) return 'kritis';
  if (cm >= THRESHOLDS.BAHAYA) return 'bahaya';
  if (cm >= THRESHOLDS.SIAGA) return 'siaga';
  return 'aman';
}

export function getStatusLabel(status: FloodStatus): string {
  const labels: Record<FloodStatus, string> = {
    aman: 'Aman',
    siaga: 'Siaga',
    bahaya: 'Bahaya',
    kritis: 'Kritis',
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