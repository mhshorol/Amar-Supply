import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import admin from 'firebase-admin';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
let db: admin.firestore.Firestore | null = null;

async function startServer() {
  try {
    if (admin.apps.length === 0) {
      admin.initializeApp();
    }
    db = admin.firestore();
    console.log('Firebase Admin initialized successfully');
  } catch (error) {
    console.error('Firebase Admin initialization failed:', error);
    console.log('Server will continue without Firebase Admin features (WooCommerce sync will be disabled)');
  }

  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

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
      console.error('WooCommerce API Error:', error.response?.data || error.message);
      res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
    }
  });

  app.put('/api/woocommerce/orders/:id', async (req, res) => {
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
      const { id } = req.params;
      const { status } = req.body;

      const response = await axios.put(`${wooUrl}/wp-json/wc/v3/orders/${id}`, {
        status
      }, {
        params: {
          consumer_key: wooConsumerKey,
          consumer_secret: wooConsumerSecret
        }
      });

      res.json(response.data);
    } catch (error: any) {
      console.error('WooCommerce API Update Error:', error.response?.data || error.message);
      res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
    }
  });

  // Webhook endpoint
  app.post('/api/woocommerce/webhook', async (req, res) => {
    try {
      if (!db) {
        return res.status(503).json({ error: 'Firebase Admin not initialized' });
      }
      const order = req.body;
      console.log('WooCommerce Webhook Received:', order.id, order.status);

      // Store in Firestore
      await db.collection('woocommerce_orders').doc(String(order.id)).set({
        ...order,
        syncedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      // Log the sync
      await db.collection('woocommerce_logs').add({
        type: 'webhook',
        orderId: order.id,
        status: order.status,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });

      res.status(200).send('Webhook processed');
    } catch (error: any) {
      console.error('Webhook Error:', error.message);
      res.status(500).send('Webhook error');
    }
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
