import React, { useEffect, useState, useRef } from 'react';
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
import { Seller, Product, PushNotification } from '../types';

interface AdminDashboardProps {
  apiKey: string;
  onLogout: () => void;
  systemRadius: number;
  onUpdateRadius: (radius: number) => void;
}

export default function AdminDashboard({ apiKey, onLogout, systemRadius, onUpdateRadius }: AdminDashboardProps) {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [notifications, setNotifications] = useState<PushNotification[]>([]);
  
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
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchAdminDetails();

    // Listen to real-time events to dynamic state updates
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
        }
      } catch (err) {
        console.warn(err);
      }
    };

    return () => eventSource.close();
  }, []);

  // Admin approval / account suspension toggle
  const handleToggleSuspend = async (sellerId: string) => {
    try {
      const res = await fetch(`/api/admin/sellers/${sellerId}/toggle-suspend`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        // Update general active state array locally
        setSellers(prev => prev.map(s => s.id === sellerId ? data.seller : s));
      }
    } catch (e) {
      alert('Network issue editing seller status.');
    }
  };

  // Create Product in catalog definition
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

  // Delete product template definition from master list
  const handleDeleteCatalogProduct = async (prodId: string) => {
    if (!confirm('Are you sure you want to remove this product from the platform master template? This will prevent new sellers from registering it.')) return;
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

  // Broadcast dynamic push bulletin alert
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
        setTimeout(() => setAnnounceSuccess(false), 4000);
        // Refresh notifications list log
        const nRes = await fetch('/api/notifications');
        if (nRes.ok) setNotifications(await nRes.json());
      }
    } catch (err) {
      alert('Bulletin broadcast error.');
    } finally {
      setAnnounceLoading(false);
    }
  };

  // Save Config parameters
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

  // Analytics Metrics computation
  const totalSellers = sellers.length;
  const activeSellersCount = sellers.filter(s => s.active).length;
  const suspendedSellersCount = sellers.filter(s => (s as any).suspended).length;
  const totalReviewsCount = sellers.reduce((acc, s) => acc + (s.reviews?.length || 0), 0);
  const totalInteractionsCount = sellers.reduce((acc, s) => acc + (s.interactionCount || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header Panel metadata */}
      <div className="bg-slate-900 text-white rounded-2xl shadow-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative">
        <div className="absolute right-0 top-0 w-64 h-64 bg-radial from-emerald-500/10 to-transparent pointer-events-none" />
        
        <div>
          <h2 className="text-xl font-extrabold flex items-center gap-2">
            <Lock className="w-5 h-5 text-emerald-500" />
            Platform Control Terminal
          </h2>
          <p className="text-xs text-slate-400 mt-1 leading-normal max-w-xl">
            As an Administrator, you can suspend compromised/inactive carts, update the vegetable & fruit master categories directory catalog, configure geographical default boundaries, and push real-time news bulletins.
          </p>
        </div>

        <button 
          onClick={onLogout}
          className="p-3 px-5 bg-white/10 hover:bg-white/15 rounded-xl text-white font-bold text-xs inline-flex items-center gap-1.5 backdrop-blur shadow select-none"
        >
          Logout Administrator
        </button>
      </div>

      {/* Analytics Dashboard Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 text-slate-800">
        <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-sm space-y-0.5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Partners</p>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-2xl font-extrabold">{totalSellers}</span>
            <span className="text-slate-500 text-xs font-semibold">Registered</span>
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-sm space-y-0.5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Carts On Map</p>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-2xl font-extrabold text-emerald-600">{activeSellersCount}</span>
            <span className="text-xs text-emerald-700 bg-emerald-50 px-1 rounded-full font-bold">🟢 Active</span>
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-sm space-y-0.5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Reviews Logged</p>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-2xl font-extrabold">{totalReviewsCount}</span>
            <span className="text-slate-500 text-xs">entries</span>
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-sm space-y-0.5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Complaints / Dial Clicks</p>
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
        {/* Left Side elements: Sellers list, Settings radius. 7 columns */}
        <div className="lg:col-span-7 space-y-6">
          {/* Seller management accounts section */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
            <h3 className="font-bold text-base text-slate-800 flex items-center gap-1.5">
              <Users className="w-5 h-5 text-emerald-600" />
              Manage Street Partner Accounts ({sellers.length})
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
                        <img src={s.profilePhoto} alt="" className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0" />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-800">{s.name}</span>
                            {(s as any).suspended && (
                              <span className="text-[9px] bg-red-100 text-red-800 px-1.5 py-0.5 rounded-full font-bold">Suspended</span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 font-mono">Mobile: {s.phone} | Oper: {s.serviceArea}</p>
                          <p className="text-[9px] text-slate-400 mt-0.5">Rating: ⭐ {s.avgRating > 0 ? s.avgRating : 'New'} ({s.ratingsCount}) | Active: {s.active ? '🟢 Online' : '🔴 Offline'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleSuspend(s.id)}
                          className={`py-1 px-3.5 rounded text-[11px] font-bold shadow ${
                            (s as any).suspended 
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                              : 'bg-rose-600 hover:bg-rose-700 text-white'
                          }`}
                        >
                          {(s as any).suspended ? 'Approve & Restore' : 'Suspend Account'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Master product template dictionary catalog settings manager */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
            <h3 className="font-bold text-base text-slate-800 flex items-center gap-1.5">
              <ShoppingBag className="w-5 h-5 text-emerald-600" />
              Manage Vegetables & Fruits Catalogs Master Lists
            </h3>

            <form onSubmit={handleCreateCatalogProduct} className="p-4 bg-slate-50 rounded-xl grid grid-cols-1 sm:grid-cols-4 gap-3 items-end text-xs">
              <div className="sm:col-span-2">
                <label className="font-bold text-slate-500 block mb-1">Item Display Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Organic Cauliflower (फूलगोभी)"
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  className="w-full bg-white border border-slate-200 py-1.5 px-2.5 rounded focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-500 block mb-1">Category Type</label>
                <select
                  value={prodCategory}
                  onChange={(e: any) => setProdCategory(e.target.value)}
                  className="w-full bg-white border border-slate-200 py-1.5 px-2 rounded focus:outline-none font-semibold"
                >
                  <option value="Vegetable">Vegetable</option>
                  <option value="Fruit">Fruit</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-500 block mb-1">Unit Typings</label>
                <input
                  type="text"
                  required
                  value={prodUnit}
                  onChange={(e) => setProdUnit(e.target.value)}
                  className="w-full bg-white border border-slate-200 py-1.5 px-2 rounded focus:outline-none font-semibold"
                  placeholder="e.g. kg or bunch"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="font-bold text-slate-500 block mb-1">Photo URL link(Optional)</label>
                <input
                  type="url"
                  placeholder="Paste direct .png/.jpg link"
                  value={prodImageUrl}
                  onChange={(e) => setProdImageUrl(e.target.value)}
                  className="w-full bg-white border border-slate-200 py-1.5 px-2.5 rounded focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={catalogLoading}
                className="w-full py-2 bg-slate-800 text-white rounded font-bold transition-all sm:col-span-1"
              >
                {catalogLoading ? 'Adding...' : 'Add Template'}
              </button>
            </form>

            <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1">
              {catalog.map((c) => (
                <div key={c.id} className="p-2 border border-slate-100 rounded-lg flex items-center justify-between gap-3 text-xs bg-white">
                  <span>{c.name} ({c.unit})</span>
                  <button
                    onClick={() => handleDeleteCatalogProduct(c.id)}
                    className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                    title="Remove template"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Maps tracking all partners, config settings announcements. 5 columns */}
        <div className="lg:col-span-5 space-y-6">
          {/* Active geographic coordinates monitoring */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-lg overflow-hidden relative">
            <div className="bg-slate-50 p-2 px-4 border-b border-slate-100 text-xs font-semibold flex items-center justify-between">
              <span>🗺️ Fleet Location Live Monitoring Map</span>
              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px] font-bold">🟢 Real-Time Logs</span>
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

          {/* System Announcement Publisher bulletin tray */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 md:p-6 space-y-4">
            <h4 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
              <Megaphone className="w-4 h-4 text-emerald-500" />
              Publish Bulletin Notification (FCM Realtime Broadcaster)
            </h4>

            <form onSubmit={handlePostAnnouncement} className="space-y-3 text-xs">
              {announceSuccess && (
                <p className="p-2 border border-emerald-500/30 text-emerald-800 rounded bg-emerald-50 font-semibold">
                  ✓ announcement bulletin pushed! Simulation alerts customer dashboards in real-time.
                </p>
              )}

              <div className="space-y-1">
                <label className="font-bold text-slate-600 block">Notification Title (Headline)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Price drop on Red Apple catalog!"
                  value={announceTitle}
                  onChange={(e) => setAnnounceTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600 block">Body description bulletin</label>
                <textarea
                  required
                  placeholder="e.g. Save ₹20/kg across our organic apple lists in Koramangala today..."
                  rows={2}
                  value={announceBody}
                  onChange={(e) => setAnnounceBody(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={announceLoading}
                className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg transition-all"
              >
                {announceLoading ? 'Pulsing notifications...' : 'Post System Announcement Bulletin'}
              </button>
            </form>
          </div>

          {/* Configuration Settings ranges */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 md:p-6 space-y-4">
            <h4 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-emerald-500" />
              System Properties & Defaults
            </h4>

            <form onSubmit={handleSaveSettings} className="space-y-3 text-xs">
              {settingsSuccess && (
                <p className="p-2 border border-emerald-500/30 text-emerald-800 rounded bg-emerald-50 font-semibold">
                  ✓ Config parameters saved dynamically! Radius maps updated.
                </p>
              )}

              <div className="space-y-1">
                <label className="font-bold text-slate-600 block">Default Customer Scan Radius (Km): {radiusKm} Km</label>
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
                className="w-full py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg transition-all"
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
