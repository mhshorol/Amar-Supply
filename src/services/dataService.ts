import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy, 
  Timestamp,
  getDocs,
  where
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase';
import { Order, Product, Customer, Transaction } from '../types';

// Mock Data for Demo Mode
const MOCK_ORDERS: Order[] = [
  { 
    id: 'ORD-8421', 
    customerId: 'CUST-001', 
    customerName: 'Rahim Ahmed', 
    customerPhone: '01712345678', 
    customerAddress: 'Dhanmondi, Dhaka', 
    items: [{ productId: 'PROD-001', sku: 'TS-BLK-L', name: 'Premium Black T-Shirt', quantity: 1, price: 1250 }], 
    subtotal: 1250,
    deliveryCharge: 60,
    discount: 0,
    totalAmount: 1310, 
    paidAmount: 0,
    dueAmount: 1310,
    status: 'processing', 
    createdAt: new Date(), 
    updatedAt: new Date(), 
    paymentMethod: 'COD', 
    paymentStatus: 'unpaid', 
    source: 'Facebook' 
  },
  { 
    id: 'ORD-8420', 
    customerId: 'CUST-002', 
    customerName: 'Karim Ullah', 
    customerPhone: '01812345678', 
    customerAddress: 'Gulshan, Dhaka', 
    items: [{ productId: 'PROD-003', sku: 'HD-NVY-XL', name: 'Navy Blue Hoodie', quantity: 2, price: 1700 }], 
    subtotal: 3400,
    deliveryCharge: 0,
    discount: 200,
    totalAmount: 3200, 
    paidAmount: 3200,
    dueAmount: 0,
    status: 'shipped', 
    createdAt: new Date(), 
    updatedAt: new Date(), 
    paymentMethod: 'bKash', 
    paymentStatus: 'paid', 
    source: 'Website' 
  },
];

const MOCK_PRODUCTS: Product[] = [
  { id: 'PROD-001', sku: 'TS-BLK-L', name: 'Premium Black T-Shirt', category: 'Apparel', price: 850, costPrice: 450, stockLevel: 124, reorderPoint: 20, warehouseId: 'Dhaka Main', hasVariants: false },
  { id: 'PROD-002', sku: 'TS-WHT-M', name: 'Premium White T-Shirt', category: 'Apparel', price: 850, costPrice: 450, stockLevel: 12, reorderPoint: 20, warehouseId: 'Dhaka Main', hasVariants: false },
];

const MOCK_CUSTOMERS: Customer[] = [
  { id: 'CUST-001', name: 'Rahim Ahmed', phone: '01712345678', email: 'rahim@example.com', address: 'Dhanmondi, Dhaka', orderCount: 12, totalSpent: 15400, lastOrderDate: new Date() },
];

const MOCK_TRANSACTIONS: Transaction[] = [
  { id: 'TXN-001', orderId: 'ORD-8421', type: 'income', category: 'Sales', amount: 1250, paymentMethod: 'bKash', date: new Date(), description: 'Order Payment' },
];

const MOCK_COURIERS: any[] = [
  { id: 'COUR-001', name: 'Pathao Courier', contact: '09678101010', apiEnabled: true, active: true },
  { id: 'COUR-002', name: 'RedX Delivery', contact: '09612345678', apiEnabled: true, active: true },
  { id: 'COUR-003', name: 'Steadfast', contact: '09678771100', apiEnabled: false, active: true },
];

const MOCK_SHIPMENTS: any[] = [
  { id: 'SHIP-001', orderId: 'ORD-8421', courierId: 'COUR-001', trackingNumber: 'PATH-123456', status: 'in_transit', lastUpdate: new Date() },
];

// Local Storage Keys
const STORAGE_KEYS = {
  ORDERS: 'amarsupply_orders',
  PRODUCTS: 'amarsupply_products',
  CUSTOMERS: 'amarsupply_customers',
  TRANSACTIONS: 'amarsupply_transactions',
  COURIERS: 'amarsupply_couriers',
  SHIPMENTS: 'amarsupply_shipments',
};

