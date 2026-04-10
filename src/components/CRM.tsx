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
  }, []);

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
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone.includes(searchTerm) ||
    customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalSpentAll = customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0);
  const avgSpent = customers.length > 0 ? totalSpentAll / customers.length : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-[#141414] tracking-tight">Customer CRM</h2>
          <p className="text-sm text-gray-500 mt-1">Manage customer relationships, track history, and improve loyalty.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <Download size={16} />
            Export CRM
          </button>
          <button 
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-[#141414] text-white rounded-lg text-sm font-medium hover:bg-black transition-colors"
          >
            <Plus size={16} />
            Add Customer
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <Users size={20} />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Total Customers</p>
            <p className="text-xl font-bold">{customers.length}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
            <ShoppingBag size={20} />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Repeat Customers</p>
            <p className="text-xl font-bold">
              {customers.length > 0 ? Math.round((customers.filter(c => c.orderCount > 1).length / customers.length) * 100) : 0}%
            </p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-lg">
            <History size={20} />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Avg. Customer Value</p>
            <p className="text-xl font-bold">{currencySymbol} {Math.round(avgSpent).toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-orange-50 text-orange-600 rounded-lg">
            <MessageSquare size={20} />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Active Chats</p>
            <p className="text-xl font-bold">0</p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:h-[calc(100vh-320px)] min-h-[600px]">
        {/* Left Column: Customer List */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-50 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest">All customers</h3>
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-gray-50 rounded-lg text-gray-400">
                  <History size={18} />
                </button>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search customers"
                    className="pl-9 pr-4 py-2 bg-gray-50 border border-transparent rounded-xl text-xs focus:bg-white focus:border-gray-200 outline-none transition-all w-48"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider text-gray-400">
              <span className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                New Customer
              </span>
              <span className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                Regular
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <Loader2 className="animate-spin text-gray-300" size={24} />
                <span className="text-xs text-gray-400">Loading...</span>
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-xs">No customers found</div>
            ) : (
              filteredCustomers.map((customer) => (
                <button
                  key={customer.id}
                  onClick={() => setSelectedCustomer(customer)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left group relative ${
                    selectedCustomer?.id === customer.id ? 'bg-blue-50/50 border border-blue-100/50' : 'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <div className="relative">
                    <div className={`absolute -left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full ${
                      customer.orderCount > 1 ? 'bg-green-500' : 'bg-blue-500'
                    }`} />
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
                      <Users size={20} className="text-gray-400" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-gray-900 truncate">{customer.name}</span>
                      <span className="text-[9px] text-gray-400 font-medium">
                        {customer.createdAt?.toDate ? customer.createdAt.toDate().toLocaleDateString('en-GB') : 'N/A'}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-500 truncate block">{customer.email}</span>
                  </div>
                  {selectedCustomer?.id === customer.id && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-l-full" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Customer Details */}
        <div className="lg:col-span-8 space-y-6 overflow-y-auto pr-2">
          {selectedCustomer ? (
            <>
              {/* Profile Header */}
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border-2 border-white shadow-md">
                    <Users size={32} className="text-gray-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-gray-900">{selectedCustomer.name}</h3>
                      <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider ${
                        selectedCustomer.segment === 'VIP' ? 'bg-purple-50 text-purple-600 border border-purple-100' :
                        selectedCustomer.segment === 'Repeat' ? 'bg-green-50 text-green-600 border border-green-100' :
                        selectedCustomer.segment === 'At Risk' ? 'bg-red-50 text-red-600 border border-red-100' :
                        'bg-blue-50 text-blue-600 border border-blue-100'
                      }`}>
                        {selectedCustomer.segment || 'New Customer'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 font-medium">{selectedCustomer.email}</p>
                    <p className="text-[11px] text-gray-500 mt-1">{selectedCustomer.address}</p>
                    <p className="text-[10px] text-gray-400 font-medium mt-1">
                      Member Since {selectedCustomer.createdAt?.toDate ? selectedCustomer.createdAt.toDate().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Contact</p>
                  <div className="flex items-center justify-end gap-2">
                    <p className="text-sm font-bold text-gray-900">{selectedCustomer.phone}</p>
                    <a 
                      href={`https://wa.me/88${selectedCustomer.phone.replace(/\D/g, '')}`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="p-1.5 bg-[#25D366] text-white rounded-lg hover:bg-[#128C7E] transition-colors shadow-sm"
                      title="Chat on WhatsApp"
                    >
                      <MessageSquare size={12} />
                    </a>
                  </div>
                  <div className="mt-2 flex items-center gap-2 justify-end">
                    <button 
                      onClick={() => handleOpenEditModal(selectedCustomer)}
                      className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors"
                      title="Edit Customer"
                    >
                      <Edit size={16} />
                    </button>
                    <button 
                      onClick={() => handleDeleteCustomer(selectedCustomer.id)}
                      className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete Customer"
                    >
                      <Trash2 size={16} />
                    </button>
                    <div className="px-2 py-1 bg-orange-50 text-orange-600 rounded-lg text-[10px] font-bold border border-orange-100 flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                      {selectedCustomer.points || 0} Points
                    </div>
                  </div>
                </div>
              </div>

              {/* Average Order Value Card */}
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Average Order Value</span>
                <span className="text-lg font-black text-gray-900">
                  {currencySymbol} {selectedCustomer.orderCount > 0 ? Math.round(selectedCustomer.totalSpent / selectedCustomer.orderCount).toLocaleString() : 0}
                </span>
              </div>

              {/* Bills Table */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-50 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest">Bills</h3>
                  <button className="p-2 hover:bg-gray-50 rounded-lg text-gray-400">
                    <History size={18} />
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50">
                        <th className="px-6 py-4">Bill no.</th>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4">Time</th>
                        <th className="px-6 py-4 text-right">Total Sales</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {loadingOrders ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-8 text-center">
                            <Loader2 className="animate-spin text-gray-300 mx-auto" size={20} />
                          </td>
                        </tr>
                      ) : customerOrders.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-8 text-center text-xs text-gray-400 italic">No bills found</td>
                        </tr>
                      ) : (
                        customerOrders.map((order) => (
                          <tr key={order.id} className="hover:bg-gray-50 transition-colors group">
                            <td className="px-6 py-4 text-xs font-bold text-gray-900">#{order.orderNumber || order.id.slice(0, 4)}</td>
                            <td className="px-6 py-4 text-xs text-gray-600">
                              {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString('en-GB') : 'N/A'}
                            </td>
                            <td className="px-6 py-4 text-xs text-gray-600">
                              {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                            </td>
                            <td className="px-6 py-4 text-xs font-black text-gray-900 text-right">
                              {currencySymbol} {order.totalAmount?.toLocaleString()}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Items Bought Table */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-50 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest">Items Bought</h3>
                  <button className="p-2 hover:bg-gray-50 rounded-lg text-gray-400">
                    <History size={18} />
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50">
                        <th className="px-6 py-4">Category</th>
                        <th className="px-6 py-4">Item Code</th>
                        <th className="px-6 py-4">Quantity</th>
                        <th className="px-6 py-4 text-right">Total Sales</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {loadingOrders ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-8 text-center">
                            <Loader2 className="animate-spin text-gray-300 mx-auto" size={20} />
                          </td>
                        </tr>
                      ) : customerOrders.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-8 text-center text-xs text-gray-400 italic">No items found</td>
                        </tr>
                      ) : (
                        customerOrders.flatMap(order => order.items || []).slice(0, 10).map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-gray-50 transition-colors group">
                            <td className="px-6 py-4">
                              <span className="px-2 py-1 bg-blue-50 text-blue-600 text-[9px] font-bold rounded-lg border border-blue-100 uppercase tracking-wider">
                                {item.category || 'General'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-xs font-medium text-gray-500">{item.id?.slice(0, 8) || 'N/A'}</td>
                            <td className="px-6 py-4 text-xs font-bold text-gray-900">{item.quantity}</td>
                            <td className="px-6 py-4 text-xs font-black text-gray-900 text-right">
                              {currencySymbol} {(item.price * item.quantity).toLocaleString()}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Messages Section */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-50 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest">Messages</h3>
                  <button className="p-2 hover:bg-gray-50 rounded-lg text-gray-400">
                    <MoreVertical size={18} />
                  </button>
                </div>
                <div className="p-8 text-center">
                  <div className="inline-block px-4 py-1.5 bg-gray-50 rounded-full text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-8">
                    Wednesday, 22 Feb
                  </div>
                  <div className="flex flex-col items-center gap-4 text-gray-300">
                    <MessageSquare size={48} strokeWidth={1} />
                    <p className="text-xs font-medium">No messages yet</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center bg-white rounded-2xl border border-gray-100 shadow-sm text-gray-400 gap-4">
              <Users size={64} strokeWidth={1} />
              <p className="text-sm font-medium">Select a customer to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Customer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#141414]">
                {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Full Name</label>
                <input
                  required
                  type="text"
                  className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all"
                  placeholder="e.g. Rahim Ahmed"
                  value={customerForm.name}
                  onChange={(e) => setCustomerForm({...customerForm, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Phone</label>
                  <input
                    required
                    type="tel"
                    className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all"
                    placeholder="017..."
                    value={customerForm.phone}
                    onChange={(e) => setCustomerForm({...customerForm, phone: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Email</label>
                  <input
                    required
                    type="email"
                    className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all"
                    placeholder="rahim@example.com"
                    value={customerForm.email}
                    onChange={(e) => setCustomerForm({...customerForm, email: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Segment</label>
                  <select
                    className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all"
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
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Follow-up Date</label>
                  <input
                    type="date"
                    className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all"
                    value={customerForm.followUpDate}
                    onChange={(e) => setCustomerForm({...customerForm, followUpDate: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tags (comma separated)</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all"
                  placeholder="e.g. wholesale, high-value"
                  value={customerForm.tags.join(', ')}
                  onChange={(e) => setCustomerForm({...customerForm, tags: e.target.value.split(',').map(t => t.trim()).filter(t => t !== '')})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Notes</label>
                <textarea
                  className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all min-h-[60px] resize-none"
                  placeholder="Internal notes about this customer..."
                  value={customerForm.notes}
                  onChange={(e) => setCustomerForm({...customerForm, notes: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Address</label>
                <textarea
                  required
                  className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all min-h-[80px] resize-none"
                  placeholder="Full address..."
                  value={customerForm.address}
                  onChange={(e) => setCustomerForm({...customerForm, address: e.target.value})}
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-[#141414] text-white rounded-lg text-sm font-medium hover:bg-black transition-colors"
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
