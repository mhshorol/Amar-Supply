import React, { useEffect, useState, Component, ErrorInfo, ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, signInWithPopup, googleProvider, auth, isFirebaseConfigured, db, doc, setDoc, getDoc, serverTimestamp, signInWithEmailAndPassword } from './firebase';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Orders from './components/Orders';
import NewOrder from './components/NewOrder';
import Inventory from './components/Inventory';
import CRM from './components/CRM';
import Logistics from './components/Logistics';
import POS from './components/POS';
import Suppliers from './components/Suppliers';
import Finance from './components/Finance';
import HR from './components/HR';
import Team from './components/Team';
import Tasks from './components/Tasks';
import Reports from './components/Reports';
import Returns from './components/Returns';
import Settings from './components/Settings';
import { LogIn, AlertTriangle, ShieldCheck, Mail, Lock, Loader2 } from 'lucide-react';
import { SettingsProvider } from './contexts/SettingsContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { toast, Toaster } from 'sonner';

// Error Boundary Component
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-red-50 p-6">
          <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-red-100 text-center space-y-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600">
              <AlertTriangle size={32} />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-gray-900">Something went wrong</h2>
              <p className="text-sm text-gray-500">An unexpected error occurred. Please try refreshing the page.</p>
            </div>
            {this.state.error && (
              <pre className="text-[10px] bg-gray-50 p-4 rounded-lg text-left overflow-auto max-h-40 border border-gray-100 font-mono text-red-500">
                {this.state.error.message}
              </pre>
            )}
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-3 px-6 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg"
            >
              Refresh Application
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

function AppContent() {
  const { user, loading, hasPermission } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'google' | 'email'>('google');

  const handleGoogleLogin = async () => {
    if (!isFirebaseConfigured) return;
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed:", error);
      toast.error("Google login failed. Please try again.");
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter both email and password.");
      return;
    }
    setIsLoggingIn(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      console.error("Login failed:", error);
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        toast.error("Invalid email or password.");
      } else if (error.code === 'auth/operation-not-allowed') {
        toast.error("Email/Password login is not enabled in Firebase Console.");
      } else {
        toast.error("Login failed. Please try again.");
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#00AEEF] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-bold text-[#00AEEF] uppercase tracking-widest animate-pulse">Amar Supply</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] p-6">
        <div className="max-w-md w-full bg-white p-10 rounded-3xl border border-gray-100 shadow-xl text-center space-y-8">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-[#141414]">Amar <span className="text-[#00AEEF]">Supply</span></h1>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">Business Management Suite</p>
          </div>
          
          <div className="space-y-4">
            <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto text-[#00AEEF] shadow-inner">
              <ShieldCheck size={40} />
            </div>
            <h2 className="text-xl font-bold text-gray-800">Secure Access</h2>
            <p className="text-sm text-gray-500">Sign in to access your business dashboard.</p>
          </div>

          {!isFirebaseConfigured ? (
            <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100">
              <div className="flex items-center gap-2 text-orange-600 mb-2">
                <AlertTriangle size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">System Offline</span>
              </div>
              <p className="text-[10px] text-orange-700 leading-relaxed">
                Firebase configuration is missing. Please complete the setup to enable secure authentication.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {loginMethod === 'google' ? (
                <div className="space-y-4">
                  <button 
                    onClick={handleGoogleLogin}
                    className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-[#00AEEF] text-white rounded-2xl font-bold hover:bg-[#0095cc] transition-all shadow-lg shadow-blue-100 group"
                  >
                    <LogIn size={20} className="group-hover:translate-x-1 transition-transform" />
                    Sign in with Google
                  </button>
                  <button 
                    onClick={() => setLoginMethod('email')}
                    className="text-xs font-bold text-gray-400 hover:text-[#00AEEF] uppercase tracking-wider transition-colors"
                  >
                    Or use Email & Password
                  </button>
                </div>
              ) : (
                <form onSubmit={handleEmailLogin} className="space-y-4 text-left">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input 
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="admin@amarsupply.com"
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-transparent rounded-2xl text-sm focus:bg-white focus:border-[#00AEEF]/20 outline-none transition-all"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input 
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-transparent rounded-2xl text-sm focus:bg-white focus:border-[#00AEEF]/20 outline-none transition-all"
                        required
                      />
                    </div>
                  </div>
                  <button 
                    type="submit"
                    disabled={isLoggingIn}
                    className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-[#141414] text-white rounded-2xl font-bold hover:bg-black transition-all shadow-lg group disabled:opacity-50"
                  >
                    {isLoggingIn ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : (
                      <>
                        <LogIn size={20} className="group-hover:translate-x-1 transition-transform" />
                        Sign In
                      </>
                    )}
                  </button>
                  <button 
                    type="button"
                    onClick={() => setLoginMethod('google')}
                    className="w-full text-xs font-bold text-gray-400 hover:text-[#00AEEF] uppercase tracking-wider transition-colors text-center"
                  >
                    Back to Google Login
                  </button>
                </form>
              )}
            </div>
          )}

          <div className="pt-6 border-t border-gray-100">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Powered by Amar Supply</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Layout user={user}>
        <Routes>
          <Route path="/" element={hasPermission('dashboard') ? <Dashboard /> : <Navigate to="/tasks" replace />} />
          <Route path="/pos" element={hasPermission('pos') ? <POS /> : <Navigate to="/" replace />} />
          <Route path="/orders" element={hasPermission('orders') ? <Orders /> : <Navigate to="/" replace />} />
          <Route path="/orders/new" element={hasPermission('orders') ? <NewOrder /> : <Navigate to="/" replace />} />
          <Route path="/inventory" element={hasPermission('inventory') ? <Inventory /> : <Navigate to="/" replace />} />
          <Route path="/crm" element={hasPermission('crm') ? <CRM /> : <Navigate to="/" replace />} />
          <Route path="/returns" element={hasPermission('orders') ? <Returns /> : <Navigate to="/" replace />} />
          <Route path="/suppliers" element={hasPermission('suppliers') ? <Suppliers /> : <Navigate to="/" replace />} />
          <Route path="/logistics" element={hasPermission('logistics') ? <Logistics /> : <Navigate to="/" replace />} />
          <Route path="/finance" element={hasPermission('finance') ? <Finance /> : <Navigate to="/" replace />} />
          <Route path="/hr" element={hasPermission('hr') ? <HR /> : <Navigate to="/" replace />} />
          <Route path="/team" element={hasPermission('team') ? <Team /> : <Navigate to="/" replace />} />
          <Route path="/tasks" element={hasPermission('tasks') ? <Tasks /> : <Navigate to="/" replace />} />
          <Route path="/reports" element={hasPermission('dashboard') ? <Reports /> : <Navigate to="/" replace />} />
          <Route path="/settings" element={hasPermission('settings') ? <Settings /> : <Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <SettingsProvider>
          <AppContent />
          <Toaster position="top-right" richColors />
        </SettingsProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