// Helper to get data from local storage or mock
const getLocalData = <T>(key: string, mock: T[]): T[] => {
  const stored = localStorage.getItem(key);
  if (stored) return JSON.parse(stored);
  localStorage.setItem(key, JSON.stringify(mock));
  return mock;
};

const saveLocalData = <T>(key: string, data: T[]) => {
  localStorage.setItem(key, JSON.stringify(data));
};

export const dataService = {
  // Orders
  subscribeOrders: (callback: (orders: Order[]) => void) => {
    if (isFirebaseConfigured) {
      const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
      return onSnapshot(q, (snapshot) => {
        const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
        callback(orders);
      }, (error) => {
        if (error.code !== 'permission-denied') {
          console.error("Error subscribing to orders:", error);
        }
      });
    } else {
      const orders = getLocalData(STORAGE_KEYS.ORDERS, MOCK_ORDERS);
      callback(orders);
      return () => {};
    }
  },

  addOrder: async (order: Omit<Order, 'id'>) => {
    if (isFirebaseConfigured) {
      return await addDoc(collection(db, 'orders'), { ...order, createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
    } else {
      const orders = getLocalData(STORAGE_KEYS.ORDERS, MOCK_ORDERS);
      const newOrder = { ...order, id: `ORD-${Math.floor(Math.random() * 10000)}`, createdAt: new Date(), updatedAt: new Date() };
      saveLocalData(STORAGE_KEYS.ORDERS, [newOrder, ...orders]);
      return newOrder;
    }
  },

  updateOrder: async (id: string, updates: Partial<Order>) => {
    if (isFirebaseConfigured) {
      const orderRef = doc(db, 'orders', id);
      return await updateDoc(orderRef, { ...updates, updatedAt: Timestamp.now() });
    } else {
      const orders = getLocalData(STORAGE_KEYS.ORDERS, MOCK_ORDERS);
      const updatedOrders = orders.map(o => o.id === id ? { ...o, ...updates, updatedAt: new Date() } : o);
      saveLocalData(STORAGE_KEYS.ORDERS, updatedOrders);
    }
  },

  // Products
  subscribeProducts: (callback: (products: Product[]) => void) => {
    if (isFirebaseConfigured) {
      const q = query(collection(db, 'products'), orderBy('name', 'asc'));
      return onSnapshot(q, (snapshot) => {
        const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        callback(products);
      }, (error) => {
        if (error.code !== 'permission-denied') {
          console.error("Error subscribing to products:", error);
        }
      });
    } else {
      const products = getLocalData(STORAGE_KEYS.PRODUCTS, MOCK_PRODUCTS);
      callback(products);
      return () => {};
    }
  },

  addProduct: async (product: Omit<Product, 'id'>) => {
    if (isFirebaseConfigured) {
      return await addDoc(collection(db, 'products'), product);
    } else {
      const products = getLocalData(STORAGE_KEYS.PRODUCTS, MOCK_PRODUCTS);
      const newProduct = { ...product, id: `PROD-${Math.floor(Math.random() * 1000)}` };
      saveLocalData(STORAGE_KEYS.PRODUCTS, [newProduct, ...products]);
      return newProduct;
    }
  },

  // Customers
  subscribeCustomers: (callback: (customers: Customer[]) => void) => {
    if (isFirebaseConfigured) {
      const q = query(collection(db, 'customers'), orderBy('name', 'asc'));
      return onSnapshot(q, (snapshot) => {
        const customers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
        callback(customers);
      }, (error) => {
        if (error.code !== 'permission-denied') {
          console.error("Error subscribing to customers:", error);
        }
      });
    } else {
      const customers = getLocalData(STORAGE_KEYS.CUSTOMERS, MOCK_CUSTOMERS);
      callback(customers);
      return () => {};
    }
  },

  addCustomer: async (customer: Omit<Customer, 'id'>) => {
    if (isFirebaseConfigured) {
      return await addDoc(collection(db, 'customers'), customer);
    } else {
      const customers = getLocalData(STORAGE_KEYS.CUSTOMERS, MOCK_CUSTOMERS);
      const newCustomer = { ...customer, id: `CUST-${Math.floor(Math.random() * 1000)}` };
      saveLocalData(STORAGE_KEYS.CUSTOMERS, [newCustomer, ...customers]);
      return newCustomer;
    }
  },

  updateCustomer: async (id: string, updates: Partial<Customer>) => {
    if (isFirebaseConfigured) {
      const customerRef = doc(db, 'customers', id);
      return await updateDoc(customerRef, updates);
    } else {
      const customers = getLocalData(STORAGE_KEYS.CUSTOMERS, MOCK_CUSTOMERS);
      const updatedCustomers = customers.map(c => c.id === id ? { ...c, ...updates } : c);
      saveLocalData(STORAGE_KEYS.CUSTOMERS, updatedCustomers);
    }
  },

  // Couriers
  subscribeCouriers: (callback: (couriers: any[]) => void) => {
    if (isFirebaseConfigured) {
      const q = query(collection(db, 'couriers'), orderBy('name', 'asc'));
      return onSnapshot(q, (snapshot) => {
        const couriers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        callback(couriers);
      }, (error) => {
        if (error.code !== 'permission-denied') {
          console.error("Error subscribing to couriers:", error);
        }
      });
    } else {
      const couriers = getLocalData(STORAGE_KEYS.COURIERS, MOCK_COURIERS);
      callback(couriers);
      return () => {};
    }
  },

  // Shipments
  subscribeShipments: (callback: (shipments: any[]) => void) => {
    if (isFirebaseConfigured) {
      const q = query(collection(db, 'shipments'), orderBy('lastUpdate', 'desc'));
      return onSnapshot(q, (snapshot) => {
        const shipments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        callback(shipments);
      }, (error) => {
        if (error.code !== 'permission-denied') {
          console.error("Error subscribing to shipments:", error);
        }
      });
    } else {
      const shipments = getLocalData(STORAGE_KEYS.SHIPMENTS, MOCK_SHIPMENTS);
      callback(shipments);
      return () => {};
    }
  },

  addShipment: async (shipment: Omit<any, 'id'>) => {
    if (isFirebaseConfigured) {
      return await addDoc(collection(db, 'shipments'), { ...shipment, lastUpdate: Timestamp.now() });
    } else {
      const shipments = getLocalData(STORAGE_KEYS.SHIPMENTS, MOCK_SHIPMENTS);
      const newShipment = { ...shipment, id: `SHIP-${Math.floor(Math.random() * 10000)}`, lastUpdate: new Date() };
      saveLocalData(STORAGE_KEYS.SHIPMENTS, [newShipment, ...shipments]);
      return newShipment;
    }
  },

  // Transactions
  subscribeTransactions: (callback: (transactions: Transaction[]) => void) => {
    if (isFirebaseConfigured) {
      const q = query(collection(db, 'transactions'), orderBy('date', 'desc'));
      return onSnapshot(q, (snapshot) => {
        const transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
        callback(transactions);
      }, (error) => {
        if (error.code !== 'permission-denied') {
          console.error("Error subscribing to transactions:", error);
        }
      });
    } else {
      const transactions = getLocalData(STORAGE_KEYS.TRANSACTIONS, MOCK_TRANSACTIONS);
      callback(transactions);
      return () => {};
    }
  },

  addTransaction: async (transaction: Omit<Transaction, 'id'>) => {
    if (isFirebaseConfigured) {
      return await addDoc(collection(db, 'transactions'), { ...transaction, date: Timestamp.now() });
    } else {
      const transactions = getLocalData(STORAGE_KEYS.TRANSACTIONS, MOCK_TRANSACTIONS);
      const newTxn = { ...transaction, id: `TXN-${Math.floor(Math.random() * 10000)}`, date: new Date() };
      saveLocalData(STORAGE_KEYS.TRANSACTIONS, [newTxn, ...transactions]);
      return newTxn;
    }
  }
};
