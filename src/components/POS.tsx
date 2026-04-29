import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  User, 
  ShoppingCart, 
  CreditCard, 
  Banknote, 
  Smartphone, 
  Printer, 
  X, 
  Loader2,
  Package,
  UserPlus,
  ChevronRight,
  ArrowLeft,
  CheckCircle2,
  Calculator,
  Barcode,
  Scan,
  Check,
  Filter,
  Grid,
  List,
  ReceiptText,
  Tag,
  Percent,
  MessageSquare,
  Lock,
  ShieldCheck,
  Wallet
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, writeBatch, getDoc, getDocs, where, Timestamp, runTransaction, limit } from '../firebase';
import { openPrintWindow } from '../utils/printHelper';
import { toast } from 'sonner';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { useSettings } from '../contexts/SettingsContext';
import { POSInvoice } from './InvoiceTemplates';
import { logActivity } from '../services/activityService';
import { checkDuplicateOrder } from '../services/orderService';
import { sendOrderConfirmationSMS } from '../services/smsService';
import ConfirmModal from './ConfirmModal';

interface CartItem {
  id: string;
  productId: string;
  variantId?: string;
  name: string;
  variantName?: string;
  price: number;
  quantity: number;
  stock: number;
  image?: string;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  address?: string;
  points?: number;
}

