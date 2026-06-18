import React, { useEffect, useState } from 'react';
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

interface SellerDashboardProps {
  seller: Seller;
  onLogout: () => void;
  onProfileUpdate: (updatedUser: any) => void;
}

export default function SellerDashboard({ seller, onLogout, onProfileUpdate }: SellerDashboardProps) {
  // Active coordinates sharing
  const [isActive, setIsActive] = useState(seller.active);
  const [trackingIntervalId, setTrackingIntervalId] = useState<any>(null);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(seller.location || null);
  const [coordsMsg, setCoordsMsg] = useState('');

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

  // AI pitch state
  const [generatedPitch, setGeneratedPitch] = useState('');
  const [pitchLoading, setPitchLoading] = useState(false);

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
    
    // Manage tracking hook on page Mount if seller already active
    if (seller.active) {
      initiateLiveTracking();
    }

    return () => {
      if (trackingIntervalId) clearInterval(trackingIntervalId);
    };
  }, []);

  // Set up dynamic geolocation coordinates sending (Every 15s)
  const initiateLiveTracking = () => {
    if (!navigator.geolocation) {
      setCoordsMsg('❌ Geolocation is not supported by your mobile device.');
      return;
    }

    setCoordsMsg('⏳ Initiating GPS connection...');
    
    const sendLocation = () => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setCurrentCoords(coords);

          // Post coordinates to backend
          try {
            const res = await fetch(`/api/sellers/${seller.id}/location`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ location: coords })
            });
            if (res.ok) {
              setCoordsMsg(`🟢 Location synchronized (${new Date().toLocaleTimeString()})`);
            }
          } catch (e) {
            setCoordsMsg('⚠️ Location upload lagging, retrying...');
          }
        },
        (error) => {
          setCoordsMsg('⚠️ GPS denied. Please toggle permissions.');
          console.warn('GPS tracking error', error);
        },
        { enableHighAccuracy: true }
      );
    };

    // Send immediately on trigger
    sendLocation();

    // Loop trigger every 15 seconds
    const interval = setInterval(sendLocation, 15000);
    setTrackingIntervalId(interval);
  };

  const stopLiveTracking = () => {
    if (trackingIntervalId) {
      clearInterval(trackingIntervalId);
      setTrackingIntervalId(null);
    }
    setCoordsMsg('');
  };

  // Toggle duty state
  const handleActiveToggle = async () => {
    const nextState = !isActive;
    
    // If going active, fetch coordinates first
    let userCoords = currentCoords;
    if (nextState) {
      if (!navigator.geolocation) {
        alert('Browser Geolocation is required to go active.');
        return;
      }
      setCoordsMsg('⏳ Fetching setup GPS location...');
      
      try {
        await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              userCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
              setCurrentCoords(userCoords);
              resolve(userCoords);
            },
            (err) => {
              // Fail-safe Bangalore coordinates for testing convenience in non-geo browser models
              userCoords = { lat: 12.9716, lng: 77.5946 };
              setCurrentCoords(userCoords);
              resolve(userCoords);
            },
            { enableHighAccuracy: true, timeout: 4000 }
          );
        });
      } catch (e) {
        console.warn('Coordinates acquisition timed out, continuing.');
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

  // Add Product to Seller Offerings list
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCatalogId || !newPrice) return;

    const matchedCatalogItem = catalog.find((c) => c.id === selectedCatalogId);
    if (!matchedCatalogItem) return;

    // Check if seller already has this product
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

  // Toggle inventory availability checkbox
  const handleToggleProductAvailable = async (productId: string) => {
    const updated = sellerProducts.map((p) =>
      p.productId === productId ? { ...p, isAvailable: !p.isAvailable, lastUpdated: new Date().toISOString() } : p
    );
    await updateProductsOnServer(updated);
  };

  // Update item price or stock levels directly
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

  // Delete product offering entirely
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
        // Refresh seller profile state to synchronize analytics summaries
        const refreshed = { ...seller, products: data.products };
        onProfileUpdate(refreshed);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Generate Gemini high-excitement Sales Pitch
  const generateAIPitch = async () => {
    setPitchLoading(true);
    try {
      const res = await fetch('/api/ai/pitch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartInfo,
          serviceArea,
          products: sellerProducts.filter((p) => p.isAvailable)
        })
      });
      const data = await res.json();
      setGeneratedPitch(data.text || 'Marketing pitch generation service timed out.');
    } catch (e) {
      setGeneratedPitch('AI pitch generation error.');
    } finally {
      setPitchLoading(false);
    }
  };

  // Update Profile details
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
          <img 
            src={seller.profilePhoto} 
            alt="Profile" 
            className="w-16 h-16 rounded-full object-cover border-4 border-slate-100 shadow shrink-0" 
          />
          <div>
            <h2 className="text-xl font-bold text-slate-800">{seller.name}</h2>
            <p className="text-xs text-slate-500 font-mono mt-0.5">Pourman Partner Node: {seller.phone}</p>
            <div className="flex items-center gap-2 mt-1 justify-center md:justify-start">
              <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                isActive ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200'
              }`}>
                <Power className="w-3 h-3" />
                {isActive ? 'Live Duty broadcast Active' : 'Off-Duty offline'}
              </span>
            </div>
          </div>
        </div>

        {/* Global toggles */}
        <div className="flex flex-col sm:flex-row items-center gap-4 shrink-0 w-full md:w-auto">
          {/* Active / Inactive switch */}
          <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl flex items-center justify-between gap-4 w-full sm:w-60">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-slate-700">Broadcasting Status</p>
              <p className="text-[10px] text-slate-500">{isActive ? '🟢 Sharing GPS position' : '🔴 Map tracking paused'}</p>
            </div>
            <button
              onClick={handleActiveToggle}
              className={`py-1.5 px-4 rounded-xl text-xs font-bold transition-all ${
                isActive ? 'bg-rose-600 hover:bg-rose-700 text-white shadow' : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow'
              }`}
            >
              {isActive ? 'Go Offline' : 'Go Online'}
            </button>
          </div>

          <button 
            onClick={onLogout}
            className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 hover:text-slate-800 font-bold text-xs inline-flex items-center gap-1.5 w-full sm:w-auto justify-center"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>

      {coordsMsg && (
        <div className="bg-slate-900 text-emerald-400 p-3 rounded-xl text-xs font-mono flex items-center gap-2 shadow-inner">
          <MapPin className="w-4 h-4 text-emerald-500 animate-pulse" />
          <span>{coordsMsg}</span>
        </div>
      )}



      {/* Main body modules config: Daily Offering Management & Profile/AI card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Grid: Catalog lists. 7 columns */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 md:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-50 pb-3 gap-3">
            <div>
              <h3 className="font-bold text-base text-slate-800 flex items-center gap-1.5">
                <Layers className="w-5 h-5 text-emerald-600" />
                Daily Inventory Offerings (आज की सब्जी व फल)
              </h3>
              <p className="text-xs text-slate-500 mt-1">Specify catalog items and update weights and active prices below.</p>
            </div>
          </div>

          {/* Quick item addition panel */}
          <form onSubmit={handleAddProduct} className="p-4 bg-slate-50 rounded-xl grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Select Catalog Item</label>
              <select
                required
                value={selectedCatalogId}
                onChange={(e) => setSelectedCatalogId(e.target.value)}
                className="w-full bg-white border border-slate-200 py-1.5 px-2 rounded-lg text-xs font-medium focus:outline-none"
              >
                <option value="">-- Choose Item --</option>
                {catalog.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.unit})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Daily Offering Price (₹)</label>
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
              className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Offering Product
            </button>
          </form>

          {/* Active Offerings Directory Grid */}
          <div className="space-y-3">
            {sellerProducts.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8 italic border border-dashed border-slate-200 rounded-xl">
                No active vegetable or fruit offerings added yet! Select from catalog templates above.
              </p>
            ) : (
              <div className="space-y-3">
                {sellerProducts.map((p) => (
                  <div 
                    key={p.productId}
                    className="p-3 border border-slate-100 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white hover:bg-slate-50/50 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      {/* Checkbox wrapper to highlight availability toggle quickly */}
                      <input
                        type="checkbox"
                        checked={p.isAvailable}
                        onChange={() => handleToggleProductAvailable(p.productId)}
                        className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 accent-emerald-600 shrink-0 cursor-pointer"
                        title="Available duty tick"
                      />
                      <div>
                        <span className={`text-xs font-bold ${p.isAvailable ? 'text-slate-800' : 'text-slate-400 line-through'}`}>
                          {p.name}
                        </span>
                        <p className="text-[10px] text-slate-400">Unit pricing / {p.unit}</p>
                      </div>
                    </div>

                    {/* Operational direct editing fields */}
                    <div className="flex flex-wrap items-center gap-3">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block mb-0.5">Today Price (₹)</span>
                        <input
                          type="number"
                          value={p.price}
                          onChange={(e) => handleUpdateProductDetail(p.productId, { price: e.target.value })}
                          className="w-20 bg-slate-50 border border-slate-200 py-1 px-2 rounded-lg text-xs font-bold focus:outline-none"
                        />
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block mb-0.5">Stock Levels</span>
                        <select
                          value={p.stockStatus}
                          onChange={(e: any) => handleUpdateProductDetail(p.productId, { stockStatus: e.target.value })}
                          className="bg-slate-50 border border-slate-200 py-1 px-2 rounded-lg text-xs font-semibold focus:outline-none"
                        >
                          <option value="In Stock">In Stock</option>
                          <option value="Low Stock">Low Stock</option>
                          <option value="Out of Stock">Out of Stock</option>
                        </select>
                      </div>

                      <button
                        onClick={() => handleDeleteProduct(p.productId)}
                        className="p-2 border border-slate-100 hover:border-red-200 rounded text-rose-600 hover:bg-red-50 transition-all self-end"
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
            <h4 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
              <Settings className="w-4 h-4 text-slate-500" />
              Profile Settings
            </h4>

            <form onSubmit={handleProfileSave} className="space-y-3 text-xs">
              {editSuccess && (
                <p className="p-2 border border-emerald-500/30 text-emerald-800 rounded bg-emerald-50 font-bold">
                  ✓ Profile settings updated successfully on file! Location updates reflect in registry.
                </p>
              )}

              <div className="space-y-1">
                <label className="font-semibold text-slate-600 block">Full Name</label>
                <input
                  type="text"
                  required
                  value={sellerName}
                  onChange={(e) => setSellerName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-2 rounded focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-600 block">Contact Phone Number</label>
                <input
                  type="text"
                  required
                  value={sellerPhone}
                  onChange={(e) => setSellerPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-2 rounded focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-600 block">Cart Description</label>
                <input
                  type="text"
                  value={cartInfo}
                  onChange={(e) => setCartInfo(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-2 rounded focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-600 block">Operating Streets</label>
                <input
                  type="text"
                  required
                  value={serviceArea}
                  onChange={(e) => setServiceArea(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-2 rounded focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="font-semibold text-slate-600 block">Profile Photo (प्रोफ़ाइल फोटो गैलरी से चुनें)</label>
                <div className="flex items-center gap-4 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  {profilePhoto ? (
                    <img
                      src={profilePhoto}
                      alt="Profile preview"
                      className="w-12 h-12 rounded-full object-cover border-2 border-emerald-500"
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
                className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-all"
              >
                {editLoading ? 'Saving changes...' : 'Save Profile Details'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
