'use client';

import { useMemo } from 'react';
import { HistoryEntry, ThresholdData, DEFAULT_THRESHOLDS, getStatusColor } from '@/lib/types';
import { Trash2 } from 'lucide-react';

interface HistoryChartProps {
  history: HistoryEntry[];
  onClear: () => void;
  thresholds?: ThresholdData;
}

export default function HistoryChart({
  history,
  onClear,
  thresholds = DEFAULT_THRESHOLDS,
}: HistoryChartProps) {
  const W = 560;
  const H = 140;
  const PAD = { top: 16, right: 20, bottom: 28, left: 38 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const data = useMemo(() => {
    if (history.length < 2) return null;

    const values = history.map(h => h.ketinggian);
    const maxVal = Math.max(...values, thresholds.KRITIS + 10);
    const minVal = Math.max(0, Math.min(...values) - 5);
    const range  = maxVal - minVal || 1;

    const pts = history.map((h, i) => ({
      x: PAD.left + (i / (history.length - 1)) * chartW,
      y: PAD.top + chartH - ((h.ketinggian - minVal) / range) * chartH,
      val: h.ketinggian,
      ts: h.timestamp,
      status: h.status,
    }));

    const line = pts
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(' ');
    const area = `${line} L ${pts[pts.length - 1].x.toFixed(1)} ${(PAD.top + chartH).toFixed(1)} L ${PAD.left} ${(PAD.top + chartH).toFixed(1)} Z`;

    const thresholdLines = [
      { val: thresholds.AMAN,   label: 'Aman',   color: '#0ea56e' },
      { val: thresholds.SIAGA,  label: 'Siaga',  color: '#e09a10' },
      { val: thresholds.BAHAYA, label: 'Bahaya', color: '#f97316' },
      { val: thresholds.KRITIS, label: 'Kritis', color: '#e84040' },
    ].map(t => ({
      ...t,
      y:
        t.val >= minVal && t.val <= maxVal
          ? PAD.top + chartH - ((t.val - minVal) / range) * chartH
          : null,
    }));

    const timeLabels = [0, Math.floor(history.length / 2), history.length - 1].map(i => ({
      x: PAD.left + (i / (history.length - 1)) * chartW,
      label: new Date(history[i].timestamp).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    }));

    return { pts, line, area, thresholdLines, timeLabels, maxVal, minVal };
  }, [history, thresholds]);

  // ── Empty state ──
  if (history.length === 0) {
    return (
      <div className="card" style={{ padding: '20px' }}>
        <SectionHeader count={0} onClear={onClear} showClear={false} />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '32px 16px',
            borderRadius: '12px',
            background: 'var(--surface)',
            marginTop: '12px',
            gap: '6px',
          }}
        >
          <p style={{ fontSize: '13px', fontWeight: 500, color: '#94b5af' }}>
            Belum ada data riwayat
          </p>
          <p style={{ fontSize: '11px', color: '#b2cdc9' }}>
            Data akan terekam otomatis setiap perubahan ketinggian
          </p>
        </div>
      </div>
    );
  }

  const lastPoint = data?.pts[data.pts.length - 1];
  const lastStatus = history[history.length - 1]?.status;
  const lastColor  = lastStatus ? getStatusColor(lastStatus).hex : '#12a896';

  return (
    <div className="card" style={{ padding: '20px' }}>
      <SectionHeader count={history.length} onClear={onClear} showClear />

      {/* Chart — scrollable secara horizontal hanya jika diperlukan */}
      <div style={{ width: '100%', overflowX: 'auto', marginTop: '12px' }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{
            width: '100%',
            minWidth: '280px',
            height: 'auto',
            maxHeight: '160px',
            display: 'block',
          }}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={lastColor} stopOpacity="0.18" />
              <stop offset="100%" stopColor={lastColor} stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
            <line
              key={i}
              x1={PAD.left} x2={PAD.left + chartW}
              y1={PAD.top + t * chartH} y2={PAD.top + t * chartH}
              stroke="rgba(12,160,140,0.07)" strokeWidth="1"
            />
          ))}

          {/* Threshold reference lines */}
          {data?.thresholdLines.map((th, i) =>
            th.y !== null ? (
              <g key={i}>
                <line
                  x1={PAD.left} x2={PAD.left + chartW}
                  y1={th.y} y2={th.y}
                  stroke={th.color} strokeWidth="1" strokeDasharray="4,3" opacity="0.45"
                />
                <text
                  x={PAD.left + chartW + 2} y={th.y + 4}
                  fill={th.color} fontSize="7.5" opacity="0.75"
                >
                  {th.label}
                </text>
              </g>
            ) : null
          )}

          {/* Area fill */}
          {data && <path d={data.area} fill="url(#areaGrad)" />}

          {/* Line */}
          {data && (
            <path
              d={data.line} fill="none"
              stroke={lastColor} strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"
            />
          )}

          {/* Data points (last 8) */}
          {data?.pts.slice(-8).map((p, i) => (
            <circle
              key={i} cx={p.x} cy={p.y} r="2.5"
              fill={getStatusColor(p.status).hex} stroke="white" strokeWidth="1.5"
            />
          ))}

          {/* Last point highlight */}
          {lastPoint && (
            <>
              <circle cx={lastPoint.x} cy={lastPoint.y} r="5" fill={lastColor} stroke="white" strokeWidth="2" />
              <text
                x={lastPoint.x} y={lastPoint.y - 9}
                textAnchor="middle" fill={lastColor}
                fontSize="9" fontWeight="600" fontFamily="var(--font-mono)"
              >
                {lastPoint.val.toFixed(1)}
              </text>
            </>
          )}

          {/* Y axis labels */}
          {data && (
            <>
              <text x={PAD.left - 4} y={PAD.top + 4}    textAnchor="end" fill="#94b5af" fontSize="8" fontFamily="var(--font-mono)">{data.maxVal.toFixed(0)}</text>
              <text x={PAD.left - 4} y={PAD.top + chartH} textAnchor="end" fill="#94b5af" fontSize="8" fontFamily="var(--font-mono)">{data.minVal.toFixed(0)}</text>
            </>
          )}

          {/* Time labels */}
          {data?.timeLabels.map((tl, i) => (
            <text
              key={i} x={tl.x} y={H - 4}
              textAnchor="middle" fill="#94b5af"
              fontSize="8" fontFamily="var(--font-mono)"
            >
              {tl.label}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}

function SectionHeader({
  count,
  onClear,
  showClear,
}: {
  count: number;
  onClear: () => void;
  showClear: boolean;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div>
        <p
          style={{
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '0.09em',
            textTransform: 'uppercase',
            color: '#6b9e96',
          }}
        >
          Riwayat Ketinggian
        </p>
        {count > 0 && (
          <p style={{ fontSize: '11px', marginTop: '2px', color: '#94b5af' }}>
            {count} titik data · disimpan di browser
          </p>
        )}
      </div>
      {showClear && (
        <button
          onClick={onClear}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '11px',
            fontWeight: 600,
            padding: '5px 10px',
            borderRadius: '8px',
            background: 'rgba(232,64,64,0.07)',
            color: '#e84040',
            border: '1px solid rgba(232,64,64,0.15)',
          }}
        >
          <Trash2 size={11} strokeWidth={2.2} />
          Hapus
        </button>
      )}
    </div>
  );
}
