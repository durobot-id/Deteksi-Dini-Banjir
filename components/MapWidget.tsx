'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Maximize2, MapPin, Navigation, Layers } from 'lucide-react';
import { SensorData, FloodStatus, getStatusColor } from '@/lib/types';

interface MapWidgetProps {
  data: SensorData;
  status: FloodStatus;
}

const RADIUS_COLORS: Record<FloodStatus, { fill: string; stroke: string }> = {
  aman:   { fill: 'rgba(16,185,129,0.12)',  stroke: '#10b981' },
  siaga:  { fill: 'rgba(245,158,11,0.14)',  stroke: '#f59e0b' },
  bahaya: { fill: 'rgba(249,115,22,0.16)',  stroke: '#f97316' },
  kritis: { fill: 'rgba(239,68,68,0.18)',   stroke: '#ef4444' },
};

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    google: any;
    initFloodMap?: () => void;
  }
}

export default function MapWidget({ data, status }: MapWidgetProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const circleRef = useRef<any>(null);
  const [expanded, setExpanded] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);

  const lat = data.koordinat?.lat ?? -6.2088;
  const lng = data.koordinat?.lng ?? 106.8456;
  const radius = data.radius_dampak ?? 1000;
  const colors = getStatusColor(status);
  const radiusColor = RADIUS_COLORS[status];

  const getZoom = (r: number) => {
    if (r <= 500)   return 16;
    if (r <= 1000)  return 15;
    if (r <= 2000)  return 14;
    if (r <= 5000)  return 13;
    if (r <= 10000) return 12;
    return 11;
  };

  const initMap = useCallback(() => {
    if (!mapRef.current || !window.google?.maps) return;

    const center = { lat, lng };
    const zoom = getZoom(radius);

    const map = new window.google.maps.Map(mapRef.current, {
      center,
      zoom,
      disableDefaultUI: true,
      zoomControl: true,
      gestureHandling: 'cooperative',
      mapTypeId: 'roadmap',
      styles: [
        { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit', stylers: [{ visibility: 'simplified' }] },
        { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#bde8f7' }] },
        { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#f2faf8' }] },
        { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
        { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#d4e9e6' }] },
        { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#b2d8d3' }] },
      ],
    });

    const marker = new window.google.maps.Marker({
      position: center,
      map,
      title: data.wilayah || 'Sensor Banjir',
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 9,
        fillColor: colors.hex,
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 3,
      },
      zIndex: 10,
    });

    const infoWindow = new window.google.maps.InfoWindow({
      content: `
        <div style="font-family:'Plus Jakarta Sans',sans-serif;padding:6px 2px;min-width:160px">
          <p style="font-weight:700;font-size:13px;color:#0f2923;margin:0 0 4px">${data.wilayah || 'Sensor Banjir'}</p>
          <p style="font-size:12px;color:#6b9e96;margin:0">Radius: <b style="color:${colors.hex}">${radius >= 1000 ? (radius / 1000).toFixed(1) + ' km' : radius + ' m'}</b></p>
        </div>
      `,
    });
    marker.addListener('click', () => infoWindow.open(map, marker));

    const circle = new window.google.maps.Circle({
      map,
      center,
      radius,
      fillColor: radiusColor.fill,
      fillOpacity: 1,
      strokeColor: radiusColor.stroke,
      strokeOpacity: 0.85,
      strokeWeight: 2,
      zIndex: 5,
    });

    mapInstanceRef.current = map;
    markerRef.current = marker;
    circleRef.current = circle;
    setMapReady(true);
  }, [lat, lng, radius, colors.hex, data.wilayah, radiusColor]);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (window.google?.maps) {
      initMap();
      return;
    }

    if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY') {
      setMapError(true);
      return;
    }

    window.initFloodMap = () => {
      initMap();
      delete window.initFloodMap;
    };

    const existingScript = document.getElementById('gmaps-script');
    if (!existingScript) {
      const script = document.createElement('script');
      script.id = 'gmaps-script';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initFloodMap&loading=async`;
      script.async = true;
      script.defer = true;
      script.onerror = () => setMapError(true);
      document.head.appendChild(script);
    }
  }, [initMap]);

  // Update warna circle & marker saat status berubah
  useEffect(() => {
    if (!circleRef.current || !mapInstanceRef.current) return;
    circleRef.current.setOptions({
      fillColor: radiusColor.fill,
      strokeColor: radiusColor.stroke,
      radius,
    });
    markerRef.current?.setIcon({
      path: window.google.maps.SymbolPath.CIRCLE,
      scale: 9,
      fillColor: colors.hex,
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 3,
    });
  }, [status, radius, radiusColor, colors.hex]);

  // Resize map saat expand/collapse
  useEffect(() => {
    if (!mapInstanceRef.current || !window.google?.maps) return;
    setTimeout(() => {
      window.google.maps.event.trigger(mapInstanceRef.current, 'resize');
      mapInstanceRef.current.setCenter({ lat, lng });
    }, 350);
  }, [expanded, lat, lng]);

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid rgba(20,184,166,0.1)' }}
      >
        <div className="flex items-center gap-2">
          <MapPin size={14} style={{ color: '#14b8a6' }} />
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#6b9e96' }}>
            Peta Radius Dampak
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-bold px-2.5 py-1 rounded-full"
            style={{ background: `${colors.hex}15`, color: colors.hex }}
          >
            ⊙ {radius >= 1000 ? (radius / 1000).toFixed(1) + ' km' : radius + ' m'}
          </span>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-lg transition-all hover:scale-95 active:scale-90"
            style={{ color: '#14b8a6', background: 'rgba(20,184,166,0.08)' }}
            title={expanded ? 'Perkecil' : 'Perbesar'}
          >
            <Maximize2 size={13} />
          </button>
        </div>
      </div>

      {/* Map container */}
      <div
        className="relative transition-all duration-500"
        style={{ height: expanded ? '360px' : '220px' }}
      >
        <div ref={mapRef} className="w-full h-full" />

        {/* Fallback — tidak ada API key */}
        {mapError && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-3"
            style={{ background: '#f0fdfa' }}
          >
            <Layers size={28} style={{ color: '#5eead4' }} />
            <div className="text-center px-4">
              <p className="text-sm font-bold" style={{ color: '#0f766e' }}>
                Google Maps API Key Belum Dikonfigurasi
              </p>
              <p className="text-xs mt-1" style={{ color: '#6b9e96' }}>
                Tambahkan{' '}
                <code
                  className="px-1 py-0.5 rounded"
                  style={{ background: '#ccfbf1', fontFamily: 'var(--font-mono)', fontSize: '10px' }}
                >
                  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
                </code>{' '}
                ke .env.local
              </p>
            </div>
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
              style={{ background: 'white', border: '1px solid rgba(20,184,166,0.2)' }}
            >
              <Navigation size={10} style={{ color: '#14b8a6' }} />
              <span className="text-xs font-bold" style={{ color: '#0f2923', fontFamily: 'var(--font-mono)' }}>
                {lat.toFixed(5)}, {lng.toFixed(5)}
              </span>
            </div>
          </div>
        )}

        {/* Loading state */}
        {!mapReady && !mapError && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: '#f0fdfa' }}
          >
            <div className="flex flex-col items-center gap-2">
              <div
                className="w-8 h-8 rounded-full border-2 animate-spin"
                style={{ borderColor: '#14b8a6', borderTopColor: 'transparent' }}
              />
              <p className="text-xs font-medium" style={{ color: '#6b9e96' }}>
                Memuat peta…
              </p>
            </div>
          </div>
        )}

        {/* Info overlay kiri-bawah */}
        {mapReady && (
          <div
            className="absolute bottom-3 left-3 rounded-xl px-3 py-2 shadow-lg pointer-events-none"
            style={{
              background: 'rgba(255,255,255,0.93)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              border: '1px solid rgba(20,184,166,0.15)',
            }}
          >
            <div className="flex items-center gap-1.5">
              <Navigation size={10} style={{ color: '#14b8a6' }} />
              <span
                className="text-xs font-bold"
                style={{ color: '#0f2923', fontFamily: 'var(--font-mono)' }}
              >
                {lat.toFixed(4)}, {lng.toFixed(4)}
              </span>
            </div>
            <p className="text-xs font-semibold mt-0.5" style={{ color: colors.hex }}>
              ● Radius: {radius >= 1000 ? (radius / 1000).toFixed(2) + ' km' : radius + ' m'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}