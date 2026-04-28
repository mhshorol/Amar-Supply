import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');

  const setTheme = (newTheme: Theme) => {
    // Dark mode is disabled for now by user request
    setThemeState('light');
    localStorage.setItem('theme', 'light');
  };

  const toggleTheme = () => {
    // Dark mode is disabled for now
    // const newTheme = theme === 'light' ? 'dark' : 'light';
    // setTheme(newTheme);
  };

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('dark');
    root.classList.add('light');
  }, [theme]);

  // Listen for system changes (disabled)
  useEffect(() => {
    // const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    // const handleChange = () => {
    //   if (!localStorage.getItem('theme')) {
    //     setTheme(mediaQuery.matches ? 'dark' : 'light');
    //   }
    // };
    // mediaQuery.addEventListener('change', handleChange);
    // return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
