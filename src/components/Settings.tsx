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
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { db, auth, doc, getDoc, setDoc, onSnapshot, collection, getDocs, query, where, deleteDoc, writeBatch, updateDoc, addDoc, Timestamp, orderBy, limit } from '../firebase';
import { User, UserRole, UserPermissions } from '../types';
import { useAuth } from '../contexts/AuthContext';

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
        <Loader2 className="animate-spin text-gray-400" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <ClipboardList size={20} /> Activity Logs
        </h3>
        <span className="text-xs text-gray-500 font-medium">Last 100 activities</span>
      </div>

      <div className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-100 text-[10px] uppercase tracking-widest text-gray-500">
                <th className="px-6 py-4 font-semibold">Time</th>
                <th className="px-6 py-4 font-semibold">User</th>
                <th className="px-6 py-4 font-semibold">Action</th>
                <th className="px-6 py-4 font-semibold">Module</th>
                <th className="px-6 py-4 font-semibold">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-white transition-colors">
                  <td className="px-6 py-4 text-[10px] text-gray-500 whitespace-nowrap">
                    {log.timestamp?.toDate().toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-gray-900">{log.userName}</span>
                      <span className="text-[10px] text-gray-400">{log.userId?.slice(0, 8)}...</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-medium text-gray-700">{log.action}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 bg-white border border-gray-200 rounded text-[10px] font-bold text-gray-500 uppercase">
                      {log.module}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-500 max-w-xs truncate">
                    {log.details}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-400 italic">
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
          setCompanyInfo(prev => ({ ...prev, ...docSnap.data() }));
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
          if (data.sms) setSmsSettings(prev => ({ ...prev, ...data.sms }));
        }

        // Fetch courier configs from backend
        const response = await fetch('/api/couriers/configs');
        if (response.ok) {
          const data = await response.json();
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
      await updateDoc(userRef, { permissions });
      
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
    pathao: { clientId: '', clientSecret: '', username: '', password: '', isActive: false },
    redx: { apiKey: '', isActive: false },
    paperfly: { apiKey: '', isActive: false },
    carrybee: { apiKey: '', isActive: false }
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
    if (!window.confirm('Are you sure you want to purge old logs? This action cannot be undone.')) return;
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
  };

  const handleDownloadApp = () => {
    toast.info('Mobile app is currently in development. We will notify you once it is available for download.');
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      if (activeTab === 'General' || activeTab === 'Company Info') {
        await setDoc(doc(db, 'settings', 'company'), companyInfo, { merge: true });
      } else if (activeTab === 'Logistics') {
        // Save each courier config to backend
        for (const [courier, config] of Object.entries(courierConfigs)) {
          await fetch(`/api/couriers/configs/${courier}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
          });
        }
        // Also update companyInfo for legacy support if needed
        await setDoc(doc(db, 'settings', 'company'), {
          steadfastApiKey: courierConfigs.steadfast.apiKey,
          steadfastSecretKey: courierConfigs.steadfast.secretKey
        }, { merge: true });
      } else {
        const userDocRef = doc(db, 'settings', `user_${auth.currentUser?.uid}`);
        const updateData: any = {};
        if (activeTab === 'Account') updateData.account = accountSettings;
        if (activeTab === 'Notifications') updateData.notifications = notificationSettings;
        if (activeTab === 'Security') updateData.security = securitySettings;
        if (activeTab === 'Integrations') updateData.integrations = integrationSettings;
        if (activeTab === 'SMS Settings') updateData.sms = smsSettings;
        if (activeTab === 'Data Management') updateData.dataManagement = dataSettings;
        if (activeTab === 'Mobile App') updateData.mobile = mobileSettings;
        
        await setDoc(userDocRef, updateData, { merge: true });
      }
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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-[#141414] tracking-tight">Settings</h2>
          <p className="text-sm text-gray-500 mt-1">Manage your account, integrations, and system preferences.</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Navigation */}
        <div className="lg:col-span-1 space-y-2">
          {[
            { name: 'General', icon: SettingsIcon },
            { name: 'Company Info', icon: Building2 },
            { name: 'Account', icon: UserIcon },
            { name: 'Notifications', icon: Bell },
            { name: 'SMS Settings', icon: Smartphone },
            { name: 'Security', icon: Shield },
            { name: 'Integrations', icon: Globe },
            { name: 'Logistics', icon: Truck },
            { name: 'Data Management', icon: Database },
            { name: 'Mobile App', icon: Smartphone },
            { name: 'Activity Logs', icon: ClipboardList },
            ...(currentUserRole === 'admin' ? [{ name: 'Team Permissions', icon: Users }] : []),
          ].map((item) => (
            <button
              key={item.name}
              onClick={() => setActiveTab(item.name)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === item.name 
                  ? 'bg-white text-[#141414] shadow-sm border border-gray-100' 
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <item.icon size={18} />
              {item.name}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-xl border border-gray-100 shadow-sm space-y-8">
            {activeTab === 'General' && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <SettingsIcon size={20} /> General Settings
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Currency</label>
                    <select 
                      value={companyInfo.currency}
                      onChange={e => setCompanyInfo({...companyInfo, currency: e.target.value})}
                      className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all"
                    >
                      <option value="BDT">BDT (৳)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Timezone</label>
                    <select 
                      value={companyInfo.timezone}
                      onChange={e => setCompanyInfo({...companyInfo, timezone: e.target.value})}
                      className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all"
                    >
                      <option value="Asia/Dhaka">Asia/Dhaka (GMT+6)</option>
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">America/New_York</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">System Language</label>
                    <select 
                      value={companyInfo.language}
                      onChange={e => setCompanyInfo({...companyInfo, language: e.target.value})}
                      className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all"
                    >
                      <option value="English">English</option>
                      <option value="Bengali">Bengali</option>
                      <option value="Spanish">Spanish</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Reward Points (per 100 {companyInfo.currency})</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        value={companyInfo.rewardPointsRate} 
                        onChange={e => setCompanyInfo({...companyInfo, rewardPointsRate: parseFloat(e.target.value) || 0})}
                        className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all pr-12" 
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 uppercase">Points</div>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">Example: 1 point for every 100 {companyInfo.currency} spent.</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Company Info' && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Building2 size={20} /> Company Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-6 border-b border-gray-50">
                  <div className="space-y-4">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Company Logo</label>
                    <div className="flex items-center gap-4">
                      <div className="w-24 h-24 bg-gray-100 rounded-2xl flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-200">
                        {companyInfo.companyLogo ? (
                          <img src={companyInfo.companyLogo} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                        ) : (
                          <Building2 size={32} className="text-gray-300" />
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
                          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-200 cursor-pointer transition-all"
                        >
                          <Upload size={14} /> Upload Logo
                        </label>
                        <p className="text-[10px] text-gray-400">Recommended: Square or horizontal PNG/JPG under 500KB.</p>
                        <input 
                          type="text" 
                          value={companyInfo.companyLogo} 
                          onChange={e => setCompanyInfo({...companyInfo, companyLogo: e.target.value})}
                          placeholder="Or enter Logo URL"
                          className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-xs focus:bg-white focus:border-gray-200 outline-none transition-all" 
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Authorized Signature</label>
                    <div className="flex items-center gap-4">
                      <div className="w-24 h-24 bg-gray-100 rounded-2xl flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-200">
                        {companyInfo.signatureImage ? (
                          <img src={companyInfo.signatureImage} alt="Signature" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="text-[10px] text-gray-400 font-bold uppercase">No Signature</div>
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
                          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-200 cursor-pointer transition-all"
                        >
                          <Upload size={14} /> Upload Signature
                        </label>
                        <p className="text-[10px] text-gray-400">Used in invoices. Transparent PNG recommended.</p>
                        <input 
                          type="text" 
                          value={companyInfo.signatureImage} 
                          onChange={e => setCompanyInfo({...companyInfo, signatureImage: e.target.value})}
                          placeholder="Or enter Signature URL"
                          className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-xs focus:bg-white focus:border-gray-200 outline-none transition-all" 
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Company Name</label>
                    <input 
                      type="text" 
                      value={companyInfo.companyName} 
                      onChange={e => setCompanyInfo({...companyInfo, companyName: e.target.value})}
                      className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Website</label>
                    <input 
                      type="text" 
                      value={companyInfo.companyWebsite} 
                      onChange={e => setCompanyInfo({...companyInfo, companyWebsite: e.target.value})}
                      className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Email</label>
                    <input 
                      type="email" 
                      value={companyInfo.companyEmail} 
                      onChange={e => setCompanyInfo({...companyInfo, companyEmail: e.target.value})}
                      className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Mobile</label>
                    <input 
                      type="text" 
                      value={companyInfo.companyMobile} 
                      onChange={e => setCompanyInfo({...companyInfo, companyMobile: e.target.value})}
                      className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Phone (Landline)</label>
                    <input 
                      type="text" 
                      value={companyInfo.companyPhone} 
                      onChange={e => setCompanyInfo({...companyInfo, companyPhone: e.target.value})}
                      className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">BIN / VAT Number</label>
                    <input 
                      type="text" 
                      value={companyInfo.companyVat} 
                      onChange={e => setCompanyInfo({...companyInfo, companyVat: e.target.value})}
                      className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all" 
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Address</label>
                    <textarea 
                      value={companyInfo.companyAddress} 
                      onChange={e => setCompanyInfo({...companyInfo, companyAddress: e.target.value})}
                      rows={2}
                      className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all resize-none" 
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Invoice Footer Note</label>
                    <textarea 
                      value={companyInfo.invoiceFooterNote} 
                      onChange={e => setCompanyInfo({...companyInfo, invoiceFooterNote: e.target.value})}
                      rows={2}
                      placeholder="e.g., Thank you for your purchase. Please visit again!"
                      className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all resize-none" 
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
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Full Name</label>
                    <input 
                      type="text" 
                      value={accountSettings.fullName} 
                      onChange={e => setAccountSettings({...accountSettings, fullName: e.target.value})}
                      className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Email Address</label>
                    <input 
                      type="email" 
                      value={accountSettings.email} 
                      disabled
                      className="w-full px-4 py-2 bg-gray-100 border border-transparent rounded-lg text-sm text-gray-500 cursor-not-allowed" 
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
                    <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div>
                        <p className="text-sm font-bold text-gray-900">{item.label}</p>
                        <p className="text-xs text-gray-500">{item.desc}</p>
                      </div>
                      <button 
                        onClick={() => setNotificationSettings(prev => ({ ...prev, [item.id]: !prev[item.id as keyof typeof prev] }))}
                        className={`w-12 h-6 rounded-full transition-all relative ${notificationSettings[item.id as keyof typeof notificationSettings] ? 'bg-black' : 'bg-gray-300'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${notificationSettings[item.id as keyof typeof notificationSettings] ? 'right-1' : 'left-1'}`} />
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
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div>
                      <p className="text-sm font-bold text-gray-900">Enable Order Confirmation SMS</p>
                      <p className="text-xs text-gray-500">Automatically send a message to customers when a new order is created.</p>
                    </div>
                    <button 
                      onClick={() => setSmsSettings(prev => ({ ...prev, enableOrderConfirmation: !prev.enableOrderConfirmation }))}
                      className={`w-12 h-6 rounded-full transition-all relative ${smsSettings.enableOrderConfirmation ? 'bg-black' : 'bg-gray-300'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${smsSettings.enableOrderConfirmation ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">SMS Gateway</label>
                      <select 
                        value={smsSettings.smsGateway}
                        onChange={e => setSmsSettings({...smsSettings, smsGateway: e.target.value})}
                        className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all"
                      >
                        <option value="Twilio">Twilio</option>
                        <option value="BulksmsBD">BulksmsBD</option>
                        <option value="MimSMS">MimSMS</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Twilio SID / API Key</label>
                      <input 
                        type="text" 
                        value={smsSettings.twilioSid}
                        onChange={e => setSmsSettings({...smsSettings, twilioSid: e.target.value})}
                        className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Twilio Token / Secret</label>
                      <input 
                        type="password" 
                        value={smsSettings.twilioToken}
                        onChange={e => setSmsSettings({...smsSettings, twilioToken: e.target.value})}
                        className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Sender ID / Phone Number</label>
                      <input 
                        type="text" 
                        value={smsSettings.twilioFrom}
                        onChange={e => setSmsSettings({...smsSettings, twilioFrom: e.target.value})}
                        className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all" 
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Message Template</label>
                    <textarea 
                      value={smsSettings.confirmationTemplate}
                      onChange={e => setSmsSettings({...smsSettings, confirmationTemplate: e.target.value})}
                      rows={4}
                      className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all resize-none"
                    />
                    <p className="text-[10px] text-gray-400">Available placeholders: {'{customerName}'}, {'{orderNumber}'}, {'{totalAmount}'}, {'{companyName}'}</p>
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
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div>
                      <p className="text-sm font-bold text-gray-900">Two-Factor Authentication</p>
                      <p className="text-xs text-gray-500">Add an extra layer of security to your account.</p>
                    </div>
                    <button 
                      onClick={() => setSecuritySettings(prev => ({ ...prev, twoFactor: !prev.twoFactor }))}
                      className={`w-12 h-6 rounded-full transition-all relative ${securitySettings.twoFactor ? 'bg-black' : 'bg-gray-300'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${securitySettings.twoFactor ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Session Timeout (minutes)</label>
                    <input 
                      type="number" 
                      value={securitySettings.sessionTimeout} 
                      onChange={e => setSecuritySettings({...securitySettings, sessionTimeout: e.target.value})}
                      className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all" 
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
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Google Analytics ID</label>
                    <input 
                      type="text" 
                      value={integrationSettings.googleAnalyticsId} 
                      onChange={e => setIntegrationSettings({...integrationSettings, googleAnalyticsId: e.target.value})}
                      placeholder="G-XXXXXXXXXX"
                      className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Stripe Public Key</label>
                    <input 
                      type="text" 
                      value={integrationSettings.stripePublicKey} 
                      onChange={e => setIntegrationSettings({...integrationSettings, stripePublicKey: e.target.value})}
                      placeholder="pk_test_..."
                      className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Facebook Pixel ID</label>
                    <input 
                      type="text" 
                      value={integrationSettings.facebookPixelId} 
                      onChange={e => setIntegrationSettings({...integrationSettings, facebookPixelId: e.target.value})}
                      placeholder="Pixel ID"
                      className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all" 
                    />
                  </div>

                  <div className="pt-6 border-t border-gray-50 space-y-6">
                    <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      <ShoppingCart size={16} className="text-[#00AEEF]" /> WooCommerce Integration
                    </h4>
                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 text-xs text-blue-700 leading-relaxed">
                      Connect your WooCommerce store to sync orders and manage them directly from here. 
                      You can generate API keys in WooCommerce {'>'} Settings {'>'} Advanced {'>'} REST API.
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Store URL</label>
                        <input 
                          type="text" 
                          value={companyInfo.wooUrl} 
                          onChange={e => setCompanyInfo({...companyInfo, wooUrl: e.target.value})}
                          placeholder="https://yourstore.com"
                          className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all" 
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Consumer Key</label>
                          <input 
                            type="text" 
                            value={companyInfo.wooConsumerKey} 
                            onChange={e => setCompanyInfo({...companyInfo, wooConsumerKey: e.target.value})}
                            placeholder="ck_..."
                            className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all" 
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Consumer Secret</label>
                          <input 
                            type="password" 
                            value={companyInfo.wooConsumerSecret} 
                            onChange={e => setCompanyInfo({...companyInfo, wooConsumerSecret: e.target.value})}
                            placeholder="cs_..."
                            className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all" 
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Logistics' && (
              <div className="space-y-8">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Truck size={20} /> Courier Integrations
                </h3>
                
                <div className="space-y-6">
                  {/* Steadfast */}
                  <div className="p-6 bg-gray-50 rounded-xl border border-gray-100 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">S</div>
                        <div>
                          <h4 className="text-sm font-bold text-gray-900">Steadfast Courier</h4>
                          <p className="text-[10px] text-gray-500">Automated delivery for Bangladesh</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setCourierConfigs(prev => ({ 
                          ...prev, 
                          steadfast: { ...prev.steadfast, isActive: !prev.steadfast.isActive } 
                        }))}
                        className={`w-12 h-6 rounded-full transition-all relative ${courierConfigs.steadfast.isActive ? 'bg-blue-600' : 'bg-gray-300'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${courierConfigs.steadfast.isActive ? 'right-1' : 'left-1'}`} />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">API Key</label>
                        <input 
                          type="text" 
                          value={courierConfigs.steadfast.apiKey} 
                          onChange={e => setCourierConfigs(prev => ({ 
                            ...prev, 
                            steadfast: { ...prev.steadfast, apiKey: e.target.value } 
                          }))}
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:border-blue-500 outline-none transition-all" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Secret Key</label>
                        <input 
                          type="password" 
                          value={courierConfigs.steadfast.secretKey} 
                          onChange={e => setCourierConfigs(prev => ({ 
                            ...prev, 
                            steadfast: { ...prev.steadfast, secretKey: e.target.value } 
                          }))}
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:border-blue-500 outline-none transition-all" 
                        />
                      </div>
                    </div>
                  </div>

                  {/* Pathao */}
                  <div className="p-6 bg-gray-50 rounded-xl border border-gray-100 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center text-white font-bold">P</div>
                        <div>
                          <h4 className="text-sm font-bold text-gray-900">Pathao Courier</h4>
                          <p className="text-[10px] text-gray-500">Fast and reliable delivery service</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setCourierConfigs(prev => ({ 
                          ...prev, 
                          pathao: { ...prev.pathao, isActive: !prev.pathao.isActive } 
                        }))}
                        className={`w-12 h-6 rounded-full transition-all relative ${courierConfigs.pathao.isActive ? 'bg-orange-500' : 'bg-gray-300'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${courierConfigs.pathao.isActive ? 'right-1' : 'left-1'}`} />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Client ID</label>
                        <input 
                          type="text" 
                          value={courierConfigs.pathao.clientId} 
                          onChange={e => setCourierConfigs(prev => ({ 
                            ...prev, 
                            pathao: { ...prev.pathao, clientId: e.target.value } 
                          }))}
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:border-orange-500 outline-none transition-all" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Client Secret</label>
                        <input 
                          type="password" 
                          value={courierConfigs.pathao.clientSecret} 
                          onChange={e => setCourierConfigs(prev => ({ 
                            ...prev, 
                            pathao: { ...prev.pathao, clientSecret: e.target.value } 
                          }))}
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:border-orange-500 outline-none transition-all" 
                        />
                      </div>
                    </div>
                  </div>

                  {/* RedX */}
                  <div className="p-6 bg-gray-50 rounded-xl border border-gray-100 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center text-white font-bold">R</div>
                        <div>
                          <h4 className="text-sm font-bold text-gray-900">RedX</h4>
                          <p className="text-[10px] text-gray-500">Logistics for modern businesses</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setCourierConfigs(prev => ({ 
                          ...prev, 
                          redx: { ...prev.redx, isActive: !prev.redx.isActive } 
                        }))}
                        className={`w-12 h-6 rounded-full transition-all relative ${courierConfigs.redx.isActive ? 'bg-red-600' : 'bg-gray-300'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${courierConfigs.redx.isActive ? 'right-1' : 'left-1'}`} />
                      </button>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">API Key</label>
                      <input 
                        type="text" 
                        value={courierConfigs.redx.apiKey} 
                        onChange={e => setCourierConfigs(prev => ({ 
                          ...prev, 
                          redx: { ...prev.redx, apiKey: e.target.value } 
                        }))}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:border-red-500 outline-none transition-all" 
                      />
                    </div>
                  </div>

                  {/* Carrybee */}
                  <div className="p-6 bg-gray-50 rounded-xl border border-gray-100 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-yellow-500 rounded-lg flex items-center justify-center text-white font-bold">C</div>
                        <div>
                          <h4 className="text-sm font-bold text-gray-900">Carrybee</h4>
                          <p className="text-[10px] text-gray-500">Fast and secure delivery</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setCourierConfigs(prev => ({ 
                          ...prev, 
                          carrybee: { ...prev.carrybee, isActive: !prev.carrybee.isActive } 
                        }))}
                        className={`w-12 h-6 rounded-full transition-all relative ${courierConfigs.carrybee.isActive ? 'bg-yellow-500' : 'bg-gray-300'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${courierConfigs.carrybee.isActive ? 'right-1' : 'left-1'}`} />
                      </button>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">API Key</label>
                      <input 
                        type="text" 
                        value={courierConfigs.carrybee.apiKey} 
                        onChange={e => setCourierConfigs(prev => ({ 
                          ...prev, 
                          carrybee: { ...prev.carrybee, apiKey: e.target.value } 
                        }))}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:border-yellow-500 outline-none transition-all" 
                      />
                    </div>
                  </div>

                  {/* Paperfly */}
                  <div className="p-6 bg-gray-50 rounded-xl border border-gray-100 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">P</div>
                        <div>
                          <h4 className="text-sm font-bold text-gray-900">Paperfly</h4>
                          <p className="text-[10px] text-gray-500">Smart logistics for smart businesses</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setCourierConfigs(prev => ({ 
                          ...prev, 
                          paperfly: { ...prev.paperfly, isActive: !prev.paperfly.isActive } 
                        }))}
                        className={`w-12 h-6 rounded-full transition-all relative ${courierConfigs.paperfly.isActive ? 'bg-indigo-600' : 'bg-gray-300'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${courierConfigs.paperfly.isActive ? 'right-1' : 'left-1'}`} />
                      </button>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">API Key</label>
                      <input 
                        type="text" 
                        value={courierConfigs.paperfly.apiKey} 
                        onChange={e => setCourierConfigs(prev => ({ 
                          ...prev, 
                          paperfly: { ...prev.paperfly, apiKey: e.target.value } 
                        }))}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:border-indigo-500 outline-none transition-all" 
                      />
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
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div>
                      <p className="text-sm font-bold text-gray-900">Automatic Backups</p>
                      <p className="text-xs text-gray-500">Enable daily automated backups of your database.</p>
                    </div>
                    <button 
                      onClick={() => setDataSettings(prev => ({ ...prev, autoBackup: !prev.autoBackup }))}
                      className={`w-12 h-6 rounded-full transition-all relative ${dataSettings.autoBackup ? 'bg-black' : 'bg-gray-300'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${dataSettings.autoBackup ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Data Retention (days)</label>
                    <input 
                      type="number" 
                      value={dataSettings.retentionPeriod} 
                      onChange={e => setDataSettings({...dataSettings, retentionPeriod: e.target.value})}
                      className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all" 
                    />
                  </div>
                  <div className="pt-4 space-y-3">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</p>
                    <div className="flex gap-3">
                      <button 
                        onClick={handleExportData}
                        disabled={saving}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
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
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div>
                      <p className="text-sm font-bold text-gray-900">Enable Mobile Access</p>
                      <p className="text-xs text-gray-500">Allow users to log in via the mobile application.</p>
                    </div>
                    <button 
                      onClick={() => setMobileSettings(prev => ({ ...prev, enableMobileAccess: !prev.enableMobileAccess }))}
                      className={`w-12 h-6 rounded-full transition-all relative ${mobileSettings.enableMobileAccess ? 'bg-black' : 'bg-gray-300'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${mobileSettings.enableMobileAccess ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div>
                      <p className="text-sm font-bold text-gray-900">Biometric Authentication</p>
                      <p className="text-xs text-gray-500">Require FaceID or Fingerprint on mobile devices.</p>
                    </div>
                    <button 
                    onClick={() => setMobileSettings(prev => ({ ...prev, biometricAuth: !prev.biometricAuth }))}
                    className={`w-12 h-6 rounded-full transition-all relative ${mobileSettings.biometricAuth ? 'bg-black' : 'bg-gray-300'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${mobileSettings.biometricAuth ? 'right-1' : 'left-1'}`} />
                  </button>
                </div>
                <div className="p-6 bg-gray-50 rounded-2xl border border-dashed border-gray-200 flex flex-col items-center text-center space-y-4">
                  <div className="w-32 h-32 bg-white rounded-xl shadow-sm flex items-center justify-center">
                    <Globe size={48} className="text-gray-200" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">Mobile App QR Code</p>
                    <p className="text-xs text-gray-500">Scan this code to download the app on your device.</p>
                  </div>
                  <button 
                    onClick={handleDownloadApp}
                    className="text-xs font-bold text-blue-600 hover:underline"
                  >
                    Download App Link
                  </button>
                </div>
              </div>
            </div>
          )}

            {activeTab === 'Activity Logs' && (
              <ActivityLogsTab />
            )}

            {activeTab === 'Team Permissions' && currentUserRole === 'admin' && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Users size={20} /> Team Permissions
                </h3>
                <p className="text-sm text-gray-500">Select a user to manage their access to specific modules.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* User List */}
                  <div className="md:col-span-1 border rounded-xl overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 border-b text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Team Members
                    </div>
                    <div className="divide-y max-h-[400px] overflow-y-auto">
                      {users.filter(u => u.role !== 'admin').map((user) => (
                        <button
                          key={user.uid}
                          onClick={() => setSelectedUser(user)}
                          className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${selectedUser?.uid === user.uid ? 'bg-blue-50 border-l-4 border-blue-600' : ''}`}
                        >
                          <p className="text-sm font-bold text-gray-900">{user.name}</p>
                          <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                        </button>
                      ))}
                      {users.filter(u => u.role !== 'admin').length === 0 && (
                        <div className="p-4 text-center text-sm text-gray-500">
                          No managers or staff found.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Permissions Toggles */}
                  <div className="md:col-span-2 border rounded-xl overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 border-b text-xs font-bold text-gray-500 uppercase tracking-wider">
                      {selectedUser ? `Permissions for ${selectedUser.name}` : 'Select a user'}
                    </div>
                    <div className="p-4 space-y-4">
                      {selectedUser ? (
                        <div className="grid grid-cols-1 gap-3">
                          {[
                            { key: 'dashboard', label: 'Dashboard', icon: Globe },
                            { key: 'pos', label: 'POS', icon: Calculator },
                            { key: 'orders', label: 'Orders', icon: ShoppingCart },
                            { key: 'inventory', label: 'Inventory', icon: Database },
                            { key: 'crm', label: 'CRM / Customers', icon: UserIcon },
                            { key: 'suppliers', label: 'Suppliers', icon: UserPlus },
                            { key: 'logistics', label: 'Logistics', icon: Truck },
                            { key: 'tasks', label: 'Tasks', icon: ClipboardList },
                            { key: 'finance', label: 'Finance', icon: CreditCard },
                            { key: 'hr', label: 'HR Management', icon: Users },
                            { key: 'team', label: 'Team', icon: Users },
                            { key: 'settings', label: 'Settings', icon: SettingsIcon },
                            { key: 'reports', label: 'Reports', icon: Shield },
                          ].map((module) => (
                            <div key={module.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-white rounded-lg shadow-sm">
                                  <module.icon size={16} className="text-gray-600" />
                                </div>
                                <span className="text-sm font-medium text-gray-700">{module.label}</span>
                              </div>
                              <button
                                onClick={() => togglePermission(selectedUser, module.key as keyof UserPermissions)}
                                disabled={isUpdatingPermissions}
                                className={`w-12 h-6 rounded-full transition-all relative ${selectedUser.permissions?.[module.key as keyof UserPermissions] ? 'bg-black' : 'bg-gray-300'} ${isUpdatingPermissions ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${selectedUser.permissions?.[module.key as keyof UserPermissions] ? 'right-1' : 'left-1'}`} />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                          <Users size={48} className="mb-2 opacity-20" />
                          <p className="text-sm">Select a team member to manage their permissions</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-8 border-t border-gray-100 flex justify-end gap-3">
              <button 
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-[#141414] text-white rounded-lg text-sm font-medium hover:bg-black transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
