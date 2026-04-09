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
  Edit,
  PieChart as PieChartIcon,
  FileText,
  Users,
  Building2,
  Receipt,
  ArrowRightLeft,
  LayoutDashboard,
  ListTree,
  Calculator,
  History
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie
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
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { useSettings } from '../contexts/SettingsContext';
import PettyCash from './PettyCash';
import { Supplier, SupplierPayment } from '../types';

interface Transaction {
  id: string;
  orderId: string;
  orderNumber?: number;
  type: 'income' | 'expense' | 'transfer';
  category: string;
  subCategory?: string;
  amount: number;
  method: string;
  accountId: string;
  toAccountId?: string; // For transfers
  date: string;
  status: 'Completed' | 'Pending';
  createdAt: any;
  uid: string;
  notes?: string;
  receiptUrl?: string;
}

interface Account {
  id: string;
  name: string;
  type: 'Bank' | 'Mobile' | 'Cash' | 'Asset' | 'Liability' | 'Equity';
  category: 'Assets' | 'Liabilities' | 'Equity' | 'Income' | 'COGS' | 'Expenses';
  balance: number;
  accountNumber?: string;
  uid: string;
}

const COA_STRUCTURE = {
  Assets: ['Cash', 'Bank Accounts', 'Inventory', 'Accounts Receivable', 'Advance Payments'],
  Liabilities: ['Accounts Payable', 'Loans', 'Unpaid Expenses', 'VAT/Tax Payable'],
  Equity: ['Owner Investment', 'Retained Earnings', 'Owner Withdraw'],
  Income: ['Product Sales', 'Delivery Charge Income', 'Discount Adjustment', 'Other Income'],
  COGS: ['Product Cost', 'Packaging Cost', 'Delivery Cost'],
  Expenses: ['Marketing', 'Salary', 'Rent', 'Utilities', 'Courier Charge', 'Misc Expenses']
};

