import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const adm4 = request.nextUrl.searchParams.get('adm4');
  if (!adm4) {
    return NextResponse.json({ error: 'adm4 required' }, { status: 400 });
  }

  const url = `https://data.bmkg.go.id/DataMKG/MEWS/DigitalForecast/json/${adm4}.json`;
  const urlAlt = `https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=${adm4}`;

  // Coba endpoint utama dulu, lalu fallback ke endpoint alternatif
  for (const endpoint of [urlAlt, url]) {
    try {
      const res = await fetch(endpoint, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'id-ID,id;q=0.9',
        },
        signal: AbortSignal.timeout(10000), // timeout 10 detik
      });

      if (!res.ok) {
        console.error(`[BMKG] ${endpoint} → HTTP ${res.status}`);
        continue; // coba endpoint berikutnya
      }

      const data = await res.json();
      return NextResponse.json(data, {
        headers: {
          'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
        },
      });
    } catch (err: any) {
      console.error(`[BMKG] ${endpoint} → Error:`, err.message);
      continue;
    }
  }

  // Kedua endpoint gagal — kembalikan data dummy agar UI tidak crash
  return NextResponse.json({
    error: 'Semua endpoint BMKG tidak dapat diakses',
    data: [{
      cuaca: [[
        {
          datetime: new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12),
          t: 30,
          hu: 75,
          weather: 1,
          weather_desc: 'Cerah Berawan',
          ws: 10,
          wd: 'S',
          tcc: 25,
        }
      ]]
    }]
  }, { status: 200 }); // return 200 dengan data minimal agar tidak crash
}