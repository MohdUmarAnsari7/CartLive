import React, { useEffect, useState, useRef } from 'react';
import LeafletMap from './LeafletMap';
import { 
  Check, 
  MapPin, 
  Tag, 
  Smartphone, 
  DollarSign, 
  Eye, 
  TrendingUp, 
  Plus, 
  Trash2, 
  Sparkles, 
  Power, 
  Settings, 
  Award, 
  LogOut,
  Calendar,
  Layers,
  RotateCw
} from 'lucide-react';
import { Seller, Product, SellerProduct } from '../types';
import { useI18n } from '../i18n/I18nContext';

interface SellerDashboardProps {
  seller: Seller;
  onLogout: () => void;
  onProfileUpdate: (updatedUser: any) => void;
}

export default function SellerDashboard({ seller, onLogout, onProfileUpdate }: SellerDashboardProps) {
  const { t } = useI18n();
  // Active coordinates sharing
  const [isActive, setIsActive] = useState(seller.active);
  const [trackingIntervalId, setTrackingIntervalId] = useState<any>(null);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(seller.location || null);
  const [coordsMsg, setCoordsMsg] = useState('');

  // Manual location picker states
  const [sellerLocQuery, setSellerLocQuery] = useState('');
  const [sellerLocLoading, setSellerLocLoading] = useState(false);
  const [sellerLocError, setSellerLocError] = useState<string | null>(null);

  const updateLocationOnServer = async (newCoords: { lat: number; lng: number }, reason: string) => {
    setCurrentCoords(newCoords);
    lastSentCoordsRef.current = newCoords;
    lastSentTimeRef.current = Date.now();

    try {
      const res = await fetch(`/api/sellers/${seller.id}/location`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location: newCoords })
      });
      if (res.ok) {
        setCoordsMsg(`🟢 Broadcast Active | ${reason} at ${new Date().toLocaleTimeString()}`);
        onProfileUpdate({
          ...seller,
          location: newCoords,
          lastLocationUpdate: new Date().toISOString()
        });
      }
    } catch (e) {
      setCoordsMsg('⚠️ Network: failed to broadcast updated coordinates.');
    }
  };

  const handleSellerLocationSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellerLocQuery.trim()) return;
    setSellerLocLoading(true);
    setSellerLocError(null);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(sellerLocQuery.trim())}&limit=1`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'CartLiveMobileVegFruitCartFinder/1.0'
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          const result = data[0];
          const newCoords = {
            lat: parseFloat(result.lat),
            lng: parseFloat(result.lon)
          };
          updateLocationOnServer(newCoords, 'Address search locator');
          setSellerLocQuery('');
        } else {
          setSellerLocError('No matching location found.');
        }
      } else {
        setSellerLocError('Could not verify searched address.');
      }
    } catch (err) {
      console.warn(err);
      setSellerLocError('Search geocoder service is currently unavailable.');
    } finally {
      setSellerLocLoading(false);
    }
  };

  const lastSentCoordsRef = useRef<{ lat: number; lng: number } | null>(seller.location || null);
  const lastSentTimeRef = useRef<number>(0);
  const watchIdRef = useRef<number | null>(null);

  // Daily catalog management
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [sellerProducts, setSellerProducts] = useState<SellerProduct[]>(seller.products || []);
  const [selectedCatalogId, setSelectedCatalogId] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newStockStatus, setNewStockStatus] = useState<'In Stock' | 'Low Stock' | 'Out of Stock'>('In Stock');

  // Edit settings
  const [sellerName, setSellerName] = useState(seller.name);
  const [sellerPhone, setSellerPhone] = useState(seller.phone);
  const [cartInfo, setCartInfo] = useState(seller.cartInfo);
  const [serviceArea, setServiceArea] = useState(seller.serviceArea);
  const [profilePhoto, setProfilePhoto] = useState(seller.profilePhoto);
  const [editLoading, setEditLoading] = useState(false);
  const [editSuccess, setEditSuccess] = useState(false);

  // Fetch product definitions catalog
  const getCatalogData = async () => {
    try {
      const res = await fetch('/api/catalog');
      if (res.ok) {
        const data = await res.json();
        setCatalog(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    getCatalogData();
    
    if (seller.active) {
      initiateLiveTracking();
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Geolocation coordinates updates sequence
  const initiateLiveTracking = () => {
    if (!navigator.geolocation) {
      setCoordsMsg('❌ GPS tracker error: not supported on device.');
      return;
    }

    setCoordsMsg('⏳ Connecting real-time GPS watch...');

    const getDistanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371e3; // meters
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    const handlePositionUpdate = async (position: GeolocationPosition) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      const newCoords = { lat, lng };

      const now = Date.now();
      const lastCoords = lastSentCoordsRef.current;
      const lastTime = lastSentTimeRef.current;

      let shouldSend = false;
      let reason = '';

      if (!lastCoords) {
        shouldSend = true;
        reason = 'Initial location';
      } else {
        const distance = getDistanceMeters(lastCoords.lat, lastCoords.lng, lat, lng);
        const timeElapsedSecs = (now - lastTime) / 1000;

        // If moved more than 10 meters, send immediately (if at least 3 seconds have passed between packets)
        if (distance >= 10) {
          if (timeElapsedSecs >= 3) {
            shouldSend = true;
            reason = `Moved ${distance.toFixed(1)}m (live track)`;
          }
        } 
        // stationary update: keep alive every 15 seconds so customer can see actual location instantly if it changes
        else if (timeElapsedSecs >= 15) {
          shouldSend = true;
          reason = `Timer sync (last moved ${distance.toFixed(1)}m)`;
        }
      }

      if (shouldSend) {
        await updateLocationOnServer(newCoords, `Live tracks (${reason})`);
      }
    };

    const handlePositionError = (error: GeolocationPositionError) => {
      let friendlyMsg = '⚠️ GPS error. Check location access.';
      if (error.code === error.PERMISSION_DENIED) {
        friendlyMsg = '⚠️ GPS Access Denied. Enable permissions.';
      }
      setCoordsMsg(friendlyMsg);
      console.warn('GPS tracking watch error', error);
    };

    // Clean any prior watch active
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    const watchId = navigator.geolocation.watchPosition(
      handlePositionUpdate,
      handlePositionError,
      { 
        enableHighAccuracy: true, 
        maximumAge: 0,
        timeout: 10000
      }
    );
    watchIdRef.current = watchId;
    setTrackingIntervalId(watchId);
  };

  const stopLiveTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setTrackingIntervalId(null);
    setCoordsMsg('');
  };

  // Toggle duty state
  const handleActiveToggle = async () => {
    const nextState = !isActive;
    let userCoords = currentCoords;
    
    if (nextState) {
      if (!navigator.geolocation) {
        alert('Browser Geolocation is required to go active.');
        return;
      }
      setCoordsMsg('⏳ Fetching setup GPS location...');
      
      try {
        await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              userCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
              setCurrentCoords(userCoords);
              resolve(userCoords);
            },
            async () => {
              try {
                const response = await fetch('https://ipapi.co/json/');
                if (response.ok) {
                  const data = await response.json();
                  if (data && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
                    userCoords = { lat: data.latitude, lng: data.longitude };
                  } else {
                    userCoords = { lat: 12.9716, lng: 77.5946 };
                  }
                } else {
                  userCoords = { lat: 12.9716, lng: 77.5946 };
                }
              } catch {
                userCoords = { lat: 12.9716, lng: 77.5946 };
              }
              setCurrentCoords(userCoords);
              resolve(userCoords);
            },
            { enableHighAccuracy: true, timeout: 4000 }
          );
        });
      } catch (e) {
        console.warn('Coordinates fallback applied.');
      }
    }

    try {
      const res = await fetch(`/api/sellers/${seller.id}/active`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: nextState, location: userCoords })
      });
      if (res.ok) {
        const data = await res.json();
        setIsActive(nextState);
        onProfileUpdate(data.seller);

        if (nextState) {
          initiateLiveTracking();
        } else {
          stopLiveTracking();
        }
      }
    } catch (e) {
      alert('Network issue toggling status.');
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCatalogId || !newPrice) return;

    const matchedCatalogItem = catalog.find((c) => c.id === selectedCatalogId);
    if (!matchedCatalogItem) return;

    if (sellerProducts.some((p) => p.productId === selectedCatalogId)) {
      alert('Product already listed in your active offerings! Update its price directly below.');
      return;
    }

    const updatedList: SellerProduct[] = [
      ...sellerProducts,
      {
        productId: matchedCatalogItem.id,
        name: matchedCatalogItem.name,
        category: matchedCatalogItem.category,
        price: Number(newPrice),
        unit: matchedCatalogItem.unit,
        isAvailable: true,
        stockStatus: newStockStatus,
        lastUpdated: new Date().toISOString()
      }
    ];

    await updateProductsOnServer(updatedList);
    setNewPrice('');
  };

  const handleToggleProductAvailable = async (productId: string) => {
    const updated = sellerProducts.map((p) =>
      p.productId === productId ? { ...p, isAvailable: !p.isAvailable, lastUpdated: new Date().toISOString() } : p
    );
    await updateProductsOnServer(updated);
  };

  const handleUpdateProductDetail = async (
    productId: string, 
    fields: Partial<Pick<SellerProduct, 'price' | 'stockStatus'>>
  ) => {
    const updated = sellerProducts.map((p) =>
      p.productId === productId 
        ? { ...p, ...fields, price: fields.price !== undefined ? Number(fields.price) : p.price, lastUpdated: new Date().toISOString() } 
        : p
    );
    await updateProductsOnServer(updated);
  };

  const handleDeleteProduct = async (productId: string) => {
    const updated = sellerProducts.filter((p) => p.productId !== productId);
    await updateProductsOnServer(updated);
  };

  const updateProductsOnServer = async (pList: SellerProduct[]) => {
    try {
      const res = await fetch(`/api/sellers/${seller.id}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: pList })
      });
      if (res.ok) {
        const data = await res.json();
        setSellerProducts(data.products);
        const refreshed = { ...seller, products: data.products };
        onProfileUpdate(refreshed);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditLoading(true);
    setEditSuccess(false);

    try {
      const res = await fetch(`/api/sellers/${seller.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: sellerName,
          phone: sellerPhone,
          cartInfo,
          serviceArea,
          profilePhoto
        })
      });
      if (res.ok) {
        const data = await res.json();
        onProfileUpdate(data.seller);
        setEditSuccess(true);
        setTimeout(() => setEditSuccess(false), 4000);
      }
    } catch (err) {
      alert('Error updating profile settings details.');
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header Profile Summary Grid */}
      <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4 text-center md:text-left flex-col md:flex-row">
          {seller.profilePhoto ? (
            <img 
              src={seller.profilePhoto} 
              alt="Profile" 
              className="w-16 h-16 rounded-full object-cover border-4 border-slate-100 shadow shrink-0" 
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center font-bold text-emerald-700 border-4 border-slate-100 shadow shrink-0">
              {seller.name.substring(0, 2)}
            </div>
          )}
          <div>
            <h2 className="text-xl font-bold text-slate-800">{seller.name}</h2>
            <p className="text-xs text-slate-500 font-mono mt-0.5">{t('MOBILE_VERIFIED')}: {seller.phone}</p>
            <div className="flex items-center gap-2 mt-1 justify-center md:justify-start">
              <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                isActive ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200'
              }`}>
                <Power className="w-3 h-3" />
                {isActive ? t('GPS_ACTIVE') : t('GPS_INACTIVE')}
              </span>
            </div>
          </div>
        </div>

        {/* Global toggles */}
        <div className="flex flex-col sm:flex-row items-center gap-4 shrink-0 w-full md:w-auto">
          {/* Active / Inactive switch */}
          <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl flex items-center justify-between gap-4 w-full sm:w-60">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-slate-700">{t('GPS_STATUS')}</p>
              <p className="text-[10px] text-slate-500">{isActive ? '🟢 Active Broadcast' : '🔴 Tracking paused'}</p>
            </div>
            <button
              onClick={handleActiveToggle}
              className={`py-1.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isActive ? 'bg-rose-600 hover:bg-rose-700 text-white shadow' : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow'
              }`}
            >
              {isActive ? 'Go Offline' : 'Go Online'}
            </button>
          </div>

          <button 
            onClick={onLogout}
            className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-650 hover:text-slate-800 font-bold text-xs inline-flex items-center gap-1.5 w-full sm:w-auto justify-center cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-rose-600" />
            {t('LOGOUT_BTN')}
          </button>
        </div>
      </div>

      <div className="bg-slate-900 text-emerald-400 p-3 rounded-xl text-xs font-mono flex items-center justify-between shadow-inner gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-emerald-500 animate-pulse shrink-0" />
          <span>{coordsMsg || '📡 GPS Broadcast: Ready. Pin your operating location on the map below or search!'}</span>
        </div>
        {currentCoords && (
          <span className="text-[10px] bg-slate-800 text-teal-300 px-2 py-0.5 rounded border border-slate-700 font-bold shrink-0">
            {currentCoords.lat.toFixed(4)}, {currentCoords.lng.toFixed(4)}
          </span>
        )}
      </div>

      {/* Interactive Seller Node Map Selector */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-md overflow-hidden p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-50 pb-3 gap-2">
          <div>
            <h3 className="font-bold text-sm text-slate-850 flex items-center gap-1.5 font-sans">
              📍 Map Location Setter (Backup Input)
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Tap anywhere on the map or type/search an address below to set your vegetable/fruit cart's current operating position.
            </p>
          </div>
          <span className="text-[9px] bg-emerald-600/10 text-emerald-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
            Active Cart Placement
          </span>
        </div>

        <div style={{ height: '300px', width: '100%', position: 'relative' }} className="rounded-xl overflow-hidden border border-slate-200">
          <LeafletMap
            center={currentCoords || { lat: 12.9716, lng: 77.5946 }}
            customerLocation={currentCoords || undefined}
            sellers={currentCoords ? [{
              ...seller,
              location: currentCoords,
              active: true,
              products: sellerProducts
            }] : []}
            favorites={[]}
            onMapClick={(coords) => {
              updateLocationOnServer(coords, 'Map click placement');
            }}
          />
        </div>

        {/* Manual search and major test city fast offsets */}
        <div className="space-y-2.5 text-xs">
          <form onSubmit={handleSellerLocationSearch} className="flex gap-2">
            <input
              type="text"
              placeholder="🔍 Search operating street, landmark or city (e.g. Indiranagar Metro, Delhi, Mumbai...)"
              value={sellerLocQuery}
              onChange={(e) => setSellerLocQuery(e.target.value)}
              className="flex-grow bg-slate-50 border border-slate-250 px-3 py-2 rounded-lg font-medium shadow-inner focus:outline-none focus:border-emerald-500 focus:bg-white text-slate-800 text-xs sm:text-sm"
            />
            <button
              type="submit"
              disabled={sellerLocLoading}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold shadow-sm cursor-pointer disabled:opacity-60 transition-all text-xs"
            >
              {sellerLocLoading ? 'Locating...' : 'Set Location'}
            </button>
          </form>
          {sellerLocError && (
            <p className="text-[10px] text-amber-600 font-bold bg-amber-50 p-1 px-2 rounded border border-amber-100">
              ⚠️ {sellerLocError}
            </p>
          )}

          {/* Quick Sandbox preset offsets to place sellers right near the simulated customers! */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2.5 border-t border-slate-100 flex-row">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Test Sandbox presets:</span>
            {[
              { name: '📍 Near Indiranagar Carts (Suggested Hub)', lat: 12.9784, lng: 77.6408 },
              { name: 'Bangalore Center', lat: 12.9716, lng: 77.5946 },
              { name: 'Delhi', lat: 28.6139, lng: 77.2090 },
              { name: 'Mumbai', lat: 19.0760, lng: 72.8777 }
            ].map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => {
                  updateLocationOnServer({ lat: preset.lat, lng: preset.lng }, `Preset '${preset.name}'`);
                }}
                className="px-2.5 py-1 border border-slate-200 hover:border-emerald-500 rounded-full bg-white hover:bg-slate-50 text-[10px] font-bold text-slate-600 hover:text-emerald-700 shadow-xs cursor-pointer transition-all"
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main body modules config: Daily Offering Management & Profile/AI card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Grid: Catalog lists. 7 columns */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 md:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-50 pb-3 gap-3">
            <div>
              <h3 className="font-bold text-base text-slate-800 flex items-center gap-1.5 font-sans">
                <Layers className="w-4.5 h-4.5 text-emerald-600" />
                {t('INVENTORY_TITLE')}
              </h3>
              <p className="text-xs text-slate-500 mt-1">{t('INVENTORY_DESC')}</p>
            </div>
          </div>

          {/* Quick item addition panel */}
          <form onSubmit={handleAddProduct} className="p-4 bg-slate-55 rounded-xl grid grid-cols-1 md:grid-cols-3 gap-3 items-end border border-slate-100">
            <div>
              <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                {t('ADD_ITEM_SELECT')}
              </label>
              <select
                required
                value={selectedCatalogId}
                onChange={(e) => setSelectedCatalogId(e.target.value)}
                className="w-full bg-white border border-slate-200 py-1.5 px-2 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
              >
                <option value="">-- Choose --</option>
                {catalog.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.unit})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                {t('ADD_ITEM_PRICE')}
              </label>
              <div className="relative">
                <DollarSign className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="number"
                  required
                  placeholder="e.g. 40"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  className="w-full bg-white border border-slate-200 py-1.5 pl-6 pr-2 rounded-lg text-xs font-semibold focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-slate-850 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              {t('ADD_ITEM_BTN')}
            </button>
          </form>

          {/* Active Offerings Grid */}
          <div className="space-y-3">
            {sellerProducts.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8 italic border border-dashed border-slate-200 rounded-xl">
                {t('NO_PRODUCTS')}
              </p>
            ) : (
              <div className="space-y-3">
                {sellerProducts.map((p) => (
                  <div 
                    key={p.productId}
                    className="p-3 border border-slate-100 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white hover:bg-slate-50/50 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={p.isAvailable}
                        onChange={() => handleToggleProductAvailable(p.productId)}
                        className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 accent-emerald-600 shrink-0 cursor-pointer"
                      />
                      <div>
                        <span className={`text-xs font-bold ${p.isAvailable ? 'text-slate-800' : 'text-slate-400 line-through'}`}>
                          {p.name}
                        </span>
                        <p className="text-[10px] text-slate-400">/ {p.unit}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block mb-0.5">Price (₹)</span>
                        <input
                          type="number"
                          value={p.price}
                          onChange={(e) => handleUpdateProductDetail(p.productId, { price: e.target.value })}
                          className="w-20 bg-slate-50 border border-slate-200 py-1 px-2 rounded-lg text-xs font-bold focus:outline-none"
                        />
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block mb-0.5">Stock Block</span>
                        <select
                          value={p.stockStatus}
                          onChange={(e: any) => handleUpdateProductDetail(p.productId, { stockStatus: e.target.value })}
                          className="bg-slate-50 border border-slate-200 py-1 px-2 rounded-lg text-xs font-semibold focus:outline-none"
                        >
                          <option value="In Stock">{t('OFFERINGS_AVAILABLE')}</option>
                          <option value="Low Stock">Low Stock</option>
                          <option value="Out of Stock">{t('OFFERINGS_OUT_OF_STOCK')}</option>
                        </select>
                      </div>

                      <button
                        onClick={() => handleDeleteProduct(p.productId)}
                        className="p-2 border border-slate-100 hover:border-red-200 rounded text-rose-600 hover:bg-red-50 transition-all self-end cursor-pointer"
                        title="Remove product"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Grid: Settings profile. 5 columns */}
        <div className="lg:col-span-5 space-y-6">

          {/* Profile settings card */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 md:p-6 space-y-4">
            <h4 className="font-bold text-sm text-slate-850 flex items-center gap-1.5">
              <Settings className="w-4 h-4 text-emerald-600" />
              {t('LABEL_CART_INFO')}
            </h4>

            <form onSubmit={handleProfileSave} className="space-y-3 text-xs">
              {editSuccess && (
                <p className="p-2.5 border border-emerald-500/30 text-emerald-800 rounded bg-emerald-50 font-bold leading-normal">
                  ✓ Profile settings updated successfully!
                </p>
              )}

              <div className="space-y-1">
                <label className="font-semibold text-slate-600 block">{t('LABEL_NAME')}</label>
                <input
                  type="text"
                  required
                  value={sellerName}
                  onChange={(e) => setSellerName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-2 rounded focus:outline-none focus:bg-white text-slate-800 font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-600 block">{t('LABEL_PHONE')}</label>
                <input
                  type="text"
                  required
                  value={sellerPhone}
                  onChange={(e) => setSellerPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-2 rounded focus:outline-none focus:bg-white text-slate-800 font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-600 block">{t('LABEL_CART_INFO')}</label>
                <input
                  type="text"
                  value={cartInfo}
                  onChange={(e) => setCartInfo(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-2 rounded focus:outline-none focus:bg-white text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-600 block">{t('LABEL_SERVICE_AREA')}</label>
                <input
                  type="text"
                  required
                  value={serviceArea}
                  onChange={(e) => setServiceArea(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-2 rounded focus:outline-none focus:bg-white text-slate-800"
                />
              </div>

              <div className="space-y-2">
                <label className="font-semibold text-slate-600 block">{t('LABEL_PROFILE_PHOTO')}</label>
                <div className="flex items-center gap-4 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  {profilePhoto ? (
                    <img
                      src={profilePhoto}
                      alt="Profile preview"
                      className="w-12 h-12 rounded-full object-cover border-2 border-emerald-500 shrink-0 shadow-sm"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 font-bold text-xs shrink-0">
                      No Photo
                    </div>
                  )}
                  <div className="flex-1 space-y-1.5">
                    <input
                      type="file"
                      accept="image/*"
                      id="profile-photo-upload"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            if (typeof reader.result === 'string') {
                              setProfilePhoto(reader.result);
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                    />
                    <label
                      htmlFor="profile-photo-upload"
                      className="cursor-pointer inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition-all text-white text-[11px] font-bold rounded-lg shadow-sm"
                    >
                      Choose from Gallery
                    </label>
                    <p className="text-[9px] text-slate-400 leading-none">JPEG, PNG, WebP supported</p>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={editLoading}
                className="w-full py-2 bg-slate-805 hover:bg-slate-900 bg-slate-850 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                {editLoading ? 'Saving...' : 'Save Profile Details'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
