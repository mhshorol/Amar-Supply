import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
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
  PackageX,
  X,
  Infinity,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Check,
} from "lucide-react";
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
  Cell,
} from "recharts";
import { Link } from "react-router-dom";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { handleFirestoreError, OperationType } from "../lib/firestore-errors";

import { useSettings } from "../contexts/SettingsContext";
import { useAuth } from "../contexts/AuthContext";

const StatCard = ({
  title,
  value,
  icon: Icon,
  trend,
  trendValue,
  delay = 0,
  iconBg,
  iconColor,
}: any) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay }}
    className="bg-surface border border-border rounded-[20px] p-4 lg:p-5 flex flex-col justify-between shadow-subtle hover:shadow-premium transition-shadow relative overflow-hidden"
  >
    <div className="flex flex-col mb-2 lg:mb-4">
      <div
        className={`w-10 h-10 lg:w-12 lg:h-12 rounded-[14px] flex items-center justify-center ${iconBg} mb-3`}
      >
        <Icon size={20} className={iconColor} strokeWidth={2} />
      </div>
      <div>
        <p className="text-[10px] lg:text-[11px] font-bold text-muted uppercase tracking-widest leading-tight">
          {title}
        </p>
        <h3 className="text-xl lg:text-2xl 2xl:text-3xl font-black text-primary mt-1 tracking-tight">
          {value}
        </h3>
      </div>
    </div>

    <div className="mt-auto text-[10px] xl:text-[11px] 2xl:text-[12px] font-medium flex items-center gap-1 flex-wrap">
      <span
        className={
          trend === "up" ? "text-success font-bold" : "text-danger font-bold"
        }
      >
        {trend === "up" ? "↗" : "↘"} {trendValue}
      </span>
      <span className="text-muted">vs month</span>
    </div>
  </motion.div>
);

