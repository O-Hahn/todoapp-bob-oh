import React, { createContext, useContext, useEffect, useState } from 'react';
import { Theme as CarbonTheme } from '@carbon/react';

export type AppTheme = 'white' | 'g100';

interface ThemeContextType {
  theme: AppTheme;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [theme, setTheme] = useState<AppTheme>(() => {
    const saved = localStorage.getItem('carbon_theme');
    if (saved === 'white' || saved === 'g100') {
      return saved;
    }
    if (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    ) {
      return 'g100';
    }
    return 'white';
  });

  useEffect(() => {
    localStorage.setItem('carbon_theme', theme);
    document.documentElement.setAttribute('data-carbon-theme', theme);

    // Update meta theme-color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute(
        'content',
        theme === 'g100' ? '#161616' : '#ffffff',
      );
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'white' ? 'g100' : 'white'));
  };

  return (
    <ThemeContext.Provider
      value={{ theme, toggleTheme, isDark: theme === 'g100' }}
    >
      <CarbonTheme theme={theme}>{children}</CarbonTheme>
    </ThemeContext.Provider>
  );
};

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
