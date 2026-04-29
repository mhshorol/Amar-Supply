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
  History,
  ChevronRight,
  ChevronDown,
  Landmark
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
  db, 
  auth,
  collection, 
  onSnapshot, 
  addDoc, 
  deleteDoc,
  doc,
  query, 
  orderBy, 
  serverTimestamp,
  Timestamp,
  updateDoc,
  runTransaction
} from '../firebase';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { useSettings } from '../contexts/SettingsContext';
import PettyCash from './PettyCash';
import { Supplier, SupplierPayment } from '../types';
import ConfirmModal from './ConfirmModal';

interface Transaction {
  id: string;
  orderId: string;
  orderNumber?: number;
  type: 'income' | 'expense' | 'transfer';
  category: string;
  subCategory?: string;
  amount: number;
  method: string;
  paymentDetails?: { last4Digits: string };
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
  Expenses: ['Marketing', 'Salary', 'Rent', 'Utilities', 'Courier Charge', 'Damage & Wastage', 'Misc Expenses']
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
    if (!auth.currentUser) return;
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
      const amount = Number(transactionForm.amount);
      
      await runTransaction(db, async (transaction) => {
        const accountRef = doc(db, 'accounts', transactionForm.accountId);
        const accountSnap = await transaction.get(accountRef);
        
        if (!accountSnap.exists()) {
          throw new Error("Selected account does not exist.");
        }

        const currentBalance = accountSnap.data().balance || 0;
        let newBalance = currentBalance;

        if (transactionForm.type === 'income') {
          newBalance += amount;
        } else if (transactionForm.type === 'expense') {
          newBalance -= amount;
        } else if (transactionForm.type === 'transfer') {
          // Handle transfer
          if (!transactionForm.toAccountId) throw new Error("Target account required for transfer.");
          const toAccountRef = doc(db, 'accounts', transactionForm.toAccountId);
          const toAccountSnap = await transaction.get(toAccountRef);
          if (!toAccountSnap.exists()) throw new Error("Target account does not exist.");
          
          newBalance -= amount;
          const toNewBalance = (toAccountSnap.data().balance || 0) + amount;
          transaction.update(toAccountRef, { balance: toNewBalance, updatedAt: serverTimestamp() });
        }

        // Update source account balance
        transaction.update(accountRef, { balance: newBalance, updatedAt: serverTimestamp() });

        // Add/Update transaction
        const data = {
          orderId: transactionForm.orderId,
          type: transactionForm.type,
          category: transactionForm.category,
          subCategory: transactionForm.subCategory,
          amount: amount,
          method: transactionForm.method,
          accountId: transactionForm.accountId,
          toAccountId: transactionForm.toAccountId,
          status: transactionForm.status,
          notes: transactionForm.notes,
          updatedAt: serverTimestamp()
        };

        if (editingTransaction) {
          // Reverse old transaction
          const oldTxnRef = doc(db, 'transactions', editingTransaction.id);
          const oldTxnSnap = await transaction.get(oldTxnRef);
          
          if (oldTxnSnap.exists()) {
            const oldTxnData = oldTxnSnap.data() as Transaction;
            
            // Reverse old account
            const oldAccountRef = doc(db, 'accounts', oldTxnData.accountId);
            const oldAccountSnap = await transaction.get(oldAccountRef);
            if (oldAccountSnap.exists()) {
              let oldBalance = oldAccountSnap.data().balance || 0;
              if (oldTxnData.type === 'income') oldBalance -= oldTxnData.amount;
              else if (oldTxnData.type === 'expense') oldBalance += oldTxnData.amount;
              else if (oldTxnData.type === 'transfer') {
                oldBalance += oldTxnData.amount;
                if (oldTxnData.toAccountId) {
                  const oldToAccountRef = doc(db, 'accounts', oldTxnData.toAccountId);
                  const oldToAccountSnap = await transaction.get(oldToAccountRef);
                  if (oldToAccountSnap.exists()) {
                    const oldToBalance = (oldToAccountSnap.data().balance || 0) - oldTxnData.amount;
                    transaction.update(oldToAccountRef, { balance: oldToBalance, updatedAt: serverTimestamp() });
                  }
                }
              }
              // We need to apply the new transaction on top of the reversed old balance
              // If the account is the same, we update newBalance
              if (oldTxnData.accountId === transactionForm.accountId) {
                newBalance = oldBalance;
                if (transactionForm.type === 'income') newBalance += amount;
                else if (transactionForm.type === 'expense') newBalance -= amount;
                else if (transactionForm.type === 'transfer') newBalance -= amount;
              } else {
                transaction.update(oldAccountRef, { balance: oldBalance, updatedAt: serverTimestamp() });
              }
            }
          }
          
          transaction.update(doc(db, 'transactions', editingTransaction.id), data);
        } else {
          const txnRef = doc(collection(db, 'transactions'));
          transaction.set(txnRef, {
            ...data,
            date: new Date().toISOString().split('T')[0],
            createdAt: serverTimestamp(),
            uid: auth.currentUser!.uid
          });
        }
      });

