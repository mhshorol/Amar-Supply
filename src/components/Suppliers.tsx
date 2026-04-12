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
  X as CloseIcon
} from 'lucide-react';
import { db, auth, collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy, where, runTransaction } from '../firebase';
import { Supplier, PurchaseOrder, SupplierPayment, Account } from '../types';
import { toast } from 'sonner';
import ConfirmModal from './ConfirmModal';
import { useSettings } from '../contexts/SettingsContext';

export default function Suppliers() {
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
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Balance Due</div>
                      <div className={`text-sm font-bold ${getSupplierBalance(supplier.id) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {currencySymbol}{getSupplierBalance(supplier.id).toLocaleString()}
                      </div>
                    </div>
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
                    <button 
                      onClick={() => setSelectedSupplierForLedger(supplier)}
                      className="text-[#00AEEF] text-xs font-bold hover:underline flex items-center gap-1"
                    >
                      View Ledger <ChevronRight size={14} />
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

      {/* Supplier Ledger Modal */}
      {selectedSupplierForLedger && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedSupplierForLedger.name}</h2>
                <div className="flex items-center gap-4 mt-1">
                  <p className="text-sm text-gray-500">Transaction History & Ledger</p>
                  <button 
                    onClick={() => {
                      setPaymentForm(prev => ({ ...prev, accountId: accounts[0]?.id || '' }));
                      setIsPaymentModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-4 py-1.5 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 transition-all shadow-sm"
                  >
                    <DollarSign size={14} />
                    Record Payment
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Outstanding Balance</p>
                  <p className={`text-xl font-black ${getSupplierBalance(selectedSupplierForLedger.id) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {currencySymbol}{getSupplierBalance(selectedSupplierForLedger.id).toLocaleString()}
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedSupplierForLedger(null)} 
                  className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <Plus size={24} className="rotate-45 text-gray-400" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              <div className="space-y-8">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                    <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1">Total Purchases</p>
                    <p className="text-xl font-bold text-blue-700">
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
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <History size={18} className="text-[#00AEEF]" />
                    Transaction Ledger
                  </h3>
                  <div className="border border-gray-100 rounded-2xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Type</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Reference</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Debit (Purchase)</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Credit (Payment)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
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
                          <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {item.date.toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                                item.type === 'Purchase' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'
                              }`}>
                                {item.type}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">
                              {item.ref}
                            </td>
                            <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">
                              {item.debit > 0 ? `${currencySymbol}${item.debit.toLocaleString()}` : '-'}
                            </td>
                            <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">
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
            
            <div className="p-8 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button 
                onClick={() => setSelectedSupplierForLedger(null)}
                className="px-8 py-3 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-100 transition-all"
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
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">Record Payment</h3>
              <button onClick={() => setIsPaymentModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <Plus size={24} className="rotate-45 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handlePaymentSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Date</label>
                <input 
                  required
                  type="date"
                  value={paymentForm.date}
                  onChange={e => setPaymentForm({...paymentForm, date: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:border-[#00AEEF]/20 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">{currencySymbol}</span>
                  <input 
                    required
                    type="number"
                    step="0.01"
                    value={paymentForm.amount}
                    onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})}
                    className="w-full pl-8 pr-4 py-2 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:border-[#00AEEF]/20 outline-none transition-all font-bold"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Payment Account</label>
                <select 
                  required
                  value={paymentForm.accountId}
                  onChange={e => setPaymentForm({...paymentForm, accountId: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:border-[#00AEEF]/20 outline-none transition-all"
                >
                  <option value="">Select Account</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name} ({currencySymbol}{acc.balance.toLocaleString()})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Voucher No</label>
                <input 
                  type="text"
                  value={paymentForm.voucherNo}
                  onChange={e => setPaymentForm({...paymentForm, voucherNo: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:border-[#00AEEF]/20 outline-none transition-all"
                  placeholder="e.g. V-123"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Remark</label>
                <input 
                  type="text"
                  value={paymentForm.remark}
                  onChange={e => setPaymentForm({...paymentForm, remark: e.target.value})}
                  className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:border-[#00AEEF]/20 outline-none transition-all"
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
