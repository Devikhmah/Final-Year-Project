import React from 'react';

export default function Navbar({ setMobileOpen }) {
  return (
    <header className="h-14 bg-[#1B4B4F] border-b border-[#153B3E] px-4 flex items-center justify-between md:hidden sticky top-0 z-30 shadow-md">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 text-slate-200 hover:text-white rounded-lg hover:bg-black/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D9A441] flex items-center gap-1.5"
          title="Open Navigation Menu"
        >
          <span className="text-xs font-bold">Menu</span>
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="text-sm font-bold text-white tracking-wide">Workforce Productivity Portal</span>
      </div>
    </header>
  );
}
