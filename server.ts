import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import cors from 'cors';
import { CourierFactory, CourierOrderData } from './src/lib/courierAdapters';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Firebase Config
const firebaseConfig = JSON.parse(fs.readFileSync(path.join(__dirname, 'firebase-applet-config.json'), 'utf8'));

// Initialize Firebase Admin
let db: admin.firestore.Firestore | null = null;

async function startServer() {
  try {
    process.env.GOOGLE_CLOUD_PROJECT = firebaseConfig.projectId;
    
    if (admin.apps.length === 0) {
      console.log('Initializing Firebase Admin with project ID:', firebaseConfig.projectId);
      admin.initializeApp({
        projectId: firebaseConfig.projectId
      });
    }
    const adminApp = admin.app();
    console.log('Firebase Admin initialized. App name:', adminApp.name);
    
    const dbId = firebaseConfig.firestoreDatabaseId;
    console.log('Target Firestore database ID:', dbId || '(default)');
    
    if (dbId) {
      try {
        console.log(`Attempting to connect to named database: ${dbId}`);
        db = getFirestore(adminApp, dbId);
        // Verify connection with a simple read
        const testSnap = await db.collection('health_check').limit(1).get();
        console.log(`Successfully connected to database: ${dbId}. Read test size: ${testSnap.size}`);
      } catch (e: any) {
        console.warn(`Connection to database ${dbId} failed: ${e.message}`);
        if (e.code === 7 || e.message.includes('permission')) {
          console.error('CRITICAL: Permission denied for named database. This usually means the service account lacks access.');
        }
        console.log('Falling back to (default) database...');
        db = getFirestore(adminApp);
      }
    } else {
      db = getFirestore(adminApp);
    }

    if (db) {
      try {
        await db.collection('health_check').limit(1).get();
        console.log('Successfully verified Firestore connection');
        
        await db.collection('health_check').doc('startup').set({
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          message: 'Server started'
        });
        console.log('Successfully wrote to health_check collection');
      } catch (e: any) {
        console.error('Firestore verification failed:', e.message);
      }
    }
  } catch (error) {
    console.error('Firebase Admin initialization failed:', error);
    console.log('Server will continue without Firebase Admin features (WooCommerce sync will be disabled)');
  }

  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Test route
  app.get('/api/test', (req, res) => {
    res.json({ message: 'API is working' });
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // WooCommerce API Proxy
  app.get('/api/woocommerce/orders', async (req, res) => {
    try {
      if (!db) {
        return res.status(503).json({ error: 'Firebase Admin not initialized' });
      }
      const companySettings = await db.collection('settings').doc('company').get();
      const settings = companySettings.data();

      if (!settings?.wooUrl || !settings?.wooConsumerKey || !settings?.wooConsumerSecret) {
        return res.status(400).json({ error: 'WooCommerce settings not configured' });
      }

      const { wooUrl, wooConsumerKey, wooConsumerSecret } = settings;
      const { page = 1, per_page = 10, status, search } = req.query;

      const response = await axios.get(`${wooUrl}/wp-json/wc/v3/orders`, {
        params: {
          consumer_key: wooConsumerKey,
          consumer_secret: wooConsumerSecret,
          page,
          per_page,
          status,
          search
        }
      });

      res.json({
        orders: response.data,
        totalPages: response.headers['x-wp-totalpages'],
        totalOrders: response.headers['x-wp-total']
      });
    } catch (error: any) {
      console.error('WooCommerce API Error:', error.message);
      res.status(error.response?.status || 500).json({ error: error.message });
    }
  });

  app.get('/api/woocommerce/products', async (req, res) => {
    try {
      if (!db) return res.status(503).json({ error: 'Firebase Admin not initialized' });
      const companySettings = await db.collection('settings').doc('company').get();
      const settings = companySettings.data();

      if (!settings?.wooUrl || !settings?.wooConsumerKey || !settings?.wooConsumerSecret) {
        return res.status(400).json({ error: 'WooCommerce settings not configured' });
      }

      const { wooUrl, wooConsumerKey, wooConsumerSecret } = settings;
      const { page = 1, per_page = 20, search } = req.query;

      const response = await axios.get(`${wooUrl}/wp-json/wc/v3/products`, {
        params: {
          consumer_key: wooConsumerKey,
          consumer_secret: wooConsumerSecret,
          page,
          per_page,
          search
        }
      });

      res.json({
        products: response.data,
        totalPages: response.headers['x-wp-totalpages'],
        totalProducts: response.headers['x-wp-total']
      });
    } catch (error: any) {
      res.status(error.response?.status || 500).json({ error: error.message });
    }
  });

  // Webhook endpoint for WooCommerce
  app.post('/api/webhooks/woocommerce/order-updated', async (req, res) => {
    try {
      if (!db) return res.status(503).json({ error: 'Firebase Admin not initialized' });
      const order = req.body;
      console.log('WooCommerce Webhook received for order:', order.id);

      // Log the webhook
      await db.collection('woocommerce_logs').add({
        type: 'webhook',
        orderId: order.id.toString(),
        status: order.status,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });

      res.status(200).send('Webhook processed');
    } catch (error: any) {
      console.error('Webhook Error:', error.message);
      res.status(500).send('Webhook error');
    }
  });

  // Courier Integration Endpoints
  app.get('/api/couriers/configs', async (req, res) => {
    console.log('GET /api/couriers/configs hit');
    try {
      if (!db) {
        console.error('Firebase Admin not initialized');
        return res.status(503).json({ error: 'Firebase Admin not initialized' });
      }
      console.log(`Using project: ${firebaseConfig.projectId}, database: ${firebaseConfig.firestoreDatabaseId || '(default)'}`);
      const snapshot = await db.collection('courier_configs').get();
      const configs: any = {};
      snapshot.forEach(doc => {
        configs[doc.id] = doc.data();
      });
      console.log('Returning courier configs:', Object.keys(configs));
      res.json(configs);
    } catch (error: any) {
      console.error('Error fetching courier configs:', error);
      res.status(200).json({ 
        error: error.message, 
        code: error.code,
        details: error.details,
        stack: error.stack 
      });
    }
  });

  app.post('/api/couriers/configs/:courier', async (req, res) => {
    try {
      if (!db) return res.status(503).json({ error: 'Firebase Admin not initialized' });
      const { courier } = req.params;
      const config = req.body;
      await db.collection('courier_configs').doc(courier).set({
        ...config,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/couriers/order', async (req, res) => {
    try {
      if (!db) return res.status(503).json({ error: 'Firebase Admin not initialized' });
      const { courier, orderData } = req.body;

      // Get courier config
      const configDoc = await db.collection('courier_configs').doc(courier.toLowerCase()).get();
      if (!configDoc.exists || !configDoc.data()?.isActive) {
        return res.status(400).json({ error: `Courier ${courier} is not active or configured.` });
      }

      const config = configDoc.data();
      const adapter = CourierFactory.getAdapter(courier, config);
      
      const result = await adapter.createOrder(orderData);

      // Log the request
      await db.collection('courier_logs').add({
        courier,
        orderId: orderData.invoice,
        request: orderData,
        response: result,
        status: 'success',
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });

      res.json(result);
    } catch (error: any) {
      console.error('Courier Order Error:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/couriers/balance/:courier', async (req, res) => {
    try {
      if (!db) return res.status(503).json({ error: 'Firebase Admin not initialized' });
      const { courier } = req.params;
      
      const configDoc = await db.collection('courier_configs').doc(courier.toLowerCase()).get();
      if (!configDoc.exists || !configDoc.data()?.isActive) {
        return res.status(400).json({ error: `Courier ${courier} is not active or configured.` });
      }

      const config = configDoc.data();
      const adapter = CourierFactory.getAdapter(courier, config);
      
      if (adapter.getBalance) {
        const result = await adapter.getBalance();
        res.json(result);
      } else {
        res.status(400).json({ error: `Balance check not supported for ${courier}` });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 404 for API routes
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: `API route ${req.method} ${req.url} not found` });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
