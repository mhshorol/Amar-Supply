import React, { useState, useEffect, useRef } from 'react';
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
  Scan
} from 'lucide-react';
import { db, auth, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, writeBatch, getDoc, getDocs, where, Timestamp, runTransaction } from '../firebase';
import { useReactToPrint } from 'react-to-print';
import { toast } from 'sonner';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { useSettings } from '../contexts/SettingsContext';
import { POSInvoice } from './InvoiceTemplates';
import { logActivity } from '../services/activityService';
import { checkDuplicateOrder } from '../services/orderService';

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
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  const [variants, setVariants] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'Mobile Banking'>('Cash');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', address: '' });
  const [completedOrder, setCompletedOrder] = useState<any>(null);
  const [companySettings, setCompanySettings] = useState<any>(null);

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    onAfterPrint: () => setCompletedOrder(null),
  });

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

    return () => {
      unsubProducts();
      unsubVariants();
      unsubInventory();
      unsubCustomers();
      unsubSettings();
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
        variantName: variant?.name,
        price: variant?.price || product.price,
        quantity: 1,
        stock,
        image: product.image
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

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    if (!selectedCustomer) {
      toast.error('Please select a customer');
      return;
    }

    setIsProcessing(true);
    try {
      // Duplicate Detection Check
      const duplicate = await checkDuplicateOrder({
        customerPhone: selectedCustomer.phone,
        customerName: selectedCustomer.name,
        items: cart.map(item => ({
          productId: item.productId,
          variantId: item.variantId || '',
          quantity: item.quantity,
          price: item.price
        })),
        totalAmount: total
      });

      if (duplicate) {
        const confirmDuplicate = window.confirm(
          `Duplicate Order Detected!\n\nAn order (#${duplicate.orderNumber || duplicate.id.slice(0, 8)}) with the same phone number, products, and total value was found within the last 24 hours.\n\nAre you sure you want to complete this duplicate sale?`
        );
        if (!confirmDuplicate) {
          setIsProcessing(false);
          return;
        }
      }

      await runTransaction(db, async (transaction) => {
        // 1. ALL READS FIRST
        const settingsRef = doc(db, 'settings', 'company');
        const settingsSnap = await transaction.get(settingsRef);

        const inventorySnaps: { item: any; snap: any }[] = [];
        for (const item of cart) {
          const invQuery = query(
            collection(db, 'inventory'), 
            where('productId', '==', item.productId),
            where('variantId', '==', item.variantId || '')
          );
          const invSnap = await getDocs(invQuery);
          inventorySnaps.push({ item, snap: invSnap });
        }

        // 2. CALCULATE NEXT ORDER NUMBER
        let nextOrderNumber = 1001;
        if (settingsSnap.exists() && settingsSnap.data().orderCounter) {
          nextOrderNumber = settingsSnap.data().orderCounter + 1;
        }

        // 3. ALL WRITES SECOND
        const orderRef = doc(collection(db, 'orders'));
        const orderData = {
          orderNumber: nextOrderNumber,
          customerName: selectedCustomer.name,
          customerPhone: selectedCustomer.phone,
          customerAddress: selectedCustomer.address || '',
          items: cart.map(item => ({
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
          status: 'Delivered',
          channel: 'POS',
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

            // Log stock change
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
          }
        }

        // Update Customer Points & Stats
        const customerRef = doc(db, 'customers', selectedCustomer.id);
        const customerSnap = await transaction.get(customerRef);
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
          description: `POS Sale #${nextOrderNumber}`,
          date: serverTimestamp(),
          paymentMethod,
          orderId: orderRef.id,
          orderNumber: nextOrderNumber,
          uid: auth.currentUser?.uid,
          createdAt: serverTimestamp()
        });

        // Set completed order for receipt
        setCompletedOrder({ ...orderData, id: orderRef.id });
      });

      await logActivity('POS Sale', 'POS', `Completed sale for ${total}`);
      
      setCart([]);
      setSelectedCustomer(null);
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

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone.includes(customerSearch)
  );

  if (loading) {
    return (
      <div className="h-[calc(100vh-120px)] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#00AEEF]" size={48} />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-120px)] flex gap-6 overflow-hidden">
      {/* Left Side: Product Selection */}
      <div className="flex-1 flex flex-col gap-6 min-w-0">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <form onSubmit={handleBarcodeScan} className="relative w-64 flex gap-2">
            <div className="relative flex-1">
              <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                ref={barcodeInputRef}
                type="text"
                placeholder="Scan Barcode..."
                className="w-full pl-10 pr-4 py-2.5 bg-[#00AEEF]/5 border border-transparent rounded-xl text-sm focus:bg-white focus:border-[#00AEEF]/20 outline-none transition-all font-mono"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                autoFocus
              />
            </div>
            <button
              type="button"
              onClick={() => setIsScannerOpen(true)}
              className="p-2.5 bg-gray-50 hover:bg-[#00AEEF] hover:text-white rounded-xl transition-all border border-transparent hover:border-[#00AEEF]/20"
              title="Camera Scan"
            >
              <Scan size={18} />
            </button>
          </form>

          <div className="w-px h-8 bg-gray-100" />

          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text"
              placeholder="Search products by name or SKU..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-transparent rounded-xl text-sm focus:bg-white focus:border-[#00AEEF]/20 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pb-8">
          {filteredProducts.map(product => {
            const productVariants = variants.filter(v => v.productId === product.id);
            const totalStock = getStock(product.id);

            return (
              <div 
                key={product.id}
                className="bg-white aspect-square border border-gray-100 rounded-2xl overflow-hidden transition-all flex flex-col group cursor-pointer relative"
                onClick={() => productVariants.length === 0 && totalStock > 0 && addToCart(product)}
              >
                {/* Status Badge */}
                <div className="absolute top-2 right-2 z-10">
                  {totalStock <= 0 ? (
                    <span className="bg-red-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider">Out of Stock</span>
                  ) : totalStock <= 5 ? (
                    <span className="bg-orange-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider">Low Stock</span>
                  ) : (
                    <span className="bg-[#00AEEF] text-white text-[7px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider">{totalStock} In Stock</span>
                  )}
                </div>

                {/* Product Image */}
                <div className="flex-1 w-full flex items-center justify-center p-2 relative overflow-hidden">
                  {product.image ? (
                    <img 
                      src={product.image} 
                      alt={product.name} 
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500 relative z-10" 
                      referrerPolicy="no-referrer" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-100 relative z-10">
                      <Package size={40} strokeWidth={1} />
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="p-2 bg-gray-50/50 border-t border-gray-100">
                  <h3 className="text-[10px] font-bold text-gray-900 line-clamp-1 group-hover:text-[#00AEEF] transition-colors uppercase tracking-tight">
                    {product.name}
                  </h3>
                  <p className="text-[11px] font-black text-[#00AEEF]">
                    {currencySymbol}{product.price?.toLocaleString()}
                  </p>
                </div>

                {/* Variant Quick Select Overlay (on hover) */}
                {productVariants.length > 0 && (
                  <div className="absolute inset-0 bg-white/95 p-2 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 z-20">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-2">Select Variant</p>
                    <div className="flex flex-wrap justify-center gap-1">
                      {productVariants.map(v => (
                        <button
                          key={v.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            addToCart(product, v);
                          }}
                          className="px-2 py-1 bg-white text-gray-900 text-[9px] font-bold hover:bg-[#00AEEF] hover:text-white transition-all border border-gray-100 rounded-lg"
                        >
                          {v.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Side: Cart & Checkout */}
      <div className="w-96 flex flex-col gap-6">
        {/* Customer Selection */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <User size={18} className="text-[#00AEEF]" />
              Customer
            </h3>
            <button 
              onClick={() => setIsCustomerModalOpen(true)}
              className="p-1.5 bg-gray-50 hover:bg-[#00AEEF] hover:text-white rounded-lg transition-all"
            >
              <UserPlus size={16} />
            </button>
          </div>

          {selectedCustomer ? (
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-[#00AEEF] font-bold">
                  {selectedCustomer.name[0]}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{selectedCustomer.name}</p>
                  <p className="text-xs text-gray-500">{selectedCustomer.phone}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedCustomer(null)}
                className="p-1.5 text-gray-400 hover:text-red-600 transition-all"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text"
                placeholder="Search customer..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-transparent rounded-xl text-sm focus:bg-white focus:border-[#00AEEF]/20 outline-none transition-all"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
              />
              {customerSearch && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 z-20 max-h-48 overflow-y-auto">
                  {filteredCustomers.length > 0 ? (
                    filteredCustomers.map(c => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setSelectedCustomer(c);
                          setCustomerSearch('');
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 rounded-xl transition-all flex items-center justify-between"
                      >
                        <div>
                          <p className="text-sm font-bold text-gray-900">{c.name}</p>
                          <p className="text-xs text-gray-500">{c.phone}</p>
                        </div>
                        <ChevronRight size={16} className="text-gray-300" />
                      </button>
                    ))
                  ) : (
                    <button
                      onClick={() => {
                        setNewCustomer({ ...newCustomer, phone: customerSearch });
                        setIsCustomerModalOpen(true);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-blue-50 rounded-xl transition-all flex items-center gap-3 text-[#00AEEF]"
                    >
                      <UserPlus size={18} />
                      <div className="flex-1">
                        <p className="text-sm font-bold">Add "{customerSearch}"</p>
                        <p className="text-[10px] uppercase font-bold tracking-wider opacity-70">New Customer</p>
                      </div>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cart Items */}
        <div className="flex-1 bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <ShoppingCart size={18} className="text-[#00AEEF]" />
              Cart Items
            </h3>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCart([])}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                title="Clear Cart"
              >
                <Trash2 size={16} />
              </button>
              <span className="px-2 py-1 bg-gray-50 rounded-lg text-[10px] font-bold text-gray-500">
                {cart.reduce((acc, i) => acc + i.quantity, 0)} Items
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-2">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-2">
                <ShoppingCart size={48} className="opacity-20" />
                <p className="text-xs font-medium">Your cart is empty</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {cart.map(item => (
                  <div key={item.id} className="py-2 flex items-center gap-3 group">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[11px] font-bold text-gray-900 truncate">
                        {item.name}
                        {item.variantName && <span className="ml-1 text-[9px] text-gray-400 font-medium">({item.variantName})</span>}
                      </h4>
                      <p className="text-[10px] font-bold text-[#00AEEF]">{currencySymbol}{item.price.toLocaleString()}</p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 bg-gray-50 rounded-lg p-0.5 border border-gray-100">
                        <button 
                          onClick={() => updateQuantity(item.id, -1)}
                          className="p-0.5 hover:bg-white hover:shadow-sm rounded transition-all text-gray-500"
                        >
                          <Minus size={10} />
                        </button>
                        <span className="text-[11px] font-bold w-4 text-center">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.id, 1)}
                          className="p-0.5 hover:bg-white hover:shadow-sm rounded transition-all text-gray-500"
                        >
                          <Plus size={10} />
                        </button>
                      </div>
                      
                      <button 
                        onClick={() => removeFromCart(item.id)}
                        className="p-1 text-gray-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Summary & Checkout */}
          <div className="p-6 bg-gray-50 border-t border-gray-100 space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Subtotal</span>
                <span className="font-bold text-gray-900">{currencySymbol}{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>Discount</span>
                <input 
                  type="number"
                  className="w-20 text-right bg-transparent border-b border-gray-200 focus:border-[#00AEEF] outline-none font-bold text-gray-900"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                />
              </div>
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>Tax</span>
                <input 
                  type="number"
                  className="w-20 text-right bg-transparent border-b border-gray-200 focus:border-[#00AEEF] outline-none font-bold text-gray-900"
                  value={tax}
                  onChange={(e) => setTax(Number(e.target.value))}
                />
              </div>
              <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
                <span className="text-sm font-bold text-gray-900">Total</span>
                <span className="text-lg font-bold text-[#00AEEF]">{currencySymbol}{total.toLocaleString()}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button 
                onClick={() => setPaymentMethod('Cash')}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${
                  paymentMethod === 'Cash' ? 'bg-[#00AEEF] text-white border-[#00AEEF]' : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50'
                }`}
              >
                <Banknote size={16} />
                <span className="text-[10px] font-bold">Cash</span>
              </button>
              <button 
                onClick={() => setPaymentMethod('Card')}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${
                  paymentMethod === 'Card' ? 'bg-[#00AEEF] text-white border-[#00AEEF]' : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50'
                }`}
              >
                <CreditCard size={16} />
                <span className="text-[10px] font-bold">Card</span>
              </button>
              <button 
                onClick={() => setPaymentMethod('Mobile Banking')}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${
                  paymentMethod === 'Mobile Banking' ? 'bg-[#00AEEF] text-white border-[#00AEEF]' : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50'
                }`}
              >
                <Smartphone size={16} />
                <span className="text-[10px] font-bold">Mobile</span>
              </button>
            </div>

            <button 
              onClick={handleCheckout}
              disabled={isProcessing || cart.length === 0}
              className="w-full py-4 bg-[#141414] text-white rounded-2xl font-bold hover:bg-black transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isProcessing ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  <CheckCircle2 size={20} />
                  Complete Sale
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Camera Scanner Modal */}
      {isScannerOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Scan size={20} className="text-[#00AEEF]" />
                Camera Scanner
              </h3>
              <button onClick={() => setIsScannerOpen(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-all">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <div id="reader" className="w-full overflow-hidden rounded-2xl border-2 border-dashed border-gray-200"></div>
              <p className="text-center text-xs text-gray-500 mt-4">
                Position the barcode within the scanner frame to scan automatically.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Add New Customer</h3>
              <button onClick={() => setIsCustomerModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-all">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Full Name</label>
                <input 
                  type="text"
                  className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl text-sm focus:bg-white focus:border-[#00AEEF]/20 outline-none transition-all"
                  placeholder="Enter customer name"
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Phone Number</label>
                <input 
                  type="text"
                  className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl text-sm focus:bg-white focus:border-[#00AEEF]/20 outline-none transition-all"
                  placeholder="Enter phone number"
                  value={newCustomer.phone}
                  onChange={(e) => handleNewCustomerPhoneChange(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Address (Optional)</label>
                <textarea 
                  className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl text-sm focus:bg-white focus:border-[#00AEEF]/20 outline-none transition-all resize-none h-24"
                  placeholder="Enter address"
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                />
              </div>
              <button 
                onClick={handleAddCustomer}
                className="w-full py-4 bg-[#00AEEF] text-white rounded-2xl font-bold hover:bg-[#0095cc] transition-all shadow-lg"
              >
                Save Customer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sale Success / Receipt Modal */}
      {completedOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-8 text-center space-y-6">
              <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto text-green-500">
                <CheckCircle2 size={48} />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-gray-900">Sale Completed!</h3>
                <p className="text-sm text-gray-500">Order #{completedOrder.orderNumber} has been processed successfully.</p>
              </div>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setCompletedOrder(null)}
                  className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                >
                  Close
                </button>
                <button 
                  onClick={() => handlePrint()}
                  className="flex-1 py-4 bg-[#141414] text-white rounded-2xl font-bold hover:bg-black transition-all flex items-center justify-center gap-2"
                >
                  <Printer size={20} />
                  Print Receipt
                </button>
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
    </div>
  );
}
