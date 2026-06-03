'use client';

export default function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4 max-w-4xl mx-auto">
      {/* Gauge skeleton */}
      <div className="card p-5">
        <div className="h-3 w-32 rounded-full bg-teal-50 animate-pulse mb-4" />
        <div className="flex items-end justify-between mb-4">
          <div className="h-16 w-36 rounded-xl bg-teal-50 animate-pulse" />
          <div className="h-8 w-20 rounded-full bg-teal-50 animate-pulse" />
        </div>
        <div className="h-4 w-full rounded-full bg-teal-50 animate-pulse" />
      </div>

      {/* Status cards skeleton */}
      <div className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="card p-4">
            <div className="h-7 w-7 rounded-lg bg-teal-50 animate-pulse mb-3" />
            <div className="h-2.5 w-16 rounded-full bg-teal-50 animate-pulse mb-2" />
            <div className="h-4 w-20 rounded-full bg-teal-50 animate-pulse" />
          </div>
        ))}
      </div>

      {/* Map skeleton */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-teal-50">
          <div className="h-3 w-28 rounded-full bg-teal-50 animate-pulse" />
        </div>
        <div className="h-52 bg-teal-50 animate-pulse" />
      </div>

      {/* Connecting message */}
      <div className="flex items-center justify-center gap-2 py-2">
        <span
          className="w-2 h-2 rounded-full"
          style={{ background: '#14b8a6', animation: 'pulse 1s infinite' }}
        />
        <p className="text-sm font-medium" style={{ color: '#6b9e96' }}>
          Menghubungkan ke Firebase...
        </p>
      </div>
    </div>
  );
}
