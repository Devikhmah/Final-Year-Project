import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const getSystemTheme = () => {
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  };

  const [themeMode, setThemeMode] = useState(() => {
    const saved = localStorage.getItem('workforce_theme_mode') || localStorage.getItem('workforce_theme');
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
    return 'system'; // Default Theme should be system default theme
  });

  const [theme, setThemeState] = useState(() => {
    const saved = localStorage.getItem('workforce_theme_mode') || localStorage.getItem('workforce_theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return getSystemTheme();
  });

  // Listen to OS system color scheme changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = (e) => {
      const saved = localStorage.getItem('workforce_theme_mode') || 'system';
      if (saved === 'system') {
        setThemeState(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleSystemChange);
    return () => mediaQuery.removeEventListener('change', handleSystemChange);
  }, []);

  // Apply theme class to document root
  useEffect(() => {
    localStorage.setItem('workforce_theme_mode', themeMode);
    localStorage.setItem('workforce_theme', theme);
    const root = document.documentElement;
    root.classList.remove('dark', 'light');
    root.classList.add(theme);
    root.setAttribute('data-theme', theme);
  }, [theme, themeMode]);

  const setTheme = (newMode) => {
    if (newMode === 'system') {
      setThemeMode('system');
      setThemeState(getSystemTheme());
    } else if (newMode === 'light' || newMode === 'dark') {
      setThemeMode(newMode);
      setThemeState(newMode);
    } else {
      setThemeMode('system');
      setThemeState(getSystemTheme());
    }
  };

  const getThemeTokens = () => {
    if (theme === 'light') {
      return {
        bg: 'bg-[#F8FAFC]',
        cardBg: 'bg-white border border-slate-200/90 shadow-sm',
        cardHover: 'hover:border-slate-300 transition-colors',
        inputBg: 'bg-white',
        inputBorder: 'border-slate-200 focus:border-[#006874] focus:ring-1 focus:ring-[#006874]',
        border: 'border-slate-200/90',
        subBorder: 'border-slate-100',
        text: 'text-slate-700',
        heading: 'text-slate-900',
        muted: 'text-slate-500',
        accentBg: 'bg-slate-100/90',
        sidebarBg: 'bg-[#004D56]',
        sidebarBorder: 'border-[#003C43]',
        sidebarText: 'text-slate-100',
        modalBg: 'bg-white border border-slate-200 shadow-2xl',
        primaryBtn: 'bg-[#006874] hover:bg-[#00515B] text-white font-semibold shadow-sm',
        accentBtn: 'bg-[#D9A441] hover:bg-[#C59336] text-[#0D1B1E] font-bold shadow-sm',
      };
    }

    // Cadence Deep Dark Mode (Login Page style dark palette)
    return {
      bg: 'bg-[#0B0F17]',
      cardBg: 'bg-[#111827] border border-slate-800 shadow-sm',
      cardHover: 'hover:border-slate-700 transition-colors',
      inputBg: 'bg-[#0B0F17]',
      inputBorder: 'border-slate-800 focus:border-[#006874] focus:ring-1 focus:ring-[#006874]',
      border: 'border-slate-800',
      subBorder: 'border-slate-800/60',
      text: 'text-slate-300',
      heading: 'text-white',
      muted: 'text-slate-400',
      accentBg: 'bg-[#1E293B]/60',
      sidebarBg: 'bg-[#070B12]',
      sidebarBorder: 'border-slate-800/80',
      sidebarText: 'text-slate-200',
      modalBg: 'bg-[#111827] border border-slate-800 shadow-2xl',
      primaryBtn: 'bg-[#006874] hover:bg-[#00515B] text-white font-semibold shadow-sm',
      accentBtn: 'bg-[#D9A441] hover:bg-[#C59336] text-[#0D1B1E] font-bold shadow-sm',
    };
  };

  return (
    <ThemeContext.Provider value={{ theme, themeMode, setTheme, themeTokens: getThemeTokens() }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
