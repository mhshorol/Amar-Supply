import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ShoppingCart,
  Package,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Search,
  Filter,
  Download,
  Plus,
  MoreVertical,
  Facebook,
  Globe,
  Instagram,
  MessageCircle,
  MessageSquare,
  Truck,
  CreditCard,
  Calendar,
  X,
  Loader2,
  PauseCircle,
  Clock,
  Flame,
  Zap,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  RotateCcw,
  LayoutGrid,
  List,
  ChevronRight,
  ChevronLeft,
  Copy,
  FileText,
  Send,
  UserCheck,
  User,
  Box,
  Minus,
  AlertCircle,
  Edit,
  Printer,
  Eye,
  ChevronDown,
  Activity,
  ShieldCheck,
  Smartphone,
  PackagePlus,
  PackageCheck,
  PackageX,
  PackageOpen,
  CheckCircle,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import type {
  DraggableProvided,
  DraggableStateSnapshot,
  DroppableProvided,
} from "@hello-pangea/dnd";
import {
  db,
  auth,
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  Timestamp,
  doc,
  updateDoc,
  deleteDoc,
  writeBatch,
  getDocs,
  getDoc,
  where,
  arrayUnion,
  runTransaction,
  limit,
} from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { openPrintWindow } from "../utils/printHelper";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { A5Invoice, POSInvoice } from "./InvoiceTemplates";
import { toast } from "sonner";
import { SteadfastService } from "../services/steadfastService";
import { logActivity } from "../services/activityService";
import { checkDuplicateOrder } from "../services/orderService";
import { createNotification } from "../services/notificationService";
import { handleFirestoreError, OperationType } from "../lib/firestore-errors";
import { locationService } from "../services/locationService";
import {
  LocationNode,
  districts,
  upazilas,
} from "../data/bangladesh-locations";
import { CourierFactory } from "../lib/courierAdapters";

import { useSettings } from "../contexts/SettingsContext";
import ConfirmModal from "./ConfirmModal";
import OrderDetailsModal from "./OrderDetailsModal";

const ChannelIcon = ({ channel }: { channel: string }) => {
  switch (channel) {
    case "Facebook":
      return <Facebook size={14} className="text-[#2563eb]" />;
    case "Website":
      return <Globe size={14} className="text-[#4b5563]" />;
    case "Instagram":
      return <Instagram size={14} className="text-[#db2777]" />;
    case "Messenger":
      return <MessageCircle size={14} className="text-[#60a5fa]" />;
    default:
      return <Globe size={14} />;
  }
};

export const globalStatusConfig: Record<
  string,
  { label: string; color: string; icon: any; iconColor: string }
> = {
  urgent: {
    label: "Urgent",
    color: "bg-red-50 text-red-600 ring-red-100 shadow-red-500/5",
    iconColor: "text-red-500",
    icon: Flame,
  },
  hold: {
    label: "Hold",
    color: "bg-amber-50 text-amber-600 ring-amber-100 shadow-amber-500/5",
    iconColor: "text-amber-500",
    icon: PauseCircle,
  },
  pending: {
    label: "Pending",
    color: "bg-orange-50 text-orange-600 ring-orange-100 shadow-orange-500/5",
    iconColor: "text-orange-500",
    icon: Clock,
  },
  confirmed: {
    label: "Confirmed",
    color: "bg-cyan-50 text-brand ring-cyan-100 shadow-cyan-500/5",
    iconColor: "text-brand",
    icon: CheckCircle2,
  },
  processing: {
    label: "Processing",
    color: "bg-brand/10 text-brand ring-blue-100 shadow-blue-500/5",
    iconColor: "text-brand",
    icon: Zap,
  },
  shipped: {
    label: "Shipped",
    color: "bg-indigo-50 text-indigo-600 ring-indigo-100 shadow-indigo-500/5",
    iconColor: "text-indigo-500",
    icon: Truck,
  },
  delivered: {
    label: "Delivered",
    color: "bg-emerald-50 text-emerald-600 ring-emerald-100 shadow-emerald-500/5",
    iconColor: "text-emerald-500",
    icon: PackageCheck,
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-red-50 text-red-600 ring-red-100 shadow-red-500/5",
    iconColor: "text-red-500",
    icon: PackageX,
  },
  returned: {
    label: "Returned",
    color: "bg-surface-hover text-primary ring-slate-100 shadow-slate-500/5",
    iconColor: "text-secondary",
    icon: RotateCcw,
  },
  partial_delivered: {
    label: "Partial Delivered",
    color: "bg-orange-50 text-orange-600 ring-orange-100 shadow-orange-500/5",
    iconColor: "text-orange-500",
    icon: PackageOpen,
  },
};

