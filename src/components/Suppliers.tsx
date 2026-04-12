import React, { useState, useEffect } from 'react';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Phone, 
  Mail, 
  MapPin, 
  Clock,
  ArrowRight,
  ChevronRight,
  Package,
  DollarSign,
  Calendar,
  Trash2,
  Edit2,
  ExternalLink
} from 'lucide-react';
import { db, auth, collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from '../firebase';
import { Supplier, PurchaseOrder } from '../types';
import { toast } from 'sonner';
import ConfirmModal from './ConfirmModal';

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPOModalOpen, setIsPOModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [activeTab, setActiveTab] = useState<'suppliers' | 'pos'>('suppliers');
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

  const [supplierForm, setSupplierForm] = useState({
    name: '',
    contactName: '',
    phone: '',
    email: '',
    address: '',
    leadTimeDays: 7
  });

  useEffect(() => {
    if (!auth.currentUser) return;
    const unsubscribeSuppliers = onSnapshot(
      query(collection(db, 'suppliers'), orderBy('name')),
      (snapshot) => {
        setSuppliers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Supplier)));
        setLoading(false);
      },
      (error) => {
        if (error.code !== 'permission-denied') {
          handleFirestoreError(error, OperationType.LIST, 'suppliers');
        }
        setLoading(false);
      }
    );

    const unsubscribePOs = onSnapshot(
      query(collection(db, 'purchaseOrders'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        setPurchaseOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PurchaseOrder)));
      },
      (error) => {
        if (error.code !== 'permission-denied') {
          handleFirestoreError(error, OperationType.LIST, 'purchaseOrders');
        }
      }
    );

    return () => {
      unsubscribeSuppliers();
      unsubscribePOs();
    };
  }, []);

  const handleSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSupplier) {
        await updateDoc(doc(db, 'suppliers', editingSupplier.id), supplierForm);
        toast.success('Supplier updated successfully');
      } else {
        await addDoc(collection(db, 'suppliers'), {
          ...supplierForm,
          createdAt: serverTimestamp()
        });
        toast.success('Supplier added successfully');
      }
      setIsModalOpen(false);
      setEditingSupplier(null);
      setSupplierForm({ name: '', contactName: '', phone: '', email: '', address: '', leadTimeDays: 7 });
    } catch (error) {
      console.error('Error saving supplier:', error);
      toast.error('Failed to save supplier');
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Delete Supplier',
      message: 'Are you sure you want to delete this supplier? This action cannot be undone.',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'suppliers', id));
          toast.success('Supplier deleted');
        } catch (error) {
          toast.error('Failed to delete supplier');
        }
      }
    });
  };

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.phone.includes(searchTerm)
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Supplier Management</h1>
          <p className="text-sm text-gray-500">Manage your supply chain and purchase orders</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              setEditingSupplier(null);
              setSupplierForm({ name: '', contactName: '', phone: '', email: '', address: '', leadTimeDays: 7 });
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-6 py-3 bg-[#00AEEF] text-white rounded-xl font-bold hover:bg-[#0095cc] transition-all shadow-lg shadow-blue-100"
          >
            <Plus size={20} />
            Add Supplier
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('suppliers')}
          className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'suppliers' ? 'bg-white text-[#00AEEF] shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Suppliers
        </button>
        <button
          onClick={() => setActiveTab('pos')}
          className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
            activeTab === 'pos' ? 'bg-white text-[#00AEEF] shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Purchase Orders
        </button>
      </div>

      {activeTab === 'suppliers' ? (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type="text"
                placeholder="Search suppliers by name or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00AEEF]/20 transition-all"
              />
            </div>
            <button className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 transition-all">
              <Filter size={20} />
              Filters
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSuppliers.map((supplier) => (
              <div key={supplier.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-[#00AEEF] font-bold text-xl">
                    {supplier.name[0]}
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        setEditingSupplier(supplier);
                        setSupplierForm({
                          name: supplier.name,
                          contactName: supplier.contactName || '',
                          phone: supplier.phone,
                          email: supplier.email || '',
                          address: supplier.address || '',
                          leadTimeDays: supplier.leadTimeDays || 7
                        });
                        setIsModalOpen(true);
                      }}
                      className="p-2 text-gray-400 hover:text-[#00AEEF] hover:bg-blue-50 rounded-lg transition-all"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => handleDeleteSupplier(supplier.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold text-gray-900 group-hover:text-[#00AEEF] transition-colors">{supplier.name}</h3>
                    <p className="text-xs text-gray-500">{supplier.contactName || 'No contact person'}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <Phone size={14} className="text-gray-400" />
                      {supplier.phone}
                    </div>
                    {supplier.email && (
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <Mail size={14} className="text-gray-400" />
                        {supplier.email}
                      </div>
                    )}
                    {supplier.address && (
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <MapPin size={14} className="text-gray-400" />
                        <span className="truncate">{supplier.address}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                      <Clock size={14} />
                      {supplier.leadTimeDays} Days Lead
                    </div>
                    <button className="text-[#00AEEF] text-xs font-bold hover:underline flex items-center gap-1">
                      View POs <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">PO ID</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Supplier</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Amount</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Created At</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {purchaseOrders.map((po) => (
                <tr key={po.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-gray-900">#PO-{po.id.slice(0, 6).toUpperCase()}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">{po.supplierName}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-gray-900">৳{(po.totalAmount || 0).toLocaleString()}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      po.status === 'received' ? 'bg-green-50 text-green-600' :
                      po.status === 'ordered' ? 'bg-blue-50 text-blue-600' :
                      po.status === 'cancelled' ? 'bg-red-50 text-red-600' :
                      'bg-gray-50 text-gray-600'
                    }`}>
                      {po.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-500">
                      {po.createdAt?.toDate ? po.createdAt.toDate().toLocaleDateString() : (po.createdAt?.seconds ? new Date(po.createdAt.seconds * 1000).toLocaleDateString() : 'N/A')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button className="p-2 text-gray-400 hover:text-[#00AEEF] hover:bg-blue-50 rounded-lg transition-all">
                      <ExternalLink size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {purchaseOrders.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-300">
                        <Package size={24} />
                      </div>
                      <p className="text-sm text-gray-500">No purchase orders found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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

      {/* Supplier Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}</h2>
                <p className="text-xs text-gray-500">Enter supplier information below</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <Plus size={24} className="rotate-45 text-gray-400" />
              </button>
            </div>
            
            <form onSubmit={handleSupplierSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Company Name</label>
                  <input 
                    required
                    type="text"
                    value={supplierForm.name}
                    onChange={e => setSupplierForm({...supplierForm, name: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:border-[#00AEEF]/20 outline-none transition-all"
                    placeholder="e.g. Global Sourcing Ltd"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Contact Person</label>
                    <input 
                      type="text"
                      value={supplierForm.contactName}
                      onChange={e => setSupplierForm({...supplierForm, contactName: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:border-[#00AEEF]/20 outline-none transition-all"
                      placeholder="e.g. John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Phone Number</label>
                    <input 
                      required
                      type="tel"
                      value={supplierForm.phone}
                      onChange={e => setSupplierForm({...supplierForm, phone: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:border-[#00AEEF]/20 outline-none transition-all"
                      placeholder="e.g. 017XXXXXXXX"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Email Address</label>
                  <input 
                    type="email"
                    value={supplierForm.email}
                    onChange={e => setSupplierForm({...supplierForm, email: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:border-[#00AEEF]/20 outline-none transition-all"
                    placeholder="supplier@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Address</label>
                  <textarea 
                    value={supplierForm.address}
                    onChange={e => setSupplierForm({...supplierForm, address: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:border-[#00AEEF]/20 outline-none transition-all resize-none h-24"
                    placeholder="Full business address"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Lead Time (Days)</label>
                  <input 
                    type="number"
                    value={supplierForm.leadTimeDays}
                    onChange={e => setSupplierForm({...supplierForm, leadTimeDays: parseInt(e.target.value)})}
                    className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:border-[#00AEEF]/20 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-4 px-6 bg-gray-50 text-gray-500 rounded-2xl font-bold hover:bg-gray-100 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-4 px-6 bg-[#00AEEF] text-white rounded-2xl font-bold hover:bg-[#0095cc] transition-all shadow-lg shadow-blue-100"
                >
                  {editingSupplier ? 'Save Changes' : 'Add Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
