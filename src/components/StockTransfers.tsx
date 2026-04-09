import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  ArrowRightLeft, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Package, 
  Truck,
  Warehouse,
  Search,
  Loader2,
  MoreVertical,
  AlertCircle
} from 'lucide-react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  orderBy, 
  serverTimestamp,
  getDoc,
  where,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { format } from 'date-fns';

interface StockTransfer {
  id: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  items: any[];
  status: 'pending' | 'approved' | 'shipped' | 'received' | 'cancelled';
  requestedBy: string;
  approvedBy?: string;
  uid: string;
  createdAt: any;
  updatedAt: any;
}

export default function StockTransfers() {
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    fromWarehouseId: '',
    toWarehouseId: '',
    items: [] as any[]
  });

  useEffect(() => {
    const q = query(collection(db, 'stock_transfers'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTransfers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as StockTransfer[]);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'stock_transfers');
      setLoading(false);
    });

    const wUnsubscribe = onSnapshot(collection(db, 'warehouses'), (snapshot) => {
      setWarehouses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubscribe();
      wUnsubscribe();
    };
  }, []);

  const handleUpdateStatus = async (transferId: string, newStatus: string) => {
    try {
      const transferRef = doc(db, 'stock_transfers', transferId);
      const transferSnap = await getDoc(transferRef);
      const transferData = transferSnap.data() as StockTransfer;

      const batch = writeBatch(db);
      batch.update(transferRef, { 
        status: newStatus, 
        updatedAt: serverTimestamp(),
        ...(newStatus === 'approved' ? { approvedBy: auth.currentUser?.uid } : {})
      });

      // If received, update inventory for both warehouses
      if (newStatus === 'received') {
        for (const item of transferData.items) {
          // Deduct from source
          const sourceQuery = query(
            collection(db, 'inventory'),
            where('productId', '==', item.productId),
            where('variantId', '==', item.variantId || null),
            where('warehouseId', '==', transferData.fromWarehouseId)
          );
          const sourceSnap = await getDocs(sourceQuery);
          if (!sourceSnap.empty) {
            const sourceDoc = sourceSnap.docs[0];
            batch.update(sourceDoc.ref, {
              quantity: sourceDoc.data().quantity - item.quantity,
              lastStockUpdate: serverTimestamp()
            });
          }

          // Add to destination
          const destQuery = query(
            collection(db, 'inventory'),
            where('productId', '==', item.productId),
            where('variantId', '==', item.variantId || null),
            where('warehouseId', '==', transferData.toWarehouseId)
          );
          const destSnap = await getDocs(destQuery);
          if (!destSnap.empty) {
            const destDoc = destSnap.docs[0];
            batch.update(destDoc.ref, {
              quantity: destDoc.data().quantity + item.quantity,
              lastStockUpdate: serverTimestamp()
            });
          } else {
            // Create new inventory record if not exists
            const newInvRef = doc(collection(db, 'inventory'));
            batch.set(newInvRef, {
              productId: item.productId,
              variantId: item.variantId || null,
              warehouseId: transferData.toWarehouseId,
              quantity: item.quantity,
              uid: auth.currentUser?.uid,
              lastStockUpdate: serverTimestamp()
            });
          }
        }
      }

      await batch.commit();
      toast.success(`Transfer status updated to ${newStatus}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `stock_transfers/${transferId}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-[#141414] tracking-tight">Stock Transfers</h2>
          <p className="text-sm text-gray-500 mt-1">Move products between your warehouse locations.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#141414] text-white rounded-lg text-sm font-medium hover:bg-black transition-colors"
        >
          <Plus size={16} />
          New Transfer Request
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
              <Clock size={20} />
            </div>
            <span className="text-sm font-bold text-gray-900">Pending Approval</span>
          </div>
          <h3 className="text-2xl font-bold text-[#141414]">
            {transfers.filter(t => t.status === 'pending').length}
          </h3>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Truck size={20} />
            </div>
            <span className="text-sm font-bold text-gray-900">In Transit</span>
          </div>
          <h3 className="text-2xl font-bold text-[#141414]">
            {transfers.filter(t => t.status === 'shipped').length}
          </h3>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-50 text-green-600 rounded-lg">
              <CheckCircle2 size={20} />
            </div>
            <span className="text-sm font-bold text-gray-900">Completed</span>
          </div>
          <h3 className="text-2xl font-bold text-[#141414]">
            {transfers.filter(t => t.status === 'received').length}
          </h3>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-50 text-red-600 rounded-lg">
              <XCircle size={20} />
            </div>
            <span className="text-sm font-bold text-gray-900">Cancelled</span>
          </div>
          <h3 className="text-2xl font-bold text-[#141414]">
            {transfers.filter(t => t.status === 'cancelled').length}
          </h3>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-[10px] uppercase tracking-widest text-gray-500">
                <th className="px-6 py-4 font-semibold">Transfer ID</th>
                <th className="px-6 py-4 font-semibold">From</th>
                <th className="px-6 py-4 font-semibold">To</th>
                <th className="px-6 py-4 font-semibold">Items</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Loader2 className="animate-spin text-gray-400 mx-auto" size={24} />
                  </td>
                </tr>
              ) : transfers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500 text-sm">
                    No stock transfers found.
                  </td>
                </tr>
              ) : (
                transfers.map((transfer) => (
                  <tr key={transfer.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4">
                      <span className="text-xs font-mono font-bold text-gray-900">#{transfer.id.slice(-6).toUpperCase()}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Warehouse size={14} className="text-gray-400" />
                        <span className="text-xs font-medium text-gray-600">
                          {warehouses.find(w => w.id === transfer.fromWarehouseId)?.name || 'Unknown'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Warehouse size={14} className="text-gray-400" />
                        <span className="text-xs font-medium text-gray-600">
                          {warehouses.find(w => w.id === transfer.toWarehouseId)?.name || 'Unknown'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-gray-900">{transfer.items.length} items</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                        transfer.status === 'received' ? 'bg-green-50 text-green-600' :
                        transfer.status === 'cancelled' ? 'bg-red-50 text-red-600' :
                        transfer.status === 'pending' ? 'bg-orange-50 text-orange-600' :
                        'bg-blue-50 text-blue-600'
                      }`}>
                        {transfer.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {transfer.status === 'pending' && (
                          <button 
                            onClick={() => handleUpdateStatus(transfer.id, 'approved')}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="Approve"
                          >
                            <CheckCircle2 size={16} />
                          </button>
                        )}
                        {transfer.status === 'approved' && (
                          <button 
                            onClick={() => handleUpdateStatus(transfer.id, 'shipped')}
                            className="p-1 text-purple-600 hover:bg-purple-50 rounded"
                            title="Ship"
                          >
                            <Truck size={16} />
                          </button>
                        )}
                        {transfer.status === 'shipped' && (
                          <button 
                            onClick={() => handleUpdateStatus(transfer.id, 'received')}
                            className="p-1 text-green-600 hover:bg-green-50 rounded"
                            title="Receive"
                          >
                            <Package size={16} />
                          </button>
                        )}
                        {['pending', 'approved'].includes(transfer.status) && (
                          <button 
                            onClick={() => handleUpdateStatus(transfer.id, 'cancelled')}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="Cancel"
                          >
                            <XCircle size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
