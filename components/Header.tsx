'use client';

import { Wifi, WifiOff } from 'lucide-react';

interface HeaderProps {
  isOnline: boolean;
}

function FloodLogo() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="32" height="32" rx="10" fill="url(#logoGrad)" />
      {/* Shield outline */}
      <path
        d="M16 5.5L8 8.5V16c0 4.8 3.4 9 8 10.5C21.6 25 25 20.8 25 16V8.5L16 5.5Z"
        fill="rgba(255,255,255,0.18)"
        stroke="rgba(255,255,255,0.55)"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* Wave 1 */}
      <path
        d="M9.5 19c1.1 0 1.6-.7 2.5-.7s1.4.7 2.5.7 1.6-.7 2.5-.7 1.4.7 2.5.7"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Wave 2 */}
      <path
        d="M9.5 22c1.1 0 1.6-.7 2.5-.7s1.4.7 2.5.7 1.6-.7 2.5-.7 1.4.7 2.5.7"
        stroke="rgba(255,255,255,0.65)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Droplet top */}
      <path
        d="M16 10c0 0 3 3.2 3 5.2A3 3 0 0 1 10 15.2C10 13.2 13 10 13 10"
        fill="white"
        opacity="0.92"
      />
      <defs>
        <linearGradient id="logoGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#12a896" />
          <stop offset="100%" stopColor="#07b0cc" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function Header({ isOnline }: HeaderProps) {
  return (
    <header
      className="sticky top-0 z-50"
      style={{
        background: 'rgba(255,255,255,0.88)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        borderBottom: '1px solid rgba(12,160,140,0.1)',
        boxShadow: '0 1px 0 rgba(12,160,140,0.06)',
      }}
    >
      <div
        style={{
          maxWidth: '600px',
          margin: '0 auto',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <FloodLogo />
          <div className="flex flex-col leading-none gap-0.5">
            <span
              style={{
                fontSize: '14px',
                fontWeight: 800,
                letterSpacing: '-0.03em',
                color: '#0d2520',
                lineHeight: 1,
              }}
            >
              FloodGuard
            </span>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 500,
                color: '#5ca89d',
                letterSpacing: '0.04em',
                lineHeight: 1,
              }}
            >
              Deteksi Dini Banjir
            </span>
          </div>
        </div>

        {/* Connectivity badge */}
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
          style={{
            background: isOnline ? 'rgba(14,165,110,0.09)' : 'rgba(232,64,64,0.09)',
            color: isOnline ? '#0ea56e' : '#c91c1c',
            border: `1px solid ${isOnline ? 'rgba(14,165,110,0.22)' : 'rgba(232,64,64,0.22)'}`,
            fontSize: '11px',
            fontWeight: 650,
            letterSpacing: '0.01em',
          }}
        >
          {isOnline ? (
            <>
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{
                  background: '#0ea56e',
                  boxShadow: '0 0 0 0 rgba(14,165,110,0.4)',
                  animation: 'ripple 2s ease-out infinite',
                }}
              />
              <Wifi size={11} strokeWidth={2.5} />
              <span>Online</span>
            </>
          ) : (
            <>
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#c91c1c' }} />
              <WifiOff size={11} strokeWidth={2.5} />
              <span>Offline</span>
            </>
          )}
        </div>
      </div>
    </header>
  );
}