import React, { useEffect, useState, Component, ErrorInfo, ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, signInWithPopup, googleProvider, auth, isFirebaseConfigured, db, doc, setDoc, getDoc, serverTimestamp } from './firebase';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Orders from './components/Orders';
import Inventory from './components/Inventory';
import CRM from './components/CRM';
import Logistics from './components/Logistics';
import POS from './components/POS';
import Suppliers from './components/Suppliers';
import Finance from './components/Finance';
import Team from './components/Team';
import Tasks from './components/Tasks';
import Settings from './components/Settings';
import { LogIn, AlertTriangle, ShieldCheck } from 'lucide-react';
import { SettingsProvider } from './contexts/SettingsContext';

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

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // Sync user to Firestore
          const userRef = doc(db, 'users', firebaseUser.uid);
          const userSnap = await getDoc(userRef);
          
          if (!userSnap.exists()) {
            await setDoc(userRef, {
              uid: firebaseUser.uid,
              name: firebaseUser.displayName,
              email: firebaseUser.email,
              photoURL: firebaseUser.photoURL,
              role: 'staff', // Default role
              active: true,
              createdAt: serverTimestamp(),
              lastLogin: serverTimestamp()
            });
          } else {
            await setDoc(userRef, { lastLogin: serverTimestamp() }, { merge: true });
          }
          
          setUser({
            ...firebaseUser,
            role: userSnap.exists() ? userSnap.data().role : 'staff'
          });
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Auth state change error:", error);
      } finally {
        setLoading(false);
      }
    });

    // Safety timeout to clear loading state if Firebase takes too long
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 5000);

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handleLogin = async () => {
    if (!isFirebaseConfigured) return;
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed:", error);
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
            <p className="text-sm text-gray-500">Sign in with your corporate Google account to access your business dashboard.</p>
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
            <button 
              onClick={handleLogin}
              className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-[#00AEEF] text-white rounded-2xl font-bold hover:bg-[#0095cc] transition-all shadow-lg shadow-blue-100 group"
            >
              <LogIn size={20} className="group-hover:translate-x-1 transition-transform" />
              Sign in with Google
            </button>
          )}

          <div className="pt-6 border-t border-gray-100">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Powered by Amar Supply</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <SettingsProvider>
        <Router>
          <Layout user={user}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/crm" element={<CRM />} />
              <Route path="/pos" element={<POS />} />
              <Route path="/suppliers" element={<Suppliers />} />
              <Route path="/logistics" element={<Logistics />} />
              <Route path="/finance" element={<Finance />} />
              <Route path="/team" element={<Team />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </Router>
      </SettingsProvider>
    </ErrorBoundary>
  );
}
