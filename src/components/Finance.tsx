import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  Download, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  CreditCard, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight,
  Filter,
  Calendar,
  MoreVertical,
  CheckCircle2,
  Clock,
  Loader2,
  X,
  Trash2,
  Edit
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell
} from 'recharts';
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

interface Transaction {
  id: string;
  orderId: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  method: string;
  accountId: string;
  date: string;
  status: 'Completed' | 'Pending';
  createdAt: any;
  uid: string;
  notes?: string;
}

interface Account {
  id: string;
  name: string;
  type: 'Bank' | 'Mobile' | 'Cash';
  balance: number;
  accountNumber?: string;
  uid: string;
}

function Finance() {
  const { currencySymbol } = useSettings();
  const [searchTerm, setSearchTerm] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [transactionForm, setTransactionForm] = useState({
    orderId: '-',
    type: 'income' as 'income' | 'expense',
    category: 'Sales',
    amount: '',
    method: 'bKash',
    accountId: '',
    status: 'Completed' as 'Completed' | 'Pending',
    notes: ''
  });
  const [accountForm, setAccountForm] = useState({
    name: '',
    type: 'Bank' as 'Bank' | 'Mobile' | 'Cash',
    balance: '',
    accountNumber: ''
  });

  useEffect(() => {
    const qTxns = query(collection(db, 'transactions'), orderBy('createdAt', 'desc'));
    const qAccounts = query(collection(db, 'accounts'), orderBy('name', 'asc'));
    
    const unsubTxns = onSnapshot(qTxns, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Transaction[]);
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'transactions'));

    const unsubAccounts = onSnapshot(qAccounts, (snapshot) => {
      setAccounts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Account[]);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'accounts'));

    return () => {
      unsubTxns();
      unsubAccounts();
    };
  }, []);

  const handleOpenAddModal = () => {
    setEditingTransaction(null);
    setTransactionForm({
      orderId: '-',
      type: 'income',
      category: 'Sales',
      amount: '',
      method: 'bKash',
      accountId: accounts[0]?.id || '',
      status: 'Completed',
      notes: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenAccountModal = (acc?: Account) => {
    if (acc) {
      setEditingAccount(acc);
      setAccountForm({
        name: acc.name,
        type: acc.type,
        balance: acc.balance.toString(),
        accountNumber: acc.accountNumber || ''
      });
    } else {
      setEditingAccount(null);
      setAccountForm({
        name: '',
        type: 'Bank',
        balance: '0',
        accountNumber: ''
      });
    }
    setIsAccountModalOpen(true);
  };

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    try {
      const data = {
        ...accountForm,
        balance: Number(accountForm.balance),
        uid: auth.currentUser.uid,
        updatedAt: serverTimestamp()
      };
      if (editingAccount) {
        await updateDoc(doc(db, 'accounts', editingAccount.id), data);
      } else {
        await addDoc(collection(db, 'accounts'), { ...data, createdAt: serverTimestamp() });
      }
      setIsAccountModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, editingAccount ? OperationType.UPDATE : OperationType.CREATE, 'accounts');
    }
  };

  const handleOpenEditModal = (txn: Transaction) => {
    setEditingTransaction(txn);
    setTransactionForm({
      orderId: txn.orderId,
      type: txn.type,
      category: txn.category,
      amount: txn.amount.toString(),
      method: txn.method,
      status: txn.status,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    try {
      const data = {
        ...transactionForm,
        amount: Number(transactionForm.amount),
        updatedAt: serverTimestamp()
      };

      if (editingTransaction) {
        await updateDoc(doc(db, 'transactions', editingTransaction.id), data);
      } else {
        await addDoc(collection(db, 'transactions'), {
          ...data,
          date: new Date().toISOString().split('T')[0],
          createdAt: serverTimestamp(),
          uid: auth.currentUser.uid
        });
      }
      setIsModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, editingTransaction ? OperationType.UPDATE : OperationType.CREATE, 'transactions');
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) return;
    try {
      await deleteDoc(doc(db, 'transactions', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `transactions/${id}`);
    }
  };

  const filteredTransactions = transactions.filter(txn => 
    txn.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    txn.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    txn.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    txn.method.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + (t.amount || 0), 0);
  const netProfit = totalIncome - totalExpense;
  const pendingCod = transactions.filter(t => t.status === 'Pending' && t.method === 'COD').reduce((sum, t) => sum + (t.amount || 0), 0);

  // Prepare chart data (last 6 months)
  const chartData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();
    const last6Months = [];
    
    for (let i = 5; i >= 0; i--) {
      const m = (currentMonth - i + 12) % 12;
      last6Months.push({
        name: months[m],
        income: 0,
        expense: 0,
        monthIndex: m
      });
    }

    transactions.forEach(txn => {
      if (!txn.createdAt) return;
      const date = txn.createdAt.toDate ? txn.createdAt.toDate() : (txn.createdAt.seconds ? new Date(txn.createdAt.seconds * 1000) : new Date(txn.createdAt));
      const month = date.getMonth();
      const chartItem = last6Months.find(item => item.monthIndex === month);
      if (chartItem) {
        if (txn.type === 'income') chartItem.income += txn.amount;
        else chartItem.expense += txn.amount;
      }
    });

    return last6Months;
  }, [transactions]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-[#141414] tracking-tight">Finance & Accounting</h2>
          <p className="text-sm text-gray-500 mt-1">Track income, expenses, profit-loss, and COD reconciliation.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => handleOpenAccountModal()}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <Wallet size={16} />
            Add Account
          </button>
          <button 
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-[#141414] text-white rounded-lg text-sm font-medium hover:bg-black transition-colors"
          >
            <Plus size={16} />
            Add Transaction
          </button>
        </div>
      </div>

      {/* Accounts Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {accounts.map(acc => (
          <div key={acc.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm relative group">
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 rounded-lg ${
                acc.type === 'Bank' ? 'bg-blue-50 text-blue-600' :
                acc.type === 'Mobile' ? 'bg-pink-50 text-pink-600' :
                'bg-green-50 text-green-600'
              }`}>
                {acc.type === 'Bank' ? <CreditCard size={16} /> : <Wallet size={16} />}
              </div>
              <div>
                <p className="text-xs font-bold text-[#141414]">{acc.name}</p>
                <p className="text-[10px] text-gray-400">{acc.accountNumber || acc.type}</p>
              </div>
            </div>
            <p className="text-lg font-bold">{currencySymbol} {acc.balance.toLocaleString()}</p>
            <button 
              onClick={() => handleOpenAccountModal(acc)}
              className="absolute top-2 right-2 p-1 text-gray-300 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Edit size={12} />
            </button>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 rounded-lg bg-green-50 text-green-600">
              <TrendingUp size={20} />
            </div>
            <span className="text-xs font-bold text-green-600 flex items-center gap-1">
              <ArrowUpRight size={14} /> +12%
            </span>
          </div>
          <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">Total Revenue</p>
          <h3 className="text-2xl font-bold text-[#141414]">{currencySymbol} {totalIncome.toLocaleString()}</h3>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 rounded-lg bg-red-50 text-red-600">
              <TrendingDown size={20} />
            </div>
            <span className="text-xs font-bold text-red-600 flex items-center gap-1">
              <ArrowDownRight size={14} /> +5%
            </span>
          </div>
          <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">Total Expenses</p>
          <h3 className="text-2xl font-bold text-[#141414]">{currencySymbol} {totalExpense.toLocaleString()}</h3>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <DollarSign size={20} />
            </div>
            <span className="text-xs font-bold text-blue-600 flex items-center gap-1">
              <ArrowUpRight size={14} /> +15%
            </span>
          </div>
          <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">Net Profit</p>
          <h3 className="text-2xl font-bold text-[#141414]">{currencySymbol} {netProfit.toLocaleString()}</h3>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 rounded-lg bg-orange-50 text-orange-600">
              <Wallet size={20} />
            </div>
            <span className="text-xs font-bold text-orange-600 flex items-center gap-1">
              <Clock size={14} /> Pending
            </span>
          </div>
          <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">Pending COD</p>
          <h3 className="text-2xl font-bold text-[#141414]">{currencySymbol} {pendingCod.toLocaleString()}</h3>
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-white p-8 rounded-xl border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-lg font-bold">Income vs Expense</h3>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#141414]"></div>
              <span className="text-xs text-gray-500">Income</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-200"></div>
              <span className="text-xs text-gray-500">Expense</span>
            </div>
          </div>
        </div>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9CA3AF' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9CA3AF' }} />
              <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
              <Bar dataKey="income" fill="#141414" radius={[4, 4, 0, 0]} barSize={30} />
              <Bar dataKey="expense" fill="#E5E7EB" radius={[4, 4, 0, 0]} barSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-bold">Recent Transactions</h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                type="text"
                placeholder="Search..."
                className="pl-8 pr-4 py-1.5 bg-gray-50 border border-transparent rounded-lg text-xs focus:bg-white focus:border-gray-200 outline-none transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="p-1.5 bg-gray-50 text-gray-500 rounded-lg hover:bg-gray-100 transition-all">
              <Filter size={14} />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-[10px] uppercase tracking-widest text-gray-500">
                <th className="px-6 py-4 font-semibold">Transaction ID</th>
                <th className="px-6 py-4 font-semibold">Category</th>
                <th className="px-6 py-4 font-semibold">Method</th>
                <th className="px-6 py-4 font-semibold">Date</th>
                <th className="px-6 py-4 font-semibold">Amount</th>
                <th className="px-6 py-4 font-semibold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="animate-spin text-gray-400" size={24} />
                      <span className="text-sm text-gray-500">Loading transactions...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Wallet className="text-gray-300" size={48} />
                      <span className="text-sm text-gray-500">No transactions found</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((txn) => (
                  <tr key={txn.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-mono font-bold text-[#141414]">{txn.id}</span>
                        <span className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider">#{txn.orderNumber || txn.orderId?.slice(0, 8)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium text-gray-600">{txn.category}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <CreditCard size={12} className="text-gray-400" />
                        {txn.method}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <Calendar size={12} className="text-gray-400" />
                        {txn.date?.toDate ? txn.date.toDate().toLocaleDateString() : (txn.date?.seconds ? new Date(txn.date.seconds * 1000).toLocaleDateString() : 'N/A')}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-sm font-bold ${txn.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {txn.type === 'income' ? '+' : '-'} {currencySymbol} {(txn.amount || 0).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="flex items-center gap-1">
                          {txn.status === 'Completed' ? (
                            <CheckCircle2 size={14} className="text-green-500" />
                          ) : (
                            <Clock size={14} className="text-orange-500" />
                          )}
                          <span className={`text-[10px] font-bold uppercase ${txn.status === 'Completed' ? 'text-green-600' : 'text-orange-600'}`}>
                            {txn.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleOpenEditModal(txn)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all" 
                            title="Edit"
                          >
                            <Edit size={14} />
                          </button>
                          <button 
                            onClick={() => handleDeleteTransaction(txn.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all" 
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Transaction Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#141414]">
                {editingTransaction ? 'Edit Transaction' : 'Add Transaction'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Type</label>
                  <select
                    className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all"
                    value={transactionForm.type}
                    onChange={(e) => setTransactionForm({...transactionForm, type: e.target.value as 'income' | 'expense'})}
                  >
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Category</label>
                  <input
                    required
                    type="text"
                    className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all"
                    placeholder="e.g. Sales, Rent"
                    value={transactionForm.category}
                    onChange={(e) => setTransactionForm({...transactionForm, category: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Amount ({currencySymbol})</label>
                  <input
                    required
                    type="number"
                    className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all"
                    placeholder="0.00"
                    value={transactionForm.amount}
                    onChange={(e) => setTransactionForm({...transactionForm, amount: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Account</label>
                  <select
                    className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all"
                    value={transactionForm.accountId}
                    onChange={(e) => setTransactionForm({...transactionForm, accountId: e.target.value})}
                  >
                    <option value="">Select Account</option>
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Method</label>
                  <select
                    className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all"
                    value={transactionForm.method}
                    onChange={(e) => setTransactionForm({...transactionForm, method: e.target.value})}
                  >
                    <option value="bKash">bKash</option>
                    <option value="Nagad">Nagad</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="COD">COD</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Notes</label>
                <textarea
                  className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all min-h-[60px] resize-none"
                  placeholder="Transaction details..."
                  value={transactionForm.notes}
                  onChange={(e) => setTransactionForm({...transactionForm, notes: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Order ID (Optional)</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all"
                    placeholder="ORD-..."
                    value={transactionForm.orderId}
                    onChange={(e) => setTransactionForm({...transactionForm, orderId: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Status</label>
                  <select
                    className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all"
                    value={transactionForm.status}
                    onChange={(e) => setTransactionForm({...transactionForm, status: e.target.value as 'Completed' | 'Pending'})}
                  >
                    <option value="Completed">Completed</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>
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
                  {editingTransaction ? 'Save Changes' : 'Save Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Account Modal */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#141414]">
                {editingAccount ? 'Edit Account' : 'Add Account'}
              </h3>
              <button onClick={() => setIsAccountModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAccountSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Account Name</label>
                <input
                  required
                  className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all"
                  placeholder="e.g. City Bank, bKash Personal"
                  value={accountForm.name}
                  onChange={(e) => setAccountForm({...accountForm, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Type</label>
                  <select
                    className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all"
                    value={accountForm.type}
                    onChange={(e) => setAccountForm({...accountForm, type: e.target.value as any})}
                  >
                    <option value="Bank">Bank</option>
                    <option value="Mobile">Mobile</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Initial Balance</label>
                  <input
                    required
                    type="number"
                    className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all"
                    value={accountForm.balance}
                    onChange={(e) => setAccountForm({...accountForm, balance: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Account Number (Optional)</label>
                <input
                  className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all"
                  placeholder="e.g. 123456789"
                  value={accountForm.accountNumber}
                  onChange={(e) => setAccountForm({...accountForm, accountNumber: e.target.value})}
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsAccountModalOpen(false)} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-[#141414] text-white rounded-lg text-sm font-medium hover:bg-black transition-colors">Save Account</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Finance;
