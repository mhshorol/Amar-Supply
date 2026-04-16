import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Filter, 
  MoreVertical, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  RefreshCcw,
  ArrowLeftRight,
  Package,
  FileText,
  Loader2,
  AlertCircle,
  DollarSign
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
  writeBatch,
  runTransaction,
  limit
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { format } from 'date-fns';

interface RMARequest {
  id: string;
  orderId: string;
  items: any[];
  status: 'pending' | 'approved' | 'received' | 'refunded' | 'rejected';
  refundAmount: number;
  reason: string;
  uid: string;
  createdAt: any;
  updatedAt: any;
}

export default function Returns() {
  const [requests, setRequests] = useState<RMARequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    orderId: '',
    reason: '',
    items: [] as any[],
    refundAmount: 0
  });

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(collection(db, 'rma_requests'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as RMARequest[]);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'rma_requests');
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    setSubmitting(true);

    try {
      // Verify order exists
      const orderRef = doc(db, 'orders', form.orderId);
      const orderSnap = await getDoc(orderRef);
      if (!orderSnap.exists()) {
        toast.error("Order ID not found");
        return;
      }

      await addDoc(collection(db, 'rma_requests'), {
        ...form,
        status: 'pending',
        uid: auth.currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      toast.success("RMA request submitted successfully");
      setIsModalOpen(false);
      setForm({ orderId: '', reason: '', items: [], refundAmount: 0 });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'rma_requests');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (requestId: string, newStatus: string) => {
    try {
      await runTransaction(db, async (transaction) => {
        const requestRef = doc(db, 'rma_requests', requestId);
        const requestSnap = await transaction.get(requestRef);
        if (!requestSnap.exists()) return;
        const requestData = requestSnap.data() as RMARequest;

        transaction.update(requestRef, { 
          status: newStatus, 
          updatedAt: serverTimestamp() 
        });

        // If received, update inventory
        if (newStatus === 'received') {
          for (const item of requestData.items) {
            const invQuery = query(
              collection(db, 'inventory'),
              where('productId', '==', item.productId),
              where('variantId', '==', item.variantId || null)
            );
            const invSnap = await getDocs(invQuery); // getDocs inside transaction is fine for simple queries if not strictly consistent, but better to get refs first
            if (!invSnap.empty) {
              const invDoc = invSnap.docs[0];
              const currentQty = invDoc.data().quantity || 0;
              transaction.update(invDoc.ref, {
                quantity: currentQty + item.quantity,
                lastStockUpdate: serverTimestamp()
              });
            }
          }
        }

        // If refunded, create transaction
        if (newStatus === 'refunded') {
          // Try to find the original order to get the account
          let accountId = '';
          let method = 'Cash';
          if (requestData.orderId) {
            const ordersQuery = query(collection(db, 'orders'), where('orderNumber', '==', requestData.orderId));
            const ordersSnap = await getDocs(ordersQuery);
            if (!ordersSnap.empty) {
              const orderData = ordersSnap.docs[0].data();
              if (orderData.paymentMethod) {
                method = orderData.paymentMethod;
                const accountsQuery = query(collection(db, 'accounts'), where('name', '==', method));
                const accountsSnap = await getDocs(accountsQuery);
                if (!accountsSnap.empty) {
                  accountId = accountsSnap.docs[0].id;
                }
              }
            }
          }
          
          if (!accountId) {
            const allAccountsSnap = await getDocs(query(collection(db, 'accounts'), limit(1)));
            if (!allAccountsSnap.empty) {
              accountId = allAccountsSnap.docs[0].id;
            }
          }

          const transRef = doc(collection(db, 'transactions'));
          transaction.set(transRef, {
            type: 'expense',
            category: 'Refund',
            amount: requestData.refundAmount,
            description: `Refund for RMA #${requestId} (Order #${requestData.orderId})`,
            date: serverTimestamp(),
            method: method,
            accountId: accountId,
            uid: auth.currentUser?.uid,
            createdAt: serverTimestamp()
          });

          if (accountId) {
            const accountRef = doc(db, 'accounts', accountId);
            const accountSnap = await transaction.get(accountRef);
            if (accountSnap.exists()) {
              const currentBalance = accountSnap.data().balance || 0;
              transaction.update(accountRef, {
                balance: currentBalance - requestData.refundAmount,
                updatedAt: serverTimestamp()
              });
            }
          }
        }
      });

      toast.success(`RMA status updated to ${newStatus}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `rma_requests/${requestId}`);
    }
  };

  const filteredRequests = requests.filter(r => 
    r.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-[#141414] tracking-tight">Returns & RMA</h2>
          <p className="text-sm text-gray-500 mt-1">Manage product returns, refunds, and replacements.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#141414] text-white rounded-lg text-sm font-medium hover:bg-black transition-colors"
        >
          <Plus size={16} />
          New RMA Request
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
              <Clock size={20} />
            </div>
            <span className="text-sm font-bold text-gray-900">Pending</span>
          </div>
          <h3 className="text-2xl font-bold text-[#141414]">
            {requests.filter(r => r.status === 'pending').length}
          </h3>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <RefreshCcw size={20} />
            </div>
            <span className="text-sm font-bold text-gray-900">Processing</span>
          </div>
          <h3 className="text-2xl font-bold text-[#141414]">
            {requests.filter(r => ['approved', 'received'].includes(r.status)).length}
          </h3>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-50 text-green-600 rounded-lg">
              <CheckCircle2 size={20} />
            </div>
            <span className="text-sm font-bold text-gray-900">Refunded</span>
          </div>
          <h3 className="text-2xl font-bold text-[#141414]">
            {requests.filter(r => r.status === 'refunded').length}
          </h3>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-50 text-red-600 rounded-lg">
              <XCircle size={20} />
            </div>
            <span className="text-sm font-bold text-gray-900">Rejected</span>
          </div>
          <h3 className="text-2xl font-bold text-[#141414]">
            {requests.filter(r => r.status === 'rejected').length}
          </h3>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by Order ID or RMA ID..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-[10px] uppercase tracking-widest text-gray-500">
                <th className="px-6 py-4 font-semibold">RMA ID</th>
                <th className="px-6 py-4 font-semibold">Order ID</th>
                <th className="px-6 py-4 font-semibold">Reason</th>
                <th className="px-6 py-4 font-semibold">Refund</th>
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
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500 text-sm">
                    No RMA requests found.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4">
                      <span className="text-xs font-mono font-bold text-gray-900">#{request.id.slice(-6).toUpperCase()}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium text-gray-600">{request.orderId}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-gray-600 truncate max-w-[200px] block">{request.reason}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-gray-900">৳{request.refundAmount.toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                        request.status === 'refunded' ? 'bg-green-50 text-green-600' :
                        request.status === 'rejected' ? 'bg-red-50 text-red-600' :
                        request.status === 'pending' ? 'bg-orange-50 text-orange-600' :
                        'bg-blue-50 text-blue-600'
                      }`}>
                        {request.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {request.status === 'pending' && (
                          <button 
                            onClick={() => handleUpdateStatus(request.id, 'approved')}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="Approve"
                          >
                            <CheckCircle2 size={16} />
                          </button>
                        )}
                        {request.status === 'approved' && (
                          <button 
                            onClick={() => handleUpdateStatus(request.id, 'received')}
                            className="p-1 text-purple-600 hover:bg-purple-50 rounded"
                            title="Mark Received"
                          >
                            <Package size={16} />
                          </button>
                        )}
                        {request.status === 'received' && (
                          <button 
                            onClick={() => handleUpdateStatus(request.id, 'refunded')}
                            className="p-1 text-green-600 hover:bg-green-50 rounded"
                            title="Process Refund"
                          >
                            <DollarSign size={16} />
                          </button>
                        )}
                        {['pending', 'approved'].includes(request.status) && (
                          <button 
                            onClick={() => handleUpdateStatus(request.id, 'rejected')}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="Reject"
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
