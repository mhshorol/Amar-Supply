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
  DollarSign
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
import { db } from '../firebase';
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

  useEffect(() => {
    const unsubOrders = onSnapshot(collection(db, 'orders'), (snapshot) => {
      const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const totalAmount = orders.reduce((acc, o: any) => acc + (o.totalAmount || 0), 0);
      const totalPaid = orders.reduce((acc, o: any) => acc + (o.paidAmount || 0), 0);
      const totalDue = orders.reduce((acc, o: any) => acc + (o.dueAmount || 0), 0);
      const totalInvoice = orders.length;
      const totalPaidInvoice = orders.filter((o: any) => o.status?.toLowerCase() === 'delivered').length;
      const totalDueInvoice = orders.filter((o: any) => o.status?.toLowerCase() !== 'delivered' && o.status?.toLowerCase() !== 'cancelled').length;

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
      setStats(prev => ({ ...prev, totalProduct: snapshot.size }));
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
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard title="Total Revenue" value={formatCurrency(stats.totalAmount)} icon={Wallet} color="bg-[#00AEEF]" />
        <StatCard title="Total Paid" value={formatCurrency(stats.totalPaid)} icon={CheckCircle2} color="bg-[#00AEEF]" />
        <StatCard title="Total Due" value={formatCurrency(stats.totalDue)} icon={AlertCircle} color="bg-[#00AEEF]" />
        <StatCard title="Total Customers" value={stats.totalCustomer} icon={Users} color="bg-[#00AEEF]" />
        
        <StatCard title="Total Products" value={stats.totalProduct} icon={Package} color="bg-[#00AEEF]" />
        <StatCard title="Total Orders" value={stats.totalInvoice} icon={ShoppingCart} color="bg-[#00AEEF]" />
        <StatCard title="Delivered Orders" value={stats.totalPaidInvoice} icon={Receipt} color="bg-[#00AEEF]" />
        <StatCard title="Active Orders" value={stats.totalDueInvoice} icon={AlertCircle} color="bg-[#00AEEF]" />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
        <div className="lg:col-span-2 bg-white p-4 sm:p-8 rounded-3xl border border-gray-100 shadow-sm">
          <SectionHeader title="Income & Expense Overview" showSelect />
          <div className="h-[300px] sm:h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
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
                <Bar dataKey="value" fill="#00AEEF" radius={[4, 4, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-8 rounded-3xl border border-gray-100 shadow-sm">
          <SectionHeader title="Payment Overview" />
          <div className="h-[250px] sm:h-[300px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={0}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3 mt-4">
            {pieData.map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-xs font-bold text-gray-600">{item.name} ({currencySymbol} {item.value.toLocaleString()})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Orders & Best Selling Products */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
        {/* Recent Orders */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-50 flex items-center justify-between">
            <h3 className="text-xs sm:text-sm font-bold text-gray-800 uppercase tracking-widest">Recent Orders</h3>
            <Link to="/orders" className="text-[10px] sm:text-xs font-bold text-[#00AEEF] hover:underline">View All</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[600px] sm:min-w-0">
              <thead>
                <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50">
                  <th className="px-6 py-4">Order ID</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Total</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-xs font-bold text-gray-900">#{order.orderNumber || order.id.slice(0, 8)}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-gray-900">{order.customerName}</span>
                        <span className="text-[10px] text-gray-400">{order.customerPhone}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-600">{order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString() : (order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000).toLocaleDateString() : 'N/A')}</td>
                    <td className="px-6 py-4 text-xs font-bold text-gray-900">{formatCurrency(order.totalAmount)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-[10px] font-bold rounded-md ${
                        order.status?.toLowerCase() === 'delivered' ? 'bg-green-500 text-white' : 
                        order.status?.toLowerCase() === 'cancelled' ? 'bg-red-500 text-white' : 'bg-[#00AEEF] text-white'
                      }`}>{(order.status.charAt(0).toUpperCase() + order.status.slice(1)).replace(/_/g, ' ')}</span>
                    </td>
                  </tr>
                ))}
                {recentOrders.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400 text-sm">No orders found.</td>
                  </tr>
                )}
              </tbody>
            </table>
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
      </div>
    </div>
  );
}

