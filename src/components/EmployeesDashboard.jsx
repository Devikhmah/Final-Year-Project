import UserAvatar from './UserAvatar';
import React, { useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import TaskModal from './TaskModal';

const INVITATION_SQL_SNIPPET = `-- Run this in Supabase SQL Editor:
CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending', 'confirmed', 'declined')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ
);
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Managers can manage invitations" ON public.invitations;
DROP POLICY IF EXISTS "Anyone can view invitations by id" ON public.invitations;
DROP POLICY IF EXISTS "Anyone can update invitation status by id" ON public.invitations;
CREATE POLICY "Managers can manage invitations" ON public.invitations FOR ALL USING (manager_id = auth.uid());
CREATE POLICY "Anyone can view invitations by id" ON public.invitations FOR SELECT USING (true);
CREATE POLICY "Anyone can update invitation status by id" ON public.invitations FOR UPDATE USING (true);
NOTIFY pgrst, 'reload schema';`;

export default function EmployeesDashboard({ userProfile, userSession }) {
  const { themeTokens: t } = useTheme();
  const [employees, setEmployees] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Detail View & Quick Assign states
  const [expandedEmployeeId, setExpandedEmployeeId] = useState(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState('');

  // Invite Modal States
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [sendingInvite, setSendingInvite] = useState(false);
  const [copiedInviteId, setCopiedInviteId] = useState(null);
  const [inviteSuccessMsg, setInviteSuccessMsg] = useState('');
  const [inviteErrorMsg, setInviteErrorMsg] = useState('');
  const [invitationTableMissing, setInvitationTableMissing] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);
  const [generatedInviteUrl, setGeneratedInviteUrl] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);

  const currentManagerId = userProfile?.id || userSession?.user?.id;

  useEffect(() => {
    if (currentManagerId) {
      fetchData();
    }
  }, [currentManagerId]);

  const handleCopySqlSnippet = () => {
    navigator.clipboard.writeText(INVITATION_SQL_SNIPPET);
    setSqlCopied(true);
    setTimeout(() => setSqlCopied(false), 3000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Query users belonging specifically to this manager's team
      const { data: usersData, error: usersErr } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'employee')
        .eq('manager_id', currentManagerId)
        .order('full_name', { ascending: true });

      if (usersErr) throw usersErr;
      setEmployees(usersData || []);

      const teamEmployeeIds = (usersData || []).map((u) => u.id);

      // 2. Query pending/all invitations created by this manager
      try {
        const { data: invData, error: invErr } = await supabase
          .from('invitations')
          .select('*')
          .eq('manager_id', currentManagerId)
          .order('created_at', { ascending: false });

        if (invErr) {
          if (
            invErr.message?.includes('schema cache') ||
            invErr.message?.includes('invitations') ||
            invErr.code === 'PGRST204' ||
            invErr.code === '42P01'
          ) {
            console.warn('Invitations table not detected in schema cache:', invErr.message);
            setInvitationTableMissing(true);
            setInvitations([]);
          } else {
            console.error('Error fetching invitations:', invErr);
            setInvitations([]);
          }
        } else {
          setInvitationTableMissing(false);
          setInvitations(invData || []);
        }
      } catch (e) {
        console.warn('Invitations query caught exception:', e);
        setInvitationTableMissing(true);
        setInvitations([]);
      }

      // 3. Query tasks for workload computation (strictly scoped to this manager's team)
      const { data: tasksData, error: tasksErr } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (tasksErr) throw tasksErr;

      const scopedTasks = (tasksData || []).filter(
        (t) =>
          t.created_by === currentManagerId ||
          teamEmployeeIds.includes(t.assigned_to) ||
          t.assigned_to === currentManagerId
      );

      setTasks(scopedTasks);
    } catch (err) {
      console.error('Error fetching employees dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvitation = async (e) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) {
      setInviteErrorMsg('Name and email address are required.');
      return;
    }

    setSendingInvite(true);
    setInviteErrorMsg('');
    setInviteSuccessMsg('');
    setGeneratedInviteUrl('');

    try {
      // Check if employee with this email already exists on team
      const existingTeam = employees.find((e) => e.email.toLowerCase() === inviteEmail.trim().toLowerCase());
      if (existingTeam) {
        throw new Error('An employee with this email is already on your roster.');
      }

      let inviteUrl = '';
      let usedDirectFallback = false;

      // 1. Attempt standard insert into Supabase invitations table
      try {
        const { data, error } = await supabase
          .from('invitations')
          .insert([
            {
              manager_id: currentManagerId,
              name: inviteName.trim(),
              email: inviteEmail.trim().toLowerCase(),
              status: 'pending',
            },
          ])
          .select()
          .single();

        if (error) throw error;

        inviteUrl = `${window.location.origin}?invite=${data.id}`;
        setInvitationTableMissing(false);
        fetchData();
      } catch (tableErr) {
        console.warn('Invitations table not ready in Supabase schema cache, generating direct invite link:', tableErr);
        setInvitationTableMissing(true);
        usedDirectFallback = true;
        const encName = encodeURIComponent(inviteName.trim());
        const encEmail = encodeURIComponent(inviteEmail.trim().toLowerCase());
        inviteUrl = `${window.location.origin}?invite=direct&manager=${currentManagerId}&name=${encName}&email=${encEmail}`;
      }

      setGeneratedInviteUrl(inviteUrl);
      setInviteSuccessMsg(
        usedDirectFallback
          ? `Invitation link ready for ${inviteName.trim()}! Copy and send the link below to add them to your team.`
          : `Invitation created for ${inviteName.trim()}! Copy and send the link below:`
      );
      setInviteName('');
      setInviteEmail('');
    } catch (err) {
      setInviteErrorMsg(err.message || 'Failed to create invitation.');
    } finally {
      setSendingInvite(false);
    }
  };

  const handleCopyInviteLink = (invId) => {
    const link = `${window.location.origin}?invite=${invId}`;
    navigator.clipboard.writeText(link);
    setCopiedInviteId(invId);
    setTimeout(() => setCopiedInviteId(null), 2500);
  };

  const handleCancelInvitation = async (invId) => {
    if (!window.confirm('Are you sure you want to cancel this pending invitation?')) return;
    try {
      const { error } = await supabase.from('invitations').delete().eq('id', invId);
      if (error) throw error;
      fetchData();
    } catch (err) {
      alert('Failed to cancel invitation: ' + err.message);
    }
  };

  /**
   * Workload Priority Order:
   * 1. Yellow ("Awaiting Review"): submitted tasks
   * 2. Red ("Occupied"): pending or in_progress tasks
   * 3. Green ("Free"): 0 active tasks
   */
  const getEmployeeWorkload = (empId) => {
    const empTasks = tasks.filter((t) => t.assigned_to === empId);

    const submitted = empTasks.filter((t) => t.status === 'submitted');
    const pending = empTasks.filter((t) => t.status === 'pending');
    const inProgress = empTasks.filter((t) => t.status === 'in_progress');
    const done = empTasks.filter((t) => t.status === 'done');

    let statusKey = 'free';
    let statusLabel = 'Free';
    let badgeClass = 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30';
    let barColor = 'bg-emerald-500';
    let dotColor = 'bg-emerald-400';

    if (submitted.length > 0) {
      statusKey = 'awaiting_review';
      statusLabel = 'Awaiting Review';
      badgeClass = 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30';
      barColor = 'bg-amber-500';
      dotColor = 'bg-amber-400';
    } else if (pending.length > 0 || inProgress.length > 0) {
      statusKey = 'occupied';
      statusLabel = 'Occupied';
      badgeClass = 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30';
      barColor = 'bg-rose-500';
      dotColor = 'bg-rose-400';
    }

    return {
      statusKey,
      statusLabel,
      badgeClass,
      barColor,
      dotColor,
      counts: {
        submitted: submitted.length,
        pending: pending.length,
        inProgress: inProgress.length,
        done: done.length,
        totalActive: pending.length + inProgress.length + submitted.length,
      },
      activeTasks: empTasks.filter((t) => t.status !== 'done'),
      allTasks: empTasks,
    };
  };

  const handleOpenAssignModal = (empId, e) => {
    if (e) e.stopPropagation();
    setSelectedAssigneeId(empId);
    setIsTaskModalOpen(true);
  };

  const toggleExpand = (empId) => {
    setExpandedEmployeeId((prev) => (prev === empId ? null : empId));
  };

  const filteredEmployees = employees.filter((emp) => {
    const workload = getEmployeeWorkload(emp.id);
    if (statusFilter !== 'all' && workload.statusKey !== statusFilter) {
      return false;
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchName = emp.full_name?.toLowerCase().includes(q);
      const matchEmail = emp.email?.toLowerCase().includes(q);
      if (!matchName && !matchEmail) return false;
    }
    return true;
  });

  const summary = employees.reduce(
    (acc, emp) => {
      const w = getEmployeeWorkload(emp.id);
      acc[w.statusKey] = (acc[w.statusKey] || 0) + 1;
      return acc;
    },
    { free: 0, occupied: 0, awaiting_review: 0 }
  );

  const getPriorityBadge = (p) => {
    switch (p) {
      case 'high': return 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30';
      case 'medium': return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30';
      default: return 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/30';
    }
  };

  const getTaskStatusBadge = (s) => {
    switch (s) {
      case 'submitted': return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30';
      case 'in_progress': return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30';
      case 'pending': return 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/30';
      case 'done': return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30';
      default: return 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/30';
    }
  };

  const pendingInvitationsList = invitations.filter((i) => i.status === 'pending');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 font-sans">
      {/* Header */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${t.cardBg} p-6 rounded-2xl shadow-sm border ${t.border}`}>
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-[#D9A441]/10 text-[#D9A441] border border-[#D9A441]/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-[#D9A441]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </span>
            <h2 className={`text-xl font-bold ${t.heading} tracking-tight`}>My Team Roster & Workload Status</h2>
          </div>
          <p className={`text-xs ${t.muted} mt-1.5`}>
            Manage your confirmed team employees, issue new email invitations, and monitor live workloads.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => {
              setInviteSuccessMsg('');
              setInviteErrorMsg('');
              setIsInviteModalOpen(true);
            }}
            className="px-4 py-2.5 bg-[#1B4B4F] hover:bg-[#153B3E] text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-1.5"
          >
            <svg className="w-4 h-4 shrink-0 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            <span>Invite Employee</span>
          </button>

          <button
            onClick={() => handleOpenAssignModal('')}
            className="px-4 py-2.5 bg-[#D9A441] hover:bg-[#C59336] text-[#0D1B1E] text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-1.5"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Create Task</span>
          </button>
        </div>
      </div>

      {/* Schema Cache Alert Banner */}
      {invitationTableMissing && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-bold text-amber-200">Supabase Invitations Table Missing or Pending Schema Reload</p>
              <p className="text-[11px] text-amber-300/80 mt-0.5">
                PostgREST reported that <code className="bg-amber-950/60 px-1 py-0.5 rounded text-amber-200 font-mono">public.invitations</code> is not in the schema cache. Click below to copy the SQL setup script to run in your Supabase SQL Editor.
              </p>
            </div>
          </div>
          <button
            onClick={handleCopySqlSnippet}
            className="px-3.5 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded-xl text-amber-200 text-xs font-bold shrink-0 flex items-center gap-1.5 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
            </svg>
            <span>{sqlCopied ? 'Copied SQL to Clipboard!' : 'Copy SQL Migration Script'}</span>
          </button>
        </div>
      )}

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {/* Card 1: Confirmed Team */}
        <div className={`${t.cardBg} p-4 rounded-xl border ${t.border} flex items-center justify-between shadow-sm`}>
          <div>
            <p className={`text-[10px] font-bold uppercase tracking-wider ${t.muted}`}>My Confirmed Team</p>
            <p className={`text-2xl font-bold ${t.heading} mt-1`}>{employees.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
        </div>

        {/* Card 2: Free / Available */}
        <div className={`${t.cardBg} p-4 rounded-xl border ${t.border} flex items-center justify-between shadow-sm`}>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Free (Available)</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{summary.free}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        {/* Card 3: Occupied */}
        <div className={`${t.cardBg} p-4 rounded-xl border ${t.border} flex items-center justify-between shadow-sm`}>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">Occupied</p>
            <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">{summary.occupied}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        {/* Card 4: Pending Invitations */}
        <div className={`${t.cardBg} p-4 rounded-xl border ${t.border} flex items-center justify-between shadow-sm`}>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Pending Invitations</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{pendingInvitationsList.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Pending Invitations Section */}
      {pendingInvitationsList.length > 0 && (
        <div className={`${t.cardBg} p-5 rounded-2xl border border-amber-500/30 space-y-3 shadow-sm`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </span>
              <h3 className={`text-sm font-bold ${t.heading}`}>Pending Team Invitations ({pendingInvitationsList.length})</h3>
            </div>
            <p className={`text-[11px] ${t.muted}`}>Employees only appear in roster after accepting your invitation.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pendingInvitationsList.map((inv) => (
              <div key={inv.id} className="p-3.5 rounded-xl bg-black/20 border border-white/10 space-y-2 text-xs">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className={`font-bold ${t.heading}`}>{inv.name}</h4>
                    <p className={`text-[11px] ${t.muted}`}>{inv.email}</p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/30">
                    {inv.status}
                  </span>
                </div>

                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
                  <button
                    onClick={() => handleCopyInviteLink(inv.id)}
                    className="text-[#D9A441] hover:underline font-semibold flex items-center gap-1.5"
                  >
                    {copiedInviteId === inv.id ? (
                      <>
                        <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Link Copied!</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5 text-[#D9A441]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                        </svg>
                        <span>Copy Invite Link</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleCancelInvitation(inv.id)}
                    className="text-rose-400 hover:underline font-medium flex items-center gap-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>Cancel Invite</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters & Search Bar */}
      <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 ${t.cardBg} p-4 rounded-xl border ${t.border}`}>
        <div className="sm:col-span-2">
          <label className={`block text-[10px] font-bold uppercase tracking-wider ${t.muted} mb-1`}>
            Search My Roster
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Search employee by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-9 pr-3 py-1.5 ${t.inputBg} border ${t.inputBorder} rounded-lg ${t.text} text-xs focus:outline-none focus:ring-2 focus:ring-[#D9A441]`}
            />
            <svg className={`w-4 h-4 absolute left-3 top-2.5 ${t.muted}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        <div>
          <label className={`block text-[10px] font-bold uppercase tracking-wider ${t.muted} mb-1`}>
            Filter Availability
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`w-full px-3 py-1.5 ${t.inputBg} border ${t.inputBorder} rounded-lg ${t.text} text-xs focus:outline-none focus:ring-2 focus:ring-[#D9A441]`}
          >
            <option value="all">All Availability States</option>
            <option value="awaiting_review">Awaiting Review (Yellow)</option>
            <option value="occupied">Occupied (Red)</option>
            <option value="free">Free (Green)</option>
          </select>
        </div>
      </div>

      {/* Roster Table */}
      <div className={`${t.cardBg} rounded-2xl border ${t.border} overflow-hidden shadow-sm`}>
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className={`text-xs ${t.muted}`}>Loading employee team roster...</p>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <p className={`text-sm font-semibold ${t.heading}`}>No team employees found</p>
            <p className={`text-xs ${t.muted}`}>
              {employees.length === 0
                ? 'You do not have any confirmed employees on your team yet. Click "Invite Employee" above to send invitations.'
                : 'No employees match your search or filter.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={`border-b ${t.border} bg-black/10 text-[10px] font-bold uppercase tracking-wider ${t.muted}`}>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Status & Indicator</th>
                  <th className="py-3 px-4">Active Workload</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${t.border} text-xs`}>
                {filteredEmployees.map((emp) => {
                  const workload = getEmployeeWorkload(emp.id);
                  const isExpanded = expandedEmployeeId === emp.id;

                  return (
                    <React.Fragment key={emp.id}>
                      <tr
                        onClick={() => toggleExpand(emp.id)}
                        className={`hover:bg-white/5 cursor-pointer transition-colors ${isExpanded ? 'bg-white/5' : ''}`}
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <UserAvatar src={emp.avatar_url} name={emp.full_name} size="md" />
                            <div>
                              <p className={`font-semibold ${t.heading}`}>{emp.full_name}</p>
                              <p className={`text-[11px] ${t.muted}`}>{emp.email}</p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex flex-col gap-1.5 items-start">
                            <div className="flex items-center gap-2">
                              <span className={`w-2.5 h-2.5 rounded-full ${workload.dotColor} animate-pulse shrink-0`}></span>
                              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${workload.badgeClass}`}>
                                {workload.statusLabel}
                              </span>
                            </div>
                            <div className="w-28 h-1.5 rounded-full bg-slate-700/30 overflow-hidden">
                              <div className={`h-full ${workload.barColor} rounded-full`} style={{ width: '100%' }}></div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2 text-[11px]">
                            {workload.counts.totalActive === 0 ? (
                              <span className="text-emerald-500 font-medium flex items-center gap-1">
                                <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span>No active tasks</span>
                              </span>
                            ) : (
                              <div className="flex flex-wrap gap-1.5">
                                {workload.counts.pending > 0 && (
                                  <span className="px-2 py-0.5 rounded bg-slate-500/10 text-slate-400 border border-slate-500/20 font-medium">
                                    {workload.counts.pending} Pending
                                  </span>
                                )}
                                {workload.counts.inProgress > 0 && (
                                  <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                                    {workload.counts.inProgress} In Progress
                                  </span>
                                )}
                                {workload.counts.submitted > 0 && (
                                  <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                                    {workload.counts.submitted} Submitted
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={(e) => handleOpenAssignModal(emp.id, e)}
                              className="px-3 py-1.5 bg-[#D9A441] hover:bg-[#C59336] text-[#0D1B1E] text-xs font-bold rounded-lg transition-all shadow-sm flex items-center gap-1"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              <span>Assign Task</span>
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpand(emp.id);
                              }}
                              className={`p-1.5 rounded-lg border ${t.border} ${t.muted} hover:${t.heading}`}
                            >
                              <svg
                                className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-black/20">
                          <td colSpan={4} className="p-4 border-t border-b border-white/5">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <h4 className={`text-xs font-bold ${t.heading} flex items-center gap-2`}>
                                  <span>Active Tasks for {emp.full_name}</span>
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] ${workload.badgeClass}`}>
                                    {workload.activeTasks.length} Active
                                  </span>
                                </h4>
                                <button
                                  onClick={(e) => handleOpenAssignModal(emp.id, e)}
                                  className="text-[11px] text-[#D9A441] hover:underline font-semibold flex items-center gap-1"
                                >
                                  <svg className="w-3 h-3 text-[#D9A441]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                  </svg>
                                  <span>Assign another task to {emp.full_name}</span>
                                </button>
                              </div>

                              {workload.activeTasks.length === 0 ? (
                                <div className={`p-4 rounded-xl border ${t.border} bg-white/5 text-center flex items-center justify-center gap-2`}>
                                  <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  <p className={`text-xs ${t.muted}`}>
                                    {emp.full_name} has no active tasks.
                                  </p>
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {workload.activeTasks.map((task) => (
                                    <div
                                      key={task.id}
                                      className={`p-3 rounded-xl border ${t.border} bg-white/5 space-y-2 text-xs`}
                                    >
                                      <div className="flex items-start justify-between gap-2">
                                        <h5 className={`font-semibold ${t.heading} line-clamp-1`}>{task.title}</h5>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getTaskStatusBadge(task.status)} shrink-0`}>
                                          {task.status === 'submitted' ? 'Awaiting Review' : task.status.replace('_', ' ')}
                                        </span>
                                      </div>

                                      {task.description && (
                                        <p className={`text-[11px] ${t.muted} line-clamp-2`}>{task.description}</p>
                                      )}

                                      <div className="flex items-center justify-between text-[10px] pt-1 border-t border-white/5">
                                        <div className="flex items-center gap-2">
                                          <span className={`px-1.5 py-0.5 rounded uppercase font-bold border ${getPriorityBadge(task.priority)}`}>
                                            {task.priority || 'medium'}
                                          </span>
                                        </div>
                                        {task.deadline && (
                                          <span className={t.muted}>
                                            Due: {new Date(task.deadline).toLocaleDateString()}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invite Employee Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className={`w-full max-w-md ${t.modalBg} border ${t.border} rounded-2xl p-6 shadow-2xl space-y-4`}>
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className={`text-base font-bold ${t.heading} flex items-center gap-2`}>
                <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                <span>Invite Employee to Team</span>
              </h3>
              <button onClick={() => setIsInviteModalOpen(false)} className={`${t.muted} hover:${t.heading}`}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {inviteErrorMsg && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {inviteErrorMsg}
              </div>
            )}

            {invitationTableMissing && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-2">
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="flex-1">
                    <p className="font-semibold text-amber-200">Supabase Table Missing in Schema Cache</p>
                    <p className="text-[11px] text-amber-300/90 mt-0.5">
                      The <code className="bg-amber-950/60 px-1 py-0.5 rounded text-amber-200 font-mono">public.invitations</code> table needs to be created or reloaded in your Supabase database.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCopySqlSnippet}
                  className="w-full py-1.5 px-3 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded-lg text-amber-200 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                  </svg>
                  <span>{sqlCopied ? 'Copied SQL to Clipboard!' : 'Copy SQL Migration Script'}</span>
                </button>
              </div>
            )}

            {inviteSuccessMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs space-y-2.5">
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="font-semibold text-emerald-200">{inviteSuccessMsg}</p>
                </div>
                {generatedInviteUrl && (
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      readOnly
                      value={generatedInviteUrl}
                      className={`flex-1 px-2.5 py-2 ${t.inputBg} border ${t.inputBorder} rounded-lg text-[11px] text-emerald-200 font-mono select-all`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedInviteUrl);
                        setLinkCopied(true);
                        setTimeout(() => setLinkCopied(false), 2500);
                      }}
                      className="px-3.5 py-2 bg-[#D9A441] hover:bg-[#C59336] text-[#0D1B1E] font-bold rounded-lg text-xs shrink-0 flex items-center gap-1 shadow transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                      </svg>
                      <span>{linkCopied ? 'Copied!' : 'Copy Link'}</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleCreateInvitation} className="space-y-4 text-xs">
              <div>
                <label className={`block font-bold uppercase ${t.muted} mb-1`}>Employee Full Name *</label>
                <input
                  type="text"
                  required
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="e.g. David Okon"
                  className={`w-full px-3.5 py-2.5 ${t.inputBg} border ${t.inputBorder} rounded-xl ${t.text} focus:outline-none focus:ring-2 focus:ring-[#D9A441]`}
                />
              </div>

              <div>
                <label className={`block font-bold uppercase ${t.muted} mb-1`}>Employee Email Address *</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="david@company.com"
                  className={`w-full px-3.5 py-2.5 ${t.inputBg} border ${t.inputBorder} rounded-xl ${t.text} focus:outline-none focus:ring-2 focus:ring-[#D9A441]`}
                />
              </div>

              <div className="pt-2 flex justify-end gap-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className={`px-4 py-2 ${t.accentBg} ${t.text} rounded-xl font-bold border ${t.border}`}
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={sendingInvite}
                  className="px-5 py-2 bg-[#D9A441] hover:bg-[#C59336] text-[#0D1B1E] font-bold rounded-xl shadow disabled:opacity-50 flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span>{sendingInvite ? 'Creating Invite...' : 'Generate Invitation'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Creation Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        taskToEdit={null}
        employees={employees}
        defaultAssigneeId={selectedAssigneeId}
        onSaved={fetchData}
        currentManagerId={currentManagerId}
      />
    </div>
  );
}
