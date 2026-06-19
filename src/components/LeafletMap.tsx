import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Seller } from '../types';

interface LeafletMapProps {
  center: { lat: number; lng: number };
  customerLocation?: { lat: number; lng: number };
  sellers: Seller[];
  favorites: string[];
  onSellerSelect?: (seller: Seller) => void;
  selectedSellerId?: string | null;
  height?: string;
}

export default function LeafletMap({
  center,
  customerLocation,
  sellers,
  favorites,
  onSellerSelect,
  selectedSellerId,
  height = '100%',
}: LeafletMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [id: string]: L.Marker }>({});
  const customerMarkerRef = useRef<L.Marker | null>(null);

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

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 2. Center change tracking
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([center.lat, center.lng]);
    }
  }, [center.lat, center.lng]);

  // 3. Markers Updates
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Optimized customer location marker update
    if (customerLocation) {
      const customerHtml = `
        <div class="relative flex items-center justify-center" style="width: 24px; height: 24px;">
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
            <div class="p-1 text-xs text-slate-800 font-sans font-bold">
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

      const sellerHtml = `
        <div class="relative group flex flex-col items-center cursor-pointer select-none" style="width: 46px; height: 46px;">
          <div class="w-9 h-9 rounded-full border-2 ${isFav ? 'border-pink-500 ring-2 ring-pink-300' : 'border-emerald-500'} bg-white overflow-hidden flex items-center justify-center shadow-md">
            ${seller.profilePhoto
              ? `<img src="${seller.profilePhoto}" style="width: 100%; height: 100%; object-fit: cover;" />`
              : `<div class="w-full h-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs">${seller.name.substring(0, 2)}</div>`
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

      const popupHtml = `
        <div class="p-2 space-y-1 font-sans text-slate-800" style="max-width: 180px;">
          <div class="font-bold text-slate-900 border-b pb-1 mb-1">
            🍎 ${seller.name}
          </div>
          <p class="text-[10px] text-slate-500 m-0">${seller.cartInfo || 'Street Partner'}</p>
          <p class="text-[11px] font-semibold text-emerald-700 m-0 mt-1">
            ₹${minPrice} min base price
          </p>
          <div class="text-[9px] text-emerald-600 bg-emerald-50 px-1 border border-emerald-100 rounded mt-1.5 font-bold py-0.5 select-none text-center">
            ✨ Selected & Menu Open Below
          </div>
        </div>
      `;

      const sellerIcon = L.divIcon({
        html: sellerHtml,
        className: 'custom-seller-marker-class',
        iconSize: [46, 46],
        iconAnchor: [23, 23],
      });

      if (markersRef.current[sId]) {
        // Smoothly set its updated LatLng, Popup content and Icon without resetting fully!
        const existingMarker = markersRef.current[sId];
        existingMarker.setLatLng([seller.location.lat, seller.location.lng]);
        existingMarker.setPopupContent(popupHtml);
        existingMarker.setIcon(sellerIcon);
      } else {
        // Add new marker
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

    // Remove obsolete markers that are no longer present or active
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
        // Center on the marker and open the popup
        map.setView(marker.getLatLng(), map.getZoom());
        marker.openPopup();
      }
    }
  }, [selectedSellerId]);

  return (
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
  );
}
