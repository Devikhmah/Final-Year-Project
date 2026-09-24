import React, { useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import VelocityMetrics from './VelocityMetrics';
import CategoryMixChart from './CategoryMixChart';
import UtilizationTable from './UtilizationTable';

export default function AnalyticsDashboard({ userProfile, userSession }) {
  const { themeTokens: t } = useTheme();
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [timeLogs, setTimeLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeWindow, setTimeWindow] = useState('week');

  const [generatingInsight, setGeneratingInsight] = useState(false);
  const [aiInsight, setAiInsight] = useState(null);
  const [aiError, setAiError] = useState(null);
  const [copiedInsight, setCopiedInsight] = useState(false);

  const handleDownloadInsight = (format = 'txt') => {
    if (!aiInsight) return;

    const dateStr = new Date().toISOString().split('T')[0];
    const periodStr = timeWindow === 'week' ? 'Weekly' : 'Monthly';
    const extension = format === 'md' ? 'md' : 'txt';
    const fileName = `Cadence_AI_Executive_${periodStr}_Productivity_Summary_${dateStr}.${extension}`;

    const reportHeader = `================================================================================
CADENCE WORKFORCE PRODUCTIVITY SYSTEM
EXECUTIVE ${periodStr.toUpperCase()} PRODUCTIVITY & WORKLOAD INSIGHT
Generated on: ${new Date().toLocaleString()}
Period: ${timeWindow === 'week' ? 'This Week' : 'This Month'}
================================================================================\n\n`;

    const fullContent =
      reportHeader +
      aiInsight +
      '\n\n' +
      `--------------------------------------------------------------------------------\nCadence Productivity Portal • Powered by Google Gemini AI\n`;

    const blob = new Blob([fullContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleCopyInsight = async () => {
    if (!aiInsight) return;
    try {
      await navigator.clipboard.writeText(aiInsight);
      setCopiedInsight(true);
      setTimeout(() => setCopiedInsight(false), 2000);
    } catch {
      // Fallback
    }
  };

  const currentManagerId = userProfile?.id || userSession?.user?.id;

  useEffect(() => {
    if (currentManagerId) {
      fetchData();
    }
  }, [currentManagerId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Query users belonging specifically to this manager's team
      const { data: usersData } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'employee')
        .eq('manager_id', currentManagerId);

      const teamEmployeeIds = (usersData || []).map((u) => u.id);
      setEmployees(usersData || []);

      const { data: tasksData } = await supabase.from('tasks').select('*');
      const scopedTasks = (tasksData || []).filter(
        (t) => t.created_by === currentManagerId || 
               teamEmployeeIds.includes(t.assigned_to) || 
               t.assigned_to === currentManagerId
      );
      setTasks(scopedTasks);

      const scopedTaskIds = scopedTasks.map((t) => t.id);
      const { data: logsData } = await supabase.from('time_logs').select('*');
      const scopedLogs = (logsData || []).filter(
        (l) => scopedTaskIds.includes(l.task_id) || teamEmployeeIds.includes(l.user_id) || l.user_id === currentManagerId
      );
      setTimeLogs(scopedLogs);
    } catch (err) {
      console.error('Error loading analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTimeWindowChange = (newWindow) => {
    setTimeWindow(newWindow);
    setAiInsight(null);
    setAiError(null);
  };

  const handleGenerateInsight = async () => {
    setGeneratingInsight(true);
    setAiInsight(null);
    setAiError(null);

    const cutoffDate = new Date();
    if (timeWindow === 'week') {
      cutoffDate.setDate(cutoffDate.getDate() - 7);
    } else {
      cutoffDate.setDate(cutoffDate.getDate() - 30);
    }

    const windowTasks = tasks.filter((t) => new Date(t.created_at || Date.now()) >= cutoffDate);
    const windowLogs = timeLogs.filter((l) => new Date(l.logged_at || Date.now()) >= cutoffDate);

    const approvedCompleted = windowTasks.filter((t) => t.status === 'done');
    let onTimeCount = 0;
    let overdueCount = 0;

    approvedCompleted.forEach((task) => {
      if (!task.deadline) onTimeCount++;
      else if (new Date(task.created_at || Date.now()) <= new Date(task.deadline)) onTimeCount++;
      else overdueCount++;
    });

    const totalMins = windowLogs.reduce((sum, l) => sum + (l.minutes_logged || 0), 0);

    const anonymizedEmployeeSummaries = employees.map((emp, index) => {
      const empTasks = windowTasks.filter((t) => t.assigned_to === emp.id);
      const empLogs = windowLogs.filter((l) => l.user_id === emp.id);
      const mins = empLogs.reduce((sum, l) => sum + (l.minutes_logged || 0), 0);

      const catCounts = {};
      empTasks.forEach((t) => {
        catCounts[t.category || 'General'] = (catCounts[t.category || 'General'] || 0) + 1;
      });
      let dominantCat = 'General';
      let maxCount = 0;
      Object.entries(catCounts).forEach(([cat, count]) => {
        if (count > maxCount) {
          maxCount = count;
          dominantCat = cat;
        }
      });

      return {
        anonymizedLabel: `Employee ${index + 1} (${emp.role || 'employee'})`,
        activeTaskCount: empTasks.filter((t) => t.status !== 'done').length,
        approvedDoneCount: empTasks.filter((t) => t.status === 'done').length,
        hoursLogged: (mins / 60).toFixed(1),
        dominantCategory: dominantCat,
      };
    });

    const clientApiKey =
      localStorage.getItem('cadence_gemini_api_key') ||
      import.meta.env?.VITE_GEMINI_API_KEY ||
      '';

    const payload = {
      timeWindow: timeWindow === 'week' ? 'This Week' : 'This Month',
      apiKey: clientApiKey,
      metrics: {
        assignedCount: windowTasks.length,
        approvedCount: approvedCompleted.length,
        onTimeCount,
        overdueCount,
        submittedBottleneckCount: windowTasks.filter((t) => t.status === 'submitted').length,
        totalHoursLogged: (totalMins / 60).toFixed(1),
      },
      employeeSummaries: anonymizedEmployeeSummaries,
    };

    try {
      let insightText = null;
      let errorMessage = null;

      try {
        const response = await fetch('/api/generate-insight', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            insightText = result.insightText;
          } else {
            errorMessage = result.error;
          }
        } else {
          const errData = await response.json().catch(() => ({}));
          errorMessage = errData.error || `Server responded with ${response.status}`;
        }
      } catch (apiErr) {
        console.warn('Backend /api/generate-insight unreachable, trying direct client fallback:', apiErr);
      }

      // Direct Client-Side Fallback if backend API returned an error and client key exists
      if (!insightText) {
        if (clientApiKey) {
          const promptText = `You are an executive workforce productivity analyst for Small and Medium Enterprises (SMEs).
Analyze the following anonymized workforce metrics for ${payload.timeWindow}:

- Period: ${payload.timeWindow}
- Total Tasks Assigned: ${payload.metrics.assignedCount || 0}
- Manager Approved Completed Tasks: ${payload.metrics.approvedCount || 0}
- Finished On-Time: ${payload.metrics.onTimeCount || 0}
- Finished Overdue: ${payload.metrics.overdueCount || 0}
- Tasks Awaiting Review (Bottleneck): ${payload.metrics.submittedBottleneckCount || 0}
- Total Logged Work Hours: ${payload.metrics.totalHoursLogged || 0}

Anonymized Employee Capacity & Workload Summaries:
${JSON.stringify(payload.employeeSummaries, null, 2)}

Provide a high-level ${payload.timeWindow.toLowerCase()} executive summary with the following sections:
1. Overall Velocity & Delivery Performance (2-3 sentences evaluating throughput vs deadlines).
2. Workload & Bottleneck Analysis (highlighting any pending reviews or employee overload/idle signals).
3. 2 Concrete, Actionable Next Steps for Management for the upcoming period.`;

          const activeModels = [
            'gemini-3.6-flash',
            'gemini-3.7-flash',
            'gemini-3.5-flash',
            'gemini-flash-latest',
            'gemini-3.1-flash-lite',
            'gemini-3.1-pro-preview',
          ];

          for (const model of activeModels) {
            try {
              const res = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${clientApiKey}`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] }),
                }
              );
              if (res.ok) {
                const data = await res.json();
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) {
                  insightText = text;
                  errorMessage = null;
                  break;
                }
              }
            } catch {
              // try next model
            }
          }
        }
      }

      if (insightText) {
        setAiInsight(insightText);
        setAiError('');
      } else {
        setAiError(errorMessage || 'Unable to generate executive insight at this moment.');
      }
    } catch (err) {
      setAiError('Unable to generate executive insight at this moment: ' + err.message);
    } finally {
      setGeneratingInsight(false);
    }
  };

  const handleSeedSampleData = async () => {
    if (!window.confirm('Generate sample tasks and time logs for testing analytics on your team?')) return;
    setLoading(true);
    try {
      const sampleTasks = [
        { title: 'Client Onboarding Campaign', category: 'Sales', priority: 'high', status: 'done', deadline: new Date(Date.now() - 86400000).toISOString() },
        { title: 'Weekly Payroll Processing', category: 'Operations', priority: 'medium', status: 'done', deadline: new Date(Date.now() + 86400000).toISOString() },
        { title: 'Customer Support Tickets', category: 'Support', priority: 'low', status: 'in_progress', deadline: new Date(Date.now() + 172800000).toISOString() },
        { title: 'Tax Filing & Auditing', category: 'Admin', priority: 'high', status: 'submitted', deadline: new Date(Date.now() + 259200000).toISOString() },
      ];

      const empId = employees[0]?.id || null;
      for (const st of sampleTasks) {
        const { data: insertedTask } = await supabase.from('tasks').insert([{ ...st, assigned_to: empId }]).select().single();
        if (insertedTask && empId) {
          await supabase.from('time_logs').insert([{ task_id: insertedTask.id, user_id: empId, minutes_logged: 120 }]);
        }
      }
      fetchData();
    } catch (err) {
      alert('Error adding sample data: ' + err.message);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header & Controls */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${t.cardBg} p-6 rounded-2xl shadow-sm`}>
        <div>
          <h2 className={`text-xl font-bold ${t.heading} tracking-tight`}>Productivity Analytics</h2>
          <p className={`text-xs ${t.muted} mt-1`}>
            Team Insights: Task completion velocity, time allocation mix, and workload utilization for your team.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleGenerateInsight}
            disabled={generatingInsight}
            className="px-4 py-2 bg-[#D9A441] hover:bg-[#C59336] text-[#0D1B1E] text-xs font-bold rounded-xl transition-all shadow flex items-center gap-2 disabled:opacity-50"
          >
            <span>
              {generatingInsight
                ? 'Generating Insight...'
                : timeWindow === 'week'
                ? 'Generate Weekly Insight'
                : 'Generate Monthly Insight'}
            </span>
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </button>

          <button
            onClick={handleSeedSampleData}
            className={`px-3 py-2 ${t.accentBg} ${t.text} text-xs font-bold rounded-xl border ${t.border} transition-all hover:opacity-80 flex items-center gap-1.5` }
          >
            <span>Add Sample Data</span>
            <svg className="w-4 h-4 shrink-0 text-[#D9A441]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </button>

          <div className={`flex items-center gap-1 p-1 ${t.inputBg} rounded-xl border ${t.border} text-xs`}>
            <button
              onClick={() => handleTimeWindowChange('week')}
              className={`px-3 py-1.5 font-bold rounded-lg transition-colors ${
                timeWindow === 'week' ? 'bg-[#1B4B4F] text-white shadow' : `${t.muted} hover:${t.heading}`
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => handleTimeWindowChange('month')}
              className={`px-3 py-1.5 font-bold rounded-lg transition-colors ${
                timeWindow === 'month' ? 'bg-[#1B4B4F] text-white shadow' : `${t.muted} hover:${t.heading}`
              }`}
            >
              This Month
            </button>
          </div>
        </div>
      </div>

      {generatingInsight && (
        <div className="bg-amber-500/10 border border-amber-500/30 p-6 rounded-2xl space-y-3 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-[#D9A441] border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm font-bold text-[#D9A441]">
              Analyzing workforce metrics & generating AI ${timeWindow === 'week' ? 'weekly' : 'monthly'} insight...
            </span>
          </div>
        </div>
      )}

      {aiError && (
        <div className="bg-amber-500/10 border border-amber-500/30 p-6 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#D9A441] font-bold text-sm">
              <span>AI Insight Call Notice</span>
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <button
              onClick={() => setAiError(null)}
              className="px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-lg"
            >
              Dismiss
            </button>
          </div>
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">{aiError}</p>
        </div>
      )}

      {aiInsight && (
        <div className="bg-[#1B4B4F]/20 border border-[#D9A441]/40 p-6 rounded-2xl space-y-4 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#D9A441]/20">
            <div className="flex items-center gap-2 text-[#D9A441] font-bold text-sm">
              <svg className="w-5 h-5 shrink-0 text-[#D9A441]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              <span>Gemini AI Executive {timeWindow === 'week' ? 'Weekly' : 'Monthly'} Productivity Insight</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleDownloadInsight('txt')}
                className="px-3 py-1.5 bg-[#D9A441] hover:bg-[#C59336] text-[#0D1B1E] text-xs font-bold rounded-lg transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                title="Download Executive Summary as Text Report (.txt)"
              >
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Download (.txt)</span>
              </button>

              <button
                type="button"
                onClick={() => handleDownloadInsight('md')}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold rounded-lg transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                title="Download Executive Summary as Markdown (.md)"
              >
                <svg className="w-3.5 h-3.5 shrink-0 text-[#D9A441]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Markdown (.md)</span>
              </button>

              <button
                type="button"
                onClick={handleCopyInsight}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold rounded-lg transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                title="Copy Insight Text to Clipboard"
              >
                {copiedInsight ? (
                  <>
                    <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                    <span>Copy</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setAiInsight(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-black/20 transition-colors cursor-pointer"
                title="Dismiss Insight"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap font-medium">
            {aiInsight}
          </div>
        </div>
      )}

      {loading ? (
        <div className={`p-16 text-center ${t.muted} text-sm`}>
          <div className="w-8 h-8 border-3 border-[#D9A441] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          Calculating analytics metrics...
        </div>
      ) : (
        <>
          <VelocityMetrics tasks={tasks} timeWindow={timeWindow} />
          <CategoryMixChart tasks={tasks} timeLogs={timeLogs} timeWindow={timeWindow} />
          <UtilizationTable employees={employees} tasks={tasks} timeLogs={timeLogs} timeWindow={timeWindow} />
        </>
      )}
    </div>
  );
}
