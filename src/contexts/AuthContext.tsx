import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db, onAuthStateChanged, doc, getDoc, setDoc, serverTimestamp } from '../firebase';
import { User, UserRole, UserPermissions } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  role: UserRole | null;
  permissions: UserPermissions | null;
  hasPermission: (module: keyof UserPermissions) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const defaultPermissions: UserPermissions = {
  dashboard: true,
  pos: false,
  orders: false,
  inventory: false,
  crm: false,
  suppliers: false,
  logistics: false,
  tasks: true,
  finance: false,
  hr: false,
  team: false,
  settings: false,
  reports: false,
};

export const adminPermissions: UserPermissions = {
  dashboard: true,
  pos: true,
  orders: true,
  inventory: true,
  crm: true,
  suppliers: true,
  logistics: true,
  tasks: true,
  finance: true,
  hr: true,
  team: true,
  settings: true,
  reports: true,
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userRef = doc(db, 'users', firebaseUser.uid);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            let userData = userSnap.data() as User;
            
            // Force admin role for the specific developer email
            if (firebaseUser.email === 'mhshorol@gmail.com' && userData.role !== 'admin') {
              userData.role = 'admin';
              userData.permissions = adminPermissions;
              await setDoc(userRef, { role: 'admin', permissions: adminPermissions }, { merge: true });
            }

            setUser({
              ...userData,
              uid: firebaseUser.uid,
              email: firebaseUser.email || userData.email,
              name: firebaseUser.displayName || userData.name,
            });
            setRole(userData.role);
            
            // Admins always have all permissions
            if (userData.role === 'admin') {
              setPermissions(adminPermissions);
            } else {
              setPermissions(userData.permissions || defaultPermissions);
            }
            
            // Update last login
            await setDoc(userRef, { lastLogin: serverTimestamp() }, { merge: true });
          } else {
            // New user (likely from Google login)
            const newUser: User = {
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || 'User',
              email: firebaseUser.email || '',
              role: 'staff',
              active: true,
              permissions: defaultPermissions,
              createdAt: serverTimestamp(),
              lastLogin: serverTimestamp()
            };
            
            // Special case: First user or specific email as admin
            if (firebaseUser.email === 'mhshorol@gmail.com') {
              newUser.role = 'admin';
              newUser.permissions = adminPermissions;
            }

            await setDoc(userRef, newUser);
            setUser(newUser);
            setRole(newUser.role);
            setPermissions(newUser.permissions || defaultPermissions);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      } else {
        setUser(null);
        setRole(null);
        setPermissions(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const hasPermission = (module: keyof UserPermissions) => {
    if (role === 'admin') return true;
    return permissions ? permissions[module] === true : false;
  };

  return (
    <AuthContext.Provider value={{ user, loading, role, permissions, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
