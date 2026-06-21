import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Navigation, Clock, MapPin, X, Loader2 } from 'lucide-react';
import { Seller } from '../types';

interface LeafletMapProps {
  center: { lat: number; lng: number };
  customerLocation?: { lat: number; lng: number };
  sellers: Seller[];
  favorites: string[];
  onSellerSelect?: (seller: Seller) => void;
  selectedSellerId?: string | null;
  height?: string;
  onMapClick?: (coords: { lat: number; lng: number }) => void;
}

// Straight line distance helper for backup / local popups
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): string => {
  const R = 6371; 
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const km = R * c;
  return km >= 1 ? `${km.toFixed(1)} km` : `${Math.round(km * 1000)} m`;
};

export default function LeafletMap({
  center,
  customerLocation,
  sellers,
  favorites,
  onSellerSelect,
  selectedSellerId,
  height = '100%',
  onMapClick,
}: LeafletMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [id: string]: L.Marker }>({});
  const customerMarkerRef = useRef<L.Marker | null>(null);
  const routeLayersRef = useRef<L.LayerGroup | null>(null);

  // Router States
  const [activeRouteSellerId, setActiveRouteSellerId] = useState<string | null>(null);
  const [routeDetails, setRouteDetails] = useState<{ distance: string; duration: string } | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);

  // Keep references to event triggers inside event delegator
  const handleGetDirectionsRef = useRef<(sellerId: string) => void>(() => {});
  useEffect(() => {
    handleGetDirectionsRef.current = (sellerId: string) => {
      setActiveRouteSellerId(sellerId);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.closePopup();
      }
    };
  }, []);

  const onMapClickRef = useRef(onMapClick);
  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  // Sync route visibility to selected seller selection
  useEffect(() => {
    if (selectedSellerId) {
      if (selectedSellerId !== activeRouteSellerId) {
        // Clear previous active route when a different seller is clicked
        setActiveRouteSellerId(null);
        setRouteDetails(null);
      }
    } else {
      // Clear route when selection is empty
      setActiveRouteSellerId(null);
      setRouteDetails(null);
    }
  }, [selectedSellerId]);

  // 1. Map Initialization
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Create map instance
    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      scrollWheelZoom: true,
    }).setView([center.lat, center.lng], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      className: 'osm-tiles',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Initialize layout group for route paths
    const routeGroup = L.layerGroup().addTo(map);
    routeLayersRef.current = routeGroup;

    map.on('click', (e: L.LeafletMouseEvent) => {
      if (onMapClickRef.current) {
        onMapClickRef.current({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    });

    // Handle popup open to register button click securely bypassing Leaflet event suppression
    map.on('popupopen', (e: L.PopupEvent) => {
      const popup = e.popup;
      const contentElem = popup.getElement();
      if (contentElem) {
        const btn = contentElem.querySelector('.get-directions-btn');
        if (btn) {
          const sId = btn.getAttribute('data-seller-id');
          if (sId) {
            L.DomEvent.on(btn as HTMLElement, 'click', (ev) => {
              L.DomEvent.stop(ev);
              handleGetDirectionsRef.current(sId);
            });
          }
        }
      }
    });

    // Event delegation for clicks on "Get Directions" buttons inside popups
    const handleMapPopupClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const btn = target.closest('.get-directions-btn');
      if (btn) {
        const sId = btn.getAttribute('data-seller-id');
        if (sId) {
          e.preventDefault();
          e.stopPropagation();
          handleGetDirectionsRef.current(sId);
        }
      }
    };

    const container = mapContainerRef.current;
    if (container) {
      container.addEventListener('click', handleMapPopupClick);
    }

    mapInstanceRef.current = map;

    return () => {
      if (container) {
        container.removeEventListener('click', handleMapPopupClick);
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 2. Center change tracking
  useEffect(() => {
    if (mapInstanceRef.current && !activeRouteSellerId) {
      mapInstanceRef.current.setView([center.lat, center.lng]);
    }
  }, [center.lat, center.lng, activeRouteSellerId]);

  // 3. Markers Updates
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Optimized customer location marker update
    if (customerLocation) {
      const customerHtml = `
        <div class="relative flex items-center justify-center pointer-events-none" style="width: 24px; height: 24px;">
          <span class="animate-ping absolute inline-flex h-6 w-6 rounded-full bg-blue-400 opacity-60"></span>
          <div class="w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-lg"></div>
        </div>
      `;
      const customerIcon = L.divIcon({
        html: customerHtml,
        className: 'custom-customer-marker-class',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      if (customerMarkerRef.current) {
        customerMarkerRef.current.setLatLng([customerLocation.lat, customerLocation.lng]);
      } else {
        customerMarkerRef.current = L.marker([customerLocation.lat, customerLocation.lng], { icon: customerIcon })
          .addTo(map)
          .bindPopup(`
            <div class="p-1.5 text-xs text-slate-800 font-sans font-bold select-none text-center">
              📍 Your Current Location
            </div>
          `);
      }
    } else {
      if (customerMarkerRef.current) {
        customerMarkerRef.current.remove();
        customerMarkerRef.current = null;
      }
    }

    // Keep track of markers we are keeping
    const activeMarkerIds = new Set<string>();

    sellers.forEach((seller) => {
      if (!seller.location) return;

      const sId = seller.id;
      activeMarkerIds.add(sId);
      const isFav = favorites.includes(sId);
      const minPrice = seller.products.length > 0 ? Math.min(...seller.products.map((p) => p.price)) : '—';
      const ratingVal = seller.avgRating || 4.8;
      const ratingCount = seller.ratingsCount || 12;

      // Render original marker icon
      const sellerHtml = `
        <div class="relative group flex flex-col items-center cursor-pointer select-none animate-in fade-in zoom-in-50 duration-150" style="width: 46px; height: 46px;">
          <div class="w-9 h-9 rounded-full border-2 ${isFav ? 'border-pink-500 ring-2 ring-pink-300' : 'border-emerald-500'} bg-white overflow-hidden flex items-center justify-center shadow-md hover:scale-105 transition-all">
            ${seller.profilePhoto
              ? `<img src="${seller.profilePhoto}" style="width: 100%; height: 100%; object-fit: cover;" referrerpolicy="no-referrer" />`
              : `<div class="w-full h-full bg-emerald-50 flex items-center justify-center text-emerald-700 font-bold text-xs">${seller.name.substring(0, 2)}</div>`
            }
          </div>
          <div class="absolute -bottom-1 bg-emerald-600 text-white font-mono text-[9px] px-1 rounded-full border border-white shadow">
            ₹${minPrice}
          </div>
          ${isFav
            ? `<div class="absolute -top-1 -right-1 bg-pink-500 text-white rounded-full p-0.5 border border-white shadow" style="transform: scale(1.1); font-size: 8px; line-height: 1;">❤️</div>`
            : ''
          }
        </div>
      `;

      // Static distance formatting inside popup
      const rawDistance = customerLocation 
        ? calculateDistance(customerLocation.lat, customerLocation.lng, seller.location.lat, seller.location.lng)
        : null;
      const distanceText = rawDistance ? `${rawDistance} away` : 'Distance unknown';

      // Advanced, highly-designed Leaflet Popup Card
      const popupHtml = `
        <div class="p-2.5 font-sans w-60 text-slate-800 flex flex-col gap-2 rounded-xl bg-white select-none">
          <div class="flex items-center gap-2.5">
            <div class="w-10 h-10 rounded-full border border-emerald-500 overflow-hidden flex-shrink-0 bg-slate-50 shadow-sm">
              ${seller.profilePhoto
                  ? `<img src="${seller.profilePhoto}" class="w-full h-full object-cover" referrerpolicy="no-referrer" />`
                  : `<div class="w-full h-full bg-emerald-50 flex items-center justify-center text-emerald-700 font-extrabold text-xs">${seller.name.substring(0, 2)}</div>`
              }
            </div>
            <div class="flex-grow min-w-0">
              <h4 class="font-bold text-slate-900 text-xs sm:text-sm leading-tight truncate p-0 m-0">${seller.name}</h4>
              <p class="text-[10px] text-slate-500 font-medium m-0 truncate">${seller.cartInfo || 'Mobile Vegetable & Fruit Cart'}</p>
              <div class="flex items-center gap-1 mt-0.5">
                <span class="text-[9px] bg-slate-100 text-slate-700 font-extrabold px-1.5 py-0.2 rounded flex items-center gap-0.5">
                  ★ ${ratingVal.toFixed(1)}
                </span>
                <span class="text-[9px] text-slate-400">(${ratingCount})</span>
              </div>
            </div>
          </div>

          <div class="h-[1px] bg-slate-100"></div>

          <div class="grid grid-cols-2 gap-2 bg-slate-50/70 p-1.5 rounded-lg border border-slate-100 text-center">
            <div class="border-r border-slate-100 pr-1">
              <span class="text-[8px] text-slate-400 block font-bold uppercase tracking-wider">Distance</span>
              <span class="text-[10px] font-bold text-slate-700 block truncate">${distanceText}</span>
            </div>
            <div class="pl-1">
              <span class="text-[8px] text-slate-400 block font-bold uppercase tracking-wider">Min Price</span>
              <span class="text-[10px] font-bold text-emerald-600 block">₹${minPrice} base</span>
            </div>
          </div>

          <button class="get-directions-btn w-full bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold py-1.5 px-2.5 rounded-lg flex items-center justify-center gap-1 cursor-pointer transition active:scale-[0.98] border-none shadow-sm" data-seller-id="${seller.id}">
            🚀 Get Directions
          </button>
        </div>
      `;

      const sellerIcon = L.divIcon({
        html: sellerHtml,
        className: 'custom-seller-marker-class',
        iconSize: [46, 46],
        iconAnchor: [23, 23],
      });

      if (markersRef.current[sId]) {
        const existingMarker = markersRef.current[sId];
        existingMarker.setLatLng([seller.location.lat, seller.location.lng]);
        existingMarker.setPopupContent(popupHtml);
        existingMarker.setIcon(sellerIcon);
      } else {
        const marker = L.marker([seller.location.lat, seller.location.lng], { icon: sellerIcon })
          .addTo(map)
          .bindPopup(popupHtml, { closeButton: false })
          .on('click', () => {
            if (onSellerSelect) {
              onSellerSelect(seller);
            }
          });

        markersRef.current[sId] = marker;
      }
    });

    Object.keys(markersRef.current).forEach((id) => {
      if (!activeMarkerIds.has(id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });
  }, [sellers, favorites, customerLocation]);

  // 4. Open popup dynamically when seller is selected in parent component
  useEffect(() => {
    if (selectedSellerId && markersRef.current[selectedSellerId]) {
      const map = mapInstanceRef.current;
      const marker = markersRef.current[selectedSellerId];
      if (map && marker) {
        map.setView(marker.getLatLng(), map.getZoom());
        marker.openPopup();
      }
    }
  }, [selectedSellerId]);

  // 5. Calculate and draw real-time routed paths with real recalculation on dynamic live coordinates
  useEffect(() => {
    const map = mapInstanceRef.current;
    const routeGroup = routeLayersRef.current;
    
    if (!map || !routeGroup) return;

    if (!activeRouteSellerId || !customerLocation) {
      routeGroup.clearLayers();
      setRouteDetails(null);
      return;
    }

    const seller = sellers.find(s => s.id === activeRouteSellerId);
    if (!seller || !seller.location) {
      routeGroup.clearLayers();
      setRouteDetails(null);
      return;
    }

    let isMatched = true;

    const computeAndRenderPath = async () => {
      setLoadingRoute(true);
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${customerLocation.lng},${customerLocation.lat};${seller.location.lng},${seller.location.lat}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("OSRM router error.");
        const data = await res.json();
        
        if (!isMatched) return;

        if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
          throw new Error("No paths mapped.");
        }

        const route = data.routes[0];
        const distVal = route.distance;
        const durVal = route.duration;

        const distanceText = distVal >= 1000 
          ? `${(distVal / 1000).toFixed(1)} km` 
          : `${Math.round(distVal)} m`;
        
        const durationText = Math.ceil(durVal / 60) + ' min';

        setRouteDetails({
          distance: distanceText,
          duration: durationText
        });

        const geojson = route.geometry;
        const latLngs: L.LatLngExpression[] = geojson.coordinates.map((coord: [number, number]) => [coord[1], coord[0]] as L.LatLngTuple);

        routeGroup.clearLayers();

        // Overlay 1: Outer glowing neon aura
        L.polyline(latLngs, {
          color: '#047857',
          weight: 10,
          opacity: 0.35,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(routeGroup);

        // Overlay 2: Main bright route polyline
        L.polyline(latLngs, {
          color: '#10b981',
          weight: 5,
          opacity: 0.95,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(routeGroup);

        // Position current bounds to include route endpoints
        const bounds = L.latLngBounds(latLngs);
        bounds.extend([customerLocation.lat, customerLocation.lng]);
        bounds.extend([seller.location.lat, seller.location.lng]);
        map.fitBounds(bounds, { padding: [50, 50] });

      } catch (err) {
        console.warn("OSRM Route fetching failed. Drawing backup straight-line path.", err);
        if (!isMatched) return;

        routeGroup.clearLayers();
        
        const latLngs: L.LatLngExpression[] = [
          [customerLocation.lat, customerLocation.lng] as L.LatLngTuple,
          [seller.location.lat, seller.location.lng] as L.LatLngTuple
        ];

        L.polyline(latLngs, {
          color: '#f59e0b',
          weight: 4,
          opacity: 0.8,
          dashArray: '8, 8',
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(routeGroup);

        const straightDist = calculateDistance(customerLocation.lat, customerLocation.lng, seller.location.lat, seller.location.lng);
        // Estimate time based on standard 4.5 km/h walking speed (approx 13 mins per km)
        const R = 6371; 
        const dLat = ((seller.location.lat - customerLocation.lat) * Math.PI) / 180;
        const dLon = ((seller.location.lng - customerLocation.lng) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((customerLocation.lat * Math.PI) / 180) * Math.cos((seller.location.lat * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distanceKm = R * c;
        const durationMin = Math.ceil(distanceKm * 13);

        setRouteDetails({
          distance: straightDist,
          duration: `${durationMin} min (est.)`
        });

        const bounds = L.latLngBounds(latLngs);
        map.fitBounds(bounds, { padding: [50, 50] });
      } finally {
        if (isMatched) {
          setLoadingRoute(false);
        }
      }
    };

    computeAndRenderPath();

    return () => {
      isMatched = false;
    };
  }, [activeRouteSellerId, customerLocation?.lat, customerLocation?.lng, sellers]);

  const routedSeller = sellers.find(s => s.id === activeRouteSellerId);
  const selectedSeller = sellers.find(s => s.id === selectedSellerId);

  return (
    <div className="relative w-full h-full" style={{ height }}>
      <div
        ref={mapContainerRef}
        className="w-full h-full"
        style={{
          zIndex: 1,
          height: '100%',
          width: '100%',
          backgroundColor: '#f8fafc',
        }}
      />

      {/* Floating Directions Trigger Button Overlay on Map */}
      {selectedSeller && selectedSeller.location && activeRouteSellerId !== selectedSeller.id && (
        <div 
          className="absolute bottom-4 left-4 right-4 z-[999] bg-white/95 backdrop-blur-md rounded-2xl p-3.5 sm:p-4 shadow-xl border border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 font-sans animate-in fade-in slide-in-from-bottom-5 duration-300 pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Seller Details and Distance */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border border-emerald-500 overflow-hidden flex-shrink-0 bg-slate-50 shadow-sm">
              {selectedSeller.profilePhoto ? (
                <img src={selectedSeller.profilePhoto} className="w-full h-full object-cover" referrerpolicy="no-referrer" />
              ) : (
                <div className="w-full h-full bg-emerald-50 flex items-center justify-center text-emerald-700 font-extrabold text-xs">
                  {selectedSeller.name.substring(0, 2)}
                </div>
              )}
            </div>
            
            <div className="min-w-0">
              <h4 className="font-bold text-slate-1050 truncate leading-tight text-xs sm:text-sm">{selectedSeller.name}</h4>
              <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">{selectedSeller.cartInfo || 'Mobile Vegetable & Fruit Cart'}</p>
              {customerLocation && (
                <p className="text-[9px] text-emerald-650 font-extrabold tracking-wide uppercase mt-1">
                  📍 {calculateDistance(customerLocation.lat, customerLocation.lng, selectedSeller.location.lat, selectedSeller.location.lng)} away
                </p>
              )}
            </div>
          </div>

          {/* Action Trigger Button */}
          <button
            onClick={() => {
              setActiveRouteSellerId(selectedSeller.id);
            }}
            className="inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md cursor-pointer transition-all active:scale-[0.98] border-none"
          >
            <Navigation className="w-3.5 h-3.5 fill-white shrink-0" />
            <span>Show Route & Directions</span>
          </button>
        </div>
      )}

      {/* Floating Route Information & Navigation Card Overlay */}
      {routedSeller && routedSeller.location && (
        <div 
          className="absolute bottom-4 left-4 right-4 z-[999] bg-white/95 backdrop-blur-md rounded-2xl p-3.5 sm:p-5 shadow-xl border border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 font-sans animate-in fade-in slide-in-from-bottom-5 duration-300"
          style={{ pointerEvents: 'auto' }}
        >
          {/* Seller Image & Identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border border-emerald-500 overflow-hidden flex-shrink-0 bg-slate-50 shadow-sm">
              {routedSeller.profilePhoto ? (
                <img src={routedSeller.profilePhoto} className="w-full h-full object-cover" referrerpolicy="no-referrer" />
              ) : (
                <div className="w-full h-full bg-emerald-50 flex items-center justify-center text-emerald-700 font-extrabold text-sm">
                  {routedSeller.name.substring(0, 2)}
                </div>
              )}
            </div>
            
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4 className="font-bold text-slate-950 text-wrap leading-tight text-xs sm:text-sm">{routedSeller.name}</h4>
                <span className="text-[8px] font-extrabold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full uppercase tracking-wider shrink-0">Live routing</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">{routedSeller.cartInfo || 'Mobile Vegetable & Fruit Cart'}</p>
            </div>
          </div>

          {/* Travel Stats block info */}
          <div className="flex items-center gap-4 sm:gap-6 border-t border-slate-200/50 sm:border-t-0 sm:border-l sm:border-r border-slate-150 pt-3 sm:pt-0 sm:px-6">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-50 w-8.5 h-8.5 flex items-center justify-center rounded-lg text-emerald-600">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[9px] text-slate-400 block font-extrabold uppercase tracking-widest leading-none">Est. Time</span>
                <span className="text-xs sm:text-sm font-bold text-slate-800 font-mono mt-0.5 block">
                  {loadingRoute ? '...' : routeDetails?.duration || '—'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-50 w-8.5 h-8.5 flex items-center justify-center rounded-lg text-blue-600">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[9px] text-slate-400 block font-extrabold uppercase tracking-widest leading-none">Distance</span>
                <span className="text-xs sm:text-sm font-bold text-slate-800 font-mono mt-0.5 block">
                  {loadingRoute ? '...' : routeDetails?.distance || '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Actions Column */}
          <div className="flex items-center gap-2">
            <a
              href={`https://www.google.com/maps/dir/?api=1&origin=${customerLocation?.lat},${customerLocation?.lng}&destination=${routedSeller.location.lat},${routedSeller.location.lng}&travelmode=driving`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-grow sm:flex-grow-0 inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md cursor-pointer transition-all active:scale-[0.98] border-none text-center no-underline"
            >
              <Navigation className="w-3.5 h-3.5 fill-white shrink-0" />
              <span>Start Navigation</span>
            </a>

            <button
              onClick={() => {
                setActiveRouteSellerId(null);
                setRouteDetails(null);
              }}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 border-none rounded-xl transition duration-150 cursor-pointer w-9 h-9 flex items-center justify-center"
              title="Close route directions"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Mini loading indicator for live updates when route is already visible */}
      {loadingRoute && routeDetails && (
        <div className="absolute top-4 right-4 z-[999] bg-white/90 backdrop-blur-sm border border-slate-100 py-1.5 px-3 rounded-xl flex items-center gap-1.5 shadow animate-pulse">
          <Loader2 className="w-3 h-3 text-emerald-600 animate-spin" />
          <span className="text-[9px] font-bold text-slate-600 font-sans tracking-wide uppercase">Recalculating...</span>
        </div>
      )}
    </div>
  );
}
