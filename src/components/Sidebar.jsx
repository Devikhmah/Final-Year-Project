import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';

export default function Sidebar({
  userProfile,
  userSession,
  currentView,
  setCurrentView,
  pendingReviewCount = 0,
  mobileOpen,
  setMobileOpen,
}) {
  const [collapsed, setCollapsed] = useState(false);
  const { theme, setTheme, themeTokens: t } = useTheme();

  const handleSignOut = async () => {
    setMobileOpen(false);
    await supabase.auth.signOut();
  };

  const name = userProfile?.full_name || userSession?.user?.user_metadata?.full_name || userSession?.user?.email || 'User';
  const role = userProfile?.role || userSession?.user?.user_metadata?.role || 'employee';

  const isExpanded = !collapsed || mobileOpen;

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 flex flex-col justify-between ${t.sidebarBg} ${t.sidebarBorder} border-r ${t.sidebarText} transition-all duration-300 shadow-2xl md:shadow-none ${
          mobileOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'
        } ${collapsed ? 'md:w-20' : 'md:w-64'}`}
      >
        {/* Top Section: Header, User Profile & Theme Display */}
        <div>
          <div className={`h-16 px-4 flex items-center ${isExpanded ? 'justify-between' : 'justify-center'} border-b ${t.sidebarBorder}`}>
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-[#D9A441] text-[#0D1B1E] flex items-center justify-center font-bold text-sm shadow-md shrink-0">
                WA
              </div>
              {isExpanded && (
                <div className="truncate">
                  <h1 className="text-sm font-bold text-white leading-tight truncate">Workforce Suite</h1>
                  <p className="text-[10px] text-slate-300">SME Management</p>
                </div>
              )}
            </div>

            {/* Collapse Toggle Button */}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden md:flex p-1.5 rounded-lg hover:bg-black/20 text-slate-300 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D9A441]"
              title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={collapsed ? "M14 5l7 7m0 0l-7 7m7-7H3" : "M10 19l-7-7m0 0l7-7m-7 7h18"} />
              </svg>
            </button>
          </div>

          {/* User Profile Card & Theme Display */}
          <div className={`p-3 border-b ${t.sidebarBorder} bg-black/10 space-y-3`}>
            {/* User Profile Card (Clicking routes to Profile Page) */}
            <div
              onClick={() => { setCurrentView('profile'); setMobileOpen(false); }}
              className={`flex items-center ${isExpanded ? 'justify-between gap-2 p-2' : 'justify-center p-2'} bg-black/20 rounded-xl border cursor-pointer transition-all hover:border-[#D9A441]/50 ${
                currentView === 'profile' ? 'border-[#D9A441] ring-2 ring-[#D9A441]/40' : 'border-white/10'
              }`}
              title="Click to view Account Profile"
            >
              <div className={`flex items-center ${isExpanded ? 'gap-2.5 overflow-hidden' : 'justify-center'}`}>
                <div className="w-8 h-8 rounded-lg bg-[#D9A441]/20 text-[#D9A441] flex items-center justify-center text-xs font-bold shrink-0 border border-[#D9A441]/30">
                  {name.charAt(0).toUpperCase()}
                </div>
                {isExpanded && (
                  <div className="truncate">
                    <p className="text-xs font-semibold text-white truncate">{name}</p>
                    <span className={`inline-block px-1.5 py-0.2 text-[9px] font-bold rounded uppercase tracking-wider ${
                      role === 'manager' ? 'text-amber-300 bg-amber-500/20' : 'text-teal-300 bg-teal-500/20'
                    }`}>
                      {role}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Theme Display Selector */}
            <div className="space-y-1">
              {isExpanded && (
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-300 px-1">
                  Theme Display
                </label>
              )}
              <div className={`grid ${isExpanded ? 'grid-cols-2 gap-1 p-1' : 'grid-cols-1 gap-1 p-1'} bg-black/20 rounded-lg border border-white/10`}>
                <button
                  onClick={() => setTheme('dark')}
                  title="Dark Mode"
                  className={`py-1.5 px-2 text-xs rounded-md font-medium flex items-center justify-center gap-1.5 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D9A441] ${
                    theme === 'dark'
                      ? 'bg-[#D9A441] text-[#0D1B1E] font-bold shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {isExpanded && <span>Dark</span>}
                  <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => setTheme('light')}
                  title="Light Mode"
                  className={`py-1.5 px-2 text-xs rounded-md font-medium flex items-center justify-center gap-1.5 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D9A441] ${
                    theme === 'light'
                      ? 'bg-[#D9A441] text-[#0D1B1E] font-bold shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {isExpanded && <span>Light</span>}
                  <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 100 2h1z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1.5">
            {role === 'manager' ? (
              <>
                <button
                  onClick={() => { setCurrentView('overview'); setMobileOpen(false); }}
                  className={`w-full flex items-center ${isExpanded ? 'justify-between px-3' : 'justify-center px-2'} py-2.5 rounded-xl text-xs font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D9A441] ${
                    currentView === 'overview'
                      ? 'bg-[#D9A441] text-[#0D1B1E] font-bold shadow-md'
                      : 'text-slate-200 hover:text-white hover:bg-white/10'
                  }`}
                  title="Task Overview"
                >
                  {isExpanded ? (
                    <span>Task Overview</span>
                  ) : (
                    <span className="text-sm font-bold">📋</span>
                  )}
                  {isExpanded && pendingReviewCount > 0 && (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-600 text-white shadow-sm">
                      {pendingReviewCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => { setCurrentView('analytics'); setMobileOpen(false); }}
                  className={`w-full flex items-center ${isExpanded ? 'justify-between px-3' : 'justify-center px-2'} py-2.5 rounded-xl text-xs font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D9A441] ${
                    currentView === 'analytics'
                      ? 'bg-[#D9A441] text-[#0D1B1E] font-bold shadow-md'
                      : 'text-slate-200 hover:text-white hover:bg-white/10'
                  }`}
                  title="Analytics"
                >
                  {isExpanded ? (
                    <span>Analytics</span>
                  ) : (
                    <span className="text-sm font-bold">📊</span>
                  )}
                </button>
              </>
            ) : (
              <button
                onClick={() => { setCurrentView('overview'); setMobileOpen(false); }}
                className={`w-full flex items-center ${isExpanded ? 'justify-between px-3' : 'justify-center px-2'} py-2.5 rounded-xl text-xs font-bold shadow-md transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                  currentView === 'overview'
                    ? 'bg-[#D9A441] text-[#0D1B1E]'
                    : 'text-slate-200 hover:text-white hover:bg-white/10'
                }`}
                title="My Assigned Tasks"
              >
                {isExpanded ? (
                  <span>My Assigned Tasks</span>
                ) : (
                  <span className="text-sm font-bold">📝</span>
                )}
              </button>
            )}
          </nav>
        </div>

        {/* Bottom Section: Dedicated Sign Out Bar */}
        <div className={`p-3 border-t ${t.sidebarBorder} bg-black/10`}>
          <button
            onClick={handleSignOut}
            className={`w-full flex items-center justify-center gap-2 ${isExpanded ? 'px-3 py-2.5' : 'px-1.5 py-2.5'} rounded-xl text-xs font-bold text-rose-300 hover:text-white bg-rose-500/10 hover:bg-rose-600/30 border border-rose-500/20 hover:border-rose-500/40 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 shadow-sm`}
            title="Sign Out of Portal"
          >
            {isExpanded && <span>Sign Out</span>}
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </aside>
    </>
  );
}
