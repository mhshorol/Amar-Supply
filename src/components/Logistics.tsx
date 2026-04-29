import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Search, 
  Plus, 
  Download, 
  Truck, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  MoreVertical,
  ExternalLink,
  Navigation,
  BarChart2,
  Loader2,
  X,
  Trash2,
  Edit,
  RefreshCw,
  Zap,
  Save,
  ChevronDown,
  Settings2,
  Activity,
  XCircle,
  Filter,
  Calendar,
  Settings,
  FileText,
  Info,
  Link
} from 'lucide-react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  deleteDoc,
  doc,
  getDoc,
  query, 
  orderBy, 
  getDocs,
  limit,
  where,
  serverTimestamp,
  Timestamp,
  updateDoc
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import ConfirmModal from './ConfirmModal';
import CourierReconciliation from './CourierReconciliation';

const CourierCard = ({
  courierKey,
  name,
  subtitle,
  iconInitials,
  iconColor,
  isActive,
  onToggleActive,
  isExpanded,
  onToggleExpand,
  lastSync,
  ordersSynced,
  children
}: {
  courierKey: string;
  name: string;
  subtitle: string;
  iconInitials: string;
  iconColor: string;
  isActive: boolean;
  onToggleActive: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  lastSync: string;
  ordersSynced: string | number;
  children: React.ReactNode;
}) => {
  return (
    <div className="bg-surface rounded-[20px] border border-border shadow-subtle flex flex-col hover:shadow-premium transition-shadow">
      <div className="p-5 flex items-start justify-between border-b border-border">
        <div className="flex gap-4">
          <div className="w-[60px] h-[60px] rounded-2xl bg-surface border border-border shadow-subtle flex items-center justify-center shrink-0">
            <div className={`w-[44px] h-[44px] rounded-full text-white flex items-center justify-center text-lg font-bold tracking-tight ${iconColor}`}>
              {iconInitials}
            </div>
          </div>
          <div className="flex flex-col justify-center">
            <h4 className="text-[15px] font-bold text-primary group-hover:text-brand transition-colors leading-tight">{name}</h4>
            <p className="text-[12px] text-secondary mt-1 font-medium leading-tight">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isActive ? (
            <>
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 dark:bg-green-500/20 text-[#166534] text-[10px] font-bold rounded-full border border-[#D5F5E3]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span>Connected
              </span>
              <button 
                onClick={onToggleActive}
                className="w-10 h-5 bg-[#10B981] rounded-full flex items-center px-0.5 transition-colors shrink-0"
              >
                <div className="w-4 h-4 bg-surface rounded-full shadow-subtle transform translate-x-5 transition-transform" />
              </button>
            </>
          ) : (
            <>
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-hover text-secondary text-[10px] font-bold rounded-full border border-border">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>Disconnected
              </span>
              <button 
                 onClick={onToggleActive}
                 className="w-10 h-5 bg-gray-200 rounded-full flex items-center px-0.5 transition-colors shrink-0"
              >
                <div className="w-4 h-4 bg-surface rounded-full shadow-subtle transition-transform" />
              </button>
            </>
          )}
          <button className="text-muted hover:text-secondary transition-colors ml-1 shrink-0">
            <MoreVertical size={18} />
          </button>
        </div>
      </div>
      
      <div className="px-6 py-5 grid grid-cols-3 gap-4 border-b border-border/50">
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium text-muted">API Status</span>
          {isActive ? (
             <div className="flex items-center gap-1.5 pt-0.5">
               <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span>
               <span className="text-[13px] font-bold text-[#10B981]">Active</span>
             </div>
          ) : (
             <div className="flex items-center gap-1.5 pt-0.5">
               <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
               <span className="text-[13px] font-bold text-secondary">Not Connected</span>
             </div>
          )}
        </div>
        <div className="flex flex-col gap-1.5 border-l border-border pl-4">
          <span className="text-[11px] font-medium text-muted">Last Sync</span>
          <span className="text-[13px] font-bold text-primary pt-0.5 border-0">
            {isActive ? lastSync : '—'}
          </span>
        </div>
        <div className="flex flex-col gap-1.5 border-l border-border pl-4">
          <span className="text-[11px] font-medium text-muted">Orders Synced</span>
          <span className="text-[13px] font-bold text-primary pt-0.5 border-0">
            {isActive ? ordersSynced : '—'}
          </span>
        </div>
      </div>

      <div className="p-4 flex items-center gap-3 bg-surface-hover/30 mt-auto rounded-b-[20px]">
        {isActive ? (
          <button 
            onClick={onToggleExpand}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-4 border border-brand/20 text-brand hover:bg-brand/10 text-[13px] font-semibold rounded-lg transition-all"
          >
            <Settings size={15} /> Configure
          </button>
        ) : (
          <button 
            onClick={onToggleExpand}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-brand text-white hover:bg-blue-700 text-[13px] font-semibold rounded-lg shadow-subtle transition-all shadow-brand/20"
          >
            <Link size={15} /> Connect
          </button>
        )}
        <button className="flex-1 flex items-center justify-center gap-2 py-2 px-4 border border-border text-secondary hover:bg-surface-hover text-[13px] font-semibold rounded-lg transition-all">
          {isActive ? <FileText size={15} /> : <Info size={15} />} 
          {isActive ? 'View Logs' : 'View Details'}
        </button>
      </div>
      
      {isExpanded && (
        <div className="px-5 pb-5 pt-4 bg-surface border-t border-border animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between mb-4">
            <h5 className="text-sm font-bold text-primary">API Configuration</h5>
          </div>
          {children}
        </div>
      )}
    </div>
  );
};

interface Delivery {
  id: string;
  orderId: string;
  orderNumber?: number;
  courier: string;
  status: string;
  location: string;
  eta: string;
  createdAt: any;
  updatedAt?: any;
  uid: string;
  trackingCode?: string;
}

interface Courier {
  id: string;
  name: string;
  active: boolean;
  orders: number;
  success: string;
  uid: string;
}

