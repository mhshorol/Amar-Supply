import React, { Component, ErrorInfo, ReactNode, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { auth, signOut } from './firebase';
import Layout from './components/Layout';
import { AlertTriangle, Lock, LogOut } from 'lucide-react';
import { SettingsProvider } from './contexts/SettingsContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Toaster } from 'sonner';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import Login from './components/Login';

const Dashboard = lazy(() => import('./components/Dashboard'));
const Orders = lazy(() => import('./components/Orders'));
const NewOrder = lazy(() => import('./components/NewOrder'));
const Inventory = lazy(() => import('./components/Inventory'));
const NewProduct = lazy(() => import('./components/NewProduct'));
const CRM = lazy(() => import('./components/CRM'));
const Inbox = lazy(() => import('./components/Inbox'));
const Logistics = lazy(() => import('./components/Logistics'));
const POS = lazy(() => import('./components/POS'));
const Suppliers = lazy(() => import('./components/Suppliers'));
const Finance = lazy(() => import('./components/Finance'));
const HR = lazy(() => import('./components/HR'));
const Team = lazy(() => import('./components/Team'));
const Tasks = lazy(() => import('./components/Tasks'));
const Reports = lazy(() => import('./components/Reports'));
const Returns = lazy(() => import('./components/Returns'));
const Settings = lazy(() => import('./components/Settings'));

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
          <div className="max-w-md w-full bg-surface p-8 rounded-2xl shadow-xl border border-red-100 text-center space-y-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600">
              <AlertTriangle size={32} />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-primary">Something went wrong</h2>
              <p className="text-sm text-secondary">An unexpected error occurred. Please try refreshing the page.</p>
            </div>
            {this.state.error && (
              <pre className="text-[10px] bg-surface-hover p-4 rounded-lg text-left overflow-auto max-h-40 border border-border font-mono text-red-500">
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

function Unauthorized() {
  const { hasPermission } = useAuth();
  
  // Try to find a route this user can access
  if (hasPermission('dashboard')) return <Navigate to="/" replace />;
  if (hasPermission('tasks')) return <Navigate to="/tasks" replace />;
  if (hasPermission('orders')) return <Navigate to="/orders" replace />;
  if (hasPermission('inventory')) return <Navigate to="/inventory" replace />;
  if (hasPermission('pos')) return <Navigate to="/pos" replace />;
  if (hasPermission('crm')) return <Navigate to="/crm" replace />;
  if (hasPermission('suppliers')) return <Navigate to="/suppliers" replace />;
  if (hasPermission('logistics')) return <Navigate to="/logistics" replace />;
  if (hasPermission('finance')) return <Navigate to="/finance" replace />;
  if (hasPermission('hr')) return <Navigate to="/hr" replace />;
  if (hasPermission('team')) return <Navigate to="/team" replace />;
  if (hasPermission('settings')) return <Navigate to="/settings" replace />;

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto text-red-500">
          <Lock size={32} />
        </div>
        <h2 className="text-2xl font-bold">Access Restricted</h2>
        <p className="text-secondary">You don't have permission to view any modules. Please contact your administrator.</p>
      </div>
    </div>
  );
}

function AppContent() {
  const { user, loading, hasPermission } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
          <p className="text-base font-bold text-accent uppercase tracking-widest animate-pulse">Amar e-Com</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (user && !user.active) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md w-full bg-surface p-10 rounded-3xl border border-border shadow-xl text-center space-y-8">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-primary flex items-center justify-center gap-2">Amar <span className="text-brand">e-Com</span></h1>
            <p className="text-[10px] text-muted font-bold uppercase tracking-[0.2em]">Account Pending</p>
          </div>
          
          <div className="space-y-4">
            <div className="w-20 h-20 bg-orange-50 rounded-3xl flex items-center justify-center mx-auto text-orange-500 shadow-inner">
              <AlertTriangle size={40} />
            </div>
            <h2 className="text-xl font-bold text-primary">Approval Required</h2>
            <p className="text-sm text-secondary">Your account has been created successfully, but it requires administrator approval before you can access the dashboard.</p>
          </div>

          <button 
            onClick={() => signOut(auth)}
            className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-surface-hover text-secondary rounded-2xl font-bold hover:bg-surface-hover transition-all shadow-subtle group"
          >
            <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  const FallbackLoader = () => (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
        <p className="text-base font-bold text-accent uppercase tracking-widest animate-pulse">Loading...</p>
      </div>
    </div>
  );

  return (
    <Router>
      <Layout user={user}>
        <Suspense fallback={<FallbackLoader />}>
          <Routes>
            <Route path="/" element={hasPermission('dashboard') ? <Dashboard /> : <Navigate to="/unauthorized" replace />} />
            <Route path="/pos" element={hasPermission('pos') ? <POS /> : <Navigate to="/unauthorized" replace />} />
            <Route path="/orders" element={hasPermission('orders') ? <Orders /> : <Navigate to="/unauthorized" replace />} />
            <Route path="/orders/new" element={hasPermission('orders') ? <NewOrder /> : <Navigate to="/unauthorized" replace />} />
            <Route path="/inventory" element={hasPermission('inventory') ? <Inventory /> : <Navigate to="/unauthorized" replace />} />
            <Route path="/inventory/new" element={hasPermission('inventory') ? <NewProduct /> : <Navigate to="/unauthorized" replace />} />
            <Route path="/inventory/edit/:id" element={hasPermission('inventory') ? <NewProduct /> : <Navigate to="/unauthorized" replace />} />
            <Route path="/crm" element={hasPermission('crm') ? <CRM /> : <Navigate to="/unauthorized" replace />} />
            <Route path="/inbox" element={hasPermission('crm') ? <Inbox /> : <Navigate to="/unauthorized" replace />} />
            <Route path="/returns" element={hasPermission('orders') ? <Returns /> : <Navigate to="/unauthorized" replace />} />
            <Route path="/suppliers" element={hasPermission('suppliers') ? <Suppliers /> : <Navigate to="/unauthorized" replace />} />
            <Route path="/logistics" element={hasPermission('logistics') ? <Logistics /> : <Navigate to="/unauthorized" replace />} />
            <Route path="/finance" element={hasPermission('finance') ? <Finance /> : <Navigate to="/unauthorized" replace />} />
            <Route path="/hr" element={hasPermission('hr') ? <HR /> : <Navigate to="/unauthorized" replace />} />
            <Route path="/team" element={hasPermission('team') ? <Team /> : <Navigate to="/unauthorized" replace />} />
            <Route path="/tasks" element={hasPermission('tasks') ? <Tasks /> : <Navigate to="/unauthorized" replace />} />
            <Route path="/reports" element={hasPermission('dashboard') ? <Reports /> : <Navigate to="/unauthorized" replace />} />
            <Route path="/settings" element={hasPermission('settings') ? <Settings /> : <Navigate to="/unauthorized" replace />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="*" element={<Navigate to="/unauthorized" replace />} />
          </Routes>
        </Suspense>
      </Layout>
    </Router>
  );
}

function ThemedToaster() {
  const { theme } = useTheme();
  return <Toaster position="top-right" richColors theme={theme} />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <SettingsProvider>
            <AppContent />
            <ThemedToaster />
          </SettingsProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
