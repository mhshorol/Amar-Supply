import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  MoreVertical, 
  Trash2, 
  Edit, 
  Search, 
  Loader2,
  CheckCircle2,
  XCircle,
  Activity,
  UserCheck,
  Mail,
  Clock
} from 'lucide-react';
import { db, auth, collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, Timestamp, where, getDocs, addDoc } from '../firebase';
import { User, UserRole, ActivityLog } from '../types';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export default function Team() {
  const [users, setUsers] = useState<User[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'members' | 'activity'>('members');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>('staff');

  useEffect(() => {
    if (!auth.currentUser) return;

    // Get current user's role
    const fetchCurrentUserRole = async () => {
      const userDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', auth.currentUser?.uid)));
      if (!userDoc.empty) {
        setCurrentUserRole(userDoc.docs[0].data().role as UserRole);
      }
    };
    fetchCurrentUserRole();

    // Subscribe to users
    const unsubUsers = onSnapshot(query(collection(db, 'users'), orderBy('name', 'asc')), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as any as User)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });

    // Subscribe to activity logs
    const unsubLogs = onSnapshot(query(collection(db, 'activityLogs'), orderBy('timestamp', 'desc')), (snapshot) => {
      setActivityLogs(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as any as ActivityLog)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'activityLogs');
    });

    return () => {
      unsubUsers();
      unsubLogs();
    };
  }, []);

  const handleUpdateRole = async (userId: string, newRole: UserRole) => {
    if (currentUserRole !== 'admin') {
      toast.error('Only administrators can change roles.');
      return;
    }

    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { role: newRole });
      
      // Log activity
      await addActivityLog('Updated User Role', 'Team', `Changed role to ${newRole} for user ${userId}`);
      
      toast.success('User role updated successfully.');
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update user role.');
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    if (currentUserRole !== 'admin') {
      toast.error('Only administrators can change user status.');
      return;
    }

    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { active: !currentStatus });
      
      // Log activity
      await addActivityLog('Updated User Status', 'Team', `${!currentStatus ? 'Activated' : 'Deactivated'} user ${userId}`);
      
      toast.success(`User ${!currentStatus ? 'activated' : 'deactivated'} successfully.`);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update user status.');
    }
  };

  const addActivityLog = async (action: string, module: string, details: string) => {
    try {
      await addDoc(collection(db, 'activityLogs'), {
        userId: auth.currentUser?.uid,
        userName: auth.currentUser?.displayName || auth.currentUser?.email,
        action,
        module,
        details,
        timestamp: Timestamp.now()
      });
    } catch (error) {
      console.error('Error adding activity log:', error);
    }
  };

  const RoleBadge = ({ role }: { role: UserRole }) => {
    const configs = {
      admin: { color: 'bg-purple-100 text-purple-700 border-purple-200', icon: ShieldCheck, label: 'Admin' },
      manager: { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Shield, label: 'Manager' },
      staff: { color: 'bg-gray-100 text-gray-700 border-gray-200', icon: UserCheck, label: 'Staff' }
    };
    const config = configs[role] || configs.staff;
    const Icon = config.icon;

    return (
      <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${config.color}`}>
        <Icon size={12} />
        {config.label}
      </span>
    );
  };

  const filteredUsers = users.filter(user => 
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold text-[#141414] tracking-tight">Team Management</h2>
          <p className="text-sm text-[#6b7280]">Manage your team members, roles, and track their activities.</p>
        </div>
        <div className="flex gap-3">
          <div className="bg-white p-1 rounded-xl border border-gray-100 shadow-sm flex">
            <button 
              onClick={() => setActiveTab('members')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'members' ? 'bg-[#141414] text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <Users size={14} className="inline mr-2" />
              Members
            </button>
            <button 
              onClick={() => setActiveTab('activity')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'activity' ? 'bg-[#141414] text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <Activity size={14} className="inline mr-2" />
              Activity Logs
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'members' ? (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <div className="relative max-w-md w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text"
                placeholder="Search members by name or email..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-100 rounded-xl text-sm focus:border-[#00AEEF] outline-none transition-all shadow-sm"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-50">
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Member</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Last Login</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <Loader2 className="animate-spin mx-auto text-gray-300" />
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-400 text-sm">
                        No team members found.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.uid} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#00AEEF]/10 flex items-center justify-center text-[#00AEEF] font-bold text-sm border border-[#00AEEF]/20">
                              {user.name?.[0] || 'U'}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-gray-900">{user.name}</span>
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <Mail size={12} />
                                {user.email}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <RoleBadge role={user.role} />
                        </td>
                        <td className="px-6 py-4">
                          <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase ${user.active ? 'text-green-600' : 'text-red-600'}`}>
                            {user.active ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                            {user.active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Clock size={14} />
                            {(user as any).lastLogin?.toDate ? (user as any).lastLogin.toDate().toLocaleString() : ((user as any).lastLogin?.seconds ? new Date((user as any).lastLogin.seconds * 1000).toLocaleString() : 'Never')}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {currentUserRole === 'admin' && (
                              <>
                                <select 
                                  value={user.role}
                                  onChange={(e) => handleUpdateRole(user.uid, e.target.value as UserRole)}
                                  className="text-xs font-bold bg-white border border-gray-100 rounded-lg px-2 py-1 outline-none focus:border-[#00AEEF]"
                                >
                                  <option value="staff">Staff</option>
                                  <option value="manager">Manager</option>
                                  <option value="admin">Admin</option>
                                </select>
                                <button 
                                  onClick={() => handleToggleStatus(user.uid, user.active)}
                                  className={`p-2 rounded-lg transition-colors shadow-sm border border-transparent ${user.active ? 'hover:bg-red-50 text-red-400 hover:text-red-600' : 'hover:bg-green-50 text-green-400 hover:text-green-600'}`}
                                  title={user.active ? 'Deactivate User' : 'Activate User'}
                                >
                                  {user.active ? <XCircle size={14} /> : <UserCheck size={14} />}
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
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">Recent Activities</h3>
              <button className="text-xs font-bold text-[#00AEEF] hover:underline">Clear Logs</button>
            </div>
            <div className="divide-y divide-gray-50">
              {activityLogs.length === 0 ? (
                <div className="p-12 text-center text-gray-400 text-sm">
                  No activity logs found.
                </div>
              ) : (
                activityLogs.map((log) => (
                  <div key={log.id} className="p-6 hover:bg-gray-50/50 transition-colors flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 border border-gray-100">
                      <Activity size={18} />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-gray-900">
                          {log.userName} <span className="font-normal text-gray-500">{log.action}</span>
                        </p>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString() : (log.timestamp?.seconds ? new Date(log.timestamp.seconds * 1000).toLocaleString() : 'N/A')}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">{log.details}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="px-2 py-0.5 rounded-md bg-gray-100 text-[10px] font-bold text-gray-500 uppercase">
                          {log.module}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
