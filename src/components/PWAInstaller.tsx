import React, { useEffect, useState } from 'react';
import { Download, Landmark, MonitorSmartphone } from 'lucide-react';

export default function PWAInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsReady(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // If app is already installed or standalone mode active
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsReady(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsReady(false);
    }
    setDeferredPrompt(null);
  };

  if (!isReady) return null;

  return (
    <div className="fixed bottom-4 left-4 z-40 bg-green-600 hover:bg-green-700 text-white shadow-xl px-4 py-2.5 rounded-full flex items-center gap-2 cursor-pointer text-sm font-medium transition-all active:scale-95 border border-green-500">
      <MonitorSmartphone className="w-4 h-4" />
      <span>Install PWA App</span>
      <button 
        onClick={handleInstallClick}
        className="ml-1 bg-white/20 hover:bg-white/30 rounded-full p-1"
        title="Download"
      >
        <Download className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
