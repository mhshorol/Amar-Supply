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
  Image as ImageIcon
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
import { useReactToPrint } from 'react-to-print';
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

  const handlePrintBarcode = useReactToPrint({
    contentRef: barcodeRef,
    suppressErrors: true,
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

    if (!storage) {
      toast.error('Firebase Storage is not configured. Please check your setup.');
      return;
    }

    setUploading(true);
    try {
      const storageRef = ref(storage, `products/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setForm((prev: any) => ({ 
        ...prev, 
        images: [...(prev.images || []), url],
        // Also set the primary image if it's the first one
        image: prev.image || url
      }));
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
        <Loader2 className="animate-spin text-gray-400" size={32} />
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Loading Product...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/inventory')}
            className="p-2 hover:bg-gray-100 rounded-xl transition-all text-gray-400 hover:text-[#141414]"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-xl font-bold text-[#141414]">{id ? 'Edit Product' : 'Add New Product'}</h2>
            <p className="text-xs text-gray-500">Fill in the details to {id ? 'update' : 'create'} a product in your catalog.</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => navigate('/inventory')}
            className="px-6 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="px-6 py-2.5 bg-[#141414] text-white rounded-xl text-sm font-bold hover:bg-black transition-all shadow-lg flex items-center gap-2"
          >
            <Save size={18} />
            {id ? 'Save Changes' : 'Create Product'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 border-b pb-2">Basic Information</h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Product Name *</label>
                <input 
                  className="w-full p-4 bg-gray-50 rounded-xl outline-none border border-transparent focus:border-[#00AEEF]/20 focus:bg-white transition-all text-sm" 
                  placeholder="e.g. Premium Cotton T-Shirt"
                  value={form.name} 
                  onChange={e => setForm({...form, name: e.target.value})} 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">SKU *</label>
                  <input 
                    className="w-full p-4 bg-gray-50 rounded-xl outline-none border border-transparent focus:border-[#00AEEF]/20 focus:bg-white transition-all text-sm font-mono" 
                    placeholder="TS-001"
                    value={form.sku} 
                    onChange={e => setForm({...form, sku: e.target.value})} 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Product Type</label>
                  <select 
                    className="w-full p-4 bg-gray-50 rounded-xl outline-none border border-transparent focus:border-[#00AEEF]/20 focus:bg-white transition-all text-sm" 
                    value={form.type} 
                    onChange={e => setForm({...form, type: e.target.value})}
                  >
                    <option value="simple">Simple Product</option>
                    <option value="variable">Variable Product</option>
                    <option value="bundle">Product Bundle</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Category</label>
                  <select 
                    className="w-full p-4 bg-gray-50 rounded-xl outline-none border border-transparent focus:border-[#00AEEF]/20 focus:bg-white transition-all text-sm" 
                    value={form.categoryId} 
                    onChange={e => setForm({...form, categoryId: e.target.value})}
                  >
                    <option value="">Select Category</option>
                    {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Brand</label>
                  <select 
                    className="w-full p-4 bg-gray-50 rounded-xl outline-none border border-transparent focus:border-[#00AEEF]/20 focus:bg-white transition-all text-sm" 
                    value={form.brandId} 
                    onChange={e => setForm({...form, brandId: e.target.value})}
                  >
                    <option value="">Select Brand</option>
                    {brands.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Description</label>
                <textarea 
                  className="w-full p-4 bg-gray-50 rounded-xl outline-none border border-transparent focus:border-[#00AEEF]/20 focus:bg-white transition-all text-sm h-32 resize-none" 
                  placeholder="Describe your product..."
                  value={form.description} 
                  onChange={e => setForm({...form, description: e.target.value})} 
                />
              </div>
            </div>
          </div>

          {/* Variants Section */}
          {form.type === 'variable' && (
            <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6">
              <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 border-b pb-2">Variants Management</h3>
              <div className="bg-gray-50 p-6 rounded-2xl space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <input placeholder="Size" className="p-3 rounded-xl text-xs border border-transparent focus:border-[#00AEEF]/20 outline-none" value={newVariant.size} onChange={e => setNewVariant({...newVariant, size: e.target.value})} />
                  <input placeholder="Color" className="p-3 rounded-xl text-xs border border-transparent focus:border-[#00AEEF]/20 outline-none" value={newVariant.color} onChange={e => setNewVariant({...newVariant, color: e.target.value})} />
                  <input placeholder="Fabric" className="p-3 rounded-xl text-xs border border-transparent focus:border-[#00AEEF]/20 outline-none" value={newVariant.fabric} onChange={e => setNewVariant({...newVariant, fabric: e.target.value})} />
                  <input placeholder="SKU" className="p-3 rounded-xl text-xs border border-transparent focus:border-[#00AEEF]/20 outline-none" value={newVariant.sku} onChange={e => setNewVariant({...newVariant, sku: e.target.value})} />
                  <input placeholder="Barcode" className="p-3 rounded-xl text-xs border border-transparent focus:border-[#00AEEF]/20 outline-none" value={newVariant.barcode} onChange={e => setNewVariant({...newVariant, barcode: e.target.value})} />
                  <input type="number" placeholder="Price" className="p-3 rounded-xl text-xs border border-transparent focus:border-[#00AEEF]/20 outline-none" value={newVariant.price || 0} onChange={e => setNewVariant({...newVariant, price: parseFloat(e.target.value) || 0})} />
                  <button 
                    onClick={addVariant} 
                    className="md:col-span-2 bg-[#141414] text-white rounded-xl text-xs font-bold hover:bg-black transition-all"
                  >
                    Add Variant
                  </button>
                </div>
                <div className="space-y-2 pt-4">
                  {productVariants.length === 0 ? (
                    <p className="text-center text-xs text-gray-400 py-4 italic">No variants added yet.</p>
                  ) : (
                    productVariants.map((v: any) => (
                      <div key={v.id} className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-100 text-xs shadow-sm">
                        <div className="flex flex-col">
                          <span className="font-bold text-[#141414]">{v.sku}</span>
                          <span className="text-[10px] text-gray-400">{v.barcode || 'No Barcode'}</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-gray-500 font-medium">{v.size} / {v.color} / {v.fabric}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-bold text-[#141414]">{currencySymbol}{v.price}</span>
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
            <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6">
              <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 border-b pb-2">Bundle Components</h3>
              <div className="bg-purple-50 p-6 rounded-2xl space-y-4 border border-purple-100">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <select 
                    className="p-3 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:border-purple-300"
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
                    className="p-3 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:border-purple-300"
                    value={newVariant.price || 0}
                    onChange={e => setNewVariant({...newVariant, price: parseFloat(e.target.value) || 0})}
                  />
                  <button 
                    type="button"
                    onClick={() => {
                      if (!newVariant.sku) return;
                      setForm((prev: any) => ({...prev, bundleItems: [...(prev.bundleItems || []), { productId: newVariant.sku, quantity: newVariant.price || 1 }]}));
                      setNewVariant({ size: '', color: '', fabric: '', sku: '', price: 0, costPrice: 0 });
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
                        <div key={idx} className="flex justify-between items-center bg-white p-4 rounded-xl border border-purple-100 text-xs shadow-sm">
                          <span className="font-bold text-gray-700">{p?.name}</span>
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
          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 border-b pb-2">Pricing & Stock</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Retail Price ({currencySymbol})</label>
                  <input 
                    type="number" 
                    className="w-full p-4 bg-gray-50 rounded-xl outline-none border border-transparent focus:border-[#00AEEF]/20 focus:bg-white transition-all text-sm font-bold" 
                    value={form.price || 0} 
                    onChange={e => setForm({...form, price: parseFloat(e.target.value) || 0})} 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Cost Price ({currencySymbol})</label>
                  <input 
                    type="number" 
                    className="w-full p-4 bg-gray-50 rounded-xl outline-none border border-transparent focus:border-[#00AEEF]/20 focus:bg-white transition-all text-sm font-bold text-gray-500" 
                    value={form.costPrice || 0} 
                    onChange={e => setForm({...form, costPrice: parseFloat(e.target.value) || 0})} 
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Min Stock Alert</label>
                <input 
                  type="number" 
                  className="w-full p-4 bg-gray-50 rounded-xl outline-none border border-transparent focus:border-[#00AEEF]/20 focus:bg-white transition-all text-sm" 
                  value={form.minStock || 0} 
                  onChange={e => setForm({...form, minStock: parseInt(e.target.value) || 0})} 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Barcode</label>
                <div className="flex gap-2">
                  <input 
                    className="flex-1 p-4 bg-gray-50 rounded-xl outline-none border border-transparent focus:border-[#00AEEF]/20 focus:bg-white transition-all text-sm font-mono" 
                    value={form.barcode} 
                    onChange={e => setForm({...form, barcode: e.target.value})} 
                  />
                  <button 
                    onClick={() => setForm({...form, barcode: form.sku || Math.random().toString(36).substring(2, 10).toUpperCase()})}
                    className="px-4 bg-gray-100 text-gray-600 rounded-xl text-[10px] font-bold hover:bg-gray-200 transition-colors"
                  >
                    Gen
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 border-b pb-2">Media</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {form.images?.map((url: string, i: number) => (
                  <div key={i} className="relative group aspect-square bg-gray-50 rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                    <img src={url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <button 
                      onClick={() => setForm((prev: any) => ({...prev, images: prev.images.filter((_: any, idx: number) => idx !== i)}))}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                <label className="aspect-square bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 hover:border-[#00AEEF]/30 transition-all group">
                  {uploading ? (
                    <Loader2 size={24} className="animate-spin text-[#00AEEF]" />
                  ) : (
                    <>
                      <Plus size={24} className="text-gray-300 group-hover:text-[#00AEEF] transition-colors" />
                      <span className="text-[10px] font-bold text-gray-400 uppercase mt-2">Add Image</span>
                    </>
                  )}
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                </label>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Image URLs</label>
                <textarea 
                  className="w-full p-4 bg-gray-50 rounded-xl outline-none border border-transparent focus:border-[#00AEEF]/20 focus:bg-white transition-all text-[10px] h-24 resize-none font-mono" 
                  value={form.images?.join('\n')} 
                  onChange={e => setForm({...form, images: e.target.value.split('\n').filter(url => url.trim())})} 
                  placeholder="Paste image URLs here (one per line)"
                />
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400">Barcode Preview</h3>
              <div className="flex gap-2">
                <button 
                  onClick={downloadBarcode}
                  className="p-2 bg-gray-50 text-gray-400 rounded-lg hover:text-[#00AEEF] hover:bg-blue-50 transition-all"
                  title="Download Barcode"
                >
                  <Download size={16} />
                </button>
                <button 
                  onClick={() => handlePrintBarcode()}
                  className="p-2 bg-gray-50 text-gray-400 rounded-lg hover:text-[#00AEEF] hover:bg-blue-50 transition-all"
                  title="Print Barcode"
                >
                  <Printer size={16} />
                </button>
              </div>
            </div>
            <div className="bg-gray-50 p-6 rounded-2xl flex items-center justify-center border border-gray-100">
              <div ref={barcodeRef} className="bg-white p-4 rounded-xl shadow-sm flex flex-col items-center gap-2 border border-gray-100">
                <p className="text-[10px] font-bold text-center max-w-[150px] truncate">{form.name || 'Product Name'}</p>
                <Barcode 
                  value={form.barcode || form.sku || 'NO-BARCODE'} 
                  width={1.2}
                  height={40}
                  fontSize={10}
                  background="#ffffff"
                />
                <p className="text-[10px] font-bold">{currencySymbol}{form.price || 0}</p>
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
