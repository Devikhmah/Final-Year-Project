import React, { useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import AttachmentViewer from './AttachmentViewer';

export default function RejectedTasksDashboard({ userProfile, userSession, onTaskUpdated }) {
  const { themeTokens: t } = useTheme();
  const [tasks, setTasks] = useState([]);
  const [employeesMap, setEmployeesMap] = useState({});
  const [timeLogs, setTimeLogs] = useState([]);
  const [attachmentsMap, setAttachmentsMap] = useState({});
  const [loading, setLoading] = useState(true);

  const [minutesInput, setMinutesInput] = useState({});
  const [fileInput, setFileInput] = useState({});
  const [submittingTaskId, setSubmittingTaskId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [msg, setMsg] = useState('');

  const userId = userSession?.user?.id;
  const role = userProfile?.role || userSession?.user?.user_metadata?.role || 'employee';

  useEffect(() => {
    fetchData();
  }, [userId, role]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch employees map for manager reference
      const { data: usersData } = await supabase.from('users').select('*');
      const uMap = {};
      (usersData || []).forEach((u) => { uMap[u.id] = u.full_name; });
      setEmployeesMap(uMap);

      // Fetch tasks
      let query = supabase.from('tasks').select('*').order('created_at', { ascending: false });
      if (role === 'employee') {
        query = query.eq('assigned_to', userId);
      }
      const { data: tasksData } = await query;
      
      // Filter for rejected tasks (status === 'rejected' or has rejection_note)
      const rejectedOnly = (tasksData || []).filter(
        (t) => t.status === 'rejected' || (t.rejection_note && t.rejection_note.trim() !== '')
      );
      setTasks(rejectedOnly);

      // Time logs
      const { data: logsData } = await supabase.from('time_logs').select('*');
      setTimeLogs(logsData || []);

      // Attachments
      const { data: attData } = await supabase.from('task_attachments').select('*');
      const attMap = {};
      (attData || []).forEach((att) => {
        if (!attMap[att.task_id]) attMap[att.task_id] = [];
        attMap[att.task_id].push(att);
      });
      setAttachmentsMap(attMap);
    } catch (err) {
      console.error('Error fetching rejected tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResubmit = async (taskId) => {
    const file = fileInput[taskId];
    const existingAtts = attachmentsMap[taskId] || [];

    if (!file && existingAtts.length === 0) {
      alert('Proof Attachment Required! Please select a revised proof file (document, PDF, spreadsheet, image, archive, code file, etc.) to attach before resubmitting.');
      return;
    }

    setSubmittingTaskId(taskId);
    try {
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${taskId}_${Date.now()}.${fileExt}`;
        const filePath = `task-proofs/${fileName}`;

        let { error: uploadErr } = await supabase.storage
          .from('task-proofs')
          .upload(filePath, file, { upsert: true });

        if (uploadErr) throw uploadErr;

        const { data: urlData } = supabase.storage
          .from('task-proofs')
          .getPublicUrl(filePath);

        await supabase
          .from('task_attachments')
          .insert([{
            task_id: taskId,
            file_path: filePath,
            file_name: file.name,
            file_type: file.type,
            file_url: urlData.publicUrl,
            uploaded_by: userId,
          }]);
      }

      const { error: taskErr } = await supabase
        .from('tasks')
        .update({ status: 'submitted' })
        .eq('id', taskId);

      if (taskErr) throw taskErr;

      setMsg('✓ Task revised & resubmitted for manager review!');
      setTimeout(() => setMsg(''), 4000);
      fetchData();
      if (onTaskUpdated) onTaskUpdated();
    } catch (err) {
      alert('Failed to resubmit task: ' + err.message);
    } finally {
      setSubmittingTaskId(null);
    }
  };

  const handleClearRejection = async (taskId) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: 'done', rejection_note: null })
        .eq('id', taskId);
      if (error) throw error;
      fetchData();
      if (onTaskUpdated) onTaskUpdated();
    } catch (err) {
      alert('Failed to approve task: ' + err.message);
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
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return t.title?.toLowerCase().includes(q) || t.category?.toLowerCase().includes(q) || t.rejection_note?.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header Banner */}
      <div className={`${t.cardBg} p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm border border-rose-500/20`}>
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 flex items-center justify-center font-bold text-xl shrink-0">
            ❌
          </div>
          <div>
            <h2 className={`text-xl font-bold ${t.heading} tracking-tight`}>
              Rejected Tasks & Revision Requests ({tasks.length})
            </h2>
            <p className={`text-xs ${t.muted} mt-1`}>
              {role === 'manager'
                ? 'Tasks requiring revisions or rejected across your team.'
                : 'Review manager feedback notes, attach requested proof files, and resubmit for review.'}
            </p>
          </div>
        </div>
        {msg && (
          <div className="px-3.5 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5">
            <span>{msg}</span>
          </div>
        )}
      </div>

      {/* Search Filter */}
      {tasks.length > 0 && (
        <div className={`${t.cardBg} p-4 rounded-xl border ${t.border}`}>
          <input
            type="text"
            placeholder="Search rejected tasks by title, category, or feedback note..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full px-3.5 py-2 ${t.inputBg} border ${t.inputBorder} rounded-lg ${t.text} text-xs focus:outline-none focus:ring-2 focus:ring-rose-500`}
          />
        </div>
      )}

      {/* Tasks List */}
      {loading ? (
        <div className={`p-12 text-center ${t.muted} text-sm`}>
          <div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          Loading rejected tasks...
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className={`p-12 text-center ${t.cardBg} rounded-2xl border ${t.border} space-y-3`}>
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center text-xl mx-auto">
            ✓
          </div>
          <p className={`font-bold text-sm ${t.heading}`}>No Rejected Tasks!</p>
          <p className={`text-xs ${t.muted} max-w-md mx-auto`}>
            {role === 'manager'
              ? 'Great news! There are currently no tasks with rejected status or pending revision feedback.'
              : 'All your submitted tasks have either been approved or are currently awaiting review.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTasks.map((task) => {
            const totalMins = getTaskMinutes(task.id);
            const attachments = attachmentsMap[task.id] || [];
            const assigneeName = employeesMap[task.assigned_to] || 'Unassigned';

            return (
              <div
                key={task.id}
                className={`${t.cardBg} rounded-xl p-5 flex flex-col justify-between space-y-4 shadow-sm border border-rose-500/30 ${t.cardHover}`}
              >
                <div className="space-y-3">
                  {/* Category & Status */}
                  <div className="flex items-center justify-between gap-2">
                    <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded ${t.accentBg} ${t.text} border ${t.border}`}>
                      {task.category || 'General'}
                    </span>
                    <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/40 flex items-center gap-1">
                      <span>Revision Required</span>
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className={`text-base font-bold ${t.heading} leading-snug`}>{task.title}</h3>
                    {task.description && (
                      <p className={`text-xs ${t.muted} mt-1 line-clamp-2 leading-relaxed`}>{task.description}</p>
                    )}
                  </div>

                  {/* Rejection Feedback Banner */}
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-1 text-xs">
                    <div className="flex items-center justify-between text-rose-400 font-bold text-[10px] uppercase tracking-wider">
                      <span>Manager Feedback Note</span>
                      <span className="text-[9px] bg-rose-500/20 px-1.5 py-0.5 rounded text-rose-300">Action Needed</span>
                    </div>
                    <p className="text-rose-200 leading-relaxed font-medium">
                      {task.rejection_note || 'Submission rejected by manager. Please review and resubmit proof.'}
                    </p>
                  </div>

                  {/* Attachments History */}
                  <AttachmentViewer attachments={attachments} />
                </div>

                {/* Footer Actions */}
                <div className={`pt-3 border-t ${t.border} space-y-3`}>
                  {role === 'manager' && (
                    <p className={`text-xs ${t.muted}`}>Assigned to: <strong className={t.heading}>{assigneeName}</strong></p>
                  )}

                  {/* Log Time Widget */}
                  <div className={`flex items-center justify-between text-xs ${t.muted} ${t.accentBg} p-2 rounded-lg border ${t.border}`}>
                    <span>Logged Time:</span>
                    <strong className="text-[#D9A441] font-bold">{totalMins} mins ({ (totalMins / 60).toFixed(1) } hrs)</strong>
                  </div>

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
                    </button>
                  </div>

                  {/* Resubmit / Approve Widget */}
                  {role === 'manager' ? (
                    <button
                      onClick={() => handleClearRejection(task.id)}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors shadow flex items-center justify-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    >
                      <span>Approve & Complete Task</span>
                      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <label className={`block text-[10px] font-bold uppercase tracking-wider ${t.muted}`}>
                        Attach Revised Proof File (PDF, Document, Image, Sheet, Code, etc.)
                      </label>
                      <input
                        type="file"
                        onChange={(e) => setFileInput({ ...fileInput, [task.id]: e.target.files[0] })}
                        className={`w-full text-xs ${t.muted} file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#1B4B4F] file:text-white hover:file:bg-[#153B3E] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#D9A441]`}
                      />
                      {fileInput[task.id] && (
                        <div className="px-2.5 py-1 rounded-lg bg-[#D9A441]/10 border border-[#D9A441]/30 text-xs font-semibold text-[#D9A441] flex items-center justify-between gap-2">
                          <span className="truncate">Selected: <strong>{fileInput[task.id].name}</strong></span>
                          <span className="text-[10px] opacity-75 shrink-0">({(fileInput[task.id].size / 1024).toFixed(0)} KB)</span>
                        </div>
                      )}
                      <button
                        onClick={() => handleResubmit(task.id)}
                        disabled={submittingTaskId === task.id}
                        className="w-full py-2 bg-[#D9A441] hover:bg-[#C59336] text-[#0D1B1E] text-xs font-bold rounded-lg transition-colors shadow disabled:opacity-50 flex items-center justify-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-[#1B4B4F]"
                      >
                        <span>{submittingTaskId === task.id ? 'Uploading & Resubmitting...' : 'Resubmit Task for Review'}</span>
                        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
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
    </div>
  );
}
