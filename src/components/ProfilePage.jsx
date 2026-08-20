import React, { useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';

export default function ProfilePage({ userProfile, userSession, onProfileUpdated }) {
  const { themeTokens: t } = useTheme();

  const userId = userSession?.user?.id;
  const currentEmail = userSession?.user?.email || userProfile?.email || '';
  const currentRole = userProfile?.role || userSession?.user?.user_metadata?.role || 'employee';

  // Basic Info Form States
  const [fullName, setFullName] = useState('');
  const [updatingName, setUpdatingName] = useState(false);
  const [nameMsg, setNameMsg] = useState('');
  const [nameErr, setNameErr] = useState('');

  // Email Change States
  const [newEmail, setNewEmail] = useState('');
  const [updatingEmail, setUpdatingEmail] = useState(false);
  const [emailMsg, setEmailMsg] = useState('');
  const [emailErr, setEmailErr] = useState('');

  // Password Change Form States
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [passMsg, setPassMsg] = useState('');
  const [passErr, setPassErr] = useState('');

  // Personal Metrics States
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [metrics, setMetrics] = useState({
    tasksCompleted: 0,
    activeTasks: 0,
    allTimeHours: '0.0',
    thisMonthHours: '0.0',
    onTimeRate: '100',
    teamMemberCount: 0,
    totalTasksCreated: 0,
    awaitingReviewCount: 0,
    avgTimeHours: '0.0',
  });

  // Re-sync user info when userProfile or userSession changes
  useEffect(() => {
    const initialName = userProfile?.full_name || userSession?.user?.user_metadata?.full_name || '';
    setFullName(initialName);
    setNameMsg('');
    setNameErr('');
    setEmailMsg('');
    setEmailErr('');
    setPassMsg('');
    setPassErr('');
  }, [userId, userProfile]);

  useEffect(() => {
    if (userId) {
      fetchPersonalMetrics();
    }
  }, [userId, currentRole]);

  const fetchPersonalMetrics = async () => {
    setLoadingMetrics(true);
    try {
      if (currentRole === 'employee') {
        // Fetch tasks assigned strictly to logged-in employee
        const { data: empTasks } = await supabase
          .from('tasks')
          .select('*')
          .eq('assigned_to', userId);

        const tasksList = empTasks || [];
        const completed = tasksList.filter((t) => t.status === 'done');
        const active = tasksList.filter((t) => t.status === 'in_progress' || t.status === 'submitted');

        // Calculate On-Time Rate for employee
        let onTimeCount = 0;
        completed.forEach((task) => {
          if (!task.deadline) onTimeCount++;
          else if (new Date(task.created_at || Date.now()) <= new Date(task.deadline)) onTimeCount++;
        });
        const onTimePercentage = completed.length > 0 ? Math.round((onTimeCount / completed.length) * 100) : 100;

        // Fetch logged-in employee time logs
        const { data: logs } = await supabase
          .from('time_logs')
          .select('*')
          .eq('user_id', userId);

        const logsList = logs || [];
        const allTimeMins = logsList.reduce((sum, l) => sum + (l.minutes_logged || 0), 0);

        // This month cutoff
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const monthMins = logsList
          .filter((l) => new Date(l.logged_at || Date.now()) >= startOfMonth)
          .reduce((sum, l) => sum + (l.minutes_logged || 0), 0);

        setMetrics((prev) => ({
          ...prev,
          tasksCompleted: completed.length,
          activeTasks: active.length,
          allTimeHours: (allTimeMins / 60).toFixed(1),
          thisMonthHours: (monthMins / 60).toFixed(1),
          onTimeRate: onTimePercentage.toString(),
        }));
      } else {
        // Manager personal stats: count team users and manager activity
        const { data: teamUsers } = await supabase
          .from('users')
          .select('*')
          .eq('role', 'employee');

        const { data: allTasks } = await supabase
          .from('tasks')
          .select('*');

        const taskList = allTasks || [];
        const awaiting = taskList.filter((t) => t.status === 'submitted');
        const doneTasks = taskList.filter((t) => t.status === 'done');

        let totalTurnaroundHours = 0;
        let countedTasks = 0;
        doneTasks.forEach((t) => {
          if (t.created_at) {
            const start = new Date(t.created_at);
            const end = new Date();
            const hours = Math.max(1, (end - start) / (1000 * 60 * 60));
            totalTurnaroundHours += hours;
            countedTasks++;
          }
        });
        const avgHours = countedTasks > 0 ? (totalTurnaroundHours / countedTasks).toFixed(1) : '2.4';

        setMetrics((prev) => ({
          ...prev,
          teamMemberCount: (teamUsers || []).length,
          totalTasksCreated: taskList.length,
          awaitingReviewCount: awaiting.length,
          avgTimeHours: avgHours,
        }));
      }
    } catch (err) {
      console.error('Error fetching personal metrics:', err);
    } finally {
      setLoadingMetrics(false);
    }
  };

  // 1. Update Full Name
  const handleUpdateName = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    setUpdatingName(true);
    setNameMsg('');
    setNameErr('');

    try {
      const { error: authErr } = await supabase.auth.updateUser({
        data: { full_name: fullName.trim() },
      });
      if (authErr) throw authErr;

      const { error: dbErr } = await supabase
        .from('users')
        .update({ full_name: fullName.trim() })
        .eq('id', userId);
      if (dbErr) throw dbErr;

      setNameMsg('✓ Full name updated successfully!');
      if (onProfileUpdated && userSession?.user) {
        onProfileUpdated(userSession.user);
      }
    } catch (err) {
      setNameErr('Failed to update full name: ' + err.message);
    } finally {
      setUpdatingName(false);
    }
  };

  // 2. Request Email Change Flow
  const handleRequestEmailChange = async (e) => {
    e.preventDefault();
    if (!newEmail.trim() || newEmail.trim() === currentEmail) return;

    setUpdatingEmail(true);
    setEmailMsg('');
    setEmailErr('');

    try {
      const { error } = await supabase.auth.updateUser({
        email: newEmail.trim(),
      });

      if (error) throw error;

      setEmailMsg(
        '✓ Confirmation link sent! Please check both your current email and new email inbox to confirm the change.'
      );
      setNewEmail('');
    } catch (err) {
      setEmailErr('Failed to initiate email change: ' + err.message);
    } finally {
      setUpdatingEmail(false);
    }
  };

  // 3. Update Password
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!newPassword) return;

    if (newPassword.length < 6) {
      setPassErr('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassErr('Passwords do not match. Please re-enter new password.');
      return;
    }

    setUpdatingPassword(true);
    setPassMsg('');
    setPassErr('');

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setPassMsg('✓ Password updated successfully!');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPassErr('Failed to update password: ' + err.message);
    } finally {
      setUpdatingPassword(false);
    }
  };

  const memberSinceDate = userProfile?.created_at
    ? new Date(userProfile.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : userSession?.user?.created_at
    ? new Date(userSession.user.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'August 2026';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className={`${t.cardBg} p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm`}>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#D9A441] text-[#0D1B1E] flex items-center justify-center font-bold text-xl shadow-md shrink-0">
            {fullName.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className={`text-xl font-bold ${t.heading} tracking-tight`}>{fullName || 'Account User'}</h2>
              <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full ${
                currentRole === 'manager' ? 'text-amber-300 bg-amber-500/20 border border-amber-500/30' : 'text-teal-300 bg-teal-500/20 border border-teal-500/30'
              }`}>
                Role: {currentRole}
              </span>
            </div>
            <p className={`text-xs ${t.muted} mt-1`}>
              Member since {memberSinceDate} • Registered Email: <strong className={t.heading}>{currentEmail}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Personal Activity Summary Section */}
      <div className="space-y-4">
        <h3 className={`text-base font-bold ${t.heading}`}>
          Personal Activity & Performance Summary ({currentRole === 'manager' ? 'Manager Scope' : 'My Work Stats'})
        </h3>

        {loadingMetrics ? (
          <div className={`p-8 text-center ${t.cardBg} rounded-2xl ${t.muted} text-xs`}>
            <div className="w-6 h-6 border-2 border-[#D9A441] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            Loading your performance statistics...
          </div>
        ) : currentRole === 'employee' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={`${t.cardBg} p-5 rounded-xl space-y-1 shadow-sm border ${t.border}`}>
              <p className={`text-[10px] font-bold uppercase tracking-wider ${t.muted}`}>Approved Tasks Completed</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{metrics.tasksCompleted}</p>
              <p className={`text-[11px] ${t.muted}`}>Manager-approved done</p>
            </div>

            <div className={`${t.cardBg} p-5 rounded-xl space-y-1 shadow-sm border ${t.border}`}>
              <p className={`text-[10px] font-bold uppercase tracking-wider ${t.muted}`}>Active Tasks</p>
              <p className="text-2xl font-bold text-amber-500">{metrics.activeTasks}</p>
              <p className={`text-[11px] ${t.muted}`}>In progress / awaiting review</p>
            </div>

            <div className={`${t.cardBg} p-5 rounded-xl space-y-1 shadow-sm border ${t.border}`}>
              <p className={`text-[10px] font-bold uppercase tracking-wider ${t.muted}`}>Logged Hours</p>
              <p className="text-2xl font-bold text-[#D9A441]">{metrics.allTimeHours} hrs</p>
              <p className={`text-[11px] ${t.muted}`}>This Month: {metrics.thisMonthHours} hrs</p>
            </div>

            <div className={`${t.cardBg} p-5 rounded-xl space-y-1 shadow-sm border ${t.border}`}>
              <p className={`text-[10px] font-bold uppercase tracking-wider ${t.muted}`}>On-Time Rate</p>
              <p className="text-2xl font-bold text-blue-500">{metrics.onTimeRate}%</p>
              <p className={`text-[11px] ${t.muted}`}>On or before deadline</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={`${t.cardBg} p-5 rounded-xl space-y-1 shadow-sm border ${t.border}`}>
              <p className={`text-[10px] font-bold uppercase tracking-wider ${t.muted}`}>Team Members</p>
              <p className="text-2xl font-bold text-[#D9A441]">{metrics.teamMemberCount}</p>
              <p className={`text-[11px] ${t.muted}`}>Registered employees</p>
            </div>

            <div className={`${t.cardBg} p-5 rounded-xl space-y-1 shadow-sm border ${t.border}`}>
              <p className={`text-[10px] font-bold uppercase tracking-wider ${t.muted}`}>Total Tasks Created</p>
              <p className="text-2xl font-bold text-blue-500">{metrics.totalTasksCreated}</p>
              <p className={`text-[11px] ${t.muted}`}>All-time assigned work</p>
            </div>

            <div className={`${t.cardBg} p-5 rounded-xl space-y-1 shadow-sm border ${t.border}`}>
              <p className={`text-[10px] font-bold uppercase tracking-wider ${t.muted}`}>Awaiting Review</p>
              <p className="text-2xl font-bold text-amber-500">{metrics.awaitingReviewCount}</p>
              <p className={`text-[11px] ${t.muted}`}>Pending manager approval</p>
            </div>

            <div className={`${t.cardBg} p-5 rounded-xl space-y-1 shadow-sm border ${t.border}`}>
              <p className={`text-[10px] font-bold uppercase tracking-wider ${t.muted}`}>Avg Approval Time</p>
              <p className="text-2xl font-bold text-emerald-500">{metrics.avgTimeHours} hrs</p>
              <p className={`text-[11px] ${t.muted}`}>Turnaround time</p>
            </div>
          </div>
        )}
      </div>

      {/* Account Settings Forms Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 1: Basic Information & Email */}
        <div className={`${t.cardBg} p-6 rounded-2xl space-y-6 shadow-sm border ${t.border}`}>
          <div>
            <h3 className={`text-base font-bold ${t.heading}`}>Basic Account Information</h3>
            <p className={`text-xs ${t.muted} mt-1`}>Manage your full name, email address, and view permanent role.</p>
          </div>

          <div>
            <label className={`block text-[10px] font-bold uppercase tracking-wider ${t.muted} mb-1`}>
              Account Role (Permanent / Non-Editable)
            </label>
            <div className={`p-3 ${t.inputBg} border ${t.border} rounded-xl flex items-center justify-between`}>
              <span className={`text-xs font-bold ${t.heading} uppercase tracking-wider`}>{currentRole}</span>
              <span className="text-[10px] text-slate-400 font-semibold bg-black/20 px-2 py-0.5 rounded border border-white/10">
                🔒 Permanent
              </span>
            </div>
          </div>

          <form onSubmit={handleUpdateName} className="space-y-3 pt-2">
            <div>
              <label className={`block text-[10px] font-bold uppercase tracking-wider ${t.muted} mb-1`}>
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={`w-full px-3.5 py-2 ${t.inputBg} border ${t.inputBorder} rounded-xl ${t.text} text-xs focus:outline-none focus:ring-2 focus:ring-[#D9A441]`}
              />
            </div>

            {nameMsg && <p className="text-xs font-semibold text-emerald-500">{nameMsg}</p>}
            {nameErr && <p className="text-xs font-semibold text-rose-400">{nameErr}</p>}

            <button
              type="submit"
              disabled={updatingName}
              className="px-4 py-2 bg-[#1B4B4F] hover:bg-[#153B3E] text-white text-xs font-bold rounded-xl transition-colors shadow disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
            >
              {updatingName ? 'Saving Name...' : 'Save Full Name'}
            </button>
          </form>

          <form onSubmit={handleRequestEmailChange} className={`space-y-3 pt-4 border-t ${t.border}`}>
            <div>
              <label className={`block text-[10px] font-bold uppercase tracking-wider ${t.muted} mb-1`}>
                Current Email Address
              </label>
              <input
                type="email"
                disabled
                value={currentEmail}
                className={`w-full px-3.5 py-2 ${t.inputBg} border ${t.border} rounded-xl ${t.muted} text-xs opacity-75 cursor-not-allowed` }
              />
            </div>

            <div>
              <label className={`block text-[10px] font-bold uppercase tracking-wider ${t.muted} mb-1`}>
                New Email Address (Triggers Confirmation Email)
              </label>
              <input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Enter new email address..."
                className={`w-full px-3.5 py-2 ${t.inputBg} border ${t.inputBorder} rounded-xl ${t.text} text-xs focus:outline-none focus:ring-2 focus:ring-[#D9A441]`}
              />
            </div>

            {emailMsg && <p className="text-xs font-semibold text-emerald-400 leading-relaxed">{emailMsg}</p>}
            {emailErr && <p className="text-xs font-semibold text-rose-400">{emailErr}</p>}

            <button
              type="submit"
              disabled={updatingEmail}
              className="px-4 py-2 bg-[#D9A441] hover:bg-[#C59336] text-[#0D1B1E] text-xs font-bold rounded-xl transition-colors shadow disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#1B4B4F]"
            >
              {updatingEmail ? 'Sending Link...' : 'Request Email Change'}
            </button>
          </form>
        </div>

        {/* Section 2: Password Security Form */}
        <div className={`${t.cardBg} p-6 rounded-2xl space-y-6 shadow-sm border ${t.border}`}>
          <div>
            <h3 className={`text-base font-bold ${t.heading}`}>Password & Security</h3>
            <p className={`text-xs ${t.muted} mt-1`}>Update your login password securely via Supabase Auth.</p>
          </div>

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label className={`block text-[10px] font-bold uppercase tracking-wider ${t.muted} mb-1`}>
                New Password (min 6 characters)
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className={`w-full px-3.5 py-2.5 ${t.inputBg} border ${t.inputBorder} rounded-xl ${t.text} text-xs focus:outline-none focus:ring-2 focus:ring-[#D9A441]`}
              />
            </div>

            <div>
              <label className={`block text-[10px] font-bold uppercase tracking-wider ${t.muted} mb-1`}>
                Confirm New Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className={`w-full px-3.5 py-2.5 ${t.inputBg} border ${t.inputBorder} rounded-xl ${t.text} text-xs focus:outline-none focus:ring-2 focus:ring-[#D9A441]`}
              />
            </div>

            {passMsg && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold rounded-xl">
                {passMsg}
              </div>
            )}
            {passErr && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold rounded-xl">
                {passErr}
              </div>
            )}

            <button
              type="submit"
              disabled={updatingPassword}
              className="w-full py-2.5 px-4 bg-[#1B4B4F] hover:bg-[#153B3E] text-white text-xs font-bold rounded-xl transition-colors shadow disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
            >
              {updatingPassword ? 'Updating Password...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
