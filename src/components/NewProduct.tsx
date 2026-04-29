import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  X, 
  Plus, 
  Download, 
  Printer, 
  Loader2, 
  ArrowLeft, 
  Save,
  Trash2,
  Image as ImageIcon,
  Info,
  DollarSign,
  UploadCloud,
  Bold,
  Italic,
  List,
  Link as LinkIcon,
  ScanBarcode
} from 'lucide-react';
import { 
  db, 
  auth, 
  storage, 
  collection, 
  query, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  deleteDoc, 
  doc, 
  updateDoc, 
  writeBatch, 
  getDoc, 
  getDocs, 
  where, 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from '../firebase';
import { logActivity } from '../services/activityService';
import Barcode from 'react-barcode';
import { openPrintWindow } from '../utils/printHelper';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { useSettings } from '../contexts/SettingsContext';
import ConfirmModal from './ConfirmModal';

export default function NewProduct() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { currencySymbol } = useSettings();
  const [loading, setLoading] = useState(id ? true : false);
  const [uploading, setUploading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [productVariants, setProductVariants] = useState<any[]>([]);
  const [newVariant, setNewVariant] = useState({ size: '', color: '', fabric: '', sku: '', barcode: '', price: 0, costPrice: 0 });
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
  const barcodeRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState<any>({
    name: '', 
    sku: '', 
    type: 'simple', 
    price: 0, 
    costPrice: 0, 
    categoryId: '', 
    brandId: '', 
    size: '',
    color: '',
    barcode: '', 
    minStock: 10, 
    description: '', 
    images: [],
    bundleItems: []
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const catSnap = await getDocs(collection(db, 'categories'));
        setCategories(catSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        
        const brandSnap = await getDocs(collection(db, 'brands'));
        setBrands(brandSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        const prodSnap = await getDocs(collection(db, 'products'));
        setProducts(prodSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        if (id) {
          const docRef = doc(db, 'products', id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setForm({ id: docSnap.id, ...docSnap.data() });
            
            // Fetch variants
            const q = query(collection(db, 'variants'), where('productId', '==', id));
            const variantsSnap = await getDocs(q);
            setProductVariants(variantsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
          } else {
            toast.error("Product not found");
            navigate('/inventory');
          }
          setLoading(false);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load data");
      }
    };
    fetchData();
  }, [id, navigate]);

  const handlePrintBarcode = () => {
    const win = window.open('', '_blank');
    if (!win) {
       toast.error("Please allow popups to print.");
       return;
    }
    setTimeout(() => {
      if (barcodeRef.current) {
        openPrintWindow(barcodeRef.current.innerHTML, 'Print Barcode', win);
      }
    }, 500);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Compress to JPEG with 0.7 quality
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          
          setForm((prev: any) => ({ 
            ...prev, 
            images: [...(prev.images || []), dataUrl],
            // Also set the primary image if it's the first one
            image: prev.image || dataUrl
          }));
          
          setUploading(false);
          toast.success('Image uploaded successfully');
        };
        
        img.onerror = () => {
          setUploading(false);
          toast.error('Failed to process image');
        };
      };
      
      reader.onerror = () => {
        setUploading(false);
        toast.error('Failed to read file');
      };
    } catch (e) {
      setUploading(false);
      toast.error('Failed to upload image');
      console.error(e);
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

  const handleSave = async () => {
    if (!form.name || !form.sku) {
      toast.error("Product name and SKU are required");
      return;
    }

    try {
      const batch = writeBatch(db);
      const productRef = id ? doc(db, 'products', id) : doc(collection(db, 'products'));
      
      const productData = {
        ...form,
        image: form.images?.[0] || '', // Ensure singular image field is updated for compatibility
        uid: auth.currentUser?.uid,
        updatedAt: serverTimestamp(),
        createdAt: id ? form.createdAt : serverTimestamp()
      };

      if (id) {
        batch.update(productRef, productData);
      } else {
        batch.set(productRef, productData);
      }

      await batch.commit();
      await logActivity(
        id ? 'Updated Product' : 'Created Product',
        'Inventory',
        `Product ${form.name} ${id ? 'updated' : 'created'}`
      );
      toast.success(`Product ${id ? 'updated' : 'created'} successfully`);
      navigate('/inventory');
    } catch (e) { 
      handleFirestoreError(e, id ? OperationType.UPDATE : OperationType.CREATE, 'products');
    }
  };

  const addVariant = async () => {
    if (!id) {
      toast.error("Please save the product first before adding variants.");
      return;
    }
    try {
      await addDoc(collection(db, 'variants'), {
        ...newVariant,
        productId: id,
        uid: auth.currentUser?.uid,
        createdAt: serverTimestamp()
      });
      setNewVariant({ size: '', color: '', fabric: '', sku: '', barcode: '', price: 0, costPrice: 0 });
      
      // Refresh variants
      const q = query(collection(db, 'variants'), where('productId', '==', id));
      const variantsSnap = await getDocs(q);
      setProductVariants(variantsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      
      toast.success("Variant added successfully");
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'variants');
    }
  };

  const deleteVariant = async (variantId: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Delete Variant',
      message: 'Are you sure you want to delete this variant? This action cannot be undone.',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'variants', variantId));
          setProductVariants(prev => prev.filter(v => v.id !== variantId));
          toast.success("Variant deleted");
        } catch (e) {
          handleFirestoreError(e, OperationType.DELETE, `variants/${variantId}`);
        }
      }
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="animate-spin text-muted" size={32} />
        <p className="text-xs font-bold uppercase tracking-widest text-muted">Loading Product...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between bg-surface p-5 sm:p-6 rounded-[20px] shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-border">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/inventory')}
            className="p-2.5 border border-border rounded-xl text-muted hover:text-primary hover:bg-surface-hover transition-colors"
          >
            <ArrowLeft size={18} strokeWidth={2} />
          </button>
          <div>
            <h2 className="text-xl font-bold text-primary tracking-tight">{id ? 'Edit Product' : 'Add New Product'}</h2>
            <p className="text-sm text-secondary mt-0.5">Fill in the details to {id ? 'update' : 'create'} a product in your catalog.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/inventory')}
            className="px-6 py-2.5 bg-surface border border-border rounded-xl text-[14px] font-medium hover:bg-surface-hover transition-all text-secondary"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="px-6 py-2.5 bg-brand text-white rounded-xl text-[14px] font-medium hover:bg-brand transition-all flex items-center gap-2"
          >
            <Save size={16} strokeWidth={2} />
            {id ? 'Save Changes' : 'Create Product'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-surface p-6 sm:p-8 rounded-[20px] shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-border">
            <div className="flex items-start gap-4 mb-8">
              <div className="p-3 bg-brand/10 text-brand rounded-2xl flex-shrink-0">
                <Info size={24} strokeWidth={2} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-primary">Basic Information</h3>
                <p className="text-sm text-secondary mt-0.5">Add essential details about your product.</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-secondary">Product Name *</label>
                <input 
                  className="w-full p-3.5 bg-surface rounded-xl outline-none border border-border focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all text-[14px] text-primary placeholder:text-muted" 
                  placeholder="e.g. Premium Cotton T-Shirt"
                  value={form.name} 
                  onChange={e => setForm({...form, name: e.target.value})} 
                />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-secondary">SKU *</label>
                  <input 
                    className="w-full p-3.5 bg-surface rounded-xl outline-none border border-border focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all text-[14px] text-primary placeholder:text-muted" 
                    placeholder="e.g. TS-001"
                    value={form.sku} 
                    onChange={e => setForm({...form, sku: e.target.value})} 
                  />
                </div>
                <div className="space-y-2 relative">
                  <label className="text-sm font-medium text-secondary">Product Type</label>
                  <select 
                    className="w-full p-3.5 bg-surface rounded-xl outline-none border border-border focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all text-[14px] text-primary cursor-pointer appearance-none pr-10" 
                    value={form.type} 
                    onChange={e => setForm({...form, type: e.target.value})}
                  >
                    <option value="simple">Simple Product</option>
                    <option value="variable">Variable Product</option>
                    <option value="bundle">Product Bundle</option>
                  </select>
                  <div className="absolute right-4 top-[40px] pointer-events-none text-muted">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2 relative">
                  <label className="text-sm font-medium text-secondary">Category</label>
                  <select 
                    className="w-full p-3.5 bg-surface rounded-xl outline-none border border-border focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all text-[14px] text-primary cursor-pointer appearance-none pr-10" 
                    value={form.categoryId} 
                    onChange={e => setForm({...form, categoryId: e.target.value})}
                  >
                    <option value="">Select Category</option>
                    {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <div className="absolute right-4 top-[40px] pointer-events-none text-muted">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                  </div>
                </div>
                <div className="space-y-2 relative">
                  <label className="text-sm font-medium text-secondary">Brand</label>
                  <select 
                    className="w-full p-3.5 bg-surface rounded-xl outline-none border border-border focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all text-[14px] text-primary cursor-pointer appearance-none pr-10" 
                    value={form.brandId} 
                    onChange={e => setForm({...form, brandId: e.target.value})}
                  >
                    <option value="">Select Brand</option>
                    {brands.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                  <div className="absolute right-4 top-[40px] pointer-events-none text-muted">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-secondary">Size</label>
                  <input 
                    className="w-full p-3.5 bg-surface rounded-xl outline-none border border-border focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all text-[14px] text-primary placeholder:text-muted" 
                    placeholder="e.g. XL, 42, Free Size"
                    value={form.size || ''} 
                    onChange={e => setForm({...form, size: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-secondary">Color</label>
                  <input 
                    className="w-full p-3.5 bg-surface rounded-xl outline-none border border-border focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all text-[14px] text-primary placeholder:text-muted" 
                    placeholder="e.g. Red, Blue, Black"
                    value={form.color || ''} 
                    onChange={e => setForm({...form, color: e.target.value})} 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-secondary">Barcode</label>
                <div className="flex gap-3">
                  <input 
                    className="flex-1 p-3.5 bg-surface rounded-xl outline-none border border-border focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all text-[14px] text-primary placeholder:text-muted" 
                    placeholder="Enter barcode or click generate"
                    value={form.barcode} 
                    onChange={e => setForm({...form, barcode: e.target.value})} 
                  />
                  <button 
                    onClick={() => setForm({...form, barcode: form.sku || Math.random().toString(36).substring(2, 10).toUpperCase()})}
                    className="px-5 py-3.5 bg-surface border border-border text-secondary rounded-xl text-[14px] font-medium hover:bg-surface-hover flex items-center justify-center gap-2 transition-all"
                  >
                    <ScanBarcode size={18} />
                    Generate
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-secondary">Description</label>
                <div className="border border-border rounded-xl overflow-hidden focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/10 transition-all">
                  {/* Toolbar */}
                  <div className="flex items-center gap-1 border-b border-border p-2 bg-surface">
                    <button className="p-1.5 hover:bg-surface-hover rounded text-secondary"><Bold size={16} /></button>
                    <button className="p-1.5 hover:bg-surface-hover rounded text-secondary"><Italic size={16} /></button>
                    <div className="w-px h-4 bg-gray-200 mx-1"></div>
                    <button className="p-1.5 hover:bg-surface-hover rounded text-secondary"><List size={16} /></button>
                    <div className="w-px h-4 bg-gray-200 mx-1"></div>
                    <button className="p-1.5 hover:bg-surface-hover rounded text-secondary"><LinkIcon size={16} /></button>
                  </div>
                  <textarea 
                    className="w-full p-4 outline-none resize-none h-[120px] text-[14px] text-primary placeholder:text-muted" 
                    placeholder="Describe your product..."
                    value={form.description} 
                    onChange={e => setForm({...form, description: e.target.value})} 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Variants Section */}
          {form.type === 'variable' && (
            <div className="bg-surface p-8 rounded-2xl border border-border shadow-subtle space-y-6">
              <h3 className="text-sm font-bold uppercase tracking-widest text-muted border-b pb-2">Variants Management</h3>
              <div className="bg-surface-hover p-6 rounded-2xl space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <input placeholder="Size" className="p-3 rounded-xl text-xs border border-transparent focus:border-brand/20 outline-none" value={newVariant.size} onChange={e => setNewVariant({...newVariant, size: e.target.value})} />
                  <input placeholder="Color" className="p-3 rounded-xl text-xs border border-transparent focus:border-brand/20 outline-none" value={newVariant.color} onChange={e => setNewVariant({...newVariant, color: e.target.value})} />
                  <input placeholder="Fabric" className="p-3 rounded-xl text-xs border border-transparent focus:border-brand/20 outline-none" value={newVariant.fabric} onChange={e => setNewVariant({...newVariant, fabric: e.target.value})} />
                  <input placeholder="SKU" className="p-3 rounded-xl text-xs border border-transparent focus:border-brand/20 outline-none" value={newVariant.sku} onChange={e => setNewVariant({...newVariant, sku: e.target.value})} />
                  <input placeholder="Barcode" className="p-3 rounded-xl text-xs border border-transparent focus:border-brand/20 outline-none" value={newVariant.barcode} onChange={e => setNewVariant({...newVariant, barcode: e.target.value})} />
                  <input type="number" placeholder="Price" className="p-3 rounded-xl text-xs border border-transparent focus:border-brand/20 outline-none" value={newVariant.price || 0} onChange={e => setNewVariant({...newVariant, price: parseFloat(e.target.value) || 0})} />
                  <button 
                    onClick={addVariant} 
                    className="md:col-span-2 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl text-xs font-bold hover:bg-black transition-all"
                  >
                    Add Variant
                  </button>
                </div>
                <div className="space-y-2 pt-4">
                  {productVariants.length === 0 ? (
                    <p className="text-center text-xs text-muted py-4 italic">No variants added yet.</p>
                  ) : (
                    productVariants.map((v: any) => (
                      <div key={v.id} className="flex items-center justify-between bg-surface p-4 rounded-xl border border-border text-xs shadow-subtle">
                        <div className="flex flex-col">
                          <span className="font-bold text-primary">{v.sku}</span>
                          <span className="text-[10px] text-muted">{v.barcode || 'No Barcode'}</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-secondary font-medium">{v.size} / {v.color} / {v.fabric}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-bold text-primary">{currencySymbol}{v.price}</span>
                          <button 
                            onClick={() => deleteVariant(v.id)} 
                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Bundle Section */}
          {form.type === 'bundle' && (
            <div className="bg-surface p-8 rounded-2xl border border-border shadow-subtle space-y-6">
              <h3 className="text-sm font-bold uppercase tracking-widest text-muted border-b pb-2">Bundle Components</h3>
              <div className="bg-purple-50 p-6 rounded-2xl space-y-4 border border-purple-100">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <select 
                    className="p-3 bg-surface border border-border rounded-xl text-xs outline-none focus:border-purple-300"
                    value={newVariant.sku} 
                    onChange={e => setNewVariant({...newVariant, sku: e.target.value})}
                  >
                    <option value="">Select Product</option>
                    {products.filter((p: any) => p.id !== id && p.type !== 'bundle').map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <input 
                    type="number" 
                    placeholder="Qty" 
                    className="p-3 bg-surface border border-border rounded-xl text-xs outline-none focus:border-purple-300"
                    value={newVariant.price || 0}
                    onChange={e => setNewVariant({...newVariant, price: parseFloat(e.target.value) || 0})}
                  />
                  <button 
                    type="button"
                    onClick={() => {
                      if (!newVariant.sku) return;
                      setForm((prev: any) => ({...prev, bundleItems: [...(prev.bundleItems || []), { productId: newVariant.sku, quantity: newVariant.price || 1 }]}));
                      setNewVariant({ size: '', color: '', fabric: '', sku: '', barcode: '', price: 0, costPrice: 0 });
                    }}
                    className="bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 transition-all"
                  >
                    Add to Bundle
                  </button>
                </div>
                <div className="space-y-2 pt-4">
                  {(form.bundleItems || []).length === 0 ? (
                    <p className="text-center text-xs text-purple-400 py-4 italic">No items in bundle.</p>
                  ) : (
                    (form.bundleItems || []).map((item: any, idx: number) => {
                      const p = products.find((prod: any) => prod.id === item.productId);
                      return (
                        <div key={idx} className="flex justify-between items-center bg-surface p-4 rounded-xl border border-purple-100 text-xs shadow-subtle">
                          <span className="font-bold text-secondary">{p?.name}</span>
                          <div className="flex items-center gap-4">
                            <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-lg font-bold">x {item.quantity}</span>
                            <button 
                              onClick={() => setForm((prev: any) => ({...prev, bundleItems: prev.bundleItems.filter((_: any, i: number) => i !== idx)}))} 
                              className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Pricing & Media */}
        <div className="space-y-6">
          <div className="bg-surface p-6 sm:p-8 rounded-[20px] shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-border">
            <div className="flex items-start gap-4 mb-8">
              <div className="p-3 bg-emerald-50 text-emerald-500 rounded-2xl flex-shrink-0">
                <DollarSign size={24} strokeWidth={2} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-primary">Pricing & Stock</h3>
                <p className="text-sm text-secondary mt-0.5">Set price and stock details.</p>
              </div>
            </div>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-secondary">Retail Price (৳)</label>
                  <input 
                    type="number" 
                    className="w-full p-3.5 bg-surface rounded-xl outline-none border border-border focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all text-[14px] text-primary placeholder:text-muted" 
                    value={form.price || ''} 
                    placeholder="0"
                    onChange={e => setForm({...form, price: parseFloat(e.target.value) || 0})} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-secondary">Cost Price (৳)</label>
                  <input 
                    type="number" 
                    className="w-full p-3.5 bg-surface rounded-xl outline-none border border-border focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all text-[14px] text-primary placeholder:text-muted" 
                    value={form.costPrice || ''} 
                    placeholder="0"
                    onChange={e => setForm({...form, costPrice: parseFloat(e.target.value) || 0})} 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-secondary">Min Stock Alert</label>
                <input 
                  type="number" 
                  className="w-full p-3.5 bg-surface rounded-xl outline-none border border-border focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all text-[14px] text-primary placeholder:text-muted" 
                  value={form.minStock || ''} 
                  placeholder="10"
                  onChange={e => setForm({...form, minStock: parseInt(e.target.value) || 0})} 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-secondary">Current Stock</label>
                <div className="flex gap-3">
                  <input 
                    type="number" 
                    className="flex-1 p-3.5 bg-surface rounded-xl outline-none border border-border focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all text-[14px] text-primary placeholder:text-muted" 
                    value={form.stock || ''} 
                    placeholder="0"
                    onChange={e => setForm({...form, stock: parseInt(e.target.value) || 0})} 
                  />
                  <div className="px-5 py-3.5 bg-surface-hover border border-border text-secondary rounded-xl text-[14px] font-medium flex items-center justify-center">
                    Units
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-surface p-6 sm:p-8 rounded-[20px] shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-border">
            <div className="flex items-start gap-4 mb-8">
              <div className="p-3 bg-purple-50 text-purple-500 rounded-2xl flex-shrink-0">
                <ImageIcon size={24} strokeWidth={2} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-primary">Media</h3>
                <p className="text-sm text-secondary mt-0.5">Upload product images and manage URLs.</p>
              </div>
            </div>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-secondary">Product Image</label>
                <div className="grid grid-cols-1 gap-3">
                  <label className="w-full py-8 bg-transparent rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:bg-surface-hover hover:border-border transition-all group">
                    {uploading ? (
                      <Loader2 size={32} className="animate-spin text-muted" />
                    ) : (
                      <>
                        <UploadCloud size={32} className="text-secondary group-hover:text-brand transition-colors mb-3" strokeWidth={1.5} />
                        <span className="text-[14px] text-secondary">Drag & drop image here</span>
                        <span className="text-[14px] text-secondary mt-1">or <span className="text-brand">click to browse</span></span>
                        <span className="text-xs text-muted mt-3">PNG, JPG up to 5MB</span>
                      </>
                    )}
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                  </label>
                  
                  {form.images?.length > 0 && (
                    <div className="grid grid-cols-3 gap-3 mt-4">
                      {form.images.map((url: string, i: number) => (
                        <div key={i} className="relative group aspect-square rounded-2xl overflow-hidden border border-border shadow-subtle">
                          <img src={url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          <button 
                            onClick={() => setForm((prev: any) => ({...prev, images: prev.images.filter((_: any, idx: number) => idx !== i)}))}
                            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-secondary">Image URLs</label>
                <textarea 
                  className="w-full p-4 bg-surface rounded-xl outline-none border border-border focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all text-[14px] h-[100px] resize-none text-primary placeholder:text-muted" 
                  value={form.images?.join('\n')} 
                  onChange={e => setForm({...form, images: e.target.value.split('\n').filter(url => url.trim())})} 
                  placeholder="Paste image URLs here (one per line)"
                />
              </div>
            </div>
          </div>

          <div className="bg-surface p-6 sm:p-8 rounded-[20px] shadow-[0_2px_12px_rgba(0,0,0,0.02)] border border-border">
            <div className="flex items-start justify-between mb-8">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-orange-50 text-orange-500 rounded-2xl flex-shrink-0">
                  <ScanBarcode size={24} strokeWidth={2} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-primary">Barcode Preview</h3>
                  <p className="text-sm text-secondary mt-0.5">Preview your product barcode.</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={downloadBarcode}
                  className="p-2 bg-surface border border-border text-secondary rounded-lg hover:text-primary hover:bg-surface-hover transition-all shadow-subtle"
                  title="Download Barcode"
                >
                  <Download size={16} />
                </button>
                <button 
                  onClick={() => handlePrintBarcode()}
                  className="p-2 bg-surface border border-border text-secondary rounded-lg hover:text-primary hover:bg-surface-hover transition-all shadow-subtle"
                  title="Print Barcode"
                >
                  <Printer size={16} />
                </button>
              </div>
            </div>
            <div className="bg-surface border border-border p-6 rounded-[16px] flex items-center justify-center">
              <div ref={barcodeRef} className="flex flex-col items-center gap-2">
                <p className="text-[12px] font-bold text-center max-w-[200px] truncate text-primary">{form.name || 'Product Name'}</p>
                <Barcode 
                  value={form.barcode || form.sku || 'NO-BARCODE'} 
                  width={1.5}
                  height={50}
                  fontSize={12}
                  margin={0}
                  displayValue={true}
                  background="transparent"
                />
                <p className="text-[14px] font-bold text-primary mt-1">৳{(form.price || 0).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

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
