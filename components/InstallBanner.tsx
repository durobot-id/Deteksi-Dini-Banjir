'use client';

import { useEffect, useState } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallBanner() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const wasDismissed = localStorage.getItem('pwa_install_dismissed');
    if (wasDismissed) { setDismissed(true); return; }

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setVisible(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setInstalled(true));
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async () => {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setVisible(false);
  };

  const dismiss = () => {
    setVisible(false);
    setDismissed(true);
    localStorage.setItem('pwa_install_dismissed', '1');
  };

  if (!visible || dismissed || installed) return null;

  return (
    <div
      className="fixed bottom-4 left-4 right-4 z-50 rounded-2xl p-4 animate-fadeInUp"
      style={{
        background: 'linear-gradient(135deg, #0b7265, #0b6a7e)',
        border: '1px solid rgba(255,255,255,0.12)',
        boxShadow: '0 8px 32px rgba(11,114,101,0.4)',
        maxWidth: '480px',
        margin: '0 auto',
      }}
    >
      <button
        onClick={dismiss}
        className="absolute top-3 right-3 flex items-center justify-center w-6 h-6 rounded-full"
        style={{ color: 'rgba(255,255,255,0.55)', background: 'rgba(255,255,255,0.1)' }}
        aria-label="Tutup"
      >
        <X size={13} />
      </button>

      <div className="flex items-center gap-3">
        <div
          className="flex items-center justify-center rounded-xl shrink-0"
          style={{ width: '42px', height: '42px', background: 'rgba(255,255,255,0.15)' }}
        >
          <Smartphone size={20} color="white" strokeWidth={2} />
        </div>
        <div className="flex-1">
          <p style={{ color: 'white', fontWeight: 700, fontSize: '13px', letterSpacing: '-0.01em' }}>
            Install Aplikasi
          </p>
          <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: '12px', marginTop: '2px' }}>
            Akses lebih cepat, bisa dibuka offline
          </p>
        </div>
        <button
          onClick={install}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl shrink-0 transition-all"
          style={{
            background: 'white',
            color: '#0b7265',
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '0.01em',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.92')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          <Download size={12} strokeWidth={2.5} />
          Install
        </button>
      </div>
    </div>
  );
}
