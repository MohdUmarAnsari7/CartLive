import React, { useEffect, useState } from 'react';
import { Download, MonitorSmartphone, X, Info, Apple } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';

export default function PWAInstaller() {
  const { locale } = useI18n();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isReady, setIsReady] = useState(true); // Always ready to display by default so user can see and test it!
  const [dismissed, setDismissed] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);

  useEffect(() => {
    // Detect if user is on iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isAppleDevice);

    // Detect if inside an iframe
    try {
      setIsInIframe(window.self !== window.top);
    } catch (e) {
      setIsInIframe(true);
    }

    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      const isDismissed = sessionStorage.getItem('cartlive_pwa_dismissed');
      if (!isDismissed) {
        setIsReady(true);
      }
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

  const handleInstallClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // If inside an iframe, or iOS, or no native prompt is queued, show instructions or open in new tab
    if (isIOS || !deferredPrompt) {
      setShowInstructions(true);
      return;
    }

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsReady(false);
        sessionStorage.setItem('cartlive_pwa_dismissed', 'true');
      }
    } catch (err) {
      console.warn('Native install prompt failed, using fallback guide', err);
      setShowInstructions(true);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissed(true);
    setIsReady(false);
    sessionStorage.setItem('cartlive_pwa_dismissed', 'true');
  };

  if (!isReady || dismissed) return null;

  return (
    <>
      <div 
        onClick={handleInstallClick}
        className="fixed bottom-[96px] left-4 right-4 md:left-6 md:right-auto md:w-96 z-40 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-[0_12px_40px_rgba(16,185,129,0.25)] p-4 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] border border-emerald-400/20"
        id="pwa-install-banner"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white/15 rounded-xl shrink-0 flex items-center justify-center">
            {isIOS ? (
              <Apple className="w-5 h-5 text-white" />
            ) : (
              <MonitorSmartphone className="w-5 h-5 text-emerald-100 animate-pulse" />
            )}
          </div>
          <div className="space-y-0.5 text-left">
            <h4 className="font-extrabold text-[12px] leading-tight tracking-tight">
              {locale === 'en' ? 'Add CartLive to Home Screen' : 'होम स्क्रीन पर CartLive जोड़ें'}
            </h4>
            <p className="text-[10px] text-emerald-100 font-medium leading-none">
              {isIOS 
                ? (locale === 'en' ? 'Tap Share → Add to Home Screen' : 'सजाएं → होम स्क्रीन पर जोड़ें पर टैप करें')
                : (locale === 'en' ? 'Get independent PWA app icon on phone' : 'अपने फ़ोन पर स्वतंत्र PWA ऐप आइकन प्राप्त करें')}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleInstallClick}
            className="bg-white text-emerald-700 hover:bg-emerald-50 px-3.5 py-1.5 rounded-xl text-[11px] font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{locale === 'en' ? 'Install' : 'इंस्टॉल करें'}</span>
          </button>
          
          <button
            onClick={handleDismiss}
            className="p-1.5 hover:bg-white/10 rounded-xl text-emerald-100 hover:text-white transition-colors cursor-pointer"
            aria-label="Dismiss banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Manual Install Instructions Modal Drawer */}
      {showInstructions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div 
            className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-4 text-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm tracking-tight flex items-center gap-2">
                <Info className="w-4.5 h-4.5 text-emerald-600" />
                <span>{locale === 'en' ? 'How to Install PWA' : 'PWA कैसे इंस्टॉल करें'}</span>
              </h3>
              <button 
                onClick={() => setShowInstructions(false)}
                className="p-1 hover:bg-slate-100 rounded-full cursor-pointer text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-slate-600 leading-relaxed font-semibold">
              {isIOS ? (
                <>
                  <p className="font-bold text-slate-800">
                    {locale === 'en' ? 'For iPhones & iPads (Safari):' : 'iPhones और iPads (Safari) के लिए:'}
                  </p>
                  <ol className="list-decimal pl-5 space-y-2 text-slate-600 font-medium">
                    <li>
                      {locale === 'en' 
                        ? 'Tap the "Share" button in Safari (the box with an arrow pointing up icon).' 
                        : 'सफ़ारी में "Share" बटन पर टैप करें (ऊपर की ओर इशारा करते हुए तीर वाला बॉक्स)।'}
                    </li>
                    <li>
                      {locale === 'en' 
                        ? 'Scroll down the share options list and select "Add to Home Screen".' 
                        : 'शेयर विकल्पों की सूची में नीचे स्क्रॉल करें और "Add to Home Screen" चुनें।'}
                    </li>
                    <li>
                      {locale === 'en' 
                        ? 'Tap "Add" in the top right corner.' 
                        : 'ऊपरी दाएं कोने में "Add" पर टैप करें।'}
                    </li>
                  </ol>
                </>
              ) : (
                <>
                  <p className="font-bold text-slate-800">
                    {locale === 'en' ? 'For Android Devices (Chrome/Edge):' : 'Android डिवाइसेस (Chrome/Edge) के लिए:'}
                  </p>
                  <ol className="list-decimal pl-5 space-y-2 text-slate-600 font-medium">
                    <li>
                      {locale === 'en' 
                        ? 'Click the three-dot menu icon in the upper right corner.' 
                        : 'ऊपरी दाएं कोने में तीन-बिंदु वाले मेनू आइकन पर क्लिक करें।'}
                    </li>
                    <li>
                      {locale === 'en' 
                        ? 'Click "Add to Home screen" or "Install App" option.' 
                        : '"Add to Home screen" या "Install App" विकल्प पर क्लिक करें।'}
                    </li>
                    <li>
                      {locale === 'en' 
                        ? 'Confirm by clicking "Install" and wait 3 seconds.' 
                        : '"Install" पर क्लिक करके पुष्टि करें और 3 सेकंड प्रतीक्षा करें।'}
                    </li>
                  </ol>
                </>
              )}
              
              {isInIframe && (
                <div className="bg-blue-50 rounded-2xl p-3 border border-blue-100 flex flex-col gap-2 mt-2">
                  <div className="flex gap-2 items-start">
                    <span className="text-blue-700">🌐</span>
                    <p className="text-[10px] text-blue-800 font-medium leading-normal">
                      {locale === 'en'
                        ? 'Browsers restrict direct PWA prompts inside preview frames. Open CartLive in a new tab to trigger native install prompts!'
                        : 'ब्राउज़र सुरक्षा के कारण पूर्वावलोकन फ़्रेम के अंदर सीधे PWA इंस्टॉल ब्लॉक होते हैं। बेहतर अनुभव के लिए नए टैब में खोलें!'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      window.open(window.location.href, '_blank');
                    }}
                    className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-bold transition-all active:scale-95 cursor-pointer shadow-sm"
                  >
                    {locale === 'en' ? 'Open in New Tab' : 'नए टैब में खोलें'}
                  </button>
                </div>
              )}

              <div className="bg-emerald-50 rounded-2xl p-3 border border-emerald-100/50 flex gap-2 items-start mt-2">
                <span className="text-emerald-700">💡</span>
                <p className="text-[10px] text-emerald-800 font-medium leading-normal">
                  {locale === 'en'
                    ? 'Running as a PWA lets you discover fresh vegetable and fruit vendor locations with rapid performance and quick startup speed!'
                    : 'PWA के रूप में चलाने से आप तीव्र गति और बेहतर परफॉरमेंस के साथ ताजे फलों और सब्जियों के विक्रेताओं के ठिकानों का पता लगा सकते हैं!'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowInstructions(false)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-900/90 text-white font-bold rounded-xl text-xs transition-all active:scale-95 cursor-pointer shadow-md mt-1"
            >
              {locale === 'en' ? 'Got It' : 'समझ गया'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