const StatusBadge = ({
  status,
  onClick,
  isOpen,
}: {
  status: string;
  onClick?: (e?: React.MouseEvent) => void;
  isOpen?: boolean;
}) => {
  const config = globalStatusConfig[status.toLowerCase()] || {
    label: status,
    color: "bg-surface-hover text-secondary ring-gray-100 shadow-gray-500/5",
    icon: Package,
  };
  const Icon = config.icon;

  return (
    <button
      onClick={onClick}
      className={`group flex items-center gap-2.5 px-3.5 py-1.5 rounded-full ring-1 ring-inset ${config.color} shadow-subtle transition-all duration-200 hover:shadow-premium active:scale-95 whitespace-nowrap`}
    >
      <Icon
        size={12}
        strokeWidth={2.5}
        className="group-hover:scale-110 transition-transform"
      />
      <span className="text-[10px] font-black uppercase tracking-widest">
        {config.label}
      </span>
      {onClick && (
        <ChevronDown
          size={11}
          strokeWidth={3}
          className={`text-current transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      )}
    </button>
  );
};

export default function Orders() {
  const { user } = useAuth();
  const { settings, currencySymbol } = useSettings();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("All");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [wooOrders, setWooOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isWooLoading, setIsWooLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState<string | null>(null);
  const [editingOrder, setEditingOrder] = useState<any | null>(null);
  const [viewingOrder, setViewingOrder] = useState<any | null>(null);
  const [dateFilter, setDateFilter] = useState("all");
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: "danger" | "warning" | "info";
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });
  const [products, setProducts] = useState<any[]>([]);
  const [variants, setVariants] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [companySettings, setCompanySettings] = useState<any>(null);
  const [selectedOrderForPrint, setSelectedOrderForPrint] = useState<any>(null);
  const [printType, setPrintType] = useState<"a5" | "pos" | null>(null);
  const [courierHistory, setCourierHistory] = useState<any>(null);
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);
  const [courierSelection, setCourierSelection] = useState<{
    isOpen: boolean;
    order: any;
    activeCouriers: [string, any][];
  }>({
    isOpen: false,
    order: null,
    activeCouriers: [],
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const printRef = React.useRef<HTMLDivElement>(null);
  const bulkPrintRef = React.useRef<HTMLDivElement>(null);
  const tabsRef = React.useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  const checkScroll = useCallback(() => {
    if (tabsRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tabsRef.current;
      setShowLeftArrow(scrollLeft > 5);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 5);
    }
  }, []);

  useEffect(() => {
    const tabsEl = tabsRef.current;
    if (tabsEl) {
      checkScroll();
      tabsEl.addEventListener("scroll", checkScroll);
      window.addEventListener("resize", checkScroll);
      return () => {
        tabsEl.removeEventListener("scroll", checkScroll);
        window.removeEventListener("resize", checkScroll);
      };
    }
  }, [checkScroll]);

  const scrollTabs = (direction: "left" | "right") => {
    if (tabsRef.current) {
      const scrollAmount = 200;
      tabsRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const handlePrint = () => {
    if (!printType) {
      toast.error("No print type selected");
      return;
    }
    const win = window.open("", "_blank");
    if (!win) {
      toast.error("Please allow popups to print.");
      return;
    }
    setTimeout(() => {
      if (printRef.current) {
        openPrintWindow(printRef.current.innerHTML, "Invoice", win);
        setSelectedOrderForPrint(null);
        setPrintType(null);
      }
    }, 500);
  };

  const handleBulkPrint = () => {
    const win = window.open("", "_blank");
    if (!win) {
      toast.error("Please allow popups to print.");
      return;
    }
    setTimeout(() => {
      if (bulkPrintRef.current) {
        openPrintWindow(bulkPrintRef.current.innerHTML, "Bulk Invoices", win);
        setSelectedOrders([]);
      }
    }, 500);
  };

  const handleDownloadPDF = async () => {
    if (!printRef.current || !selectedOrderForPrint) return;
    try {
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: printType === "a5" ? "a5" : [80, 200],
      });
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(
        `Invoice-${selectedOrderForPrint.orderNumber || selectedOrderForPrint.id.slice(0, 8)}.pdf`,
      );
    } catch (error) {
      console.error("Error generating PDF:", error);
    }
  };

  const handleBulkDownloadPDF = async () => {
    if (!bulkPrintRef.current || selectedOrders.length === 0) return;
    setLoading(true);
    try {
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a5",
      });

      const orderElements = bulkPrintRef.current.children;
      for (let i = 0; i < orderElements.length; i++) {
        const element = orderElements[i] as HTMLElement;
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
        });
        const imgData = canvas.toDataURL("image/png");
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      }

      pdf.save(`Bulk-Invoices-${new Date().getTime()}.pdf`);
    } catch (error) {
      console.error("Error generating bulk PDF:", error);
    } finally {
      setLoading(false);
    }
  };

  const [courierConfigs, setCourierConfigs] = useState<Record<string, any>>({});

  useEffect(() => {
    const fetchCourierConfigs = async () => {
      try {
        const response = await fetch("/api/couriers/configs", {
          headers: { Accept: "application/json" },
        });

        const contentType = response.headers.get("content-type") || "";
        if (response.ok && contentType.includes("application/json")) {
          const data = await (response.headers
            .get("content-type")
            ?.includes("json")
            ? response.json()
            : Promise.reject(
                new Error("Invalid non-JSON response from server."),
              ));
          setCourierConfigs(data);
        } else if (!contentType.includes("application/json")) {
          const text = await response.text();
          console.warn(
            "Courier configs returned non-JSON:",
            text.substring(0, 100),
          );
        }
      } catch (error) {
        console.error("Error fetching courier configs:", error);
      }
    };
    fetchCourierConfigs();
  }, []);

  const [orderForm, setOrderForm] = useState({
    customerName: "",
    customerPhone: "",
    customerAddress: "",
    customerCity: "Dhaka",
    customerZone: "Inside Dhaka",
    district: "",
    division: "",
    area: "",
    landmark: "",
    subtotal: 0,
    deliveryCharge: 80,
    discount: 0,
    totalAmount: 0,
    paidAmount: 0,
    dueAmount: 0,
    advanceAmount: 0,
    channel: "Facebook",
    paymentMethod: "COD",
    status: "pending",
    items: [] as any[],
    warehouseId: "",
    notes: "",
    tags: "",
    courierId: "",
    courierName: "",
    trackingNumber: "",
    pathao_city_id: "",
    pathao_zone_id: "",
    pathao_area_id: "",
    carrybee_city_id: "",
    carrybee_zone_id: "",
    carrybee_area_id: "",
  });

  const [cities, setCities] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);

  const fetchCities = async () => {
    setLoadingLocations(true);
    try {
      const response = await fetch("/api/couriers/cities/pathao");
      if (response.ok) {
        const data = await (response.headers
          .get("content-type")
          ?.includes("json")
          ? response.json()
          : Promise.reject(
              new Error("Invalid non-JSON response from server."),
            ));
        setCities(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching cities:", error);
    } finally {
      setLoadingLocations(false);
    }
  };

  const fetchZones = async (cityId: string) => {
    setLoadingLocations(true);
    setZones([]);
    setAreas([]);
    try {
      const response = await fetch(`/api/couriers/zones/pathao/${cityId}`);
      if (response.ok) {
        const data = await (response.headers
          .get("content-type")
          ?.includes("json")
          ? response.json()
          : Promise.reject(
              new Error("Invalid non-JSON response from server."),
            ));
        setZones(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching zones:", error);
    } finally {
      setLoadingLocations(false);
    }
  };

  const fetchAreas = async (zoneId: string) => {
    setLoadingLocations(true);
    setAreas([]);
    try {
      const response = await fetch(`/api/couriers/areas/pathao/${zoneId}`);
      if (response.ok) {
        const data = await (response.headers
          .get("content-type")
          ?.includes("json")
          ? response.json()
          : Promise.reject(
              new Error("Invalid non-JSON response from server."),
            ));
        setAreas(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching areas:", error);
    } finally {
      setLoadingLocations(false);
    }
  };

  useEffect(() => {
    if (isModalOpen && courierConfigs.pathao?.isActive) {
      fetchCities();
    }
  }, [isModalOpen, courierConfigs.pathao?.isActive]);
  const [newItem, setNewItem] = useState({
    productId: "",
    variantId: "",
    quantity: 1,
    price: 0,
  });

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    )
      return;

    const newStatus = destination.droppableId;
    await handleUpdateStatus(draggableId, newStatus);
  };

  const tabs = [
    "All",
    "urgent",
    "hold",
    "pending",
    "confirmed",
    "processing",
    "shipped",
    "delivered",
    "partial_delivered",
    "cancelled",
    "returned",
  ];
  const statuses = [
    "urgent",
    "hold",
    "pending",
    "confirmed",
    "processing",
    "shipped",
    "delivered",
    "partial_delivered",
    "cancelled",
    "returned",
  ];

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setOrders(
          snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            source: "local",
          })),
        );
        setLoading(false);
      },
      (error) => {
        if (error.code !== "permission-denied") {
          handleFirestoreError(error, OperationType.LIST, "orders");
        }
      },
    );

    const unsubSettings = onSnapshot(
      doc(db, "settings", "company"),
      (s) => setCompanySettings(s.data()),
      (e) => {
        if (e.code !== "permission-denied") {
          handleFirestoreError(e, OperationType.GET, "settings/company");
        }
      },
    );

    const unsubProducts = onSnapshot(
      collection(db, "products"),
      (s) => setProducts(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (e) => {
        if (e.code !== "permission-denied") {
          handleFirestoreError(e, OperationType.LIST, "products");
        }
      },
    );
    const unsubVariants = onSnapshot(
      collection(db, "variants"),
      (s) => setVariants(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (e) => {
        if (e.code !== "permission-denied") {
          handleFirestoreError(e, OperationType.LIST, "variants");
        }
      },
    );
    const unsubWarehouses = onSnapshot(
      collection(db, "warehouses"),
      (s) => setWarehouses(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (e) => {
        if (e.code !== "permission-denied") {
          handleFirestoreError(e, OperationType.LIST, "warehouses");
        }
      },
    );
    const unsubInventory = onSnapshot(
      collection(db, "inventory"),
      (s) => setInventory(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (e) => {
        if (e.code !== "permission-denied") {
          handleFirestoreError(e, OperationType.LIST, "inventory");
        }
      },
    );

    return () => {
      unsubscribe();
      unsubProducts();
      unsubVariants();
      unsubWarehouses();
      unsubInventory();
      unsubSettings();
    };
  }, [user]);

  useEffect(() => {
    const fetchWooOrders = async () => {
      if (
        !companySettings?.wooUrl ||
        !companySettings?.wooConsumerKey ||
        !companySettings?.wooConsumerSecret
      )
        return;

      setIsWooLoading(true);
      try {
        const response = await fetch("/api/woocommerce/orders?per_page=50", {
          headers: { Accept: "application/json" },
        });

        if (response.status === 429) {
          console.warn("WooCommerce API rate limit exceeded (429).");
          return;
        }

        let text = "";
        try {
          text = await response.text();
        } catch (e) {
           console.error("Failed to read response body", e);
        }

        let data;
        try {
          data = JSON.parse(text);
        } catch (e) {
          console.warn(`Server returned invalid JSON (${response.status})`, text.slice(0, 500));
          // If it's a 200 but not JSON, it might be an HTML error page from a proxy
          if (response.status === 200) {
              console.warn("Got 200 OK but HTML. Possible proxy interception.");
          }
          return;
        }

        if (response.ok) {
          const mappedWooOrders = (data.orders || []).map((order: any) => ({
            id: `woo_${order.id}`,
            wooId: order.id,
            source: "woocommerce",
            orderNumber: order.number,
            customerName: `${order.billing.first_name} ${order.billing.last_name}`,
            customerPhone: order.billing.phone,
            customerEmail: order.billing.email,
            customerAddress: `${order.billing.address_1}, ${order.billing.city}`,
            totalAmount: parseFloat(order.total),
            dueAmount: parseFloat(order.total),
            status: order.status,
            createdAt: { toDate: () => new Date(order.date_created) },
            items: order.line_items.map((item: any) => ({
              name: item.name,
              quantity: item.quantity,
              price: parseFloat(item.price),
            })),
            notes: order.customer_note,
            paymentMethod: order.payment_method_title,
          }));
          setWooOrders(mappedWooOrders);

          // Sync customers to CRM
          try {
            const customersSnap = await getDocs(collection(db, "customers"));
            const existingCustomers = new Map();
            customersSnap.forEach((doc) => {
              const data = doc.data();
              if (data.phone) {
                existingCustomers.set(data.phone, { id: doc.id, ...data });
              }
            });

            const batch = writeBatch(db);
            let batchCount = 0;

            for (const order of mappedWooOrders) {
              if (!order.customerPhone) continue;

              const existing = existingCustomers.get(order.customerPhone);
              const wooOrderId = String(order.wooId);

              if (!existing) {
                // Create new customer
                const newCustomerRef = doc(collection(db, "customers"));
                const newCustomer = {
                  name: order.customerName || "Unknown",
                  phone: order.customerPhone,
                  email: order.customerEmail || "",
                  address: order.customerAddress || "",
                  orderCount: 1,
                  totalSpent: order.totalAmount || 0,
                  lastOrderDate: order.createdAt?.toDate
                    ? order.createdAt.toDate()
                    : new Date(),
                  wooOrderIds: [wooOrderId],
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp(),
                };
                batch.set(newCustomerRef, newCustomer);
                existingCustomers.set(order.customerPhone, {
                  id: newCustomerRef.id,
                  ...newCustomer,
                });
                batchCount++;
              } else {
                // Update existing customer if this order hasn't been counted
                const wooOrderIds = existing.wooOrderIds || [];
                if (!wooOrderIds.includes(wooOrderId)) {
                  const customerRef = doc(db, "customers", existing.id);
                  batch.update(customerRef, {
                    orderCount: (existing.orderCount || 0) + 1,
                    totalSpent:
                      (existing.totalSpent || 0) + (order.totalAmount || 0),
                    lastOrderDate: order.createdAt?.toDate
                      ? order.createdAt.toDate()
                      : new Date(),
                    wooOrderIds: arrayUnion(wooOrderId),
                    updatedAt: serverTimestamp(),
                  });
                  existing.wooOrderIds = [...wooOrderIds, wooOrderId];
                  existing.orderCount = (existing.orderCount || 0) + 1;
                  existing.totalSpent =
                    (existing.totalSpent || 0) + (order.totalAmount || 0);
                  batchCount++;
                }
              }

              if (batchCount >= 450) {
                await batch.commit();
                batchCount = 0;
              }
            }

            if (batchCount > 0) {
              await batch.commit();
            }
          } catch (syncError) {
            console.error("Error syncing woo customers:", syncError);
          }
        } else {
          console.error("WooCommerce Fetch Error:", data.error, data.details);
          // Only show toast if we actually have settings but they failed
          if (companySettings.wooUrl && companySettings.wooConsumerKey) {
            toast.error(`WooCommerce Error: ${data.details || data.error}`);
          }
        }
      } catch (error: any) {
        console.error("Error fetching WooCommerce orders:", error);
      } finally {
        setIsWooLoading(false);
      }
    };

    fetchWooOrders();
  }, [
    companySettings?.wooUrl,
    companySettings?.wooConsumerKey,
    companySettings?.wooConsumerSecret,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTab]);

  const handleZoneChange = (zone: string) => {
    let charge = 80;
    if (zone === "Outside Dhaka") charge = 150;
    if (zone === "Sub Area") charge = 130;
    setOrderForm({ ...orderForm, customerZone: zone, deliveryCharge: charge });
  };
  const handlePhoneChange = async (phone: string) => {
    setOrderForm((prev) => ({ ...prev, customerPhone: phone }));

    // Only search if phone number is at least 11 digits (standard for BD)
    if (phone.length >= 11) {
      try {
        const q = query(
          collection(db, "customers"),
          where("phone", "==", phone),
        );
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const customerData = querySnapshot.docs[0].data();
          setOrderForm((prev) => ({
            ...prev,
            customerName: customerData.name || prev.customerName,
            customerAddress: customerData.address || prev.customerAddress,
            district: customerData.district || prev.district,
            area: customerData.area || prev.area,
            landmark: customerData.landmark || prev.landmark,
            customerCity: customerData.city || prev.customerCity,
            customerZone: customerData.zone || prev.customerZone,
          }));
          toast.success(`Found existing customer: ${customerData.name}`);
        }
      } catch (error) {
        console.error("Error fetching customer data:", error);
      }

      // Fetch courier history
      fetchCourierHistory(phone);
    } else {
      setCourierHistory(null);
    }
  };

  const fetchCourierHistory = async (phone: string) => {
    setIsFetchingHistory(true);
    try {
      const response = await fetch(`/api/couriers/check-fraud/${phone}`);
      const result = await (response.headers
        .get("content-type")
        ?.includes("json")
        ? response.json()
        : Promise.reject(new Error("Invalid non-JSON response from server.")));

      if (response.ok) {
        if (result.data) {
          setCourierHistory({
            courier: result.courier,
            ...result.data,
          });
          if (result.data.error) {
            toast.error(`Courier Check Warning: ${result.data.error}`);
          }
        }
      } else {
        console.error("Courier response error:", result.error);
        if (result.error !== "No active courier supports fraud check") {
          toast.error(`Courier Error: ${result.error}`);
        }
      }
    } catch (error) {
      console.error("Error fetching courier history:", error);
      toast.error("Network error while checking courier history");
    } finally {
      setIsFetchingHistory(false);
    }
  };

  const handleAddressChange = (address: string) => {
    setOrderForm((prev) => ({ ...prev, customerAddress: address }));

    // Smart Parsing
    const parsed = locationService.parseAddress(address);
    if (parsed.district || parsed.upazila) {
      const district = parsed.district?.nameEn || orderForm.district;
      const division = parsed.division?.nameEn || orderForm.division;
      const charge = locationService.getDeliveryCharge(district, division);

      setOrderForm((prev) => ({
        ...prev,
        district,
        area: parsed.upazila?.nameEn || prev.area,
        division,
        deliveryCharge: charge,
      }));

      // Auto-fetch Pathao IDs if Pathao is active
      if (courierConfigs.pathao?.isActive) {
        autoMatchPathao(district, parsed.upazila?.nameEn || orderForm.area);
      }
      // Auto-fetch Carrybee IDs if Carrybee is active
      if (courierConfigs.carrybee?.isActive) {
        autoMatchCarrybee(district, parsed.upazila?.nameEn || orderForm.area);
      }
    }
  };

  const autoMatchPathao = async (districtName: string, areaName: string) => {
    if (!courierConfigs.pathao || !districtName) return;
    try {
      const citiesRes = await fetch("/api/couriers/cities/pathao");
      if (!citiesRes.ok) {
        const errData = await (citiesRes.headers
          .get("content-type")
          ?.includes("json")
          ? citiesRes.json()
          : Promise.reject(new Error("Invalid non-JSON response.")));
        throw new Error(errData.error || "Failed to fetch Pathao cities");
      }
      const pathaoCities = await (citiesRes.headers
        .get("content-type")
        ?.includes("json")
        ? citiesRes.json()
        : Promise.reject(new Error("Invalid non-JSON response.")));

      const city = locationService.matchCourierLocation(
        districtName,
        pathaoCities.data || [],
        "city_name",
      );

      if (city) {
        setOrderForm((prev) => ({
          ...prev,
          pathao_city_id: city.city_id.toString(),
        }));

        const zonesRes = await fetch(
          `/api/couriers/zones/pathao/${city.city_id}`,
        );
        if (!zonesRes.ok) {
          const errData = await (zonesRes.headers
            .get("content-type")
            ?.includes("json")
            ? zonesRes.json()
            : Promise.reject(new Error("Invalid non-JSON response.")));
          throw new Error(errData.error || "Failed to fetch Pathao zones");
        }
        const pathaoZones = await (zonesRes.headers
          .get("content-type")
          ?.includes("json")
          ? zonesRes.json()
          : Promise.reject(new Error("Invalid non-JSON response.")));

        const zone = locationService.matchCourierLocation(
          areaName,
          pathaoZones.data || [],
          "zone_name",
        );

        if (zone) {
          setOrderForm((prev) => ({
            ...prev,
            pathao_zone_id: zone.zone_id.toString(),
          }));

          const areasRes = await fetch(
            `/api/couriers/areas/pathao/${zone.zone_id}`,
          );
          if (!areasRes.ok) {
            const errData = await (areasRes.headers
              .get("content-type")
              ?.includes("json")
              ? areasRes.json()
              : Promise.reject(new Error("Invalid non-JSON response.")));
            throw new Error(errData.error || "Failed to fetch Pathao areas");
          }
          const pathaoAreas = await (areasRes.headers
            .get("content-type")
            ?.includes("json")
            ? areasRes.json()
            : Promise.reject(new Error("Invalid non-JSON response.")));

          const area =
            locationService.matchCourierLocation(
              areaName,
              pathaoAreas.data || [],
              "area_name",
            ) || pathaoAreas.data?.[0];

          if (area) {
            setOrderForm((prev) => ({
              ...prev,
              pathao_area_id: area.area_id.toString(),
            }));
          }
        }
      }
    } catch (error: any) {
      console.error("Error auto-matching Pathao locations:", error.message);
    }
  };

  const autoMatchCarrybee = async (districtName: string, areaName: string) => {
    if (!courierConfigs.carrybee || !districtName) return;
    try {
      const citiesRes = await fetch("/api/couriers/cities/carrybee");
      if (!citiesRes.ok) return;
      const carrybeeCities = await (citiesRes.headers
        .get("content-type")
        ?.includes("json")
        ? citiesRes.json()
        : Promise.reject(new Error("Invalid non-JSON response.")));

      const city = locationService.matchCourierLocation(
        districtName,
        carrybeeCities.data?.cities || [],
        "name",
      );

      if (city) {
        setOrderForm((prev) => ({
          ...prev,
          carrybee_city_id: city.id.toString(),
        }));

        const zonesRes = await fetch(`/api/couriers/zones/carrybee/${city.id}`);
        if (!zonesRes.ok) return;
        const carrybeeZones = await (zonesRes.headers
          .get("content-type")
          ?.includes("json")
          ? zonesRes.json()
          : Promise.reject(new Error("Invalid non-JSON response.")));

        const zone = locationService.matchCourierLocation(
          areaName,
          carrybeeZones.data?.zones || [],
          "name",
        );

        if (zone) {
          setOrderForm((prev) => ({
            ...prev,
            carrybee_zone_id: zone.id.toString(),
          }));

          const areasRes = await fetch(
            `/api/couriers/areas/carrybee/${zone.id}?cityId=${city.id}`,
          );
          if (!areasRes.ok) return;
          const carrybeeAreas = await (areasRes.headers
            .get("content-type")
            ?.includes("json")
            ? areasRes.json()
            : Promise.reject(new Error("Invalid non-JSON response.")));

          const area =
            locationService.matchCourierLocation(
              areaName,
              carrybeeAreas.data?.areas || [],
              "name",
            ) || carrybeeAreas.data?.areas?.[0];

          if (area) {
            setOrderForm((prev) => ({
              ...prev,
              carrybee_area_id: area.id.toString(),
            }));
          }
        }
      }
    } catch (error: any) {
      console.error("Error auto-matching Carrybee locations:", error.message);
    }
  };

  const handleOpenAddModal = () => {
    setEditingOrder(null);
    setOrderForm({
      customerName: "",
      customerPhone: "",
      customerAddress: "",
      customerCity: "Dhaka",
      customerZone: "Inside Dhaka",
      district: "",
      division: "",
      area: "",
      landmark: "",
      subtotal: 0,
      deliveryCharge: 80,
      discount: 0,
      totalAmount: 0,
      paidAmount: 0,
      dueAmount: 0,
      advanceAmount: 0,
      channel: "Facebook",
      paymentMethod: "COD",
      status: "pending",
      items: [],
      warehouseId: "",
      notes: "",
      tags: "",
      courierId: "",
      courierName: "",
      trackingNumber: "",
      pathao_city_id: "",
      pathao_zone_id: "",
      pathao_area_id: "",
      carrybee_city_id: "",
      carrybee_zone_id: "",
      carrybee_area_id: "",
    });
    setZones([]);
    setAreas([]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (order: any) => {
    setEditingOrder(order);
    setOrderForm({
      customerName: order.customerName || "",
      customerPhone: order.customerPhone || "",
      customerAddress: order.customerAddress || "",
      customerCity: order.customerCity || "Dhaka",
      customerZone: order.customerZone || "Inside Dhaka",
      district: order.district || "",
      division: order.division || "",
      area: order.area || "",
      landmark: order.landmark || "",
      subtotal: order.subtotal || 0,
      deliveryCharge: order.deliveryCharge || 0,
      discount: order.discount || 0,
      totalAmount: order.totalAmount || 0,
      paidAmount: order.paidAmount || 0,
      dueAmount: order.dueAmount || 0,
      advanceAmount: order.advanceAmount || 0,
      channel: order.channel || "Facebook",
      paymentMethod: order.paymentMethod || "COD",
      status: order.status || "pending",
      items: order.items || [],
      warehouseId: order.warehouseId || "",
      notes: order.notes || "",
      tags: order.tags || "",
      courierId: order.courierId || "",
      courierName: order.courierName || "",
      trackingNumber: order.trackingNumber || "",
      pathao_city_id: order.pathao_city_id || "",
      pathao_zone_id: order.pathao_zone_id || "",
      pathao_area_id: order.pathao_area_id || "",
      carrybee_city_id: order.carrybee_city_id || "",
      carrybee_zone_id: order.carrybee_zone_id || "",
      carrybee_area_id: order.carrybee_area_id || "",
    });
    if (order.pathao_city_id) fetchZones(order.pathao_city_id);
    if (order.pathao_zone_id) fetchAreas(order.pathao_zone_id);
    setIsModalOpen(true);
  };

  const calculateTotals = (
    items: any[],
    deliveryCharge: number,
    discount: number,
    paidAmount: number,
  ) => {
    const subtotal = items.reduce(
      (acc, item) => acc + item.quantity * item.price,
      0,
    );
    const totalAmount = subtotal + deliveryCharge - discount;
    const dueAmount = totalAmount - paidAmount;
    return { subtotal, totalAmount, dueAmount };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    try {
      const { subtotal, totalAmount, dueAmount } = calculateTotals(
        orderForm.items,
        orderForm.deliveryCharge,
        orderForm.discount,
        orderForm.paidAmount,
      );

      // Duplicate Detection Check (Only for new orders)
      if (!editingOrder) {
        const duplicate = await checkDuplicateOrder({
          customerPhone: orderForm.customerPhone,
          customerName: orderForm.customerName,
          items: orderForm.items,
          totalAmount: totalAmount,
        });

        if (duplicate) {
          setConfirmConfig({
            isOpen: true,
            title: "Duplicate Order Detected",
            message: `An order (#${duplicate.orderNumber || duplicate.id.slice(0, 8)}) with the same phone number, products, and total value was found within the last 24 hours. Are you sure you want to create this duplicate order?`,
            variant: "warning",
            onConfirm: () => proceedWithSubmit(totalAmount),
          });
          return;
        }
      }

      await proceedWithSubmit(totalAmount);
    } catch (error) {
      handleFirestoreError(
        error,
        editingOrder ? OperationType.UPDATE : OperationType.CREATE,
        "orders",
      );
    }
  };

  const proceedWithSubmit = async (totalAmount: number) => {
    if (!auth.currentUser) return;
    try {
      const { subtotal, dueAmount } = calculateTotals(
        orderForm.items,
        orderForm.deliveryCharge,
        orderForm.discount,
        orderForm.paidAmount,
      );

      const logEntry = {
        user: auth.currentUser.email,
        action: editingOrder ? "Updated Order" : "Created Order",
        timestamp: Timestamp.now(),
        details: editingOrder
          ? `Status: ${orderForm.status}`
          : "Initial creation",
      };

      const data = {
        ...orderForm,
        subtotal,
        totalAmount,
        dueAmount,
        logs: editingOrder
          ? [...(editingOrder.logs || []), logEntry]
          : [logEntry],
        updatedAt: serverTimestamp(),
      };

      // 1. PRE-TRANSACTION READS
      const customerQuery = query(
        collection(db, "customers"),
        where("phone", "==", orderForm.customerPhone),
      );
      const customerSnap = await getDocs(customerQuery);

      const inventorySnaps: { item: any; snap: any }[] = [];
      if (
        !editingOrder &&
        orderForm.status !== "cancelled" &&
        orderForm.status !== "returned"
      ) {
        for (const item of orderForm.items) {
          const invQuery = query(
            collection(db, "inventory"),
            where("productId", "==", item.productId),
            where("variantId", "==", item.variantId || ""),
            where("warehouseId", "==", orderForm.warehouseId),
          );
          const invSnap = await getDocs(invQuery);
          inventorySnaps.push({ item, snap: invSnap });
        }
      }

      await runTransaction(db, async (transaction) => {
        // 2. TRANSACTION READS
        const settingsRef = doc(db, "settings", "company");
        const settingsSnap = await transaction.get(settingsRef);

        // 3. ALL WRITES SECOND
        let customerId = "";
        if (customerSnap.empty) {
          const customerRef = doc(collection(db, "customers"));
          transaction.set(customerRef, {
            name: orderForm.customerName,
            phone: orderForm.customerPhone,
            address: orderForm.customerAddress,
            orderCount: 1,
            totalSpent: totalAmount,
            lastOrderDate: serverTimestamp(),
            uid: auth.currentUser!.uid,
            createdAt: serverTimestamp(),
          });
          customerId = customerRef.id;
        } else {
          const customerDoc = customerSnap.docs[0];
          customerId = customerDoc.id;
          transaction.update(customerDoc.ref, {
            orderCount:
              (customerDoc.data().orderCount || 0) + (editingOrder ? 0 : 1),
            totalSpent:
              (customerDoc.data().totalSpent || 0) +
              (editingOrder ? 0 : totalAmount),
            lastOrderDate: serverTimestamp(),
          });
        }

        const finalData = { ...data, customerId };

        if (editingOrder) {
          transaction.update(doc(db, "orders", editingOrder.id), finalData);
        } else {
          let nextOrderNumber = 1001;
          if (settingsSnap.exists() && settingsSnap.data().orderCounter) {
            nextOrderNumber = settingsSnap.data().orderCounter + 1;
          }
          transaction.set(
            settingsRef,
            { orderCounter: nextOrderNumber },
            { merge: true },
          );

          const orderRef = doc(collection(db, "orders"));
          transaction.set(orderRef, {
            ...finalData,
            orderNumber: nextOrderNumber,
            uid: auth.currentUser!.uid,
            createdAt: serverTimestamp(),
          });

          // Add to Finance if paidAmount > 0
          if (finalData.paidAmount > 0) {
            let accountId = "";

            // To find account safely, just do getDocs directly
            const accountsQuery = query(
              collection(db, "accounts"),
              where("name", "==", finalData.paymentMethod),
            );
            const accountsSnap = await getDocs(accountsQuery);
            if (!accountsSnap.empty) {
              accountId = accountsSnap.docs[0].id;
            } else {
              const allAccountsSnap = await getDocs(
                query(collection(db, "accounts"), limit(1)),
              );
              if (!allAccountsSnap.empty) {
                accountId = allAccountsSnap.docs[0].id;
              }
            }

            const transactionRef = doc(collection(db, "transactions"));
            transaction.set(transactionRef, {
              type: "income",
              category: "Sales",
              amount: finalData.paidAmount,
              description: `Order #${nextOrderNumber} Payment`,
              date: serverTimestamp(),
              method: finalData.paymentMethod,
              accountId: accountId,
              orderId: orderRef.id,
              orderNumber: nextOrderNumber,
              uid: auth.currentUser?.uid,
              createdAt: serverTimestamp(),
            });

            if (accountId) {
              const accountRef = doc(db, "accounts", accountId);
              const accountSnap = await transaction.get(accountRef);
              if (accountSnap.exists()) {
                const currentBalance = accountSnap.data().balance || 0;
                transaction.update(accountRef, {
                  balance: currentBalance + finalData.paidAmount,
                  updatedAt: serverTimestamp(),
                });
              }
            }
          }

          // Deduct Inventory
          for (const invData of inventorySnaps) {
            const { item, snap } = invData;
            if (!snap.empty) {
              const invDoc = snap.docs[0];
              const currentQty = invDoc.data().quantity;
              const newQty = currentQty - item.quantity;
              transaction.update(invDoc.ref, {
                quantity: newQty,
                updatedAt: serverTimestamp(),
              });

              // Log
              const logRef = doc(collection(db, "inventoryLogs"));
              transaction.set(logRef, {
                productId: item.productId,
                variantId: item.variantId || "",
                warehouseId: orderForm.warehouseId,
                type: "out",
                quantityChange: -item.quantity,
                newQuantity: newQty,
                reason: `Order #${nextOrderNumber}`,
                uid: auth.currentUser!.uid,
                createdAt: serverTimestamp(),
              });
            }
          }
        }
      });

      await logActivity(
        editingOrder ? "Updated Order" : "Created Order",
        "Orders",
        `Order #${editingOrder ? editingOrder.orderNumber || editingOrder.id.slice(0, 8) : "New"} for ${orderForm.customerName}`,
      );

      if (!editingOrder) {
        await createNotification({
          title: "New Order",
          message: `A new order has been created for ${orderForm.customerName}.`,
          type: "order",
          link: "/orders",
          forRole: "admin",
        });
      }

      setIsModalOpen(false);
    } catch (error) {
      handleFirestoreError(
        error,
        editingOrder ? OperationType.UPDATE : OperationType.CREATE,
        "orders",
      );
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    if (!auth.currentUser) return;

    // Handle WooCommerce orders
    if (orderId.startsWith("woo_")) {
      const wooId = orderId.replace("woo_", "");
      setLoading(true);
      try {
        const response = await fetch(`/api/woocommerce/orders/${wooId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });
        if (response.ok) {
          toast.success(`WooCommerce order status updated to ${newStatus}`);
          // Refresh WooCommerce orders
          const wooResponse = await fetch(
            "/api/woocommerce/orders?per_page=50",
          );
          if (wooResponse.ok) {
            const data = await (wooResponse.headers
              .get("content-type")
              ?.includes("json")
              ? wooResponse.json()
              : Promise.reject(
                  new Error("Invalid non-JSON response from server."),
                ));
            const mappedWooOrders = (data.orders || []).map((order: any) => ({
              id: `woo_${order.id}`,
              wooId: order.id,
              source: "woocommerce",
              orderNumber: order.number,
              customerName: `${order.billing.first_name} ${order.billing.last_name}`,
              customerPhone: order.billing.phone,
              customerAddress: `${order.billing.address_1}, ${order.billing.city}`,
              totalAmount: parseFloat(order.total),
              dueAmount: parseFloat(order.total),
              status: order.status,
              createdAt: { toDate: () => new Date(order.date_created) },
              items: order.line_items.map((item: any) => ({
                name: item.name,
                quantity: item.quantity,
                price: parseFloat(item.price),
              })),
              notes: order.customer_note,
              paymentMethod: order.payment_method_title,
            }));
            setWooOrders(mappedWooOrders);
          }
        } else {
          const err = await (response.headers
            .get("content-type")
            ?.includes("json")
            ? response.json()
            : Promise.reject(
                new Error("Invalid non-JSON response from server."),
              ));
          throw new Error(err.error || "Failed to update WooCommerce order");
        }
      } catch (error: any) {
        toast.error(error.message);
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      const orderRef = doc(db, "orders", orderId);

      await runTransaction(db, async (transaction) => {
        const orderSnap = await transaction.get(orderRef);
        if (!orderSnap.exists()) return;

        const orderData = orderSnap.data();
        const normalizedOldStatus = orderData.status.toLowerCase();
        const normalizedNewStatus = newStatus.toLowerCase();

        if (normalizedOldStatus === normalizedNewStatus) return;

        // 1. Update Order Status
        transaction.update(orderRef, {
          status: newStatus,
          updatedAt: serverTimestamp(),
        });

        // 2. Stock Management Logic
        const isActiveStatus = (status: string) =>
          status !== "cancelled" && status !== "returned";

        // If moving FROM active TO inactive -> Restore Stock
        if (
          isActiveStatus(normalizedOldStatus) &&
          !isActiveStatus(normalizedNewStatus)
        ) {
          for (const item of orderData.items) {
            const invQuery = query(
              collection(db, "inventory"),
              where("productId", "==", item.productId),
              where("variantId", "==", item.variantId || ""),
              where("warehouseId", "==", orderData.warehouseId),
            );
            const invSnap = await getDocs(invQuery);
            if (!invSnap.empty) {
              const invDoc = invSnap.docs[0];
              const currentQty = invDoc.data().quantity || 0;
              const newQty = currentQty + item.quantity;
              transaction.update(invDoc.ref, {
                quantity: newQty,
                updatedAt: serverTimestamp(),
              });

              const logRef = doc(collection(db, "inventoryLogs"));
              transaction.set(logRef, {
                productId: item.productId,
                variantId: item.variantId || "",
                warehouseId: orderData.warehouseId,
                type: "in",
                quantityChange: item.quantity,
                newQuantity: newQty,
                reason: `Order #${orderId.slice(0, 8)} ${newStatus} (Stock Restored)`,
                uid: auth.currentUser?.uid,
                createdAt: serverTimestamp(),
              });
            }
          }
        }
        // If moving FROM inactive TO active -> Deduct Stock
        else if (
          !isActiveStatus(normalizedOldStatus) &&
          isActiveStatus(normalizedNewStatus)
        ) {
          for (const item of orderData.items) {
            const invQuery = query(
              collection(db, "inventory"),
              where("productId", "==", item.productId),
              where("variantId", "==", item.variantId || ""),
              where("warehouseId", "==", orderData.warehouseId),
            );
            const invSnap = await getDocs(invQuery);
            if (!invSnap.empty) {
              const invDoc = invSnap.docs[0];
              const currentQty = invDoc.data().quantity || 0;
              const newQty = currentQty - item.quantity;
              transaction.update(invDoc.ref, {
                quantity: newQty,
                updatedAt: serverTimestamp(),
              });

              const logRef = doc(collection(db, "inventoryLogs"));
              transaction.set(logRef, {
                productId: item.productId,
                variantId: item.variantId || "",
                warehouseId: orderData.warehouseId,
                type: "out",
                quantityChange: -item.quantity,
                newQuantity: newQty,
                reason: `Order #${orderId.slice(0, 8)} ${newStatus} (Stock Re-deducted)`,
                uid: auth.currentUser?.uid,
                createdAt: serverTimestamp(),
              });
            }
          }
        }
      });

      toast.success(
        `Order status updated to ${newStatus.replace(/_/g, " ").charAt(0).toUpperCase() + newStatus.replace(/_/g, " ").slice(1)}`,
      );
      await logActivity(
        "Updated Order Status",
        "Orders",
        `Order #${orderId.slice(0, 8)} status changed to ${newStatus}`,
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    setConfirmConfig({
      isOpen: true,
      title: "Delete Order",
      message:
        "Are you sure you want to delete this order? Inventory will be restored if the order is currently active.",
      variant: "danger",
      onConfirm: async () => {
        try {
          const orderRef = doc(db, "orders", orderId);
          await runTransaction(db, async (transaction) => {
            const snap = await transaction.get(orderRef);
            if (!snap.exists()) return;

            const orderData = snap.data();
            const normalizedStatus = orderData.status?.toLowerCase() || "";
            const isActive =
              normalizedStatus !== "cancelled" &&
              normalizedStatus !== "returned";

            // Restore Stock if deleting an active order
            if (isActive && orderData.items) {
              for (const item of orderData.items) {
                const invQuery = query(
                  collection(db, "inventory"),
                  where("productId", "==", item.productId),
                  where("variantId", "==", item.variantId || ""),
                  where("warehouseId", "==", orderData.warehouseId),
                );
                const invSnap = await getDocs(invQuery);
                if (!invSnap.empty) {
                  const invDoc = invSnap.docs[0];
                  const currentQty = invDoc.data().quantity || 0;
                  const newQty = currentQty + (item.quantity || 0);
                  transaction.update(invDoc.ref, {
                    quantity: newQty,
                    updatedAt: serverTimestamp(),
                  });

                  // Log
                  const logRef = doc(collection(db, "inventoryLogs"));
                  transaction.set(logRef, {
                    productId: item.productId,
                    variantId: item.variantId || "",
                    warehouseId: orderData.warehouseId,
                    type: "in",
                    quantityChange: item.quantity || 0,
                    newQuantity: newQty,
                    reason: `Order #${orderId.slice(0, 8)} DELETED (Auto-Restore)`,
                    uid: auth.currentUser?.uid,
                    createdAt: serverTimestamp(),
                  });
                }
              }
            }

            transaction.delete(orderRef);
          });

          await logActivity(
            "Deleted Order",
            "Orders",
            `Order #${orderId.slice(0, 8)} removed and stock adjusted`,
          );
          toast.success("Order deleted and stock updated");
        } catch (error) {
          handleFirestoreError(
            error,
            OperationType.DELETE,
            `orders/${orderId}`,
          );
        }
      },
    });
  };

  const handleBulkDelete = () => {
    if (!auth.currentUser || selectedOrders.length === 0) return;
    setConfirmConfig({
      isOpen: true,
      title: "Bulk Delete Orders",
      message: `Are you sure you want to delete ${selectedOrders.length} orders? Inventory will be restored if any of these orders are active.`,
      variant: "danger",
      onConfirm: async () => {
        setLoading(true);
        let successCount = 0;
        let failCount = 0;

        try {
          // Process sequentially to ensure transaction integrity
          for (const orderId of selectedOrders) {
            try {
              if (orderId.startsWith("woo_")) {
                const wooId = orderId.replace("woo_", "");
                await fetch(`/api/woocommerce/orders/${wooId}`, {
                  method: "DELETE",
                });
                setWooOrders((prev) => prev.filter((o) => o.wooId !== parseInt(wooId)));
              } else {
                const orderRef = doc(db, "orders", orderId);
                await runTransaction(db, async (transaction) => {
                  const snap = await transaction.get(orderRef);
                  if (!snap.exists()) return;

                  const orderData = snap.data();
                  const normalizedStatus = orderData.status?.toLowerCase() || "";
                  const isActive =
                    normalizedStatus !== "cancelled" &&
                    normalizedStatus !== "returned";

                  // Restore Stock if deleting an active order
                  if (isActive && orderData.items) {
                    for (const item of orderData.items) {
                      const invQuery = query(
                        collection(db, "inventory"),
                        where("productId", "==", item.productId),
                        where("variantId", "==", item.variantId || ""),
                        where("warehouseId", "==", orderData.warehouseId),
                      );
                      const invSnap = await getDocs(invQuery);
                      if (!invSnap.empty) {
                        const invDoc = invSnap.docs[0];
                        const currentQty = invDoc.data().quantity || 0;
                        const newQty = currentQty + (item.quantity || 0);
                        transaction.update(invDoc.ref, {
                          quantity: newQty,
                          updatedAt: serverTimestamp(),
                        });

                        // Log
                        const logRef = doc(collection(db, "inventoryLogs"));
                        transaction.set(logRef, {
                          productId: item.productId,
                          variantId: item.variantId || "",
                          warehouseId: orderData.warehouseId,
                          type: "in",
                          quantityChange: item.quantity || 0,
                          newQuantity: newQty,
                          reason: `Order #${orderId.slice(0, 8)} BULK DELETED (Auto-Restore)`,
                          uid: auth.currentUser?.uid,
                          createdAt: serverTimestamp(),
                        });
                      }
                    }
                  }

                  transaction.delete(orderRef);
                });
              }
              successCount++;
            } catch (err: any) {
              console.error(`Failed to delete order ${orderId}:`, err);
              failCount++;
            }
          }

          toast.success(
            `Bulk delete complete. Success: ${successCount}, Failed: ${failCount}`,
          );
          setSelectedOrders([]);
        } catch (error) {
          toast.error("An error occurred during bulk delete");
        } finally {
          setLoading(false);
          setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleBulkStatusUpdate = async (newStatus: string) => {
    if (!auth.currentUser || selectedOrders.length === 0) return;
    setLoading(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const id of selectedOrders) {
        try {
          if (id.startsWith("woo_")) {
            const wooId = id.replace("woo_", "");
            const response = await fetch(`/api/woocommerce/orders/${wooId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: newStatus }),
            });
            if (response.ok) {
              setWooOrders((prev) =>
                prev.map((o) =>
                  o.id === id ? { ...o, status: newStatus } : o,
                ),
              );
              successCount++;
            } else {
              failCount++;
            }
          } else {
            // Sequential execution for local orders to ensure inventory consistency
            await handleUpdateStatus(id, newStatus);
            successCount++;
          }
        } catch (err) {
          console.error(`Failed to update order ${id}:`, err);
          failCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully updated ${successCount} orders`);
      }
      if (failCount > 0) {
        toast.error(`Failed to update ${failCount} orders`);
      }
      setSelectedOrders([]);
    } catch (error) {
      toast.error("An error occurred during bulk update");
    } finally {
      setLoading(false);
    }
  };

  const handleSendToCourier = async (order: any, courierName?: string) => {
    // Determine which courier to use
    const activeCouriers = Object.entries(courierConfigs).filter(
      ([_, config]: [string, any]) => config.isActive,
    );

    if (activeCouriers.length === 0) {
      toast.error(
        "No courier is active. Please go to Settings > Logistics to activate one.",
      );
      return;
    }

    let targetCourier = courierName;
    if (!targetCourier) {
      if (activeCouriers.length > 1) {
        setCourierSelection({
          isOpen: true,
          order,
          activeCouriers,
        });
        return;
      }
      targetCourier = activeCouriers[0][0];
    }

    if (
      ["shipped", "delivered", "cancelled", "returned"].includes(order.status)
    ) {
      toast.error(
        `Cannot send order with status: ${order.status.replace(/_/g, " ")}`,
      );
      return;
    }

    setLoading(true);
    try {
      const sanitizePhone = (phone: string) => {
        const cleaned = phone.replace(/\D/g, "");
        return cleaned.length > 11 ? cleaned.slice(-11) : cleaned;
      };

      const phone = sanitizePhone(order.customerPhone);

      if (targetCourier === "pathao") {
        if (
          !order.pathao_city_id ||
          !order.pathao_zone_id ||
          !order.pathao_area_id
        ) {
          toast.error(
            "Please select Pathao City, Zone, and Area first by editing the order.",
          );
          setLoading(false);
          return;
        }
      }

      if (targetCourier === "carrybee") {
        if (
          !order.carrybee_city_id ||
          !order.carrybee_zone_id ||
          !order.carrybee_area_id
        ) {
          toast.error(
            "Please select Carrybee City, Zone, and Area first by editing the order.",
          );
          setLoading(false);
          return;
        }
      }

      const orderData = {
        invoice: order.orderNumber?.toString() || order.id.slice(0, 8),
        customer_name: order.customerName,
        customer_phone: phone,
        customer_address: order.customerAddress,
        amount: order.totalAmount,
        cod_amount: Math.round(order.dueAmount || 0),
        note: order.notes || "",
        weight: 0.5,
        recipient_city:
          targetCourier === "carrybee"
            ? order.carrybee_city_id
            : order.pathao_city_id,
        recipient_zone:
          targetCourier === "carrybee"
            ? order.carrybee_zone_id
            : order.pathao_zone_id,
        recipient_area:
          targetCourier === "carrybee"
            ? order.carrybee_area_id
            : order.pathao_area_id,
      };

      const response = await fetch("/api/couriers/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courier: targetCourier, orderData }),
      });

      const result = await (response.headers
        .get("content-type")
        ?.includes("json")
        ? response.json()
        : Promise.reject(new Error("Invalid non-JSON response from server.")));

      if (response.ok) {
        const trackingCode =
          result.consignment?.tracking_code ||
          result.tracking_id ||
          result.tracking_code;

        if (order.source === "woocommerce") {
          // Update WooCommerce order status to processing or shipped
          await fetch(`/api/woocommerce/orders/${order.wooId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "processing" }),
          });

          // Update local state so UI reflects the change immediately
          setWooOrders((prev) =>
            prev.map((o) =>
              o.id === order.id ? { ...o, status: "processing" } : o,
            ),
          );

          // Also save to local deliveries for tracking
          await addDoc(collection(db, "deliveries"), {
            id: trackingCode,
            orderId: order.id,
            wooId: order.wooId,
            courier:
              targetCourier.charAt(0).toUpperCase() + targetCourier.slice(1),
            status: "Pending Pickup",
            location: order.customerZone || "Processing",
            eta: "2-3 Days",
            createdAt: serverTimestamp(),
            uid: auth.currentUser?.uid,
          });
        } else {
          await updateDoc(doc(db, "orders", order.id), {
            courierName:
              targetCourier.charAt(0).toUpperCase() + targetCourier.slice(1),
            trackingNumber: trackingCode,
            status: "shipped",
            updatedAt: serverTimestamp(),
            logs: arrayUnion({
              user: auth.currentUser?.email,
              action: `Sent to ${targetCourier}`,
              timestamp: Timestamp.now(),
              details: `Tracking Code: ${trackingCode}`,
            }),
          });

          await addDoc(collection(db, "deliveries"), {
            id: trackingCode,
            orderId: order.id,
            orderNumber: order.orderNumber,
            courier:
              targetCourier.charAt(0).toUpperCase() + targetCourier.slice(1),
            status: "Pending Pickup",
            location: order.customerZone || "Processing",
            eta: "2-3 Days",
            createdAt: serverTimestamp(),
            uid: auth.currentUser?.uid,
          });
        }

        toast.success(
          `Order sent to ${targetCourier}! Tracking: ${trackingCode}`,
        );
      } else {
        throw new Error(result.error || `Failed to send to ${targetCourier}`);
      }
    } catch (error: any) {
      console.error("Courier error:", error);
      toast.error(`Failed to send to courier: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkSendToCourier = async () => {
    const activeCouriers = Object.entries(courierConfigs).filter(
      ([_, config]: [string, any]) => config.isActive,
    );
    if (activeCouriers.length === 0) {
      toast.error(
        "No courier is active. Please go to Settings > Logistics to activate one.",
      );
      return;
    }
    const targetCourier = activeCouriers[0][0];

    const allOrders = [...orders, ...wooOrders];
    const eligibleOrders = allOrders.filter(
      (o) =>
        selectedOrders.includes(o.id) &&
        !["shipped", "delivered", "cancelled", "returned"].includes(o.status),
    );

    if (eligibleOrders.length === 0) {
      toast.error("No eligible orders selected (must be pending/processing).");
      return;
    }

    setConfirmConfig({
      isOpen: true,
      title: "Bulk Send to Courier",
      message: `Are you sure you want to send ${eligibleOrders.length} orders to ${targetCourier}?`,
      variant: "info",
      onConfirm: async () => {
        setLoading(true);
        let successCount = 0;
        let failCount = 0;

        for (const order of eligibleOrders) {
          try {
            const sanitizePhone = (phone: string) => {
              const cleaned = phone.replace(/\D/g, "");
              return cleaned.length > 11 ? cleaned.slice(-11) : cleaned;
            };

            const phone = sanitizePhone(order.customerPhone);

            if (targetCourier === "pathao") {
              if (
                !order.pathao_city_id ||
                !order.pathao_zone_id ||
                !order.pathao_area_id
              ) {
                failCount++;
                continue;
              }
            }

            const orderData = {
              invoice: order.orderNumber?.toString() || order.id.slice(0, 8),
              customer_name: order.customerName,
              customer_phone: phone,
              customer_address: order.customerAddress,
              amount: order.totalAmount,
              cod_amount: Math.round(order.dueAmount || 0),
              note: order.notes || "",
              weight: 0.5,
              recipient_city: order.pathao_city_id,
              recipient_zone: order.pathao_zone_id,
              recipient_area: order.pathao_area_id,
            };

            const response = await fetch("/api/couriers/order", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ courier: targetCourier, orderData }),
            });

            const result = await (response.headers
              .get("content-type")
              ?.includes("json")
              ? response.json()
              : Promise.reject(
                  new Error("Invalid non-JSON response from server."),
                ));

            if (response.ok) {
              const trackingCode =
                result.consignment?.tracking_code ||
                result.tracking_id ||
                result.tracking_code;

              if (order.source === "woocommerce") {
                await fetch(`/api/woocommerce/orders/${order.wooId}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ status: "processing" }),
                });

                setWooOrders((prev) =>
                  prev.map((o) =>
                    o.id === order.id ? { ...o, status: "processing" } : o,
                  ),
                );

                await addDoc(collection(db, "deliveries"), {
                  id: trackingCode,
                  orderId: order.id,
                  wooId: order.wooId,
                  courier:
                    targetCourier.charAt(0).toUpperCase() +
                    targetCourier.slice(1),
                  status: "Pending Pickup",
                  location: order.customerZone || "Processing",
                  eta: "2-3 Days",
                  createdAt: serverTimestamp(),
                  uid: auth.currentUser?.uid,
                });
              } else {
                await updateDoc(doc(db, "orders", order.id), {
                  courierName:
                    targetCourier.charAt(0).toUpperCase() +
                    targetCourier.slice(1),
                  trackingNumber: trackingCode,
                  status: "shipped",
                  updatedAt: serverTimestamp(),
                  logs: arrayUnion({
                    user: auth.currentUser?.email,
                    action: `Sent to ${targetCourier} (Bulk)`,
                    timestamp: Timestamp.now(),
                    details: `Tracking Code: ${trackingCode}`,
                  }),
                });

                // Add to deliveries collection
                await addDoc(collection(db, "deliveries"), {
                  id: trackingCode,
                  orderId: order.id,
                  orderNumber: order.orderNumber,
                  courier:
                    targetCourier.charAt(0).toUpperCase() +
                    targetCourier.slice(1),
                  status: "Pending Pickup",
                  location: order.customerZone || "Processing",
                  eta: "2-3 Days",
                  createdAt: serverTimestamp(),
                  uid: auth.currentUser?.uid,
                });
              }

              successCount++;
            } else {
              failCount++;
            }
          } catch (error) {
            console.error(
              `${targetCourier} error for order ${order.id}:`,
              error,
            );
            failCount++;
          }
        }

        setLoading(false);
        setSelectedOrders([]);
        toast.success(
          `Bulk process complete. Success: ${successCount}, Failed: ${failCount}`,
        );
      },
    });
  };

  const handleExportCSV = () => {
    const allOrders = [...orders, ...wooOrders];
    if (allOrders.length === 0) {
      toast.error("No orders to export");
      return;
    }

    const headers = [
      "Order ID",
      "Order Number",
      "Customer Name",
      "Phone",
      "Address",
      "City",
      "Zone",
      "Subtotal",
      "Delivery Charge",
      "Discount",
      "Total Amount",
      "Paid Amount",
      "Due Amount",
      "Status",
      "Channel",
      "Payment Method",
      "Created At",
    ];
    const csvRows = [headers.join(",")];

    allOrders.forEach((order) => {
      const row = [
        order.id,
        order.orderNumber || "",
        `"${order.customerName || ""}"`,
        `"${order.customerPhone || ""}"`,
        `"${(order.customerAddress || "").replace(/"/g, '""')}"`,
        order.customerCity || "",
        order.customerZone || "",
        order.subtotal || 0,
        order.deliveryCharge || 0,
        order.discount || 0,
        order.totalAmount || 0,
        order.paidAmount || 0,
        order.dueAmount || 0,
        order.status || "",
        order.channel || "",
        order.paymentMethod || "",
        order.createdAt?.toDate
          ? order.createdAt.toDate().toLocaleString()
          : order.createdAt?.seconds
            ? new Date(order.createdAt.seconds * 1000).toLocaleString()
            : "N/A",
      ];
      csvRows.push(row.join(","));
    });

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `orders_export_${new Date().toISOString().split("T")[0]}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Orders exported successfully");
  };

  const combinedOrders = useMemo(
    () => [...orders, ...wooOrders],
    [orders, wooOrders],
  );

  const filteredOrders = useMemo(() => {
    return combinedOrders
      .filter((order) => {
        const matchesSearch =
          order.customerName
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          order.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.customerPhone?.includes(searchTerm) ||
          order.orderNumber?.toString().includes(searchTerm);

        const matchesTab = activeTab === "All" || order.status === activeTab;

        const date = order.createdAt?.toDate
          ? order.createdAt.toDate()
          : new Date(order.createdAt);
        const now = new Date();
        let matchesDate = true;
        if (dateFilter === "today") {
          matchesDate =
            date.getDate() === now.getDate() &&
            date.getMonth() === now.getMonth() &&
            date.getFullYear() === now.getFullYear();
        } else if (dateFilter === "month") {
          matchesDate =
            date.getMonth() === now.getMonth() &&
            date.getFullYear() === now.getFullYear();
        }

        return matchesSearch && matchesTab && matchesDate;
      })
      .sort((a, b) => {
        const dateA = a.createdAt?.toDate
          ? a.createdAt.toDate()
          : new Date(a.createdAt);
        const dateB = b.createdAt?.toDate
          ? b.createdAt.toDate()
          : new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
      });
  }, [combinedOrders, searchTerm, activeTab, dateFilter]);

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const allO = useMemo(
    () =>
      combinedOrders.filter((order) => {
        const date = order.createdAt?.toDate
          ? order.createdAt.toDate()
          : new Date(order.createdAt);
        const now = new Date();
        if (dateFilter === "today") {
          return (
            date.getDate() === now.getDate() &&
            date.getMonth() === now.getMonth() &&
            date.getFullYear() === now.getFullYear()
          );
        } else if (dateFilter === "month") {
          return (
            date.getMonth() === now.getMonth() &&
            date.getFullYear() === now.getFullYear()
          );
        }
        return true;
      }),
    [combinedOrders, dateFilter],
  );

  const getStats = useCallback(
    (statusFilter?: string) => {
      const filterFn = (o: any) => !statusFilter || o.status === statusFilter;

      const currentOrders = allO.filter(filterFn);
      const count = currentOrders.length;

      // Using simple formatting for revenue (rounded to nearest int)
      const revenueValue = currentOrders.reduce(
        (sum, o) =>
          sum + (parseFloat(o.totalAmount) || parseFloat(o.subtotal) || 0),
        0,
      );
      const revenue = new Intl.NumberFormat("en-US").format(
        Math.round(revenueValue),
      );

      const now = new Date();
      let prevStart = new Date(0);
      let prevEnd = new Date(0);

      if (dateFilter === "today") {
        prevStart = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - 1,
        );
        prevEnd = new Date(prevStart);
        prevEnd.setDate(prevEnd.getDate() + 1);
      } else if (dateFilter === "month") {
        prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        prevEnd = new Date(now.getFullYear(), now.getMonth(), 1);
      } else {
        prevStart = new Date();
        prevStart.setDate(now.getDate() - 60);
        prevEnd = new Date();
        prevEnd.setDate(now.getDate() - 30);
      }

      const previousPeriodCount = combinedOrders.filter((o) => {
        if (!filterFn(o)) return false;
        const d = o.createdAt?.toDate
          ? o.createdAt.toDate()
          : new Date(o.createdAt);
        return d >= prevStart && d < prevEnd;
      }).length;

      let growthValueStr = "";
      let isPositive = true;

      if (previousPeriodCount === 0) {
        growthValueStr = count > 0 ? "100%" : "0%";
        isPositive = count > 0;
      } else {
        const growth =
          ((count - previousPeriodCount) / previousPeriodCount) * 100;
        isPositive = growth >= 0;
        growthValueStr = Math.abs(growth).toFixed(0) + "%";
      }

      return { count, revenue, growth: { value: growthValueStr, isPositive } };
    },
    [allO, combinedOrders, dateFilter],
  );

  const handleDirectPrint = useCallback(
    (order: any, type: "a5" | "pos") => {
      setSelectedOrderForPrint(order);
      setPrintType(type);

      // We need to wait for the hidden print area to update with the new order
      setTimeout(() => {
        if (printRef.current) {
          const win = window.open("", "_blank");
          if (win) {
            openPrintWindow(
              printRef.current.innerHTML,
              `Invoice_${order.orderNumber || order.id}`,
              win,
            );
            setSelectedOrderForPrint(null);
            setPrintType(null);
          } else {
            toast.error("Please allow popups to print.");
          }
        }
      }, 500);
    },
    [companySettings, currencySymbol],
  );

  const statsMap = useMemo(
    () => ({
      total: getStats(),
      completed: getStats("delivered"),
      pending: getStats("pending"),
      cancelled: getStats("cancelled"),
    }),
    [getStats],
  );

  const totalStats = statsMap.total;
  const completedStats = statsMap.completed;
  const pendingStats = statsMap.pending;
  const cancelledStats = statsMap.cancelled;

  const statCards = [
    {
      label: "Total Orders",
      stats: totalStats,
      icon: Package,
      iconBg: "bg-brand/20/50",
      iconColor: "text-[#065F6B]",
    },
    {
      label: "Completed Orders",
      stats: completedStats,
      icon: PackageCheck,
      iconBg: "bg-green-100/50",
      iconColor: "text-[#1B9D33]",
    },
    {
      label: "Pending Orders",
      stats: pendingStats,
      icon: Clock,
      iconBg: "bg-orange-100/50",
      iconColor: "text-[#E57A21]",
    },
    {
      label: "Cancelled Orders",
      stats: cancelledStats,
      icon: PackageX,
      iconBg: "bg-purple-100/50",
      iconColor: "text-[#845BC3]",
    },
  ];

  return (
    <div className="p-4 s:p-6 md:p-8 space-y-8 max-w-[1600px] mx-auto no-print">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
        <div className="space-y-1">
          <h2 className="text-3xl sm:text-4xl font-bold text-primary tracking-tight">
            Order Flows
          </h2>
          <p className="text-secondary text-sm font-medium">
            Execute and track multi-channel fulfillment across your entire retail network.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="flex items-center gap-2 bg-surface border border-border rounded-lg shadow-subtle px-3 py-1 text-sm font-medium text-secondary h-11">
            <div className="relative flex items-center h-full">
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full appearance-none pl-3 pr-8 py-2 text-sm font-medium bg-transparent text-secondary outline-none cursor-pointer"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="month">This Month</option>
              </select>
              <Calendar size={16} className="absolute right-2 text-muted pointer-events-none" />
            </div>
            <div className="w-px h-5 bg-gray-200" />
            <button
              onClick={handleExportCSV}
              className="w-8 h-8 flex items-center justify-center hover:bg-surface-hover rounded-md transition-colors text-muted hover:text-primary shrink-0"
              title="Export CSV"
            >
              <Download size={16} />
            </button>
          </div>

          {/* List/Grid View Toggle */}
          <div className="flex items-center gap-1 bg-surface border border-border rounded-lg shadow-subtle p-1">
            <button
               onClick={() => setViewMode("table")}
               className={`p-2 rounded-md transition-colors ${viewMode === "table" ? "bg-surface-hover text-primary" : "text-muted hover:text-secondary"}`}
            >
               <List size={16} />
            </button>
            <button
               onClick={() => setViewMode("grid")}
               className={`p-2 rounded-md transition-colors ${viewMode === "grid" ? "bg-surface-hover text-primary" : "text-muted hover:text-secondary"}`}
            >
               <LayoutGrid size={16} />
            </button>
          </div>

          <Link
            to="/orders/new"
            className="flex items-center gap-2 px-5 py-2.5 bg-[#1C2032] text-white rounded-lg text-sm font-semibold hover:bg-[#2A2F45] transition-colors shadow-subtle"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>New Order</span>
          </Link>
        </div>
      </div>

      {/* Advanced Search & Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-12 gap-5 mb-8">
        {/* Left Column: Search & Overview */}
        <div className="lg:col-span-1 xl:col-span-4 2xl:col-span-3 flex flex-col gap-5">
           {/* Search Input */}
           <div className="bg-surface border border-border rounded-[20px] p-2 flex items-center shadow-subtle h-14">
             <div className="flex items-center justify-center w-12 text-muted">
                <Search size={18} />
             </div>
             <input 
               type="text" 
               placeholder="Search orders..." 
               className="flex-1 bg-transparent border-none outline-none text-sm placeholder-gray-400 text-primary"
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
             />
             <div className="w-10 h-10 flex items-center justify-center text-secondary cursor-pointer hover:bg-surface-hover rounded-xl transition-colors shrink-0">
                <Filter size={18} />
             </div>
           </div>

           {/* Pending and Delivered Stats */}
           <div className="grid grid-cols-2 gap-4">
             {/* Pending Orders Card */}
             <div className="bg-surface border border-border rounded-[20px] p-5 shadow-subtle relative overflow-hidden flex flex-col justify-between h-[160px]">
                <div>
                   <p className="text-[10px] font-bold text-[#FF6347] uppercase tracking-wider mb-2">Pending Orders</p>
                   <div className="flex items-end gap-1.5 mb-2">
                     <span className="text-3xl font-bold text-primary leading-none">{pendingStats.count}</span>
                     <span className="text-xs font-medium text-secondary mb-0.5">Items</span>
                   </div>
                </div>
                <div className="text-[13px] font-bold text-[#FF6347] z-10">
                   ৳{pendingStats.revenue}
                </div>
                <div className="absolute right-4 inset-y-0 flex items-center opacity-20 pointer-events-none">
                   <ShoppingCart size={28} className="text-[#FF6347]" />
                </div>
             </div>

             {/* Delivered Card */}
             <div className="bg-surface border border-border rounded-[20px] p-5 shadow-subtle relative overflow-hidden flex flex-col justify-between h-[160px]">
                <div>
                  <p className="text-[10px] font-bold text-[#1DAB61] uppercase tracking-wider mb-2">Delivered</p>
                  <div className="flex items-end gap-1.5 mb-2">
                    <span className="text-3xl font-bold text-primary leading-none">{completedStats.count}</span>
                    <span className="text-xs font-medium text-secondary mb-0.5">Total</span>
                  </div>
                </div>
                <div className="text-[13px] font-bold text-[#1DAB61] z-10">
                   ৳{completedStats.revenue}
                </div>
                <div className="absolute right-4 inset-y-0 flex items-center opacity-20 pointer-events-none">
                   <Package size={28} className="text-[#1DAB61]" />
                </div>
             </div>
           </div>
        </div>

        {/* Business Value Chart */}
        <div className="lg:col-span-1 xl:col-span-4 2xl:col-span-5 bg-[#1C2032] border border-[#2b2b2b] rounded-[24px] p-6 2xl:p-7 text-white relative overflow-hidden shadow-subtle flex flex-col">
          {/* Header Row */}
          <div className="flex justify-between items-center mb-6">
             <div className="flex items-center gap-2">
                 <TrendingUp size={16} className="text-brand" />
                 <span className="text-[11px] font-medium tracking-wider text-brand uppercase">Business Value</span>
             </div>
             <div className="bg-[#1DAB61]/10 border border-[#1DAB61]/20 text-[#1DAB61] text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1">
                 <TrendingUp size={12} />
                 100%
             </div>
          </div>
          {/* Value */}
          <div className="mb-4">
             <p className="text-[10px] text-muted font-bold uppercase tracking-widest mb-2">Total Sales Revenue</p>
             <h3 className="text-[40px] leading-none font-bold text-white tracking-tight">৳124,279</h3>
          </div>
          
          <div className="mt-auto flex items-end justify-between z-10">
             <p className="text-xs text-muted leading-relaxed max-w-[200px]">Combined market value across all active sales channels.</p>
             <div className="flex -space-x-2">
                 {[1, 2, 3].map(i => (
                    <div key={i} className="w-8 h-8 rounded-full border-[3px] border-[#1C2032] bg-gray-600 overflow-hidden">
                       <div className="w-full h-full bg-gradient-to-br from-gray-400 to-gray-500" />
                    </div>
                 ))}
                 <div className="w-8 h-8 rounded-full border-[3px] border-[#1C2032] bg-surface text-[#1C2032] flex items-center justify-center text-sm font-bold z-10">+</div>
             </div>
          </div>
          {/* Subtle gradient blob */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gradient-to-r from-transparent via-[#0066FF]/5 to-transparent pointer-events-none transform -skew-x-12" />
        </div>

        {/* Completion Rate / Performance Card */}
        <div className="col-span-full lg:col-span-2 xl:col-span-4 2xl:col-span-4 bg-surface border border-border rounded-[24px] p-6 2xl:p-7 shadow-subtle flex flex-col justify-between">
          <div className="flex justify-between items-start mb-6">
             <div>
                <p className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-2">Completion Rate</p>
                <h3 className="text-[40px] leading-none font-bold text-primary tracking-tight">8%</h3>
             </div>
             {/* Circular Progress Placeholder */}
             <div className="w-14 h-14 rounded-full flex items-center justify-center relative">
                <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="transparent" stroke="var(--color-surface-hover)" strokeWidth="6" />
                  <circle cx="50" cy="50" r="45" fill="transparent" stroke="var(--color-brand)" strokeWidth="6" strokeDasharray="282.7" strokeDashoffset={282.7 * (1 - 0.08)} strokeLinecap="round" />
                </svg>
                <Zap size={20} className="text-brand relative z-10 fill-current" />
             </div>
          </div>

          <div className="mb-6 space-y-2">
             <div className="flex justify-between items-center">
                <p className="text-[10px] font-bold text-muted uppercase tracking-widest">Performance Index</p>
                <span className="text-[11px] font-bold text-brand">5 / 63</span>
             </div>
             <div className="h-2.5 w-full bg-[#f1f5f9] rounded-full overflow-hidden">
                 <div className="h-full bg-[#2A4B8D] rounded-full relative" style={{ width: '8%' }} />
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-[16px] p-4 flex flex-col justify-center">
                 <p className="text-[9px] font-bold text-[#FF6347] uppercase tracking-wider mb-2">Return Ratio</p>
                 <span className="text-lg font-bold text-primary leading-none">0%</span>
             </div>
             <div className="bg-brand/10 border border-brand/20 rounded-[16px] p-4 flex flex-col justify-center">
                 <p className="text-[9px] font-bold text-brand uppercase tracking-wider mb-2">Avg Ticket</p>
                 <span className="text-lg font-bold text-primary leading-none">৳1,973</span>
             </div>
          </div>
        </div>
      </div>



      <div className="space-y-6">
        <div className="w-full relative group/tabs pb-6">
          <AnimatePresence>
            {showLeftArrow && (
              <>
                <div className="absolute left-0 top-0 bottom-6 w-12 z-10 bg-gradient-to-r from-gray-50/80 to-transparent pointer-events-none rounded-l-[20px]" />
                <motion.button
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  onClick={() => scrollTabs("left")}
                  className="absolute -left-3 top-[22px] -translate-y-1/2 z-20 w-8 h-8 flex items-center justify-center bg-surface border border-border rounded-full shadow-lg text-secondary hover:text-brand hover:border-brand transition-all"
                >
                  <ChevronLeft size={16} strokeWidth={3} />
                </motion.button>
              </>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showRightArrow && (
              <>
                <div className="absolute right-0 top-0 bottom-6 w-12 z-10 bg-gradient-to-l from-gray-50/80 to-transparent pointer-events-none rounded-r-[20px]" />
                <motion.button
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  onClick={() => scrollTabs("right")}
                  className="absolute -right-3 top-[22px] -translate-y-1/2 z-20 w-8 h-8 flex items-center justify-center bg-surface border border-border rounded-full shadow-lg text-secondary hover:text-brand hover:border-brand transition-all"
                >
                  <ChevronRight size={16} strokeWidth={3} />
                </motion.button>
              </>
            )}
          </AnimatePresence>

          <div 
            ref={tabsRef}
            className="flex overflow-x-auto items-center p-1 bg-surface border border-border rounded-[20px] shadow-subtle gap-x-0.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] scroll-smooth"
          >
            {tabs.map((tab, index) => {
              const isActive = activeTab === tab;
              const count = combinedOrders.filter((o) => tab === "All" || o.status === tab).length;
              const Icon =
                {
                  All: Filter,
                  urgent: Flame,
                  hold: PauseCircle,
                  pending: Clock,
                  confirmed: CheckCircle2,
                  processing: Zap,
                  shipped: Truck,
                  delivered: PackageCheck,
                  partial_delivered: PackageOpen,
                  cancelled: PackageX,
                  returned: RotateCcw,
                }[tab] || Package;

              // Determine icon color based on active state or specific status
              let iconColorClass = "text-muted";
              if (isActive) {
                iconColorClass = "text-brand";
              } else if (tab !== "All") {
                 iconColorClass = globalStatusConfig[tab.toLowerCase()]?.iconColor || "text-muted";
              }

              return (
                <button
                  key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-bold whitespace-nowrap transition-all group/tab relative ${
                      isActive
                        ? "bg-brand/10 dark:bg-brand/20 text-brand shadow-subtle shadow-blue-100/50"
                        : "text-secondary hover:text-primary hover:bg-surface-hover"
                    }`}
                  >
                    <Icon size={14} strokeWidth={isActive ? 2.5 : 2} className={`${iconColorClass} group-hover/tab:scale-110 transition-transform`} />
                    <span className="capitalize tracking-tight">{tab === "All" ? "All Orders" : tab.replace(/_/g, ' ')}</span>
                    {count > 0 && (
                      <span
                        className={`ml-1 text-[9px] min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full font-black leading-none transition-all ${
                          isActive ? "bg-brand text-white" : "bg-gray-900 text-white group-hover/tab:bg-gray-700"
                        }`}
                      >
                        {count}
                      </span>
                    )}
                    {isActive && (
                      <motion.div
                        layoutId="activeTabUnderline"
                        className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-brand rounded-full"
                      />
                    )}
                  </button>
              );
            })}
          </div>
        </div>

        <div className="relative z-[70]">
          <AnimatePresence>
            {selectedOrders.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl bg-surface/90 backdrop-blur-xl border border-border p-2 sm:p-2.5 rounded-[100px] flex items-center justify-between gap-4 shadow-[0_8px_30px_rgb(0,0,0,0.08)]"
              >
                <div className="flex items-center gap-2 px-2">
                  <div className="bg-[#1C2032] text-white px-4 py-2 rounded-full text-[12px] font-bold tracking-wide">
                    {selectedOrders.length} Selected
                  </div>
                  <div className="h-6 w-px bg-gray-200 mx-2" />
                  <div className="flex items-center gap-1">
                    <select
                      onChange={(e) => handleBulkStatusUpdate(e.target.value)}
                      className="bg-surface-hover dark:bg-black/5 text-black dark:text-white border border-black dark:border-white/20 rounded-lg px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs font-bold outline-none"
                    >
                      <option value="" className="text-black dark:text-white">Update Status</option>
                      {statuses.map((s) => (
                        <option key={s} value={s} className="text-black dark:text-white">
                          {s.replace(/_/g, " ").charAt(0).toUpperCase() +
                            s.replace(/_/g, " ").slice(1)}
                        </option>
                      ))}
                    </select>
                    <div className="w-px h-6 bg-gray-200 mx-2" />
                    <button
                      onClick={handleBulkPrint}
                      className="p-2.5 hover:bg-surface-hover rounded-full text-muted hover:text-primary transition-colors"
                      title="Bulk Print"
                    >
                      <Printer size={16} />
                    </button>
                    <button
                      onClick={handleBulkDownloadPDF}
                      className="p-2.5 hover:bg-surface-hover rounded-full text-muted hover:text-primary transition-colors"
                      title="Download Invoices"
                    >
                      <Download size={16} />
                    </button>
                    <button
                      onClick={handleBulkSendToCourier}
                      className="p-2.5 hover:bg-surface-hover rounded-full text-muted hover:text-primary transition-colors"
                      title="Bulk Send to Courier"
                    >
                      <Truck size={16} />
                    </button>
                    <div className="w-px h-6 bg-gray-200 mx-1" />
                    <button
                      onClick={handleBulkDelete}
                      className="p-2.5 hover:bg-red-50 hover:text-red-500 rounded-full text-muted transition-colors"
                      title="Bulk Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedOrders([])}
                  className="p-2 hover:bg-surface-hover rounded-full text-muted hover:text-primary transition-colors mr-1"
                >
                  <X size={18} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {viewMode === "table" ? (
          <div className="relative">

            <div className="bg-surface border border-border rounded-[20px] overflow-hidden shadow-subtle">
              <div className="overflow-x-auto custom-scrollbar pb-2">
                <table className="w-full text-left border-collapse min-w-[760px] md:min-w-[800px]">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-3 xl:px-4 py-5 w-[40px] xl:w-[50px]">
                        <div className="flex items-center min-h-[20px]">
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-border text-primary focus:ring-gray-900 cursor-pointer"
                            checked={
                              selectedOrders.length === filteredOrders.length &&
                              filteredOrders.length > 0
                            }
                            onChange={(e) => {
                              if (e.target.checked)
                                setSelectedOrders(
                                  filteredOrders.map((o) => o.id),
                                );
                              else setSelectedOrders([]);
                            }}
                          />
                        </div>
                      </th>
                      <th className="px-2 xl:px-4 py-4 text-[10px] font-bold text-secondary uppercase tracking-widest whitespace-nowrap">ORDER ID</th>
                      <th className="px-2 xl:px-4 py-4 text-[10px] font-bold text-secondary uppercase tracking-widest whitespace-nowrap">CUSTOMER</th>
                      <th className="px-2 xl:px-4 py-4 text-[10px] font-bold text-secondary uppercase tracking-widest whitespace-nowrap">ITEM QTY</th>
                      <th className="px-2 xl:px-4 py-4 text-[10px] font-bold text-secondary uppercase tracking-widest whitespace-nowrap">BILL</th>
                      <th className="px-2 xl:px-4 py-4 text-[10px] font-bold text-secondary uppercase tracking-widest text-center whitespace-nowrap">
                        STATUS
                      </th>
                      <th className="px-2 xl:px-4 py-4">
                        <div className="flex items-center justify-end gap-2 text-[10px] font-bold text-secondary uppercase tracking-widest whitespace-nowrap">
                          ACTION <MoreVertical size={14} className="text-muted" />
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="px-8 py-20 text-center">
                          <div className="flex flex-col items-center gap-4">
                            <Loader2
                              className="animate-spin text-muted"
                              size={40}
                            />
                            <p className="label-business">
                              Syncing Transactions...
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-8 py-20 text-center">
                          <div className="flex flex-col items-center gap-4">
                            <PackageOpen size={40} className="text-gray-100" />
                            <p className="text-muted font-medium">
                              No transactions match your current lens.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginatedOrders.map((order, idx) => (
                        <motion.tr
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: idx * 0.02 }}
                          key={order.id}
                          className="group hover:bg-surface-hover/50 transition-colors border-b border-border last:border-0"
                        >
                          <td className="px-3 xl:px-4 py-3 xl:py-5">
                            <div className="flex items-center min-h-[20px]">
                              <input
                                type="checkbox"
                                className="w-4 h-4 rounded border-border text-primary focus:ring-gray-900 cursor-pointer"
                                checked={selectedOrders.includes(order.id)}
                                onChange={(e) => {
                                  if (e.target.checked)
                                    setSelectedOrders([
                                      ...selectedOrders,
                                      order.id,
                                    ]);
                                  else
                                    setSelectedOrders(
                                      selectedOrders.filter(
                                        (id) => id !== order.id,
                                      ),
                                    );
                                }}
                              />
                            </div>
                          </td>
                          <td className="px-2 xl:px-4 py-3 xl:py-5">
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-center gap-2">
                                <span className="text-[14px] font-bold text-primary leading-none">
                                  #{order.orderNumber || order.id.slice(0, 8)}
                                </span>
                                {order.source === "woocommerce" && (
                                  <span className="px-2 py-0.5 bg-brand/10 text-brand rounded-full text-[9px] font-bold uppercase tracking-wider">
                                    Woo
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 text-muted">
                                <Calendar size={12} />
                                <span className="text-[11px] font-medium">
                                  {order.createdAt?.toDate
                                    ? order.createdAt
                                        .toDate()
                                        .toLocaleDateString("en-GB")
                                    : order.createdAt?.seconds
                                      ? new Date(
                                          order.createdAt.seconds * 1000,
                                        ).toLocaleDateString("en-GB")
                                      : "N/A"}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-2 xl:px-4 py-3 xl:py-5">
                            <div className="flex flex-col gap-1.5">
                              <span className="text-[14px] font-medium text-primary truncate max-w-[120px] xl:max-w-[200px] leading-none" title={order.customerName}>
                                {order.customerName}
                              </span>
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1.5 text-secondary">
                                  <Smartphone size={12} />
                                  <span className="text-[12px] font-medium">
                                    {order.customerPhone}
                                  </span>
                                </div>
                                <a
                                  href={`https://wa.me/88${order.customerPhone?.replace(/\D/g, "")}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-emerald-500 hover:text-emerald-600 transition-colors"
                                >
                                  <MessageSquare size={14} />
                                </a>
                              </div>
                            </div>
                          </td>
                          <td className="px-2 xl:px-4 py-3 xl:py-5">
                            <div className="flex flex-col gap-1.5">
                              <span className="text-[13px] font-bold text-primary leading-none">
                                {order.items?.length || 0} Products
                              </span>
                              <span className="text-[11px] text-muted font-medium whitespace-nowrap overflow-hidden text-ellipsis max-w-[100px] xl:max-w-[150px] leading-none">
                                {order.items?.[0]?.productName || "Direct Item"}
                                {order.items?.length > 1 ? ", ..." : ""}
                              </span>
                            </div>
                          </td>
                          <td className="px-2 xl:px-4 py-3 xl:py-5">
                            <div className="flex flex-col gap-1.5">
                              <span className="text-[14px] font-bold text-primary leading-none">
                                {currencySymbol}
                                {(order.totalAmount || 0).toLocaleString()}
                              </span>
                              {order.dueAmount > 0 && (
                                <span className="text-[12px] text-[#FF6347] font-bold leading-none">
                                  Due: {currencySymbol}
                                  {(order.dueAmount || 0).toLocaleString()}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-2 xl:px-4 py-3 xl:py-5">
                            <div className="flex items-center justify-center relative min-h-[32px]">
                              <StatusBadge
                                status={order.status}
                                onClick={() =>
                                  setIsStatusMenuOpen(
                                    isStatusMenuOpen === order.id
                                      ? null
                                      : order.id,
                                  )
                                }
                                isOpen={isStatusMenuOpen === order.id}
                              />
                              <AnimatePresence>
                                {isStatusMenuOpen === order.id && (
                                  <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute top-full mt-2 w-48 bg-surface rounded-3xl shadow-2xl border border-border p-2 z-[70] ring-1 ring-black/5"
                                  >
                                    <div className="grid grid-cols-1 gap-1">
                                      {statuses.map((s) => (
                                        <button
                                          key={s}
                                          onClick={() => {
                                            handleUpdateStatus(order.id, s);
                                            setIsStatusMenuOpen(null);
                                          }}
                                          className={`w-full text-left px-4 py-2.5 rounded-2xl text-[10px] font-black transition-all flex items-center justify-between group/item ${
                                            order.status === s
                                              ? "bg-slate-900 dark:bg-white text-white dark:text-black shadow-lg"
                                              : "text-secondary hover:bg-surface-hover hover:text-black dark:hover:text-white"
                                          }`}
                                        >
                                          <span className="uppercase tracking-widest text-[9px]">
                                            {s.replace(/_/g, " ")}
                                          </span>
                                          {order.status === s ? (
                                            <CheckCircle size={10} />
                                          ) : (
                                            <div className="w-1.5 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 group-hover/item:bg-black dark:group-hover/item:bg-white transition-colors" />
                                          )}
                                        </button>
                                      ))}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </td>
                          <td className="px-2 xl:px-4 py-3 xl:py-5">
                            <div className="flex items-center justify-end gap-1 text-muted">
                              <button
                                onClick={() => setViewingOrder(order)}
                                className="p-1.5 lg:p-2 flex items-center justify-center rounded-lg hover:bg-surface-hover hover:text-primary transition-colors border border-transparent hover:border-border"
                                title="View Order"
                              >
                                <Eye size={15} />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedOrderForPrint(order);
                                  setPrintType("a5");
                                }}
                                className="p-1.5 lg:p-2 flex items-center justify-center rounded-lg hover:bg-surface-hover hover:text-primary transition-colors border border-transparent hover:border-border"
                                title="Print Invoice"
                              >
                                <Printer size={15} />
                              </button>
                              <button
                                onClick={() => handleSendToCourier(order)}
                                className="p-1.5 lg:p-2 flex items-center justify-center rounded-lg hover:bg-surface-hover hover:text-primary transition-colors border border-transparent hover:border-border"
                                title="Ship Order"
                              >
                                <Truck size={15} />
                              </button>
                              {order.source !== "woocommerce" && (
                                <>
                                  <button
                                    onClick={() => handleOpenEditModal(order)}
                                    className="p-1.5 lg:p-2 flex items-center justify-center rounded-lg hover:bg-surface-hover hover:text-primary transition-colors border border-transparent hover:border-border"
                                    title="Edit Order"
                                  >
                                    <Edit size={15} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteOrder(order.id)}
                                    className="p-1.5 lg:p-2 flex items-center justify-center rounded-lg hover:bg-red-50 hover:text-red-500 transition-colors border border-transparent hover:border-red-100"
                                    title="Delete Order"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modern Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-8">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-black uppercase tracking-widest text-muted">
                    Phase{" "}
                    <span className="text-black dark:text-white">
                      {(currentPage - 1) * itemsPerPage + 1}
                    </span>{" "}
                    —{" "}
                    <span className="text-black dark:text-white">
                      {Math.min(
                        currentPage * itemsPerPage,
                        filteredOrders.length,
                      )}
                    </span>{" "}
                    of{" "}
                    <span className="text-muted">
                      {filteredOrders.length}
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-1.5 p-1.5 glass rounded-2xl">
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(prev - 1, 1))
                    }
                    disabled={currentPage === 1}
                    className="p-2.5 rounded-xl hover:bg-surface hover:shadow-subtle text-muted disabled:opacity-20 transition-all active:scale-90"
                  >
                    <ChevronLeft size={16} strokeWidth={3} />
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((page) => {
                        if (totalPages <= 5) return true;
                        if (page === 1 || page === totalPages) return true;
                        if (page >= currentPage - 1 && page <= currentPage + 1)
                          return true;
                        return false;
                      })
                      .map((page, index, array) => {
                        const showEllipsis =
                          index > 0 && page - array[index - 1] > 1;
                        const isActive = currentPage === page;
                        return (
                          <React.Fragment key={page}>
                            {showEllipsis && (
                              <span className="text-muted px-1 text-[10px] font-black">
                                •••
                              </span>
                            )}
                            <button
                              onClick={() => setCurrentPage(page)}
                              className={`w-9 h-9 rounded-xl text-[11px] font-black transition-all ${
                                isActive
                                  ? "bg-black text-white shadow-xl shadow-black/10 dark:bg-white dark:text-black dark:shadow-white/10"
                                  : "text-muted hover:bg-surface hover:text-black dark:hover:text-white hover:shadow-subtle"
                              }`}
                            >
                              {String(page).padStart(2, "0")}
                            </button>
                          </React.Fragment>
                        );
                      })}
                  </div>

                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                    }
                    disabled={currentPage === totalPages}
                    className="p-2.5 rounded-xl hover:bg-surface hover:shadow-subtle text-muted disabled:opacity-20 transition-all active:scale-90"
                  >
                    <ChevronRight size={16} strokeWidth={3} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex gap-8 overflow-x-auto pb-12 pt-4 custom-scrollbar min-h-[700px] px-2 -mx-2">
              {statuses.map((status) => {
                const columnOrders = filteredOrders.filter(
                  (o) => o.status === status,
                );
                return (
                  <Droppable key={status} droppableId={status}>
                    {(provided: DroppableProvided) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="flex-shrink-0 w-[19rem] flex flex-col gap-4"
                      >
                        <div className="flex items-center justify-between px-3">
                          <div className="flex items-center gap-2">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                              {status.replace(/_/g, " ")}
                            </h3>
                            <span className="px-2 py-0.5 bg-black text-white dark:bg-white dark:text-black rounded-md text-[8px] font-black shadow-premium">
                              {columnOrders.length}
                            </span>
                          </div>
                          <Link
                            to="/orders/new"
                            className="p-1.5 hover:bg-black dark:hover:bg-gray-200 hover:text-white dark:hover:text-black rounded-lg transition-all active:scale-90"
                          >
                            <Plus size={14} strokeWidth={3} />
                          </Link>
                        </div>

                        <div className="flex-1 space-y-3 min-h-[500px] p-2 rounded-2xl bg-surface-hover/50 border border-border/50">
                          {columnOrders.map((order, index) => {
                            const DraggableAny = Draggable as any;
                            return (
                              <DraggableAny
                                key={order.id}
                                draggableId={order.id}
                                index={index}
                              >
                                {(
                                  provided: DraggableProvided,
                                  snapshot: DraggableStateSnapshot,
                                ) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    onClick={() => {
                                      if (order.source !== "woocommerce") {
                                        handleOpenEditModal(order);
                                      } else {
                                        toast.info(
                                          "WooCommerce orders cannot be edited locally.",
                                        );
                                      }
                                    }}
                                    className={`bg-surface rounded-[20px] p-4 group cursor-pointer border border-border shadow-subtle transition-all duration-300 ${
                                      snapshot.isDragging
                                        ? "shadow-xl ring-2 ring-brand rotate-1 scale-105 z-[100]"
                                        : "hover:border-brand/30 hover:shadow-premium"
                                    }`}
                                  >
                                    <div className="flex justify-between items-start mb-4">
                                      <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-[9px] font-black text-muted uppercase tracking-widest">
                                            #
                                            {order.orderNumber ||
                                              order.id.slice(0, 8)}
                                          </span>
                                          {order.source === "woocommerce" && (
                                            <span className="px-1 py-0.5 bg-cyan-50 text-brand rounded text-[7px] font-black uppercase">
                                              Woo
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <div className="relative">
                                        <StatusBadge
                                          status={order.status}
                                          onClick={(e) => {
                                            e?.stopPropagation();
                                            setIsStatusMenuOpen(
                                              isStatusMenuOpen === order.id
                                                ? null
                                                : order.id,
                                            );
                                          }}
                                          isOpen={isStatusMenuOpen === order.id}
                                        />
                                        <AnimatePresence>
                                          {isStatusMenuOpen === order.id && (
                                            <motion.div
                                              initial={{
                                                opacity: 0,
                                                y: 10,
                                                scale: 0.95,
                                              }}
                                              animate={{
                                                opacity: 1,
                                                y: 0,
                                                scale: 1,
                                              }}
                                              exit={{
                                                opacity: 0,
                                                y: 10,
                                                scale: 0.95,
                                              }}
                                              className="absolute top-full mt-2 w-44 bg-surface rounded-3xl shadow-2xl border border-border p-2 z-[70] ring-1 ring-black/5"
                                            >
                                              <div className="grid grid-cols-1 gap-1">
                                                {statuses.map((s) => (
                                                  <button
                                                    key={s}
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleUpdateStatus(
                                                        order.id,
                                                        s,
                                                      );
                                                      setIsStatusMenuOpen(null);
                                                    }}
                                                    className={`w-full text-left px-3 py-2.5 rounded-2xl text-[10px] font-black transition-all flex items-center justify-between group/item ${
                                                      order.status === s
                                                        ? "bg-slate-900 dark:bg-white text-white dark:text-black shadow-lg"
                                                        : "text-secondary hover:bg-surface-hover hover:text-black dark:hover:text-white"
                                                    }`}
                                                  >
                                                    <span className="uppercase tracking-widest">
                                                      {s.replace(/_/g, " ")}
                                                    </span>
                                                    {order.status === s ? (
                                                      <CheckCircle size={10} />
                                                    ) : (
                                                      <div className="w-1.5 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 group-hover/item:bg-black dark:group-hover/item:bg-white transition-colors" />
                                                    )}
                                                  </button>
                                                ))}
                                              </div>
                                            </motion.div>
                                          )}
                                        </AnimatePresence>
                                      </div>
                                    </div>

                                    <div className="space-y-1 mb-6">
                                      <h4 className="text-sm font-black text-primary tracking-tight">
                                        {order.customerName}
                                      </h4>
                                      <p className="text-[10px] font-bold text-muted">
                                        {order.customerPhone}
                                      </p>
                                      <div className="flex items-center gap-1.5 pt-1">
                                        <Calendar
                                          size={10}
                                          className="text-muted"
                                        />
                                        <span className="text-[9px] font-bold text-muted">
                                          {order.createdAt?.toDate
                                            ? order.createdAt
                                                .toDate()
                                                .toLocaleDateString("en-GB")
                                            : "N/A"}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="flex justify-between items-center pt-5 border-t border-border">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-black text-primary">
                                          {currencySymbol}
                                          {(
                                            order.totalAmount || 0
                                          ).toLocaleString()}
                                        </span>
                                        <div className="flex -space-x-2">
                                          {order.items
                                            ?.slice(0, 2)
                                            .map((_: any, i: number) => (
                                              <div
                                                key={i}
                                                className="w-6 h-6 rounded-full bg-black text-white dark:bg-white dark:text-black border-2 border-white dark:border-[#111317] flex items-center justify-center text-[8px] font-black shadow-subtle"
                                              >
                                                {i + 1}
                                              </div>
                                            ))}
                                          {order.items?.length > 2 && (
                                            <div className="w-6 h-6 rounded-full bg-surface-hover text-muted border-2 border-white dark:border-[#111317] flex items-center justify-center text-[8px] font-black">
                                              +{order.items.length - 2}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1.5 opacity-100 transition-all">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setViewingOrder(order);
                                          }}
                                          className="p-2 hover:bg-surface dark:hover:bg-slate-800 hover:text-primary rounded-xl transition-all text-muted"
                                          title="View Details"
                                        >
                                          <Eye size={14} strokeWidth={2.5} />
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedOrderForPrint(order);
                                            setPrintType("a5");
                                          }}
                                          className="p-2 hover:bg-surface dark:hover:bg-slate-800 hover:text-primary rounded-xl transition-all text-muted"
                                          title="Print"
                                        >
                                          <Printer
                                            size={14}
                                            strokeWidth={2.5}
                                          />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </DraggableAny>
                            );
                          })}
                          {provided.placeholder}
                          {columnOrders.length === 0 && (
                            <div className="h-40 border-2 border-dashed border-border rounded-[2rem] flex flex-col items-center justify-center gap-2 grayscale opacity-40">
                              <PackageOpen
                                size={24}
                                strokeWidth={1.5}
                                className="text-muted"
                              />
                              <span className="text-[10px] font-black uppercase tracking-widest text-muted">
                                Station Empty
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </Droppable>
                );
              })}
            </div>
          </DragDropContext>
        )}

        {/* Premium Add/Edit Order Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 no-print overflow-hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="bg-surface w-full max-w-4xl rounded-xl shadow-2xl relative z-[60] overflow-hidden flex flex-col max-h-[95vh] border border-border"
            >
              <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-surface">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand/10 text-brand flex items-center justify-center">
                    <ShoppingCart size={20} />
                  </div>
                  <div className="flex flex-col">
                    <h3 className="text-lg font-bold text-primary leading-tight">
                      {editingOrder
                        ? `Edit Order #${editingOrder.orderNumber || editingOrder.id.slice(0, 8)}`
                        : "Create New Order"}
                    </h3>
                    <p className="text-xs text-muted font-medium tracking-wide uppercase">
                      OMS TRANSACTION TERMINAL
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {editingOrder && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedOrderForPrint(editingOrder);
                        setPrintType("a5");
                      }}
                      className="p-2 hover:bg-surface-hover rounded-lg transition-all text-muted hover:text-brand border border-border"
                      title="Invoice Preview"
                    >
                      <Printer size={18} />
                    </button>
                  )}
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="p-2 hover:bg-surface-hover rounded-lg transition-all text-muted hover:text-red-500 border border-border"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <form
                onSubmit={handleSubmit}
                className="p-6 overflow-y-auto no-scrollbar flex-1 bg-surface-hover/30"
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Column: Customer & Items */}
                  <div className="lg:col-span-12 space-y-6">
                    {/* Customer & Residence Section */}
                    <div className="bg-surface p-5 rounded-xl border border-border shadow-subtle space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-border">
                        <User size={14} className="text-brand" />
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted">Customer & Residence</h4>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-semibold text-secondary ml-1">Customer Name</label>
                          <input
                            required
                            placeholder="Full name"
                            className="w-full px-4 py-2.5 bg-surface border border-border rounded-lg text-[13px] focus:border-brand focus:ring-4 focus:ring-brand/5 outline-none transition-all placeholder:text-muted"
                            value={orderForm.customerName}
                            onChange={(e) => setOrderForm({...orderForm, customerName: e.target.value})}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-semibold text-secondary ml-1">Contact Phone</label>
                          <div className="flex gap-2">
                            <input
                              required
                              placeholder="01XXXXXXXXX"
                              className="flex-1 px-4 py-2.5 bg-surface border border-border rounded-lg text-[13px] font-mono focus:border-brand focus:ring-4 focus:ring-brand/5 outline-none transition-all placeholder:text-muted"
                              value={orderForm.customerPhone}
                              onChange={(e) => handlePhoneChange(e.target.value)}
                            />
                             {orderForm.customerPhone.length >= 11 && (
                              <a
                                href={`https://wa.me/88${orderForm.customerPhone.replace(/\D/g, "")}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-2.5 bg-[#25D366] text-white rounded-lg hover:bg-[#128C7E] transition-all flex items-center justify-center shadow-lg shadow-green-500/20"
                              >
                                <MessageSquare size={18} />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>

                      {isFetchingHistory ? (
                        <div className="flex items-center gap-2 px-4 py-3 bg-surface-hover rounded-xl">
                          <div className="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                          <span className="text-xs font-medium text-brand">Checking courier history...</span>
                        </div>
                      ) : courierHistory ? (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                              <CheckCircle size={16} />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-emerald-800">Existing Customer Found</p>
                              <p className="text-[10px] text-emerald-600 mt-0.5">
                                {courierHistory.total_delivered} Delivered • {courierHistory.total_cancelled} Cancelled • Success: {courierHistory.success_rate || '100%'}
                              </p>
                            </div>
                          </div>
                          <button 
                            type="button"
                            onClick={() => {
                              if (courierHistory.customer_name || courierHistory.customer_address || courierHistory.address) {
                                setOrderForm(prev => ({
                                  ...prev,
                                  customerName: courierHistory.customer_name || prev.customerName,
                                  customerAddress: courierHistory.address || courierHistory.customer_address || prev.customerAddress
                                }));
                                toast.success("Autofilled from courier network");
                              } else {
                                toast.error("No names/addresses found in courier network");
                              }
                            }}
                            className="px-2.5 py-1 bg-white text-brand text-[10px] font-bold rounded-lg border border-blue-200 shadow-subtle hover:bg-surface-hover transition-colors whitespace-nowrap"
                          >
                            Autofill
                          </button>
                        </div>
                      ) : null}

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold text-secondary ml-1">Delivery Address</label>
                        <textarea
                          rows={2}
                          placeholder="House, Road, Area details..."
                          className="w-full px-4 py-2.5 bg-surface border border-border rounded-lg text-[13px] focus:border-brand focus:ring-4 focus:ring-brand/5 outline-none transition-all resize-none placeholder:text-muted"
                          value={orderForm.customerAddress}
                          onChange={(e) => handleAddressChange(e.target.value)}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-semibold text-secondary ml-1">District</label>
                          <div className="relative">
                            <select
                              className="w-full px-4 py-2.5 bg-surface border border-border rounded-lg text-[13px] focus:border-brand outline-none appearance-none cursor-pointer"
                              value={orderForm.district}
                              onChange={(e) => {
                                setOrderForm({...orderForm, district: e.target.value, area: ""});
                                if (courierConfigs.pathao?.isActive) autoMatchPathao(e.target.value, "");
                                if (courierConfigs.carrybee?.isActive) autoMatchCarrybee(e.target.value, "");
                              }}
                            >
                              <option value="">Select District</option>
                              {districts.map(d => <option key={d.id} value={d.nameEn}>{d.nameEn}</option>)}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" size={14} />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-semibold text-secondary ml-1">Area / Upazila</label>
                          <div className="relative">
                            <select
                              disabled={!orderForm.district}
                              className="w-full px-4 py-2.5 bg-surface border border-border rounded-lg text-[13px] focus:border-brand outline-none appearance-none cursor-pointer disabled:bg-surface-hover disabled:text-muted"
                              value={orderForm.area}
                              onChange={(e) => {
                                setOrderForm({...orderForm, area: e.target.value});
                                if (courierConfigs.pathao?.isActive) autoMatchPathao(orderForm.district, e.target.value);
                                if (courierConfigs.carrybee?.isActive) autoMatchCarrybee(orderForm.district, e.target.value);
                              }}
                            >
                              <option value="">Select Area</option>
                              {upazilas.filter(u => orderForm.district && districts.find(d => d.nameEn === orderForm.district)?.id === u.districtId).map(u => (
                                <option key={u.id} value={u.nameEn}>{u.nameEn}</option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" size={14} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Order Composition Section */}
                    <div className="bg-surface p-5 rounded-xl border border-border shadow-subtle space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-border">
                        <Box size={14} className="text-brand" />
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted">Order Composition</h4>
                      </div>

                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="relative">
                            <select
                              className="w-full px-4 py-2.5 bg-surface-hover border border-border rounded-lg text-[13px] outline-none appearance-none cursor-pointer"
                              value={newItem.productId}
                              onChange={(e) => {
                                const p = products.find(prod => prod.id === e.target.value);
                                setNewItem({...newItem, productId: e.target.value, variantId: "", price: p?.sellingPrice || 0});
                              }}
                            >
                              <option value="">Search Product...</option>
                              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" size={14} />
                          </div>
                          
                          {newItem.productId && products.find(p => p.id === newItem.productId)?.type === "variable" && (
                            <div className="relative">
                              <select
                                className="w-full px-4 py-2.5 bg-surface-hover border border-border rounded-lg text-[13px] outline-none appearance-none cursor-pointer"
                                value={newItem.variantId}
                                onChange={(e) => {
                                  const v = variants.find(varnt => varnt.id === e.target.value);
                                  setNewItem({...newItem, variantId: e.target.value, price: v?.price || newItem.price});
                                }}
                              >
                                <option value="">Select Variant</option>
                                {variants.filter(v => v.productId === newItem.productId).map(v => (
                                  <option key={v.id} value={v.id}>{v.size} / {v.color}</option>
                                ))}
                              </select>
                              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" size={14} />
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex items-center bg-surface-hover border border-border rounded-lg px-2">
                            <button
                              type="button"
                              onClick={() => setNewItem(prev => ({...prev, quantity: Math.max(1, prev.quantity - 1)}))}
                              className="p-1.5 text-muted hover:text-primary"
                            >
                              <Minus size={14} />
                            </button>
                            <input
                              type="number"
                              className="w-10 text-center bg-transparent text-[13px] font-bold outline-none"
                              value={newItem.quantity}
                              onChange={(e) => setNewItem({...newItem, quantity: parseInt(e.target.value) || 0})}
                            />
                            <button
                              type="button"
                              onClick={() => setNewItem(prev => ({...prev, quantity: prev.quantity + 1}))}
                              className="p-1.5 text-muted hover:text-primary"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          
                          <div className="flex-1 min-w-[120px]">
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted font-bold">{currencySymbol}</span>
                              <input
                                type="number"
                                placeholder="Unit Price"
                                className="w-full pl-7 pr-4 py-2.5 bg-surface-hover border border-border rounded-lg text-[13px] font-bold outline-none"
                                value={newItem.price || ""}
                                onChange={(e) => setNewItem({...newItem, price: parseFloat(e.target.value) || 0})}
                              />
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              if (!newItem.productId) return;
                              const p = products.find(prod => prod.id === newItem.productId);
                              if (!p) return;
                              setOrderForm({
                                ...orderForm,
                                items: [...orderForm.items, { ...newItem, productName: p.name, price: newItem.price || p.sellingPrice || 0 }]
                              });
                              setNewItem({ productId: "", variantId: "", quantity: 1, price: 0 });
                            }}
                            className="bg-brand text-white px-5 py-2.5 rounded-lg text-[13px] font-bold hover:bg-blue-600 transition-all flex items-center gap-2 shadow-lg shadow-brand/20"
                          >
                            <Plus size={16} /> Add 
                          </button>
                        </div>
                      </div>

                      {/* Items List */}
                      <div className="space-y-2 mt-4 max-h-[240px] overflow-y-auto no-scrollbar lg:pr-1">
                        {orderForm.items.length === 0 && (
                          <div className="py-8 text-center bg-surface-hover/50 rounded-lg border border-dashed border-border">
                            <p className="text-[11px] text-muted font-bold uppercase tracking-widest">No items added yet</p>
                          </div>
                        )}
                        {orderForm.items.map((item, idx) => (
                          <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            key={idx}
                            className="flex items-center justify-between p-3 bg-surface border border-border rounded-lg group hover:shadow-premium transition-all"
                          >
                            <div className="flex flex-col flex-1 min-w-0 pr-4">
                              <span className="text-[13px] font-bold text-primary truncate">
                                {item.productName}
                              </span>
                              {item.variantId && (
                                <span className="text-[10px] text-muted font-medium">
                                  Variant: {item.variantId.split('-').pop()}
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-4">
                              <div className="flex items-center bg-surface-hover rounded-lg px-1.5 border border-border">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = [...orderForm.items];
                                    next[idx].quantity = Math.max(1, next[idx].quantity - 1);
                                    setOrderForm({ ...orderForm, items: next });
                                  }}
                                  className="p-1 text-muted hover:text-primary"
                                >
                                  <Minus size={12} />
                                </button>
                                <span className="w-8 text-center text-[12px] font-bold text-primary">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = [...orderForm.items];
                                    next[idx].quantity += 1;
                                    setOrderForm({ ...orderForm, items: next });
                                  }}
                                  className="p-1 text-muted hover:text-primary"
                                >
                                  <Plus size={12} />
                                </button>
                              </div>
                              
                              <div className="w-20 text-right">
                                <span className="text-[13px] font-bold text-primary">
                                  {currencySymbol}{(item.quantity * item.price).toLocaleString()}
                                </span>
                              </div>
                              
                              <button
                                type="button"
                                onClick={() => setOrderForm({ ...orderForm, items: orderForm.items.filter((_, i) => i !== idx) })}
                                className="p-1.5 text-muted hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Settings & Financial Summary */}
                  <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Operational Settings */}
                    <div className="bg-surface p-5 rounded-xl border border-border shadow-subtle space-y-4 h-fit">
                      <div className="flex items-center gap-2 pb-2 border-b border-border">
                        <Activity size={14} className="text-brand" />
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted">Logistics Settings</h4>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-semibold text-secondary ml-1">Warehouse</label>
                          <div className="relative">
                            <select
                               required
                               className="w-full px-4 py-2.5 bg-surface border border-border rounded-lg text-[13px] focus:border-brand outline-none appearance-none cursor-pointer"
                               value={orderForm.warehouseId}
                               onChange={(e) => setOrderForm({ ...orderForm, warehouseId: e.target.value })}
                             >
                               <option value="">Select Warehouse</option>
                               {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                             </select>
                             <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" size={14} />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-semibold text-secondary ml-1">Order Status</label>
                            <div className="relative">
                              <select
                                className="w-full px-4 py-2.5 bg-surface border border-border rounded-lg text-[13px] font-bold focus:border-brand outline-none appearance-none cursor-pointer"
                                value={orderForm.status}
                                onChange={(e) => setOrderForm({ ...orderForm, status: e.target.value as any })}
                              >
                                {statuses.map(s => <option key={s} value={s}>{s.replace(/_/g, " ").toUpperCase()}</option>)}
                              </select>
                              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" size={14} />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-semibold text-secondary ml-1">Source Channel</label>
                            <div className="relative">
                              <select
                                className="w-full px-4 py-2.5 bg-surface border border-border rounded-lg text-[13px] focus:border-brand outline-none appearance-none cursor-pointer"
                                value={orderForm.channel}
                                onChange={(e) => setOrderForm({ ...orderForm, channel: e.target.value })}
                              >
                                <option value="messenger">Messenger</option>
                                <option value="whatsapp">WhatsApp</option>
                                <option value="instagram">Instagram</option>
                                <option value="website">Website</option>
                                <option value="others">Others</option>
                              </select>
                              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" size={14} />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[11px] font-semibold text-secondary ml-1">Internal Notes</label>
                          <textarea
                            rows={1}
                            placeholder="Optional notes..."
                            className="w-full px-4 py-2.5 bg-surface border border-border rounded-lg text-[13px] focus:border-brand outline-none transition-all resize-none placeholder:text-muted"
                            value={orderForm.notes}
                            onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Financial Summary Dashboard */}
                    <div className="bg-[#0F172A] p-5 rounded-xl border border-gray-800 shadow-xl space-y-4 text-white">
                      <div className="flex items-center gap-2 pb-2 border-b border-gray-800">
                        <CreditCard size={14} className="text-blue-400" />
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-secondary">Financial Summary</h4>
                      </div>

                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-1.5">
                             <label className="text-[11px] font-medium text-muted">Delivery Tier</label>
                             <select
                               className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-[12px] font-bold text-white outline-none appearance-none cursor-pointer"
                               value={orderForm.customerZone}
                               onChange={(e) => handleZoneChange(e.target.value)}
                             >
                               <option value="Inside Dhaka">Inside Dhaka</option>
                               <option value="Sub Area">Sub Area</option>
                               <option value="Outside Dhaka">Outside Dhaka</option>
                             </select>
                           </div>
                           <div className="space-y-1.5">
                             <label className="text-[11px] font-medium text-muted">Payment Protocol</label>
                             <select
                               className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-[12px] font-bold text-white outline-none appearance-none cursor-pointer"
                               value={orderForm.paymentMethod}
                               onChange={(e) => setOrderForm({ ...orderForm, paymentMethod: e.target.value as any })}
                             >
                               <option value="COD">CASH ON DELIVERY</option>
                               <option value="bKash">BKASH</option>
                               <option value="Nagad">NAGAD</option>
                             </select>
                           </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2">
                           <div className="bg-gray-800/30 p-3 rounded-lg border border-gray-800">
                             <p className="text-[10px] text-muted font-bold uppercase mb-1">Subtotal</p>
                             <p className="text-sm font-bold text-white">{currencySymbol}{orderForm.totalAmount.toLocaleString()}</p>
                           </div>
                           <div className="bg-gray-800/30 p-3 rounded-lg border border-gray-800">
                             <p className="text-[10px] text-muted font-bold uppercase mb-1">Fee & Adj.</p>
                             <div className="flex items-center gap-2">
                               <p className="text-sm font-bold text-blue-400">+{orderForm.deliveryCharge}</p>
                               <p className="text-sm font-bold text-red-400">-{orderForm.discount}</p>
                             </div>
                           </div>
                        </div>

                        <div className="bg-blue-600/10 p-4 rounded-xl border border-brand/20 flex items-center justify-between">
                          <div>
                            <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest mb-0.5">Total Payable</p>
                            <h3 className="text-xl font-black text-white">
                              {currencySymbol}{(orderForm.totalAmount + (orderForm.deliveryCharge || 0) - (orderForm.discount || 0)).toLocaleString()}
                            </h3>
                          </div>
                          <div className="text-right">
                             <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest mb-1">Advance</p>
                             <input
                               type="number"
                               className="w-20 bg-emerald-500/20 border border-emerald-500/40 rounded-lg px-2 py-1 text-right text-[13px] font-black text-emerald-400 outline-none focus:bg-emerald-500/30 transition-all"
                               value={orderForm.paidAmount}
                               onChange={(e) => setOrderForm({ ...orderForm, paidAmount: parseFloat(e.target.value) || 0 })}
                             />
                          </div>
                        </div>

                        {courierHistory && (
                          <div className="bg-gray-800/40 p-3 rounded-lg border border-gray-700/50 space-y-2 mt-4">
                            <div className="flex justify-between items-center text-[11px]">
                              <span className="text-gray-300 font-semibold flex items-center gap-1.5">
                                <ShieldCheck size={14} className="text-brand" />
                                Courier Insights
                              </span>
                              <span className={`font-black ${courierHistory.success_rate_numeric >= 80 ? 'text-emerald-400' : 'text-orange-400'}`}>
                                {courierHistory.success_rate_numeric >= 80 ? "TRUSTED" : "RISKY"}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 ml-5">
                              <div className={`w-1.5 h-1.5 rounded-full ${courierHistory.success_rate_numeric >= 80 ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                              <span className="text-[10px] text-gray-400">Success Rate: <span className="font-bold text-gray-200">{courierHistory.success_rate}</span></span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-border flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-2.5 rounded-lg text-[13px] font-bold text-secondary hover:bg-surface-hover transition-all border border-transparent hover:border-border"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 max-w-[240px] px-8 py-2.5 bg-brand text-white rounded-lg text-[13px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all active:scale-98 shadow-xl shadow-brand/20 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                    {editingOrder ? "Update Order" : "Confirm Order"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
        {/* Courier Selection Modal */}
        {courierSelection.isOpen && (
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[70] flex items-center justify-center p-6 no-print">
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="bg-surface w-full max-w-sm rounded-xl shadow-2xl overflow-hidden border border-border"
            >
              <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface">
                <div className="flex flex-col">
                  <h3 className="text-base font-bold text-primary">
                    Select Courier
                  </h3>
                  <p className="text-[10px] text-muted font-bold uppercase tracking-wider">Logistic Dispatch</p>
                </div>
                <button
                  onClick={() =>
                    setCourierSelection((prev) => ({ ...prev, isOpen: false }))
                  }
                  className="p-1.5 hover:bg-surface-hover rounded-lg transition-colors text-muted hover:text-secondary border border-border"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-[12px] text-secondary font-medium leading-relaxed">
                  Multiple couriers are active for this region. Please select the preferred carrier.
                </p>
                <div className="space-y-2">
                  {courierSelection.activeCouriers.map(([name]) => (
                    <button
                      key={name}
                      onClick={() => {
                        handleSendToCourier(courierSelection.order, name);
                        setCourierSelection((prev) => ({
                          ...prev,
                          isOpen: false,
                        }));
                      }}
                      className="w-full flex items-center justify-between p-3.5 rounded-xl border border-border hover:border-brand hover:bg-brand/10/50 transition-all group shadow-subtle bg-surface"
                    >
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-lg bg-surface-hover flex items-center justify-center text-muted group-hover:text-brand group-hover:bg-brand/10">
                           <Truck size={16} />
                         </div>
                         <span className="font-bold text-[13px] text-secondary group-hover:text-brand">
                           {name.charAt(0).toUpperCase() + name.slice(1)}
                         </span>
                      </div>
                      <ChevronRight
                        size={14}
                        className="text-muted group-hover:text-brand"
                      />
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Print Modal */}
        {selectedOrderForPrint && (
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-6 no-print">
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="bg-surface w-full max-w-sm rounded-xl shadow-2xl overflow-hidden border border-border"
            >
              <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface">
                <div className="flex flex-col">
                  <h3 className="text-base font-bold text-primary">
                    Print Invoice
                  </h3>
                   <p className="text-[10px] text-muted font-bold uppercase tracking-wider">Document Generation</p>
                </div>
                <button
                  onClick={() => {
                    setSelectedOrderForPrint(null);
                    setPrintType(null);
                  }}
                  className="p-1.5 hover:bg-surface-hover rounded-lg transition-colors text-muted hover:text-secondary border border-border"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: "a5", name: "A5 Invoice", icon: FileText },
                    { id: "pos", name: "POS Receipt", icon: Printer },
                  ].map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setPrintType(type.id as any)}
                      className={`flex flex-col items-center gap-3 p-4 rounded-xl border transition-all ${
                        printType === type.id
                          ? "border-brand bg-brand/10/50 text-brand shadow-subtle"
                          : "border-border bg-surface-hover/50 hover:bg-surface-hover text-secondary"
                      }`}
                    >
                      <type.icon size={20} />
                      <span className="text-[11px] font-bold">{type.name}</span>
                    </button>
                  ))}
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => {
                      if (!printType) {
                        toast.error("Please select an invoice type first");
                        return;
                      }
                      handlePrint();
                    }}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-[13px] font-bold transition-all ${
                      !printType
                        ? "bg-surface-hover text-muted cursor-not-allowed"
                        : "bg-gray-900 text-white hover:bg-black dark:hover:bg-gray-200 shadow-lg shadow-gray-200 dark:shadow-none"
                    }`}
                  >
                    <Printer size={16} /> Standard Print
                  </button>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        if (!printType) {
                          toast.error("Please select an invoice type first");
                          return;
                        }
                        handleDownloadPDF();
                      }}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[13px] font-bold transition-all border ${
                        !printType
                          ? "bg-surface-hover text-muted border-border"
                          : "bg-surface text-brand border-brand hover:bg-brand/10"
                      }`}
                    >
                      <Download size={16} /> PDF
                    </button>
                    <button
                      onClick={() => {
                        if (!printType) {
                          toast.error("Please select an invoice type first");
                          return;
                        }
                        window.print();
                      }}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[13px] font-bold transition-all border ${
                        !printType
                          ? "bg-surface-hover text-muted border-border"
                          : "bg-surface text-secondary border-border hover:bg-surface-hover"
                      }`}
                    >
                      Manual
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        <ConfirmModal
          isOpen={confirmConfig.isOpen}
          title={confirmConfig.title}
          message={confirmConfig.message}
          variant={confirmConfig.variant}
          onConfirm={confirmConfig.onConfirm}
          onCancel={() =>
            setConfirmConfig((prev) => ({ ...prev, isOpen: false }))
          }
        />

        {viewingOrder && (
          <OrderDetailsModal
            order={viewingOrder}
            onClose={() => setViewingOrder(null)}
            products={products}
            variants={variants}
            currencySymbol={currencySymbol}
            onPrintInvoice={(order) => handleDirectPrint(order, "a5")}
            onSendToCourier={handleSendToCourier}
          />
        )}

        {/* Hidden Print Containers - Moved outside conditional blocks to ensure refs are always attached and accessible */}
        <div className="print-only">
          <div ref={printRef}>
            {selectedOrderForPrint && (
              <>
                {printType === "a5" && (
                  <A5Invoice
                    order={selectedOrderForPrint}
                    company={companySettings || {}}
                    currencySymbol={currencySymbol}
                  />
                )}
                {printType === "pos" && (
                  <POSInvoice
                    order={selectedOrderForPrint}
                    company={companySettings || {}}
                    currencySymbol={currencySymbol}
                  />
                )}
              </>
            )}
          </div>
        </div>

        {/* Hidden Bulk Print Content */}
        <div className="print-only">
          <div ref={bulkPrintRef}>
            {selectedOrders.length > 0 &&
              selectedOrders.map((id) => {
                const order = orders.find((o) => o.id === id);
                if (!order) return null;
                return (
                  <div key={id} className="page-break-after">
                    <A5Invoice
                      order={order}
                      company={companySettings || {}}
                      currencySymbol={currencySymbol}
                    />
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}
