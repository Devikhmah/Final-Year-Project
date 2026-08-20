import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function VelocityMetrics({ tasks = [], timeWindow = 'week' }) {
  const { themeTokens: t } = useTheme();

  const now = new Date();
  const cutoffDate = new Date();
  if (timeWindow === 'week') {
    cutoffDate.setDate(now.getDate() - 7);
  } else {
    cutoffDate.setDate(now.getDate() - 30);
  }

  const windowTasks = tasks.filter((task) => {
    const taskDate = new Date(task.created_at || Date.now());
    return taskDate >= cutoffDate;
  });

  const assignedCount = windowTasks.length;
  const approvedCompletedTasks = windowTasks.filter((task) => task.status === 'done');
  const approvedCount = approvedCompletedTasks.length;
  const submittedBottleneckCount = windowTasks.filter((task) => task.status === 'submitted').length;

  let onTimeCount = 0;
  let overdueCount = 0;

  approvedCompletedTasks.forEach((task) => {
    if (!task.deadline) {
      onTimeCount++;
    } else {
      const deadlineDate = new Date(task.deadline);
      // Task is on time if current/completion date is on or before deadline
      if (now <= deadlineDate) {
        onTimeCount++;
      } else {
        overdueCount++;
      }
    }
  });

  const chartData = [
    {
      name: timeWindow === 'week' ? 'This Week' : 'This Month',
      Assigned: assignedCount,
      Approved: approvedCount,
      'On Time': onTimeCount,
      Overdue: overdueCount,
      'Awaiting Review': submittedBottleneckCount,
    },
  ];

  return (
    <div className="space-y-6">
      {/* 5 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className={`${t.cardBg} p-5 rounded-2xl space-y-2`}>
          <p className={`text-[10px] font-bold uppercase tracking-wider ${t.muted}`}>Tasks Assigned</p>
          <div className="flex items-baseline justify-between">
            <span className={`text-3xl font-extrabold ${t.heading}`}>{assignedCount}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-400 font-bold border border-blue-500/30">
              {timeWindow === 'week' ? 'Week' : 'Month'}
            </span>
          </div>
        </div>

        <div className={`${t.cardBg} p-5 rounded-2xl space-y-2`}>
          <p className={`text-[10px] font-bold uppercase tracking-wider ${t.muted}`}>Manager Approved</p>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">{approvedCount}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold border border-emerald-500/30">
              {assignedCount > 0 ? `${Math.round((approvedCount / assignedCount) * 100)}%` : '0%'}
            </span>
          </div>
        </div>

        <div className={`${t.cardBg} p-5 rounded-2xl space-y-2`}>
          <p className={`text-[10px] font-bold uppercase tracking-wider ${t.muted}`}>Finished On-Time</p>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">{onTimeCount}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 font-bold border border-indigo-500/30">
              On Schedule
            </span>
          </div>
        </div>

        <div className={`${t.cardBg} p-5 rounded-2xl space-y-2`}>
          <p className={`text-[10px] font-bold uppercase tracking-wider ${t.muted}`}>Finished Overdue</p>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-rose-600 dark:text-rose-400">{overdueCount}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-400 font-bold border border-rose-500/30">
              Overdue
            </span>
          </div>
        </div>

        <div className={`${t.cardBg} p-5 rounded-2xl space-y-2`}>
          <p className={`text-[10px] font-bold uppercase tracking-wider ${t.muted}`}>Awaiting Review</p>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-amber-600 dark:text-amber-400">{submittedBottleneckCount}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold border border-amber-500/30">
              Review Queue
            </span>
          </div>
        </div>
      </div>

      {/* Bar Chart Container */}
      <div className={`${t.cardBg} p-6 rounded-2xl space-y-4`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className={`text-base font-bold ${t.heading}`}>
              Task Velocity & Delivery Comparison ({timeWindow === 'week' ? 'This Week' : 'This Month'})
            </h3>
            <p className={`text-xs ${t.muted}`}>
              Comparing assigned vs manager-approved tasks and delivery deadline performance
            </p>
          </div>
        </div>

        {windowTasks.length === 0 ? (
          <div className={`p-12 text-center ${t.muted} text-xs`}>
            No tasks created in this period ({timeWindow === 'week' ? 'This Week' : 'This Month'}). Select another period or add tasks.
          </div>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0D1B1E', borderColor: '#1F393E', borderRadius: '12px', color: '#f8fafc' }}
                  cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="Assigned" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Approved" fill="#10b981" radius={[6, 6, 0, 0]} />
                <Bar dataKey="On Time" fill="#6366f1" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Overdue" fill="#f43f5e" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Awaiting Review" fill="#D9A441" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
