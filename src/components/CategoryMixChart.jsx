import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function CategoryMixChart({ tasks = [], timeLogs = [], timeWindow = 'week' }) {
  const { themeTokens: t } = useTheme();

  const now = new Date();
  const cutoffDate = new Date();
  if (timeWindow === 'week') {
    cutoffDate.setDate(now.getDate() - 7);
  } else {
    cutoffDate.setDate(now.getDate() - 30);
  }

  const windowLogs = timeLogs.filter((l) => {
    const logDate = new Date(l.logged_at || Date.now());
    return logDate >= cutoffDate;
  });

  const categoryMinsMap = {};
  windowLogs.forEach((log) => {
    const task = tasks.find((t) => t.id === log.task_id);
    const cat = task?.category || 'General';
    categoryMinsMap[cat] = (categoryMinsMap[cat] || 0) + (log.minutes_logged || 0);
  });

  const chartData = Object.keys(categoryMinsMap).map((cat) => ({
    name: cat,
    value: categoryMinsMap[cat],
    hours: (categoryMinsMap[cat] / 60).toFixed(1),
  }));

  const COLORS = ['#1B4B4F', '#D9A441', '#10b981', '#3b82f6', '#8b5cf6', '#06b6d4'];
  const totalMins = Object.values(categoryMinsMap).reduce((sum, v) => sum + v, 0);

  return (
    <div className={`${t.cardBg} p-6 rounded-2xl space-y-4 shadow-sm`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className={`text-base font-bold ${t.heading}`}>Time Allocation Mix by Category</h3>
          <p className={`text-xs ${t.muted}`}>
            Live computed total logged work hours grouped by operational category ({timeWindow === 'week' ? 'This Week' : 'This Month'})
          </p>
        </div>
        <div className="px-3 py-1 bg-[#D9A441]/10 border border-[#D9A441]/30 text-[#D9A441] text-xs font-bold rounded-lg shrink-0">
          Total: {(totalMins / 60).toFixed(1)} Hours
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className={`p-12 text-center ${t.muted} text-xs`}>
          No time logged for this period ({timeWindow === 'week' ? 'This Week' : 'This Month'}). Employees must log work minutes to populate the category pie chart.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          <div className="h-64 col-span-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name, item) => [!item || !item.payload ? `${value} mins` : `${value} mins (${item.payload.hours} hrs)`, 'Logged Time']}
                  contentStyle={{ backgroundColor: '#0D1B1E', borderColor: '#1F393E', borderRadius: '12px', color: '#f8fafc' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-3">
            <h4 className={`text-xs font-bold uppercase tracking-wider ${t.muted}`}>Category Breakdown</h4>
            <div className="space-y-2">
              {chartData.map((item, i) => {
                const percentage = totalMins > 0 ? Math.round((item.value / totalMins) * 100) : 0;
                return (
                  <div key={item.name} className={`p-2.5 ${t.inputBg} border ${t.border} rounded-xl flex items-center justify-between text-xs`}>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }}></span>
                      <span className={`font-semibold ${t.heading}`}>{item.name}</span>
                    </div>
                    <span className={`font-bold ${t.muted}`}>{item.hours} hrs ({percentage}%)</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
