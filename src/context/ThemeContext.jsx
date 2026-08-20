import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    const saved = localStorage.getItem('workforce_theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return 'dark';
  });

  useEffect(() => {
    localStorage.setItem('workforce_theme', theme);
    const root = document.documentElement;
    root.classList.remove('dark', 'light');
    root.classList.add(theme);
  }, [theme]);

  const setTheme = (newTheme) => {
    if (newTheme === 'light' || newTheme === 'dark') {
      setThemeState(newTheme);
    } else {
      setThemeState('dark');
    }
  };

  const getThemeTokens = () => {
    if (theme === 'light') {
      return {
        bg: 'bg-[#F7F7F5]',
        cardBg: 'bg-white border border-slate-200/90 shadow-sm',
        cardHover: 'hover:bg-slate-50/80 transition-all',
        inputBg: 'bg-white',
        inputBorder: 'border-slate-300 focus:border-[#D9A441]',
        border: 'border-slate-200/90',
        subBorder: 'border-slate-200/60',
        text: 'text-[#1F2320]',
        heading: 'text-[#122A2C]',
        muted: 'text-slate-500',
        accentBg: 'bg-slate-100/90',
        sidebarBg: 'bg-[#1B4B4F]',
        sidebarBorder: 'border-[#153B3E]',
        sidebarText: 'text-slate-100',
        modalBg: 'bg-white',
        primaryBtn: 'bg-[#1B4B4F] hover:bg-[#153B3E] text-white',
        accentBtn: 'bg-[#D9A441] hover:bg-[#C59336] text-[#0D1B1E]',
      };
    }

    // OLED Pure Black Dark Mode
    return {
      bg: 'bg-[#000000]',
      cardBg: 'bg-[#0A0A0A] border border-[#1F1F1F] shadow-sm',
      cardHover: 'hover:bg-[#141414] transition-all',
      inputBg: 'bg-[#000000]',
      inputBorder: 'border-[#262626] focus:border-[#D9A441]',
      border: 'border-[#1F1F1F]',
      subBorder: 'border-[#1A1A1A]',
      text: 'text-slate-200',
      heading: 'text-white',
      muted: 'text-slate-400',
      accentBg: 'bg-[#121212]',
      sidebarBg: 'bg-[#050505]',
      sidebarBorder: 'border-[#1F1F1F]',
      sidebarText: 'text-slate-200',
      modalBg: 'bg-[#0D0D0D] border border-[#262626]',
      primaryBtn: 'bg-[#1B4B4F] hover:bg-[#153B3E] text-white',
      accentBtn: 'bg-[#D9A441] hover:bg-[#C59336] text-[#000000]',
    };
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themeTokens: getThemeTokens() }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
