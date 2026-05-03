import React, { useState, useEffect } from "react";
import {
  X,
  Package,
  User,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
  Truck,
  History,
  ShoppingBag,
  Image as ImageIcon,
  Printer,
  Zap,
  Box,
  Clock,
  CheckCircle2,
  AlertCircle,
  Hash,
  Activity,
  ArrowRight,
  Loader2,
  FileText,
  RefreshCw,
  Pencil,
  ChevronRight,
  Edit2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { db, collection, query, where, getDocs, orderBy } from "../firebase";
import { openPrintWindow } from "../utils/printHelper";
import { useSettings } from "../contexts/SettingsContext";

interface OrderDetailsModalProps {
  order: any;
  onClose: () => void;
  products: any[];
  variants: any[];
  currencySymbol: string;
  onPrintInvoice?: (order: any) => void;
  onSendToCourier?: (order: any) => void;
}

export default function OrderDetailsModal({
  order,
  onClose,
  products,
  variants,
  currencySymbol,
  onPrintInvoice,
  onSendToCourier,
}: OrderDetailsModalProps) {
  const [customerHistory, setCustomerHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!order.customerPhone) return;
      setLoadingHistory(true);
      try {
        const q = query(
          collection(db, "orders"),
          where("customerPhone", "==", order.customerPhone),
          orderBy("createdAt", "desc"),
        );
        const snap = await getDocs(q);
        setCustomerHistory(
          snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
        );
      } catch (error) {
        console.error("Error fetching customer history:", error);
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchHistory();
  }, [order.customerPhone]);

  const getProductImage = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    return product?.image || product?.images?.[0] || null;
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<
      string,
      { label: string; color: string; ring: string; icon: any }
    > = {
      pending: {
        label: "Pending",
        color: "bg-amber-500",
        ring: "ring-amber-100",
        icon: Clock,
      },
      confirmed: {
        label: "Confirmed",
        color: "bg-brand",
        ring: "ring-cyan-100",
        icon: CheckCircle2,
      },
      processing: {
        label: "Processing",
        color: "bg-brand",
        ring: "ring-blue-100",
        icon: Zap,
      },
      shipped: {
        label: "Shipped",
        color: "bg-indigo-600",
        ring: "ring-indigo-100",
        icon: Truck,
      },
      delivered: {
        label: "Delivered",
        color: "bg-emerald-500",
        ring: "ring-emerald-100",
        icon: Package,
      },
      cancelled: {
        label: "Cancelled",
        color: "bg-red-500",
        ring: "ring-red-100",
        icon: X,
      },
      returned: {
        label: "Returned",
        color: "bg-surface-hover0",
        ring: "ring-slate-100",
        icon: History,
      },
    };
    return (
      configs[status.toLowerCase()] || {
        label: status,
        color: "bg-gray-400",
        ring: "ring-gray-100",
        icon: AlertCircle,
      }
    );
  };

  const statusConfig = getStatusConfig(order.status);
  const StatusIcon = statusConfig.icon;

  const handlePrintInvoice = () => {
    if (onPrintInvoice) {
      onPrintInvoice(order);
    }
  };

  const calculation = {
    subtotal:
      order.items?.reduce(
        (sum: number, item: any) => sum + item.price * item.quantity,
        0,
      ) || 0,
    delivery: order.deliveryCharge || 0,
    discount: order.discount || 0,
    total: order.totalAmount || 0,
    paid: order.paidAmount || 0,
    due: order.dueAmount || 0,
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-2 sm:p-4 no-print overflow-hidden"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 10 }}
          className="bg-surface w-full max-w-5xl max-h-[96vh] rounded-2xl sm:rounded-[2rem] shadow-2xl overflow-hidden flex flex-col relative border border-border"
        >
          {/* Compact Header */}
          <div className="h-16 sm:h-20 border-b border-border flex items-center justify-between px-4 sm:px-8 bg-surface/80 backdrop-blur-md sticky top-0 z-30">
            <div className="flex items-center gap-3 sm:gap-5">
              <div
                className={`w-10 h-10 rounded-xl ${statusConfig.color} flex items-center justify-center text-white shadow-subtle shadow-black/10`}
              >
                <StatusIcon size={18} strokeWidth={2.5} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-lg font-bold text-primary truncate">
                    #{order.orderNumber || order.id.slice(0, 8)}
                  </h3>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase text-white ${statusConfig.color}`}
                  >
                    {statusConfig.label}
                  </span>
                </div>
                <p className="text-[10px] font-medium text-muted mt-0.5">
                  Placed on{" "}
                  {order.createdAt?.toDate
                    ? order.createdAt.toDate().toLocaleDateString()
                    : new Date(order.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-xl bg-surface-hover flex items-center justify-center text-muted hover:bg-red-50 hover:text-red-500 transition-all active:scale-90 border border-border"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-hide">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 lg:divide-x lg:divide-border">
              {/* Main Content Area */}
              <div className="lg:col-span-8 p-4 sm:p-8 space-y-8">
                {/* Horizontal Status Track - Optimized */}
                <div className="bg-surface-hover/50 p-6 rounded-2xl border border-border overflow-x-auto no-scrollbar">
                  <div className="flex items-center justify-between min-w-[500px] px-2">
                    {[
                      "pending",
                      "confirmed",
                      "processing",
                      "shipped",
                      "delivered",
                    ].map((s, idx, arr) => {
                      const isPastOrCurrent =
                        arr.indexOf(order.status.toLowerCase()) >= idx;
                      const isCurrent = order.status.toLowerCase() === s;
                      return (
                        <React.Fragment key={s}>
                          <div className="flex flex-col items-center gap-2 relative">
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${
                                isCurrent
                                  ? `${statusConfig.color} scale-110 shadow-lg text-white ring-4 ${statusConfig.ring}`
                                  : isPastOrCurrent
                                    ? "bg-slate-900 dark:bg-white text-white dark:text-black"
                                    : "bg-surface text-muted border border-border"
                              }`}
                            >
                              {isPastOrCurrent && !isCurrent ? (
                                <CheckCircle2 size={14} strokeWidth={3} />
                              ) : idx === 0 ? (
                                <Clock size={14} />
                              ) : idx === 1 ? (
                                <User size={14} />
                              ) : idx === 2 ? (
                                <Zap size={14} />
                              ) : idx === 3 ? (
                                <Truck size={14} />
                              ) : (
                                <Package size={14} />
                              )}
                            </div>
                            <span
                              className={`text-[8px] font-bold uppercase tracking-wider ${isPastOrCurrent ? "text-primary" : "text-muted"}`}
                            >
                              {s}
                            </span>
                          </div>
                          {idx < arr.length - 1 && (
                            <div
                              className={`flex-1 h-0.5 mx-1 rounded-full ${isPastOrCurrent && arr.indexOf(order.status.toLowerCase()) > idx ? "bg-slate-900 dark:bg-white text-white dark:text-black" : "bg-gray-200"}`}
                            />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>

                {order.isExchange && (
                  <div className="flex items-center justify-between p-4 bg-orange-50/80 border border-orange-200/60 rounded-2xl">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-orange-500/10 text-orange-600 flex items-center justify-center rounded-xl flex-shrink-0">
                        <RefreshCw size={18} strokeWidth={2.5} />
                      </div>
                      <div>
                        <h4 className="text-[13px] font-bold text-orange-600 mb-0.5">Order Exchange Requested</h4>
                        <p className="text-[11px] text-orange-600/70">Requested on {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString() : new Date(order.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <button className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white border border-orange-200 rounded-lg text-[11px] font-semibold text-orange-700 hover:bg-orange-100/50 transition-colors shadow-sm">
                      <span>View Exchange Details</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                )}

                {/* Manifest Items - Lean Design */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted">
                      Order Items
                    </h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-surface-hover rounded text-secondary">
                      {order.items?.length || 0} Products
                    </span>
                  </div>

                  <div className="divide-y divide-border">
                    {order.items?.map((item: any, idx: number) => {
                      const productImage = getProductImage(item.productId);
                      return (
                        <div
                          key={idx}
                          className="flex items-center gap-4 py-4 hover:bg-surface-hover/50 px-2 rounded-xl transition-colors"
                        >
                          <div className="w-16 h-16 rounded-xl bg-surface-hover flex-shrink-0 overflow-hidden border border-border">
                            {productImage ? (
                              <img
                                src={productImage}
                                alt={item.name}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted">
                                <Box size={24} />
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <h5 className="text-sm font-bold text-primary truncate">
                              {item.name}
                            </h5>
                            <div className="flex items-center gap-2 mt-1">
                              {item.variant && (
                                <span className="text-[9px] font-bold bg-brand/10 text-brand px-1.5 py-0.5 rounded">
                                  {item.variant}
                                </span>
                              )}
                              <span className="text-[10px] font-medium text-muted tracking-tight">
                                Quantity: {item.quantity}
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <p className="text-sm font-bold text-primary">
                              {currencySymbol}
                              {(item.quantity * item.price).toLocaleString()}
                            </p>
                            <p className="text-[9px] font-medium text-muted">
                              @{currencySymbol}
                              {item.price}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Order Notes */}
                {order.notes && (
                  <div className="relative p-5 bg-brand/5 border border-brand/10 rounded-2xl group">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="text-brand" />
                        <h4 className="text-[11px] font-black uppercase tracking-widest text-brand">
                          Order Note
                        </h4>
                      </div>
                      <span className="text-[10px] font-medium text-muted">
                        Added on{" "}
                        {order.createdAt?.toDate
                          ? order.createdAt.toDate().toLocaleDateString()
                          : new Date(order.createdAt).toLocaleDateString()}{" "}
                        &bull;{" "}
                        {order.createdAt?.toDate
                          ? order.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[13px] text-primary/80 font-medium leading-relaxed pl-6 max-w-[80%] pb-2">
                      {order.notes}
                    </p>
                    <button className="absolute bottom-4 right-4 flex items-center gap-1.5 px-3 py-1.5 bg-white border border-brand/20 rounded-lg text-[11px] font-semibold text-brand hover:bg-brand hover:text-white transition-colors shadow-sm">
                      <Edit2 size={12} strokeWidth={2.5} />
                      <span>Edit Note</span>
                    </button>
                  </div>
                )}

                {/* Logistics Bar - Compact */}
                <div className="bg-surface p-6 rounded-2xl flex items-center justify-between gap-4 border border-border shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                      <Truck size={20} className="text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-secondary uppercase tracking-widest mb-1">
                        Logistic Method
                      </p>
                      <h4 className="text-[15px] font-black text-primary">
                        {order.courierName || "Standard Shipping"}
                      </h4>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-bold text-secondary uppercase tracking-widest mb-0.5">
                      Shipping Fee
                    </p>
                    <span className="text-xl font-bold text-emerald-600">
                      {calculation.delivery === 0 ? "৳0" : `${currencySymbol}${calculation.delivery.toLocaleString()}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sidebar Area - Condensed Info */}
              <div className="lg:col-span-4 bg-surface-hover/30 p-4 sm:p-8 space-y-10">
                {/* Customer Identity */}
                <div className="space-y-6">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-brand flex items-center gap-2">
                    <User size={12} strokeWidth={3} /> Customer Details
                  </h4>
                  <div className="space-y-4">
                    <div className="flex gap-4 items-start">
                      <div className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center text-muted shadow-subtle">
                        <User size={16} />
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-muted uppercase tracking-wider mb-0.5">
                          Full Name
                        </p>
                        <p className="text-sm font-bold text-primary">
                          {order.customerName}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-4 items-start">
                      <div className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center text-muted shadow-subtle">
                        <Phone size={16} />
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-muted uppercase tracking-wider mb-0.5">
                          Phone Number
                        </p>
                        <p className="text-sm font-bold text-primary">
                          {order.customerPhone}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-4 items-start">
                      <div className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center text-muted shadow-subtle">
                        <MapPin size={16} />
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-muted uppercase tracking-wider mb-0.5">
                          Delivery Address
                        </p>
                        <p className="text-[11px] font-medium text-secondary leading-normal">
                          {order.customerAddress}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Financial Summary - Lean */}
                <div className="bg-surface p-6 rounded-2xl border border-border shadow-subtle space-y-4">
                  <div className="flex justify-between items-center text-[11px] font-bold text-muted">
                    <span>Subtotal</span>
                    <span className="text-primary">
                      {currencySymbol}
                      {calculation.subtotal.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] font-bold text-muted">
                    <span>Shipping</span>
                    <span className="text-primary">
                      {currencySymbol}
                      {calculation.delivery.toLocaleString()}
                    </span>
                  </div>
                  {calculation.discount > 0 && (
                    <div className="flex justify-between items-center text-[11px] font-bold text-emerald-600">
                      <span>Discount</span>
                      <span>
                        -{currencySymbol}
                        {calculation.discount.toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div className="h-px bg-surface-hover" />
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-xs font-black text-primary uppercase">
                      Order Total
                    </span>
                    <span className="text-lg font-black text-brand">
                      {currencySymbol}
                      {calculation.total.toLocaleString()}
                    </span>
                  </div>

                  <div className="pt-4 border-t border-border flex items-center justify-between">
                    <div>
                      <p className="text-[9px] font-bold text-muted uppercase tracking-wider mb-0.5">
                        Due Amount
                      </p>
                      <p
                        className={`text-xl font-black ${calculation.due > 0 ? "text-orange-500" : "text-emerald-500"}`}
                      >
                        {currencySymbol}
                        {calculation.due.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-bold text-muted uppercase tracking-wider mb-0.5">
                        Paid
                      </p>
                      <p className="text-xs font-bold text-secondary">
                        {currencySymbol}
                        {calculation.paid.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Compact History Record */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted flex items-center gap-2">
                      <History size={12} /> Recent History
                    </h4>
                    <span className="text-[9px] font-bold text-muted">
                      {customerHistory.length} Total
                    </span>
                  </div>
                  <div className="space-y-3 max-h-[200px] overflow-y-auto no-scrollbar">
                    {loadingHistory ? (
                      <div className="flex justify-center py-6">
                        <Loader2
                          className="animate-spin text-muted"
                          size={20}
                        />
                      </div>
                    ) : customerHistory.length <= 1 ? (
                      <div className="text-center py-6 bg-surface rounded-xl border border-dashed border-border">
                        <p className="text-[9px] font-bold text-muted uppercase">
                          No other records
                        </p>
                      </div>
                    ) : (
                      customerHistory
                        .filter((h) => h.id !== order.id)
                        .slice(0, 3)
                        .map((h, idx) => (
                          <div
                            key={idx}
                            className="bg-surface p-3 rounded-xl border border-border flex items-center justify-between"
                          >
                            <div>
                              <p className="text-[10px] font-bold text-primary">
                                #{h.orderNumber || h.id.slice(0, 8)}
                              </p>
                              <p className="text-[9px] font-medium text-muted">
                                {(() => {
                                  if (!h.createdAt) return "Date unknown";
                                  const d = h.createdAt?.toDate
                                    ? h.createdAt.toDate()
                                    : new Date(h.createdAt);
                                  return isNaN(d.getTime())
                                    ? "Invalid date"
                                    : d.toLocaleDateString();
                                })()}
                              </p>
                            </div>
                            <span className="text-xs font-bold text-primary">
                              {currencySymbol}
                              {h.totalAmount.toLocaleString()}
                            </span>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Footer - Sticky */}
          <div className="px-4 sm:px-8 py-4 sm:py-6 bg-surface border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 z-40 sticky bottom-0">
            <div className="flex items-center gap-4 w-full sm:w-auto overflow-x-auto no-scrollbar">
              <button
                className="flex items-center gap-2.5 text-secondary hover:text-primary transition-all whitespace-nowrap group"
                onClick={() => window.print()}
              >
                <div className="w-9 h-9 rounded-lg bg-surface-hover flex items-center justify-center border border-border group-hover:bg-surface-hover group-hover:border-border transition-all">
                  <Printer size={15} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  Print Label
                </span>
              </button>
              {onPrintInvoice && (
                <button
                  className="flex items-center gap-2.5 text-brand hover:text-brand-hover transition-all whitespace-nowrap group"
                  onClick={handlePrintInvoice}
                >
                  <div className="w-9 h-9 rounded-lg bg-brand/10 flex items-center justify-center border border-brand/20 group-hover:bg-brand/20 transition-all">
                    <FileText size={15} />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    A5 Invoice
                  </span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={onClose}
                className="flex-1 sm:flex-none px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest text-muted border border-border hover:bg-surface-hover transition-all"
              >
                Close
              </button>
              {onSendToCourier &&
                !["shipped", "delivered", "cancelled", "returned"].includes(
                  order.status,
                ) && (
                  <button
                    onClick={() => onSendToCourier(order)}
                    className="flex-1 sm:flex-none px-8 py-3 bg-brand text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-hover transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand/20"
                  >
                    <Truck size={15} strokeWidth={3} />
                    Ship Order
                  </button>
                )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
