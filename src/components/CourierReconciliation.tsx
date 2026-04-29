import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  DollarSign,
  TrendingDown,
  TrendingUp,
  Loader2
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  doc, 
  serverTimestamp,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '../firebase';
import { toast } from 'sonner';
import { CourierFactory } from '../lib/courierAdapters';

interface ReconcilableOrder {
  id: string;
  orderId?: string;
  courier_name: string;
  courier_tracking_id: string;
  deliveryCharge: number;
  estimated_delivery_charge?: number;
  actual_delivery_charge?: number;
  reconciliation_status?: 'pending' | 'matched' | 'error' | 'adjusted';
  charge_difference?: number;
  delivery_profit_adjustment?: number;
  netProfit?: number;
  createdAt: any;
  status: string;
}

export default function CourierReconciliation() {
  const [orders, setOrders] = useState<ReconcilableOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [courierConfigs, setCourierConfigs] = useState<Record<string, any>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    fetchCourierConfigs();
    fetchOrders();
  }, []);

  const fetchCourierConfigs = async () => {
    try {
      const qs = await getDocs(collection(db, 'settings'));
      let configs = {};
      qs.forEach(doc => {
        if (doc.id === 'couriers' || doc.id === 'courier_api') {
          configs = doc.data();
        }
      });
      setCourierConfigs(configs);
    } catch (error) {
      console.error("Error fetching configs:", error);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      // Find orders that were sent to courier (has courier_tracking_id)
      const q = query(
        collection(db, 'orders'),
        where('courier_tracking_id', '!=', null),
        orderBy('courier_tracking_id'),
        limit(100)
      );
      
      const snapshot = await getDocs(q);
      const fetchedOrders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ReconcilableOrder[];

      // Sort by creation date descending client-side since we orderBy tracking id
      fetchedOrders.sort((a, b) => b.createdAt?.toMillis?.() - a.createdAt?.toMillis?.());

      setOrders(fetchedOrders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Failed to load courier orders.");
    } finally {
      setLoading(false);
    }
  };

  const handleReconcileOrder = async (order: ReconcilableOrder) => {
    if (!courierConfigs) {
      toast.error("Courier configuration is missing.");
      return;
    }
    
    setIsProcessing(true);
    try {
      const courierKey = order.courier_name.toLowerCase();
      const config = courierConfigs[courierKey];
      
      if (!config) {
        throw new Error(`API Config for ${order.courier_name} not found.`);
      }

      const adapter = CourierFactory.getAdapter(courierKey, config);
      
      let actualCharge: number | null = null;

      // Check if adapter has getDeliveryCharge directly, otherwise use trackOrder
      if (adapter.getDeliveryCharge) {
        actualCharge = await adapter.getDeliveryCharge(order.courier_tracking_id, order);
      } else {
        const trackRes = await adapter.trackOrder(order.courier_tracking_id);
        // Try to parse typical charge fields
        actualCharge = trackRes?.delivery_charge || 
                       trackRes?.charge || 
                       trackRes?.price || 
                       trackRes?.amount || 
                       trackRes?.data?.delivery_charge || 
                       trackRes?.data?.price || 
                       trackRes?.data?.charge || 
                       trackRes?.data?.charge_details?.delivery_charge ||
                       null;
      }

      if (actualCharge === null || actualCharge === undefined) {
         throw new Error("Could not fetch charge amount from courier API.");
      }

      actualCharge = Number(actualCharge);
      
      const estimatedCharge = order.estimated_delivery_charge || order.deliveryCharge || 0;
      const difference = actualCharge - estimatedCharge;
      
      let profitAdjustment = 0;
      if (actualCharge > estimatedCharge) {
        profitAdjustment = -(actualCharge - estimatedCharge); // Loss
      } else if (actualCharge < estimatedCharge) {
        profitAdjustment = (estimatedCharge - actualCharge); // Extra Profit
      }

      const statusUpdate = difference === 0 ? 'matched' : 'adjusted';

      // Update Order in DB
      await updateDoc(doc(db, 'orders', order.id), {
        actual_delivery_charge: actualCharge,
        charge_difference: difference,
        delivery_profit_adjustment: profitAdjustment,
        reconciliation_status: statusUpdate,
        netProfit: (order.netProfit || 0) + profitAdjustment,
        reconciledAt: serverTimestamp()
      });

      toast.success(`Reconciled #${order.id} | Courier Charge: ৳${actualCharge}`);
      
      // Update local state
      setOrders(prev => prev.map(o => o.id === order.id ? {
        ...o,
        actual_delivery_charge: actualCharge as number,
        charge_difference: difference,
        delivery_profit_adjustment: profitAdjustment,
        reconciliation_status: statusUpdate,
        netProfit: (o.netProfit || 0) + profitAdjustment
      } : o));

    } catch (error: any) {
      console.error("Reconciliation error:", error);
      toast.error(error.message || "Reconciliation failed");
      
      await updateDoc(doc(db, 'orders', order.id), {
        reconciliation_status: 'error',
        reconciliation_error: error.message || "Unknown error"
      });
      
      setOrders(prev => prev.map(o => o.id === order.id ? {
        ...o,
        reconciliation_status: 'error'
      } : o));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkReconcile = async () => {
    const pendings = filteredOrders.filter(o => o.reconciliation_status !== 'matched' && o.reconciliation_status !== 'adjusted');
    if (pendings.length === 0) {
      toast.info("No pending orders to reconcile.");
      return;
    }
    
    setIsProcessing(true);
    let successCount = 0;
    
    for (const order of pendings) {
      try {
        await handleReconcileOrder(order);
        successCount++;
      } catch (err) {
        console.error("Failed bulk reconcile for", order.id);
      }
    }
    
    setIsProcessing(false);
    toast.success(`Bulk Reconciliation Complete. Processed ${successCount} orders.`);
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      (order.orderId?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
      (order.courier_tracking_id?.toLowerCase() || '').includes(searchTerm.toLowerCase());
      
    if (filterStatus === 'all') return matchesSearch;
    if (filterStatus === 'pending') return matchesSearch && (!order.reconciliation_status || order.reconciliation_status === 'pending');
    return matchesSearch && order.reconciliation_status === filterStatus;
  });

  const getStatusBadge = (status?: string) => {
    switch(status) {
      case 'matched': return <span className="px-2 py-1 bg-green-50 text-green-600 rounded-full text-xs font-bold items-center flex gap-1"><CheckCircle2 size={12}/> Matched</span>;
      case 'adjusted': return <span className="px-2 py-1 bg-brand/10 text-brand rounded-full text-xs font-bold items-center flex gap-1"><RefreshCw size={12}/> Adjusted</span>;
      case 'error': return <span className="px-2 py-1 bg-red-50 text-red-600 rounded-full text-xs font-bold items-center flex gap-1"><AlertCircle size={12}/> Error</span>;
      default: return <span className="px-2 py-1 bg-surface-hover text-secondary rounded-full text-xs font-bold items-center flex gap-1"><Clock size={12}/> Pending</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-primary">Charge Reconciliation</h2>
          <p className="text-sm text-secondary">Automatically sync actual delivery charges from couriers.</p>
        </div>
        <button 
          onClick={handleBulkReconcile}
          disabled={isProcessing}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-black rounded-lg text-sm font-medium hover:bg-black transition-colors disabled:opacity-50"
        >
          {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          Auto Reconcile All
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
          <input 
            type="text"
            placeholder="Search tracking ID or order ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-slate-900 dark:ring-white focus:border-transparent outline-none"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-border rounded-lg outline-none focus:ring-2 focus:ring-slate-900 dark:ring-white bg-surface text-sm font-medium"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="matched">Matched</option>
          <option value="adjusted">Adjusted</option>
          <option value="error">Error</option>
        </select>
      </div>

      <div className="bg-surface rounded-xl border border-border shadow-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px] whitespace-nowrap">
            <thead>
              <tr className="bg-surface-hover text-[10px] uppercase tracking-widest text-secondary">
                <th className="px-6 py-4 font-semibold">Order Detail</th>
                <th className="px-6 py-4 font-semibold">Tracking ID</th>
                <th className="px-6 py-4 font-semibold text-right">Estimated</th>
                <th className="px-6 py-4 font-semibold text-right">Actual</th>
                <th className="px-6 py-4 font-semibold text-right">Impact</th>
                <th className="px-6 py-4 font-semibold">Reconciliation Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <Loader2 className="animate-spin text-muted mx-auto" size={24} />
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-secondary text-sm">
                    No courier orders found.
                  </td>
                </tr>
              ) : (
                filteredOrders.map(order => {
                  const estimated = order.estimated_delivery_charge || order.deliveryCharge || 0;
                  const actual = order.actual_delivery_charge;
                  const diff = order.charge_difference;
                  
                  return (
                    <tr key={order.id} className="hover:bg-surface-hover group">
                      <td className="px-6 py-4">
                        <div className="font-bold text-primary">#{order.orderId || order.id.slice(-6)}</div>
                        <div className="text-xs text-secondary uppercase">{order.courier_name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-mono bg-surface-hover px-2 py-1 rounded">{order.courier_tracking_id}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-medium text-secondary">৳{estimated}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-bold text-primary">
                          {actual !== undefined ? `৳${actual}` : '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {diff !== undefined ? (
                           <div className={`text-sm font-bold flex items-center justify-end gap-1 ${order.delivery_profit_adjustment! > 0 ? 'text-green-600' : order.delivery_profit_adjustment! < 0 ? 'text-red-600' : 'text-muted'}`}>
                              {order.delivery_profit_adjustment! > 0 ? <TrendingUp size={14}/> : order.delivery_profit_adjustment! < 0 ? <TrendingDown size={14}/> : ''}
                              {Math.abs(order.delivery_profit_adjustment!)}
                           </div>
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(order.reconciliation_status)}
                      </td>
                      <td className="px-6 py-4 text-right">
                         <button 
                            onClick={() => handleReconcileOrder(order)}
                            disabled={isProcessing}
                            className="px-3 py-1.5 bg-surface-hover text-primary hover:bg-surface-hover rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                         >
                            Sync API
                         </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
