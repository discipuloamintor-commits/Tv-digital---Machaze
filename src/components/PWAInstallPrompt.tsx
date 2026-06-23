import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsStandalone(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
    // We do NOT clear the prompt on 'dismissed' so the button stays there.
  };

  // If already installed, or if the browser hasn't fired the event yet (or doesn't support it)
  // Wait, if we want to "bother" them, maybe we always show it on mobile if not standalone?
  // But without deferredPrompt, the button won't do anything native.
  // We'll show the banner if not standalone and deferredPrompt is available.
  if (isStandalone) return null;

  return (
    <div className="fixed bottom-0 left-0 w-full z-[9999] bg-emerald-600 text-white p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.3)] flex flex-col sm:flex-row items-center justify-between animate-in slide-in-from-bottom-full duration-500">
      <div className="flex items-center gap-3 mb-3 sm:mb-0">
        <div className="bg-white/20 p-2 rounded-lg">
          <Download className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-bold text-lg leading-tight">Instale o App do PDV</h3>
          <p className="text-emerald-100 text-sm">Para acesso rápido, modo offline e impressão térmica direta.</p>
        </div>
      </div>
      
      <button 
        onClick={handleInstallClick}
        disabled={!deferredPrompt}
        className="w-full sm:w-auto px-6 py-3 bg-white text-emerald-700 font-bold rounded-lg shadow-sm hover:bg-emerald-50 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {deferredPrompt ? 'Instalar Agora' : 'Aguardando navegador...'}
      </button>
    </div>
  );
}
