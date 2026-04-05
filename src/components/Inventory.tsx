import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Plus, 
  Download, 
  Package, 
  AlertTriangle, 
  ArrowUpRight, 
  ArrowDownRight,
  MoreVertical,
  Edit,
  Trash2,
  Warehouse,
  Tag,
  DollarSign,
  X,
  Loader2,
  MinusCircle,
  PlusCircle,
  Image as ImageIcon,
  Printer,
  Barcode as BarcodeIcon
} from 'lucide-react';
import { db, auth, storage, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, updateDoc, writeBatch, getDoc, getDocs, where, ref, uploadBytes, getDownloadURL } from '../firebase';
import { logActivity } from '../services/activityService';
import Barcode from 'react-barcode';
import { useReactToPrint } from 'react-to-print';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

import { useSettings } from '../contexts/SettingsContext';

const StockBadge = ({ stock }: { stock: number }) => {
  let status = 'In Stock';
  let colorClass = 'bg-green-50 text-green-600 border-green-100';
  
  if (stock <= 0) {
    status = 'Out of Stock';
    colorClass = 'bg-red-50 text-red-600 border-red-100';
  } else if (stock < 20) {
    status = 'Low Stock';
    colorClass = 'bg-orange-50 text-orange-600 border-orange-100';
  }

  return (
    <div className="flex flex-col gap-1">
      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border w-fit ${colorClass}`}>
        {status}
      </span>
      <span className="text-xs font-mono font-bold text-gray-500">{stock} units</span>
    </div>
  );
};

export default function Inventory() {
  const { currencySymbol } = useSettings();
  const [activeTab, setActiveTab] = useState<'products' | 'warehouses' | 'stock' | 'purchases' | 'suppliers' | 'returns' | 'logs' | 'reports'>('products');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Data States
  const [products, setProducts] = useState<any[]>([]);
  const [variants, setVariants] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [stockLogs, setStockLogs] = useState<any[]>([]);

  // Modal States
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isPOModalOpen, setIsPOModalOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  useEffect(() => {
    if (!auth.currentUser) return;

    const unsubscribes: (() => void)[] = [];

    const collections = [
      { name: 'products', setter: setProducts },
      { name: 'variants', setter: setVariants },
      { name: 'warehouses', setter: setWarehouses },
      { name: 'categories', setter: setCategories },
      { name: 'brands', setter: setBrands },
      { name: 'inventory', setter: setInventory },
      { name: 'purchaseOrders', setter: setPurchaseOrders },
      { name: 'suppliers', setter: setSuppliers },
      { name: 'inventoryLogs', setter: setLogs },
      { name: 'stock_logs', setter: setStockLogs }
    ];

    collections.forEach(col => {
      const q = query(collection(db, col.name), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        col.setter(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        if (col.name === 'products') setLoading(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, col.name);
      });
      unsubscribes.push(unsubscribe);
    });

    return () => unsubscribes.forEach(unsub => unsub());
  }, []);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'products': return <ProductsTab products={products} variants={variants} categories={categories} brands={brands} onEdit={(p: any) => { setEditingItem(p); setIsProductModalOpen(true); }} onAddCategory={() => setIsCategoryModalOpen(true)} onAddBrand={() => setIsBrandModalOpen(true)} />;
      case 'warehouses': return <WarehousesTab warehouses={warehouses} onEdit={(w: any) => { setEditingItem(w); setIsWarehouseModalOpen(true); }} />;
      case 'stock': return <StockTab inventory={inventory} products={products} variants={variants} warehouses={warehouses} onAdjust={() => setIsAdjustmentModalOpen(true)} onTransfer={() => setIsTransferModalOpen(true)} />;
      case 'purchases': return <PurchasesTab pos={purchaseOrders} suppliers={suppliers} products={products} variants={variants} onAdd={() => setIsPOModalOpen(true)} />;
      case 'suppliers': return <SuppliersTab suppliers={suppliers} onEdit={(s: any) => { setEditingItem(s); setIsSupplierModalOpen(true); }} />;
      case 'returns': return <ReturnsTab products={products} variants={variants} warehouses={warehouses} />;
      case 'logs': return <LogsTab logs={logs} products={products} variants={variants} warehouses={warehouses} />;
      case 'reports': return <ReportsTab products={products} inventory={inventory} logs={logs} />;
      default: return null;
    }
  };

  const lowStockItems = inventory.filter((item: any) => {
    const product = products.find((p: any) => p.id === item.productId);
    return item.quantity <= (product?.minStock || 5);
  });

  return (
    <div className="space-y-6">
      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl animate-pulse">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-full text-red-600">
              <Plus className="rotate-45" />
            </div>
            <div>
              <p className="text-sm font-bold text-red-800">Low Stock Alert</p>
              <p className="text-xs text-red-600">{lowStockItems.length} items are below minimum stock levels.</p>
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-[#141414] tracking-tight">Inventory Management</h2>
          <p className="text-sm text-gray-500 mt-1">Full-stack control over products, variants, warehouses, and stock movements.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              setEditingItem(null);
              if (activeTab === 'products') setIsProductModalOpen(true);
              if (activeTab === 'warehouses') setIsWarehouseModalOpen(true);
              if (activeTab === 'purchases') setIsPOModalOpen(true);
              if (activeTab === 'stock') setIsAdjustmentModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[#141414] text-white rounded-lg text-sm font-medium hover:bg-black transition-colors"
          >
            <Plus size={16} />
            Add {activeTab.slice(0, -1)}
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl w-fit overflow-x-auto max-w-full">
        {(['products', 'warehouses', 'stock', 'purchases', 'suppliers', 'returns', 'logs', 'reports'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
              activeTab === tab 
                ? 'bg-white text-[#141414] shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="min-h-[500px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="animate-spin text-gray-400" size={32} />
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Loading {activeTab}...</p>
          </div>
        ) : (
          renderTabContent()
        )}
      </div>

      {/* Modals Placeholder - Will implement detailed modals next */}
      {isProductModalOpen && <ProductModal isOpen={isProductModalOpen} onClose={() => { setIsProductModalOpen(false); setEditingItem(null); }} editingItem={editingItem} categories={categories} brands={brands} products={products} />}
      {isWarehouseModalOpen && <WarehouseModal isOpen={isWarehouseModalOpen} onClose={() => { setIsWarehouseModalOpen(false); setEditingItem(null); }} editingItem={editingItem} />}
      {isAdjustmentModalOpen && <AdjustmentModal isOpen={isAdjustmentModalOpen} onClose={() => setIsAdjustmentModalOpen(false)} products={products} variants={variants} warehouses={warehouses} />}
      {isTransferModalOpen && <TransferModal isOpen={isTransferModalOpen} onClose={() => setIsTransferModalOpen(false)} products={products} variants={variants} warehouses={warehouses} />}
      {isPOModalOpen && <POModal isOpen={isPOModalOpen} onClose={() => setIsPOModalOpen(false)} suppliers={suppliers} products={products} variants={variants} />}
      {isSupplierModalOpen && <SupplierModal isOpen={isSupplierModalOpen} onClose={() => { setIsSupplierModalOpen(false); setEditingItem(null); }} editingItem={editingItem} />}
      {isCategoryModalOpen && <CategoryModal isOpen={isCategoryModalOpen} onClose={() => { setIsCategoryModalOpen(false); setEditingItem(null); }} editingItem={editingItem} />}
      {isBrandModalOpen && <BrandModal isOpen={isBrandModalOpen} onClose={() => { setIsBrandModalOpen(false); setEditingItem(null); }} editingItem={editingItem} />}
    </div>
  );
}

// --- Sub-components for Tabs ---

function ProductsTab({ products, variants, categories, brands, onEdit, onAddCategory, onAddBrand }: any) {
  const { currencySymbol } = useSettings();
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    onBeforePrint: () => {
      return new Promise((resolve) => {
        setTimeout(resolve, 500);
      });
    },
    onPrintError: (errorLocation, error) => {
      console.error("Print error:", errorLocation, error);
      toast.error("Standard print failed. Attempting manual print...");
      setTimeout(() => {
        window.print();
      }, 500);
    }
  });

  const triggerPrint = (product: any) => {
    setSelectedProduct(product);
    setTimeout(() => {
      handlePrint();
    }, 500);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', opacity: 0, pointerEvents: 'none' }}>
        <div ref={printRef} className="p-8 flex flex-col items-center justify-center bg-white">
          {selectedProduct && (
            <div className="border-2 border-black p-4 rounded-lg flex flex-col items-center gap-2">
              <p className="text-lg font-bold">{selectedProduct.name}</p>
              <Barcode 
                value={selectedProduct.barcode || selectedProduct.sku || 'NO-BARCODE'} 
                width={2}
                height={80}
                fontSize={14}
              />
              <p className="text-sm font-bold">{currencySymbol}{selectedProduct.price}</p>
            </div>
          )}
        </div>
      </div>
      <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Product Catalog</h3>
        <div className="flex gap-2">
          <button onClick={onAddCategory} className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest border border-gray-200 rounded-lg hover:bg-white transition-all">Categories</button>
          <button onClick={onAddBrand} className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest border border-gray-200 rounded-lg hover:bg-white transition-all">Brands</button>
        </div>
      </div>
      <table className="w-full text-left">
        <thead>
          <tr className="bg-gray-50 text-[10px] uppercase tracking-widest text-gray-500">
            <th className="px-6 py-4 font-semibold">Product</th>
            <th className="px-6 py-4 font-semibold">Type</th>
            <th className="px-6 py-4 font-semibold">SKU</th>
            <th className="px-6 py-4 font-semibold">Category/Brand</th>
            <th className="px-6 py-4 font-semibold">Price</th>
            <th className="px-6 py-4 font-semibold text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {products.map((p: any) => (
            <tr key={p.id} className="hover:bg-gray-50 transition-colors group">
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  {p.images?.[0] ? (
                    <img src={p.images[0]} alt="" className="w-10 h-10 rounded-lg object-cover border border-gray-100" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">
                      <Package size={20} />
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-[#141414]">{p.name}</span>
                    <span className="text-[10px] text-gray-400">{p.barcode || 'No Barcode'}</span>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${
                  p.type === 'bundle' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                  p.type === 'variable' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                  'bg-gray-50 text-gray-600 border-gray-100'
                }`}>
                  {p.type}
                </span>
              </td>
              <td className="px-6 py-4 font-mono text-xs text-gray-500">{p.sku}</td>
              <td className="px-6 py-4">
                <div className="flex flex-col">
                  <span className="text-xs text-gray-600">{categories.find((c: any) => c.id === p.categoryId)?.name || 'Uncategorized'}</span>
                  <span className="text-[10px] text-gray-400">{brands.find((b: any) => b.id === p.brandId)?.name || 'No Brand'}</span>
                </div>
              </td>
              <td className="px-6 py-4 font-bold text-sm">{currencySymbol}{p.price?.toLocaleString()}</td>
              <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  <button 
                    onClick={() => triggerPrint(p)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-blue-600"
                    title="Print Barcode"
                  >
                    <Printer size={16} />
                  </button>
                  <button onClick={() => onEdit(p)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <Edit size={16} className="text-gray-400" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WarehousesTab({ warehouses, onEdit }: any) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {warehouses.map((w: any) => (
        <div key={w.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Warehouse size={24} />
            </div>
            <button onClick={() => onEdit(w)} className="p-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Edit size={16} className="text-gray-400" />
            </button>
          </div>
          <h3 className="text-lg font-bold text-[#141414]">{w.name}</h3>
          <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
            <Tag size={12} />
            {w.location}
          </div>
          <p className="text-xs text-gray-400 mt-4 leading-relaxed">{w.address}</p>
        </div>
      ))}
    </div>
  );
}

function StockTab({ inventory, products, variants, warehouses, onAdjust, onTransfer }: any) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Stock Levels</h3>
        <div className="flex gap-2">
          <button onClick={onAdjust} className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all">Adjustment</button>
          <button onClick={onTransfer} className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all">Transfer</button>
        </div>
      </div>
      <table className="w-full text-left">
        <thead>
          <tr className="bg-gray-50 text-[10px] uppercase tracking-widest text-gray-500">
            <th className="px-6 py-4 font-semibold">Item</th>
            <th className="px-6 py-4 font-semibold">Warehouse</th>
            <th className="px-6 py-4 font-semibold">Quantity</th>
            <th className="px-6 py-4 font-semibold">Alert Level</th>
            <th className="px-6 py-4 font-semibold text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {inventory.map((inv: any) => {
            const product = products.find((p: any) => p.id === inv.productId);
            const variant = variants.find((v: any) => v.id === inv.variantId);
            const warehouse = warehouses.find((w: any) => w.id === inv.warehouseId);
            const isLowStock = inv.quantity <= (product?.minStock || 5);
            return (
              <tr key={inv.id} className={`hover:bg-gray-50 transition-colors ${isLowStock ? 'bg-red-50/30' : ''}`}>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold">{product?.name || 'Unknown'}</span>
                    {variant && (
                      <span className="text-[10px] text-gray-400">
                        {variant.size} / {variant.color} / {variant.fabric}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-xs text-gray-600">{warehouse?.name || 'Unknown'}</td>
                <td className="px-6 py-4">
                  <StockBadge stock={inv.quantity} />
                </td>
                <td className="px-6 py-4 text-xs font-mono text-gray-500">{product?.minStock || 5}</td>
                <td className="px-6 py-4 text-right">
                  <button onClick={onAdjust} className="text-xs font-bold text-blue-600 hover:underline">Adjust</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PurchasesTab({ pos, suppliers, products, variants, onAdd }: any) {
  const { currencySymbol } = useSettings();
  const handleReceive = async (po: any) => {
    if (!window.confirm('Mark this PO as received? This will update inventory.')) return;
    try {
      const batch = writeBatch(db);
      const warehouseId = prompt('Enter Warehouse ID to receive into (default: first warehouse):', '');
      const targetWarehouseId = warehouseId || (await getDocs(collection(db, 'warehouses'))).docs[0]?.id;

      if (!targetWarehouseId) {
        toast.error('No warehouse found. Please create a warehouse first.');
        return;
      }

      for (const item of po.items) {
        const inventoryId = `${targetWarehouseId}_${item.productId}_${item.variantId || 'none'}`;
        const inventoryRef = doc(db, 'inventory', inventoryId);
        const inventorySnap = await getDoc(inventoryRef);

        if (inventorySnap.exists()) {
          batch.update(inventoryRef, {
            quantity: inventorySnap.data().quantity + item.quantity,
            updatedAt: serverTimestamp()
          });
        } else {
          batch.set(inventoryRef, {
            warehouseId: targetWarehouseId,
            productId: item.productId,
            variantId: item.variantId || null,
            quantity: item.quantity,
            uid: auth.currentUser?.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }

        // Log
        const logRef = doc(collection(db, 'inventoryLogs'));
        batch.set(logRef, {
          productId: item.productId,
          variantId: item.variantId || null,
          warehouseId: targetWarehouseId,
          action: 'purchase',
          quantityChange: item.quantity,
          newQuantity: (inventorySnap.exists() ? inventorySnap.data().quantity : 0) + item.quantity,
          referenceId: po.id,
          uid: auth.currentUser?.uid,
          createdAt: serverTimestamp()
        });
      }

      batch.update(doc(db, 'purchaseOrders', po.id), { status: 'received', receivedAt: serverTimestamp(), updatedAt: serverTimestamp() });
      await batch.commit();
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `purchaseOrders/${po.id}`);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Purchase Orders</h3>
        <button onClick={onAdd} className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest bg-[#141414] text-white rounded-lg hover:bg-black transition-all">New PO</button>
      </div>
      <table className="w-full text-left">
        <thead>
          <tr className="bg-gray-50 text-[10px] uppercase tracking-widest text-gray-500">
            <th className="px-6 py-4 font-semibold">PO ID</th>
            <th className="px-6 py-4 font-semibold">Supplier</th>
            <th className="px-6 py-4 font-semibold">Status</th>
            <th className="px-6 py-4 font-semibold">Total Cost</th>
            <th className="px-6 py-4 font-semibold">Created</th>
            <th className="px-6 py-4 font-semibold text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {pos.map((po: any) => (
            <tr key={po.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4 font-mono text-xs uppercase">{po.id.slice(0, 8)}</td>
              <td className="px-6 py-4 text-sm">{suppliers.find((s: any) => s.id === po.supplierId)?.name || 'Unknown'}</td>
              <td className="px-6 py-4">
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${
                  po.status === 'received' ? 'bg-green-50 text-green-600 border-green-100' :
                  po.status === 'ordered' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                  'bg-gray-50 text-gray-600 border-gray-100'
                }`}>
                  {po.status}
                </span>
              </td>
              <td className="px-6 py-4 font-bold text-sm">{currencySymbol}{po.totalCost?.toLocaleString()}</td>
              <td className="px-6 py-4 text-xs text-gray-400">{po.createdAt?.toDate ? po.createdAt.toDate().toLocaleDateString() : (po.createdAt?.seconds ? new Date(po.createdAt.seconds * 1000).toLocaleDateString() : 'N/A')}</td>
              <td className="px-6 py-4 text-right">
                {po.status !== 'received' && (
                  <button onClick={() => handleReceive(po)} className="text-xs font-bold text-green-600 hover:underline">Receive</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SuppliersTab({ suppliers, onEdit }: any) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <table className="w-full text-left">
        <thead>
          <tr className="bg-gray-50 text-[10px] uppercase tracking-widest text-gray-500">
            <th className="px-6 py-4 font-semibold">Supplier Name</th>
            <th className="px-6 py-4 font-semibold">Contact Person</th>
            <th className="px-6 py-4 font-semibold">Phone</th>
            <th className="px-6 py-4 font-semibold">Email</th>
            <th className="px-6 py-4 font-semibold text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {suppliers.map((s: any) => (
            <tr key={s.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4 text-sm font-bold">{s.name}</td>
              <td className="px-6 py-4 text-sm">{s.contactPerson}</td>
              <td className="px-6 py-4 text-sm">{s.phone}</td>
              <td className="px-6 py-4 text-sm text-gray-500">{s.email}</td>
              <td className="px-6 py-4 text-right">
                <button onClick={() => onEdit(s)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <Edit size={16} className="text-gray-400" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReturnsTab({ products, variants, warehouses }: any) {
  const [returns, setReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'returnRequests'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setReturns(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleApproveReturn = async (ret: any) => {
    if (!window.confirm('Approve this return? This will add stock back to the selected warehouse.')) return;
    try {
      const batch = writeBatch(db);
      const inventoryId = `${ret.warehouseId}_${ret.productId}_${ret.variantId || 'none'}`;
      const inventoryRef = doc(db, 'inventory', inventoryId);
      const inventorySnap = await getDoc(inventoryRef);

      const currentQty = inventorySnap.exists() ? inventorySnap.data().quantity : 0;
      const newQty = currentQty + ret.quantity;

      if (inventorySnap.exists()) {
        batch.update(inventoryRef, { quantity: newQty, updatedAt: serverTimestamp() });
      } else {
        batch.set(inventoryRef, {
          warehouseId: ret.warehouseId,
          productId: ret.productId,
          variantId: ret.variantId || null,
          quantity: ret.quantity,
          uid: auth.currentUser?.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }

      // Log
      const logRef = doc(collection(db, 'inventoryLogs'));
      batch.set(logRef, {
        productId: ret.productId,
        variantId: ret.variantId || null,
        warehouseId: ret.warehouseId,
        action: 'return',
        quantityChange: ret.quantity,
        newQuantity: newQty,
        referenceId: ret.id,
        uid: auth.currentUser?.uid,
        createdAt: serverTimestamp()
      });

      batch.update(doc(db, 'returnRequests', ret.id), { status: 'approved', approvedAt: serverTimestamp() });
      await batch.commit();
      toast.success('Return approved and stock updated');
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `returnRequests/${ret.id}`);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Return & Exchange Requests</h3>
      </div>
      <table className="w-full text-left">
        <thead>
          <tr className="bg-gray-50 text-[10px] uppercase tracking-widest text-gray-500">
            <th className="px-6 py-4 font-semibold">Order ID</th>
            <th className="px-6 py-4 font-semibold">Product</th>
            <th className="px-6 py-4 font-semibold">Reason</th>
            <th className="px-6 py-4 font-semibold">Status</th>
            <th className="px-6 py-4 font-semibold text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {returns.map((ret: any) => {
            const product = products.find((p: any) => p.id === ret.productId);
            return (
              <tr key={ret.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 font-mono text-xs uppercase">#{ret.orderNumber || ret.orderId?.slice(0, 8)}</td>
                <td className="px-6 py-4 text-sm font-bold">{product?.name || 'Unknown'}</td>
                <td className="px-6 py-4 text-xs text-gray-500">{ret.reason}</td>
                <td className="px-6 py-4">
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${
                    ret.status === 'approved' ? 'bg-green-50 text-green-600 border-green-100' :
                    ret.status === 'pending' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                    'bg-gray-50 text-gray-600 border-gray-100'
                  }`}>
                    {ret.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  {ret.status === 'pending' && (
                    <button onClick={() => handleApproveReturn(ret)} className="text-xs font-bold text-green-600 hover:underline">Approve</button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function LogsTab({ logs, products, variants, warehouses }: any) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <table className="w-full text-left">
        <thead>
          <tr className="bg-gray-50 text-[10px] uppercase tracking-widest text-gray-500">
            <th className="px-6 py-4 font-semibold">Time</th>
            <th className="px-6 py-4 font-semibold">Action</th>
            <th className="px-6 py-4 font-semibold">Item</th>
            <th className="px-6 py-4 font-semibold">Warehouse</th>
            <th className="px-6 py-4 font-semibold">Change</th>
            <th className="px-6 py-4 font-semibold">New Stock</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {logs.map((log: any) => {
            const product = products.find((p: any) => p.id === log.productId);
            const warehouse = warehouses.find((w: any) => w.id === log.warehouseId);
            return (
              <tr key={log.id} className="text-xs">
                <td className="px-6 py-4 text-gray-400">{log.createdAt?.toDate ? log.createdAt.toDate().toLocaleString() : (log.createdAt?.seconds ? new Date(log.createdAt.seconds * 1000).toLocaleString() : 'N/A')}</td>
                <td className="px-6 py-4">
                  <span className="font-bold uppercase tracking-tighter">{log.action}</span>
                </td>
                <td className="px-6 py-4 font-medium">{product?.name || 'Unknown'}</td>
                <td className="px-6 py-4">{warehouse?.name || 'Unknown'}</td>
                <td className={`px-6 py-4 font-bold ${log.quantityChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {log.quantityChange > 0 ? '+' : ''}{log.quantityChange}
                </td>
                <td className="px-6 py-4 font-mono">{log.newQuantity}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ReportsTab({ products, inventory, logs }: any) {
  const { currencySymbol } = useSettings();
  const totalCost = inventory.reduce((acc: number, inv: any) => {
    const p = products.find((prod: any) => prod.id === inv.productId);
    return acc + (inv.quantity * (p?.costPrice || 0));
  }, 0);

  const totalRetail = inventory.reduce((acc: number, inv: any) => {
    const p = products.find((prod: any) => prod.id === inv.productId);
    return acc + (inv.quantity * (p?.price || 0));
  }, 0);

  const lowStock = inventory.filter((inv: any) => {
    const p = products.find((prod: any) => prod.id === inv.productId);
    return inv.quantity <= (p?.minStock || 5);
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase mb-1">Inventory Value (Cost)</p>
          <p className="text-2xl font-bold text-[#141414]">{currencySymbol}{totalCost.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase mb-1">Potential Revenue</p>
          <p className="text-2xl font-bold text-green-600">{currencySymbol}{totalRetail.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase mb-1">Potential Profit</p>
          <p className="text-2xl font-bold text-blue-600">{currencySymbol}{(totalRetail - totalCost).toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-bold mb-4">Low Stock Items</h3>
          <div className="space-y-3">
            {lowStock.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No low stock items.</p>
            ) : (
              lowStock.map((inv: any) => {
                const p = products.find((prod: any) => prod.id === inv.productId);
                return (
                  <div key={inv.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div>
                      <p className="text-sm font-bold">{p?.name}</p>
                      <p className="text-[10px] text-gray-400 uppercase">Warehouse: {inv.warehouseId}</p>
                    </div>
                    <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded-full">
                      {inv.quantity} left
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-bold mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {logs.slice(0, 5).map((log: any) => {
              const p = products.find((prod: any) => prod.id === log.productId);
              return (
                <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div>
                    <p className="text-sm font-bold">{p?.name}</p>
                    <p className="text-[10px] text-gray-400 uppercase">{log.action.replace('_', ' ')}</p>
                  </div>
                  <span className={`text-xs font-bold ${log.quantityChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {log.quantityChange > 0 ? '+' : ''}{log.quantityChange}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Modals (Simplified for now, will expand in next turn) ---

function ProductModal({ isOpen, onClose, editingItem, categories, brands, products }: any) {
  const { currencySymbol } = useSettings();
  const [form, setForm] = useState(editingItem || {
    name: '', sku: '', type: 'simple', price: 0, costPrice: 0, categoryId: '', brandId: '', barcode: '', minStock: 10, description: '', images: []
  });
  const [productVariants, setProductVariants] = useState<any[]>([]);
  const [newVariant, setNewVariant] = useState({ size: '', color: '', fabric: '', sku: '', barcode: '', price: 0, costPrice: 0 });
  const [uploading, setUploading] = useState(false);
  const barcodeRef = useRef<HTMLDivElement>(null);

  const handlePrintBarcode = useReactToPrint({
    contentRef: barcodeRef,
    onBeforePrint: () => {
      return new Promise((resolve) => {
        setTimeout(resolve, 500);
      });
    },
    onPrintError: (errorLocation, error) => {
      console.error("Print error:", errorLocation, error);
      toast.error("Printing failed. Please try again or use the download option.");
    }
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const storageRef = ref(storage, `products/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setForm({ ...form, images: [...(form.images || []), url] });
      toast.success('Image uploaded successfully');
    } catch (e) {
      toast.error('Failed to upload image');
      console.error(e);
    } finally {
      setUploading(false);
    }
  };

  const downloadBarcode = () => {
    const svg = barcodeRef.current?.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width + 40;
      canvas.height = img.height + 80;
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 20, 40);
        ctx.fillStyle = 'black';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(form.name, canvas.width / 2, 25);
        ctx.font = '14px Arial';
        ctx.fillText(`${currencySymbol}${form.price}`, canvas.width / 2, canvas.height - 15);
        
        const pngUrl = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.href = pngUrl;
        downloadLink.download = `barcode-${form.sku || 'product'}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      }
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  useEffect(() => {
    if (editingItem) {
      const q = query(collection(db, 'variants'), where('productId', '==', editingItem.id));
      const unsub = onSnapshot(q, (snap) => {
        setProductVariants(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      return () => unsub();
    }
  }, [editingItem]);

  const handleSave = async () => {
    try {
      const batch = writeBatch(db);
      const productRef = editingItem ? doc(db, 'products', editingItem.id) : doc(collection(db, 'products'));
      
      const productData = {
        ...form,
        uid: auth.currentUser?.uid,
        updatedAt: serverTimestamp(),
        createdAt: editingItem ? editingItem.createdAt : serverTimestamp()
      };

      if (editingItem) {
        batch.update(productRef, productData);
      } else {
        batch.set(productRef, productData);
      }

      await batch.commit();
      await logActivity(
        editingItem ? 'Updated Product' : 'Created Product',
        'Inventory',
        `Product ${form.name} ${editingItem ? 'updated' : 'created'}`
      );
      onClose();
    } catch (e) { 
      handleFirestoreError(e, editingItem ? OperationType.UPDATE : OperationType.CREATE, 'products');
    }
  };

  const addVariant = async () => {
    if (!editingItem) {
      toast.error("Please save the product first before adding variants.");
      return;
    }
    try {
      await addDoc(collection(db, 'variants'), {
        ...newVariant,
        productId: editingItem.id,
        uid: auth.currentUser?.uid,
        createdAt: serverTimestamp()
      });
      setNewVariant({ size: '', color: '', fabric: '', sku: '', barcode: '', price: 0, costPrice: 0 });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'variants');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl p-8 space-y-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center">
          <h3 className="text-2xl font-bold">{editingItem ? 'Edit Product' : 'New Product'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X /></button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-widest text-gray-400 border-b pb-2">Basic Information</h4>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Product Name</label>
                <input className="w-full p-3 bg-gray-50 rounded-xl outline-none border border-transparent focus:border-gray-200" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">SKU</label>
                  <input className="w-full p-3 bg-gray-50 rounded-xl outline-none border border-transparent focus:border-gray-200" value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Type</label>
                  <select className="w-full p-3 bg-gray-50 rounded-xl outline-none border border-transparent focus:border-gray-200" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                    <option value="simple">Simple</option>
                    <option value="variable">Variable</option>
                    <option value="bundle">Bundle</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Category</label>
                  <select className="w-full p-3 bg-gray-50 rounded-xl outline-none border border-transparent focus:border-gray-200" value={form.categoryId} onChange={e => setForm({...form, categoryId: e.target.value})}>
                    <option value="">Select Category</option>
                    {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Brand</label>
                  <select className="w-full p-3 bg-gray-50 rounded-xl outline-none border border-transparent focus:border-gray-200" value={form.brandId} onChange={e => setForm({...form, brandId: e.target.value})}>
                    <option value="">Select Brand</option>
                    {brands.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Description</label>
                <textarea className="w-full p-3 bg-gray-50 rounded-xl outline-none border border-transparent focus:border-gray-200 h-24" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-widest text-gray-400 border-b pb-2">Pricing & Media</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Retail Price ({currencySymbol})</label>
                <input type="number" className="w-full p-3 bg-gray-50 rounded-xl outline-none border border-transparent focus:border-gray-200" value={form.price || 0} onChange={e => setForm({...form, price: parseFloat(e.target.value) || 0})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Cost Price ({currencySymbol})</label>
                <input type="number" className="w-full p-3 bg-gray-50 rounded-xl outline-none border border-transparent focus:border-gray-200" value={form.costPrice || 0} onChange={e => setForm({...form, costPrice: parseFloat(e.target.value) || 0})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Min Stock Alert</label>
                <input type="number" className="w-full p-3 bg-gray-50 rounded-xl outline-none border border-transparent focus:border-gray-200" value={form.minStock || 0} onChange={e => setForm({...form, minStock: parseInt(e.target.value) || 0})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Barcode</label>
                <div className="flex gap-2">
                  <input className="flex-1 p-3 bg-gray-50 rounded-xl outline-none border border-transparent focus:border-gray-200" value={form.barcode} onChange={e => setForm({...form, barcode: e.target.value})} />
                  <button 
                    onClick={() => setForm({...form, barcode: form.sku || Math.random().toString(36).substring(2, 10).toUpperCase()})}
                    className="px-3 bg-gray-100 text-gray-600 rounded-xl text-[10px] font-bold hover:bg-gray-200 transition-colors"
                  >
                    Generate
                  </button>
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Product Images</label>
              <div className="grid grid-cols-4 gap-2">
                {form.images?.map((url: string, i: number) => (
                  <div key={i} className="relative group aspect-square bg-gray-50 rounded-xl overflow-hidden border border-gray-100">
                    <img src={url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <button 
                      onClick={() => setForm({...form, images: form.images.filter((_: any, idx: number) => idx !== i)})}
                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
                <label className="aspect-square bg-gray-50 rounded-xl border border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors">
                  {uploading ? <Loader2 size={20} className="animate-spin text-gray-400" /> : <Plus size={20} className="text-gray-400" />}
                  <span className="text-[8px] font-bold text-gray-400 uppercase mt-1">Upload</span>
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                </label>
              </div>
              <textarea 
                className="w-full p-3 bg-gray-50 rounded-xl outline-none border border-transparent focus:border-gray-200 h-20 mt-2 text-xs" 
                value={form.images?.join('\n')} 
                onChange={e => setForm({...form, images: e.target.value.split('\n').filter(url => url.trim())})} 
                placeholder="Or paste image URLs here (one per line)"
              />
            </div>

            <div className="space-y-4 pt-6 border-t">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold uppercase tracking-widest text-gray-400">Barcode Preview</h4>
                <div className="flex gap-2">
                  <button 
                    onClick={downloadBarcode}
                    className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-[10px] font-bold hover:bg-gray-200 transition-colors"
                  >
                    <Download size={12} />
                    Download
                  </button>
                  <button 
                    onClick={() => handlePrintBarcode()}
                    className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-[10px] font-bold hover:bg-gray-200 transition-colors"
                  >
                    <Printer size={12} />
                    Print
                  </button>
                </div>
              </div>
              <div className="bg-gray-50 p-6 rounded-2xl flex items-center justify-center border border-gray-100">
                <div ref={barcodeRef} className="bg-white p-4 rounded-lg shadow-sm flex flex-col items-center gap-2">
                  <p className="text-xs font-bold text-center max-w-[200px] truncate">{form.name || 'Product Name'}</p>
                  <Barcode 
                    value={form.barcode || form.sku || 'NO-BARCODE'} 
                    width={1.5}
                    height={50}
                    fontSize={12}
                    background="#ffffff"
                  />
                  <p className="text-xs font-bold">{currencySymbol}{form.price || 0}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {form.type === 'variable' && (
          <div className="space-y-4 pt-6 border-t">
            <h4 className="text-sm font-bold uppercase tracking-widest text-gray-400">Variants Management</h4>
            <div className="bg-gray-50 p-4 rounded-2xl space-y-4">
              <div className="grid grid-cols-3 md:grid-cols-7 gap-3">
                <input placeholder="Size" className="p-2 rounded-lg text-xs" value={newVariant.size} onChange={e => setNewVariant({...newVariant, size: e.target.value})} />
                <input placeholder="Color" className="p-2 rounded-lg text-xs" value={newVariant.color} onChange={e => setNewVariant({...newVariant, color: e.target.value})} />
                <input placeholder="Fabric" className="p-2 rounded-lg text-xs" value={newVariant.fabric} onChange={e => setNewVariant({...newVariant, fabric: e.target.value})} />
                <input placeholder="SKU" className="p-2 rounded-lg text-xs" value={newVariant.sku} onChange={e => setNewVariant({...newVariant, sku: e.target.value})} />
                <input placeholder="Barcode" className="p-2 rounded-lg text-xs" value={newVariant.barcode} onChange={e => setNewVariant({...newVariant, barcode: e.target.value})} />
                <input type="number" placeholder="Price" className="p-2 rounded-lg text-xs" value={newVariant.price || 0} onChange={e => setNewVariant({...newVariant, price: parseFloat(e.target.value) || 0})} />
                <button onClick={addVariant} className="bg-[#141414] text-white rounded-lg text-xs font-bold">Add</button>
              </div>
              <div className="space-y-2">
                {productVariants.map((v: any) => (
                  <div key={v.id} className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-100 text-xs">
                    <div className="flex flex-col">
                      <span className="font-bold">{v.sku}</span>
                      <span className="text-[10px] text-gray-400">{v.barcode || 'No Barcode'}</span>
                    </div>
                    <span className="text-gray-400">{v.size} / {v.color} / {v.fabric}</span>
                    <span className="font-mono">{currencySymbol}{v.price}</span>
                    <button onClick={() => deleteDoc(doc(db, 'variants', v.id))} className="text-red-500"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {form.type === 'bundle' && (
          <div className="space-y-4 pt-6 border-t">
            <h4 className="text-sm font-bold uppercase tracking-widest text-gray-400">Bundle Components</h4>
            <div className="bg-purple-50 p-4 rounded-2xl space-y-4 border border-purple-100">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <select 
                  className="p-2 bg-white border border-gray-100 rounded-lg text-xs"
                  value={newVariant.sku} // Reusing newVariant state for temporary storage
                  onChange={e => setNewVariant({...newVariant, sku: e.target.value})}
                >
                  <option value="">Select Product</option>
                  {products.filter((p: any) => p.id !== editingItem?.id && p.type !== 'bundle').map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <input 
                  type="number" 
                  placeholder="Qty" 
                  className="p-2 bg-white border border-gray-100 rounded-lg text-xs"
                  value={newVariant.price || 0}
                  onChange={e => setNewVariant({...newVariant, price: parseFloat(e.target.value) || 0})}
                />
                <button 
                  type="button"
                  onClick={() => {
                    if (!newVariant.sku) return;
                    setForm({...form, bundleItems: [...(form.bundleItems || []), { productId: newVariant.sku, quantity: newVariant.price || 1 }]});
                    setNewVariant({ size: '', color: '', fabric: '', sku: '', price: 0, costPrice: 0 });
                  }}
                  className="bg-purple-600 text-white rounded-lg text-xs font-bold"
                >
                  Add to Bundle
                </button>
              </div>
              <div className="space-y-2">
                {(form.bundleItems || []).map((item: any, idx: number) => {
                  const p = products.find((prod: any) => prod.id === item.productId);
                  return (
                    <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-xl border border-purple-100 text-xs">
                      <span>{p?.name} x {item.quantity}</span>
                      <button onClick={() => setForm({...form, bundleItems: form.bundleItems.filter((_: any, i: number) => i !== idx)})} className="text-red-500"><Trash2 size={14} /></button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-4 pt-6">
          <button onClick={onClose} className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-all">Cancel</button>
          <button onClick={handleSave} className="flex-[2] py-4 bg-[#141414] text-white rounded-xl font-bold shadow-xl hover:bg-black transition-all">
            {editingItem ? 'Update Product' : 'Create Product'}
          </button>
        </div>
      </div>
    </div>
  );
}

function WarehouseModal({ isOpen, onClose, editingItem }: any) {
  const [form, setForm] = useState(editingItem || { name: '', location: '', description: '' });

  const handleSave = async () => {
    try {
      const data = { ...form, uid: auth.currentUser?.uid, updatedAt: serverTimestamp() };
      if (editingItem) {
        await updateDoc(doc(db, 'warehouses', editingItem.id), data);
      } else {
        await addDoc(collection(db, 'warehouses'), { ...data, createdAt: serverTimestamp() });
      }
      onClose();
    } catch (e) {
      handleFirestoreError(e, editingItem ? OperationType.UPDATE : OperationType.CREATE, 'warehouses');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-8 space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-2xl font-bold font-serif">{editingItem ? 'Edit Warehouse' : 'New Warehouse'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X /></button>
        </div>
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Warehouse Name</label>
            <input className="w-full p-3 bg-gray-50 rounded-xl outline-none border border-transparent focus:border-gray-200" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Location / Address</label>
            <input className="w-full p-3 bg-gray-50 rounded-xl outline-none border border-transparent focus:border-gray-200" value={form.location} onChange={e => setForm({...form, location: e.target.value})} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Description</label>
            <textarea className="w-full p-3 bg-gray-50 rounded-xl outline-none border border-transparent focus:border-gray-200 h-24" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
          </div>
        </div>
        <div className="flex gap-4 pt-4">
          <button onClick={onClose} className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold">Cancel</button>
          <button onClick={handleSave} className="flex-[2] py-3 bg-[#141414] text-white rounded-xl font-bold shadow-lg">Save Warehouse</button>
        </div>
      </div>
    </div>
  );
}

function AdjustmentModal({ isOpen, onClose, products, variants, warehouses }: any) {
  const [form, setForm] = useState({ productId: '', variantId: '', warehouseId: '', quantity: 0, type: 'in', reason: '' });

  const handleAdjust = async () => {
    if (!form.productId || !form.warehouseId || form.quantity <= 0) {
      toast.error("Please fill all required fields with valid values.");
      return;
    }

    try {
      const batch = writeBatch(db);
      const adjQty = form.type === 'in' ? form.quantity : -form.quantity;
      
      const inventoryId = `${form.warehouseId}_${form.productId}_${form.variantId || 'none'}`;
      const inventoryRef = doc(db, 'inventory', inventoryId);
      const inventorySnap = await getDoc(inventoryRef);

      if (inventorySnap.exists()) {
        batch.update(inventoryRef, {
          quantity: inventorySnap.data().quantity + adjQty,
          updatedAt: serverTimestamp()
        });
      } else {
        batch.set(inventoryRef, {
          warehouseId: form.warehouseId,
          productId: form.productId,
          variantId: form.variantId || null,
          quantity: adjQty,
          uid: auth.currentUser?.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }

      const logRef = doc(collection(db, 'inventoryLogs'));
      batch.set(logRef, {
        productId: form.productId,
        variantId: form.variantId || null,
        warehouseId: form.warehouseId,
        action: form.type === 'in' ? 'stock_in' : 'stock_out',
        quantityChange: adjQty,
        newQuantity: (inventorySnap.exists() ? inventorySnap.data().quantity : 0) + adjQty,
        reason: form.reason,
        uid: auth.currentUser?.uid,
        createdAt: serverTimestamp()
      });

      await batch.commit();
      onClose();
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'inventory');
    }
  };

  if (!isOpen) return null;

  const selectedProduct = products.find((p: any) => p.id === form.productId);
  const filteredVariants = variants.filter((v: any) => v.productId === form.productId);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-8 space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-2xl font-bold font-serif text-[#141414]">Stock Adjustment</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X /></button>
        </div>
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Product</label>
            <select className="w-full p-3 bg-gray-50 rounded-xl outline-none border border-transparent focus:border-gray-200" value={form.productId} onChange={e => setForm({...form, productId: e.target.value, variantId: ''})}>
              <option value="">Select Product</option>
              {products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          {selectedProduct?.type === 'variable' && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Variant</label>
              <select className="w-full p-3 bg-gray-50 rounded-xl outline-none border border-transparent focus:border-gray-200" value={form.variantId} onChange={e => setForm({...form, variantId: e.target.value})}>
                <option value="">Select Variant</option>
                {filteredVariants.map((v: any) => <option key={v.id} value={v.id}>{v.sku} ({v.size}/{v.color})</option>)}
              </select>
            </div>
          )}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Warehouse</label>
            <select className="w-full p-3 bg-gray-50 rounded-xl outline-none border border-transparent focus:border-gray-200" value={form.warehouseId} onChange={e => setForm({...form, warehouseId: e.target.value})}>
              <option value="">Select Warehouse</option>
              {warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Type</label>
              <select className="w-full p-3 bg-gray-50 rounded-xl outline-none border border-transparent focus:border-gray-200" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                <option value="in">Stock In (+)</option>
                <option value="out">Stock Out (-)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Quantity</label>
              <input type="number" className="w-full p-3 bg-gray-50 rounded-xl outline-none border border-transparent focus:border-gray-200" value={form.quantity || 0} onChange={e => setForm({...form, quantity: parseInt(e.target.value) || 0})} />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Reason / Note</label>
            <input className="w-full p-3 bg-gray-50 rounded-xl outline-none border border-transparent focus:border-gray-200" value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} placeholder="e.g., Opening Stock, Damage, Return" />
          </div>
        </div>
        <div className="flex gap-4 pt-4">
          <button onClick={onClose} className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold">Cancel</button>
          <button onClick={handleAdjust} className="flex-[2] py-3 bg-[#141414] text-white rounded-xl font-bold shadow-lg">Confirm Adjustment</button>
        </div>
      </div>
    </div>
  );
}

function POModal({ isOpen, onClose, suppliers, products, variants }: any) {
  const { currencySymbol } = useSettings();
  const [form, setForm] = useState({ supplierId: '', items: [] as any[] });
  const [newItem, setNewItem] = useState({ productId: '', variantId: '', quantity: 0, costPrice: 0 });

  const handleAddPO = async () => {
    if (!form.supplierId || form.items.length === 0) {
      toast.error("Please select a supplier and add at least one item.");
      return;
    }

    try {
      const total = form.items.reduce((acc, item) => acc + (item.quantity * item.costPrice), 0);
      await addDoc(collection(db, 'purchaseOrders'), {
        ...form,
        total,
        status: 'pending',
        uid: auth.currentUser?.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      onClose();
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'purchaseOrders');
    }
  };

  if (!isOpen) return null;

  const addItem = () => {
    if (!newItem.productId || newItem.quantity <= 0) return;
    setForm({ ...form, items: [...form.items, newItem] });
    setNewItem({ productId: '', variantId: '', quantity: 0, costPrice: 0 });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl p-8 space-y-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center">
          <h3 className="text-2xl font-bold font-serif text-[#141414]">New Purchase Order</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X /></button>
        </div>
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Supplier</label>
            <select className="w-full p-3 bg-gray-50 rounded-xl outline-none border border-transparent focus:border-gray-200" value={form.supplierId} onChange={e => setForm({...form, supplierId: e.target.value})}>
              <option value="">Select Supplier</option>
              {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-2xl space-y-4">
            <h4 className="text-xs font-bold uppercase text-gray-400">Add Items</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <select className="p-2 rounded-lg text-xs" value={newItem.productId} onChange={e => setNewItem({...newItem, productId: e.target.value, variantId: ''})}>
                <option value="">Product</option>
                {products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input type="number" placeholder="Qty" className="p-2 rounded-lg text-xs" value={newItem.quantity || 0} onChange={e => setNewItem({...newItem, quantity: parseInt(e.target.value) || 0})} />
              <input type="number" placeholder="Cost" className="p-2 rounded-lg text-xs" value={newItem.costPrice || 0} onChange={e => setNewItem({...newItem, costPrice: parseFloat(e.target.value) || 0})} />
              <button onClick={addItem} className="bg-[#141414] text-white rounded-lg text-xs font-bold">Add Item</button>
            </div>
            <div className="space-y-2">
              {form.items.map((item, idx) => {
                const p = products.find((prod: any) => prod.id === item.productId);
                return (
                  <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-100 text-xs">
                    <span>{p?.name} x {item.quantity}</span>
                    <span className="font-mono">{currencySymbol}{(item.quantity * item.costPrice).toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="flex gap-4 pt-4">
          <button onClick={onClose} className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold">Cancel</button>
          <button onClick={handleAddPO} className="flex-[2] py-3 bg-[#141414] text-white rounded-xl font-bold shadow-lg">Create PO</button>
        </div>
      </div>
    </div>
  );
}

function CategoryModal({ isOpen, onClose, editingItem }: any) {
  const [form, setForm] = useState(editingItem || { name: '', description: '' });
  const handleSave = async () => {
    try {
      const data = { ...form, uid: auth.currentUser?.uid, updatedAt: serverTimestamp() };
      if (editingItem) await updateDoc(doc(db, 'categories', editingItem.id), data);
      else await addDoc(collection(db, 'categories'), { ...data, createdAt: serverTimestamp() });
      onClose();
    } catch (e) { handleFirestoreError(e, editingItem ? OperationType.UPDATE : OperationType.CREATE, 'categories'); }
  };
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-8 space-y-6">
        <h3 className="text-2xl font-bold font-serif">{editingItem ? 'Edit Category' : 'New Category'}</h3>
        <input className="w-full p-3 bg-gray-50 rounded-xl outline-none border border-transparent focus:border-gray-200" placeholder="Category Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
        <textarea className="w-full p-3 bg-gray-50 rounded-xl outline-none border border-transparent focus:border-gray-200 h-24" placeholder="Description" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
        <div className="flex gap-4">
          <button onClick={onClose} className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold">Cancel</button>
          <button onClick={handleSave} className="flex-[2] py-3 bg-[#141414] text-white rounded-xl font-bold shadow-lg">Save</button>
        </div>
      </div>
    </div>
  );
}

function BrandModal({ isOpen, onClose, editingItem }: any) {
  const [form, setForm] = useState(editingItem || { name: '', description: '' });
  const handleSave = async () => {
    try {
      const data = { ...form, uid: auth.currentUser?.uid, updatedAt: serverTimestamp() };
      if (editingItem) await updateDoc(doc(db, 'brands', editingItem.id), data);
      else await addDoc(collection(db, 'brands'), { ...data, createdAt: serverTimestamp() });
      onClose();
    } catch (e) { handleFirestoreError(e, editingItem ? OperationType.UPDATE : OperationType.CREATE, 'brands'); }
  };
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-8 space-y-6">
        <h3 className="text-2xl font-bold font-serif">{editingItem ? 'Edit Brand' : 'New Brand'}</h3>
        <input className="w-full p-3 bg-gray-50 rounded-xl outline-none border border-transparent focus:border-gray-200" placeholder="Brand Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
        <textarea className="w-full p-3 bg-gray-50 rounded-xl outline-none border border-transparent focus:border-gray-200 h-24" placeholder="Description" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
        <div className="flex gap-4">
          <button onClick={onClose} className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold">Cancel</button>
          <button onClick={handleSave} className="flex-[2] py-3 bg-[#141414] text-white rounded-xl font-bold shadow-lg">Save</button>
        </div>
      </div>
    </div>
  );
}

function TransferModal({ isOpen, onClose, products, variants, warehouses }: any) {
  const [form, setForm] = useState({ productId: '', variantId: '', fromWarehouseId: '', toWarehouseId: '', quantity: 0 });

  const handleTransfer = async () => {
    if (!form.productId || !form.fromWarehouseId || !form.toWarehouseId || form.quantity <= 0) {
      toast.error("Please fill all required fields.");
      return;
    }
    if (form.fromWarehouseId === form.toWarehouseId) {
      toast.error("Source and destination warehouses must be different.");
      return;
    }

    try {
      const batch = writeBatch(db);
      
      const fromInvId = `${form.fromWarehouseId}_${form.productId}_${form.variantId || 'none'}`;
      const toInvId = `${form.toWarehouseId}_${form.productId}_${form.variantId || 'none'}`;
      
      const fromRef = doc(db, 'inventory', fromInvId);
      const toRef = doc(db, 'inventory', toInvId);
      
      const fromSnap = await getDoc(fromRef);
      const toSnap = await getDoc(toRef);

      if (!fromSnap.exists() || fromSnap.data().quantity < form.quantity) {
        toast.error("Insufficient stock in source warehouse.");
        return;
      }

      // Deduct from source
      batch.update(fromRef, {
        quantity: fromSnap.data().quantity - form.quantity,
        updatedAt: serverTimestamp()
      });

      // Add to destination
      if (toSnap.exists()) {
        batch.update(toRef, {
          quantity: toSnap.data().quantity + form.quantity,
          updatedAt: serverTimestamp()
        });
      } else {
        batch.set(toRef, {
          warehouseId: form.toWarehouseId,
          productId: form.productId,
          variantId: form.variantId || null,
          quantity: form.quantity,
          uid: auth.currentUser?.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }

      // Log Transfer
      const logRef = doc(collection(db, 'inventoryLogs'));
      batch.set(logRef, {
        productId: form.productId,
        variantId: form.variantId || null,
        warehouseId: form.fromWarehouseId,
        action: 'transfer_out',
        quantityChange: -form.quantity,
        newQuantity: fromSnap.data().quantity - form.quantity,
        reason: `Transfer to ${warehouses.find((w: any) => w.id === form.toWarehouseId)?.name}`,
        uid: auth.currentUser?.uid,
        createdAt: serverTimestamp()
      });

      const logRef2 = doc(collection(db, 'inventoryLogs'));
      batch.set(logRef2, {
        productId: form.productId,
        variantId: form.variantId || null,
        warehouseId: form.toWarehouseId,
        action: 'transfer_in',
        quantityChange: form.quantity,
        newQuantity: (toSnap.exists() ? toSnap.data().quantity : 0) + form.quantity,
        reason: `Transfer from ${warehouses.find((w: any) => w.id === form.fromWarehouseId)?.name}`,
        uid: auth.currentUser?.uid,
        createdAt: serverTimestamp()
      });

      await batch.commit();
      onClose();
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'inventory');
    }
  };

  if (!isOpen) return null;

  const selectedProduct = products.find((p: any) => p.id === form.productId);
  const filteredVariants = variants.filter((v: any) => v.productId === form.productId);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-8 space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-2xl font-bold font-serif text-[#141414]">Stock Transfer</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X /></button>
        </div>
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Product</label>
            <select className="w-full p-3 bg-gray-50 rounded-xl outline-none border border-transparent focus:border-gray-200" value={form.productId} onChange={e => setForm({...form, productId: e.target.value, variantId: ''})}>
              <option value="">Select Product</option>
              {products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          {selectedProduct?.type === 'variable' && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Variant</label>
              <select className="w-full p-3 bg-gray-50 rounded-xl outline-none border border-transparent focus:border-gray-200" value={form.variantId} onChange={e => setForm({...form, variantId: e.target.value})}>
                <option value="">Select Variant</option>
                {filteredVariants.map((v: any) => <option key={v.id} value={v.id}>{v.sku} ({v.size}/{v.color})</option>)}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">From Warehouse</label>
              <select className="w-full p-3 bg-gray-50 rounded-xl outline-none border border-transparent focus:border-gray-200" value={form.fromWarehouseId} onChange={e => setForm({...form, fromWarehouseId: e.target.value})}>
                <option value="">Source</option>
                {warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">To Warehouse</label>
              <select className="w-full p-3 bg-gray-50 rounded-xl outline-none border border-transparent focus:border-gray-200" value={form.toWarehouseId} onChange={e => setForm({...form, toWarehouseId: e.target.value})}>
                <option value="">Destination</option>
                {warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Quantity</label>
            <input type="number" className="w-full p-3 bg-gray-50 rounded-xl outline-none border border-transparent focus:border-gray-200" value={form.quantity || 0} onChange={e => setForm({...form, quantity: parseInt(e.target.value) || 0})} />
          </div>
        </div>
        <div className="flex gap-4 pt-4">
          <button onClick={onClose} className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold">Cancel</button>
          <button onClick={handleTransfer} className="flex-[2] py-3 bg-purple-600 text-white rounded-xl font-bold shadow-lg">Confirm Transfer</button>
        </div>
      </div>
    </div>
  );
}

function SupplierModal({ isOpen, onClose, editingItem }: any) {
  const [form, setForm] = useState(editingItem || { name: '', contactPerson: '', phone: '', email: '', address: '' });

  const handleSave = async () => {
    try {
      const data = { ...form, uid: auth.currentUser?.uid, updatedAt: serverTimestamp() };
      if (editingItem) {
        await updateDoc(doc(db, 'suppliers', editingItem.id), data);
      } else {
        await addDoc(collection(db, 'suppliers'), { ...data, createdAt: serverTimestamp() });
      }
      onClose();
    } catch (e) {
      handleFirestoreError(e, editingItem ? OperationType.UPDATE : OperationType.CREATE, 'suppliers');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-8 space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-2xl font-bold font-serif text-[#141414]">{editingItem ? 'Edit Supplier' : 'New Supplier'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X /></button>
        </div>
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Supplier Name</label>
            <input className="w-full p-3 bg-gray-50 rounded-xl outline-none border border-transparent focus:border-gray-200" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Contact Person</label>
              <input className="w-full p-3 bg-gray-50 rounded-xl outline-none border border-transparent focus:border-gray-200" value={form.contactPerson} onChange={e => setForm({...form, contactPerson: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Phone</label>
              <input className="w-full p-3 bg-gray-50 rounded-xl outline-none border border-transparent focus:border-gray-200" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Email</label>
            <input className="w-full p-3 bg-gray-50 rounded-xl outline-none border border-transparent focus:border-gray-200" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Address</label>
            <textarea className="w-full p-3 bg-gray-50 rounded-xl outline-none border border-transparent focus:border-gray-200 h-20" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
          </div>
        </div>
        <div className="flex gap-4 pt-4">
          <button onClick={onClose} className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold">Cancel</button>
          <button onClick={handleSave} className="flex-[2] py-3 bg-[#141414] text-white rounded-xl font-bold shadow-lg">Save Supplier</button>
        </div>
      </div>
    </div>
  );
}
