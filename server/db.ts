import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { Product, Seller, Review, PushNotification, Feedback } from '../src/types';

// Let's define the Master Mongoose Schemas & Models
const SellerSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: String,
  phone: { type: String, unique: true },
  password: { type: String },
  profilePhoto: String,
  cartInfo: String,
  serviceArea: String,
  active: Boolean,
  location: {
    lat: Number,
    lng: Number
  },
  lastLocationUpdate: String,
  products: [{
    productId: String,
    name: String,
    category: String,
    price: Number,
    unit: String,
    isAvailable: Boolean,
    stockStatus: String,
    lastUpdated: String
  }],
  reviews: [{
    id: String,
    customerName: String,
    rating: Number,
    comment: String,
    createdAt: String
  }],
  avgRating: { type: Number, default: 0 },
  ratingsCount: { type: Number, default: 0 },
  visitsCount: { type: Number, default: 0 },
  interactionCount: { type: Number, default: 0 },
  popularProducts: [String]
}, { timestamps: true });

const CatalogProductSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: String,
  category: String,
  unit: String,
  imageUrl: String
}, { timestamps: true });

const PushNotificationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  sellerId: String,
  sellerName: String,
  title: String,
  body: String,
  timestamp: String,
  type: String
}, { timestamps: true });

const SystemSettingsSchema = new mongoose.Schema({
  searchRadiusKm: { type: Number, default: 5 },
  allowSelfRegistration: { type: Boolean, default: true },
  announcements: [String]
}, { timestamps: true });

const FeedbackSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: String,
  description: String,
  createdAt: String
}, { timestamps: true });

const MongooseSeller = mongoose.models.Seller || mongoose.model('Seller', SellerSchema);
const MongooseCatalog = mongoose.models.CatalogProduct || mongoose.model('CatalogProduct', CatalogProductSchema);
const MongooseNotification = mongoose.models.PushNotification || mongoose.model('PushNotification', PushNotificationSchema);
const MongooseSettings = mongoose.models.SystemSettings || mongoose.model('SystemSettings', SystemSettingsSchema);
const MongooseFeedback = mongoose.models.Feedback || mongoose.model('Feedback', FeedbackSchema);

interface DatabaseSchema {
  sellers: Seller[];
  catalog: Product[];
  notifications: PushNotification[];
  feedbacks: Feedback[];
  systemSettings: {
    searchRadiusKm: number;
    allowSelfRegistration: boolean;
    announcements: string[];
  };
}

export class FileDatabase {
  private data: DatabaseSchema;
  private isConnectedToMongo: boolean = false;

  constructor() {
    // Initial data is clean and empty
    this.data = {
      sellers: [],
      catalog: [],
      notifications: [],
      feedbacks: [],
      systemSettings: {
        searchRadiusKm: 5,
        allowSelfRegistration: true,
        announcements: ['Welcome CartLive! Real-time local street cart maps sync.']
      }
    };
    this.init();
  }

