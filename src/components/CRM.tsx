import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Download, 
  Users, 
  Phone, 
  Mail, 
  MapPin, 
  ShoppingBag, 
  Calendar,
  MoreVertical,
  MessageSquare,
  History,
  Loader2,
  X,
  Trash2,
  Edit
} from 'lucide-react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  deleteDoc,
  doc,
  query, 
  where,
  orderBy, 
  serverTimestamp,
  Timestamp,
  updateDoc
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

import { useSettings } from '../contexts/SettingsContext';
import ConfirmModal from './ConfirmModal';

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  orderCount: number;
  totalSpent: number;
  lastOrderDate: any;
  points?: number;
  createdAt: any;
  uid: string;
  segment?: 'New' | 'Repeat' | 'VIP' | 'At Risk';
  tags?: string[];
  notes?: string;
  followUpDate?: any;
}

export default function CRM() {
  const { user } = useAuth();
  const { currencySymbol } = useSettings();
  const [searchTerm, setSearchTerm] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
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
  const [customerForm, setCustomerForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    segment: 'New' as 'New' | 'Repeat' | 'VIP' | 'At Risk',
    tags: [] as string[],
    notes: '',
    followUpDate: ''
  });

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(collection(db, 'customers'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const customerData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Customer[];
      setCustomers(customerData);
      if (customerData.length > 0 && !selectedCustomer) {
        setSelectedCustomer(customerData[0]);
      }
      setLoading(false);
    }, (error) => {
      if (error.code !== 'permission-denied') {
        handleFirestoreError(error, OperationType.LIST, 'customers');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!selectedCustomer) return;

    setLoadingOrders(true);
    const q = query(
      collection(db, 'orders'),
      where('customerPhone', '==', selectedCustomer.phone),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCustomerOrders(orders);
      setLoadingOrders(false);
    }, (error) => {
      if (error.code !== 'permission-denied') {
        handleFirestoreError(error, OperationType.LIST, 'orders');
      }
      setLoadingOrders(false);
    });

    return () => unsubscribe();
  }, [selectedCustomer]);

  const handleOpenAddModal = () => {
    setEditingCustomer(null);
    setCustomerForm({ 
      name: '', 
      phone: '', 
      email: '', 
      address: '',
      segment: 'New',
      tags: [],
      notes: '',
      followUpDate: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (customer: Customer) => {
    setEditingCustomer(customer);
    setCustomerForm({
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
      segment: customer.segment || 'New',
      tags: customer.tags || [],
      notes: customer.notes || '',
      followUpDate: customer.followUpDate ? new Date(customer.followUpDate.seconds * 1000).toISOString().split('T')[0] : ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    const data = {
      ...customerForm,
      followUpDate: customerForm.followUpDate ? Timestamp.fromDate(new Date(customerForm.followUpDate)) : null,
      updatedAt: serverTimestamp()
    };

    try {
      if (editingCustomer) {
        await updateDoc(doc(db, 'customers', editingCustomer.id), data);
      } else {
        await addDoc(collection(db, 'customers'), {
          ...data,
          orderCount: 0,
          totalSpent: 0,
          lastOrderDate: null,
          createdAt: serverTimestamp(),
          uid: auth.currentUser.uid
        });
      }
      setIsModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, editingCustomer ? OperationType.UPDATE : OperationType.CREATE, 'customers');
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Delete Customer',
      message: 'Are you sure you want to delete this customer? This action cannot be undone.',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'customers', id));
          toast.success('Customer deleted successfully');
          if (selectedCustomer?.id === id) {
            setSelectedCustomer(customers.find(c => c.id !== id) || null);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `customers/${id}`);
        }
      }
    });
  };

  const handleExportCSV = () => {
    if (customers.length === 0) {
      toast.error('No customers to export');
      return;
    }

    const headers = ['ID', 'Name', 'Phone', 'Email', 'Address', 'Order Count', 'Total Spent', 'Last Order Date', 'Created At'];
    const csvRows = [headers.join(',')];

    customers.forEach(customer => {
      const row = [
        customer.id,
        `"${customer.name || ''}"`,
        `"${customer.phone || ''}"`,
        `"${customer.email || ''}"`,
        `"${(customer.address || '').replace(/"/g, '""')}"`,
        customer.orderCount || 0,
        customer.totalSpent || 0,
        customer.lastOrderDate?.toDate ? customer.lastOrderDate.toDate().toLocaleString() : (customer.lastOrderDate?.seconds ? new Date(customer.lastOrderDate.seconds * 1000).toLocaleString() : 'N/A'),
        customer.createdAt?.toDate ? customer.createdAt.toDate().toLocaleString() : (customer.createdAt?.seconds ? new Date(customer.createdAt.seconds * 1000).toLocaleString() : 'N/A')
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `customers_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Customers exported successfully');
  };

  const filteredCustomers = customers.filter(customer => 
    (customer.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (customer.phone || '').includes(searchTerm) ||
    (customer.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (customer.address || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalSpentAll = customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0);
  const avgSpent = customers.length > 0 ? totalSpentAll / customers.length : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-primary tracking-tight">Customer CRM</h2>
          <p className="text-sm text-secondary mt-1">Manage customer relationships, track history, and improve loyalty.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-surface border border-border rounded-xl text-[13px] font-semibold text-secondary hover:bg-surface-hover transition-colors shadow-subtle"
          >
            <Download size={16} />
            Export CRM
          </button>
          <button 
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#0866FF] text-white rounded-xl text-[13px] font-semibold hover:bg-[#0056e0] transition-colors shadow-subtle"
          >
            <Plus size={16} />
            Add Customer
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6">
        <div className="bg-surface p-5 lg:p-6 rounded-2xl border border-border shadow-subtle flex flex-col justify-between">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-brand/10 dark:bg-brand/20 text-[#0866FF] flex items-center justify-center shrink-0">
              <Users size={24} />
            </div>
            <div>
              <p className="text-[12px] font-semibold text-secondary mb-1">Total Customers</p>
              <p className="text-2xl font-bold text-primary">{customers.length}</p>
            </div>
          </div>
          <div className="flex items-center justify-between mt-4">
            <p className="text-[11px] text-muted">All time customers</p>
            <div className="flex items-center gap-1 text-[11px] font-bold text-green-500">
               <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m19 12-7-7-7 7"/><path d="M12 19V5"/></svg>
               12%
            </div>
          </div>
        </div>
        <div className="bg-surface p-5 lg:p-6 rounded-2xl border border-border shadow-subtle flex flex-col justify-between">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-500/20 text-[#9333EA] flex items-center justify-center shrink-0">
              <History size={24} />
            </div>
            <div>
              <p className="text-[12px] font-semibold text-secondary mb-1">Repeat Customers</p>
              <p className="text-2xl font-bold text-primary">
                {customers.length > 0 ? Math.round((customers.filter(c => c.orderCount > 1).length / customers.length) * 100) : 0}%
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between mt-4">
            <p className="text-[11px] text-muted">Percentage of repeat</p>
            <div className="flex items-center gap-1 text-[11px] font-bold text-[#9333EA]">
               <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m19 12-7-7-7 7"/><path d="M12 19V5"/></svg>
               8%
            </div>
          </div>
        </div>
        <div className="bg-surface p-5 lg:p-6 rounded-2xl border border-border shadow-subtle flex flex-col justify-between">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-green-50 dark:bg-green-500/20 text-[#059669] flex items-center justify-center shrink-0">
              <ShoppingBag size={24} />
            </div>
            <div>
              <p className="text-[12px] font-semibold text-secondary mb-1">Avg. Customer Value</p>
              <p className="text-2xl font-bold text-primary">{currencySymbol} {(Math.round(avgSpent) || 0).toLocaleString()}</p>
            </div>
          </div>
          <div className="flex items-center justify-between mt-4">
            <p className="text-[11px] text-muted">Average order value</p>
            <div className="flex items-center gap-1 text-[11px] font-bold text-green-500">
               <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m19 12-7-7-7 7"/><path d="M12 19V5"/></svg>
               15%
            </div>
          </div>
        </div>
        <div className="bg-surface p-5 lg:p-6 rounded-2xl border border-border shadow-subtle flex flex-col justify-between">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-500/20 text-[#EA580C] flex items-center justify-center shrink-0">
              <MessageSquare size={24} />
            </div>
            <div>
              <p className="text-[12px] font-semibold text-secondary mb-1">Active Chats</p>
              <p className="text-2xl font-bold text-primary">0</p>
            </div>
          </div>
          <div className="flex items-center justify-between mt-4">
            <p className="text-[11px] text-muted">Open conversations</p>
            <div className="flex items-center gap-1 text-[11px] font-bold text-orange-500">
               <div className="w-2 h-0.5 bg-orange-500 rounded-full"></div>
               0%
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:h-[calc(100vh-320px)] min-h-[600px]">
        {/* Left Column: Customer List */}
        <div className="lg:col-span-5 xl:col-span-4 bg-surface rounded-2xl border border-border shadow-subtle flex flex-col overflow-hidden max-h-[800px]">
          <div className="p-4 border-b border-border space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-[17px] font-bold text-primary">All Customers</h3>
              <div className="flex items-center gap-2 flex-1 justify-end">
                <button className="w-8 h-8 flex items-center justify-center hover:bg-surface-hover border border-border rounded-full text-secondary shrink-0 shadow-subtle transition-colors">
                  <History size={14} className="scale-x-[-1]" />
                </button>
                <div className="relative w-full max-w-[160px]">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" size={14} />
                  <input
                    type="text"
                    placeholder="Search customers..."
                    className="w-full pl-8 pr-3 py-1.5 bg-background border border-border rounded-full text-[12px] focus:bg-surface focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-[11px] font-medium text-secondary">
              <button className="flex items-center gap-1.5 px-3 py-1 bg-brand/10 dark:bg-brand/20 text-[#0866FF] rounded-full font-bold">
                <div className="w-1.5 h-1.5 rounded-full bg-[#0866FF]" />
                All ({customers.length})
              </button>
              <button className="flex items-center gap-1.5 hover:text-primary transition-colors">
                <div className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                New ({customers.filter(c => c.orderCount <= 1).length})
              </button>
              <button className="flex items-center gap-1.5 hover:text-primary transition-colors">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                Regular ({customers.filter(c => c.orderCount > 1).length})
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto w-full">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 py-12">
                <Loader2 className="animate-spin text-muted" size={24} />
                <span className="text-xs text-muted">Loading...</span>
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="text-center py-12 text-muted text-xs">No customers found</div>
            ) : (
              <div className="divide-y divide-border/50">
                {filteredCustomers.map((customer) => {
                  const isActive = selectedCustomer?.id === customer.id;
                  const getInitials = (name: string) => {
                    if (!name) return 'U';
                    const parts = name.trim().split(' ');
                    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
                    return name.substring(0, 2).toUpperCase();
                  };
                  return (
                    <button
                      key={customer.id}
                      onClick={() => setSelectedCustomer(customer)}
                      className={`w-full flex items-center gap-3 px-4 py-3.5 transition-all text-left relative ${
                        isActive ? 'bg-background' : 'hover:bg-surface-hover'
                      }`}
                    >
                      {isActive && (
                        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#0866FF]" />
                      )}
                      <div className="relative shrink-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-bold shadow-subtle ${
                          isActive 
                            ? 'bg-brand/10 dark:bg-brand/20 text-[#0866FF]' 
                            : 'bg-surface-hover text-primary border border-border/50'
                        }`}>
                          {getInitials(customer.name)}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <span className="text-[13px] font-bold text-primary truncate">{customer.name || 'Unnamed Customer'}</span>
                          <div className="flex items-center gap-1.5 shrink-0 text-muted">
                             <span className="text-[10px] whitespace-nowrap">
                               {customer.createdAt?.toDate ? customer.createdAt.toDate().toLocaleDateString('en-GB') : 'N/A'}
                             </span>
                             <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                          </div>
                        </div>
                        <span className="text-[11px] text-secondary truncate block">{customer.email || 'No email provided'}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          
          {/* Pagination */}
          <div className="p-3.5 border-t border-border flex items-center justify-between text-[11px] font-medium text-secondary">
             <span>Showing 1 to {Math.min(10, filteredCustomers.length)} of {filteredCustomers.length}</span>
             <div className="flex items-center gap-1.5">
               <button className="w-6 h-6 flex items-center justify-center rounded hover:bg-surface-hover text-muted hover:text-secondary transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
               </button>
               <button className="w-6 h-6 flex items-center justify-center rounded border border-[#0866FF] bg-brand/10 dark:bg-brand/20 text-[#0866FF] font-bold">1</button>
               <button className="w-6 h-6 flex items-center justify-center rounded hover:bg-surface-hover">2</button>
               <button className="w-6 h-6 flex items-center justify-center rounded hover:bg-surface-hover">3</button>
               <span>...</span>
               <button className="w-6 h-6 flex items-center justify-center rounded hover:bg-surface-hover max-sm:hidden">{Math.max(1, Math.ceil(filteredCustomers.length / 10))}</button>
               <button className="w-6 h-6 flex items-center justify-center rounded hover:bg-surface-hover text-muted hover:text-secondary transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
               </button>
             </div>
          </div>
        </div>

        {/* Right Column: Customer Details */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6 overflow-y-auto pr-2 max-h-[800px]">
          {selectedCustomer ? (
            <>
              {/* Profile Header */}
              <div className="bg-surface p-6 rounded-2xl border border-border shadow-subtle flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="w-[72px] h-[72px] rounded-full bg-brand/10 dark:bg-brand/20 flex items-center justify-center border-4 border-white shadow-subtle shrink-0">
                    <Users size={32} className="text-[#0866FF]" />
                  </div>
                  <div className="pt-1">
                    <div className="flex items-center gap-3 mb-1.5">
                      <h3 className="text-[19px] font-bold text-primary">{selectedCustomer.name || 'Unnamed Customer'}</h3>
                      <span className={`px-2.5 py-1 rounded border text-[10px] font-bold uppercase tracking-wider ${
                        selectedCustomer.segment === 'VIP' ? 'bg-purple-50 dark:bg-purple-500/20 text-[#9333EA] border-[#E9D5FF]' :
                        selectedCustomer.segment === 'Repeat' ? 'bg-green-50 dark:bg-green-500/20 text-[#059669] border-[#A7F3D0]' :
                        selectedCustomer.segment === 'At Risk' ? 'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]' :
                        'bg-brand/10 dark:bg-brand/20 text-[#0866FF] border-[#BFDBFE]'
                      }`}>
                        {selectedCustomer.segment || 'New Customer'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-2 text-[13px] text-secondary">
                      <span>{selectedCustomer.email || 'No email provided'}</span>
                      {selectedCustomer.email && (
                         <button className="text-muted hover:text-secondary transition-colors">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                         </button>
                      )}
                    </div>
                    <p className="text-[12px] text-secondary mb-2 leading-relaxed max-w-lg">{selectedCustomer.address || 'No address provided'}</p>
                    <p className="text-[11px] text-muted font-medium">
                      Member Since {selectedCustomer.createdAt?.toDate ? selectedCustomer.createdAt.toDate().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end shrink-0 pt-1">
                  <p className="text-[11px] font-bold text-muted uppercase tracking-widest mb-1.5">Contact</p>
                  <div className="flex items-center gap-2 mb-6">
                    <p className="text-[15px] font-bold text-primary">{selectedCustomer.phone || 'No phone'}</p>
                    {selectedCustomer.phone && (
                      <a 
                        href={`https://wa.me/88${selectedCustomer.phone.replace(/\D/g, '')}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="w-6 h-6 flex items-center justify-center bg-[#25D366] text-white rounded-md hover:bg-[#128C7E] transition-colors shadow-subtle"
                        title="Chat on WhatsApp"
                      >
                         <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleOpenEditModal(selectedCustomer)}
                      className="w-8 h-8 flex items-center justify-center hover:bg-surface-hover border border-border rounded-lg text-secondary shadow-subtle transition-colors"
                      title="Edit Customer"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                    </button>
                    <button 
                      onClick={() => handleDeleteCustomer(selectedCustomer.id)}
                      className="w-8 h-8 flex items-center justify-center hover:bg-red-50 border border-border hover:border-red-200 rounded-lg text-secondary hover:text-red-500 shadow-subtle transition-colors"
                      title="Delete Customer"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                    </button>
                    <div className="px-3 py-1.5 bg-orange-50 dark:bg-orange-500/20 text-[#EA580C] rounded-lg text-[11px] font-bold border border-[#FFEDD5] flex items-center gap-1.5 shadow-subtle">
                       <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                       {selectedCustomer.points || 0} Points
                    </div>
                  </div>
                </div>
              </div>

              {/* Average Order Value Card */}
              <div className="bg-surface p-4 lg:p-6 rounded-2xl border border-border shadow-subtle flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded-lg bg-brand/10 dark:bg-brand/20 text-[#0866FF] flex items-center justify-center">
                      <ShoppingBag size={16} />
                   </div>
                   <span className="text-[13px] font-bold text-primary">Average Order Value</span>
                </div>
                <span className="text-[18px] font-bold text-primary">
                  {currencySymbol} {selectedCustomer.orderCount > 0 ? (Math.round(selectedCustomer.totalSpent / selectedCustomer.orderCount) || 0).toLocaleString() : 0}
                </span>
              </div>

              {/* Bills Table */}
              <div className="bg-surface rounded-2xl border border-border shadow-subtle overflow-hidden">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-lg bg-brand/10 dark:bg-brand/20 text-[#0866FF] flex items-center justify-center">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>
                     </div>
                     <h3 className="text-[14px] font-bold text-primary">Bills</h3>
                  </div>
                  <button className="w-8 h-8 flex items-center justify-center hover:bg-surface-hover border border-border rounded-full text-secondary shadow-subtle transition-colors">
                    <History size={14} className="scale-x-[-1]" />
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[800px] whitespace-nowrap">
                    <thead>
                      <tr className="text-[10px] font-bold text-secondary uppercase tracking-wider border-b border-border">
                        <th className="px-6 py-4">Bill no.</th>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4">Time</th>
                        <th className="px-6 py-4 text-right">Total Sales</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {loadingOrders ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-8 text-center">
                            <Loader2 className="animate-spin text-muted mx-auto" size={20} />
                          </td>
                        </tr>
                      ) : customerOrders.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-12 text-center">
                             <div className="flex justify-center mb-3 text-muted">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-muted opacity-50"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>
                             </div>
                             <p className="text-[12px] font-semibold text-primary">No bills found</p>
                             <p className="text-[11px] text-secondary mt-1">This customer has no bills yet.</p>
                          </td>
                        </tr>
                      ) : (
                        customerOrders.map((order) => (
                          <tr key={order.id} className="hover:bg-surface-hover transition-colors group">
                            <td className="px-6 py-4 text-xs font-bold text-primary">#{order.orderNumber || order.id.slice(0, 4)}</td>
                            <td className="px-6 py-4 text-xs text-secondary">
                              {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString('en-GB') : 'N/A'}
                            </td>
                            <td className="px-6 py-4 text-xs text-secondary">
                              {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                            </td>
                            <td className="px-6 py-4 text-xs font-black text-primary text-right">
                              {currencySymbol} {(order.totalAmount || 0).toLocaleString()}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Items Bought Table */}
              <div className="bg-surface rounded-2xl border border-border shadow-subtle overflow-hidden">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-lg bg-green-50 dark:bg-green-500/20 text-[#059669] flex items-center justify-center">
                        <ShoppingBag size={16} />
                     </div>
                     <h3 className="text-[14px] font-bold text-primary">Items Bought</h3>
                  </div>
                  <button className="w-8 h-8 flex items-center justify-center hover:bg-surface-hover border border-border rounded-full text-secondary shadow-subtle transition-colors">
                    <History size={14} className="scale-x-[-1]" />
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[800px] whitespace-nowrap">
                    <thead>
                      <tr className="text-[10px] font-bold text-secondary uppercase tracking-wider border-b border-border">
                        <th className="px-6 py-4">Category</th>
                        <th className="px-6 py-4">Item Code</th>
                        <th className="px-6 py-4">Quantity</th>
                        <th className="px-6 py-4 text-right">Total Sales</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {loadingOrders ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-8 text-center">
                            <Loader2 className="animate-spin text-muted mx-auto" size={20} />
                          </td>
                        </tr>
                      ) : customerOrders.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-12 text-center">
                             <div className="flex justify-center mb-3 text-muted">
                                <div className="w-16 h-16 rounded-2xl bg-green-50 dark:bg-green-500/20 flex items-center justify-center">
                                   <ShoppingBag size={24} className="text-[#059669]" />
                                </div>
                             </div>
                             <p className="text-[12px] font-semibold text-primary">No items found</p>
                             <p className="text-[11px] text-secondary mt-1">This customer has not purchased any items yet.</p>
                          </td>
                        </tr>
                      ) : (
                        customerOrders.flatMap(order => order.items || []).slice(0, 10).map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-surface-hover transition-colors group">
                            <td className="px-6 py-4">
                              <span className="px-2 py-1 bg-brand/10 text-brand text-[9px] font-bold rounded-lg border border-brand/20 uppercase tracking-wider">
                                {item.category || 'General'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-xs font-medium text-secondary">{item.id?.slice(0, 8) || 'N/A'}</td>
                            <td className="px-6 py-4 text-xs font-bold text-primary">{item.quantity}</td>
                            <td className="px-6 py-4 text-xs font-black text-primary text-right">
                              {currencySymbol} {((item.price || 0) * (item.quantity || 0)).toLocaleString()}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Messages Section */}
              <div className="bg-surface rounded-2xl border border-border shadow-subtle overflow-hidden mb-8">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-500/20 text-[#EA580C] flex items-center justify-center">
                        <MessageSquare size={16} />
                     </div>
                     <h3 className="text-[14px] font-bold text-primary">Messages</h3>
                  </div>
                  <button className="w-8 h-8 flex items-center justify-center hover:bg-surface-hover border border-border rounded-full text-secondary shadow-subtle transition-colors">
                    <MoreVertical size={14} />
                  </button>
                </div>
                <div className="p-12 text-center">
                  <div className="flex flex-col items-center justify-center">
                     <div className="flex justify-center mb-3 text-muted">
                        <div className="w-16 h-16 rounded-2xl bg-background border border-border shadow-subtle flex items-center justify-center relative">
                           <MessageSquare size={24} className="text-muted" />
                           <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-[#0866FF]" />
                        </div>
                     </div>
                     <p className="text-[12px] font-semibold text-primary">No messages yet</p>
                     <p className="text-[11px] text-secondary mt-1">Start a conversation with this customer.</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center bg-surface rounded-2xl border border-border shadow-subtle text-muted gap-4">
              <Users size={64} strokeWidth={1} />
              <p className="text-sm font-medium">Select a customer to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Customer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-bold text-primary">
                {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-surface-hover rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-secondary uppercase tracking-wider">Full Name</label>
                <input
                  required
                  type="text"
                  className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all"
                  placeholder="e.g. Rahim Ahmed"
                  value={customerForm.name}
                  onChange={(e) => setCustomerForm({...customerForm, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-secondary uppercase tracking-wider">Phone</label>
                  <input
                    required
                    type="tel"
                    className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all"
                    placeholder="017..."
                    value={customerForm.phone}
                    onChange={(e) => setCustomerForm({...customerForm, phone: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-secondary uppercase tracking-wider">Email</label>
                  <input
                    required
                    type="email"
                    className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all"
                    placeholder="rahim@example.com"
                    value={customerForm.email}
                    onChange={(e) => setCustomerForm({...customerForm, email: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-secondary uppercase tracking-wider">Segment</label>
                  <select
                    className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all"
                    value={customerForm.segment}
                    onChange={(e) => setCustomerForm({...customerForm, segment: e.target.value as any})}
                  >
                    <option value="New">New</option>
                    <option value="Repeat">Repeat</option>
                    <option value="VIP">VIP</option>
                    <option value="At Risk">At Risk</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-secondary uppercase tracking-wider">Follow-up Date</label>
                  <input
                    type="date"
                    className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all"
                    value={customerForm.followUpDate}
                    onChange={(e) => setCustomerForm({...customerForm, followUpDate: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-secondary uppercase tracking-wider">Tags (comma separated)</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all"
                  placeholder="e.g. wholesale, high-value"
                  value={customerForm.tags.join(', ')}
                  onChange={(e) => setCustomerForm({...customerForm, tags: e.target.value.split(',').map(t => t.trim()).filter(t => t !== '')})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-secondary uppercase tracking-wider">Notes</label>
                <textarea
                  className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all min-h-[60px] resize-none"
                  placeholder="Internal notes about this customer..."
                  value={customerForm.notes}
                  onChange={(e) => setCustomerForm({...customerForm, notes: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-secondary uppercase tracking-wider">Address</label>
                <textarea
                  required
                  className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all min-h-[80px] resize-none"
                  placeholder="Full address..."
                  value={customerForm.address}
                  onChange={(e) => setCustomerForm({...customerForm, address: e.target.value})}
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-surface-hover transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-black rounded-lg text-sm font-medium hover:bg-black dark:hover:bg-gray-200 transition-colors"
                >
                  {editingCustomer ? 'Save Changes' : 'Save Customer'}
                </button>
              </div>
            </form>
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