const ProfileSummaryCard = ({
  name,
  growth,
  todayOrders,
  todaySales,
  currencySymbol,
}: {
  name: string;
  growth: number;
  todayOrders: number;
  todaySales: number;
  currencySymbol: string;
}) => {
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
          <h4 className="text-[11px] text-white/60 font-extrabold uppercase tracking-[.25em]">
            Live Stats
          </h4>
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-white leading-tight mb-2">
          Welcome back,
          <br />
          <span className="text-white/90">{name.split(" ")[0]}</span>
        </h2>
        <p className="text-white/80 text-[13px] font-medium leading-relaxed max-w-[200px]">
          Your daily sales performance is {growth >= 0 ? "up" : "down"}{" "}
          <span className="text-white font-bold">{Math.abs(growth)}%</span> from
          yesterday.
        </p>
      </div>

      <div className="relative z-10 grid grid-cols-2 gap-8 border-t border-white/10 pt-8 mt-8">
        <div>
          <p className="text-[10px] text-white/50 font-extrabold uppercase tracking-widest mb-1">
            Today's Orders
          </p>
          <p className="text-xl font-bold text-white">{todayOrders}</p>
        </div>
        <div>
          <p className="text-[10px] text-white/50 font-extrabold uppercase tracking-widest mb-1">
            Today's Revenue
          </p>
          <p className="text-xl font-bold text-white">
            {currencySymbol}
            {todaySales.toLocaleString()}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

const SectionHeader = ({
  title,
  showSelect = false,
  subtitle,
}: {
  title: string;
  showSelect?: boolean;
  subtitle?: string;
}) => (
  <div className="flex items-center justify-between mb-8">
    <div>
      <h3 className="text-xl font-bold text-primary tracking-tight">{title}</h3>
      {subtitle && (
        <p className="text-xs font-semibold text-muted mt-1 uppercase tracking-wider">
          {subtitle}
        </p>
      )}
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
        <p className="text-[10px] font-black text-muted uppercase tracking-widest mb-2">
          {label}
        </p>
        <div className="space-y-3">
          {payload.map((entry: any, index: number) => (
            <div
              key={index}
              className="flex items-center justify-between gap-6"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-[11px] font-bold text-secondary">
                  {entry.name}
                </span>
              </div>
              <span className="text-xs font-black text-primary">
                {currencySymbol} {entry.value.toLocaleString()}
              </span>
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
  const [inventory, setInventory] = useState<any[]>([]);
  const [customersCount, setCustomersCount] = useState<number>(0);

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [teamMembers, setTeamMembers] = useState<{ [key: string]: string }>({});
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [tempFilterType, setTempFilterType] = useState<"all" | "month" | "custom">("month");
  const [tempSelectedMonth, setTempSelectedMonth] = useState<number>(new Date().getMonth());
  const [tempSelectedYear, setTempSelectedYear] = useState<number>(new Date().getFullYear());

  const filteredOrders = useMemo(() => {
    if (monthFilter === "all") return orders;
    const [filterYear, filterMonth] = monthFilter.split("-").map(Number);
    return orders.filter((o: any) => {
      try {
        if (!o.createdAt) return false;
        const createdAt =
          o.createdAt?.toDate?.() ||
          (o.createdAt?.seconds
            ? new Date(o.createdAt.seconds * 1000)
            : new Date(o.createdAt));
        if (!createdAt || isNaN(createdAt.getTime())) return false;
        return (
          createdAt.getMonth() + 1 === filterMonth &&
          createdAt.getFullYear() === filterYear
        );
      } catch (e) {
        return false;
      }
    });
  }, [orders, monthFilter]);

  useEffect(() => {
    const unsubUsers = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        const usersMap: { [key: string]: string } = {};
        snapshot.docs.forEach((doc) => {
          usersMap[doc.id] =
            doc.data().name || doc.data().displayName || doc.id;
        });
        setTeamMembers(usersMap);
      },
      (error) => {
        if (error.code !== "permission-denied") {
          handleFirestoreError(error, OperationType.LIST, "users");
        }
      },
    );

    return () => unsubUsers();
  }, []);

  useEffect(() => {
    if (!authUser) return;

    setLoading(true);

    const unsubOrders = onSnapshot(
      query(
        collection(db, "orders"),
        orderBy("createdAt", "desc"),
        limit(1500),
      ),
      (snapshot) => {
        setOrders(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      },
      (error) => {
        setLoading(false);
        if (error.code !== "permission-denied") {
          handleFirestoreError(error, OperationType.LIST, "orders");
        }
      },
    );

    const unsubCustomers = onSnapshot(
      collection(db, "customers"),
      (snapshot) => {
        setCustomersCount(snapshot.size);
      },
      (error) => {
        if (error.code !== "permission-denied") {
          handleFirestoreError(error, OperationType.LIST, "customers");
        }
      },
    );

    const unsubProducts = onSnapshot(
      collection(db, "products"),
      (snapshot) => {
        setProducts(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      (error) => {
        if (error.code !== "permission-denied") {
          handleFirestoreError(error, OperationType.LIST, "products");
        }
      },
    );

    const unsubInventory = onSnapshot(
      collection(db, "inventory"),
      (snapshot) => {
        setInventory(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      (error) => {
        if (error.code !== "permission-denied") {
          handleFirestoreError(error, OperationType.LIST, "inventory");
        }
      },
    );

    return () => {
      unsubOrders();
      unsubCustomers();
      unsubProducts();
      unsubInventory();
    };
  }, [authUser]);

  const stats = useMemo(() => {
    const totalAmount = filteredOrders.reduce(
      (acc, o: any) => acc + (o.totalAmount || 0),
      0,
    );
    const totalPaid = filteredOrders.reduce(
      (acc, o: any) => acc + (o.paidAmount || 0),
      0,
    );
    const totalDue = filteredOrders.reduce(
      (acc, o: any) => acc + (o.dueAmount || 0),
      0,
    );
    const totalInvoice = filteredOrders.length;

    // Growth calculation
    const today = new Date().toISOString().split("T")[0];
    const todayOrdersList = filteredOrders.filter((o: any) => {
      try {
        if (!o.createdAt) return false;
        const createdAt =
          o.createdAt?.toDate?.() ||
          (o.createdAt?.seconds
            ? new Date(o.createdAt.seconds * 1000)
            : new Date(o.createdAt));
        if (!createdAt || isNaN(createdAt.getTime())) return false;
        return createdAt.toISOString().split("T")[0] === today;
      } catch (e) {
        return false;
      }
    });
    const todaySales = todayOrdersList.reduce(
      (acc, o: any) => acc + (o.totalAmount || 0),
      0,
    );

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];
    const yesterdayOrders = filteredOrders.filter((o: any) => {
      try {
        if (!o.createdAt) return false;
        const createdAt =
          o.createdAt?.toDate?.() ||
          (o.createdAt?.seconds
            ? new Date(o.createdAt.seconds * 1000)
            : new Date(o.createdAt));
        if (!createdAt || isNaN(createdAt.getTime())) return false;
        return createdAt.toISOString().split("T")[0] === yesterdayStr;
      } catch (e) {
        return false;
      }
    });
    const yesterdaySales = yesterdayOrders.reduce(
      (acc, o: any) => acc + (o.totalAmount || 0),
      0,
    );

    let salesGrowth = 0;
    if (yesterdaySales > 0) {
      salesGrowth = ((todaySales - yesterdaySales) / yesterdaySales) * 100;
    } else if (todaySales > 0) {
      salesGrowth = 100;
    }

    const cancelledOrders = filteredOrders.filter(
      (o: any) => o.status?.toLowerCase() === "cancelled",
    ).length;
    const returnedOrders = filteredOrders.filter(
      (o: any) => o.status?.toLowerCase() === "returned",
    ).length;
    const totalReturns = cancelledOrders + returnedOrders;
    const returnRateCalc =
      totalInvoice > 0 ? Math.round((totalReturns / totalInvoice) * 100) : 0;

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
      salesGrowth: parseFloat(salesGrowth.toFixed(1)),
    };
  }, [filteredOrders, customersCount, products.length]);

  const recentOrders = useMemo(() => {
    return [...filteredOrders]
      .sort(
        (a: any, b: any) =>
          (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0),
      )
      .slice(0, 10);
  }, [filteredOrders]);

  const bestSellingProducts = useMemo(() => {
    const productSales: {
      [key: string]: {
        name: string;
        quantity: number;
        revenue: number;
        image?: string;
      };
    } = {};
    filteredOrders.forEach((order: any) => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          const key = item.productId || item.id;
          if (!productSales[key]) {
            productSales[key] = {
              name: item.name,
              quantity: 0,
              revenue: 0,
              image: item.image,
            };
          }
          productSales[key].quantity += item.quantity || 0;
          productSales[key].revenue += (item.price || 0) * (item.quantity || 0);
        });
      }
    });

    return Object.values(productSales)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }, [filteredOrders]);

  const teamPerformance = useMemo(() => {
    const teamStats: {
      [key: string]: { name: string; total: number; processed: number };
    } = {};
    filteredOrders.forEach((order: any) => {
      if (order.uid) {
        if (!teamStats[order.uid]) {
          teamStats[order.uid] = { name: order.uid, total: 0, processed: 0 };
        }
        teamStats[order.uid].total++;
        if (
          order.status?.toLowerCase() !== "pending" &&
          order.status?.toLowerCase() !== "cancelled"
        ) {
          teamStats[order.uid].processed++;
        }
      }
    });
    return Object.values(teamStats).map((c) => ({
      ...c,
      name: teamMembers[c.name] || "Team Member",
      rate: Math.round((c.processed / c.total) * 100),
    }));
  }, [filteredOrders, teamMembers]);

  const monthlyPerformance = useMemo(() => {
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    return months.map((month, index) => {
      const monthOrders = orders.filter((o: any) => {
        const date = o.createdAt?.toDate
          ? o.createdAt.toDate()
          : o.createdAt?.seconds
            ? new Date(o.createdAt.seconds * 1000)
            : null;
        return (
          date &&
          date.getMonth() === index &&
          date.getFullYear() === selectedYear
        );
      });
      const revenue = monthOrders.reduce(
        (acc, o: any) => acc + (o.totalAmount || 0),
        0,
      );
      return {
        name: month,
        orders: revenue,
        profit: revenue * 0.45,
      };
    });
  }, [orders, selectedYear]);

  const lowStockProducts = useMemo(() => {
    return products
      .map((p) => {
        const stock = inventory
          .filter((i: any) => i.productId === p.id)
          .reduce((sum, inv) => sum + (inv.quantity || 0), 0);
        return { ...p, stock };
      })
      .filter((p: any) => p.stock <= (p.minStock || 5))
      .slice(0, 5);
  }, [products, inventory]);

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
          <h2 className="text-3xl font-bold text-primary tracking-tight">
            Dashboard
          </h2>
          <p className="text-secondary text-sm font-medium">
            Welcome back,{" "}
            <span className="text-brand font-semibold">
              {authUser?.name || teamMembers[authUser?.uid || ""] || "Mahmudul"}
            </span>
            ! Here's what's happening with your business today.
          </p>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 lg:gap-3 w-full lg:w-auto">
          {/* Date Picker Button */}
          <div className="relative flex items-center justify-between min-w-[180px] lg:min-w-[200px] gap-2 bg-surface text-secondary hover:text-primary border border-border hover:border-brand/30 rounded-lg shadow-subtle px-3 lg:px-4 py-2 lg:py-2.5 cursor-pointer text-xs lg:text-sm font-semibold transition-all group overflow-visible">
            <div
              className="absolute inset-0 z-10 cursor-pointer"
              onClick={() => {
                if (!isFilterOpen) {
                  if (monthFilter === "all") {
                    setTempFilterType("all");
                    setTempSelectedMonth(new Date().getMonth());
                    setTempSelectedYear(new Date().getFullYear());
                  } else {
                    const [year, month] = monthFilter.split("-").map(Number);
                    setTempFilterType("month");
                    setTempSelectedMonth(month - 1);
                    setTempSelectedYear(year);
                  }
                }
                setIsFilterOpen(!isFilterOpen);
              }}
            />

            <span className="pointer-events-none truncate select-none">
              {monthFilter === "all"
                ? "All Time"
                : (() => {
                    const [year, month] = monthFilter.split("-").map(Number);
                    return new Date(year, month - 1).toLocaleDateString(
                      "en-US",
                      { month: "long", year: "numeric" },
                    );
                  })()}
            </span>

            {monthFilter !== "all" ? (
              <button
                type="button"
                className="z-20 text-muted hover:text-danger bg-surface p-0.5 rounded-full relative"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setMonthFilter("all");
                }}
              >
                <X size={16} />
              </button>
            ) : (
              <Calendar
                size={16}
                className="text-muted group-hover:text-brand transition-colors pointer-events-none relative z-20"
              />
            )}

            {/* Subtle glow effect on hover */}
            <div className="absolute inset-0 bg-brand/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-lg" />

            <AnimatePresence>
              {isFilterOpen && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-40 bg-black/5"
                    onClick={() => setIsFilterOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute left-0 top-full mt-2 w-[320px] bg-surface rounded-[24px] shadow-2xl border border-border/80 p-5 z-50 origin-top-left flex flex-col cursor-default"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex justify-between items-start mb-5">
                      <div className="flex gap-3 items-start">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand/10 to-transparent flex items-center justify-center border border-brand/20 shadow-sm shadow-brand/5">
                          <Calendar className="text-brand w-5 h-5" />
                        </div>
                        <div className="pt-0.5">
                          <h3 className="text-primary font-bold text-base leading-tight mb-0.5">
                            Filter by Date
                          </h3>
                          <p className="text-secondary text-xs font-medium">
                            Select a period to filter results
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setIsFilterOpen(false)}
                        className="w-7 h-7 flex items-center justify-center rounded-full bg-surface-hover hover:bg-border/60 border border-border text-muted hover:text-primary transition-colors flex-shrink-0"
                      >
                        <X size={12} />
                      </button>
                    </div>

                    <div className="flex gap-2 mb-5">
                      <button
                        onClick={() => setTempFilterType("all")}
                        className={`flex-1 flex gap-1.5 items-center justify-center py-1.5 px-1.5 rounded-lg border text-xs font-bold transition-all ${
                          tempFilterType === "all"
                            ? "border-pink-200 bg-pink-50 text-pink-500 hover:bg-pink-100"
                            : "border-border text-secondary hover:bg-surface-hover"
                        }`}
                      >
                        <Infinity size={14} /> All Time
                      </button>
                      <button
                        onClick={() => setTempFilterType("month")}
                        className={`flex-1 flex gap-1.5 items-center justify-center py-1.5 px-1.5 rounded-lg border text-xs font-bold transition-all ${
                          tempFilterType === "month"
                            ? "border-brand/30 bg-brand/5 text-brand hover:bg-brand/10"
                            : "border-border text-secondary hover:bg-surface-hover"
                        }`}
                      >
                        <Calendar size={14} /> This Month
                      </button>
                      <button
                        className="flex-1 flex gap-1.5 items-center justify-center py-1.5 px-1.5 rounded-lg border text-xs font-bold transition-all border-border text-secondary opacity-50 cursor-not-allowed"
                        title="Coming Soon"
                      >
                        <SlidersHorizontal size={14} /> Custom
                      </button>
                    </div>

                    <div className={`grid grid-cols-3 gap-2 mb-4 transition-opacity ${tempFilterType === 'all' ? 'opacity-40 pointer-events-none' : ''}`}>
                      {[
                        "Jan",
                        "Feb",
                        "Mar",
                        "Apr",
                        "May",
                        "Jun",
                        "Jul",
                        "Aug",
                        "Sep",
                        "Oct",
                        "Nov",
                        "Dec",
                      ].map((mon, idx) => {
                        const isSelected =
                          tempFilterType === "month" && tempSelectedMonth === idx;
                        return (
                          <button
                            key={mon}
                            onClick={() => {
                              setTempFilterType("month");
                              setTempSelectedMonth(idx);
                            }}
                            className={`relative py-2.5 rounded-xl border text-[13px] font-bold transition-all ${
                              isSelected
                                ? "border-brand/60 bg-brand/10 text-brand shadow-sm shadow-brand/10"
                                : "border-border text-primary hover:border-brand/30 hover:bg-surface-hover"
                            }`}
                          >
                            {mon}
                            {isSelected && (
                              <div className="absolute top-1.5 right-1.5 bg-brand text-white rounded-full p-[2px] shadow-sm">
                                <Check size={8} strokeWidth={4} />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <div className={`flex items-center justify-between border border-border/80 bg-surface-hover rounded-xl p-1 mb-5 transition-opacity ${tempFilterType === 'all' ? 'opacity-40 pointer-events-none' : ''}`}>
                      <button
                        onClick={() => setTempSelectedYear((y) => y - 1)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface shadow-subtle text-secondary hover:text-primary hover:shadow-md transition-all active:scale-95"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <span className="font-bold text-primary text-[15px] tracking-tight">
                        {tempSelectedYear}
                      </span>
                      <button
                        onClick={() => setTempSelectedYear((y) => y + 1)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface shadow-subtle text-secondary hover:text-primary hover:shadow-md transition-all active:scale-95"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>

                    <div className="flex gap-3 justify-between pt-4 border-t border-border/60">
                      <button
                        onClick={() => {
                          setTempFilterType("all");
                          setTempSelectedMonth(new Date().getMonth());
                          setTempSelectedYear(new Date().getFullYear());
                        }}
                        className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-pink-200 text-pink-500 font-bold text-xs hover:bg-pink-50 transition-colors w-[100px]"
                      >
                        <RotateCcw size={14} /> Reset
                      </button>
                      <button
                        onClick={() => {
                          if (tempFilterType === "all") {
                            setMonthFilter("all");
                          } else if (tempFilterType === "month") {
                            setMonthFilter(
                              `${tempSelectedYear}-${String(
                                tempSelectedMonth + 1,
                              ).padStart(2, "0")}`,
                            );
                          }
                          setIsFilterOpen(false);
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand text-white font-bold text-xs shadow-lg shadow-brand/25 hover:shadow-xl hover:shadow-brand/40 hover:-translate-y-0.5 transition-all"
                      >
                        <Check size={14} strokeWidth={3} /> Apply
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* List/Grid View Toggle */}
          <div className="flex items-center gap-1 bg-surface border border-border rounded-lg shadow-subtle p-1">
            <button className="p-1.5 lg:p-2 rounded-md transition-colors text-muted hover:text-secondary">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M9 3v18" />
              </svg>
            </button>
            <button className="p-1.5 lg:p-2 rounded-md transition-colors bg-surface-hover text-primary">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect width="7" height="7" x="3" y="3" rx="1" />
                <rect width="7" height="7" x="14" y="3" rx="1" />
                <rect width="7" height="7" x="14" y="14" rx="1" />
                <rect width="7" height="7" x="3" y="14" rx="1" />
              </svg>
            </button>
          </div>

          <Link
            to="/orders/new"
            className="flex items-center gap-2 px-4 lg:px-5 py-2 lg:py-2.5 bg-brand text-white rounded-lg text-xs lg:text-sm font-semibold hover:bg-brand-hover transition-colors shadow-subtle whitespace-nowrap shrink-0"
          >
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
              <h3 className="text-[16px] font-bold text-primary">
                Stock Alerts
              </h3>
            </div>
            <Link
              to="/products"
              className="text-[13px] font-medium text-brand hover:text-brand-hover"
            >
              View All
            </Link>
          </div>
          <div className="space-y-4">
            {lowStockProducts.map((p, i) => (
              <div
                key={i}
                className="flex items-center gap-4 group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-rose-500/10 flex items-center justify-center text-red-500 dark:text-rose-400 shrink-0">
                  <Package size={18} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-[13px] font-bold text-primary truncate mb-0.5">
                    {p.name}
                  </h4>
                  <p className="text-[11px] font-medium text-red-500 dark:text-rose-400">
                    {p.stock || 0} units left
                  </p>
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
            <Link
              to="/products"
              className="text-[13px] font-medium text-brand hover:text-brand-hover"
            >
              View All
            </Link>
          </div>
          <div className="space-y-5">
            {bestSellingProducts.slice(0, 5).map((p, i) => (
              <div
                key={i}
                className="flex items-center gap-4 group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center text-brand text-xs font-bold shrink-0">
                  #{i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-[13px] font-bold text-primary truncate mb-0.5">
                    {p.name}
                  </h4>
                  <p className="text-[11px] font-medium text-secondary">
                    {p.quantity} units · {formatCurrency(p.revenue)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Traffic Card */}
        <div className="bg-surface border border-border rounded-[20px] p-6 shadow-subtle flex flex-col h-full">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
            <h3 className="text-[16px] font-bold text-primary">Recent Order</h3>
            <Link
              to="/orders"
              className="text-[13px] font-medium text-brand hover:text-brand-hover bg-brand/10 px-3 py-1 rounded-full"
            >
              View All
            </Link>
          </div>
          <div className="flex-1 space-y-5">
            {recentOrders.slice(0, 5).map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between gap-2 group cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-surface-hover flex items-center justify-center text-muted shrink-0">
                    <ShoppingCart size={18} />
                  </div>
                  <div>
                    <h4 className="text-[13px] font-bold text-primary truncate leading-tight mb-0.5 max-w-[100px]">
                      {order.customerName}
                    </h4>
                    <p className="text-[11px] text-muted">
                      #{order.orderNumber || order.id.slice(0, 6)}
                    </p>
                  </div>
                </div>
                <div className="text-right flex-1">
                  <div className="flex items-center justify-end gap-4">
                    <span className="text-[13px] font-bold text-primary">
                      {formatCurrency(order.totalAmount)}
                    </span>
                    <span
                      className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        order.status?.toLowerCase() === "delivered"
                          ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : order.status?.toLowerCase() === "shipped"
                            ? "bg-brand/10 text-brand"
                            : order.status?.toLowerCase() === "cancelled"
                              ? "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400"
                              : "bg-orange-50 dark:bg-orange-500/10 text-orange-500 dark:text-orange-400" /* Pending style */
                      }`}
                    >
                      {order.status || "PENDING"}
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
            <span className="text-[11px] font-medium text-muted">
              Live data sync
            </span>
          </div>
        </div>
      </div>

      {/* Main Insights Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Large Chart Card */}
        <div className="lg:col-span-8 bg-surface border border-border rounded-[20px] p-8 shadow-subtle">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
            <div>
              <h3 className="text-[16px] font-bold text-primary">
                Store Performance
              </h3>
              <p className="text-sm text-secondary font-medium mt-1">
                Order volume and revenue trends
              </p>
            </div>
            <div className="flex items-center border border-border rounded-lg p-1">
              {[2024, 2025, 2026].map((year) => (
                <button
                  key={year}
                  onClick={() => setSelectedYear(year)}
                  className={`px-4 py-1.5 rounded-md text-[13px] font-semibold transition-colors ${selectedYear === year ? "bg-brand/10 text-brand" : "text-secondary hover:text-primary"}`}
                >
                  {year}
                </button>
              ))}
            </div>
          </div>

          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={monthlyPerformance}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="velocityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="var(--color-brand)"
                      stopOpacity={0.1}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--color-brand)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="4 4"
                  vertical={false}
                  stroke="var(--color-border)"
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fontSize: 11,
                    fill: "var(--color-muted)",
                    fontWeight: 500,
                  }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(p) =>
                    `${currencySymbol}${p > 999 ? p / 1000 + "k" : p}`
                  }
                  tick={{
                    fontSize: 11,
                    fill: "var(--color-muted)",
                    fontWeight: 500,
                  }}
                />
                <Tooltip
                  content={<CustomTooltip currencySymbol={currencySymbol} />}
                  cursor={false}
                />
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
              <span className="text-[12px] font-medium text-secondary">
                Revenue
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-muted border-t-2 border-dashed border-muted" />
              <span className="text-[12px] font-medium text-secondary">
                Target
              </span>
            </div>
          </div>
        </div>

        {/* Team Activity Card */}
        <div className="lg:col-span-4 bg-surface border border-border rounded-[20px] p-8 shadow-subtle flex flex-col">
          <div className="mb-8">
            <h3 className="text-[16px] font-bold text-primary">
              Staff Performance
            </h3>
            <p className="text-sm text-secondary font-medium mt-1">
              Order processing efficiency
            </p>
          </div>
          <div className="flex-1">
            {teamPerformance.length > 0 ? (
              teamPerformance.slice(0, 1).map((member, i) => (
                <div key={i} className="group">
                  <div className="flex justify-between items-end mb-4">
                    <div>
                      <h4 className="text-[13px] font-bold text-primary uppercase tracking-widest mb-1">
                        {member.name}
                      </h4>
                      <p className="text-[12px] text-secondary font-medium">
                        {member.processed} operations completed
                      </p>
                    </div>
                    <span className="text-[13px] font-bold text-primary">
                      {member.rate}%
                    </span>
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
                <p className="text-sm font-medium mt-4 uppercase tracking-widest">
                  Awaiting Data
                </p>
              </div>
            )}
          </div>
          <Link
            to="/team"
            className="mt-auto pt-6 border-t border-border flex items-center justify-between text-secondary hover:text-primary transition-colors group"
          >
            <span className="text-[13px] font-medium">Full Report</span>
            <ArrowRight
              size={18}
              className="translate-x-0 group-hover:translate-x-1 transition-transform"
            />
          </Link>
        </div>
      </div>
    </div>
  );
}
