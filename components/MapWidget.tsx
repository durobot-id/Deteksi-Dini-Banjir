'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Maximize2, MapPin, Navigation, Layers } from 'lucide-react';
import { SensorData, FloodStatus, getStatusColor } from '@/lib/types';

interface MapWidgetProps {
  // koordinat dijamin ada — FloodDashboard hanya render MapWidget jika koordinat ada
  data: SensorData & { koordinat: { lat: number; lng: number } };
  status: FloodStatus;
}

const RADIUS_COLORS: Record<FloodStatus, { fill: string; stroke: string }> = {
  aman:   { fill: 'rgba(14,165,110,0.13)',  stroke: '#0ea56e' },
  siaga:  { fill: 'rgba(224,154,16,0.14)',  stroke: '#e09a10' },
  bahaya: { fill: 'rgba(249,115,22,0.16)',  stroke: '#f97316' },
  kritis: { fill: 'rgba(232,64,64,0.18)',   stroke: '#e84040' },
};

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    google: any;
    initFloodMap?: () => void;
  }
}

export default function MapWidget({ data, status }: MapWidgetProps) {
  const mapRef          = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef  = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef       = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const circleRef       = useRef<any>(null);

  const [expanded, setExpanded] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);

  // Gunakan koordinat dari Firebase (dijamin ada karena dicek di FloodDashboard)
  const lat    = data.koordinat.lat;
  const lng    = data.koordinat.lng;
  const radius = data.radius_dampak ?? 0;

  const colors      = getStatusColor(status);
  const radiusColor = RADIUS_COLORS[status];

  const getZoom = (r: number) => {
    if (r <= 0)     return 15;
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
    const zoom   = getZoom(radius);

    const map = new window.google.maps.Map(mapRef.current, {
      center,
      zoom,
      disableDefaultUI: true,
      zoomControl: true,
      gestureHandling: 'cooperative',
      mapTypeId: 'roadmap',
      styles: [
        { featureType: 'poi',           elementType: 'labels',          stylers: [{ visibility: 'off' }] },
        { featureType: 'transit',                                        stylers: [{ visibility: 'simplified' }] },
        { featureType: 'water',         elementType: 'geometry',        stylers: [{ color: '#c3e8f5' }] },
        { featureType: 'landscape',     elementType: 'geometry',        stylers: [{ color: '#f0f8f6' }] },
        { featureType: 'road',          elementType: 'geometry',        stylers: [{ color: '#ffffff' }] },
        { featureType: 'road',          elementType: 'geometry.stroke', stylers: [{ color: '#d4eae6' }] },
        { featureType: 'administrative',elementType: 'geometry.stroke', stylers: [{ color: '#c0d8d4' }] },
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
        <div style="font-family:'Inter',sans-serif;padding:6px 2px;min-width:150px">
          <p style="font-weight:700;font-size:13px;color:#0d2520;margin:0 0 4px">${data.wilayah || 'Sensor Banjir'}</p>
          ${radius > 0 ? `<p style="font-size:12px;color:#6b9e96;margin:0">Radius: <b style="color:${colors.hex}">${radius >= 1000 ? (radius / 1000).toFixed(1) + ' km' : radius + ' m'}</b></p>` : ''}
        </div>
      `,
    });
    marker.addListener('click', () => infoWindow.open(map, marker));

    // Lingkaran radius — hanya render jika radius > 0
    if (radius > 0) {
      const circle = new window.google.maps.Circle({
        map,
        center,
        radius,
        fillColor: radiusColor.fill,
        fillOpacity: 1,
        strokeColor: radiusColor.stroke,
        strokeOpacity: 0.8,
        strokeWeight: 1.5,
        zIndex: 5,
      });
      circleRef.current = circle;
    }

    mapInstanceRef.current = map;
    markerRef.current      = marker;
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
      script.id    = 'gmaps-script';
      script.src   = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initFloodMap&loading=async`;
      script.async = true;
      script.defer = true;
      script.onerror = () => setMapError(true);
      document.head.appendChild(script);
    }
  }, [initMap]);

  // Update circle & marker saat status berubah
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

  // Resize peta saat expand/collapse
  useEffect(() => {
    if (!mapInstanceRef.current || !window.google?.maps) return;
    setTimeout(() => {
      window.google.maps.event.trigger(mapInstanceRef.current, 'resize');
      mapInstanceRef.current.setCenter({ lat, lng });
    }, 350);
  }, [expanded, lat, lng]);

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MapPin size={14} style={{ color: '#12a896' }} strokeWidth={2.2} />
          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#6b9e96',
            }}
          >
            Peta Lokasi Sensor
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {radius > 0 && (
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: '999px',
                background: `${colors.hex}14`,
                color: colors.hex,
              }}
            >
              {radius >= 1000 ? (radius / 1000).toFixed(1) + ' km' : radius + ' m'}
            </span>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              padding: '6px',
              borderRadius: '8px',
              color: '#12a896',
              background: 'rgba(18,168,150,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title={expanded ? 'Perkecil' : 'Perbesar'}
          >
            <Maximize2 size={13} strokeWidth={2.2} />
          </button>
        </div>
      </div>

      {/* Map container */}
      <div
        style={{
          position: 'relative',
          height: expanded ? '360px' : '220px',
          transition: 'height 0.4s ease',
        }}
      >
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

        {/* Fallback — tidak ada API key */}
        {mapError && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              background: 'var(--surface)',
            }}
          >
            <Layers size={26} style={{ color: '#5eead4' }} strokeWidth={1.5} />
            <div style={{ textAlign: 'center', padding: '0 20px' }}>
              <p style={{ fontSize: '13px', fontWeight: 700, color: '#0b7265', marginBottom: '6px' }}>
                Google Maps API Key Belum Dikonfigurasi
              </p>
              <p style={{ fontSize: '11px', color: '#6b9e96', lineHeight: 1.5 }}>
                Tambahkan{' '}
                <code
                  style={{
                    background: 'var(--teal-100)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    padding: '1px 5px',
                    borderRadius: '4px',
                  }}
                >
                  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
                </code>{' '}
                ke .env.local
              </p>
            </div>
            {/* Tampilkan koordinat dari Firebase */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '10px',
                background: 'white',
                border: '1px solid var(--border)',
              }}
            >
              <Navigation size={10} style={{ color: '#12a896' }} strokeWidth={2} />
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#0d2520',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {lat.toFixed(5)}, {lng.toFixed(5)}
              </span>
            </div>
          </div>
        )}

        {/* Loading peta */}
        {!mapReady && !mapError && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--surface)',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  border: '2px solid var(--teal-200)',
                  borderTopColor: '#12a896',
                  animation: 'spin 0.8s linear infinite',
                }}
              />
              <p style={{ fontSize: '12px', fontWeight: 500, color: '#6b9e96' }}>Memuat peta…</p>
            </div>
          </div>
        )}

        {/* Info overlay — koordinat dari Firebase */}
        {mapReady && (
          <div
            style={{
              position: 'absolute',
              bottom: '12px',
              left: '12px',
              borderRadius: '10px',
              padding: '7px 11px',
              background: 'rgba(255,255,255,0.92)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              border: '1px solid var(--border)',
              pointerEvents: 'none',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Navigation size={9} style={{ color: '#12a896' }} strokeWidth={2.2} />
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#0d2520', fontFamily: 'var(--font-mono)' }}>
                {lat.toFixed(4)}, {lng.toFixed(4)}
              </span>
            </div>
            {radius > 0 && (
              <p style={{ fontSize: '11px', fontWeight: 600, marginTop: '2px', color: colors.hex }}>
                Radius: {radius >= 1000 ? (radius / 1000).toFixed(2) + ' km' : radius + ' m'}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}