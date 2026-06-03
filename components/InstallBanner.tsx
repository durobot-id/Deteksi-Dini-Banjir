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
    // Cek apakah sudah dismiss sebelumnya
    const wasDismissed = localStorage.getItem('pwa_install_dismissed');
    if (wasDismissed) { setDismissed(true); return; }

    // Cek apakah sudah installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
      // Tunda muncul agar tidak langsung mengganggu
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
      className="fixed bottom-4 left-4 right-4 z-50 rounded-2xl p-4 shadow-2xl animate-fadeInUp"
      style={{
        background: 'linear-gradient(135deg, #0f766e, #0e7490)',
        border: '1px solid rgba(255,255,255,0.15)',
        maxWidth: '480px',
        margin: '0 auto',
      }}
    >
      <button
        onClick={dismiss}
        className="absolute top-3 right-3 p-1 rounded-full"
        style={{ color: 'rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.1)' }}
      >
        <X size={14} />
      </button>

      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'rgba(255,255,255,0.15)' }}
        >
          <Smartphone size={20} color="white" />
        </div>
        <div className="flex-1">
          <p className="text-white font-bold text-sm">Install Aplikasi</p>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.75)' }}>
            Akses lebih cepat, bisa dibuka offline
          </p>
        </div>
        <button
          onClick={install}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold shrink-0 transition-all hover:scale-95 active:scale-90"
          style={{ background: 'white', color: '#0f766e' }}
        >
          <Download size={12} />
          Install
        </button>
      </div>
    </div>
  );
}
