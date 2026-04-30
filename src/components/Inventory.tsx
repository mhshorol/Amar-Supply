import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Barcode as BarcodeIcon,
  ArrowRightLeft,
  HeartCrack,
  ShoppingCart,
  Users,
  CornerUpLeft,
  FileText,
  PieChart,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal
} from 'lucide-react';
import { db, auth, storage, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, updateDoc, writeBatch, getDoc, getDocs, where, ref, uploadBytes, getDownloadURL } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { logActivity } from '../services/activityService';
import { ValuationService } from '../services/valuationService';
import Barcode from 'react-barcode';
import { openPrintWindow } from '../utils/printHelper';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

import StockTransfers from './StockTransfers';
import { useSettings } from '../contexts/SettingsContext';
import ConfirmModal from './ConfirmModal';

const StockBadge = ({ stock }: { stock: number }) => {
  let status = 'In Stock';
  let colorClass = 'bg-emerald-50 text-emerald-600 border-emerald-100/50';
  
  if (stock <= 0) {
    status = 'Out of Stock';
    colorClass = 'bg-rose-50 text-rose-600 border-rose-100/50 shadow-subtle shadow-rose-500/5';
  } else if (stock < 20) {
    status = 'Low Stock';
    colorClass = 'bg-amber-50 text-amber-600 border-amber-100/50 shadow-subtle shadow-amber-500/5';
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border leading-none w-fit ${colorClass}`}>
        {status}
      </span>
      <span className="text-[11px] font-black text-muted tabular-nums">{stock.toLocaleString()} UNITS</span>
    </div>
  );
};

export default function Inventory() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { currencySymbol } = useSettings();
  const [activeTab, setActiveTab] = useState<'products' | 'warehouses' | 'stock' | 'purchases' | 'suppliers' | 'returns' | 'logs' | 'reports' | 'transfers' | 'wastage'>('products');
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
  const [wastageLogs, setWastageLogs] = useState<any[]>([]);

  // Modal States
  const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isPOModalOpen, setIsPOModalOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [isWastageModalOpen, setIsWastageModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
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

  useEffect(() => {
    if (!user) return;

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
      { name: 'stock_logs', setter: setStockLogs },
      { name: 'wastage_logs', setter: setWastageLogs }
    ];

    collections.forEach(col => {
      const q = query(collection(db, col.name), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        col.setter(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        if (col.name === 'products') setLoading(false);
      }, (error) => {
        if (error.code !== 'permission-denied') {
          handleFirestoreError(error, OperationType.LIST, col.name);
        }
      });
      unsubscribes.push(unsubscribe);
    });

    return () => unsubscribes.forEach(unsub => unsub());
  }, [user]);

  const handleDeleteProduct = async (id: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Delete Product',
      message: 'Are you sure you want to delete this product? This will not delete its inventory records but will remove it from the catalog.',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'products', id));
          await logActivity('Deleted Product', 'Inventory', `Product ID: ${id} deleted`);
          toast.success('Product deleted successfully');
        } catch (e) {
          handleFirestoreError(e, OperationType.DELETE, `products/${id}`);
        }
      }
    });
  };

  const handleDeleteWarehouse = async (id: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Delete Warehouse',
      message: 'Are you sure you want to delete this warehouse?',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'warehouses', id));
          await logActivity('Deleted Warehouse', 'Inventory', `Warehouse ID: ${id} deleted`);
          toast.success('Warehouse deleted successfully');
        } catch (e) {
          handleFirestoreError(e, OperationType.DELETE, `warehouses/${id}`);
        }
      }
    });
  };

  const handleExportCSV = () => {
    if (products.length === 0) {
      toast.error('No products to export');
      return;
    }

    const headers = ['ID', 'Name', 'SKU', 'Barcode', 'Category', 'Brand', 'Price', 'Cost Price', 'Status', 'Created At'];
    const csvRows = [headers.join(',')];

    products.forEach(product => {
      const row = [
        product.id,
        `"${product.name || ''}"`,
        `"${product.sku || ''}"`,
        `"${product.barcode || ''}"`,
        `"${product.category || ''}"`,
        `"${product.brand || ''}"`,
        product.price || 0,
        product.costPrice || 0,
        product.status || '',
        product.createdAt?.toDate ? product.createdAt.toDate().toLocaleString() : (product.createdAt?.seconds ? new Date(product.createdAt.seconds * 1000).toLocaleString() : 'N/A')
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `products_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Products exported successfully');
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'products': return <ProductsTab products={products} variants={variants} categories={categories} brands={brands} onEdit={(p: any) => navigate(`/inventory/edit/${p.id}`)} onDelete={handleDeleteProduct} onAddCategory={() => setIsCategoryModalOpen(true)} onAddBrand={() => setIsBrandModalOpen(true)} />;
      case 'warehouses': return <WarehousesTab warehouses={warehouses} onEdit={(w: any) => { setEditingItem(w); setIsWarehouseModalOpen(true); }} onDelete={handleDeleteWarehouse} />;
      case 'stock': return <StockTab inventory={inventory} products={products} variants={variants} warehouses={warehouses} onAdjust={() => setIsAdjustmentModalOpen(true)} onTransfer={() => setIsTransferModalOpen(true)} />;
      case 'purchases': return <PurchasesTab pos={purchaseOrders} suppliers={suppliers} products={products} variants={variants} onAdd={() => setIsPOModalOpen(true)} setConfirmConfig={setConfirmConfig} />;
      case 'suppliers': return <SuppliersTab suppliers={suppliers} onEdit={(s: any) => { setEditingItem(s); setIsSupplierModalOpen(true); }} setConfirmConfig={setConfirmConfig} />;
      case 'returns': return <ReturnsTab products={products} variants={variants} warehouses={warehouses} setConfirmConfig={setConfirmConfig} />;
      case 'logs': return <LogsTab logs={logs} products={products} variants={variants} warehouses={warehouses} />;
      case 'reports': return <ReportsTab products={products} inventory={inventory} logs={logs} />;
      case 'transfers': return <StockTransfers />;
      case 'wastage': return <WastageTab wastageLogs={wastageLogs} products={products} variants={variants} warehouses={warehouses} onAdd={() => setIsWastageModalOpen(true)} />;
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-primary tracking-tight">Inventory Management</h2>
          <p className="text-sm text-secondary mt-1">Full-stack control over products, variants, warehouses, and stock movements.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={handleExportCSV}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-surface border border-border rounded-lg text-sm font-semibold hover:bg-surface-hover transition-colors shadow-subtle text-secondary"
          >
            <Download size={16} strokeWidth={2} />
            Export CSV
          </button>
          <button 
            onClick={() => {
              setEditingItem(null);
              if (activeTab === 'products') navigate('/inventory/new');
              if (activeTab === 'warehouses') setIsWarehouseModalOpen(true);
              if (activeTab === 'purchases') setIsPOModalOpen(true);
              if (activeTab === 'stock') setIsAdjustmentModalOpen(true);
            }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-brand text-white rounded-lg text-sm font-semibold hover:bg-brand-hover transition-colors shadow-subtle"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Add {activeTab.charAt(0).toUpperCase() + activeTab.slice(1, -1)}</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-surface rounded-[14px] border border-border shadow-subtle overflow-x-auto">
        <div className="flex items-center min-w-max px-2">
          {[
            { id: 'products', label: 'Products', icon: Package },
            { id: 'warehouses', label: 'Warehouses', icon: Warehouse },
            { id: 'stock', label: 'Stock', icon: Tag },
            { id: 'transfers', label: 'Transfers', icon: ArrowRightLeft },
            { id: 'wastage', label: 'Wastage', icon: HeartCrack },
            { id: 'purchases', label: 'Purchases', icon: ShoppingCart },
            { id: 'suppliers', label: 'Suppliers', icon: Users },
            { id: 'returns', label: 'Returns', icon: CornerUpLeft },
            { id: 'logs', label: 'Logs', icon: FileText },
            { id: 'reports', label: 'Reports', icon: PieChart },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-5 py-4 text-sm font-medium transition-all relative whitespace-nowrap ${
                  isActive 
                    ? 'text-brand' 
                    : 'text-secondary hover:text-primary hover:bg-surface-hover/50'
                }`}
              >
                <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                {tab.label}
                {isActive && (
                  <motion.div 
                    layoutId="active-inventory-tab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="min-h-[500px]">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20 gap-4"
            >
              <Loader2 className="animate-spin text-muted" size={32} />
              <p className="text-xs font-bold uppercase tracking-widest text-muted">Loading {activeTab}...</p>
            </motion.div>
          ) : (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderTabContent()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modals Placeholder - Will implement detailed modals next */}
      {isWarehouseModalOpen && <WarehouseModal isOpen={isWarehouseModalOpen} onClose={() => { setIsWarehouseModalOpen(false); setEditingItem(null); }} editingItem={editingItem} />}
      {isAdjustmentModalOpen && <AdjustmentModal isOpen={isAdjustmentModalOpen} onClose={() => setIsAdjustmentModalOpen(false)} products={products} variants={variants} warehouses={warehouses} />}
      {isTransferModalOpen && <TransferModal isOpen={isTransferModalOpen} onClose={() => setIsTransferModalOpen(false)} products={products} variants={variants} warehouses={warehouses} />}
      {isPOModalOpen && <POModal isOpen={isPOModalOpen} onClose={() => setIsPOModalOpen(false)} suppliers={suppliers} products={products} variants={variants} />}
      {isSupplierModalOpen && <SupplierModal isOpen={isSupplierModalOpen} onClose={() => { setIsSupplierModalOpen(false); setEditingItem(null); }} editingItem={editingItem} />}
      {isCategoryModalOpen && <CategoryModal isOpen={isCategoryModalOpen} onClose={() => { setIsCategoryModalOpen(false); setEditingItem(null); }} editingItem={editingItem} />}
      {isBrandModalOpen && <BrandModal isOpen={isBrandModalOpen} onClose={() => { setIsBrandModalOpen(false); setEditingItem(null); }} editingItem={editingItem} />}
      {isWastageModalOpen && <WastageModal isOpen={isWastageModalOpen} onClose={() => setIsWastageModalOpen(false)} products={products} variants={variants} warehouses={warehouses} />}

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

// --- Sub-components for Tabs ---

function ProductsTab({ products, variants, categories, brands, onEdit, onDelete, onAddCategory, onAddBrand }: any) {
  const { currencySymbol } = useSettings();
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const printRef = useRef<HTMLDivElement>(null);
  const itemsPerPage = 10;

  const triggerPrint = (product: any) => {
    setSelectedProduct(product);
    const win = window.open('', '_blank');
    if (!win) {
       toast.error("Please allow popups to print.");
       return;
    }
    setTimeout(() => {
      if (printRef.current) {
        openPrintWindow(printRef.current.innerHTML, 'Print Barcode', win);
      }
    }, 500);
  };

  const filteredProducts = products.filter((p: any) => 
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.barcode?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, startIndex + itemsPerPage);

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="bg-surface rounded-[20px] border border-border shadow-subtle overflow-hidden flex flex-col">
      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', opacity: 0, pointerEvents: 'none' }}>
        <div ref={printRef} className="p-8 flex flex-col items-center justify-center bg-surface">
          {selectedProduct && (
            <div className="border-2 border-black p-4 rounded-lg flex flex-col items-center gap-2">
              <p className="text-lg font-bold">{selectedProduct.name}</p>
              <Barcode 
                value={selectedProduct.barcode || selectedProduct.sku || 'NO-BARCODE'} 
                width={2}
                height={80}
                fontSize={14}
              />
              <p className="text-sm font-bold">{currencySymbol}{(selectedProduct.price || 0).toLocaleString()}</p>
            </div>
          )}
        </div>
      </div>
      <div className="p-6 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface">
        <div className="flex flex-col">
          <h3 className="text-lg font-bold text-primary tracking-tight">Product Catalog</h3>
          <p className="text-sm font-medium text-secondary mt-0.5">Manage global product registry</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={onAddCategory} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-secondary bg-surface border border-border rounded-lg hover:bg-surface-hover transition-colors">
            Categories
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted"><path d="m6 9 6 6 6-6"/></svg>
          </button>
          <button onClick={onAddBrand} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-secondary bg-surface border border-border rounded-lg hover:bg-surface-hover transition-colors">
            Brands
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted"><path d="m6 9 6 6 6-6"/></svg>
          </button>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input 
              type="text" 
              placeholder="Search products..." 
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1); // Reset to page 1 on search
              }}
              className="pl-9 pr-4 py-2 text-sm border border-border rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all w-[240px]" 
            />
          </div>
        </div>
      </div>
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left min-w-[1000px] whitespace-nowrap">
          <thead>
            <tr className="bg-surface border-b border-border text-[11px] font-bold text-muted uppercase tracking-widest">
              <th className="px-6 py-4">Product Details</th>
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4">SKU Identifier</th>
              <th className="px-6 py-4">Classification</th>
              <th className="px-6 py-4">Market Value</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
        <tbody className="divide-y divide-border bg-surface">
          {currentProducts.map((p: any) => (
            <tr key={p.id} className="hover:bg-surface-hover transition-colors group">
              <td className="px-6 py-4">
                <div className="flex items-center gap-4">
                  {(p.images?.[0] || p.image) ? (
                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-border shadow-subtle grow-0 shrink-0">
                      <img src={p.images?.[0] || p.image} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-surface-hover flex items-center justify-center text-muted border border-border grow-0 shrink-0">
                      <Package size={24} strokeWidth={1} />
                    </div>
                  )}
                  <div className="flex flex-col min-w-0">
                    <span className="text-[13.5px] font-bold text-primary group-hover:text-brand transition-colors truncate">{p.name}</span>
                    <span className="text-[11px] font-bold text-muted uppercase tracking-widest mt-1">{p.barcode || 'NO-BARCODE'}</span>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-md ${
                  p.type === 'bundle' ? 'bg-purple-50 text-purple-600' :
                  p.type === 'variable' ? 'bg-brand/10 dark:bg-brand/20 text-brand' :
                  'bg-brand/10 dark:bg-brand/20 text-brand' // Made simple blue to match screenshot
                }`}>
                  {p.type || 'SIMPLE'}
                </span>
              </td>
              <td className="px-6 py-4 font-medium text-[13px] text-secondary">{p.sku}</td>
              <td className="px-6 py-4">
                <div className="flex flex-col">
                  <span className="text-[13px] text-secondary">{categories.find((c: any) => c.id === p.categoryId)?.name || 'Uncategorized'}</span>
                  <span className="text-[10px] font-bold text-muted mt-1 uppercase tracking-widest">{brands.find((b: any) => b.id === p.brandId)?.name || 'No Brand'}</span>
                </div>
              </td>
              <td className="px-6 py-4 font-bold text-[15px] text-primary">{currencySymbol}{(p.price || 0).toLocaleString()}</td>
              <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  <button 
                    onClick={() => triggerPrint(p)}
                    className="w-8 h-8 flex items-center justify-center border border-border rounded-lg hover:bg-surface-hover transition-colors text-secondary"
                    title="Print Barcode"
                  >
                    <Printer size={15} />
                  </button>
                  <button onClick={() => onEdit(p)} className="w-8 h-8 flex items-center justify-center border border-border rounded-lg hover:bg-surface-hover transition-colors text-secondary">
                    <Edit size={15} />
                  </button>
                  <button onClick={() => onDelete(p.id)} className="w-8 h-8 flex items-center justify-center border border-red-100 rounded-lg hover:bg-red-50 hover:border-red-200 transition-colors text-red-500">
                    <Trash2 size={15} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <div className="px-6 py-4 border-t border-border bg-surface flex items-center justify-between">
         <span className="text-[13px] text-secondary">
           Showing {filteredProducts.length === 0 ? 0 : startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredProducts.length)} of {filteredProducts.length} products
         </span>
         {totalPages > 1 && (
           <div className="flex items-center gap-1">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="w-8 h-8 flex items-center justify-center border border-border rounded-lg hover:bg-surface-hover text-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                 <ChevronLeft size={16} />
              </button>
              
              {getPageNumbers().map((pageNum, idx) => (
                pageNum === '...' ? (
                  <span key={`dots-${idx}`} className="w-8 h-8 flex items-center justify-center text-muted">...</span>
                ) : (
                  <button 
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum as number)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg font-medium text-sm transition-colors ${
                      currentPage === pageNum 
                        ? 'bg-brand text-white shadow-subtle' 
                        : 'border border-border hover:bg-surface-hover text-secondary'
                    }`}
                  >
                     {pageNum}
                  </button>
                )
              ))}

              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="w-8 h-8 flex items-center justify-center border border-border rounded-lg hover:bg-surface-hover text-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                 <ChevronRight size={16} />
              </button>
           </div>
         )}
      </div>
    </div>
  );
}

function WarehousesTab({ warehouses, onEdit, onDelete }: any) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {warehouses.map((w: any) => (
        <div key={w.id} className="bg-surface p-6 rounded-2xl border border-border shadow-subtle hover:shadow-premium transition-all group">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-brand/10 text-brand rounded-xl">
              <Warehouse size={24} />
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => onEdit(w)} className="p-2 hover:bg-surface-hover rounded-lg transition-colors">
                <Edit size={16} className="text-muted" />
              </button>
              <button onClick={() => onDelete(w.id)} className="p-2 hover:bg-red-50 rounded-lg transition-colors text-muted hover:text-red-600">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
          <h3 className="text-lg font-bold text-primary">{w.name}</h3>
          <div className="flex items-center gap-2 text-xs text-secondary mt-1">
            <Tag size={12} />
            {w.location}
          </div>
          <p className="text-xs text-muted mt-4 leading-relaxed">{w.address}</p>
        </div>
      ))}
    </div>
  );
}

function StockTab({ inventory, products, variants, warehouses, onAdjust, onTransfer }: any) {
  return (
    <div className="bg-surface rounded-xl border border-border shadow-subtle overflow-hidden">
      <div className="p-4 border-b border-border flex justify-between items-center bg-surface-hover/30">
        <h3 className="text-sm font-bold text-secondary uppercase tracking-widest">Stock Levels</h3>
        <div className="flex gap-2">
          <button onClick={onAdjust} className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest bg-brand text-white rounded-lg hover:bg-brand-hover transition-all">Adjustment</button>
          <button onClick={onTransfer} className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all">Transfer</button>
        </div>
      </div>
      <table className="w-full text-left min-w-[800px] whitespace-nowrap">
        <thead>
          <tr className="bg-surface-hover text-[10px] uppercase tracking-widest text-secondary">
            <th className="px-6 py-4 font-semibold">Item</th>
            <th className="px-6 py-4 font-semibold">Warehouse</th>
            <th className="px-6 py-4 font-semibold">Quantity</th>
            <th className="px-6 py-4 font-semibold">Alert Level</th>
            <th className="px-6 py-4 font-semibold text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {inventory.map((inv: any) => {
            const product = products.find((p: any) => p.id === inv.productId);
            const variant = variants.find((v: any) => v.id === inv.variantId);
            const warehouse = warehouses.find((w: any) => w.id === inv.warehouseId);
            const isLowStock = inv.quantity <= (product?.minStock || 5);
            return (
              <tr key={inv.id} className={`hover:bg-surface-hover transition-colors ${isLowStock ? 'bg-red-50/30' : ''}`}>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold">{product?.name || 'Unknown'}</span>
                    {variant && (
                      <span className="text-[10px] text-muted">
                        {variant.size} / {variant.color} / {variant.fabric}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-xs text-secondary">{warehouse?.name || 'Unknown'}</td>
                <td className="px-6 py-4">
                  <StockBadge stock={inv.quantity} />
                </td>
                <td className="px-6 py-4 text-xs font-mono text-secondary">{product?.minStock || 5}</td>
                <td className="px-6 py-4 text-right">
                  <button onClick={onAdjust} className="text-xs font-bold text-brand hover:underline">Adjust</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PurchasesTab({ pos, suppliers, products, variants, onAdd, setConfirmConfig }: any) {
  const { currencySymbol } = useSettings();
  const handleReceive = async (po: any) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Receive Purchase Order',
      message: 'Mark this PO as received? This will update inventory.',
      variant: 'info',
      onConfirm: async () => {
        try {
          const batch = writeBatch(db);
          const warehousesSnap = await getDocs(collection(db, 'warehouses'));
          const targetWarehouseId = warehousesSnap.docs[0]?.id;

          if (!targetWarehouseId) {
            toast.error('No warehouse found. Please create a warehouse first.');
            return;
          }

          toast.info(`Receiving into warehouse: ${warehousesSnap.docs[0]?.data()?.name || targetWarehouseId}`);

          for (const item of po.items) {
            const inventoryId = `${targetWarehouseId}_${item.productId}_${item.variantId || 'none'}`;
            const inventoryRef = doc(db, 'inventory', inventoryId);
            const inventorySnap = await getDoc(inventoryRef);

            const newQuantity = (inventorySnap.exists() ? inventorySnap.data().quantity : 0) + item.quantity;

            if (inventorySnap.exists()) {
              batch.update(inventoryRef, {
                quantity: newQuantity,
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

            // Record Movement and Valuation Batch
            const movementRef = doc(collection(db, 'stockLedger'));
            batch.set(movementRef, {
              productId: item.productId,
              variantId: item.variantId || null,
              warehouseId: targetWarehouseId,
              type: 'purchase',
              quantity: item.quantity,
              unitCost: item.costPrice,
              totalValue: item.quantity * item.costPrice,
              referenceId: po.id,
              uid: auth.currentUser?.uid,
              timestamp: serverTimestamp()
            });

            const purchaseBatchRef = doc(collection(db, 'purchaseBatches'));
            batch.set(purchaseBatchRef, {
              productId: item.productId,
              variantId: item.variantId || null,
              warehouseId: targetWarehouseId,
              quantity: item.quantity,
              originalQuantity: item.quantity,
              unitCost: item.costPrice,
              supplierId: po.supplierId,
              purchaseDate: serverTimestamp(),
              uid: auth.currentUser?.uid
            });

            // Legacy log for backward compatibility
            const logRef = doc(collection(db, 'inventoryLogs'));
            batch.set(logRef, {
              productId: item.productId,
              variantId: item.variantId || null,
              warehouseId: targetWarehouseId,
              action: 'purchase',
              quantityChange: item.quantity,
              newQuantity: newQuantity,
              referenceId: po.id,
              uid: auth.currentUser?.uid,
              createdAt: serverTimestamp()
            });
          }

          batch.update(doc(db, 'purchaseOrders', po.id), { status: 'received', receivedAt: serverTimestamp(), updatedAt: serverTimestamp() });
          await batch.commit();
          toast.success('PO received and stock updated');
        } catch (e) {
          handleFirestoreError(e, OperationType.UPDATE, `purchaseOrders/${po.id}`);
        }
      }
    });
  };

  return (
    <div className="bg-surface rounded-xl border border-border shadow-subtle overflow-hidden">
      <div className="p-4 border-b border-border flex justify-between items-center bg-surface-hover/30">
        <h3 className="text-sm font-bold text-secondary uppercase tracking-widest">Purchase Orders</h3>
        <button onClick={onAdd} className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest bg-slate-900 dark:bg-white text-white dark:text-black rounded-lg hover:bg-black dark:hover:bg-gray-200 transition-all">New PO</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[800px] whitespace-nowrap">
          <thead>
            <tr className="bg-surface-hover text-[10px] uppercase tracking-widest text-secondary">
              <th className="px-6 py-4 font-semibold">PO ID</th>
              <th className="px-6 py-4 font-semibold">Supplier</th>
              <th className="px-6 py-4 font-semibold">Status</th>
              <th className="px-6 py-4 font-semibold">Total Cost</th>
              <th className="px-6 py-4 font-semibold">Created</th>
              <th className="px-6 py-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
          {pos.map((po: any) => (
            <tr key={po.id} className="hover:bg-surface-hover transition-colors">
              <td className="px-6 py-4 font-mono text-xs uppercase">{po.id.slice(0, 8)}</td>
              <td className="px-6 py-4 text-sm">{suppliers.find((s: any) => s.id === po.supplierId)?.name || 'Unknown'}</td>
              <td className="px-6 py-4">
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${
                  po.status === 'received' ? 'bg-green-50 text-green-600 border-green-100' :
                  po.status === 'ordered' ? 'bg-brand/10 text-brand border-brand/20' :
                  'bg-surface-hover text-secondary border-border'
                }`}>
                  {po.status}
                </span>
              </td>
              <td className="px-6 py-4 font-bold text-sm">{currencySymbol}{(po.totalCost || 0).toLocaleString()}</td>
              <td className="px-6 py-4 text-xs text-muted">{po.createdAt?.toDate ? po.createdAt.toDate().toLocaleDateString() : (po.createdAt?.seconds ? new Date(po.createdAt.seconds * 1000).toLocaleDateString() : 'N/A')}</td>
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
    </div>
  );
}

function SuppliersTab({ suppliers, onEdit, setConfirmConfig }: any) {
  const handleDeleteSupplier = async (id: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Delete Supplier',
      message: 'Are you sure you want to delete this supplier? This action cannot be undone.',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'suppliers', id));
          toast.success('Supplier deleted successfully');
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `suppliers/${id}`);
        }
      }
    });
  };

  return (
    <div className="bg-surface rounded-xl border border-border shadow-subtle overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[800px] whitespace-nowrap">
          <thead>
            <tr className="bg-surface-hover text-[10px] uppercase tracking-widest text-secondary">
              <th className="px-6 py-4 font-semibold">Supplier Name</th>
              <th className="px-6 py-4 font-semibold">Contact Person</th>
              <th className="px-6 py-4 font-semibold">Phone</th>
              <th className="px-6 py-4 font-semibold">Email</th>
              <th className="px-6 py-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
          {suppliers.map((s: any) => (
            <tr key={s.id} className="hover:bg-surface-hover transition-colors">
              <td className="px-6 py-4 text-sm font-bold">{s.name}</td>
              <td className="px-6 py-4 text-sm">{s.contactPerson}</td>
              <td className="px-6 py-4 text-sm">{s.phone}</td>
              <td className="px-6 py-4 text-sm text-secondary">{s.email}</td>
              <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  <button onClick={() => onEdit(s)} className="p-2 hover:bg-surface-hover rounded-lg transition-colors">
                    <Edit size={16} className="text-muted" />
                  </button>
                  <button onClick={() => handleDeleteSupplier(s.id)} className="p-2 hover:bg-red-50 rounded-lg transition-colors group">
                    <Trash2 size={16} className="text-muted group-hover:text-red-600" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

function ReturnsTab({ products, variants, warehouses, setConfirmConfig }: any) {
  const [returns, setReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'returnRequests'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setReturns(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      if (error.code !== 'permission-denied') {
        handleFirestoreError(error, OperationType.LIST, 'returnRequests');
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleApproveReturn = async (ret: any) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Approve Return',
      message: 'Approve this return? This will add stock back to the selected warehouse.',
      variant: 'info',
      onConfirm: async () => {
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
      }
    });
  };

  return (
    <div className="bg-surface rounded-xl border border-border shadow-subtle overflow-hidden">
      <div className="p-4 border-b border-border flex justify-between items-center bg-surface-hover/30">
        <h3 className="text-sm font-bold text-secondary uppercase tracking-widest">Return & Exchange Requests</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[800px] whitespace-nowrap">
          <thead>
            <tr className="bg-surface-hover text-[10px] uppercase tracking-widest text-secondary">
              <th className="px-6 py-4 font-semibold">Order ID</th>
              <th className="px-6 py-4 font-semibold">Product</th>
              <th className="px-6 py-4 font-semibold">Reason</th>
              <th className="px-6 py-4 font-semibold">Status</th>
              <th className="px-6 py-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
          {returns.map((ret: any) => {
            const product = products.find((p: any) => p.id === ret.productId);
            return (
              <tr key={ret.id} className="hover:bg-surface-hover transition-colors">
                <td className="px-6 py-4 font-mono text-xs uppercase">#{ret.orderNumber || ret.orderId?.slice(0, 8)}</td>
                <td className="px-6 py-4 text-sm font-bold">{product?.name || 'Unknown'}</td>
                <td className="px-6 py-4 text-xs text-secondary">{ret.reason}</td>
                <td className="px-6 py-4">
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${
                    ret.status === 'approved' ? 'bg-green-50 text-green-600 border-green-100' :
                    ret.status === 'pending' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                    'bg-surface-hover text-secondary border-border'
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
    </div>
  );
}

function LogsTab({ logs, products, variants, warehouses }: any) {
  return (
    <div className="bg-surface rounded-xl border border-border shadow-subtle overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[800px] whitespace-nowrap">
          <thead>
            <tr className="bg-surface-hover text-[10px] uppercase tracking-widest text-secondary">
              <th className="px-6 py-4 font-semibold">Time</th>
              <th className="px-6 py-4 font-semibold">Action</th>
              <th className="px-6 py-4 font-semibold">Item</th>
              <th className="px-6 py-4 font-semibold">Warehouse</th>
              <th className="px-6 py-4 font-semibold">Change</th>
              <th className="px-6 py-4 font-semibold">New Stock</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
          {logs.map((log: any) => {
            const product = products.find((p: any) => p.id === log.productId);
            const warehouse = warehouses.find((w: any) => w.id === log.warehouseId);
            return (
              <tr key={log.id} className="text-xs">
                <td className="px-6 py-4 text-muted">{log.createdAt?.toDate ? log.createdAt.toDate().toLocaleString() : (log.createdAt?.seconds ? new Date(log.createdAt.seconds * 1000).toLocaleString() : 'N/A')}</td>
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
        <div className="bg-surface p-6 rounded-2xl border border-border shadow-subtle">
          <p className="text-xs font-bold text-muted uppercase mb-1">Inventory Value (Cost)</p>
          <p className="text-2xl font-bold text-primary">{currencySymbol}{(totalCost || 0).toLocaleString()}</p>
        </div>
        <div className="bg-surface p-6 rounded-2xl border border-border shadow-subtle">
          <p className="text-xs font-bold text-muted uppercase mb-1">Potential Revenue</p>
          <p className="text-2xl font-bold text-green-600">{currencySymbol}{(totalRetail || 0).toLocaleString()}</p>
        </div>
        <div className="bg-surface p-6 rounded-2xl border border-border shadow-subtle">
          <p className="text-xs font-bold text-muted uppercase mb-1">Potential Profit</p>
          <p className="text-2xl font-bold text-brand">{currencySymbol}{(totalRetail - totalCost || 0).toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-surface p-6 rounded-2xl border border-border shadow-subtle">
          <h3 className="text-lg font-bold mb-4">Low Stock Items</h3>
          <div className="space-y-3">
            {lowStock.length === 0 ? (
              <p className="text-sm text-muted italic">No low stock items.</p>
            ) : (
              lowStock.map((inv: any) => {
                const p = products.find((prod: any) => prod.id === inv.productId);
                return (
                  <div key={inv.id} className="flex items-center justify-between p-3 bg-surface-hover rounded-xl">
                    <div>
                      <p className="text-sm font-bold">{p?.name}</p>
                      <p className="text-[10px] text-muted uppercase">Warehouse: {inv.warehouseId}</p>
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

        <div className="bg-surface p-6 rounded-2xl border border-border shadow-subtle">
          <h3 className="text-lg font-bold mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {logs.slice(0, 5).map((log: any) => {
              const p = products.find((prod: any) => prod.id === log.productId);
              return (
                <div key={log.id} className="flex items-center justify-between p-3 bg-surface-hover rounded-xl">
                  <div>
                    <p className="text-sm font-bold">{p?.name}</p>
                    <p className="text-[10px] text-muted uppercase">{log.action.replace('_', ' ')}</p>
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
      <div className="bg-surface w-full max-w-md rounded-2xl shadow-2xl p-8 space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-2xl font-bold font-serif">{editingItem ? 'Edit Warehouse' : 'New Warehouse'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-surface-hover rounded-full"><X /></button>
        </div>
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted uppercase">Warehouse Name</label>
            <input className="w-full p-3 bg-surface-hover rounded-xl outline-none border border-transparent focus:border-border" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted uppercase">Location / Address</label>
            <input className="w-full p-3 bg-surface-hover rounded-xl outline-none border border-transparent focus:border-border" value={form.location} onChange={e => setForm({...form, location: e.target.value})} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted uppercase">Description</label>
            <textarea className="w-full p-3 bg-surface-hover rounded-xl outline-none border border-transparent focus:border-border h-24" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
          </div>
        </div>
        <div className="flex gap-4 pt-4">
          <button onClick={onClose} className="flex-1 py-3 bg-surface-hover text-secondary rounded-xl font-bold">Cancel</button>
          <button onClick={handleSave} className="flex-[2] py-3 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl font-bold shadow-lg">Save Warehouse</button>
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
      const unitCost = products.find((p: any) => p.id === form.productId)?.costPrice || 0;
      
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
        action: form.type === 'in' ? 'stock_in' : (form.type === 'damage' ? 'damage_out' : 'stock_out'),
        quantityChange: adjQty,
        newQuantity: (inventorySnap.exists() ? inventorySnap.data().quantity : 0) + adjQty,
        reason: form.reason || (form.type === 'damage' ? 'Damaged / Wastage' : ''),
        uid: auth.currentUser?.uid,
        createdAt: serverTimestamp()
      });

      // Valuation Ledger
      const movementRef = doc(collection(db, 'stockLedger'));
      batch.set(movementRef, {
        productId: form.productId,
        variantId: form.variantId || null,
        warehouseId: form.warehouseId,
        type: form.type === 'damage' ? 'damage' : 'adjustment',
        quantity: adjQty,
        unitCost: unitCost,
        totalValue: adjQty * unitCost,
        referenceId: 'manual_adj',
        uid: auth.currentUser?.uid,
        timestamp: serverTimestamp()
      });

      if (form.type === 'in') {
        const purchaseBatchRef = doc(collection(db, 'purchaseBatches'));
        batch.set(purchaseBatchRef, {
          productId: form.productId,
          variantId: form.variantId || null,
          warehouseId: form.warehouseId,
          quantity: form.quantity,
          originalQuantity: form.quantity,
          unitCost: unitCost,
          supplierId: 'adjustment',
          purchaseDate: serverTimestamp(),
          uid: auth.currentUser?.uid
        });
      }

      // If damage, record an expense in Finance
      if (form.type === 'damage') {
        const txnRef = doc(collection(db, 'transactions'));
        batch.set(txnRef, {
          type: 'expense',
          category: 'Expenses',
          subCategory: 'Damage & Wastage',
          amount: Math.abs(adjQty) * unitCost,
          method: 'System', // Using System method
          accountId: 'inventory_asset', // Virtual account for inventory adjustments
          status: 'completed',
          notes: form.reason || 'Damage/Wastage Adjustment',
          date: serverTimestamp(),
          updatedAt: serverTimestamp(),
          uid: auth.currentUser?.uid
        });
      }

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
      <div className="bg-surface w-full max-w-md rounded-2xl shadow-2xl p-8 space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-2xl font-bold font-serif text-primary">Stock Adjustment</h3>
          <button onClick={onClose} className="p-2 hover:bg-surface-hover rounded-full"><X /></button>
        </div>
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted uppercase">Product</label>
            <select className="w-full p-3 bg-surface-hover rounded-xl outline-none border border-transparent focus:border-border" value={form.productId} onChange={e => setForm({...form, productId: e.target.value, variantId: ''})}>
              <option value="">Select Product</option>
              {products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          {selectedProduct?.type === 'variable' && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted uppercase">Variant</label>
              <select className="w-full p-3 bg-surface-hover rounded-xl outline-none border border-transparent focus:border-border" value={form.variantId} onChange={e => setForm({...form, variantId: e.target.value})}>
                <option value="">Select Variant</option>
                {filteredVariants.map((v: any) => <option key={v.id} value={v.id}>{v.sku} ({v.size}/{v.color})</option>)}
              </select>
            </div>
          )}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted uppercase">Warehouse</label>
            <select className="w-full p-3 bg-surface-hover rounded-xl outline-none border border-transparent focus:border-border" value={form.warehouseId} onChange={e => setForm({...form, warehouseId: e.target.value})}>
              <option value="">Select Warehouse</option>
              {warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted uppercase">Type</label>
              <select className="w-full p-3 bg-surface-hover rounded-xl outline-none border border-transparent focus:border-border" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                <option value="in">Stock In (+)</option>
                <option value="out">Stock Out (-)</option>
                <option value="damage">Damage / Wastage (-)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted uppercase">Quantity</label>
              <input type="number" className="w-full p-3 bg-surface-hover rounded-xl outline-none border border-transparent focus:border-border" value={form.quantity || 0} onChange={e => setForm({...form, quantity: parseInt(e.target.value) || 0})} />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted uppercase">Reason / Note</label>
            <input className="w-full p-3 bg-surface-hover rounded-xl outline-none border border-transparent focus:border-border" value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} placeholder="e.g., Opening Stock, Damage, Return" />
          </div>
        </div>
        <div className="flex gap-4 pt-4">
          <button onClick={onClose} className="flex-1 py-3 bg-surface-hover text-secondary rounded-xl font-bold">Cancel</button>
          <button onClick={handleAdjust} className="flex-[2] py-3 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl font-bold shadow-lg">Confirm Adjustment</button>
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
      <div className="bg-surface w-full max-w-2xl rounded-2xl shadow-2xl p-8 space-y-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center">
          <h3 className="text-2xl font-bold font-serif text-primary">New Purchase Order</h3>
          <button onClick={onClose} className="p-2 hover:bg-surface-hover rounded-full"><X /></button>
        </div>
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted uppercase">Supplier</label>
            <select className="w-full p-3 bg-surface-hover rounded-xl outline-none border border-transparent focus:border-border" value={form.supplierId} onChange={e => setForm({...form, supplierId: e.target.value})}>
              <option value="">Select Supplier</option>
              {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          
          <div className="bg-surface-hover p-4 rounded-2xl space-y-4">
            <h4 className="text-xs font-bold uppercase text-muted">Add Items</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <select className="p-2 rounded-lg text-xs" value={newItem.productId} onChange={e => setNewItem({...newItem, productId: e.target.value, variantId: ''})}>
                <option value="">Product</option>
                {products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input type="number" placeholder="Qty" className="p-2 rounded-lg text-xs" value={newItem.quantity || 0} onChange={e => setNewItem({...newItem, quantity: parseInt(e.target.value) || 0})} />
              <input type="number" placeholder="Cost" className="p-2 rounded-lg text-xs" value={newItem.costPrice || 0} onChange={e => setNewItem({...newItem, costPrice: parseFloat(e.target.value) || 0})} />
              <button onClick={addItem} className="bg-slate-900 dark:bg-white text-white dark:text-black rounded-lg text-xs font-bold">Add Item</button>
            </div>
            <div className="space-y-2">
              {form.items.map((item, idx) => {
                const p = products.find((prod: any) => prod.id === item.productId);
                return (
                  <div key={idx} className="flex justify-between items-center bg-surface p-3 rounded-xl border border-border text-xs">
                    <span>{p?.name} x {item.quantity}</span>
                    <span className="font-mono">{currencySymbol}{((item.quantity || 0) * (item.costPrice || 0)).toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="flex gap-4 pt-4">
          <button onClick={onClose} className="flex-1 py-3 bg-surface-hover text-secondary rounded-xl font-bold">Cancel</button>
          <button onClick={handleAddPO} className="flex-[2] py-3 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl font-bold shadow-lg">Create PO</button>
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
      <div className="bg-surface w-full max-w-md rounded-2xl shadow-2xl p-8 space-y-6">
        <h3 className="text-2xl font-bold font-serif">{editingItem ? 'Edit Category' : 'New Category'}</h3>
        <input className="w-full p-3 bg-surface-hover rounded-xl outline-none border border-transparent focus:border-border" placeholder="Category Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
        <textarea className="w-full p-3 bg-surface-hover rounded-xl outline-none border border-transparent focus:border-border h-24" placeholder="Description" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
        <div className="flex gap-4">
          <button onClick={onClose} className="flex-1 py-3 bg-surface-hover text-secondary rounded-xl font-bold">Cancel</button>
          <button onClick={handleSave} className="flex-[2] py-3 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl font-bold shadow-lg">Save</button>
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
      <div className="bg-surface w-full max-w-md rounded-2xl shadow-2xl p-8 space-y-6">
        <h3 className="text-2xl font-bold font-serif">{editingItem ? 'Edit Brand' : 'New Brand'}</h3>
        <input className="w-full p-3 bg-surface-hover rounded-xl outline-none border border-transparent focus:border-border" placeholder="Brand Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
        <textarea className="w-full p-3 bg-surface-hover rounded-xl outline-none border border-transparent focus:border-border h-24" placeholder="Description" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
        <div className="flex gap-4">
          <button onClick={onClose} className="flex-1 py-3 bg-surface-hover text-secondary rounded-xl font-bold">Cancel</button>
          <button onClick={handleSave} className="flex-[2] py-3 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl font-bold shadow-lg">Save</button>
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
      <div className="bg-surface w-full max-w-md rounded-2xl shadow-2xl p-8 space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-2xl font-bold font-serif text-primary">Stock Transfer</h3>
          <button onClick={onClose} className="p-2 hover:bg-surface-hover rounded-full"><X /></button>
        </div>
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted uppercase">Product</label>
            <select className="w-full p-3 bg-surface-hover rounded-xl outline-none border border-transparent focus:border-border" value={form.productId} onChange={e => setForm({...form, productId: e.target.value, variantId: ''})}>
              <option value="">Select Product</option>
              {products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          {selectedProduct?.type === 'variable' && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted uppercase">Variant</label>
              <select className="w-full p-3 bg-surface-hover rounded-xl outline-none border border-transparent focus:border-border" value={form.variantId} onChange={e => setForm({...form, variantId: e.target.value})}>
                <option value="">Select Variant</option>
                {filteredVariants.map((v: any) => <option key={v.id} value={v.id}>{v.sku} ({v.size}/{v.color})</option>)}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted uppercase">From Warehouse</label>
              <select className="w-full p-3 bg-surface-hover rounded-xl outline-none border border-transparent focus:border-border" value={form.fromWarehouseId} onChange={e => setForm({...form, fromWarehouseId: e.target.value})}>
                <option value="">Source</option>
                {warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted uppercase">To Warehouse</label>
              <select className="w-full p-3 bg-surface-hover rounded-xl outline-none border border-transparent focus:border-border" value={form.toWarehouseId} onChange={e => setForm({...form, toWarehouseId: e.target.value})}>
                <option value="">Destination</option>
                {warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted uppercase">Quantity</label>
            <input type="number" className="w-full p-3 bg-surface-hover rounded-xl outline-none border border-transparent focus:border-border" value={form.quantity || 0} onChange={e => setForm({...form, quantity: parseInt(e.target.value) || 0})} />
          </div>
        </div>
        <div className="flex gap-4 pt-4">
          <button onClick={onClose} className="flex-1 py-3 bg-surface-hover text-secondary rounded-xl font-bold">Cancel</button>
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
      <div className="bg-surface w-full max-w-md rounded-2xl shadow-2xl p-8 space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-2xl font-bold font-serif text-primary">{editingItem ? 'Edit Supplier' : 'New Supplier'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-surface-hover rounded-full"><X /></button>
        </div>
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted uppercase">Supplier Name</label>
            <input className="w-full p-3 bg-surface-hover rounded-xl outline-none border border-transparent focus:border-border" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted uppercase">Contact Person</label>
              <input className="w-full p-3 bg-surface-hover rounded-xl outline-none border border-transparent focus:border-border" value={form.contactPerson} onChange={e => setForm({...form, contactPerson: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted uppercase">Phone</label>
              <input className="w-full p-3 bg-surface-hover rounded-xl outline-none border border-transparent focus:border-border" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted uppercase">Email</label>
            <input className="w-full p-3 bg-surface-hover rounded-xl outline-none border border-transparent focus:border-border" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted uppercase">Address</label>
            <textarea className="w-full p-3 bg-surface-hover rounded-xl outline-none border border-transparent focus:border-border h-20" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
          </div>
        </div>
        <div className="flex gap-4 pt-4">
          <button onClick={onClose} className="flex-1 py-3 bg-surface-hover text-secondary rounded-xl font-bold">Cancel</button>
          <button onClick={handleSave} className="flex-[2] py-3 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl font-bold shadow-lg">Save Supplier</button>
        </div>
      </div>
    </div>
  );
}

function WastageTab({ wastageLogs, products, variants, warehouses, onAdd }: any) {
  const { currencySymbol } = useSettings();
  return (
    <div className="bg-surface rounded-[2rem] border border-border shadow-subtle overflow-hidden animate-in fade-in duration-500">
      <div className="p-8 border-b border-border flex justify-between items-center bg-gradient-to-r from-rose-50/30 to-white">
        <div className="flex flex-col">
          <h3 className="text-xs font-black text-rose-900 uppercase tracking-[0.2em]">Damage & Wastage Ledger</h3>
          <p className="text-[9px] font-bold text-rose-400 uppercase tracking-widest mt-1">Track inventory losses and damaged assets</p>
        </div>
        <button onClick={onAdd} className="px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.15em] bg-rose-600 text-white rounded-xl shadow-lg shadow-rose-500/20 hover:bg-rose-700 transition-all active:scale-95 flex items-center gap-2">
          <Plus size={14} strokeWidth={3} />
          Report Loss
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[800px] whitespace-nowrap">
          <thead>
            <tr className="bg-surface-hover/50 text-[9px] uppercase tracking-[0.2em] text-muted">
              <th className="px-8 py-5 font-black">Ref ID</th>
              <th className="px-8 py-5 font-black">Item Details</th>
              <th className="px-8 py-5 font-black">Warehouse</th>
              <th className="px-8 py-5 font-black text-center">Qty</th>
              <th className="px-8 py-5 font-black text-right">Value Loss</th>
              <th className="px-8 py-5 font-black">Reason</th>
              <th className="px-8 py-5 font-black text-right">Recorded At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            <AnimatePresence mode="popLayout">
              {wastageLogs.map((log: any, index: number) => {
                const product = products.find((p: any) => p.id === log.productId);
                const variant = variants.find((v: any) => v.id === log.variantId);
                const warehouse = warehouses.find((w: any) => w.id === log.warehouseId);
                return (
                  <motion.tr 
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ delay: index * 0.05 }}
                    key={log.id} 
                    className="hover:bg-rose-50/30 transition-colors group"
                  >
                    <td className="px-8 py-5 font-mono text-[10px] text-muted uppercase">{log.id.slice(0, 8)}</td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-black text-primary uppercase tracking-tight truncate max-w-[200px]">{product?.name || 'Unknown Item'}</span>
                        {variant && <span className="text-[9px] font-bold text-muted uppercase tracking-widest mt-0.5">{variant.size} / {variant.color}</span>}
                      </div>
                    </td>
                    <td className="px-8 py-5 text-[10px] font-black text-secondary uppercase tracking-widest">{warehouse?.name || '---'}</td>
                    <td className="px-8 py-5 text-center">
                      <span className="px-2 py-1 bg-rose-50 text-rose-600 rounded-lg text-[10px] font-black tabular-nums">-{log.quantity}</span>
                    </td>
                    <td className="px-8 py-5 text-right font-black text-xs text-rose-600 tabular-nums">
                      {currencySymbol}{((log.unitCost || 0) * log.quantity).toLocaleString()}
                    </td>
                    <td className="px-8 py-5 text-[10px] font-bold text-secondary italic max-w-[150px] truncate">{log.reason || 'N/A'}</td>
                    <td className="px-8 py-5 text-right text-[10px] font-black text-muted uppercase tracking-widest">
                      {log.createdAt?.toDate ? log.createdAt.toDate().toLocaleString() : '---'}
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
            {wastageLogs.length === 0 && (
              <tr>
                <td colSpan={7} className="px-8 py-20 text-center">
                  <div className="mx-auto w-16 h-16 bg-surface-hover rounded-full flex items-center justify-center text-muted mb-4 border border-border shadow-inner">
                    <AlertTriangle size={32} strokeWidth={1} />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">No wastage records found</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function WastageModal({ isOpen, onClose, products, variants, warehouses }: any) {
  const [form, setForm] = useState({
    productId: '',
    variantId: '',
    warehouseId: '',
    quantity: 1,
    reason: '',
    type: 'damage'
  });
  const [loading, setLoading] = useState(false);
  const { currencySymbol } = useSettings();

  const handleReport = async () => {
    if (!form.productId || !form.warehouseId || form.quantity <= 0) {
      toast.error('Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      const batch = writeBatch(db);
      const inventoryId = `${form.warehouseId}_${form.productId}_${form.variantId || 'none'}`;
      const inventoryRef = doc(db, 'inventory', inventoryId);
      const inventorySnap = await getDoc(inventoryRef);

      if (!inventorySnap.exists() || inventorySnap.data().quantity < form.quantity) {
        toast.error('Insufficient stock in selected warehouse');
        setLoading(false);
        return;
      }

      const product = products.find((p: any) => p.id === form.productId);
      const unitCost = product?.costPrice || 0;

      // Update Inventory
      batch.update(inventoryRef, {
        quantity: inventorySnap.data().quantity - form.quantity,
        updatedAt: serverTimestamp()
      });

      // Create Wastage Log
      const wastageRef = doc(collection(db, 'wastage_logs'));
      batch.set(wastageRef, {
        ...form,
        unitCost,
        uid: auth.currentUser?.uid,
        createdAt: serverTimestamp()
      });

      // Create Stock Movement Log
      const logRef = doc(collection(db, 'inventoryLogs'));
      batch.set(logRef, {
        productId: form.productId,
        variantId: form.variantId || null,
        warehouseId: form.warehouseId,
        action: 'wastage',
        quantityChange: -form.quantity,
        newQuantity: inventorySnap.data().quantity - form.quantity,
        referenceId: wastageRef.id,
        uid: auth.currentUser?.uid,
        createdAt: serverTimestamp()
      });

      // Create Expense Record
      const txnRef = doc(collection(db, 'transactions'));
      batch.set(txnRef, {
        type: 'expense',
        category: 'Expenses',
        subCategory: 'Damage & Wastage',
        amount: form.quantity * unitCost,
        method: 'Inventory Adjustment',
        accountId: 'inventory_asset',
        status: 'Completed',
        notes: `Wastage Report: ${product?.name} (${form.reason})`,
        date: new Date().toISOString().split('T')[0],
        createdAt: serverTimestamp(),
        uid: auth.currentUser?.uid
      });

      await batch.commit();
      toast.success('Wastage reported and stock updated');
      onClose();
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'wastage_logs');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const selectedProduct = products.find((p: any) => p.id === form.productId);

  return (
    <div className="fixed inset-0 bg-slate-900/90 dark:bg-white/90 text-white dark:text-black backdrop-blur-xl z-[70] flex items-center justify-center p-4">
      <div className="bg-surface w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 flex flex-col max-h-[90vh]">
        <div className="p-8 border-b border-border flex justify-between items-center bg-rose-50/30">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-rose-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-rose-500/30">
              <AlertTriangle size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-xl font-black text-rose-900 uppercase tracking-tight">Report Inventory Loss</h3>
              <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest mt-0.5">Asset damage & wastage record</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-surface rounded-2xl transition-all"><X size={24} /></button>
        </div>

        <div className="p-10 space-y-8 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-muted uppercase tracking-widest ml-1">Product</label>
              <select className="w-full p-4 bg-surface-hover border border-transparent rounded-[1.5rem] text-xs font-black uppercase tracking-widest outline-none focus:bg-surface focus:border-rose-200 transition-all" value={form.productId} onChange={e => setForm({...form, productId: e.target.value, variantId: ''})}>
                <option value="">Select Item</option>
                {products.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-muted uppercase tracking-widest ml-1">Warehouse</label>
              <select className="w-full p-4 bg-surface-hover border border-transparent rounded-[1.5rem] text-xs font-black uppercase tracking-widest outline-none focus:bg-surface focus:border-rose-200 transition-all" value={form.warehouseId} onChange={e => setForm({...form, warehouseId: e.target.value})}>
                <option value="">Select Origin</option>
                {warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
          </div>

          {selectedProduct?.type === 'variable' && (
            <div className="space-y-2">
              <label className="text-[10px] font-black text-muted uppercase tracking-widest ml-1">Variant Selection</label>
              <select className="w-full p-4 bg-surface-hover border border-transparent rounded-[1.5rem] text-xs font-black uppercase tracking-widest outline-none focus:bg-surface focus:border-rose-200 transition-all" value={form.variantId} onChange={e => setForm({...form, variantId: e.target.value})}>
                <option value="">Default Variant</option>
                {variants.filter((v: any) => v.productId === form.productId).map((v: any) => <option key={v.id} value={v.id}>{v.size} / {v.color}</option>)}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-muted uppercase tracking-widest ml-1">Quantity Lost</label>
              <input type="number" className="w-full p-4 bg-surface-hover border border-transparent rounded-[1.5rem] text-xs font-black uppercase tracking-widest outline-none focus:bg-surface focus:border-rose-200 transition-all" value={form.quantity} onChange={e => setForm({...form, quantity: parseInt(e.target.value) || 0})} />
            </div>
            <div className="space-y-2 text-right">
              <label className="text-[10px] font-black text-muted uppercase tracking-widest mr-1">Estimated Loss</label>
              <div className="p-4 bg-rose-50 text-rose-600 rounded-[1.5rem] font-black text-xl tracking-tighter">
                {currencySymbol}{((selectedProduct?.costPrice || 0) * (form.quantity || 0)).toLocaleString()}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-muted uppercase tracking-widest ml-1">Damage Description</label>
            <textarea className="w-full p-5 bg-surface-hover border border-transparent rounded-[2rem] text-[11px] font-bold outline-none focus:bg-surface focus:border-rose-200 transition-all h-32 resize-none" placeholder="DESCRIBE THE REASON FOR WASTAGE..." value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} />
          </div>
        </div>

        <div className="p-10 bg-surface-hover border-t border-border flex gap-4">
          <button onClick={onClose} className="flex-1 py-5 bg-surface border border-border text-muted rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest hover:text-primary transition-all active:scale-95">Cancel</button>
          <button 
            onClick={handleReport} 
            disabled={loading}
            className="flex-[2] py-5 bg-slate-900 dark:bg-white text-white dark:text-black rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-black/20 hover:bg-black dark:hover:bg-gray-200 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {loading ? <Loader2 className="animate-spin" /> : 'RECORD WASTAGE'}
          </button>
        </div>
      </div>
    </div>
  );
}
