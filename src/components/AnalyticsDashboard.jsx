import React, { useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import VelocityMetrics from './VelocityMetrics';
import CategoryMixChart from './CategoryMixChart';
import UtilizationTable from './UtilizationTable';

export default function AnalyticsDashboard() {
  const { themeTokens: t } = useTheme();
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [timeLogs, setTimeLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeWindow, setTimeWindow] = useState('week');

  const [generatingInsight, setGeneratingInsight] = useState(false);
  const [aiInsight, setAiInsight] = useState(null);
  const [aiError, setAiError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: usersData } = await supabase.from('users').select('*');
      setEmployees(usersData || []);

      const { data: tasksData } = await supabase.from('tasks').select('*');
      setTasks(tasksData || []);

      const { data: logsData } = await supabase.from('time_logs').select('*');
      setTimeLogs(logsData || []);
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

    const payload = {
      timeWindow: timeWindow === 'week' ? 'This Week' : 'This Month',
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
      const response = await fetch('/api/generate-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (result.success) {
        setAiInsight(result.insightText);
      } else {
        setAiError(result.error || 'Unable to generate executive insight at this moment. Please verify your connection or API setup.');
      }
    } catch (err) {
      setAiError('Unable to generate executive insight at this moment: ' + err.message);
    } finally {
      setGeneratingInsight(false);
    }
  };

  const handleSeedSampleData = async () => {
    if (!window.confirm('Generate sample tasks and time logs for testing analytics?')) return;
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
            Manager Insights: Task completion velocity, time allocation mix, and workload utilization.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleGenerateInsight}
            disabled={generatingInsight}
            className="px-4 py-2 bg-[#D9A441] hover:bg-[#C59336] text-[#0D1B1E] text-xs font-bold rounded-xl transition-all shadow flex items-center gap-2 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#1B4B4F]"
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
            className={`px-3 py-2 ${t.accentBg} ${t.text} text-xs font-bold rounded-xl border ${t.border} transition-all hover:opacity-80 flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-[#D9A441]`}
          >
            <span>Add Sample Data</span>
            <svg className="w-4 h-4 shrink-0 text-[#D9A441]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </button>

          <div className={`flex items-center gap-1 p-1 ${t.inputBg} rounded-xl border ${t.border} text-xs`}>
            <button
              onClick={() => handleTimeWindowChange('week')}
              className={`px-3 py-1.5 font-bold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#D9A441] ${
                timeWindow === 'week' ? 'bg-[#1B4B4F] text-white shadow' : `${t.muted} hover:${t.heading}`
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => handleTimeWindowChange('month')}
              className={`px-3 py-1.5 font-bold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#D9A441] ${
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
              Analyzing workforce metrics & generating AI {timeWindow === 'week' ? 'weekly' : 'monthly'} insight...
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
              className="px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D9A441]"
            >
              Dismiss
            </button>
          </div>
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">{aiError}</p>
        </div>
      )}

      {aiInsight && (
        <div className="bg-[#1B4B4F]/20 border border-[#D9A441]/40 p-6 rounded-2xl space-y-3 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#D9A441] font-bold text-sm">
              <span>Gemini AI Executive {timeWindow === 'week' ? 'Weekly' : 'Monthly'} Productivity Insight</span>
              <svg className="w-4 h-4 shrink-0 text-[#D9A441]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-[#D9A441]/20 text-[#D9A441] border border-[#D9A441]/30">
                {timeWindow === 'week' ? 'This Week' : 'This Month'}
              </span>
            </div>
            <button
              onClick={() => setAiInsight(null)}
              className="text-xs text-slate-400 hover:text-white"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap font-medium">
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