export default function Logistics() {
  const { user } = useAuth();
  const { settings, currencySymbol } = useSettings();
  const [searchTerm, setSearchTerm] = useState('');
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [loading, setLoading] = useState(true);
  const [courierConfigs, setCourierConfigs] = useState<Record<string, any>>({});
  const [courierLogs, setCourierLogs] = useState<any[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'shipments' | 'pending' | 'couriers' | 'logs' | 'reconciliation'>('shipments');
  const [orderMap, setOrderMap] = useState<Record<string, number>>({});
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedConfig, setExpandedConfig] = useState<string | null>(null);

  useEffect(() => {
    const fetchMissingOrderNumbers = async () => {
      const missingIds = Array.from(new Set(
        deliveries
          .filter(d => !d.orderNumber && !d.orderId.startsWith('woo_') && !orderMap[d.orderId])
          .map(d => d.orderId)
      ));
      
      if (missingIds.length === 0) return;

      const newMap = { ...orderMap };
      try {
        // Firestore 'in' query has a limit of 10
        for (let i = 0; i < missingIds.length; i += 10) {
          const chunk = missingIds.slice(i, i + 10);
          const q = query(collection(db, 'orders'), where('__name__', 'in', chunk));
          const snap = await getDocs(q);
          snap.forEach(doc => {
            if (doc.data().orderNumber) {
              newMap[doc.id] = doc.data().orderNumber;
            } else {
              newMap[doc.id] = -1; // -1 indicates marked but not found
            }
          });
        }
        setOrderMap(newMap);
      } catch (error) {
        console.error("Error fetching order numbers:", error);
      }
    };
    
    fetchMissingOrderNumbers();
  }, [deliveries]);
  const [selectedPendingOrders, setSelectedPendingOrders] = useState<string[]>([]);

  useEffect(() => {
    const fetchCourierData = async () => {
      try {
        const response = await fetch('/api/couriers/configs');
        if (response.ok) {
          const data = await (response.headers.get('content-type')?.includes('json') ? response.json() : Promise.reject(new Error('Invalid non-JSON response from server.')));
          setCourierConfigs(data);
        }

        // Fetch logs if on logs tab
        if (activeSubTab === 'logs') {
          try {
            const logsSnap = await getDocs(query(collection(db, 'courier_logs'), limit(50)));
            setCourierLogs(logsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          } catch (logError) {
            console.error("Error fetching courier logs:", logError);
            toast.error("Failed to fetch courier logs. Check permissions.");
          }
        }
      } catch (error) {
        console.error("Error in fetchCourierData:", error);
      }
    };
    fetchCourierData();
  }, [activeSubTab]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [editingCourier, setEditingCourier] = useState<Courier | null>(null);
  const [editingDelivery, setEditingDelivery] = useState<Delivery | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
    variant?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  const [courierForm, setCourierForm] = useState({
    name: '',
    active: true,
  });
  const [deliveryForm, setDeliveryForm] = useState({
    orderId: '',
    courier: '',
    status: 'in_transit',
    location: '',
    eta: '2-3 Days',
    city_id: '',
    zone_id: '',
    area_id: '',
  });

  const [cities, setCities] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);

  useEffect(() => {
    if (isDeliveryModalOpen && (deliveryForm.courier === 'Pathao' || deliveryForm.courier === 'Carrybee')) {
      fetchCities(deliveryForm.courier);
    }
  }, [isDeliveryModalOpen, deliveryForm.courier]);

  const fetchCities = async (courier: string) => {
    setLoadingLocations(true);
    try {
      const response = await fetch(`/api/couriers/cities/${courier.toLowerCase()}`);
      if (response.ok) {
        const data = await (response.headers.get('content-type')?.includes('json') ? response.json() : Promise.reject(new Error('Invalid non-JSON response from server.')));
        // Pathao returns { data: [...] }, Carrybee returns { data: { cities: [...] } }
        const cityList = data.data?.cities || data.data || [];
        setCities(cityList);
      } else {
        const errData = await (response.headers.get('content-type')?.includes('json') ? response.json() : Promise.reject(new Error('Invalid non-JSON response from server.')));
        console.error(`Error fetching ${courier} cities:`, errData.error);
      }
    } catch (error: any) {
      console.error(`Error fetching ${courier} cities:`, error.message);
    } finally {
      setLoadingLocations(false);
    }
  };

  const fetchZones = async (cityId: string) => {
    setLoadingLocations(true);
    setZones([]);
    setAreas([]);
    const courier = deliveryForm.courier.toLowerCase();
    try {
      const response = await fetch(`/api/couriers/zones/${courier}/${cityId}`);
      if (response.ok) {
        const data = await (response.headers.get('content-type')?.includes('json') ? response.json() : Promise.reject(new Error('Invalid non-JSON response from server.')));
        const zoneList = data.data?.zones || data.data || [];
        setZones(zoneList);
      } else {
        const errData = await (response.headers.get('content-type')?.includes('json') ? response.json() : Promise.reject(new Error('Invalid non-JSON response from server.')));
        console.error(`Error fetching ${courier} zones:`, errData.error);
      }
    } catch (error: any) {
      console.error(`Error fetching ${courier} zones:`, error.message);
    } finally {
      setLoadingLocations(false);
    }
  };

  const fetchAreas = async (zoneId: string) => {
    setLoadingLocations(true);
    setAreas([]);
    const courier = deliveryForm.courier.toLowerCase();
    // Carrybee needs cityId too, but our API proxy handles it if we pass it or if the adapter knows it.
    // Actually, the Carrybee adapter's getAreas(zoneId, cityId) needs both.
    // Let's check how the server route is defined.
    // app.get('/api/couriers/areas/:courier/:zoneId', ...)
    
    try {
      const url = courier === 'carrybee' 
        ? `/api/couriers/areas/${courier}/${zoneId}?cityId=${deliveryForm.city_id}`
        : `/api/couriers/areas/${courier}/${zoneId}`;
        
      const response = await fetch(url);
      if (response.ok) {
        const data = await (response.headers.get('content-type')?.includes('json') ? response.json() : Promise.reject(new Error('Invalid non-JSON response from server.')));
        const areaList = data.data?.areas || data.data || [];
        setAreas(areaList);
      } else {
        const errData = await (response.headers.get('content-type')?.includes('json') ? response.json() : Promise.reject(new Error('Invalid non-JSON response from server.')));
        console.error(`Error fetching ${courier} areas:`, errData.error);
      }
    } catch (error: any) {
      console.error(`Error fetching ${courier} areas:`, error.message);
    } finally {
      setLoadingLocations(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    const qDeliveries = query(collection(db, 'deliveries'), orderBy('createdAt', 'desc'));
    const qCouriers = query(collection(db, 'couriers'), orderBy('name', 'asc'));
    
    const unsubscribeDeliveries = onSnapshot(qDeliveries, (snapshot) => {
      const deliveryData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Delivery[];
      setDeliveries(deliveryData);
      setLoading(false);
    }, (error) => {
      if (error.code !== 'permission-denied') {
        handleFirestoreError(error, OperationType.LIST, 'deliveries');
      }
      setLoading(false);
    });

    const unsubscribeCouriers = onSnapshot(qCouriers, (snapshot) => {
      const courierData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Courier[];
      setCouriers(courierData);
    }, (error) => {
      if (error.code !== 'permission-denied') {
        handleFirestoreError(error, OperationType.LIST, 'couriers');
      }
    });

    // Fetch pending orders for the new tab
    const qPending = query(
      collection(db, 'orders'), 
      where('status', 'in', ['confirmed', 'processing']),
      orderBy('createdAt', 'desc')
    );
    const unsubscribePending = onSnapshot(qPending, (snapshot) => {
      const pendingData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as any)).filter(o => !o.trackingNumber); // Only those without tracking
      setPendingOrders(pendingData);
    }, (error) => {
      if (error.code !== 'permission-denied') {
        handleFirestoreError(error, OperationType.LIST, 'orders');
      }
    });

    return () => {
      unsubscribeDeliveries();
      unsubscribeCouriers();
      unsubscribePending();
    };
  }, [user]);

  const handleBulkBook = async () => {
    const activeCouriers = Object.entries(courierConfigs)
      .filter(([_, config]: [string, any]) => config.isActive)
      .map(([name]) => name);

    if (activeCouriers.length === 0) {
      toast.error("No active couriers found. Please configure couriers first.");
      return;
    }

    const courierToUse = activeCouriers[0]; // Default to first active courier
    
    setConfirmConfig({
      isOpen: true,
      title: 'Bulk Book Orders',
      message: `Are you sure you want to book ${selectedPendingOrders.length} orders with ${courierToUse.toUpperCase()}?`,
      onConfirm: async () => {
        let successCount = 0;
        let failCount = 0;

        for (const orderId of selectedPendingOrders) {
          const order = pendingOrders.find(o => o.id === orderId);
          if (!order) continue;

          try {
            const response = await fetch(`/api/couriers/send-order/${courierToUse}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                invoice: order.orderNumber || order.id.slice(0, 8),
                recipient_name: order.customerName,
                recipient_phone: order.customerPhone.replace(/\D/g, '').slice(-11),
                recipient_address: order.customerAddress,
                cod_amount: order.dueAmount || 0,
                note: order.notes || '',
                district: order.district || '',
                area: order.area || '',
                weight: 0.5,
                recipient_city: order.pathao_city_id,
                recipient_zone: order.pathao_zone_id,
                recipient_area: order.pathao_area_id,
              })
            });

            if (response.ok) {
              const result = await (response.headers.get('content-type')?.includes('json') ? response.json() : Promise.reject(new Error('Invalid non-JSON response from server.')));
              if (result.success) {
                // Update order in Firestore
                await updateDoc(doc(db, 'orders', order.id), {
                  courierName: courierToUse,
                  trackingNumber: result.tracking_code || result.consignment_id || '',
                  status: 'shipped',
                  logs: [
                    ...(order.logs || []),
                    {
                      user: auth.currentUser?.email,
                      action: 'Sent to Courier (Bulk)',
                      timestamp: Timestamp.now(),
                      details: `Sent to ${courierToUse} via Logistics Bulk Book`
                    }
                  ]
                });

                // Add to deliveries
                await addDoc(collection(db, 'deliveries'), {
                  orderId: order.id,
                  orderNumber: order.orderNumber,
                  courier: courierToUse,
                  status: 'In Transit',
                  location: 'Pending Pickup',
                  eta: '2-3 Days',
                  trackingCode: result.tracking_code || result.consignment_id || '',
                  uid: auth.currentUser!.uid,
                  createdAt: serverTimestamp()
                });

                successCount++;
              } else {
                failCount++;
              }
            } else {
              failCount++;
            }
          } catch (error) {
            console.error(`Error booking order ${orderId}:`, error);
            failCount++;
          }
        }

        toast.success(`Bulk booking complete: ${successCount} success, ${failCount} failed.`);
        setSelectedPendingOrders([]);
      }
    });
  };

  const handleSyncStatus = async (delivery: Delivery) => {
    if (!delivery.courier || !delivery.id) return;

    toast.loading(`Syncing status with ${delivery.courier}...`, { id: 'sync-status' });
    try {
      const response = await fetch(`/api/couriers/track/${delivery.courier.toLowerCase()}/${delivery.trackingCode || delivery.id}`);
      const data = await (response.headers.get('content-type')?.includes('json') ? response.json() : Promise.reject(new Error('Invalid non-JSON response from server.')));
      
      if (response.ok) {
        // Map courier-specific status to our app status
        let rawStatus = data.delivery_status || data.status;
        
        const statusMap: Record<string, string> = {
          'pending': 'pending_pickup',
          'delivered': 'delivered',
          'cancelled': 'cancelled',
          'in_transit': 'in_transit',
          'hold': 'hold',
          'return': 'returned',
          'delivered_approval_pending': 'delivered'
        };

        const newStatus = statusMap[rawStatus] || rawStatus;
        
        await updateDoc(doc(db, 'deliveries', delivery.id), {
          status: newStatus,
          updatedAt: serverTimestamp()
        });

        // Also update the order status if needed
        if (delivery.orderId) {
          const orderRef = doc(db, 'orders', delivery.orderId);
          const orderSnap = await getDoc(orderRef);
          if (orderSnap.exists()) {
            const orderStatusMap: Record<string, string> = {
              'delivered': 'delivered',
              'cancelled': 'cancelled',
              'in_transit': 'shipped'
            };
            if (orderStatusMap[rawStatus]) {
              await updateDoc(orderRef, { status: orderStatusMap[rawStatus] });
            }
          }
        }

        toast.success(`Status updated: ${newStatus}`, { id: 'sync-status' });
      } else {
        throw new Error(data.error || 'Failed to sync status');
      }
    } catch (error: any) {
      console.error('Sync status error:', error);
      toast.error('Failed to sync status.', { id: 'sync-status' });
    }
  };

  const handleOpenAddCourierModal = () => {
    setEditingCourier(null);
    setCourierForm({ name: '', active: true });
    setIsModalOpen(true);
  };

  const handleOpenEditCourierModal = (courier: Courier) => {
    setEditingCourier(courier);
    setCourierForm({ name: courier.name, active: courier.active });
    setIsModalOpen(true);
  };

  const handleCourierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    try {
      const data = {
        ...courierForm,
        updatedAt: serverTimestamp()
      };

      if (editingCourier) {
        await updateDoc(doc(db, 'couriers', editingCourier.id), data);
      } else {
        await addDoc(collection(db, 'couriers'), {
          ...data,
          orders: 0,
          success: '100%',
          createdAt: serverTimestamp(),
          uid: auth.currentUser.uid
        });
      }
      setIsModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, editingCourier ? OperationType.UPDATE : OperationType.CREATE, 'couriers');
    }
  };

  const handleOpenAddDeliveryModal = () => {
    setEditingDelivery(null);
    setDeliveryForm({
      orderId: '',
      courier: couriers[0]?.name || '',
      status: 'in_transit',
      location: '',
      eta: '2-3 Days',
      city_id: '',
      zone_id: '',
      area_id: '',
    });
    setCities([]);
    setZones([]);
    setAreas([]);
    setIsDeliveryModalOpen(true);
  };

  const handleOpenEditDeliveryModal = (delivery: Delivery) => {
    setEditingDelivery(delivery);
    setDeliveryForm({
      orderId: delivery.orderId,
      courier: delivery.courier,
      status: delivery.status,
      location: delivery.location,
      eta: delivery.eta,
      city_id: (delivery as any).city_id || '',
      zone_id: (delivery as any).zone_id || '',
      area_id: (delivery as any).area_id || '',
    });
    setIsDeliveryModalOpen(true);
  };

  const handleDeliverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    try {
      const data = {
        ...deliveryForm,
        updatedAt: serverTimestamp()
      };

      if (editingDelivery) {
        await updateDoc(doc(db, 'deliveries', editingDelivery.id), data);
      } else {
        await addDoc(collection(db, 'deliveries'), {
          ...data,
          createdAt: serverTimestamp(),
          uid: auth.currentUser.uid
        });
      }
      setIsDeliveryModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, editingDelivery ? OperationType.UPDATE : OperationType.CREATE, 'deliveries');
    }
  };

  const handleDeleteDelivery = async (id: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Delete Shipment',
      message: 'Are you sure you want to delete this delivery? This action cannot be undone.',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'deliveries', id));
          toast.success('Delivery deleted');
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `deliveries/${id}`);
        }
      }
    });
  };

  const handleDeleteCourier = async (id: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Delete Courier',
      message: 'Are you sure you want to delete this courier? This action cannot be undone.',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'couriers', id));
          toast.success('Courier deleted');
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `couriers/${id}`);
        }
      }
    });
  };

  const handleSaveConfigs = async () => {
    setIsSaving(true);
    try {
      // Save each courier config to backend
      for (const [courier, config] of Object.entries(courierConfigs)) {
        const response = await fetch(`/api/couriers/configs/${courier}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config)
        });
        if (!response.ok) {
          const errorData = await (response.headers.get('content-type')?.includes('json') ? response.json() : Promise.reject(new Error('Invalid non-JSON response from server.')));
          throw new Error(errorData.error || `Failed to save ${courier} config`);
        }
      }
      toast.success('Courier configs saved successfully!');
    } catch (error: any) {
      console.error('Error saving configs:', error);
      toast.error('Failed to save courier configurations: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportCSV = () => {
    if (deliveries.length === 0) {
      toast.error('No deliveries to export');
      return;
    }

    const headers = ['ID', 'Order ID', 'Courier', 'Status', 'Location', 'ETA', 'Created At'];
    const csvRows = [headers.join(',')];

    deliveries.forEach(delivery => {
      const mappedOrderId = delivery.orderId.startsWith('woo_') ? delivery.orderId : 
            ((delivery.orderNumber ?? orderMap[delivery.orderId]) && (delivery.orderNumber ?? orderMap[delivery.orderId]) !== -1
               ? `#${delivery.orderNumber ?? orderMap[delivery.orderId]}` 
               : delivery.orderId);

      const row = [
        delivery.id,
        mappedOrderId || '',
        delivery.courier || '',
        delivery.status || '',
        `"${delivery.location || ''}"`,
        delivery.eta || '',
        delivery.createdAt?.toDate ? delivery.createdAt.toDate().toLocaleString() : (delivery.createdAt?.seconds ? new Date(delivery.createdAt.seconds * 1000).toLocaleString() : 'N/A')
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `deliveries_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Deliveries exported successfully');
  };

  const filteredDeliveries = useMemo(() => deliveries.filter(delivery => {
    const mappedOrderNum = delivery.orderNumber ?? orderMap[delivery.orderId] ?? '';
    const searchableOrderNum = String(mappedOrderNum).toLowerCase();
    const searchLower = searchTerm.toLowerCase();
    
    return delivery.id.toLowerCase().includes(searchLower) ||
    delivery.orderId.toLowerCase().includes(searchLower) ||
    searchableOrderNum.includes(searchLower) ||
    delivery.courier.toLowerCase().includes(searchLower) ||
    delivery.location.toLowerCase().includes(searchLower);
  }), [deliveries, orderMap, searchTerm]);

  const courierStats = useMemo(() => {
    const stats: Record<string, { total: number; delivered: number }> = {};
    deliveries.forEach(d => {
      if (!stats[d.courier]) {
        stats[d.courier] = { total: 0, delivered: 0 };
      }
      stats[d.courier].total++;
      if (d.status.toLowerCase() === 'delivered') {
        stats[d.courier].delivered++;
      }
    });
    return stats;
  }, [deliveries]);

  const handleSyncAll = async () => {
    const activeDeliveries = deliveries.filter(d => 
      !['delivered', 'cancelled', 'returned'].includes(d.status.toLowerCase())
    );
    
    if (activeDeliveries.length === 0) {
      toast.info("No active shipments to sync.");
      return;
    }

    toast.loading(`Syncing ${activeDeliveries.length} shipments...`, { id: 'sync-all' });
    let success = 0;
    for (const delivery of activeDeliveries) {
      try {
        await handleSyncStatus(delivery);
        success++;
      } catch (e) {
        console.error(e);
      }
    }
    toast.success(`Synced ${success} of ${activeDeliveries.length} shipments.`, { id: 'sync-all' });
  };

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredDeliveries.length / itemsPerPage);
  const currentDeliveries = filteredDeliveries.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getCourierStatsData = useCallback((courierName: string) => {
    const courierDeliveries = deliveries.filter(d => d.courier.toLowerCase() === courierName.toLowerCase());
    const ordersSynced = courierDeliveries.length;
    
    // Find most recent log for this courier
    const latestLog = courierLogs
      .filter(log => log.courier.toLowerCase() === courierName.toLowerCase())
      .sort((a, b) => {
         const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : 0;
         const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : 0;
         return timeB - timeA;
      })[0];
    
    let lastSyncText = '—';
    const setSyncText = (time: Date) => {
      const diff = Math.floor((new Date().getTime() - time.getTime()) / 60000);
      if (diff < 1) lastSyncText = 'Just now';
      else if (diff < 60) lastSyncText = `${diff} min ago`;
      else if (diff < 1440) lastSyncText = `${Math.floor(diff / 60)} hrs ago`;
      else lastSyncText = `${Math.floor(diff / 1440)} days ago`;
    };

    if (latestLog?.timestamp?.toDate) {
      setSyncText(latestLog.timestamp.toDate());
    } else if (courierDeliveries.length > 0) {
      const latestDelivery = [...courierDeliveries].sort((a, b) => {
        const timeA = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : (a.createdAt?.toMillis ? a.createdAt.toMillis() : 0);
        const timeB = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : (b.createdAt?.toMillis ? b.createdAt.toMillis() : 0);
        return timeB - timeA;
      })[0];
      if (latestDelivery) {
         const time = latestDelivery.updatedAt?.toDate ? latestDelivery.updatedAt.toDate() : (latestDelivery.createdAt?.toDate ? latestDelivery.createdAt.toDate() : null);
         if (time) setSyncText(time);
      }
    }

    return {
      ordersSynced: ordersSynced > 0 ? ordersSynced.toLocaleString() : '0',
      lastSyncText
    };
  }, [deliveries, courierLogs]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-6">
        {/* Title and Top Actions */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="shrink-0">
            <h2 className="text-3xl font-bold text-primary tracking-tight">Logistics & Delivery</h2>
            <p className="text-sm text-secondary mt-1 pb-2">Track shipments, manage couriers, and optimize delivery operations.</p>
          </div>
          
          <div className="flex items-center gap-3 overflow-x-auto pb-2 xl:pb-0 hide-scrollbar w-full xl:w-auto">
            <button 
              onClick={handleExportCSV}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-surface border border-border rounded-lg text-[13px] font-semibold hover:bg-surface-hover transition-colors shrink-0"
            >
              <Download size={16} />
              Export CSV
            </button>
            <button 
              onClick={handleOpenAddDeliveryModal}
              className="flex items-center justify-center gap-2 px-5 py-2 bg-brand text-white rounded-lg text-[13px] font-semibold hover:bg-brand-hover transition-colors shadow-subtle cursor-pointer shrink-0"
            >
              <Plus size={16} />
              Add Shipment
            </button>
            <button 
              onClick={handleOpenAddCourierModal}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-surface border border-border rounded-lg text-[13px] font-semibold hover:bg-surface-hover transition-colors shrink-0"
            >
              <Plus size={16} />
              Connect Courier
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 hide-scrollbar w-full border-b border-transparent">
          <button 
            onClick={() => setActiveSubTab('shipments')}
            className={`px-5 py-2.5 rounded-lg text-[13px] font-semibold transition-all shrink-0 border ${activeSubTab === 'shipments' ? 'bg-surface text-brand border-border border-b-[#0066FF] border-b-[3px]' : 'bg-surface text-secondary border-border hover:bg-surface-hover'}`}
          >
            Shipments
          </button>
          <button 
            onClick={() => setActiveSubTab('pending')}
            className={`px-5 py-2.5 rounded-lg text-[13px] font-semibold transition-all shrink-0 flex items-center gap-2 border ${activeSubTab === 'pending' ? 'bg-surface text-brand border-border border-b-[#0066FF] border-b-[3px]' : 'bg-surface text-secondary border-border hover:bg-surface-hover'}`}
          >
            Pending Ready-to-Ship
            <span className={`px-2 py-0.5 text-[11px] rounded-full font-bold ${activeSubTab === 'pending' ? 'bg-brand/20 text-brand' : 'bg-brand/10 text-brand'}`}>
              {pendingOrders.length}
            </span>
          </button>
          <button 
            onClick={() => setActiveSubTab('couriers')}
            className={`px-5 py-2.5 rounded-lg text-[13px] font-semibold transition-all shrink-0 border ${activeSubTab === 'couriers' ? 'bg-surface text-brand border-border border-b-[#0066FF] border-b-[3px]' : 'bg-surface text-secondary border-border hover:bg-surface-hover'}`}
          >
            Courier Partners
          </button>
          <button 
            onClick={() => setActiveSubTab('reconciliation')}
            className={`px-5 py-2.5 rounded-lg text-[13px] font-semibold transition-all shrink-0 border ${activeSubTab === 'reconciliation' ? 'bg-surface text-brand border-border border-b-[#0066FF] border-b-[3px]' : 'bg-surface text-secondary border-border hover:bg-surface-hover'}`}
          >
            Charge Reconciliation
          </button>
          <button 
            onClick={() => setActiveSubTab('logs')}
            className={`px-5 py-2.5 rounded-lg text-[13px] font-semibold transition-all shrink-0 border ${activeSubTab === 'logs' ? 'bg-surface text-brand border-border border-b-[#0066FF] border-b-[3px]' : 'bg-surface text-secondary border-border hover:bg-surface-hover'}`}
          >
            API Logs
          </button>
        </div>
      </div>

       {activeSubTab === 'reconciliation' && (
         <div className="animate-in fade-in duration-300">
            <CourierReconciliation />
         </div>
       )}

       {activeSubTab === 'couriers' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-xl font-bold text-primary tracking-tight">Available Integrations</h3>
              <p className="text-sm text-secondary mt-1">Connect and configure your delivery partners</p>
            </div>
            <button 
              onClick={handleSaveConfigs}
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2.5 bg-brand text-white rounded-xl text-sm font-semibold hover:bg-blue-700 active:scale-[0.98] transition-all shadow-subtle disabled:opacity-50"
            >
              {isSaving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
              {isSaving ? 'Saving...' : 'Save Configurations'}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6">
            <CourierCard
              courierKey="steadfast"
              name="Steadfast Courier"
              subtitle="Automated delivery for Bangladesh"
              iconInitials="ST"
              iconColor="bg-[#0052CC]"
              isActive={!!courierConfigs.steadfast?.isActive}
              onToggleActive={() => setCourierConfigs(prev => ({ ...prev, steadfast: { ...prev.steadfast, isActive: !prev.steadfast?.isActive } }))}
              isExpanded={expandedConfig === 'steadfast'}
              onToggleExpand={() => setExpandedConfig(expandedConfig === 'steadfast' ? null : 'steadfast')}
              lastSync={getCourierStatsData('steadfast').lastSyncText}
              ordersSynced={getCourierStatsData('steadfast').ordersSynced}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-secondary uppercase tracking-widest">API Key</label>
                  <input 
                    type="text" 
                    value={courierConfigs.steadfast?.apiKey || ''} 
                    onChange={e => setCourierConfigs(prev => ({ ...prev, steadfast: { ...prev.steadfast, apiKey: e.target.value } }))}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all shadow-subtle" 
                    placeholder="Enter API Key"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-secondary uppercase tracking-widest">Secret Key</label>
                  <input 
                    type="password" 
                    value={courierConfigs.steadfast?.secretKey || ''} 
                    onChange={e => setCourierConfigs(prev => ({ ...prev, steadfast: { ...prev.steadfast, secretKey: e.target.value } }))}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all shadow-subtle" 
                    placeholder="Enter Secret Key"
                  />
                </div>
              </div>
            </CourierCard>

            {/* Pathao */}
            <CourierCard
              courierKey="pathao"
              name="Pathao Courier"
              subtitle="Fast and reliable delivery service"
              iconInitials="PA"
              iconColor="bg-[#EA580C]"
              isActive={!!courierConfigs.pathao?.isActive}
              onToggleActive={() => setCourierConfigs(prev => ({ ...prev, pathao: { ...prev.pathao, isActive: !prev.pathao?.isActive } }))}
              isExpanded={expandedConfig === 'pathao'}
              onToggleExpand={() => setExpandedConfig(expandedConfig === 'pathao' ? null : 'pathao')}
              lastSync={getCourierStatsData('pathao').lastSyncText}
              ordersSynced={getCourierStatsData('pathao').ordersSynced}
            >
              <div className="flex items-center gap-6 mb-4">
                <label className="flex items-center gap-2 cursor-pointer group/sandbox">
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={courierConfigs.pathao?.isSandbox || false}
                      onChange={e => setCourierConfigs(prev => ({ ...prev, pathao: { ...prev.pathao, isSandbox: e.target.checked } }))}
                    />
                    <div className="w-4 h-4 border-2 border-border rounded peer-checked:bg-[#EA580C] peer-checked:border-[#EA580C] transition-colors"></div>
                    <svg className="absolute w-4 h-4 text-white p-0.5 opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                    </svg>
                  </div>
                  <span className="text-[11px] font-bold text-secondary group-hover/sandbox:text-primary uppercase tracking-widest transition-colors">Sandbox Mode</span>
                </label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-secondary uppercase tracking-widest">Client ID</label>
                  <input 
                    type="text" 
                    value={courierConfigs.pathao?.clientId || ''} 
                    onChange={e => setCourierConfigs(prev => ({ ...prev, pathao: { ...prev.pathao, clientId: e.target.value } }))}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all shadow-subtle" 
                    placeholder="Enter Client ID"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-secondary uppercase tracking-widest">Client Secret</label>
                  <input 
                    type="password" 
                    value={courierConfigs.pathao?.clientSecret || ''} 
                    onChange={e => setCourierConfigs(prev => ({ ...prev, pathao: { ...prev.pathao, clientSecret: e.target.value } }))}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all shadow-subtle" 
                    placeholder="Enter Client Secret"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-secondary uppercase tracking-widest">Email (Username)</label>
                  <input 
                    type="text" 
                    value={courierConfigs.pathao?.username || ''} 
                    onChange={e => setCourierConfigs(prev => ({ ...prev, pathao: { ...prev.pathao, username: e.target.value } }))}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all shadow-subtle" 
                    placeholder="email@example.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-secondary uppercase tracking-widest">Password</label>
                  <input 
                    type="password" 
                    value={courierConfigs.pathao?.password || ''} 
                    onChange={e => setCourierConfigs(prev => ({ ...prev, pathao: { ...prev.pathao, password: e.target.value } }))}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all shadow-subtle" 
                    placeholder="Enter Password"
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[11px] font-bold text-secondary uppercase tracking-widest">Store ID</label>
                  <input 
                    type="text" 
                    value={courierConfigs.pathao?.storeId || ''} 
                    onChange={e => setCourierConfigs(prev => ({ ...prev, pathao: { ...prev.pathao, storeId: e.target.value } }))}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all shadow-subtle" 
                    placeholder="Enter Pathao Store ID"
                  />
                </div>
              </div>
            </CourierCard>

            {/* RedX */}
            <CourierCard
              courierKey="redx"
              name="RedX"
              subtitle="Logistics for modern businesses"
              iconInitials="RE"
              iconColor="bg-[#DC2626]"
              isActive={!!courierConfigs.redx?.isActive}
              onToggleActive={() => setCourierConfigs(prev => ({ ...prev, redx: { ...prev.redx, isActive: !prev.redx?.isActive } }))}
              isExpanded={expandedConfig === 'redx'}
              onToggleExpand={() => setExpandedConfig(expandedConfig === 'redx' ? null : 'redx')}
              lastSync={getCourierStatsData('redx').lastSyncText}
              ordersSynced={getCourierStatsData('redx').ordersSynced}
            >
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-secondary uppercase tracking-widest">API Key</label>
                <input 
                  type="text" 
                  value={courierConfigs.redx?.apiKey || ''} 
                  onChange={e => setCourierConfigs(prev => ({ ...prev, redx: { ...prev.redx, apiKey: e.target.value } }))}
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all shadow-subtle" 
                  placeholder="Enter API Key"
                />
              </div>
            </CourierCard>
            <CourierCard
              courierKey="carrybee"
              name="Carrybee"
              subtitle="Fast and secure delivery"
              iconInitials="CA"
              iconColor="bg-[#EAB308]"
              isActive={!!courierConfigs.carrybee?.isActive}
              onToggleActive={() => setCourierConfigs(prev => ({ ...prev, carrybee: { ...prev.carrybee, isActive: !prev.carrybee?.isActive } }))}
              isExpanded={expandedConfig === 'carrybee'}
              onToggleExpand={() => setExpandedConfig(expandedConfig === 'carrybee' ? null : 'carrybee')}
              lastSync={getCourierStatsData('carrybee').lastSyncText}
              ordersSynced={getCourierStatsData('carrybee').ordersSynced}
            >
              <div className="flex items-center gap-6 mb-4">
                <label className="flex items-center gap-2 cursor-pointer group/sandbox">
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={courierConfigs.carrybee?.isSandbox || false}
                      onChange={e => setCourierConfigs(prev => ({ ...prev, carrybee: { ...prev.carrybee, isSandbox: e.target.checked } }))}
                    />
                    <div className="w-4 h-4 border-2 border-border rounded peer-checked:bg-[#EAB308] peer-checked:border-[#EAB308] transition-colors"></div>
                    <svg className="absolute w-4 h-4 text-white p-0.5 opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                    </svg>
                  </div>
                  <span className="text-[11px] font-bold text-secondary group-hover/sandbox:text-primary uppercase tracking-widest transition-colors">Sandbox Mode</span>
                </label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[11px] font-bold text-secondary uppercase tracking-widest">Store ID</label>
                  <input 
                    type="text" 
                    value={courierConfigs.carrybee?.storeId || ''} 
                    onChange={e => setCourierConfigs(prev => ({ ...prev, carrybee: { ...prev.carrybee, storeId: e.target.value } }))}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all shadow-subtle" 
                    placeholder="Enter Store ID"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-secondary uppercase tracking-widest">Email</label>
                  <input 
                    type="text" 
                    value={courierConfigs.carrybee?.email || ''} 
                    onChange={e => setCourierConfigs(prev => ({ ...prev, carrybee: { ...prev.carrybee, email: e.target.value } }))}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all shadow-subtle" 
                    placeholder="email@example.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-secondary uppercase tracking-widest">Password</label>
                  <input 
                    type="password" 
                    value={courierConfigs.carrybee?.password || ''} 
                    onChange={e => setCourierConfigs(prev => ({ ...prev, carrybee: { ...prev.carrybee, password: e.target.value } }))}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all shadow-subtle" 
                    placeholder="Enter Password"
                  />
                </div>
              </div>
            </CourierCard>
            {/* Paperfly */}
            <CourierCard
              courierKey="paperfly"
              name="Paperfly"
              subtitle="Smart logistics for smart businesses"
              iconInitials="PA"
              iconColor="bg-[#4F46E5]"
              isActive={!!courierConfigs.paperfly?.isActive}
              onToggleActive={() => setCourierConfigs(prev => ({ ...prev, paperfly: { ...prev.paperfly, isActive: !prev.paperfly?.isActive } }))}
              isExpanded={expandedConfig === 'paperfly'}
              onToggleExpand={() => setExpandedConfig(expandedConfig === 'paperfly' ? null : 'paperfly')}
              lastSync={getCourierStatsData('paperfly').lastSyncText}
              ordersSynced={getCourierStatsData('paperfly').ordersSynced}
            >
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-secondary uppercase tracking-widest">API Key</label>
                <input 
                  type="text" 
                  value={courierConfigs.paperfly?.apiKey || ''} 
                  onChange={e => setCourierConfigs(prev => ({ ...prev, paperfly: { ...prev.paperfly, apiKey: e.target.value } }))}
                  className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all shadow-subtle" 
                  placeholder="Enter API Key"
                />
              </div>
            </CourierCard>
          </div>
            
          {/* OTHER CUSTOM COURIERS HEADER */}
          <div className="pt-8 mb-4 border-t border-border mt-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-primary tracking-tight">Manual Couriers</h3>
                <p className="text-sm text-secondary mt-1">Manage couriers that are not directly integrated via API</p>
              </div>
              <button 
                onClick={handleOpenAddCourierModal}
                className="flex items-center gap-2 px-4 py-2.5 bg-brand/10 text-brand-hover hover:bg-brand/20 rounded-xl text-sm font-semibold transition-colors"
              >
                <Plus size={16} /> Add Custom Courier
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {couriers.filter(c => !['steadfast', 'pathao', 'redx', 'carrybee', 'paperfly'].includes(c.name.toLowerCase())).map((courier) => (
              <div key={courier.id} className="bg-surface p-5 rounded-3xl border border-border shadow-subtle hover:shadow-premium transition-shadow relative group">
                <div className="absolute top-4 right-4 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => handleOpenEditCourierModal(courier)}
                    className="p-2 text-muted hover:text-brand hover:bg-brand/10 rounded-xl transition-colors"
                  >
                    <Edit size={16} />
                  </button>
                  <button 
                    onClick={() => handleDeleteCourier(courier.id)}
                    className="p-2 text-muted hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-12 h-12 rounded-2xl bg-surface-hover border border-border flex items-center justify-center text-secondary font-bold shadow-inner border-b-2">
                    <Truck size={20} className="text-muted" />
                  </div>
                  <div>
                    <h4 className="font-bold text-primary text-sm leading-tight">{courier.name}</h4>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className={`w-2 h-2 rounded-full ${courier.active ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-gray-300'}`}></div>
                      <span className="text-[10px] uppercase font-bold tracking-widest text-secondary">{courier.active ? 'Active' : 'Inactive'}</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted tracking-widest mb-1">Total</p>
                    <p className="text-xl font-bold text-primary">{courierStats[courier.name]?.total || 0}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-bold text-muted tracking-widest mb-1">Success</p>
                    <p className="text-sm font-bold text-green-600 mt-2">
                      {courierStats[courier.name]?.total > 0 
                        ? `${Math.round((courierStats[courier.name].delivered / courierStats[courier.name].total) * 100)}%`
                        : '100%'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSubTab === 'logs' && (
        <div className="bg-surface rounded-xl border border-border shadow-subtle overflow-hidden">
          <div className="p-4 border-b border-border bg-surface-hover/50 flex justify-between items-center">
            <h4 className="text-sm font-bold text-primary">Courier API Logs</h4>
            <button 
              onClick={() => setActiveSubTab('logs')}
              className="p-1 hover:bg-surface-hover rounded-md transition-all"
            >
              <RefreshCw size={14} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[800px] whitespace-nowrap">
              <thead>
                <tr className="bg-surface-hover text-[10px] uppercase font-bold text-muted tracking-wider">
                  <th className="px-6 py-3">Timestamp</th>
                  <th className="px-6 py-3">Courier</th>
                  <th className="px-6 py-3">Order ID</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {courierLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-surface-hover transition-colors">
                    <td className="px-6 py-4 text-xs text-secondary">
                      {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-primary uppercase">{log.courier}</span>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-secondary">#{log.orderId}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                        log.status === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                      }`}>
                        {log.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">

                    </td>
                  </tr>
                ))}
                {courierLogs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-sm text-muted">
                      No logs found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === 'pending' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-surface p-4 rounded-2xl border border-[#f3f4f6] shadow-subtle">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-brand/10 text-brand rounded-xl">
                <Truck size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-primary">Pending Shipments</h3>
                <p className="text-xs text-secondary">Orders ready to be sent to courier partners.</p>
              </div>
            </div>
            {selectedPendingOrders.length > 0 && (
              <button 
                onClick={handleBulkBook}
                className="flex items-center gap-2 px-6 py-2.5 bg-brand text-white rounded-xl text-sm font-bold hover:bg-brand-hover transition-all shadow-lg"
              >
                <Zap size={16} />
                Bulk Book ({selectedPendingOrders.length})
              </button>
            )}
          </div>

          <div className="bg-surface rounded-2xl border border-[#f3f4f6] shadow-subtle overflow-hidden">
            <table className="w-full text-left border-collapse min-w-[800px] whitespace-nowrap">
              <thead>
                <tr className="border-b border-[#f9fafb] bg-[#f9fafb]/50">
                  <th className="px-6 py-4">
                    <input 
                      type="checkbox" 
                      className="rounded border-[#d1d5db]"
                      checked={selectedPendingOrders.length === pendingOrders.length && pendingOrders.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedPendingOrders(pendingOrders.map(o => o.id));
                        else setSelectedPendingOrders([]);
                      }}
                    />
                  </th>
                  <th className="px-6 py-4 text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider">Order</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider">Address</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-[#9ca3af] uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f9fafb]">
                {pendingOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-muted text-sm italic">
                      No pending shipments found.
                    </td>
                  </tr>
                ) : (
                  pendingOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-[#f9fafb]/50 transition-colors group">
                      <td className="px-6 py-4">
                        <input 
                          type="checkbox" 
                          className="rounded border-[#d1d5db]"
                          checked={selectedPendingOrders.includes(order.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedPendingOrders([...selectedPendingOrders, order.id]);
                            else setSelectedPendingOrders(selectedPendingOrders.filter(id => id !== order.id));
                          }}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-primary">#{order.orderNumber || order.id.slice(0, 8)}</span>
                          <span className="text-[10px] text-[#9ca3af]">{order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString() : 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-primary">{order.customerName}</span>
                          <span className="text-[10px] text-[#9ca3af]">{order.customerPhone}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] text-[#6b7280] line-clamp-1 max-w-[200px]">{order.customerAddress}</span>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-primary">
                        {currencySymbol || '৳'}{(order.totalAmount || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          order.status === 'confirmed' ? 'bg-green-50 text-green-600' : 'bg-brand/10 text-brand'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === 'shipments' && (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-surface rounded-xl border border-border p-5 flex flex-col justify-between shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
              <div className="flex gap-4 mb-4">
                <div className="w-[45px] h-[45px] rounded-2xl bg-brand/10/80 flex items-center justify-center text-brand">
                  <Navigation size={22} strokeWidth={2} />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-secondary mb-0.5">Total Shipments</p>
                  <h3 className="text-2xl font-bold text-primary leading-tight">{deliveries.length.toLocaleString()}</h3>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-[11px] font-bold text-[#1DAB61] bg-[#1DAB61]/10 px-2 py-0.5 rounded-[4px]">
                  <Activity size={10} /> Live Data
                </span>
                <span className="text-[11px] text-muted font-medium">real-time sync</span>
              </div>
            </div>

            <div className="bg-surface rounded-xl border border-border p-5 flex flex-col justify-between shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
              <div className="flex gap-4 mb-4">
                <div className="w-[45px] h-[45px] rounded-2xl bg-orange-50 flex items-center justify-center text-orange-500">
                  <Activity size={22} strokeWidth={2} />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-secondary mb-0.5">In Transit</p>
                  <h3 className="text-2xl font-bold text-primary leading-tight">
                    {deliveries.filter(d => 
                      d.status.toLowerCase().includes('transit') || 
                      d.status.toLowerCase().includes('pickup') || 
                      d.status.toLowerCase() === 'pending_pickup'
                    ).length.toLocaleString()}
                  </h3>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-[11px] font-bold text-[#1DAB61] bg-[#1DAB61]/10 px-2 py-0.5 rounded-[4px]">
                  <Activity size={10} /> Active
                </span>
                <span className="text-[11px] text-muted font-medium">currently moving</span>
              </div>
            </div>

            <div className="bg-surface rounded-xl border border-border p-5 flex flex-col justify-between shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
              <div className="flex gap-4 mb-4">
                <div className="w-[45px] h-[45px] rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600">
                  <CheckCircle2 size={22} strokeWidth={2} />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-secondary mb-0.5">Delivered</p>
                  <h3 className="text-2xl font-bold text-primary leading-tight">
                    {deliveries.filter(d => d.status.toLowerCase() === 'delivered').length.toLocaleString()}
                  </h3>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-[11px] font-bold text-[#1DAB61] bg-[#1DAB61]/10 px-2 py-0.5 rounded-[4px]">
                  <CheckCircle2 size={10} /> Completed
                </span>
                <span className="text-[11px] text-muted font-medium">successfully delivered</span>
              </div>
            </div>

            <div className="bg-surface rounded-xl border border-border p-5 flex flex-col justify-between shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
              <div className="flex gap-4 mb-4">
                <div className="w-[45px] h-[45px] rounded-2xl bg-red-50 flex items-center justify-center text-red-500">
                  <XCircle size={22} strokeWidth={2} />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-secondary mb-0.5">Failed / Returned</p>
                  <h3 className="text-2xl font-bold text-primary leading-tight">
                    {deliveries.filter(d => 
                      d.status.toLowerCase().includes('returned') || 
                      d.status.toLowerCase().includes('failed') || 
                      d.status.toLowerCase() === 'cancelled'
                    ).length.toLocaleString()}
                  </h3>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-[11px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-[4px]">
                  <XCircle size={10} /> Issues
                </span>
                <span className="text-[11px] text-muted font-medium">needs attention</span>
              </div>
            </div>
          </div>

      {/* Search & Filter */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative w-full md:min-w-[400px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" size={16} />
            <input
              type="text"
              placeholder="Search by Tracking ID, Order ID, Courier..."
              className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-lg text-[13px] focus:border-brand outline-none transition-all shadow-subtle"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="p-2.5 bg-surface border border-border rounded-lg text-secondary hover:bg-surface-hover transition-colors shadow-subtle shrink-0">
             <Filter size={16} />
          </button>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button 
            onClick={handleSyncAll}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 rounded-lg text-[13px] font-semibold transition-all shadow-subtle"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Sync All Status
          </button>
          <div className="relative">
             <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={14} />
             <select className="pl-9 pr-8 py-2.5 bg-surface border border-border rounded-lg text-[13px] font-medium text-secondary outline-none hover:bg-surface-hover appearance-none shadow-subtle cursor-pointer">
               <option>All Time</option>
               <option>Last 7 Days</option>
               <option>Last 30 Days</option>
             </select>
             <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" size={14} />
          </div>
          <div className="relative">
            <select className="px-4 pr-8 py-2.5 bg-surface border border-border rounded-lg text-[13px] font-medium text-secondary outline-none hover:bg-surface-hover appearance-none shadow-subtle cursor-pointer">
              <option>All Statuses</option>
              <option>In Transit</option>
              <option>Delivered</option>
              <option>Pending Pickup</option>
              <option>Cancelled</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" size={14} />
          </div>
        </div>
      </div>

      {/* Deliveries Table */}
      <div className="bg-surface rounded-xl border border-border shadow-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px] whitespace-nowrap">
            <thead>
              <tr className="bg-surface border-b border-border text-[10px] uppercase tracking-wider text-muted font-bold">
                <th className="px-6 py-4 font-semibold">Tracking info</th>
                <th className="px-6 py-4 font-semibold">Order ID</th>
                <th className="px-6 py-4 font-semibold">Courier</th>
                <th className="px-6 py-4 font-semibold">Location</th>
                <th className="px-6 py-4 font-semibold">ETA / Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
            {filteredDeliveries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Truck className="text-muted" size={48} />
                      <span className="text-sm text-secondary">No deliveries found</span>
                    </div>
                  </td>
                </tr>
              ) : (
                currentDeliveries.map((delivery) => (
                  <tr key={delivery.id} className="hover:bg-surface-hover transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-[36px] h-[36px] rounded-[10px] bg-brand/10 flex items-center justify-center shadow-subtle shrink-0">
                           <Truck size={16} className="text-brand" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-mono font-bold text-primary">{delivery.trackingCode || delivery.id}</span>
                          <div className="flex items-center gap-1 text-[10px] text-secondary mt-0.5 font-medium">
                            <Truck size={10} />
                            Standard Delivery
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium text-secondary">
                        {delivery.orderId.startsWith('woo_') ? delivery.orderId : 
                           ((delivery.orderNumber ?? orderMap[delivery.orderId]) && (delivery.orderNumber ?? orderMap[delivery.orderId]) !== -1
                              ? `#${delivery.orderNumber ?? orderMap[delivery.orderId]}` 
                              : delivery.orderId)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-[30px] h-[30px] rounded-full border border-border bg-surface flex items-center justify-center text-[13px] font-bold text-primary shadow-subtle shrink-0">
                          {delivery.courier.charAt(0)}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[13px] font-bold text-primary">{delivery.courier}</span>
                          <span className="text-[11px] text-muted font-medium">{delivery.courier}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`flex items-center gap-2 text-[12px] font-medium ${delivery.location?.toLowerCase().includes('processing') ? 'text-purple-500' : 'text-secondary'}`}>
                        {delivery.location?.toLowerCase().includes('processing') ? <Settings2 size={14} className="text-purple-400" /> : <MapPin size={14} className="text-muted" />}
                        {delivery.location || 'Processing'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col items-start gap-1">
                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${
                            delivery.status?.toLowerCase() === 'delivered' ? 'bg-green-50 text-[#1DAB61]' :
                            delivery.status?.toLowerCase() === 'cancelled' ? 'bg-red-50 text-red-600' :
                            'bg-brand/10 text-brand'
                        }`}>
                          <Clock size={12} strokeWidth={2.5} />
                          <span className="text-[10px] font-bold tracking-wide">
                            {delivery.status.replace(/_/g, ' ').charAt(0).toUpperCase() + delivery.status.replace(/_/g, ' ').slice(1)}
                          </span>
                        </div>
                        <span className="text-[10px] font-medium text-muted ml-1">{delivery.eta}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {delivery.id && (
                          <>
                            <button 
                              onClick={() => handleSyncStatus(delivery)}
                              className="w-[32px] h-[32px] flex items-center justify-center bg-surface border border-border rounded-lg text-muted hover:text-[#1DAB61] hover:border-[#1DAB61] hover:bg-green-50 transition-all shadow-subtle" 
                              title="Sync Status"
                            >
                              <RefreshCw size={14} />
                            </button>
                            {(delivery.courier?.toLowerCase() === 'steadfast' || delivery.courier?.toLowerCase() === 'pathao') && (
                              <a 
                                href={delivery.courier?.toLowerCase() === 'steadfast' ? `https://steadfast.com.bd/t/${delivery.trackingCode || delivery.id}` : `https://pathao.com/courier/tracking/${delivery.trackingCode || delivery.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-[32px] h-[32px] flex items-center justify-center bg-surface border border-border rounded-lg text-muted hover:text-brand hover:border-brand hover:bg-brand/10 transition-all shadow-subtle" 
                                title="Live Tracking"
                              >
                                <Navigation size={14} />
                              </a>
                            )}
                          </>
                        )}
                        <button 
                          onClick={() => handleOpenEditDeliveryModal(delivery)}
                          className="w-[32px] h-[32px] flex items-center justify-center bg-surface border border-border rounded-lg text-muted hover:text-brand hover:border-brand hover:bg-brand/10 transition-all shadow-subtle" 
                          title="Edit Shipment"
                        >
                          <Edit size={14} />
                        </button>
                        <button 
                          onClick={() => handleDeleteDelivery(delivery.id)}
                          className="w-[32px] h-[32px] flex items-center justify-center bg-surface border border-border rounded-lg text-muted hover:text-red-600 hover:border-red-600 hover:bg-red-50 transition-all shadow-subtle" 
                          title="Delete Shipment"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 bg-surface border border-border rounded-xl mt-4 shadow-subtle">
        <span className="text-xs text-secondary mb-4 sm:mb-0">
          Showing <span className="font-semibold text-primary">{filteredDeliveries.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</span> to <span className="font-semibold text-primary">{Math.min(currentPage * itemsPerPage, filteredDeliveries.length)}</span> of <span className="font-semibold text-primary">{filteredDeliveries.length.toLocaleString()}</span> shipments
        </span>
        <div className="flex items-center gap-2">
           <button 
             onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
             disabled={currentPage === 1}
             className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-surface-hover text-muted disabled:opacity-50"
           >
             &lt;
           </button>
           {[...Array(totalPages)].map((_, i) => (
             <button 
               key={i}
               onClick={() => setCurrentPage(i + 1)}
               className={`w-8 h-8 flex items-center justify-center rounded-md text-xs font-semibold border transition-all ${
                 currentPage === i + 1 
                   ? 'bg-brand/10 text-brand border-brand/20' 
                   : 'bg-surface text-secondary border-transparent hover:bg-surface-hover'
               }`}
             >
               {i + 1}
             </button>
           )).slice(0, 5)}
           {totalPages > 5 && <span className="px-1 text-muted">...</span>}
           <button 
             onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
             disabled={currentPage === totalPages}
             className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-surface-hover text-muted disabled:opacity-50"
           >
             &gt;
           </button>
        </div>
      </div>
      </>
    )}

      {/* Add/Edit Courier Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-bold text-primary">
                {editingCourier ? 'Edit Courier' : 'Connect New Courier'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-surface-hover rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCourierSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-secondary uppercase tracking-wider">Courier Name</label>
                <input
                  required
                  type="text"
                  className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all"
                  placeholder="e.g. Pathao, RedX"
                  value={courierForm.name}
                  onChange={(e) => setCourierForm({...courierForm, name: e.target.value})}
                />
              </div>
              <div className="flex items-center gap-2 py-2">
                <input
                  type="checkbox"
                  id="active"
                  className="w-4 h-4 rounded border-border text-primary focus:ring-slate-900 dark:ring-white"
                  checked={courierForm.active}
                  onChange={(e) => setCourierForm({...courierForm, active: e.target.checked})}
                />
                <label htmlFor="active" className="text-sm text-secondary">Active and available for deliveries</label>
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
                  {editingCourier ? 'Save Changes' : 'Connect Courier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Delivery Modal */}
      {isDeliveryModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-bold text-primary">
                {editingDelivery ? 'Edit Shipment' : 'Add New Shipment'}
              </h3>
              <button 
                onClick={() => setIsDeliveryModalOpen(false)}
                className="p-2 hover:bg-surface-hover rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleDeliverySubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-secondary uppercase tracking-wider">Order ID</label>
                  <input
                    required
                    type="text"
                    className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all"
                    placeholder="ORD-..."
                    value={deliveryForm.orderId}
                    onChange={(e) => setDeliveryForm({...deliveryForm, orderId: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-secondary uppercase tracking-wider">Courier</label>
                  <select
                    className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all"
                    value={deliveryForm.courier}
                    onChange={(e) => setDeliveryForm({...deliveryForm, courier: e.target.value})}
                  >
                    <option value="">Select Courier</option>
                    {Object.entries(courierConfigs)
                      .filter(([_, config]: [string, any]) => config.isActive)
                      .map(([name]) => (
                        <option key={name} value={name.charAt(0).toUpperCase() + name.slice(1)}>
                          {name.charAt(0).toUpperCase() + name.slice(1)}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-secondary uppercase tracking-wider">Status</label>
                  <select
                    className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all"
                    value={deliveryForm.status}
                    onChange={(e) => setDeliveryForm({...deliveryForm, status: e.target.value})}
                  >
                    <option value="pending_pickup">Pending Pickup</option>
                    <option value="in_transit">In Transit</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-secondary uppercase tracking-wider">ETA</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all"
                    placeholder="e.g. 2-3 Days"
                    value={deliveryForm.eta}
                    onChange={(e) => setDeliveryForm({...deliveryForm, eta: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-secondary uppercase tracking-wider">Current Location / Hub</label>
                <input
                  required
                  type="text"
                  className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all"
                  placeholder="e.g. Dhaka Hub"
                  value={deliveryForm.location}
                  onChange={(e) => setDeliveryForm({...deliveryForm, location: e.target.value})}
                />
              </div>

              {(deliveryForm.courier === 'Pathao' || deliveryForm.courier === 'Carrybee') && (
                <div className="space-y-4 pt-2 border-t border-border">
                  <p className={`text-[10px] font-bold uppercase tracking-widest ${deliveryForm.courier === 'Pathao' ? 'text-orange-500' : 'text-yellow-600'}`}>
                    {deliveryForm.courier} Location Details
                  </p>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted uppercase">City</label>
                      <select
                        required={deliveryForm.courier === 'Pathao' || deliveryForm.courier === 'Carrybee'}
                        className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all"
                        value={deliveryForm.city_id}
                        onChange={(e) => {
                          setDeliveryForm({...deliveryForm, city_id: e.target.value, zone_id: '', area_id: ''});
                          if (e.target.value) fetchZones(e.target.value);
                        }}
                      >
                        <option value="">Select City</option>
                        {cities.map(city => (
                          <option key={city.city_id || city.id} value={city.city_id || city.id}>{city.city_name || city.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted uppercase">Zone</label>
                        <select
                          required={deliveryForm.courier === 'Pathao' || deliveryForm.courier === 'Carrybee'}
                          disabled={!deliveryForm.city_id || loadingLocations}
                          className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all disabled:opacity-50"
                          value={deliveryForm.zone_id}
                          onChange={(e) => {
                            setDeliveryForm({...deliveryForm, zone_id: e.target.value, area_id: ''});
                            if (e.target.value) fetchAreas(e.target.value);
                          }}
                        >
                          <option value="">Select Zone</option>
                          {zones.map(zone => (
                            <option key={zone.zone_id || zone.id} value={zone.zone_id || zone.id}>{zone.zone_name || zone.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted uppercase">Area</label>
                        <select
                          required={deliveryForm.courier === 'Pathao' || deliveryForm.courier === 'Carrybee'}
                          disabled={!deliveryForm.zone_id || loadingLocations}
                          className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all disabled:opacity-50"
                          value={deliveryForm.area_id}
                          onChange={(e) => setDeliveryForm({...deliveryForm, area_id: e.target.value})}
                        >
                          <option value="">Select Area</option>
                          {areas.map(area => (
                            <option key={area.area_id || area.id} value={area.area_id || area.id}>{area.area_name || area.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsDeliveryModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-surface-hover transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-black rounded-lg text-sm font-medium hover:bg-black transition-colors"
                >
                  {editingDelivery ? 'Save Changes' : 'Add Shipment'}
                </button>
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
}
