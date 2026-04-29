import React, { useState, useEffect } from 'react';
import { 
  Users, 
  User as UserIcon,
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
  Check,
  LayoutDashboard,
  ShoppingCart,
  FileText,
  Package,
  Truck,
  ClipboardList,
  CreditCard,
  BarChart3,
  Users2,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    if (!currentUser) return;

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
  }, [currentUser]);

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
      let authDeleteSuccess = false;
      try {
        const response = await fetch(`/api/users/${userId}`, {
          method: 'DELETE',
        });
        
        if (response.ok) {
          authDeleteSuccess = true;
        } else {
          const errorData = await (response.headers.get('content-type')?.includes('json') ? response.json() : { error: 'Unknown error' });
          console.warn('Failed to delete user from Auth:', errorData.error);
        }
      } catch (apiError) {
        console.warn('API error during auth deletion:', apiError);
      }

      // 2. Delete from Firestore
      const userRef = doc(db, 'users', userId);
      await deleteDoc(userRef);
      
      // Log activity
      await addActivityLog('Deleted User', 'Team', `Deleted user ${userName}`);
      
      if (authDeleteSuccess) {
        toast.success('User deleted successfully.');
      } else {
        toast.success('User removed from team, but may still exist in Auth.');
      }
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
      admin: { color: 'bg-purple-50 dark:bg-purple-500/20 text-[#9333EA] border-transparent', icon: ShieldCheck, label: 'Admin' },
      manager: { color: 'bg-brand/10 dark:bg-brand/20 text-[#0866FF] border-transparent', icon: Shield, label: 'Manager' },
      staff: { color: 'bg-surface-hover text-[#475569] border-transparent', icon: UserIcon, label: 'Staff' }
    };
    const config = configs[role] || configs.staff;
    const Icon = config.icon;

    return (
       <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold border ${config.color}`}>
         <Icon size={14} strokeWidth={2.5} />
         <span className="capitalize">{config.label}</span>
       </div>
    );
  };

  const filteredUsers = users.filter(user => 
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6 sm:space-y-8 max-w-[1600px] mx-auto">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl sm:text-3xl font-bold text-primary tracking-tight">Team Management</h2>
          <p className="text-xs sm:text-sm text-secondary">Manage your team members, roles, and track their activities.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-surface p-1.5 rounded-xl border border-border shadow-subtle flex items-center">
            <button 
              onClick={() => setActiveTab('members')}
              className={`px-4 flex items-center justify-center gap-2 py-2 rounded-lg text-[13px] font-semibold transition-all ${activeTab === 'members' ? 'bg-brand/10 dark:bg-brand/20 text-[#0866FF]' : 'text-secondary hover:text-primary'}`}
            >
              <Users size={16} />
              Members
            </button>
            <button 
              onClick={() => setActiveTab('activity')}
              className={`px-4 flex items-center justify-center gap-2 py-2 rounded-lg text-[13px] font-semibold transition-all ${activeTab === 'activity' ? 'bg-brand/10 dark:bg-brand/20 text-[#0866FF]' : 'text-secondary hover:text-primary'}`}
            >
              <Activity size={16} />
              Activity Logs
            </button>
          </div>
          {currentUserRole === 'admin' && (
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#0866FF] text-white rounded-xl text-[13px] font-semibold hover:bg-brand-hover transition-all shadow-subtle"
            >
              <UserPlus size={16} />
              Add Member
            </button>
          )}
        </div>
      </div>

      {activeTab === 'members' ? (
        <div className="space-y-6 sm:space-y-8">
          {/* Search Bar */}
          <div className="relative w-full max-w-[320px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
            <input 
              type="text"
              placeholder="Search members by name or email..."
              className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-xl text-[13px] text-secondary focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all shadow-subtle"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
             <div className="bg-surface p-5 lg:p-6 rounded-[20px] border border-border shadow-subtle flex flex-col justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-[48px] h-[48px] rounded-[14px] bg-brand/10 dark:bg-brand/20 text-[#0866FF] flex items-center justify-center shrink-0">
                    <Users size={24} />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-secondary uppercase tracking-widest mb-1">TOTAL MEMBERS</p>
                    <p className="text-[28px] font-black text-primary leading-none">{users.length}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-5">
                   <p className="text-[12px] text-muted font-medium tracking-wide">Active team members</p>
                   <div className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-green-50 dark:bg-green-500/20 text-[#059669]">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m19 12-7-7-7 7"/><path d="M12 19V5"/></svg>
                      12%
                   </div>
                </div>
             </div>

             <div className="bg-surface p-5 lg:p-6 rounded-[20px] border border-border shadow-subtle flex flex-col justify-between">
               <div className="flex items-start gap-4">
                  <div className="w-[48px] h-[48px] rounded-[14px] bg-purple-50 dark:bg-purple-500/20 text-[#9333EA] flex items-center justify-center shrink-0">
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-secondary uppercase tracking-widest mb-1">ADMINS</p>
                    <p className="text-[28px] font-black text-primary leading-none">{users.filter(u => u.role === 'admin').length}</p>
                  </div>
               </div>
               <div className="flex items-center justify-between mt-5">
                   <p className="text-[12px] text-muted font-medium tracking-wide">Full system access</p>
                   <div className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-500/20 text-[#9333EA]">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m19 12-7-7-7 7"/><path d="M12 19V5"/></svg>
                      8%
                   </div>
                </div>
             </div>

             <div className="bg-surface p-5 lg:p-6 rounded-[20px] border border-border shadow-subtle flex flex-col justify-between">
               <div className="flex items-start gap-4">
                  <div className="w-[48px] h-[48px] rounded-[14px] bg-brand/10 dark:bg-brand/20 text-[#0866FF] flex items-center justify-center shrink-0">
                    <UserCheck size={24} />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-secondary uppercase tracking-widest mb-1">MANAGERS</p>
                    <p className="text-[28px] font-black text-primary leading-none">{users.filter(u => u.role === 'manager').length}</p>
                  </div>
               </div>
               <div className="flex items-center justify-between mt-5">
                   <p className="text-[12px] text-muted font-medium tracking-wide">Manage team & data</p>
                   <div className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-brand/10 dark:bg-brand/20 text-[#0866FF]">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m19 12-7-7-7 7"/><path d="M12 19V5"/></svg>
                      5%
                   </div>
                </div>
             </div>

             <div className="bg-surface p-5 lg:p-6 rounded-[20px] border border-border shadow-subtle flex flex-col justify-between">
               <div className="flex items-start gap-4">
                  <div className="w-[48px] h-[48px] rounded-[14px] bg-green-50 dark:bg-green-500/20 text-[#059669] flex items-center justify-center shrink-0">
                    <Users2 size={24} />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-secondary uppercase tracking-widest mb-1">ACTIVE TODAY</p>
                    <p className="text-[28px] font-black text-primary leading-none">{users.filter(u => u.lastLogin && u.lastLogin.toDate && new Date().toDateString() === u.lastLogin.toDate().toDateString()).length || 0}</p>
                  </div>
               </div>
               <div className="flex items-center justify-between mt-5">
                   <p className="text-[12px] text-muted font-medium tracking-wide">Logged in members</p>
                   <div className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-green-50 dark:bg-green-500/20 text-[#059669]">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m19 12-7-7-7 7"/><path d="M12 19V5"/></svg>
                      10%
                   </div>
                </div>
             </div>
          </div>

          <div className="bg-surface rounded-[20px] border border-border shadow-subtle overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1000px] whitespace-nowrap">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-6 py-5 text-[11px] font-bold text-muted uppercase tracking-wider">Member</th>
                    <th className="px-6 py-5 text-[11px] font-bold text-muted uppercase tracking-wider">Role</th>
                    <th className="px-6 py-5 text-[11px] font-bold text-muted uppercase tracking-wider">Status</th>
                    <th className="px-6 py-5 text-[11px] font-bold text-muted uppercase tracking-wider">Last Login</th>
                    <th className="px-6 py-5 text-[11px] font-bold text-muted uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <Loader2 className="animate-spin mx-auto text-muted" />
                      </td>
                    </tr>
                  ) : paginatedUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-muted text-[13px]">
                        No team members found.
                      </td>
                    </tr>
                  ) : (
                    paginatedUsers.map((user) => {
                      const initials = user.name ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U';
                      
                      return (
                      <tr key={user.uid} className="hover:bg-surface-hover/50 transition-colors group">
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-4">
                            <div className={`w-[42px] h-[42px] rounded-full flex items-center justify-center text-[14px] font-bold ${
                               user.role === 'admin' ? 'bg-purple-50 dark:bg-purple-500/20 text-[#9333EA]' :
                               user.role === 'manager' ? 'bg-brand/10 dark:bg-brand/20 text-[#0866FF]' :
                               user.role === 'staff' ? 'bg-[#FFEDD5] text-[#EA580C]' : 'bg-surface-hover text-secondary'
                            }`}>
                              {initials}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[14px] font-bold text-primary mb-0.5">{user.name}</span>
                              <span className="text-[12px] text-secondary">{user.email}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <RoleBadge role={user.role} />
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${user.active ? 'bg-[#059669]' : 'bg-gray-300'}`} />
                            <span className={`text-[13px] font-semibold ${user.active ? 'text-[#059669]' : 'text-secondary'}`}>
                              {user.active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2 text-[13px] text-secondary">
                             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                             {user.lastLogin?.toDate 
                                ? user.lastLogin.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' • ' + user.lastLogin.toDate().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) 
                                : (user.lastLogin?.seconds ? new Date(user.lastLogin.seconds * 1000).toLocaleDateString('en-US') : 'Never')}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center justify-end gap-2.5">
                            {currentUserRole === 'admin' && (
                              <>
                                {user.role !== 'admin' && (
                                  <button 
                                    onClick={() => openPermissionsModal(user)}
                                    className="w-[36px] h-[36px] flex items-center justify-center rounded-xl border border-border text-secondary hover:bg-surface-hover transition-colors shadow-subtle"
                                    title="Manage Permissions"
                                  >
                                    <Settings size={16} />
                                  </button>
                                )}
                                <div className="relative group/select">
                                   <select 
                                     value={user.role}
                                     onChange={(e) => handleUpdateRole(user.uid, e.target.value as UserRole)}
                                     className="appearance-none pr-8 pl-3 py-2 text-[13px] font-semibold bg-surface border border-border rounded-xl outline-none focus:border-brand shadow-subtle hover:bg-surface-hover transition-colors cursor-pointer text-secondary min-w-[110px]"
                                   >
                                     <option value="staff">Staff</option>
                                     <option value="manager">Manager</option>
                                     <option value="admin">Admin</option>
                                   </select>
                                   <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted group-hover/select:text-secondary transition-colors">
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                                   </div>
                                </div>
                                <button 
                                  onClick={() => handleToggleStatus(user.uid, user.active)}
                                  className={`w-[36px] h-[36px] flex items-center justify-center rounded-xl border border-border text-[#EA580C] hover:bg-orange-50 dark:bg-orange-500/20 hover:border-[#FDBA74] transition-colors shadow-subtle`}
                                  title="Edit role/status"
                                >
                                   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                                </button>
                                <button 
                                  onClick={() => handleDeleteUser(user.uid, user.name)}
                                  className="w-[36px] h-[36px] flex items-center justify-center rounded-xl border border-border text-[#DC2626] hover:bg-[#FEF2F2] hover:border-[#FECACA] transition-colors shadow-subtle"
                                  title="Delete User"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              </table>
            </div>
            
            {/* Pagination / Footer */}
            <div className="p-4 sm:p-5 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-[13px]">
               <span className="text-secondary font-medium">
                 Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredUsers.length)} of {filteredUsers.length} members
               </span>
               <div className="flex items-center gap-1 sm:gap-2">
                 <button 
                   onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                   disabled={currentPage === 1}
                   className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-secondary hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                 </button>
                 
                 {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                   <button 
                     key={page}
                     onClick={() => setCurrentPage(page)}
                     className={`w-8 h-8 flex items-center justify-center rounded-lg font-semibold ${
                       currentPage === page 
                         ? 'bg-[#0866FF] text-white shadow-subtle' 
                         : 'hover:bg-surface-hover text-secondary'
                     }`}
                   >
                     {page}
                   </button>
                 ))}

                 <button 
                   onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                   disabled={currentPage === totalPages || totalPages === 0}
                   className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-secondary hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                 </button>
               </div>
               
               <div className="relative group/perpage max-sm:w-full">
                 <select 
                   value={itemsPerPage}
                   onChange={(e) => {
                     setItemsPerPage(Number(e.target.value));
                     setCurrentPage(1);
                   }}
                   className="appearance-none w-full sm:w-auto pr-8 pl-4 py-2.5 text-[13px] font-medium bg-surface border border-border rounded-xl outline-none focus:border-brand shadow-subtle hover:bg-surface-hover transition-colors cursor-pointer text-secondary"
                 >
                   <option value={10}>10 per page</option>
                   <option value={25}>25 per page</option>
                   <option value={50}>50 per page</option>
                 </select>
                 <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted group-hover/perpage:text-secondary transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                 </div>
               </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-surface rounded-3xl border border-border shadow-subtle overflow-hidden">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <h3 className="text-lg font-bold text-primary">Recent Activities</h3>
              <button className="text-xs font-bold text-brand hover:underline">Clear Logs</button>
            </div>
            <div className="divide-y divide-border">
              {activityLogs.length === 0 ? (
                <div className="p-12 text-center text-muted text-sm">
                  No activity logs found.
                </div>
              ) : (
                activityLogs.map((log) => (
                  <div key={log.id} className="p-6 hover:bg-surface-hover/50 transition-colors flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-surface-hover flex items-center justify-center text-muted border border-border">
                      <Activity size={18} />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-primary">
                          {log.userName} <span className="font-normal text-secondary">{log.action}</span>
                        </p>
                        <span className="text-[10px] font-bold text-muted uppercase tracking-wider">
                          {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString() : (log.timestamp?.seconds ? new Date(log.timestamp.seconds * 1000).toLocaleString() : 'N/A')}
                        </span>
                      </div>
                      <p className="text-xs text-secondary">{log.details}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="px-2 py-0.5 rounded-md bg-surface-hover text-[10px] font-bold text-secondary uppercase">
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
          <div className="bg-surface rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand/10 rounded-xl flex items-center justify-center text-brand">
                  <UserPlus size={20} />
                </div>
                <h3 className="text-xl font-bold text-primary">Add Team Member</h3>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-surface-hover rounded-xl transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAddMember} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted uppercase tracking-widest ml-1">Full Name</label>
                <input 
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Enter full name"
                  className="w-full px-4 py-3 bg-surface-hover border border-transparent rounded-xl text-sm focus:bg-surface focus:border-brand/20 outline-none transition-all"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted uppercase tracking-widest ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
                  <input 
                    type="email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full pl-12 pr-4 py-3 bg-surface-hover border border-transparent rounded-xl text-sm focus:bg-surface focus:border-brand/20 outline-none transition-all"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted uppercase tracking-widest ml-1">Initial Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
                  <input 
                    type="password"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-4 py-3 bg-surface-hover border border-transparent rounded-xl text-sm focus:bg-surface focus:border-brand/20 outline-none transition-all"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted uppercase tracking-widest ml-1">Assign Role</label>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    type="button"
                    onClick={() => setNewUserRole('staff')}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${newUserRole === 'staff' ? 'bg-slate-900 dark:bg-white text-white dark:text-black border-slate-900 dark:border-white' : 'bg-surface text-secondary border-border hover:bg-surface-hover'}`}
                  >
                    <UserCheck size={14} /> Staff
                  </button>
                  <button 
                    type="button"
                    onClick={() => setNewUserRole('manager')}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${newUserRole === 'manager' ? 'bg-brand text-white border-brand' : 'bg-surface text-secondary border-border hover:bg-surface-hover'}`}
                  >
                    <Shield size={14} /> Manager
                  </button>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-3 px-6 bg-surface-hover text-secondary rounded-xl font-bold hover:bg-surface-hover transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 py-3 px-6 bg-brand text-white rounded-xl font-bold hover:bg-brand-hover transition-all shadow-lg shadow-brand/20 disabled:opacity-50 flex items-center justify-center gap-2"
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
      <AnimatePresence>
        {isPermissionsModalOpen && selectedUser && tempPermissions && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-surface rounded-[24px] w-full max-w-2xl shadow-2xl overflow-hidden my-auto"
            >
              <div className="p-6 md:p-8 border-b border-border flex justify-between items-start">
                <div className="flex items-center gap-5">
                  <div className="w-[60px] h-[60px] bg-[#4F46E5] text-white rounded-[20px] flex items-center justify-center shadow-lg shadow-[#4F46E5]/20 shrink-0">
                    <ShieldCheck size={32} strokeWidth={2} />
                  </div>
                  <div>
                    <h3 className="text-[26px] font-bold text-primary tracking-tight leading-tight">Module Permissions</h3>
                    <p className="text-[15px] font-medium text-secondary mt-1">Managing access for <span className="text-brand font-semibold">{selectedUser.name}</span></p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsPermissionsModalOpen(false)} 
                  className="w-10 h-10 flex flex-col items-center justify-center border border-border text-muted hover:text-primary rounded-full transition-all hover:bg-surface-hover active:scale-95"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="mx-6 md:mx-8 mt-6 mb-4 px-5 py-4 bg-background rounded-2xl border border-blue-50/50 flex items-center justify-between">
                <div className="flex items-center gap-3 text-secondary">
                  <Info size={20} className="text-[#4F46E5]" />
                  <span className="text-[14px]">Enable or disable modules to control what {selectedUser.name} can access.</span>
                </div>
                <button 
                  onClick={() => {
                    const allEnabled = Object.values(tempPermissions).every(v => v);
                    const newPerms = {} as UserPermissions;
                    (Object.keys(tempPermissions) as Array<keyof UserPermissions>).forEach(key => {
                      newPerms[key] = !allEnabled;
                    });
                    setTempPermissions(newPerms);
                  }}
                  className="text-[14px] font-semibold text-brand hover:underline"
                >
                  {Object.values(tempPermissions).every(v => v) ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              
              <div className="p-6 md:p-8 pt-0 grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[50vh] overflow-y-auto no-scrollbar">
                {(Object.keys(tempPermissions) as Array<keyof UserPermissions>).map((key) => {
                  const moduleIcons: Record<string, any> = {
                    dashboard: LayoutDashboard,
                    pos: ShoppingCart,
                    orders: FileText,
                    inventory: Package,
                    crm: Users2,
                    suppliers: Truck,
                    logistics: Activity,
                    tasks: ClipboardList,
                    finance: CreditCard,
                    hr: UserCheck,
                    team: Shield,
                    settings: Settings,
                    reports: BarChart3
                  };
                  const Icon = moduleIcons[key] || Settings;
                  const isEnabled = tempPermissions[key];

                  return (
                    <motion.div 
                      key={key}
                      onClick={() => togglePermission(key)}
                      className={`p-4 rounded-[16px] border transition-all cursor-pointer flex items-center justify-between group overflow-hidden relative ${
                        isEnabled 
                          ? 'bg-surface border-border shadow-subtle' 
                          : 'bg-surface border-border hover:border-border opacity-80'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-[52px] h-[52px] rounded-2xl flex items-center justify-center transition-all ${isEnabled ? 'bg-brand/5 text-[#4F46E5]' : 'bg-surface-hover text-muted'}`}>
                          <Icon size={24} strokeWidth={2.2} />
                        </div>
                        <div className="flex flex-col">
                          <span className={`text-[15px] font-bold capitalize tracking-tight ${isEnabled ? 'text-primary' : 'text-secondary'}`}>
                            {key}
                          </span>
                          <span className={`text-[12px] font-medium flex items-center gap-1.5 mt-0.5 ${isEnabled ? 'text-[#10B981]' : 'text-muted'}`}>
                            {isEnabled && <CheckCircle2 size={14} />}
                            {isEnabled ? 'Access Granted' : 'No Access'}
                          </span>
                        </div>
                      </div>

                      <div className={`w-[44px] h-[24px] rounded-full transition-all duration-300 relative p-1 ${isEnabled ? 'bg-brand' : 'bg-gray-200'}`}>
                        <motion.div 
                          animate={{ x: isEnabled ? 20 : 0 }}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          className="w-4 h-4 bg-surface rounded-full shadow-subtle"
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              <div className="p-6 md:p-8 border-t border-border flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={() => setIsPermissionsModalOpen(false)}
                  className="py-3 px-8 bg-surface border border-border text-secondary rounded-xl font-bold text-[15px] hover:bg-surface-hover transition-all active:scale-95 text-center min-w-[140px]"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleUpdatePermissions}
                  disabled={isUpdatingPermissions}
                  className="flex-1 py-3 px-8 bg-brand text-white rounded-xl font-bold text-[15px] hover:bg-brand-hover transition-all shadow-subtle shadow-brand/20 disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95"
                >
                  {isUpdatingPermissions ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 size={20} />
                      Save Permissions
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
