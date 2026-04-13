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

import { 
  initializeApp as initializeClientApp, 
  getApp as getClientApp, 
  getApps as getClientApps 
} from 'firebase/app';
import { 
  getFirestore as getClientFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc,
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  serverTimestamp,
  FieldValue,
  Timestamp
} from 'firebase/firestore';

// Initialize Firebase Admin
let db: any = null;
let activeDbId: string | null = null;

const logs: string[] = [];
function log(msg: string) {
  const timestamp = new Date().toISOString();
  const formattedMsg = `[${timestamp}] ${msg}`;
  console.log(formattedMsg);
  logs.push(formattedMsg);
  try {
    fs.appendFileSync('init_logs.txt', formattedMsg + '\n');
  } catch (e) {}
}

async function getDb() {
  if (db) return db;
  
  const dbId = firebaseConfig.firestoreDatabaseId;
  const projectId = firebaseConfig.projectId;
  
  log(`[getDb] Starting initialization. Project: ${projectId}, Database: ${dbId}`);
  
  try {
    log(`[getDb] Initializing Client SDK Firestore for project: ${projectId}, database: ${dbId}`);
    const clientApp = getClientApps().length > 0 
      ? getClientApp() 
      : initializeClientApp(firebaseConfig);
    const clientDb = getClientFirestore(clientApp, dbId);
    
    // Create a shim to mimic Admin SDK API
    db = {
      collection: (path: string) => {
        const colRef = collection(clientDb, path);
        return {
          add: (data: any) => addDoc(colRef, data),
          doc: (id?: string) => {
            const docRef = id ? doc(clientDb, path, id) : doc(colRef);
            return {
              id: docRef.id,
              set: (data: any, options?: any) => setDoc(docRef, data, options),
              update: (data: any) => updateDoc(docRef, data),
              delete: () => deleteDoc(docRef),
              get: async () => {
                const snap = await getDoc(docRef);
                return {
                  exists: snap.exists(),
                  id: snap.id,
                  data: () => snap.data(),
                  get: (field: string) => snap.get(field)
                };
              }
            };
          },
          get: async () => {
            const snap = await getDocs(colRef);
            return {
              size: snap.size,
              empty: snap.empty,
              docs: snap.docs.map(d => ({
                id: d.id,
                data: () => d.data(),
                get: (f: string) => d.get(f)
              })),
              forEach: (cb: any) => snap.docs.forEach(d => cb({
                id: d.id,
                data: () => d.data(),
                get: (f: string) => d.get(f)
              }))
            };
          },
          where: (field: string, op: any, value: any) => {
            let q = query(colRef, where(field, op, value));
            const queryWrapper = (currentQ: any) => ({
              orderBy: (f: string, d: any = 'asc') => queryWrapper(query(currentQ, orderBy(f, d))),
              limit: (n: number) => queryWrapper(query(currentQ, limit(n))),
              get: async () => {
                const snap = await getDocs(currentQ);
                return {
                  size: snap.size,
                  empty: snap.empty,
                  docs: snap.docs.map(d => ({
                    id: d.id,
                    data: () => d.data(),
                    get: (f: string) => d.get(f)
                  })),
                  forEach: (cb: any) => snap.docs.forEach(d => cb({
                    id: d.id,
                    data: () => d.data(),
                    get: (f: string) => d.get(f)
                  }))
                };
              }
            });
            return queryWrapper(q);
          },
          orderBy: (field: string, dir: any = 'asc') => {
            let q = query(colRef, orderBy(field, dir));
            const queryWrapper = (currentQ: any) => ({
              where: (f: string, o: any, v: any) => queryWrapper(query(currentQ, where(f, o, v))),
              limit: (n: number) => queryWrapper(query(currentQ, limit(n))),
              get: async () => {
                const snap = await getDocs(currentQ);
                return {
                  size: snap.size,
                  empty: snap.empty,
                  docs: snap.docs.map(d => ({
                    id: d.id,
                    data: () => d.data(),
                    get: (f: string) => d.get(f)
                  })),
                  forEach: (cb: any) => snap.docs.forEach(d => cb({
                    id: d.id,
                    data: () => d.data(),
                    get: (f: string) => d.get(f)
                  }))
                };
              }
            });
            return queryWrapper(q);
          },
          limit: (n: number) => {
            let q = query(colRef, limit(n));
            const queryWrapper = (currentQ: any) => ({
              where: (f: string, o: any, v: any) => queryWrapper(query(currentQ, where(f, o, v))),
              orderBy: (f: string, d: any = 'asc') => queryWrapper(query(currentQ, orderBy(f, d))),
              get: async () => {
                const snap = await getDocs(currentQ);
                return {
                  size: snap.size,
                  empty: snap.empty,
                  docs: snap.docs.map(d => ({
                    id: d.id,
                    data: () => d.data(),
                    get: (f: string) => d.get(f)
                  })),
                  forEach: (cb: any) => snap.docs.forEach(d => cb({
                    id: d.id,
                    data: () => d.data(),
                    get: (f: string) => d.get(f)
                  }))
                };
              }
            });
            return queryWrapper(q);
          }
        };
      }
    };
    
    activeDbId = dbId;
    
    // Health check
    log(`[getDb] Running health check on ${dbId}...`);
    const snapshot = await db.collection('health_check').limit(1).get();
    log(`[getDb] Health check success for ${dbId}. Found ${snapshot.size} docs.`);
    
    return db;
  } catch (e: any) {
    log(`[getDb] Initialization of Client SDK Firestore failed: ${e.message}`);
    throw e;
  }
}

