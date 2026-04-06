import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { db, doc, onSnapshot } from '../firebase';

interface CompanySettings {
  companyName: string;
  companyLogo: string;
  companyAddress: string;
  companyMobile: string;
  companyPhone: string;
  companyWebsite: string;
  currency: string;
  timezone: string;
  language: string;
  steadfastApiKey?: string;
  steadfastSecretKey?: string;
  rewardPointsRate?: number; // Points per 100 currency units
}

interface SettingsContextType {
  settings: CompanySettings;
  loading: boolean;
  currencySymbol: string;
}

const defaultSettings: CompanySettings = {
  companyName: 'Amar Supply',
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
  rewardPointsRate: 1 // Default: 1 point per 100 BDT
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<CompanySettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'company'), (docSnap) => {
      if (docSnap.exists()) {
        setSettings(prev => ({ ...prev, ...docSnap.data() }));
      }
      setLoading(false);
    }, (error) => {
      console.error("Error listening to settings:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getCurrencySymbol = (currency: string) => {
    switch (currency) {
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'GBP': return '£';
      case 'BDT': return '৳';
      default: return '৳';
    }
  };

  return (
    <SettingsContext.Provider value={{ 
      settings, 
      loading, 
      currencySymbol: getCurrencySymbol(settings.currency) 
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
