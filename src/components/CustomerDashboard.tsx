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

interface CustomerDashboardProps {
  apiKey: string;
  onNavigateToAuth: () => void;
  systemRadius: number;
}

export default function CustomerDashboard({ apiKey, onNavigateToAuth, systemRadius }: CustomerDashboardProps) {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'All' | 'Vegetables' | 'Fruits'>('All');
  const [selectedRadius, setSelectedRadius] = useState<number>(systemRadius);
  const [sortBy, setSortBy] = useState<'distance' | 'price' | 'rating'>('distance');
  
  // Geolocation states
  const [custLocation, setCustLocation] = useState<{ lat: number; lng: number }>({ lat: 12.9716, lng: 77.5946 }); // Default Bangalore Center
  const [fetchingGeo, setFetchingGeo] = useState(false);

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

  // Fetch initial sellers from database
  const getSellersList = async () => {
    try {
      const res = await fetch('/api/sellers');
      if (res.ok) {
        const data = await res.json();
        // Skip suspended sellers
        const validSellers = data.filter((s: any) => !s.suspended);
        setSellers(validSellers);
      }
    } catch (e) {
      console.error('Error fetching sellers', e);
    }
  };

  useEffect(() => {
    getSellersList();

    // Check saved favorites and visited sellers from browser localStorage
    const savedFavs = localStorage.getItem('freshcart_favorites');
    if (savedFavs) {
      setFavorites(JSON.parse(savedFavs));
    }

    const savedVisits = localStorage.getItem('freshcart_visits');
    if (savedVisits) {
      setRecentVisitIds(JSON.parse(savedVisits));
    }

    // Capture User Geo-Location
    setFetchingGeo(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userCoords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setCustLocation(userCoords);
          setFetchingGeo(false);
        },
        (error) => {
          console.warn('Geolocation access rejected by user, falling back to default center.', error);
          setFetchingGeo(false);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      setFetchingGeo(false);
    }

    // Connect to SSE stream for Real-time location pushes & notifications (translates push notification request)
    const eventSource = new EventSource('/api/realtime/stream');
    
    eventSource.onmessage = (event) => {
      try {
        const { type, data } = JSON.parse(event.data);
        console.log('SSE message received:', type, data);

        if (type === 'seller_location_updated') {
          setSellers((prev) =>
            prev.map((s) => (s.id === data.id ? { ...s, location: data.location, lastLocationUpdate: data.lastLocationUpdate } : s))
          );
        } else if (type === 'seller_status_changed') {
          // If deactivated or suspended, remove or update status
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
          // Check if this push is matching favorite list
          let isFav = false;
          if (data.sellerId) {
            const saved = localStorage.getItem('freshcart_favorites');
            const favIds = saved ? JSON.parse(saved) : [];
            isFav = favIds.includes(data.sellerId);
          }

          // Trigger screen Toast if favorite, or general announcements
          if (isFav || data.type === 'announcement' || !data.sellerId) {
            setToastNotification({ title: data.title, body: data.body });
            // Alert expires in 12s
            setTimeout(() => {
              setToastNotification(null);
            }, 12000);
          }
        }
      } catch (err) {
        console.error('Error parsing SSE data', err);
      }
    };

    return () => {
      eventSource.close();
    };
  }, []);

  // Calculate distance between two points on sphere (Haversine formula in Km)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth Radius in Km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(2));
  };

  // Toggle favorite list helper
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

  // Handle seller marker/card click details helper
  const handleSellerSelect = async (seller: Seller) => {
    setSelectedSeller(seller);
    setAiSummary(''); // Clear previous summary
    
    // Save to user visits
    let visited = [...recentVisitIds];
    if (!visited.includes(seller.id)) {
      visited = [seller.id, ...visited].slice(0, 6); // Max 6 stored
      setRecentVisitIds(visited);
      localStorage.setItem('freshcart_visits', JSON.stringify(visited));
    }

    // Record interaction visit event on backend
    try {
      fetch(`/api/sellers/${seller.id}`);
    } catch (e) {
      console.warn(e);
    }
  };

  // Trigger outbound call dialer helper
  const handleDialSeller = async (sellerId: string, phone: string) => {
    try {
      await fetch(`/api/sellers/${sellerId}/interact`, { method: 'POST' });
    } catch (e) {
      console.warn(e);
    }
    window.location.href = `tel:${phone}`;
  };

  // AI Sentiment reviews summary
  const getAISentimentSummary = async (reviewsList: Review[]) => {
    if (!reviewsList || reviewsList.length === 0) return;
    setAiSummaryLoading(true);
    try {
      const res = await fetch('/api/ai/summarize-reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviews: reviewsList })
      });
      const data = await res.json();
      setAiSummary(data.summary || 'Summary could not be completed.');
    } catch (err) {
      setAiSummary('Fresh reviews summarize network error.');
    } finally {
      setAiSummaryLoading(false);
    }
  };

  // Submit Review form
  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSeller || !reviewName.trim() || !reviewComment.trim()) return;

    setReviewLoading(true);
    try {
      const res = await fetch(`/api/sellers/${selectedSeller.id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: reviewName,
          rating: reviewRating,
          comment: reviewComment
        })
      });
      if (res.ok) {
        const rec = await res.json();
        // Update local state seller reviews list immediately
        const freshReview = rec.review;
        const updatedSeller = {
          ...selectedSeller,
          reviews: [...(selectedSeller.reviews || []), freshReview],
          avgRating: rec.avgRating,
          ratingsCount: rec.ratingsCount
        };
        setSelectedSeller(updatedSeller);
        
        // Update general items state list too
        setSellers((prev) => prev.map((s) => (s.id === updatedSeller.id ? updatedSeller : s)));

        // Reset review fields
        setReviewName('');
        setReviewComment('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setReviewLoading(false);
    }
  };

  // Active Sellers within Configured Distance Filters
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

  // Filter based on radius, search queries, and selected category
  const filteredSellers = activeSellersWithDist.filter((s) => {
    // 1. Distance Radius range
    if (s.distance > selectedRadius) return false;

    // 2. Search logic (Fuzzy matches seller name, cart oper area, or specific vegetable/fruit names in their catalog)
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

    // 3. Category toggles (Must offer at least one item matching Vegetable/Fruit category type)
    if (selectedCategory !== 'All') {
      const hasCatItem = s.products.some(
        (p) => p.isAvailable && p.category === (selectedCategory === 'Vegetables' ? 'Vegetable' : 'Fruit')
      );
      if (!hasCatItem) return false;
    }

    return true;
  });

  // Sorting
  const sortedSellers = [...filteredSellers].sort((a, b) => {
    if (sortBy === 'distance') {
      return a.distance - b.distance;
    }
    if (sortBy === 'rating') {
      return b.avgRating - a.avgRating;
    }
    if (sortBy === 'price') {
      // Find minimum item price offered in current search context
      const minPriceA = a.products.length > 0 ? Math.min(...a.products.map((p) => p.price)) : 9999;
      const minPriceB = b.products.length > 0 ? Math.min(...b.products.map((p) => p.price)) : 9999;
      return minPriceA - minPriceB;
    }
    return 0;
  });

  // Find popular vegetable offerings based on current listings to show quick filters
  const favoriteSellersList = sellers.filter((s) => favorites.includes(s.id));
  const recentSellersList = sellers.filter((s) => recentVisitIds.includes(s.id));

  // Custom marker component rendering helper
  const renderCustomHtmlMarker = (seller: Seller) => {
    const isFav = favorites.includes(seller.id);
    return (
      <div 
        className="relative group cursor-pointer flex flex-col items-center"
        style={{ width: '46px', height: '46px' }}
      >
        {/* Profile face or fallback symbol */}
        <div className="w-9 h-9 rounded-full border-2 border-emerald-500 bg-white shadow-md overflow-hidden flex items-center justify-center transition-all group-hover:scale-110 active:scale-95">
          {seller.profilePhoto ? (
            <img src={seller.profilePhoto} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs">
              {seller.name.substring(0,2)}
            </div>
          )}
        </div>
        {/* Mini status indicator flag */}
        <div className="absolute -bottom-1 bg-emerald-600 text-white font-mono text-[9px] px-1 rounded-full border border-white">
          ₹{seller.products.length > 0 ? Math.min(...seller.products.map(p => p.price)) : '—'}
        </div>
        {isFav && (
          <div className="absolute -top-1 -right-1 bg-pink-500 text-white rounded-full p-0.5 border border-white shadow">
            <Heart className="w-2 h-2 fill-white text-white" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full min-h-[90vh] bg-slate-50/50">
      {/* Alert toast simulation of FCM push communication */}
      {toastNotification && (
        <div className="fixed top-20 right-4 left-4 md:left-auto md:w-96 z-50 bg-white/95 backdrop-blur-md text-slate-800 shadow-2xl rounded-xl p-4 border border-emerald-500 flex items-start gap-3 transition-all duration-500 animate-bounce">
          <div className="p-2 bg-emerald-100 text-emerald-600 rounded-full">
            <Bell className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-sm text-emerald-800 flex items-center justify-between">
              <span>🔔 Realtime Notification</span>
              <button onClick={() => setToastNotification(null)}>
                <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
              </button>
            </h4>
            <p className="font-bold text-xs mt-0.5 text-slate-800">{toastNotification.title}</p>
            <p className="text-xs text-slate-600 leading-normal mt-1">{toastNotification.body}</p>
          </div>
        </div>
      )}

      {/* Main Single-column stacked PWA Layout */}
      <div className="max-w-3xl mx-auto px-4 py-4 space-y-4 h-full">

        {/* Real Interactive Map Stage (First Sight!) */}
        <div className="bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden relative">
          <div className="bg-slate-50 p-3 px-4 text-xs font-semibold border-b border-slate-100 flex items-center justify-between text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
              Find Neighborhood Carts Live Map
            </span>
            <button 
              onClick={getSellersList} 
              className="px-2 py-1 bg-white border border-slate-200 rounded-md text-[10px] sm:text-xs inline-flex items-center gap-1 text-slate-600 hover:bg-slate-50 font-bold active:scale-95 transition-all shadow-sm"
              title="Refresh Database"
            >
              <RefreshCw className="w-3 h-3 text-emerald-600 font-bold" />
              Sync Carts
            </button>
          </div>

          <div style={{ height: '340px', width: '100%', position: 'relative' }}>
            <LeafletMap
              center={custLocation}
              customerLocation={custLocation}
              sellers={sortedSellers}
              favorites={favorites}
              onSellerSelect={handleSellerSelect}
              selectedSellerId={selectedSeller?.id}
            />
          </div>
        </div>

        {/* Primary Controls Card (Directly below Map) */}
        <div className="bg-white rounded-2xl shadow-md p-4 sm:p-5 border border-slate-100 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
            {/* Search Radius Bar */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-700 text-xs sm:text-sm flex items-center gap-1">
                  🌐 Search Radius (क्षेत्र दूरी): <span className="text-emerald-700 font-extrabold text-sm sm:text-base">{selectedRadius} Km</span>
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

            {/* Location coordinates list text */}
            <div className="shrink-0 text-left sm:text-right">
              {fetchingGeo ? (
                <span className="text-[11px] text-slate-500 animate-pulse bg-slate-50 p-2 rounded block border border-dashed border-slate-200">
                  ⚡ Auto-detecting coordinates...
                </span>
              ) : (
                <span className="text-[11px] bg-emerald-50/50 p-2 rounded text-emerald-800 inline-flex items-center gap-1 border border-emerald-100/50">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  Center: {custLocation.lat.toFixed(4)}, {custLocation.lng.toFixed(4)}
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
                placeholder="Search tomato, onions, mango, Ramesh..."
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
                <option value="distance">Nearest Distance</option>
                <option value="rating">Top Rated ⭐</option>
                <option value="price">Lowest Price (₹)</option>
              </select>
            </div>
          </div>

          {/* Dynamic Category Pill Selection */}
          <div className="flex gap-1.5 pt-1">
            {(['All', 'Vegetables', 'Fruits'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`flex-1 py-1.5 px-3 rounded-full text-xs font-semibold select-none border transition-all ${
                  selectedCategory === cat
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm font-bold'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-650'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Saved Favorites quick-access sections */}
        {favoriteSellersList.length > 0 && (
          <div className="bg-white rounded-2xl shadow-md p-4 border border-slate-100 space-y-3">
            <h4 className="font-bold text-[10px] text-slate-400 tracking-wider uppercase flex items-center gap-1">
              ❤️ Saved Favorites ({favoriteSellersList.length})
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
                  <img src={s.profilePhoto} alt="" className="w-10 h-10 rounded-full object-cover mx-auto border-2 border-emerald-50" />
                  <div>
                    <p className="text-xs font-bold text-slate-700 truncate">{s.name}</p>
                    <p className="text-[9px] text-slate-400 font-medium">{s.active ? '🟢 Active' : '🔴 Off duty'}</p>
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
              <img 
                src={selectedSeller.profilePhoto} 
                alt="" 
                className="w-16 h-16 rounded-full object-cover border-2 border-emerald-500 shadow-sm shrink-0" 
              />
              <div className="flex-1 space-y-1">
                <div className="flex items-start justify-between">
                  <h3 className="font-bold text-base text-slate-850 flex items-center gap-1.5">
                    {selectedSeller.name}
                    <button 
                      onClick={(e) => { e.stopPropagation(); toggleFavorite(selectedSeller.id); }}
                      className="p-1 rounded-full text-slate-300 hover:text-pink-500 transition-colors"
                    >
                      <Heart 
                        className={`w-5 h-5 ${favorites.includes(selectedSeller.id) ? 'fill-pink-500 text-pink-500' : ''}`}
                      />
                    </button>
                  </h3>
                  <span className="text-xs px-2.5 py-1 bg-emerald-100 rounded-full text-emerald-700 font-bold">
                    🟢 Online
                  </span>
                </div>
                
                <p className="text-xs text-slate-500 leading-normal">{selectedSeller.cartInfo}</p>
                
                <div className="flex flex-wrap gap-2 text-xs pt-1">
                  <span className="text-slate-600 font-medium">📍 Operating: <strong className="text-slate-800">{selectedSeller.serviceArea}</strong></span>
                  <span className="text-slate-400">|</span>
                  <span className="text-slate-500 font-medium font-mono text-[11px]">Updated {selectedSeller.lastLocationUpdate ? new Date(selectedSeller.lastLocationUpdate).toLocaleTimeString() : 'Recently'}</span>
                </div>
              </div>
            </div>

            {/* Main Catalog Lists Offered */}
            <div className="p-4 sm:p-5 space-y-5">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs sm:text-sm text-slate-800 uppercase tracking-tight">Active Offerings Catalog</h4>
                <button 
                  onClick={() => handleDialSeller(selectedSeller.id, selectedSeller.phone)}
                  className="py-1.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-xs font-semibold inline-flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
                >
                  <Phone className="w-3.5 h-3.5 fill-white" />
                  Call {selectedSeller.phone}
                </button>
              </div>

              {selectedSeller.products.filter(p => p.isAvailable).length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center italic bg-slate-50 rounded">
                  Daily inventory catalog is currently empty.
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
                        <span className="text-[10px] text-slate-400">/ {item.unit}</span>
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
          <div className="h-56 bg-white border border-dashed border-slate-250 rounded-2xl flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2 shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-emerald-500 animate-bounce">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
            </svg>
            <h4 className="font-semibold text-slate-600 text-sm">No Location Selected On Map</h4>
            <p className="text-xs max-w-sm leading-normal text-slate-400">
              Select one of the interactive markers on the live coordinates map above to immediately view custom daily offerings catalogs and neighborhood ratings details!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
