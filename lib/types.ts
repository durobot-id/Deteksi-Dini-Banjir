export type FloodStatus = 'aman' | 'siaga' | 'bahaya' | 'kritis';

export interface SensorData {
  ketinggian_air: number;       // cm dengan desimal, contoh: 127.5
  wilayah: string;              // nama wilayah, contoh: "Ciliwung Hilir, Jakarta"
  koordinat?: {
    lat: number;
    lng: number;
  };
  radius_dampak?: number;       // meter
  status_alat: 'online' | 'offline' | 'maintenance';
  waktu_kirim: number;          // Unix timestamp (ms)
  status_banjir?: FloodStatus;  // opsional, bisa dihitung dari ketinggian_air
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
//     "status_banjir": "siaga"
//   }
// }
//
// Rules Firebase (firebase-rules.json):
// {
//   "rules": {
//     "sensor_banjir": {
//       ".read": true,
//       ".write": true
//     }
//   }
// }
//
// Untuk ESP32/Arduino, kirim data ke path:
//   PUT https://<DATABASE_URL>/sensor_banjir.json
// dengan body JSON seperti di atas.
// =============================================

export interface HistoryEntry {
  timestamp: number;
  ketinggian: number;
  status: FloodStatus;
}

export const THRESHOLDS = {
  AMAN: 80,       // cm
  SIAGA: 100,     // cm
  BAHAYA: 130,    // cm
  KRITIS: 150,    // cm
};

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
    aman: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', hex: '#10b981' },
    siaga: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', hex: '#f59e0b' },
    bahaya: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', hex: '#f97316' },
    kritis: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', hex: '#ef4444' },
  };
  return colors[status];
}
