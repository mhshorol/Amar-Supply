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
  Clock,
  Plus,
  X,
  Lock,
  Settings,
  Check
} from 'lucide-react';
import { db, auth, collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, Timestamp, where, getDocs, addDoc, serverTimestamp, setDoc, getSecondaryAuth, createUserWithEmailAndPassword, signOut } from '../firebase';
import { User, UserRole, ActivityLog, UserPermissions } from '../types';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { useAuth, defaultPermissions, adminPermissions } from '../contexts/AuthContext';

export default function Team() {
  const { user: currentUser, role: currentUserRole } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'members' | 'activity'>('members');
  
  // Add Member Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('staff');
  const [isCreating, setIsCreating] = useState(false);

  // Permissions Modal State
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [tempPermissions, setTempPermissions] = useState<UserPermissions | null>(null);
  const [isUpdatingPermissions, setIsUpdatingPermissions] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) return;

    // Subscribe to users
    const unsubUsers = onSnapshot(query(collection(db, 'users'), orderBy('name', 'asc')), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as any as User)));
      setLoading(false);
    }, (error) => {
      if (error.code !== 'permission-denied') {
        handleFirestoreError(error, OperationType.LIST, 'users');
      }
    });

    // Subscribe to activity logs
    const unsubLogs = onSnapshot(query(collection(db, 'activityLogs'), orderBy('timestamp', 'desc')), (snapshot) => {
      setActivityLogs(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as any as ActivityLog)));
    }, (error) => {
      if (error.code !== 'permission-denied') {
        handleFirestoreError(error, OperationType.LIST, 'activityLogs');
      }
    });

    return () => {
      unsubUsers();
      unsubLogs();
    };
  }, []);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName || !newUserEmail || !newUserPassword) {
      toast.error('Please fill in all fields.');
      return;
    }

    setIsCreating(true);
    try {
      const secondaryAuth = getSecondaryAuth();
      if (!secondaryAuth) throw new Error("Auth not configured");

      // Create user in Firebase Auth using secondary app to avoid logging out current user
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, newUserEmail, newUserPassword);
      const newUid = userCredential.user.uid;

      // Sign out from secondary app immediately
      await signOut(secondaryAuth);

      // Create user document in Firestore
      const newUser: User = {
        uid: newUid,
        name: newUserName,
        email: newUserEmail,
        role: newUserRole,
        active: true,
        permissions: newUserRole === 'admin' ? adminPermissions : defaultPermissions,
        createdAt: serverTimestamp(),
        lastLogin: null
      };

      await setDoc(doc(db, 'users', newUid), newUser);
      
      // Log activity
      await addActivityLog('Added New Member', 'Team', `Added ${newUserName} (${newUserEmail}) as ${newUserRole}`);
      
      toast.success('Team member added successfully.');
      setIsAddModalOpen(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserRole('staff');
    } catch (error: any) {
      console.error('Error adding member:', error);
      if (error.code === 'auth/email-already-in-use') {
        toast.error('This email is already registered. Please use a different email.');
      } else if (error.code === 'auth/operation-not-allowed') {
        toast.error('Email/Password authentication is not enabled in Firebase Console.');
      } else if (error.code === 'permission-denied' || error.message?.includes('permission-denied')) {
        toast.error('Missing or insufficient permissions to add a team member. Please check your role.');
      } else {
        toast.error(`Error adding member: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: UserRole) => {
    if (currentUserRole !== 'admin') {
      toast.error('Only administrators can change roles.');
      return;
    }

    try {
      const userRef = doc(db, 'users', userId);
      const updates: any = { role: newRole };
      
      // If promoting to admin, give all permissions
      if (newRole === 'admin') {
        updates.permissions = adminPermissions;
      }

      await updateDoc(userRef, updates);
      
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

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (currentUserRole !== 'admin') {
      toast.error('Only administrators can delete users.');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete user ${userName}? This action cannot be undone.`)) {
      return;
    }

    try {
      // 1. Delete from Firebase Auth via API
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete user from Auth');
      }

      // 2. Delete from Firestore
      const userRef = doc(db, 'users', userId);
      await deleteDoc(userRef);
      
      // Log activity
      await addActivityLog('Deleted User', 'Team', `Deleted user ${userName}`);
      
      toast.success('User deleted successfully.');
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(`Failed to delete user: ${error.message}`);
    }
  };

  const openPermissionsModal = (user: User) => {
    setSelectedUser(user);
    setTempPermissions(user.permissions || defaultPermissions);
    setIsPermissionsModalOpen(true);
  };

  const handleUpdatePermissions = async () => {
    if (!selectedUser || !tempPermissions) return;
    
    setIsUpdatingPermissions(true);
    try {
      const userRef = doc(db, 'users', selectedUser.uid);
      await updateDoc(userRef, { permissions: tempPermissions });
      
      // Log activity
      await addActivityLog('Updated Permissions', 'Team', `Updated module permissions for ${selectedUser.name}`);
      
      toast.success('Permissions updated successfully.');
      setIsPermissionsModalOpen(false);
    } catch (error) {
      console.error('Error updating permissions:', error);
      toast.error('Failed to update permissions.');
    } finally {
      setIsUpdatingPermissions(false);
    }
  };

  const togglePermission = (key: keyof UserPermissions) => {
    if (!tempPermissions) return;
    setTempPermissions({
      ...tempPermissions,
      [key]: !tempPermissions[key]
    });
  };

  const addActivityLog = async (action: string, module: string, details: string) => {
    try {
      await addDoc(collection(db, 'activityLogs'), {
        userId: currentUser?.uid,
        userName: currentUser?.name || currentUser?.email,
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
          {currentUserRole === 'admin' && (
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#00AEEF] text-white rounded-xl text-xs font-bold hover:bg-[#0095cc] transition-all shadow-lg shadow-[#00AEEF]/20"
            >
              <UserPlus size={16} />
              Add Member
            </button>
          )}
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
                            {user.lastLogin?.toDate ? user.lastLogin.toDate().toLocaleString() : (user.lastLogin?.seconds ? new Date(user.lastLogin.seconds * 1000).toLocaleString() : 'Never')}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {currentUserRole === 'admin' && (
                              <>
                                {user.role !== 'admin' && (
                                  <button 
                                    onClick={() => openPermissionsModal(user)}
                                    className="p-2 rounded-lg hover:bg-blue-50 text-blue-400 hover:text-blue-600 transition-colors shadow-sm border border-transparent"
                                    title="Manage Permissions"
                                  >
                                    <Settings size={14} />
                                  </button>
                                )}
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
                                  className={`p-2 rounded-lg transition-colors shadow-sm border border-transparent ${user.active ? 'hover:bg-orange-50 text-orange-400 hover:text-orange-600' : 'hover:bg-green-50 text-green-400 hover:text-green-600'}`}
                                  title={user.active ? 'Deactivate User' : 'Activate User'}
                                >
                                  {user.active ? <XCircle size={14} /> : <UserCheck size={14} />}
                                </button>
                                <button 
                                  onClick={() => handleDeleteUser(user.uid, user.name)}
                                  className="p-2 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors shadow-sm border border-transparent"
                                  title="Delete User"
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

      {/* Add Member Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-[#00AEEF]">
                  <UserPlus size={20} />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Add Team Member</h3>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAddMember} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
                <input 
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Enter full name"
                  className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl text-sm focus:bg-white focus:border-[#00AEEF]/20 outline-none transition-all"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-transparent rounded-xl text-sm focus:bg-white focus:border-[#00AEEF]/20 outline-none transition-all"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Initial Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="password"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-transparent rounded-xl text-sm focus:bg-white focus:border-[#00AEEF]/20 outline-none transition-all"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Assign Role</label>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    type="button"
                    onClick={() => setNewUserRole('staff')}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${newUserRole === 'staff' ? 'bg-[#141414] text-white border-[#141414]' : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50'}`}
                  >
                    <UserCheck size={14} /> Staff
                  </button>
                  <button 
                    type="button"
                    onClick={() => setNewUserRole('manager')}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${newUserRole === 'manager' ? 'bg-[#00AEEF] text-white border-[#00AEEF]' : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50'}`}
                  >
                    <Shield size={14} /> Manager
                  </button>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-3 px-6 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 py-3 px-6 bg-[#00AEEF] text-white rounded-xl font-bold hover:bg-[#0095cc] transition-all shadow-lg shadow-[#00AEEF]/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isCreating ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                  Create Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Permissions Modal */}
      {isPermissionsModalOpen && selectedUser && tempPermissions && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-[#00AEEF]">
                  <Settings size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Module Permissions</h3>
                  <p className="text-xs text-gray-500">Managing access for {selectedUser.name}</p>
                </div>
              </div>
              <button onClick={() => setIsPermissionsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto">
              {(Object.keys(tempPermissions) as Array<keyof UserPermissions>).map((key) => (
                <div 
                  key={key}
                  onClick={() => togglePermission(key)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${tempPermissions[key] ? 'bg-blue-50 border-[#00AEEF]/20' : 'bg-white border-gray-100 hover:border-gray-200'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${tempPermissions[key] ? 'bg-[#00AEEF] text-white' : 'bg-gray-50 text-gray-400 group-hover:bg-gray-100'}`}>
                      {tempPermissions[key] ? <Check size={16} /> : <X size={16} />}
                    </div>
                    <span className="text-sm font-bold text-gray-700 capitalize">{key}</span>
                  </div>
                  <div className={`w-10 h-5 rounded-full transition-colors relative ${tempPermissions[key] ? 'bg-[#00AEEF]' : 'bg-gray-200'}`}>
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${tempPermissions[key] ? 'right-1' : 'left-1'}`}></div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-6 bg-gray-50 flex gap-3">
              <button 
                onClick={() => setIsPermissionsModalOpen(false)}
                className="flex-1 py-3 px-6 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleUpdatePermissions}
                disabled={isUpdatingPermissions}
                className="flex-1 py-3 px-6 bg-[#141414] text-white rounded-xl font-bold hover:bg-black transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isUpdatingPermissions ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                Save Permissions
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
