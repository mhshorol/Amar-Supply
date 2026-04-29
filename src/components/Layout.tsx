import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Users, 
  Truck, 
  CreditCard, 
  Settings, 
  LogOut,
  Menu,
  X,
  Search,
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  FileText,
  FilePlus,
  UserPlus,
  CheckCircle2,
  Activity,
  ClipboardList,
  Quote,
  PanelLeftClose,
  PanelLeftOpen,
  Calculator,
  BarChart3,
  RotateCcw,
  Mail,
  Check,
  Circle,
  Download,
  Sun,
  Moon,
  MessageSquare,
  CornerDownLeft,
  Sparkles,
  LayoutGrid,
  List,
  User,
  Clock,
  SlidersHorizontal,
  Eye
} from 'lucide-react';
import { db, auth, signOut, collection, query, where, orderBy, onSnapshot, limit } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { UserPermissions } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { markNotificationAsRead } from '../services/notificationService';
import { useTheme } from '../contexts/ThemeContext';

interface LayoutProps {
  children: React.ReactNode;
  user: any;
}

const navItems: { 
  name: string; 
  path: string; 
  icon: any; 
  permission: keyof UserPermissions;
  subItems?: { name: string; path: string; permission: keyof UserPermissions }[]
}[] = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard, permission: 'dashboard' },
  { name: 'Reports', path: '/reports', icon: BarChart3, permission: 'dashboard' },
  { name: 'POS', path: '/pos', icon: Calculator, permission: 'pos' },
  { 
    name: 'Orders', 
    path: '/orders', 
    icon: ShoppingCart, 
    permission: 'orders',
    subItems: [
      { name: 'Order List', path: '/orders', permission: 'orders' },
      { name: 'New Order', path: '/orders/new', permission: 'orders' },
      { name: 'Returns', path: '/returns', permission: 'orders' },
    ]
  },
  { 
    name: 'Inventory', 
    path: '/inventory', 
    icon: Package, 
    permission: 'inventory',
    subItems: [
      { name: 'Product List', path: '/inventory', permission: 'inventory' },
      { name: 'Add Product', path: '/inventory/new', permission: 'inventory' },
    ]
  },
  { name: 'CRM', path: '/crm', icon: Users, permission: 'crm' },
  { name: 'Inbox', path: '/inbox', icon: MessageSquare, permission: 'crm' },
  { name: 'Suppliers', path: '/suppliers', icon: UserPlus, permission: 'suppliers' },
  { name: 'Logistics', path: '/logistics', icon: Truck, permission: 'logistics' },
  { name: 'Tasks', path: '/tasks', icon: ClipboardList, permission: 'tasks' },
  { name: 'Finance', path: '/finance', icon: CreditCard, permission: 'finance' },
  { name: 'HR', path: '/hr', icon: Users, permission: 'hr' },
  { name: 'Team', path: '/team', icon: UserPlus, permission: 'team' },
  { name: 'Settings', path: '/settings', icon: Settings, permission: 'settings' },
];