  private saveLocalBackup() {
    try {
      const backupPath = path.join(process.cwd(), 'workspace-data-store.json');
      fs.writeFileSync(backupPath, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (err) {
      console.error('🔴 Failed to write local JSON backup file:', err);
    }
  }

  private async init() {
    // Try loading local file backup first so we maintain state even on in-memory mode restart
    const backupPath = path.join(process.cwd(), 'workspace-data-store.json');
    if (fs.existsSync(backupPath)) {
      try {
        const fileContent = fs.readFileSync(backupPath, 'utf8');
        const parsed = JSON.parse(fileContent);
        if (parsed) {
          this.data = {
            sellers: parsed.sellers || [],
            catalog: parsed.catalog || [],
            notifications: parsed.notifications || [],
            feedbacks: parsed.feedbacks || [],
            systemSettings: parsed.systemSettings || this.data.systemSettings
          };
          console.log(`💾 Restored state from local File Backup: ${this.data.sellers.length} sellers, ${this.data.feedbacks.length} feedbacks.`);
        }
      } catch (err) {
        console.error('🔴 Failed to read/parse local backup file:', err);
      }
    }

    const mongoUri = process.env.MONGODB_URI;
    if (mongoUri) {
      console.log('⚡ Detected MONGODB_URI in environment. Connecting to MongoDB Atlas...');
      try {
        await mongoose.connect(mongoUri);
        this.isConnectedToMongo = true;
        console.log('🟢 Successfully connected to MongoDB Atlas!');
        await this.loadFromMongo();
      } catch (error) {
        console.error('🔴 Connection to MongoDB Atlas failed:', error);
      }
    } else {
      console.log('⚠️ No MONGODB_URI configured. Running with in-memory slate + local JSON file storage.');
    }
  }

  private async loadFromMongo() {
    try {
      const sellers = await MongooseSeller.find().lean();
      const catalog = await MongooseCatalog.find().lean();
      const notifications = await MongooseNotification.find().lean();
      const settings = await MongooseSettings.findOne().lean();
      const feedbacks = await MongooseFeedback.find().sort({ createdAt: -1 }).lean();

      if (sellers && sellers.length > 0) {
        this.data.sellers = sellers as any[];
      }
      if (catalog && catalog.length > 0) {
        this.data.catalog = catalog as any[];
      }
      if (notifications && notifications.length > 0) {
        this.data.notifications = notifications as any[];
      }
      if (feedbacks && feedbacks.length > 0) {
        this.data.feedbacks = feedbacks as any[];
      }
      if (settings) {
        this.data.systemSettings = {
          searchRadiusKm: settings.searchRadiusKm || 5,
          allowSelfRegistration: settings.allowSelfRegistration !== undefined ? settings.allowSelfRegistration : true,
          announcements: settings.announcements || []
        };
      }
      console.log(`📊 Restored state from MongoDB Atlas: ${this.data.sellers.length} sellers, ${this.data.catalog.length} catalog items.`);
    } catch (e) {
      console.error('Failed to load collections from MongoDB Atlas:', e);
    }
  }

  // Concurrently save change interactions back to MongoDB
  private async persistSeller(seller: Seller) {
    this.saveLocalBackup();
    if (!this.isConnectedToMongo) return;
    try {
      await MongooseSeller.updateOne(
        { id: seller.id },
        { $set: seller },
        { upsert: true }
      );
    } catch (err) {
      console.error('Failed to save Seller update to MongoDB Atlas:', err);
    }
  }

  private async persistCatalogProduct(product: Product) {
    this.saveLocalBackup();
    if (!this.isConnectedToMongo) return;
    try {
      await MongooseCatalog.updateOne(
        { id: product.id },
        { $set: product },
        { upsert: true }
      );
    } catch (err) {
      console.error('Failed to save Catalog Product update to MongoDB Atlas:', err);
    }
  }

  private async persistNotification(notification: PushNotification) {
    this.saveLocalBackup();
    if (!this.isConnectedToMongo) return;
    try {
      await MongooseNotification.updateOne(
        { id: notification.id },
        { $set: notification },
        { upsert: true }
      );
    } catch (err) {
      console.error('Failed to save Notification to MongoDB Atlas:', err);
    }
  }

  private async persistSettings(settings: DatabaseSchema['systemSettings']) {
    this.saveLocalBackup();
    if (!this.isConnectedToMongo) return;
    try {
      await MongooseSettings.updateOne(
        {},
        { $set: settings },
        { upsert: true }
      );
    } catch (err) {
      console.error('Failed to save System Settings to MongoDB Atlas:', err);
    }
  }

  private async deleteSellerFromMongo(id: string) {
    this.saveLocalBackup();
    if (!this.isConnectedToMongo) return;
    try {
      await MongooseSeller.deleteOne({ id });
    } catch (err) {
      console.error('Failed to delete Seller from MongoDB Atlas:', err);
    }
  }

  private async deleteCatalogProductFromMongo(id: string) {
    this.saveLocalBackup();
    if (!this.isConnectedToMongo) return;
    try {
      await MongooseCatalog.deleteOne({ id });
    } catch (err) {
      console.error('Failed to delete Catalog Product from MongoDB Atlas:', err);
    }
  }

  private async persistFeedback(feedback: Feedback) {
    this.saveLocalBackup();
    if (!this.isConnectedToMongo) return;
    try {
      await MongooseFeedback.updateOne(
        { id: feedback.id },
        { $set: feedback },
        { upsert: true }
      );
    } catch (err) {
      console.error('Failed to save Feedback to MongoDB Atlas:', err);
    }
  }

  private async deleteFeedbackFromMongo(id: string) {
    this.saveLocalBackup();
    if (!this.isConnectedToMongo) return;
    try {
      await MongooseFeedback.deleteOne({ id });
    } catch (err) {
      console.error('Failed to delete Feedback from MongoDB Atlas:', err);
    }
  }

  // --- External DB Interface Methods ---

  getSellers(): Seller[] {
    return this.data.sellers;
  }

  getSellerById(id: string): Seller | undefined {
    return this.data.sellers.find(s => s.id === id);
  }

  getSellerByPhone(phone: string): Seller | undefined {
    return this.data.sellers.find(s => s.phone === phone);
  }

  addSeller(seller: Omit<Seller, 'reviews' | 'avgRating' | 'ratingsCount' | 'products' | 'visitsCount' | 'interactionCount' | 'popularProducts'> & {password?: string}): Seller {
    const newSeller: Seller = {
      ...seller,
      products: [],
      reviews: [],
      avgRating: 0,
      ratingsCount: 0,
      visitsCount: 0,
      interactionCount: 0,
      popularProducts: []
    };
    if (seller.password) {
      (newSeller as any).password = seller.password;
    }
    this.data.sellers.push(newSeller);
    this.persistSeller(newSeller);
    return newSeller;
  }

  updateSeller(id: string, updates: Partial<Seller & {password?: string}>): Seller | undefined {
    const idx = this.data.sellers.findIndex(s => s.id === id);
    if (idx === -1) return undefined;

    let reviews = updates.reviews !== undefined ? updates.reviews : this.data.sellers[idx].reviews;
    let avg = 0;
    if (reviews && reviews.length > 0) {
      const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
      avg = Math.round((sum / reviews.length) * 10) / 10;
    }

    this.data.sellers[idx] = {
      ...this.data.sellers[idx],
      ...updates as any,
      avgRating: reviews ? avg : this.data.sellers[idx].avgRating,
      ratingsCount: reviews ? reviews.length : this.data.sellers[idx].ratingsCount
    };

    this.persistSeller(this.data.sellers[idx]);
    return this.data.sellers[idx];
  }

  deleteSeller(id: string): boolean {
    const initialLen = this.data.sellers.length;
    this.data.sellers = this.data.sellers.filter(s => s.id !== id);
    if (this.data.sellers.length !== initialLen) {
      this.deleteSellerFromMongo(id);
      return true;
    }
    return false;
  }

  getCatalog(): Product[] {
    return this.data.catalog;
  }

  addCatalogProduct(product: Omit<Product, 'id'>): Product {
    const newProduct: Product = {
      id: `p_${Date.now()}`,
      ...product
    };
    this.data.catalog.push(newProduct);
    this.persistCatalogProduct(newProduct);
    return newProduct;
  }

  updateCatalogProduct(id: string, updates: Partial<Product>): Product | undefined {
    const idx = this.data.catalog.findIndex(p => p.id === id);
    if (idx === -1) return undefined;
    this.data.catalog[idx] = { ...this.data.catalog[idx], ...updates };
    this.persistCatalogProduct(this.data.catalog[idx]);
    return this.data.catalog[idx];
  }

  deleteCatalogProduct(id: string): boolean {
    const initialLen = this.data.catalog.length;
    this.data.catalog = this.data.catalog.filter(p => p.id !== id);
    if (this.data.catalog.length !== initialLen) {
      this.deleteCatalogProductFromMongo(id);
      return true;
    }
    return false;
  }

  getNotifications(): PushNotification[] {
    return this.data.notifications;
  }

  addNotification(notification: Omit<PushNotification, 'id' | 'timestamp'>): PushNotification {
    const newNotification: PushNotification = {
      id: `n_${Date.now()}`,
      timestamp: new Date().toISOString(),
      ...notification
    };
    this.data.notifications.unshift(newNotification);
    if (this.data.notifications.length > 50) {
      this.data.notifications = this.data.notifications.slice(0, 50);
    }
    this.persistNotification(newNotification);
    return newNotification;
  }

  getSettings() {
    return this.data.systemSettings;
  }

  updateSettings(updates: Partial<DatabaseSchema['systemSettings']>) {
    this.data.systemSettings = {
      ...this.data.systemSettings,
      ...updates
    };
    this.persistSettings(this.data.systemSettings);
    return this.data.systemSettings;
  }

  getFeedbacks(): Feedback[] {
    return this.data.feedbacks || [];
  }

  addFeedback(feedback: Omit<Feedback, 'id' | 'createdAt'>): Feedback {
    const newFeedback: Feedback = {
      id: `f_${Date.now()}`,
      name: feedback.name,
      description: feedback.description,
      createdAt: new Date().toISOString()
    };
    this.data.feedbacks = this.data.feedbacks || [];
    this.data.feedbacks.unshift(newFeedback);
    this.persistFeedback(newFeedback);
    return newFeedback;
  }

  deleteFeedback(id: string): boolean {
    this.data.feedbacks = this.data.feedbacks || [];
    const initialLen = this.data.feedbacks.length;
    this.data.feedbacks = this.data.feedbacks.filter(f => f.id !== id);
    if (this.data.feedbacks.length !== initialLen) {
      this.deleteFeedbackFromMongo(id);
      return true;
    }
    return false;
  }
}

export const dbInstance = new FileDatabase();
