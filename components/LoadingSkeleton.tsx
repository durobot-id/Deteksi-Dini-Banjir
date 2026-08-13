'use client';

export default function LoadingSkeleton() {
  return (
    <div
      style={{
        maxWidth: '600px',
        margin: '0 auto',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
      className="animate-fadeInUp"
    >
      {/* Gauge skeleton */}
      <div
        className="card"
        style={{ padding: '20px 20px 24px', background: 'linear-gradient(145deg, #edfaf7, #d7f5ed)', border: 'none' }}
      >
        <div className="skeleton" style={{ height: '10px', width: '120px', marginBottom: '20px' }} />
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div className="skeleton" style={{ height: '60px', width: '140px' }} />
          <div className="skeleton" style={{ height: '36px', width: '90px', borderRadius: '16px' }} />
        </div>
      </div>

      {/* Status cards skeleton — 2x2 grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="card" style={{ padding: '14px' }}>
            <div className="skeleton" style={{ width: '34px', height: '34px', borderRadius: '10px', marginBottom: '12px' }} />
            <div className="skeleton" style={{ height: '8px', width: '52px', borderRadius: '4px', marginBottom: '8px' }} />
            <div className="skeleton" style={{ height: '13px', width: '72px', borderRadius: '4px' }} />
          </div>
        ))}
      </div>

      {/* Map skeleton */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
          <div className="skeleton" style={{ height: '10px', width: '120px' }} />
        </div>
        <div className="skeleton" style={{ height: '220px', borderRadius: 0 }} />
      </div>

      {/* Connecting label */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '4px 0' }}>
        <span
          style={{
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            background: '#12a896',
            animation: 'pulse 1.2s infinite',
          }}
        />
        <p style={{ fontSize: '13px', fontWeight: 500, color: '#6aab9f' }}>
          Menghubungkan ke Firebase…
        </p>
      </div>
    </div>
  );
}
