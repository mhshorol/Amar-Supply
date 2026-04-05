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
  orderBy, 
  serverTimestamp,
  Timestamp,
  updateDoc
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

import { useSettings } from '../contexts/SettingsContext';

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  orders: number;
  spent: number;
  lastOrder: string;
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

  useEffect(() => {
    const q = query(collection(db, 'customers'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const customerData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Customer[];
      setCustomers(customerData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'customers');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

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
          orders: 0,
          spent: 0,
          lastOrder: 'Never',
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
    if (!window.confirm('Are you sure you want to delete this customer?')) return;
    try {
      await deleteDoc(doc(db, 'customers', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `customers/${id}`);
    }
  };

  const filteredCustomers = customers.filter(customer => 
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone.includes(searchTerm) ||
    customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalSpent = customers.reduce((sum, c) => sum + (c.spent || 0), 0);
  const avgSpent = customers.length > 0 ? totalSpent / customers.length : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-[#141414] tracking-tight">Customer CRM</h2>
          <p className="text-sm text-gray-500 mt-1">Manage customer relationships, track history, and improve loyalty.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
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
              {customers.length > 0 ? Math.round((customers.filter(c => c.orders > 1).length / customers.length) * 100) : 0}%
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

      {/* Search & Filter */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by Name, Phone, Email, Address..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-[10px] uppercase tracking-widest text-gray-500">
                <th className="px-6 py-4 font-semibold">Customer info</th>
                <th className="px-6 py-4 font-semibold">Contact</th>
                <th className="px-6 py-4 font-semibold">Location</th>
                <th className="px-6 py-4 font-semibold">Order History</th>
                <th className="px-6 py-4 font-semibold">Total Spent</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="animate-spin text-gray-400" size={24} />
                      <span className="text-sm text-gray-500">Loading customers...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Users className="text-gray-300" size={48} />
                      <span className="text-sm text-gray-500">No customers found</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-[#141414]">{customer.name}</span>
                          {customer.segment && (
                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider ${
                              customer.segment === 'VIP' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                              customer.segment === 'Repeat' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                              customer.segment === 'At Risk' ? 'bg-red-50 text-red-600 border border-red-100' :
                              'bg-gray-50 text-gray-500 border border-gray-100'
                            }`}>
                              {customer.segment}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-gray-400 mt-1 uppercase tracking-wider">{customer.id}</span>
                        {customer.tags && customer.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {customer.tags.map(tag => (
                              <span key={tag} className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-[8px] font-medium">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <Phone size={12} className="text-gray-400" />
                          {customer.phone}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <Mail size={12} className="text-gray-400" />
                          {customer.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <MapPin size={12} className="text-gray-400" />
                        {customer.address}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1 text-sm font-bold text-[#141414]">
                          {customer.orders} <span className="text-[10px] font-normal text-gray-400 uppercase tracking-wider">Orders</span>
                        </div>
                        {customer.followUpDate && (
                          <div className="flex items-center gap-1 text-[10px] text-orange-600 font-bold mt-1">
                            <Calendar size={10} />
                            Follow-up: {customer.followUpDate?.toDate ? customer.followUpDate.toDate().toLocaleDateString() : (customer.followUpDate?.seconds ? new Date(customer.followUpDate.seconds * 1000).toLocaleDateString() : 'N/A')}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-[#141414]">{currencySymbol} {(customer.spent || 0).toLocaleString()}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleOpenEditModal(customer)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all" 
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteCustomer(customer.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all" 
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
    </div>
  );
}
