import React, { useState, useEffect, useCallback } from 'react';
import { 
  ShoppingCart, 
  Search, 
  Filter, 
  RefreshCw, 
  ExternalLink, 
  Eye, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Truck, 
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Download,
  Calendar,
  CreditCard,
  User,
  MapPin,
  Phone,
  Mail,
  Package,
  History
} from 'lucide-react';
import { WooCommerceService, WooCommerceOrder } from '../services/woocommerceService';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-orange-50 text-orange-600 border-orange-100',
  processing: 'bg-blue-50 text-blue-600 border-blue-100',
  on_hold: 'bg-gray-50 text-gray-600 border-gray-100',
  completed: 'bg-green-50 text-green-600 border-green-100',
  cancelled: 'bg-red-50 text-red-600 border-red-100',
  refunded: 'bg-purple-50 text-purple-600 border-purple-100',
  failed: 'bg-red-50 text-red-600 border-red-100',
  shipped: 'bg-indigo-50 text-indigo-600 border-indigo-100',
};

const STATUS_ICONS: Record<string, any> = {
  pending: Clock,
  processing: History,
  on_hold: AlertCircle,
  completed: CheckCircle2,
  cancelled: XCircle,
  refunded: RefreshCw,
  failed: AlertCircle,
  shipped: Truck,
};

