import React, { useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import AttachmentViewer from './AttachmentViewer';

export default function EmployeeDashboard({ userSession }) {
  const { themeTokens: t } = useTheme();
  const [tasks, setTasks] = useState([]);
  const [timeLogs, setTimeLogs] = useState([]);
  const [attachmentsMap, setAttachmentsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  // Input states
  const [minutesInput, setMinutesInput] = useState({});
  const [fileInput, setFileInput] = useState({});
  const [submittingTaskId, setSubmittingTaskId] = useState(null);
  const [msg, setMsg] = useState('');
  const [bucketAlert, setBucketAlert] = useState(false);
  const [rlsAlert, setRlsAlert] = useState(false);

  const userId = userSession?.user?.id;

  useEffect(() => {
    if (userId) fetchData();
  }, [userId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*')
        .eq('assigned_to', userId)
        .order('created_at', { ascending: false });
      setTasks(tasksData || []);

      const { data: logsData } = await supabase
        .from('time_logs')
        .select('*')
        .eq('user_id', userId);
      setTimeLogs(logsData || []);

      const { data: attData } = await supabase
        .from('task_attachments')
        .select('*');
      const attMap = {};
      (attData || []).forEach((att) => {
        if (!attMap[att.task_id]) attMap[att.task_id] = [];
        attMap[att.task_id].push(att);
      });
      setAttachmentsMap(attMap);
    } catch (err) {
      console.error('Error loading employee dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (taskId, currentStatus, newStatus) => {
    if (newStatus === 'submitted') {
      const file = fileInput[taskId];
      const existingAtts = attachmentsMap[taskId] || [];

      if (!file && existingAtts.length === 0) {
        alert('Proof Attachment Required! Please select a file (image or document) to attach before submitting for review.');
        return;
      }

      setSubmittingTaskId(taskId);
      setBucketAlert(false);
      setRlsAlert(false);

      try {
        if (file) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${taskId}_${Date.now()}.${fileExt}`;
          const filePath = `task-proofs/${fileName}`;

          let { error: uploadErr } = await supabase.storage
            .from('task-proofs')
            .upload(filePath, file, { upsert: true });

          if (uploadErr && uploadErr.message?.toLowerCase().includes('bucket not found')) {
            await supabase.storage.createBucket('task-proofs', { public: true });
            const retryRes = await supabase.storage
              .from('task-proofs')
              .upload(filePath, file, { upsert: true });
            uploadErr = retryRes.error;
          }

          if (uploadErr) {
            if (uploadErr.message?.toLowerCase().includes('bucket not found')) {
              setBucketAlert(true);
              throw new Error('Supabase Storage bucket "task-proofs" is missing.');
            }
            if (uploadErr.message?.toLowerCase().includes('row-level security')) {
              setRlsAlert(true);
              throw new Error('Storage RLS error: Run supabase_setup.sql in your SQL Editor.');
            }
            throw uploadErr;
          }

          const { data: urlData } = supabase.storage
            .from('task-proofs')
            .getPublicUrl(filePath);

          const { error: dbAttErr } = await supabase
            .from('task_attachments')
            .insert([{
              task_id: taskId,
              file_path: filePath,
              file_name: file.name,
              file_type: file.type,
              file_url: urlData.publicUrl,
              uploaded_by: userId,
            }]);

          if (dbAttErr) {
            if (dbAttErr.message?.toLowerCase().includes('row-level security')) {
              setRlsAlert(true);
              throw new Error('Database RLS error on task_attachments: Run supabase_setup.sql in your SQL Editor.');
            }
            throw dbAttErr;
          }
        }

        const { error: taskErr } = await supabase
          .from('tasks')
          .update({ status: 'submitted', rejection_note: null })
          .eq('id', taskId);

        if (taskErr) {
          if (taskErr.message?.toLowerCase().includes('row-level security')) {
            setRlsAlert(true);
            throw new Error('Database RLS error on tasks: Run supabase_setup.sql in your SQL Editor.');
          }
          throw taskErr;
        }

        setMsg('✓ Task submitted for manager review!');
        setTimeout(() => setMsg(''), 4000);
        fetchData();
      } catch (err) {
        if (!bucketAlert && !rlsAlert) {
          alert('Failed to submit task for review: ' + err.message);
        }
      } finally {
        setSubmittingTaskId(null);
      }
    } else {
      try {
        const { error } = await supabase
          .from('tasks')
          .update({ status: newStatus })
          .eq('id', taskId);

        if (error) throw error;
        fetchData();
      } catch (err) {
        alert('Failed to update status: ' + err.message);
      }
    }
  };

  const handleLogTime = async (taskId) => {
    const minutes = parseInt(minutesInput[taskId], 10);
    if (!minutes || minutes <= 0) {
      alert('Enter a valid number of work minutes.');
      return;
    }

    try {
      const { error } = await supabase
        .from('time_logs')
        .insert([{
          task_id: taskId,
          user_id: userId,
          minutes_logged: minutes,
        }]);

      if (error) throw error;
      setMinutesInput((prev) => ({ ...prev, [taskId]: '' }));
      setMsg(`✓ Logged ${minutes} minutes!`);
      setTimeout(() => setMsg(''), 3000);
      fetchData();
    } catch (err) {
      alert('Failed to log time: ' + err.message);
    }
  };

  const getTaskMinutes = (taskId) => {
    return timeLogs
      .filter((log) => log.task_id === taskId)
      .reduce((sum, log) => sum + (log.minutes_logged || 0), 0);
  };

  const filteredTasks = tasks.filter((t) => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className={`${t.cardBg} p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm`}>
        <div>
          <h2 className={`text-xl font-bold ${t.heading} tracking-tight`}>My Assigned Tasks</h2>
          <p className={`text-xs ${t.muted} mt-1`}>
            Update task progress, log work minutes, attach proof files, and submit for manager review.
          </p>
        </div>
        {msg && (
          <div className="px-3.5 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5">
            <span>{msg}</span>
            <svg className="w-4 h-4 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>

      {/* RLS Alert Banner */}
      {rlsAlert && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-rose-500 dark:text-rose-400 font-bold text-sm">
            <span>Row Level Security (RLS) Policy Update Required</span>
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            Your Supabase Row Level Security (RLS) policies need to be updated to allow task attachments and submissions.
          </p>
          <button
            onClick={() => setRlsAlert(false)}
            className="px-3 py-1.5 bg-slate-800 text-white text-xs font-semibold rounded-lg"
          >
            Dismiss Alert
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className={`flex items-center gap-1 p-1 ${t.cardBg} rounded-xl w-fit text-xs`}>
        {['all', 'pending', 'in_progress', 'submitted', 'done'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3.5 py-1.5 font-semibold rounded-lg capitalize transition-colors focus:outline-none focus:ring-2 focus:ring-[#D9A441] ${
              statusFilter === status ? 'bg-[#D9A441] text-[#0D1B1E] font-bold shadow-sm' : `${t.muted} hover:${t.heading}`
            }`}
          >
            {status === 'submitted' ? 'Awaiting Review' : status === 'done' ? 'Approved' : status.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Task List */}
      {loading ? (
        <div className={`p-12 text-center ${t.muted} text-sm`}>
          <div className="w-6 h-6 border-2 border-[#D9A441] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          Loading assigned tasks...
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className={`p-12 text-center ${t.cardBg} rounded-2xl`}>
          <p className={`font-semibold text-sm ${t.heading}`}>
            No tasks assigned to you right now. Check back soon or contact your manager.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTasks.map((task) => {
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
                      <p className={`text-xs ${t.muted} mt-1 line-clamp-3 leading-relaxed`}>{task.description}</p>
                    )}
                  </div>

                  {/* Rejection Feedback Note Alert */}
                  {task.rejection_note && task.status === 'in_progress' && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-1 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-rose-600 dark:text-rose-400 text-[10px] uppercase tracking-wider">
                        <span>Manager Rejection Note</span>
                        <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                      <p className="text-rose-800 dark:text-rose-300 leading-relaxed font-medium">{task.rejection_note}</p>
                      <p className="text-[10px] text-rose-700 dark:text-rose-400 pt-1">
                        Please revise your work, attach new proof below, and click <strong>Submit for Review</strong>.
                      </p>
                    </div>
                  )}

                  {/* Proof Attachment History */}
                  <AttachmentViewer attachments={attachments} />
                </div>

                {/* Workflow Actions */}
                <div className={`pt-3 border-t ${t.border} space-y-3`}>
                  {/* Log Time Action */}
                  <div className={`flex items-center justify-between text-xs ${t.muted} ${t.accentBg} p-2 rounded-lg border ${t.border}`}>
                    <span>Logged Time:</span>
                    <strong className="text-[#D9A441] font-bold">{totalMins} mins ({ (totalMins / 60).toFixed(1) } hrs)</strong>
                  </div>

                  {task.status !== 'done' && task.status !== 'submitted' && (
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="1"
                        placeholder="Log work minutes..."
                        value={minutesInput[task.id] || ''}
                        onChange={(e) => setMinutesInput({ ...minutesInput, [task.id]: e.target.value })}
                        className={`w-full px-3 py-1.5 ${t.inputBg} border ${t.inputBorder} rounded-lg ${t.text} text-xs focus:outline-none focus:ring-2 focus:ring-[#D9A441]`}
                      />
                      <button
                        onClick={() => handleLogTime(task.id)}
                        className="px-3 py-1.5 bg-[#1B4B4F] hover:bg-[#153B3E] text-white text-xs font-bold rounded-lg shrink-0 transition-colors shadow flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
                      >
                        <span>Log Time</span>
                        <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                    </div>
                  )}

                  {/* Status & Proof File Submission Widget */}
                  <div className="space-y-2 pt-1">
                    {task.status === 'pending' && (
                      <button
                        onClick={() => handleStatusChange(task.id, 'pending', 'in_progress')}
                        className="w-full py-2 bg-[#1B4B4F] hover:bg-[#153B3E] text-white text-xs font-bold rounded-lg transition-colors shadow flex items-center justify-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
                      >
                        <span>Start Task (In Progress)</span>
                        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        </svg>
                      </button>
                    )}

                    {task.status === 'in_progress' && (
                      <div className="space-y-2">
                        <label className={`block text-[10px] font-bold uppercase tracking-wider ${t.muted}`}>
                          Attach Proof File (Required for Submission)
                        </label>
                        <input
                          type="file"
                          onChange={(e) => setFileInput({ ...fileInput, [task.id]: e.target.files[0] })}
                          className={`w-full text-xs ${t.muted} file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#1B4B4F] file:text-white hover:file:bg-[#153B3E] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#D9A441]`}
                        />
                        <button
                          onClick={() => handleStatusChange(task.id, 'in_progress', 'submitted')}
                          disabled={submittingTaskId === task.id}
                          className="w-full py-2 bg-[#D9A441] hover:bg-[#C59336] text-[#0D1B1E] text-xs font-bold rounded-lg transition-colors shadow disabled:opacity-50 flex items-center justify-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-[#1B4B4F]"
                        >
                          <span>{submittingTaskId === task.id ? 'Uploading & Submitting...' : 'Submit for Review'}</span>
                          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                        </button>
                      </div>
                    )}

                    {task.status === 'submitted' && (
                      <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs rounded-lg text-center font-semibold flex items-center justify-center gap-1.5">
                        <span>Submitted — Awaiting Review</span>
                        <svg className="w-4 h-4 shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    )}

                    {task.status === 'done' && (
                      <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs rounded-lg text-center font-semibold flex items-center justify-center gap-1.5">
                        <span>Approved & Completed</span>
                        <svg className="w-4 h-4 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
