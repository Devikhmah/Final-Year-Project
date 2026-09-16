import UserAvatar from './UserAvatar';
import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';

export default function Sidebar({
  userProfile,
  userSession,
  currentView,
  setCurrentView,
  pendingReviewCount = 0,
  rejectedCount = 0,
  mobileOpen,
  setMobileOpen,
}) {
  const [collapsed, setCollapsed] = useState(false);
  const { themeTokens: t } = useTheme();

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
        } ${collapsed ? 'md:w-14' : 'md:w-64'}`}
      >
        {/* Top Section: Header & Navigation */}
        <div>
          <div className={`h-16 px-3 flex items-center ${isExpanded ? 'justify-between' : 'justify-center'} border-b ${t.sidebarBorder}`}>
            {isExpanded && (
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-10 h-10 rounded-xl bg-[#D9A441] text-[#0D1B1E] flex items-center justify-center font-bold text-sm shadow-md shrink-0">
                  WA
                </div>
                <div className="truncate">
                  <h1 className="text-sm font-bold text-white leading-tight truncate">Workforce Suite</h1>
                  <p className="text-[10px] text-slate-300">SME Management</p>
                </div>
              </div>
            )}

            {/* Collapse Toggle Button */}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden md:flex p-2 rounded-lg hover:bg-black/20 text-slate-300 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D9A441]"
              title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={collapsed ? "M14 5l7 7m0 0l-7 7m7-7H3" : "M10 19l-7-7m0 0l7-7m-7 7h18"} />
              </svg>
            </button>
          </div>

          {/* User Profile Card */}
          {isExpanded && (
            <div className={`p-3 border-b ${t.sidebarBorder} bg-black/10`}>
              <div
                onClick={() => { setCurrentView('profile'); setMobileOpen(false); }}
                className={`flex items-center justify-between gap-2 p-2 bg-black/20 rounded-xl border cursor-pointer transition-all hover:border-[#D9A441]/50 ${
                  currentView === 'profile' ? 'border-[#D9A441] ring-2 ring-[#D9A441]/40' : 'border-white/10'
                }`}
                title="Click to view Account Profile & Theme Settings"
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <UserAvatar
                    src={userProfile?.avatar_url || userSession?.user?.user_metadata?.avatar_url}
                    name={name}
                    role={role}
                    size="sm"
                    showRoleBadge
                  />
                  <div className="truncate">
                    <p className="text-xs font-semibold text-white truncate">{name}</p>
                    <span className={`inline-block px-1.5 py-0.2 text-[9px] font-bold rounded uppercase tracking-wider ${
                      role === 'manager' ? 'text-amber-300 bg-amber-500/20' : 'text-teal-300 bg-teal-500/20'
                    }`}>
                      {role}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Links */}
          {isExpanded && (
            <nav className="p-3 space-y-1.5">
              {role === 'manager' ? (
                <>
                  <button
                    onClick={() => { setCurrentView('overview'); setMobileOpen(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D9A441] ${
                      currentView === 'overview'
                        ? 'bg-[#D9A441] text-[#0D1B1E] font-bold shadow-md'
                        : 'text-slate-200 hover:text-white hover:bg-white/10'
                    }`}
                    title="Task Overview"
                  >
                    <span>Task Overview</span>
                    {pendingReviewCount > 0 && (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-600 text-white shadow-sm">
                        {pendingReviewCount}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => { setCurrentView('employees'); setMobileOpen(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D9A441] ${
                      currentView === 'employees'
                        ? 'bg-[#D9A441] text-[#0D1B1E] font-bold shadow-md'
                        : 'text-slate-200 hover:text-white hover:bg-white/10'
                    }`}
                    title="Employees Roster"
                  >
                    <span>Employees</span>
                  </button>

                  <button
                    onClick={() => { setCurrentView('analytics'); setMobileOpen(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D9A441] ${
                      currentView === 'analytics'
                        ? 'bg-[#D9A441] text-[#0D1B1E] font-bold shadow-md'
                        : 'text-slate-200 hover:text-white hover:bg-white/10'
                    }`}
                    title="Analytics"
                  >
                    <span>Analytics</span>
                  </button>

                  <button
                    onClick={() => { setCurrentView('rejected'); setMobileOpen(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D9A441] ${
                      currentView === 'rejected'
                        ? 'bg-[#D9A441] text-[#0D1B1E] font-bold shadow-md'
                        : 'text-slate-200 hover:text-white hover:bg-white/10'
                    }`}
                    title="Rejected Tasks"
                  >
                    <span>Rejected Tasks</span>
                    {rejectedCount > 0 && (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-600 text-white shadow-sm">
                        {rejectedCount}
                      </span>
                    )}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => { setCurrentView('overview'); setMobileOpen(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                      currentView === 'overview'
                        ? 'bg-[#D9A441] text-[#0D1B1E]'
                        : 'text-slate-200 hover:text-white hover:bg-white/10'
                    }`}
                    title="My Assigned Tasks"
                  >
                    <span>My Assigned Tasks</span>
                  </button>

                  <button
                    onClick={() => { setCurrentView('rejected'); setMobileOpen(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D9A441] ${
                      currentView === 'rejected'
                        ? 'bg-[#D9A441] text-[#0D1B1E] font-bold shadow-md'
                        : 'text-slate-200 hover:text-white hover:bg-white/10'
                    }`}
                    title="Rejected Tasks"
                  >
                    <span>Rejected Tasks</span>
                    {rejectedCount > 0 && (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-600 text-white shadow-sm">
                        {rejectedCount}
                      </span>
                    )}
                  </button>
                </>
              )}
            </nav>
          )}
        </div>

        {/* Bottom Section: Dedicated Sign Out Bar */}
        {isExpanded && (
          <div className={`p-3 border-t ${t.sidebarBorder} bg-black/10`}>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold text-rose-300 hover:text-white bg-rose-500/10 hover:bg-rose-600/30 border border-rose-500/20 hover:border-rose-500/40 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 shadow-sm"
              title="Sign Out of Portal"
            >
              <span>Sign Out</span>
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
