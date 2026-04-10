import React, { useState, useEffect } from 'react';
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
  Zap
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

const StatCard = ({ title, value, icon: Icon, color, iconColor }: any) => (
  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm transition-all hover:shadow-md flex items-center justify-between">
    <div>
      <h3 className="text-xl font-bold text-[#141414] mb-1">{value}</h3>
      <p className="text-[10px] font-bold text-[#00AEEF] uppercase tracking-wider">{title}</p>
    </div>
    <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center text-white shadow-lg shadow-blue-100`}>
      <Icon size={24} className={iconColor} />
    </div>
  </div>
);

const SectionHeader = ({ title, showSelect = false }: { title: string, showSelect?: boolean }) => (
  <div className="flex items-center justify-between mb-6">
    <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest">{title}</h3>
    {showSelect && (
      <select className="text-xs font-bold text-gray-500 bg-gray-100 border-none rounded-lg px-3 py-1.5 outline-none cursor-pointer hover:bg-gray-200 transition-colors">
        <option>This week</option>
        <option>This month</option>
        <option>This year</option>
      </select>
    )}
  </div>
);

export default function Dashboard() {
  const { currencySymbol } = useSettings();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalAmount: 0,
    totalPaid: 0,
    totalDue: 0,
    totalCustomer: 0,
    totalProduct: 0,
    totalInvoice: 0,
    totalPaidInvoice: 0,
    totalDueInvoice: 0
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  const [dailyRevenue, setDailyRevenue] = useState<any[]>([]);
  const [bestSellingProducts, setBestSellingProducts] = useState<any[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [returnRate, setReturnRate] = useState(0);
  const [courierPerformance, setCourierPerformance] = useState<any[]>([]);

  useEffect(() => {
    if (!auth.currentUser) return;

    const unsubOrders = onSnapshot(collection(db, 'orders'), (snapshot) => {
      const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const totalAmount = orders.reduce((acc, o: any) => acc + (o.totalAmount || 0), 0);
      const totalPaid = orders.reduce((acc, o: any) => acc + (o.paidAmount || 0), 0);
      const totalDue = orders.reduce((acc, o: any) => acc + (o.dueAmount || 0), 0);
      const totalInvoice = orders.length;
      const totalPaidInvoice = orders.filter((o: any) => o.status?.toLowerCase() === 'delivered').length;
      const totalDueInvoice = orders.filter((o: any) => o.status?.toLowerCase() !== 'delivered' && o.status?.toLowerCase() !== 'cancelled').length;

      const cancelledOrders = orders.filter((o: any) => o.status?.toLowerCase() === 'cancelled').length;
      const returnedOrders = orders.filter((o: any) => o.status?.toLowerCase() === 'returned').length;
      const totalReturns = cancelledOrders + returnedOrders;
      setReturnRate(totalInvoice > 0 ? Math.round((totalReturns / totalInvoice) * 100) : 0);

      setStats(prev => ({
        ...prev,
        totalAmount,
        totalPaid,
        totalDue,
        totalInvoice,
        totalPaidInvoice,
        totalDueInvoice
      }));
      
      const sortedOrders = orders.sort((a: any, b: any) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setRecentOrders(sortedOrders.slice(0, 10));

      // Calculate Best Selling Products
      const productSales: { [key: string]: { name: string, quantity: number, revenue: number } } = {};
      orders.forEach((order: any) => {
        if (order.items && Array.isArray(order.items)) {
          order.items.forEach((item: any) => {
            const key = item.productId || item.id;
            if (!productSales[key]) {
              productSales[key] = { name: item.name, quantity: 0, revenue: 0 };
            }
            productSales[key].quantity += (item.quantity || 0);
            productSales[key].revenue += (item.price || 0) * (item.quantity || 0);
          });
        }
      });

      const bestSelling = Object.values(productSales)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);
      setBestSellingProducts(bestSelling);

      // Courier Performance
      const courierStats: { [key: string]: { name: string, total: number, delivered: number } } = {};
      orders.forEach((order: any) => {
        if (order.courier) {
          if (!courierStats[order.courier]) {
            courierStats[order.courier] = { name: order.courier, total: 0, delivered: 0 };
          }
          courierStats[order.courier].total++;
          if (order.status?.toLowerCase() === 'delivered') {
            courierStats[order.courier].delivered++;
          }
        }
      });
      setCourierPerformance(Object.values(courierStats).map(c => ({
        ...c,
        rate: Math.round((c.delivered / c.total) * 100)
      })));

      // Daily Revenue for last 7 days
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d.toISOString().split('T')[0];
      }).reverse();

      const dailyData = last7Days.map(date => {
        const dayOrders = orders.filter((o: any) => {
          const orderDate = o.createdAt?.toDate ? o.createdAt.toDate().toISOString().split('T')[0] : (o.createdAt?.seconds ? new Date(o.createdAt.seconds * 1000).toISOString().split('T')[0] : '');
          return orderDate === date;
        });
        return {
          name: date,
          value: dayOrders.reduce((acc, o: any) => acc + (o.totalAmount || 0), 0)
        };
      });
      setDailyRevenue(dailyData);

      setLoading(false);
    }, (error) => {
      if (error.code !== 'permission-denied') {
        handleFirestoreError(error, OperationType.LIST, 'orders');
      }
    });

    const unsubCustomers = onSnapshot(collection(db, 'customers'), (snapshot) => {
      setStats(prev => ({ ...prev, totalCustomer: snapshot.size }));
    }, (error) => {
      if (error.code !== 'permission-denied') {
        handleFirestoreError(error, OperationType.LIST, 'customers');
      }
    });

    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      const prods = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setStats(prev => ({ ...prev, totalProduct: prods.length }));
      
      const lowStock = prods.filter((p: any) => (p.stock || 0) <= (p.minStock || 5));
      setLowStockProducts(lowStock.slice(0, 5));
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
  }, []);

  const barData = dailyRevenue;

  const pieData = [
    { name: 'Paid', value: stats.totalPaid, color: '#00AEEF' },
    { name: 'Due', value: stats.totalDue, color: '#FF7F27' },
  ];

  const lineData = Array.from({ length: 30 }, (_, i) => ({
    name: `${String(i + 1).padStart(2, '0')}-04-2026`,
    value: i === 1 ? 300 : (i === 0 ? 50 : 0)
  }));

  const recentInvoices = [
    { id: '81', customer: 'Fermin Prohaska', issue: '02-04-2026', due: '02-04-2026', total: '€ 22,00', status: 'Due' },
    { id: '80', customer: 'Fermin Prohaska', issue: '02-04-2026', due: '04-04-2026', total: '€ 600,00', status: 'Due' },
    { id: '79', customer: 'Tabitha Abernathy', issue: '01-04-2026', due: '05-04-2026', total: '€ 11.338,11', status: 'Due' },
    { id: '78', customer: 'Fermin Prohaska', issue: '01-04-2026', due: '02-04-2026', total: '€ 630,00', status: 'Due' },
    { id: '77', customer: 'Fermin Prohaska', issue: '05-03-2026', due: '31-03-2026', total: '€ 645,00', status: 'Due' },
  ];

  const recentQuotations = [
    { id: 'quotation-147', customer: 'Fermin Prohaska', total: '€ 600,00', status: 'Pending' },
    { id: 'quotation-146', customer: 'Wilfred Ratke', total: '€ 11.968,00', status: 'Pending' },
    { id: 'quotation-143', customer: 'Fermin Prohaska', total: '€ 268,00', status: 'Pending' },
    { id: 'quotation-142', customer: 'Wilfred Ratke', total: '€ 803,00', status: 'Pending' },
    { id: 'quotation-141', customer: 'Jonatan Kuhn', total: '€ 924,35', status: 'Approved' },
  ];

  const recentTransactions = [
    { id: 'payment-159', amount: '€ 57,91', date: '31-03-2026', customer: 'Customer User', method: 'Bank' },
    { id: 'payment-158', amount: '€ 50,00', date: '31-03-2026', customer: 'Customer User', method: 'Bank' },
    { id: 'payment-157', amount: '€ 99,00', date: '31-03-2026', customer: 'Customer User', method: 'Sslcommerz' },
    { id: 'payment-156', amount: '€ 333,00', date: '31-03-2026', customer: 'Customer User', method: 'Paypal' },
    { id: 'payment-155', amount: '€ 5.000,00', date: '31-03-2026', customer: 'Customer User', method: 'Paypal' },
  ];

  const recentExpenses = [
    { title: 'Corporis recusandae est et illum.', date: '30-03-2026', amount: '€ 900,00', ref: '' },
    { title: 'Minus eum aliquam facilis sed.', date: '15-02-2023', amount: '€ 363,15', ref: '3ab1897a-a2' },
    { title: 'Maxime aperiam dolor aliquid illum rem ipsa.', date: '01-01-2021', amount: '€ 790,57', ref: '8b8c570b-4' },
    { title: 'Repellendus non non velit repudiandae sed.', date: '07-12-2020', amount: '€ 151,26', ref: 'a820a15f-29' },
    { title: 'Quo eaque nesciunt quidem velit placeat eligendi tempore.', date: '05-01-2022', amount: '€ 143,43', ref: '0c1bc821-db' },
  ];

  const formatCurrency = (amount: number) => {
    return `${currencySymbol} ${amount.toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#00AEEF]" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-8 pb-12">
      {/* Quick Actions Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/new-order" className="flex items-center gap-2 px-4 py-2.5 bg-[#141414] text-white rounded-xl text-xs font-bold hover:bg-black transition-all shadow-lg shadow-gray-200">
          <Plus size={16} />
          New Order
        </Link>
        <Link to="/pos" className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-100 text-[#141414] rounded-xl text-xs font-bold hover:bg-gray-50 transition-all shadow-sm">
          <Zap size={16} className="text-orange-500" />
          POS Sale
        </Link>
        <Link to="/inventory/new" className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-100 text-[#141414] rounded-xl text-xs font-bold hover:bg-gray-50 transition-all shadow-sm">
          <Package size={16} className="text-blue-500" />
          Add Product
        </Link>
        <a href="https://wa.me/8801700000000" target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2.5 bg-[#25D366] text-white rounded-xl text-xs font-bold hover:bg-[#128C7E] transition-all shadow-lg shadow-green-100">
          <MessageSquare size={16} />
          WhatsApp Support
        </a>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard title="Total Revenue" value={formatCurrency(stats.totalAmount)} icon={Wallet} color="bg-blue-50" iconColor="text-blue-600" />
        <StatCard title="Total Paid" value={formatCurrency(stats.totalPaid)} icon={CheckCircle2} color="bg-green-50" iconColor="text-green-600" />
        <StatCard title="Return Rate" value={`${returnRate}%`} icon={RotateCcw} color="bg-red-50" iconColor="text-red-600" />
        <StatCard title="Total Customers" value={stats.totalCustomer} icon={Users} color="bg-purple-50" iconColor="text-purple-600" />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
        <div className="lg:col-span-2 bg-white p-4 sm:p-8 rounded-3xl border border-gray-100 shadow-sm">
          <SectionHeader title="Sales Performance" showSelect />
          <div className="h-[300px] sm:h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={barData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00AEEF" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#00AEEF" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#9CA3AF', fontWeight: 600 }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#9CA3AF', fontWeight: 600 }} 
                />
                <Tooltip 
                  cursor={{ fill: '#F8F9FA' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}
                />
                <Area type="monotone" dataKey="value" stroke="#00AEEF" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col">
          <SectionHeader title="Courier Performance" />
          <div className="flex-1 space-y-4">
            {courierPerformance.length > 0 ? (
              courierPerformance.map((c, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-700 uppercase">{c.name}</span>
                    <span className="text-xs font-black text-[#00AEEF]">{c.rate}% Success</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#00AEEF] rounded-full transition-all duration-1000" 
                      style={{ width: `${c.rate}%` }}
                    />
                  </div>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">{c.delivered} Delivered / {c.total} Total</p>
                </div>
              ))
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-300 gap-2">
                <Truck size={48} strokeWidth={1} />
                <p className="text-xs font-medium">No courier data yet</p>
              </div>
            )}
          </div>
          <div className="mt-6 pt-6 border-t border-gray-50">
            <Link to="/logistics" className="text-xs font-bold text-[#00AEEF] hover:underline flex items-center gap-1">
              Manage Logistics <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>
      </div>

      {/* Alerts & Best Selling */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
        {/* Low Stock Alerts */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest">Low Stock Alerts</h3>
            <span className="px-2 py-1 bg-red-50 text-red-600 text-[10px] font-black rounded-lg uppercase">{lowStockProducts.length} Items</span>
          </div>
          <div className="p-6 space-y-4">
            {lowStockProducts.map((p, i) => (
              <div key={i} className="flex items-center gap-4 p-3 bg-gray-50 rounded-2xl border border-transparent hover:border-red-100 transition-all">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                  <Package size={20} className="text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-gray-900 truncate">{p.name}</h4>
                  <p className="text-[10px] text-red-500 font-black uppercase tracking-wider">Only {p.stock || 0} left</p>
                </div>
                <Link to={`/inventory/edit/${p.id}`} className="p-2 text-gray-400 hover:text-[#00AEEF] transition-colors">
                  <ArrowUpRight size={16} />
                </Link>
              </div>
            ))}
            {lowStockProducts.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-xs">All stock levels are healthy.</div>
            )}
          </div>
          <div className="p-4 bg-gray-50 border-t border-gray-100 text-center">
            <Link to="/inventory" className="text-[10px] font-bold text-gray-500 uppercase tracking-widest hover:text-[#00AEEF]">View Full Inventory</Link>
          </div>
        </div>

        {/* Best Selling Products */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-50">
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest">Best Selling Products</h3>
          </div>
          <div className="p-6 space-y-6">
            {bestSellingProducts.map((product, index) => (
              <div key={index} className="flex items-center gap-4 group">
                <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-xs font-black text-gray-400 group-hover:bg-[#00AEEF] group-hover:text-white transition-all">
                  #{index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-gray-900 truncate">{product.name}</h4>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{product.quantity} Units Sold</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-[#00AEEF]">{formatCurrency(product.revenue)}</p>
                </div>
              </div>
            ))}
            {bestSellingProducts.length === 0 && (
              <div className="text-center py-12 text-gray-400 text-xs">No sales data yet.</div>
            )}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest">Recent Orders</h3>
            <Link to="/orders" className="text-[10px] font-bold text-[#00AEEF] hover:underline">View All</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentOrders.slice(0, 5).map((order) => (
              <div key={order.id} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-[#00AEEF]">
                    <ShoppingCart size={14} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-900 truncate">{order.customerName}</p>
                    <p className="text-[10px] text-gray-400 font-medium">#{order.orderNumber || order.id.slice(0, 8)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-gray-900">{formatCurrency(order.totalAmount)}</p>
                  <span className={`text-[8px] font-black uppercase tracking-widest ${
                    order.status?.toLowerCase() === 'delivered' ? 'text-green-500' : 
                    order.status?.toLowerCase() === 'cancelled' ? 'text-red-500' : 'text-[#00AEEF]'
                  }`}>{order.status}</span>
                </div>
              </div>
            ))}
            {recentOrders.length === 0 && (
              <div className="p-12 text-center text-gray-400 text-xs">No orders found.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

