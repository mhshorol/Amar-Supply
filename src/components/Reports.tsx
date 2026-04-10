import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { 
  Download, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingCart, 
  Users, 
  Package,
  Calendar,
  Filter,
  FileText,
  Loader2,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';
import { GoogleGenAI } from "@google/genai";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30');
  const [salesData, setSalesData] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [sourceData, setSourceData] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalSales: 0,
    totalOrders: 0,
    totalCustomers: 0,
    totalProducts: 0,
    salesGrowth: 0,
    ordersGrowth: 0
  });
  const [forecasting, setForecasting] = useState<string | null>(null);
  const [isForecasting, setIsForecasting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const days = parseInt(dateRange);
      const startDate = subDays(new Date(), days);
      const startTimestamp = Timestamp.fromDate(startDate);

      // Fetch Orders
      const ordersQuery = query(
        collection(db, 'orders'),
        where('createdAt', '>=', startTimestamp),
        orderBy('createdAt', 'asc')
      );
      const ordersSnap = await getDocs(ordersQuery);
      const orders = ordersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Process Sales Data for Chart
      const daysInterval = eachDayOfInterval({
        start: startDate,
        end: new Date()
      });

      const processedSales = daysInterval.map(day => {
        const dayOrders = orders.filter(o => {
          const createdAt = (o as any).createdAt?.toDate?.() || new Date((o as any).createdAt?.seconds * 1000);
          return isSameDay(createdAt, day);
        });
        const total = dayOrders.reduce((sum, o: any) => sum + (o.totalAmount || 0), 0);
        return {
          date: format(day, 'MMM dd'),
          sales: total,
          orders: dayOrders.length
        };
      });
      setSalesData(processedSales);

      // Top Products
      const productSales: Record<string, { name: string, sales: number, quantity: number }> = {};
      orders.forEach((order: any) => {
        if (order.items) {
          order.items.forEach((item: any) => {
            if (!productSales[item.productId]) {
              productSales[item.productId] = { name: item.name || 'Unknown', sales: 0, quantity: 0 };
            }
            productSales[item.productId].sales += (item.price * item.quantity) || 0;
            productSales[item.productId].quantity += item.quantity || 0;
          });
        }
      });
      const sortedProducts = Object.values(productSales)
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 5);
      setTopProducts(sortedProducts);

      // Category Data
      const categorySales: Record<string, number> = {};
      orders.forEach((order: any) => {
        if (order.items) {
          order.items.forEach((item: any) => {
            const cat = item.category || 'Uncategorized';
            categorySales[cat] = (categorySales[cat] || 0) + (item.price * item.quantity || 0);
          });
        }
      });
      setCategoryData(Object.entries(categorySales).map(([name, value]) => ({ name, value })));

      // Source Data
      const sourceCounts: Record<string, number> = {};
      orders.forEach((order: any) => {
        const source = order.source || 'Unknown';
        sourceCounts[source] = (sourceCounts[source] || 0) + 1;
      });
      setSourceData(Object.entries(sourceCounts).map(([name, value]) => ({ name, value })));

      // Stats
      const totalSales = orders.reduce((sum, o: any) => sum + (o.totalAmount || 0), 0);
      
      // Fetch total counts
      const customersSnap = await getDocs(collection(db, 'customers'));
      const productsSnap = await getDocs(collection(db, 'products'));

      setStats({
        totalSales,
        totalOrders: orders.length,
        totalCustomers: customersSnap.size,
        totalProducts: productsSnap.size,
        salesGrowth: 12.5, // Mock growth
        ordersGrowth: 8.2   // Mock growth
      });

    } catch (error) {
      console.error("Error fetching report data:", error);
      toast.error("Failed to load report data");
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = async () => {
    const element = document.getElementById('report-content');
    if (!element) return;

    toast.loading("Generating PDF report...", { id: 'pdf-gen' });
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`SCM_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success("Report downloaded successfully", { id: 'pdf-gen' });
    } catch (error) {
      console.error("PDF Error:", error);
      toast.error("Failed to generate PDF", { id: 'pdf-gen' });
    }
  };

  const getAIForecast = async () => {
    setIsForecasting(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

      const prompt = `
        As a business analyst for a Supply Chain Management system, analyze the following sales data for the last ${dateRange} days and provide a brief sales forecast and recommendations for the next 7 days.
        
        Total Sales: ${stats.totalSales}
        Total Orders: ${stats.totalOrders}
        Top Products: ${topProducts.map(p => `${p.name} (${p.quantity} units)`).join(', ')}
        
        Data Points:
        ${salesData.map(d => `${d.date}: ${d.sales}`).join('\n')}
        
        Provide the response in a professional, concise tone with bullet points for recommendations.
      `;

      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });
      
      setForecasting(result.text || "No forecast generated.");
    } catch (error) {
      console.error("AI Forecast Error:", error);
      toast.error("Failed to get AI forecast");
    } finally {
      setIsForecasting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-[#141414] tracking-tight">Reports & Analytics</h2>
          <p className="text-sm text-gray-500 mt-1">Comprehensive insights into your business performance.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
            <Calendar size={16} className="text-gray-400" />
            <select 
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="text-sm font-medium outline-none bg-transparent"
            >
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
            </select>
          </div>
          <button 
            onClick={generatePDF}
            className="flex items-center gap-2 px-4 py-2 bg-[#141414] text-white rounded-lg text-sm font-medium hover:bg-black transition-colors"
          >
            <Download size={16} />
            Export PDF
          </button>
        </div>
      </div>

      <div id="report-content" className="space-y-6 p-4 rounded-2xl" style={{ backgroundColor: '#f9fafb' }}>
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg" style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
                <DollarSign size={20} />
              </div>
              <div className="flex items-center gap-1 text-xs font-medium" style={{ color: '#16a34a' }}>
                <TrendingUp size={12} />
                {stats.salesGrowth}%
              </div>
            </div>
            <p className="text-sm" style={{ color: '#6b7280' }}>Total Sales</p>
            <h3 className="text-2xl font-bold text-[#141414]">৳{stats.totalSales.toLocaleString()}</h3>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg" style={{ backgroundColor: '#fff7ed', color: '#ea580c' }}>
                <ShoppingCart size={20} />
              </div>
              <div className="flex items-center gap-1 text-xs font-medium" style={{ color: '#16a34a' }}>
                <TrendingUp size={12} />
                {stats.ordersGrowth}%
              </div>
            </div>
            <p className="text-sm" style={{ color: '#6b7280' }}>Total Orders</p>
            <h3 className="text-2xl font-bold text-[#141414]">{stats.totalOrders}</h3>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg" style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}>
                <Users size={20} />
              </div>
            </div>
            <p className="text-sm" style={{ color: '#6b7280' }}>Total Customers</p>
            <h3 className="text-2xl font-bold text-[#141414]">{stats.totalCustomers}</h3>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg" style={{ backgroundColor: '#faf5ff', color: '#9333ea' }}>
                <Package size={20} />
              </div>
            </div>
            <p className="text-sm" style={{ color: '#6b7280' }}>Active Products</p>
            <h3 className="text-2xl font-bold text-[#141414]">{stats.totalProducts}</h3>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sales Trend */}
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h4 className="font-bold text-gray-900">Sales Trend</h4>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#3b82f6' }}></div>
                  <span className="text-gray-500">Sales</span>
                </div>
              </div>
            </div>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesData}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: 'none', 
                      borderRadius: '8px', 
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' 
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="sales" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorSales)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Selling Products */}
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <h4 className="font-bold text-gray-900 mb-6">Top Selling Products</h4>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    width={100}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: 'none', 
                      borderRadius: '8px', 
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' 
                    }}
                  />
                  <Bar dataKey="sales" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Category Distribution */}
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <h4 className="font-bold text-gray-900 mb-6">Sales by Category</h4>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [`৳${value.toLocaleString()}`, 'Sales']}
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: 'none', 
                      borderRadius: '8px', 
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' 
                    }}
                  />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Order Source Distribution */}
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <h4 className="font-bold text-gray-900 mb-6">Orders by Source</h4>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sourceData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    width={100}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    formatter={(value: number) => [value, 'Orders']}
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: 'none', 
                      borderRadius: '8px', 
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' 
                    }}
                  />
                  <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* AI Forecasting */}
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Sparkles style={{ color: '#9333ea' }} size={20} />
                <h4 className="font-bold text-gray-900">AI Sales Forecast</h4>
              </div>
              <button 
                onClick={getAIForecast}
                disabled={isForecasting}
                className="text-xs font-bold hover:underline flex items-center gap-1"
                style={{ color: '#9333ea' }}
              >
                {isForecasting ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                Generate Forecast
              </button>
            </div>
            
            <div className="flex-1 rounded-xl p-4 border border-purple-100 overflow-y-auto max-h-64" style={{ backgroundColor: '#faf5ff' }}>
              {forecasting ? (
                <div className="prose prose-sm max-w-none">
                  <div className="text-xs whitespace-pre-wrap leading-relaxed" style={{ color: '#374151' }}>
                    {forecasting}
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center gap-3">
                  <div className="p-3 rounded-full" style={{ backgroundColor: '#f3e8ff', color: '#9333ea' }}>
                    <Sparkles size={24} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">Unlock AI Insights</p>
                    <p className="text-xs mt-1" style={{ color: '#6b7280' }}>Generate a forecast based on your recent sales data.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
