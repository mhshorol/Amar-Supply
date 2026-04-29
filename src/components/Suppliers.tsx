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
  ExternalLink,
  History,
  X as CloseIcon,
  Building2,
  BadgeCheck,
  ShoppingBag,
  ChevronDown
} from 'lucide-react';
import { db, auth, collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy, where, runTransaction } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Supplier, PurchaseOrder, SupplierPayment, Account } from '../types';
import { toast } from 'sonner';
import ConfirmModal from './ConfirmModal';
import { useSettings } from '../contexts/SettingsContext';

export default function Suppliers() {
  const { user } = useAuth();
  const { currencySymbol } = useSettings();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [supplierPayments, setSupplierPayments] = useState<SupplierPayment[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPOModalOpen, setIsPOModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedSupplierForLedger, setSelectedSupplierForLedger] = useState<Supplier | null>(null);
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

  const [paymentForm, setPaymentForm] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    accountId: '',
    voucherNo: '',
    remark: ''
  });

  useEffect(() => {
    if (!user) return;
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

    const unsubscribePayments = onSnapshot(
      query(collection(db, 'supplierPayments'), orderBy('date', 'desc')),
      (snapshot) => {
        setSupplierPayments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SupplierPayment)));
      },
      (error) => {
        if (error.code !== 'permission-denied') {
          handleFirestoreError(error, OperationType.LIST, 'supplierPayments');
        }
      }
    );

    const unsubscribeAccounts = onSnapshot(
      query(collection(db, 'accounts'), orderBy('name')),
      (snapshot) => {
        setAccounts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Account)));
      },
      (error) => {
        if (error.code !== 'permission-denied') {
          handleFirestoreError(error, OperationType.LIST, 'accounts');
        }
      }
    );

    return () => {
      unsubscribeSuppliers();
      unsubscribePOs();
      unsubscribePayments();
      unsubscribeAccounts();
    };
  }, [user]);

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

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierForLedger || !auth.currentUser) return;

    const amount = parseFloat(paymentForm.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (!paymentForm.accountId) {
      toast.error('Please select an account');
      return;
    }

    try {
      await runTransaction(db, async (transaction) => {
        // 1. READ: Get Account Balance first
        const accountRef = doc(db, 'accounts', paymentForm.accountId);
        const accountSnap = await transaction.get(accountRef);
        if (!accountSnap.exists()) throw new Error('Account not found');
        
        const currentBalance = accountSnap.data().balance || 0;

        // 2. WRITE: Create Supplier Payment record
        const paymentRef = doc(collection(db, 'supplierPayments'));
        transaction.set(paymentRef, {
          supplierId: selectedSupplierForLedger.id,
          supplierName: selectedSupplierForLedger.name,
          date: paymentForm.date,
          amount: amount,
          voucherNo: paymentForm.voucherNo,
          remark: paymentForm.remark,
          uid: auth.currentUser?.uid,
          createdAt: serverTimestamp()
        });

        // 3. WRITE: Create Transaction record (Expense)
        const txnRef = doc(collection(db, 'transactions'));
        transaction.set(txnRef, {
          type: 'expense',
          category: 'COGS',
          subCategory: 'Product Cost',
          amount: amount,
          method: accounts.find(a => a.id === paymentForm.accountId)?.name || 'N/A',
          accountId: paymentForm.accountId,
          date: paymentForm.date,
          status: 'Completed',
          notes: `Supplier Payment: ${selectedSupplierForLedger.name} ${paymentForm.voucherNo ? `(Voucher: ${paymentForm.voucherNo})` : ''}`,
          createdAt: serverTimestamp(),
          uid: auth.currentUser?.uid
        });

        // 4. WRITE: Update Account Balance
        transaction.update(accountRef, {
          balance: currentBalance - amount,
          updatedAt: serverTimestamp()
        });
      });

      toast.success('Payment recorded successfully');
      setIsPaymentModalOpen(false);
      setPaymentForm({
        date: new Date().toISOString().split('T')[0],
        amount: '',
        accountId: '',
        voucherNo: '',
        remark: ''
      });
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error('Failed to record payment');
    }
  };

  const getSupplierBalance = (supplierId: string) => {
    const totalReceived = purchaseOrders
      .filter(po => po.supplierId === supplierId && po.status === 'received')
      .reduce((sum, po) => sum + (po.totalAmount || 0), 0);
    
    const totalPaid = supplierPayments
      .filter(p => p.supplierId === supplierId)
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    
    return totalReceived - totalPaid;
  };

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.phone.includes(searchTerm)
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] leading-tight font-bold text-primary tracking-tight">Supplier Management</h1>
          <p className="text-[15px] text-secondary mt-1">Manage your supply chain and purchase orders</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              setEditingSupplier(null);
              setSupplierForm({ name: '', contactName: '', phone: '', email: '', address: '', leadTimeDays: 7 });
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand text-white rounded-[10px] text-[15px] font-medium hover:bg-brand transition-all shadow-[0_4px_12px_rgba(0,82,255,0.2)]"
          >
            <Plus size={18} strokeWidth={2.5} />
            Add Supplier
            <ChevronDown size={18} className="ml-1 opacity-80" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1.5 rounded-xl bg-surface border border-border shadow-subtle w-fit">
        <button
          onClick={() => setActiveTab('suppliers')}
          className={`px-5 py-2 rounded-lg text-[14px] font-medium transition-all ${
            activeTab === 'suppliers' ? 'text-brand bg-brand/10/50' : 'text-secondary hover:text-slate-800'
          }`}
        >
          Suppliers
        </button>
        <button
          onClick={() => setActiveTab('pos')}
          className={`px-5 py-2 rounded-lg text-[14px] font-medium transition-all ${
            activeTab === 'pos' ? 'text-brand bg-brand/10/50' : 'text-secondary hover:text-slate-800'
          }`}
        >
          Purchase Orders
        </button>
      </div>

      {activeTab === 'suppliers' ? (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
              <input 
                type="text"
                placeholder="Search suppliers by name or phone number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-surface border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all text-[15px] placeholder:text-muted shadow-subtle"
              />
            </div>
            <button className="flex items-center gap-2 px-6 py-3 bg-surface border border-border text-secondary rounded-xl text-[15px] font-medium hover:bg-surface-hover transition-all shadow-subtle">
              <Filter size={18} className="text-secondary" />
              Filters
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1 */}
            <div className="bg-surface p-6 rounded-2xl border border-border flex items-center gap-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
              <div className="w-14 h-14 bg-[#EFF6FF] text-brand rounded-[16px] flex items-center justify-center shrink-0">
                <Building2 size={24} strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-[13px] text-secondary mb-1">Total Suppliers</p>
                <div className="text-[28px] font-bold text-primary leading-none">{suppliers.length}</div>
                <p className="text-[13px] text-muted mt-1">Active suppliers</p>
              </div>
            </div>
            {/* Card 2 */}
            <div className="bg-surface p-6 rounded-2xl border border-border flex items-center gap-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-500 rounded-[16px] flex items-center justify-center shrink-0">
                <BadgeCheck size={24} strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-[13px] text-secondary mb-1">Active Suppliers</p>
                <div className="text-[28px] font-bold text-primary leading-none">{suppliers.length}</div>
                <p className="text-[13px] text-muted mt-1">Currently active</p>
              </div>
            </div>
            {/* Card 3 */}
            <div className="bg-surface p-6 rounded-2xl border border-border flex items-center gap-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
              <div className="w-14 h-14 bg-orange-50 text-orange-500 rounded-[16px] flex items-center justify-center shrink-0">
                <Clock size={24} strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-[13px] text-secondary mb-1">Balance Due</p>
                <div className="text-[24px] xl:text-[28px] font-bold text-red-500 leading-none min-w-0">
                  ৳{suppliers.reduce((sum, s) => sum + getSupplierBalance(s.id), 0).toLocaleString()}
                </div>
                <p className="text-[13px] text-muted mt-1">Total outstanding</p>
              </div>
            </div>
            {/* Card 4 */}
            <div className="bg-surface p-6 rounded-2xl border border-border flex items-center gap-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
              <div className="w-14 h-14 bg-purple-50 text-purple-500 rounded-[16px] flex items-center justify-center shrink-0">
                <ShoppingBag size={24} strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-[13px] text-secondary mb-1">Total Orders</p>
                <div className="text-[28px] font-bold text-primary leading-none">{purchaseOrders.length}</div>
                <p className="text-[13px] text-muted mt-1">This month</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
            {filteredSuppliers.map((supplier) => (
              <div key={supplier.id} className="bg-surface p-6 rounded-[20px] border border-border shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col h-full hover:shadow-premium transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-brand/10 rounded-full flex items-center justify-center text-brand font-medium text-xl">
                    {supplier.name[0]?.toUpperCase()}
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
                      className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted hover:text-brand hover:bg-brand/10 transition-colors"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      onClick={() => handleDeleteSupplier(supplier.id)}
                      className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="mb-5">
                  <h3 className="text-[16px] font-bold text-primary leading-tight">{supplier.name}</h3>
                  <p className="text-[14px] text-secondary mt-0.5">{supplier.contactName || 'No contact person'}</p>
                </div>

                <div className="bg-background rounded-xl p-3 flex justify-between items-center mb-5">
                  <span className="text-[11px] font-medium text-secondary uppercase tracking-widest">BALANCE DUE</span>
                  <span className={`text-[15px] font-bold ${getSupplierBalance(supplier.id) > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                    ৳{getSupplierBalance(supplier.id).toLocaleString()}
                  </span>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3 text-[14px] text-secondary">
                    <Phone size={16} className="text-muted" />
                    {supplier.phone || 'N/A'}
                  </div>
                  <div className="flex items-start gap-3 text-[14px] text-secondary">
                    <MapPin size={16} className="text-muted shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{supplier.address || 'N/A'}</span>
                  </div>
                </div>

                <div className="mt-auto pt-4 border-t border-border flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[11px] font-medium text-secondary uppercase tracking-widest">
                    <Clock size={14} className="text-muted" />
                    {supplier.leadTimeDays || 0} DAYS LEAD
                  </div>
                  <button 
                    onClick={() => setSelectedSupplierForLedger(supplier)}
                    className="text-brand text-[13px] font-medium hover:text-brand-hover flex items-center gap-1 transition-colors"
                  >
                    View Ledger <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex items-center justify-between mt-8 text-[14px] text-secondary">
            <div>
              Showing {filteredSuppliers.length > 0 ? 1 : 0} to {filteredSuppliers.length} of {filteredSuppliers.length} suppliers
            </div>
            <div className="flex items-center gap-2">
              <button className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted bg-surface hover:bg-surface-hover transition-colors">
                <ChevronRight className="rotate-180" size={16} />
              </button>
              <button className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center text-white font-medium">
                1
              </button>
              <button className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted bg-surface hover:bg-surface-hover transition-colors">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-surface rounded-2xl border border-border shadow-subtle overflow-hidden">
          <table className="w-full text-left border-collapse min-w-[800px] whitespace-nowrap">
            <thead>
              <tr className="bg-surface-hover/50 border-b border-border">
                <th className="px-6 py-4 text-[10px] font-bold text-muted uppercase tracking-widest">PO ID</th>
                <th className="px-6 py-4 text-[10px] font-bold text-muted uppercase tracking-widest">Supplier</th>
                <th className="px-6 py-4 text-[10px] font-bold text-muted uppercase tracking-widest">Total Amount</th>
                <th className="px-6 py-4 text-[10px] font-bold text-muted uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-muted uppercase tracking-widest">Created At</th>
                <th className="px-6 py-4 text-[10px] font-bold text-muted uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {purchaseOrders.map((po) => (
                <tr key={po.id} className="hover:bg-surface-hover/50 transition-colors group">
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-primary">#PO-{po.id.slice(0, 6).toUpperCase()}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-secondary">{po.supplierName}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-primary">৳{(po.totalAmount || 0).toLocaleString()}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      po.status === 'received' ? 'bg-green-50 text-green-600' :
                      po.status === 'ordered' ? 'bg-brand/10 text-brand' :
                      po.status === 'cancelled' ? 'bg-red-50 text-red-600' :
                      'bg-surface-hover text-secondary'
                    }`}>
                      {po.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-secondary">
                      {po.createdAt?.toDate ? po.createdAt.toDate().toLocaleDateString() : (po.createdAt?.seconds ? new Date(po.createdAt.seconds * 1000).toLocaleDateString() : 'N/A')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button className="p-2 text-muted hover:text-brand hover:bg-brand/10 rounded-lg transition-all">
                      <ExternalLink size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {purchaseOrders.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 bg-surface-hover rounded-full flex items-center justify-center text-muted">
                        <Package size={24} />
                      </div>
                      <p className="text-sm text-secondary">No purchase orders found</p>
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

      {/* Supplier Ledger Modal */}
      {selectedSupplierForLedger && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-surface w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-border flex justify-between items-center bg-surface sticky top-0 z-10">
              <div>
                <h2 className="text-2xl font-bold text-primary">{selectedSupplierForLedger.name}</h2>
                <div className="flex items-center gap-4 mt-1">
                  <p className="text-sm text-secondary">Transaction History & Ledger</p>
                  <button 
                    onClick={() => {
                      setPaymentForm(prev => ({ ...prev, accountId: accounts[0]?.id || '' }));
                      setIsPaymentModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-4 py-1.5 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 transition-all shadow-subtle"
                  >
                    <DollarSign size={14} />
                    Record Payment
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs font-bold text-muted uppercase tracking-widest">Outstanding Balance</p>
                  <p className={`text-xl font-black ${getSupplierBalance(selectedSupplierForLedger.id) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {currencySymbol}{getSupplierBalance(selectedSupplierForLedger.id).toLocaleString()}
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedSupplierForLedger(null)} 
                  className="p-2 hover:bg-surface-hover rounded-xl transition-colors"
                >
                  <Plus size={24} className="rotate-45 text-muted" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              <div className="space-y-8">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-brand/10 rounded-2xl border border-brand/20">
                    <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1">Total Purchases</p>
                    <p className="text-xl font-bold text-brand-hover">
                      {currencySymbol}{purchaseOrders
                        .filter(po => po.supplierId === selectedSupplierForLedger.id && po.status === 'received')
                        .reduce((sum, po) => sum + (po.totalAmount || 0), 0)
                        .toLocaleString()}
                    </p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-2xl border border-green-100">
                    <p className="text-xs font-bold text-green-400 uppercase tracking-widest mb-1">Total Paid</p>
                    <p className="text-xl font-bold text-green-700">
                      {currencySymbol}{supplierPayments
                        .filter(p => p.supplierId === selectedSupplierForLedger.id)
                        .reduce((sum, p) => sum + (p.amount || 0), 0)
                        .toLocaleString()}
                    </p>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100">
                    <p className="text-xs font-bold text-orange-400 uppercase tracking-widest mb-1">Pending Orders</p>
                    <p className="text-xl font-bold text-orange-700">
                      {purchaseOrders
                        .filter(po => po.supplierId === selectedSupplierForLedger.id && po.status === 'ordered')
                        .length}
                    </p>
                  </div>
                </div>

                {/* Ledger Table */}
                <div className="space-y-4">
                  <h3 className="font-bold text-primary flex items-center gap-2">
                    <History size={18} className="text-brand" />
                    Transaction Ledger
                  </h3>
                  <div className="border border-border rounded-2xl overflow-hidden">
                    <table className="w-full text-left border-collapse min-w-[800px] whitespace-nowrap">
                      <thead>
                        <tr className="bg-surface-hover border-b border-border">
                          <th className="px-6 py-4 text-[10px] font-bold text-muted uppercase tracking-widest">Date</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-muted uppercase tracking-widest">Type</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-muted uppercase tracking-widest">Reference</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-muted uppercase tracking-widest text-right">Debit (Purchase)</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-muted uppercase tracking-widest text-right">Credit (Payment)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {[
                          ...purchaseOrders
                            .filter(po => po.supplierId === selectedSupplierForLedger.id && po.status === 'received')
                            .map(po => ({
                              date: po.createdAt?.toDate ? po.createdAt.toDate() : (po.createdAt?.seconds ? new Date(po.createdAt.seconds * 1000) : new Date()),
                              type: 'Purchase',
                              ref: `#PO-${po.id.slice(0, 6).toUpperCase()}`,
                              debit: po.totalAmount,
                              credit: 0
                            })),
                          ...supplierPayments
                            .filter(p => p.supplierId === selectedSupplierForLedger.id)
                            .map(p => ({
                              date: p.createdAt?.toDate ? p.createdAt.toDate() : (p.createdAt?.seconds ? new Date(p.createdAt.seconds * 1000) : new Date(p.date)),
                              type: 'Payment',
                              ref: p.voucherNo || 'N/A',
                              debit: 0,
                              credit: p.amount
                            }))
                        ]
                        .sort((a, b) => b.date.getTime() - a.date.getTime())
                        .map((item, idx) => (
                          <tr key={idx} className="hover:bg-surface-hover/50 transition-colors">
                            <td className="px-6 py-4 text-sm text-secondary">
                              {item.date.toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                                item.type === 'Purchase' ? 'bg-brand/10 text-brand' : 'bg-green-50 text-green-600'
                              }`}>
                                {item.type}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-primary">
                              {item.ref}
                            </td>
                            <td className="px-6 py-4 text-sm font-bold text-primary text-right">
                              {item.debit > 0 ? `${currencySymbol}${item.debit.toLocaleString()}` : '-'}
                            </td>
                            <td className="px-6 py-4 text-sm font-bold text-primary text-right">
                              {item.credit > 0 ? `${currencySymbol}${item.credit.toLocaleString()}` : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-8 bg-surface-hover border-t border-border flex justify-end">
              <button 
                onClick={() => setSelectedSupplierForLedger(null)}
                className="px-8 py-3 bg-surface border border-border text-secondary rounded-xl font-bold hover:bg-surface-hover transition-all"
              >
                Close Ledger
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Supplier Payment Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-surface w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <h3 className="text-lg font-bold text-primary">Record Payment</h3>
              <button onClick={() => setIsPaymentModalOpen(false)} className="p-2 hover:bg-surface-hover rounded-xl transition-colors">
                <Plus size={24} className="rotate-45 text-muted" />
              </button>
            </div>
            <form onSubmit={handlePaymentSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted uppercase tracking-widest">Date</label>
                <input 
                  required
                  type="date"
                  value={paymentForm.date}
                  onChange={e => setPaymentForm({...paymentForm, date: e.target.value})}
                  className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-xl focus:bg-surface focus:border-brand/20 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted uppercase tracking-widest">Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted font-bold">{currencySymbol}</span>
                  <input 
                    required
                    type="number"
                    step="0.01"
                    value={paymentForm.amount}
                    onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})}
                    className="w-full pl-8 pr-4 py-2 bg-surface-hover border border-transparent rounded-xl focus:bg-surface focus:border-brand/20 outline-none transition-all font-bold"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted uppercase tracking-widest">Payment Account</label>
                <select 
                  required
                  value={paymentForm.accountId}
                  onChange={e => setPaymentForm({...paymentForm, accountId: e.target.value})}
                  className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-xl focus:bg-surface focus:border-brand/20 outline-none transition-all"
                >
                  <option value="">Select Account</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name} ({currencySymbol}{acc.balance.toLocaleString()})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted uppercase tracking-widest">Voucher No</label>
                <input 
                  type="text"
                  value={paymentForm.voucherNo}
                  onChange={e => setPaymentForm({...paymentForm, voucherNo: e.target.value})}
                  className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-xl focus:bg-surface focus:border-brand/20 outline-none transition-all"
                  placeholder="e.g. V-123"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted uppercase tracking-widest">Remark</label>
                <input 
                  type="text"
                  value={paymentForm.remark}
                  onChange={e => setPaymentForm({...paymentForm, remark: e.target.value})}
                  className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-xl focus:bg-surface focus:border-brand/20 outline-none transition-all"
                  placeholder="Optional notes"
                />
              </div>
              <button 
                type="submit"
                className="w-full py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-100 mt-4"
              >
                Confirm Payment
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Supplier Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-surface w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="p-8 border-b border-border flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-primary">{editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}</h2>
                <p className="text-xs text-secondary">Enter supplier information below</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-surface-hover rounded-xl transition-colors">
                <Plus size={24} className="rotate-45 text-muted" />
              </button>
            </div>
            
            <form onSubmit={handleSupplierSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted uppercase tracking-widest">Company Name</label>
                  <input 
                    required
                    type="text"
                    value={supplierForm.name}
                    onChange={e => setSupplierForm({...supplierForm, name: e.target.value})}
                    className="w-full px-4 py-3 bg-surface-hover border border-transparent rounded-xl focus:bg-surface focus:border-brand/20 outline-none transition-all"
                    placeholder="e.g. Global Sourcing Ltd"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted uppercase tracking-widest">Contact Person</label>
                    <input 
                      type="text"
                      value={supplierForm.contactName}
                      onChange={e => setSupplierForm({...supplierForm, contactName: e.target.value})}
                      className="w-full px-4 py-3 bg-surface-hover border border-transparent rounded-xl focus:bg-surface focus:border-brand/20 outline-none transition-all"
                      placeholder="e.g. John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted uppercase tracking-widest">Phone Number</label>
                    <input 
                      required
                      type="tel"
                      value={supplierForm.phone}
                      onChange={e => setSupplierForm({...supplierForm, phone: e.target.value})}
                      className="w-full px-4 py-3 bg-surface-hover border border-transparent rounded-xl focus:bg-surface focus:border-brand/20 outline-none transition-all"
                      placeholder="e.g. 017XXXXXXXX"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted uppercase tracking-widest">Email Address</label>
                  <input 
                    type="email"
                    value={supplierForm.email}
                    onChange={e => setSupplierForm({...supplierForm, email: e.target.value})}
                    className="w-full px-4 py-3 bg-surface-hover border border-transparent rounded-xl focus:bg-surface focus:border-brand/20 outline-none transition-all"
                    placeholder="supplier@example.com"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted uppercase tracking-widest">Address</label>
                  <textarea 
                    value={supplierForm.address}
                    onChange={e => setSupplierForm({...supplierForm, address: e.target.value})}
                    className="w-full px-4 py-3 bg-surface-hover border border-transparent rounded-xl focus:bg-surface focus:border-brand/20 outline-none transition-all resize-none h-24"
                    placeholder="Full business address"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted uppercase tracking-widest">Lead Time (Days)</label>
                  <input 
                    type="number"
                    value={supplierForm.leadTimeDays}
                    onChange={e => setSupplierForm({...supplierForm, leadTimeDays: parseInt(e.target.value)})}
                    className="w-full px-4 py-3 bg-surface-hover border border-transparent rounded-xl focus:bg-surface focus:border-brand/20 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-4 px-6 bg-surface-hover text-secondary rounded-2xl font-bold hover:bg-surface-hover transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-4 px-6 bg-brand text-white rounded-2xl font-bold hover:bg-brand-hover transition-all shadow-lg shadow-blue-100"
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
