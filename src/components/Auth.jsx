import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Shield, Clock, BarChart2, ShieldCheck, ChevronDown, AlertCircle, CheckCircle2, UserCheck } from 'lucide-react';

export default function Auth() {
  // 'signin' | 'signup'
  const [tab, setTab] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('Sales');
  const [role, setRole] = useState('Employee'); // 'Employee' | 'Manager'
  const [managerCode, setManagerCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [inviteInfo, setInviteInfo] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inviteParam = params.get('invite') || params.get('invitation_id');
    if (!inviteParam) return;

    const parseInvite = async () => {
      const isDirect = inviteParam === 'direct' || params.get('manager');
      if (isDirect) {
        const mgrId = params.get('manager') || '';
        const nameParam = params.get('name') || '';
        const emailParam = params.get('email') || '';

        let mgrName = 'Your Manager';
        if (mgrId) {
          try {
            const { data: mgr } = await supabase.from('users').select('full_name').eq('id', mgrId).maybeSingle();
            if (mgr?.full_name) mgrName = mgr.full_name;
          } catch (e) {
            console.warn('Manager lookup warning:', e);
          }
        }

        const info = {
          id: 'direct',
          manager_id: mgrId,
          name: nameParam,
          email: emailParam,
          managerName: mgrName,
          isDirect: true,
        };
        setInviteInfo(info);
        if (emailParam) setEmail(emailParam);
        if (nameParam) setFullName(nameParam);
        setRole('Employee');
        localStorage.setItem('cadence_pending_invite', JSON.stringify(info));
      } else {
        try {
          const { data: invData } = await supabase.from('invitations').select('*').eq('id', inviteParam).maybeSingle();
          if (invData) {
            let mgrName = 'Your Manager';
            if (invData.manager_id) {
              const { data: mgr } = await supabase.from('users').select('full_name').eq('id', invData.manager_id).maybeSingle();
              if (mgr?.full_name) mgrName = mgr.full_name;
            }
            const info = {
              ...invData,
              managerName: mgrName,
            };
            setInviteInfo(info);
            if (invData.email) setEmail(invData.email);
            if (invData.name) setFullName(invData.name);
            setRole('Employee');
            localStorage.setItem('cadence_pending_invite', JSON.stringify(info));
          }
        } catch (e) {
          console.warn('Could not load invitation details:', e);
        }
      }
    };

    parseInvite();
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    const activeInvite = inviteInfo || JSON.parse(localStorage.getItem('cadence_pending_invite') || 'null');

    try {
      if (tab === 'signup') {
        if (!fullName.trim()) {
          throw new Error('Please enter your full name');
        }

        const normalizedRole = inviteInfo ? 'employee' : role.toLowerCase();

        // TC-01: Verify Manager code if registering as Manager
        if (normalizedRole === 'manager') {
          if (!managerCode.trim()) {
            throw new Error('Manager Access Code is required for manager registration.');
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
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              role: normalizedRole,
              department: department.trim(),
            },
          },
        });

        if (error) {
          if (error.message?.toLowerCase().includes('already registered')) {
            setTab('signin');
            setErrorMsg('An account with this email already exists. Please sign in with your password to join the team.');
            setLoading(false);
            return;
          }
          throw error;
        }

        if (data?.user) {
          // Link manager if this is an invitation
          if (activeInvite?.manager_id) {
            try {
              await supabase.from('users').update({ manager_id: activeInvite.manager_id }).eq('id', data.user.id);
              if (activeInvite.id && activeInvite.id !== 'direct') {
                await supabase.from('invitations').update({ status: 'confirmed', responded_at: new Date().toISOString() }).eq('id', activeInvite.id);
              }
            } catch (linkErr) {
              console.warn('Invite link warning on signup:', linkErr);
            }
          }
          localStorage.removeItem('cadence_pending_invite');
          window.history.replaceState({}, document.title, window.location.pathname);
          setSuccessMsg(`Account created successfully! Connecting you to your team...`);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        // If an invitation is active, connect the existing user to the manager's team
        if (data?.user && activeInvite?.manager_id) {
          try {
            await supabase.from('users').update({ manager_id: activeInvite.manager_id }).eq('id', data.user.id);
            if (activeInvite.id && activeInvite.id !== 'direct') {
              await supabase.from('invitations').update({ status: 'confirmed', responded_at: new Date().toISOString() }).eq('id', activeInvite.id);
            }
          } catch (linkErr) {
            console.warn('Invite link warning on signin:', linkErr);
          }
          localStorage.removeItem('cadence_pending_invite');
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex items-center justify-center p-4 sm:p-6 lg:p-12 font-sans">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">
        
        {/* Left Hero & Value Proposition Panel */}
        <div className="lg:col-span-7 space-y-7">
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100/90 border border-slate-200/80 text-[11px] font-medium text-slate-700 shadow-xs">
            <Shield className="w-3.5 h-3.5 text-slate-600" />
            <span>Non-surveillance by design</span>
          </div>

          {/* Headline */}
          <div className="space-y-3">
            <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-extrabold tracking-tight text-slate-900 leading-[1.1]">
              Measure output, not activity.
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed max-w-xl">
              Cadence gives small and medium businesses empirical productivity insight — task completion velocity,
              revenue vs. admin time mix, and honest capacity signals — built entirely on voluntary, self-reported
              task time. No screen recording, no keystrokes, no tracking.
            </p>
          </div>

          {/* 3 Feature Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
            {/* Card 1 */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 space-y-2 shadow-xs hover:border-slate-300 transition-colors">
              <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center text-[#006874]">
                <Clock className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-slate-900">Voluntary logs</h3>
              <p className="text-[11px] text-slate-500 leading-normal">
                People record hours and notes on their own tasks.
              </p>
            </div>

            {/* Card 2 */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 space-y-2 shadow-xs hover:border-slate-300 transition-colors">
              <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center text-[#006874]">
                <BarChart2 className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-slate-900">Real metrics</h3>
              <p className="text-[11px] text-slate-500 leading-normal">
                Velocity, allocation mix and utilisation, weekly.
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4.5 space-y-2 shadow-xs hover:border-slate-300 transition-colors">
              <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center text-[#006874]">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-bold text-slate-900">Team-level AI</h3>
              <p className="text-[11px] text-slate-500 leading-normal">
                Weekly written summary of bottlenecks and load.
              </p>
            </div>
          </div>
        </div>

        {/* Right Auth Card Panel */}
        <div className="lg:col-span-5 w-full flex justify-center lg:justify-end">
          <div className="w-full max-w-[430px] bg-white border border-slate-200/90 rounded-2xl shadow-sm p-7 sm:p-8 space-y-5">
            {/* Team Invitation Notification Banner */}
            {inviteInfo && (
              <div className="p-4 rounded-xl bg-teal-50 border border-teal-200/90 space-y-1.5 shadow-xs">
                <div className="flex items-center gap-2 font-bold text-[#006874] text-xs">
                  <UserCheck className="w-4 h-4 text-[#006874] shrink-0" />
                  <span>Team Invitation from {inviteInfo.managerName}</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  {tab === 'signin'
                    ? `Sign in with your existing account to connect with ${inviteInfo.managerName}'s workforce team.`
                    : `Create your employee account to join ${inviteInfo.managerName}'s workforce team.`}
                </p>
                {inviteInfo.email && (
                  <div className="pt-1 text-[10px] text-slate-500 font-medium">
                    Invited: <strong className="text-slate-800">{inviteInfo.email}</strong>
                  </div>
                )}
              </div>
            )}

            {/* Form Title & Subtitle */}
            <div className="space-y-1">
              <h2 className="text-base font-bold text-slate-900">
                {inviteInfo
                  ? tab === 'signin'
                    ? 'Sign in to join team'
                    : 'Create account & join team'
                  : tab === 'signin'
                  ? 'Sign in to Cadence'
                  : 'Create an account'}
              </h2>
              <p className="text-xs text-slate-500">
                Use your work email to access your tasks and analytics.
              </p>
            </div>

            {/* Pill Tab Switcher */}
            <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => { setTab('signin'); setErrorMsg(''); setSuccessMsg(''); }}
                className={`py-1.5 text-xs font-semibold rounded-lg transition-all focus:outline-none ${
                  tab === 'signin'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => { setTab('signup'); setErrorMsg(''); setSuccessMsg(''); }}
                className={`py-1.5 text-xs font-semibold rounded-lg transition-all focus:outline-none ${
                  tab === 'signup'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Create account
              </button>
            </div>

            {/* Error & Success Messages */}
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <span className="leading-snug">{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                <span className="leading-snug">{successMsg}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleAuth} className="space-y-4">
              {tab === 'signup' && (
                <>
                  {/* Two-Column Row for Full Name & Department */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-700">
                        Full name
                      </label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Yusuf Imamu"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#006874] focus:ring-1 focus:ring-[#006874] text-xs transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-700">
                        Department
                      </label>
                      <input
                        type="text"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        placeholder="Sales"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#006874] focus:ring-1 focus:ring-[#006874] text-xs transition-all"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Email */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#006874] focus:ring-1 focus:ring-[#006874] text-xs transition-all"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#006874] focus:ring-1 focus:ring-[#006874] text-xs transition-all"
                />
              </div>

              {/* Role Dropdown in Signup */}
              {tab === 'signup' && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Role
                  </label>
                  <div className="relative">
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full appearance-none px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-[#006874] focus:ring-1 focus:ring-[#006874] text-xs pr-8 transition-all"
                    >
                      <option value="Employee">Employee</option>
                      <option value="Manager">Manager</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                  </div>
                </div>
              )}

              {/* Manager Access Code field when Manager role is selected (TC-01) */}
              {tab === 'signup' && role === 'Manager' && (
                <div className="space-y-1.5 p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl animate-in fade-in duration-200">
                  <label className="block text-[11px] font-bold text-amber-900 uppercase tracking-wider">
                    Manager Access Code *
                  </label>
                  <input
                    type="password"
                    required
                    value={managerCode}
                    onChange={(e) => setManagerCode(e.target.value)}
                    placeholder="Enter management code (e.g. SME2026SECRET)"
                    className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#006874] focus:ring-1 focus:ring-[#006874] text-xs transition-all"
                  />
                  <p className="text-[10px] text-amber-700">
                    Required for manager privileges. Registration will be rejected if code is invalid.
                  </p>
                </div>
              )}

              {/* Primary Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-2.5 px-4 bg-[#006874] hover:bg-[#005863] text-white font-medium rounded-lg text-xs transition-colors shadow-xs disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>{tab === 'signin' ? 'Sign in' : 'Create account'}</span>
                )}
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