function Finance() {
  const { currencySymbol } = useSettings();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'coa' | 'reports' | 'ar_ap' | 'supplier_payments' | 'petty_cash'>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierPayments, setSupplierPayments] = useState<SupplierPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSupplierPaymentModalOpen, setIsSupplierPaymentModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isPnLModalOpen, setIsPnLModalOpen] = useState(false);
  const [isBalanceSheetModalOpen, setIsBalanceSheetModalOpen] = useState(false);
  const [isCashFlowModalOpen, setIsCashFlowModalOpen] = useState(false);
  const [reportRange, setReportRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [transactionForm, setTransactionForm] = useState({
    orderId: '-',
    type: 'income' as 'income' | 'expense' | 'transfer',
    category: 'Income',
    subCategory: 'Product Sales',
    amount: '',
    method: 'bKash',
    accountId: '',
    toAccountId: '',
    status: 'Completed' as 'Completed' | 'Pending',
    notes: ''
  });
  const [accountForm, setAccountForm] = useState({
    name: '',
    type: 'Bank' as any,
    category: 'Assets' as any,
    balance: '',
    accountNumber: ''
  });
  const [supplierPaymentForm, setSupplierPaymentForm] = useState({
    supplierId: '',
    supplierName: '',
    date: new Date().toISOString().split('T')[0],
    voucherNo: '',
    dueAmount: '',
    amount: '',
    total: '',
    paymentType: 'Cash',
    paidAmount: '',
    remark: ''
  });

  useEffect(() => {
    const qTxns = query(collection(db, 'transactions'), orderBy('createdAt', 'desc'));
    const qAccounts = query(collection(db, 'accounts'), orderBy('name', 'asc'));
    const qSuppliers = query(collection(db, 'suppliers'), orderBy('name', 'asc'));
    const qSupplierPayments = query(collection(db, 'supplierPayments'), orderBy('createdAt', 'desc'));
    
    const unsubTxns = onSnapshot(qTxns, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Transaction[]);
      setLoading(false);
    }, (error) => {
      if (error.code !== 'permission-denied') {
        handleFirestoreError(error, OperationType.LIST, 'transactions');
      }
      setLoading(false);
    });

    const unsubAccounts = onSnapshot(qAccounts, (snapshot) => {
      setAccounts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Account[]);
    }, (error) => {
      if (error.code !== 'permission-denied') {
        handleFirestoreError(error, OperationType.LIST, 'accounts');
      }
    });

    const unsubSuppliers = onSnapshot(qSuppliers, (snapshot) => {
      setSuppliers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Supplier[]);
    }, (error) => {
      if (error.code !== 'permission-denied') {
        handleFirestoreError(error, OperationType.LIST, 'suppliers');
      }
    });

    const unsubSupplierPayments = onSnapshot(qSupplierPayments, (snapshot) => {
      setSupplierPayments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SupplierPayment[]);
    }, (error) => {
      if (error.code !== 'permission-denied') {
        handleFirestoreError(error, OperationType.LIST, 'supplierPayments');
      }
    });

    return () => {
      unsubTxns();
      unsubAccounts();
      unsubSuppliers();
      unsubSupplierPayments();
    };
  }, []);

  const handleOpenAddModal = () => {
    setEditingTransaction(null);
    setTransactionForm({
      orderId: '-',
      type: 'income',
      category: 'Income',
      subCategory: 'Product Sales',
      amount: '',
      method: 'bKash',
      accountId: accounts[0]?.id || '',
      toAccountId: '',
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
        category: acc.category,
        balance: acc.balance.toString(),
        accountNumber: acc.accountNumber || ''
      });
    } else {
      setEditingAccount(null);
      setAccountForm({
        name: '',
        type: 'Bank',
        category: 'Assets',
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
        name: accountForm.name,
        type: accountForm.type,
        category: accountForm.category,
        balance: Number(accountForm.balance),
        accountNumber: accountForm.accountNumber,
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
      subCategory: txn.subCategory || '',
      amount: txn.amount.toString(),
      method: txn.method,
      accountId: txn.accountId,
      toAccountId: txn.toAccountId || '',
      status: txn.status,
      notes: txn.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    try {
      const data = {
        orderId: transactionForm.orderId,
        type: transactionForm.type,
        category: transactionForm.category,
        subCategory: transactionForm.subCategory,
        amount: Number(transactionForm.amount),
        method: transactionForm.method,
        accountId: transactionForm.accountId,
        toAccountId: transactionForm.toAccountId,
        status: transactionForm.status,
        notes: transactionForm.notes,
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

  const handleSupplierPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    try {
      const selectedSupplier = suppliers.find(s => s.id === supplierPaymentForm.supplierId);
      const data = {
        supplierId: supplierPaymentForm.supplierId,
        supplierName: selectedSupplier?.name || '',
        date: supplierPaymentForm.date,
        voucherNo: supplierPaymentForm.voucherNo,
        dueAmount: Number(supplierPaymentForm.dueAmount),
        amount: Number(supplierPaymentForm.amount),
        total: Number(supplierPaymentForm.total),
        paymentType: supplierPaymentForm.paymentType,
        paidAmount: Number(supplierPaymentForm.paidAmount),
        remark: supplierPaymentForm.remark,
        uid: auth.currentUser.uid,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'supplierPayments'), data);

      // Also create a transaction
      await addDoc(collection(db, 'transactions'), {
        type: 'expense',
        category: 'COGS',
        subCategory: 'Product Cost',
        amount: Number(supplierPaymentForm.paidAmount),
        method: supplierPaymentForm.paymentType,
        accountId: accounts.find(a => a.name === supplierPaymentForm.paymentType)?.id || accounts[0]?.id || '',
        date: supplierPaymentForm.date,
        status: 'Completed',
        notes: `Supplier Payment: ${selectedSupplier?.name} (Voucher: ${supplierPaymentForm.voucherNo})`,
        createdAt: serverTimestamp(),
        uid: auth.currentUser.uid
      });

      setIsSupplierPaymentModalOpen(false);
      toast.success('Supplier payment recorded successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'supplierPayments');
    }
  };

  const handleDeleteSupplierPayment = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this supplier payment?')) return;
    try {
      await deleteDoc(doc(db, 'supplierPayments', id));
      toast.success('Supplier payment deleted');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `supplierPayments/${id}`);
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

  const handleExportCSV = () => {
    if (transactions.length === 0) {
      toast.error('No transactions to export');
      return;
    }

    const headers = ['ID', 'Order ID', 'Type', 'Category', 'Subcategory', 'Amount', 'Method', 'Account ID', 'Status', 'Date', 'Created At'];
    const csvRows = [headers.join(',')];

    transactions.forEach(txn => {
      const row = [
        txn.id,
        txn.orderId || '',
        txn.type || '',
        `"${txn.category || ''}"`,
        `"${txn.subCategory || ''}"`,
        txn.amount || 0,
        txn.method || '',
        txn.accountId || '',
        txn.status || '',
        txn.date || '',
        txn.createdAt?.toDate ? txn.createdAt.toDate().toLocaleString() : (txn.createdAt?.seconds ? new Date(txn.createdAt.seconds * 1000).toLocaleString() : 'N/A')
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `transactions_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Transactions exported successfully');
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

  const pnlReport = useMemo(() => {
    const filtered = transactions.filter(txn => {
      const date = txn.createdAt?.toDate ? txn.createdAt.toDate() : (txn.createdAt?.seconds ? new Date(txn.createdAt.seconds * 1000) : new Date(txn.date));
      const start = new Date(reportRange.start);
      const end = new Date(reportRange.end);
      end.setHours(23, 59, 59, 999);
      return date >= start && date <= end;
    });

    const getSum = (cat: string, sub?: string) => 
      filtered.filter(t => t.category === cat && (!sub || t.subCategory === sub))
              .reduce((sum, t) => sum + (t.amount || 0), 0);

    // Revenue
    const productSales = getSum('Income', 'Product Sales');
    const deliveryIncome = getSum('Income', 'Delivery Charge Income');
    const otherIncome = getSum('Income', 'Other Income');
    const discountAdjustment = getSum('Income', 'Discount Adjustment');
    const totalRevenue = productSales + deliveryIncome + otherIncome - discountAdjustment;

    // COGS
    const productCost = getSum('COGS', 'Product Cost');
    const packagingCost = getSum('COGS', 'Packaging Cost');
    const deliveryCost = getSum('COGS', 'Delivery Cost');
    const totalCOGS = productCost + packagingCost + deliveryCost;

    const grossProfit = totalRevenue - totalCOGS;

    // Expenses
    const marketing = getSum('Expenses', 'Marketing');
    const salary = getSum('Expenses', 'Salary');
    const rent = getSum('Expenses', 'Rent');
    const utilities = getSum('Expenses', 'Utilities');
    const courierCharge = getSum('Expenses', 'Courier Charge');
    const miscExpenses = getSum('Expenses', 'Misc Expenses');
    const totalExpenses = marketing + salary + rent + utilities + courierCharge + miscExpenses;

    const netProfit = grossProfit - totalExpenses;

    return {
      revenue: { productSales, deliveryIncome, otherIncome, discountAdjustment, total: totalRevenue },
      cogs: { productCost, packagingCost, deliveryCost, total: totalCOGS },
      grossProfit,
      expenses: { marketing, salary, rent, utilities, courierCharge, miscExpenses, total: totalExpenses },
      netProfit
    };
  }, [transactions, reportRange]);

  const balanceSheet = useMemo(() => {
    const getAccountSum = (cat: string) => accounts.filter(a => a.category === cat).reduce((sum, a) => sum + a.balance, 0);
    
    const assets = getAccountSum('Assets');
    const liabilities = getAccountSum('Liabilities');
    const equity = getAccountSum('Equity');
    
    // Retained Earnings is essentially the net profit from all time
    const allTimeIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const allTimeExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const retainedEarnings = allTimeIncome - allTimeExpense;

    return {
      assets: {
        cash: accounts.filter(a => a.type === 'Cash').reduce((sum, a) => sum + a.balance, 0),
        bank: accounts.filter(a => a.type === 'Bank').reduce((sum, a) => sum + a.balance, 0),
        mobile: accounts.filter(a => a.type === 'Mobile').reduce((sum, a) => sum + a.balance, 0),
        ar: accounts.filter(a => a.name.includes('Receivable')).reduce((sum, a) => sum + a.balance, 0),
        inventory: accounts.filter(a => a.name.includes('Inventory')).reduce((sum, a) => sum + a.balance, 0),
        total: assets
      },
      liabilities: {
        ap: accounts.filter(a => a.name.includes('Payable')).reduce((sum, a) => sum + a.balance, 0),
        loans: accounts.filter(a => a.name.includes('Loan')).reduce((sum, a) => sum + a.balance, 0),
        total: liabilities
      },
      equity: {
        investment: accounts.filter(a => a.name.includes('Investment')).reduce((sum, a) => sum + a.balance, 0),
        retainedEarnings,
        withdraw: accounts.filter(a => a.name.includes('Withdraw')).reduce((sum, a) => sum + a.balance, 0),
        total: equity + retainedEarnings
      }
    };
  }, [accounts, transactions]);

  const cashFlow = useMemo(() => {
    const filtered = transactions.filter(txn => {
      const date = txn.createdAt?.toDate ? txn.createdAt.toDate() : (txn.createdAt?.seconds ? new Date(txn.createdAt.seconds * 1000) : new Date(txn.date));
      const start = new Date(reportRange.start);
      const end = new Date(reportRange.end);
      end.setHours(23, 59, 59, 999);
      return date >= start && date <= end;
    });

    const inflow = filtered.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const outflow = filtered.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    
    // Categorized Inflow
    const salesInflow = filtered.filter(t => t.type === 'income' && t.category === 'Income').reduce((sum, t) => sum + t.amount, 0);
    const otherInflow = inflow - salesInflow;

    // Categorized Outflow
    const cogsOutflow = filtered.filter(t => t.type === 'expense' && t.category === 'COGS').reduce((sum, t) => sum + t.amount, 0);
    const expenseOutflow = filtered.filter(t => t.type === 'expense' && t.category === 'Expenses').reduce((sum, t) => sum + t.amount, 0);
    const otherOutflow = outflow - cogsOutflow - expenseOutflow;

    return {
      inflow: { sales: salesInflow, other: otherInflow, total: inflow },
      outflow: { cogs: cogsOutflow, expenses: expenseOutflow, other: otherOutflow, total: outflow },
      netCashFlow: inflow - outflow
    };
  }, [transactions, reportRange]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-[#141414] tracking-tight">Finance & Accounting</h2>
          <p className="text-sm text-gray-500 mt-1">Comprehensive financial management and reporting.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <Download size={16} />
            Export CSV
          </button>
          <button 
            onClick={() => handleOpenAccountModal()}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <Building2 size={16} />
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

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-gray-100/50 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'dashboard' ? 'bg-white text-[#141414] shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <LayoutDashboard size={14} />
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'transactions' ? 'bg-white text-[#141414] shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <History size={14} />
          Transactions
        </button>
        <button
          onClick={() => setActiveTab('coa')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'coa' ? 'bg-white text-[#141414] shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <ListTree size={14} />
          COA
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'reports' ? 'bg-white text-[#141414] shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <FileText size={14} />
          Reports
        </button>
        <button
          onClick={() => setActiveTab('ar_ap')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'ar_ap' ? 'bg-white text-[#141414] shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <ArrowRightLeft size={14} />
          A/R & A/P
        </button>
        <button
          onClick={() => setActiveTab('supplier_payments')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'supplier_payments' ? 'bg-white text-[#141414] shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Building2 size={14} />
          Supplier Payments
        </button>
        <button
          onClick={() => setActiveTab('petty_cash')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'petty_cash' ? 'bg-white text-[#141414] shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Wallet size={14} />
          Petty Cash
        </button>
      </div>

      {activeTab === 'dashboard' && (
        <>
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
        </>
      )}

      {activeTab === 'transactions' && (
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
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-gray-600">{txn.category}</span>
                          <span className="text-[10px] text-gray-400">{txn.subCategory}</span>
                        </div>
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
                        <span className={`text-sm font-bold ${txn.type === 'income' ? 'text-green-600' : txn.type === 'expense' ? 'text-red-600' : 'text-blue-600'}`}>
                          {txn.type === 'income' ? '+' : txn.type === 'expense' ? '-' : '⇄'} {currencySymbol} {(txn.amount || 0).toLocaleString()}
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
      )}

      {activeTab === 'coa' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(COA_STRUCTURE).map(([category, subCategories]) => (
            <div key={category} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#141414] uppercase tracking-wider">{category}</h3>
                <button 
                  onClick={() => {
                    setAccountForm({ ...accountForm, category: category as any });
                    setIsAccountModalOpen(true);
                  }}
                  className="p-1 text-gray-400 hover:text-[#141414] transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>
              <div className="p-4 space-y-4">
                {subCategories.map(sub => {
                  const subAccounts = accounts.filter(acc => acc.category === category && acc.name.includes(sub));
                  const totalBalance = subAccounts.reduce((sum, acc) => sum + acc.balance, 0);
                  return (
                    <div key={sub} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-600">{sub}</span>
                        <span className="text-xs font-bold text-[#141414]">{currencySymbol} {totalBalance.toLocaleString()}</span>
                      </div>
                      <div className="pl-4 space-y-1">
                        {accounts.filter(acc => acc.category === category && acc.name.includes(sub)).map(acc => (
                          <div key={acc.id} className="flex items-center justify-between text-[10px] text-gray-400 group">
                            <span>{acc.name}</span>
                            <div className="flex items-center gap-2">
                              <span>{currencySymbol} {acc.balance.toLocaleString()}</span>
                              <button onClick={() => handleOpenAccountModal(acc)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <Edit size={10} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div 
              onClick={() => setIsPnLModalOpen(true)}
              className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:border-[#141414] transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-[#141414] group-hover:text-white transition-all">
                  <FileText size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-[#141414]">Profit & Loss</h4>
                  <p className="text-xs text-gray-500">Revenue, COGS, and Expenses</p>
                </div>
              </div>
              <button className="w-full py-2 bg-gray-50 text-xs font-bold rounded-lg hover:bg-gray-100 transition-all">Generate Report</button>
            </div>
            <div 
              onClick={() => setIsBalanceSheetModalOpen(true)}
              className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:border-[#141414] transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-xl bg-green-50 text-green-600 group-hover:bg-[#141414] group-hover:text-white transition-all">
                  <Calculator size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-[#141414]">Balance Sheet</h4>
                  <p className="text-xs text-gray-500">Assets, Liabilities, and Equity</p>
                </div>
              </div>
              <button className="w-full py-2 bg-gray-50 text-xs font-bold rounded-lg hover:bg-gray-100 transition-all">Generate Report</button>
            </div>
            <div 
              onClick={() => setIsCashFlowModalOpen(true)}
              className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:border-[#141414] transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-xl bg-orange-50 text-orange-600 group-hover:bg-[#141414] group-hover:text-white transition-all">
                  <ArrowRightLeft size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-[#141414]">Cash Flow</h4>
                  <p className="text-xs text-gray-500">Inflow and Outflow tracking</p>
                </div>
              </div>
              <button className="w-full py-2 bg-gray-50 text-xs font-bold rounded-lg hover:bg-gray-100 transition-all">Generate Report</button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'ar_ap' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50">
              <h3 className="text-sm font-bold text-[#141414] uppercase tracking-wider">Accounts Receivable (A/R)</h3>
            </div>
            <div className="p-6 text-center text-gray-500 text-sm">
              <Users size={48} className="mx-auto mb-4 text-gray-200" />
              <p>Customer dues and pending payments will appear here.</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50">
              <h3 className="text-sm font-bold text-[#141414] uppercase tracking-wider">Accounts Payable (A/P)</h3>
            </div>
            <div className="p-6 text-center text-gray-500 text-sm">
              <Building2 size={48} className="mx-auto mb-4 text-gray-200" />
              <p>Supplier dues and unpaid expenses will appear here.</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'supplier_payments' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-lg font-bold">Supplier Payments</h3>
            <button 
              onClick={() => {
                setSupplierPaymentForm({
                  supplierId: '',
                  supplierName: '',
                  date: new Date().toISOString().split('T')[0],
                  voucherNo: '',
                  dueAmount: '',
                  amount: '',
                  total: '',
                  paymentType: 'Cash',
                  paidAmount: '',
                  remark: ''
                });
                setIsSupplierPaymentModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-[#141414] text-white rounded-lg text-xs font-bold hover:bg-black transition-all"
            >
              <Plus size={14} />
              Add Payment
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 text-[10px] uppercase tracking-widest text-gray-500">
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 font-semibold">Supplier</th>
                  <th className="px-6 py-4 font-semibold">Voucher No</th>
                  <th className="px-6 py-4 font-semibold">Due Amount</th>
                  <th className="px-6 py-4 font-semibold">Paid Amount</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {supplierPayments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Building2 className="text-gray-300" size={48} />
                        <span className="text-sm text-gray-500">No supplier payments found</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  supplierPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-6 py-4 text-sm text-gray-600">{payment.date}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-[#141414]">{payment.supplierName}</span>
                          <span className="text-[10px] text-gray-400">{payment.remark}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{payment.voucherNo}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{currencySymbol} {payment.dueAmount.toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-red-600">
                          {currencySymbol} {payment.paidAmount.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleDeleteSupplierPayment(payment.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'petty_cash' && <PettyCash />}

      {/* Supplier Payment Modal */}
      {isSupplierPaymentModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#141414]">Supplier Payment</h3>
              <button 
                onClick={() => setIsSupplierPaymentModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSupplierPaymentSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Date*</label>
                  <input
                    required
                    type="date"
                    className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all"
                    value={supplierPaymentForm.date}
                    onChange={(e) => setSupplierPaymentForm({...supplierPaymentForm, date: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Remark</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all"
                    placeholder="Optional notes"
                    value={supplierPaymentForm.remark}
                    onChange={(e) => setSupplierPaymentForm({...supplierPaymentForm, remark: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Supplier Name*</label>
                <select
                  required
                  className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all"
                  value={supplierPaymentForm.supplierId}
                  onChange={(e) => setSupplierPaymentForm({...supplierPaymentForm, supplierId: e.target.value})}
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Voucher No</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all"
                    placeholder="V-001"
                    value={supplierPaymentForm.voucherNo}
                    onChange={(e) => setSupplierPaymentForm({...supplierPaymentForm, voucherNo: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Due Amount</label>
                  <input
                    type="number"
                    className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all"
                    placeholder="0.00"
                    value={supplierPaymentForm.dueAmount}
                    onChange={(e) => setSupplierPaymentForm({...supplierPaymentForm, dueAmount: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Amount*</label>
                  <input
                    required
                    type="number"
                    className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all"
                    placeholder="0.00"
                    value={supplierPaymentForm.amount}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSupplierPaymentForm({
                        ...supplierPaymentForm, 
                        amount: val,
                        total: val,
                        paidAmount: val
                      });
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total</label>
                  <input
                    readOnly
                    type="number"
                    className="w-full px-4 py-2 bg-gray-100 border border-transparent rounded-lg text-sm outline-none"
                    value={supplierPaymentForm.total}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Payment Type</label>
                  <select
                    className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all"
                    value={supplierPaymentForm.paymentType}
                    onChange={(e) => setSupplierPaymentForm({...supplierPaymentForm, paymentType: e.target.value})}
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="bKash">bKash</option>
                    <option value="Nagad">Nagad</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Paid Amount</label>
                <input
                  required
                  type="number"
                  className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all font-bold text-green-600"
                  value={supplierPaymentForm.paidAmount}
                  onChange={(e) => setSupplierPaymentForm({...supplierPaymentForm, paidAmount: e.target.value})}
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsSupplierPaymentModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-[#141414] text-white rounded-lg text-sm font-medium hover:bg-black transition-colors"
                >
                  Save Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {isBalanceSheetModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <div>
                <h3 className="text-lg font-bold text-[#141414]">Balance Sheet</h3>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Financial Position Statement</p>
              </div>
              <button 
                onClick={() => setIsBalanceSheetModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              {/* Assets Section */}
              <section className="space-y-4">
                <div className="flex items-center justify-between border-b-2 border-gray-900 pb-2">
                  <h4 className="text-sm font-black uppercase tracking-widest">Assets</h4>
                  <span className="text-sm font-black">{currencySymbol} {balanceSheet.assets.total.toLocaleString()}</span>
                </div>
                <div className="space-y-2 pl-4">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Cash in Hand</span>
                    <span>{currencySymbol} {balanceSheet.assets.cash.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Bank Accounts</span>
                    <span>{currencySymbol} {balanceSheet.assets.bank.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Mobile Wallets</span>
                    <span>{currencySymbol} {balanceSheet.assets.mobile.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Accounts Receivable</span>
                    <span>{currencySymbol} {balanceSheet.assets.ar.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Inventory Value</span>
                    <span>{currencySymbol} {balanceSheet.assets.inventory.toLocaleString()}</span>
                  </div>
                </div>
              </section>

              {/* Liabilities Section */}
              <section className="space-y-4">
                <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                  <h4 className="text-sm font-black uppercase tracking-widest text-red-600">Liabilities</h4>
                  <span className="text-sm font-black text-red-600">{currencySymbol} {balanceSheet.liabilities.total.toLocaleString()}</span>
                </div>
                <div className="space-y-2 pl-4">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Accounts Payable</span>
                    <span>{currencySymbol} {balanceSheet.liabilities.ap.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Outstanding Loans</span>
                    <span>{currencySymbol} {balanceSheet.liabilities.loans.toLocaleString()}</span>
                  </div>
                </div>
              </section>

              {/* Equity Section */}
              <section className="space-y-4">
                <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                  <h4 className="text-sm font-black uppercase tracking-widest text-blue-600">Equity</h4>
                  <span className="text-sm font-black text-blue-600">{currencySymbol} {balanceSheet.equity.total.toLocaleString()}</span>
                </div>
                <div className="space-y-2 pl-4">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Owner Investment</span>
                    <span>{currencySymbol} {balanceSheet.equity.investment.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Retained Earnings (Net Profit)</span>
                    <span>{currencySymbol} {balanceSheet.equity.retainedEarnings.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-red-500 italic">
                    <span>(-) Owner Withdrawals</span>
                    <span>({currencySymbol} {balanceSheet.equity.withdraw.toLocaleString()})</span>
                  </div>
                </div>
              </section>

              {/* Balance Check */}
              <div className="bg-gray-900 text-white p-6 rounded-2xl flex items-center justify-between shadow-xl">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-widest opacity-80">Total Liabilities + Equity</h4>
                  <p className="text-[10px] opacity-60">Must equal Total Assets</p>
                </div>
                <span className="text-3xl font-black">
                  {currencySymbol} {(balanceSheet.liabilities.total + balanceSheet.equity.total).toLocaleString()}
                </span>
              </div>
              
              {Math.abs(balanceSheet.assets.total - (balanceSheet.liabilities.total + balanceSheet.equity.total)) > 1 && (
                <p className="text-center text-xs text-red-500 font-bold">⚠️ Balance Sheet is out of balance by {currencySymbol} {Math.abs(balanceSheet.assets.total - (balanceSheet.liabilities.total + balanceSheet.equity.total)).toLocaleString()}</p>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
              <p className="text-[10px] text-gray-400 italic">* As of {new Date().toLocaleDateString()}</p>
              <button 
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 bg-[#141414] text-white rounded-lg text-xs font-bold hover:bg-black transition-all"
              >
                <Download size={14} />
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cash Flow Modal */}
      {isCashFlowModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <div>
                <h3 className="text-lg font-bold text-[#141414]">Cash Flow Statement</h3>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Cash Inflow & Outflow Report</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                  <Calendar size={14} className="text-gray-400" />
                  <input 
                    type="date" 
                    className="bg-transparent text-xs outline-none" 
                    value={reportRange.start}
                    onChange={(e) => setReportRange({...reportRange, start: e.target.value})}
                  />
                  <span className="text-gray-300">-</span>
                  <input 
                    type="date" 
                    className="bg-transparent text-xs outline-none" 
                    value={reportRange.end}
                    onChange={(e) => setReportRange({...reportRange, end: e.target.value})}
                  />
                </div>
                <button 
                  onClick={() => setIsCashFlowModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              {/* Inflow Section */}
              <section className="space-y-4">
                <div className="flex items-center justify-between border-b-2 border-green-600 pb-2">
                  <h4 className="text-sm font-black uppercase tracking-widest text-green-600">Cash Inflow</h4>
                  <span className="text-sm font-black text-green-600">+{currencySymbol} {cashFlow.inflow.total.toLocaleString()}</span>
                </div>
                <div className="space-y-2 pl-4">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Sales Receipts</span>
                    <span>{currencySymbol} {cashFlow.inflow.sales.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Other Inflows</span>
                    <span>{currencySymbol} {cashFlow.inflow.other.toLocaleString()}</span>
                  </div>
                </div>
              </section>

              {/* Outflow Section */}
              <section className="space-y-4">
                <div className="flex items-center justify-between border-b-2 border-red-600 pb-2">
                  <h4 className="text-sm font-black uppercase tracking-widest text-red-600">Cash Outflow</h4>
                  <span className="text-sm font-black text-red-600">-{currencySymbol} {cashFlow.outflow.total.toLocaleString()}</span>
                </div>
                <div className="space-y-2 pl-4">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>COGS Payments</span>
                    <span>{currencySymbol} {cashFlow.outflow.cogs.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Operating Expenses</span>
                    <span>{currencySymbol} {cashFlow.outflow.expenses.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Other Outflows</span>
                    <span>{currencySymbol} {cashFlow.outflow.other.toLocaleString()}</span>
                  </div>
                </div>
              </section>

              {/* Net Cash Flow */}
              <div className={`p-6 rounded-2xl flex items-center justify-between ${cashFlow.netCashFlow >= 0 ? 'bg-green-600 text-white' : 'bg-red-600 text-white'} shadow-xl`}>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-widest opacity-80">Net Cash Flow</h4>
                  <p className="text-[10px] opacity-60">For the selected period</p>
                </div>
                <span className="text-3xl font-black">
                  {currencySymbol} {cashFlow.netCashFlow.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
              <p className="text-[10px] text-gray-400 italic">* This report shows actual cash movement during the period.</p>
              <button 
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 bg-[#141414] text-white rounded-lg text-xs font-bold hover:bg-black transition-all"
              >
                <Download size={14} />
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
      {isPnLModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <div>
                <h3 className="text-lg font-bold text-[#141414]">Profit & Loss Statement</h3>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Financial Performance Report</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                  <Calendar size={14} className="text-gray-400" />
                  <input 
                    type="date" 
                    className="bg-transparent text-xs outline-none" 
                    value={reportRange.start}
                    onChange={(e) => setReportRange({...reportRange, start: e.target.value})}
                  />
                  <span className="text-gray-300">-</span>
                  <input 
                    type="date" 
                    className="bg-transparent text-xs outline-none" 
                    value={reportRange.end}
                    onChange={(e) => setReportRange({...reportRange, end: e.target.value})}
                  />
                </div>
                <button 
                  onClick={() => setIsPnLModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              {/* Revenue Section */}
              <section className="space-y-4">
                <div className="flex items-center justify-between border-b-2 border-gray-900 pb-2">
                  <h4 className="text-sm font-black uppercase tracking-widest">Revenue</h4>
                  <span className="text-sm font-black">{currencySymbol} {pnlReport.revenue.total.toLocaleString()}</span>
                </div>
                <div className="space-y-2 pl-4">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Product Sales</span>
                    <span>{currencySymbol} {pnlReport.revenue.productSales.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Delivery Charge Income</span>
                    <span>{currencySymbol} {pnlReport.revenue.deliveryIncome.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Other Income</span>
                    <span>{currencySymbol} {pnlReport.revenue.otherIncome.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-red-500 italic">
                    <span>(-) Discounts & Offers</span>
                    <span>({currencySymbol} {pnlReport.revenue.discountAdjustment.toLocaleString()})</span>
                  </div>
                </div>
              </section>

              {/* COGS Section */}
              <section className="space-y-4">
                <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                  <h4 className="text-sm font-black uppercase tracking-widest">Cost of Goods Sold (COGS)</h4>
                  <span className="text-sm font-black text-red-600">({currencySymbol} {pnlReport.cogs.total.toLocaleString()})</span>
                </div>
                <div className="space-y-2 pl-4">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Product Cost</span>
                    <span>{currencySymbol} {pnlReport.cogs.productCost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Packaging Cost</span>
                    <span>{currencySymbol} {pnlReport.cogs.packagingCost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Delivery Cost (Shipping)</span>
                    <span>{currencySymbol} {pnlReport.cogs.deliveryCost.toLocaleString()}</span>
                  </div>
                </div>
              </section>

              {/* Gross Profit */}
              <div className="bg-gray-50 p-4 rounded-xl flex items-center justify-between border border-gray-100">
                <h4 className="text-sm font-black uppercase tracking-widest">Gross Profit</h4>
                <span className={`text-lg font-black ${pnlReport.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {currencySymbol} {pnlReport.grossProfit.toLocaleString()}
                </span>
              </div>

              {/* Expenses Section */}
              <section className="space-y-4">
                <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                  <h4 className="text-sm font-black uppercase tracking-widest">Operating Expenses</h4>
                  <span className="text-sm font-black text-red-600">({currencySymbol} {pnlReport.expenses.total.toLocaleString()})</span>
                </div>
                <div className="space-y-2 pl-4">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Marketing & Ads</span>
                    <span>{currencySymbol} {pnlReport.expenses.marketing.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Salaries & Wages</span>
                    <span>{currencySymbol} {pnlReport.expenses.salary.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Rent & Office</span>
                    <span>{currencySymbol} {pnlReport.expenses.rent.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Utilities</span>
                    <span>{currencySymbol} {pnlReport.expenses.utilities.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Courier Charges</span>
                    <span>{currencySymbol} {pnlReport.expenses.courierCharge.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Miscellaneous</span>
                    <span>{currencySymbol} {pnlReport.expenses.miscExpenses.toLocaleString()}</span>
                  </div>
                </div>
              </section>

              {/* Net Profit */}
              <div className={`p-6 rounded-2xl flex items-center justify-between ${pnlReport.netProfit >= 0 ? 'bg-green-600 text-white' : 'bg-red-600 text-white'} shadow-xl`}>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-widest opacity-80">Net Profit / Loss</h4>
                  <p className="text-[10px] opacity-60">After all costs and expenses</p>
                </div>
                <span className="text-3xl font-black">
                  {currencySymbol} {pnlReport.netProfit.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
              <p className="text-[10px] text-gray-400 italic">* This report is generated based on recorded transactions in the selected period.</p>
              <button 
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 bg-[#141414] text-white rounded-lg text-xs font-bold hover:bg-black transition-all"
              >
                <Download size={14} />
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
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
                    onChange={(e) => setTransactionForm({...transactionForm, type: e.target.value as any})}
                  >
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                    <option value="transfer">Transfer</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Category</label>
                  <select
                    required
                    className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all"
                    value={transactionForm.category}
                    onChange={(e) => setTransactionForm({...transactionForm, category: e.target.value})}
                  >
                    {Object.keys(COA_STRUCTURE).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Sub-Category</label>
                  <select
                    required
                    className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all"
                    value={transactionForm.subCategory}
                    onChange={(e) => setTransactionForm({...transactionForm, subCategory: e.target.value})}
                  >
                    {(COA_STRUCTURE[transactionForm.category as keyof typeof COA_STRUCTURE] || []).map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>
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
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    {transactionForm.type === 'transfer' ? 'From Account' : 'Account'}
                  </label>
                  <select
                    required
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
                {transactionForm.type === 'transfer' ? (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">To Account</label>
                    <select
                      required
                      className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all"
                      value={transactionForm.toAccountId}
                      onChange={(e) => setTransactionForm({...transactionForm, toAccountId: e.target.value})}
                    >
                      <option value="">Select Account</option>
                      {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.name}</option>
                      ))}
                    </select>
                  </div>
                ) : (
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
                )}
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
                    <option value="Asset">Asset</option>
                    <option value="Liability">Liability</option>
                    <option value="Equity">Equity</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Category</label>
                  <select
                    className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all"
                    value={accountForm.category}
                    onChange={(e) => setAccountForm({...accountForm, category: e.target.value as any})}
                  >
                    {Object.keys(COA_STRUCTURE).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
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
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Account Number (Optional)</label>
                  <input
                    className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all"
                    placeholder="e.g. 123456789"
                    value={accountForm.accountNumber}
                    onChange={(e) => setAccountForm({...accountForm, accountNumber: e.target.value})}
                  />
                </div>
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