export default function POS() {
  const { currencySymbol } = useSettings();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  const [variants, setVariants] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [displayCount, setDisplayCount] = useState(12);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>({ id: 'walk-in', name: 'Walk-in Customer', phone: 'N/A' });
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'bKash' | 'Nagad' | 'Rocket' | 'Mobile Banking'>('Cash');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', address: '' });
  const [completedOrder, setCompletedOrder] = useState<any>(null);
  const [selectedProductForVariants, setSelectedProductForVariants] = useState<{product: any, variants: any[]} | null>(null);
  const [companySettings, setCompanySettings] = useState<any>(null);
  const [sendSMS, setSendSMS] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState({ last4Digits: '' });
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = () => {
    const win = window.open('', '_blank');
    if (!win) {
       toast.error("Please allow popups to print.");
       return;
    }
    setTimeout(() => {
      if (printRef.current) {
        openPrintWindow(printRef.current.innerHTML, 'POS Invoice', win);
        setCompletedOrder(null);
      }
    }, 500);
  };

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!auth.currentUser) return;

    const unsubProducts = onSnapshot(collection(db, 'products'), (s) => {
      setProducts(s.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (e) => {
      if (e.code !== 'permission-denied') {
        handleFirestoreError(e, OperationType.LIST, 'products');
      }
    });

    const unsubVariants = onSnapshot(collection(db, 'variants'), (s) => {
      setVariants(s.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (e) => {
      if (e.code !== 'permission-denied') {
        handleFirestoreError(e, OperationType.LIST, 'variants');
      }
    });

    const unsubInventory = onSnapshot(collection(db, 'inventory'), (s) => {
      setInventory(s.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (e) => {
      if (e.code !== 'permission-denied') {
        handleFirestoreError(e, OperationType.LIST, 'inventory');
      }
    });

    const unsubCustomers = onSnapshot(collection(db, 'customers'), (s) => {
      setCustomers(s.docs.map(d => ({ id: d.id, ...d.data() } as Customer)));
    }, (e) => {
      if (e.code !== 'permission-denied') {
        handleFirestoreError(e, OperationType.LIST, 'customers');
      }
    });

    const unsubSettings = onSnapshot(doc(db, 'settings', 'company'), (s) => {
      setCompanySettings(s.data());
    }, (e) => {
      if (e.code !== 'permission-denied') {
        handleFirestoreError(e, OperationType.GET, 'settings/company');
      }
    });

    const unsubCategories = onSnapshot(collection(db, 'categories'), (s) => {
      setCategories(s.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (e) => {
      if (e.code !== 'permission-denied') {
        handleFirestoreError(e, OperationType.LIST, 'categories');
      }
    });

    return () => {
      unsubProducts();
      unsubVariants();
      unsubInventory();
      unsubCustomers();
      unsubSettings();
      unsubCategories();
    };
  }, []);

  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;
    if (isScannerOpen) {
      scanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
      );
      scanner.render(onScanSuccess, onScanFailure);
    }

    return () => {
      if (scanner) {
        scanner.clear().catch(error => console.error("Failed to clear scanner", error));
      }
    };
  }, [isScannerOpen]);

  const onScanSuccess = (decodedText: string) => {
    setBarcodeInput(decodedText);
    // Trigger the scan logic manually since we can't easily trigger the form submit
    processBarcode(decodedText);
    setIsScannerOpen(false);
  };

  const onScanFailure = (error: any) => {
    // console.warn(`Code scan error = ${error}`);
  };

  const processBarcode = (code: string) => {
    if (!code.trim()) return;

    // Search in variants first (more specific)
    const variant = variants.find(v => v.barcode === code || v.sku === code);
    if (variant) {
      const product = products.find(p => p.id === variant.productId);
      if (product) {
        addToCart(product, variant);
        setBarcodeInput('');
        toast.success(`Added ${product.name} (${variant.name})`);
        return;
      }
    }

    // Search in products
    const product = products.find(p => p.barcode === code || p.sku === code);
    if (product) {
      addToCart(product);
      setBarcodeInput('');
      toast.success(`Added ${product.name}`);
      return;
    }

    toast.error('Product not found with this barcode/SKU');
    setBarcodeInput('');
    barcodeInputRef.current?.focus();
  };

  const handleBarcodeScan = (e: React.FormEvent) => {
    e.preventDefault();
    processBarcode(barcodeInput);
  };

  const getStock = (productId: string, variantId?: string) => {
    const items = inventory.filter(i => i.productId === productId && (variantId ? i.variantId === variantId : true));
    return items.reduce((acc, curr) => acc + (curr.quantity || 0), 0);
  };

  const addToCart = (product: any, variant?: any) => {
    const stock = getStock(product.id, variant?.id);
    if (stock <= 0) {
      toast.error('Product out of stock');
      return;
    }

    const cartId = variant ? `${product.id}-${variant.id}` : product.id;
    const existingItem = cart.find(item => item.id === cartId);

    if (existingItem) {
      if (existingItem.quantity >= stock) {
        toast.error('Cannot add more than available stock');
        return;
      }
      setCart(cart.map(item => 
        item.id === cartId ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setCart([...cart, {
        id: cartId,
        productId: product.id,
        variantId: variant?.id,
        name: product.name,
        variantName: variant?.name || (product.size || product.color ? `${product.size || ''} ${product.size && product.color ? '/' : ''} ${product.color || ''}`.trim() : undefined),
        price: variant?.price || product.price,
        quantity: 1,
        stock,
        image: product.images?.[0] || product.image
      }]);
    }
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, item.quantity + delta);
        if (newQty > item.stock) {
          toast.error('Cannot exceed available stock');
          return item;
        }
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const total = subtotal - discount + tax;

  const handleCheckout = () => {
    const validCart = cart.filter(item => item.quantity > 0);
    if (validCart.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    if (!selectedCustomer) {
      toast.error('Please select a customer');
      return;
    }

    if (paymentMethod !== 'Cash') {
      setPaymentDetails({ last4Digits: '' }); // reset before opening
      setIsPaymentModalOpen(true);
      return;
    }

    setPaymentDetails({ last4Digits: '' });
    executeCheckoutLogic();
  };

  const executeCheckoutLogic = async () => {
    const validCart = cart.filter(item => item.quantity > 0);

    setIsProcessing(true);
    try {
      // Duplicate Detection Check (Skip for Walk-in)
      let duplicate = null;
      if (selectedCustomer?.id !== 'walk-in') {
        duplicate = await checkDuplicateOrder({
          customerPhone: selectedCustomer.phone,
          customerName: selectedCustomer.name,
          items: validCart.map(item => ({
            productId: item.productId,
            variantId: item.variantId || '',
            quantity: item.quantity,
            price: item.price
          })),
          totalAmount: total
        });
      }

      if (duplicate) {
        setConfirmConfig({
          isOpen: true,
          title: 'Duplicate Order Detected',
          message: `An order (#${duplicate.orderNumber || duplicate.id.slice(0, 8)}) with the same phone number, products, and total value was found within the last 24 hours. Are you sure you want to complete this duplicate sale?`,
          variant: 'warning',
          onConfirm: () => proceedWithCheckout()
        });
        setIsProcessing(false);
        return;
      }

      await proceedWithCheckout();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'orders');
      setIsProcessing(false);
    }
  };

  const proceedWithCheckout = async () => {
    setIsProcessing(true);
    const validCart = cart.filter(item => item.quantity > 0);
    try {
      // 1. PRE-TRANSACTION READS
      const inventorySnaps: { item: any; snap: any }[] = [];
      for (const item of validCart) {
        const invQuery = query(
          collection(db, 'inventory'), 
          where('productId', '==', item.productId),
          where('variantId', '==', item.variantId || '')
        );
        const invSnap = await getDocs(invQuery);
        inventorySnaps.push({ item, snap: invSnap });
      }

      // Find the account for the payment method before transaction
      const accountsQuery = query(collection(db, 'accounts'), where('name', '==', paymentMethod));
      const accountsSnap = await getDocs(accountsQuery);
      let accountId = '';
      if (!accountsSnap.empty) {
        accountId = accountsSnap.docs[0].id;
      } else {
        // Fallback to first account if not found by name
        const allAccountsSnap = await getDocs(query(collection(db, 'accounts'), limit(1)));
        if (!allAccountsSnap.empty) {
          accountId = allAccountsSnap.docs[0].id;
        }
      }

      const result = await runTransaction(db, async (transaction) => {
        // 2. TRANSACTION READS
        const settingsRef = doc(db, 'settings', 'company');
        const settingsSnap = await transaction.get(settingsRef);

        let accountSnap = null;
        if (accountId) {
          const accountRef = doc(db, 'accounts', accountId);
          accountSnap = await transaction.get(accountRef);
        }

        const customerRef = doc(db, 'customers', selectedCustomer!.id);
        const customerSnap = await transaction.get(customerRef);

        // 3. CALCULATE NEXT ORDER NUMBER
        let nextOrderNumber = 1001;
        if (settingsSnap.exists() && settingsSnap.data().orderCounter) {
          nextOrderNumber = settingsSnap.data().orderCounter + 1;
        }

        // 3. ALL WRITES SECOND
        const orderRef = doc(collection(db, 'orders'));
        const orderData = {
          orderNumber: nextOrderNumber,
          customerName: selectedCustomer!.name,
          customerPhone: selectedCustomer!.phone,
          customerAddress: selectedCustomer!.address || '',
          items: validCart.map(item => ({
            productId: item.productId,
            variantId: item.variantId || '',
            name: item.name,
            variantName: item.variantName || '',
            price: item.price,
            quantity: item.quantity,
            total: item.price * item.quantity
          })),
          subtotal,
          discount,
          tax,
          deliveryCharge: 0,
          totalAmount: total,
          paidAmount: total,
          dueAmount: 0,
          paymentMethod,
          paymentDetails: paymentDetails.last4Digits ? { last4Digits: paymentDetails.last4Digits } : null,
          status: 'delivered',
          source: 'POS',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          uid: auth.currentUser?.uid,
          notes: 'POS Sale'
        };

        transaction.set(orderRef, orderData);
        transaction.set(settingsRef, { orderCounter: nextOrderNumber }, { merge: true });

        // Update Inventory
        for (const invData of inventorySnaps) {
          const { item, snap } = invData;
          if (!snap.empty) {
            const invDoc = snap.docs[0];
            const currentQty = invDoc.data().quantity || 0;
            const newQty = currentQty - item.quantity;
            transaction.update(invDoc.ref, {
              quantity: newQty,
              updatedAt: serverTimestamp()
            });

            // Log stock change (legacy)
            const logRef = doc(collection(db, 'stock_logs'));
            transaction.set(logRef, {
              productId: item.productId,
              variantId: item.variantId || '',
              type: 'out',
              quantityChange: item.quantity,
              newQuantity: newQty,
              reason: `POS Sale #${nextOrderNumber}`,
              uid: auth.currentUser?.uid,
              createdAt: serverTimestamp()
            });

            // Stock Ledger for Valuation
            const ledgerRef = doc(collection(db, 'stockLedger'));
            transaction.set(ledgerRef, {
              productId: item.productId,
              variantId: item.variantId || '',
              warehouseId: invDoc.data().warehouseId || 'primary',
              type: 'sale',
              quantity: -item.quantity,
              unitCost: 0, // Calculated during valuation via FIFO
              totalValue: 0,
              referenceId: orderRef.id,
              uid: auth.currentUser?.uid,
              timestamp: serverTimestamp()
            });
          }
        }

        // Update Customer Points & Stats
        if (customerSnap.exists()) {
          const currentPoints = customerSnap.data().points || 0;
          const currentSpent = customerSnap.data().spent || 0;
          const currentOrders = customerSnap.data().orders || 0;
          
          const pointsRate = companySettings?.rewardPointsRate || 1;
          const earnedPoints = Math.floor((total / 100) * pointsRate);
          
          transaction.update(customerRef, {
            points: currentPoints + earnedPoints,
            spent: currentSpent + total,
            orders: currentOrders + 1,
            lastOrder: new Date().toISOString(),
            updatedAt: serverTimestamp()
          });
        }

        // Add to Finance
        const transactionRef = doc(collection(db, 'transactions'));
        transaction.set(transactionRef, {
          type: 'income',
          category: 'Sales',
          amount: total,
          description: `POS Sale #${nextOrderNumber}${paymentDetails.last4Digits ? ` (Last 4: ${paymentDetails.last4Digits})` : ''}`,
          date: serverTimestamp(),
          method: paymentMethod,
          paymentDetails: paymentDetails.last4Digits ? { last4Digits: paymentDetails.last4Digits } : null,
          accountId: accountId,
          orderId: orderRef.id,
          orderNumber: nextOrderNumber,
          uid: auth.currentUser?.uid,
          createdAt: serverTimestamp()
        });

        // Update Account Balance
        if (accountId && accountSnap && accountSnap.exists()) {
          const currentBalance = accountSnap.data().balance || 0;
          transaction.update(doc(db, 'accounts', accountId), {
            balance: currentBalance + total,
            updatedAt: serverTimestamp()
          });
        }

        // 4. PREPARE COMPLETED ORDER DATA
        const finalCompletedOrder = { ...orderData, id: orderRef.id };

        // Send SMS if enabled
        if (sendSMS) {
          sendOrderConfirmationSMS({
            ...orderData,
            id: orderRef.id,
            customerName: selectedCustomer!.name,
            customerPhone: selectedCustomer!.phone
          });
        }

        return finalCompletedOrder;
      });

      if (result) {
        setCompletedOrder(result);
      }

      await logActivity('POS Sale', 'POS', `Completed sale for ${total}`);
      
      setCart([]);
      setSelectedCustomer({ id: 'walk-in', name: 'Walk-in Customer', phone: 'N/A' });
      setDiscount(0);
      setTax(0);
      toast.success('Sale completed successfully!');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'orders');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNewCustomerPhoneChange = async (phone: string) => {
    setNewCustomer(prev => ({ ...prev, phone }));
    
    if (phone.length >= 11) {
      try {
        const q = query(collection(db, 'customers'), where('phone', '==', phone));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const customerData = querySnapshot.docs[0].data();
          setNewCustomer(prev => ({
            ...prev,
            name: customerData.name || prev.name,
            address: customerData.address || prev.address
          }));
          toast.success(`Found existing customer: ${customerData.name}`);
        }
      } catch (error) {
        console.error("Error fetching customer data:", error);
      }
    }
  };

  const handleAddCustomer = async () => {
    if (!newCustomer.name || !newCustomer.phone) {
      toast.error('Name and phone are required');
      return;
    }
    try {
      const docRef = await addDoc(collection(db, 'customers'), {
        ...newCustomer,
        createdAt: serverTimestamp(),
        uid: auth.currentUser?.uid
      });
      setSelectedCustomer({ id: docRef.id, ...newCustomer });
      setIsCustomerModalOpen(false);
      setNewCustomer({ name: '', phone: '', address: '' });
      toast.success('Customer added successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'customers');
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.sku?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.categoryId === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone.includes(customerSearch)
  );

  if (loading) {
    return (
      <div className="h-[calc(100vh-120px)] flex items-center justify-center">
        <Loader2 className="animate-spin text-brand" size={48} />
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-0 max-w-[1600px] mx-auto w-full bg-background items-start">
      {/* Left Side: Product Selection */}
      <div className="flex-1 flex flex-col gap-6 min-w-0 order-2 lg:order-1 pb-24 lg:pb-0">
        
        {/* Top Actions */}
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-4 bg-transparent shrink-0">
          <form onSubmit={handleBarcodeScan} className="flex gap-4">
            <button 
              type="button"
              className="flex items-center gap-3 bg-surface border border-border px-5 py-2.5 rounded-2xl hover:bg-surface-hover transition-colors shadow-subtle"
              onClick={() => {
                if (barcodeInputRef.current) {
                  barcodeInputRef.current.focus();
                }
              }}
            >
              <Barcode size={24} className="text-secondary" />
              <div className="text-left hidden sm:block">
                <div className="text-sm font-bold text-primary leading-tight">Scan Barcode</div>
                <div className="text-[10px] text-secondary">Click or press shortcut</div>
              </div>
            </button>
            <button 
               type="button" 
               onClick={() => setIsScannerOpen(true)}
               className="bg-blue-900 text-white p-4 rounded-2xl hover:bg-blue-800 transition-colors flex items-center justify-center shrink-0 shadow-subtle"
               title="Camera Scan"
            >
              <Scan size={20} />
            </button>
          </form>

          <div className="relative flex-1 group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted">
              <Search size={18} />
            </div>
            <input 
              ref={barcodeInputRef}
              type="text"
              placeholder="Search products by name, SKU or scan..."
              className="w-full pl-11 pr-24 py-4 bg-surface border border-border shadow-subtle rounded-2xl text-sm font-medium focus:bg-surface focus:border-brand outline-none transition-all"
              value={searchTerm || barcodeInput}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setBarcodeInput(e.target.value);
              }}
            />
            <button type="button" className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-xs font-bold text-secondary hover:text-primary border border-border px-3 py-1.5 rounded-lg bg-surface-hover flex-shrink-0">
              <Filter size={14} />
              Filter
            </button>
          </div>
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-3 overflow-x-auto pb-2 pt-2 custom-scrollbar shrink-0">
          <button 
            onClick={() => setSelectedCategory('All')}
            className={`px-5 py-2.5 rounded-full text-sm font-semibold shrink-0 shadow-subtle transition-colors ${selectedCategory === 'All' ? 'bg-brand text-white border border-transparent' : 'bg-surface border border-border text-secondary hover:bg-surface-hover'}`}
          >
            All Products
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-5 py-2.5 rounded-full text-sm font-semibold shrink-0 shadow-subtle transition-colors ${selectedCategory === category.id ? 'bg-brand text-white border border-transparent' : 'bg-surface border border-border text-secondary hover:bg-surface-hover'}`}
            >
              {category.name}
            </button>
          ))}
          <div className="flex-1 min-w-[20px]" />
          <div className="flex gap-2 shrink-0 bg-transparent">
            <button onClick={() => setViewMode('grid')} className={`p-2.5 bg-surface border border-border rounded-xl shadow-subtle transition-colors ${viewMode === 'grid' ? 'text-brand' : 'text-muted hover:text-secondary'}`}><Grid size={20} /></button>
            <button onClick={() => setViewMode('list')} className={`p-2.5 bg-surface border border-border rounded-xl shadow-subtle transition-colors ${viewMode === 'list' ? 'text-brand' : 'text-muted hover:text-secondary'}`}><List size={20} /></button>
          </div>
        </div>


        <motion.div 
          layout
          className={`flex-1 pr-0 lg:pr-2 pb-2 ${viewMode === 'grid' ? 'grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4' : 'flex flex-col gap-3'}`}
        >
          <AnimatePresence mode="popLayout">
            {filteredProducts.slice(0, displayCount).map((product, index) => {
              const productVariants = variants.filter(v => v.productId === product.id);
              const totalStock = getStock(product.id);

              return (
                <motion.div 
                  layout
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3, delay: index * 0.02 }}
                  className={`bg-surface border border-border p-3 cursor-pointer hover:shadow-lg hover:border-blue-200 transition-all active:scale-[0.98] group ${viewMode === 'list' ? 'flex flex-row items-center gap-4 rounded-xl' : 'flex flex-col gap-2 rounded-2xl'}`}
                  onClick={() => {
                    if (totalStock <= 0) return;
                    if (productVariants.length > 0) {
                      setSelectedProductForVariants({ product, variants: productVariants });
                    } else {
                      addToCart(product);
                    }
                  }}
                >
                  <div className={`relative overflow-hidden bg-surface-hover border border-border/50 flex-shrink-0 ${viewMode === 'list' ? 'w-16 h-16 rounded-lg' : 'w-full aspect-[4/3] rounded-xl mb-1'}`}>
                    {(product.images?.[0] || product.image) ? (
                      <img 
                        src={product.images?.[0] || product.image} 
                        alt={product.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                        referrerPolicy="no-referrer" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted">
                        <Package size={viewMode === 'list' ? 24 : 32} strokeWidth={1.5} />
                      </div>
                    )}

                    {product.sku && viewMode === 'grid' && (
                    <div className="absolute top-2 left-2 z-10 hidden sm:block">
                      <span className="px-2 py-1 bg-black/70 backdrop-blur-md text-[10px] font-bold text-white rounded-md tracking-wider">
                        {product.sku}
                      </span>
                    </div>
                    )}

                    <div className={`absolute z-10 flex flex-col gap-1 ${viewMode === 'list' ? 'bottom-1 left-1' : 'bottom-2 left-2'}`}>
                      {totalStock <= 0 ? (
                        <span className="px-1 py-0.5 bg-red-500 text-[8px] font-bold text-white rounded shadow-subtle">Out</span>
                      ) : totalStock <= 5 ? (
                        <span className="px-1 py-0.5 bg-orange-500 text-[8px] font-bold text-white rounded shadow-subtle">Low</span>
                      ) : null}
                    </div>
                  </div>

                  <div className={`flex flex-col ${viewMode === 'list' ? 'flex-1 min-w-0' : ''}`}>
                    <h3 className={`font-bold text-primary leading-tight group-hover:text-brand transition-colors ${viewMode === 'list' ? 'text-sm truncate' : 'text-[13px] line-clamp-2'}`}>
                      {product.name}
                    </h3>
                    <p className={`font-medium text-muted ${viewMode === 'list' ? 'text-xs mt-0.5 truncate' : 'text-[11px] mt-auto'}`}>
                      {categories.find(c => c.id === product.categoryId)?.name || product.category || 'Standard'} {productVariants.length > 0 && `• ${productVariants.length} Variants`}
                    </p>
                  </div>
                  
                  <div className={`flex items-center justify-between ${viewMode === 'list' ? 'flex-shrink-0 min-w-[80px] justify-end gap-3' : 'pt-1 mt-1 border-t border-border'}`}>
                    <span className="font-bold text-primary text-sm">
                      {currencySymbol}{(product.price || 0).toLocaleString()}
                    </span>
                    <button className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-secondary group-hover:bg-surface-hover group-hover:border-border group-hover:text-brand transition-colors bg-surface shadow-subtle flex-shrink-0">
                      <Plus size={16} strokeWidth={2.5} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
        
        {displayCount < filteredProducts.length && (
          <div className="flex justify-center mt-2 mb-8">
            <button 
              onClick={() => setDisplayCount(prev => prev + 8)}
              className="px-8 py-3 bg-surface border border-border text-brand rounded-xl font-bold hover:bg-brand/10 transition-colors shadow-subtle"
            >
              Load More
            </button>
          </div>
        )}
      </div>

      {/* Right Side: Cart & Checkout */}
      <div className="w-full lg:w-[380px] bg-surface rounded-[2rem] border border-border shadow-subtle flex flex-col h-fit order-1 lg:order-2 overflow-hidden mx-auto">
        {/* Customer Header */}
        <div className="p-4 border-b border-border flex justify-between items-center bg-surface shrink-0">
          <h3 className="text-sm font-bold text-primary flex items-center gap-2">
            <User size={18} className="text-brand" /> Customer
          </h3>
          <button 
            onClick={() => setSelectedCustomer({ id: 'walk-in', name: 'Walk-in Customer', phone: 'N/A' })}
            className="flex items-center gap-1.5 text-xs font-semibold bg-surface-hover hover:bg-surface-hover text-secondary px-3 py-1.5 rounded-xl border border-border transition-colors"
          >
            <User size={14} /> Walk-in
          </button>
        </div>

        {/* Customer Search / Selected */}
        <div className="p-4 border-b border-border bg-surface shrink-0">
          {selectedCustomer && selectedCustomer.id !== 'walk-in' ? (
            <div className="p-3 rounded-xl border bg-brand/10/50 border-brand/20 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center font-bold shrink-0 shadow-subtle border bg-surface text-brand border-blue-50">
                  {selectedCustomer.name[0]}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-primary truncate">{selectedCustomer.name}</p>
                  <p className="text-xs text-secondary truncate">{selectedCustomer.phone}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedCustomer({ id: 'walk-in', name: 'Walk-in Customer', phone: 'N/A' })}
                className="p-1.5 text-muted hover:text-red-600 hover:bg-red-50 rounded-lg transition-all shrink-0"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
              <input 
                type="text"
                placeholder="Search customer by name or phone..."
                className="w-full pl-9 pr-9 py-2.5 bg-surface-hover border border-border rounded-xl text-sm focus:bg-surface focus:border-brand outline-none transition-all"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
              />
              <button 
                onClick={() => setIsCustomerModalOpen(true)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted hover:text-brand bg-surface rounded-lg border border-border shadow-subtle"
                title="Add Customer"
              >
                <UserPlus size={14} />
              </button>
              
              {customerSearch && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-surface rounded-xl shadow-xl border border-border p-2 z-20 max-h-48 overflow-y-auto custom-scrollbar">
                  {filteredCustomers.length > 0 ? (
                    filteredCustomers.map(c => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setSelectedCustomer(c);
                          setCustomerSearch('');
                        }}
                        className="w-full text-left px-3 py-2.5 hover:bg-surface-hover rounded-lg transition-all flex items-center justify-between"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-primary truncate">{c.name}</p>
                          <p className="text-xs text-secondary truncate">{c.phone}</p>
                        </div>
                      </button>
                    ))
                  ) : (
                    <button
                      onClick={() => {
                        setNewCustomer({ ...newCustomer, phone: customerSearch });
                        setIsCustomerModalOpen(true);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-brand/10 rounded-lg transition-all flex items-center gap-2 text-brand"
                    >
                      <UserPlus size={16} className="shrink-0" />
                      <span className="text-sm font-bold truncate">Add "{customerSearch}"</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cart Header */}
        <div className="p-4 flex justify-between items-center border-b border-border bg-surface shrink-0">
          <div className="font-bold text-primary flex items-center gap-2 text-sm">
            <ShoppingCart size={18} className="text-brand" /> 
            Cart Items ({cart.reduce((acc, i) => acc + i.quantity, 0)})
          </div>
          <button 
             onClick={() => {
               if (cart.length > 0) {
                 setConfirmConfig({
                   isOpen: true,
                   title: 'Clear Cart',
                   message: 'Are you sure you want to remove all items from the cart?',
                   variant: 'danger',
                   onConfirm: () => setCart([])
                 });
               }
             }}
            className="text-muted hover:text-red-500 transition-colors p-1 rounded-md hover:bg-red-50"
            title="Clear cart"
          >
            <Trash2 size={16} />
          </button>
        </div>

        {/* Cart Items List */}
        <div className={`p-4 bg-surface relative shrink-0 ${cart.length === 0 ? 'min-h-[160px]' : 'space-y-3'}`}>
          {cart.length === 0 ? (
             <div className="absolute inset-0 flex flex-col items-center justify-center text-muted">
                <ShoppingCart size={48} className="mb-2 opacity-50" />
                <p className="text-[12px] font-semibold">Cart is empty</p>
             </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {cart.map(item => (
                <motion.div 
                  layout
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  key={item.id} 
                  className="flex gap-2.5 group"
                >
                  <div className="w-12 h-12 bg-surface-hover rounded-lg overflow-hidden shrink-0 border border-border">
                     {item.image ? (
                       <img src={item.image} alt="" className="w-full h-full object-cover" />
                     ) : (
                       <Package className="w-full h-full p-2.5 text-muted" />
                     )}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                    <h4 className="text-[12px] font-bold text-primary truncate leading-tight flex items-start justify-between gap-2">
                       <span className="truncate">{item.name}</span>
                       <span className="shrink-0 font-black">{currencySymbol}{(item.price * item.quantity).toLocaleString()}</span>
                    </h4>
                    <p className="text-[10px] text-secondary truncate leading-none mt-0.5">{item.variantName || 'Standard'}</p>
                    
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center bg-surface-hover rounded-md border border-border w-fit h-6 overflow-hidden">
                        <button 
                          onClick={() => updateQuantity(item.id, -1)}
                          className="w-6 h-full flex items-center justify-center text-secondary hover:bg-surface-hover transition-colors active:bg-gray-300"
                        >
                          <Minus size={10} strokeWidth={3} />
                        </button>
                        <div className="w-7 flex items-center justify-center border-x border-border">
                          <input 
                            type="number"
                            className="w-full min-w-0 text-center text-[10px] font-bold bg-transparent border-none focus:ring-0 p-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                            value={item.quantity === 0 ? '' : item.quantity}
                            onBlur={() => { if (item.quantity === 0) removeFromCart(item.id); }}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              const newQty = isNaN(val) ? 0 : val;
                              if (newQty > item.stock) {
                                toast.error(`Only ${item.stock} in stock`); return;
                              }
                              setCart(cart.map(i => i.id === item.id ? { ...i, quantity: newQty } : i));
                            }}
                          />
                        </div>
                        <button 
                          onClick={() => updateQuantity(item.id, 1)}
                          className="w-6 h-full flex items-center justify-center text-brand hover:bg-surface-hover transition-colors active:bg-gray-300"
                        >
                          <Plus size={10} strokeWidth={3} />
                        </button>
                      </div>
                      <button 
                         onClick={() => removeFromCart(item.id)}
                         className="p-1 text-muted hover:text-red-500 transition-colors rounded-md opacity-0 group-hover:opacity-100"
                      >
                        <X size={12} strokeWidth={3} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>


        <div className="p-4 border-t border-border shrink-0 mt-auto bg-surface">
          <div className="space-y-2 mb-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                 <div className="w-7 h-7 rounded-[8px] bg-brand/5 flex items-center justify-center text-brand">
                   <ReceiptText size={14} strokeWidth={2.5} />
                 </div>
                 <span className="text-xs font-bold text-secondary uppercase tracking-wider">Subtotal</span>
              </div>
              <span className="text-sm font-bold text-primary">{currencySymbol}{(subtotal || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                 <div className="w-7 h-7 rounded-[8px] bg-green-500/10 flex items-center justify-center text-green-500">
                   <Tag size={14} strokeWidth={2.5} />
                 </div>
                 <span className="text-xs font-bold text-secondary uppercase tracking-wider">Discount</span>
              </div>
              <div className="w-20 relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted font-bold text-xs">{currencySymbol}</span>
                <input 
                  type="number" 
                  className="w-full text-right bg-surface border border-border rounded-lg py-1 pr-2 pl-5 font-bold text-xs text-primary focus:outline-none focus:border-brand transition-all hover:bg-surface-hover [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]" 
                  placeholder="0"
                  value={discount === 0 ? '' : discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                />
              </div>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                 <div className="w-7 h-7 rounded-[8px] bg-purple-500/10 flex items-center justify-center text-purple-500">
                   <Percent size={14} strokeWidth={2.5} />
                 </div>
                 <span className="text-xs font-bold text-secondary uppercase tracking-wider">Tax (VAT)</span>
              </div>
              <div className="w-20 relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted font-bold text-xs">{currencySymbol}</span>
                <input 
                  type="number" 
                  className="w-full text-right bg-surface border border-border rounded-lg py-1 pr-2 pl-5 font-bold text-xs text-primary focus:outline-none focus:border-brand transition-all hover:bg-surface-hover [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]" 
                  placeholder="0"
                  value={tax === 0 ? '' : tax}
                  onChange={(e) => setTax(Number(e.target.value))}
                />
              </div>
            </div>
          </div>
          
          <div className="flex justify-between items-center border-t border-border/60 border-dashed pt-3 mb-3">
            <span className="text-sm font-bold text-primary uppercase tracking-wider">Total Payable</span>
            <span className="text-xl tracking-tight font-black text-brand leading-none">{currencySymbol}{(total || 0).toLocaleString()}</span>
          </div>
          
          <p className="text-[11px] font-bold text-secondary uppercase tracking-wider mb-2">Select Payment Method</p>
          <div className="grid grid-cols-3 gap-2 mb-3">
             {[
               { id: 'Cash', label: 'Cash', icon: Banknote },
               { id: 'Card', label: 'Card', icon: CreditCard },
               { id: 'Mobile Banking', label: 'MFS', icon: Wallet }
             ].map(method => (
               <button
                 key={method.id}
                 onClick={() => setPaymentMethod(method.id as any)}
                 className={`relative flex flex-col items-center justify-center gap-1 py-1.5 px-2 rounded-xl transition-all border ${paymentMethod === method.id ? 'bg-brand/5 border-brand ring-1 ring-brand' : 'bg-surface border-border hover:border-border hover:bg-surface-hover'}`}
               >
                 {paymentMethod === method.id && (
                    <div className="absolute top-1 right-1 w-3 h-3 rounded-full bg-brand flex items-center justify-center">
                       <Check size={8} strokeWidth={3} className="text-white" />
                    </div>
                 )}
                 <method.icon size={16} strokeWidth={2} className={paymentMethod === method.id ? 'text-brand' : 'text-secondary'} />
                 <span className={`text-[11px] font-bold text-center leading-tight ${paymentMethod === method.id ? 'text-brand' : 'text-primary'}`}>{method.label}</span>
               </button>
             ))}
          </div>

          <div className="mb-3">
              <button 
                 onClick={() => setSendSMS(!sendSMS)}
                 className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border text-xs font-bold transition-all ${sendSMS ? 'bg-brand/5 border-brand/30 text-brand' : 'bg-surface border-border text-secondary hover:bg-surface-hover'}`}
              >
                 <MessageSquare size={14} strokeWidth={2.5} /> SMS Receipt
              </button>
          </div>

          <button 
            onClick={handleCheckout}
            disabled={isProcessing || cart.length === 0}
            className="w-full text-white rounded-xl py-2.5 font-bold text-[13px] transition-all disabled:opacity-80 flex items-center justify-between px-4 shadow-sm bg-brand hover:bg-brand-hover"
          >
            <div className="w-4 flex items-center justify-center opacity-70">
              <Lock size={14} />
            </div>
            <div className="flex items-center gap-2 flex-1 justify-center tracking-wide">
              {isProcessing ? <Loader2 size={14} className="animate-spin" /> : null}
              Checkout ({currencySymbol}{(total || 0).toLocaleString()})
            </div>
            <div className="w-4 flex items-center justify-center">
              <ChevronRight size={16} />
            </div>
          </button>
          
          <div className="mt-3 flex flex-col items-center gap-1 opacity-70">
             <div className="flex items-center gap-1.5 text-secondary">
               <ShieldCheck size={12} className="text-brand" />
               <span className="text-[10px] font-medium">Your payment is secure and encrypted</span>
             </div>
          </div>
        </div>
      </div>
      {/* Camera Scanner Modal */}
      {isScannerOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-surface rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                <Scan size={20} className="text-brand" />
                Camera Scanner
              </h3>
              <button onClick={() => setIsScannerOpen(false)} className="p-2 hover:bg-surface-hover rounded-xl transition-all">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <div id="reader" className="w-full overflow-hidden rounded-2xl border-2 border-dashed border-border"></div>
              <p className="text-center text-xs text-secondary mt-4">
                Position the barcode within the scanner frame to scan automatically.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-bold text-primary">Add New Customer</h3>
              <button onClick={() => setIsCustomerModalOpen(false)} className="p-2 hover:bg-surface-hover rounded-xl transition-all">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-secondary uppercase tracking-wider">Full Name</label>
                <input 
                  type="text"
                  className="w-full px-4 py-3 bg-surface-hover border border-transparent rounded-xl text-sm focus:bg-surface focus:border-brand/20 outline-none transition-all"
                  placeholder="Enter customer name"
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-secondary uppercase tracking-wider">Phone Number</label>
                <input 
                  type="text"
                  className="w-full px-4 py-3 bg-surface-hover border border-transparent rounded-xl text-sm focus:bg-surface focus:border-brand/20 outline-none transition-all"
                  placeholder="Enter phone number"
                  value={newCustomer.phone}
                  onChange={(e) => handleNewCustomerPhoneChange(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-secondary uppercase tracking-wider">Address (Optional)</label>
                <textarea 
                  className="w-full px-4 py-3 bg-surface-hover border border-transparent rounded-xl text-sm focus:bg-surface focus:border-brand/20 outline-none transition-all resize-none h-24"
                  placeholder="Enter address"
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                />
              </div>
              <button 
                onClick={handleAddCustomer}
                className="w-full py-4 bg-brand text-white rounded-2xl font-bold hover:bg-brand-hover transition-all shadow-lg"
              >
                Save Customer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sale Success / Receipt Modal */}
      {completedOrder && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-[70] p-4">
          <div className="bg-surface rounded-[3rem] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300 relative border border-white/20">
            <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-green-50 to-white -z-10" />
            <div className="p-10 text-center space-y-8">
              <div className="relative mx-auto w-24 h-24">
                <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-20" />
                <div className="relative bg-green-500 text-white w-24 h-24 rounded-full flex items-center justify-center shadow-2xl shadow-green-500/40">
                  <CheckCircle2 size={56} strokeWidth={2.5} />
                </div>
              </div>
              
              <div className="space-y-3">
                <h3 className="text-3xl font-black text-primary tracking-tight uppercase">Order Success!</h3>
                <p className="text-sm font-bold text-secondary">Order <span className="font-black text-brand">#{completedOrder.orderNumber}</span> received successfully.</p>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-surface-hover/50 p-4 rounded-[2rem] border border-border">
                <div className="text-left">
                  <p className="text-[9px] font-black text-muted uppercase tracking-widest">Total Value</p>
                  <p className="text-lg font-black text-primary">{currencySymbol}{(completedOrder.totalAmount || 0).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black text-muted uppercase tracking-widest">Payment</p>
                  <p className="text-lg font-black text-green-600 uppercase tracking-tighter">{completedOrder.paymentMethod}</p>
                </div>
              </div>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => handlePrint()}
                  className="w-full py-4 bg-slate-800 hover:bg-slate-900 dark:bg-white dark:hover:bg-gray-200 text-white dark:text-slate-900 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-slate-900/10 dark:shadow-white/10 flex items-center justify-center gap-3 active:scale-[0.98]"
                >
                  <Printer size={20} strokeWidth={2.5} />
                  Generate Receipt
                </button>
                <div className="flex gap-3">
                  <button 
                    onClick={() => {
                      setCompletedOrder(null);
                      navigate('/orders');
                    }}
                    className="flex-1 py-4 bg-surface border border-border text-secondary rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-surface-hover transition-all"
                  >
                    Manage Orders
                  </button>
                  <button 
                    onClick={() => setCompletedOrder(null)}
                    className="flex-1 py-4 bg-brand text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-brand-hover transition-all shadow-lg shadow-brand/20"
                  >
                    New Sale
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Receipt for Printing */}
      <div className="hidden">
        <div ref={printRef}>
          {completedOrder && companySettings && (
            <POSInvoice 
              order={completedOrder} 
              company={companySettings} 
              currencySymbol={currencySymbol} 
            />
          )}
        </div>
      </div>

      {/* Variant Selection Modal */}
      {selectedProductForVariants && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-bold text-primary">Select Variant</h3>
              <button onClick={() => setSelectedProductForVariants(null)} className="p-2 hover:bg-surface-hover rounded-xl transition-all">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-surface-hover rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                  {(selectedProductForVariants.product.images?.[0] || selectedProductForVariants.product.image) ? (
                    <img 
                      src={selectedProductForVariants.product.images?.[0] || selectedProductForVariants.product.image} 
                      alt={selectedProductForVariants.product.name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Package size={24} className="text-muted" />
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-primary">{selectedProductForVariants.product.name}</h4>
                  <p className="text-sm text-brand font-bold">{currencySymbol}{(selectedProductForVariants.product.price || 0).toLocaleString()}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {selectedProductForVariants.variants.map(v => {
                  const stock = getStock(selectedProductForVariants.product.id, v.id);
                  return (
                    <button
                      key={v.id}
                      onClick={() => {
                        if (stock > 0) {
                          addToCart(selectedProductForVariants.product, v);
                          setSelectedProductForVariants(null);
                        }
                      }}
                      disabled={stock <= 0}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        stock > 0 
                          ? 'bg-surface border-border hover:border-brand hover:bg-brand/10 cursor-pointer' 
                          : 'bg-surface-hover border-border opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <p className="font-bold text-sm text-primary">{v.name}</p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs font-bold text-brand">{currencySymbol}{(v.price || selectedProductForVariants.product.price || 0).toLocaleString()}</p>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {stock > 0 ? `${stock} in stock` : 'Out of stock'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Details Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface-hover/50">
              <h3 className="text-lg font-bold text-primary">Payment Details</h3>
              <button 
                onClick={() => setIsPaymentModalOpen(false)} 
                className="p-2 hover:bg-surface-hover rounded-xl transition-all"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <label className="block text-sm font-semibold text-secondary mb-2">
                Last 4 digits of {paymentMethod === 'Card' ? 'Card Number' : 'Phone Number'}
              </label>
              <input
                type="text"
                maxLength={4}
                autoFocus
                placeholder="XXXX"
                value={paymentDetails.last4Digits}
                onChange={(e) => setPaymentDetails({ last4Digits: e.target.value.replace(/\D/g, '') })}
                className="w-full bg-surface-hover border border-border rounded-xl px-4 py-3 text-lg font-bold text-center tracking-[0.2em] focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all font-mono"
              />
              <button
                onClick={() => {
                  setIsPaymentModalOpen(false);
                  executeCheckoutLogic();
                }}
                disabled={paymentDetails.last4Digits.length !== 4}
                className="w-full mt-6 bg-brand text-white rounded-xl py-3 font-bold text-sm tracking-wide hover:bg-brand-hover transition-all disabled:opacity-50"
              >
                Confirm & Checkout
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal 
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        variant={confirmConfig.variant}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