async function startServer() {
  try {
    log('Environment Check: ' + JSON.stringify({
      K_SERVICE: process.env.K_SERVICE,
      GOOGLE_CLOUD_PROJECT: process.env.GOOGLE_CLOUD_PROJECT,
      NODE_ENV: process.env.NODE_ENV
    }));
    
    const originalProject = process.env.GOOGLE_CLOUD_PROJECT;
    
    if (admin.apps.length === 0) {
      log('Initializing Firebase Admin with default credentials');
      admin.initializeApp();
    }
    
    // Initial DB connection
    await getDb();
    
    if (db) {
      try {
        await db.collection('health_check').doc('startup').set({
          timestamp: Timestamp.now(),
          message: 'Server started'
        }, { merge: true });
        log(`Successfully verified Firestore connection to ${activeDbId} and wrote startup log`);
        
        // Write success file
        fs.writeFileSync('firestore_success.json', JSON.stringify({
          status: 'success',
          database: activeDbId,
          timestamp: new Date().toISOString()
        }, null, 2));
      } catch (e: any) {
        log(`Initial Firestore verification write failed for ${activeDbId}: ${e.message}`);
        
        // Write failure file
        fs.writeFileSync('firestore_success.json', JSON.stringify({
          status: 'failure',
          database: activeDbId,
          error: e.message,
          code: e.code,
          timestamp: new Date().toISOString()
        }, null, 2));
      }
    }
  } catch (error) {
    console.error('Firebase Admin initialization failed:', error);
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
  app.get('/api/health', async (req, res) => {
    const dbStatus = db ? 'Initialized' : 'Not Initialized';
    let connectionStatus = 'Unknown';
    let error = null;
    
    if (db) {
      try {
        await db.collection('health_check').limit(1).get();
        connectionStatus = 'Connected';
      } catch (e: any) {
        connectionStatus = 'Failed';
        error = e.message;
      }
    }
    
    res.json({ 
      status: 'ok', 
      firebase: {
        projectId: firebaseConfig.projectId,
        databaseId: firebaseConfig.firestoreDatabaseId || '(default)',
        dbStatus,
        connectionStatus,
        error
      }
    });
  });

  // WooCommerce API Proxy
  app.get('/api/woocommerce/orders', async (req, res) => {
    try {
      const database = await getDb();
      if (!database) {
        return res.status(503).json({ error: 'Firebase Admin not initialized' });
      }
      const companySettings = await database.collection('settings').doc('company').get();
      const settings = companySettings.data();

      if (!settings?.wooUrl || !settings?.wooConsumerKey || !settings?.wooConsumerSecret) {
        return res.status(400).json({ error: 'WooCommerce settings not configured' });
      }

      const { wooUrl: rawWooUrl, wooConsumerKey, wooConsumerSecret } = settings;
      
      // Sanitize URL: remove trailing slash and ensure https
      let wooUrl = rawWooUrl.trim().replace(/\/+$/, '');
      if (!wooUrl.startsWith('http')) {
        wooUrl = `https://${wooUrl}`;
      }

      const { page = 1, per_page = 10, status, search } = req.query;

      const response = await axios.get(`${wooUrl}/wp-json/wc/v3/orders`, {
        params: {
          page,
          per_page,
          status,
          search
        },
        auth: {
          username: wooConsumerKey,
          password: wooConsumerSecret
        }
      });

      res.json({
        orders: response.data,
        totalPages: response.headers['x-wp-totalpages'],
        totalOrders: response.headers['x-wp-total']
      });
    } catch (error: any) {
      const errorData = error.response?.data;
      console.error('WooCommerce API Error:', {
        message: error.message,
        data: errorData,
        status: error.response?.status
      });
      res.status(error.response?.status || 500).json({ 
        error: error.message,
        details: errorData?.message || 'No additional details'
      });
    }
  });

  app.get('/api/woocommerce/products', async (req, res) => {
    try {
      const database = await getDb();
      if (!database) return res.status(503).json({ error: 'Firebase Admin not initialized' });
      const companySettings = await database.collection('settings').doc('company').get();
      const settings = companySettings.data();

      if (!settings?.wooUrl || !settings?.wooConsumerKey || !settings?.wooConsumerSecret) {
        return res.status(400).json({ error: 'WooCommerce settings not configured' });
      }

      const { wooUrl: rawWooUrl, wooConsumerKey, wooConsumerSecret } = settings;
      
      // Sanitize URL: remove trailing slash and ensure https
      let wooUrl = rawWooUrl.trim().replace(/\/+$/, '');
      if (!wooUrl.startsWith('http')) {
        wooUrl = `https://${wooUrl}`;
      }

      const { page = 1, per_page = 20, search } = req.query;

      const response = await axios.get(`${wooUrl}/wp-json/wc/v3/products`, {
        params: {
          page,
          per_page,
          search
        },
        auth: {
          username: wooConsumerKey,
          password: wooConsumerSecret
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

  app.put('/api/woocommerce/orders/:id', async (req, res) => {
    try {
      const database = await getDb();
      if (!database) return res.status(503).json({ error: 'Firebase Admin not initialized' });
      const companySettings = await database.collection('settings').doc('company').get();
      const settings = companySettings.data();

      if (!settings?.wooUrl || !settings?.wooConsumerKey || !settings?.wooConsumerSecret) {
        return res.status(400).json({ error: 'WooCommerce settings not configured' });
      }

      const { wooUrl: rawWooUrl, wooConsumerKey, wooConsumerSecret } = settings;
      
      // Sanitize URL: remove trailing slash and ensure https
      let wooUrl = rawWooUrl.trim().replace(/\/+$/, '');
      if (!wooUrl.startsWith('http')) {
        wooUrl = `https://${wooUrl}`;
      }

      const { id } = req.params;
      const { status } = req.body;

      // Try standard REST API first
      try {
        const response = await axios.post(`${wooUrl}/wp-json/wc/v3/orders/${id}`, {
          status,
          _method: 'PUT'
        }, {
          auth: {
            username: wooConsumerKey,
            password: wooConsumerSecret
          }
        });
        return res.json(response.data);
      } catch (error: any) {
        // If it's an HTML response, it might be a permalink issue
        const isHtml = typeof error.response?.data === 'string' && error.response.data.includes('<!DOCTYPE html>');
        
        if (isHtml || error.response?.status === 404 || error.response?.status === 405 || error.response?.status === 401) {
          // Try fallback for non-pretty permalinks
          try {
            const fallbackResponse = await axios.post(`${wooUrl}/index.php`, {
              status,
              _method: 'PUT'
            }, {
              params: {
                rest_route: `/wc/v3/orders/${id}`
              },
              auth: {
                username: wooConsumerKey,
                password: wooConsumerSecret
              }
            });
            return res.json(fallbackResponse.data);
          } catch (fallbackError: any) {
            const fallbackIsHtml = typeof fallbackError.response?.data === 'string' && fallbackError.response.data.includes('<!DOCTYPE html>');
            if (fallbackIsHtml) {
              throw new Error('WooCommerce returned an HTML response. Please ensure REST API is enabled and your URL is correct.');
            }
            throw fallbackError;
          }
        }
        throw error;
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error('WooCommerce Status Update Error:', errorMessage);
      res.status(error.response?.status || 500).json({ 
        error: errorMessage,
        details: typeof error.response?.data === 'string' && error.response.data.includes('<!DOCTYPE html>') 
          ? 'Received HTML instead of JSON. Check WooCommerce permalink settings.' 
          : undefined
      });
    }
  });

  // Webhook endpoint for WooCommerce
  app.post('/api/webhooks/woocommerce/order-updated', async (req, res) => {
    try {
      const database = await getDb();
      if (!database) return res.status(503).json({ error: 'Firebase Admin not initialized' });
      const order = req.body;
      console.log('WooCommerce Webhook received for order:', order.id);

      // Log the webhook
      await database.collection('woocommerce_logs').add({
        type: 'webhook',
        orderId: order.id.toString(),
        status: order.status,
        timestamp: serverTimestamp()
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
      const database = await getDb();
      if (!database) {
        console.error('Firebase Admin not initialized');
        return res.status(503).json({ error: 'Firebase Admin not initialized' });
      }
      
      let snapshot;
      try {
        snapshot = await database.collection('courier_configs').get();
      } catch (e: any) {
        console.error(`Fetch failed on ${activeDbId}. Code: ${e.code}, Message: ${e.message}`);
        // Fallback on NOT_FOUND (5) or PERMISSION_DENIED (7)
        if (e.code === 5 || e.code === 7 || e.message?.includes('NOT_FOUND') || e.message?.includes('PERMISSION_DENIED')) {
          console.error(`Database ${activeDbId} issue (Code ${e.code}), attempting fallback to (default)`);
          db = getFirestore(admin.app());
          activeDbId = '(default)';
          try {
            snapshot = await db.collection('courier_configs').get();
          } catch (fallbackErr: any) {
            console.error(`Fallback to (default) also failed. Code: ${fallbackErr.code}, Message: ${fallbackErr.message}`);
            throw fallbackErr;
          }
        } else {
          throw e;
        }
      }

      const configs: any = {};
      snapshot.forEach(doc => {
        const data = doc.data();
        // Mask sensitive data in logs
        const maskedData = { ...data, apiKey: '***', secretKey: '***', clientSecret: '***', password: '***' };
        console.log(`Found config for ${doc.id}:`, maskedData);
        configs[doc.id] = data;
      });
      
      console.log(`Returning all courier configs from ${activeDbId}`);
      res.json(configs);
    } catch (error: any) {
      console.error(`Error fetching courier configs (DB: ${activeDbId || 'Unknown'}):`, error);
      res.status(500).json({ error: `Firestore Error (DB: ${activeDbId || 'Unknown'}): ${error.message}` });
    }
  });

  app.post('/api/couriers/configs/:courier', async (req, res) => {
    console.log(`POST /api/couriers/configs/${req.params.courier} hit`);
    try {
      const database = await getDb();
      if (!database) {
        console.error('Firebase Admin not initialized');
        return res.status(503).json({ error: 'Firebase Admin not initialized' });
      }
      const { courier } = req.params;
      const config = req.body;
      console.log(`Saving config for ${courier}:`, { ...config, apiKey: '***', secretKey: '***', clientSecret: '***', password: '***' });
      
      try {
        await database.collection('courier_configs').doc(courier.toLowerCase()).set({
          ...config,
          updatedAt: serverTimestamp()
        }, { merge: true });
      } catch (e: any) {
        if (e.code === 5 || e.message?.includes('NOT_FOUND')) {
          console.error(`Database ${activeDbId} not found during save, attempting fallback to (default)`);
          db = getFirestore(admin.app());
          activeDbId = '(default)';
          await db.collection('courier_configs').doc(courier.toLowerCase()).set({
            ...config,
            updatedAt: serverTimestamp()
          }, { merge: true });
        } else {
          throw e;
        }
      }
      
      console.log(`Successfully saved config for ${courier} to ${activeDbId}`);
      res.json({ success: true });
    } catch (error: any) {
      console.error(`Error saving config for ${req.params.courier} (DB: ${activeDbId || 'Unknown'}):`, error);
      res.status(500).json({ error: `Firestore Error (DB: ${activeDbId || 'Unknown'}): ${error.message}` });
    }
  });

  app.post('/api/couriers/order', async (req, res) => {
    try {
      const database = await getDb();
      if (!database) return res.status(503).json({ error: 'Firebase Admin not initialized' });
      const { courier, orderData } = req.body;

      // Get courier config
      const configDoc = await database.collection('courier_configs').doc(courier.toLowerCase()).get();
      if (!configDoc.exists || !configDoc.data()?.isActive) {
        return res.status(400).json({ error: `Courier ${courier} is not active or configured.` });
      }

      const config = configDoc.data();
      const adapter = CourierFactory.getAdapter(courier, config);
      
      const result = await adapter.createOrder(orderData);

      // Log the request
      await database.collection('courier_logs').add({
        courier,
        orderId: orderData.invoice,
        request: orderData,
        response: result,
        status: 'success',
        timestamp: serverTimestamp()
      });

      res.json(result);
    } catch (error: any) {
      console.error('Courier Order Error:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/couriers/send-order/:courier', async (req, res) => {
    console.log(`POST /api/couriers/send-order/${req.params.courier} hit`);
    try {
      const database = await getDb();
      if (!database) return res.status(503).json({ error: 'Firebase Admin not initialized' });
      const { courier } = req.params;
      const orderData = req.body;

      // Get courier config
      const configDoc = await database.collection('courier_configs').doc(courier.toLowerCase()).get();
      if (!configDoc.exists || !configDoc.data()?.isActive) {
        return res.status(400).json({ error: `Courier ${courier} is not active or configured.` });
      }

      const config = configDoc.data();
      const adapter = CourierFactory.getAdapter(courier, config);
      
      // Map Logistics.tsx fields to CourierOrderData if necessary
      // Logistics.tsx sends: invoice, recipient_name, recipient_phone, recipient_address, cod_amount, note, district, area, weight
      const mappedData: CourierOrderData = {
        customer_name: orderData.recipient_name,
        customer_phone: orderData.recipient_phone,
        customer_address: orderData.recipient_address,
        amount: orderData.cod_amount,
        cod_amount: orderData.cod_amount,
        note: orderData.note,
        weight: orderData.weight,
        invoice: orderData.invoice,
        // Include location IDs for Pathao/Carrybee
        recipient_city: orderData.recipient_city,
        recipient_zone: orderData.recipient_zone,
        recipient_area: orderData.recipient_area
      } as any;

      const result = await adapter.createOrder(mappedData);

      // Log the request
      await database.collection('courier_logs').add({
        courier,
        orderId: orderData.invoice,
        request: orderData,
        response: result,
        status: 'success',
        timestamp: serverTimestamp()
      });

      res.json(result);
    } catch (error: any) {
      console.error(`Courier Send Order Error (${req.params.courier}):`, error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/couriers/balance/:courier', async (req, res) => {
    try {
      const database = await getDb();
      if (!database) return res.status(503).json({ error: 'Firebase Admin not initialized' });
      const { courier } = req.params;
      
      const configDoc = await database.collection('courier_configs').doc(courier.toLowerCase()).get();
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

  app.get('/api/couriers/cities/:courier', async (req, res) => {
    try {
      const database = await getDb();
      if (!database) return res.status(503).json({ error: 'Firebase Admin not initialized' });
      const { courier } = req.params;
      const configDoc = await database.collection('courier_configs').doc(courier.toLowerCase()).get();
      if (!configDoc.exists || !configDoc.data()?.isActive) {
        return res.status(400).json({ error: `Courier ${courier} is not active.` });
      }
      const adapter = CourierFactory.getAdapter(courier, configDoc.data());
      const result = await adapter.getCities();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/couriers/zones/:courier/:cityId', async (req, res) => {
    try {
      const database = await getDb();
      if (!database) return res.status(503).json({ error: 'Firebase Admin not initialized' });
      const { courier, cityId } = req.params;
      const configDoc = await database.collection('courier_configs').doc(courier.toLowerCase()).get();
      const adapter = CourierFactory.getAdapter(courier, configDoc.data());
      const result = await adapter.getZones(cityId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/couriers/areas/:courier/:zoneId', async (req, res) => {
    try {
      const database = await getDb();
      if (!database) return res.status(503).json({ error: 'Firebase Admin not initialized' });
      const { courier, zoneId } = req.params;
      const { cityId } = req.query;
      const configDoc = await database.collection('courier_configs').doc(courier.toLowerCase()).get();
      const adapter = CourierFactory.getAdapter(courier, configDoc.data());
      if ((adapter as any).getAreas) {
        const result = await (adapter as any).getAreas(zoneId, cityId);
        res.json(result);
      } else {
        res.status(400).json({ error: 'Areas not supported for this courier' });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/couriers/check-fraud/:phone', async (req, res) => {
    try {
      const database = await getDb();
      if (!database) {
        console.error('Fraud Check: Firebase Admin not initialized');
        return res.status(503).json({ error: 'Firebase Admin not initialized' });
      }
      
      const { phone } = req.params;
      console.log(`Fraud check requested for: ${phone}`);

      let snapshot;
      try {
        // Find first active courier with checkFraud capability
        snapshot = await database.collection('courier_configs').where('isActive', '==', true).get();
      } catch (dbError: any) {
        console.error('Fraud Check DB Error:', dbError.message);
        // If the collection or database is not found, treat it as no active couriers
        if (dbError.code === 5 || dbError.message?.includes('NOT_FOUND')) {
          return res.json({ 
            message: 'No active courier found (collection or database missing)',
            data: { total_delivered: 0, total_cancelled: 0, courier: 'None' }
          });
        }
        throw dbError;
      }
      
      if (!snapshot || snapshot.empty) {
        console.log('No active couriers found in DB');
        return res.json({ 
          message: 'No active courier found',
          data: { total_delivered: 0, total_cancelled: 0, courier: 'None' }
        });
      }

      for (const doc of snapshot.docs) {
        const config = doc.data();
        const courierName = doc.id;
        console.log(`Checking fraud with courier: ${courierName}`);
        
        try {
          const adapter = CourierFactory.getAdapter(courierName, config);

          if (adapter.checkFraud) {
            const result = await adapter.checkFraud(phone);
            const logMsg = `Fraud check result from ${courierName} for ${phone}: ${JSON.stringify(result)}`;
            console.log(logMsg);
            try {
              fs.appendFileSync('courier_debug.txt', logMsg + '\n');
            } catch (e) {}
            return res.json({
              courier: courierName,
              data: result
            });
          }
        } catch (adapterError: any) {
          console.error(`Error with adapter ${courierName}:`, adapterError.message);
          // Continue to next courier if one fails
        }
      }

      res.status(400).json({ error: 'No active courier supports fraud check' });
    } catch (error: any) {
      console.error('Fraud Check Final Error:', error.message);
      res.status(500).json({ 
        error: error.message,
        data: { total_delivered: 0, total_cancelled: 0, courier: 'Error' }
      });
    }
  });

  app.get('/api/couriers/track/:courier/:trackingCode', async (req, res) => {
    try {
      const database = await getDb();
      if (!database) return res.status(503).json({ error: 'Firebase Admin not initialized' });
      const { courier, trackingCode } = req.params;
      
      const configDoc = await database.collection('courier_configs').doc(courier.toLowerCase()).get();
      if (!configDoc.exists || !configDoc.data()?.isActive) {
        return res.status(400).json({ error: `Courier ${courier} is not active or configured.` });
      }

      const config = configDoc.data();
      const adapter = CourierFactory.getAdapter(courier, config);
      
      const result = await adapter.trackOrder(trackingCode);
      res.json(result);
    } catch (error: any) {
      console.error(`Courier Track Error (${req.params.courier}):`, error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // 404 for API routes
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: `API route ${req.method} ${req.url} not found` });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    console.log('Starting server in DEVELOPMENT mode');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('Starting server in PRODUCTION mode');
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
