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
  MessageSquare
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
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  const unreadCount = notifications.filter(n => Array.isArray(n.readBy) && !n.readBy.includes(user?.uid)).length;

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
                <h1 className="text-[1rem] font-bold tracking-tight text-primary leading-[1.1] flex items-center gap-1 font-[Inter,sans-serif]">
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
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
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
               <span className="text-sm font-bold text-primary truncate sm:hidden">Amar e-Com</span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {hasPermission('pos') && (
              <Link to="/pos" className="hidden sm:flex items-center gap-2 px-5 py-2.5 bg-accent/10 text-accent hover:bg-accent hover:text-white rounded-2xl transition-all font-bold text-sm">
                <Calculator size={18} />
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
                <div className="absolute right-0 mt-4 w-60 bg-surface rounded-[2rem] shadow-2xl border border-border p-3 z-50 animate-in fade-in zoom-in-95 duration-200">
                  <div className="px-4 py-2 mb-2">
                    <p className="text-[10px] font-black text-muted uppercase tracking-widest">Create New</p>
                  </div>
                  {hasPermission('orders') && (
                    <Link 
                      to="/orders/new" 
                      onClick={() => setIsQuickActionOpen(false)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-brand/5 rounded-xl text-[13px] font-bold text-secondary transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center text-brand group-hover:bg-brand group-hover:text-white transition-all">
                        <ShoppingCart size={16} strokeWidth={2.5} />
                      </div>
                      Order
                    </Link>
                  )}
                  {hasPermission('tasks') && (
                    <Link 
                      to="/tasks"
                      onClick={() => setIsQuickActionOpen(false)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-brand/5 rounded-xl text-[13px] font-bold text-secondary transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-all">
                        <ClipboardList size={16} strokeWidth={2.5} />
                      </div>
                      Task
                    </Link>
                  )}
                  {hasPermission('inventory') && (
                    <Link 
                      to="/inventory/new"
                      onClick={() => setIsQuickActionOpen(false)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-brand/5 rounded-xl text-[13px] font-bold text-secondary transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                        <Package size={16} strokeWidth={2.5} />
                      </div>
                      Product
                    </Link>
                  )}
                  <div className="my-2 border-t border-border" />
                  {hasPermission('crm') && (
                    <Link 
                      to="/crm"
                      onClick={() => setIsQuickActionOpen(false)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-brand/5 rounded-xl text-[13px] font-bold text-secondary transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-green-600 group-hover:bg-green-600 group-hover:text-white transition-all">
                        <UserPlus size={16} strokeWidth={2.5} />
                      </div>
                      Customer
                    </Link>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              <button className="relative p-2.5 text-muted hover:bg-surface hover:text-brand rounded-xl transition-all pointer">
                <Search className="md:hidden" size={22} />
              </button>

              <button 
                onClick={toggleTheme}
                className="relative p-2.5 text-muted hover:bg-surface hover:text-accent rounded-xl transition-all"
                title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              >
                {theme === 'light' ? <Moon size={22} /> : <Sun size={22} />}
              </button>
              
              <div className="relative" ref={notificationsRef}>
                <button 
                  onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                  className={`relative p-2.5 rounded-xl transition-all border border-transparent ${isNotificationsOpen ? 'bg-accent/5 text-accent border border-accent/10' : 'text-muted hover:bg-surface'}`}
                >
                  <Bell size={22} className={unreadCount > 0 ? 'fill-danger/10' : ''} />
                  {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 w-2 h-2 bg-danger rounded-full border-2 border-card ring-4 ring-danger/10"></span>
                  )}
                </button>

                {isNotificationsOpen && (
                  <div className="absolute right-0 mt-4 w-80 sm:w-[420px] bg-card rounded-[2rem] shadow-2xl border border-border/60 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                    <div className="px-6 py-5 border-b border-border/20 flex items-center justify-between bg-gradient-to-r from-surface to-card">
                      <div>
                        <h3 className="font-extrabold text-primary text-lg uppercase tracking-tight">Activity</h3>
                        <p className="text-[10px] font-black text-muted uppercase tracking-widest mt-0.5">Real-time updates</p>
                      </div>
                      <button className="text-xs font-bold text-accent hover:underline px-3 py-1 bg-accent/5 rounded-full transition-all">Mark all read</button>
                    </div>
                    <div className="max-h-[480px] overflow-y-auto no-scrollbar">
                      {notifications.length > 0 ? (
                        <div className="divide-y divide-border">
                          {notifications.map((notification) => {
                            const isRead = notification.readBy.includes(user?.uid);
                            return (
                              <div 
                                key={notification.id} 
                                className={`px-6 py-5 transition-all hover:bg-surface-hover/80 cursor-pointer relative ${!isRead ? 'bg-brand/10/20' : ''}`}
                                onClick={() => {
                                  if (!isRead && user?.uid) {
                                    markNotificationAsRead(notification.id, user.uid);
                                  }
                                  setIsNotificationsOpen(false);
                                }}
                              >
                                <div className="flex gap-4">
                                  <div className="flex-shrink-0">
                                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${!isRead ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'bg-surface-hover text-muted'}`}>
                                      <Bell size={18} />
                                    </div>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                      <p className={`text-[13px] leading-tight ${!isRead ? 'font-bold text-primary' : 'text-secondary'}`}>
                                        {notification.title}
                                      </p>
                                      <span className="text-[10px] font-black text-muted whitespace-nowrap ml-2">
                                        {notification.createdAt ? formatDistanceToNow(new Date(notification.createdAt.seconds * 1000)) : 'now'}
                                      </span>
                                    </div>
                                    <p className="text-xs text-secondary mt-1 line-clamp-2 leading-relaxed">{notification.message}</p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
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
