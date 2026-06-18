export type ProductCategory = 'Vegetable' | 'Fruit';

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  unit: string; // e.g., "kg", "bunch", "piece"
  imageUrl: string;
}

export interface SellerProduct {
  productId: string;
  name: string;
  category: ProductCategory;
  price: number;
  unit: string;
  isAvailable: boolean;
  stockStatus: 'In Stock' | 'Low Stock' | 'Out of Stock';
  lastUpdated: string; // ISO date string
}

export interface Review {
  id: string;
  customerName: string;
  rating: number; // 1 to 5
  comment: string;
  createdAt: string; // ISO date string
}

export interface Seller {
  id: string;
  name: string;
  phone: string;
  profilePhoto: string;
  cartInfo: string; // description of their cart, e.g. "Three-wheeled manual cart"
  serviceArea: string; // e.g., "Sector 4, Noida" or "Indiranagar, Bangalore"
  active: boolean;
  location?: {
    lat: number;
    lng: number;
  };
  lastLocationUpdate?: string; // ISO date string
  products: SellerProduct[];
  reviews: Review[];
  avgRating: number;
  ratingsCount: number;
  visitsCount: number;
  interactionCount: number;
  popularProducts: string[]; // array of product names
}

export interface CustomerProfile {
  name: string;
  phone: string;
  favorites: string[]; // List of seller IDs
  recentlyVisited: string[]; // List of seller IDs
}

export interface PushNotification {
  id: string;
  sellerId?: string;
  sellerName?: string;
  title: string;
  body: string;
  timestamp: string;
  type: 'activation' | 'price_update' | 'new_product' | 'announcement';
}

export interface AdminAnalytics {
  totalSellers: number;
  activeSellersCount: number;
  totalCustomersCount: number;
  totalProductsCatalogCount: number;
  totalReviewsCount: number;
  popularVegetables: { name: string; count: number }[];
  popularFruits: { name: string; count: number }[];
}
