import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  User, 
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
  ShoppingCart
} from 'lucide-react';
import { toast } from 'sonner';
import { db, auth, doc, getDoc, setDoc, onSnapshot, collection, getDocs, query, where, deleteDoc, writeBatch } from '../firebase';

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('General');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const [companyInfo, setCompanyInfo] = useState({
    companyName: '',
    companyLogo: '',
    companyAddress: '',
    companyMobile: '',
    companyPhone: '',
    companyWebsite: '',
    currency: 'BDT',
    timezone: 'Asia/Dhaka',
    language: 'English',
    steadfastApiKey: '',
    steadfastSecretKey: '',
    wooUrl: '',
    wooConsumerKey: '',
    wooConsumerSecret: ''
  });

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
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

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
      if (activeTab === 'General' || activeTab === 'Company Info' || activeTab === 'Logistics') {
        await setDoc(doc(db, 'settings', 'company'), companyInfo, { merge: true });
      } else {
        const userDocRef = doc(db, 'settings', `user_${auth.currentUser?.uid}`);
        const updateData: any = {};
        if (activeTab === 'Account') updateData.account = accountSettings;
        if (activeTab === 'Notifications') updateData.notifications = notificationSettings;
        if (activeTab === 'Security') updateData.security = securitySettings;
        if (activeTab === 'Integrations') updateData.integrations = integrationSettings;
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
            { name: 'Account', icon: User },
            { name: 'Notifications', icon: Bell },
            { name: 'Security', icon: Shield },
            { name: 'Integrations', icon: Globe },
            { name: 'Logistics', icon: Truck },
            { name: 'Data Management', icon: Database },
            { name: 'Mobile App', icon: Smartphone },
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
                </div>
              </div>
            )}

            {activeTab === 'Company Info' && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Building2 size={20} /> Company Information
                </h3>
                <div className="flex items-center gap-6 pb-6 border-b border-gray-50">
                  <div className="w-24 h-24 bg-gray-100 rounded-2xl flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-200">
                    {companyInfo.companyLogo ? (
                      <img src={companyInfo.companyLogo} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                    ) : (
                      <Building2 size={32} className="text-gray-300" />
                    )}
                  </div>
                  <div className="space-y-2 flex-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Company Logo URL</label>
                    <input 
                      type="text" 
                      value={companyInfo.companyLogo} 
                      onChange={e => setCompanyInfo({...companyInfo, companyLogo: e.target.value})}
                      placeholder="https://example.com/logo.png"
                      className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all" 
                    />
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
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Mobile</label>
                    <input 
                      type="text" 
                      value={companyInfo.companyMobile} 
                      onChange={e => setCompanyInfo({...companyInfo, companyMobile: e.target.value})}
                      className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all" 
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Address</label>
                    <textarea 
                      value={companyInfo.companyAddress} 
                      onChange={e => setCompanyInfo({...companyInfo, companyAddress: e.target.value})}
                      rows={3}
                      className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all resize-none" 
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Account' && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <User size={20} /> Account Settings
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
              <div className="space-y-6">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Truck size={20} /> Logistics Integration
                </h3>
                <div className="p-6 bg-blue-50 rounded-xl border border-blue-100 flex items-start gap-4">
                  <div className="p-2 bg-white rounded-lg text-blue-600 shadow-sm">
                    <AlertCircle size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-blue-900">Steadfast Courier Integration</h4>
                    <p className="text-xs text-blue-700 mt-1 leading-relaxed">
                      Connect your Steadfast Courier account to automate order fulfillment. 
                      You can find your API Key and Secret Key in your Steadfast Portal settings.
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Steadfast API Key</label>
                    <input 
                      type="text" 
                      value={companyInfo.steadfastApiKey} 
                      onChange={e => setCompanyInfo({...companyInfo, steadfastApiKey: e.target.value})}
                      placeholder="Enter your Steadfast API Key"
                      className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Steadfast Secret Key</label>
                    <input 
                      type="password" 
                      value={companyInfo.steadfastSecretKey} 
                      onChange={e => setCompanyInfo({...companyInfo, steadfastSecretKey: e.target.value})}
                      placeholder="Enter your Steadfast Secret Key"
                      className="w-full px-4 py-2 bg-gray-50 border border-transparent rounded-lg text-sm focus:bg-white focus:border-gray-200 outline-none transition-all" 
                    />
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

const Loader2 = ({ className, size }: { className?: string, size?: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size || 24}
    height={size || 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);
