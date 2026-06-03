# 🌊 Peringatan Dini Banjir

Aplikasi monitoring ketinggian air real-time berbasis **Next.js + Firebase Realtime Database**, dapat diinstall sebagai aplikasi HP (PWA), dan di-hosting gratis di **Vercel**.

---

## ✨ Fitur Aplikasi

| Fitur | Keterangan |
|-------|-----------|
| 📏 Ketinggian Air | Nilai cm dengan desimal, update real-time dari Firebase |
| 🚦 Status Banjir | Aman / Siaga / Bahaya / Kritis otomatis berdasarkan threshold |
| 📍 Status Wilayah | Nama wilayah + koordinat dari data sensor |
| 🗺️ Peta Google Maps | Radius dampak banjir dengan lokasi sensor |
| 🔔 Notifikasi | Alert otomatis saat status berubah, disimpan di browser |
| 📡 Status Alat | Online / Offline / Maintenance sensor |
| 📊 Riwayat | Grafik ketinggian air (disimpan di LocalStorage browser) |
| ⏱️ Waktu Sync | Waktu pengiriman data terakhir dari sensor |
| 📱 PWA | Bisa diinstall ke layar utama HP |

---

## 📁 Struktur Data Firebase

**Path:** `/sensor_banjir`

```json
{
  "sensor_banjir": {
    "ketinggian_air": 127.5,
    "wilayah": "Ciliwung Hilir, Jakarta",
    "koordinat": { "lat": -6.2088, "lng": 106.8456 },
    "radius_dampak": 2000,
    "status_alat": "online",
    "waktu_kirim": 1717300000000,
    "status_banjir": "siaga"
  }
}
```

### Threshold Status (cm):
| Status | Nilai |
|--------|-------|
| Aman   | < 80 cm |
| Siaga  | 80–99 cm |
| Bahaya | 100–129 cm |
| Kritis | ≥ 130 cm |

---

## ⚙️ Cara Setup

### 1. Clone & Install
```bash
cd flood-alert
npm install
```

### 2. Konfigurasi Firebase
```bash
cp .env.example .env.local
# Isi nilai dari Firebase Console > Project Settings > Your Apps
```

### 3. Firebase Rules
```json
{
  "rules": {
    "sensor_banjir": { ".read": true, ".write": true }
  }
}
```

### 4. Jalankan Lokal
```bash
npm run dev
```

---

## 🚀 Deploy ke Vercel

1. Push ke GitHub
2. Import di vercel.com
3. Tambahkan Environment Variables dari .env.local
4. Deploy!

---

## 📱 Install ke HP (PWA)

**Android Chrome:** Menu ⋮ → "Add to Home Screen"
**iOS Safari:** Share → "Add to Home Screen"

---

## 🔌 Integrasi ESP32

```cpp
FirebaseJson json;
json.set("ketinggian_air", waterLevel);
json.set("wilayah", "Nama Wilayah");
json.set("koordinat/lat", -6.2088);
json.set("koordinat/lng", 106.8456);
json.set("radius_dampak", 2000);
json.set("status_alat", "online");
json.set("waktu_kirim", (long long)time(nullptr) * 1000);
Firebase.RTDB.setJSON(&fbdo, "/sensor_banjir", &json);
```
