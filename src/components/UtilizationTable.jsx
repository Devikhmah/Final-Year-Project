import React from 'react';
import { useTheme } from '../context/ThemeContext';

export default function UtilizationTable({ employees = [], tasks = [], timeLogs = [], timeWindow = 'week' }) {
  const { themeTokens: t } = useTheme();

  const now = new Date();
  const cutoffDate = new Date();
  if (timeWindow === 'week') {
    cutoffDate.setDate(now.getDate() - 7);
  } else {
    cutoffDate.setDate(now.getDate() - 30);
  }

  const windowTasks = tasks.filter((t) => new Date(t.created_at || Date.now()) >= cutoffDate);
  const windowLogs = timeLogs.filter((l) => new Date(l.logged_at || Date.now()) >= cutoffDate);

  const getCapacityStatus = (hours) => {
    const isWeek = timeWindow === 'week';
    const overloadLimit = isWeek ? 45 : 160;
    const underLimit = isWeek ? 15 : 60;

    if (hours > overloadLimit) {
      return { text: 'Overloaded', badge: 'bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/30' };
    }
    if (hours < underLimit) {
      return { text: 'Underutilized', badge: 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border border-slate-500/30' };
    }
    return { text: 'Balanced Workload', badge: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30' };
  };

  return (
    <div className={`${t.cardBg} p-6 rounded-2xl space-y-4 shadow-sm`}>
      <div>
        <h3 className={`text-base font-bold ${t.heading}`}>
          Resource Utilization & Capacity ({timeWindow === 'week' ? 'This Week' : 'This Month'})
        </h3>
        <p className={`text-xs ${t.muted}`}>
          Employee logged work hours, active workload, and capacity status flags
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className={`border-b ${t.border} ${t.muted} text-[10px] font-bold uppercase tracking-wider`}>
              <th className="py-3 px-4">Employee</th>
              <th className="py-3 px-4">Role</th>
              <th className="py-3 px-4">Active Tasks</th>
              <th className="py-3 px-4">Approved Tasks</th>
              <th className="py-3 px-4">Logged Hours</th>
              <th className="py-3 px-4">Capacity Status</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${t.subBorder}`}>
            {employees.map((emp) => {
              const empTasks = windowTasks.filter((t) => t.assigned_to === emp.id);
              const empLogs = windowLogs.filter((l) => l.user_id === emp.id);

              const activeCount = empTasks.filter((t) => t.status !== 'done').length;
              const completedCount = empTasks.filter((t) => t.status === 'done').length;
              const totalMins = empLogs.reduce((sum, l) => sum + (l.minutes_logged || 0), 0);
              const loggedHours = parseFloat((totalMins / 60).toFixed(1));

              const capStatus = getCapacityStatus(loggedHours);

              return (
                <tr key={emp.id} className={`${t.cardHover} transition-colors`}>
                  <td className="py-3.5 px-4 font-bold">
                    <span className={t.heading}>{emp.full_name || 'Unnamed Employee'}</span>
                  </td>
                  <td className="py-3.5 px-4 capitalize">
                    <span className={`px-2 py-0.5 text-[10px] font-semibold rounded ${t.accentBg} ${t.muted}`}>
                      {emp.role || 'employee'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-blue-600 dark:text-blue-400">{activeCount}</td>
                  <td className="py-3.5 px-4 font-semibold text-emerald-600 dark:text-emerald-400">{completedCount}</td>
                  <td className="py-3.5 px-4 font-extrabold text-[#D9A441]">{loggedHours} hrs</td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full ${capStatus.badge}`}>
                      {capStatus.text}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
