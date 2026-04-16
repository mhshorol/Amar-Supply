import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { 
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
  Trash2,
  CheckCircle,
  LayoutGrid,
  List,
  ChevronRight,
  ChevronLeft,
  Copy,
  FileText,
  Send,
  UserCheck,
  AlertCircle,
  Edit,
  Printer,
  Eye,
  ChevronDown,
  ShieldCheck,
  Smartphone
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import type { DraggableProvided, DraggableStateSnapshot, DroppableProvided } from '@hello-pangea/dnd';
import { db, auth, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, Timestamp, doc, updateDoc, deleteDoc, writeBatch, getDocs, getDoc, where, arrayUnion, runTransaction, limit } from '../firebase';
import { useReactToPrint } from 'react-to-print';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { A5Invoice, POSInvoice } from './InvoiceTemplates';
import { toast } from 'sonner';
import { SteadfastService } from '../services/steadfastService';
import { logActivity } from '../services/activityService';
import { checkDuplicateOrder } from '../services/orderService';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { locationService } from '../services/locationService';
import { LocationNode, districts, upazilas } from '../data/bangladesh-locations';
import { CourierFactory } from '../lib/courierAdapters';

import { useSettings } from '../contexts/SettingsContext';
import ConfirmModal from './ConfirmModal';
import OrderDetailsModal from './OrderDetailsModal';

const ChannelIcon = ({ channel }: { channel: string }) => {
  switch (channel) {
    case 'Facebook': return <Facebook size={14} className="text-[#2563eb]" />;
    case 'Website': return <Globe size={14} className="text-[#4b5563]" />;
    case 'Instagram': return <Instagram size={14} className="text-[#db2777]" />;
    case 'Messenger': return <MessageCircle size={14} className="text-[#60a5fa]" />;
    default: return <Globe size={14} />;
  }
};

const StatusBadge = ({ status, onClick, isOpen }: { status: string; onClick?: (e?: React.MouseEvent) => void; isOpen?: boolean }) => {
  const colors: Record<string, string> = {
    'pending': 'bg-[#fff7ed] text-[#ea580c] border-[#ffedd5]',
    'confirmed': 'bg-[#eff6ff] text-[#2563eb] border-[#dbeafe]',
    'processing': 'bg-[#eef2ff] text-[#4f46e5] border-[#e0e7ff]',
    'packed': 'bg-[#fefce8] text-[#ca8a04] border-[#fef9c3]',
    'shipped': 'bg-[#faf5ff] text-[#9333ea] border-[#f3e8ff]',
    'out_for_delivery': 'bg-[#ecfeff] text-[#0891b2] border-[#cffafe]',
    'delivered': 'bg-[#f0fdf4] text-[#16a34a] border-[#dcfce7]',
    'partial_delivered': 'bg-[#f0fdfa] text-[#0d9488] border-[#ccfbf1]',
    'cancelled': 'bg-[#fef2f2] text-[#dc2626] border-[#fee2e2]',
    'returned': 'bg-[#f9fafb] text-[#4b5563] border-[#f3f4f6]',
  };
  return (
    <button 
      onClick={onClick}
      className={`text-[10px] font-bold px-2 py-1 rounded-md border cursor-pointer hover:opacity-80 transition-all flex items-center gap-1.5 ${colors[status] || colors['pending']}`}
    >
      {status.replace(/_/g, ' ').charAt(0).toUpperCase() + status.replace(/_/g, ' ').slice(1)}
      <ChevronDown size={10} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
    </button>
  );
};

export default function Orders() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { settings, currencySymbol } = useSettings();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [wooOrders, setWooOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isWooLoading, setIsWooLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState<string | null>(null);
  const [editingOrder, setEditingOrder] = useState<any | null>(null);
  const [viewingOrder, setViewingOrder] = useState<any | null>(null);
  const [locationSuggestions, setLocationSuggestions] = useState<LocationNode[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
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
  const [products, setProducts] = useState<any[]>([]);
  const [variants, setVariants] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [companySettings, setCompanySettings] = useState<any>(null);
  const [selectedOrderForPrint, setSelectedOrderForPrint] = useState<any>(null);
  const [printType, setPrintType] = useState<'a5' | 'pos' | null>(null);
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

  useEffect(() => {
    // Removed auto-open modal logic for new orders as it is now a separate page
  }, [searchParams, setSearchParams]);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    suppressErrors: true,
    onBeforePrint: () => {
      if (!printType) {
        return Promise.reject("No print type selected");
      }
      return new Promise((resolve) => {
        setTimeout(resolve, 500);
      });
    },
    onAfterPrint: () => {
      setSelectedOrderForPrint(null);
      setPrintType(null);
    },
    onPrintError: (errorLocation, error) => {
      console.error("Print error:", errorLocation, error);
      // Fallback to manual window.print if react-to-print fails
      if (printType) {
        toast.error("Standard print failed. Attempting manual print...");
        setTimeout(() => {
          window.print();
        }, 500);
      }
    }
  });

  const handleBulkPrint = useReactToPrint({
    contentRef: bulkPrintRef,
    suppressErrors: true,
    onBeforePrint: () => {
      return new Promise((resolve) => {
        setTimeout(resolve, 500);
      });
    },
    onAfterPrint: () => {
      setSelectedOrders([]);
    },
    onPrintError: (errorLocation, error) => {
      console.error("Bulk Print error:", errorLocation, error);
      toast.error("Bulk print failed. Attempting manual print...");
      setTimeout(() => {
        window.print();
      }, 500);
    }
  });

  const handleDownloadPDF = async () => {
    if (!printRef.current || !selectedOrderForPrint) return;
    try {
      const canvas = await html2canvas(printRef.current, { 
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: printType === 'a5' ? 'a5' : [80, 200]
      });
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Invoice-${selectedOrderForPrint.orderNumber || selectedOrderForPrint.id.slice(0, 8)}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
    }
  };

  const handleBulkDownloadPDF = async () => {
    if (!bulkPrintRef.current || selectedOrders.length === 0) return;
    setLoading(true);
    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a5'
      });

      const orderElements = bulkPrintRef.current.children;
      for (let i = 0; i < orderElements.length; i++) {
        const element = orderElements[i] as HTMLElement;
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        });
        const imgData = canvas.toDataURL('image/png');
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
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
        const response = await fetch('/api/couriers/configs');
        if (response.ok) {
          const data = await response.json();
          setCourierConfigs(data);
        }
      } catch (error) {
        console.error("Error fetching courier configs:", error);
      }
    };
    fetchCourierConfigs();
  }, []);

  const [orderForm, setOrderForm] = useState({
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    customerCity: 'Dhaka',
    customerZone: 'Inside Dhaka',
    district: '',
    division: '',
    area: '',
    landmark: '',
    subtotal: 0,
    deliveryCharge: 80,
    discount: 0,
    totalAmount: 0,
    paidAmount: 0,
    dueAmount: 0,
    advanceAmount: 0,
    channel: 'Facebook',
    paymentMethod: 'COD',
    status: 'pending',
    items: [] as any[],
    warehouseId: '',
    notes: '',
    tags: '',
    courierId: '',
    courierName: '',
    trackingNumber: '',
    pathao_city_id: '',
    pathao_zone_id: '',
    pathao_area_id: '',
    carrybee_city_id: '',
    carrybee_zone_id: '',
    carrybee_area_id: '',
  });

  const [cities, setCities] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);

  const fetchCities = async () => {
    setLoadingLocations(true);
    try {
      const response = await fetch('/api/couriers/cities/pathao');
      if (response.ok) {
        const data = await response.json();
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
        const data = await response.json();
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
        const data = await response.json();
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
  const [newItem, setNewItem] = useState({ productId: '', variantId: '', quantity: 1, price: 0 });

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId;
    await handleUpdateStatus(draggableId, newStatus);
  };

  const tabs = ['All', 'pending', 'confirmed', 'processing', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'returned'];
  const statuses = ['pending', 'confirmed', 'processing', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'partial_delivered', 'cancelled', 'returned'];

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), source: 'local' })));
      setLoading(false);
    }, (error) => {
      if (error.code !== 'permission-denied') {
        handleFirestoreError(error, OperationType.LIST, 'orders');
      }
    });

    const unsubSettings = onSnapshot(doc(db, 'settings', 'company'), (s) => setCompanySettings(s.data()), (e) => {
      if (e.code !== 'permission-denied') {
        handleFirestoreError(e, OperationType.GET, 'settings/company');
      }
    });

    const unsubProducts = onSnapshot(collection(db, 'products'), (s) => setProducts(s.docs.map(d => ({ id: d.id, ...d.data() }))), (e) => {
      if (e.code !== 'permission-denied') {
        handleFirestoreError(e, OperationType.LIST, 'products');
      }
    });
    const unsubVariants = onSnapshot(collection(db, 'variants'), (s) => setVariants(s.docs.map(d => ({ id: d.id, ...d.data() }))), (e) => {
      if (e.code !== 'permission-denied') {
        handleFirestoreError(e, OperationType.LIST, 'variants');
      }
    });
    const unsubWarehouses = onSnapshot(collection(db, 'warehouses'), (s) => setWarehouses(s.docs.map(d => ({ id: d.id, ...d.data() }))), (e) => {
      if (e.code !== 'permission-denied') {
        handleFirestoreError(e, OperationType.LIST, 'warehouses');
      }
    });
    const unsubInventory = onSnapshot(collection(db, 'inventory'), (s) => setInventory(s.docs.map(d => ({ id: d.id, ...d.data() }))), (e) => {
      if (e.code !== 'permission-denied') {
        handleFirestoreError(e, OperationType.LIST, 'inventory');
      }
    });

    return () => {
      unsubscribe();
      unsubProducts();
      unsubVariants();
      unsubWarehouses();
      unsubInventory();
      unsubSettings();
    };
  }, []);

  useEffect(() => {
    const fetchWooOrders = async () => {
      if (!companySettings?.wooUrl || !companySettings?.wooConsumerKey || !companySettings?.wooConsumerSecret) return;
      
      setIsWooLoading(true);
      try {
        const response = await fetch('/api/woocommerce/orders?per_page=50');
        const data = await response.json();
        
        if (response.ok) {
          const mappedWooOrders = (data.orders || []).map((order: any) => ({
            id: `woo_${order.id}`,
            wooId: order.id,
            source: 'woocommerce',
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
              price: parseFloat(item.price)
            })),
            notes: order.customer_note,
            paymentMethod: order.payment_method_title
          }));
          setWooOrders(mappedWooOrders);

          // Sync customers to CRM
          try {
            const customersSnap = await getDocs(collection(db, 'customers'));
            const existingCustomers = new Map();
            customersSnap.forEach(doc => {
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
                const newCustomerRef = doc(collection(db, 'customers'));
                const newCustomer = {
                  name: order.customerName || 'Unknown',
                  phone: order.customerPhone,
                  email: order.customerEmail || '',
                  address: order.customerAddress || '',
                  orderCount: 1,
                  totalSpent: order.totalAmount || 0,
                  lastOrderDate: order.createdAt?.toDate ? order.createdAt.toDate() : new Date(),
                  wooOrderIds: [wooOrderId],
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp()
                };
                batch.set(newCustomerRef, newCustomer);
                existingCustomers.set(order.customerPhone, { id: newCustomerRef.id, ...newCustomer });
                batchCount++;
              } else {
                // Update existing customer if this order hasn't been counted
                const wooOrderIds = existing.wooOrderIds || [];
                if (!wooOrderIds.includes(wooOrderId)) {
                  const customerRef = doc(db, 'customers', existing.id);
                  batch.update(customerRef, {
                    orderCount: (existing.orderCount || 0) + 1,
                    totalSpent: (existing.totalSpent || 0) + (order.totalAmount || 0),
                    lastOrderDate: order.createdAt?.toDate ? order.createdAt.toDate() : new Date(),
                    wooOrderIds: arrayUnion(wooOrderId),
                    updatedAt: serverTimestamp()
                  });
                  existing.wooOrderIds = [...wooOrderIds, wooOrderId];
                  existing.orderCount = (existing.orderCount || 0) + 1;
                  existing.totalSpent = (existing.totalSpent || 0) + (order.totalAmount || 0);
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
  }, [companySettings?.wooUrl, companySettings?.wooConsumerKey, companySettings?.wooConsumerSecret]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTab]);

  const handleZoneChange = (zone: string) => {
    let charge = 80;
    if (zone === 'Outside Dhaka') charge = 150;
    if (zone === 'Sub Area') charge = 130;
    setOrderForm({ ...orderForm, customerZone: zone, deliveryCharge: charge });
  };
  const handlePhoneChange = async (phone: string) => {
    setOrderForm(prev => ({ ...prev, customerPhone: phone }));
    
    // Only search if phone number is at least 11 digits (standard for BD)
    if (phone.length >= 11) {
      try {
        const q = query(collection(db, 'customers'), where('phone', '==', phone));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const customerData = querySnapshot.docs[0].data();
          setOrderForm(prev => ({
            ...prev,
            customerName: customerData.name || prev.customerName,
            customerAddress: customerData.address || prev.customerAddress,
            district: customerData.district || prev.district,
            area: customerData.area || prev.area,
            landmark: customerData.landmark || prev.landmark,
            customerCity: customerData.city || prev.customerCity,
            customerZone: customerData.zone || prev.customerZone
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
      if (response.ok) {
        const result = await response.json();
        if (result.data) {
          setCourierHistory({
            courier: result.courier,
            ...result.data
          });
        }
      }
    } catch (error) {
      console.error("Error fetching courier history:", error);
    } finally {
      setIsFetchingHistory(false);
    }
  };

  const handleAddressChange = (address: string) => {
    setOrderForm(prev => ({ ...prev, customerAddress: address }));
    
    // Smart Parsing
    const parsed = locationService.parseAddress(address);
    if (parsed.district || parsed.upazila) {
      const district = parsed.district?.nameEn || orderForm.district;
      const division = parsed.division?.nameEn || orderForm.division;
      const charge = locationService.getDeliveryCharge(district, division);
      
      setOrderForm(prev => ({
        ...prev,
        district,
        area: parsed.upazila?.nameEn || prev.area,
        division,
        deliveryCharge: charge
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

    // Suggestions based on the last part of the address
    const parts = address.split(/[,।\s]+/);
    const lastPart = parts[parts.length - 1];
    if (lastPart.length > 1) {
      const suggestions = locationService.searchLocations(lastPart);
      setLocationSuggestions(suggestions);
      setShowSuggestions(suggestions.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSelectLocation = (loc: LocationNode) => {
    const hierarchy = locationService.getLocationHierarchy(loc.id);
    if (hierarchy) {
      const district = hierarchy.district?.nameEn || orderForm.district;
      const division = hierarchy.division?.nameEn || orderForm.division;
      const charge = locationService.getDeliveryCharge(district, division);

      setOrderForm(prev => ({
        ...prev,
        district,
        area: hierarchy.upazila?.nameEn || prev.area,
        division,
        deliveryCharge: charge
      }));

      if (courierConfigs.pathao?.isActive) {
        autoMatchPathao(district, hierarchy.upazila?.nameEn || orderForm.area);
      }
      if (courierConfigs.carrybee?.isActive) {
        autoMatchCarrybee(district, hierarchy.upazila?.nameEn || orderForm.area);
      }
    }
    setShowSuggestions(false);
  };

  const autoMatchPathao = async (districtName: string, areaName: string) => {
    if (!courierConfigs.pathao || !districtName) return;
    try {
      const citiesRes = await fetch('/api/couriers/cities/pathao');
      if (!citiesRes.ok) {
        const errData = await citiesRes.json();
        throw new Error(errData.error || 'Failed to fetch Pathao cities');
      }
      const pathaoCities = await citiesRes.json();
      
      // Find matching city
      const city = pathaoCities.data.find((c: any) => 
        c.city_name.toLowerCase().includes(districtName.toLowerCase()) || 
        districtName.toLowerCase().includes(c.city_name.toLowerCase())
      );

      if (city) {
        setOrderForm(prev => ({ ...prev, pathao_city_id: city.city_id.toString() }));
        
        const zonesRes = await fetch(`/api/couriers/zones/pathao/${city.city_id}`);
        if (!zonesRes.ok) {
          const errData = await zonesRes.json();
          throw new Error(errData.error || 'Failed to fetch Pathao zones');
        }
        const pathaoZones = await zonesRes.json();
        
        // Find matching zone
        const zone = pathaoZones.data.find((z: any) => 
          z.zone_name.toLowerCase().includes(areaName.toLowerCase()) || 
          areaName.toLowerCase().includes(z.zone_name.toLowerCase())
        );

        if (zone) {
          setOrderForm(prev => ({ ...prev, pathao_zone_id: zone.zone_id.toString() }));
          
          const areasRes = await fetch(`/api/couriers/areas/pathao/${zone.zone_id}`);
          if (!areasRes.ok) {
            const errData = await areasRes.json();
            throw new Error(errData.error || 'Failed to fetch Pathao areas');
          }
          const pathaoAreas = await areasRes.json();
          
          const area = pathaoAreas.data.find((a: any) => 
            a.area_name.toLowerCase().includes(areaName.toLowerCase()) || 
            areaName.toLowerCase().includes(a.area_name.toLowerCase())
          ) || pathaoAreas.data[0];

          if (area) {
            setOrderForm(prev => ({ ...prev, pathao_area_id: area.area_id.toString() }));
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
      const citiesRes = await fetch('/api/couriers/cities/carrybee');
      if (!citiesRes.ok) return;
      const carrybeeCities = await citiesRes.json();
      
      const city = carrybeeCities.data?.cities?.find((c: any) => 
        c.name.toLowerCase().includes(districtName.toLowerCase()) || 
        districtName.toLowerCase().includes(c.name.toLowerCase())
      );

      if (city) {
        setOrderForm(prev => ({ ...prev, carrybee_city_id: city.id.toString() }));
        
        const zonesRes = await fetch(`/api/couriers/zones/carrybee/${city.id}`);
        if (!zonesRes.ok) return;
        const carrybeeZones = await zonesRes.json();
        
        const zone = carrybeeZones.data?.zones?.find((z: any) => 
          z.name.toLowerCase().includes(areaName.toLowerCase()) || 
          areaName.toLowerCase().includes(z.name.toLowerCase())
        );

        if (zone) {
          setOrderForm(prev => ({ ...prev, carrybee_zone_id: zone.id.toString() }));
          
          const areasRes = await fetch(`/api/couriers/areas/carrybee/${zone.id}?cityId=${city.id}`);
          if (!areasRes.ok) return;
          const carrybeeAreas = await areasRes.json();
          
          const area = carrybeeAreas.data?.areas?.find((a: any) => 
            a.name.toLowerCase().includes(areaName.toLowerCase()) || 
            areaName.toLowerCase().includes(a.name.toLowerCase())
          ) || carrybeeAreas.data?.areas?.[0];

          if (area) {
            setOrderForm(prev => ({ ...prev, carrybee_area_id: area.id.toString() }));
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
      customerName: '',
      customerPhone: '',
      customerAddress: '',
      customerCity: 'Dhaka',
      customerZone: 'Inside Dhaka',
      district: '',
      division: '',
      area: '',
      landmark: '',
      subtotal: 0,
      deliveryCharge: 80,
      discount: 0,
      totalAmount: 0,
      paidAmount: 0,
      dueAmount: 0,
      advanceAmount: 0,
      channel: 'Facebook',
      paymentMethod: 'COD',
      status: 'pending',
      items: [],
      warehouseId: '',
      notes: '',
      tags: '',
      courierId: '',
      courierName: '',
      trackingNumber: '',
      pathao_city_id: '',
      pathao_zone_id: '',
      pathao_area_id: '',
    });
    setZones([]);
    setAreas([]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (order: any) => {
    setEditingOrder(order);
    setOrderForm({
      customerName: order.customerName || '',
      customerPhone: order.customerPhone || '',
      customerAddress: order.customerAddress || '',
      district: order.district || '',
      division: order.division || '',
      area: order.area || '',
      landmark: order.landmark || '',
      subtotal: order.subtotal || 0,
      deliveryCharge: order.deliveryCharge || 0,
      discount: order.discount || 0,
      totalAmount: order.totalAmount || 0,
      paidAmount: order.paidAmount || 0,
      dueAmount: order.dueAmount || 0,
      advanceAmount: order.advanceAmount || 0,
      channel: order.channel || 'Facebook',
      paymentMethod: order.paymentMethod || 'COD',
      status: order.status || 'pending',
      items: order.items || [],
      warehouseId: order.warehouseId || '',
      notes: order.notes || '',
      courierId: order.courierId || '',
      courierName: order.courierName || '',
      trackingNumber: order.trackingNumber || '',
      pathao_city_id: order.pathao_city_id || '',
      pathao_zone_id: order.pathao_zone_id || '',
      pathao_area_id: order.pathao_area_id || '',
    });
    if (order.pathao_city_id) fetchZones(order.pathao_city_id);
    if (order.pathao_zone_id) fetchAreas(order.pathao_zone_id);
    setIsModalOpen(true);
  };

  const calculateTotals = (items: any[], deliveryCharge: number, discount: number, paidAmount: number) => {
    const subtotal = items.reduce((acc, item) => acc + (item.quantity * item.price), 0);
    const totalAmount = subtotal + deliveryCharge - discount;
    const dueAmount = totalAmount - paidAmount;
    return { subtotal, totalAmount, dueAmount };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    try {
      const { subtotal, totalAmount, dueAmount } = calculateTotals(orderForm.items, orderForm.deliveryCharge, orderForm.discount, orderForm.paidAmount);
      
      // Duplicate Detection Check (Only for new orders)
      if (!editingOrder) {
        const duplicate = await checkDuplicateOrder({
          customerPhone: orderForm.customerPhone,
          customerName: orderForm.customerName,
          items: orderForm.items,
          totalAmount: totalAmount
        });

        if (duplicate) {
          setConfirmConfig({
            isOpen: true,
            title: 'Duplicate Order Detected',
            message: `An order (#${duplicate.orderNumber || duplicate.id.slice(0, 8)}) with the same phone number, products, and total value was found within the last 24 hours. Are you sure you want to create this duplicate order?`,
            variant: 'warning',
            onConfirm: () => proceedWithSubmit(totalAmount)
          });
          return;
        }
      }

      await proceedWithSubmit(totalAmount);
    } catch (error) {
      handleFirestoreError(error, editingOrder ? OperationType.UPDATE : OperationType.CREATE, 'orders');
    }
  };

  const proceedWithSubmit = async (totalAmount: number) => {
    if (!auth.currentUser) return;
    try {
      const { subtotal, dueAmount } = calculateTotals(orderForm.items, orderForm.deliveryCharge, orderForm.discount, orderForm.paidAmount);
      
      const logEntry = {
        user: auth.currentUser.email,
        action: editingOrder ? 'Updated Order' : 'Created Order',
        timestamp: Timestamp.now(),
        details: editingOrder ? `Status: ${orderForm.status}` : 'Initial creation'
      };

      const data = {
        ...orderForm,
        subtotal,
        totalAmount,
        dueAmount,
        logs: editingOrder ? [...(editingOrder.logs || []), logEntry] : [logEntry],
        updatedAt: serverTimestamp()
      };

      // 1. PRE-TRANSACTION READS
      const customerQuery = query(collection(db, 'customers'), where('phone', '==', orderForm.customerPhone));
      const customerSnap = await getDocs(customerQuery);

      const inventorySnaps: { item: any; snap: any }[] = [];
      if (!editingOrder && orderForm.status !== 'cancelled' && orderForm.status !== 'returned') {
        for (const item of orderForm.items) {
          const invQuery = query(
            collection(db, 'inventory'),
            where('productId', '==', item.productId),
            where('variantId', '==', item.variantId || ''),
            where('warehouseId', '==', orderForm.warehouseId)
          );
          const invSnap = await getDocs(invQuery);
          inventorySnaps.push({ item, snap: invSnap });
        }
      }

      await runTransaction(db, async (transaction) => {
        // 2. TRANSACTION READS
        const settingsRef = doc(db, 'settings', 'company');
        const settingsSnap = await transaction.get(settingsRef);

        // 3. ALL WRITES SECOND
        let customerId = '';
        if (customerSnap.empty) {
          const customerRef = doc(collection(db, 'customers'));
          transaction.set(customerRef, {
            name: orderForm.customerName,
            phone: orderForm.customerPhone,
            address: orderForm.customerAddress,
            orderCount: 1,
            totalSpent: totalAmount,
            lastOrderDate: serverTimestamp(),
            uid: auth.currentUser!.uid,
            createdAt: serverTimestamp()
          });
          customerId = customerRef.id;
        } else {
          const customerDoc = customerSnap.docs[0];
          customerId = customerDoc.id;
          transaction.update(customerDoc.ref, {
            orderCount: (customerDoc.data().orderCount || 0) + (editingOrder ? 0 : 1),
            totalSpent: (customerDoc.data().totalSpent || 0) + (editingOrder ? 0 : totalAmount),
            lastOrderDate: serverTimestamp()
          });
        }

        const finalData = { ...data, customerId };

        if (editingOrder) {
          transaction.update(doc(db, 'orders', editingOrder.id), finalData);
        } else {
          let nextOrderNumber = 1001;
          if (settingsSnap.exists() && settingsSnap.data().orderCounter) {
            nextOrderNumber = settingsSnap.data().orderCounter + 1;
          }
          transaction.set(settingsRef, { orderCounter: nextOrderNumber }, { merge: true });

          const orderRef = doc(collection(db, 'orders'));
          transaction.set(orderRef, {
            ...finalData,
            orderNumber: nextOrderNumber,
            uid: auth.currentUser!.uid,
            createdAt: serverTimestamp()
          });

          // Add to Finance if paidAmount > 0
          if (finalData.paidAmount > 0) {
            let accountId = '';
            
            // To find account safely, just do getDocs directly
            const accountsQuery = query(collection(db, 'accounts'), where('name', '==', finalData.paymentMethod));
            const accountsSnap = await getDocs(accountsQuery);
            if (!accountsSnap.empty) {
              accountId = accountsSnap.docs[0].id;
            } else {
              const allAccountsSnap = await getDocs(query(collection(db, 'accounts'), limit(1)));
              if (!allAccountsSnap.empty) {
                accountId = allAccountsSnap.docs[0].id;
              }
            }

            const transactionRef = doc(collection(db, 'transactions'));
            transaction.set(transactionRef, {
              type: 'income',
              category: 'Sales',
              amount: finalData.paidAmount,
              description: `Order #${nextOrderNumber} Payment`,
              date: serverTimestamp(),
              method: finalData.paymentMethod,
              accountId: accountId,
              orderId: orderRef.id,
              orderNumber: nextOrderNumber,
              uid: auth.currentUser?.uid,
              createdAt: serverTimestamp()
            });

            if (accountId) {
              const accountRef = doc(db, 'accounts', accountId);
              const accountSnap = await transaction.get(accountRef);
              if (accountSnap.exists()) {
                const currentBalance = accountSnap.data().balance || 0;
                transaction.update(accountRef, {
                  balance: currentBalance + finalData.paidAmount,
                  updatedAt: serverTimestamp()
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
              transaction.update(invDoc.ref, { quantity: newQty, updatedAt: serverTimestamp() });

              // Log
              const logRef = doc(collection(db, 'inventoryLogs'));
              transaction.set(logRef, {
                productId: item.productId,
                variantId: item.variantId || '',
                warehouseId: orderForm.warehouseId,
                type: 'out',
                quantityChange: -item.quantity,
                newQuantity: newQty,
                reason: `Order #${nextOrderNumber}`,
                uid: auth.currentUser!.uid,
                createdAt: serverTimestamp()
              });
            }
          }
        }
      });

      await logActivity(
        editingOrder ? 'Updated Order' : 'Created Order',
        'Orders',
        `Order #${editingOrder ? (editingOrder.orderNumber || editingOrder.id.slice(0, 8)) : 'New'} for ${orderForm.customerName}`
      );

      setIsModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, editingOrder ? OperationType.UPDATE : OperationType.CREATE, 'orders');
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    if (!auth.currentUser) return;

    // Handle WooCommerce orders
    if (orderId.startsWith('woo_')) {
      const wooId = orderId.replace('woo_', '');
      setLoading(true);
      try {
        const response = await fetch(`/api/woocommerce/orders/${wooId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus })
        });
        if (response.ok) {
          toast.success(`WooCommerce order status updated to ${newStatus}`);
          // Refresh WooCommerce orders
          const wooResponse = await fetch('/api/woocommerce/orders?per_page=50');
          if (wooResponse.ok) {
            const data = await wooResponse.json();
            const mappedWooOrders = (data.orders || []).map((order: any) => ({
              id: `woo_${order.id}`,
              wooId: order.id,
              source: 'woocommerce',
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
                price: parseFloat(item.price)
              })),
              notes: order.customer_note,
              paymentMethod: order.payment_method_title
            }));
            setWooOrders(mappedWooOrders);
          }
        } else {
          const err = await response.json();
          throw new Error(err.error || 'Failed to update WooCommerce order');
        }
      } catch (error: any) {
        toast.error(error.message);
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      const orderRef = doc(db, 'orders', orderId);
      
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
          updatedAt: serverTimestamp()
        });

        // 2. Stock Management Logic
        const isActiveStatus = (status: string) => status !== 'cancelled' && status !== 'returned';
        
        // If moving FROM active TO inactive -> Restore Stock
        if (isActiveStatus(normalizedOldStatus) && !isActiveStatus(normalizedNewStatus)) {
          for (const item of orderData.items) {
            const invQuery = query(
              collection(db, 'inventory'),
              where('productId', '==', item.productId),
              where('variantId', '==', item.variantId || ''),
              where('warehouseId', '==', orderData.warehouseId)
            );
            const invSnap = await getDocs(invQuery);
            if (!invSnap.empty) {
              const invDoc = invSnap.docs[0];
              const currentQty = invDoc.data().quantity || 0;
              const newQty = currentQty + item.quantity;
              transaction.update(invDoc.ref, { quantity: newQty, updatedAt: serverTimestamp() });
              
              const logRef = doc(collection(db, 'inventoryLogs'));
              transaction.set(logRef, {
                productId: item.productId,
                variantId: item.variantId || '',
                warehouseId: orderData.warehouseId,
                type: 'in',
                quantityChange: item.quantity,
                newQuantity: newQty,
                reason: `Order #${orderId.slice(0, 8)} ${newStatus} (Stock Restored)`,
                uid: auth.currentUser?.uid,
                createdAt: serverTimestamp()
              });
            }
          }
        }
        // If moving FROM inactive TO active -> Deduct Stock
        else if (!isActiveStatus(normalizedOldStatus) && isActiveStatus(normalizedNewStatus)) {
          for (const item of orderData.items) {
            const invQuery = query(
              collection(db, 'inventory'),
              where('productId', '==', item.productId),
              where('variantId', '==', item.variantId || ''),
              where('warehouseId', '==', orderData.warehouseId)
            );
            const invSnap = await getDocs(invQuery);
            if (!invSnap.empty) {
              const invDoc = invSnap.docs[0];
              const currentQty = invDoc.data().quantity || 0;
              const newQty = currentQty - item.quantity;
              transaction.update(invDoc.ref, { quantity: newQty, updatedAt: serverTimestamp() });
              
              const logRef = doc(collection(db, 'inventoryLogs'));
              transaction.set(logRef, {
                productId: item.productId,
                variantId: item.variantId || '',
                warehouseId: orderData.warehouseId,
                type: 'out',
                quantityChange: -item.quantity,
                newQuantity: newQty,
                reason: `Order #${orderId.slice(0, 8)} ${newStatus} (Stock Re-deducted)`,
                uid: auth.currentUser?.uid,
                createdAt: serverTimestamp()
              });
            }
          }
        }
      });

      toast.success(`Order status updated to ${newStatus.replace(/_/g, ' ').charAt(0).toUpperCase() + newStatus.replace(/_/g, ' ').slice(1)}`);
      await logActivity('Updated Order Status', 'Orders', `Order #${orderId.slice(0, 8)} status changed to ${newStatus}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Delete Order',
      message: 'Are you sure you want to delete this order?',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'orders', orderId));
          await logActivity('Deleted Order', 'Orders', `Order #${orderId.slice(0, 8)} removed`);
          toast.success('Order deleted successfully');
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `orders/${orderId}`);
        }
      }
    });
  };

  const handleBulkStatusUpdate = async (newStatus: string) => {
    if (!auth.currentUser || selectedOrders.length === 0) return;
    try {
      const batch = writeBatch(db);
      const wooOrdersToUpdate: string[] = [];
      
      selectedOrders.forEach(id => {
        if (id.startsWith('woo_')) {
          wooOrdersToUpdate.push(id);
        } else {
          batch.update(doc(db, 'orders', id), { 
            status: newStatus, 
            updatedAt: serverTimestamp(),
            logs: arrayUnion({
              user: auth.currentUser?.email,
              action: 'Bulk Status Update',
              timestamp: Timestamp.now(),
              details: `New Status: ${newStatus}`
            })
          });
        }
      });
      
      await batch.commit();
      
      // Handle WooCommerce orders sequentially
      if (wooOrdersToUpdate.length > 0) {
        setLoading(true);
        for (const id of wooOrdersToUpdate) {
          const wooId = id.replace('woo_', '');
          try {
            await fetch(`/api/woocommerce/orders/${wooId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: newStatus })
            });
            setWooOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o));
          } catch (error) {
            console.error(`Failed to update WooCommerce order ${wooId}:`, error);
          }
        }
        setLoading(false);
      }
      
      setSelectedOrders([]);
      toast.success(`Status updated to ${newStatus}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'orders');
    }
  };

  const handleSendToCourier = async (order: any, courierName?: string) => {
    // Determine which courier to use
    const activeCouriers = Object.entries(courierConfigs).filter(([_, config]: [string, any]) => config.isActive);
    
    if (activeCouriers.length === 0) {
      toast.error('No courier is active. Please go to Settings > Logistics to activate one.');
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

    if (['shipped', 'delivered', 'cancelled', 'returned'].includes(order.status)) {
      toast.error(`Cannot send order with status: ${order.status.replace(/_/g, ' ')}`);
      return;
    }

    setLoading(true);
    try {
      const sanitizePhone = (phone: string) => {
        const cleaned = phone.replace(/\D/g, '');
        return cleaned.length > 11 ? cleaned.slice(-11) : cleaned;
      };

      const phone = sanitizePhone(order.customerPhone);
      
      if (targetCourier === 'pathao') {
        if (!order.pathao_city_id || !order.pathao_zone_id || !order.pathao_area_id) {
          toast.error('Please select Pathao City, Zone, and Area first by editing the order.');
          setLoading(false);
          return;
        }
      }

      if (targetCourier === 'carrybee') {
        if (!order.carrybee_city_id || !order.carrybee_zone_id || !order.carrybee_area_id) {
          toast.error('Please select Carrybee City, Zone, and Area first by editing the order.');
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
        note: order.notes || '',
        weight: 0.5,
        recipient_city: targetCourier === 'carrybee' ? order.carrybee_city_id : order.pathao_city_id,
        recipient_zone: targetCourier === 'carrybee' ? order.carrybee_zone_id : order.pathao_zone_id,
        recipient_area: targetCourier === 'carrybee' ? order.carrybee_area_id : order.pathao_area_id,
      };

      const response = await fetch('/api/couriers/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courier: targetCourier, orderData })
      });

      const result = await response.json();

      if (response.ok) {
        const trackingCode = result.consignment?.tracking_code || result.tracking_id || result.tracking_code;
        
        if (order.source === 'woocommerce') {
          // Update WooCommerce order status to processing or shipped
          await fetch(`/api/woocommerce/orders/${order.wooId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'processing' })
          });
          
          // Update local state so UI reflects the change immediately
          setWooOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'processing' } : o));
          
          // Also save to local deliveries for tracking
          await addDoc(collection(db, 'deliveries'), {
            id: trackingCode,
            orderId: order.id,
            wooId: order.wooId,
            courier: targetCourier.charAt(0).toUpperCase() + targetCourier.slice(1),
            status: 'Pending Pickup',
            location: order.customerZone || 'Processing',
            eta: '2-3 Days',
            createdAt: serverTimestamp(),
            uid: auth.currentUser?.uid
          });
        } else {
          await updateDoc(doc(db, 'orders', order.id), {
            courierName: targetCourier.charAt(0).toUpperCase() + targetCourier.slice(1),
            trackingNumber: trackingCode,
            status: 'shipped',
            updatedAt: serverTimestamp(),
            logs: arrayUnion({
              user: auth.currentUser?.email,
              action: `Sent to ${targetCourier}`,
              timestamp: Timestamp.now(),
              details: `Tracking Code: ${trackingCode}`
            })
          });

          await addDoc(collection(db, 'deliveries'), {
            id: trackingCode,
            orderId: order.id,
            courier: targetCourier.charAt(0).toUpperCase() + targetCourier.slice(1),
            status: 'Pending Pickup',
            location: order.customerZone || 'Processing',
            eta: '2-3 Days',
            createdAt: serverTimestamp(),
            uid: auth.currentUser?.uid
          });
        }

        toast.success(`Order sent to ${targetCourier}! Tracking: ${trackingCode}`);
      } else {
        throw new Error(result.error || `Failed to send to ${targetCourier}`);
      }
    } catch (error: any) {
      console.error('Courier error:', error);
      toast.error(`Failed to send to courier: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkSendToCourier = async () => {
    const activeCouriers = Object.entries(courierConfigs).filter(([_, config]: [string, any]) => config.isActive);
    if (activeCouriers.length === 0) {
      toast.error('No courier is active. Please go to Settings > Logistics to activate one.');
      return;
    }
    const targetCourier = activeCouriers[0][0];

    const allOrders = [...orders, ...wooOrders];
    const eligibleOrders = allOrders.filter(o => 
      selectedOrders.includes(o.id) && 
      !['shipped', 'delivered', 'cancelled', 'returned'].includes(o.status)
    );

    if (eligibleOrders.length === 0) {
      toast.error('No eligible orders selected (must be pending/processing).');
      return;
    }

    setConfirmConfig({
      isOpen: true,
      title: 'Bulk Send to Courier',
      message: `Are you sure you want to send ${eligibleOrders.length} orders to ${targetCourier}?`,
      variant: 'info',
      onConfirm: async () => {
        setLoading(true);
        let successCount = 0;
        let failCount = 0;

    for (const order of eligibleOrders) {
      try {
        const sanitizePhone = (phone: string) => {
          const cleaned = phone.replace(/\D/g, '');
          return cleaned.length > 11 ? cleaned.slice(-11) : cleaned;
        };

        const phone = sanitizePhone(order.customerPhone);
        
        if (targetCourier === 'pathao') {
          if (!order.pathao_city_id || !order.pathao_zone_id || !order.pathao_area_id) {
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
          note: order.notes || '',
          weight: 0.5,
          recipient_city: order.pathao_city_id,
          recipient_zone: order.pathao_zone_id,
          recipient_area: order.pathao_area_id,
        };

        const response = await fetch('/api/couriers/order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ courier: targetCourier, orderData })
        });

        const result = await response.json();

        if (response.ok) {
          const trackingCode = result.consignment?.tracking_code || result.tracking_id || result.tracking_code;
          
          if (order.source === 'woocommerce') {
            await fetch(`/api/woocommerce/orders/${order.wooId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'processing' })
            });
            
            setWooOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'processing' } : o));
            
            await addDoc(collection(db, 'deliveries'), {
              id: trackingCode,
              orderId: order.id,
              wooId: order.wooId,
              courier: targetCourier.charAt(0).toUpperCase() + targetCourier.slice(1),
              status: 'Pending Pickup',
              location: order.customerZone || 'Processing',
              eta: '2-3 Days',
              createdAt: serverTimestamp(),
              uid: auth.currentUser?.uid
            });
          } else {
            await updateDoc(doc(db, 'orders', order.id), {
              courierName: targetCourier.charAt(0).toUpperCase() + targetCourier.slice(1),
              trackingNumber: trackingCode,
              status: 'shipped',
              updatedAt: serverTimestamp(),
              logs: arrayUnion({
                user: auth.currentUser?.email,
                action: `Sent to ${targetCourier} (Bulk)`,
                timestamp: Timestamp.now(),
                details: `Tracking Code: ${trackingCode}`
              })
            });

            // Add to deliveries collection
            await addDoc(collection(db, 'deliveries'), {
              id: trackingCode,
              orderId: order.id,
              courier: targetCourier.charAt(0).toUpperCase() + targetCourier.slice(1),
              status: 'Pending Pickup',
              location: order.customerZone || 'Processing',
              eta: '2-3 Days',
              createdAt: serverTimestamp(),
              uid: auth.currentUser?.uid
            });
          }

          successCount++;
        } else {
          failCount++;
        }
      } catch (error) {
        console.error(`${targetCourier} error for order ${order.id}:`, error);
        failCount++;
      }
    }

    setLoading(false);
    setSelectedOrders([]);
    toast.success(`Bulk process complete. Success: ${successCount}, Failed: ${failCount}`);
      }
    });
  };

  const handleExportCSV = () => {
    const allOrders = [...orders, ...wooOrders];
    if (allOrders.length === 0) {
      toast.error('No orders to export');
      return;
    }

    const headers = ['Order ID', 'Order Number', 'Customer Name', 'Phone', 'Address', 'City', 'Zone', 'Subtotal', 'Delivery Charge', 'Discount', 'Total Amount', 'Paid Amount', 'Due Amount', 'Status', 'Channel', 'Payment Method', 'Created At'];
    const csvRows = [headers.join(',')];

    allOrders.forEach(order => {
      const row = [
        order.id,
        order.orderNumber || '',
        `"${order.customerName || ''}"`,
        `"${order.customerPhone || ''}"`,
        `"${(order.customerAddress || '').replace(/"/g, '""')}"`,
        order.customerCity || '',
        order.customerZone || '',
        order.subtotal || 0,
        order.deliveryCharge || 0,
        order.discount || 0,
        order.totalAmount || 0,
        order.paidAmount || 0,
        order.dueAmount || 0,
        order.status || '',
        order.channel || '',
        order.paymentMethod || '',
        order.createdAt?.toDate ? order.createdAt.toDate().toLocaleString() : (order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000).toLocaleString() : 'N/A')
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `orders_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Orders exported successfully');
  };

  const filteredOrders = [...orders, ...wooOrders].filter(order => {
    const matchesSearch = 
      order.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerPhone?.includes(searchTerm) ||
      order.orderNumber?.toString().includes(searchTerm);
    
    const matchesTab = activeTab === 'All' || order.status === activeTab;
    
    return matchesSearch && matchesTab;
  }).sort((a, b) => {
    const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
    const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
    return dateB.getTime() - dateA.getTime();
  });

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-8 max-w-7xl mx-auto no-print">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 sm:gap-6">
        <div className="space-y-4 flex-1 w-full">
          <div className="space-y-1">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#141414] tracking-tight">Order Management</h2>
            <p className="text-xs sm:text-sm text-[#6b7280]">Manage your F-Commerce and website orders seamlessly.</p>
          </div>
          
          <div className="max-w-md relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]" size={16} />
            <input 
              type="text"
              placeholder="Search by Name, Phone, ID..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#ffffff] border border-[#f3f4f6] rounded-xl text-sm focus:border-[#00AEEF] outline-none transition-all shadow-sm"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
          <button 
            onClick={handleExportCSV}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-[#ffffff] border border-[#f3f4f6] rounded-xl text-xs sm:text-sm font-bold hover:bg-[#f9fafb] transition-all shadow-sm"
          >
            <Download size={16} className="sm:w-[18px] sm:h-[18px]" />
            <span className="whitespace-nowrap">Export CSV</span>
          </button>
          <button 
            onClick={() => setViewMode(viewMode === 'table' ? 'grid' : 'table')}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-[#ffffff] border border-[#f3f4f6] rounded-xl text-xs sm:text-sm font-bold hover:bg-[#f9fafb] transition-all shadow-sm"
          >
            {viewMode === 'table' ? <LayoutGrid size={16} className="sm:w-[18px] sm:h-[18px]" /> : <List size={16} className="sm:w-[18px] sm:h-[18px]" />}
            <span className="whitespace-nowrap">{viewMode === 'table' ? 'Grid View' : 'Table View'}</span>
          </button>
          <Link 
            to="/orders/new"
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-6 py-2 bg-[#141414] text-white rounded-xl text-xs sm:text-sm font-bold hover:bg-black transition-all shadow-lg hover:shadow-xl"
          >
            <Plus size={16} className="sm:w-[18px] sm:h-[18px]" />
            <span className="whitespace-nowrap">New Order</span>
          </Link>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedOrders.length > 0 && (
        <div className="bg-[#141414] text-white p-3 sm:p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xl animate-in slide-in-from-top-4 sticky top-20 z-40">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-4">
            <span className="text-xs sm:text-sm font-bold shrink-0">{selectedOrders.length} Selected</span>
            <div className="hidden sm:block h-4 w-px bg-[#ffffff33]" />
            <select 
              onChange={(e) => handleBulkStatusUpdate(e.target.value)}
              className="bg-[#ffffff1a] border border-[#ffffff33] rounded-lg px-2 sm:px-3 py-1 text-[10px] sm:text-xs font-bold outline-none"
            >
              <option value="" className="text-black">Update Status</option>
              {statuses.map(s => <option key={s} value={s} className="text-black">{s.replace(/_/g, ' ').charAt(0).toUpperCase() + s.replace(/_/g, ' ').slice(1)}</option>)}
            </select>
            <button 
              onClick={handleBulkSendToCourier}
              className="flex items-center gap-2 px-2 sm:px-3 py-1 bg-[#ffffff1a] hover:bg-[#ffffff33] rounded-xl text-[10px] sm:text-xs font-bold transition-all"
            >
              <Truck size={12} className="sm:w-[14px] sm:h-[14px]" /> <span className="hidden xs:inline">Courier</span>
            </button>
            <button 
              onClick={handleBulkDownloadPDF}
              className="flex items-center gap-2 px-2 sm:px-3 py-1 bg-[#00AEEF] hover:bg-[#0096ce] rounded-lg text-[10px] sm:text-xs font-bold transition-all"
            >
              <Download size={12} className="sm:w-[14px] sm:h-[14px]" /> <span className="hidden xs:inline">Invoices</span>
            </button>
            <button 
              onClick={handleBulkPrint}
              className="flex items-center gap-2 px-2 sm:px-3 py-1 bg-[#ffffff1a] hover:bg-[#ffffff33] rounded-lg text-[10px] sm:text-xs font-bold transition-all"
            >
              <Printer size={12} className="sm:w-[14px] sm:h-[14px]" /> <span className="hidden xs:inline">Print</span>
            </button>
          </div>
          <button 
            onClick={() => setSelectedOrders([])}
            className="p-2 hover:bg-[#ffffff1a] rounded-full transition-all shrink-0"
          >
            <X size={18} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        <div className="space-y-6">
          <div className="bg-[#ffffff] p-2 rounded-2xl border border-[#f3f4f6] shadow-sm flex gap-1 overflow-x-auto no-scrollbar">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  activeTab === tab 
                    ? 'bg-[#141414] text-white shadow-md' 
                    : 'text-[#6b7280] hover:bg-[#f3f4f6]'
                }`}
              >
                {tab.replace(/_/g, ' ').charAt(0).toUpperCase() + tab.replace(/_/g, ' ').slice(1)}
              </button>
            ))}
          </div>

          {viewMode === 'table' ? (
            <div className="relative">
              {/* Bulk Action Bar */}
              {selectedOrders.length > 0 && (
                <div className="sticky top-4 z-40 mb-4 mx-auto w-full max-w-2xl bg-[#141414] text-white p-3 rounded-2xl shadow-2xl flex items-center justify-between animate-in slide-in-from-top-4 duration-300">
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-bold px-3 py-1 bg-white/10 rounded-lg">{selectedOrders.length} Selected</span>
                    <div className="h-4 w-px bg-white/20" />
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleBulkStatusUpdate('confirmed')}
                        className="px-3 py-1.5 hover:bg-white/10 rounded-lg text-[10px] font-bold transition-all"
                      >
                        Confirm
                      </button>
                      <button 
                        onClick={() => handleBulkStatusUpdate('shipped')}
                        className="px-3 py-1.5 hover:bg-white/10 rounded-lg text-[10px] font-bold transition-all"
                      >
                        Ship
                      </button>
                      <button 
                        onClick={handleBulkPrint}
                        className="px-3 py-1.5 hover:bg-white/10 rounded-lg text-[10px] font-bold transition-all flex items-center gap-2"
                      >
                        <Printer size={12} /> Print
                      </button>
                      <button 
                        onClick={handleBulkSendToCourier}
                        className="px-3 py-1.5 hover:bg-white/10 rounded-lg text-[10px] font-bold transition-all flex items-center gap-2"
                      >
                        <Truck size={12} /> Send to Courier
                      </button>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedOrders([])}
                    className="p-1.5 hover:bg-white/10 rounded-lg transition-all"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              <div className="bg-[#ffffff] rounded-3xl border border-[#f3f4f6] shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#f9fafb]">
                      <th className="px-6 py-4">
                        <input 
                          type="checkbox" 
                          className="rounded border-[#d1d5db]"
                          checked={selectedOrders.length === filteredOrders.length && filteredOrders.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedOrders(filteredOrders.map(o => o.id));
                            else setSelectedOrders([]);
                          }}
                        />
                      </th>
                      <th className="px-6 py-4 text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider">Order ID</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider">Customer</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider">Items</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider">Total</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f9fafb]">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center">
                          <Loader2 className="animate-spin mx-auto text-[#9ca3af]" />
                        </td>
                      </tr>
                    ) : filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-[#9ca3af] text-sm">
                          No orders found matching your criteria.
                        </td>
                      </tr>
                    ) : (
                      paginatedOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-[#f9fafb]/50 transition-colors group">
                          <td className="px-6 py-4">
                            <input 
                              type="checkbox" 
                              className="rounded border-[#d1d5db]"
                              checked={selectedOrders.includes(order.id)}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedOrders([...selectedOrders, order.id]);
                                else setSelectedOrders(selectedOrders.filter(id => id !== order.id));
                              }}
                            />
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-[#141414]">#{order.orderNumber || order.id.slice(0, 8)}</span>
                                {order.source === 'woocommerce' && (
                                  <span className="px-1.5 py-0.5 bg-[#eff6ff] text-[#2563eb] border border-[#dbeafe] rounded text-[8px] font-bold uppercase tracking-wider">Woo</span>
                                )}
                              </div>
                              <span className="text-[10px] text-[#9ca3af]">{order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString() : (order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000).toLocaleDateString() : 'N/A')}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-[#141414]">{order.customerName}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-[#9ca3af]">{order.customerPhone}</span>
                                <a 
                                  href={`https://wa.me/88${order.customerPhone.replace(/\D/g, '')}`} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="p-1 bg-[#25D366] text-white rounded hover:bg-[#128C7E] transition-colors"
                                  title="Chat on WhatsApp"
                                >
                                  <MessageSquare size={10} />
                                </a>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs text-[#6b7280]">{order.items?.length || 0} items</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-[#141414]">{currencySymbol}{(order.totalAmount || 0).toLocaleString()}</span>
                              {order.dueAmount > 0 && <span className="text-[10px] text-[#f97316] font-bold">Due: {currencySymbol}{(order.dueAmount || 0).toLocaleString()}</span>}
                            </div>
                          </td>
                          <td className="px-6 py-4 relative">
                            <StatusBadge 
                              status={order.status} 
                              onClick={() => setIsStatusMenuOpen(isStatusMenuOpen === order.id ? null : order.id)}
                              isOpen={isStatusMenuOpen === order.id}
                            />
                            {isStatusMenuOpen === order.id && (
                              <div className="absolute left-6 mt-2 w-44 bg-white rounded-xl shadow-2xl border border-gray-100 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="grid grid-cols-1 gap-1">
                                  {statuses.map(s => (
                                    <button
                                      key={s}
                                      onClick={() => {
                                        handleUpdateStatus(order.id, s);
                                        setIsStatusMenuOpen(null);
                                      }}
                                      className={`w-full text-left px-3 py-2 rounded-lg text-[10px] font-bold transition-colors flex items-center justify-between ${
                                        order.status === s 
                                          ? 'bg-[#00AEEF] text-white' 
                                          : 'text-gray-700 hover:bg-gray-50'
                                      }`}
                                    >
                                      {s.replace(/_/g, ' ').charAt(0).toUpperCase() + s.replace(/_/g, ' ').slice(1)}
                                      {order.status === s && <CheckCircle size={10} />}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => setViewingOrder(order)}
                                className="p-2 hover:bg-[#ffffff] rounded-lg text-[#9ca3af] hover:text-[#00AEEF] transition-colors shadow-sm border border-transparent hover:border-[#f3f4f6]"
                                title="View Order"
                              >
                                <Eye size={14} />
                              </button>
                              <button 
                                onClick={() => {
                                  setSelectedOrderForPrint(order);
                                  setPrintType('a5');
                                }}
                                className="p-2 hover:bg-[#ffffff] rounded-lg text-[#9ca3af] hover:text-[#00AEEF] transition-colors shadow-sm border border-transparent hover:border-[#f3f4f6]"
                                title="Print Invoice"
                              >
                                <Printer size={14} />
                              </button>
                              <button 
                                onClick={() => handleSendToCourier(order)}
                                className="p-2 hover:bg-[#ffffff] rounded-lg text-[#9ca3af] hover:text-[#16a34a] transition-colors shadow-sm border border-transparent hover:border-[#f3f4f6]"
                                title="Send to Courier"
                              >
                                <Truck size={14} />
                              </button>
                              {order.source !== 'woocommerce' && (
                                <>
                                  <button 
                                    onClick={() => handleOpenEditModal(order)}
                                    className="p-2 hover:bg-[#ffffff] rounded-lg text-[#9ca3af] hover:text-[#141414] transition-colors shadow-sm border border-transparent hover:border-[#f3f4f6]"
                                  >
                                    <Edit size={14} />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteOrder(order.id)}
                                    className="p-2 hover:bg-[#fef2f2] rounded-lg text-[#9ca3af] hover:text-[#dc2626] transition-colors shadow-sm border border-transparent hover:border-[#fee2e2]"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 bg-white border-t border-[#f3f4f6]">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#6b7280]">
                      Showing <span className="font-bold text-[#141414]">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-bold text-[#141414]">{Math.min(currentPage * itemsPerPage, filteredOrders.length)}</span> of <span className="font-bold text-[#141414]">{filteredOrders.length}</span> orders
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg hover:bg-[#f9fafb] text-[#9ca3af] disabled:opacity-50 transition-colors"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(page => {
                        if (totalPages <= 7) return true;
                        if (page === 1 || page === totalPages) return true;
                        if (page >= currentPage - 1 && page <= currentPage + 1) return true;
                        return false;
                      })
                      .map((page, index, array) => {
                        const showEllipsis = index > 0 && page - array[index - 1] > 1;
                        return (
                          <React.Fragment key={page}>
                            {showEllipsis && <span className="text-[#9ca3af] px-1">...</span>}
                            <button
                              onClick={() => setCurrentPage(page)}
                              className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                                currentPage === page 
                                  ? 'bg-[#00AEEF] text-white shadow-md shadow-[#00AEEF]/20' 
                                  : 'text-[#6b7280] hover:bg-[#f9fafb]'
                              }`}
                            >
                              {page}
                            </button>
                          </React.Fragment>
                        );
                      })}

                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg hover:bg-[#f9fafb] text-[#9ca3af] disabled:opacity-50 transition-colors"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
            <DragDropContext onDragEnd={onDragEnd}>
              <div className="flex gap-6 overflow-x-auto pb-6 no-scrollbar min-h-[600px]">
                {statuses.map(status => (
                  <Droppable key={status} droppableId={status}>
                    {(provided: DroppableProvided) => (
                      <div 
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="flex-shrink-0 w-80 space-y-4"
                      >
                        <div className="flex items-center justify-between px-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${
                              status === 'pending' ? 'bg-[#fb923c]' :
                              status === 'delivered' ? 'bg-[#4ade80]' :
                              status === 'cancelled' ? 'bg-[#f87171]' : 'bg-[#60a5fa]'
                            }`} />
                            <h3 className="text-xs font-bold tracking-widest text-[#6b7280]">{status.replace(/_/g, ' ').charAt(0).toUpperCase() + status.replace(/_/g, ' ').slice(1)}</h3>
                            <span className="px-2 py-0.5 bg-[#f3f4f6] rounded-full text-[10px] font-bold text-[#6b7280]">
                              {filteredOrders.filter(o => o.status === status).length}
                            </span>
                          </div>
                          <Link to="/orders/new" className="p-1 hover:bg-[#f3f4f6] rounded-md transition-colors">
                            <Plus size={14} className="text-[#9ca3af]" />
                          </Link>
                        </div>
                        
                        <div className="space-y-3 min-h-[100px]">
                          {filteredOrders.filter(o => o.status === status).map((order, index) => {
                            const DraggableAny = Draggable as any;
                            return (
                              <DraggableAny key={order.id} draggableId={order.id} index={index}>
                                {(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => (
                                  <div 
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    onClick={() => {
                                      if (order.source !== 'woocommerce') {
                                        handleOpenEditModal(order);
                                      } else {
                                        toast.info('WooCommerce orders cannot be edited locally.');
                                      }
                                    }}
                                    className={`bg-[#ffffff] p-4 rounded-2xl border border-[#f3f4f6] shadow-sm hover:shadow-md transition-all cursor-pointer group ${
                                      snapshot.isDragging ? 'shadow-2xl ring-2 ring-[#00AEEF]/20 rotate-2 scale-105' : ''
                                    }`}
                                  >
                                    <div className="flex justify-between items-start mb-2">
                                      <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                          <span className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider">
                                            #ORD-{order.orderNumber || order.id.slice(0, 8)}
                                          </span>
                                          {order.source === 'woocommerce' && (
                                            <span className="px-1 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 rounded text-[8px] font-bold uppercase tracking-wider">Woo</span>
                                          )}
                                        </div>
                                        <div className="relative">
                                          <StatusBadge 
                                            status={order.status} 
                                            onClick={(e) => {
                                              e?.stopPropagation();
                                              setIsStatusMenuOpen(isStatusMenuOpen === order.id ? null : order.id);
                                            }}
                                            isOpen={isStatusMenuOpen === order.id}
                                          />
                                          {isStatusMenuOpen === order.id && (
                                            <div className="absolute left-0 mt-2 w-44 bg-white rounded-xl shadow-2xl border border-gray-100 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                              <div className="grid grid-cols-1 gap-1">
                                                {statuses.map(s => (
                                                  <button
                                                    key={s}
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleUpdateStatus(order.id, s);
                                                      setIsStatusMenuOpen(null);
                                                    }}
                                                    className={`w-full text-left px-3 py-2 rounded-lg text-[10px] font-bold transition-colors flex items-center justify-between ${
                                                      order.status === s 
                                                        ? 'bg-[#00AEEF] text-white' 
                                                        : 'text-gray-700 hover:bg-gray-50'
                                                    }`}
                                                  >
                                                    {s.replace(/_/g, ' ').charAt(0).toUpperCase() + s.replace(/_/g, ' ').slice(1)}
                                                    {order.status === s && <CheckCircle size={10} />}
                                                  </button>
                                                ))}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      <span className="text-[10px] font-bold text-[#141414] bg-[#f9fafb] px-2 py-0.5 rounded-md">{order.channel}</span>
                                    </div>
                                    <h4 className="text-sm font-bold text-[#141414] mb-1">{order.customerName}</h4>
                                    <p className="text-xs text-[#6b7280] mb-3">{order.customerPhone}</p>
                                    <div className="flex justify-between items-center pt-3 border-t border-[#f9fafb]">
                                      <div className="flex items-center gap-1">
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setViewingOrder(order);
                                          }}
                                          className="p-1 hover:bg-[#e5e7eb] rounded transition-colors text-[#6b7280]"
                                          title="View Order"
                                        >
                                          <Eye size={12} />
                                        </button>
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedOrderForPrint(order);
                                            setPrintType('a5');
                                          }}
                                          className="p-1 hover:bg-[#e5e7eb] rounded transition-colors text-[#6b7280]"
                                          title="Print Invoice"
                                        >
                                          <Printer size={12} />
                                        </button>
                                        <span className="text-sm font-bold">{currencySymbol}{(order.totalAmount || 0).toLocaleString()}</span>
                                      </div>
                                      <div className="flex -space-x-2">
                                        {order.items?.slice(0, 3).map((_: any, i: number) => (
                                          <div key={i} className="w-6 h-6 rounded-full bg-[#f3f4f6] border-2 border-[#ffffff] flex items-center justify-center text-[8px] font-bold">
                                            {i === 2 && order.items.length > 2 ? `+${order.items.length - 2}` : i + 1}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </DraggableAny>
                            );
                          })}
                          {provided.placeholder}
                          {orders.filter(o => o.status === status).length === 0 && (
                            <div className="h-24 border-2 border-dashed border-[#f3f4f6] rounded-2xl flex items-center justify-center text-xs text-[#d1d5db]">
                              No orders
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </Droppable>
                ))}
              </div>
            </DragDropContext>
          )}
        </div>
      </div>

      {/* Add/Edit Order Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#00000080] backdrop-blur-sm z-50 flex items-center justify-center p-6 no-print">
          <div className="bg-[#ffffff] w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-[#f3f4f6] flex items-center justify-between bg-[#f9fafb]/50">
              <h3 className="text-lg font-bold text-[#141414]">
                {editingOrder ? `Edit Order #ORD-${editingOrder.orderNumber || editingOrder.id.slice(0, 8)}` : 'New Order'}
              </h3>
              <div className="flex items-center gap-2">
                {editingOrder && (
                  <button 
                    type="button"
                    onClick={() => {
                      setSelectedOrderForPrint(editingOrder);
                      setPrintType('a5');
                    }}
                    className="p-2 hover:bg-[#ffffff] rounded-full transition-colors text-[#9ca3af] hover:text-[#00AEEF]"
                    title="Print Invoice"
                  >
                    <Printer size={20} />
                  </button>
                )}
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-[#ffffff] rounded-full transition-colors">
                  <X size={20} className="text-[#9ca3af]" />
                </button>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[85vh] overflow-y-auto">
              {/* Customer Section */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-widest text-[#9ca3af] flex items-center gap-2">
                  <UserCheck size={14} /> Customer Information
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider">Customer Name *</label>
                    <input 
                      required
                      className="w-full px-4 py-2 bg-[#f9fafb] border border-transparent rounded-lg text-sm focus:bg-[#ffffff] focus:border-[#e5e7eb] outline-none transition-all"
                      value={orderForm.customerName}
                      onChange={e => setOrderForm({...orderForm, customerName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider">Phone Number *</label>
                    <div className="flex gap-2">
                      <input 
                        required
                        className="flex-1 px-4 py-2 bg-[#f9fafb] border border-transparent rounded-lg text-sm focus:bg-[#ffffff] focus:border-[#e5e7eb] outline-none transition-all"
                        value={orderForm.customerPhone}
                        onChange={e => handlePhoneChange(e.target.value)}
                      />
                      {orderForm.customerPhone.length >= 11 && (
                        <a 
                          href={`https://wa.me/88${orderForm.customerPhone.replace(/\D/g, '')}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="p-2 bg-[#25D366] text-white rounded-lg hover:bg-[#128C7E] transition-all shadow-md flex items-center justify-center"
                          title="Chat on WhatsApp"
                        >
                          <Smartphone size={16} />
                        </a>
                      )}
                    </div>
                    
                    {isFetchingHistory && (
                      <div className="flex items-center gap-2 mt-1 px-2">
                        <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-[10px] text-blue-500 font-medium italic">Checking courier history...</span>
                      </div>
                    )}

                    {courierHistory && (
                      <div className="mt-2 p-3 bg-white border border-gray-100 rounded-xl shadow-sm animate-in fade-in slide-in-from-top-1 duration-300">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <ShieldCheck size={14} className="text-green-500" />
                            <span className="text-[10px] font-bold text-gray-900 uppercase tracking-tight">Courier Trust Score</span>
                          </div>
                          <span className="text-[9px] font-bold text-gray-400 uppercase bg-gray-50 px-1.5 py-0.5 rounded-md border border-gray-100">{courierHistory.courier}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-green-50/50 p-2 rounded-lg border border-green-100/50">
                            <p className="text-[8px] font-bold text-green-600 uppercase tracking-wider mb-0.5">Delivered</p>
                            <p className="text-sm font-black text-green-700">{courierHistory.total_delivered || 0}</p>
                          </div>
                          <div className="bg-red-50/50 p-2 rounded-lg border border-red-100/50">
                            <p className="text-[8px] font-bold text-red-600 uppercase tracking-wider mb-0.5">Canceled</p>
                            <p className="text-sm font-black text-red-700">{courierHistory.total_cancelled || 0}</p>
                          </div>
                          <div className="bg-blue-50/50 p-2 rounded-lg border border-blue-100/50">
                            <p className="text-[8px] font-bold text-blue-600 uppercase tracking-wider mb-0.5">Success Rate</p>
                            <p className="text-sm font-black text-blue-700">{courierHistory.success_rate || '0%'}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-1 relative">
                  <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider">Full Address</label>
                  <textarea 
                    className="w-full px-4 py-2 bg-[#f9fafb] border border-transparent rounded-lg text-sm focus:bg-[#ffffff] focus:border-[#e5e7eb] outline-none transition-all resize-none"
                    rows={2}
                    placeholder="Type or paste full address (e.g. House 10, Dhanmondi, Dhaka)"
                    value={orderForm.customerAddress}
                    onChange={e => handleAddressChange(e.target.value)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  />
                  {showSuggestions && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-2xl max-h-48 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                      {locationSuggestions.map((loc) => (
                        <button
                          key={loc.id}
                          type="button"
                          onClick={() => handleSelectLocation(loc)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-gray-800">{loc.nameEn} / {loc.nameBn}</span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{loc.type}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider">District</label>
                    <select 
                      className="w-full px-4 py-2 bg-[#f9fafb] border border-transparent rounded-lg text-sm focus:bg-[#ffffff] focus:border-[#e5e7eb] outline-none transition-all"
                      value={orderForm.district}
                      onChange={e => {
                        setOrderForm({...orderForm, district: e.target.value, area: ''});
                        if (courierConfigs.pathao?.isActive) autoMatchPathao(e.target.value, '');
                        if (courierConfigs.carrybee?.isActive) autoMatchCarrybee(e.target.value, '');
                      }}
                    >
                      <option value="">Select District</option>
                      {districts.map(d => (
                        <option key={d.id} value={d.nameEn}>{d.nameEn}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider">Area / Thana</label>
                    <select 
                      className="w-full px-4 py-2 bg-[#f9fafb] border border-transparent rounded-lg text-sm focus:bg-[#ffffff] focus:border-[#e5e7eb] outline-none transition-all"
                      value={orderForm.area}
                      onChange={e => {
                        setOrderForm({...orderForm, area: e.target.value});
                        if (courierConfigs.pathao?.isActive) autoMatchPathao(orderForm.district, e.target.value);
                        if (courierConfigs.carrybee?.isActive) autoMatchCarrybee(orderForm.district, e.target.value);
                      }}
                      disabled={!orderForm.district}
                    >
                      <option value="">Select Area</option>
                      {upazilas
                        .filter(u => orderForm.district && districts.find(d => d.nameEn === orderForm.district)?.id === u.districtId)
                        .map(u => (
                          <option key={u.id} value={u.nameEn}>{u.nameEn}</option>
                        ))
                      }
                    </select>
                  </div>
                </div>
              </div>

              {/* Items Section */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-widest text-[#9ca3af] flex items-center gap-2">
                  <Truck size={14} /> Order Items & Fulfillment
                </h4>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider">Fulfillment Warehouse</label>
                  <select 
                    required
                    className="w-full px-4 py-2 bg-[#f9fafb] border border-transparent rounded-lg text-sm focus:bg-[#ffffff] focus:border-[#e5e7eb] outline-none transition-all"
                    value={orderForm.warehouseId}
                    onChange={e => setOrderForm({...orderForm, warehouseId: e.target.value})}
                  >
                    <option value="">Select Warehouse</option>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>

                <div className="bg-[#f9fafb] p-4 rounded-xl space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <select 
                      className="p-2 bg-[#ffffff] border border-[#f3f4f6] rounded-lg text-xs"
                      value={newItem.productId}
                      onChange={e => {
                        const p = products.find(prod => prod.id === e.target.value);
                        setNewItem({...newItem, productId: e.target.value, variantId: '', price: p?.price || 0});
                      }}
                    >
                      <option value="">Product</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    {newItem.productId && products.find(p => p.id === newItem.productId)?.type === 'variable' && (
                      <select 
                        className="p-2 bg-[#ffffff] border border-[#f3f4f6] rounded-lg text-xs"
                        value={newItem.variantId}
                        onChange={e => {
                          const v = variants.find(varnt => varnt.id === e.target.value);
                          setNewItem({...newItem, variantId: e.target.value, price: v?.price || newItem.price});
                        }}
                      >
                        <option value="">Variant</option>
                        {variants.filter(v => v.productId === newItem.productId).map(v => (
                          <option key={v.id} value={v.id}>{v.size} / {v.color}</option>
                        ))}
                      </select>
                    )}
                    <div className="flex gap-2">
                      <div className="flex items-center bg-[#ffffff] border border-[#f3f4f6] rounded-lg overflow-hidden">
                        <button 
                          type="button"
                          onClick={() => setNewItem(prev => ({...prev, quantity: Math.max(1, prev.quantity - 1)}))}
                          className="px-2 py-1 hover:bg-gray-50 text-gray-500 transition-colors border-r border-[#f3f4f6]"
                        >
                          -
                        </button>
                        <input 
                          type="number" 
                          placeholder="Qty" 
                          className="w-12 text-center py-1 text-xs outline-none"
                          value={newItem.quantity || 0}
                          onChange={e => setNewItem({...newItem, quantity: parseInt(e.target.value) || 0})}
                        />
                        <button 
                          type="button"
                          onClick={() => setNewItem(prev => ({...prev, quantity: prev.quantity + 1}))}
                          className="px-2 py-1 hover:bg-gray-50 text-gray-500 transition-colors border-l border-[#f3f4f6]"
                        >
                          +
                        </button>
                      </div>
                      <button 
                        type="button"
                        onClick={() => {
                          if (!newItem.productId) return;
                          const p = products.find(prod => prod.id === newItem.productId);
                          const v = variants.find(varnt => varnt.id === newItem.variantId);
                          const itemWithInfo = {
                            ...newItem,
                            name: p?.name || 'Unknown Product',
                            variant: v ? `${v.size} / ${v.color}` : ''
                          };
                          setOrderForm({...orderForm, items: [...orderForm.items, itemWithInfo]});
                          setNewItem({ productId: '', variantId: '', quantity: 1, price: 0 });
                        }}
                        className="flex-1 bg-[#141414] text-white rounded-lg text-xs font-bold px-4 py-2"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {orderForm.items.map((item, idx) => {
                      const p = products.find(prod => prod.id === item.productId);
                      const v = variants.find(varnt => varnt.id === item.variantId);
                      return (
                        <div key={idx} className="flex justify-between items-center bg-[#ffffff] p-3 rounded-lg border border-[#f3f4f6] text-xs">
                          <div className="flex flex-col">
                            <span className="font-bold">{p?.name}</span>
                            {v && <span className="text-[10px] text-[#9ca3af]">{v.size} / {v.color}</span>}
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center bg-gray-50 border border-gray-100 rounded-lg overflow-hidden">
                              <button 
                                type="button"
                                onClick={() => {
                                  const newItems = [...orderForm.items];
                                  newItems[idx].quantity = Math.max(1, newItems[idx].quantity - 1);
                                  setOrderForm({...orderForm, items: newItems});
                                }}
                                className="px-2 py-1 hover:bg-white text-gray-500 transition-colors"
                              >
                                -
                              </button>
                              <input 
                                type="number"
                                className="w-8 text-center bg-transparent text-[10px] font-bold outline-none"
                                value={item.quantity}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 0;
                                  const newItems = [...orderForm.items];
                                  newItems[idx].quantity = val;
                                  setOrderForm({...orderForm, items: newItems});
                                }}
                              />
                              <button 
                                type="button"
                                onClick={() => {
                                  const newItems = [...orderForm.items];
                                  newItems[idx].quantity = newItems[idx].quantity + 1;
                                  setOrderForm({...orderForm, items: newItems});
                                }}
                                className="px-2 py-1 hover:bg-white text-gray-500 transition-colors"
                              >
                                +
                              </button>
                            </div>
                            <span className="font-bold">{currencySymbol}{(item.quantity * item.price).toLocaleString()}</span>
                            <button 
                              type="button"
                              onClick={() => setOrderForm({...orderForm, items: orderForm.items.filter((_, i) => i !== idx)})}
                              className="text-[#dc2626] hover:text-[#b91c1c]"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Payment & Charges Section */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-widest text-[#9ca3af] flex items-center gap-2">
                  <CreditCard size={14} /> Payment & Charges
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider">Delivery Zone</label>
                    <select 
                      className="w-full px-4 py-2 bg-[#f9fafb] border border-transparent rounded-lg text-sm focus:bg-[#ffffff] focus:border-[#e5e7eb] outline-none transition-all"
                      value={orderForm.customerZone}
                      onChange={e => handleZoneChange(e.target.value)}
                    >
                      <option value="Inside Dhaka">Inside Dhaka</option>
                      <option value="Sub Area">Sub Area</option>
                      <option value="Outside Dhaka">Outside Dhaka</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider">Delivery Charge</label>
                    <input 
                      type="number"
                      className="w-full px-4 py-2 bg-[#f9fafb] border border-transparent rounded-lg text-sm focus:bg-[#ffffff] focus:border-[#e5e7eb] outline-none transition-all font-bold text-blue-600"
                      value={orderForm.deliveryCharge}
                      onChange={e => setOrderForm({...orderForm, deliveryCharge: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider">Discount</label>
                    <input 
                      type="number"
                      className="w-full px-4 py-2 bg-[#f9fafb] border border-transparent rounded-lg text-sm focus:bg-[#ffffff] focus:border-[#e5e7eb] outline-none transition-all"
                      value={orderForm.discount}
                      onChange={e => setOrderForm({...orderForm, discount: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider">Paid Amount (Advance)</label>
                    <input 
                      type="number"
                      className="w-full px-4 py-2 bg-[#f9fafb] border border-transparent rounded-lg text-sm focus:bg-[#ffffff] focus:border-[#e5e7eb] outline-none transition-all"
                      value={orderForm.paidAmount}
                      onChange={e => setOrderForm({...orderForm, paidAmount: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider">Payment Method</label>
                    <select 
                      className="w-full px-4 py-2 bg-[#f9fafb] border border-transparent rounded-lg text-sm focus:bg-[#ffffff] focus:border-[#e5e7eb] outline-none transition-all"
                      value={orderForm.paymentMethod}
                      onChange={e => setOrderForm({...orderForm, paymentMethod: e.target.value as any})}
                    >
                      <option value="COD">Cash on Delivery</option>
                      <option value="bKash">bKash</option>
                      <option value="Nagad">Nagad</option>
                      <option value="Rocket">Rocket</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Additional Info Section */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-widest text-[#9ca3af] flex items-center gap-2">
                  <AlertCircle size={14} /> Additional Information
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider">Order Tags</label>
                    <input 
                      type="text"
                      className="w-full px-4 py-2 bg-[#f9fafb] border border-transparent rounded-lg text-sm focus:bg-[#ffffff] focus:border-[#e5e7eb] outline-none transition-all"
                      placeholder="e.g. VIP, Urgent, Gift"
                      value={orderForm.tags}
                      onChange={e => setOrderForm({...orderForm, tags: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider">Order Source</label>
                    <select 
                      className="w-full px-4 py-2 bg-[#f9fafb] border border-transparent rounded-lg text-sm focus:bg-[#ffffff] focus:border-[#e5e7eb] outline-none transition-all"
                      value={orderForm.channel}
                      onChange={e => setOrderForm({...orderForm, channel: e.target.value})}
                    >
                      <option value="whatsapp">WhatsApp</option>
                      <option value="messenger">Messenger</option>
                      <option value="instagram">Instagram</option>
                      <option value="call">Call</option>
                      <option value="website">Website</option>
                      <option value="tiktok">TikTok</option>
                      <option value="others">Others</option>
                    </select>
                  </div>
                  {editingOrder && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider">Order Status</label>
                      <select 
                        className="w-full px-4 py-2 bg-[#f9fafb] border border-transparent rounded-lg text-sm focus:bg-[#ffffff] focus:border-[#e5e7eb] outline-none transition-all"
                        value={orderForm.status}
                        onChange={e => setOrderForm({...orderForm, status: e.target.value as any})}
                      >
                        {statuses.map(s => (
                          <option key={s} value={s}>{s.replace(/_/g, ' ').charAt(0).toUpperCase() + s.replace(/_/g, ' ').slice(1)}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider">Order Notes</label>
                  <textarea 
                    className="w-full px-4 py-2 bg-[#f9fafb] border border-transparent rounded-lg text-sm focus:bg-[#ffffff] focus:border-[#e5e7eb] outline-none transition-all resize-none"
                    rows={2}
                    placeholder="Special instructions for delivery or packing..."
                    value={orderForm.notes}
                    onChange={e => setOrderForm({...orderForm, notes: e.target.value})}
                  />
                </div>
              </div>

              {/* Summary Section */}
              <div className="bg-[#141414] text-white p-6 rounded-2xl space-y-2 shadow-xl">
                <div className="flex justify-between text-xs opacity-60">
                  <span>Subtotal</span>
                  <span>{currencySymbol}{calculateTotals(orderForm.items, orderForm.deliveryCharge, orderForm.discount, orderForm.paidAmount).subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs opacity-60">
                  <span>Delivery Charge</span>
                  <span>+ {currencySymbol}{orderForm.deliveryCharge.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs opacity-60">
                  <span>Discount</span>
                  <span>- {currencySymbol}{orderForm.discount.toLocaleString()}</span>
                </div>
                <div className="h-px bg-[#ffffff1a] my-2" />
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold uppercase tracking-widest">Total Amount</span>
                  <span className="text-2xl font-bold">{currencySymbol}{calculateTotals(orderForm.items, orderForm.deliveryCharge, orderForm.discount, orderForm.paidAmount).totalAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center pt-2 text-[#fb923c]">
                  <span className="text-[10px] font-bold uppercase tracking-widest">Due Amount</span>
                  <span className="text-lg font-bold">{currencySymbol}{calculateTotals(orderForm.items, orderForm.deliveryCharge, orderForm.discount, orderForm.paidAmount).dueAmount.toLocaleString()}</span>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 border border-[#e5e7eb] rounded-xl font-bold hover:bg-[#f9fafb] transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-[#141414] text-white rounded-xl font-bold hover:bg-black transition-all shadow-lg"
                >
                  {editingOrder ? 'Save Changes' : 'Confirm Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Courier Selection Modal */}
      {courierSelection.isOpen && (
        <div className="fixed inset-0 bg-[#00000080] backdrop-blur-sm z-[70] flex items-center justify-center p-6 no-print">
          <div className="bg-[#ffffff] w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-[#f3f4f6] flex items-center justify-between bg-[#f9fafb]/50">
              <h3 className="text-lg font-bold text-[#141414]">Select Courier</h3>
              <button 
                onClick={() => setCourierSelection(prev => ({ ...prev, isOpen: false }))}
                className="p-2 hover:bg-[#f3f4f6] rounded-full transition-colors text-[#9ca3af]"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-3">
              <p className="text-xs text-gray-500 mb-4">Multiple couriers are active. Please choose which one to use for this order.</p>
              {courierSelection.activeCouriers.map(([name]) => (
                <button
                  key={name}
                  onClick={() => {
                    handleSendToCourier(courierSelection.order, name);
                    setCourierSelection(prev => ({ ...prev, isOpen: false }));
                  }}
                  className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-[#f3f4f6] hover:border-[#00AEEF] hover:bg-[#00AEEF]/5 transition-all group"
                >
                  <span className="font-bold text-gray-700 group-hover:text-[#00AEEF]">
                    {name.charAt(0).toUpperCase() + name.slice(1)}
                  </span>
                  <ChevronRight size={16} className="text-gray-400 group-hover:text-[#00AEEF]" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Print Modal */}
      {selectedOrderForPrint && (
        <div className="fixed inset-0 bg-[#00000080] backdrop-blur-sm z-[60] flex items-center justify-center p-6 no-print">
          <div className="bg-[#ffffff] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-[#f3f4f6] flex items-center justify-between bg-[#f9fafb]/50">
              <h3 className="text-lg font-bold text-[#141414]">Print/Download Invoice</h3>
              <button 
                onClick={() => {
                  setSelectedOrderForPrint(null);
                  setPrintType(null);
                }}
                className="p-2 hover:bg-[#f3f4f6] rounded-full transition-colors text-[#9ca3af]"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { id: 'a5', name: 'A5 Invoice', icon: FileText },
                  { id: 'pos', name: 'POS', icon: Printer },
                ].map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setPrintType(type.id as any)}
                    className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                      printType === type.id 
                        ? 'border-[#00AEEF] bg-[#00AEEF]/5 text-[#00AEEF]' 
                        : 'border-[#f3f4f6] hover:border-[#e5e7eb] text-[#6b7280]'
                    }`}
                  >
                    <type.icon size={24} />
                    <span className="text-xs font-bold">{type.name}</span>
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    if (!printType) {
                      toast.error("Please select an invoice type first");
                      return;
                    }
                    handlePrint();
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
                    !printType 
                      ? 'bg-[#f3f4f6] text-[#9ca3af] cursor-not-allowed' 
                      : 'bg-[#141414] text-white hover:bg-black'
                  }`}
                >
                  <Printer size={18} /> Print
                </button>
                <button
                  onClick={() => {
                    if (!printType) {
                      toast.error("Please select an invoice type first");
                      return;
                    }
                    toast.info("Opening system print dialog...");
                    setTimeout(() => window.print(), 500);
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
                    !printType 
                      ? 'bg-[#f3f4f6] text-[#9ca3af] cursor-not-allowed' 
                      : 'bg-[#6b7280] text-white hover:bg-[#4b5563]'
                  }`}
                  title="Use this if the standard print button fails"
                >
                  <Printer size={18} /> Manual
                </button>
                <button
                  onClick={() => {
                    if (!printType) {
                      toast.error("Please select an invoice type first");
                      return;
                    }
                    handleDownloadPDF();
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
                    !printType 
                      ? 'bg-[#f3f4f6] text-[#9ca3af] cursor-not-allowed' 
                      : 'bg-[#00AEEF] text-white hover:bg-[#0096ce]'
                  }`}
                >
                  <Download size={18} /> Download PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Actions Bar */}
      {selectedOrders.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#141414] text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-6 z-50 animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-3 pr-6 border-r border-white/10">
            <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center text-xs font-bold">
              {selectedOrders.length}
            </div>
            <span className="text-sm font-medium text-white/80">Orders Selected</span>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => handleBulkStatusUpdate('confirmed')}
              className="px-4 py-2 hover:bg-white/10 rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
            >
              <CheckCircle size={16} className="text-green-400" />
              Confirm
            </button>
            <button 
              onClick={handleBulkSendToCourier}
              className="px-4 py-2 hover:bg-white/10 rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
            >
              <Truck size={16} className="text-blue-400" />
              Send to Courier
            </button>
            <button 
              onClick={handleBulkPrint}
              className="px-4 py-2 hover:bg-white/10 rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
            >
              <Printer size={16} />
              Print Invoices
            </button>
            <button 
              onClick={() => setSelectedOrders([])}
              className="px-4 py-2 hover:bg-white/10 rounded-lg text-sm font-bold transition-colors"
            >
              Cancel
            </button>
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

      {viewingOrder && (
        <OrderDetailsModal 
          order={viewingOrder}
          onClose={() => setViewingOrder(null)}
          products={products}
          variants={variants}
          currencySymbol={currencySymbol}
          onPrintInvoice={(order) => {
            setSelectedOrderForPrint(order);
            setPrintType('a5');
          }}
          onSendToCourier={handleSendToCourier}
        />
      )}

      {/* Hidden Print Containers - Moved outside conditional blocks to ensure refs are always attached and accessible */}
      <div className="print-only">
        <div ref={printRef}>
          {selectedOrderForPrint && (
            <>
              {printType === 'a5' && <A5Invoice order={selectedOrderForPrint} company={companySettings || {}} currencySymbol={currencySymbol} />}
              {printType === 'pos' && <POSInvoice order={selectedOrderForPrint} company={companySettings || {}} currencySymbol={currencySymbol} />}
            </>
          )}
        </div>
      </div>

      {/* Hidden Bulk Print Content */}
      <div className="print-only">
        <div ref={bulkPrintRef}>
          {selectedOrders.length > 0 && selectedOrders.map(id => {
            const order = orders.find(o => o.id === id);
            if (!order) return null;
            return (
              <div key={id} className="page-break-after">
                <A5Invoice order={order} company={companySettings || {}} currencySymbol={currencySymbol} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
