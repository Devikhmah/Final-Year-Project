import React from 'react';
import { supabase } from '../lib/supabase';

export default function DashboardPlaceholder({ userProfile, userSession }) {
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const name = userProfile?.full_name || userSession?.user?.user_metadata?.full_name || userSession?.user?.email || 'User';
  const role = userProfile?.role || userSession?.user?.user_metadata?.role || 'employee';

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8 space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mx-auto">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <div className="space-y-2">
          <span className={`inline-block px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-full ${role === 'manager' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
            Role: {role}
          </span>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Logged in as {name}
          </h1>
          <p className="text-sm text-slate-400 max-w-sm mx-auto">
            Logged in as <strong className="text-slate-200">{name}</strong>, role: <strong className="text-slate-200">{role}</strong>
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 text-left space-y-1">
          <p><strong className="text-slate-300">User ID:</strong> {userSession?.user?.id}</p>
          <p><strong className="text-slate-300">Email:</strong> {userSession?.user?.email}</p>
          <p><strong className="text-slate-300">Foundation Ready:</strong> Database schema & RLS policies installed.</p>
        </div>

        <button
          onClick={handleLogout}
          className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg text-sm transition-colors border border-slate-700"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
