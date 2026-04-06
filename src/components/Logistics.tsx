import React, { useState, useEffect } from 'react';
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
  RefreshCw
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
  serverTimestamp,
  Timestamp,
  updateDoc
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useSettings } from '../contexts/SettingsContext';
import { SteadfastService } from '../services/steadfastService';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

interface Delivery {
  id: string;
  orderId: string;
  courier: string;
  status: string;
  location: string;
  eta: string;
  createdAt: any;
  uid: string;
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
  const { settings } = useSettings();
  const [searchTerm, setSearchTerm] = useState('');
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [loading, setLoading] = useState(true);
  const [steadfastBalance, setSteadfastBalance] = useState<number | null>(null);
  const [pathaoBalance, setPathaoBalance] = useState<number | null>(null);
  const [redxBalance, setRedxBalance] = useState<number | null>(null);
  const [fetchingBalance, setFetchingBalance] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [editingCourier, setEditingCourier] = useState<Courier | null>(null);
  const [editingDelivery, setEditingDelivery] = useState<Delivery | null>(null);
  const [courierForm, setCourierForm] = useState({
    name: '',
    active: true,
  });
  const [deliveryForm, setDeliveryForm] = useState({
    orderId: '',
    courier: '',
    status: 'In Transit',
    location: '',
    eta: '',
  });

  useEffect(() => {
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
      handleFirestoreError(error, OperationType.LIST, 'deliveries');
    });

    const unsubscribeCouriers = onSnapshot(qCouriers, (snapshot) => {
      const courierData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Courier[];
      setCouriers(courierData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'couriers');
    });

