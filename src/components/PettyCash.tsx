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
          <h2 className="text-3xl font-bold text-primary tracking-tight">Petty Cash</h2>
          <p className="text-sm text-secondary mt-1">Track small daily business expenses and cash flow.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-black rounded-lg text-sm font-medium hover:bg-black transition-colors"
        >
          <Plus size={16} />
          Add Expense
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-surface p-6 rounded-xl border border-border shadow-subtle">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-50 text-red-600 rounded-lg">
              <TrendingDown size={20} />
            </div>
            <span className="text-sm font-bold text-primary">Total Expenses</span>
          </div>
          <h3 className="text-2xl font-bold text-primary">৳{totalExpense.toLocaleString()}</h3>
        </div>
        <div className="bg-surface p-6 rounded-xl border border-border shadow-subtle">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
              <Calendar size={20} />
            </div>
            <span className="text-sm font-bold text-primary">This Month</span>
          </div>
          <h3 className="text-2xl font-bold text-primary">৳{monthlyExpense.toLocaleString()}</h3>
        </div>
        <div className="bg-surface p-6 rounded-xl border border-border shadow-subtle">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-brand/10 text-brand rounded-lg">
              <FileText size={20} />
            </div>
            <span className="text-sm font-bold text-primary">Total Records</span>
          </div>
          <h3 className="text-2xl font-bold text-primary">{records.length}</h3>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface rounded-xl border border-border shadow-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px] whitespace-nowrap">
            <thead>
              <tr className="bg-surface-hover text-[10px] uppercase tracking-widest text-secondary">
                <th className="px-6 py-4 font-semibold">Date</th>
                <th className="px-6 py-4 font-semibold">Category</th>
                <th className="px-6 py-4 font-semibold">Description</th>
                <th className="px-6 py-4 font-semibold">Amount</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Loader2 className="animate-spin text-muted mx-auto" size={24} />
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-secondary text-sm">
                    No petty cash records found.
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr key={record.id} className="hover:bg-surface-hover transition-colors group">
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium text-secondary">
                        {record.date instanceof Timestamp ? format(record.date.toDate(), 'MMM dd, yyyy') : format(new Date(record.date), 'MMM dd, yyyy')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-surface-hover text-secondary rounded-full text-[10px] font-bold">
                        {record.category.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-secondary truncate max-w-[300px] block">{record.description}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-red-600">-৳{record.amount.toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleDelete(record.id)}
                        className="p-1 text-muted hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
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
