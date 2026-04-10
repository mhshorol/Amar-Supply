import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  DollarSign, 
  Calendar, 
  FileText, 
  TrendingDown, 
  TrendingUp,
  Search,
  Loader2,
  Trash2,
  Filter,
  ArrowDownCircle,
  ArrowUpCircle
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
  where,
  getDocs
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import ConfirmModal from './ConfirmModal';

interface PettyCashRecord {
  id: string;
  amount: number;
  description: string;
  category: string;
  date: any;
  uid: string;
  createdAt: any;
}

export default function PettyCash() {
  const [records, setRecords] = useState<PettyCashRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    amount: 0,
    description: '',
    category: 'General',
    date: format(new Date(), 'yyyy-MM-dd')
  });
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
    if (!auth.currentUser) return;
    const q = query(collection(db, 'petty_cash'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PettyCashRecord[]);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'petty_cash');
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    setSubmitting(true);

    try {
      await addDoc(collection(db, 'petty_cash'), {
        ...form,
        uid: auth.currentUser.uid,
        createdAt: serverTimestamp()
      });

      toast.success("Petty cash record added");
      setIsModalOpen(false);
      setForm({ amount: 0, description: '', category: 'General', date: format(new Date(), 'yyyy-MM-dd') });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'petty_cash');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Delete Petty Cash Record',
      message: 'Are you sure you want to delete this record? This action cannot be undone.',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'petty_cash', id));
          toast.success("Record deleted");
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `petty_cash/${id}`);
        }
      }
    });
  };

  const totalExpense = records.reduce((sum, r) => sum + r.amount, 0);
  const monthlyExpense = records
    .filter(r => {
      const date = r.date instanceof Timestamp ? r.date.toDate() : new Date(r.date);
      return date >= startOfMonth(new Date()) && date <= endOfMonth(new Date());
    })
    .reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-[#141414] tracking-tight">Petty Cash</h2>
          <p className="text-sm text-gray-500 mt-1">Track small daily business expenses and cash flow.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#141414] text-white rounded-lg text-sm font-medium hover:bg-black transition-colors"
        >
          <Plus size={16} />
          Add Expense
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-50 text-red-600 rounded-lg">
              <TrendingDown size={20} />
            </div>
            <span className="text-sm font-bold text-gray-900">Total Expenses</span>
          </div>
          <h3 className="text-2xl font-bold text-[#141414]">৳{totalExpense.toLocaleString()}</h3>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
              <Calendar size={20} />
            </div>
            <span className="text-sm font-bold text-gray-900">This Month</span>
          </div>
          <h3 className="text-2xl font-bold text-[#141414]">৳{monthlyExpense.toLocaleString()}</h3>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <FileText size={20} />
            </div>
            <span className="text-sm font-bold text-gray-900">Total Records</span>
          </div>
          <h3 className="text-2xl font-bold text-[#141414]">{records.length}</h3>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-[10px] uppercase tracking-widest text-gray-500">
                <th className="px-6 py-4 font-semibold">Date</th>
                <th className="px-6 py-4 font-semibold">Category</th>
                <th className="px-6 py-4 font-semibold">Description</th>
                <th className="px-6 py-4 font-semibold">Amount</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Loader2 className="animate-spin text-gray-400 mx-auto" size={24} />
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500 text-sm">
                    No petty cash records found.
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium text-gray-600">
                        {record.date instanceof Timestamp ? format(record.date.toDate(), 'MMM dd, yyyy') : format(new Date(record.date), 'MMM dd, yyyy')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-[10px] font-bold">
                        {record.category.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-gray-600 truncate max-w-[300px] block">{record.description}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-red-600">-৳{record.amount.toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleDelete(record.id)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