    return () => {
      unsubscribeDeliveries();
      unsubscribeCouriers();
    };
  }, []);

  useEffect(() => {
    if (settings.steadfastApiKey && settings.steadfastSecretKey) {
      fetchSteadfastBalance();
    }
  }, [settings.steadfastApiKey, settings.steadfastSecretKey]);

  const fetchSteadfastBalance = async () => {
    if (!settings.steadfastApiKey || !settings.steadfastSecretKey) {
      toast.error('Steadfast API keys are not configured.');
      return;
    }
    setFetchingBalance(true);
    try {
      const steadfast = new SteadfastService(settings.steadfastApiKey, settings.steadfastSecretKey);
      const response = await steadfast.getBalance();
      if (response.status === 200) {
        setSteadfastBalance(response.balance);
        toast.success('Steadfast balance updated.');
      }
    } catch (error: any) {
      console.error('Error fetching Steadfast balance:', error);
      toast.error(error.message || 'Failed to fetch Steadfast balance.');
    } finally {
      setFetchingBalance(false);
    }
  };

  const handleSyncStatus = async (delivery: Delivery) => {
    if (!settings.steadfastApiKey || !settings.steadfastSecretKey) return;
    if (delivery.courier !== 'Steadfast' || !delivery.id) return;

    toast.loading('Syncing status with Steadfast...', { id: 'sync-status' });
    try {
      const steadfast = new SteadfastService(settings.steadfastApiKey, settings.steadfastSecretKey);
      const response = await steadfast.getStatusByTracking(delivery.id);
      
      if (response.status === 200 && response.delivery_status) {
        // Map Steadfast status to our app status
        const statusMap: Record<string, string> = {
          'pending': 'Pending Pickup',
          'delivered': 'Delivered',
          'cancelled': 'Cancelled',
          'in_transit': 'In Transit',
          'hold': 'On Hold',
          'return': 'Returning'
        };

        const newStatus = statusMap[response.delivery_status] || response.delivery_status;
        
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
            if (orderStatusMap[response.delivery_status]) {
              await updateDoc(orderRef, { status: orderStatusMap[response.delivery_status] });
            }
          }
        }

        toast.success(`Status updated: ${newStatus}`, { id: 'sync-status' });
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
      status: 'In Transit',
      location: '',
      eta: '2-3 Days',
    });
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
    if (!window.confirm('Are you sure you want to delete this delivery?')) return;
    try {
      await deleteDoc(doc(db, 'deliveries', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `deliveries/${id}`);
    }
  };

  const handleDeleteCourier = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this courier?')) return;
    try {
      await deleteDoc(doc(db, 'couriers', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `couriers/${id}`);
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
      const row = [
        delivery.id,
        delivery.orderId || '',
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

  const filteredDeliveries = deliveries.filter(delivery => 
    delivery.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    delivery.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    delivery.courier.toLowerCase().includes(searchTerm.toLowerCase()) ||
    delivery.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-[#141414] tracking-tight">Logistics & Delivery</h2>
          <p className="text-sm text-gray-500 mt-1">Track shipments, manage courier partners, and optimize routes.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <Download size={16} />
            Export CSV
          </button>
          <button 
            onClick={handleOpenAddDeliveryModal}
            className="flex items-center gap-2 px-4 py-2 bg-[#141414] text-white rounded-lg text-sm font-medium hover:bg-black transition-colors"
          >
            <Plus size={16} />
            Add Shipment
          </button>
          <button 
            onClick={handleOpenAddCourierModal}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <Plus size={16} />
            Connect Courier
          </button>
        </div>
      </div>

      {/* Courier Partners Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Steadfast Integration Card */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-6 rounded-xl border border-blue-500 shadow-lg text-white relative overflow-hidden">
          <div className="absolute -right-4 -top-4 opacity-10">
            <Truck size={120} />
          </div>
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-bold text-white flex items-center gap-2">
              <CheckCircle2 size={16} className={settings.steadfastApiKey ? 'text-green-300' : 'text-blue-300'} />
              Steadfast
            </h4>
            <button 
              onClick={fetchSteadfastBalance}
              disabled={fetchingBalance}
              className="p-1 hover:bg-white/10 rounded-md transition-all"
            >
              <RefreshCw size={14} className={fetchingBalance ? 'animate-spin' : ''} />
            </button>
          </div>
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[10px] uppercase font-bold text-blue-100 tracking-wider">Balance</p>
              <p className="text-xl font-bold">
                {fetchingBalance ? '...' : steadfastBalance !== null ? `৳${steadfastBalance.toLocaleString()}` : 'N/A'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase font-bold text-blue-100 tracking-wider">Status</p>
              <p className="text-xs font-bold">{settings.steadfastApiKey ? 'Connected' : 'Not Configured'}</p>
            </div>
          </div>
        </div>

        {/* Pathao Integration Card */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-6 rounded-xl border border-orange-400 shadow-lg text-white relative overflow-hidden">
          <div className="absolute -right-4 -top-4 opacity-10">
            <Navigation size={120} />
          </div>
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-bold text-white flex items-center gap-2">
              <CheckCircle2 size={16} className="text-orange-200" />
              Pathao
            </h4>
          </div>
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[10px] uppercase font-bold text-orange-100 tracking-wider">Balance</p>
              <p className="text-xl font-bold">৳0</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase font-bold text-orange-100 tracking-wider">Status</p>
              <p className="text-xs font-bold">Coming Soon</p>
            </div>
          </div>
        </div>

        {/* RedX Integration Card */}
        <div className="bg-gradient-to-br from-red-600 to-red-700 p-6 rounded-xl border border-red-500 shadow-lg text-white relative overflow-hidden">
          <div className="absolute -right-4 -top-4 opacity-10">
            <Truck size={120} />
          </div>
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-bold text-white flex items-center gap-2">
              <CheckCircle2 size={16} className="text-red-200" />
              RedX
            </h4>
          </div>
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[10px] uppercase font-bold text-red-100 tracking-wider">Balance</p>
              <p className="text-xl font-bold">৳0</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase font-bold text-red-100 tracking-wider">Status</p>
              <p className="text-xs font-bold">Coming Soon</p>
            </div>
          </div>
        </div>

        {couriers.filter(c => !['Steadfast', 'Pathao', 'RedX'].includes(c.name)).length === 0 && !loading ? (
          <div className="col-span-full py-8 text-center bg-white rounded-xl border border-dashed border-gray-200">
            <p className="text-sm text-gray-400">No additional couriers connected yet.</p>
          </div>
        ) : (
          couriers
            .filter(c => !['Steadfast', 'Pathao', 'RedX'].includes(c.name))
            .map((courier) => (
            <div key={courier.id} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm relative group">
              <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                <button 
                  onClick={() => handleOpenEditCourierModal(courier)}
                  className="p-1 text-gray-400 hover:text-blue-600"
                >
                  <Edit size={14} />
                </button>
                <button 
                  onClick={() => handleDeleteCourier(courier.id)}
                  className="p-1 text-gray-400 hover:text-red-600"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-bold text-[#141414]">{courier.name}</h4>
                <div className={`w-2 h-2 rounded-full ${courier.active ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              </div>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Total Orders</p>
                  <p className="text-xl font-bold">{courier.orders || 0}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Success Rate</p>
                  <p className="text-sm font-bold text-green-600">{courier.success || '100%'}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Search & Filter */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by Tracking ID, Order ID, Courier..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <select className="flex-1 md:flex-none px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm outline-none focus:bg-white focus:border-gray-200">
            <option>All Statuses</option>
            <option>In Transit</option>
            <option>Delivered</option>
            <option>Pending Pickup</option>
            <option>Cancelled</option>
          </select>
        </div>
      </div>

      {/* Deliveries Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-[10px] uppercase tracking-widest text-gray-500">
                <th className="px-6 py-4 font-semibold">Tracking info</th>
                <th className="px-6 py-4 font-semibold">Order ID</th>
                <th className="px-6 py-4 font-semibold">Courier</th>
                <th className="px-6 py-4 font-semibold">Location</th>
                <th className="px-6 py-4 font-semibold">ETA / Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="animate-spin text-gray-400" size={24} />
                      <span className="text-sm text-gray-500">Loading deliveries...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredDeliveries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Truck className="text-gray-300" size={48} />
                      <span className="text-sm text-gray-500">No deliveries found</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredDeliveries.map((delivery) => (
                  <tr key={delivery.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-mono font-bold text-[#141414]">{delivery.id}</span>
                        <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-1">
                          <Truck size={10} />
                          Standard Delivery
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium text-gray-600">{delivery.orderId}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-[#141414]">{delivery.courier}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <MapPin size={12} className="text-gray-400" />
                        {delivery.location}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1">
                          {delivery.status === 'Delivered' ? (
                            <CheckCircle2 size={14} className="text-green-500" />
                          ) : delivery.status === 'Cancelled' ? (
                            <AlertCircle size={14} className="text-red-500" />
                          ) : (
                            <Clock size={14} className="text-blue-500" />
                          )}
                          <span className={`text-[10px] font-bold ${
                            delivery.status === 'Delivered' ? 'text-green-600' :
                            delivery.status === 'Cancelled' ? 'text-red-600' :
                            'text-blue-600'
                          }`}>
                            {delivery.status.charAt(0).toUpperCase() + delivery.status.slice(1)}
                          </span>
                        </div>
                        <span className="text-[10px] text-gray-400">{delivery.eta}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {delivery.courier === 'Steadfast' && (
                            <>
                              <button 
                                onClick={() => handleSyncStatus(delivery)}
                                className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-md transition-all" 
                                title="Sync Status"
                              >
                                <RefreshCw size={16} />
                              </button>
                              <a 
                                href={`https://steadfast.com.bd/t/${delivery.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all flex items-center justify-center" 
                                title="Live Tracking"
                              >
                                <Navigation size={16} />
                              </a>
                            </>
                          )}
                          <button 
                            onClick={() => handleOpenEditDeliveryModal(delivery)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all" 
                            title="Edit Shipment"
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={() => handleDeleteDelivery(delivery.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all" 
                            title="Delete Shipment"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Courier Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#141414]">
                {editingCourier ? 'Edit Courier' : 'Connect New Courier'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCourierSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Courier Name</label>
                <input
                  required
                  type="text"
                  className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all"
                  placeholder="e.g. Pathao, RedX"
                  value={courierForm.name}
                  onChange={(e) => setCourierForm({...courierForm, name: e.target.value})}
                />
              </div>
              <div className="flex items-center gap-2 py-2">
                <input
                  type="checkbox"
                  id="active"
                  className="w-4 h-4 rounded border-gray-300 text-[#141414] focus:ring-[#141414]"
                  checked={courierForm.active}
                  onChange={(e) => setCourierForm({...courierForm, active: e.target.checked})}
                />
                <label htmlFor="active" className="text-sm text-gray-600">Active and available for deliveries</label>
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-[#141414] text-white rounded-lg text-sm font-medium hover:bg-black transition-colors"
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#141414]">
                {editingDelivery ? 'Edit Shipment' : 'Add New Shipment'}
              </h3>
              <button 
                onClick={() => setIsDeliveryModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleDeliverySubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Order ID</label>
                  <input
                    required
                    type="text"
                    className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all"
                    placeholder="ORD-..."
                    value={deliveryForm.orderId}
                    onChange={(e) => setDeliveryForm({...deliveryForm, orderId: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Courier</label>
                  <select
                    className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all"
                    value={deliveryForm.courier}
                    onChange={(e) => setDeliveryForm({...deliveryForm, courier: e.target.value})}
                  >
                    <option value="Steadfast">Steadfast</option>
                    <option value="Pathao">Pathao</option>
                    <option value="RedX">RedX</option>
                    {couriers
                      .filter(c => !['Steadfast', 'Pathao', 'RedX'].includes(c.name))
                      .map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Status</label>
                  <select
                    className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all"
                    value={deliveryForm.status}
                    onChange={(e) => setDeliveryForm({...deliveryForm, status: e.target.value})}
                  >
                    <option value="Pending Pickup">Pending Pickup</option>
                    <option value="In Transit">In Transit</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">ETA</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all"
                    placeholder="e.g. 2-3 Days"
                    value={deliveryForm.eta}
                    onChange={(e) => setDeliveryForm({...deliveryForm, eta: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Current Location</label>
                <input
                  required
                  type="text"
                  className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all"
                  placeholder="e.g. Dhaka Hub"
                  value={deliveryForm.location}
                  onChange={(e) => setDeliveryForm({...deliveryForm, location: e.target.value})}
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsDeliveryModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-[#141414] text-white rounded-lg text-sm font-medium hover:bg-black transition-colors"
                >
                  {editingDelivery ? 'Save Changes' : 'Add Shipment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
