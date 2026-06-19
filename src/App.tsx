import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  MapPin, 
  User, 
  Lock, 
  Info, 
  LayoutDashboard, 
  Activity, 
  Landmark, 
  BellRing,
  Globe,
  MessageSquare,
  Languages
} from 'lucide-react';
import PWAInstaller from './components/PWAInstaller';
import CustomerDashboard from './components/CustomerDashboard';
import SellerDashboard from './components/SellerDashboard';
import AdminDashboard from './components/AdminDashboard';
import AuthScreen from './components/AuthScreen';
import FeedbackPage from './components/FeedbackPage';
import { useI18n } from './i18n/I18nContext';

// Obtain Maps API Key as specified in Google Maps skill guidelines to trigger AI Studio Credentials Popup
const API_KEY = '';

type ActiveTab = 'CUSTOMER' | 'SELLER' | 'ADMIN' | 'FEEDBACK';

export default function App() {
  // Auth state variables
  const [role, setRole] = useState<'SELLER' | 'ADMIN' | null>(() => {
    const saved = localStorage.getItem('cartlive_role');
    return (saved === 'SELLER' || saved === 'ADMIN') ? saved : null;
  });
  const [loggedInUser, setLoggedInUser] = useState<any>(() => {
    const saved = localStorage.getItem('cartlive_user');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    const savedRole = localStorage.getItem('cartlive_role');
    if (savedRole === 'SELLER') return 'SELLER';
    if (savedRole === 'ADMIN') return 'ADMIN';
    return 'CUSTOMER';
  });
  const { locale, setLocale, t } = useI18n();

  // System parameters
  const [searchRadiusKm, setSearchRadiusKm] = useState(5);
  const [appLogo, setAppLogo] = useState('');

  useEffect(() => {
    // Initial fetch of settings
    fetch('/api/settings')
      .then(res => {
        if (res.ok) return res.json();
      })
      .then(data => {
        if (data) {
          if (data.searchRadiusKm) setSearchRadiusKm(data.searchRadiusKm);
          if (data.appLogo !== undefined) setAppLogo(data.appLogo);
        }
      })
      .catch(err => console.warn('Failed to fetch settings', err));

    // Live stream synchronization
    const eventSource = new EventSource('/api/realtime/stream');
    eventSource.onmessage = (event) => {
      try {
        const { type, data } = JSON.parse(event.data);
        if (type === 'settings_updated') {
          if (data.searchRadiusKm) setSearchRadiusKm(data.searchRadiusKm);
          if (data.appLogo !== undefined) setAppLogo(data.appLogo);
        }
      } catch (err) {
        console.warn('Real-time sync parsed error', err);
      }
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const handleLoginSuccess = (userRole: 'SELLER' | 'ADMIN', user: any) => {
    setRole(userRole);
    setLoggedInUser(user);
    localStorage.setItem('cartlive_role', userRole);
    localStorage.setItem('cartlive_user', JSON.stringify(user));
    if (userRole === 'SELLER') {
      setActiveTab('SELLER');
    } else if (userRole === 'ADMIN') {
      setActiveTab('ADMIN');
    }
  };

  const handleLogout = () => {
    setRole(null);
    setLoggedInUser(null);
    localStorage.removeItem('cartlive_role');
    localStorage.removeItem('cartlive_user');
    setActiveTab('CUSTOMER');
  };

  const handleProfileUpdate = (updatedSeller: any) => {
    setLoggedInUser(updatedSeller);
    localStorage.setItem('cartlive_user', JSON.stringify(updatedSeller));
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans select-none overflow-x-hidden selection:bg-emerald-100 selection:text-emerald-800">
      
      {/* Dynamic PWA Installer floating prompt banner */}
      <PWAInstaller />

      {/* Top Header Branding Bar (Saves vertical space) */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200/80 shadow-sm py-2 px-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo with fresh vegetable icon pairing */}
          <div 
            onClick={() => setActiveTab('CUSTOMER')}
            className="flex items-center gap-2 cursor-pointer active:scale-95 transition-transform"
          >
            {appLogo ? (
              <img 
                src={appLogo} 
                alt="App Logo" 
                className="w-8 h-8 rounded-lg object-cover shadow-md shadow-emerald-500/5 border border-slate-200" 
              />
            ) : (
              <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white shadow-md shadow-emerald-500/10 border border-emerald-500">
                <ShoppingBag className="w-4.5 h-4.5 fill-none" />
              </div>
            )}
            <div>
              <h1 className="text-sm font-bold tracking-tight text-slate-900 flex items-center gap-1">
                <span>{t('APP_NAME')}</span>
                <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-bold">PWA</span>
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="hidden sm:inline-block text-[10px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md font-medium font-mono">
              {t('GPS_SUBTITLE')}
            </span>

            {/* Language Switcher Toggle */}
            <button
              onClick={() => setLocale(locale === 'en' ? 'hi' : 'en')}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold bg-slate-50 hover:bg-slate-100 text-slate-755 transition shadow-sm active:scale-95 cursor-pointer select-none"
              title="Switch language / भाषा बदलें"
            >
              <Languages className="w-3.5 h-3.5 text-emerald-600" />
              <span>{locale === 'en' ? 'English' : 'हिंदी'}</span>
              <span className="text-[9px] text-slate-400 font-normal">
                ({locale === 'en' ? 'EN' : 'HI'})
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Main View Router elements with bottom tab space compatibility */}
      <main className="flex-grow pb-28">
        {activeTab === 'CUSTOMER' && (
          <CustomerDashboard 
            apiKey={API_KEY} 
            onNavigateToAuth={() => setActiveTab('SELLER')}
            systemRadius={searchRadiusKm}
          />
        )}

        {activeTab === 'SELLER' && (
          role === 'SELLER' ? (
            <SellerDashboard 
              seller={loggedInUser} 
              onLogout={handleLogout}
              onProfileUpdate={handleProfileUpdate}
            />
          ) : (
            <AuthScreen onLoginSuccess={handleLoginSuccess} isAdminOnly={false} />
          )
        )}

        {activeTab === 'ADMIN' && (
          role === 'ADMIN' ? (
            <AdminDashboard 
              apiKey={API_KEY} 
              onLogout={handleLogout}
              systemRadius={searchRadiusKm}
              onUpdateRadius={(radius) => setSearchRadiusKm(radius)}
              onUpdateLogo={(logo) => setAppLogo(logo)}
            />
          ) : (
            <div className="py-6 space-y-4">
              <div className="max-w-md mx-auto text-center p-6 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 m-4 space-y-3 shadow-inner">
                <BellRing className="w-8 h-8 mx-auto text-amber-600 animate-pulse" />
                <h4 className="font-bold text-sm tracking-tight">{t('ADMIN_AUTH_REQ')}</h4>
                <p className="text-xs text-amber-700 leading-normal">
                  {t('ADMIN_WARN')}
                </p>
              </div>
              <AuthScreen onLoginSuccess={handleLoginSuccess} isAdminOnly={true} />
            </div>
          )
        )}

        {activeTab === 'FEEDBACK' && (
          <FeedbackPage />
        )}
      </main>

      {/* Premium Sticky Bottom Tab Bar for Mobile & PWA experience */}
      <nav className="fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] px-3 py-2 pb-3.5 sm:pb-4 flex justify-around items-center">
        <div className="w-full max-w-lg mx-auto flex items-center justify-between">
          <button
            onClick={() => setActiveTab('CUSTOMER')}
            className={`flex-1 flex flex-col items-center gap-1 transition-all select-none active:scale-95 ${
              activeTab === 'CUSTOMER'
                ? 'text-emerald-700 font-extrabold'
                : 'text-slate-500 hover:text-slate-850 font-semibold'
            }`}
          >
            <div className={`p-1.5 rounded-xl transition-all duration-300 ${activeTab === 'CUSTOMER' ? 'bg-emerald-100/60 ring-2 ring-emerald-500/10' : 'bg-transparent'}`}>
              <Globe className={`w-5 h-5 transition-colors ${activeTab === 'CUSTOMER' ? 'text-emerald-600 stroke-[2.25]' : 'text-slate-400'}`} />
            </div>
            <span className="text-[10px] sm:text-xs tracking-tight">{t('DISCOVER_CARTS_TAB')}</span>
          </button>

          <button
            onClick={() => setActiveTab('SELLER')}
            className={`flex-1 flex flex-col items-center gap-1 transition-all select-none active:scale-95 ${
              activeTab === 'SELLER'
                ? 'text-emerald-700 font-extrabold'
                : 'text-slate-500 hover:text-slate-850 font-semibold'
            }`}
          >
            <div className={`p-1.5 rounded-xl transition-all duration-300 ${activeTab === 'SELLER' ? 'bg-emerald-100/60 ring-2 ring-emerald-500/10' : 'bg-transparent'}`}>
              <Activity className={`w-5 h-5 transition-colors ${activeTab === 'SELLER' ? 'text-emerald-600 stroke-[2.25]' : 'text-slate-400'}`} />
            </div>
            <span className="text-[10px] sm:text-xs tracking-tight">{t('SELLER_CENTER_TAB')}</span>
          </button>

          <button
            onClick={() => setActiveTab('ADMIN')}
            className={`flex-1 flex flex-col items-center gap-1 transition-all select-none active:scale-95 ${
              activeTab === 'ADMIN'
                ? 'text-emerald-700 font-extrabold'
                : 'text-slate-500 hover:text-slate-850 font-semibold'
            }`}
            id="nav-admin-btn"
          >
            <div className={`p-1.5 rounded-xl transition-all duration-300 ${activeTab === 'ADMIN' ? 'bg-emerald-100/60 ring-2 ring-emerald-500/10' : 'bg-transparent'}`}>
              <LayoutDashboard className={`w-5 h-5 transition-colors ${activeTab === 'ADMIN' ? 'text-emerald-600 stroke-[2.25]' : 'text-slate-400'}`} />
            </div>
            <span className="text-[10px] sm:text-xs tracking-tight font-sans">{t('ADMIN_TERMINAL_TAB')}</span>
          </button>

          <button
            onClick={() => setActiveTab('FEEDBACK')}
            className={`flex-1 flex flex-col items-center gap-1 transition-all select-none active:scale-95 ${
              activeTab === 'FEEDBACK'
                ? 'text-emerald-700 font-extrabold'
                : 'text-slate-500 hover:text-slate-850 font-semibold'
            }`}
            id="nav-feedback-btn"
          >
            <div className={`p-1.5 rounded-xl transition-all duration-300 ${activeTab === 'FEEDBACK' ? 'bg-emerald-100/60 ring-2 ring-emerald-500/10' : 'bg-transparent'}`}>
              <MessageSquare className={`w-5 h-5 transition-colors ${activeTab === 'FEEDBACK' ? 'text-emerald-600 stroke-[2.25]' : 'text-slate-400'}`} />
            </div>
            <span className="text-[10px] sm:text-xs tracking-tight text-center">{t('FEEDBACK_TAB')}</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
