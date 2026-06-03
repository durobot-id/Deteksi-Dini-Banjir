'use client';

import dynamic from 'next/dynamic';

// Dynamic import with ssr:false must be in a Client Component
const FloodDashboard = dynamic(() => import('@/components/FloodDashboard'), {
  ssr: false,
  loading: () => <div className="min-h-screen" style={{ background: '#f8fffe' }} />,
});

export default function Home() {
  return <FloodDashboard />;
}
