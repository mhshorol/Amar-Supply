import React, { useState, useEffect } from 'react';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { 
  Settings as SettingsIcon, 
  User as UserIcon, 
  Bell, 
  Shield, 
  Globe, 
  Database, 
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Building2,
  Upload,
  Save,
  Truck,
  ShoppingCart,
  Users,
  UserPlus,
  CreditCard,
  Calculator,
  ClipboardList,
  Check,
  X,
  Loader2,
  DollarSign,
  Languages,
  Star,
  Info,
  ChevronDown
} from 'lucide-react';
import { toast } from 'sonner';
import { db, auth, doc, getDoc, setDoc, onSnapshot, collection, getDocs, query, where, deleteDoc, writeBatch, updateDoc, addDoc, Timestamp, orderBy, limit } from '../firebase';
import { User, UserRole, UserPermissions } from '../types';
import { useAuth } from '../contexts/AuthContext';
import ConfirmModal from './ConfirmModal';

import { QRCodeCanvas } from 'qrcode.react';

function ActivityLogsTab() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(collection(db, 'activityLogs'), orderBy('timestamp', 'desc'), limit(100));
    const unsub = onSnapshot(q, (snapshot) => {
      setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      console.error("Error fetching activity logs:", error);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-muted" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <ClipboardList size={20} /> Activity Logs
        </h3>
        <span className="text-xs text-secondary font-medium">Last 100 activities</span>
      </div>

      <div className="bg-surface-hover rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px] whitespace-nowrap">
            <thead>
              <tr className="bg-surface-hover text-[10px] uppercase tracking-widest text-secondary">
                <th className="px-6 py-4 font-semibold">Time</th>
                <th className="px-6 py-4 font-semibold">User</th>
                <th className="px-6 py-4 font-semibold">Action</th>
                <th className="px-6 py-4 font-semibold">Module</th>
                <th className="px-6 py-4 font-semibold">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-surface transition-colors">
                  <td className="px-6 py-4 text-[10px] text-secondary whitespace-nowrap">
                    {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-primary">{log.userName}</span>
                      <span className="text-[10px] text-muted">{log.userId?.slice(0, 8)}...</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-medium text-secondary">{log.action}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 bg-surface border border-border rounded text-[10px] font-bold text-secondary uppercase">
                      {log.module}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-secondary max-w-xs truncate">
                    {log.details}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-muted italic">
                    No activity logs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function Settings() {
  const { user: currentUser, role: currentUserRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('General');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
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
  
  // Team Permissions State
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isUpdatingPermissions, setIsUpdatingPermissions] = useState(false);

  const [companyInfo, setCompanyInfo] = useState({
    companyName: '',
    companyLogo: '',
    companyAddress: '',
    companyMobile: '',
    companyPhone: '',
    companyEmail: '',
    companyWebsite: '',
    companyVat: '',
    invoiceFooterNote: '',
    signatureImage: '',
    currency: 'BDT',
    timezone: 'Asia/Dhaka',
    language: 'English',
    steadfastApiKey: '',
    steadfastSecretKey: '',
    wooUrl: '',
    wooConsumerKey: '',
    wooConsumerSecret: '',
    rewardPointsRate: 1
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'company');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setCompanyInfo(prev => ({ ...prev, ...data }));
          if (data.sms) setSmsSettings(prev => ({ ...prev, ...data.sms }));
        }

        const userDocRef = doc(db, 'settings', `user_${auth.currentUser?.uid}`);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          if (data.account) setAccountSettings(prev => ({ ...prev, ...data.account }));
          if (data.notifications) setNotificationSettings(prev => ({ ...prev, ...data.notifications }));
          if (data.security) setSecuritySettings(prev => ({ ...prev, ...data.security }));
          if (data.integrations) setIntegrationSettings(prev => ({ ...prev, ...data.integrations }));
          if (data.dataManagement) setDataSettings(prev => ({ ...prev, ...data.dataManagement }));
          if (data.mobile) setMobileSettings(prev => ({ ...prev, ...data.mobile }));
        }

        // Fetch courier configs from backend
        const response = await fetch('/api/couriers/configs');
        if (response.ok) {
          const data = await (response.headers.get('content-type')?.includes('json') ? response.json() : Promise.reject(new Error('Invalid non-JSON response from server.')));
          setCourierConfigs(prev => ({ ...prev, ...data }));
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();

    // Fetch users for Team Permissions
    if (currentUserRole === 'admin' && auth.currentUser) {
      const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
        setUsers(snapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as any as User)));
      }, (error) => {
        if (error.code !== 'permission-denied') {
          handleFirestoreError(error, OperationType.LIST, 'users');
        }
      });
      return () => unsubUsers();
    }
  }, [currentUserRole]);

  const handleUpdatePermissions = async (user: User, permissions: UserPermissions) => {
    setIsUpdatingPermissions(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, { permissions }, { merge: true });
      
      // Log activity
      await addDoc(collection(db, 'activityLogs'), {
        userId: auth.currentUser?.uid,
        userName: auth.currentUser?.displayName || auth.currentUser?.email,
        action: 'Updated Permissions',
        module: 'Settings',
        details: `Updated module permissions for ${user.name} via Settings`,
        timestamp: Timestamp.now()
      });
      
      toast.success('Permissions updated successfully.');
    } catch (error) {
      console.error('Error updating permissions:', error);
      toast.error('Failed to update permissions.');
    } finally {
      setIsUpdatingPermissions(false);
    }
  };

  const togglePermission = (user: User, key: keyof UserPermissions) => {
    if (!user.permissions) return;
    const newPermissions = {
      ...user.permissions,
      [key]: !user.permissions[key]
    };
    handleUpdatePermissions(user, newPermissions);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'companyLogo' | 'signatureImage') => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500000) { // 500KB limit
        toast.error('Image size too large. Please use an image under 500KB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setCompanyInfo(prev => ({ ...prev, [field]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const [accountSettings, setAccountSettings] = useState({
    fullName: auth.currentUser?.displayName || '',
    email: auth.currentUser?.email || '',
    role: 'Administrator',
    avatar: auth.currentUser?.photoURL || ''
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailOrders: true,
    emailInventory: true,
    pushOrders: true,
    pushInventory: false,
    smsAlerts: false
  });

  const [securitySettings, setSecuritySettings] = useState({
    twoFactor: false,
    sessionTimeout: '30',
    ipWhitelist: ''
  });

  const [integrationSettings, setIntegrationSettings] = useState({
    googleAnalyticsId: '',
    stripePublicKey: '',
    facebookPixelId: ''
  });

  const [dataSettings, setDataSettings] = useState({
    autoBackup: false,
    retentionPeriod: '365',
    exportFormat: 'CSV'
  });

  const [mobileSettings, setMobileSettings] = useState({
    enableMobileAccess: true,
    allowPushNotifications: true,
    biometricAuth: false
  });

  const [smsSettings, setSmsSettings] = useState({
    enableOrderConfirmation: false,
    smsGateway: 'Twilio',
    twilioSid: '',
    twilioToken: '',
    twilioFrom: '',
    confirmationTemplate: 'Hello {customerName}, your order #{orderNumber} has been received. Total: {totalAmount}. Thank you!'
  });

  const [courierConfigs, setCourierConfigs] = useState<Record<string, any>>({
    steadfast: { apiKey: '', secretKey: '', isActive: false },
    pathao: { clientId: '', clientSecret: '', username: '', password: '', storeId: '', isSandbox: false, isActive: false },
    redx: { apiKey: '', isActive: false },
    paperfly: { apiKey: '', isActive: false },
    carrybee: { clientId: '', clientSecret: '', clientContext: '', isSandbox: false, isActive: false }
  });

  const handleExportData = async () => {
    setSaving(true);
    try {
      const collections = ['orders', 'products', 'customers', 'inventory', 'transactions', 'inventoryLogs'];
      let allData = '';

      for (const colName of collections) {
        const snapshot = await getDocs(collection(db, colName));
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (data.length > 0) {
          allData += `--- ${colName.toUpperCase()} ---\n`;
          const headers = Object.keys(data[0]).join(',');
          allData += headers + '\n';
          data.forEach(item => {
            const row = Object.values(item).map(val => 
              typeof val === 'object' ? JSON.stringify(val).replace(/,/g, ';') : String(val).replace(/,/g, ';')
            ).join(',');
            allData += row + '\n';
          });
          allData += '\n\n';
        }
      }

      const blob = new Blob([allData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('hidden', '');
      a.setAttribute('href', url);
      a.setAttribute('download', `karukarjo_data_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success('Data exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    } finally {
      setSaving(false);
    }
  };

  const handlePurgeLogs = async () => {
    setConfirmConfig({
      isOpen: true,
      title: 'Purge Logs',
      message: 'Are you sure you want to purge old logs? This action cannot be undone.',
      variant: 'danger',
      onConfirm: async () => {
        setSaving(true);
        try {
          const retentionDays = parseInt(dataSettings.retentionPeriod) || 30;
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

          const q = query(collection(db, 'inventoryLogs'), where('createdAt', '<', cutoffDate));
          const snapshot = await getDocs(q);
          
          if (snapshot.empty) {
            toast.info('No logs found to purge');
            return;
          }

          const batch = writeBatch(db);
          snapshot.docs.forEach(doc => batch.delete(doc.ref));
          await batch.commit();
          
          toast.success(`Purged ${snapshot.size} old logs`);
        } catch (error) {
          console.error('Purge error:', error);
          toast.error('Failed to purge logs');
        } finally {
          setSaving(false);
        }
      }
    });
  };

  const handleDownloadApp = () => {
    const appUrl = window.location.origin;
    navigator.clipboard.writeText(appUrl);
    toast.success('App link copied to clipboard! Open it in your mobile browser to install.');
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      if (activeTab === 'General' || activeTab === 'Company Info' || activeTab === 'Integrations') {
        await setDoc(doc(db, 'settings', 'company'), companyInfo, { merge: true });
      }
      
      if (activeTab === 'SMS Settings') {
        await setDoc(doc(db, 'settings', 'company'), { sms: smsSettings }, { merge: true });
      }
      
      const userDocRef = doc(db, 'settings', `user_${auth.currentUser?.uid}`);
      const updateData: any = {};
      if (activeTab === 'Account') updateData.account = accountSettings;
      if (activeTab === 'Notifications') updateData.notifications = notificationSettings;
        if (activeTab === 'Security') updateData.security = securitySettings;
        if (activeTab === 'Integrations') updateData.integrations = integrationSettings;
        if (activeTab === 'Data Management') updateData.dataManagement = dataSettings;
        if (activeTab === 'Mobile App') updateData.mobile = mobileSettings;
        
        await setDoc(userDocRef, updateData, { merge: true });
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
    } catch (error) {
      console.error("Error saving settings:", error);
      setMessage({ type: 'error', text: 'Failed to save settings.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8 max-w-[1200px] mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-primary tracking-tight">Settings</h2>
          <p className="text-sm text-secondary mt-1">Manage your account, integrations, and system preferences.</p>
        </div>
        {message && (
          <div className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 ${
            message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
          }`}>
            {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {message.text}
          </div>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
        {/* Navigation */}
        <div className="w-full lg:w-[280px] shrink-0 bg-surface p-4 rounded-2xl border border-border shadow-subtle space-y-6">
          <div className="space-y-1">
            <h4 className="text-[11px] font-bold text-muted uppercase tracking-wider px-3 mb-3">Business</h4>
            {[
              { name: 'General', icon: SettingsIcon },
              { name: 'Company Info', icon: Building2 },
            ].map((item) => (
              <button
                key={item.name}
                onClick={() => setActiveTab(item.name)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all ${
                  activeTab === item.name 
                    ? 'bg-brand/10 dark:bg-brand/20 text-[#0866FF]' 
                    : 'text-secondary hover:bg-surface-hover hover:text-primary'
                }`}
              >
                <item.icon size={18} className={activeTab === item.name ? 'text-[#0866FF]' : 'text-muted'} />
                {item.name}
              </button>
            ))}
          </div>

          <div className="space-y-1">
            <h4 className="text-[11px] font-bold text-muted uppercase tracking-wider px-3 mb-3">User</h4>
            {[
              { name: 'Account', icon: UserIcon },
              { name: 'Notifications', icon: Bell },
              { name: 'Security', icon: Shield },
            ].map((item) => (
              <button
                key={item.name}
                onClick={() => setActiveTab(item.name)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all ${
                  activeTab === item.name 
                    ? 'bg-brand/10 dark:bg-brand/20 text-[#0866FF]' 
                    : 'text-secondary hover:bg-surface-hover hover:text-primary'
                }`}
              >
                <item.icon size={18} className={activeTab === item.name ? 'text-[#0866FF]' : 'text-muted'} />
                {item.name}
              </button>
            ))}
          </div>

          <div className="space-y-1">
            <h4 className="text-[11px] font-bold text-muted uppercase tracking-wider px-3 mb-3">System</h4>
            {[
              { name: 'Integrations', icon: Globe },
              { name: 'SMS Settings', icon: Smartphone },
              { name: 'Data Management', icon: Database },
              { name: 'Mobile App', icon: Smartphone },
              { name: 'Activity Logs', icon: ClipboardList },
            ].map((item) => (
              <button
                key={item.name}
                onClick={() => setActiveTab(item.name)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all ${
                  activeTab === item.name 
                    ? 'bg-brand/10 dark:bg-brand/20 text-[#0866FF]' 
                    : 'text-secondary hover:bg-surface-hover hover:text-primary'
                }`}
              >
                <item.icon size={18} className={activeTab === item.name ? 'text-[#0866FF]' : 'text-muted'} />
                {item.name}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 w-full flex flex-col justify-between space-y-6 lg:space-y-0 min-h-[600px] bg-surface rounded-2xl border border-border shadow-subtle p-6 sm:p-8">
          <div>
            {activeTab === 'General' && (
              <div className="space-y-8">
                <div className="flex items-center gap-4 border-b border-border pb-6">
                  <div className="w-14 h-14 bg-[#0866FF] rounded-2xl flex items-center justify-center shadow-subtle text-white shrink-0">
                    <SettingsIcon size={26} />
                  </div>
                  <div>
                    <h3 className="text-[19px] font-bold text-primary">General Settings</h3>
                    <p className="text-[13px] text-secondary">Configure basic system preferences and defaults.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
                  {/* Currency */}
                  <div className="space-y-2.5">
                    <label className="text-[13px] font-bold text-secondary">Currency</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <div className="w-7 h-7 rounded-full bg-brand/10 dark:bg-brand/20 flex items-center justify-center text-[#0866FF]">
                          <DollarSign size={14} strokeWidth={2.5} />
                        </div>
                      </div>
                      <select 
                        value={companyInfo.currency}
                        onChange={e => setCompanyInfo({...companyInfo, currency: e.target.value})}
                        className="w-full pl-12 pr-10 py-3 bg-surface border border-border group-hover:border-border rounded-xl text-[14px] font-medium text-secondary appearance-none focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all"
                      >
                        <option value="BDT">BDT (৳)</option>
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-muted">
                        <ChevronDown size={16} />
                      </div>
                    </div>
                  </div>

                  {/* Timezone */}
                  <div className="space-y-2.5">
                    <label className="text-[13px] font-bold text-secondary">Timezone</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <div className="w-7 h-7 rounded-full bg-purple-50 dark:bg-purple-500/20 flex items-center justify-center text-[#9333EA]">
                          <Globe size={14} strokeWidth={2.5} />
                        </div>
                      </div>
                      <select 
                        value={companyInfo.timezone}
                        onChange={e => setCompanyInfo({...companyInfo, timezone: e.target.value})}
                        className="w-full pl-12 pr-10 py-3 bg-surface border border-border group-hover:border-border rounded-xl text-[14px] font-medium text-secondary appearance-none focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all"
                      >
                        <option value="Asia/Dhaka">Asia/Dhaka (GMT+6)</option>
                        <option value="UTC">UTC</option>
                        <option value="America/New_York">America/New_York</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-muted">
                        <ChevronDown size={16} />
                      </div>
                    </div>
                  </div>

                  {/* System Language */}
                  <div className="space-y-2.5">
                    <label className="text-[13px] font-bold text-secondary">System Language</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <div className="w-7 h-7 rounded-full bg-green-50 dark:bg-green-500/20 flex items-center justify-center text-[#059669]">
                          <Languages size={14} strokeWidth={2.5} />
                        </div>
                      </div>
                      <select 
                        value={companyInfo.language}
                        onChange={e => setCompanyInfo({...companyInfo, language: e.target.value})}
                        className="w-full pl-12 pr-10 py-3 bg-surface border border-border group-hover:border-border rounded-xl text-[14px] font-medium text-secondary appearance-none focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all"
                      >
                        <option value="English">English</option>
                        <option value="Bengali">Bengali</option>
                        <option value="Spanish">Spanish</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-muted">
                        <ChevronDown size={16} />
                      </div>
                    </div>
                  </div>

                  {/* Reward Points */}
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[13px] font-bold text-secondary">Reward Points (per 100 BDT)</label>
                      <Info size={14} className="text-muted" />
                    </div>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <div className="w-7 h-7 rounded-full bg-orange-50 dark:bg-orange-500/20 flex items-center justify-center text-[#EA580C]">
                          <Star size={14} strokeWidth={2.5} />
                        </div>
                      </div>
                      <input 
                        type="number" 
                        value={companyInfo.rewardPointsRate} 
                        onChange={e => setCompanyInfo({...companyInfo, rewardPointsRate: parseFloat(e.target.value) || 0})}
                        className="w-full pl-12 pr-20 py-3 bg-surface border border-border group-hover:border-border rounded-xl text-[14px] font-medium text-secondary focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all" 
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                        <span className="text-[10px] font-bold bg-surface-hover text-secondary px-2.5 py-1 rounded-md">POINTS</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-secondary">Example: 1 point for every 100 {companyInfo.currency} spent.</p>
                  </div>
                </div>

                <div className="mt-8 bg-brand/10 border border-brand/20 rounded-2xl p-4 flex items-start gap-4">
                  <div className="w-7 h-7 rounded-full bg-surface shadow-subtle flex items-center justify-center text-[#0866FF] shrink-0">
                    <Info size={14} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h4 className="text-[13px] font-bold text-primary mb-0.5">Reward Points</h4>
                    <p className="text-[12px] text-secondary">Customers will earn points based on the amount spent. Points can be redeemed during checkout.</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Company Info' && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Building2 size={20} /> Company Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-6 border-b border-border">
                  <div className="space-y-4">
                    <label className="text-xs font-bold text-secondary uppercase tracking-wider block">Company Logo</label>
                    <div className="flex items-center gap-4">
                      <div className="w-24 h-24 bg-surface-hover rounded-2xl flex items-center justify-center overflow-hidden border-2 border-dashed border-border">
                        {companyInfo.companyLogo ? (
                          <img src={companyInfo.companyLogo} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                        ) : (
                          <Building2 size={32} className="text-muted" />
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <input 
                          type="file" 
                          id="logo-upload"
                          accept="image/*"
                          onChange={e => handleImageUpload(e, 'companyLogo')}
                          className="hidden"
                        />
                        <label 
                          htmlFor="logo-upload"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-surface-hover text-secondary rounded-lg text-xs font-bold hover:bg-surface-hover cursor-pointer transition-all"
                        >
                          <Upload size={14} /> Upload Logo
                        </label>
                        <p className="text-[10px] text-muted">Recommended: Square or horizontal PNG/JPG under 500KB.</p>
                        <input 
                          type="text" 
                          value={companyInfo.companyLogo} 
                          onChange={e => setCompanyInfo({...companyInfo, companyLogo: e.target.value})}
                          placeholder="Or enter Logo URL"
                          className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-xs focus:bg-surface focus:border-border outline-none transition-all" 
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-xs font-bold text-secondary uppercase tracking-wider block">Authorized Signature</label>
                    <div className="flex items-center gap-4">
                      <div className="w-24 h-24 bg-surface-hover rounded-2xl flex items-center justify-center overflow-hidden border-2 border-dashed border-border">
                        {companyInfo.signatureImage ? (
                          <img src={companyInfo.signatureImage} alt="Signature" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="text-[10px] text-muted font-bold uppercase">No Signature</div>
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <input 
                          type="file" 
                          id="signature-upload"
                          accept="image/*"
                          onChange={e => handleImageUpload(e, 'signatureImage')}
                          className="hidden"
                        />
                        <label 
                          htmlFor="signature-upload"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-surface-hover text-secondary rounded-lg text-xs font-bold hover:bg-surface-hover cursor-pointer transition-all"
                        >
                          <Upload size={14} /> Upload Signature
                        </label>
                        <p className="text-[10px] text-muted">Used in invoices. Transparent PNG recommended.</p>
                        <input 
                          type="text" 
                          value={companyInfo.signatureImage} 
                          onChange={e => setCompanyInfo({...companyInfo, signatureImage: e.target.value})}
                          placeholder="Or enter Signature URL"
                          className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-xs focus:bg-surface focus:border-border outline-none transition-all" 
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-secondary uppercase tracking-wider">Company Name</label>
                    <input 
                      type="text" 
                      value={companyInfo.companyName} 
                      onChange={e => setCompanyInfo({...companyInfo, companyName: e.target.value})}
                      className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-secondary uppercase tracking-wider">Website</label>
                    <input 
                      type="text" 
                      value={companyInfo.companyWebsite} 
                      onChange={e => setCompanyInfo({...companyInfo, companyWebsite: e.target.value})}
                      className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-secondary uppercase tracking-wider">Email</label>
                    <input 
                      type="email" 
                      value={companyInfo.companyEmail} 
                      onChange={e => setCompanyInfo({...companyInfo, companyEmail: e.target.value})}
                      className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-secondary uppercase tracking-wider">Mobile</label>
                    <input 
                      type="text" 
                      value={companyInfo.companyMobile} 
                      onChange={e => setCompanyInfo({...companyInfo, companyMobile: e.target.value})}
                      className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-secondary uppercase tracking-wider">Phone (Landline)</label>
                    <input 
                      type="text" 
                      value={companyInfo.companyPhone} 
                      onChange={e => setCompanyInfo({...companyInfo, companyPhone: e.target.value})}
                      className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-secondary uppercase tracking-wider">BIN / VAT Number</label>
                    <input 
                      type="text" 
                      value={companyInfo.companyVat} 
                      onChange={e => setCompanyInfo({...companyInfo, companyVat: e.target.value})}
                      className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all" 
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs font-bold text-secondary uppercase tracking-wider">Address</label>
                    <textarea 
                      value={companyInfo.companyAddress} 
                      onChange={e => setCompanyInfo({...companyInfo, companyAddress: e.target.value})}
                      rows={2}
                      className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all resize-none" 
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs font-bold text-secondary uppercase tracking-wider">Invoice Footer Note</label>
                    <textarea 
                      value={companyInfo.invoiceFooterNote} 
                      onChange={e => setCompanyInfo({...companyInfo, invoiceFooterNote: e.target.value})}
                      rows={2}
                      placeholder="e.g., Thank you for your purchase. Please visit again!"
                      className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all resize-none" 
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Account' && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <UserIcon size={20} /> Account Settings
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-secondary uppercase tracking-wider">Full Name</label>
                    <input 
                      type="text" 
                      value={accountSettings.fullName} 
                      onChange={e => setAccountSettings({...accountSettings, fullName: e.target.value})}
                      className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-secondary uppercase tracking-wider">Email Address</label>
                    <input 
                      type="email" 
                      value={accountSettings.email} 
                      disabled
                      className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm text-secondary cursor-not-allowed" 
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Notifications' && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Bell size={20} /> Notifications
                </h3>
                <div className="space-y-4">
                  {[
                    { id: 'emailOrders', label: 'Email on new orders', desc: 'Receive an email whenever a new order is placed.' },
                    { id: 'emailInventory', label: 'Email on low inventory', desc: 'Get notified when stock levels fall below threshold.' },
                    { id: 'pushOrders', label: 'Push notifications for orders', desc: 'Real-time alerts on your desktop or mobile.' },
                  ].map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-4 bg-surface-hover rounded-xl">
                      <div>
                        <p className="text-sm font-bold text-primary">{item.label}</p>
                        <p className="text-xs text-secondary">{item.desc}</p>
                      </div>
                      <button 
                        onClick={() => setNotificationSettings(prev => ({ ...prev, [item.id]: !prev[item.id as keyof typeof prev] }))}
                        className={`w-12 h-6 rounded-full transition-all relative ${notificationSettings[item.id as keyof typeof notificationSettings] ? 'bg-black' : 'bg-gray-300'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-surface rounded-full transition-all ${notificationSettings[item.id as keyof typeof notificationSettings] ? 'right-1' : 'left-1'}`} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'SMS Settings' && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Smartphone size={20} /> SMS Confirmation Settings
                </h3>
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-surface-hover rounded-xl">
                    <div>
                      <p className="text-sm font-bold text-primary">Enable Order Confirmation SMS</p>
                      <p className="text-xs text-secondary">Automatically send a message to customers when a new order is created.</p>
                    </div>
                    <button 
                      onClick={() => setSmsSettings(prev => ({ ...prev, enableOrderConfirmation: !prev.enableOrderConfirmation }))}
                      className={`w-12 h-6 rounded-full transition-all relative ${smsSettings.enableOrderConfirmation ? 'bg-black' : 'bg-gray-300'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-surface rounded-full transition-all ${smsSettings.enableOrderConfirmation ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-secondary uppercase tracking-wider">SMS Gateway</label>
                      <select 
                        value={smsSettings.smsGateway}
                        onChange={e => setSmsSettings({...smsSettings, smsGateway: e.target.value})}
                        className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all"
                      >
                        <option value="Twilio">Twilio</option>
                        <option value="BulksmsBD">BulksmsBD</option>
                        <option value="MimSMS">MimSMS</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-secondary uppercase tracking-wider">Twilio SID / API Key</label>
                      <input 
                        type="text" 
                        value={smsSettings.twilioSid}
                        onChange={e => setSmsSettings({...smsSettings, twilioSid: e.target.value})}
                        className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-secondary uppercase tracking-wider">Twilio Token / Secret</label>
                      <input 
                        type="password" 
                        value={smsSettings.twilioToken}
                        onChange={e => setSmsSettings({...smsSettings, twilioToken: e.target.value})}
                        className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-secondary uppercase tracking-wider">Sender ID / Phone Number</label>
                      <input 
                        type="text" 
                        value={smsSettings.twilioFrom}
                        onChange={e => setSmsSettings({...smsSettings, twilioFrom: e.target.value})}
                        className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all" 
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-secondary uppercase tracking-wider">Message Template</label>
                    <textarea 
                      value={smsSettings.confirmationTemplate}
                      onChange={e => setSmsSettings({...smsSettings, confirmationTemplate: e.target.value})}
                      rows={4}
                      className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all resize-none"
                    />
                    <p className="text-[10px] text-muted">Available placeholders: {'{customerName}'}, {'{orderNumber}'}, {'{totalAmount}'}, {'{companyName}'}</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Security' && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Shield size={20} /> Security Settings
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-surface-hover rounded-xl">
                    <div>
                      <p className="text-sm font-bold text-primary">Two-Factor Authentication</p>
                      <p className="text-xs text-secondary">Add an extra layer of security to your account.</p>
                    </div>
                    <button 
                      onClick={() => setSecuritySettings(prev => ({ ...prev, twoFactor: !prev.twoFactor }))}
                      className={`w-12 h-6 rounded-full transition-all relative ${securitySettings.twoFactor ? 'bg-black' : 'bg-gray-300'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-surface rounded-full transition-all ${securitySettings.twoFactor ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-secondary uppercase tracking-wider">Session Timeout (minutes)</label>
                    <input 
                      type="number" 
                      value={securitySettings.sessionTimeout} 
                      onChange={e => setSecuritySettings({...securitySettings, sessionTimeout: e.target.value})}
                      className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all" 
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Integrations' && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Globe size={20} /> Integrations
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-secondary uppercase tracking-wider">Google Analytics ID</label>
                    <input 
                      type="text" 
                      value={integrationSettings.googleAnalyticsId} 
                      onChange={e => setIntegrationSettings({...integrationSettings, googleAnalyticsId: e.target.value})}
                      placeholder="G-XXXXXXXXXX"
                      className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-secondary uppercase tracking-wider">Stripe Public Key</label>
                    <input 
                      type="text" 
                      value={integrationSettings.stripePublicKey} 
                      onChange={e => setIntegrationSettings({...integrationSettings, stripePublicKey: e.target.value})}
                      placeholder="pk_test_..."
                      className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-secondary uppercase tracking-wider">Facebook Pixel ID</label>
                    <input 
                      type="text" 
                      value={integrationSettings.facebookPixelId} 
                      onChange={e => setIntegrationSettings({...integrationSettings, facebookPixelId: e.target.value})}
                      placeholder="Pixel ID"
                      className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all" 
                    />
                  </div>

                  <div className="pt-6 border-t border-border space-y-6">
                    <h4 className="text-sm font-bold text-primary flex items-center gap-2">
                      <ShoppingCart size={16} className="text-brand" /> WooCommerce Integration
                    </h4>
                    <div className="p-4 bg-brand/10 rounded-xl border border-brand/20 text-xs text-brand-hover leading-relaxed">
                      Connect your WooCommerce store to sync orders and manage them directly from here. 
                      You can generate API keys in WooCommerce {'>'} Settings {'>'} Advanced {'>'} REST API.
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-secondary uppercase tracking-wider">Store URL</label>
                        <input 
                          type="text" 
                          value={companyInfo.wooUrl} 
                          onChange={e => setCompanyInfo({...companyInfo, wooUrl: e.target.value})}
                          placeholder="https://yourstore.com"
                          className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all" 
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-secondary uppercase tracking-wider">Consumer Key</label>
                          <input 
                            type="text" 
                            value={companyInfo.wooConsumerKey} 
                            onChange={e => setCompanyInfo({...companyInfo, wooConsumerKey: e.target.value})}
                            placeholder="ck_..."
                            className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all" 
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-secondary uppercase tracking-wider">Consumer Secret</label>
                          <input 
                            type="password" 
                            value={companyInfo.wooConsumerSecret} 
                            onChange={e => setCompanyInfo({...companyInfo, wooConsumerSecret: e.target.value})}
                            placeholder="cs_..."
                            className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all" 
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Data Management' && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Database size={20} /> Data Management
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-surface-hover rounded-xl">
                    <div>
                      <p className="text-sm font-bold text-primary">Automatic Backups</p>
                      <p className="text-xs text-secondary">Enable daily automated backups of your database.</p>
                    </div>
                    <button 
                      onClick={() => setDataSettings(prev => ({ ...prev, autoBackup: !prev.autoBackup }))}
                      className={`w-12 h-6 rounded-full transition-all relative ${dataSettings.autoBackup ? 'bg-black' : 'bg-gray-300'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-surface rounded-full transition-all ${dataSettings.autoBackup ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-secondary uppercase tracking-wider">Data Retention (days)</label>
                    <input 
                      type="number" 
                      value={dataSettings.retentionPeriod} 
                      onChange={e => setDataSettings({...dataSettings, retentionPeriod: e.target.value})}
                      className="w-full px-4 py-2 bg-surface-hover border border-transparent rounded-lg text-sm focus:bg-surface focus:border-border outline-none transition-all" 
                    />
                  </div>
                  <div className="pt-4 space-y-3">
                    <p className="text-xs font-bold text-secondary uppercase tracking-wider">Actions</p>
                    <div className="flex gap-3">
                      <button 
                        onClick={handleExportData}
                        disabled={saving}
                        className="px-4 py-2 bg-surface-hover text-secondary rounded-lg text-sm font-medium hover:bg-surface-hover transition-colors disabled:opacity-50"
                      >
                        Export All Data (CSV)
                      </button>
                      <button 
                        onClick={handlePurgeLogs}
                        disabled={saving}
                        className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
                      >
                        Purge Old Logs
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Mobile App' && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Smartphone size={20} /> Mobile App Settings
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-surface-hover rounded-xl">
                    <div>
                      <p className="text-sm font-bold text-primary">Enable Mobile Access</p>
                      <p className="text-xs text-secondary">Allow users to log in via the mobile application.</p>
                    </div>
                    <button 
                      onClick={() => setMobileSettings(prev => ({ ...prev, enableMobileAccess: !prev.enableMobileAccess }))}
                      className={`w-12 h-6 rounded-full transition-all relative ${mobileSettings.enableMobileAccess ? 'bg-black' : 'bg-gray-300'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-surface rounded-full transition-all ${mobileSettings.enableMobileAccess ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-surface-hover rounded-xl">
                    <div>
                      <p className="text-sm font-bold text-primary">Biometric Authentication</p>
                      <p className="text-xs text-secondary">Require FaceID or Fingerprint on mobile devices.</p>
                    </div>
                    <button 
                    onClick={() => setMobileSettings(prev => ({ ...prev, biometricAuth: !prev.biometricAuth }))}
                    className={`w-12 h-6 rounded-full transition-all relative ${mobileSettings.biometricAuth ? 'bg-black' : 'bg-gray-300'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-surface rounded-full transition-all ${mobileSettings.biometricAuth ? 'right-1' : 'left-1'}`} />
                  </button>
                </div>
                <div className="p-6 bg-surface-hover rounded-2xl border border-dashed border-border flex flex-col items-center text-center space-y-4">
                  <div className="p-4 bg-surface rounded-2xl shadow-subtle flex items-center justify-center">
                    <QRCodeCanvas 
                      value={window.location.origin} 
                      size={128}
                      level="H"
                      includeMargin={false}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-primary">Mobile App QR Code</p>
                    <p className="text-xs text-secondary">Scan this code with your phone to open and install the app.</p>
                  </div>
                  <button 
                    onClick={handleDownloadApp}
                    className="text-xs font-bold text-brand hover:underline"
                  >
                    Copy App Link
                  </button>
                </div>
              </div>
            </div>
          )}

            {activeTab === 'Activity Logs' && (
              <ActivityLogsTab />
            )}

            <div className="pt-8 flex justify-end">
              <button 
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 bg-[#0866FF] text-white rounded-xl text-[14px] font-semibold hover:bg-[#0056e0] transition-colors shadow-subtle disabled:opacity-50"
              >
                {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>

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