export default function Layout({ children, user }: LayoutProps) {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { hasPermission } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>(['Orders']);
  const quickActionRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState<'All' | 'Orders' | 'Tasks' | 'System'>('All');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  const unreadCount = notifications.filter(n => Array.isArray(n.readBy) && !n.readBy.includes(user?.uid)).length;

  const handleMarkAllAsRead = async () => {
    if (!user?.uid) return;
    const unreadNotifications = notifications.filter(n => Array.isArray(n.readBy) && !n.readBy.includes(user.uid));
    
    for (const notification of unreadNotifications) {
      await markNotificationAsRead(notification.id, user.uid);
    }
  };

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShowInstallBtn(false);
  };

  useEffect(() => {
    if (!user?.uid) return;

    // Fetch notifications where recipients includes current user
    const q = query(
      collection(db, 'notifications'),
      where('recipients', 'array-contains', user.uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsQuickActionOpen(prev => !prev);
      }
      
      // Close on escape
      if (e.key === 'Escape' && isQuickActionOpen) {
        setIsQuickActionOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isQuickActionOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (quickActionRef.current && !quickActionRef.current.contains(event.target as Node)) {
        setIsQuickActionOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (location.pathname === '/pos') {
      setIsSidebarMinimized(true);
    } else {
      setIsSidebarMinimized(false);
    }
    
    // Automatically expand the menu item that contains the current path
    const activeItem = navItems.find(item => 
      item.path === location.pathname || item.subItems?.some(sub => location.pathname === sub.path || location.pathname.startsWith(sub.path + '/'))
    );
    if (activeItem && activeItem.subItems) {
      setExpandedItems([activeItem.name]);
    } else if (activeItem && !activeItem.subItems) {
      // If we navigate to a path without subItems, maybe close others?
      setExpandedItems([]);
    }
  }, [location.pathname]);

  const toggleExpand = (name: string) => {
    setExpandedItems(prev => 
      prev.includes(name) ? prev.filter(i => i !== name) : [name]
    );
  };

  const handleLogout = () => {
    signOut(auth);
  };

  const filteredNavItems = navItems.filter(item => hasPermission(item.permission));

  return (
    <div className="min-h-screen bg-surface flex transition-colors duration-300">
      {/* Sidebar - Desktop */}
      <aside className={`hidden md:flex flex-col ${isSidebarMinimized ? 'w-16' : 'w-[240px]'} bg-surface border-r border-border z-30 no-print transition-all duration-300 relative shadow-subtle`}>
        <div className={`p-4 flex transition-all duration-300 ${isSidebarMinimized ? 'flex-col items-center gap-4' : 'items-center justify-between gap-3'}`}>
          <div className={`flex items-center gap-2.5 ${isSidebarMinimized ? 'flex-col' : 'animate-in fade-in slide-in-from-left-2 duration-300'}`}>
            <div className="w-9 h-9 bg-brand rounded-lg flex items-center justify-center text-white shadow-lg shadow-brand/20 transition-transform duration-300 flex-shrink-0 group-hover:scale-105">
              <ShoppingCart size={18} strokeWidth={2.5} />
            </div>
            {!isSidebarMinimized && (
              <div className="flex-1">
                <h1 className="text-[1.125rem] font-bold tracking-tight text-primary leading-[1.1] flex items-center gap-1 font-[Inter,sans-serif]">
                  <span className="font-extrabold text-primary">Amar</span>
                  <span className="text-brand font-bold">e-Com</span>
                </h1>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="w-1 h-1 rounded-full bg-[#10B981]"></span>
                  <p className="text-[8px] uppercase tracking-widest text-secondary font-bold">Business OS</p>
                </div>
              </div>
            )}
          </div>

          <button 
            onClick={() => setIsSidebarMinimized(!isSidebarMinimized)}
            className={`p-1 hover:bg-surface-hover border border-border text-muted hover:text-secondary rounded-md transition-all active:scale-95 ${isSidebarMinimized ? 'order-2' : 'order-1'} bg-surface shrink-0`}
          >
            {isSidebarMinimized ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
          </button>
        </div>

        <nav className="flex-1 px-3 py-1 space-y-0.5 overflow-y-auto custom-scrollbar">
          <div className={`pb-3 ${!isSidebarMinimized ? 'border-b border-border' : ''} mb-4`}>
            {!isSidebarMinimized && <p className="px-3 text-[9px] font-black tracking-[0.12em] text-muted mb-2 uppercase">Overview</p>}
            {filteredNavItems.slice(0, 3).map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <div key={item.path} className="relative mb-0.5">
                   {isActive && !isSidebarMinimized && (
                     <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-6 bg-brand rounded-r-sm" />
                   )}
                  <Link
                    to={item.path}
                    className={`flex items-center ${isSidebarMinimized ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-xl transition-all duration-300 group ${
                      isActive 
                        ? 'bg-brand/10 dark:bg-brand/20 text-brand font-bold' 
                        : 'text-secondary hover:text-primary hover:bg-surface-hover font-medium'
                    }`}
                  >
                    <Icon size={18} className={isActive ? 'text-brand' : 'text-muted group-hover:text-secondary'} />
                    {!isSidebarMinimized && <span className="text-[13px]">{item.name}</span>}
                  </Link>
                </div>
              );
            })}
          </div>

          <div>
            {!isSidebarMinimized && <p className="px-3 text-[9px] font-black tracking-[0.12em] text-muted mb-2 uppercase">Operations</p>}
            {filteredNavItems.slice(3).map((item) => {
              const Icon = item.icon;
              const isChildActive = item.subItems?.some(sub => location.pathname === sub.path || location.pathname.startsWith(sub.path + '/'));
              const isActive = location.pathname === item.path || isChildActive;
              const isExpanded = expandedItems.includes(item.name);
              
              if (item.subItems && !isSidebarMinimized) {
                return (
                  <div key={item.name} className={`mb-1.5 ${isExpanded ? 'bg-background rounded-xl pb-2' : ''}`}>
                    <button
                      onClick={() => toggleExpand(item.name)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all group ${
                        isExpanded ? 'text-brand font-bold' : isActive ? 'bg-brand/10 dark:bg-brand/20 text-brand font-bold' : 'text-secondary hover:text-primary hover:bg-surface-hover font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon size={18} className={isExpanded || isActive ? 'text-brand' : 'text-muted group-hover:text-secondary'} />
                        <span className="text-[13px]">{item.name}</span>
                      </div>
                      <ChevronDown size={14} strokeWidth={2.5} className={`transition-transform duration-300 ${isExpanded ? 'rotate-180 text-brand' : 'text-muted'}`} />
                    </button>
                    {isExpanded && (
                      <div className="mt-0.5 ml-6 relative">
                        {/* Connecting Line Track */}
                        <div className="absolute top-2 bottom-4 left-[1px] w-[1px] bg-[#E2E8F0]" />
                        
                        <div className="flex flex-col gap-1 relative z-10 w-full pl-6">
                           {item.subItems.filter(sub => hasPermission(sub.permission)).map((sub, idx) => {
                             const isSubActive = location.pathname === sub.path;
                             
                             let SubIcon = FileText;
                             if (sub.name.includes('New')) SubIcon = FilePlus;
                             else if (sub.name.includes('Return')) SubIcon = RotateCcw;
                             else if (sub.name.includes('List')) SubIcon = FileText;
                             
                             return (
                               <Link
                                 key={sub.name}
                                 to={sub.path}
                                 className={`relative flex items-center gap-3 px-1 py-1 rounded-lg text-[12px] transition-all group ${
                                   isSubActive ? 'text-brand font-bold' : 'text-secondary hover:text-primary font-medium'
                                 }`}
                               >
                                 <div className={`absolute top-1/2 -translate-y-1/2 -left-[1.58rem] w-1.5 h-1.5 rounded-full ring-[3px] ring-[#F8FAFC] transition-all z-20 ${isSubActive ? 'bg-brand' : 'bg-gray-300 group-hover:bg-gray-400'}`} />
                                 {isSubActive ? (
                                   <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-[#E5F1FF] text-brand z-10 shadow-subtle border border-brand/20">
                                     <SubIcon size={14} strokeWidth={2.5} />
                                   </div>
                                 ) : (
                                   <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-muted group-hover:text-secondary z-10">
                                     <SubIcon size={14} strokeWidth={2} />
                                   </div>
                                 )}
                                 {sub.name}
                               </Link>
                             );
                           })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <div key={item.path} className="relative mb-0.5">
                   {isActive && !isSidebarMinimized && (
                     <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-6 bg-brand rounded-r-sm" />
                   )}
                  <Link
                    to={item.path}
                    className={`flex items-center ${isSidebarMinimized ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-xl transition-all duration-300 group ${
                      isActive 
                        ? 'bg-brand/10 dark:bg-brand/20 text-brand font-bold' 
                        : (isActive ? 'bg-brand/10 dark:bg-brand/20 text-brand font-bold' : 'text-secondary hover:text-primary hover:bg-surface-hover font-medium')
                    }`}
                  >
                    <Icon size={18} className={isActive ? 'text-brand' : 'text-muted group-hover:text-secondary'} />
                    {!isSidebarMinimized && <span className="text-[13px]">{item.name}</span>}
                  </Link>
                </div>
              );
            })}
          </div>
        </nav>

        <div className="p-3 border-t border-border">
           <button 
             onClick={handleLogout}
             className={`flex items-center ${isSidebarMinimized ? 'justify-center' : 'gap-3'} w-full text-secondary hover:text-red-500 px-3 py-2.5 rounded-lg hover:bg-red-50 transition-all outline-none font-medium text-[13px]`}
           >
             <LogOut size={18} />
             {!isSidebarMinimized && <span>Log out</span>}
           </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background">
        {/* Header */}
        <header className="h-16 bg-surface border-b border-border flex items-center justify-between px-6 lg:px-8 sticky top-0 z-20 no-print transition-all">
          <div className="flex items-center gap-3 s:gap-6 flex-1 min-w-0">
            {/* Mobile Menu Toggle */}
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden w-10 h-10 flex items-center justify-center bg-surface text-primary hover:bg-surface-hover rounded-xl shrink-0 transition-all border border-border/60 shadow-subtle"
              aria-label="Toggle Mobile Menu"
            >
              <Menu size={20} />
            </button>
            
            <div className="relative max-w-md w-full hidden md:block group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="text-muted group-focus-within:text-brand transition-colors" size={18} />
              </div>
              <input 
                type="text"
                placeholder="Search resources..."
                className="w-full pl-11 pr-4 py-2.5 bg-surface border border-transparent rounded-2xl text-[14px] font-medium focus:bg-card focus:border-accent/20 focus:ring-4 focus:ring-accent/5 outline-none transition-all placeholder:text-muted h-11"
              />
            </div>
            
            {/* Mobile Brand - Show only on tiny screens */}
            <div className="md:hidden flex items-center gap-2 flex-1 justify-center sm:justify-start overflow-hidden">
               <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center text-white shrink-0">
                 <ShoppingCart size={16} />
               </div>
               <span className="text-lg font-bold text-primary truncate sm:hidden">Amar e-Com</span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {hasPermission('pos') && (
              <Link to="/pos" className="hidden sm:flex items-center gap-2 px-5 py-2.5 bg-brand/10 text-brand hover:bg-brand/20 rounded-2xl transition-all font-bold text-sm group">
                <Calculator size={18} className="group-hover:scale-110 transition-transform" />
                Quick POS
              </Link>
            )}

            {/* Quick Actions */}
            <div className="relative shrink-0 hidden sm:block" ref={quickActionRef}>
              <button 
                onClick={() => setIsQuickActionOpen(!isQuickActionOpen)}
                className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-[13px] font-black transition-all border ${isQuickActionOpen ? 'bg-brand/5 text-brand border-brand/10' : 'bg-surface-hover hover:bg-surface-hover text-secondary border-transparent'}`}
              >
                <Plus size={18} strokeWidth={2.5} />
                <span className="hidden lg:inline">New Action</span>
                <ChevronDown size={14} strokeWidth={2.5} className={`transition-transform duration-300 ${isQuickActionOpen ? 'rotate-180' : ''}`} />
              </button>

              {isQuickActionOpen && (
                <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4 cursor-default">
                  <div className="fixed inset-0 bg-black/20 dark:bg-black/60 backdrop-blur-sm transition-all" onClick={() => setIsQuickActionOpen(false)} />
                  <div className="relative w-full max-w-2xl bg-surface rounded-[24px] shadow-2xl border border-border overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-start justify-between p-6 pb-4">
                      <div>
                        <h2 className="text-xl font-bold text-primary text-left">Quick Action</h2>
                        <p className="text-sm text-secondary font-medium">Create new or start something</p>
                      </div>
                      <button onClick={() => setIsQuickActionOpen(false)} className="px-3 py-1.5 text-xs font-semibold text-secondary bg-surface border border-border rounded-lg shadow-sm hover:bg-surface-hover transition-colors cursor-pointer">
                        ESC
                      </button>
                    </div>

                    <div className="px-6 mb-4">
                      <div className="flex items-center gap-3 px-4 py-3 border border-border rounded-[16px] bg-surface group focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/10 transition-all">
                        <Search size={20} className="text-muted" />
                        <input 
                          type="text" 
                          autoFocus
                          placeholder="Search actions (e.g. order, product, customer...)"
                          className="flex-1 bg-transparent border-none outline-none text-[15px] font-medium text-primary placeholder:text-muted"
                        />
                        <div className="flex items-center gap-1 text-[11px] font-black tracking-widest text-muted border border-border rounded-md px-2 py-1 bg-surface-hover">
                          <span>⌘</span>
                          <span>K</span>
                        </div>
                      </div>
                    </div>

                    <div className="px-6 mb-2 mt-6">
                      <p className="text-[11px] font-bold tracking-[0.15em] text-secondary uppercase text-left">CREATE NEW</p>
                    </div>

                    <div className="px-4 space-y-1">
                      {hasPermission('orders') && (
                        <Link 
                          to="/orders/new" 
                          className="flex items-center gap-4 p-3 rounded-[16px] hover:bg-brand/5 group transition-all"
                          onClick={() => setIsQuickActionOpen(false)}
                        >
                          <div className="w-12 h-12 rounded-[14px] bg-[#EEF2FF] dark:bg-blue-500/10 flex items-center justify-center shrink-0">
                            <ShoppingCart size={22} className="text-[#3B82F6]" strokeWidth={2} />
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <p className="font-bold text-[15px] text-primary">New Order</p>
                            <p className="text-[13px] text-secondary font-medium">Create a new customer order</p>
                          </div>
                          <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="px-2.5 py-1 text-[11px] font-bold text-secondary bg-surface border border-border rounded-lg shadow-sm flex items-center gap-1">
                              <CornerDownLeft size={12} /> Enter
                            </span>
                            <ChevronRight size={18} className="text-muted" />
                          </div>
                        </Link>
                      )}

                      {hasPermission('inventory') && (
                        <Link 
                          to="/inventory/new" 
                          className="flex items-center gap-4 p-3 rounded-[16px] hover:bg-[#FFF7ED] dark:hover:bg-orange-500/10 group transition-all"
                          onClick={() => setIsQuickActionOpen(false)}
                        >
                          <div className="w-12 h-12 rounded-[14px] bg-[#FFF7ED] dark:bg-orange-500/10 flex items-center justify-center shrink-0">
                            <Package size={22} className="text-[#F97316]" strokeWidth={2} />
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <p className="font-bold text-[15px] text-primary">Add Product</p>
                            <p className="text-[13px] text-secondary font-medium">Add a new product to inventory</p>
                          </div>
                          <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="px-2.5 py-1 text-[11px] font-bold text-secondary bg-surface border border-border rounded-lg shadow-sm">
                              P
                            </span>
                            <ChevronRight size={18} className="text-muted" />
                          </div>
                        </Link>
                      )}

                      {hasPermission('crm') && (
                        <Link 
                          to="/crm" 
                          className="flex items-center gap-4 p-3 rounded-[16px] hover:bg-[#F0FDF4] dark:hover:bg-green-500/10 group transition-all"
                          onClick={() => setIsQuickActionOpen(false)}
                        >
                          <div className="w-12 h-12 rounded-[14px] bg-[#F0FDF4] dark:bg-green-500/10 flex items-center justify-center shrink-0">
                            <UserPlus size={22} className="text-[#22C55E]" strokeWidth={2} />
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <p className="font-bold text-[15px] text-primary">Add Customer</p>
                            <p className="text-[13px] text-secondary font-medium">Create a new customer profile</p>
                          </div>
                          <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="px-2.5 py-1 text-[11px] font-bold text-secondary bg-surface border border-border rounded-lg shadow-sm">
                              C
                            </span>
                            <ChevronRight size={18} className="text-muted" />
                          </div>
                        </Link>
                      )}

                      {hasPermission('tasks') && (
                        <Link 
                          to="/tasks" 
                          className="flex items-center gap-4 p-3 rounded-[16px] hover:bg-[#FAF5FF] dark:hover:bg-purple-500/10 group transition-all"
                          onClick={() => setIsQuickActionOpen(false)}
                        >
                          <div className="w-12 h-12 rounded-[14px] bg-[#FAF5FF] dark:bg-purple-500/10 flex items-center justify-center shrink-0">
                            <ClipboardList size={22} className="text-[#A855F7]" strokeWidth={2} />
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <p className="font-bold text-[15px] text-primary">Create Task</p>
                            <p className="text-[13px] text-secondary font-medium">Create a new task or to-do</p>
                          </div>
                          <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="px-2.5 py-1 text-[11px] font-bold text-secondary bg-surface border border-border rounded-lg shadow-sm">
                              T
                            </span>
                            <ChevronRight size={18} className="text-muted" />
                          </div>
                        </Link>
                      )}
                    </div>

                    <div className="px-6 mb-2 mt-4 pt-4 border-t border-border">
                      <p className="text-[11px] font-bold tracking-[0.15em] text-secondary uppercase text-left">OTHER ACTIONS</p>
                    </div>

                    <div className="px-4 space-y-1 mb-6">
                      {hasPermission('logistics') && (
                        <Link 
                          to="/logistics" 
                          className="flex items-center gap-4 p-3 rounded-[16px] hover:bg-[#FEFCE8] dark:hover:bg-yellow-500/10 group transition-all"
                          onClick={() => setIsQuickActionOpen(false)}
                        >
                          <div className="w-12 h-12 rounded-[14px] bg-[#FEFCE8] dark:bg-yellow-500/10 flex items-center justify-center shrink-0">
                            <Truck size={22} className="text-[#EAB308]" strokeWidth={2} />
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <p className="font-bold text-[15px] text-primary">Create Shipment</p>
                            <p className="text-[13px] text-secondary font-medium">Create a new shipment</p>
                          </div>
                          <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="px-2.5 py-1 text-[11px] font-bold text-secondary bg-surface border border-border rounded-lg shadow-sm">
                              S
                            </span>
                            <ChevronRight size={18} className="text-muted" />
                          </div>
                        </Link>
                      )}
                    </div>

                    <div className="p-4 bg-gradient-to-t from-surface-hover/50 to-transparent relative z-10 w-full mt-2 border-t border-border/50">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-surface-hover dark:bg-[#1E293B] rounded-[16px] border border-border gap-3">
                        <div className="flex items-center gap-3 w-full">
                          <Sparkles size={16} className="text-brand shrink-0" />
                          <span className="text-[13px] font-medium text-secondary truncate"><strong>Tip:</strong> You can also use shortcuts to quickly create new items</span>
                        </div>
                        <button className="flex items-center justify-center gap-2 px-3 py-1.5 text-[12px] font-bold text-primary bg-surface border border-border rounded-lg shadow-sm hover:bg-surface-hover transition-colors shrink-0">
                          View All Actions <LayoutGrid size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              <button className="relative p-2 sm:p-2.5 text-muted hover:bg-surface-hover hover:text-brand rounded-xl transition-all cursor-pointer hidden">
                <Search className="md:hidden" size={22} />
              </button>

              <button 
                onClick={toggleTheme}
                className="relative p-2 sm:p-2.5 text-muted hover:bg-surface-hover hover:text-accent rounded-xl transition-all group"
                title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              >
                {theme === 'light' ? <Moon size={22} className="group-hover:rotate-12 transition-transform" /> : <Sun size={22} className="group-hover:rotate-45 transition-transform" />}
              </button>
              
              <div className="relative" ref={notificationsRef}>
                <button 
                  onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                  className={`relative p-2 sm:p-2.5 rounded-xl transition-all border border-transparent ${isNotificationsOpen ? 'bg-accent/5 text-accent border border-accent/10' : 'text-muted hover:bg-surface-hover hover:text-brand'}`}
                >
                  <Bell size={22} className={unreadCount > 0 ? 'fill-danger/10' : ''} />
                  {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 w-2 h-2 bg-danger rounded-full border-2 border-card ring-4 ring-danger/10"></span>
                  )}
                </button>

                {isNotificationsOpen && (
                  <div className="absolute right-0 mt-4 w-80 sm:w-[500px] bg-surface rounded-[24px] shadow-2xl border border-border overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-6 pb-4 flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-primary text-xl tracking-tight">Notifications</h3>
                        <p className="text-sm font-medium text-secondary mt-0.5">Stay updated with your latest activity</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <button onClick={handleMarkAllAsRead} className="text-sm font-bold text-[#3B82F6] hover:underline transition-all">Mark all as read</button>
                        <button className="p-2 border border-border rounded-xl text-secondary hover:bg-surface-hover hover:text-primary transition-colors bg-surface shadow-sm">
                          <SlidersHorizontal size={18} />
                        </button>
                      </div>
                    </div>

                    <div className="px-6 pb-4 flex items-center gap-2 overflow-x-auto no-scrollbar border-b border-border/50">
                      <button onClick={() => setNotificationFilter('All')} className={`flex items-center gap-2 px-4 py-2 rounded-full border ${notificationFilter === 'All' ? 'border-[#3B82F6] bg-[#EFF6FF] dark:bg-blue-500/10 text-[#3B82F6]' : 'border-border bg-surface text-secondary hover:text-primary hover:bg-surface-hover'} font-bold text-[13px] shrink-0 transition-colors`}>
                        <List size={16} strokeWidth={2.5} /> All
                      </button>
                      <button onClick={() => setNotificationFilter('Orders')} className={`flex items-center gap-2 px-4 py-2 rounded-full border ${notificationFilter === 'Orders' ? 'border-[#22C55E] bg-[#F0FDF4] dark:bg-green-500/10 text-[#22C55E]' : 'border-border bg-surface text-secondary hover:text-primary hover:bg-surface-hover'} font-bold text-[13px] shrink-0 transition-colors`}>
                        <ShoppingCart size={16} strokeWidth={2.5} className={notificationFilter === 'Orders' ? '' : 'text-[#22C55E]'} /> Orders
                      </button>
                      <button onClick={() => setNotificationFilter('Tasks')} className={`flex items-center gap-2 px-4 py-2 rounded-full border ${notificationFilter === 'Tasks' ? 'border-[#F97316] bg-[#FFF7ED] dark:bg-orange-500/10 text-[#F97316]' : 'border-border bg-surface text-secondary hover:text-primary hover:bg-surface-hover'} font-bold text-[13px] shrink-0 transition-colors`}>
                        <ClipboardList size={16} strokeWidth={2.5} className={notificationFilter === 'Tasks' ? '' : 'text-[#F97316]'} /> Tasks
                      </button>
                      <button onClick={() => setNotificationFilter('System')} className={`flex items-center gap-2 px-4 py-2 rounded-full border ${notificationFilter === 'System' ? 'border-[#A855F7] bg-[#FAF5FF] dark:bg-purple-500/10 text-[#A855F7]' : 'border-border bg-surface text-secondary hover:text-primary hover:bg-surface-hover'} font-bold text-[13px] shrink-0 transition-colors`}>
                        <Settings size={16} strokeWidth={2.5} className={notificationFilter === 'System' ? '' : 'text-[#A855F7]'} /> System
                      </button>
                    </div>

                    <div className="max-h-[440px] overflow-y-auto no-scrollbar pb-6">
                      {notifications.length > 0 ? (
                        <div className="divide-y divide-border/40">
                          {(() => {
                             const filteredNotifications = notifications.filter(n => {
                               const typeLower = (n.type || '').toLowerCase();
                               const titleLower = (n.title || '').toLowerCase();
                               const isOrder = typeLower === 'order' || titleLower.includes('order');
                               const isTask = typeLower === 'task' || titleLower.includes('task');
                               if (notificationFilter === 'Orders') return isOrder;
                               if (notificationFilter === 'Tasks') return isTask;
                               if (notificationFilter === 'System') return !isOrder && !isTask;
                               return true;
                             });
                             const displayNotifications = filteredNotifications.slice(0, 5);

                             if (displayNotifications.length === 0) {
                               return (
                                 <div className="py-12 text-center text-secondary">
                                   <p className="font-medium">No {notificationFilter.toLowerCase()} notifications found.</p>
                                 </div>
                               );
                             }

                             return displayNotifications.map((notification) => {
                               const isRead = notification.readBy.includes(user?.uid);
                            
                            const titleLower = (notification.title || '').toLowerCase();
                            const typeLower = (notification.type || '').toLowerCase();
                            
                            let NotifIcon = Settings;
                            let iconColor = 'text-slate-500';
                            let iconBg = 'bg-slate-50 dark:bg-slate-500/10';
                            
                            if (typeLower === 'order' || titleLower.includes('order')) {
                              NotifIcon = ShoppingCart;
                              iconColor = 'text-[#3B82F6]';
                              iconBg = 'bg-[#EEF2FF] dark:bg-blue-500/10';
                            } else if (typeLower === 'task' || titleLower.includes('task')) {
                              NotifIcon = ClipboardList;
                              iconColor = 'text-[#F97316]';
                              iconBg = 'bg-[#FFF7ED] dark:bg-orange-500/10';
                            } else if (titleLower.includes('customer') || titleLower.includes('user')) {
                              NotifIcon = User;
                              iconColor = 'text-[#22C55E]';
                              iconBg = 'bg-[#F0FDF4] dark:bg-green-500/10';
                            } else if (titleLower.includes('stock') || titleLower.includes('product') || typeLower === 'inventory') {
                              NotifIcon = Package;
                              iconColor = 'text-[#A855F7]';
                              iconBg = 'bg-[#FAF5FF] dark:bg-purple-500/10';
                            }

                            return (
                               <div 
                                 key={notification.id} 
                                 className={`px-6 py-4 transition-all hover:bg-surface-hover/50 cursor-pointer flex gap-4 ${!isRead ? 'bg-[#F8FAFC] dark:bg-slate-800/30' : 'bg-surface'}`}
                                 onClick={() => {
                                   if (!isRead && user?.uid) {
                                     markNotificationAsRead(notification.id, user.uid);
                                   }
                                   setIsNotificationsOpen(false);
                                 }}
                               >
                                  <div className="pt-3.5 shrink-0 flex items-center justify-center w-4">
                                     {!isRead ? (
                                       <div className="w-2.5 h-2.5 rounded-full border-2 border-[#1E293B] dark:border-white bg-transparent"></div>
                                     ) : (
                                       <div className="w-2.5 h-2.5 rounded-full border-2 border-slate-300 dark:border-slate-500 bg-transparent"></div>
                                     )}
                                  </div>
                                  <div className={`w-[48px] h-[48px] rounded-[16px] flex items-center justify-center shrink-0 ${iconBg}`}>
                                    <NotifIcon size={22} className={iconColor} strokeWidth={2} />
                                  </div>
                                  <div className="flex-1 min-w-0 pr-2 pt-0.5">
                                     <h4 className="text-[15px] font-bold text-primary mb-1">{notification.title}</h4>
                                     <p className="text-[13px] text-secondary font-medium leading-relaxed mb-2.5 line-clamp-2">
                                       {notification.message}
                                     </p>
                                     <div className="flex items-center gap-1.5 text-muted">
                                       <Clock size={12} strokeWidth={2.5} />
                                       <span className="text-[12px] font-semibold">
                                         {notification.createdAt ? formatDistanceToNow(new Date(notification.createdAt.seconds * 1000)) + ' ago' : 'now'}
                                       </span>
                                     </div>
                                  </div>
                                </div>
                             );
                            }); // This closes displayNotifications.map()
                           })() // This closes the IIFE
                          }
                        </div>
                      ) : (
                        <div className="py-20 text-center text-secondary">
                          <div className="w-20 h-20 bg-surface-hover rounded-full flex items-center justify-center mx-auto mb-6">
                            <Bell size={32} className="text-muted" />
                          </div>
                          <p className="font-extrabold text-primary uppercase tracking-tight">Stay calm</p>
                          <p className="text-xs mt-1 text-muted">No notifications to show right now</p>
                        </div>
                      )}

                      <div className="px-6 pt-4 mt-2">
                        <button className="w-full flex items-center justify-between p-4 rounded-xl border border-border bg-transparent hover:bg-surface-hover transition-colors group">
                           <div className="flex items-center gap-3 text-secondary group-hover:text-primary transition-colors">
                              <Eye size={18} strokeWidth={2.5} />
                              <span className="text-[14px] font-bold">View all notifications</span>
                           </div>
                           <ChevronRight size={18} className="text-muted group-hover:text-primary transition-colors" />
                        </button>
                      </div>

                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="h-8 w-px bg-surface-hover hidden sm:block mx-1" />

              <div className="flex items-center gap-3 p-1 rounded-2xl hover:bg-surface-hover transition-all cursor-pointer group">
                <div className="w-10 h-10 rounded-xl bg-surface-hover overflow-hidden border-2 border-white shadow-subtle group-hover:scale-110 transition-transform duration-300">
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-accent/10 text-accent font-bold">
                       {(user?.displayName?.[0] || 'U')}
                    </div>
                  )}
                </div>
                <div className="hidden lg:block text-left pr-3">
                  <p className="text-sm font-bold text-primary leading-none mb-1">{user?.displayName || 'Admin'}</p>
                  <p className="text-[10px] font-extrabold text-muted uppercase tracking-widest">Business OS Master</p>
                </div>
              </div>
            </div>
          </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex justify-end no-print animate-in fade-in duration-300">
          <div className="w-80 bg-surface h-full px-6 py-8 shadow-2xl animate-in slide-in-from-right duration-500 overflow-y-auto no-scrollbar">
            <div className="flex justify-between items-center mb-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-tr from-[#0066FF] to-[#0186b8] rounded-xl flex items-center justify-center text-white shadow-lg">
                  <ShoppingCart size={20} strokeWidth={2.5} />
                </div>
                <h1 className="text-xl font-black text-primary flex items-center gap-1">Amar <span className="text-brand">e-Com</span></h1>
              </div>
              <button 
                onClick={() => setIsMobileMenuOpen(false)} 
                className="p-2.5 bg-surface-hover text-secondary hover:text-primary rounded-xl transition-all"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>

            <nav className="space-y-2">
              {showInstallBtn && (
                <button
                  onClick={handleInstallClick}
                  className="w-full flex items-center gap-4 px-5 py-5 mb-6 bg-gradient-to-br from-green-600 to-green-700 text-white rounded-2xl shadow-xl shadow-green-600/20"
                >
                  <div className="w-10 h-10 rounded-xl bg-surface/20 flex items-center justify-center">
                    <Download size={20} strokeWidth={2.5} />
                  </div>
                  <div className="text-left">
                    <p className="font-black text-sm">Install Mobile App</p>
                    <p className="text-[10px] font-bold text-white/70 uppercase tracking-wider">Get Full Access</p>
                  </div>
                </button>
              )}

              <p className="px-4 text-[10px] font-black text-muted uppercase tracking-[0.2em] mb-3">Navigation</p>
              
              {filteredNavItems.map((item) => {
                const Icon = item.icon;
                const isChildActive = item.subItems?.some(sub => location.pathname === sub.path || location.pathname.startsWith(sub.path + '/'));
                const isActive = location.pathname === item.path || isChildActive;
                const isExpanded = expandedItems.includes(item.name);

                if (item.subItems) {
                  return (
                    <div key={item.name} className="space-y-1 mb-2">
                      <button
                        onClick={() => toggleExpand(item.name)}
                        className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all ${
                          isActive ? 'bg-brand/5 text-brand font-bold' : 'text-secondary hover:bg-surface-hover'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <Icon size={20} strokeWidth={2.5} />
                          <span className="font-bold">{item.name}</span>
                        </div>
                        <ChevronDown size={16} className={`transition-transform duration-300 ${isExpanded ? 'rotate-180 text-brand' : ''}`} />
                      </button>
                      {isExpanded && (
                        <div className="ml-8 space-y-1 border-l border-border pl-4 py-1">
                          {item.subItems.filter(sub => hasPermission(sub.permission)).map(sub => {
                            const isSubActive = location.pathname === sub.path;
                            return (
                              <Link
                                key={sub.path}
                                to={sub.path}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`block px-4 py-3 rounded-xl text-[13px] transition-all font-bold ${
                                  isSubActive ? 'bg-brand text-white shadow-lg shadow-brand/10' : 'text-secondary hover:bg-surface-hover'
                                }`}
                              >
                                {sub.name}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all mb-1 ${
                      isActive 
                        ? 'bg-gradient-to-r from-[#0066FF] to-[#0186b8] text-white shadow-xl shadow-brand/20 font-bold' 
                        : 'text-secondary hover:bg-surface-hover'
                    }`}
                  >
                    <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                    <span className="font-bold">{item.name}</span>
                  </Link>
                );
              })}
              
              <div className="pt-6 mt-6 border-t border-border">
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-4 px-5 py-4 text-muted hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all font-black text-[13px] uppercase tracking-wider"
                >
                  <LogOut size={20} />
                  Sign Out
                </button>
              </div>
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
