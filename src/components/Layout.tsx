import React from 'react';
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
  Plus,
  FileText,
  UserPlus,
  CheckCircle2,
  Activity,
  ClipboardList,
  Quote,
  Calculator
} from 'lucide-react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

interface LayoutProps {
  children: React.ReactNode;
  user: any;
}

const navItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'POS', path: '/pos', icon: Calculator },
  { name: 'Orders', path: '/orders', icon: ShoppingCart },
  { name: 'Inventory', path: '/inventory', icon: Package },
  { name: 'CRM', path: '/crm', icon: Users },
  { name: 'Suppliers', path: '/suppliers', icon: UserPlus },
  { name: 'Logistics', path: '/logistics', icon: Truck },
  { name: 'Tasks', path: '/tasks', icon: ClipboardList },
  { name: 'Finance', path: '/finance', icon: CreditCard },
  { name: 'Team', path: '/team', icon: UserPlus },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export default function Layout({ children, user }: LayoutProps) {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isQuickActionOpen, setIsQuickActionOpen] = React.useState(false);

  const handleLogout = () => {
    signOut(auth);
  };

  const navigate = React.useMemo(() => {
    return (path: string) => {
      window.location.href = path;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex font-sans">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-100 shadow-sm z-30 no-print">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-[#00AEEF] rounded-full flex items-center justify-center text-white shadow-lg shadow-[#00AEEF]/20">
            <ShoppingCart size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#141414]">Amar Supply</h1>
            <p className="text-[10px] uppercase tracking-widest text-[#00AEEF] font-bold">Enterprise</p>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group ${
                  isActive 
                    ? 'bg-[#00AEEF] text-white shadow-lg shadow-[#00AEEF]/20 font-medium' 
                    : 'text-gray-500 hover:text-[#00AEEF] hover:bg-[#00AEEF]/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={18} className={isActive ? 'text-white' : 'text-gray-400 group-hover:text-[#00AEEF]'} />
                  <span className="text-sm">{item.name}</span>
                </div>
                {!isActive && <ChevronDown size={14} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-50">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all group"
          >
            <LogOut size={18} className="text-gray-400 group-hover:text-red-600" />
            <span className="text-sm font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-20 no-print">
          <div className="flex items-center gap-8 flex-1">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
            >
              <Menu size={24} />
            </button>
            
            <div className="relative max-w-md w-full hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text"
                placeholder="Search anything..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-transparent rounded-xl text-sm focus:bg-white focus:border-[#00AEEF]/20 outline-none transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Quick Actions */}
            <div className="relative">
              <button 
                onClick={() => setIsQuickActionOpen(!isQuickActionOpen)}
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl text-sm font-bold text-gray-700 transition-all"
              >
                <Plus size={18} />
                <span className="hidden sm:inline">Quick Action</span>
                <ChevronDown size={14} className={`transition-transform ${isQuickActionOpen ? 'rotate-180' : ''}`} />
              </button>

              {isQuickActionOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 z-50">
                  <Link 
                    to="/pos" 
                    onClick={() => setIsQuickActionOpen(false)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-xl text-sm text-gray-700 transition-colors"
                  >
                    <Calculator size={16} className="text-[#00AEEF]" /> New POS Sale
                  </Link>
                  <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-xl text-sm text-gray-700 transition-colors">
                    <ClipboardList size={16} className="text-[#00AEEF]" /> Create Task
                  </button>
                  <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-xl text-sm text-gray-700 transition-colors">
                    <Package size={16} className="text-[#00AEEF]" /> Add Product
                  </button>
                  <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-xl text-sm text-gray-700 transition-colors">
                    <UserPlus size={16} className="text-[#00AEEF]" /> Add Customer
                  </button>
                  <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-xl text-sm text-gray-700 transition-colors">
                    <UserPlus size={16} className="text-[#00AEEF]" /> Add Supplier
                  </button>
                  <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-xl text-sm text-gray-700 transition-colors">
                    <FileText size={16} className="text-[#00AEEF]" /> Create Invoice
                  </button>
                  <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-xl text-sm text-gray-700 transition-colors">
                    <Quote size={16} className="text-[#00AEEF]" /> Add Quotation
                  </button>
                </div>
              )}
            </div>

            <button className="p-2.5 text-gray-400 hover:text-[#00AEEF] hover:bg-[#00AEEF]/5 rounded-xl transition-all relative">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>

            <div className="h-8 w-px bg-gray-100 mx-2 hidden sm:block"></div>

            <div className="flex items-center gap-3 pl-2">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-gray-900">{user?.displayName || 'John Doe'}</p>
                <p className="text-[10px] font-bold text-[#00AEEF] uppercase tracking-wider">
                  {user?.role === 'admin' ? 'Administrator' : user?.role === 'manager' ? 'Manager' : 'Staff Member'}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-gray-100 border border-gray-200 overflow-hidden shadow-sm">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#00AEEF] text-white font-bold">
                    {user?.displayName?.[0] || 'J'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-8 max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex justify-end no-print">
          <div className="w-72 bg-white h-full p-6 shadow-2xl animate-in slide-in-from-right duration-300">
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-xl font-bold text-[#00AEEF]">Amar Supply</h1>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={24} />
              </button>
            </div>
            <nav className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-4 px-4 py-4 rounded-xl transition-all ${
                      isActive ? 'bg-[#00AEEF] text-white' : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="font-medium">{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