      setIsModalOpen(false);
      toast.success('Transaction recorded and account balance updated.');
    } catch (error) {
      handleFirestoreError(error, editingTransaction ? OperationType.UPDATE : OperationType.CREATE, 'transactions');
    }
  };

  const handleSupplierPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    try {
      const selectedSupplier = suppliers.find(s => s.id === supplierPaymentForm.supplierId);
      const accountId = accounts.find(a => a.name === supplierPaymentForm.paymentType)?.id || accounts[0]?.id || '';
      
      if (!accountId) {
        throw new Error("No account found for payment.");
      }

      await runTransaction(db, async (transaction) => {
        const accountRef = doc(db, 'accounts', accountId);
        const accountSnap = await transaction.get(accountRef);
        
        if (!accountSnap.exists()) {
          throw new Error("Account not found.");
        }

        const currentBalance = accountSnap.data().balance || 0;
        const paidAmount = Number(supplierPaymentForm.paidAmount);

        const data = {
          supplierId: supplierPaymentForm.supplierId,
          supplierName: selectedSupplier?.name || '',
          date: supplierPaymentForm.date,
          voucherNo: supplierPaymentForm.voucherNo,
          dueAmount: Number(supplierPaymentForm.dueAmount),
          amount: Number(supplierPaymentForm.amount),
          total: Number(supplierPaymentForm.total),
          paymentType: supplierPaymentForm.paymentType,
          paidAmount: paidAmount,
          remark: supplierPaymentForm.remark,
          uid: auth.currentUser!.uid,
          createdAt: serverTimestamp()
        };

        const paymentRef = doc(collection(db, 'supplierPayments'));

        // Also create a transaction
        const txnRef = doc(collection(db, 'transactions'));
        transaction.set(txnRef, {
          type: 'expense',
          category: 'COGS',
          subCategory: 'Product Cost',
          amount: paidAmount,
          method: supplierPaymentForm.paymentType,
          accountId: accountId,
          date: supplierPaymentForm.date,
          status: 'Completed',
          notes: `Supplier Payment: ${selectedSupplier?.name} (Voucher: ${supplierPaymentForm.voucherNo})`,
          createdAt: serverTimestamp(),
          uid: auth.currentUser!.uid
        });

        transaction.set(paymentRef, {
          ...data,
          transactionId: txnRef.id
        });

        // Update account balance
        transaction.update(accountRef, {
          balance: currentBalance - paidAmount,
          updatedAt: serverTimestamp()
        });
      });

      setIsSupplierPaymentModalOpen(false);
      toast.success('Supplier payment recorded successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'supplierPayments');
    }
  };

  const handleDeleteSupplierPayment = async (id: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Delete Supplier Payment',
      message: 'Are you sure you want to delete this supplier payment? This will also reverse the account balance.',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await runTransaction(db, async (transaction) => {
            const paymentRef = doc(db, 'supplierPayments', id);
            const paymentSnap = await transaction.get(paymentRef);
            
            if (!paymentSnap.exists()) return;
            
            const paymentData = paymentSnap.data();
            
            if (paymentData.transactionId) {
              const txnRef = doc(db, 'transactions', paymentData.transactionId);
              const txnSnap = await transaction.get(txnRef);
              
              if (txnSnap.exists()) {
                const txnData = txnSnap.data();
                const accountRef = doc(db, 'accounts', txnData.accountId);
                const accountSnap = await transaction.get(accountRef);
                
                if (accountSnap.exists()) {
                  const currentBalance = accountSnap.data().balance || 0;
                  transaction.update(accountRef, {
                    balance: currentBalance + txnData.amount,
                    updatedAt: serverTimestamp()
                  });
                }
                transaction.delete(txnRef);
              }
            }
            
            transaction.delete(paymentRef);
          });
          toast.success('Supplier payment deleted and balance reversed');
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `supplierPayments/${id}`);
        }
      }
    });
  };

  const handleDeleteTransaction = async (id: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Delete Transaction',
      message: 'Are you sure you want to delete this transaction? This will also reverse the account balance change.',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await runTransaction(db, async (transaction) => {
            const txnRef = doc(db, 'transactions', id);
            const txnSnap = await transaction.get(txnRef);
            if (!txnSnap.exists()) return;
            
            const txnData = txnSnap.data() as Transaction;
            const accountRef = doc(db, 'accounts', txnData.accountId);
            const accountSnap = await transaction.get(accountRef);
            
            if (accountSnap.exists()) {
              let newBalance = accountSnap.data().balance || 0;
              if (txnData.type === 'income') newBalance -= txnData.amount;
              else if (txnData.type === 'expense') newBalance += txnData.amount;
              else if (txnData.type === 'transfer') {
                newBalance += txnData.amount;
                if (txnData.toAccountId) {
                  const toAccountRef = doc(db, 'accounts', txnData.toAccountId);
                  const toAccountSnap = await transaction.get(toAccountRef);
                  if (toAccountSnap.exists()) {
                    const toNewBalance = (toAccountSnap.data().balance || 0) - txnData.amount;
                    transaction.update(toAccountRef, { balance: toNewBalance, updatedAt: serverTimestamp() });
                  }
                }
              }
              transaction.update(accountRef, { balance: newBalance, updatedAt: serverTimestamp() });
            }
            
            transaction.delete(txnRef);
          });
          toast.success('Transaction deleted and balance reversed');
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `transactions/${id}`);
        }
      }
    });
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
    <div className="space-y-6 max-w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-hover/10 p-2 rounded-xl">
        <div>
          <h2 className="text-[28px] font-bold text-primary tracking-tight">Finance & Accounting</h2>
          <p className="text-[13px] text-secondary mt-1">Comprehensive financial management and reporting.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2.5 bg-surface border border-border rounded-lg text-[13px] font-semibold hover:bg-surface-hover transition-all shadow-subtle"
          >
            <Download size={16} strokeWidth={2.5} />
            Export CSV
          </button>
          <button 
            onClick={() => handleOpenAccountModal()}
            className="flex items-center gap-2 px-4 py-2.5 bg-surface border border-border rounded-lg text-[13px] font-semibold hover:bg-surface-hover transition-all shadow-subtle"
          >
            <Building2 size={16} strokeWidth={2.5} />
            Add Account
          </button>
          <button 
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand text-white rounded-lg text-[13px] font-bold hover:bg-brand-hover transition-all shadow-subtle"
          >
            <Plus size={16} strokeWidth={2.5} />
            Add Transaction
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-surface rounded-xl border border-border/60 shadow-subtle flex overflow-x-auto">
        {([
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'transactions', label: 'Transactions', icon: History },
          { id: 'coa', label: 'COA', icon: ListTree },
          { id: 'reports', label: 'Reports', icon: FileText },
          { id: 'ar_ap', label: 'A/R & A/P', icon: ArrowRightLeft },
          { id: 'supplier_payments', label: 'Supplier Payments', icon: Users },
          { id: 'petty_cash', label: 'Petty Cash', icon: Wallet }
        ] as Array<{ id: 'dashboard' | 'transactions' | 'coa' | 'reports' | 'ar_ap' | 'supplier_payments' | 'petty_cash', label: string, icon: any }>).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as 'dashboard' | 'transactions' | 'coa' | 'reports' | 'ar_ap' | 'supplier_payments' | 'petty_cash')}
            className={`whitespace-nowrap px-6 py-4 text-[13px] font-bold transition-all relative flex items-center gap-2 ${
              activeTab === tab.id ? 'text-brand' : 'text-secondary hover:text-secondary hover:bg-surface-hover'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand"></div>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'dashboard' && (
        <>
          {/* Main Account Card */}
          <div className="bg-surface p-6 rounded-2xl border border-border shadow-subtle relative group flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-brand/10 text-brand flex items-center justify-center">
                  <Landmark size={24} strokeWidth={2} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-primary group-hover:text-brand transition-colors">{accounts[0]?.name || 'City Bank'}</h3>
                  <p className="text-[13px] text-secondary">{accounts[0]?.accountNumber || '1223349433001'}</p>
                </div>
              </div>
              <ChevronRight size={20} className="text-muted group-hover:text-primary transition-colors cursor-pointer" />
            </div>
            <div>
              <p className="text-[13px] text-secondary mb-1">Current Balance</p>
              <h2 className="text-[28px] font-black text-primary tracking-tight">{currencySymbol} {(accounts[0]?.balance || 561400).toLocaleString()}</h2>
            </div>
          </div>

          {/* Top 4 Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-surface p-6 rounded-2xl border border-border shadow-subtle flex flex-col justify-between">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 shrink-0 rounded-full bg-green-50 text-green-500 flex items-center justify-center">
                  <TrendingUp size={22} strokeWidth={2} />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-secondary tracking-wide">Total Revenue</p>
                  <h3 className="text-[22px] font-black text-primary mt-1">{currencySymbol} {(totalIncome || 19800).toLocaleString()}</h3>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-6">
                <span className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-600 rounded-md text-[11px] font-bold">
                  <ArrowUpRight size={14} /> 12%
                </span>
                <span className="text-[11px] text-muted font-medium">vs last month</span>
              </div>
            </div>

            <div className="bg-surface p-6 rounded-2xl border border-border shadow-subtle flex flex-col justify-between">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 shrink-0 rounded-full bg-red-50 text-red-500 flex items-center justify-center">
                  <TrendingDown size={22} strokeWidth={2} />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-secondary tracking-wide">Total Expenses</p>
                  <h3 className="text-[22px] font-black text-primary mt-1">{currencySymbol} {(totalExpense || 1000).toLocaleString()}</h3>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-6">
                <span className="flex items-center gap-1 px-2 py-1 bg-red-50 text-red-600 rounded-md text-[11px] font-bold">
                  <ArrowDownRight size={14} /> 5%
                </span>
                <span className="text-[11px] text-muted font-medium">vs last month</span>
              </div>
            </div>

            <div className="bg-surface p-6 rounded-2xl border border-border shadow-subtle flex flex-col justify-between">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 shrink-0 rounded-full bg-brand/10 text-brand flex items-center justify-center">
                  <DollarSign size={22} strokeWidth={2} />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-secondary tracking-wide">Net Profit</p>
                  <h3 className="text-[22px] font-black text-primary mt-1">{currencySymbol} {(netProfit || 18800).toLocaleString()}</h3>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-6">
                <span className="flex items-center gap-1 px-2 py-1 bg-brand/10 text-brand rounded-md text-[11px] font-bold">
                  <ArrowUpRight size={14} /> 15%
                </span>
                <span className="text-[11px] text-muted font-medium">vs last month</span>
              </div>
            </div>

            <div className="bg-surface p-6 rounded-2xl border border-border shadow-subtle flex flex-col justify-between relative">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 shrink-0 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center">
                  <Wallet size={22} strokeWidth={2} />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-secondary tracking-wide">Pending COD</p>
                  <h3 className="text-[22px] font-black text-primary mt-1">{currencySymbol} {(pendingCod || 0).toLocaleString()}</h3>
                </div>
              </div>
              <div className="flex items-end justify-end mt-6 h-full absolute bottom-6 right-6">
                 <span className="px-3 py-1 bg-orange-50 text-orange-600 rounded-full text-[11px] font-bold">Pending</span>
              </div>
            </div>
          </div>

          {/* Chart Section */}
          <div className="bg-surface p-6 md:p-8 rounded-2xl border border-border shadow-subtle">
            <div className="flex flex-col md:flex-row md:items-start justify-between mb-8 gap-4">
              <div>
                <h3 className="text-[16px] font-bold text-primary">Income vs Expense</h3>
                <p className="text-[12px] text-secondary mt-1">Overview of income and expense over time.</p>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <button className="flex items-center gap-2 px-3 py-2 bg-surface border border-border rounded-lg text-[13px] text-secondary">
                  <Calendar size={14} className="text-muted" />
                  Nov 1, 2024 - Apr 30, 2025
                  <ChevronDown size={14} className="ml-1 text-muted" />
                </button>
                <button className="flex items-center gap-2 px-3 py-2 bg-surface border border-border rounded-lg text-[13px] text-secondary">
                  Monthly
                  <ChevronDown size={14} className="ml-1 text-muted" />
                </button>
                <div className="flex items-center gap-4 ml-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-900 dark:bg-white text-white dark:text-black"></div>
                    <span className="text-[12px] text-secondary font-medium">Income</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-gray-200"></div>
                    <span className="text-[12px] text-secondary font-medium">Expense</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                  <XAxis dataKey="name" axisLine={{ stroke: 'var(--color-border)' }} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-muted)' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--color-muted)' }} />
                  <Tooltip cursor={{ fill: 'var(--color-surface-hover)' }} contentStyle={{ borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)', boxShadow: 'var(--shadow-subtle)' }} />
                  <Bar dataKey="income" fill="var(--color-brand)" radius={[4, 4, 0, 0]} barSize={24} />
                  <Bar dataKey="expense" fill="var(--color-border)" radius={[4, 4, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Bottom Stats Block */}
          <div className="bg-surface p-6 rounded-2xl border border-border shadow-subtle flex flex-wrap items-center justify-between gap-6 overflow-x-auto">
             <div className="flex items-center gap-4 min-w-[120px]">
               <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
                 <Building2 size={20} strokeWidth={2} />
               </div>
               <div>
                 <p className="text-[11px] text-muted font-bold tracking-wide">Total Accounts</p>
                 <p className="text-[18px] font-black text-primary">{accounts.length || 8}</p>
               </div>
             </div>
             
             <div className="flex items-center gap-4 min-w-[120px]">
               <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                 <FileText size={20} strokeWidth={2} />
               </div>
               <div>
                 <p className="text-[11px] text-muted font-bold tracking-wide">Total Transactions</p>
                 <p className="text-[18px] font-black text-primary">{filteredTransactions.length || 156}</p>
               </div>
             </div>
             
             <div className="flex items-center gap-4 min-w-[120px]">
               <div className="w-10 h-10 rounded-xl bg-green-50 text-green-500 flex items-center justify-center">
                 <ArrowUpRight size={20} strokeWidth={2} />
               </div>
               <div>
                 <p className="text-[11px] text-muted font-bold tracking-wide">This Month Revenue</p>
                 <p className="text-[18px] font-black text-primary">{currencySymbol} {(totalIncome || 19800).toLocaleString()}</p>
               </div>
             </div>
             
             <div className="flex items-center gap-4 min-w-[120px]">
               <div className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center">
                 <ArrowDownRight size={20} strokeWidth={2} />
               </div>
               <div>
                 <p className="text-[11px] text-muted font-bold tracking-wide">This Month Expenses</p>
                 <p className="text-[18px] font-black text-primary">{currencySymbol} {(totalExpense || 1000).toLocaleString()}</p>
               </div>
             </div>
             
             <div className="flex items-center gap-4 min-w-[120px]">
               <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
                 <PieChartIcon size={20} strokeWidth={2} />
               </div>
               <div>
                 <p className="text-[11px] text-muted font-bold tracking-wide">Profit Margin</p>
                 <p className="text-[18px] font-black text-primary">{totalIncome ? ((netProfit / totalIncome) * 100).toFixed(1) : '94.9'}%</p>
               </div>
             </div>
          </div>
        </>
      )}

      {activeTab === 'transactions' && (
        <div className="bg-surface rounded-xl border border-border shadow-subtle overflow-hidden min-h-[400px]">
          <div className="p-6 border-b border-border flex items-center justify-between">
            <h3 className="text-lg font-bold">Recent Transactions</h3>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={14} />
                <input
                  type="text"
                  placeholder="Search..."
                  className="pl-8 pr-4 py-1.5 bg-surface-hover border border-transparent rounded-lg text-xs focus:bg-surface focus:border-border outline-none transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button className="p-1.5 bg-surface-hover text-secondary rounded-lg hover:bg-surface-hover transition-all">
                <Filter size={14} />
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[800px] whitespace-nowrap">
              <thead>
                <tr className="bg-surface-hover text-[10px] uppercase tracking-widest text-secondary">
                  <th className="px-6 py-4 font-semibold">Transaction ID</th>
                  <th className="px-6 py-4 font-semibold">Category</th>
                  <th className="px-6 py-4 font-semibold">Method</th>
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 font-semibold">Amount</th>
                  <th className="px-6 py-4 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="animate-spin text-muted" size={24} />
                        <span className="text-sm text-secondary">Loading transactions...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Wallet className="text-muted" size={48} />
                        <span className="text-sm text-secondary">No transactions found</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((txn) => (
                    <tr key={txn.id} className="hover:bg-surface-hover transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-mono font-bold text-primary">{txn.id}</span>
                          <span className="text-[10px] text-muted mt-1 uppercase tracking-wider">#{txn.orderNumber || txn.orderId?.slice(0, 8)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-medium text-secondary">{txn.category}</span>
                          <span className="text-[10px] text-muted">{txn.subCategory}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-xs text-secondary">
                          <CreditCard size={12} className="text-muted" />
                          <span>{txn.method}</span>
                          {txn.paymentDetails?.last4Digits && (
                            <span className="text-[10px] bg-surface-hover border border-border text-secondary px-1.5 py-0.5 rounded ml-1 font-mono">
                              *{txn.paymentDetails.last4Digits}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-xs text-secondary">
                          <Calendar size={12} className="text-muted" />
                          {(txn.date as any)?.toDate ? (txn.date as any).toDate().toLocaleDateString() : ((txn.date as any)?.seconds ? new Date((txn.date as any).seconds * 1000).toLocaleDateString() : 'N/A')}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-sm font-bold ${txn.type === 'income' ? 'text-green-600' : txn.type === 'expense' ? 'text-red-600' : 'text-brand'}`}>
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
                              className="p-1.5 text-muted hover:text-brand hover:bg-brand/10 rounded-md transition-all" 
                              title="Edit"
                            >
                              <Edit size={14} />
                            </button>
                            <button 
                              onClick={() => handleDeleteTransaction(txn.id)}
                              className="p-1.5 text-muted hover:text-red-600 hover:bg-red-50 rounded-md transition-all" 
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
            <div key={category} className="bg-surface rounded-xl border border-border shadow-subtle overflow-hidden">
              <div className="p-4 border-b border-border bg-surface-hover flex items-center justify-between">
                <h3 className="text-sm font-bold text-primary uppercase tracking-wider">{category}</h3>
                <button 
                  onClick={() => {
                    setAccountForm({ ...accountForm, category: category as any });
                    setIsAccountModalOpen(true);
                  }}
                  className="p-1 text-muted hover:text-primary transition-colors"
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
                        <span className="text-xs font-medium text-secondary">{sub}</span>
                        <span className="text-xs font-bold text-primary">{currencySymbol} {(totalBalance || 0).toLocaleString()}</span>
                      </div>
                      <div className="pl-4 space-y-1">
                        {accounts.filter(acc => acc.category === category && acc.name.includes(sub)).map(acc => (
                          <div key={acc.id} className="flex items-center justify-between text-[10px] text-muted group">
                            <span>{acc.name}</span>
                            <div className="flex items-center gap-2">
                              <span>{currencySymbol} {(acc.balance || 0).toLocaleString()}</span>
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
              className="bg-surface p-6 rounded-xl border border-border shadow-subtle hover:border-slate-900 dark:border-white transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-xl bg-brand/10 text-brand group-hover:bg-slate-900 group-hover:dark:bg-white group-hover:text-white group-hover:dark:text-black transition-all">
                  <FileText size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-primary">Profit & Loss</h4>
                  <p className="text-xs text-secondary">Revenue, COGS, and Expenses</p>
                </div>
              </div>
              <button className="w-full py-2 bg-surface-hover text-xs font-bold rounded-lg hover:bg-surface-hover transition-all">Generate Report</button>
            </div>
            <div 
              onClick={() => setIsBalanceSheetModalOpen(true)}
              className="bg-surface p-6 rounded-xl border border-border shadow-subtle hover:border-slate-900 dark:border-white transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-xl bg-green-50 text-green-600 group-hover:bg-slate-900 group-hover:dark:bg-white group-hover:text-white group-hover:dark:text-black transition-all">
                  <Calculator size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-primary">Balance Sheet</h4>
                  <p className="text-xs text-secondary">Assets, Liabilities, and Equity</p>
                </div>
              </div>
              <button className="w-full py-2 bg-surface-hover text-xs font-bold rounded-lg hover:bg-surface-hover transition-all">Generate Report</button>
            </div>
            <div 
              onClick={() => setIsCashFlowModalOpen(true)}
              className="bg-surface p-6 rounded-xl border border-border shadow-subtle hover:border-slate-900 dark:border-white transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-xl bg-orange-50 text-orange-600 group-hover:bg-slate-900 group-hover:dark:bg-white group-hover:text-white group-hover:dark:text-black transition-all">
                  <ArrowRightLeft size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-primary">Cash Flow</h4>
                  <p className="text-xs text-secondary">Inflow and Outflow tracking</p>
                </div>
              </div>
              <button className="w-full py-2 bg-surface-hover text-xs font-bold rounded-lg hover:bg-surface-hover transition-all">Generate Report</button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'ar_ap' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-surface rounded-xl border border-border shadow-subtle overflow-hidden">
            <div className="p-4 border-b border-border bg-surface-hover">
              <h3 className="text-sm font-bold text-primary uppercase tracking-wider">Accounts Receivable (A/R)</h3>
            </div>
            <div className="p-6 text-center text-secondary text-sm">
              <Users size={48} className="mx-auto mb-4 text-muted" />
              <p>Customer dues and pending payments will appear here.</p>
            </div>
          </div>
          <div className="bg-surface rounded-xl border border-border shadow-subtle overflow-hidden">
            <div className="p-4 border-b border-border bg-surface-hover">
              <h3 className="text-sm font-bold text-primary uppercase tracking-wider">Accounts Payable (A/P)</h3>
            </div>
            <div className="p-6 text-center text-secondary text-sm">
              <Building2 size={48} className="mx-auto mb-4 text-muted" />
              <p>Supplier dues and unpaid expenses will appear here.</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'supplier_payments' && (
        <div className="bg-surface rounded-xl border border-border shadow-subtle overflow-hidden min-h-[400px]">
          <div className="p-6 border-b border-border flex items-center justify-between">
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
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-black rounded-lg text-xs font-bold hover:bg-black transition-all"
            >
              <Plus size={14} />
              Add Payment
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[800px] whitespace-nowrap">
              <thead>
                <tr className="bg-surface-hover text-[10px] uppercase tracking-widest text-secondary">
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 font-semibold">Supplier</th>
                  <th className="px-6 py-4 font-semibold">Voucher No</th>
                  <th className="px-6 py-4 font-semibold">Due Amount</th>
                  <th className="px-6 py-4 font-semibold">Paid Amount</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {supplierPayments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Building2 className="text-muted" size={48} />
                        <span className="text-sm text-secondary">No supplier payments found</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  supplierPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-surface-hover transition-colors group">
                      <td className="px-6 py-4 text-sm text-secondary">{payment.date}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-primary">{payment.supplierName}</span>
                          <span className="text-[10px] text-muted">{payment.remark}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-secondary">{payment.voucherNo}</td>
                      <td className="px-6 py-4 text-sm text-secondary">{currencySymbol} {(payment.dueAmount || 0).toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-red-600">
                          {currencySymbol} {(payment.paidAmount || 0).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleDeleteSupplierPayment(payment.id)}
                          className="p-1.5 text-muted hover:text-red-600 hover:bg-red-50 rounded-md transition-all opacity-0 group-hover:opacity-100"
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
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-bold text-primary">Supplier Payment</h3>
              <button 
                onClick={() => setIsSupplierPaymentModalOpen(false)}
                className="p-2 hover:bg-surface-hover rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSupplierPaymentSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-secondary uppercase tracking-wider">Date*</label>
                  <input
                    required
                    type="date"
                    className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all"
                    value={supplierPaymentForm.date}
                    onChange={(e) => setSupplierPaymentForm({...supplierPaymentForm, date: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-secondary uppercase tracking-wider">Remark</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all"
                    placeholder="Optional notes"
                    value={supplierPaymentForm.remark}
                    onChange={(e) => setSupplierPaymentForm({...supplierPaymentForm, remark: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-secondary uppercase tracking-wider">Supplier Name*</label>
                <select
                  required
                  className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all"
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
                  <label className="text-xs font-bold text-secondary uppercase tracking-wider">Voucher No</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all"
                    placeholder="V-001"
                    value={supplierPaymentForm.voucherNo}
                    onChange={(e) => setSupplierPaymentForm({...supplierPaymentForm, voucherNo: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-secondary uppercase tracking-wider">Due Amount</label>
                  <input
                    type="number"
                    className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all"
                    placeholder="0.00"
                    value={supplierPaymentForm.dueAmount}
                    onChange={(e) => setSupplierPaymentForm({...supplierPaymentForm, dueAmount: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-secondary uppercase tracking-wider">Amount*</label>
                  <input
                    required
                    type="number"
                    className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all"
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

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-secondary uppercase tracking-wider">Total</label>
                  <input
                    readOnly
                    type="number"
                    className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm outline-none"
                    value={supplierPaymentForm.total}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-secondary uppercase tracking-wider">Payment Type</label>
                  <select
                    className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all"
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
                <label className="text-xs font-bold text-secondary uppercase tracking-wider">Paid Amount</label>
                <input
                  required
                  type="number"
                  className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all font-bold text-green-600"
                  value={supplierPaymentForm.paidAmount}
                  onChange={(e) => setSupplierPaymentForm({...supplierPaymentForm, paidAmount: e.target.value})}
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsSupplierPaymentModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-surface-hover transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-black rounded-lg text-sm font-medium hover:bg-black transition-colors"
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
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface sticky top-0 z-10">
              <div>
                <h3 className="text-lg font-bold text-primary">Balance Sheet</h3>
                <p className="text-[10px] text-muted uppercase tracking-widest font-bold">Financial Position Statement</p>
              </div>
              <button 
                onClick={() => setIsBalanceSheetModalOpen(false)}
                className="p-2 hover:bg-surface-hover rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              {/* Assets Section */}
              <section className="space-y-4">
                <div className="flex items-center justify-between border-b-2 border-gray-900 pb-2">
                  <h4 className="text-sm font-black uppercase tracking-widest">Assets</h4>
                  <span className="text-sm font-black">{currencySymbol} {(balanceSheet.assets.total || 0).toLocaleString()}</span>
                </div>
                <div className="space-y-2 pl-4">
                  <div className="flex justify-between text-sm text-secondary">
                    <span>Cash in Hand</span>
                    <span>{currencySymbol} {(balanceSheet.assets.cash || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-secondary">
                    <span>Bank Accounts</span>
                    <span>{currencySymbol} {(balanceSheet.assets.bank || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-secondary">
                    <span>Mobile Wallets</span>
                    <span>{currencySymbol} {(balanceSheet.assets.mobile || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-secondary">
                    <span>Accounts Receivable</span>
                    <span>{currencySymbol} {(balanceSheet.assets.ar || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-secondary">
                    <span>Inventory Value</span>
                    <span>{currencySymbol} {(balanceSheet.assets.inventory || 0).toLocaleString()}</span>
                  </div>
                </div>
              </section>

              {/* Liabilities Section */}
              <section className="space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <h4 className="text-sm font-black uppercase tracking-widest text-red-600">Liabilities</h4>
                  <span className="text-sm font-black text-red-600">{currencySymbol} {(balanceSheet.liabilities.total || 0).toLocaleString()}</span>
                </div>
                <div className="space-y-2 pl-4">
                  <div className="flex justify-between text-sm text-secondary">
                    <span>Accounts Payable</span>
                    <span>{currencySymbol} {(balanceSheet.liabilities.ap || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-secondary">
                    <span>Outstanding Loans</span>
                    <span>{currencySymbol} {(balanceSheet.liabilities.loans || 0).toLocaleString()}</span>
                  </div>
                </div>
              </section>

              {/* Equity Section */}
              <section className="space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <h4 className="text-sm font-black uppercase tracking-widest text-brand">Equity</h4>
                  <span className="text-sm font-black text-brand">{currencySymbol} {(balanceSheet.equity.total || 0).toLocaleString()}</span>
                </div>
                <div className="space-y-2 pl-4">
                  <div className="flex justify-between text-sm text-secondary">
                    <span>Owner Investment</span>
                    <span>{currencySymbol} {(balanceSheet.equity.investment || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-secondary">
                    <span>Retained Earnings (Net Profit)</span>
                    <span>{currencySymbol} {(balanceSheet.equity.retainedEarnings || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-red-500 italic">
                    <span>(-) Owner Withdrawals</span>
                    <span>({currencySymbol} {(balanceSheet.equity.withdraw || 0).toLocaleString()})</span>
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
                  {currencySymbol} {(balanceSheet.liabilities.total + balanceSheet.equity.total || 0).toLocaleString()}
                </span>
              </div>
              
              {Math.abs(balanceSheet.assets.total - (balanceSheet.liabilities.total + balanceSheet.equity.total)) > 1 && (
                <p className="text-center text-xs text-red-500 font-bold">⚠️ Balance Sheet is out of balance by {currencySymbol} {(Math.abs(balanceSheet.assets.total - (balanceSheet.liabilities.total + balanceSheet.equity.total)) || 0).toLocaleString()}</p>
              )}
            </div>

            <div className="px-6 py-4 border-t border-border bg-surface-hover flex items-center justify-between">
              <p className="text-[10px] text-muted italic">* As of {new Date().toLocaleDateString()}</p>
              <button 
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-black rounded-lg text-xs font-bold hover:bg-black transition-all"
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
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface sticky top-0 z-10">
              <div>
                <h3 className="text-lg font-bold text-primary">Cash Flow Statement</h3>
                <p className="text-[10px] text-muted uppercase tracking-widest font-bold">Cash Inflow & Outflow Report</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-surface-hover px-3 py-1.5 rounded-lg border border-border">
                  <Calendar size={14} className="text-muted" />
                  <input 
                    type="date" 
                    className="bg-transparent text-xs outline-none" 
                    value={reportRange.start}
                    onChange={(e) => setReportRange({...reportRange, start: e.target.value})}
                  />
                  <span className="text-muted">-</span>
                  <input 
                    type="date" 
                    className="bg-transparent text-xs outline-none" 
                    value={reportRange.end}
                    onChange={(e) => setReportRange({...reportRange, end: e.target.value})}
                  />
                </div>
                <button 
                  onClick={() => setIsCashFlowModalOpen(false)}
                  className="p-2 hover:bg-surface-hover rounded-full transition-colors"
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
                  <span className="text-sm font-black text-green-600">+{currencySymbol} {(cashFlow.inflow.total || 0).toLocaleString()}</span>
                </div>
                <div className="space-y-2 pl-4">
                  <div className="flex justify-between text-sm text-secondary">
                    <span>Sales Receipts</span>
                    <span>{currencySymbol} {(cashFlow.inflow.sales || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-secondary">
                    <span>Other Inflows</span>
                    <span>{currencySymbol} {(cashFlow.inflow.other || 0).toLocaleString()}</span>
                  </div>
                </div>
              </section>

              {/* Outflow Section */}
              <section className="space-y-4">
                <div className="flex items-center justify-between border-b-2 border-red-600 pb-2">
                  <h4 className="text-sm font-black uppercase tracking-widest text-red-600">Cash Outflow</h4>
                  <span className="text-sm font-black text-red-600">-{currencySymbol} {(cashFlow.outflow.total || 0).toLocaleString()}</span>
                </div>
                <div className="space-y-2 pl-4">
                  <div className="flex justify-between text-sm text-secondary">
                    <span>COGS Payments</span>
                    <span>{currencySymbol} {(cashFlow.outflow.cogs || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-secondary">
                    <span>Operating Expenses</span>
                    <span>{currencySymbol} {(cashFlow.outflow.expenses || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-secondary">
                    <span>Other Outflows</span>
                    <span>{currencySymbol} {(cashFlow.outflow.other || 0).toLocaleString()}</span>
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
                  {currencySymbol} {(cashFlow.netCashFlow || 0).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border bg-surface-hover flex items-center justify-between">
              <p className="text-[10px] text-muted italic">* This report shows actual cash movement during the period.</p>
              <button 
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-black rounded-lg text-xs font-bold hover:bg-black transition-all"
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
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface sticky top-0 z-10">
              <div>
                <h3 className="text-lg font-bold text-primary">Profit & Loss Statement</h3>
                <p className="text-[10px] text-muted uppercase tracking-widest font-bold">Financial Performance Report</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-surface-hover px-3 py-1.5 rounded-lg border border-border">
                  <Calendar size={14} className="text-muted" />
                  <input 
                    type="date" 
                    className="bg-transparent text-xs outline-none" 
                    value={reportRange.start}
                    onChange={(e) => setReportRange({...reportRange, start: e.target.value})}
                  />
                  <span className="text-muted">-</span>
                  <input 
                    type="date" 
                    className="bg-transparent text-xs outline-none" 
                    value={reportRange.end}
                    onChange={(e) => setReportRange({...reportRange, end: e.target.value})}
                  />
                </div>
                <button 
                  onClick={() => setIsPnLModalOpen(false)}
                  className="p-2 hover:bg-surface-hover rounded-full transition-colors"
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
                  <span className="text-sm font-black">{currencySymbol} {(pnlReport.revenue.total || 0).toLocaleString()}</span>
                </div>
                <div className="space-y-2 pl-4">
                  <div className="flex justify-between text-sm text-secondary">
                    <span>Product Sales</span>
                    <span>{currencySymbol} {(pnlReport.revenue.productSales || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-secondary">
                    <span>Delivery Charge Income</span>
                    <span>{currencySymbol} {(pnlReport.revenue.deliveryIncome || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-secondary">
                    <span>Other Income</span>
                    <span>{currencySymbol} {(pnlReport.revenue.otherIncome || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-red-500 italic">
                    <span>(-) Discounts & Offers</span>
                    <span>({currencySymbol} {(pnlReport.revenue.discountAdjustment || 0).toLocaleString()})</span>
                  </div>
                </div>
              </section>

              {/* COGS Section */}
              <section className="space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <h4 className="text-sm font-black uppercase tracking-widest">Cost of Goods Sold (COGS)</h4>
                  <span className="text-sm font-black text-red-600">({currencySymbol} {(pnlReport.cogs.total || 0).toLocaleString()})</span>
                </div>
                <div className="space-y-2 pl-4">
                  <div className="flex justify-between text-sm text-secondary">
                    <span>Product Cost</span>
                    <span>{currencySymbol} {(pnlReport.cogs.productCost || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-secondary">
                    <span>Packaging Cost</span>
                    <span>{currencySymbol} {(pnlReport.cogs.packagingCost || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-secondary">
                    <span>Delivery Cost (Shipping)</span>
                    <span>{currencySymbol} {(pnlReport.cogs.deliveryCost || 0).toLocaleString()}</span>
                  </div>
                </div>
              </section>

              {/* Gross Profit */}
              <div className="bg-surface-hover p-4 rounded-xl flex items-center justify-between border border-border">
                <h4 className="text-sm font-black uppercase tracking-widest">Gross Profit</h4>
                <span className={`text-lg font-black ${pnlReport.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {currencySymbol} {(pnlReport.grossProfit || 0).toLocaleString()}
                </span>
              </div>

              {/* Expenses Section */}
              <section className="space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <h4 className="text-sm font-black uppercase tracking-widest">Operating Expenses</h4>
                  <span className="text-sm font-black text-red-600">({currencySymbol} {(pnlReport.expenses.total || 0).toLocaleString()})</span>
                </div>
                <div className="space-y-2 pl-4">
                  <div className="flex justify-between text-sm text-secondary">
                    <span>Marketing & Ads</span>
                    <span>{currencySymbol} {(pnlReport.expenses.marketing || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-secondary">
                    <span>Salaries & Wages</span>
                    <span>{currencySymbol} {(pnlReport.expenses.salary || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-secondary">
                    <span>Rent & Office</span>
                    <span>{currencySymbol} {(pnlReport.expenses.rent || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-secondary">
                    <span>Utilities</span>
                    <span>{currencySymbol} {(pnlReport.expenses.utilities || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-secondary">
                    <span>Courier Charges</span>
                    <span>{currencySymbol} {(pnlReport.expenses.courierCharge || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-secondary">
                    <span>Miscellaneous</span>
                    <span>{currencySymbol} {(pnlReport.expenses.miscExpenses || 0).toLocaleString()}</span>
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
                  {currencySymbol} {(pnlReport.netProfit || 0).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border bg-surface-hover flex items-center justify-between">
              <p className="text-[10px] text-muted italic">* This report is generated based on recorded transactions in the selected period.</p>
              <button 
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-black rounded-lg text-xs font-bold hover:bg-black transition-all"
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
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-bold text-primary">
                {editingTransaction ? 'Edit Transaction' : 'Add Transaction'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-surface-hover rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-secondary uppercase tracking-wider">Type</label>
                  <select
                    className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all"
                    value={transactionForm.type}
                    onChange={(e) => setTransactionForm({...transactionForm, type: e.target.value as any})}
                  >
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                    <option value="transfer">Transfer</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-secondary uppercase tracking-wider">Category</label>
                  <select
                    required
                    className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all"
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
                  <label className="text-xs font-bold text-secondary uppercase tracking-wider">Sub-Category</label>
                  <select
                    required
                    className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all"
                    value={transactionForm.subCategory}
                    onChange={(e) => setTransactionForm({...transactionForm, subCategory: e.target.value})}
                  >
                    {(COA_STRUCTURE[transactionForm.category as keyof typeof COA_STRUCTURE] || []).map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-secondary uppercase tracking-wider">Amount ({currencySymbol})</label>
                  <input
                    required
                    type="number"
                    className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all"
                    placeholder="0.00"
                    value={transactionForm.amount}
                    onChange={(e) => setTransactionForm({...transactionForm, amount: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-secondary uppercase tracking-wider">
                    {transactionForm.type === 'transfer' ? 'From Account' : 'Account'}
                  </label>
                  <select
                    required
                    className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all"
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
                    <label className="text-xs font-bold text-secondary uppercase tracking-wider">To Account</label>
                    <select
                      required
                      className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all"
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
                    <label className="text-xs font-bold text-secondary uppercase tracking-wider">Method</label>
                    <select
                      className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all"
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
                <label className="text-xs font-bold text-secondary uppercase tracking-wider">Notes</label>
                <textarea
                  className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all min-h-[60px] resize-none"
                  placeholder="Transaction details..."
                  value={transactionForm.notes}
                  onChange={(e) => setTransactionForm({...transactionForm, notes: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-secondary uppercase tracking-wider">Order ID (Optional)</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all"
                    placeholder="ORD-..."
                    value={transactionForm.orderId}
                    onChange={(e) => setTransactionForm({...transactionForm, orderId: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-secondary uppercase tracking-wider">Status</label>
                  <select
                    className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all"
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
                  className="flex-1 px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-surface-hover transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-black rounded-lg text-sm font-medium hover:bg-black transition-colors"
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
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-bold text-primary">
                {editingAccount ? 'Edit Account' : 'Add Account'}
              </h3>
              <button onClick={() => setIsAccountModalOpen(false)} className="p-2 hover:bg-surface-hover rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAccountSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-secondary uppercase tracking-wider">Account Name</label>
                <input
                  required
                  className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all"
                  placeholder="e.g. City Bank, bKash Personal"
                  value={accountForm.name}
                  onChange={(e) => setAccountForm({...accountForm, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-secondary uppercase tracking-wider">Type</label>
                  <select
                    className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all"
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
                  <label className="text-xs font-bold text-secondary uppercase tracking-wider">Category</label>
                  <select
                    className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all"
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
                  <label className="text-xs font-bold text-secondary uppercase tracking-wider">Initial Balance</label>
                  <input
                    required
                    type="number"
                    className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all"
                    value={accountForm.balance}
                    onChange={(e) => setAccountForm({...accountForm, balance: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-secondary uppercase tracking-wider">Account Number (Optional)</label>
                  <input
                    className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all"
                    placeholder="e.g. 123456789"
                    value={accountForm.accountNumber}
                    onChange={(e) => setAccountForm({...accountForm, accountNumber: e.target.value})}
                  />
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsAccountModalOpen(false)} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-surface-hover transition-colors">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-black rounded-lg text-sm font-medium hover:bg-black transition-colors">Save Account</button>
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
};

export default Finance;
