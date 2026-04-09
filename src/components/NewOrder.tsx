import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Truck,
  CreditCard,
  X,
  Trash2,
  UserCheck,
  AlertCircle,
  ArrowLeft,
  Save,
  Search,
  ChevronDown
} from 'lucide-react';
import { db, auth, collection, query, serverTimestamp, Timestamp, doc, getDocs, where, runTransaction } from '../firebase';
import { toast } from 'sonner';
import { logActivity } from '../services/activityService';
import { checkDuplicateOrder } from '../services/orderService';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { useSettings } from '../contexts/SettingsContext';

export default function NewOrder() {
  const navigate = useNavigate();
  const { currencySymbol } = useSettings();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [variants, setVariants] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const [orderForm, setOrderForm] = useState({
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    customerCity: 'Dhaka',
    customerZone: 'Inside Dhaka',
    district: '',
    area: '',
    landmark: '',
    subtotal: 0,
    deliveryCharge: 80,
    discount: 0,
    totalAmount: 0,
    paidAmount: 0,
    dueAmount: 0,
    advanceAmount: 0,
    channel: 'Facebook',
    paymentMethod: 'COD',
    status: 'pending',
    items: [] as any[],
    warehouseId: '',
    notes: '',
    tags: '',
    courierId: '',
    courierName: '',
    trackingNumber: ''
  });

  const [newItem, setNewItem] = useState({ productId: '', variantId: '', quantity: 1, price: 0 });

  const statuses = ['pending', 'confirmed', 'processing', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'partial_delivered', 'cancelled', 'returned'];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const productsSnap = await getDocs(collection(db, 'products'));
        setProducts(productsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        
        const variantsSnap = await getDocs(collection(db, 'variants'));
        setVariants(variantsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        
        const warehousesSnap = await getDocs(collection(db, 'warehouses'));
        setWarehouses(warehousesSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowProductDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleZoneChange = (zone: string) => {
    let charge = 80;
    if (zone === 'Outside Dhaka') charge = 150;
    if (zone === 'Sub Area') charge = 130;
    setOrderForm({ ...orderForm, customerZone: zone, deliveryCharge: charge });
  };

  const handlePhoneChange = async (phone: string) => {
    setOrderForm(prev => ({ ...prev, customerPhone: phone }));
    if (phone.length >= 11) {
      try {
        const q = query(collection(db, 'customers'), where('phone', '==', phone));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const customerData = querySnapshot.docs[0].data();
          setOrderForm(prev => ({
            ...prev,
            customerName: customerData.name || prev.customerName,
            customerAddress: customerData.address || prev.customerAddress,
            district: customerData.district || prev.district,
            area: customerData.area || prev.area,
            landmark: customerData.landmark || prev.landmark,
            customerCity: customerData.city || prev.customerCity,
            customerZone: customerData.zone || prev.customerZone
          }));
          toast.success(`Found existing customer: ${customerData.name}`);
        }
      } catch (error) {
        console.error("Error fetching customer data:", error);
      }
    }
  };

  const calculateTotals = (items: any[], deliveryCharge: number, discount: number, paidAmount: number) => {
    const subtotal = items.reduce((acc, item) => acc + (item.quantity * item.price), 0);
    const totalAmount = subtotal + deliveryCharge - discount;
    const dueAmount = totalAmount - paidAmount;
    return { subtotal, totalAmount, dueAmount };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    if (orderForm.items.length === 0) {
      toast.error("Please add at least one item.");
      return;
    }
    if (!orderForm.warehouseId) {
      toast.error("Please select a warehouse.");
      return;
    }

    setLoading(true);
    try {
      const { subtotal, totalAmount, dueAmount } = calculateTotals(orderForm.items, orderForm.deliveryCharge, orderForm.discount, orderForm.paidAmount);
      
      const duplicate = await checkDuplicateOrder({
        customerPhone: orderForm.customerPhone,
        customerName: orderForm.customerName,
        items: orderForm.items,
        totalAmount: totalAmount
      });

      if (duplicate) {
        const confirmDuplicate = window.confirm(
          `Duplicate Order Detected!\n\nAn order (#${duplicate.orderNumber || duplicate.id.slice(0, 8)}) with the same phone number, products, and total value was found within the last 24 hours.\n\nAre you sure you want to create this duplicate order?`
        );
        if (!confirmDuplicate) {
          setLoading(false);
          return;
        }
      }

      const logEntry = {
        user: auth.currentUser.email,
        action: 'Created Order',
        timestamp: Timestamp.now(),
        details: 'Initial creation'
      };

      const data = {
        ...orderForm,
        subtotal,
        totalAmount,
        dueAmount,
        logs: [logEntry],
        updatedAt: serverTimestamp()
      };

      // 1. PRE-TRANSACTION READS
      const customerQuery = query(collection(db, 'customers'), where('phone', '==', orderForm.customerPhone));
      const customerSnap = await getDocs(customerQuery);

      const inventorySnaps: { item: any; snap: any }[] = [];
      for (const item of orderForm.items) {
        const invQuery = query(
          collection(db, 'inventory'),
          where('productId', '==', item.productId),
          where('variantId', '==', item.variantId || ''),
          where('warehouseId', '==', orderForm.warehouseId)
        );
        const invSnap = await getDocs(invQuery);
        inventorySnaps.push({ item, snap: invSnap });
      }

      await runTransaction(db, async (transaction) => {
        // 2. TRANSACTION READS
        const settingsRef = doc(db, 'settings', 'company');
        const settingsSnap = await transaction.get(settingsRef);

        // 3. ALL WRITES SECOND
        let customerId = '';
        if (customerSnap.empty) {
          const customerRef = doc(collection(db, 'customers'));
          transaction.set(customerRef, {
            name: orderForm.customerName,
            phone: orderForm.customerPhone,
            address: orderForm.customerAddress,
            orderCount: 1,
            totalSpent: totalAmount,
            lastOrderDate: serverTimestamp(),
            uid: auth.currentUser!.uid,
            createdAt: serverTimestamp()
          });
          customerId = customerRef.id;
        } else {
          const customerDoc = customerSnap.docs[0];
          customerId = customerDoc.id;
          transaction.update(customerDoc.ref, {
            orderCount: (customerDoc.data().orderCount || 0) + 1,
            totalSpent: (customerDoc.data().totalSpent || 0) + totalAmount,
            lastOrderDate: serverTimestamp()
          });
        }

        let nextOrderNumber = 1001;
        if (settingsSnap.exists() && settingsSnap.data().orderCounter) {
          nextOrderNumber = settingsSnap.data().orderCounter + 1;
        }
        transaction.set(settingsRef, { orderCounter: nextOrderNumber }, { merge: true });

        const orderRef = doc(collection(db, 'orders'));
        transaction.set(orderRef, {
          ...data,
          customerId,
          orderNumber: nextOrderNumber,
          uid: auth.currentUser!.uid,
          createdAt: serverTimestamp()
        });

        // Deduct Inventory
        for (const invData of inventorySnaps) {
          const { item, snap } = invData;
          if (!snap.empty) {
            const invDoc = snap.docs[0];
            const currentQty = invDoc.data().quantity;
            const newQty = currentQty - item.quantity;
            transaction.update(invDoc.ref, { quantity: newQty, updatedAt: serverTimestamp() });

            const logRef = doc(collection(db, 'inventoryLogs'));
            transaction.set(logRef, {
              productId: item.productId,
              variantId: item.variantId || '',
              warehouseId: orderForm.warehouseId,
              type: 'out',
              quantityChange: -item.quantity,
              newQuantity: newQty,
              reason: `Order #${nextOrderNumber}`,
              uid: auth.currentUser!.uid,
              createdAt: serverTimestamp()
            });
          }
        }
      });

      await logActivity(
        'Created Order',
        'Orders',
        `New Order for ${orderForm.customerName}`
      );

      toast.success("Order created successfully!");
      navigate('/orders');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'orders');
    } finally {
      setLoading(false);
    }
  };

  const { subtotal, totalAmount, dueAmount } = calculateTotals(orderForm.items, orderForm.deliveryCharge, orderForm.discount, orderForm.paidAmount);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.sku?.toLowerCase().includes(productSearch.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <button 
            onClick={() => navigate('/orders')}
            className="p-2 hover:bg-gray-100 rounded-xl transition-all shrink-0"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#141414] tracking-tight">Create Order</h2>
            <p className="text-xs sm:text-sm text-[#6b7280]">Fill in the details for a new order.</p>
          </div>
        </div>
        <button 
          onClick={handleSubmit}
          disabled={loading}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-[#00AEEF] text-white rounded-xl text-sm font-bold hover:bg-[#0095cc] transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
        >
          {loading ? 'Saving...' : (
            <>
              <Save size={18} />
              Save Order
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        <div className="lg:col-span-2 space-y-6 sm:space-y-8">
          {/* Customer Section */}
          <div className="bg-white p-4 sm:p-8 rounded-3xl border border-[#f3f4f6] shadow-sm space-y-6">
            <h4 className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-[#9ca3af] flex items-center gap-2">
              <UserCheck size={14} /> Customer Information
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider">Customer Name *</label>
                <input 
                  required
                  className="w-full px-4 py-2.5 sm:py-3 bg-[#f9fafb] border border-transparent rounded-xl text-sm focus:bg-[#ffffff] focus:border-[#00AEEF]/20 outline-none transition-all"
                  value={orderForm.customerName}
                  onChange={e => setOrderForm({...orderForm, customerName: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider">Phone Number *</label>
                <input 
                  required
                  className="w-full px-4 py-2.5 sm:py-3 bg-[#f9fafb] border border-transparent rounded-xl text-sm focus:bg-[#ffffff] focus:border-[#00AEEF]/20 outline-none transition-all"
                  value={orderForm.customerPhone}
                  onChange={e => handlePhoneChange(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider">Full Address</label>
              <textarea 
                className="w-full px-4 py-2.5 sm:py-3 bg-[#f9fafb] border border-transparent rounded-xl text-sm focus:bg-[#ffffff] focus:border-[#00AEEF]/20 outline-none transition-all resize-none"
                rows={2}
                value={orderForm.customerAddress}
                onChange={e => setOrderForm({...orderForm, customerAddress: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider">District</label>
                <input 
                  className="w-full px-4 py-2.5 sm:py-3 bg-[#f9fafb] border border-transparent rounded-xl text-sm focus:bg-[#ffffff] focus:border-[#00AEEF]/20 outline-none transition-all"
                  value={orderForm.district}
                  onChange={e => setOrderForm({...orderForm, district: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider">Area</label>
                <input 
                  className="w-full px-4 py-2.5 sm:py-3 bg-[#f9fafb] border border-transparent rounded-xl text-sm focus:bg-[#ffffff] focus:border-[#00AEEF]/20 outline-none transition-all"
                  value={orderForm.area}
                  onChange={e => setOrderForm({...orderForm, area: e.target.value})}
                />
              </div>
              <div className="col-span-2 sm:col-span-1 space-y-2">
                <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider">Landmark</label>
                <input 
                  className="w-full px-4 py-2.5 sm:py-3 bg-[#f9fafb] border border-transparent rounded-xl text-sm focus:bg-[#ffffff] focus:border-[#00AEEF]/20 outline-none transition-all"
                  value={orderForm.landmark}
                  onChange={e => setOrderForm({...orderForm, landmark: e.target.value})}
                />
              </div>
            </div>
          </div>

          {/* Items Section */}
          <div className="bg-white p-4 sm:p-8 rounded-3xl border border-[#f3f4f6] shadow-sm space-y-6">
            <h4 className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-[#9ca3af] flex items-center gap-2">
              <Truck size={14} /> Order Items & Fulfillment
            </h4>
            
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider">Fulfillment Warehouse</label>
              <select 
                required
                className="w-full px-4 py-2.5 sm:py-3 bg-[#f9fafb] border border-transparent rounded-xl text-sm focus:bg-[#ffffff] focus:border-[#00AEEF]/20 outline-none transition-all"
                value={orderForm.warehouseId}
                onChange={e => setOrderForm({...orderForm, warehouseId: e.target.value})}
              >
                <option value="">Select Warehouse</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>

            <div className="bg-[#f9fafb] p-4 sm:p-6 rounded-2xl space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
                {/* Searchable Product Select */}
                <div className="sm:col-span-5 space-y-1 relative" ref={dropdownRef}>
                  <label className="text-[8px] font-bold text-[#9ca3af] uppercase">Search Product</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <Search size={14} />
                    </div>
                    <input
                      type="text"
                      placeholder="Search by name or SKU..."
                      className="w-full pl-9 pr-4 py-2.5 sm:py-3 bg-white border border-[#f3f4f6] rounded-xl text-xs outline-none focus:border-[#00AEEF]/20 focus:ring-4 focus:ring-[#00AEEF]/5 transition-all"
                      value={productSearch}
                      onFocus={() => setShowProductDropdown(true)}
                      onChange={(e) => {
                        setProductSearch(e.target.value);
                        setShowProductDropdown(true);
                      }}
                    />
                    {showProductDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-[#f3f4f6] rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                        {filteredProducts.length > 0 ? (
                          filteredProducts.map(p => (
                            <button
                              key={p.id}
                              type="button"
                              className="w-full text-left px-4 py-3 hover:bg-[#f9fafb] flex items-center gap-3 transition-colors border-b border-[#f3f4f6] last:border-0"
                              onClick={() => {
                                setNewItem({...newItem, productId: p.id, variantId: '', price: p.price || 0});
                                setProductSearch(p.name);
                                setShowProductDropdown(false);
                              }}
                            >
                              {p.image && (
                                <img src={p.image} alt="" className="w-8 h-8 rounded-lg object-cover bg-gray-100" referrerPolicy="no-referrer" />
                              )}
                              <div>
                                <div className="text-xs font-bold text-[#141414]">{p.name}</div>
                                <div className="text-[10px] text-[#9ca3af]">{p.sku || 'No SKU'} • {currencySymbol}{p.price}</div>
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="p-4 text-center text-xs text-gray-400">No products found</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Variant Select */}
                <div className="sm:col-span-3 space-y-1">
                  <label className="text-[8px] font-bold text-[#9ca3af] uppercase">Variant</label>
                  <select 
                    disabled={!newItem.productId || products.find(p => p.id === newItem.productId)?.type !== 'variable'}
                    className="w-full p-2.5 sm:p-3 bg-white border border-[#f3f4f6] rounded-xl text-xs outline-none focus:border-[#00AEEF]/20 disabled:opacity-50 disabled:bg-gray-50 transition-all"
                    value={newItem.variantId}
                    onChange={e => {
                      const v = variants.find(varnt => varnt.id === e.target.value);
                      setNewItem({...newItem, variantId: e.target.value, price: v?.price || newItem.price});
                    }}
                  >
                    <option value="">Default Variant</option>
                    {newItem.productId && variants.filter(v => v.productId === newItem.productId).map(v => (
                      <option key={v.id} value={v.id}>{v.size} / {v.color} - {currencySymbol}{v.price}</option>
                    ))}
                  </select>
                </div>

                {/* Quantity */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[8px] font-bold text-[#9ca3af] uppercase">Qty</label>
                  <div className="flex items-center bg-white border border-[#f3f4f6] rounded-xl overflow-hidden">
                    <button 
                      type="button"
                      onClick={() => setNewItem(prev => ({...prev, quantity: Math.max(1, prev.quantity - 1)}))}
                      className="px-3 py-2.5 sm:py-3 hover:bg-gray-50 text-gray-500 transition-colors"
                    >
                      -
                    </button>
                    <input 
                      type="number" 
                      className="w-full text-center py-2.5 sm:py-3 text-xs outline-none"
                      value={newItem.quantity || 0}
                      onChange={e => setNewItem({...newItem, quantity: parseInt(e.target.value) || 0})}
                    />
                    <button 
                      type="button"
                      onClick={() => setNewItem(prev => ({...prev, quantity: prev.quantity + 1}))}
                      className="px-3 py-2.5 sm:py-3 hover:bg-gray-50 text-gray-500 transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Add Button */}
                <div className="sm:col-span-2">
                  <button 
                    type="button"
                    onClick={() => {
                      if (!newItem.productId) {
                        toast.error("Please select a product");
                        return;
                      }
                      const p = products.find(prod => prod.id === newItem.productId);
                      const v = variants.find(varnt => varnt.id === newItem.variantId);
                      const itemWithInfo = {
                        ...newItem,
                        name: p?.name || 'Unknown Product',
                        variant: v ? `${v.size} / ${v.color}` : '',
                        image: p?.image || ''
                      };
                      setOrderForm({...orderForm, items: [...orderForm.items, itemWithInfo]});
                      setNewItem({ productId: '', variantId: '', quantity: 1, price: 0 });
                      setProductSearch('');
                    }}
                    className="w-full h-[42px] bg-[#00AEEF] text-white rounded-xl text-xs font-bold hover:bg-[#0095cc] transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    <Plus size={16} />
                    Add
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {orderForm.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-white p-3 sm:p-4 rounded-xl border border-[#f3f4f6] shadow-sm hover:border-[#00AEEF]/20 transition-all group">
                    <div className="flex items-center gap-3 sm:gap-4">
                      {item.image && (
                        <img src={item.image} alt="" className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg object-cover bg-gray-50" referrerPolicy="no-referrer" />
                      )}
                      <div className="flex flex-col">
                        <span className="text-xs sm:text-sm font-bold text-[#141414]">{item.name}</span>
                        {item.variant && <span className="text-[10px] text-[#9ca3af] font-medium">{item.variant}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 sm:gap-8">
                      <div className="flex items-center bg-gray-50 border border-gray-100 rounded-lg overflow-hidden">
                        <button 
                          type="button"
                          onClick={() => {
                            const newItems = [...orderForm.items];
                            newItems[idx].quantity = Math.max(1, newItems[idx].quantity - 1);
                            setOrderForm({...orderForm, items: newItems});
                          }}
                          className="px-2 py-1 hover:bg-white text-gray-500 transition-colors"
                        >
                          -
                        </button>
                        <input 
                          type="number"
                          className="w-8 text-center bg-transparent text-[10px] font-bold outline-none"
                          value={item.quantity}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            const newItems = [...orderForm.items];
                            newItems[idx].quantity = val;
                            setOrderForm({...orderForm, items: newItems});
                          }}
                        />
                        <button 
                          type="button"
                          onClick={() => {
                            const newItems = [...orderForm.items];
                            newItems[idx].quantity = newItems[idx].quantity + 1;
                            setOrderForm({...orderForm, items: newItems});
                          }}
                          className="px-2 py-1 hover:bg-white text-gray-500 transition-colors"
                        >
                          +
                        </button>
                      </div>
                      <div className="text-right">
                        <div className="text-xs sm:text-sm font-bold text-[#141414]">{currencySymbol}{(item.quantity * item.price).toLocaleString()}</div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setOrderForm({...orderForm, items: orderForm.items.filter((_, i) => i !== idx)})}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
                {orderForm.items.length === 0 && (
                  <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-2xl">
                    No items added yet
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6 sm:space-y-8">
          {/* Summary Section */}
          <div className="bg-white p-4 sm:p-8 rounded-3xl border border-[#f3f4f6] shadow-sm space-y-6 lg:sticky lg:top-24">
            <h4 className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-[#9ca3af] flex items-center gap-2">
              <CreditCard size={14} /> Order Summary
            </h4>
            
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-bold">{currencySymbol}{subtotal.toLocaleString()}</span>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-[#9ca3af] uppercase">Delivery Zone</label>
                  <select 
                    className="text-[10px] sm:text-xs font-bold bg-gray-50 px-2 py-1 rounded-lg outline-none"
                    value={orderForm.customerZone}
                    onChange={e => handleZoneChange(e.target.value)}
                  >
                    <option value="Inside Dhaka">Inside Dhaka</option>
                    <option value="Sub Area">Sub Area</option>
                    <option value="Outside Dhaka">Outside Dhaka</option>
                  </select>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Delivery Charge</span>
                  <input 
                    type="number"
                    className="w-20 text-right font-bold text-blue-600 bg-transparent outline-none"
                    value={orderForm.deliveryCharge}
                    onChange={e => setOrderForm({...orderForm, deliveryCharge: parseFloat(e.target.value) || 0})}
                  />
                </div>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Discount</span>
                <input 
                  type="number"
                  className="w-20 text-right font-bold text-red-500 bg-transparent outline-none"
                  value={orderForm.discount}
                  onChange={e => setOrderForm({...orderForm, discount: parseFloat(e.target.value) || 0})}
                />
              </div>

              <div className="pt-4 border-t border-gray-100">
                <div className="flex justify-between items-center">
                  <span className="text-base sm:text-lg font-bold">Total</span>
                  <span className="text-xl sm:text-2xl font-bold text-[#00AEEF]">{currencySymbol}{totalAmount.toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#9ca3af] uppercase">Advance Paid</label>
                  <input 
                    type="number"
                    className="w-full px-4 py-2.5 sm:py-3 bg-[#f9fafb] border border-transparent rounded-xl text-sm font-bold text-green-600 focus:bg-white focus:border-[#00AEEF]/20 outline-none transition-all"
                    value={orderForm.paidAmount}
                    onChange={e => setOrderForm({...orderForm, paidAmount: parseFloat(e.target.value) || 0})}
                  />
                </div>
                
                <div className="flex justify-between text-sm p-4 bg-orange-50 rounded-2xl border border-orange-100">
                  <span className="text-orange-700 font-bold">Due Amount</span>
                  <span className="text-orange-700 font-bold">{currencySymbol}{dueAmount.toLocaleString()}</span>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#9ca3af] uppercase">Payment Method</label>
                  <select 
                    className="w-full px-4 py-2.5 sm:py-3 bg-[#f9fafb] border border-transparent rounded-xl text-sm focus:bg-white focus:border-[#00AEEF]/20 outline-none transition-all"
                    value={orderForm.paymentMethod}
                    onChange={e => setOrderForm({...orderForm, paymentMethod: e.target.value})}
                  >
                    <option value="COD">Cash on Delivery</option>
                    <option value="bKash">bKash</option>
                    <option value="Nagad">Nagad</option>
                    <option value="Rocket">Rocket</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#9ca3af] uppercase">Order Source</label>
                  <select 
                    className="w-full px-4 py-2.5 sm:py-3 bg-[#f9fafb] border border-transparent rounded-xl text-sm focus:bg-white focus:border-[#00AEEF]/20 outline-none transition-all"
                    value={orderForm.channel}
                    onChange={e => setOrderForm({...orderForm, channel: e.target.value})}
                  >
                    <option value="Facebook">Facebook</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Messenger">Messenger</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Call">Call</option>
                    <option value="Website">Website</option>
                    <option value="TikTok">TikTok</option>
                    <option value="Others">Others</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
