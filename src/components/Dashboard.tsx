import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  Users, 
  ShoppingCart, 
  Package, 
  ArrowUpRight, 
  ArrowDownRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Wallet,
  FileText,
  CreditCard,
  Receipt,
  UserCheck,
  Plus,
  MoreVertical,
  Calendar,
  DollarSign,
  MessageSquare,
  Truck,
  RotateCcw,
  Zap,
  ChevronDown,
  Sparkles,
  ArrowRight,
  PackageX
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Link } from 'react-router-dom';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';

const StatCard = ({ title, value, icon: Icon, trend, trendValue, delay = 0, iconBg, iconColor }: any) => (
  <motion.div 
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay }}
    className="bg-surface border border-border rounded-[20px] p-4 lg:p-5 flex flex-col justify-between shadow-subtle hover:shadow-premium transition-shadow relative overflow-hidden"
  >
    <div className="flex flex-col mb-2 lg:mb-4">
      <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-[14px] flex items-center justify-center ${iconBg} mb-3`}>
        <Icon size={20} className={iconColor} strokeWidth={2} />
      </div>
      <div>
        <p className="text-[10px] lg:text-[11px] font-bold text-muted uppercase tracking-widest leading-tight">{title}</p>
        <h3 className="text-xl lg:text-2xl 2xl:text-3xl font-black text-primary mt-1 tracking-tight">{value}</h3>
      </div>
    </div>
    
    <div className="mt-auto text-[10px] xl:text-[11px] 2xl:text-[12px] font-medium flex items-center gap-1 flex-wrap">
      <span className={trend === 'up' ? 'text-success font-bold' : 'text-danger font-bold'}>
        {trend === 'up' ? '↗' : '↘'} {trendValue}
      </span>
      <span className="text-muted">vs month</span>
    </div>
  </motion.div>
);

const ProfileSummaryCard = ({ name, growth, todayOrders, todaySales, currencySymbol }: { name: string, growth: number, todayOrders: number, todaySales: number, currencySymbol: string }) => {
  const { user } = useAuth();
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="h-full rounded-[2.5rem] bg-accent text-white p-10 flex flex-col justify-between overflow-hidden relative shadow-2xl shadow-accent/20"
    >
      <div className="absolute top-0 right-0 w-64 h-64 bg-surface/10 rounded-full -mr-32 -mt-32 blur-3xl opacity-40 animate-pulse" />
      
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1.5 h-1.5 bg-surface/40 rounded-full animate-ping" />
          <h4 className="text-[11px] text-white/60 font-extrabold uppercase tracking-[.25em]">Live Stats</h4>
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-white leading-tight mb-2">
          Welcome back,<br />
          <span className="text-white/90">{name.split(' ')[0]}</span>
        </h2>
        <p className="text-white/80 text-[13px] font-medium leading-relaxed max-w-[200px]">
          Your daily sales performance is {growth >= 0 ? 'up' : 'down'} <span className="text-white font-bold">{Math.abs(growth)}%</span> from yesterday.
        </p>
      </div>

      <div className="relative z-10 grid grid-cols-2 gap-8 border-t border-white/10 pt-8 mt-8">
        <div>
          <p className="text-[10px] text-white/50 font-extrabold uppercase tracking-widest mb-1">Today's Orders</p>
          <p className="text-xl font-bold text-white">{todayOrders}</p>
        </div>
        <div>
          <p className="text-[10px] text-white/50 font-extrabold uppercase tracking-widest mb-1">Today's Revenue</p>
          <p className="text-xl font-bold text-white">{currencySymbol}{todaySales.toLocaleString()}</p>
        </div>
      </div>
    </motion.div>
  );
};

const SectionHeader = ({ title, showSelect = false, subtitle }: { title: string, showSelect?: boolean, subtitle?: string }) => (
  <div className="flex items-center justify-between mb-8">
    <div>
      <h3 className="text-xl font-bold text-primary tracking-tight">{title}</h3>
      {subtitle && <p className="text-xs font-semibold text-muted mt-1 uppercase tracking-wider">{subtitle}</p>}
    </div>
    {showSelect && (
      <div className="flex items-center gap-3">
        <select className="text-[11px] font-bold text-secondary bg-surface-hover border-none rounded-xl px-4 py-2.5 outline-none cursor-pointer hover:bg-surface-hover transition-all">
          <option>This Week</option>
          <option>This Month</option>
          <option>This Year</option>
        </select>
        <button className="p-2.5 bg-primary text-white rounded-xl shadow-lg hover:scale-105 transition-all">
          <Plus size={16} />
        </button>
      </div>
    )}
  </div>
);

const CustomTooltip = ({ active, payload, label, currencySymbol }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass p-4 rounded-2xl shadow-2xl border-white/50 animate-in fade-in zoom-in-95 duration-200">
        <p className="text-[10px] font-black text-muted uppercase tracking-widest mb-2">{label}</p>
        <div className="space-y-3">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-[11px] font-bold text-secondary">{entry.name}</span>
              </div>
              <span className="text-xs font-black text-primary">{currencySymbol} {entry.value.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const { currencySymbol } = useSettings();
  const { user: authUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [customersCount, setCustomersCount] = useState<number>(0);
  
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [teamMembers, setTeamMembers] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersMap: { [key: string]: string } = {};
      snapshot.docs.forEach(doc => {
        usersMap[doc.id] = doc.data().name || doc.data().displayName || doc.id;
      });
      setTeamMembers(usersMap);
    }, (error) => {
      if (error.code !== 'permission-denied') {
        handleFirestoreError(error, OperationType.LIST, 'users');
      }
    });

    return () => unsubUsers();
  }, []);

  useEffect(() => {
    if (!authUser) return;

    setLoading(true);

    const unsubOrders = onSnapshot(collection(db, 'orders'), (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      setLoading(false);
      if (error.code !== 'permission-denied') {
        handleFirestoreError(error, OperationType.LIST, 'orders');
      }
    });

    const unsubCustomers = onSnapshot(collection(db, 'customers'), (snapshot) => {
      setCustomersCount(snapshot.size);
    }, (error) => {
      if (error.code !== 'permission-denied') {
        handleFirestoreError(error, OperationType.LIST, 'customers');
      }
    });

    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      setProducts(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      if (error.code !== 'permission-denied') {
        handleFirestoreError(error, OperationType.LIST, 'products');
      }
    });

    return () => {
      unsubOrders();
      unsubCustomers();
      unsubProducts();
    };
  }, [authUser]);

  const stats = useMemo(() => {
    const totalAmount = orders.reduce((acc, o: any) => acc + (o.totalAmount || 0), 0);
    const totalPaid = orders.reduce((acc, o: any) => acc + (o.paidAmount || 0), 0);
    const totalDue = orders.reduce((acc, o: any) => acc + (o.dueAmount || 0), 0);
    const totalInvoice = orders.length;

    // Growth calculation
    const today = new Date().toISOString().split('T')[0];
    const todayOrdersList = orders.filter((o: any) => {
      try {
        if (!o.createdAt) return false;
        const createdAt = o.createdAt?.toDate?.() || (o.createdAt?.seconds ? new Date(o.createdAt.seconds * 1000) : new Date(o.createdAt));
        if (!createdAt || isNaN(createdAt.getTime())) return false;
        return createdAt.toISOString().split('T')[0] === today;
      } catch (e) {
        return false;
      }
    });
    const todaySales = todayOrdersList.reduce((acc, o: any) => acc + (o.totalAmount || 0), 0);
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const yesterdayOrders = orders.filter((o: any) => {
      try {
        if (!o.createdAt) return false;
        const createdAt = o.createdAt?.toDate?.() || (o.createdAt?.seconds ? new Date(o.createdAt.seconds * 1000) : new Date(o.createdAt));
        if (!createdAt || isNaN(createdAt.getTime())) return false;
        return createdAt.toISOString().split('T')[0] === yesterdayStr;
      } catch (e) {
        return false;
      }
    });
    const yesterdaySales = yesterdayOrders.reduce((acc, o: any) => acc + (o.totalAmount || 0), 0);
    
    let salesGrowth = 0;
    if (yesterdaySales > 0) {
      salesGrowth = ((todaySales - yesterdaySales) / yesterdaySales * 100);
    } else if (todaySales > 0) {
      salesGrowth = 100;
    }

    const cancelledOrders = orders.filter((o: any) => o.status?.toLowerCase() === 'cancelled').length;
    const returnedOrders = orders.filter((o: any) => o.status?.toLowerCase() === 'returned').length;
    const totalReturns = cancelledOrders + returnedOrders;
    const returnRateCalc = totalInvoice > 0 ? Math.round((totalReturns / totalInvoice) * 100) : 0;

    return {
      totalAmount,
      totalPaid,
      totalDue,
      totalInvoice,
      returnRate: returnRateCalc,
      totalCustomer: customersCount,
      totalProduct: products.length,
      todaySales,
      todayInvoice: todayOrdersList.length,
      salesGrowth: parseFloat(salesGrowth.toFixed(1))
    };
  }, [orders, customersCount, products.length]);

  const recentOrders = useMemo(() => {
    return [...orders].sort((a: any, b: any) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0)).slice(0, 10);
  }, [orders]);

  const bestSellingProducts = useMemo(() => {
    const productSales: { [key: string]: { name: string, quantity: number, revenue: number, image?: string } } = {};
    orders.forEach((order: any) => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          const key = item.productId || item.id;
          if (!productSales[key]) {
            productSales[key] = { name: item.name, quantity: 0, revenue: 0, image: item.image };
          }
          productSales[key].quantity += (item.quantity || 0);
          productSales[key].revenue += (item.price || 0) * (item.quantity || 0);
        });
      }
    });

    return Object.values(productSales)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }, [orders]);

  const teamPerformance = useMemo(() => {
    const teamStats: { [key: string]: { name: string, total: number, processed: number } } = {};
    orders.forEach((order: any) => {
      if (order.uid) {
        if (!teamStats[order.uid]) {
          teamStats[order.uid] = { name: order.uid, total: 0, processed: 0 };
        }
        teamStats[order.uid].total++;
        if (order.status?.toLowerCase() !== 'pending' && order.status?.toLowerCase() !== 'cancelled') {
          teamStats[order.uid].processed++;
        }
      }
    });
    return Object.values(teamStats).map(c => ({
      ...c,
      name: teamMembers[c.name] || 'Team Member',
      rate: Math.round((c.processed / c.total) * 100)
    }));
  }, [orders, teamMembers]);

  const monthlyPerformance = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months.map((month, index) => {
      const monthOrders = orders.filter((o: any) => {
        const date = o.createdAt?.toDate ? o.createdAt.toDate() : (o.createdAt?.seconds ? new Date(o.createdAt.seconds * 1000) : null);
        return date && date.getMonth() === index && date.getFullYear() === selectedYear;
      });
      const revenue = monthOrders.reduce((acc, o: any) => acc + (o.totalAmount || 0), 0);
      return {
        name: month,
        orders: revenue,
        profit: revenue * 0.45
      };
    });
  }, [orders, selectedYear]);

  const lowStockProducts = useMemo(() => {
    return products.filter((p: any) => (p.stock || 0) <= (p.minStock || 5)).slice(0, 5);
  }, [products]);

  const formatCurrency = (amount: number) => {
    return `${currencySymbol}${amount.toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-surface gap-4">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          className="w-12 h-12 border-4 border-primary/10 border-t-primary rounded-full"
        />
        <p className="label-tiny animate-pulse">Syncing Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-8 pb-20">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold text-primary tracking-tight">Dashboard</h2>
          <p className="text-secondary text-sm font-medium">Welcome back, <span className="text-brand font-semibold">{authUser?.name || teamMembers[authUser?.uid || ''] || 'Mahmudul'}</span>! Here's what's happening with your business today.</p>
        </div>
        
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 lg:gap-3 w-full lg:w-auto">
          {/* Date Picker Button */}
          <div className="flex items-center justify-between min-w-[180px] lg:min-w-[200px] gap-2 bg-surface border border-border rounded-lg shadow-subtle px-3 lg:px-4 py-2 lg:py-2.5 cursor-pointer text-xs lg:text-sm font-medium text-secondary">
            <span>May 17 - May 24, 2026</span>
            <Calendar size={16} className="text-muted" />
          </div>

          {/* List/Grid View Toggle */}
          <div className="flex items-center gap-1 bg-surface border border-border rounded-lg shadow-subtle p-1">
            <button className="p-1.5 lg:p-2 rounded-md transition-colors text-muted hover:text-secondary">
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/></svg>
            </button>
            <button className="p-1.5 lg:p-2 rounded-md transition-colors bg-surface-hover text-primary">
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
            </button>
          </div>
          
          <Link to="/orders/new" className="flex items-center gap-2 px-4 lg:px-5 py-2 lg:py-2.5 bg-brand text-white rounded-lg text-xs lg:text-sm font-semibold hover:bg-brand-hover transition-colors shadow-subtle whitespace-nowrap shrink-0">
            <Plus size={16} strokeWidth={2.5} />
            <span>New Order</span>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard 
          title="TOTAL ORDERS" 
          value={stats.totalInvoice.toLocaleString()} 
          icon={ShoppingCart} 
          trend="up" 
          trendValue={`${stats.salesGrowth}%`} 
          iconBg="bg-brand/10"
          iconColor="text-brand"
          delay={0.1}
        />
        <StatCard 
          title="TOTAL SALES" 
          value={formatCurrency(stats.totalAmount)} 
          icon={DollarSign} 
          trend="down" 
          trendValue="7.2%" 
          iconBg="bg-emerald-50 dark:bg-emerald-500/10"
          iconColor="text-emerald-500 dark:text-emerald-400"
          delay={0.2}
        />
        <StatCard 
          title="TOTAL PRODUCTS" 
          value={stats.totalProduct.toLocaleString()} 
          icon={Package} 
          trend="up" 
          trendValue="4.7%" 
          iconBg="bg-orange-50 dark:bg-orange-500/10"
          iconColor="text-orange-500 dark:text-orange-400"
          delay={0.3}
        />
        <StatCard 
          title="TOTAL CUSTOMERS" 
          value={stats.totalCustomer.toLocaleString()} 
          icon={Users} 
          trend="up" 
          trendValue="2.1%" 
          iconBg="bg-purple-50 dark:bg-purple-500/10"
          iconColor="text-purple-500 dark:text-purple-400"
          delay={0.4}
        />
        <StatCard 
          title="TOTAL COLLECTION" 
          value={formatCurrency(stats.totalPaid)} 
          icon={CheckCircle2} 
          trend="up" 
          trendValue="2.6%" 
          iconBg="bg-pink-50 dark:bg-pink-500/10"
          iconColor="text-pink-500 dark:text-pink-400"
          delay={0.5}
        />
        <StatCard 
          title="OUTSTANDING" 
          value={formatCurrency(stats.totalDue)} 
          icon={Clock} 
          trend="up" 
          trendValue="1.9%" 
          iconBg="bg-red-50 dark:bg-rose-500/10"
          iconColor="text-red-500 dark:text-rose-400"
          delay={0.6}
        />
      </div>


      {/* Middle Row - Alerts, Top Sellers, Recent Traffic */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 xl:gap-8">
        {/* Stock Alerts Card */}
        <div className="bg-surface border border-border rounded-[20px] p-6 shadow-subtle">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-red-50 dark:bg-rose-500/10 flex items-center justify-center text-red-500 dark:text-rose-400">
                <AlertCircle size={14} />
              </div>
              <h3 className="text-[16px] font-bold text-primary">Stock Alerts</h3>
            </div>
            <Link to="/products" className="text-[13px] font-medium text-brand hover:text-brand-hover">View All</Link>
          </div>
          <div className="space-y-4">
            {lowStockProducts.map((p, i) => (
              <div key={i} className="flex items-center gap-4 group cursor-pointer">
                <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-rose-500/10 flex items-center justify-center text-red-500 dark:text-rose-400 shrink-0">
                  <Package size={18} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-[13px] font-bold text-primary truncate mb-0.5">{p.name}</h4>
                  <p className="text-[11px] font-medium text-red-500 dark:text-rose-400">{p.stock || 0} units left</p>
                </div>
              </div>
            ))}
            {lowStockProducts.length === 0 && (
              <div className="py-8 text-center">
                <p className="text-sm text-muted italic">Inventory healthy</p>
              </div>
            )}
          </div>
        </div>

        {/* Top Sellers Card */}
        <div className="bg-surface border border-border rounded-[20px] p-6 shadow-subtle">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
            <h3 className="text-[16px] font-bold text-primary">Top Sellers</h3>
            <Link to="/products" className="text-[13px] font-medium text-brand hover:text-brand-hover">View All</Link>
          </div>
          <div className="space-y-5">
            {bestSellingProducts.slice(0, 5).map((p, i) => (
              <div key={i} className="flex items-center gap-4 group cursor-pointer">
                <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center text-brand text-xs font-bold shrink-0">
                  #{i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-[13px] font-bold text-primary truncate mb-0.5">{p.name}</h4>
                  <p className="text-[11px] font-medium text-secondary">{p.quantity} units · {formatCurrency(p.revenue)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Traffic Card */}
        <div className="bg-surface border border-border rounded-[20px] p-6 shadow-subtle flex flex-col h-full">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
            <h3 className="text-[16px] font-bold text-primary">Recent Order</h3>
            <Link to="/orders" className="text-[13px] font-medium text-brand hover:text-brand-hover bg-brand/10 px-3 py-1 rounded-full">View All</Link>
          </div>
          <div className="flex-1 space-y-5">
            {recentOrders.slice(0, 5).map((order) => (
              <div key={order.id} className="flex items-center justify-between gap-2 group cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-surface-hover flex items-center justify-center text-muted shrink-0">
                    <ShoppingCart size={18} />
                  </div>
                  <div>
                    <h4 className="text-[13px] font-bold text-primary truncate leading-tight mb-0.5 max-w-[100px]">{order.customerName}</h4>
                    <p className="text-[11px] text-muted">#{order.orderNumber || order.id.slice(0, 6)}</p>
                  </div>
                </div>
                <div className="text-right flex-1">
                  <div className="flex items-center justify-end gap-4">
                    <span className="text-[13px] font-bold text-primary">{formatCurrency(order.totalAmount)}</span>
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                         order.status?.toLowerCase() === 'delivered' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 
                         order.status?.toLowerCase() === 'shipped' ? 'bg-brand/10 text-brand' :
                         order.status?.toLowerCase() === 'cancelled' ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400' :
                         'bg-orange-50 dark:bg-orange-500/10 text-orange-500 dark:text-orange-400' /* Pending style */
                       }`}>
                      {order.status || 'PENDING'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-4 border-t border-border flex items-center justify-center gap-2">
            <div className="flex gap-1.5">
               <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
               <div className="w-1.5 h-1.5 rounded-full bg-gray-200" />
               <div className="w-1.5 h-1.5 rounded-full bg-gray-200" />
            </div>
            <span className="text-[11px] font-medium text-muted">Live data sync</span>
          </div>
        </div>
      </div>

      {/* Main Insights Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Large Chart Card */}
        <div className="lg:col-span-8 bg-surface border border-border rounded-[20px] p-8 shadow-subtle">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
            <div>
              <h3 className="text-[16px] font-bold text-primary">Store Performance</h3>
              <p className="text-sm text-secondary font-medium mt-1">Order volume and revenue trends</p>
            </div>
            <div className="flex items-center border border-border rounded-lg p-1">
              {[2024, 2025, 2026].map(year => (
                <button 
                  key={year}
                  onClick={() => setSelectedYear(year)}
                  className={`px-4 py-1.5 rounded-md text-[13px] font-semibold transition-colors ${selectedYear === year ? 'bg-brand/10 text-brand' : 'text-secondary hover:text-primary'}`}
                >
                  {year}
                </button>
              ))}
            </div>
          </div>

          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyPerformance} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="velocityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-brand)" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="var(--color-brand)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="var(--color-border)" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: 'var(--color-muted)', fontWeight: 500 }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tickFormatter={(p) => `${currencySymbol}${p > 999 ? p/1000 + 'k' : p}`}
                  tick={{ fontSize: 11, fill: 'var(--color-muted)', fontWeight: 500 }} 
                />
                <Tooltip content={<CustomTooltip currencySymbol={currencySymbol} />} cursor={false} />
                <Area 
                  type="monotone" 
                  dataKey="orders" 
                  name="Revenue" 
                  stroke="var(--color-brand)" 
                  strokeWidth={3} 
                  fill="url(#velocityGrad)" 
                  animationDuration={1500}
                />
                <Area 
                  type="monotone" 
                  dataKey="profit" 
                  name="Target" 
                  stroke="var(--color-muted)" 
                  strokeWidth={2} 
                  strokeDasharray="6 6"
                  fill="transparent" 
                  animationDuration={2000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-brand" />
              <span className="text-[12px] font-medium text-secondary">Revenue</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-muted border-t-2 border-dashed border-muted" />
              <span className="text-[12px] font-medium text-secondary">Target</span>
            </div>
          </div>
        </div>

        {/* Team Activity Card */}
        <div className="lg:col-span-4 bg-surface border border-border rounded-[20px] p-8 shadow-subtle flex flex-col">
          <div className="mb-8">
            <h3 className="text-[16px] font-bold text-primary">Staff Performance</h3>
            <p className="text-sm text-secondary font-medium mt-1">Order processing efficiency</p>
          </div>
          <div className="flex-1">
            {teamPerformance.length > 0 ? (
              teamPerformance.slice(0, 1).map((member, i) => (
                <div key={i} className="group">
                  <div className="flex justify-between items-end mb-4">
                    <div>
                      <h4 className="text-[13px] font-bold text-primary uppercase tracking-widest mb-1">{member.name}</h4>
                      <p className="text-[12px] text-secondary font-medium">{member.processed} operations completed</p>
                    </div>
                    <span className="text-[13px] font-bold text-primary">{member.rate}%</span>
                  </div>
                  <div className="h-2.5 w-full bg-surface-hover rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${member.rate}%` }}
                      transition={{ duration: 1.5, delay: 0.5 }}
                      className="h-full bg-brand rounded-full"
                    />
                  </div>
                </div>
              ))
            ) : (
               <div className="flex flex-col items-center justify-center text-muted py-10">
                 <Users size={32} />
                 <p className="text-sm font-medium mt-4 uppercase tracking-widest">Awaiting Data</p>
               </div>
            )}
          </div>
          <Link to="/team" className="mt-auto pt-6 border-t border-border flex items-center justify-between text-secondary hover:text-primary transition-colors group">
            <span className="text-[13px] font-medium">Full Report</span>
            <ArrowRight size={18} className="translate-x-0 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}


