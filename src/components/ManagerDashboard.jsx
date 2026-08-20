import React, { useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import TaskModal from './TaskModal';
import AttachmentViewer from './AttachmentViewer';
import RejectionModal from './RejectionModal';

export default function ManagerDashboard() {
  const { themeTokens: t } = useTheme();
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [timeLogs, setTimeLogs] = useState([]);
  const [attachmentsMap, setAttachmentsMap] = useState({});
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState(null);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [taskToReject, setTaskToReject] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: usersData } = await supabase.from('users').select('*').order('full_name');
      setEmployees(usersData || []);

      const { data: tasksData } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
      setTasks(tasksData || []);

      const { data: logsData } = await supabase.from('time_logs').select('*');
      setTimeLogs(logsData || []);

      const { data: attData } = await supabase.from('task_attachments').select('*');
      const attMap = {};
      (attData || []).forEach((att) => {
        if (!attMap[att.task_id]) attMap[att.task_id] = [];
        attMap[att.task_id].push(att);
      });
      setAttachmentsMap(attMap);
    } catch (err) {
      console.error('Error fetching manager dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (taskId) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: 'done', rejection_note: null })
        .eq('id', taskId);

      if (error) throw error;
      fetchData();
    } catch (err) {
      alert('Failed to approve task: ' + err.message);
    }
  };

  const handleConfirmReject = async (note) => {
    if (!taskToReject) return;
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: 'in_progress', rejection_note: note })
        .eq('id', taskToReject.id);

      if (error) throw error;
      setIsRejectModalOpen(false);
      setTaskToReject(null);
      fetchData();
    } catch (err) {
      alert('Failed to reject task: ' + err.message);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) throw error;
      fetchData();
    } catch (err) {
      alert('Failed to delete task: ' + err.message);
    }
  };

  const getTaskMinutes = (taskId) => {
    return timeLogs
      .filter((log) => log.task_id === taskId)
      .reduce((sum, log) => sum + (log.minutes_logged || 0), 0);
  };

  const filteredTasks = tasks.filter((task) => {
    if (statusFilter !== 'all' && task.status !== statusFilter) return false;
    if (assigneeFilter !== 'all' && task.assigned_to !== assigneeFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      if (!task.title?.toLowerCase().includes(q) && !task.category?.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'done':
        return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30';
      case 'submitted':
        return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30';
      case 'in_progress':
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/30';
      case 'pending':
        return 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border border-slate-500/30';
      default:
        return 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border border-slate-500/30';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'done': return 'Approved';
      case 'submitted': return 'Awaiting Review';
      case 'in_progress': return 'In Progress';
      case 'pending': return 'Pending';
      default: return status;
    }
  };

  const pendingReviewCount = tasks.filter((t) => t.status === 'submitted').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${t.cardBg} p-6 rounded-2xl shadow-sm`}>
        <div>
          <h2 className={`text-xl font-bold ${t.heading} tracking-tight`}>Manager Overview & Task Review</h2>
          <p className={`text-xs ${t.muted} mt-1`}>
            Assign tasks, review proof submissions, approve finished work, or provide feedback notes.
          </p>
        </div>
        <button
          onClick={() => { setTaskToEdit(null); setIsTaskModalOpen(true); }}
          className="px-4 py-2.5 bg-[#D9A441] hover:bg-[#C59336] text-[#0D1B1E] text-xs font-bold rounded-xl transition-all shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4B4F] flex items-center gap-1.5 shrink-0"
        >
          <span>Create New Task</span>
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Filters Bar */}
      <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 ${t.cardBg} p-4 rounded-xl`}>
        <div>
          <label className={`block text-[10px] font-bold uppercase tracking-wider ${t.muted} mb-1`}>
            Filter by Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`w-full px-3 py-1.5 ${t.inputBg} border ${t.inputBorder} rounded-lg ${t.text} text-xs focus:outline-none focus:ring-2 focus:ring-[#D9A441]`}
          >
            <option value="all">All Statuses</option>
            <option value="submitted">Awaiting Review ({pendingReviewCount})</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="done">Approved</option>
          </select>
        </div>

        <div>
          <label className={`block text-[10px] font-bold uppercase tracking-wider ${t.muted} mb-1`}>
            Filter by Assignee
          </label>
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className={`w-full px-3 py-1.5 ${t.inputBg} border ${t.inputBorder} rounded-lg ${t.text} text-xs focus:outline-none focus:ring-2 focus:ring-[#D9A441]`}
          >
            <option value="all">All Employees</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>{emp.full_name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={`block text-[10px] font-bold uppercase tracking-wider ${t.muted} mb-1`}>
            Search Tasks
          </label>
          <input
            type="text"
            placeholder="Search by title or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full px-3 py-1.5 ${t.inputBg} border ${t.inputBorder} rounded-lg ${t.text} text-xs focus:outline-none focus:ring-2 focus:ring-[#D9A441]`}
          />
        </div>
      </div>

      {/* Task Cards List */}
      {loading ? (
        <div className={`p-12 text-center ${t.muted} text-sm`}>
          <div className="w-6 h-6 border-2 border-[#D9A441] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          Loading tasks...
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className={`p-12 text-center ${t.cardBg} rounded-2xl space-y-2`}>
          <p className={`font-semibold text-sm ${t.heading}`}>
            {tasks.length === 0 ? 'No tasks created yet — click "Create New Task" to assign work to your team.' : 'No tasks match your selected filter.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTasks.map((task) => {
            const assignee = employees.find((e) => e.id === task.assigned_to);
            const totalMins = getTaskMinutes(task.id);
            const attachments = attachmentsMap[task.id] || [];

            return (
              <div
                key={task.id}
                className={`${t.cardBg} rounded-xl p-5 flex flex-col justify-between space-y-4 shadow-sm ${t.cardHover}`}
              >
                <div className="space-y-3">
                  {/* Category & Status */}
                  <div className="flex items-center justify-between gap-2">
                    <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded ${t.accentBg} ${t.text} border ${t.border}`}>
                      {task.category || 'General'}
                    </span>
                    <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full ${getStatusBadge(task.status)}`}>
                      {getStatusLabel(task.status)}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className={`text-base font-bold ${t.heading} leading-snug`}>{task.title}</h3>
                    {task.description && (
                      <p className={`text-xs ${t.muted} mt-1 line-clamp-2 leading-relaxed`}>{task.description}</p>
                    )}
                  </div>

                  {/* Rejection Feedback Note Preview */}
                  {task.rejection_note && (
                    <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-300">
                      <strong className="block text-[10px] font-bold uppercase text-rose-400">Rejection Feedback Note:</strong>
                      {task.rejection_note}
                    </div>
                  )}

                  {/* Attachment Proof Viewer */}
                  <AttachmentViewer attachments={attachments} />
                </div>

                {/* Footer Actions */}
                <div className={`pt-3 border-t ${t.border} space-y-3`}>
                  <div className={`flex items-center justify-between text-xs ${t.muted}`}>
                    <span>Assigned to: <strong className={t.heading}>{assignee?.full_name || 'Unassigned'}</strong></span>
                    <span className="text-[#D9A441] font-semibold">{totalMins} mins</span>
                  </div>

                  {/* Review Actions for Submitted Tasks */}
                  {task.status === 'submitted' ? (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={() => handleApprove(task.id)}
                        className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors shadow flex items-center justify-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      >
                        <span>Approve Task</span>
                        <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => { setTaskToReject(task); setIsRejectModalOpen(true); }}
                        className="py-1.5 px-3 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg transition-colors shadow flex items-center justify-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-rose-400"
                      >
                        <span>Reject Task</span>
                        <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        onClick={() => { setTaskToEdit(task); setIsTaskModalOpen(true); }}
                        className={`px-3 py-1 ${t.accentBg} ${t.text} text-[11px] font-semibold rounded border ${t.border} hover:opacity-80 flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-[#D9A441]`}
                      >
                        <span>Edit</span>
                        <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="px-3 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[11px] font-semibold rounded border border-rose-500/20 flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-rose-400"
                      >
                        <span>Delete</span>
                        <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Task Edit Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        taskToEdit={taskToEdit}
        employees={employees}
        onSaved={fetchData}
      />

      {/* Rejection Feedback Modal */}
      <RejectionModal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        onConfirm={handleConfirmReject}
      />
    </div>
  );
}
