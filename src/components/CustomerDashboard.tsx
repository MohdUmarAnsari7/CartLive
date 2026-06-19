import React, { useEffect, useState, useRef } from 'react';
import LeafletMap from './LeafletMap';
import { 
  Search, 
  MapPin, 
  Heart, 
  Phone, 
  Star, 
  RefreshCw, 
  ListFilter, 
  Sparkles, 
  Bell, 
  Calendar, 
  MessageSquare, 
  ChevronRight, 
  Compass, 
  X
} from 'lucide-react';
import { Seller, Product, Review } from '../types';
import { useI18n } from '../i18n/I18nContext';

interface CustomerDashboardProps {
  apiKey: string;
  onNavigateToAuth: () => void;
  systemRadius: number;
}

export default function CustomerDashboard({ apiKey, onNavigateToAuth, systemRadius }: CustomerDashboardProps) {
  const { t } = useI18n();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'All' | 'Vegetables' | 'Fruits'>('All');
  const [selectedRadius, setSelectedRadius] = useState<number>(systemRadius);
  const [sortBy, setSortBy] = useState<'distance' | 'price' | 'rating'>('distance');
  
  // Geolocation states
  const [custLocation, setCustLocation] = useState<{ lat: number; lng: number }>({ lat: 12.9716, lng: 77.5946 }); // Default Bangalore Center
  const [fetchingGeo, setFetchingGeo] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  // Address search geocoder states
  const [locQuery, setLocQuery] = useState('');
  const [locSearchLoading, setLocSearchLoading] = useState(false);
  const [locSearchError, setLocSearchError] = useState<string | null>(null);

  // Interaction states
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [toastNotification, setToastNotification] = useState<{ title: string; body: string } | null>(null);
  const [recentVisitIds, setRecentVisitIds] = useState<string[]>([]);

  // Review state
  const [reviewName, setReviewName] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);

  // AI Summary States
  const [aiSummary, setAiSummary] = useState('');
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);

  const LOCATION_PRESETS = [
    { name: '📍 Indiranagar (Carts Seed Block)', lat: 12.9784, lng: 77.6408 },
    { name: 'Bangalore Center', lat: 12.9716, lng: 77.5946 },
    { name: 'Delhi', lat: 28.6139, lng: 77.2090 },
    { name: 'Mumbai', lat: 19.0760, lng: 72.8777 }
  ];

  const handleLocationSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locQuery.trim()) return;
    setLocSearchLoading(true);
    setLocSearchError(null);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locQuery.trim())}&limit=1`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'CartLiveMobileVegFruitCartFinder/1.0'
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          const result = data[0];
          setCustLocation({
            lat: parseFloat(result.lat),
            lng: parseFloat(result.lon)
          });
          setLocQuery('');
          setGeoError(null);
        } else {
          setLocSearchError('No matching location found.');
        }
      } else {
        setLocSearchError('Failed to verify searched location.');
      }
    } catch (err) {
      console.warn(err);
      setLocSearchError('Location search is currently offline.');
    } finally {
      setLocSearchLoading(false);
    }
  };

  const handleDeviceLocate = () => {
    setFetchingGeo(true);
    setGeoError(null);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCustLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setFetchingGeo(false);
          setGeoError(null);
        },
        (error) => {
          console.warn('getCurrentPosition error:', error);
          setFetchingGeo(false);
          setGeoError('GPS block: Check permission parameters under address bar.');
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      setFetchingGeo(false);
      setGeoError('GPS is not supported by your browser.');
    }
  };

  // Fetch sellers from database
  const getSellersList = async () => {
    try {
      const res = await fetch('/api/sellers');
      if (res.ok) {
        const data = await res.json();
        const validSellers = data.filter((s: any) => !s.suspended);
        setSellers(validSellers);
      }
    } catch (e) {
      console.error('Error fetching sellers', e);
    }
  };

  useEffect(() => {
    getSellersList();

    const savedFavs = localStorage.getItem('freshcart_favorites');
    if (savedFavs) {
      setFavorites(JSON.parse(savedFavs));
    }

    const savedVisits = localStorage.getItem('freshcart_visits');
    if (savedVisits) {
      setRecentVisitIds(JSON.parse(savedVisits));
    }

    // Fetch approximate location using IP-based Geolocation first
    const fetchIPLocation = async () => {
      try {
        const response = await fetch('https://ipapi.co/json/');
        if (response.ok) {
          const data = await response.json();
          if (data && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
            setCustLocation({ lat: data.latitude, lng: data.longitude });
          }
        }
      } catch (err) {
        console.warn('IP-based geolocation fallback failed:', err);
      }
    };
    fetchIPLocation();

    let customerWatchId: number | null = null;
    setFetchingGeo(true);
    if (navigator.geolocation) {
      customerWatchId = navigator.geolocation.watchPosition(
        (position) => {
          const userCoords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setCustLocation(userCoords);
          setFetchingGeo(false);
          setGeoError(null);
        },
        (error) => {
          console.warn('Customer Geolocation tracking error:', error);
          setFetchingGeo(false);
          if (error.code === error.PERMISSION_DENIED) {
            setGeoError('GPS block: permission denied by iframe boundary.');
          } else {
            setGeoError('GPS block: system timeout. Adjust manually!');
          }
        },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
      );
    } else {
      setFetchingGeo(false);
    }

    const eventSource = new EventSource('/api/realtime/stream');
    
    eventSource.onmessage = (event) => {
      try {
        const { type, data } = JSON.parse(event.data);
        if (type === 'seller_location_updated') {
          setSellers((prev) =>
            prev.map((s) => (s.id === data.id ? { ...s, location: data.location, lastLocationUpdate: data.lastLocationUpdate } : s))
          );
        } else if (type === 'seller_status_changed') {
          if (data.suspended) {
            setSellers((prev) => prev.filter((s) => s.id !== data.id));
          } else {
            setSellers((prev) => {
              const exists = prev.some((s) => s.id === data.id);
              if (exists) {
                return prev.map((s) => (s.id === data.id ? data : s));
              } else {
                return [...prev, data];
              }
            });
          }
        } else if (type === 'seller_profile_updated') {
          setSellers((prev) => prev.map((s) => (s.id === data.id ? { ...s, ...data } : s)));
        } else if (type === 'notification_pushed') {
          let isFav = false;
          if (data.sellerId) {
            const saved = localStorage.getItem('freshcart_favorites');
            const favIds = saved ? JSON.parse(saved) : [];
            isFav = favIds.includes(data.sellerId);
          }

          if (isFav || data.type === 'announcement' || !data.sellerId) {
            setToastNotification({ title: data.title, body: data.body });
            setTimeout(() => {
              setToastNotification(null);
            }, 12000);
          }
        }
      } catch (err) {
        console.error('SSE Error', err);
      }
    };

    return () => {
      eventSource.close();
      if (customerWatchId !== null) {
        navigator.geolocation.clearWatch(customerWatchId);
      }
    };
  }, []);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; 
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(2));
  };

  const toggleFavorite = (sellerId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    let updated: string[];
    if (favorites.includes(sellerId)) {
      updated = favorites.filter((id) => id !== sellerId);
    } else {
      updated = [...favorites, sellerId];
    }
    setFavorites(updated);
    localStorage.setItem('freshcart_favorites', JSON.stringify(updated));
  };

  const handleSellerSelect = async (seller: Seller) => {
    setSelectedSeller(seller);
    setAiSummary('');
    
    let visited = [...recentVisitIds];
    if (!visited.includes(seller.id)) {
      visited = [seller.id, ...visited].slice(0, 6);
      setRecentVisitIds(visited);
      localStorage.setItem('freshcart_visits', JSON.stringify(visited));
    }

    try {
      fetch(`/api/sellers/${seller.id}`);
    } catch (e) {
      console.warn(e);
    }
  };

  const handleDialSeller = async (sellerId: string, phone: string) => {
    try {
      await fetch(`/api/sellers/${sellerId}/interact`, { method: 'POST' });
    } catch (e) {
      console.warn(e);
    }
    window.location.href = `tel:${phone}`;
  };

  const activeSellersWithDist = sellers
    .filter((s) => s.active && s.location)
    .map((s) => {
      const dist = calculateDistance(
        custLocation.lat,
        custLocation.lng,
        s.location!.lat,
        s.location!.lng
      );
      return { ...s, distance: dist };
    });

  const filteredSellers = activeSellersWithDist.filter((s) => {
    if (s.distance > selectedRadius) return false;

    const matchQuery = searchQuery.trim().toLowerCase();
    if (matchQuery) {
      const matchesSellerName = s.name.toLowerCase().includes(matchQuery);
      const matchesArea = s.serviceArea.toLowerCase().includes(matchQuery);
      const matchesProducts = s.products.some(
        (p) => p.isAvailable && p.name.toLowerCase().includes(matchQuery)
      );
      if (!matchesSellerName && !matchesArea && !matchesProducts) {
         return false;
      }
    }

    if (selectedCategory !== 'All') {
      const hasCatItem = s.products.some(
        (p) => p.isAvailable && p.category === (selectedCategory === 'Vegetables' ? 'Vegetable' : 'Fruit')
      );
      if (!hasCatItem) return false;
    }

    return true;
  });

  const sortedSellers = [...filteredSellers].sort((a, b) => {
    if (sortBy === 'distance') {
      return a.distance - b.distance;
    }
    if (sortBy === 'rating') {
      return b.avgRating - a.avgRating;
    }
    if (sortBy === 'price') {
      const minPriceA = a.products.length > 0 ? Math.min(...a.products.map((p) => p.price)) : 9999;
      const minPriceB = b.products.length > 0 ? Math.min(...b.products.map((p) => p.price)) : 9999;
      return minPriceA - minPriceB;
    }
    return 0;
  });

  const favoriteSellersList = sellers.filter((s) => favorites.includes(s.id));

  return (
    <div className="w-full min-h-[80vh] bg-slate-50/50">
      {/* Alert toast notification */}
      {toastNotification && (
        <div className="fixed top-20 right-4 left-4 md:left-auto md:w-96 z-50 bg-white/95 backdrop-blur-md text-slate-800 shadow-2xl rounded-xl p-4 border border-emerald-500 flex items-start gap-3 transition-all duration-500 animate-bounce">
          <div className="p-2 bg-emerald-100 text-emerald-600 rounded-full">
            <Bell className="w-5 h-5 animate-swing" />
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-xs text-emerald-800 flex items-center justify-between">
              <span>🔔 {t('FOOTER_NOTIF')}</span>
              <button onClick={() => setToastNotification(null)}>
                <X className="w-4 h-4 text-slate-400 hover:text-slate-600 cursor-pointer" />
              </button>
            </h4>
            <p className="font-bold text-xs mt-1 text-slate-800">{toastNotification.title}</p>
            <p className="text-xs text-slate-600 leading-normal mt-1">{toastNotification.body}</p>
          </div>
        </div>
      )}

      {/* Main stacked PWA Dashboard layout */}
      <div className="max-w-3xl mx-auto px-4 py-4 space-y-4 h-full">
        {/* Real Interactive Map Stage (First Sight!) */}
        <div className="bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden relative">
          <div className="bg-slate-50 p-3 px-4 text-xs font-semibold border-b border-slate-100 flex items-center justify-between text-slate-600">
            <span className="inline-flex items-center gap-1.5 font-bold">
              <Compass className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
              {t('LIVE_RADAR')}
            </span>
            <div className="flex items-center gap-2">
              {geoError && (
                <span className="hidden sm:inline text-[9px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 font-bold">
                  ⚠️ GPS Blocked
                </span>
              )}
              <button 
                onClick={getSellersList} 
                className="px-2.5 py-1 bg-white border border-slate-200 rounded-md text-[10px] sm:text-xs inline-flex items-center gap-1 text-slate-700 hover:bg-slate-50 font-bold active:scale-95 transition-all shadow-sm cursor-pointer"
              >
                <RefreshCw className="w-3 h-3 text-emerald-655" />
                Sync
              </button>
            </div>
          </div>

          {/* User Guide Accent Overlay */}
          <div className="bg-emerald-50/70 p-2.5 px-4 text-[11px] font-medium text-emerald-800 border-b border-slate-100 flex items-center justify-between">
            <span>📍 <strong>Tip:</strong> Tap anywhere on the map below or use coordinates to set your current location manually!</span>
            <span className="hidden md:inline text-[9px] bg-emerald-600/10 text-emerald-700 px-1.5 py-0.5 rounded font-bold font-mono">MAP CLICKS ENABLED</span>
          </div>

          <div style={{ height: '340px', width: '100%', position: 'relative' }}>
            <LeafletMap
              center={custLocation}
              customerLocation={custLocation}
              sellers={sortedSellers}
              favorites={favorites}
              onSellerSelect={handleSellerSelect}
              selectedSellerId={selectedSeller?.id}
              onMapClick={(coords) => {
                setCustLocation(coords);
                setGeoError(null);
              }}
            />
          </div>

          {/* Advanced Manual Location Search Block */}
          <div className="p-3 bg-slate-50 border-t border-slate-100 space-y-2.5">
            <form onSubmit={handleLocationSearch} className="flex gap-2">
              <input
                type="text"
                placeholder="🔍 Search address or city (e.g., Indiranagar, Mumbai, Sector 1 Delhi...)"
                value={locQuery}
                onChange={(e) => setLocQuery(e.target.value)}
                className="flex-grow bg-white border border-slate-200 px-3 py-1.5 text-xs rounded-lg focus:outline-none focus:border-emerald-500 font-medium text-slate-800 shadow-inner"
              />
              <button
                type="submit"
                disabled={locSearchLoading}
                className="px-3.5 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 active:scale-95 transition-all shadow-sm shrink-0 cursor-pointer disabled:opacity-60"
              >
                {locSearchLoading ? 'Searching...' : 'Go'}
              </button>
            </form>
            {locSearchError && (
              <p className="text-[10px] text-amber-600 font-bold bg-amber-50 p-1 px-2 rounded border border-amber-100">
                ⚠️ {locSearchError}
              </p>
            )}

            {/* Presets and Device Locate Control Row */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/50">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Presets:</span>
                {LOCATION_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => {
                      setCustLocation({ lat: preset.lat, lng: preset.lng });
                      setGeoError(null);
                    }}
                    className={`px-2 py-0.5 border rounded-full text-[10px] font-bold cursor-pointer transition-all ${
                      Math.abs(custLocation.lat - preset.lat) < 0.005 && Math.abs(custLocation.lng - preset.lng) < 0.005
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200 shadow-sm'
                    }`}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleDeviceLocate}
                className="px-2 py-0.5 border border-dashed border-slate-300 hover:border-emerald-500 rounded text-[10px] font-bold text-slate-600 hover:text-emerald-700 bg-white inline-flex items-center gap-1 cursor-pointer shadow-xs"
              >
                🔄 Refresh GPS
              </button>
            </div>
          </div>
        </div>

        {/* Primary Controls Card (Directly below Map) */}
        <div className="bg-white rounded-2xl shadow-md p-4 sm:p-5 border border-slate-100 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
            {/* Search Radius Slider */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-700 text-xs sm:text-sm flex items-center gap-1">
                  {t('RAD_LABEL')}: <span className="text-emerald-700 font-extrabold text-sm sm:text-base">{selectedRadius} Km</span>
                </label>
              </div>
              <input
                type="range"
                min="2"
                max="15"
                step="1"
                value={selectedRadius}
                onChange={(e) => setSelectedRadius(Number(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer h-2 bg-slate-100 rounded-lg appearance-none"
              />
              <div className="flex justify-between text-[9px] text-slate-400 font-medium px-1 mt-0.5">
                <span>2 Km</span>
                <span>5 Km</span>
                <span>10 Km</span>
                <span>15 Km</span>
              </div>
            </div>

            {/* Coordinates Badge */}
            <div className="shrink-0 text-left sm:text-right">
              {fetchingGeo ? (
                <span className="text-[10px] text-slate-505 text-emerald-750 animate-pulse bg-emerald-50/50 p-2 rounded block border border-dashed border-emerald-200">
                  ⚡ Scanning auto-orbit...
                </span>
              ) : geoError ? (
                <div className="text-[10px] text-right">
                  <span className="bg-amber-50 p-2 rounded text-amber-700 block border border-amber-200 font-semibold leading-tight">
                    📌 Using Manual Coordinates
                  </span>
                  <span className="text-[8px] text-slate-400 font-mono block mt-1">
                    {custLocation.lat.toFixed(4)}, {custLocation.lng.toFixed(4)}
                  </span>
                </div>
              ) : (
                <span className="text-[10px] bg-emerald-50/50 p-2 rounded text-emerald-800 inline-flex items-center gap-1 border border-emerald-100/50 font-mono shadow-sm">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  {custLocation.lat.toFixed(4)}, {custLocation.lng.toFixed(4)}
                </span>
              )}
            </div>
          </div>

          {/* Search, Sort and Filters block */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
            <div className="relative sm:col-span-2">
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder={t('SEARCH_PLACEHOLDER')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50/80 border border-slate-200 pl-9 pr-4 py-2.5 rounded-lg text-xs sm:text-sm focus:border-emerald-500 focus:outline-none focus:bg-white transition-all shadow-inner font-medium text-slate-800"
              />
            </div>

            <div>
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 py-2.5 px-3 rounded-lg focus:outline-none focus:border-emerald-500 font-bold text-xs sm:text-sm text-slate-700"
              >
                <option value="distance">{t('SORT_DIST')}</option>
                <option value="rating">{t('SORT_RATING')}</option>
                <option value="price">{t('SORT_PRICE')}</option>
              </select>
            </div>
          </div>

          {/* Dynamic Category Pill Selection */}
          <div className="flex gap-1.5 pt-1">
            {(['All', 'Vegetables', 'Fruits'] as const).map((cat) => {
              const displayLabel = cat === 'All' ? t('ALL_CAT') : cat === 'Vegetables' ? t('VEG_CAT') : t('FRU_CAT');
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`flex-1 py-1.5 px-3 rounded-full text-xs font-semibold select-none border transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm font-bold'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-650'
                  }`}
                >
                  {displayLabel}
                </button>
              );
            })}
          </div>
        </div>

        {/* Saved Favorites quick-access sections */}
        {favoriteSellersList.length > 0 && (
          <div className="bg-white rounded-2xl shadow-md p-4 border border-slate-100 space-y-3">
            <h4 className="font-bold text-[10px] text-pink-655 tracking-wider uppercase flex items-center gap-1">
              ❤️ {t('FAV_ADD')} ({favoriteSellersList.length})
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {favoriteSellersList.map((s) => (
                <div
                  key={s.id}
                  onClick={() => handleSellerSelect(s)}
                  className={`p-2.5 border rounded-xl text-center cursor-pointer space-y-1.5 bg-pink-50/5 transition-all hover:bg-pink-50/20 ${
                    selectedSeller?.id === s.id
                      ? 'border-emerald-500 bg-emerald-50/10'
                      : 'border-slate-100 hover:border-pink-300'
                  }`}
                >
                  {s.profilePhoto ? (
                    <img src={s.profilePhoto} alt="" className="w-10 h-10 rounded-full object-cover mx-auto border-2 border-emerald-50" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-emerald-100 mx-auto flex items-center justify-center font-bold text-emerald-700 text-xs">
                      {s.name.substring(0,2)}
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-bold text-slate-700 truncate">{s.name}</p>
                    <p className="text-[9px] text-slate-400 font-medium">{s.active ? t('ACTIVE_ONLINE') : t('DEPARTED')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Selected Seller Detailed Page Module */}
        {selectedSeller ? (
          <div className="bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden">
            <div className="bg-slate-50/50 p-4 border-b border-slate-100 flex items-start gap-4">
              {selectedSeller.profilePhoto ? (
                <img 
                  src={selectedSeller.profilePhoto} 
                  alt="" 
                  className="w-16 h-16 rounded-full object-cover border-2 border-emerald-500 shadow-sm shrink-0" 
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold border-2 border-emerald-500 shadow-sm shrink-0">
                  {selectedSeller.name.substring(0, 2)}
                </div>
              )}
              <div className="flex-1 space-y-1">
                <div className="flex items-start justify-between">
                  <h3 className="font-bold text-base text-slate-850 flex items-center gap-1.5">
                    {selectedSeller.name}
                    <button 
                      onClick={(e) => { e.stopPropagation(); toggleFavorite(selectedSeller.id); }}
                      className="p-1 rounded-full text-slate-300 hover:text-pink-500 transition-colors cursor-pointer"
                    >
                      <Heart 
                        className={`w-5 h-5 ${favorites.includes(selectedSeller.id) ? 'fill-pink-500 text-pink-500' : ''}`}
                      />
                    </button>
                  </h3>
                  <span className="text-xs px-2.5 py-1 bg-emerald-100 rounded-full text-emerald-700 font-bold">
                    {t('ACTIVE_ONLINE')}
                  </span>
                </div>
                
                <p className="text-xs text-slate-500 leading-normal">{selectedSeller.cartInfo}</p>
                
                <div className="flex flex-wrap gap-2 text-[11px] pt-1">
                  <span className="text-slate-600 font-medium">📍 {t('OPERATING') || 'Operating'}: <strong className="text-slate-800">{selectedSeller.serviceArea}</strong></span>
                  <span className="text-slate-400">|</span>
                  <span className="text-slate-550 font-medium font-mono">Updated: {selectedSeller.lastLocationUpdate ? new Date(selectedSeller.lastLocationUpdate).toLocaleTimeString() : 'Recently'}</span>
                </div>
              </div>
            </div>

            {/* Main Catalog Lists Offered */}
            <div className="p-4 sm:p-5 space-y-5">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs sm:text-sm text-slate-800 uppercase tracking-tight">{t('ITEMS_OFFERED')}</h4>
                <button 
                  onClick={() => handleDialSeller(selectedSeller.id, selectedSeller.phone)}
                  className="py-1.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-xs font-semibold inline-flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                >
                  <Phone className="w-3.5 h-3.5 fill-white" />
                  Call {selectedSeller.phone}
                </button>
              </div>

              {selectedSeller.products.filter(p => p.isAvailable).length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center italic bg-slate-50 rounded">
                  {t('NO_PRODUCTS')}
                </p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {selectedSeller.products.filter(p => p.isAvailable).map((item) => (
                    <div 
                      key={item.productId}
                      className="p-3 border border-slate-100 rounded-xl hover:shadow-md transition-shadow relative overflow-hidden bg-white"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-slate-800">{item.name}</span>
                      </div>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="font-extrabold text-emerald-600 text-sm">₹{item.price}</span>
                        <span className="text-[10px] text-slate-450">/ {item.unit}</span>
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-50 text-[10px]">
                        <span className={`px-1 py-0.5 rounded font-medium ${
                          item.stockStatus === 'In Stock' 
                            ? 'bg-emerald-50 text-emerald-600'
                            : item.stockStatus === 'Low Stock'
                            ? 'bg-amber-50 text-amber-600'
                            : 'bg-red-50 text-red-600'
                        }`}>
                          {item.stockStatus}
                        </span>
                        <span className="text-slate-400 text-[9px] font-mono">
                          {new Date(item.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          </div>
        ) : (
          <div className="h-56 bg-white border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2 shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-emerald-500 animate-bounce">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
            </svg>
            <h4 className="font-semibold text-slate-650 text-sm">{t('NO_SELLERS_IN_RANGE')}</h4>
            <p className="text-xs max-w-sm leading-normal text-slate-400">
              {t('VERIFY_LOCATION')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
