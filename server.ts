import 'dotenv/config'; // MUST be first — loads .env before anything reads process.env
import express from 'express';
import path from 'path';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';
import { dbInstance } from './server/db';
import { Seller, SellerProduct, Review } from './src/types';

// Let's implement lazy initialization of Gemini to prevent crashes on startup if secret is missing
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== 'MY_GEMINI_API_KEY') {
      aiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
  }
  return aiClient;
}

async function generateContentWithFallback(
  ai: GoogleGenAI,
  params: {
    model: string;
    contents: any;
    config?: any;
  }
) {
  const modelsToTry = [params.model, 'gemini-1.5-flash-latest', 'gemini-1.5-pro-latest'];
  let lastError: any = null;

  for (const model of modelsToTry) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`[Gemini] Attempting generation with model ${model} (attempt ${attempt})...`);
        const response = await ai.models.generateContent({
          ...params,
          model,
        });
        return response;
      } catch (err: any) {
        lastError = err;
        console.warn(`[Gemini] Error with model ${model} (attempt ${attempt}):`, err?.message || err);
        const errStr = String(err?.message || '').toLowerCase();
        if (errStr.includes('not found') || errStr.includes('bad request') || errStr.includes('invalid')) {
          break;
        }
        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, attempt * 500));
        }
      }
    }
  }
  throw lastError || new Error('All model attempts failed');
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // CORS — must be before all routes
  app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  }));
  app.options('*', cors());

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Store active SSE clients
  let sseClients: { id: string; res: express.Response }[] = [];

  function broadcastRealtime(type: string, data: any) {
    const payload = JSON.stringify({ type, data });
    sseClients.forEach((client) => {
      try {
        client.res.write(`data: ${payload}\n\n`);
      } catch (e) {
        console.error('Failed to notify client', client.id);
      }
    });
  }

  // --- Real-time SSE Stream ---
  app.get('/api/realtime/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const clientId = `client_${Date.now()}`;
    sseClients.push({ id: clientId, res });

    // Send initial test event
    res.write(`data: ${JSON.stringify({ type: 'connected', clientId })}\n\n`);

    req.on('close', () => {
      sseClients = sseClients.filter((c) => c.id !== clientId);
    });
  });

  // --- Auth API ---
  app.post('/api/auth/register', (req, res) => {
    const { name, phone, password, cartInfo, serviceArea, profilePhoto } = req.body;
    if (!name || !phone || !password) {
      return res.status(400).json({ error: 'Name, phone number, and password are required' });
    }

    const cleanedPhone = phone.trim().replace(/\s+/g, '');
    const existing = dbInstance.getSellerByPhone(cleanedPhone);
    if (existing) {
      return res.status(400).json({ error: 'Seller with this mobile number already registered' });
    }

    const seller = dbInstance.addSeller({
      id: `seller_${Date.now()}`,
      name: name.trim(),
      phone: cleanedPhone,
      password, // In-memory/plain comparison for MVP preview
      profilePhoto: profilePhoto || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
      cartInfo: cartInfo || 'Standard Cart',
      serviceArea: serviceArea || 'Local Suburbs',
      active: false
    });

    // Strip password from returned payload
    const { password: _, ...safeSeller } = seller as any;
    res.status(201).json({ success: true, seller: safeSeller });
  });

  app.post('/api/auth/login', (req, res) => {
    const { phone, password } = req.body;
    if (!phone || !password) {
      return res.status(400).json({ error: 'Login ID and password are required' });
    }

    const cleanedPhone = phone.trim().replace(/\s+/g, '');

    // Check Admin login
    if (cleanedPhone === 'admin' || cleanedPhone === 'admin@pourman.com') {
      if (password === 'admin123') {
        return res.json({
          success: true,
          role: 'ADMIN',
          user: { id: 'admin', name: 'Platform Administrator', email: 'admin@pourman.com' }
        });
      } else {
        return res.status(401).json({ error: 'Invalid administrator credentials' });
      }
    }

    // Check Seller login
    const seller = dbInstance.getSellerByPhone(cleanedPhone);
    if (!seller) {
      return res.status(401).json({ error: 'No seller registered with this mobile number' });
    }

    const dbPassword = (seller as any).password;
    if (dbPassword && dbPassword !== password) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    const { password: _, ...safeSeller } = seller as any;
    res.json({
      success: true,
      role: 'SELLER',
      user: safeSeller
    });
  });

  // --- Catalog API ---
  app.get('/api/catalog', (req, res) => {
    res.json(dbInstance.getCatalog());
  });

  app.post('/api/admin/catalog', (req, res) => {
    const { name, category, unit, imageUrl } = req.body;
    if (!name || !category || !unit) {
      return res.status(400).json({ error: 'Missing name, category or unit fields' });
    }
    const product = dbInstance.addCatalogProduct({
      name,
      category,
      unit,
      imageUrl: imageUrl || 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=200&auto=format&fit=crop&q=60'
    });
    res.status(201).json({ success: true, product });
  });

  app.delete('/api/admin/catalog/:id', (req, res) => {
    const success = dbInstance.deleteCatalogProduct(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ success: true });
  });

  // --- Sellers API ---
  app.get('/api/sellers', (req, res) => {
    const sellers = dbInstance.getSellers().map(({ password: _, ...rest }: any) => rest);
    res.json(sellers);
  });

  app.get('/api/sellers/:id', (req, res) => {
    const seller = dbInstance.getSellerById(req.params.id);
    if (!seller) {
      return res.status(404).json({ error: 'Seller not found' });
    }

    // Safely increment visitsCount
    const currentVisits = seller.visitsCount || 0;
    dbInstance.updateSeller(seller.id, { visitsCount: currentVisits + 1 });

    const { password: _, ...safeSeller } = seller as any;
    res.json(safeSeller);
  });

  app.put('/api/sellers/:id', (req, res) => {
    const { name, phone, cartInfo, serviceArea, profilePhoto } = req.body;
    const updated = dbInstance.updateSeller(req.params.id, {
      name,
      phone,
      cartInfo,
      serviceArea,
      profilePhoto
    });

    if (!updated) {
      return res.status(404).json({ error: 'Seller not found' });
    }

    const { password: _, ...safeSeller } = updated as any;
    // Broadcast updates to open maps
    broadcastRealtime('seller_profile_updated', safeSeller);
    res.json({ success: true, seller: safeSeller });
  });

  // Update Products listed by Seller
  app.post('/api/sellers/:id/products', (req, res) => {
    const { products } = req.body; // Array of SellerProduct
    if (!Array.isArray(products)) {
      return res.status(400).json({ error: 'Products array is required' });
    }

    // Enrich and structure before saving
    const enrichedProducts: SellerProduct[] = products.map((p) => ({
      productId: p.productId,
      name: p.name,
      category: p.category,
      price: Number(p.price) || 0,
      unit: p.unit || 'kg',
      isAvailable: p.isAvailable !== false,
      stockStatus: p.stockStatus || 'In Stock',
      lastUpdated: new Date().toISOString()
    }));

    // Find any price change to trigger simulated FCM for customers who favor them
    const seller = dbInstance.getSellerById(req.params.id);
    if (seller) {
      const oldProds = seller.products || [];
      enrichedProducts.forEach((newP) => {
        const oldP = oldProds.find((o) => o.productId === newP.productId);
        if (oldP && oldP.price !== newP.price) {
          // Add notification
          const title = `Price Update from ${seller.name}!`;
          const body = `${newP.name} is now available at ₹${newP.price}/${newP.unit} (was ₹${oldP.price}/${newP.unit}).`;
          dbInstance.addNotification({
            sellerId: seller.id,
            sellerName: seller.name,
            title,
            body,
            type: 'price_update'
          });
          broadcastRealtime('notification_pushed', { title, body, sellerId: seller.id });
        }
      });
    }

    const updated = dbInstance.updateSeller(req.params.id, { products: enrichedProducts });
    if (!updated) {
      return res.status(404).json({ error: 'Seller not found' });
    }

    res.json({ success: true, products: enrichedProducts });
  });

  // Active Toggle Endpoint
  app.post('/api/sellers/:id/active', (req, res) => {
    const { active, location } = req.body;
    const seller = dbInstance.getSellerById(req.params.id);
    if (!seller) {
      return res.status(404).json({ error: 'Seller not found' });
    }

    const isNowActive = Boolean(active);
    const updatePayload: Partial<Seller> = { active: isNowActive };
    if (isNowActive && location) {
      updatePayload.location = location;
      updatePayload.lastLocationUpdate = new Date().toISOString();
    }

    const updated = dbInstance.updateSeller(req.params.id, updatePayload);
    const { password: _, ...safeSeller } = updated as any;

    // Trigger notification if seller went active
    if (isNowActive) {
      const title = `${safeSeller.name} is now Online!`;
      const body = `Catch him in action delivering fresh items around ${safeSeller.serviceArea || 'your area'}.`;
      dbInstance.addNotification({
        sellerId: safeSeller.id,
        sellerName: safeSeller.name,
        title,
        body,
        type: 'activation'
      });
      broadcastRealtime('notification_pushed', { title, body, sellerId: safeSeller.id });
    }

    broadcastRealtime('seller_status_changed', safeSeller);
    res.json({ success: true, seller: safeSeller });
  });

  // Real-time location tracking loop
  app.post('/api/sellers/:id/location', (req, res) => {
    const { location } = req.body;
    if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }

    const updated = dbInstance.updateSeller(req.params.id, {
      location,
      lastLocationUpdate: new Date().toISOString()
    });

    if (!updated) {
      return res.status(404).json({ error: 'Seller not found' });
    }

    const { password: _, ...safeSeller } = updated as any;
    broadcastRealtime('seller_location_updated', {
      id: safeSeller.id,
      location: safeSeller.location,
      lastLocationUpdate: safeSeller.lastLocationUpdate
    });

    res.json({ success: true, location: safeSeller.location });
  });

  // Customer Writes Reviews
  app.post('/api/sellers/:id/reviews', (req, res) => {
    const { customerName, rating, comment } = req.body;
    if (!customerName || !rating || !comment) {
      return res.status(400).json({ error: 'customerName, rating, and comment are required' });
    }

    const seller = dbInstance.getSellerById(req.params.id);
    if (!seller) {
      return res.status(404).json({ error: 'Seller not found' });
    }

    const newReview: Review = {
      id: `rev_${Date.now()}`,
      customerName: customerName.trim(),
      rating: Math.min(5, Math.max(1, Number(rating) || 5)),
      comment: comment.trim(),
      createdAt: new Date().toISOString()
    };

    const reviews = [...(seller.reviews || []), newReview];
    const updated = dbInstance.updateSeller(req.params.id, { reviews });

    const { password: _, ...safeSeller } = updated as any;
    res.status(201).json({ success: true, review: newReview, avgRating: safeSeller.avgRating, ratingsCount: safeSeller.ratingsCount });
  });

  // Customer Interactions click tracker (calls / directions)
  app.post('/api/sellers/:id/interact', (req, res) => {
    const seller = dbInstance.getSellerById(req.params.id);
    if (!seller) {
      return res.status(404).json({ error: 'Seller not found' });
    }

    const currentCount = seller.interactionCount || 0;
    dbInstance.updateSeller(seller.id, { interactionCount: currentCount + 1 });
    res.json({ success: true, interactionCount: currentCount + 1 });
  });

  // Admin Suspension Override
  app.post('/api/admin/sellers/:id/toggle-suspend', (req, res) => {
    const seller = dbInstance.getSellerById(req.params.id);
    if (!seller) {
      return res.status(404).json({ error: 'Seller not found' });
    }

    // Toggle suspended property
    const isSuspended = !(seller as any).suspended;
    const activeState = isSuspended ? false : seller.active; // force offline if suspended

    dbInstance.updateSeller(seller.id, { suspended: isSuspended, active: activeState } as any);

    // Broadcast state to empty from customer map
    const updated = dbInstance.getSellerById(seller.id);
    broadcastRealtime('seller_status_changed', updated);

    res.json({ success: true, suspended: isSuspended, seller: updated });
  });

  // System Notifications
  app.get('/api/notifications', (req, res) => {
    res.json(dbInstance.getNotifications());
  });

  // Client Feedback endpoint - Prints to admin server terminal console & saves to DB
  app.post('/api/feedback', (req, res) => {
    const { name, description } = req.body;
    if (!name || !description) {
      return res.status(400).json({ error: 'Name and description are required' });
    }

    console.log('\n======================================================================');
    console.log('📬 [NEW CUSTOMER FEEDBACK SUBMITTED FOR THE ADMIN TERMINAL]');
    console.log(`👤 Name / नाम: ${name.trim()}`);
    console.log(`📝 Description / विवरण: ${description.trim()}`);
    console.log(`⏰ Time / समय: ${new Date().toLocaleString()}`);
    console.log('======================================================================\n');

    const feedback = dbInstance.addFeedback({
      name: name.trim(),
      description: description.trim()
    });

    // Notify connected administrative clients via SSE
    broadcastRealtime('feedback_submitted', feedback);

    res.status(200).json({ success: true, message: 'Feedback logged to terminal and database.', feedback });
  });

  // Fetch all customer feedbacks (Admin Only role)
  app.get('/api/admin/feedbacks', (req, res) => {
    res.json(dbInstance.getFeedbacks());
  });

  // Delete specific customer feedback
  app.delete('/api/admin/feedbacks/:id', (req, res) => {
    const deleted = dbInstance.deleteFeedback(req.params.id);
    if (deleted) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Feedback not found' });
    }
  });

  app.post('/api/admin/announcement', (req, res) => {
    const { title, body } = req.body;
    if (!title || !body) {
      return res.status(400).json({ error: 'Title and body are required' });
    }

    const announcement = dbInstance.addNotification({
      title,
      body,
      type: 'announcement'
    });

    broadcastRealtime('notification_pushed', announcement);
    res.status(201).json({ success: true, announcement });
  });

  // Settings
  app.get('/api/settings', (req, res) => {
    res.json(dbInstance.getSettings());
  });

  app.put('/api/admin/settings', (req, res) => {
    const { searchRadiusKm, allowSelfRegistration } = req.body;
    const settings = dbInstance.updateSettings({
      searchRadiusKm: Number(searchRadiusKm) || 5,
      allowSelfRegistration: allowSelfRegistration !== false
    });
    res.json({ success: true, settings });
  });

  // --- GEMINI REST API Endpoints ---
  app.post('/api/ai/pitch', async (req, res) => {
    const { cartInfo, serviceArea, products } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.json({
        text: `🍎 Welcome to our fresh market stall! Operating in ${serviceArea || 'your neighborhood'}, we carry high-quality fruits & vegetables. Visit today for the best prices!`
      });
    }

    try {
      const itemsList = Array.isArray(products)
        ? products.map((p: any) => `${p.name} at ₹${p.price}/${p.unit}`).join(', ')
        : 'Fresh seasonal items';

      const prompt = `Write a short, persuasive, friendly 2-sentence micro-sales pitch in English (with Hindi keywords if helpful) for a mobile street vegetable and fruit cart seller.
      Cart Info: "${cartInfo || 'Hand cart with fresh produce'}".
      Service Area: "${serviceArea || 'Local streets'}".
      Current Offerings: [${itemsList}].
      Keep it high excitement, appealing for local shoppers. Use a matching emoji!`;

      const aiResponse = await generateContentWithFallback(ai, {
        model: 'gemini-3.5-flash',
        contents: prompt
      });

      res.json({ text: aiResponse.text?.trim() });
    } catch (e: any) {
      console.error('Error generating AI pitch:', e);
      res.json({
        text: `🥬 Fresh, organic produce is arriving in ${serviceArea || 'your area'}! Featuring high-quality ingredients, customized pricing, and smiling service.`
      });
    }
  });

  app.post('/api/ai/summarize-reviews', async (req, res) => {
    const { reviews } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.json({
        summary: 'Excellent overall feedback! Customers appreciate the high quality of vegetables, accurate weighing scales, and consistent customer service.'
      });
    }

    if (!Array.isArray(reviews) || reviews.length === 0) {
      return res.json({ summary: 'No customer reviews available yet to summarize.' });
    }

    try {
      const formattedReviews = reviews.map((r: any, idx: number) => `Review #${idx+1}: [${r.rating}/5 stars] "${r.comment}" - by ${r.customerName}`).join('\n');
      const prompt = `Summarize the following customer reviews for a fruit and vegetable cart seller in one clear, concise, objective paragraph (maximum 3 sentences).
Highlight what customers love most, any specific items mentioned, and potential areas of excellence. Keep it professional.
Reviews:
${formattedReviews}`;

      const aiResponse = await generateContentWithFallback(ai, {
        model: 'gemini-3.5-flash',
        contents: prompt
      });

      res.json({ summary: aiResponse.text?.trim() });
    } catch (e: any) {
      console.error('Error summarizing reviews:', e);
      res.json({
        summary: 'Highly recommended! Neighbors praise the produce’s freshness, reasonable catalog and polite demeanor.'
      });
    }
  });

  // In production, serve the built frontend. In dev, Vite runs separately on port 5173.
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Wait for MongoDB to connect and load all data BEFORE accepting any requests
  console.log('⏳ Waiting for database to be ready...');
  await dbInstance.ready;
  console.log('✅ Database ready. Starting HTTP server...');

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 CartLive server running on Port ${PORT}`);
  });
}

startServer();
