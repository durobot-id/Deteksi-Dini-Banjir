'use client';

import { useMemo } from 'react';
import { HistoryEntry, ThresholdData, DEFAULT_THRESHOLDS, getStatusColor } from '@/lib/types';
import { Trash2 } from 'lucide-react';

interface HistoryChartProps {
  history: HistoryEntry[];
  onClear: () => void;
  thresholds?: ThresholdData;
}

export default function HistoryChart({ history, onClear, thresholds = DEFAULT_THRESHOLDS }: HistoryChartProps) {
  const W = 560;
  const H = 140;
  const PAD = { top: 16, right: 16, bottom: 28, left: 40 };
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

    const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    const area = `${line} L ${pts[pts.length - 1].x.toFixed(1)} ${(PAD.top + chartH).toFixed(1)} L ${PAD.left} ${(PAD.top + chartH).toFixed(1)} Z`;

    const thresholdLines = [
      { val: thresholds.AMAN,   label: 'Aman',   color: '#10b981' },
      { val: thresholds.SIAGA,  label: 'Siaga',  color: '#f59e0b' },
      { val: thresholds.BAHAYA, label: 'Bahaya', color: '#f97316' },
      { val: thresholds.KRITIS, label: 'Kritis', color: '#ef4444' },
    ].map(t => ({
      ...t,
      y: t.val >= minVal && t.val <= maxVal
        ? PAD.top + chartH - ((t.val - minVal) / range) * chartH
        : null,
    }));

    const timeLabels = [0, Math.floor(history.length / 2), history.length - 1].map(i => ({
      x: PAD.left + (i / (history.length - 1)) * chartW,
      label: new Date(history[i].timestamp).toLocaleTimeString('id-ID', {
        hour: '2-digit', minute: '2-digit',
      }),
    }));

    return { pts, line, area, thresholdLines, timeLabels, maxVal, minVal };
  }, [history, thresholds]);

  if (history.length === 0) {
    return (
      <div className="card p-5">
        <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#6b9e96' }}>
          Riwayat Ketinggian
        </p>
        <div className="flex flex-col items-center justify-center py-8 rounded-xl" style={{ background: '#f0fdfa' }}>
          <p className="text-sm font-medium" style={{ color: '#94b5af' }}>Belum ada data riwayat</p>
          <p className="text-xs mt-1" style={{ color: '#b2cdc9' }}>Data akan terekam secara otomatis di browser</p>
        </div>
      </div>
    );
  }

  const lastPoint = data?.pts[data.pts.length - 1];
  const lastStatus = history[history.length - 1]?.status;
  const lastColor  = lastStatus ? getStatusColor(lastStatus).hex : '#14b8a6';

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#6b9e96' }}>
            Riwayat Ketinggian
          </p>
          <p className="text-xs mt-0.5" style={{ color: '#94b5af' }}>
            {history.length} titik data · disimpan di browser
          </p>
        </div>
        <button
          onClick={onClear}
          className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg transition-all hover:scale-95"
          style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.15)' }}
        >
          <Trash2 size={11} />
          Hapus
        </button>
      </div>

      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: '280px', height: 'auto', maxHeight: '160px' }}>
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lastColor} stopOpacity="0.2" />
              <stop offset="100%" stopColor={lastColor} stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
            <line key={i} x1={PAD.left} x2={PAD.left + chartW}
              y1={PAD.top + t * chartH} y2={PAD.top + t * chartH}
              stroke="rgba(20,184,166,0.08)" strokeWidth="1" />
          ))}

          {data?.thresholdLines.map((th, i) =>
            th.y !== null ? (
              <g key={i}>
                <line x1={PAD.left} x2={PAD.left + chartW} y1={th.y} y2={th.y}
                  stroke={th.color} strokeWidth="1" strokeDasharray="4,3" opacity="0.5" />
                <text x={PAD.left + chartW + 2} y={th.y + 4} fill={th.color} fontSize="8" opacity="0.7">
                  {th.label}
                </text>
              </g>
            ) : null
          )}

          {data && <path d={data.area} fill="url(#areaGrad)" />}
          {data && (
            <path d={data.line} fill="none" stroke={lastColor}
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          )}

          {data?.pts.slice(-8).map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="2.5"
              fill={getStatusColor(p.status).hex} stroke="white" strokeWidth="1" />
          ))}

          {lastPoint && (
            <>
              <circle cx={lastPoint.x} cy={lastPoint.y} r="5" fill={lastColor} stroke="white" strokeWidth="2" />
              <text x={lastPoint.x} y={lastPoint.y - 9} textAnchor="middle"
                fill={lastColor} fontSize="9" fontWeight="600" fontFamily="var(--font-mono)">
                {lastPoint.val.toFixed(1)}
              </text>
            </>
          )}

          {data && (
            <>
              <text x={PAD.left - 4} y={PAD.top + 4} textAnchor="end" fill="#94b5af" fontSize="8" fontFamily="var(--font-mono)">
                {data.maxVal.toFixed(0)}
              </text>
              <text x={PAD.left - 4} y={PAD.top + chartH} textAnchor="end" fill="#94b5af" fontSize="8" fontFamily="var(--font-mono)">
                {data.minVal.toFixed(0)}
              </text>
            </>
          )}

          {data?.timeLabels.map((tl, i) => (
            <text key={i} x={tl.x} y={H - 4} textAnchor="middle"
              fill="#94b5af" fontSize="8" fontFamily="var(--font-mono)">
              {tl.label}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}
