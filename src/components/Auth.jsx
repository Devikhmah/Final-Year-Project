import React, { useState } from 'react';
import authBg from '../assets/auth-bg.jpg';
import { supabase } from '../lib/supabase';

export default function Auth() {
  // Mode can be: 'login' | 'employee_signup' | 'manager_signup'
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [managerCode, setManagerCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (authMode === 'employee_signup') {
        if (!fullName.trim()) {
          throw new Error('Please enter your full name');
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              role: 'employee',
            },
          },
        });

        if (error) throw error;

        if (data?.user) {
          setSuccessMsg('Employee account created successfully! Logging you in...');
        }
      } else if (authMode === 'manager_signup') {
        if (!fullName.trim()) {
          throw new Error('Please enter your full name');
        }
        if (!managerCode.trim()) {
          throw new Error('Manager Access Code is required.');
        }

        const codeRes = await fetch('/api/verify-manager-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: managerCode.trim() }),
        });
        const codeResult = await codeRes.json();

        if (!codeResult.success) {
          throw new Error(codeResult.error || 'Invalid Manager Access Code. Manager registration rejected.');
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              role: 'manager',
            },
          },
        });

        if (error) throw error;

        if (data?.user) {
          setSuccessMsg('Manager account created successfully! Logging you in...');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
      }
    } catch (err) {
      setErrorMsg(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode) => {
    setAuthMode(newMode);
    setErrorMsg('');
    setSuccessMsg('');
    setManagerCode('');
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative bg-[#000000] bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${authBg})` }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-[#000000]/85 backdrop-blur-[2px]"></div>
      <div className="relative z-10 w-full max-w-md bg-[#0A0A0A] border border-[#1F1F1F] rounded-2xl shadow-2xl p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#D9A441] text-[#000000] font-bold text-lg mb-2 shadow-md">
            WA
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Workforce Productivity Portal
          </h1>
          <p className="text-xs text-slate-300">
            {authMode === 'login'
              ? 'Sign in to access your dashboard'
              : authMode === 'employee_signup'
              ? 'Create your Employee account'
              : 'Register Manager Account (Access Code Required)'}
          </p>
        </div>

        {/* Tab Selector */}
        <div className="grid grid-cols-2 p-1 bg-[#000000] rounded-lg border border-[#1F1F1F]">
          <button
            type="button"
            onClick={() => switchMode('login')}
            className={`py-2 text-xs font-bold rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-[#D9A441] ${authMode === 'login' ? 'bg-[#D9A441] text-[#000000] shadow' : 'text-slate-400 hover:text-white'}`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => switchMode('employee_signup')}
            className={`py-2 text-xs font-bold rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-[#D9A441] ${authMode === 'employee_signup' ? 'bg-[#D9A441] text-[#000000] shadow' : 'text-slate-400 hover:text-white'}`}
          >
            Sign Up
          </button>
        </div>

        {/* Alert Messages */}
        {errorMsg && (
          <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center justify-between gap-2">
            <span>{errorMsg}</span>
            <svg className="w-4 h-4 shrink-0 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center justify-between gap-2">
            <span>{successMsg}</span>
            <svg className="w-4 h-4 shrink-0 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleAuth} className="space-y-4">
          {authMode !== 'login' && (
            <div>
              <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Amina Bello"
                className="w-full px-3.5 py-2.5 bg-[#000000] border border-[#1F1F1F] rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-[#D9A441] focus:ring-1 focus:ring-[#D9A441] text-xs transition-all"
              />
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="w-full px-3.5 py-2.5 bg-[#000000] border border-[#1F1F1F] rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-[#D9A441] focus:ring-1 focus:ring-[#D9A441] text-xs transition-all"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1">
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 bg-[#000000] border border-[#1F1F1F] rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-[#D9A441] focus:ring-1 focus:ring-[#D9A441] text-xs transition-all"
            />
          </div>

          {authMode === 'manager_signup' && (
            <div>
              <label className="block text-[10px] font-bold text-amber-300 uppercase tracking-wider mb-1">
                Manager Access Code *
              </label>
              <input
                type="password"
                required
                value={managerCode}
                onChange={(e) => setManagerCode(e.target.value)}
                placeholder="Enter secret access code..."
                className="w-full px-3.5 py-2.5 bg-[#000000] border border-amber-500/40 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-[#D9A441] focus:ring-1 focus:ring-[#D9A441] text-xs transition-all"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-[#1B4B4F] hover:bg-[#153B3E] text-white font-bold rounded-lg text-xs transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2 focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
          >
            <span>
              {authMode === 'login'
                ? 'Sign In'
                : authMode === 'employee_signup'
                ? 'Create Employee Account'
                : 'Create Manager Account'}
            </span>
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            )}
          </button>
        </form>

        <div className="pt-2 text-center border-t border-[#1F1F1F]">
          {authMode !== 'manager_signup' ? (
            <button
              type="button"
              onClick={() => switchMode('manager_signup')}
              className="text-[11px] font-medium text-slate-400 hover:text-[#D9A441] transition-colors focus:outline-none"
            >
              Registering as a business owner or manager? <span className="underline font-bold">Manager Sign Up</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => switchMode('employee_signup')}
              className="text-[11px] font-medium text-slate-400 hover:text-white transition-colors focus:outline-none"
            >
              Back to <span className="underline font-bold">Standard Employee Sign Up</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
