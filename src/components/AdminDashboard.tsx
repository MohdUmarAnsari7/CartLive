import React, { useEffect, useState } from 'react';
import LeafletMap from './LeafletMap';
import { 
  Users, 
  Sparkles, 
  ShoppingBag, 
  Megaphone, 
  Sliders, 
  Lock, 
  Trash2, 
  ShieldAlert, 
  Compass, 
  Eye, 
  Layers, 
  Plus, 
  Check, 
  X, 
  UserX,
  ListOrdered
} from 'lucide-react';
import { Seller, Product, PushNotification, Feedback } from '../types';
import { useI18n } from '../i18n/I18nContext';

interface AdminDashboardProps {
  apiKey: string;
  onLogout: () => void;
  systemRadius: number;
  onUpdateRadius: (radius: number) => void;
}

export default function AdminDashboard({ apiKey, onLogout, systemRadius, onUpdateRadius }: AdminDashboardProps) {
  const { t } = useI18n();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [notifications, setNotifications] = useState<PushNotification[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  
  // Create product definition state
  const [prodName, setProdName] = useState('');
  const [prodCategory, setProdCategory] = useState<'Vegetable' | 'Fruit'>('Vegetable');
  const [prodUnit, setProdUnit] = useState('kg');
  const [prodImageUrl, setProdImageUrl] = useState('');
  const [catalogLoading, setCatalogLoading] = useState(false);

  // Broadcast announcement
  const [announceTitle, setAnnounceTitle] = useState('');
  const [announceBody, setAnnounceBody] = useState('');
  const [announceLoading, setAnnounceLoading] = useState(false);
  const [announceSuccess, setAnnounceSuccess] = useState(false);

  // Config settings
  const [radiusKm, setRadiusKm] = useState(systemRadius);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  const [activeWindowId, setActiveWindowId] = useState<string | null>(null);

  const fetchAdminDetails = async () => {
    try {
      const sRes = await fetch('/api/sellers');
      if (sRes.ok) setSellers(await sRes.json());

      const cRes = await fetch('/api/catalog');
      if (cRes.ok) setCatalog(await cRes.json());

      const nRes = await fetch('/api/notifications');
      if (nRes.ok) setNotifications(await nRes.json());

      const fRes = await fetch('/api/admin/feedbacks');
      if (fRes.ok) setFeedbacks(await fRes.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchAdminDetails();

    const eventSource = new EventSource('/api/realtime/stream');
    eventSource.onmessage = (event) => {
      try {
        const { type, data } = JSON.parse(event.data);
        if (type === 'seller_location_updated') {
          setSellers(prev => prev.map(s => s.id === data.id ? { ...s, location: data.location, lastLocationUpdate: data.lastLocationUpdate } : s));
        } else if (type === 'seller_status_changed') {
          setSellers(prev => {
            const exists = prev.some(s => s.id === data.id);
            if (exists) {
              return prev.map(s => s.id === data.id ? data : s);
            } else {
              return [...prev, data];
            }
          });
        } else if (type === 'seller_profile_updated') {
          setSellers(prev => prev.map(s => s.id === data.id ? { ...s, ...data } : s));
        } else if (type === 'feedback_submitted') {
          setFeedbacks(prev => [data, ...prev]);
        }
      } catch (err) {
        console.warn(err);
      }
    };

    return () => eventSource.close();
  }, []);

  const handleToggleSuspend = async (sellerId: string) => {
    try {
      const res = await fetch(`/api/admin/sellers/${sellerId}/toggle-suspend`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        setSellers(prev => prev.map(s => s.id === sellerId ? data.seller : s));
      }
    } catch (e) {
      alert('Network issue editing seller status.');
    }
  };

  const handleCreateCatalogProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName.trim()) return;

    setCatalogLoading(true);
    try {
      const res = await fetch('/api/admin/catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: prodName,
          category: prodCategory,
          unit: prodUnit,
          imageUrl: prodImageUrl
        })
      });
      if (res.ok) {
        const data = await res.json();
        setCatalog(prev => [data.product, ...prev]);
        setProdName('');
        setProdImageUrl('');
      }
    } catch (err) {
      alert('Error creating catalog definition.');
    } finally {
      setCatalogLoading(false);
    }
  };

  const handleDeleteCatalogProduct = async (prodId: string) => {
    if (!confirm('Are you sure you want to remove this product from the platform master template?')) return;
    try {
      const res = await fetch(`/api/admin/catalog/${prodId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setCatalog(prev => prev.filter(p => p.id !== prodId));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announceTitle.trim() || !announceBody.trim()) return;

    setAnnounceLoading(true);
    try {
      const res = await fetch('/api/admin/announcement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: announceTitle, body: announceBody })
      });
      if (res.ok) {
        setAnnounceTitle('');
        setAnnounceBody('');
        setAnnounceSuccess(true);
        setTimeout(() => setAnnounceSuccess(false), 4500);
        
        const nRes = await fetch('/api/notifications');
        if (nRes.ok) setNotifications(await nRes.json());
      }
    } catch (err) {
      alert('Bulletin broadcast error.');
    } finally {
      setAnnounceLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchRadiusKm: radiusKm })
      });
      if (res.ok) {
        onUpdateRadius(Number(radiusKm));
        setSettingsSuccess(true);
        setTimeout(() => setSettingsSuccess(false), 4000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteFeedback = async (id: string) => {
    if (!confirm('Are you sure you want to remove this feedback from the admin control panel?')) return;
    try {
      const res = await fetch(`/api/admin/feedbacks/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setFeedbacks(prev => prev.filter(f => f.id !== id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const totalSellers = sellers.length;
  const activeSellersCount = sellers.filter(s => s.active).length;
  const suspendedSellersCount = sellers.filter(s => (s as any).suspended).length;
  const totalReviewsCount = sellers.reduce((acc, s) => acc + (s.reviews?.length || 0), 0);
  const totalInteractionsCount = sellers.reduce((acc, s) => acc + (s.interactionCount || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header Panel */}
      <div className="bg-slate-900 text-white rounded-2xl shadow-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative">
        <div className="absolute right-0 top-0 w-64 h-64 bg-radial from-emerald-500/10 to-transparent pointer-events-none" />
        
        <div>
          <h2 className="text-xl font-extrabold flex items-center gap-2 font-sans text-white">
            <Lock className="w-5 h-5 text-emerald-500" />
            {t('PANEL_ADMIN')}
          </h2>
          <p className="text-xs text-slate-400 mt-1 leading-normal max-w-xl">
            {t('ADMIN_WARN_BANNER') || "Platform administrator panel: approve & suspend accounts, edit master catalog list templates, alter radius properties, and see live feedbacks."}
          </p>
        </div>

        <button 
          onClick={onLogout}
          className="p-3 px-5 bg-white/10 hover:bg-white/15 rounded-xl text-white font-bold text-xs inline-flex items-center gap-1.5 backdrop-blur shadow select-none cursor-pointer"
        >
          {t('LOGOUT_BTN')}
        </button>
      </div>

      {/* Analytics Dashboard Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 text-slate-800">
        <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-sm space-y-0.5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Partners</p>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-2xl font-extrabold">{totalSellers}</span>
            <span className="text-slate-500 text-xs font-semibold">Registered</span>
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-sm space-y-0.5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Carts</p>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-2xl font-extrabold text-emerald-600">{activeSellersCount}</span>
            <span className="text-xs text-emerald-700 bg-emerald-50 px-1 rounded-full font-bold">🟢 Active</span>
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-sm space-y-0.5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-teal-600">Feedbacks</p>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-2xl font-extrabold text-teal-600">{feedbacks.length}</span>
            <span className="text-xs text-slate-550">entries</span>
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-sm space-y-0.5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Reviews Logged</p>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-2xl font-extrabold">{totalReviewsCount}</span>
            <span className="text-slate-500 text-xs">entries</span>
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-sm space-y-0.5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Call Interactions</p>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-2xl font-extrabold text-blue-600">{totalInteractionsCount}</span>
            <span className="text-xs text-blue-600 font-semibold bg-blue-50 px-1 rounded">Clicks</span>
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-sm space-y-0.5 col-span-2 lg:col-span-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Suspended Accounts</p>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-2xl font-extrabold text-rose-600">{suspendedSellersCount}</span>
            <span className="text-slate-400 text-xs">Flagged</span>
          </div>
        </div>
      </div>

      {/* Main interactive split panels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-slate-800">
        
        {/* Left Side: Partners count lists, catalog models */}
        <div className="lg:col-span-7 space-y-6">
          
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
            <h3 className="font-bold text-base text-slate-800 flex items-center gap-1.5 font-sans">
              <Users className="w-4.5 h-4.5 text-emerald-600" />
              Manage street cart partner nodes ({sellers.length})
            </h3>

            <div className="space-y-3">
              {sellers.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">No accounts registered on platform database.</p>
              ) : (
                <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                  {sellers.map((s) => (
                    <div 
                      key={s.id} 
                      className="p-3 border border-slate-100 rounded-xl bg-slate-50/50 hover:bg-slate-50 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        {s.profilePhoto ? (
                          <img src={s.profilePhoto} alt="" className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center font-bold text-emerald-700 text-xs shrink-0">
                            {s.name.substring(0, 2)}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-850">{s.name}</span>
                            {(s as any).suspended && (
                              <span className="text-[9px] bg-red-100 text-red-00 text-red-700 px-1.5 py-0.5 rounded-full font-bold">Suspended</span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 font-mono">Mobile: {s.phone} | Oper: {s.serviceArea}</p>
                          <p className="text-[9px] text-slate-400 mt-0.5">Rating: ⭐ {s.avgRating > 0 ? s.avgRating : 'New'} ({s.ratingsCount}) | Active: {s.active ? '🟢 Online' : '🔴 Offline'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleSuspend(s.id)}
                          className={`py-1 px-3.5 rounded text-[10px] font-bold shadow cursor-pointer transition-colors ${
                            (s as any).suspended 
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                              : 'bg-rose-600 hover:bg-rose-700 text-white'
                          }`}
                        >
                          {(s as any).suspended ? 'Restore' : 'Suspend'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Master template catalogs */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
            <h3 className="font-bold text-base text-slate-800 flex items-center gap-1.5 font-sans">
              <ShoppingBag className="w-4.5 h-4.5 text-emerald-600" />
              Manage approved vegetables & fruits catalog templates
            </h3>

            <form onSubmit={handleCreateCatalogProduct} className="p-4 bg-slate-50 rounded-xl grid grid-cols-1 sm:grid-cols-4 gap-3 items-end text-xs border border-slate-100">
              <div className="sm:col-span-2">
                <label className="font-semibold text-slate-600 block mb-1">Item Title Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cauliflower (फूलगोभी)"
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  className="w-full bg-white border border-slate-200 py-1.5 px-2.5 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1">Category</label>
                <select
                  value={prodCategory}
                  onChange={(e: any) => setProdCategory(e.target.value)}
                  className="w-full bg-white border border-slate-200 py-1.5 px-2 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold"
                >
                  <option value="Vegetable">Vegetable</option>
                  <option value="Fruit">Fruit</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1">Unit Weight</label>
                <input
                  type="text"
                  required
                  value={prodUnit}
                  onChange={(e) => setProdUnit(e.target.value)}
                  className="w-full bg-white border border-slate-200 py-1.5 px-2 rounded focus:outline-none font-semibold"
                  placeholder="e.g. kg, bundle"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="font-semibold text-slate-600 block mb-1">Graphic Icon URL (Optional)</label>
                <input
                  type="url"
                  placeholder="Paste explicit image source URL link"
                  value={prodImageUrl}
                  onChange={(e) => setProdImageUrl(e.target.value)}
                  className="w-full bg-white border border-slate-200 py-1.5 px-2.5 rounded focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={catalogLoading}
                className="w-full py-2 bg-slate-800 text-white rounded font-bold transition-all sm:col-span-1 cursor-pointer hover:bg-slate-900"
              >
                {catalogLoading ? 'Adding...' : 'Add template'}
              </button>
            </form>

            <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1">
              {catalog.map((c) => (
                <div key={c.id} className="p-2 border border-slate-100 rounded-lg flex items-center justify-between gap-3 text-xs bg-white">
                  <span className="font-medium text-slate-700">{c.name} ({c.unit})</span>
                  <button
                    onClick={() => handleDeleteCatalogProduct(c.id)}
                    className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                    title="Remove template"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Feedback section panel */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-105 pb-3">
              <h3 className="font-bold text-base text-slate-800 flex items-center gap-1.5 font-sans">
                <Megaphone className="w-5 h-5 text-teal-600" />
                {t('FEED_SEC_TITLE')} ({feedbacks.length})
              </h3>
              <span className="text-[10px] bg-teal-50 text-teal-700 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">LIVE TERMINAL FEEDBACKS</span>
            </div>
            
            {feedbacks.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl bg-slate-50/30">
                <p className="text-xs text-slate-500 font-medium">No feedback submitted yet.</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Use the Feedback form in bottom bar to transmit test content.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {feedbacks.map((f) => {
                  const dateStr = f.createdAt ? new Date(f.createdAt).toLocaleString() : 'Just now';
                  const initials = f.name ? f.name.substring(0, 2).toUpperCase() : 'CU';
                  
                  return (
                    <div 
                      key={f.id} 
                      className="p-4 border border-slate-100 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-all flex flex-col gap-2 relative group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-[10px] font-extrabold text-white">
                            {initials}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800">{f.name}</p>
                            <p className="text-[10px] text-slate-400">{dateStr}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteFeedback(f.id)}
                          className="p-1 px-2 border border-rose-200 rounded text-rose-600 hover:bg-rose-50 text-[10px] font-semibold flex items-center gap-1 cursor-pointer shadow-sm"
                          title="Remove feedback entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{t('OFFERINGS_REMOVE_BTN') || 'Remove'}</span>
                        </button>
                      </div>
                      
                      <div className="pl-10.5">
                        <p className="text-xs text-slate-650 leading-relaxed bg-white p-2.5 border border-slate-105 rounded-lg shadow-inner whitespace-pre-line font-medium text-slate-700">
                          {f.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Right Side: Monitors fleet map map parameters settings */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Active geographic coordinates monitoring */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden relative">
            <div className="bg-slate-50 p-2.5 px-4 border-b border-slate-100 text-xs font-semibold flex items-center justify-between text-slate-700">
              <span className="font-bold flex items-center gap-1">🗺️ Live Active Cart Status Map</span>
              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px] font-bold">LIVE RADAR</span>
            </div>

            <div style={{ height: '330px', width: '100%', position: 'relative' }}>
              <LeafletMap
                center={{ lat: 12.9716, lng: 77.5946 }}
                sellers={sellers.filter(s => s.active && s.location)}
                favorites={[]}
                onSellerSelect={(s) => setActiveWindowId(s.id)}
                selectedSellerId={activeWindowId}
              />
            </div>
          </div>

          {/* Bulletin Publisher announcement stream */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 md:p-6 space-y-4">
            <h4 className="font-bold text-sm text-slate-805 flex items-center gap-1.5 font-sans">
              <Megaphone className="w-4 h-4 text-emerald-600 animate-bounce" />
              Publish Bulletin Announcement
            </h4>

            <form onSubmit={handlePostAnnouncement} className="space-y-3 text-xs">
              {announceSuccess && (
                <p className="p-2 border border-emerald-500/30 text-emerald-800 rounded bg-emerald-50 font-semibold">
                  ✓ news bulletin broadcasted to clients!
                </p>
              )}

              <div className="space-y-1">
                <label className="font-semibold text-slate-600 block">Headline Bulletin Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cauliflower Price Drop!"
                  value={announceTitle}
                  onChange={(e) => setAnnounceTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded focus:outline-none focus:bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-600 block">Brief Bulletin Description</label>
                <textarea
                  required
                  placeholder="e.g. Cauliflower prices dropped to ₹30/kg today..."
                  rows={2}
                  value={announceBody}
                  onChange={(e) => setAnnounceBody(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded focus:outline-none focus:bg-white"
                />
              </div>

              <button
                type="submit"
                disabled={announceLoading}
                className="w-full py-2 bg-slate-850 hover:bg-slate-900 text-white font-bold rounded-lg transition-all cursor-pointer"
              >
                {announceLoading ? 'Pulsing notifications...' : 'Publish System Announcement Bulletin'}
              </button>
            </form>
          </div>

          {/* Configuration Settings default parameters */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 md:p-6 space-y-4">
            <h4 className="font-bold text-sm text-slate-800 flex items-center gap-1.5 font-sans">
              <Sliders className="w-4 h-4 text-emerald-650" />
              Scan Radius Settings
            </h4>

            <form onSubmit={handleSaveSettings} className="space-y-3 text-xs">
              {settingsSuccess && (
                <p className="p-2 border border-emerald-500/30 text-emerald-800 rounded bg-emerald-50 font-semibold">
                  ✓ Radius configurations saved successfully!
                </p>
              )}

              <div className="space-y-1">
                <label className="font-semibold text-slate-650 block">Default scan radius: {radiusKm} Km</label>
                <input
                  type="range"
                  min="3"
                  max="20"
                  step="1"
                  value={radiusKm}
                  onChange={(e) => setRadiusKm(Number(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
              </div>

              <button
                type="submit"
                className="w-full py-1.5 bg-slate-150 hover:bg-slate-200 bg-slate-100 text-slate-700 font-bold rounded-lg transition-all cursor-pointer"
              >
                Save Properties
              </button>
            </form>
          </div>

        </div>

      </div>
    </div>
  );
}