export default function WooCommerceOrders() {
  const [orders, setOrders] = useState<WooCommerceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<WooCommerceOrder | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchOrders = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    
    try {
      const response = await WooCommerceService.getOrders({
        page,
        per_page: 10,
        status,
        search
      });
      setOrders(response.orders);
      setTotalPages(response.totalPages);
      setTotalOrders(response.totalOrders);
    } catch (error: any) {
      console.error('Error fetching WooCommerce orders:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch WooCommerce orders. Please check your API settings.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, status, search]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleUpdateStatus = async (id: number, newStatus: string) => {
    setIsUpdating(true);
    try {
      await WooCommerceService.updateOrderStatus(id, newStatus);
      toast.success(`Order #${id} status updated to ${newStatus}`);
      fetchOrders(true);
      if (selectedOrder?.id === id) {
        setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast.error('Failed to update order status');
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusLabel = (status: string) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-[#141414] tracking-tight flex items-center gap-3">
            <ShoppingCart className="text-[#00AEEF]" size={32} />
            WooCommerce Orders
          </h2>
          <p className="text-sm text-gray-500 mt-1">Manage and sync orders from your WooCommerce store.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => fetchOrders(true)}
            disabled={refreshing || loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-100 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
          >
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Syncing...' : 'Sync Orders'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text"
              placeholder="Search by Order ID, Customer Name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && setPage(1)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-transparent rounded-xl text-sm focus:bg-white focus:border-[#00AEEF]/20 outline-none transition-all"
            />
          </div>
          <div className="flex flex-wrap gap-4">
            <select 
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="px-4 py-2.5 bg-gray-50 border border-transparent rounded-xl text-sm focus:bg-white focus:border-[#00AEEF]/20 outline-none transition-all min-w-[160px]"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="on-hold">On Hold</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="refunded">Refunded</option>
              <option value="failed">Failed</option>
            </select>
            <button 
              onClick={() => { setStatus(''); setSearch(''); setPage(1); }}
              className="px-4 py-2.5 text-sm font-bold text-gray-500 hover:text-[#00AEEF] transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Order ID</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Customer</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Products</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={7} className="px-6 py-8">
                      <div className="h-4 bg-gray-100 rounded w-full"></div>
                    </td>
                  </tr>
                ))
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3 text-gray-400">
                      <ShoppingCart size={48} strokeWidth={1} />
                      <p className="text-sm">No WooCommerce orders found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const StatusIcon = STATUS_ICONS[order.status] || AlertCircle;
                  return (
                    <tr key={order.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-gray-900">#{order.id}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-gray-900">
                            {order.billing.first_name} {order.billing.last_name}
                          </span>
                          <span className="text-xs text-gray-500">{order.billing.phone}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm text-gray-700">
                            {order.line_items.length} {order.line_items.length === 1 ? 'item' : 'items'}
                          </span>
                          <span className="text-xs text-gray-400 truncate max-w-[200px]">
                            {order.line_items.map(item => item.name).join(', ')}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-[#141414]">
                          {order.total} {order.currency}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${STATUS_COLORS[order.status] || 'bg-gray-50 text-gray-600 border-gray-100'}`}>
                          <StatusIcon size={12} />
                          {getStatusLabel(order.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-gray-500">
                          {format(new Date(order.date_created), 'MMM d, yyyy')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => setSelectedOrder(order)}
                          className="p-2 text-gray-400 hover:text-[#00AEEF] hover:bg-[#00AEEF]/5 rounded-lg transition-all"
                        >
                          <Eye size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && totalOrders > 0 && (
          <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-500 font-medium">
              Showing <span className="text-gray-900 font-bold">{(page - 1) * 10 + 1}</span> to <span className="text-gray-900 font-bold">{Math.min(page * 10, totalOrders)}</span> of <span className="text-gray-900 font-bold">{totalOrders}</span> orders
            </p>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 text-gray-400 hover:text-[#00AEEF] disabled:opacity-30 transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                  const pageNum = i + 1;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                        page === pageNum 
                          ? 'bg-[#00AEEF] text-white shadow-md shadow-[#00AEEF]/20' 
                          : 'text-gray-500 hover:bg-gray-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 text-gray-400 hover:text-[#00AEEF] disabled:opacity-30 transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedOrder(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-[#00AEEF]">
                    <ShoppingCart size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Order #{selectedOrder.id}</h3>
                    <p className="text-xs text-gray-500">Placed on {format(new Date(selectedOrder.date_created), 'MMMM d, yyyy h:mm a')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <select 
                    value={selectedOrder.status}
                    onChange={(e) => handleUpdateStatus(selectedOrder.id, e.target.value)}
                    disabled={isUpdating}
                    className="px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-gray-700 outline-none focus:border-[#00AEEF]/20 transition-all disabled:opacity-50"
                  >
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="on-hold">On Hold</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="refunded">Refunded</option>
                    <option value="failed">Failed</option>
                  </select>
                  <button 
                    onClick={() => setSelectedOrder(null)}
                    className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    <XCircle size={24} className="text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-auto p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* Customer Info */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <User size={14} /> Customer Details
                    </h4>
                    <div className="bg-gray-50 p-4 rounded-2xl space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-gray-400 shadow-sm">
                          <User size={16} />
                        </div>
                        <span className="text-sm font-bold text-gray-900">{selectedOrder.billing.first_name} {selectedOrder.billing.last_name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-gray-400 shadow-sm">
                          <Mail size={16} />
                        </div>
                        <span className="text-sm text-gray-600">{selectedOrder.billing.email}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-gray-400 shadow-sm">
                          <Phone size={16} />
                        </div>
                        <span className="text-sm text-gray-600">{selectedOrder.billing.phone}</span>
                      </div>
                    </div>
                  </div>

                  {/* Shipping Info */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <MapPin size={14} /> Shipping Address
                    </h4>
                    <div className="bg-gray-50 p-4 rounded-2xl space-y-2">
                      <p className="text-sm font-bold text-gray-900">{selectedOrder.shipping.first_name} {selectedOrder.shipping.last_name}</p>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {selectedOrder.shipping.address_1}<br />
                        {selectedOrder.shipping.address_2 && <>{selectedOrder.shipping.address_2}<br /></>}
                        {selectedOrder.shipping.city}, {selectedOrder.shipping.state} {selectedOrder.shipping.postcode}<br />
                        {selectedOrder.shipping.country}
                      </p>
                    </div>
                  </div>

                  {/* Payment Info */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <CreditCard size={14} /> Payment Details
                    </h4>
                    <div className="bg-gray-50 p-4 rounded-2xl space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-gray-400 shadow-sm">
                          <CreditCard size={16} />
                        </div>
                        <span className="text-sm font-bold text-gray-900">{selectedOrder.payment_method_title}</span>
                      </div>
                      {selectedOrder.transaction_id && (
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Transaction ID</span>
                          <span className="text-xs font-mono text-gray-600">{selectedOrder.transaction_id}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Items Table */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Package size={14} /> Order Items
                  </h4>
                  <div className="border border-gray-100 rounded-2xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Product</th>
                          <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">SKU</th>
                          <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Qty</th>
                          <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Price</th>
                          <th className="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {selectedOrder.line_items.map((item) => (
                          <tr key={item.id}>
                            <td className="px-6 py-4">
                              <span className="text-sm font-bold text-gray-900">{item.name}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-xs font-mono text-gray-500">{item.sku || 'N/A'}</span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="text-sm text-gray-700">x{item.quantity}</span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className="text-sm text-gray-700">{item.price} {selectedOrder.currency}</span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className="text-sm font-bold text-gray-900">{item.total} {selectedOrder.currency}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-gray-50/50">
                          <td colSpan={4} className="px-6 py-4 text-right text-sm font-bold text-gray-500">Subtotal</td>
                          <td className="px-6 py-4 text-right text-sm font-bold text-gray-900">
                            {(parseFloat(selectedOrder.total) - parseFloat(selectedOrder.total_tax)).toFixed(2)} {selectedOrder.currency}
                          </td>
                        </tr>
                        <tr className="bg-gray-50/50">
                          <td colSpan={4} className="px-6 py-4 text-right text-sm font-bold text-gray-500">Tax</td>
                          <td className="px-6 py-4 text-right text-sm font-bold text-gray-900">{selectedOrder.total_tax} {selectedOrder.currency}</td>
                        </tr>
                        <tr className="bg-gray-50 border-t border-gray-100">
                          <td colSpan={4} className="px-6 py-4 text-right text-sm font-bold text-gray-900 uppercase tracking-wider">Grand Total</td>
                          <td className="px-6 py-4 text-right text-lg font-bold text-[#00AEEF]">{selectedOrder.total} {selectedOrder.currency}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Customer Note */}
                {selectedOrder.customer_note && (
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <FileText size={14} /> Customer Note
                    </h4>
                    <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl text-sm text-orange-800 leading-relaxed italic">
                      "{selectedOrder.customer_note}"
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <History size={14} />
                  Last modified: {format(new Date(selectedOrder.date_modified), 'MMM d, yyyy h:mm a')}
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => window.print()}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
                  >
                    <Download size={18} /> Print Invoice
                  </button>
                  <button 
                    onClick={() => setSelectedOrder(null)}
                    className="px-6 py-2 bg-[#141414] text-white rounded-xl text-sm font-bold hover:bg-black transition-all shadow-lg shadow-black/10"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

const FileText = ({ className, size }: { className?: string, size?: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size || 24}
    height={size || 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <line x1="10" y1="9" x2="8" y2="9" />
  </svg>
);
